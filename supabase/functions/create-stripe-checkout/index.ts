import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const { userId, userEmail, packageName, credits, price, successUrl, cancelUrl } = await req.json();

    // Validate required fields
    if (!userId || !credits || !price) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, credits, or price" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Creating checkout session for:", { userId, credits, price, packageName });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: userEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: packageName || `${credits} Credits`,
              description: `Purchase ${credits} credits for Open Ear`,
            },
            unit_amount: Math.round(price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: userId,
        credits: credits.toString(),
        package_name: packageName || `${credits} Credits`,
      },
      success_url: successUrl || `${req.headers.get("origin")}/profile?purchase=success`,
      cancel_url: cancelUrl || `${req.headers.get("origin")}/pricing?purchase=cancelled`,
      billing_address_collection: "auto",
      payment_intent_data: {
        metadata: {
          user_id: userId,
          credits: credits.toString(),
          package_name: packageName || `${credits} Credits`,
        },
      },
    });

    console.log("Checkout session created:", session.id, "URL:", session.url);

    return new Response(
      JSON.stringify({ 
        sessionId: session.id,
        url: session.url 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Stripe checkout error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to create checkout session",
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});