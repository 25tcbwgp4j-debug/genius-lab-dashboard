# Payment Module — Audit & Completion

## Verification

### amount_due calculation
- **build-payload:** `amount_due = Math.max(0, total - paid)` with `total = Number(ticket.total_amount ?? 0)`, `paid = Number(ticket.amount_paid ?? 0)`. Formatted as `.toFixed(2)` for templates.
- **Ticket detail page:** "Da saldare" uses `Math.max(0, Number(ticket.total_amount ?? 0) - Number(ticket.amount_paid ?? 0)).toFixed(2)`.
- **recordPaymentAction:** `newPaid = Math.max(0, currentPaid + payload.amount)`; ticket is updated with `amount_paid: newPaid`.

### Partial payment logic
- **payment_status:** `total <= 0 ? 'unpaid' : newPaid >= total ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid'`. Partial when `0 < newPaid < total`.
- **recordPaymentAction:** Each recorded payment is added to `amount_paid`; status is recomputed after each insert.

### paid/unpaid status
- **Ticket:** `payment_status` is one of `unpaid`, `partial`, `paid` (stored as TEXT in schema). Updated only in `recordPaymentAction` and on ticket create (default `unpaid`).
- **UI:** Badge on ticket detail; TicketPaymentsCard shows "Da saldare", "Parziale", "Saldata" as appropriate.

### Payment logging
- **payments table:** Each `recordPaymentAction` inserts a row: `ticket_id`, `payment_method`, `amount`, `payment_date`, `reference`, `notes`, `created_by`.
- **ticket_events:** After each successful payment, a row is inserted with `event_type: 'payment_recorded'`, `metadata: { payment_id, amount, payment_method }`.
- **RBAC:** `canRecordPayment(profile.role)` enforced in `recordPaymentAction` (admin, manager, reception).

### Bank transfer instruction generation
- **Payload (build-payload):** `iban`, `beneficiary` (account_holder), `amount_due`, `payment_reference` (GL + ticket_number), `payment_instructions`, `proof_of_payment_instructions` (from company_settings or default).
- **Email (payment_instructions):** IBAN, Intestatario, Riferimento di pagamento (causale), proof-of-payment line.
- **PDF (payment document):** Same fields; "Riferimento di pagamento (causale)" and "Dopo il pagamento" section.
- **Templates:** Default body and WhatsApp include `{{payment_reference}}` and `{{proof_of_payment_instructions}}`.

## Payment instructions — required elements

| Element | Source | Where used |
|--------|--------|------------|
| IBAN | company_settings.iban | Payload, email, PDF, templates |
| Account holder | company_settings.account_holder (beneficiary) | Payload, email, PDF, templates |
| Ticket number | ticket.ticket_number | Payload, payment_reference = GL + ticket_number |
| Amount due | total_amount - amount_paid (≥ 0) | Payload, email, PDF |
| Payment reference | GL {ticket_number} | Payload as payment_reference, email, PDF |
| Proof of payment instructions | company_settings.payment_instructions or default text | Payload as proof_of_payment_instructions, email, PDF |

## Communication triggers

- **payment_instructions** is dispatched from `updateTicketStatus` when:
  - status is set to **ready_for_pickup** and `amountDue > 0`, or
  - status is set to **ready_for_shipping** and `amountDue > 0`.
- **amountDue** is computed as `Number(ticketFull.total_amount) - Number(ticketFull.amount_paid)` after the status update (so it reflects the ticket state at trigger time).
- No automatic re-send when a new payment is recorded; only the status-driven flows send payment_instructions.

## UI

- **Ticket detail:** "Pagamenti" card with list of payments and "Registra pagamento" form (amount, method, reference, notes) when `canRecordPayment` is true.
- **Dashboard Pagamenti:** List of last 50 payments with ticket link, amount, method, date.
