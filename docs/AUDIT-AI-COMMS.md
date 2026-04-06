# Audit: AI Diagnosis & Omnichannel Communications

**Date:** Post-implementation  
**Scope:** A) AI diagnosis layer, B) WhatsApp, C) Email, D) Seven mandatory flows.

---

## A) AI diagnosis layer

| Requirement | Status | Notes |
|-------------|--------|--------|
| Provider abstraction | ✅ | `IAIDiagnosisProvider` in `lib/ai/provider.ts`; `OpenAIDiagnosisAdapter` in `openai-adapter.ts` |
| Structured prompt builder | ✅ | `lib/ai/prompt-builder.ts` — system + user, Italian, JSON output |
| Zod schema for AI response | ✅ | `lib/ai/schemas.ts` — aiDiagnosisResponseSchema, parseAIResponse() |
| Store AI suggestions in DB | ✅ | `ticket_ai_diagnosis` + ticket ai_* fields; event in ticket_events |
| Technician review: accept, discard, regenerate | ✅ | Actions in `app/actions/ai-diagnosis.ts`; UI in `AIDiagnosisBlock` |
| Show AI risk flags in ticket UI | ✅ | Risk notes in AIDiagnosisBlock + ticket.ai_risk_flags |
| Never auto-overwrite technician diagnosis | ✅ | run-diagnosis only updates ai_*; Accept action appends to diagnosis |
| Production-extendable | ✅ | New provider implements interface; factory can switch by env |

---

## B) WhatsApp automation layer

| Requirement | Status | Notes |
|-------------|--------|--------|
| Generic provider adapter | ✅ | `IWhatsAppAdapter` in `services/communications/types.ts` |
| Message template system | ✅ | `template-resolver.ts` + DB `message_templates` + defaults |
| Delivery log | ✅ | Every send logged in `communications` (status, provider_message_id, error_message) |
| Fallback handling | ✅ | If preferred=whatsapp and WhatsApp fails, engine sends email |
| Send links and document URLs | ✅ | sendLink, sendDocument on adapter; engine uses documentUrl in payload |
| Webhook delivery status sync | ✅ | `POST /api/webhooks/whatsapp`; uses admin client to update communications |

---

## C) Email automation layer

| Requirement | Status | Notes |
|-------------|--------|--------|
| Resend service abstraction | ✅ | `IEmailAdapter`, `ResendEmailService` in `email/resend-service.ts` |
| Reusable HTML templates (Italian) | ✅ | `emails/layout.tsx` + `emails/templates/*.tsx` (intake, estimate, pickup, payment, closed) |
| Automatic triggers on ticket events | ✅ | Via dispatchNotification() from createTicket and updateTicketStatus |
| Attachments/links when necessary | ✅ | Links in payload (tracking_link, estimate_link); attachment support in payload possible |

---

## D) Mandatory flows

| # | Flow | Trigger | Status |
|---|------|---------|--------|
| 1 | Intake sheet created → WhatsApp + email | createTicket() | ✅ |
| 2 | Estimate created → WhatsApp + email | updateTicketStatus(..., estimate_ready) | ✅ |
| 3 | Repair update → WhatsApp + email | updateTicketStatus(..., in_diagnosis \| waiting_parts \| in_repair \| testing) | ✅ |
| 4 | Ready for pickup → WhatsApp + email | updateTicketStatus(..., ready_for_pickup) | ✅ |
| 5 | Ready for shipping → WhatsApp + email | updateTicketStatus(..., ready_for_shipping) | ✅ |
| 6 | Bank transfer instructions → WhatsApp + email | Same as 4/5 when amount_due > 0 | ✅ |
| 7 | Ticket closed → WhatsApp + email | updateTicketStatus(..., delivered) | ✅ |

---

## Build & lint

- `npm run build`: must pass.
- Lint: run `npm run lint` and fix any reported issues.

---

## Optional hardening (future)

- Rate limit on `/api/webhooks/whatsapp` and validate provider signature.
- AI: optional `ai_request_log` table for request/response audit; retry with backoff in adapter.
- Email: render React email components to HTML and pass to Resend for key templates.
