
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeSecretKey || !stripeWebhookSecret) {
      throw new Error("Stripe configuration missing");
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the raw body and signature
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Missing stripe-signature header" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Received Stripe event:", event.type);

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Extract metadata
      const userId = session.metadata?.user_id;
      const credits = parseInt(session.metadata?.credits || "0", 10);
      const packageName = session.metadata?.package_name || "Credit Package";
      const amountPaid = session.amount_total || 0;

      if (!userId || credits <= 0) {
        console.error("Invalid metadata in session:", session.metadata);
        return new Response(
          JSON.stringify({ error: "Invalid session metadata" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Processing purchase: User ${userId}, Credits ${credits}, Amount ${amountPaid}`);

      // Check if user_credits record exists
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
      if (existingCredits) {
        const newCredits = existingCredits.credits + credits;
        const { error: updateError } = await supabase
          .from("user_credits")
          .update({ 
            credits: newCredits,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId);

        if (updateError) {
          console.error("Error updating user credits:", updateError);
          throw updateError;
        }
        console.log(`Updated credits for user ${userId}: ${existingCredits.credits} -> ${newCredits}`);
      } else {
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
        console.log(`Created new credits record for user ${userId} with ${credits} credits`);
      }

      // Create credit transaction record
      const { error: transactionError } = await supabase
        .from("credit_transactions")
        .insert({
          user_id: userId,
          type: "purchase",
          credits: credits,
          amount: amountPaid,
          description: `Purchased ${packageName}`,
          status: "completed",
          created_at: new Date().toISOString()
        });

      if (transactionError) {
        console.error("Error creating transaction record:", transactionError);
        throw transactionError;
      }

      console.log(`Transaction record created for user ${userId}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Payment processed successfully",
          user_id: userId,
          credits_added: credits
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle payment_intent.payment_failed event
    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      console.error("Payment failed:", paymentIntent.id, paymentIntent.last_payment_error?.message);

      // If we have user metadata, create a failed transaction record
      const userId = paymentIntent.metadata?.user_id;
      const credits = parseInt(paymentIntent.metadata?.credits || "0", 10);
      const packageName = paymentIntent.metadata?.package_name || "Credit Package";

      if (userId) {
        const { error: transactionError } = await supabase
          .from("credit_transactions")
          .insert({
            user_id: userId,
            type: "purchase",
            credits: credits,
            amount: paymentIntent.amount || 0,
            description: `Failed purchase: ${packageName}`,
            status: "failed",
            created_at: new Date().toISOString()
          });

        if (transactionError) {
          console.error("Error creating failed transaction record:", transactionError);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Payment failure recorded"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle checkout.session.expired event
    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("Checkout session expired:", session.id);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Session expiration noted"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return success for unhandled events
    console.log("Unhandled event type:", event.type);
    return new Response(
      JSON.stringify({ received: true, event_type: event.type }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
