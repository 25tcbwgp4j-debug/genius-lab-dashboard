# WhatsApp Automation Layer — Production Hardening

**Scope:** Provider adapter, templates, webhook, idempotency, signature, retry, fallback, validation, admin client usage.

---

## 1. Architecture

| Area | Implementation |
|------|----------------|
| **Provider adapter** | `IWhatsAppAdapter` in `services/communications/types.ts`. `getWhatsAppAdapter()` in `whatsapp/index.ts` returns stub (only implementation); non-stub requested in production logs a warning and falls back to stub. |
| **Template-based sending** | `resolveTemplate(templateKey, channel, payload)` loads from DB or defaults; `substitute(template, payload)` injects `{{key}}` with server-built payload only. |
| **Dynamic parameter injection** | Payload built in `buildNotificationPayload()`; keys limited (128 chars), values coerced to string; placeholder keys escaped for RegExp to prevent injection. |
| **Communication logging** | Every send (success or failure) written to `communications` (channel, recipient, body, status, provider_message_id, error_message, sent_at). |

---

## 2. Webhook

| Area | Implementation |
|------|----------------|
| **Callback handling** | POST `/api/webhooks/whatsapp`: rate limit → read body → size check (≤100KB) → verify signature → parse with Zod → idempotency claim → safe status update. |
| **Signature verification** | `verifyWebhookSignature()`: Meta (X-Hub-Signature-256, rawBody, WHATSAPP_WEBHOOK_SECRET/META_APP_SECRET); Twilio (X-Twilio-Signature, url+params, TWILIO_AUTH_TOKEN). Production requires at least one configured secret. |
| **Strict Zod validation** | `twilioStatusCallbackSchema`: strict, MessageSid/MessageStatus with max lengths. `metaWebhookSchema`: structure for entry/changes/statuses. `parseAndNormalize()` returns null for non–status-callback payloads. |
| **Body size limit** | `WEBHOOK_BODY_MAX_BYTES = 100 * 1024`; 413 if exceeded. |
| **Idempotency** | `claimIdempotencyKey(supabase, messageId, normalizedStatus)`; key = `messageId:status`. Insert into `whatsapp_webhook_events`; 23505 = duplicate → skip processing. |
| **Duplicate event protection** | Same (messageId, status) processed only once; duplicate POSTs return 200 and skip. |
| **Out-of-order handling** | `safeUpdateCommunicationStatus()`: status order pending &lt; sent &lt; delivered; only allows same or higher; ignores out-of-order updates. |

---

## 3. Sending and Retry

| Area | Implementation |
|------|----------------|
| **Retry logic** | `sendWithRetry()` in `services/communications/retry.ts`: 3 attempts, exponential backoff (500ms, 1s, 2s, cap 5s). Exported constants: `SEND_RETRY_MAX_ATTEMPTS`, `SEND_RETRY_INITIAL_DELAY_MS`, `SEND_RETRY_MAX_DELAY_MS`. |
| **Fallback channel** | If preferred channel is WhatsApp and WhatsApp fails after retries, engine sends via email (same template, email body). |

---

## 4. Admin Client

Admin client (`createAdminClient`) is used **only** where there is no user context or RLS must be bypassed:

- **POST /api/webhooks/whatsapp** — idempotency insert and communications status update (no auth).
- **Public pages** — `/estimate/[token]`, `/track/[token]`, document API (token-only access).
- **Estimate approval actions** — public approve/reject by token.

Never used for authenticated dashboard or user-scoped data.

---

## 5. Files

- `services/communications/engine.ts` — send entry; template resolve; retry; fallback; logging.
- `services/communications/retry.ts` — sendWithRetry; exported retry constants.
- `services/communications/template-resolver.ts` — substitute with escaped keys and safe values.
- `services/communications/whatsapp/index.ts` — getWhatsAppAdapter; stub fallback.
- `app/api/webhooks/whatsapp/route.ts` — rate limit, body size, signature, Zod parse, idempotency, safe update.
- `lib/whatsapp-webhook/schemas.ts` — Zod schemas; WEBHOOK_BODY_MAX_BYTES; parseAndNormalize.
- `lib/whatsapp-webhook/verify-signature.ts` — Meta + Twilio verification.
- `lib/whatsapp-webhook/idempotency.ts` — claimIdempotencyKey (duplicate protection).
- `lib/whatsapp-webhook/safe-update.ts` — safeUpdateCommunicationStatus (out-of-order handling).
- `lib/whatsapp-webhook/log.ts` — structured webhook logging.
