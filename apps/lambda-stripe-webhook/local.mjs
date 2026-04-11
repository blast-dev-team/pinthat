// Local HTTP wrapper — shapes incoming requests like a Lambda Function
// URL event and delegates to ./index.mjs. Run with:
//
//   node -r dotenv/config local.mjs
//
// Then use `stripe listen --forward-to http://localhost:3001/` to have
// Stripe CLI forward real webhook events with valid signatures. The
// signing secret that `stripe listen` prints must match the
// STRIPE_WEBHOOK_SECRET in your .env.

import { createServer } from 'node:http';
import { handler } from './index.mjs';

const PORT = Number(process.env.PORT || 3001);

createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks).toString('utf8');

  const event = {
    requestContext: { http: { method: req.method } },
    headers: Object.fromEntries(
      Object.entries(req.headers).map(([k, v]) => [k.toLowerCase(), String(v)]),
    ),
    body,
    isBase64Encoded: false,
  };

  try {
    const result = await handler(event);
    res.writeHead(result.statusCode, result.headers || {});
    res.end(typeof result.body === 'string' ? result.body : JSON.stringify(result.body));
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(e.message);
  }
}).listen(PORT, () => console.log(`stripe-webhook → http://localhost:${PORT}`));
