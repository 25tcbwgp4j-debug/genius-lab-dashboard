# Genius Lab — Platform Architecture & Implementation Plan

**Document Version:** 1.0  
**Status:** Internal implementation plan — Phase 1 mandatory analysis  
**Target:** Production-ready repair management platform for Apple repair center

---

## 1. Full System Architecture

### 1.1 High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │ Admin Dashboard  │  │ Public /track     │  │ Public /estimate approval │  │
│  │ (authenticated)  │  │ (token-based)    │  │ (token-based)             │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────────┬───────────────┘  │
└───────────┼─────────────────────┼─────────────────────────┼──────────────────┘
            │                     │                         │
            ▼                     ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS APP ROUTER (Edge + Node)                          │
│  • Server Components / Server Actions                                         │
│  • Route Handlers (API)                                                       │
│  • Middleware (auth, rate limit, RBAC)                                        │
└───────────┬─────────────────────┬─────────────────────────┬──────────────────┘
            │                     │                         │
            ▼                     ▼                         ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────────────┐
│ Service Layer    │  │ AI Abstraction    │  │ Communications Engine             │
│ • tickets        │  │ • prompt builder  │  │ • email (Resend)                  │
│ • customers      │  │ • provider swap   │  │ • whatsapp (adapter)              │
│ • devices        │  │ • Zod schemas     │  │ • template resolver               │
│ • inventory      │  │ • server-only     │  │ • log + retry                     │
│ • payments       │  └────────┬─────────┘  └──────────────────────────────────┘
│ • pdf            │            │
└────────┬─────────┘            │
         │                      ▼
         │             ┌──────────────────┐
         │             │ OpenAI-compatible│
         │             │ API (server)     │
         │             └──────────────────┘
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE LAYER                                        │
│  • PostgreSQL (data, RLS, functions)   • Auth (sessions, users)                │
│  • Storage (PDFs, intake photos)       • Realtime (optional live updates)    │
└─────────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                                         │
│  Resend (email)  │  WhatsApp Business API (adapter)  │  Vercel (hosting)       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Design Principles

- **Server-first:** All business logic, AI, and sensitive operations run server-side.
- **Adapter pattern:** WhatsApp and AI providers are behind interfaces; implementations are swappable.
- **Event-driven notifications:** Status changes and business events trigger communication rules; no hardcoded sends in controllers.
- **Audit everything:** Ticket events, communication logs, and critical actions are persisted.
- **RBAC enforced in middleware and RLS:** UI reflects permissions; server never trusts client role.

---

## 2. Folder Structure

```
genius-lab/
├── app/
│   ├── (public)/                    # Unauthenticated public routes
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Landing or redirect
│   │   └── track/
│   │       └── [token]/page.tsx      # Public tracking
│   ├── (public-estimate)/
│   │   └── estimate/
│   │       └── [token]/page.tsx      # Estimate approve/reject (token)
│   ├── (auth)/                       # Auth layout (login, reset)
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (dashboard)/                 # Protected app shell
│   │   ├── layout.tsx                # Sidebar, role-based nav
│   │   ├── dashboard/page.tsx
│   │   ├── customers/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── new/page.tsx
│   │   ├── devices/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── tickets/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── new/page.tsx
│   │   ├── inventory/
│   │   │   ├── page.tsx
│   │   │   └── parts/[id]/page.tsx
│   │   ├── payments/                 # Payments overview (manager)
│   │   ├── communications/          # Logs, templates (manager)
│   │   ├── settings/
│   │   │   ├── page.tsx
│   │   │   ├── company/page.tsx
│   │   │   ├── templates/page.tsx
│   │   │   └── bank/page.tsx
│   │   └── admin/                    # Admin-only
│   │       └── users/page.tsx
│   ├── api/                          # Route handlers where needed
│   │   ├── ai/
│   │   │   └── diagnose/route.ts
│   │   ├── webhooks/
│   │   │   └── resend/route.ts       # Optional delivery feedback
│   │   └── ...
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                           # shadcn components
│   ├── layout/                       # Sidebar, header, nav
│   ├── tables/                       # TanStack Table wrappers
│   ├── forms/                        # RHF + Zod forms
│   ├── tickets/                      # Ticket-specific components
│   ├── customers/
│   ├── devices/
│   ├── communications/
│   ├── dashboard/                    # Dashboard widgets
│   └── pdf/                          # PDF layout components
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   ├── server.ts                 # Server client
│   │   ├── middleware.ts             # Auth for middleware
│   │   └── rls.ts                    # RLS helpers if needed
│   ├── auth/
│   │   ├── session.ts
│   │   ├── rbac.ts                   # Role/permission checks
│   │   └── middleware.ts
│   ├── ai/
│   │   ├── provider.ts               # Abstract interface
│   │   ├── openai-adapter.ts
│   │   ├── prompt-builder.ts
│   │   ├── schemas.ts                # Zod response schema
│   │   └── logger.ts
│   ├── pdf/
│   │   ├── intake.ts
│   │   ├── estimate.ts
│   │   ├── payment-instructions.ts
│   │   └── final-report.ts
│   ├── qr.ts
│   ├── validations/                  # Shared Zod schemas
│   └── utils/
├── services/
│   ├── tickets/
│   │   ├── crud.ts
│   │   ├── workflow.ts               # Status transitions, events
│   │   └── numbering.ts             # GL-YYYY-NNNNNN
│   ├── customers/
│   ├── devices/
│   ├── inventory/
│   │   ├── parts.ts
│   │   └── movements.ts
│   ├── payments/
│   ├── communications/
│   │   ├── engine.ts                 # Orchestrator: template + channel
│   │   ├── email/
│   │   │   ├── resend.ts
│   │   │   └── templates/
│   │   └── whatsapp/
│   │       ├── types.ts
│   │       └── adapter.ts            # Interface + stub/real impl
│   ├── ai-diagnosis/
│   │   ├── run-diagnosis.ts
│   │   └── persist-result.ts
│   └── notifications/               # Event → communication rules
│       └── dispatch.ts
├── types/
│   ├── database.ts                   # Generated or hand-written Supabase types
│   ├── ticket.ts
│   ├── customer.ts
│   └── index.ts
├── db/
│   ├── migrations/                   # Supabase migrations
│   ├── seed.sql
│   └── schema-summary.md
├── emails/                            # Resend React email components
│   ├── intake-created.tsx
│   ├── estimate-ready.tsx
│   ├── ready-for-pickup.tsx
│   └── ...
├── middleware.ts                     # Next.js middleware (auth + role)
├── env.example
├── README.md
└── docs/
    ├── ARCHITECTURE.md               # This file
    └── DEPLOYMENT.md
```

