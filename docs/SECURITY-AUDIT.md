# Security Audit — Summary

## 1. RBAC enforcement

- **rbac.ts:** Defines `canAccessCustomers`, `canAccessDevices`, `canCreateTicket`, `canChangeTicketStatus`, `canEditTicketShipping`, `canRecordPayment`, `canUseAIDiagnosis`, `canEditDiagnosis`, `canManageInventory`, `canAccessCommunications`, `canAccessSettings`, `canManageUsers`.
- **Server actions:**
  - `createTicket`: `requireUserAndProfile` + `canCreateTicket(profile.role)` ✓
  - `updateTicketStatus`: `requireUserAndProfile` + `canChangeTicketStatus(profile.role)` ✓
  - `updateTicketShipping`: `requireUserAndProfile` + `canEditTicketShipping(profile.role)` ✓
  - `recordPaymentAction`: `requireUserAndProfile` + `canRecordPayment(profile.role)` ✓
  - AI diagnosis actions: `requireUserAndProfile` + `canUseAIDiagnosis` / `canEditDiagnosis` ✓
  - `updateMessageTemplate` / `upsertMessageTemplate`: `requireUserAndProfile` + `canAccessSettings(profile.role)` ✓
  - `createCustomer` / `updateCustomer`: `requireUserAndProfile` + `canAccessCustomers(profile.role)` ✓
- **Estimate approval** (`approveEstimateAction`, `rejectEstimateAction`): No user auth by design; authorization is **token + ticketId** (both must match and status must be `waiting_customer_approval`). Rate limited by IP ✓

## 2. Admin route protection

- **Dashboard layout:** `requireAuth()` + `getProfile()`; redirect to `/login` if no profile.
- **Role-gated pages:** Use `requireRole(predicate)` and redirect to `/dashboard` if not allowed:
  - **Settings** (`/dashboard/settings`, `/dashboard/settings/templates`): `requireRole(canAccessSettings)` — admin only.
  - **Communications** (`/dashboard/communications`): `requireRole(canAccessCommunications)` — admin, manager.
  - **Inventory** (`/dashboard/inventory`): `requireRole(canManageInventory)` — admin, manager.
- **Nav:** `DashboardShell` hides links the user cannot access (`can(profile.role)`). Direct URL access is still blocked server-side by `requireRole` on the page.

## 3. Server action permissions

- All mutating server actions that touch sensitive data use `requireUserAndProfile()` and the appropriate `can*` check before performing work.
- **Estimate approval** is the only unauthenticated mutation; it is constrained by `(ticketId, public_tracking_token)` and status, and is rate limited.

## 4. API route authorization

- **GET /api/documents/[type]:** No user session; access by **token** only (`?token=public_tracking_token`). Validates token, then generates PDF. Rate limited by IP (30/min) ✓
- **GET /api/customers/[customerId]/devices:** Requires authenticated user and `canAccessCustomers(profile.role)`; returns 401 if not logged in, 403 if forbidden ✓
- **GET/POST /api/emails/preview:** Requires authenticated user and `canAccessSettings(profile.role)`; 401/403 otherwise ✓
- **POST /api/webhooks/whatsapp:** No user auth (incoming webhook). Validates **signature** and uses **rate limiting** by IP. Uses **service role** client only for idempotency and status update; key never exposed to client ✓

## 5. Public tracking security

- **/track/[token]:** Renders ticket status by `public_tracking_token` only. Selects only: `ticket_number`, `status`, `total_amount`, `amount_paid`, `approved_by_customer`, `device(model, category)`. No PII (no customer name, email, phone). Token is unguessable (nanoid 32).
- **/estimate/[token]:** Renders estimate and approve/reject form only when `status === 'waiting_customer_approval'`. Uses same token; no PII exposed beyond amounts and device model.

## 6. Estimate approval links

- **Server actions** `approveEstimateAction(ticketId, token)` and `rejectEstimateAction(ticketId, token, note?)`:
  - Load ticket with `.eq('id', ticketId).eq('public_tracking_token', token).single()`.
  - Proceed only if ticket exists and `status === 'waiting_customer_approval'`.
  - No approval without valid token for that ticket.
- **Rate limiting:** 15 requests per minute per IP for the `estimate-approval` bucket to limit brute force and abuse.

## 7. Service-role isolation

- **createAdminClient()** (`lib/supabase/admin.ts`) uses `SUPABASE_SERVICE_ROLE_KEY` and is only used in:
  - **POST /api/webhooks/whatsapp:** To claim idempotency and update `communications` status (no RLS bypass for user data).
- Service role key is read from `process.env.SUPABASE_SERVICE_ROLE_KEY` (server-only). Never sent to client or used in browser.
- All other server code uses `createClient()` from `lib/supabase/server` (anon key + user cookie). RLS applies to those clients.

## 8. Rate limiting

- **WhatsApp webhook:** 120 requests/minute per client (IP) via `lib/whatsapp-webhook/rate-limit.ts`.
- **Documents API:** 30 requests/minute per IP via `lib/rate-limit.ts` bucket `documents`.
- **Estimate approval (server actions):** 15 requests/minute per IP via `lib/rate-limit.ts` bucket `estimate-approval` (using `headers()` for IP in server action).
- In-memory store; for multi-instance production consider Redis or Upstash.

---

## Fixes applied in this audit

1. **RBAC:** Added `canChangeTicketStatus` and `canEditTicketShipping`; enforced in `updateTicketStatus` and `updateTicketShipping`.
2. **Templates actions:** Require auth and `canAccessSettings`.
3. **Customers actions:** Require auth and `canAccessCustomers`.
4. **API customers/devices:** Require auth and `canAccessCustomers`; return 401/403 otherwise.
5. **Admin routes:** Added `requireRole(canAccessSettings)` to settings and settings/templates; `requireRole(canAccessCommunications)` to communications; `requireRole(canManageInventory)` to inventory.
6. **Email preview API:** Require `canAccessSettings` (403 for non-admin).
7. **Rate limiting:** Documents API 30/min per IP; estimate approval 15/min per IP via shared `lib/rate-limit.ts`.
