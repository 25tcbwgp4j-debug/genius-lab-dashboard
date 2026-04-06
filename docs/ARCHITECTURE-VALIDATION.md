# Architecture Validation Summary

**Scope:** Database schema, service layer, ticket workflow, AI, communications, WhatsApp, email, PDF, inventory, payments, shipping, tracking, dashboard, auth/RBAC, server/client separation, env vars, Supabase usage.

---

## 1. Validated areas

| Area | Status | Notes |
|------|--------|-------|
| **Database schema** | OK | Single migration (initial + whatsapp idempotency + communications.body). Enums, indexes, RLS, policies and trigger aligned with app. |
| **Service layer** | OK | Notifications (dispatch → build-payload → engine), template-resolver, inventory/parts, tickets/numbering. Clear boundaries; engine and dispatch do not depend on UI. |
| **Ticket workflow** | Hardened | **Single source of truth:** `src/lib/ticket-workflow.ts` defines `ALLOWED_TRANSITIONS`, `getAllowedNextStatuses`, `isAllowedTransition`. UI and server both use it; server validates transition in `updateTicketStatus`. |
| **AI diagnosis** | OK | Provider interface, OpenAI adapter, run-diagnosis (server client), RBAC on actions, storage in ticket_ai_diagnosis and ticket ai_* fields. |
| **Communication engine** | OK | sendCommunication: customer lookup, template resolve, email + WhatsApp (with fallback), logging to communications. Retry and adapters (Resend, WhatsApp stub) used correctly. |
| **WhatsApp integration** | Documented | Only **stub** adapter implemented. If `WHATSAPP_ADAPTER` ≠ `stub`, app falls back to stub and logs a production warning. No silent wrong adapter. |
| **Email automation** | OK | Resend adapter; from-address/name via env (centralized in `lib/env`). Template resolution and dispatch driven by ticket events. |
| **PDF generation** | OK | build-inputs (optional admin client for public docs), generate-* modules, API route token-based and rate-limited. |
| **Inventory** | Read-only | getPartsList, getLowStockParts in `services/inventory/parts`. No app actions for parts/stock_movements (likely intentional; manage via Supabase or future feature). |
| **Payments** | OK | recordPaymentAction, ticket amount_paid/payment_status, payments table, ticket_events, RBAC. |
| **Shipping** | OK | updateTicketShipping, shipped dialog and notification, TicketShippingCard, payload includes courier/tracking. |
| **Tracking page** | OK | Token-only; admin client; limited fields; no PII. |
| **Admin dashboard** | OK | Layout auth + profile; requireRole on settings, communications, inventory; nav filtered by RBAC. |
| **Auth and RBAC** | OK | requireUserAndProfile, requireRole, can* in rbac.ts; enforced in actions and API routes. |
| **Server/client separation** | OK | Server actions and API routes use server Supabase/createClient; client uses client Supabase; admin client only in server (webhook, public token reads). |
| **Environment variables** | Centralized | **`src/lib/env.ts`** documents and exposes getters for all used env vars. Resend and WhatsApp adapter use it; prefer env.ts for new code. |
| **Supabase usage** | OK | Server/client/admin usage clear; RLS respected; admin only for webhook and public token-based reads. |

---

## 2. Architectural weaknesses addressed

1. **Ticket status transitions duplicated and unvalidated on server**  
   - **Change:** Introduced `src/lib/ticket-workflow.ts` as single source of truth. `updateTicketStatus` now validates with `isAllowedTransition` and returns a clear error if transition is invalid.  
   - **Files:** `src/lib/ticket-workflow.ts` (new), `src/components/tickets/ticket-actions.tsx`, `src/app/actions/tickets.ts`.

2. **WhatsApp adapter: non-stub requested but unimplemented**  
   - **Change:** When `WHATSAPP_ADAPTER` is set to anything other than `stub`, the app still uses the stub but logs a production warning so operators know messages are not sent.  
   - **Files:** `src/services/communications/whatsapp/index.ts`.

3. **Env vars scattered and undocumented**  
   - **Change:** Added `src/lib/env.ts` with getters and comments for all env vars. Resend and WhatsApp adapter use it.  
   - **Files:** `src/lib/env.ts` (new), `src/services/communications/email/resend-service.ts`, `src/services/communications/whatsapp/index.ts`.

4. **Communication type missing `body`**  
   - **Change:** Added `body: string | null` to `Communication` in `src/types/database.ts` to match DB and engine usage.

---

## 3. Missing or fragile integrations (no code change)

| Item | Notes |
|------|--------|
| **WhatsApp production** | Only stub implemented. To send real WhatsApp messages, add an adapter (e.g. Twilio or Meta Cloud API) and register it in `whatsapp/index.ts` when `WHATSAPP_ADAPTER` matches. |
| **Inventory write path** | No UI or actions for creating/editing parts or stock_movements. Acceptable if parts are managed elsewhere; otherwise add actions and RBAC. |
| **Company settings update** | Settings page is read-only. No server action to update company_settings; implement if admin should edit from the app. |

---

## 4. Partially implemented code paths

- **Estimate approval:** Implemented (token + ticketId validation, rate limit, event logging).  
- **Document API:** Implemented (token, rate limit, admin client, build-inputs with optional client).  
- **Tracking/estimate pages:** Implemented with admin client for unauthenticated access.  
- No other partial paths identified that block production.

---

## 5. Refactors and modularity

| Refactor | Purpose |
|----------|---------|
| **Ticket workflow module** | Single place for allowed transitions; server-side validation; UI and API stay in sync. |
| **Env module** | Single place for env access; easier to document and later add startup validation. |
| **WhatsApp adapter branch** | Explicit fallback and warning instead of silent stub when another adapter is requested. |
| **Communication type** | Type matches DB and engine (body stored for audit). |

---

## 6. Production orientation

- **Server validates transitions** so invalid state changes are rejected even if the UI is bypassed.  
- **Env and WhatsApp** behavior are explicit and documented.  
- **Types** aligned with schema (Communication.body).  
- **No new runtime dependencies;** build and lint pass.

---

## 7. Files touched

| File | Change |
|------|--------|
| `src/lib/ticket-workflow.ts` | **New.** ALLOWED_TRANSITIONS, getAllowedNextStatuses, isAllowedTransition. |
| `src/lib/env.ts` | **New.** Env getters and documentation. |
| `src/components/tickets/ticket-actions.tsx` | Use getAllowedNextStatuses from ticket-workflow; remove local ALLOWED_TRANSITIONS. |
| `src/app/actions/tickets.ts` | Import isAllowedTransition; validate transition before update; return error message if invalid. |
| `src/services/communications/whatsapp/index.ts` | Use getWhatsAppAdapterName from env; production warning when adapter ≠ stub. |
| `src/services/communications/email/resend-service.ts` | Use getResendApiKey, getEmailFromAddress, getEmailFromName from env. |
| `src/types/database.ts` | Add `body: string | null` to Communication. |

**Build:** `npm run build` succeeds.  
**Lint:** No new issues.
