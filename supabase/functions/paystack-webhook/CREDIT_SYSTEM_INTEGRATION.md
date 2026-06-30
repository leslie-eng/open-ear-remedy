# Paystack Webhook Credit System Integration

## Overview

This document describes the implementation of Task 3.2: Credit System Integration for the Paystack webhook handler. The integration ensures atomic credit updates, consistent database schema, and proper handling of both new and existing users.

## Key Features Implemented

### 1. Atomic Credit Updates
- **Database Function**: `update_user_credits_atomic()` provides atomic credit updates with transaction safety
- **Fallback Logic**: Manual transaction handling when atomic function is not available
- **Race Condition Prevention**: Uses database locks to prevent concurrent update issues

### 2. Consistent Database Schema
- **user_credits table**: Tracks user credit balances with unique constraints
- **credit_transactions table**: Records all credit-related transactions with full audit trail
- **Backward Compatibility**: Supports both Paystack and legacy Stripe transaction references

### 3. Comprehensive Error Handling
- **Metadata Validation**: Validates required fields (user_id, credits, reference, amount)
- **Idempotency**: Prevents duplicate processing of the same webhook event
- **Graceful Degradation**: Falls back to manual operations if atomic functions fail
- **Detailed Logging**: Comprehensive audit trail for debugging and monitoring

### 4. Security Features
- **Webhook Signature Verification**: HMAC SHA512 signature validation
- **Input Sanitization**: Validates all input parameters before processing
- **Error Message Sanitization**: Prevents sensitive information leakage

## Database Schema

### user_credits Table
```sql
CREATE TABLE user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
  phone_number VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### credit_transactions Table
```sql
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'bonus')),
  credits INTEGER NOT NULL,
  amount DECIMAL(10,2),
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'pending', 'refunded')),
  paystack_reference VARCHAR(100),
  paystack_transaction_id BIGINT,
  stripe_payment_intent_id VARCHAR(255), -- Legacy support
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Webhook Event Processing

### Successful Payment (charge.success)
1. **Signature Verification**: Validates webhook authenticity using HMAC SHA512
2. **Metadata Extraction**: Extracts user_id, credits, package_name, amount, reference
3. **Input Validation**: Validates all required fields and data types
4. **Idempotency Check**: Prevents duplicate processing using paystack_reference
5. **Atomic Credit Update**: Uses database function for safe credit addition
6. **Transaction Recording**: Creates audit trail in credit_transactions table
7. **Response Generation**: Returns detailed success response with transaction details

### Failed Payment (charge.failed)
1. **Signature Verification**: Same as successful payment
2. **Metadata Extraction**: Extracts transaction details for audit
3. **Idempotency Check**: Prevents duplicate failed transaction records
4. **Transaction Recording**: Creates failed transaction record for audit trail
5. **Response Generation**: Returns acknowledgment of failure recording

## Atomic Credit Update Function

The `update_user_credits_atomic()` function provides:

- **Atomic Operations**: All credit updates and transaction creation in single database transaction
- **Locking**: Uses `FOR UPDATE` to prevent race conditions
- **User Creation**: Automatically creates user_credits record for new users
- **Error Handling**: Returns structured success/error responses
- **Audit Trail**: Creates transaction records with all relevant metadata

### Function Parameters
```sql
update_user_credits_atomic(
  p_user_id UUID,
  p_credits_to_add INTEGER,
  p_transaction_type VARCHAR(50),
  p_transaction_description TEXT,
  p_amount DECIMAL(10,2) DEFAULT NULL,
  p_paystack_reference VARCHAR(100) DEFAULT NULL,
  p_paystack_transaction_id BIGINT DEFAULT NULL,
  p_stripe_payment_intent_id VARCHAR(255) DEFAULT NULL
)
```

### Return Value
```json
{
  "success": true,
  "previous_credits": 25,
  "new_credits": 75,
  "credits_added": 50,
  "transaction_id": "uuid-here"
}
```

## Error Handling Strategy

### Validation Errors (400)
- Missing required metadata (user_id, reference)
- Invalid credits amount (≤ 0)
- Invalid payment amount (≤ 0)
- Malformed webhook payload

### Authentication Errors (400)
- Missing webhook signature
- Invalid webhook signature
- Signature verification failure

