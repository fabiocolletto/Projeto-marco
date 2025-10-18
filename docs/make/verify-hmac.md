# Make Webhook HMAC Verification

The following Node.js snippet shows how to validate a Make webhook request when JSON payloads are passed through without modification.

```js
import crypto from 'node:crypto';

const WEBHOOK_SECRET = process.env.MAKE_WEBHOOK_SECRET;
const MAX_SKEW_MS = 5 * 60 * 1000; // 5 minutes

export function verifyMakeWebhook(req, res, next) {
  const signature = req.header('X-Signature');
  const timestampHeader = req.header('X-Signature-Timestamp');
  const nonce = req.header('X-Signature-Nonce');

  if (!signature || !timestampHeader || !nonce) {
    return res.status(400).send('Missing signature headers');
  }

  const timestamp = Number.parseInt(timestampHeader, 10);
  const now = Date.now();

  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp) > MAX_SKEW_MS) {
    return res.status(400).send('Invalid or expired timestamp');
  }

  // TODO: persist and check nonces in a shared datastore to prevent reuse attacks.
  const isNonceReplay = false;
  if (isNonceReplay) {
    return res.status(409).send('Nonce already used');
  }

  const rawBody = req.rawBody ?? JSON.stringify(req.body);
  const message = `${timestamp}.${nonce}.${rawBody}`;

  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(message)
    .digest('hex');

  const signatureBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return res.status(401).send('Invalid signature');
  }

  return next();
}
```

## Webhook configuration checklist

- Enable the Make webhook API key so signature headers are emitted.
- Capture the `X-Signature`, `X-Signature-Timestamp`, and `X-Signature-Nonce` request headers.
- Configure the scenario to pass JSON through without altering the body.
- Leave the data structure empty so the raw payload is delivered to the webhook.
