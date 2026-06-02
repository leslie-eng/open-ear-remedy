import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function subunitAmount(price: number): number {
  const rounded = Math.round(price * 100);
  if (!Number.isFinite(rounded) || rounded <= 0) {
    throw new Error("Invalid price amount");
  }
  return rounded;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const currency = (Deno.env.get("PAYSTACK_CURRENCY") || "USD").trim().toUpperCase();

    if (!paystackSecretKey?.startsWith("sk_")) {
      console.error("create-paystack-checkout: PAYSTACK_SECRET_KEY missing or invalid prefix");
      return new Response(
        JSON.stringify({ error: "Payment service is not configured." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("create-paystack-checkout: Supabase auth configuration missing");
      return new Response(
        JSON.stringify({ error: "Server configuration error." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") ?? "",
        },
      },
    });

    const {
      userId: requestedUserId,
      userEmail,
      packageName,
      credits,
      price,
      successUrl,
      cancelUrl,
    } = await req.json();

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized. Please sign in and try again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const userId = user.id;
    const verifiedEmail = user.email || userEmail;

    if (!verifiedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(verifiedEmail)) {
      return new Response(
        JSON.stringify({ error: "A valid account email is required for checkout." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!userId || credits == null || price == null) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: credits or price" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const creditsNum = typeof credits === "number" ? credits : Number(credits);
    const priceNum = typeof price === "number" ? price : Number(price);
    if (!Number.isFinite(creditsNum) || creditsNum <= 0 || creditsNum !== Math.floor(creditsNum)) {
      return new Response(
        JSON.stringify({ error: "Invalid credits value." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid price value." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (requestedUserId && requestedUserId !== userId) {
      return new Response(
        JSON.stringify({ error: "User mismatch in checkout request." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const pkgLabel = packageName || `${creditsNum} Credits`;
    let amountSubunits: number;
    try {
      amountSubunits = subunitAmount(priceNum);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid price amount." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const reference = `oe_${userId.slice(0, 12)}_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
    const origin = req.headers.get("origin");
    const callbackUrl =
      successUrl ||
      (origin ? `${origin}/profile?purchase=success` : undefined);

    if (!callbackUrl) {
      return new Response(
        JSON.stringify({ error: "successUrl is required when Origin header is missing." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload = {
      email: verifiedEmail,
      amount: amountSubunits,
      currency,
      reference,
      callback_url: callbackUrl,
      metadata: {
        user_id: userId,
        credits: String(creditsNum),
        package_name: pkgLabel,
        cancel_url: cancelUrl || "",
      },
    };

    console.log("Paystack initialize request:", {
      reference,
      userId,
      credits: creditsNum,
      currency,
      amount: amountSubunits,
      package_name: pkgLabel,
    });

    const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const initBodyText = await initRes.text();
    let initJson: { status?: boolean; message?: string; data?: { authorization_url?: string; reference?: string } };
    try {
      initJson = JSON.parse(initBodyText);
    } catch {
      console.error("Paystack initialize non-JSON response:", initRes.status, initBodyText.slice(0, 500));
      return new Response(
        JSON.stringify({ error: "Payment provider returned an invalid response." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Paystack initialize response:", {
      http_status: initRes.status,
      paystack_status: initJson.status,
      message: initJson.message,
      reference: initJson.data?.reference,
      has_authorization_url: Boolean(initJson.data?.authorization_url),
    });

    if (!initRes.ok || !initJson.status || !initJson.data?.authorization_url) {
      const msg = initJson.message || initBodyText || "Failed to start checkout.";
      return new Response(
        JSON.stringify({
          error: typeof msg === "string" ? msg : "Failed to start checkout.",
          paystack_message: typeof msg === "string" ? msg : undefined,
        }),
        { status: initRes.ok ? 502 : initRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        url: initJson.data.authorization_url,
        reference: initJson.data.reference ?? reference,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create checkout session";
    console.error("create-paystack-checkout error:", message);
    return new Response(
      JSON.stringify({
        error: message,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
