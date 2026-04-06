# Repair Ticket Lifecycle — Audit Summary

## Verified and finalized

| Area | Implementation |
|------|----------------|
| **Ticket creation** | `createTicket`: customer_id, device_id, priority, intake_summary; status `intake_completed`; payment_status `unpaid`; public_tracking_token (nanoid 32); created_by_user_id. Event `created` with to_status `intake_completed`. |
| **Progressive ticket number** | `getNextTicketNumber()` calls Supabase RPC `next_ticket_number()` (GL-YYYY-NNNNNN, per-year sequence). |
| **Default status** | New tickets get `intake_completed` (not `new`). Workflow allows `new` → `intake_completed` for future/other flows. |
| **Technician assignment** | `assignTechnicianAction(ticketId, assignedTechnicianId)`: RBAC `canAssignTechnician` (admin, manager); updates `assigned_technician_id`; logs event `technician_assigned` with metadata. UI: `TicketTechnicianSelect` on ticket detail (dropdown of technicians). |
| **Status transitions** | Single source of truth in `lib/ticket-workflow.ts`. Server validates with `isAllowedTransition` in `updateTicketStatus`; returns error if invalid. UI uses `getAllowedNextStatuses`. |
| **Ticket event logging** | Events: `created`, `status_change` (from_status, to_status, metadata), `notification_sent`, `estimate_approved`, `estimate_rejected`, `payment_recorded`, `ai_diagnosis_generated`, `technician_assigned`. All state changes that matter for audit are logged. |
| **Internal notes** | `intake_summary` (creation); `diagnosis` (technician/AI accept). Shown in "Diagnosi e note" card; not customer-visible. |
| **Customer-visible** | Track page: ticket_number, status, amounts, device model/category. Estimate page: id, ticket_number, status, costs, approve/reject. No internal notes or diagnosis. |
| **Timestamps** | `ready_for_pickup_at`, `ready_for_shipping_at`, `shipped_at`, `delivered_at` set when status changes. `approved_at` / `refused_at` on estimate approval/rejection. |
| **Close ticket** | `closed_at` set when status is `cancelled`, `unrepaired_returned`, or **`delivered`** (finalized in this audit). |
| **ready_for_pickup** | Sets `ready_for_pickup_at`; sends `ready_for_pickup`; if amount_due > 0 sends `payment_instructions`; logs notification_sent. |
| **ready_for_shipping** | Sets `ready_for_shipping_at`; sends `ready_for_shipping`; if amount_due > 0 sends `payment_instructions`; logs notification_sent. |
| **delivered** | Sets `delivered_at` and `closed_at`; sends `ticket_closed`; logs notification_sent. |
| **cancelled** | Sets `closed_at`; status_change event; no notification. |

## Estimate approval (public)

- **approveEstimateAction** / **rejectEstimateAction**: Token + ticketId validated; status must be `waiting_customer_approval`. Use **admin client** so unauthenticated customer can update. Events `estimate_approved` / `estimate_rejected` with user_id null, metadata source `public_page`. Rate limited by IP.

## Files touched (this audit)

- `src/app/actions/tickets.ts`: closed_at on delivered; `assignTechnicianAction`; import canAssignTechnician.
- `src/app/actions/estimate-approval.ts`: use createAdminClient for public approval/rejection.
- `src/app/actions/ai-diagnosis.ts`: insert ticket_event `ai_diagnosis_generated` on success.
- `src/components/tickets/ticket-technician-select.tsx`: new component.
- `src/app/(dashboard)/dashboard/tickets/[id]/page.tsx`: fetch technicians, canAssignTechnician, render TicketTechnicianSelect.
- `supabase/migrations/20260315000000_profiles_read_all.sql`: policy so authenticated can read all profiles (technician list).

Lint: 0 errors. Build: success.
