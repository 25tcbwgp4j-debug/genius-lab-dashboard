# AI Diagnosis & Omnichannel Communications — Architecture

**Scope:** AI diagnosis layer, WhatsApp automation, Email automation, and the seven mandatory communication flows.  
**Principles:** Phased implementation, provider abstraction, event-driven flows, no auto-overwrite of technician data, production-extendable design.

---

## 1. Schema (Database)

### 1.1 AI diagnosis

| Table | Purpose |
|-------|--------|
| `ticket_ai_diagnosis` | One row per AI suggestion: hypotheses, suggested_checks, probable_parts, complexity, risk_notes, confidence_score, next_actions, raw_response, created_at. FK: ticket_id. |
| `tickets` | Fields used by AI module: ai_diagnosis_summary, ai_recommended_actions, ai_risk_flags (display only). **diagnosis** is technician-only; never written by AI. |

- AI writes only to `ticket_ai_diagnosis` and to `tickets.(ai_diagnosis_summary | ai_recommended_actions | ai_risk_flags)`.
- Technician "Accept" copies suggestion text into `tickets.diagnosis` (append), never replace.

### 1.2 Communications

| Table | Purpose |
|-------|--------|
| `communications` | Delivery log: ticket_id, customer_id, channel (whatsapp \| email), template_key, recipient, subject?, payload (JSONB), status (pending \| sent \| delivered \| failed), provider_message_id, error_message, created_at, sent_at. |
| `message_templates` | Editable copy: template_key, channel (whatsapp \| email), subject? (email), body, active. UNIQUE(template_key, channel). |
| `company_settings` | Singleton: phone, working_hours, iban, account_holder, payment_instructions for payload. |

---

## 2. AI Diagnosis Layer — Architecture

### 2.1 Provider abstraction

- **Interface:** `IAIDiagnosisProvider` with `generateStructuredDiagnosis(input: AIDiagnosisInput): Promise<AIDiagnosisResult>`.
- **Input:** customerReportedIssue, deviceCategory, model, intakeNotes?, priorRepairsSummary?, technicalObservations?.
- **Result:** hypotheses[], suggestedChecks[], probableParts[], complexity?, riskNotes[], confidenceScore?, nextActions[], raw?.
- **Implementations:** `OpenAIDiagnosisAdapter` (OpenAI-compatible API). Further providers (e.g. Anthropic, local model) can be added behind the same interface.

### 2.2 Structured prompt builder

- **Location:** `lib/ai/prompt-builder.ts`.
- **Output:** `{ system, user }` for chat API. System: role (assistant to technician), language (Italian), rules (no definitive diagnosis, highlight Face ID/Touch ID/True Tone/battery/liquid/board risks). User: sections for problem, device, intake, prior repairs, technical observations, plus instruction to return JSON.

### 2.3 Zod schema for AI response

- **Location:** `lib/ai/schemas.ts`.
- **Schema:** aiDiagnosisResponseSchema (hypotheses, suggested_checks, probable_parts, complexity, risk_notes, confidence_score, next_actions). Defaults for missing arrays.
- **Parse:** parseAIResponse(raw) strips markdown/code blocks if present, JSON.parse + schema.parse. Throws on invalid payload.

### 2.4 Storage and technician workflow

- **Storage:** Every generation inserts into `ticket_ai_diagnosis`; ticket gets ai_diagnosis_summary, ai_recommended_actions, ai_risk_flags and status `ai_diagnosis_generated`. Event logged in `ticket_events`.
- **Review:** Technician sees latest suggestion in ticket UI (AIDiagnosisBlock).
- **Accept:** Server action appends suggestion text to `tickets.diagnosis` (never overwrite).
- **Discard:** Server action clears ai_diagnosis_summary, ai_recommended_actions, ai_risk_flags; history remains in `ticket_ai_diagnosis`.
- **Regenerate:** Same as new generation; new row in `ticket_ai_diagnosis`, ticket fields updated.

### 2.5 Risk flags and no auto-overwrite

- **Risk flags:** Shown in ticket UI from `tickets.ai_risk_flags` and from latest `ticket_ai_diagnosis.risk_notes` (with clear "Avvertenze" styling).
- **No auto-overwrite:** AI never writes to `tickets.diagnosis`. Only the "Accept" action appends to it.

### 2.6 Production-extendable

- New provider: implement `IAIDiagnosisProvider`, register in a factory (e.g. env `AI_DIAGNOSIS_PROVIDER=openai|anthropic`).
- Optional: add `ai_request_log` table for request/response audit; retry/backoff in adapter.

---

## 3. WhatsApp Automation — Architecture

### 3.1 Generic provider adapter

- **Interface:** `IWhatsAppAdapter`: sendText(to, body), sendLink?(to, url, caption?), sendDocument?(to, url, filename), sendTemplate?(to, templateKey, params).
- **Return:** SendResult { success, messageId?, error? }.
- **Implementations:** StubWhatsAppAdapter (dev); production: Twilio/Meta adapter implementing same interface, selected via env (e.g. WHATSAPP_ADAPTER=stub|twilio|meta).

