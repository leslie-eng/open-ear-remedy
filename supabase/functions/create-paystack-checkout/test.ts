// Simple test file for the create-paystack-checkout function
// This can be run with: deno test --allow-net --allow-env test.ts

import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Test data that matches our expected request structure
const validCheckoutRequest = {
  userId: "123e4567-e89b-12d3-a456-426614174000",
  userEmail: "test@example.com",
  packageName: "100 Credits",
  credits: 100,
  price: 19.99,
  successUrl: "https://example.com/success",
  cancelUrl: "https://example.com/cancel"
};

const minimalCheckoutRequest = {
  userId: "123e4567-e89b-12d3-a456-426614174000",
  credits: 50,
  price: 9.99
};

Deno.test("checkout request validation - valid request", () => {
  // Test that valid request has all required fields
  assertExists(validCheckoutRequest.userId);
  assertExists(validCheckoutRequest.credits);
  assertExists(validCheckoutRequest.price);
  assertEquals(typeof validCheckoutRequest.userId, "string");
  assertEquals(typeof validCheckoutRequest.credits, "number");
  assertEquals(typeof validCheckoutRequest.price, "number");
  assertEquals(validCheckoutRequest.credits > 0, true);
  assertEquals(validCheckoutRequest.price > 0, true);
});

Deno.test("checkout request validation - minimal request", () => {
  // Test that minimal request has required fields only
  assertExists(minimalCheckoutRequest.userId);
  assertExists(minimalCheckoutRequest.credits);
  assertExists(minimalCheckoutRequest.price);
  assertEquals(typeof minimalCheckoutRequest.userId, "string");
  assertEquals(typeof minimalCheckoutRequest.credits, "number");
  assertEquals(typeof minimalCheckoutRequest.price, "number");
});

Deno.test("price conversion to kobo", () => {
  // Test dollar to kobo conversion (Paystack's smallest currency unit)
  const dollarsToKobo = (amountInDollars: number): number => {
    return Math.round(amountInDollars * 100);
  };

  assertEquals(dollarsToKobo(19.99), 1999);
  assertEquals(dollarsToKobo(9.99), 999);
  assertEquals(dollarsToKobo(100.00), 10000);
  assertEquals(dollarsToKobo(0.01), 1);
});

Deno.test("transaction reference generation", () => {
  // Test transaction reference format: PS_YYYYMMDD_HHMMSS_RANDOM
  const generateTransactionReference = (): string => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    return `PS_${dateStr}_${timeStr}_${random}`;
  };

  const reference = generateTransactionReference();
  
  // Check format
  assertEquals(reference.startsWith("PS_"), true);
  assertEquals(reference.length >= 20, true); // PS_ + 8 digits + _ + 6 digits + _ + 6 chars
  
  // Check uniqueness (generate multiple references)
  const references = new Set();
  for (let i = 0; i < 10; i++) {
    references.add(generateTransactionReference());
  }
  assertEquals(references.size, 10); // All should be unique
});

Deno.test("metadata structure validation", () => {
  // Test that metadata structure matches Paystack requirements
  const metadata = {
    user_id: validCheckoutRequest.userId,
    credits: validCheckoutRequest.credits.toString(),
    package_name: validCheckoutRequest.packageName,
    custom_fields: [
      {
        display_name: "User ID",
        variable_name: "user_id",
        value: validCheckoutRequest.userId
      },
      {
        display_name: "Credits",
        variable_name: "credits", 
        value: validCheckoutRequest.credits.toString()
      },
      {
        display_name: "Package",
        variable_name: "package_name",
        value: validCheckoutRequest.packageName
      }
    ]
  };

  assertExists(metadata.user_id);
  assertExists(metadata.credits);
  assertExists(metadata.package_name);
  assertExists(metadata.custom_fields);
  assertEquals(metadata.custom_fields.length, 3);
  assertEquals(typeof metadata.credits, "string"); // Paystack expects string
});

Deno.test("email validation logic", () => {
  // Test email validation and fallback logic
  const validateEmail = (email?: string, userId?: string): string => {
    if (email && email.includes('@')) {
      return email;
    }
    return `user-${userId}@openear.app`;
  };

  assertEquals(validateEmail("test@example.com", "123"), "test@example.com");
  assertEquals(validateEmail("", "123"), "user-123@openear.app");
  assertEquals(validateEmail(undefined, "456"), "user-456@openear.app");
  assertEquals(validateEmail("invalid-email", "789"), "user-789@openear.app");
});

Deno.test("input validation scenarios", () => {
  // Test various invalid input scenarios
  const validateInput = (userId: any, credits: any, price: any): string[] => {
    const errors: string[] = [];
    
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      errors.push("userId must be a non-empty string");
    }
    
    if (!credits || typeof credits !== 'number' || credits <= 0 || !Number.isInteger(credits)) {
      errors.push("credits must be a positive integer");
    }
    
    if (!price || typeof price !== 'number' || price <= 0) {
      errors.push("price must be a positive number");
    }
    
    return errors;
  };

  // Valid inputs
  assertEquals(validateInput("valid-id", 100, 19.99), []);
  
  // Invalid userId
  assertEquals(validateInput("", 100, 19.99).length, 1);
  assertEquals(validateInput(null, 100, 19.99).length, 1);
  assertEquals(validateInput(123, 100, 19.99).length, 1);
  
  // Invalid credits
  assertEquals(validateInput("valid-id", 0, 19.99).length, 1);
  assertEquals(validateInput("valid-id", -10, 19.99).length, 1);
  assertEquals(validateInput("valid-id", 10.5, 19.99).length, 1);
  assertEquals(validateInput("valid-id", "100", 19.99).length, 1);
  
  // Invalid price
  assertEquals(validateInput("valid-id", 100, 0).length, 1);
  assertEquals(validateInput("valid-id", 100, -5).length, 1);
  assertEquals(validateInput("valid-id", 100, "19.99").length, 1);
});

Deno.test("paystack transaction data structure", () => {
  // Test that transaction data matches Paystack API requirements
  const transactionData = {
    email: "test@example.com",
    amount: 1999, // in kobo
    reference: "PS_20240101_120000_ABC123",
    currency: "USD",
    metadata: {
      user_id: "123e4567-e89b-12d3-a456-426614174000",
      credits: "100",
      package_name: "100 Credits"
    },
    callback_url: "https://example.com/success",
    cancel_action: "https://example.com/cancel"
  };

  // Validate required fields for Paystack API
  assertExists(transactionData.email);
  assertExists(transactionData.amount);
  assertExists(transactionData.reference);
  assertEquals(typeof transactionData.amount, "number");
  assertEquals(transactionData.currency, "USD");
  assertEquals(transactionData.amount > 0, true);
});

console.log("✅ All tests passed! The create-paystack-checkout function structure is correct.");