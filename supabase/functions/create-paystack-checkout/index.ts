import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getPaystackConfig,
  corsHeaders,
  generateTransactionReference,
  dollarsToKobo,
  createErrorResponse,
  createSuccessResponse
} from "../_shared/paystack-config.ts";

interface PaystackCheckoutRequest {
  userId: string;
  userEmail?: string;
  packageName?: string;
  credits: number;
  price: number;
  successUrl?: string;
  cancelUrl?: string;
}

interface PaystackTransactionResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get Paystack configuration
    const config = getPaystackConfig();
    
    // Parse request body
    const requestBody: PaystackCheckoutRequest = await req.json();
    const { userId, userEmail, packageName, credits, price, successUrl, cancelUrl } = requestBody;

    // Validate required fields
    if (!userId || !credits || !price) {
      return createErrorResponse("Missing required fields: userId, credits, or price", 400);
    }

    // Validate field types and values
    if (typeof userId !== 'string' || userId.trim() === '') {
      return createErrorResponse("userId must be a non-empty string", 400);
    }

    if (typeof credits !== 'number' || credits <= 0 || !Number.isInteger(credits)) {
      return createErrorResponse("credits must be a positive integer", 400);
    }

    if (typeof price !== 'number' || price <= 0) {
      return createErrorResponse("price must be a positive number", 400);
    }

    if (userEmail && (typeof userEmail !== 'string' || !userEmail.includes('@'))) {
      return createErrorResponse("userEmail must be a valid email address", 400);
    }

    console.log("Creating Paystack transaction for:", { userId, credits, price, packageName });

    // Generate unique transaction reference
    const reference = generateTransactionReference();
    
    // Convert price to kobo (Paystack's smallest currency unit)
    const amountInKobo = dollarsToKobo(price);

    // Prepare transaction data
    const transactionData = {
      email: userEmail || `user-${userId}@openear.app`, // Fallback email if not provided
      amount: amountInKobo,
      reference: reference,
      currency: "USD",
      metadata: {
        user_id: userId,
        credits: credits.toString(),
        package_name: packageName || `${credits} Credits`,
        custom_fields: [
          {
            display_name: "User ID",
            variable_name: "user_id",
            value: userId
          },
          {
            display_name: "Credits",
            variable_name: "credits", 
            value: credits.toString()
          },
          {
            display_name: "Package",
            variable_name: "package_name",
            value: packageName || `${credits} Credits`
          }
        ]
      },
      callback_url: successUrl || `${req.headers.get("origin")}/profile?purchase=success`,
      cancel_action: cancelUrl || `${req.headers.get("origin")}/pricing?purchase=cancelled`
    };

    console.log("Initializing Paystack transaction with data:", {
      ...transactionData,
      email: transactionData.email,
      amount: transactionData.amount,
      reference: transactionData.reference
    });

    // Initialize transaction with Paystack API
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transactionData),
    });

    if (!paystackResponse.ok) {
      const errorData = await paystackResponse.json().catch(() => ({}));
      console.error("Paystack API error:", {
        status: paystackResponse.status,
        statusText: paystackResponse.statusText,
        error: errorData
      });
      
      // Handle specific Paystack error responses
      if (paystackResponse.status === 401) {
        return createErrorResponse("Payment configuration error", 500);
      } else if (paystackResponse.status === 400) {
        return createErrorResponse(
          errorData.message || "Invalid payment request", 
          400, 
          errorData
        );
      } else if (paystackResponse.status >= 500) {
        return createErrorResponse("Payment service temporarily unavailable", 503);
      } else {
        return createErrorResponse("Payment processing failed", 400, errorData);
      }
    }

    const paystackData: PaystackTransactionResponse = await paystackResponse.json();

    if (!paystackData.status) {
      console.error("Paystack transaction initialization failed:", paystackData.message);
      return createErrorResponse(
        paystackData.message || "Failed to initialize payment", 
        400
      );
    }

    console.log("Paystack transaction initialized successfully:", {
      reference: paystackData.data.reference,
      access_code: paystackData.data.access_code,
      authorization_url: paystackData.data.authorization_url
    });

    // Return successful response with Paystack payment data
    return createSuccessResponse({
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference: paystackData.data.reference,
      amount: price,
      currency: "USD"
    });

  } catch (error) {
    console.error("Paystack checkout error:", error);
    
    // Handle configuration errors
    if (error.message?.includes("environment variable")) {
      return createErrorResponse("Payment configuration error", 500);
    }
    
    // Handle network/fetch errors
    if (error.name === "TypeError" && error.message?.includes("fetch")) {
      return createErrorResponse("Payment service temporarily unavailable", 503);
    }
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return createErrorResponse("Invalid request format", 400);
    }
    
    // Generic error handling
    return createErrorResponse(
      "Payment processing failed", 
      500, 
      config.isTestMode ? error.toString() : undefined
    );
  }
});