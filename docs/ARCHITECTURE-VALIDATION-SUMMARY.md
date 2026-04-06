# Architecture Validation Summary

**Date:** Post full-platform validation  
**Scope:** Ticket system, AI diagnosis, communication engine, WhatsApp, email, inventory, payments, shipping, PDF, public tracking, admin dashboard, RBAC.

---

## 1. Findings and Fixes Applied

### 1.1 Architectural weaknesses addressed

| Area | Issue | Fix |
|------|--------|-----|
| **RBAC** | Server actions did not enforce role; any authenticated user could create tickets or run AI. | Introduced `requireUserAndProfile()` and role checks: `createTicket` → `canCreateTicket`, `generateAIDiagnosisAction` / accept / discard → `canUseAIDiagnosis` / `canEditDiagnosis`. |
| **Payments** | No server action to record payments; only read-only list. | Added `app/actions/payments.ts` with `recordPaymentAction` (checks `canRecordPayment`), inserts into `payments`, updates ticket `amount_paid` and `payment_status`. |
| **Inventory** | Pages called Supabase directly; no service boundary. | Added `services/inventory/parts.ts` with `getPartsList()` and `getLowStockParts()`. Dashboard and inventory page now use these. |
| **PDF** | Schema had `intake_pdf_url`, `estimate_pdf_url`, `final_report_pdf_url` but no generation layer. | Added `lib/pdf/types.ts` and `lib/pdf/index.ts` with interfaces and stub implementations (`generateIntakeSheet`, `generateEstimate`, `generatePaymentInstructions`, `generateFinalReport`) returning `null` until a real implementation is added. |
| **Types** | No TypeScript type for `company_settings`. | Added `CompanySettings` in `types/database.ts`. |
| **Env** | env.example missing some vars used in code. | Added `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`, `OPENAI_MODEL` to env.example. |

### 1.2 Database schema consistency

- **Migration** `20260109000000_initial_schema.sql`: defines all enums, tables (profiles, company_settings, customers, devices, tickets, ticket_events, ticket_ai_diagnosis, parts, stock_movements, ticket_parts, payments, communications, message_templates), indexes, RLS, trigger for profile creation, `next_ticket_number()`.
- **types/database.ts**: mirrors enums and main entities (Profile, Customer, Device, Ticket, Part, Payment, Communication, CompanySettings). Naming and optionality aligned with schema.
- **Supabase usage:** Three clients: **browser** (`lib/supabase/client.ts`), **server with session** (`lib/supabase/server.ts`), **admin/service role** (`lib/supabase/admin.ts`) for webhooks that need to bypass RLS. No raw SQL in app code; all access via Supabase client.

### 1.3 Event-driven communication

- **Single entry:** `dispatchNotification(event, ticketId)` in `services/notifications/dispatch.ts`. Events: intake_created, estimate_ready, repair_update, ready_for_pickup, ready_for_shipping, payment_instructions, ticket_closed.
- **Triggers:** Only from `app/actions/tickets.ts` — `createTicket()` and `updateTicketStatus()` call `dispatchNotification()` after DB commit. No ad-hoc send in other modules.
- **Flow:** dispatch → `buildNotificationPayload()` → `sendCommunication()` → template resolution, adapter calls (WhatsApp + email), logging to `communications`. Clear separation.

### 1.4 Service boundaries

| Layer | Responsibility | Consumed by |
|-------|----------------|-------------|
| **services/tickets/numbering** | Next ticket number (RPC) | createTicket action |
| **services/ai-diagnosis/run-diagnosis** | Run AI, persist to ticket_ai_diagnosis and ticket ai_* | generateAIDiagnosisAction |
| **services/communications/engine** | sendCommunication (template + channels + log) | notifications/dispatch only |
| **services/communications/template-resolver** | resolveTemplate(key, channel, payload) | engine only |
| **services/notifications/dispatch** | buildPayload + sendCommunication | ticket actions only |
| **services/inventory/parts** | getPartsList, getLowStockParts | dashboard page, inventory page |
| **lib/pdf** | PDF generation (stub) | Not yet wired; ready for intake/estimate flows |

Actions call services or Supabase; pages call actions or services. No business logic in UI components.

### 1.5 Server vs client separation

- **Secrets:** Only in server code (Supabase server/admin, Resend, OpenAI, WhatsApp). No `NEXT_PUBLIC_*` for secrets.
- **`'use client'`:** Used only where needed: forms (customer-form, new-ticket-form, approve-reject-form, template-list), ticket-actions, ai-diagnosis-block, dashboard-shell, layout/sonner. All AI, communications, and auth run server-side.
- **Public routes:** `/track/[token]`, `/estimate/[token]` are server-rendered; approve/reject are server actions with token validation.

