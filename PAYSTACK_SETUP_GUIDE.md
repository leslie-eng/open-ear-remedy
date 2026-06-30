# Paystack Setup Guide

This guide helps you set up Paystack integration for the payment system migration.

## 1. Create Paystack Account

1. Visit [https://paystack.com](https://paystack.com)
2. Sign up for a new account or log in to existing account
3. Complete account verification process

## 2. Obtain API Keys

### Development/Test Keys
1. Go to Settings > API Keys & Webhooks
2. Copy the **Test Public Key** (starts with `pk_test_`)
3. Copy the **Test Secret Key** (starts with `sk_test_`)

### Production Keys (for later deployment)
1. Complete business verification in Paystack dashboard
2. Go to Settings > API Keys & Webhooks
3. Copy the **Live Public Key** (starts with `pk_live_`)
4. Copy the **Live Secret Key** (starts with `sk_live_`)

## 3. Configure Environment Variables

Update your `.env` file with the following variables:

```env
# Paystack Configuration
PAYSTACK_PUBLIC_KEY="pk_test_your_actual_public_key_here"
PAYSTACK_SECRET_KEY="sk_test_your_actual_secret_key_here"
PAYSTACK_WEBHOOK_SECRET="your_webhook_secret_here"

# Supabase Service Role Key (for webhook processing)
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key_here"
```

## 4. Set Up Webhooks

1. In Paystack dashboard, go to Settings > API Keys & Webhooks
2. Click "Add Webhook URL"
3. Enter your webhook URL: `https://your-project.supabase.co/functions/v1/paystack-webhook`
4. Select events to listen for:
   - `charge.success`
   - `charge.failed`
   - `invoice.payment_failed` (optional)
5. Copy the webhook secret and add it to your environment variables

## 5. Test Cards for Development

Use these test cards in development mode:

### Successful Payments
- **Card Number**: 4084084084084081
- **Expiry**: Any future date
- **CVV**: Any 3 digits

### Declined Payments
- **Card Number**: 4084080000005408
- **Expiry**: Any future date
- **CVV**: Any 3 digits

### PIN Authentication Test
- **Card Number**: 5078507850785078
- **Expiry**: Any future date
- **CVV**: Any 3 digits
- **PIN**: 1234

## 6. Currency and Pricing

Paystack supports multiple currencies. For this implementation:
- **Primary Currency**: USD (US Dollars)
- **Amount Format**: Amounts are sent in kobo/cents (multiply by 100)
- **Example**: $10.00 = 1000 kobo

## 7. Webhook Security

Paystack webhooks are secured using HMAC SHA512 signatures:
- Webhook secret is used to verify request authenticity
- Always verify webhook signatures before processing events
- Reject requests with invalid signatures

## 8. Testing Checklist

Before going live, test the following scenarios:

- [ ] Successful payment flow
- [ ] Failed payment handling
- [ ] Webhook signature verification
- [ ] Credit system integration
- [ ] Error handling and user feedback
- [ ] Redirect URLs (success/cancel)

## 9. Production Deployment

When ready for production:

1. Switch to live API keys in production environment
2. Update webhook URLs to production endpoints
3. Test with small amounts first
4. Monitor transaction logs and error rates
5. Set up alerting for payment failures

## 10. Support and Documentation

- **Paystack Documentation**: [https://paystack.com/docs](https://paystack.com/docs)
- **API Reference**: [https://paystack.com/docs/api](https://paystack.com/docs/api)
- **Test Cards**: [https://paystack.com/docs/payments/test-payments](https://paystack.com/docs/payments/test-payments)
- **Webhook Guide**: [https://paystack.com/docs/payments/webhooks](https://paystack.com/docs/payments/webhooks)

## Troubleshooting

### Common Issues

1. **Invalid API Key Error**
   - Verify you're using the correct key for your environment (test vs live)
   - Check that the key is properly set in environment variables

2. **Webhook Signature Verification Failed**
   - Ensure webhook secret matches the one in Paystack dashboard
   - Verify the signature verification implementation

3. **Payment Initialization Failed**
   - Check that all required fields are provided
   - Verify amount is in correct format (kobo/cents)
   - Ensure email format is valid

4. **Redirect Issues**
   - Verify callback URLs are accessible
   - Check CORS configuration for your domain
   - Ensure URLs use HTTPS in production