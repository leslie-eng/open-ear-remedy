import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Test configuration
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "http://localhost:54321";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const PAYSTACK_WEBHOOK_SECRET = Deno.env.get("PAYSTACK_WEBHOOK_SECRET") || "test_secret";

// Test webhook payload for successful payment
const successfulPaymentPayload = {
  event: "charge.success",
  data: {
    id: 123456789,
    domain: "test",
    status: "success",
    reference: "test_ref_" + Date.now(),
    amount: 500000, // 5000 NGN in kobo
    message: "Approved",
    gateway_response: "Successful",
    paid_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    channel: "card",
    currency: "NGN",
    metadata: {
      user_id: "test-user-id-123",
      credits: "50",
      package_name: "50 Credits Package"
    },
    customer: {
      id: 987654321,
      email: "test@example.com",
      customer_code: "CUS_test123",
      risk_action: "default"
    }
  }
};

// Test webhook payload for failed payment
const failedPaymentPayload = {
  event: "charge.failed",
  data: {
    id: 123456790,
    domain: "test",
    status: "failed",
    reference: "test_ref_failed_" + Date.now(),
    amount: 500000, // 5000 NGN in kobo
    message: "Declined",
    gateway_response: "Insufficient Funds",
    paid_at: null,
    created_at: new Date().toISOString(),
    channel: "card",
    currency: "NGN",
    metadata: {
      user_id: "test-user-id-456",
      credits: "50",
      package_name: "50 Credits Package"
    },
    customer: {
      id: 987654322,
      email: "test2@example.com",
      customer_code: "CUS_test456",
      risk_action: "default"
    }
  }
};

// Helper function to create HMAC signature
async function createWebhookSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper function to make webhook request
async function makeWebhookRequest(payload: any, secret: string = PAYSTACK_WEBHOOK_SECRET) {
  const payloadString = JSON.stringify(payload);
  const signature = await createWebhookSignature(payloadString, secret);
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/paystack-webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-paystack-signature": signature,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: payloadString
  });
  
  return response;
}

Deno.test("Paystack Webhook - Successful Payment Processing", async () => {
  const response = await makeWebhookRequest(successfulPaymentPayload);
  const result = await response.json();
  
  assertEquals(response.status, 200);
  assertEquals(result.success, true);
  assertEquals(result.message, "Payment processed successfully");
  assertExists(result.user_id);
  assertExists(result.credits_added);
  assertExists(result.reference);
  assertExists(result.amount);
  
  console.log("✅ Successful payment webhook test passed:", result);
});

Deno.test("Paystack Webhook - Failed Payment Processing", async () => {
  const response = await makeWebhookRequest(failedPaymentPayload);
  const result = await response.json();
  
  assertEquals(response.status, 200);
  assertEquals(result.success, true);
  assertEquals(result.message, "Payment failure recorded");
  assertExists(result.reference);
  assertExists(result.gateway_response);
  
  console.log("✅ Failed payment webhook test passed:", result);
});

Deno.test("Paystack Webhook - Invalid Signature", async () => {
  const response = await makeWebhookRequest(successfulPaymentPayload, "wrong_secret");
  
  assertEquals(response.status, 400);
  
  const result = await response.json();
  assertEquals(result.error, "Invalid signature");
  
  console.log("✅ Invalid signature test passed");
});

Deno.test("Paystack Webhook - Missing Metadata", async () => {
  const invalidPayload = {
    ...successfulPaymentPayload,
    data: {
      ...successfulPaymentPayload.data,
      metadata: {
        // Missing user_id
        credits: "50",
        package_name: "50 Credits Package"
      }
    }
  };
  
  const response = await makeWebhookRequest(invalidPayload);
  
  assertEquals(response.status, 400);
  
  const result = await response.json();
  assertEquals(result.error, "Missing required metadata (user_id or reference)");
  
  console.log("✅ Missing metadata test passed");
});

Deno.test("Paystack Webhook - Invalid Credits Amount", async () => {
  const invalidPayload = {
    ...successfulPaymentPayload,
    data: {
      ...successfulPaymentPayload.data,
      metadata: {
        user_id: "test-user-id-123",
        credits: "0", // Invalid credits amount
        package_name: "0 Credits Package"
      }
    }
  };
  
  const response = await makeWebhookRequest(invalidPayload);
  
  assertEquals(response.status, 400);
  
  const result = await response.json();
  assertEquals(result.error, "Invalid credits amount");
  
  console.log("✅ Invalid credits amount test passed");
});

Deno.test("Paystack Webhook - Idempotency Check", async () => {
  // Send the same webhook twice
  const firstResponse = await makeWebhookRequest(successfulPaymentPayload);
  const firstResult = await firstResponse.json();
  
  assertEquals(firstResponse.status, 200);
  assertEquals(firstResult.success, true);
  
  // Send the same webhook again
  const secondResponse = await makeWebhookRequest(successfulPaymentPayload);
  const secondResult = await secondResponse.json();
  
  assertEquals(secondResponse.status, 200);
  assertEquals(secondResult.success, true);
  assertEquals(secondResult.message, "Transaction already processed");
  
  console.log("✅ Idempotency test passed");
});

Deno.test("Paystack Webhook - Unhandled Event Type", async () => {
  const unhandledPayload = {
    event: "subscription.create",
    data: {
      id: 123456789,
      domain: "test",
      status: "active",
      reference: "test_sub_" + Date.now()
    }
  };
  
  const response = await makeWebhookRequest(unhandledPayload);
  const result = await response.json();
  
  assertEquals(response.status, 200);
  assertEquals(result.received, true);
  assertEquals(result.event_type, "subscription.create");
  assertEquals(result.message, "Event received but not processed");
  
  console.log("✅ Unhandled event type test passed");
});

// Integration test to verify database operations
Deno.test("Paystack Webhook - Database Integration", async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Create a unique test payload
  const testPayload = {
    ...successfulPaymentPayload,
    data: {
      ...successfulPaymentPayload.data,
      reference: "integration_test_" + Date.now(),
      metadata: {
        user_id: "integration-test-user",
        credits: "100",
        package_name: "Integration Test Package"
      }
    }
  };
  
  // Process the webhook
  const response = await makeWebhookRequest(testPayload);
  const result = await response.json();
  
  assertEquals(response.status, 200);
  assertEquals(result.success, true);
  
  // Verify transaction was created in database
  const { data: transaction, error: transactionError } = await supabase
    .from("credit_transactions")
    .select("*")
    .eq("paystack_reference", testPayload.data.reference)
    .single();
  
  if (!transactionError && transaction) {
    assertEquals(transaction.user_id, "integration-test-user");
    assertEquals(transaction.credits, 100);
    assertEquals(transaction.type, "purchase");
    assertEquals(transaction.status, "completed");
    assertEquals(transaction.paystack_reference, testPayload.data.reference);
    
    console.log("✅ Database integration test passed:", transaction);
  } else {
    console.error("❌ Database integration test failed:", transactionError);
    throw new Error("Transaction not found in database");
  }
});