### 3.2 Message template system

- **Source of truth:** DB `message_templates` (template_key, channel, subject?, body, active). Fallback: default strings in code (template-resolver).
- **Placeholders:** {{customer_name}}, {{ticket_number}}, {{tracking_link}}, {{estimate_link}}, {{shop_phone}}, {{amount_due}}, {{status}}, {{working_hours}}, {{iban}}, {{beneficiary}}, {{payment_instructions}}.
- **Resolver:** resolveTemplate(templateKey, channel, payload) → { subject?, body } with substitution.

### 3.3 Delivery log

- Every send attempt (WhatsApp and email) is logged in `communications`: recipient, template_key, status (pending → sent/failed), provider_message_id, error_message, sent_at.

### 3.4 Fallback handling

- If customer preferred channel is WhatsApp only and WhatsApp send fails, engine sends same content via email (when email exists) and logs both.

### 3.5 Links and document URLs

- Adapter supports sendLink and sendDocument. Engine accepts optional documentUrl/documentFilename in SendPayload; when set, uses sendDocument for WhatsApp (e.g. intake PDF).

### 3.6 Webhook for delivery status

- **Endpoint:** POST `/api/webhooks/whatsapp`. Body may contain provider message id and status (delivered/read). Handler updates `communications` row by provider_message_id to status delivered/sent. Provider-specific parsing documented for Twilio/Meta.

---

## 4. Email Automation — Architecture

### 4.1 Resend service abstraction

- **Interface:** `IEmailAdapter`: send({ to, subject, body, html? }) → SendResult.
- **Implementation:** ResendEmailService (Resend SDK), from/name from env. getEmailAdapter() returns singleton.

### 4.2 Reusable HTML templates (Italian)

- **Location:** `emails/`: layout (Genius Lab branding, Italian footer) + per-template components (intake_created, estimate_ready, ready_for_pickup, payment_instructions, ticket_closed).
- **Usage:** Optional HTML path: for given template_key, render React email component to HTML and pass to adapter as html; else use resolved body with line breaks.

### 4.3 Automatic triggers and attachments/links

- Triggers: event-driven via dispatchNotification(event, ticketId) — see §5. No direct send in business logic.
- Links: tracking_link and estimate_link are included in payload and substituted in body/html.
- Attachments: Resend supports attachments; payload can carry optional attachment URL for future (e.g. PDF).

---

## 5. Mandatory Communication Flows (Event-Driven)

| # | Event | Trigger | Template | Channels |
|---|--------|---------|----------|----------|
| 1 | Intake sheet created | createTicket() → status intake_completed | intake_created | WhatsApp + Email (by preference) |
| 2 | Estimate created | updateTicketStatus(..., estimate_ready) | estimate_ready | WhatsApp + Email |
| 3 | Repair update | updateTicketStatus(..., in_diagnosis \| waiting_parts \| in_repair \| testing) | repair_update | WhatsApp + Email |
| 4 | Ready for pickup | updateTicketStatus(..., ready_for_pickup) | ready_for_pickup | WhatsApp + Email |
| 5 | Ready for shipping | updateTicketStatus(..., ready_for_shipping) | ready_for_shipping | WhatsApp + Email |
| 6 | Bank transfer instructions | Same as 4 or 5 when amount_due > 0 | payment_instructions | WhatsApp + Email |
| 7 | Ticket closed | updateTicketStatus(..., delivered) | ticket_closed | WhatsApp + Email |

- **Dispatch:** Single entry point dispatchNotification(event, ticketId). Builds payload from ticket + customer + company_settings, then sendCommunication({ templateKey, ticketId, customerId, payload [, documentUrl ] }).
- **Engine:** sendCommunication respects preferred_contact_channel, resolves template, calls WhatsApp and Email adapters, logs every attempt, applies fallback (WhatsApp fail → email).

---

## 6. File Map

- **AI:** `lib/ai/provider.ts`, `prompt-builder.ts`, `schemas.ts`, `openai-adapter.ts`, `index.ts`; `services/ai-diagnosis/run-diagnosis.ts`; `app/actions/ai-diagnosis.ts`; `components/tickets/ai-diagnosis-block.tsx`.
- **Comms types:** `services/communications/types.ts`.
- **WhatsApp:** `services/communications/whatsapp/stub-adapter.ts`, `whatsapp/index.ts`.
- **Email:** `services/communications/email/resend-service.ts`; `emails/layout.tsx`, `emails/templates/*.tsx`.
- **Engine:** `services/communications/template-resolver.ts`, `engine.ts`.
- **Dispatch:** `services/notifications/build-payload.ts`, `dispatch.ts`.
- **Webhook:** `app/api/webhooks/whatsapp/route.ts`.
- **Admin:** Dashboard communications log; settings/templates for editing message_templates.