### Server Errors (500)
- Database connection failures
- Configuration errors (missing environment variables)
- Atomic function execution errors

### Error Response Format
```json
{
  "error": "Error message",
  "details": "Additional details (test mode only)"
}
```

## Idempotency Implementation

### Duplicate Prevention
- Uses `paystack_reference` as unique identifier
- Checks existing transactions before processing
- Returns existing transaction details for duplicates
- Prevents credit double-addition and duplicate records

### Idempotency Response
```json
{
  "success": true,
  "message": "Transaction already processed",
  "reference": "paystack_reference",
  "status": "completed",
  "credits_added": 50,
  "amount": 50.00,
  "transaction_id": "existing-uuid"
}
```

## Testing and Validation

### Validation Script
- **Location**: `supabase/functions/paystack-webhook/validate.js`
- **Coverage**: Metadata validation, signature verification, amount conversion
- **Test Cases**: Valid/invalid inputs, error conditions, edge cases

### Test Results
✅ Metadata validation  
✅ Error handling  
✅ Signature verification  
✅ Amount conversion  
✅ Credit system logic  

### Integration Tests
- **Location**: `supabase/functions/paystack-webhook/test.ts`
- **Coverage**: End-to-end webhook processing, database operations
- **Scenarios**: Success/failure payments, idempotency, invalid signatures

## Security Considerations

### Webhook Security
- **Signature Verification**: HMAC SHA512 with secret key
- **Input Validation**: All parameters validated before processing
- **SQL Injection Prevention**: Parameterized queries and prepared statements
- **Error Information**: Sanitized error messages in production

### Data Protection
- **Sensitive Data**: No payment card details logged or stored
- **Audit Trail**: Complete transaction history for compliance
- **Access Control**: Row Level Security (RLS) policies enforced
- **Environment Variables**: Secure credential storage

## Performance Optimizations

### Database Optimizations
- **Indexes**: Optimized indexes on frequently queried columns
- **Atomic Operations**: Single database transaction for credit updates
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Minimal database round trips

### Webhook Processing
- **Fast Response**: Quick 200 OK response to Paystack
- **Async Processing**: Non-blocking webhook acknowledgment
- **Error Recovery**: Graceful handling of temporary failures
- **Logging**: Structured logging for monitoring and debugging

## Monitoring and Alerting

### Key Metrics
- Webhook processing success rate
- Credit update accuracy
- Transaction creation success
- Error rates by category
- Response time distribution

### Logging Structure
```json
{
  "event": "charge.success",
  "reference": "paystack_reference",
  "user_id": "user-uuid",
  "credits_added": 50,
  "amount": 50.00,
  "processing_time_ms": 150,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Alert Conditions
- Webhook signature verification failures > 1%
- Credit update failures > 0.1%
- Database connection errors
- Processing time > 5 seconds

## Deployment Checklist

### Pre-deployment
- [ ] Database migration applied (005_create_credit_system_tables.sql)
- [ ] Environment variables configured (PAYSTACK_WEBHOOK_SECRET)
- [ ] Webhook URL configured in Paystack dashboard
- [ ] Test webhook events processed successfully

### Post-deployment
- [ ] Monitor webhook processing success rate
- [ ] Verify credit updates in database
- [ ] Check transaction audit trail
- [ ] Validate error handling and logging

### Rollback Plan
- [ ] Keep previous webhook handler available
- [ ] Database rollback script prepared
- [ ] Monitoring alerts configured
- [ ] Incident response procedures documented

## Requirements Satisfied

This implementation satisfies the following requirements:

- **2.3**: Update user credits in database on successful payments ✅
- **4.1**: Add purchased credits to user's account ✅
- **4.2**: Create transaction records with same structure ✅
- **4.3**: Handle credit updates atomically ✅
- **4.4**: Add new credits to existing balance ✅
- **4.5**: Create new credit record for new users ✅
- **4.6**: Maintain transaction history format ✅
- **8.1-8.6**: Preserve transaction data format and consistency ✅

## Conclusion

The credit system integration provides a robust, secure, and scalable solution for processing Paystack payments and updating user credits. The implementation includes comprehensive error handling, atomic operations, and extensive testing to ensure reliability and data consistency.