---

## 3. Database Architecture

- **RDBMS:** PostgreSQL (Supabase).
- **Conventions:** `snake_case` tables/columns; `id` UUID primary key where not otherwise specified; `created_at` / `updated_at` on all main entities.
- **Enums:** Used for status, priority, channel, movement_type, payment_method, etc., for type safety and indexing.

### 3.1 Core Tables (Summary)

| Table | Purpose |
|-------|--------|
| `profiles` | Extended user (role, display_name) linked to `auth.users` |
| `customers` | CRM: contact data, preferences, consent |
| `devices` | Device registry; FK to customer |
| `tickets` | Repair jobs; FK customer, device, created_by, assigned_technician |
| `ticket_events` | Audit log for ticket lifecycle |
| `ticket_ai_diagnosis` | Stored AI diagnosis results per ticket |
| `parts` | Spare parts catalog |
| `stock_movements` | Inventory movements |
| `ticket_parts` | Parts assigned to tickets (usage) |
| `payments` | Payment records; FK ticket |
| `communications` | Log of sent/pending/failed messages (email/WhatsApp) |
| `message_templates` | Editable template body and subject (key, channel) |
| `company_settings` | Company info, bank, WhatsApp/email config, disclaimers |
| `estimates` | Optional normalized estimate snapshot (or derived from ticket) |

Detailed schema with FKs, indexes, and enums is in **Section 4** and in `db/migrations/`.

---

## 4. Entity Relationships

```
auth.users (Supabase)
    │
    └── profiles (id, role, display_name, ...)
            │
            ├── created tickets (tickets.created_by_user_id)
            ├── assigned tickets (tickets.assigned_technician_id)
            └── stock_movements.created_by, payments.created_by

customers
    │
    ├── devices (devices.customer_id)
    ├── tickets (tickets.customer_id)
    ├── communications (communications.customer_id)
    └── payments (via ticket)

devices
    │
    └── tickets (tickets.device_id)

tickets
    │
    ├── ticket_events (ticket_id)
    ├── ticket_ai_diagnosis (ticket_id)
    ├── ticket_parts (ticket_id)
    ├── payments (ticket_id)
    ├── communications (ticket_id)
    └── (intake_pdf_url, estimate_pdf_url, final_report_pdf_url in ticket or storage refs)

parts
    │
    ├── stock_movements (part_id)
    └── ticket_parts (part_id)
```

---

## 5. User Roles and Permissions

| Role | Permissions (summary) |
|------|------------------------|
| **admin** | Full access: users, settings, all CRUD, all pages. |
| **manager** | Tickets (all), analytics, inventory, communications, payments overview. No user management, no critical settings. |
| **reception** | Customer intake, customer search, ticket creation, send intake sheet, take payments, shipping preparation. No inventory edit, no AI diagnosis, no settings. |
| **technician** | Diagnosis, AI suggestion, repair notes, parts assignment to ticket, status changes, final testing. No customer creation, no payments, no communications config. |

