import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getPaystackConfig,
  verifyWebhookSignature,
  corsHeaders,
  koboToDollars,
  createErrorResponse,
  createSuccessResponse
} from "../_shared/paystack-config.ts";

interface PaystackWebhookEvent {
  event: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message?: string;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address?: string;
    metadata: {
      user_id: string;
      credits: string;
      package_name: string;
      custom_fields?: Array<{
        display_name: string;
        variable_name: string;
        value: string;
      }>;
    };
    customer: {
      id: number;
      first_name?: string;
      last_name?: string;
      email: string;
      customer_code: string;
      phone?: string;
      metadata?: any;
      risk_action: string;
    };
    authorization?: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get configuration
    const config = getPaystackConfig();
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the raw body and signature
    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!signature) {
      console.error("Missing x-paystack-signature header");
      return createErrorResponse("Missing x-paystack-signature header", 400);
    }

    // Verify webhook signature
    const isValidSignature = await verifyWebhookSignature(body, signature, config.webhookSecret);
    
    if (!isValidSignature) {
      console.error("Webhook signature verification failed");
      return createErrorResponse("Invalid signature", 400);
    }

    // Parse webhook event
    let event: PaystackWebhookEvent;
    try {
      event = JSON.parse(body);
    } catch (parseError) {
      console.error("Failed to parse webhook payload:", parseError);
      return createErrorResponse("Invalid webhook payload", 400);
    }

    console.log("Received Paystack webhook event:", {
      event: event.event,
      reference: event.data.reference,
      status: event.data.status,
      amount: event.data.amount,
      currency: event.data.currency,
      customer_email: event.data.customer?.email,
      timestamp: new Date().toISOString()
    });

    // Handle charge.success event
    if (event.event === "charge.success") {
      const chargeData = event.data;
      
      // Extract metadata with validation
      const userId = chargeData.metadata?.user_id;
      const credits = parseInt(chargeData.metadata?.credits || "0", 10);
      const packageName = chargeData.metadata?.package_name || "Credit Package";
      const amountPaid = koboToDollars(chargeData.amount);
      const reference = chargeData.reference;

      // Validate required metadata
      if (!userId || !reference) {
        console.error("Missing required metadata in charge:", { userId, reference, metadata: chargeData.metadata });
        return createErrorResponse("Missing required metadata (user_id or reference)", 400);
      }

      if (credits <= 0) {
        console.error("Invalid credits amount in charge:", { credits, metadata: chargeData.metadata });
        return createErrorResponse("Invalid credits amount", 400);
      }

      if (amountPaid <= 0) {
        console.error("Invalid payment amount in charge:", { amountPaid, originalAmount: chargeData.amount });
        return createErrorResponse("Invalid payment amount", 400);
      }

      console.log(`Processing successful payment: User ${userId}, Credits ${credits}, Amount $${amountPaid}, Reference ${reference}`);

      // Check if this transaction has already been processed (idempotency)
      const { data: existingTransaction, error: transactionCheckError } = await supabase
        .from("credit_transactions")
        .select("id, status, credits, amount")
        .eq("paystack_reference", reference)
        .maybeSingle();

      if (transactionCheckError) {
        console.error("Error checking existing transaction:", transactionCheckError);
        throw transactionCheckError;
      }

      if (existingTransaction) {
        console.log(`Transaction ${reference} already processed with status: ${existingTransaction.status}, credits: ${existingTransaction.credits}, amount: ${existingTransaction.amount}`);
        return createSuccessResponse({
          success: true,
          message: "Transaction already processed",
          reference: reference,
          status: existingTransaction.status,
          credits_added: existingTransaction.credits,
          amount: existingTransaction.amount,
          transaction_id: existingTransaction.id
        });
      }

      // Use atomic credit update function for data consistency
      let updateResult;
      let updateError;
      
      try {
        const { data, error } = await supabase
          .rpc("update_user_credits_atomic", {
            p_user_id: userId,
            p_credits_to_add: credits,
            p_transaction_type: "purchase",
            p_transaction_description: `Purchased ${packageName}`,
            p_amount: amountPaid,
            p_paystack_reference: reference,
            p_paystack_transaction_id: chargeData.id
          });
        
        updateResult = data;
        updateError = error;
      } catch (atomicError) {
        console.warn("Atomic function not available, falling back to manual transaction:", atomicError);
        
        // Fallback to manual credit update with transaction
        const { data: existingCredits, error: fetchError } = await supabase
          .from("user_credits")
          .select("id, credits")
          .eq("user_id", userId)
          .maybeSingle();

        if (fetchError) {
          console.error("Error fetching user credits:", fetchError);
          throw fetchError;
        }

        // Update or insert user credits
        let newCredits;
        if (existingCredits) {
          newCredits = existingCredits.credits + credits;
          const { error: updateCreditsError } = await supabase
            .from("user_credits")
            .update({ 
              credits: newCredits,
              updated_at: new Date().toISOString()
            })
            .eq("user_id", userId);

          if (updateCreditsError) {
            console.error("Error updating user credits:", updateCreditsError);
            throw updateCreditsError;
          }
        } else {
          newCredits = credits;
          const { error: insertError } = await supabase
            .from("user_credits")
            .insert({
              user_id: userId,
              credits: credits,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            console.error("Error inserting user credits:", insertError);
            throw insertError;
          }
        }

        // Create credit transaction record
        const { data: transactionData, error: transactionError } = await supabase
          .from("credit_transactions")
          .insert({
            user_id: userId,
            type: "purchase",
            credits: credits,
            amount: amountPaid,
            description: `Purchased ${packageName}`,
            status: "completed",
            paystack_reference: reference,
            paystack_transaction_id: chargeData.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select("id")
          .single();

        if (transactionError) {
          console.error("Error creating transaction record:", transactionError);
          throw transactionError;
        }

        // Simulate atomic function result
        updateResult = {
          success: true,
          previous_credits: existingCredits?.credits || 0,
          new_credits: newCredits,
          credits_added: credits,
          transaction_id: transactionData.id
        };
        updateError = null;
      }

      if (updateError) {
        console.error("Error updating user credits:", updateError);
        throw updateError;
      }

      if (!updateResult?.success) {
        console.error("Credit update failed:", updateResult?.error);
        throw new Error(`Credit update failed: ${updateResult?.error}`);
      }

      console.log(`Successfully updated credits for user ${userId}: ${updateResult.previous_credits} -> ${updateResult.new_credits} (added ${updateResult.credits_added})`);
      console.log(`Transaction record created with ID: ${updateResult.transaction_id}`);

      return createSuccessResponse({
        success: true,
        message: "Payment processed successfully",
        user_id: userId,
        credits_added: updateResult.credits_added,
        previous_credits: updateResult.previous_credits,
        new_credits: updateResult.new_credits,
        reference: reference,
        amount: amountPaid,
        transaction_id: updateResult.transaction_id
      });
    }

    // Handle charge.failed event
    if (event.event === "charge.failed") {
      const chargeData = event.data;
      
      console.error("Payment failed:", chargeData.reference, chargeData.gateway_response);

      // Extract metadata for failed transaction record
      const userId = chargeData.metadata?.user_id;
      const credits = parseInt(chargeData.metadata?.credits || "0", 10);
      const packageName = chargeData.metadata?.package_name || "Credit Package";
      const amountAttempted = koboToDollars(chargeData.amount);
      const reference = chargeData.reference;

      if (userId) {
        // Check if this failed transaction has already been recorded (idempotency)
        const { data: existingTransaction, error: transactionCheckError } = await supabase
          .from("credit_transactions")
          .select("id, status, credits, amount")
          .eq("paystack_reference", reference)
          .maybeSingle();

        if (transactionCheckError) {
          console.error("Error checking existing failed transaction:", transactionCheckError);
          throw transactionCheckError;
        }

        if (!existingTransaction) {
          // Create failed transaction record directly (no credits to add)
          const { data: transactionData, error: transactionError } = await supabase
            .from("credit_transactions")
            .insert({
              user_id: userId,
              type: "purchase",
              credits: 0, // No credits for failed transactions
              amount: amountAttempted,
              description: `Failed purchase: ${packageName} - ${chargeData.gateway_response}`,
              status: "failed",
              paystack_reference: reference,
              paystack_transaction_id: chargeData.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select("id")
            .single();

          if (transactionError) {
            console.error("Error creating failed transaction record:", transactionError);
            throw transactionError;
          }

          console.log(`Failed transaction record created for user ${userId}, reference ${reference}, transaction ID: ${transactionData.id}`);
        } else {
          console.log(`Failed transaction ${reference} already recorded with status: ${existingTransaction.status}, credits: ${existingTransaction.credits}, amount: ${existingTransaction.amount}`);
        }
      }

      return createSuccessResponse({
        success: true,
        message: "Payment failure recorded",
        reference: reference,
        gateway_response: chargeData.gateway_response
      });
    }

    // Handle invoice.payment_failed event (for recurring payments if applicable)
    if (event.event === "invoice.payment_failed") {
      const invoiceData = event.data;
      console.error("Invoice payment failed:", invoiceData.reference, invoiceData.gateway_response);
      
      return createSuccessResponse({
        success: true,
        message: "Invoice payment failure noted",
        reference: invoiceData.reference
      });
    }

    // Handle transfer.success event (for payouts if applicable)
    if (event.event === "transfer.success") {
      const transferData = event.data;
      console.log("Transfer successful:", transferData.reference);
      
      return createSuccessResponse({
        success: true,
        message: "Transfer success noted",
        reference: transferData.reference
      });
    }

    // Handle transfer.failed event (for payouts if applicable)
    if (event.event === "transfer.failed") {
      const transferData = event.data;
      console.error("Transfer failed:", transferData.reference, transferData.gateway_response);
      
      return createSuccessResponse({
        success: true,
        message: "Transfer failure noted",
        reference: transferData.reference
      });
    }

    // Return success for unhandled events
    console.log("Unhandled Paystack event type:", event.event);
    return createSuccessResponse({
      received: true,
      event_type: event.event,
      message: "Event received but not processed"
    });

  } catch (error) {
    console.error("Paystack webhook error:", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Handle configuration errors
    if (error.message?.includes("configuration") || error.message?.includes("missing")) {
      return createErrorResponse("Webhook configuration error", 500);
    }
    
    // Handle database errors
    if (error.message?.includes("supabase") || error.code || error.message?.includes("database")) {
      return createErrorResponse("Database operation failed", 500);
    }
    
    // Handle Paystack API errors
    if (error.message?.includes("paystack") || error.message?.includes("signature")) {
      return createErrorResponse("Payment processing error", 400);
    }
    
    // Generic error handling
    const config = getPaystackConfig();
    return createErrorResponse(
      "Internal server error",
      500,
      config.isTestMode ? error.toString() : undefined
    );
  }
});