### 1.6 WhatsApp integration architecture

- **Adapter:** `IWhatsAppAdapter` (sendText, sendLink?, sendDocument?, sendTemplate?). Stub implementation logs and returns success. Replaceable via `WHATSAPP_ADAPTER`.
- **Engine** supports optional `documentUrl`/`documentFilename` and uses `sendDocument` when present.
- **Webhook:** `POST /api/webhooks/whatsapp` uses **admin client** to update `communications` by `provider_message_id`. Ready for provider-specific payload parsing.

### 1.7 Email automation

- **Resend:** `IEmailAdapter` implemented in `email/resend-service.ts`; `getEmailAdapter()` singleton. HTML from resolved body (e.g. `\n` → `<br/>`); React email components in `emails/` available for future HTML render.
- **Triggers:** Same event-driven flow as WhatsApp; template resolution and payload from `build-payload.ts`.

### 1.8 Shipping and public tracking

- **Shipping:** Modeled on ticket: `shipping_required`, address, courier, tracking_code, statuses ready_for_shipping → shipped → delivered. Status changes in `updateTicketStatus`; no separate shipping service (fits current scope).
- **Public tracking:** `/track/[token]` and `/estimate/[token]` load by `public_tracking_token`, server-side only. Estimate approve/reject in `app/actions/estimate-approval.ts` with token check.

### 1.9 Admin dashboard and RBAC

- **Dashboard:** `(dashboard)/layout.tsx` uses `requireAuth()` and `getProfile()`; `DashboardShell` receives profile and filters nav via `can*` from `lib/auth/rbac.ts`. Routes under `/dashboard/*` are protected by layout.
- **RBAC:** All permission helpers in `lib/auth/rbac.ts`. Now enforced in server actions: createTicket, AI actions, recordPayment. Other actions (customers, templates, estimate-approval) assume authenticated user; further role checks can be added per route if needed.

---

## 2. Environment variables (single reference)

| Variable | Required | Used in |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | client, server, middleware |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (webhook) | admin client |
| `NEXT_PUBLIC_APP_URL` | Yes (links in emails/tracking) | build-payload, ticket page |
| `RESEND_API_KEY` | For email send | resend-service |
| `EMAIL_FROM`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME` | Optional (defaults in code) | resend-service |
| `OPENAI_API_KEY` | For AI diagnosis | openai-adapter |
| `OPENAI_BASE_URL`, `OPENAI_MODEL` | Optional (defaults) | openai-adapter |
| `WHATSAPP_ADAPTER` | Optional (default stub) | whatsapp/index |
| `NODE_ENV` | Set by runtime | stub adapter, resend (logging) |

See `env.example` for copy-paste setup.

---

## 3. Modular architecture checklist

- [x] Ticket system: actions + numbering service + event-driven notifications.
- [x] AI diagnosis: provider abstraction, prompt builder, Zod, storage, RBAC on actions.
- [x] Communication engine: single entry (dispatch), template resolver, engine, adapters.
- [x] WhatsApp: adapter interface, stub, webhook with admin client.
- [x] Email: Resend adapter, Italian templates (structure), same dispatch flow.
- [x] Inventory: service boundary (parts list, low stock); dashboard and inventory page use it.
- [x] Payments: recordPayment action with RBAC; ticket amount_paid/payment_status updated.
- [x] Shipping: on ticket; status flow and notifications wired.
- [x] PDF: abstraction and stubs in place; URLs can be wired when generator is implemented.
- [x] Public tracking: token-based pages and estimate approval actions.
- [x] Admin dashboard: layout + RBAC-based nav; settings and templates pages.
- [x] RBAC: defined in lib/auth/rbac; enforced in createTicket, AI actions, recordPayment.

---

## 4. Suggested next steps (no code changes in this pass)

- Implement PDF generation (e.g. @react-pdf/renderer or Puppeteer), upload to Supabase Storage, set `intake_pdf_url` / `estimate_pdf_url` and pass `documentUrl` into `sendCommunication` for intake/estimate flows.
- Add UI on ticket detail to record a payment (form calling `recordPaymentAction`).
- Optionally enforce RBAC in `updateTicketStatus` by status (e.g. only manager can set estimate_ready) or leave as-is for simplicity.
- Add rate limiting or signature verification on `/api/webhooks/whatsapp` when a production WhatsApp provider is used.
