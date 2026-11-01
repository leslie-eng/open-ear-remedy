# M-Pesa through Safaricom's Daraja API, not a payment gateway

Payments are made with M-Pesa Express (STK Push) through Safaricom's Daraja API directly: the person enters their Safaricom number and confirms a PIN prompt on their phone. We chose this over Paystack (which the first version used) because almost all of our users pay with M-Pesa, and paying Safaricom directly avoids a gateway's fee and a redirect to another site.

## Considered Options

- **Paystack**: takes M-Pesa and cards and signs its webhooks, but adds a fee and a hosted checkout page. Removed.

## Consequences

- **No card payments.** People without M-Pesa cannot pay.
- **Production needs our own Paybill or Till** and Safaricom's go-live approval; until then everything runs on the Daraja sandbox. Paybill or Till is one setting (`DARAJA_TRANSACTION_TYPE`).
- **Callbacks are not trusted.** Daraja's callbacks are not signed, so a callback only prompts us to ask Safaricom (STK Query) how the payment ended; Credits, a Monthly Pass or ebooks are granted only on Safaricom's own answer. The callback URL also carries a secret token so stray requests are turned away early.
- **The payment page confirms by polling**, so a payment is confirmed even if Safaricom's callback never arrives (for example in local development).
- **M-Pesa takes whole shillings**, so an ebook order priced with cents is charged rounded up.
