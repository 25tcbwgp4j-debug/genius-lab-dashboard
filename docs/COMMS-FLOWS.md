# Flussi di comunicazione obbligatori

Tutti i flussi sono **event-driven**: al verificarsi dell’evento viene chiamato `dispatchNotification(event, ticketId)`, che risolve il template, invia su WhatsApp e/o email in base alla preferenza del cliente e registra tutto in `communications`.

## 1. Scheda assistenza creata (intake)

- **Evento:** creazione ticket (stato `intake_completed`).
- **Trigger:** `createTicket()` → `dispatchNotification('intake_created', ticket.id)`.
- **Template:** `intake_created`.
- **Placeholder:** `customer_name`, `ticket_number`, `tracking_link`, `shop_phone`.
- **Canali:** WhatsApp + Email (se preferenza `both`), altrimenti solo il canale scelto.

## 2. Preventivo pronto

- **Evento:** stato ticket → `estimate_ready`.
- **Trigger:** `updateTicketStatus(id, 'estimate_ready')` → `dispatchNotification('estimate_ready', ticketId)`.
- **Template:** `estimate_ready`.
- **Placeholder:** `customer_name`, `ticket_number`, `amount_due`, `estimate_link`, `shop_phone`.

## 3. Aggiornamento riparazione

- **Evento:** stato → `in_diagnosis` | `waiting_parts` | `in_repair` | `testing`.
- **Trigger:** `updateTicketStatus(id, status)` → `dispatchNotification('repair_update', ticketId)`.
- **Template:** `repair_update`.
- **Placeholder:** `customer_name`, `ticket_number`, `status`, `tracking_link`.

## 4. Pronto per il ritiro

- **Evento:** stato → `ready_for_pickup`.
- **Trigger:** `updateTicketStatus(id, 'ready_for_pickup')` → `dispatchNotification('ready_for_pickup', ticketId)` e, se `amount_due > 0`, `dispatchNotification('payment_instructions', ticketId)`.
- **Template:** `ready_for_pickup`, opzionale `payment_instructions`.
- **Placeholder:** `customer_name`, `ticket_number`, `amount_due`, `working_hours`, `shop_phone` (e per payment: `iban`, `beneficiary`).

## 5. Pronto per la spedizione

- **Evento:** stato → `ready_for_shipping`.
- **Trigger:** `updateTicketStatus(id, 'ready_for_shipping')` → `dispatchNotification('ready_for_shipping', ticketId)` e, se `amount_due > 0`, `payment_instructions`.
- **Template:** `ready_for_shipping`, opzionale `payment_instructions`.

## 6. Istruzioni bonifico

- **Evento:** inviato insieme a “pronto ritiro” o “pronto spedizione” quando c’è importo da saldare.
- **Template:** `payment_instructions`.
- **Placeholder:** `customer_name`, `ticket_number`, `amount_due`, `iban`, `beneficiary`.

## 7. Ticket chiuso

- **Evento:** stato → `delivered`.
- **Trigger:** `updateTicketStatus(id, 'delivered')` → `dispatchNotification('ticket_closed', ticketId)`.
- **Template:** `ticket_closed`.
- **Placeholder:** `customer_name`, `ticket_number`.

---

## Fallback e log

- **Fallback:** se il canale preferito è solo WhatsApp e l’invio WhatsApp fallisce, l’engine invia comunque l’email (se presente).
- **Log:** ogni tentativo (WhatsApp/email) viene registrato in `communications` con `status` (sent/failed), `provider_message_id` e `error_message`.
- **Webhook:** `POST /api/webhooks/whatsapp` può essere usato dal provider WhatsApp per aggiornare lo stato di consegna (aggiornamento su `communications` in base a `provider_message_id`).