Permission checks: in **middleware** (route access), in **server actions / API** (every mutation), and in **UI** (hide/disable by permission). Permissions derived from `profiles.role` and optionally a `permissions` table for fine-grained rules later.

---

## 6. Repair Workflow Lifecycle

Status enum and allowed transitions:

```
new
  → intake_completed (reception: intake form + PDF + optional notify)
intake_completed
  → in_diagnosis (technician/manager)
in_diagnosis
  → ai_diagnosis_generated (optional; when AI suggestion is generated)
  → estimate_ready (estimate created and PDF generated)
estimate_ready
  → waiting_customer_approval (estimate sent to customer)
waiting_customer_approval
  → approved | refused → unrepaired_returned (or cancelled)
approved
  → waiting_parts (if parts needed) | in_repair
waiting_parts
  → in_repair
in_repair
  → testing
testing
  → ready_for_pickup | ready_for_shipping
ready_for_pickup
  → delivered (picked up) | closed
ready_for_shipping
  → shipped → delivered → closed
shipped
  → delivered
delivered
  → closed
(any)
  → cancelled
```

Each transition:
1. Validates allowed next status for current role.
2. Updates `tickets.status` and related timestamps (e.g. `ready_for_pickup_at`).
3. Inserts `ticket_events` row (event_type, from_status, to_status, user_id, metadata).
4. Optionally triggers notification rules (see Section 8).

---

## 7. AI Diagnosis Architecture

- **Location:** Server-only (`/lib/ai`, `/services/ai-diagnosis`). No API keys or raw AI responses to client.
- **Trigger:** Button “Generate AI Diagnostic Suggestion” in ticket UI → Server Action → service layer.
- **Flow:**
  1. Load ticket, device, customer issue, intake notes, prior repairs for same device.
  2. Build prompt via `prompt-builder` (structured, no PII beyond necessary context).
  3. Call provider through **abstraction** (e.g. OpenAI-compatible); response parsed with **Zod** into structured fields: hypotheses, suggested_checks, probable_parts, complexity, risk_notes, confidence, next_actions.
  4. Persist to `ticket_ai_diagnosis` (and optionally a generic `ai_request_log` for debugging).
  5. Return result to UI; technician can “Accept into notes”, “Discard”, or “Regenerate”.
- **Override:** AI never auto-writes to `tickets.diagnosis`; only “Accept” copies suggested text into diagnosis notes.
- **Provider swap:** Interface `IAIDiagnosisProvider` with method `generateStructuredDiagnosis(input)`. Adapter for OpenAI; later add other providers without changing callers.

---

## 8. WhatsApp and Email Automation Architecture

- **Unified engine:** `services/communications/engine.ts`.
  - Input: `template_key`, `customer_id`, `ticket_id?`, `payload` (placeholders).
  - Resolves template from DB or fallback defaults; substitutes placeholders.
  - Decides channels from `customers.preferred_contact_channel` and template config (e.g. “intake” → WhatsApp + email).
  - Calls email adapter (Resend) and/or WhatsApp adapter; both implement `send(params) → { success, messageId?, error? }`.
  - Writes to `communications` table: pending → sent/failed; stores provider_message_id, error_message.
- **Event-driven:** When ticket status changes (or estimate ready, etc.), `notifications/dispatch.ts` maps event to template_key and calls engine. No direct “send email” inside ticket CRUD; only “emit event” or “trigger notification for event”.
- **WhatsApp:** Interface `IWhatsAppAdapter` (sendText, sendDocument, sendTemplate). Adapter implementation can be Twilio, Meta Cloud API, or stub for dev. Template-based and parameterized; status callbacks can update `communications.status` via webhook.

---

## 9. Shipping and Payment Communication Flows

- **Shipping:** Ticket has `shipping_required`, shipping address, courier, tracking_code. Statuses `ready_for_shipping` → `shipped` → `delivered`. On `ready_for_shipping`, notification engine sends “ready for shipping” template (summary, amount, bank details, shipping info). On `shipped`, optional “shipped” template with tracking link.
- **Payment:** Payments recorded in `payments`; ticket has `amount_paid`, `total_amount`, `payment_status`. When “ready for pickup” or “ready for shipping” and unpaid/partial, engine can send “payment_instructions” template (IBAN, beneficiary, reference, amount due). Reminder logic can be a cron or background job that finds unpaid tickets and sends reminder template.

---

## 10. Security Model

