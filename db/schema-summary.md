# Schema database — riepilogo

## Tabelle

| Tabella | Descrizione |
|--------|-------------|
| `profiles` | Estensione auth.users: ruolo (admin/manager/reception/technician), display_name |
| `company_settings` | Dati azienda, IBAN, orari, WhatsApp/email, disclaimer |
| `customers` | CRM: nome, contatti, canale preferito, consensi |
| `devices` | Dispositivi (categoria, modello, serial, IMEI, stato intake) |
| `tickets` | Riparazioni: numero, cliente, dispositivo, stati, costi, token pubblico, spedizione |
| `ticket_events` | Audit: event_type, from_status, to_status, user_id |
| `ticket_ai_diagnosis` | Risultati AI per ticket (ipotesi, controlli, rischi) |
| `parts` | Ricambi: SKU, quantità, soglia, prezzi |
| `stock_movements` | Movimenti magazzino (stock_in, stock_out, adjustment, reserved_for_ticket) |
| `ticket_parts` | Parti assegnate a ticket |
| `payments` | Pagamenti per ticket (metodo, importo, data) |
| `communications` | Log invii (canale, template, destinatario, stato) |
| `message_templates` | Template email/WhatsApp (template_key, body, subject) |

## Enums

- `app_role`, `device_category`, `ticket_priority`, `ticket_status`, `contact_channel`, `communication_channel`, `communication_status`, `stock_movement_type`, `payment_method`

## Funzioni

- `next_ticket_number()` → 'GL-YYYY-NNNNNN'
- `handle_new_user()` trigger: crea profilo su signup

## Migrazioni

In `supabase/migrations/`: applicare in ordine (es. via Supabase Dashboard → SQL Editor o CLI).
