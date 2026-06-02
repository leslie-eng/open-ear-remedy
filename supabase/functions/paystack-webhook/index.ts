import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function hmacSha512Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function parseMetadata(meta: unknown): Record<string, string> {
  if (!meta || typeof meta !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(meta as Record<string, unknown>)) {
    if (v === null || v === undefined) continue;
    out[k] = typeof v === "string" ? v : String(v);
  }
  return out;
}

function escapeLike(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const webhookSecret = Deno.env.get("PAYSTACK_WEBHOOK_SECRET");
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const signingSecrets = [webhookSecret, paystackSecretKey].filter(
      (s): s is string => Boolean(s && s.length >= 8),
    );

    if (signingSecrets.length === 0) {
      console.error("paystack-webhook: PAYSTACK_WEBHOOK_SECRET or PAYSTACK_SECRET_KEY required for signature verification");
      throw new Error("Paystack webhook configuration missing");
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("paystack-webhook: Supabase configuration missing");
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Missing x-paystack-signature header" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sigNorm = signature.trim().toLowerCase();

    let parsed: { event?: string; data?: Record<string, unknown> };
    try {
      parsed = JSON.parse(body);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const canonicalPayload = JSON.stringify(parsed);
    let verified = false;
    for (const secret of signingSecrets) {
      const hashRaw = await hmacSha512Hex(secret, body);
      const hashCanonical = await hmacSha512Hex(secret, canonicalPayload);
      if (
        timingSafeEqualHex(hashRaw.toLowerCase(), sigNorm) ||
        timingSafeEqualHex(hashCanonical.toLowerCase(), sigNorm)
      ) {
        verified = true;
        break;
      }
    }

    if (!verified) {
      console.error("paystack-webhook: signature verification failed");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const event = parsed;

    const eventType = event.event;
    console.log("Received Paystack event:", eventType);

    if (eventType === "charge.success") {
      const data = event.data ?? {};
      const meta = parseMetadata(data.metadata);
      const userId = meta.user_id;
      const credits = parseInt(meta.credits || "0", 10);
      const packageName = meta.package_name || "Credit Package";
      const reference = typeof data.reference === "string" ? data.reference : "";
      const amountPaid = typeof data.amount === "number" ? data.amount : parseInt(String(data.amount ?? "0"), 10);

      if (!userId || credits <= 0 || !reference) {
        console.error("paystack-webhook: invalid charge.success metadata", {
          has_user: Boolean(userId),
          credits,
          has_reference: Boolean(reference),
        });
        return new Response(
          JSON.stringify({ error: "Invalid webhook payload metadata" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const refTail = `paystack_ref:${reference}`;
      const likePattern = `%${escapeLike(refTail)}`;

      const { data: existingTx, error: dupErr } = await supabase
        .from("credit_transactions")
        .select("id")
        .eq("user_id", userId)
        .like("description", likePattern)
        .maybeSingle();

      if (dupErr) {
        console.error("paystack-webhook: duplicate check failed", dupErr);
        throw dupErr;
      }

      if (existingTx) {
        console.log("paystack-webhook: duplicate webhook ignored", reference);
        return new Response(
          JSON.stringify({ success: true, duplicate: true, reference }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      console.log(`Processing Paystack purchase: User ${userId}, Credits ${credits}, Amount ${amountPaid}, Ref ${reference}`);

      const { data: existingCredits, error: fetchError } = await supabase
        .from("user_credits")
        .select("id, credits")
        .eq("user_id", userId)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching user credits:", fetchError);
        throw fetchError;
      }

      if (existingCredits) {
        const newCredits = existingCredits.credits + credits;
        const { error: updateError } = await supabase
          .from("user_credits")
          .update({
            credits: newCredits,
            updated_at: new Date().toISOString(),
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
            credits,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error("Error inserting user credits:", insertError);
          throw insertError;
        }
        console.log(`Created new credits record for user ${userId} with ${credits} credits`);
      }

      const description = `Purchased ${packageName} ${refTail}`;

      const { error: transactionError } = await supabase.from("credit_transactions").insert({
        user_id: userId,
        type: "purchase",
        credits,
        amount: Number.isFinite(amountPaid) ? amountPaid : 0,
        description,
        status: "completed",
        created_at: new Date().toISOString(),
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
          credits_added: credits,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (eventType === "charge.failed") {
      const data = event.data ?? {};
      const meta = parseMetadata(data.metadata);
      const userId = meta.user_id;
      const credits = parseInt(meta.credits || "0", 10);
      const packageName = meta.package_name || "Credit Package";
      const amountVal = typeof data.amount === "number" ? data.amount : parseInt(String(data.amount ?? "0"), 10);

      if (userId) {
        const { error: transactionError } = await supabase.from("credit_transactions").insert({
          user_id: userId,
          type: "purchase",
          credits,
          amount: Number.isFinite(amountVal) ? amountVal : 0,
          description: `Failed purchase: ${packageName}`,
          status: "failed",
          created_at: new Date().toISOString(),
        });

        if (transactionError) {
          console.error("Error creating failed transaction record:", transactionError);
        }
      }

      console.error("Paystack charge.failed recorded", data.reference);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Charge failure recorded",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Unhandled Paystack event type:", eventType);
    return new Response(
      JSON.stringify({ received: true, event_type: eventType }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("paystack-webhook error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
