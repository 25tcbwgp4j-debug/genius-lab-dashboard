# Shipping Workflow — Audit & Finalization

## Verified elements

### shipping_required flag
- **Schema:** `tickets.shipping_required` BOOLEAN DEFAULT false.
- **Types:** `Ticket.shipping_required: boolean`.
- **UI:** Ticket detail "Spedizione" card shows Sì/No; editable via `TicketShippingCard` (Modifica) until status is shipped/delivered.
- **Payload:** Included in build-payload for notifications (shipping_address, courier_name, tracking_code, recipient_name, recipient_phone).

### Shipping address storage
- **Schema:** `tickets.shipping_address` TEXT, `recipient_name` TEXT, `recipient_phone` TEXT, `shipping_notes` TEXT.
- **Action:** `updateTicketShipping(ticketId, { shipping_address?, recipient_name?, recipient_phone?, shipping_notes?, shipping_required? })` updates ticket.
- **UI:** Spedizione card displays and allows editing (before shipped/delivered).

### Courier name
- **Schema:** `tickets.courier_name` TEXT.
- **Set when:** Status changed to **shipped** via `updateTicketStatus(ticketId, 'shipped', { courier_name, tracking_code })`; metadata is persisted on the ticket.
- **UI:** TicketActions opens a dialog when user selects "shipped"; user enters Corriere and Codice tracciamento; both saved and included in **shipped** notification.

### Tracking code
- **Schema:** `tickets.tracking_code` TEXT.
- **Set when:** Same as courier_name (status → shipped with metadata).
- **Payload/notifications:** `shipped` template uses `{{courier_name}}` and `{{tracking_code}}` (email + WhatsApp).

### Shipping status
- There is no separate "shipping_status" column. Shipping state is derived from **ticket status** and timestamps:
  - **ready_for_shipping** → ticket is ready to ship (timestamp: `ready_for_shipping_at`).
  - **shipped** → device has been handed to courier (timestamp: `shipped_at`; `courier_name`, `tracking_code` set).
  - **delivered** → device delivered (timestamp: `delivered_at`).
- **Ticket status** is the single source of truth; workflow transitions are enforced in `TicketActions` (ALLOWED_TRANSITIONS).

---

## Workflow states

| State | DB status | Meaning |
|-------|-----------|--------|
| ready_for_shipping | `ready_for_shipping` | Repair done; device can be shipped. If amount_due > 0, payment_instructions are sent; logical "waiting_payment" = ready_for_shipping + amount_due > 0. |
| waiting_payment | *(not a DB status)* | Logical: ticket is `ready_for_shipping` and `amount_due > 0`. Customer must pay before shipping. |
| shipped | `shipped` | Device has been shipped; courier_name and tracking_code stored; **shipped** notification sent (email + WhatsApp) with tracking info. |
| delivered | `delivered` | Device delivered; **ticket_closed** notification sent. |

**Allowed transitions (from ticket-actions):**
- testing → ready_for_pickup | ready_for_shipping | in_repair
- ready_for_shipping → shipped | cancelled
- shipped → delivered
- delivered → (final)

---

## Notifications and ticket updates

| Event | Trigger | Ticket updates | Notifications |
|-------|--------|----------------|---------------|
| ready_for_shipping | Status → ready_for_shipping | `ready_for_shipping_at` set | ready_for_shipping; if amount_due > 0 then payment_instructions |
| shipped | Status → shipped | `shipped_at` set; `courier_name`, `tracking_code` from metadata | shipped (email + WhatsApp with courier + tracking_code + tracking_link) |
| delivered | Status → delivered | `delivered_at` set | ticket_closed |

**Payload for shipped:** Built from ticket after update; includes `courier_name`, `tracking_code`, `tracking_link`, `customer_name`, `ticket_number` (see build-payload and template-resolver shipped defaults).

---

## UI summary

- **Ticket detail:** "Spedizione" card shows shipping_required, address, recipient, courier, tracking code; "Modifica" to edit shipping address/recipient (disabled when status is shipped or delivered).
- **Cambia stato:** Selecting "shipped" opens a dialog to enter Corriere and Codice tracciamento; on confirm, status is set to shipped, courier/tracking saved, and shipped notification is sent.
