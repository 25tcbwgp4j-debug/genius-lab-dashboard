-- Seed: company settings (single row)
INSERT INTO company_settings (
  company_name, address, city, postal_code, phone, email,
  working_hours, iban, account_holder, payment_instructions,
  default_disclaimer, whatsapp_phone, email_from_name, email_from_address
) VALUES (
  'Genius Lab',
  'Via Roma 1',
  'Milano',
  '20100',
  '+39 02 1234567',
  'info@geniuslab.it',
  'Lun-Ven 9:00-19:00, Sab 9:00-13:00',
  'IT60X0542811101000000123456',
  'Genius Lab S.r.l.',
  'Inserire nella causale: GL + numero riparazione. Inviare distinta a info@geniuslab.it',
  'I dati sono trattati secondo la normativa privacy. Riparazione soggetta a condizioni generali.',
  '+393331234567',
  'Genius Lab',
  'noreply@geniuslab.it'
) ON CONFLICT DO NOTHING;

-- Message templates (placeholders)
INSERT INTO message_templates (template_key, channel, subject, body) VALUES
('intake_created', 'email', 'Scheda assistenza {{ticket_number}}', 'Gentile {{customer_name}},\n\nAbbiamo registrato il suo dispositivo. Numero riparazione: {{ticket_number}}.\nScheda assistenza (PDF): {{document_intake_link}}\nSegui lo stato: {{tracking_link}}\n\nContatti: {{shop_phone}}'),
('intake_created', 'whatsapp', NULL, 'Gentile {{customer_name}}, scheda assistenza {{ticket_number}}. PDF: {{document_intake_link}} Tracking: {{tracking_link}}. Contatti: {{shop_phone}}'),
('estimate_ready', 'email', 'Preventivo {{ticket_number}}', 'Gentile {{customer_name}},\n\nIl preventivo per {{ticket_number}} è pronto. Totale: {{amount_due}} €.\nApprovazione: {{estimate_link}}\n\n{{shop_phone}}'),
('estimate_ready', 'whatsapp', NULL, 'Preventivo {{ticket_number}} pronto. Totale {{amount_due}} €. Approva o rifiuta: {{estimate_link}}'),
('repair_update', 'email', 'Aggiornamento {{ticket_number}}', 'Gentile {{customer_name}},\n\nStato riparazione {{ticket_number}}: {{status}}.\n{{tracking_link}}'),
('repair_update', 'whatsapp', NULL, '{{ticket_number}}: {{status}}. {{tracking_link}}'),
('ready_for_pickup', 'email', 'Dispositivo pronto - {{ticket_number}}', 'Gentile {{customer_name}},\n\nIl suo dispositivo è pronto per il ritiro. Importo da saldare: {{amount_due}} €.\nOrari: {{working_hours}}. {{shop_phone}}'),
('ready_for_pickup', 'whatsapp', NULL, 'Dispositivo pronto per ritiro. Importo: {{amount_due}} €. Orari: {{working_hours}}. {{shop_phone}}'),
('ready_for_shipping', 'email', 'Pronto per spedizione - {{ticket_number}}', 'Gentile {{customer_name}},\n\nRiparazione completata. Totale: {{amount_due}} €. Istruzioni bonifico: {{payment_instructions}}. Dopo il pagamento spediremo il dispositivo.'),
('ready_for_shipping', 'whatsapp', NULL, 'Riparazione completata. Totale {{amount_due}} €. Istruzioni pagamento: {{iban}} - Causale GL {{ticket_number}}'),
('payment_instructions', 'email', 'Istruzioni di pagamento - {{ticket_number}}', 'Gentile {{customer_name}},\n\nImporto da saldare: {{amount_due}} €.\nIBAN: {{iban}}\nIntestatario: {{beneficiary}}\nCausale: GL {{ticket_number}}'),
('payment_instructions', 'whatsapp', NULL, 'Pagamento: {{amount_due}} €. IBAN: {{iban}}. Intestatario: {{beneficiary}}. Causale: GL {{ticket_number}}'),
('shipped', 'email', 'Dispositivo spedito - {{ticket_number}}', 'Gentile {{customer_name}},\n\nIl suo dispositivo (riparazione {{ticket_number}}) è stato spedito.\nCorriere: {{courier_name}}\nCodice tracciamento: {{tracking_code}}\n\nSegui la spedizione: {{tracking_link}}'),
('shipped', 'whatsapp', NULL, 'Dispositivo {{ticket_number}} spedito. Corriere: {{courier_name}}. Tracciamento: {{tracking_code}}. {{tracking_link}}'),
('ticket_closed', 'email', 'Riparazione conclusa - {{ticket_number}}', 'Gentile {{customer_name}},\n\nLa riparazione {{ticket_number}} è stata conclusa. Grazie per aver scelto Genius Lab.'),
('ticket_closed', 'whatsapp', NULL, 'Riparazione {{ticket_number}} conclusa. Grazie da Genius Lab.')
ON CONFLICT (template_key, channel) DO UPDATE SET body = EXCLUDED.body, subject = EXCLUDED.subject;

-- Note: Users (profiles) and customers/devices/tickets/parts are created via app or separate seed after auth exists.
-- Run after first user signup or create users via Supabase Dashboard and then:
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@geniuslab.it';
