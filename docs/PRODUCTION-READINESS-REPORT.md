# Production Readiness Report — Genius Lab

**Date:** Final hardening pass  
**Scope:** Lint, build, TypeScript, Supabase, indexes, communication logging, AI module, tracking security.

---

## 1. Lint and code quality

| Item | Status | Notes |
|------|--------|------|
| Unused imports removed | ✅ | Removed unused `Button` (customers/[id]), `Table*` (customers page), `Input`/`router`/`customerId` (new-ticket-form), fixed `canAccessDashboard` param use (rbac). |
| ESLint | ✅ | `npm run lint` passes with **0 errors**. Two remaining **warnings**: React Hook Form `watch()` in customer-form and new-ticket-form (react-hooks/incompatible-library); acceptable for production. |
| TypeScript | ✅ | No TypeScript errors; `npm run build` completes successfully. |

---

## 2. Build

| Item | Status |
|------|--------|
| Full build | ✅ `next build` succeeds |
| Routes | ✅ All app and API routes compile and are listed in build output. |

---

## 3. Supabase queries

| Area | Status | Notes |
|------|--------|-------|
| Server client | ✅ | Dashboard and server actions use `createClient()` from `@/lib/supabase/server` (anon key + user session). |
| Admin client | ✅ | Used only for: (1) WhatsApp webhook (idempotency + communication status), (2) public tracking page, (3) public estimate page, (4) public document API. Never exposed to client. |
| PDF build-inputs | ✅ | Accept optional `SupabaseClient`; document API passes admin client for token-based public access so RLS does not block unauthenticated document links. |
| RLS | ✅ | Policies require `authenticated` for reads/writes on tickets, customers, etc. Public token-based access is handled via admin client in the app, not by relaxing RLS. |

---

## 4. Database indexes

Indexes present in `supabase/migrations/20260109000000_initial_schema.sql`:

| Table | Indexes | Purpose |
|-------|---------|--------|
| customers | idx_customers_email, idx_customers_phone, idx_customers_name | Lookup and search |
| devices | idx_devices_customer, idx_devices_serial | By customer, serial |
| tickets | idx_tickets_customer, idx_tickets_device, idx_tickets_status, idx_tickets_ticket_number, **idx_tickets_public_token (UNIQUE)**, idx_tickets_created_at | Lookup, list, token access |
| ticket_events | idx_ticket_events_ticket | Timeline per ticket |
| ticket_ai_diagnosis | idx_ticket_ai_diagnosis_ticket | AI history per ticket |
| parts | idx_parts_sku, idx_parts_active | Inventory |
| stock_movements | idx_stock_movements_part, idx_stock_movements_ticket | Movements |
| ticket_parts | idx_ticket_parts_ticket | Parts per ticket |
| payments | idx_payments_ticket | Payments per ticket |
| communications | idx_communications_ticket, idx_communications_customer, idx_communications_created | Log and list |
| message_templates | idx_message_templates_key | Template resolution |

**Verdict:** ✅ Indexes are in place for main query patterns (ticket by token, by customer, by status; communications by ticket/customer; etc.).

---

## 5. Communication logging

| Item | Status | Notes |
|------|--------|-------|
| Engine | ✅ | `sendCommunication()` in `services/communications/engine.ts` inserts into `communications` for each attempt (channel, template_key, recipient, subject, body, status, provider_message_id, error_message, sent_at). |
| Ticket events | ✅ | After sending notifications, `updateTicketStatus` (and similar flows) insert `notification_sent` into `ticket_events` with template_key and channels. |
| WhatsApp status | ✅ | Webhook updates `communications` status (sent/delivered) via admin client and idempotency. |

**Verdict:** ✅ All sends are logged; status callbacks are applied and deduplicated.

---

## 6. AI module integration

| Item | Status | Notes |
|------|--------|-------|
| RBAC | ✅ | `generateAIDiagnosisAction` requires `canUseAIDiagnosis(profile.role)`; accept/discard require `canEditDiagnosis(profile.role)`. |
| runAIDiagnosis | ✅ | Uses server `createClient()` (authenticated context). Fetches ticket, device, prior tickets; calls provider; writes to `ticket_ai_diagnosis` and updates ticket `ai_*` fields. |
| Storage | ✅ | Results stored in `ticket_ai_diagnosis`; ticket holds summary/actions/risk. Index on `ticket_id`. |
| Errors | ✅ | Returns structured error codes; logging via `logAIDiagnosis`. |

**Verdict:** ✅ AI flow is permission-gated, uses server client, and persists correctly.

---

## 7. Tracking page security

| Item | Status | Notes |
|------|--------|-------|
| Access | ✅ | **Token-only.** No auth required; uses `createAdminClient()` so unauthenticated users can read the single row identified by `public_tracking_token`. |
| Data exposed | ✅ | Only: ticket_number, status, total_amount, amount_paid, approved_by_customer, device (model, category). **No PII** (no customer name, email, phone). |
| Token | ✅ | `public_tracking_token` is nanoid(32), unguessable. |
| Estimate page | ✅ | Same pattern: admin client, token-only, limited fields; approve/reject validated by (ticketId + token) and status. |
| Document API | ✅ | Token required; rate limited (30/min per IP); admin client for ticket fetch and PDF build; no session required. |

**Verdict:** ✅ Public tracking, estimate, and document endpoints are token-scoped and do not expose PII beyond what is needed for the feature.

---

## 8. Summary checklist

| Category | Status |
|----------|--------|
| Unused imports / lint | ✅ Fixed; 0 errors |
| Full build | ✅ Success |
| TypeScript | ✅ No errors |
| Supabase queries | ✅ Server vs admin usage correct; document API uses admin + build-inputs override |
| Database indexes | ✅ Present for tickets, communications, payments, etc. |
| Communication logging | ✅ All sends and status updates logged |
| AI module | ✅ RBAC, server client, storage, errors |
| Tracking page security | ✅ Token-only, no PII, admin client for public reads |

---

## 9. Recommended pre-deploy steps

1. **Environment:** Set `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and any Resend/WhatsApp keys in the production environment.
2. **Database:** Run Supabase migrations; ensure RLS policies and triggers (e.g. `handle_new_user`) are applied.
3. **Rate limiting:** Current implementation is in-memory. For multi-instance production, consider Redis/Upstash for documents and estimate-approval buckets.
4. **React Hook Form warnings:** The two `watch()` warnings are from the React Compiler and the library contract; they do not block production. Optionally add targeted eslint-disable or update the rule if the team accepts the pattern.

---

**Verdict: Production ready.** The application is hardened for production with clean lint (no errors), successful build, correct Supabase usage, indexed queries, full communication logging, secured AI flow, and token-only public tracking with no PII leakage.
