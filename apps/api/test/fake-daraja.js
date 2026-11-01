import http from 'node:http';

/**
 * Stands in for Safaricom's Daraja API: OAuth, STK Push and STK Query. Records every request.
 * Decide how a payment ends with `settle(checkoutRequestId, resultCode)` ('0' paid, '1032'
 * cancelled, ...); until then STK Query answers "still being processed", as Daraja does.
 */
export async function startFakeDaraja() {
  const state = { requests: [], results: new Map(), pushes: 0, failPush: false };

  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const parsed = body ? JSON.parse(body) : {};
      state.requests.push({ url: req.url, auth: req.headers.authorization, body: parsed });
      const json = (status, obj) => res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(obj));

      if (req.url.startsWith('/oauth/v1/generate')) return json(200, { access_token: 'fake-token', expires_in: '3599' });

      if (req.url === '/mpesa/stkpush/v1/processrequest') {
        if (state.failPush) return json(400, { errorCode: '400.002.02', errorMessage: 'Bad Request - Invalid PhoneNumber' });
        state.pushes += 1;
        return json(200, {
          MerchantRequestID: `mr-${state.pushes}`,
          CheckoutRequestID: `ws_CO_${state.pushes}`,
          ResponseCode: '0',
          ResponseDescription: 'Success. Request accepted for processing',
          CustomerMessage: 'Success. Request accepted for processing',
        });
      }

      if (req.url === '/mpesa/stkpushquery/v1/query') {
        const result = state.results.get(parsed.CheckoutRequestID);
        if (!result) return json(500, { errorCode: '500.001.1001', errorMessage: 'The transaction is being processed' });
        return json(200, {
          ResponseCode: '0',
          CheckoutRequestID: parsed.CheckoutRequestID,
          ResultCode: result,
          ResultDesc: result === '0' ? 'The service request is processed successfully.' : 'Request cancelled by user',
        });
      }

      json(404, { errorMessage: 'not found' });
    });
  });
  await new Promise((r) => server.listen(0, r));

  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    state,
    calls: (path) => state.requests.filter((r) => r.url.startsWith(path)),
    settle: (checkoutRequestId, resultCode) => state.results.set(checkoutRequestId, resultCode),
    reset() {
      state.requests = [];
      state.results.clear();
      state.failPush = false;
    },
    close: () => server.close(),
  };
}

/** The body Safaricom posts to our callback URL when a prompt ends. */
export function stkCallback(checkoutRequestId, resultCode, { amount = 50, receipt = 'SBX1234567', phone = 254712345678 } = {}) {
  return {
    Body: {
      stkCallback: {
        MerchantRequestID: 'mr-x',
        CheckoutRequestID: checkoutRequestId,
        ResultCode: Number(resultCode),
        ResultDesc: Number(resultCode) === 0 ? 'The service request is processed successfully.' : 'Request cancelled by user',
        ...(Number(resultCode) === 0 && {
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: amount },
              { Name: 'MpesaReceiptNumber', Value: receipt },
              { Name: 'TransactionDate', Value: 20261101120000 },
              { Name: 'PhoneNumber', Value: phone },
            ],
          },
        }),
      },
    },
  };
}
