/**
 * Paystack Configuration Utility
 * 
 * Provides centralized configuration and validation for Paystack integration
 * across all Supabase Edge Functions.
 */

export interface PaystackConfig {
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
  isTestMode: boolean;
}

/**
 * Validates and returns Paystack configuration from environment variables
 * @throws Error if required configuration is missing
 */
export function getPaystackConfig(): PaystackConfig {
  const publicKey = Deno.env.get("PAYSTACK_PUBLIC_KEY");
  const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
  const webhookSecret = Deno.env.get("PAYSTACK_WEBHOOK_SECRET");

  if (!publicKey) {
    throw new Error("PAYSTACK_PUBLIC_KEY environment variable is required");
  }

  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY environment variable is required");
  }

  if (!webhookSecret) {
    throw new Error("PAYSTACK_WEBHOOK_SECRET environment variable is required");
  }

  // Validate key formats
  if (!publicKey.startsWith("pk_")) {
    throw new Error("Invalid PAYSTACK_PUBLIC_KEY format. Must start with 'pk_'");
  }

  if (!secretKey.startsWith("sk_")) {
    throw new Error("Invalid PAYSTACK_SECRET_KEY format. Must start with 'sk_'");
  }

  const isTestMode = secretKey.startsWith("sk_test_");

  return {
    publicKey,
    secretKey,
    webhookSecret,
    isTestMode
  };
}

/**
 * Validates Paystack webhook signature using HMAC SHA512
 * @param payload - Raw webhook payload as string
 * @param signature - Signature from Paystack webhook headers
 * @param secret - Webhook secret from Paystack dashboard
 * @returns boolean indicating if signature is valid
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return expectedSignature === signature;
  } catch (error) {
    console.error("Webhook signature verification error:", error);
    return false;
  }
}

/**
 * Common CORS headers for Paystack-related functions
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Generates a unique transaction reference for Paystack
 * Format: PS_YYYYMMDD_HHMMSS_RANDOM
 */
export function generateTransactionReference(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return `PS_${dateStr}_${timeStr}_${random}`;
}

/**
 * Converts amount from dollars to kobo (Paystack's smallest currency unit)
 * @param amountInDollars - Amount in USD
 * @returns Amount in kobo (cents)
 */
export function dollarsToKobo(amountInDollars: number): number {
  return Math.round(amountInDollars * 100);
}

/**
 * Converts amount from kobo to dollars
 * @param amountInKobo - Amount in kobo (cents)
 * @returns Amount in USD
 */
export function koboToDollars(amountInKobo: number): number {
  return amountInKobo / 100;
}

/**
 * Error response helper for Paystack functions
 */
export function createErrorResponse(
  message: string,
  status: number = 400,
  details?: any
): Response {
  const errorBody = {
    error: message,
    ...(details && { details })
  };

  return new Response(
    JSON.stringify(errorBody),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    }
  );
}

/**
 * Success response helper for Paystack functions
 */
export function createSuccessResponse(data: any, status: number = 200): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    }
  );
}