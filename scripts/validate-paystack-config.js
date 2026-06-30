#!/usr/bin/env node

/**
 * Paystack Configuration Validation Script
 * 
 * This script validates that Paystack environment variables are properly configured
 * and can establish a connection to the Paystack API.
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const requiredEnvVars = [
  'PAYSTACK_PUBLIC_KEY',
  'PAYSTACK_SECRET_KEY',
  'PAYSTACK_WEBHOOK_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY'
];

console.log('🔍 Validating Paystack Configuration...\n');

// Check environment variables
let missingVars = [];
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.includes('your_') || value.includes('_here')) {
    missingVars.push(varName);
    console.log(`❌ ${varName}: Not configured or using placeholder value`);
  } else {
    console.log(`✅ ${varName}: Configured`);
  }
});

if (missingVars.length > 0) {
  console.log('\n⚠️  Configuration Issues Found:');
  console.log('Please update your .env file with actual Paystack credentials.');
  console.log('See PAYSTACK_SETUP_GUIDE.md for detailed instructions.\n');
  
  console.log('Missing or placeholder values:');
  missingVars.forEach(varName => {
    console.log(`  - ${varName}`);
  });
  
  process.exit(1);
}

// Test Paystack API connection (only if we have real credentials)
const secretKey = process.env.PAYSTACK_SECRET_KEY;
if (secretKey && secretKey.startsWith('sk_')) {
  console.log('\n🔗 Testing Paystack API Connection...');
  
  try {
    // Simple API test using fetch instead of SDK to avoid import issues
    const response = await fetch('https://api.paystack.co/bank', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok && data.status) {
      console.log('✅ Paystack API connection successful');
      console.log(`📊 Retrieved ${data.data.length} banks from API`);
    } else {
      console.log('❌ Paystack API connection failed');
      console.log('Response:', data);
    }
  } catch (error) {
    console.log('❌ Paystack API connection error:');
    console.log(error.message);
    
    if (error.message.includes('Invalid key')) {
      console.log('\n💡 Tip: Make sure you\'re using a valid Paystack secret key');
      console.log('   Test keys start with "sk_test_"');
      console.log('   Live keys start with "sk_live_"');
    }
  }
}

console.log('\n🎉 Configuration validation complete!');
console.log('\nNext steps:');
console.log('1. If using placeholder values, update .env with real Paystack credentials');
console.log('2. Set up webhook URL in Paystack dashboard');
console.log('3. Test payment flow with Paystack test cards');
console.log('\nSee PAYSTACK_SETUP_GUIDE.md for detailed setup instructions.');