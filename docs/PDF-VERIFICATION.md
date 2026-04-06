# PDF Generation — Verification

## Documents

| Document | Description | Data source |
|----------|-------------|-------------|
| **Intake sheet** | Scheda assistenza: ticket number, customer, device, issue, tracking link, contacts | ticket, device, customer, company_settings |
| **Estimate** | Preventivo: amounts (labor, parts, total), notes | ticket, device, customer |
| **Payment instructions** | Istruzioni di pagamento: amount due, IBAN, beneficiary, causale | ticket, customer, company_settings |
| **Final repair report** | Rapporto di riparazione: diagnosis, totals, completed date | ticket, device, customer, company_settings |

## Generation logic

- **Library:** `pdf-lib` (no React; server-only).
- **Layout:** `lib/pdf/layout.ts` — Genius Lab header (“Genius Lab”, “Assistenza Apple”), title per document, horizontal rule, footer note.
- **Generators:** `generate-intake.ts`, `generate-estimate.ts`, `generate-payment-instructions.ts`, `generate-final-report.ts` — each builds a single A4 page with label/value pairs and wrapped text where needed.
- **Inputs:** `lib/pdf/build-inputs.ts` — `buildIntakePdfInput(ticketId)` etc. load ticket/customer/device/settings and return typed input for each generator.
- **API:** `GET /api/documents/[type]?token=xxx` — validates `token` (public_tracking_token), loads ticket, builds input, generates PDF, returns `application/pdf` with `Content-Disposition: inline` and a filename.

## Ticket / customer / device data

- **Intake:** ticket_number, intake_summary, public_tracking_token, created_at, device_id, customer_id → device (category, model, serial_number, customer_reported_issue), customer (first_name, last_name), company (phone, address). Tracking link uses `NEXT_PUBLIC_APP_URL` + `/track/{token}`.
- **Estimate:** ticket (ticket_number, estimate_labor_cost, estimate_parts_cost, total_amount), device (model), customer (name).
- **Payment:** ticket (ticket_number, total_amount, amount_paid), customer (name), company (iban, account_holder, payment_instructions).
- **Report:** ticket (ticket_number, diagnosis, total_amount, amount_paid, delivered_at, closed_at, updated_at), device (category, model), customer (name), company (phone). Completed date: delivered_at ?? closed_at ?? updated_at.

## Links in emails and WhatsApp

- **Payload** (from `buildNotificationPayload`) includes:
  - `tracking_link`, `estimate_link` (unchanged)
  - `document_intake_link`, `document_estimate_link`, `document_payment_link`, `document_report_link` — each is `{baseUrl}/api/documents/{type}?token={public_tracking_token}`.
- Templates (DB or defaults) can use `{{document_intake_link}}`, `{{document_estimate_link}}`, etc. in body or subject. Placeholder list in dashboard settings/templates page updated.
- Links are public (token in query); anyone with the tracking token can open the PDF. No auth required so customers can open documents from email/WhatsApp.

## Branding and layout

- Header: “Genius Lab” (bold, 18pt), “Assistenza Apple” (10pt, gray).
- Document title: e.g. “Scheda assistenza – GL-2025-001” (12pt bold), then a line.
- Body: label/value pairs (bold label, normal value); long values wrapped.
- Footer: “Documento generato da Genius Lab. Per informazioni contattare i recapiti indicati.”

## Errors

- Missing token → 400.
- Ticket not found for token → 404.
- Build input returns null (missing device/customer) → 404.
- Generator throws → 500 and error logged.

## Build

- `npm run build` succeeds. PDF code is server-only (API route and build-inputs use createClient from server).