- **Auth:** Supabase Auth (session). Middleware validates session and redirects unauthenticated to login.
- **Authorization:** Role from `profiles`; middleware allows/denies route groups; server actions re-check role/permission for each mutation.
- **RLS:** Supabase RLS policies so that even direct DB access respects role (e.g. technicians see only their assigned tickets or all tickets depending on policy).
- **Secrets:** All keys (Supabase, Resend, WhatsApp, OpenAI) in env; never in client bundle.
- **Public tokens:** `public_tracking_token` and estimate approval token are long random strings; no user data in token; rate limit on `/track/[token]` and `/estimate/[token]`.
- **Input:** Zod validation on all server actions and API routes; parameterized queries only (Supabase client).

---

## 11. API Design

- **Primary interface:** Next.js **Server Actions** for mutations (ticket update, customer create, payment record, etc.). No need for REST for most flows.
- **REST-style API routes** only where needed: e.g. `/api/ai/diagnose` (called from server action to avoid huge payload in form), webhooks (Resend, WhatsApp status).
- **Public endpoints:** `/track/[token]` and `/estimate/[token]` are server-rendered pages; approve/reject are server actions with token in body or header.
- **Internal:** Services are called from server actions or route handlers; no public API for internal services.

---

## 12. Deployment Model

- **Hosting:** Vercel (Next.js).
- **DB/Auth/Storage:** Supabase (EU or US region per compliance).
- **Env:** All secrets in Vercel env; same keys for Supabase, Resend, WhatsApp, OpenAI.
- **Migrations:** Run via Supabase CLI or dashboard (migrations in `db/migrations/`).
- **Build:** `next build`; no client-side secrets; server actions and API run on server.

---

## 13. Event-Driven Notification System

- **Event types:** e.g. `ticket.intake_completed`, `ticket.estimate_ready`, `ticket.approved`, `ticket.ready_for_pickup`, `ticket.ready_for_shipping`, `ticket.shipped`, `ticket.closed`, `payment.recorded`.
- **Dispatch:** After persisting state change (e.g. status → `ready_for_pickup`), call `notifications.dispatch({ event, ticketId, customerId, payload })`. Dispatch layer has a map: event → list of { template_key, channel_preference }. For each, call communications engine. All sends are logged in `communications`.
- **Idempotency:** Optional idempotency key per (ticket_id, event_type, date) to avoid duplicate sends.

---

## 14. Public Tracking Architecture

- **Route:** `app/(public)/track/[token]/page.tsx`. Token = `tickets.public_tracking_token` (unique, indexed).
- **Lookup:** Server-side: load ticket by token; if not found → 404. Return minimal data: ticket_number, device model, status, simplified timeline, estimate status, total/paid/due, pickup/shipping state, approved/waiting approval, shop contact.
- **No auth:** Page is public; no session. Rate limit by IP and/or token (e.g. Vercel edge or Upstash).
- **Mobile-first:** Responsive layout; minimal JS; SEO not critical (noindex optional).

---

## 15. Future Scalability Strategy

- **Multi-tenant:** Add `organization_id` to all main tables; RLS and middleware filter by org; one codebase, multiple shops.
- **Queue:** For notifications and PDF generation, introduce a job queue (e.g. Inngest, Trigger.dev, or Supabase pg_net) to avoid blocking request and to retry.
- **Caching:** Redis or Vercel KV for rate limiting and optional session cache.
- **Read replicas:** Supabase read replicas for heavy reporting/dashboard queries if needed.
- **AI:** Swap provider or add multiple providers (e.g. fallback) without changing business logic.

---

## Next Steps (Implementation Order)

1. Scaffold Next.js project; add Tailwind, shadcn/ui, Supabase client, env.
2. Create DB migrations (tables, enums, indexes, RLS).
3. Seed data (users, roles, customers, devices, tickets, parts, templates).
4. Auth: login, session, middleware, profiles with role.
5. Dashboard layout and RBAC-based nav.
6. Customers + Devices CRUD and UI.
7. Tickets: CRUD, workflow, numbering, events.
8. AI diagnosis: abstraction, prompt, Zod, persist, UI actions.
9. Communications: engine, Resend templates, WhatsApp adapter interface, log.
10. Notifications: dispatch rules for status changes and estimate.
11. Estimates: create, PDF, approval/reject pages, tokenized links.
12. Payments: record payment, balance, payment instructions template.
13. Inventory: parts CRUD, movements, ticket_parts, low stock.
14. Shipping: fields, status flow, shipping templates.
15. Public tracking and estimate approval pages.
16. Dashboard widgets (counts, revenue, alerts).
17. Settings: company, bank, templates.
18. Audit: ticket_events and communications already in place; add any extra audit tables if needed.
19. Build, lint, type-check, manual E2E checks.
20. README, env.example, deployment notes, feature checklist.

---

*End of Phase 1 — Architecture Document.*
