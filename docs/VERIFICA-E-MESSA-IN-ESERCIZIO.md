# Verifica generale e messa in esercizio — Genius Lab

Questa guida riassume **tutto ciò che è stato implementato**, come **metterlo in esercizio**, **farlo funzionare** e **testarlo prima** di andare in produzione.

---

## 1. Riepilogo di ciò che è stato implementato

### 1.1 Scheda di intake (PDF)

- **Dati reali:** La PDF usa dati da `tickets`, `devices`, `customers`, `company_settings` (niente placeholder).
- **Sezioni:** Branding azienda, numero riparazione, data intake, dati cliente (nome, email, telefono, indirizzo), dispositivo (categoria, modello, seriale, IMEI/MEID se presenti), problema segnalato, accessori ricevuti, condizione intake, disclaimer, link tracking, contatti negozio.
- **Generazione:** `buildIntakePdfInput()` + `generateIntakeSheetBytes()`; API pubblica: `GET /api/documents/intake?token=...`.
- **Comunicazioni:** I template predefiniti e il seed includono `{{document_intake_link}}` nelle email/WhatsApp per “Scheda assistenza (PDF)”.
- **Regola:** Il PDF non scrive mai su `tickets.diagnosis` (solo il tecnico).

### 1.2 Modulo diagnosi AI

- **Provider:** Interfaccia `IAIDiagnosisProvider`; adapter OpenAI in `lib/ai/openai-adapter.ts`; factory con `AI_DIAGNOSIS_PROVIDER` (default `openai`).
- **Prompt e Zod:** `buildDiagnosisPrompt()` in `lib/ai/prompt-builder.ts`; `aiDiagnosisResponseSchema` in `lib/ai/schemas.ts`; `parseAIResponse()` con validazione strict.
- **Persistenza:** Risultati in `ticket_ai_diagnosis`; sul ticket solo `ai_diagnosis_summary`, `ai_recommended_actions`, `ai_risk_flags`. **Mai** scrittura su `tickets.diagnosis`.
- **Log e retry:** Log strutturato (start/success/fail); 3 tentativi con backoff; eventi `ai_diagnosis_generated` in `ticket_events`.
- **Azioni tecnico:** Genera, Accetta nelle note (append), Scarta, Rigenera. RBAC: `canUseAIDiagnosis`, `canEditDiagnosis`.
- **UI:** Blocco “Suggerimento diagnosi AI” con confidenza, avvertenze/rischi, ipotesi di guasto, controlli consigliati, parti probabili.

### 1.3 Modulo preventivo (estimate)

- **Creazione:** Card “Preventivo” in dettaglio ticket: manodopera, ricambi, note/esclusioni → **Salva preventivo** (`updateEstimateAction`). Totale = manodopera + ricambi; salvato in `total_amount`.
- **Invio al cliente:** Cambia stato → “Preventivo pronto” (estimate_ready): sincronizza `total_amount`, invia notifica (email/WhatsApp con `{{estimate_link}}`), passa automaticamente a `waiting_customer_approval`.
- **PDF:** `GET /api/documents/estimate?token=...`; include note da `estimate_notes` se presenti.
- **Approvazione/Rifiuto:** Pagina pubblica `/estimate/[token]`; link sicuro (token + ticketId). Approva → `approved`; Rifiuta (con nota opzionale) → `refused` + `refused_note`. Rate limit e admin client solo per queste azioni pubbliche.
- **Eventi:** `status_change` (estimate_ready, waiting_customer_approval), `estimate_approved` / `estimate_rejected` in `ticket_events`.

### 1.4 Layer WhatsApp (produzione)

- **Adapter:** `IWhatsAppAdapter`; attualmente solo stub; fallback a stub con warning se si richiede altro.
- **Template e parametri:** Template da DB o default; sostituzione `{{key}}` con payload costruito lato server; chiavi limitate e valori sicuri.
- **Webhook:** `POST /api/webhooks/whatsapp` — rate limit, body max 100KB, verifica firma (Meta/Twilio), Zod strict su payload, idempotenza (`messageId:status`), aggiornamento stato comunicazione con gestione out-of-order.
- **Invio:** Retry 3 tentativi con backoff; fallback: se preferenza WhatsApp e invio WhatsApp fallisce, invio email.
- **Log:** Ogni invio (successo/fallimento) in tabella `communications`; log strutturato per webhook.

---

## 2. Prerequisiti

- **Node.js** 18+
- **Account Supabase** (progetto creato)
- **Account Resend** (per email reali; opzionale in dev)
- **Chiave OpenAI** (per diagnosi AI; opzionale se non usi l’AI)

---

## 3. Variabili d’ambiente

Copia `env.example` in `.env.local` nella root del progetto:

```bash
cp env.example .env.local
```

Compila come segue.

| Variabile | Obbligatoria | Descrizione |
|-----------|--------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sì | URL progetto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sì | Chiave anon Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sì | Service role (webhook, pagine pubbliche, documenti) |
| `NEXT_PUBLIC_APP_URL` | Consigliata | URL pubblico dell’app (es. `http://localhost:3000` in dev, `https://tuodominio.it` in prod). Usata in link email, PDF, tracking, preventivo. |
| `RESEND_API_KEY` | Per email reali | Senza: le email non partono (log/stub). |
| `EMAIL_FROM`, `EMAIL_FROM_NAME` | Opzionale | Mittente email (default in env.example). |
| `OPENAI_API_KEY` | Per diagnosi AI | Senza: “Genera suggerimento” AI fallirà. |
| `OPENAI_MODEL`, `OPENAI_BASE_URL` | Opzionale | Default: gpt-4o-mini e API OpenAI. |
| `WHATSAPP_ADAPTER` | Opzionale | Default `stub` (nessun invio reale). |
| `WHATSAPP_WEBHOOK_SECRET` o `META_APP_SECRET` | Per webhook Meta | In produzione richiesta verifica firma Meta. |
| `TWILIO_AUTH_TOKEN` | Per webhook Twilio | Se usi Twilio per WhatsApp. |

In **produzione** per il webhook WhatsApp è richiesta almeno una firma (Meta o Twilio).

---

## 4. Database: migrazioni e seed

Esegui le migrazioni **nell’ordine** (nome file in ordine alfabetico):

1. `20260109000000_initial_schema.sql` — schema base (tickets, communications, profiles, ecc.)
2. `20260309000000_whatsapp_webhook_idempotency.sql` — tabella idempotenza webhook WhatsApp
3. `20260310000000_communications_body.sql` — corpo comunicazioni
4. `20260315000000_profiles_read_all.sql` — policy profiles
5. `20260316000000_ticket_estimate_notes.sql` — `estimate_notes` e `refused_note` su tickets

**Dove eseguirle:** Supabase Dashboard → SQL Editor. Incolla ed esegui il contenuto di ogni file nell’ordine sopra.

Poi esegui il **seed** (impostazioni azienda e template messaggi):

- File: `supabase/seed.sql`
- Stesso SQL Editor: esegui il contenuto del file.

**Primo utente admin:** Dopo la prima registrazione dalla app, in Supabase → Table Editor → `profiles` imposta `role = 'admin'` per il tuo utente (es. tramite email).

---

## 5. Come mettere in esercizio (avvio)

```bash
cd genius-lab
npm install
npm run dev
```

Apri `http://localhost:3000` (o il valore di `NEXT_PUBLIC_APP_URL`). Accedi con l’utente a cui hai dato ruolo admin.

- **Build produzione:** `npm run build && npm run start`
- **Lint:** `npm run lint`

---

## 6. Come testare prima (test manuali)

### 6.1 Test scheda di intake (PDF)

1. **Crea un ticket:** Dashboard → Ticket → Nuovo ticket. Seleziona cliente e dispositivo, compila intake, salva.
2. **Verifica comunicazione:** Alla creazione parte la notifica (email se hai Resend; WhatsApp solo se adapter non stub). Controlla che il corpo contenga un link tipo “Scheda assistenza (PDF)” o “PDF: …”.
3. **Apri il link PDF:** Usa il link dalla email (es. `{{document_intake_link}}`) oppure costruisci:  
   `https://tuo-host/api/documents/intake?token=TOKEN`  
   (il `TOKEN` è il `public_tracking_token` del ticket, visibile in dettaglio ticket).
4. **Controlla il PDF:** Verifica che compaiano dati reali: numero riparazione, data, cliente (nome, email, telefono, indirizzo se presenti), dispositivo (modello, categoria, seriale, IMEI/MEID se presenti), problema segnalato, accessori, condizione intake, disclaimer, link tracking, contatti negozio.
5. **Impostazioni azienda:** In Dashboard → Impostazioni verifica che ci siano `company_name` e, se usato, `default_disclaimer` (in seed sono già valorizzati).

### 6.2 Test diagnosi AI

1. **Requisito:** `OPENAI_API_KEY` in `.env.local`.
2. **Ticket in diagnosi:** Porta un ticket in stato “In diagnosi” o “Diagnosi AI generata”.
3. **Genera suggerimento:** Nel blocco “Suggerimento diagnosi AI” clicca “Genera suggerimento” (o “Rigenera”). Attendi il completamento.
4. **Verifica UI:** Controlla confidenza, avvertenze/rischi, ipotesi di guasto, controlli consigliati, parti probabili.
5. **Accetta/Scarta:** Prova “Accetta nelle note” (il testo viene aggiunto alla diagnosi con separatore) e “Scarta” (pulizia campi AI sul ticket; la storia resta in `ticket_ai_diagnosis`).
6. **Regola critica:** Verifica che in “Diagnosi e note” la diagnosi tecnico non venga mai sovrascritta dall’AI; l’accettazione solo **aggiunge** testo.

### 6.3 Test flusso preventivo (end-to-end)

1. **Preventivo sul ticket:** Apri un ticket (es. “In diagnosi”). Nella card “Preventivo” inserisci Manodopera (es. 50), Ricambi (es. 30), eventuali Note. Clicca “Salva preventivo”.
2. **Verifica totali:** In “Importi e link” il totale deve essere 80 € (o quanto impostato).
3. **Invia al cliente:** Cambia stato → “Preventivo pronto” (estimate_ready). Controlla che:
   - Lo stato passi a “In attesa approvazione” (waiting_customer_approval).
   - Parta la notifica (email/WhatsApp) con link tipo `{{estimate_link}}`.
4. **Link approvazione:** Apri il link approvazione (es. `https://tuo-host/estimate/TOKEN`). Verifica che la pagina mostri manodopera, ricambi, totale e pulsanti Approva / Rifiuta.
5. **PDF preventivo:** Apri `https://tuo-host/api/documents/estimate?token=TOKEN`. Verifica che il PDF contenga gli stessi importi e le note (se inserite).
6. **Approva:** Clicca “Approva preventivo”. Controlla che il ticket passi a “Approvato” e in timeline compaia l’evento `estimate_approved`.
7. **Rifiuto (altro ticket):** Ripeti fino al passo link approvazione, poi clicca “Rifiuta” con una nota opzionale. Verifica stato “Rifiutato” e che in “Diagnosi e note” (o dove mostri le note rifiuto) compaia la “Note rifiuto cliente”.

### 6.4 Test WhatsApp (invio e webhook)

**Invio (con stub):**

1. Con `WHATSAPP_ADAPTER=stub` (default) gli “invii” non escono realmente; in console vedi log tipo `[StubWhatsApp] sendText`.
2. Crea un ticket e verifica che la notifica venga “inviata” (log) e che in tabella `communications` compaia una riga con `channel = 'whatsapp'` e `status = 'sent'` (o `failed` se simuli errore).
3. Se preferenza cliente è WhatsApp e l’adapter fallisce, deve partire il fallback email (se configurato).

**Webhook (solo se esponi l’endpoint):**

1. **Firma:** In produzione imposta `WHATSAPP_WEBHOOK_SECRET` (Meta) o `TWILIO_AUTH_TOKEN` (Twilio).
2. **URL:** `POST https://tuo-host/api/webhooks/whatsapp`.
3. **Test:** Invia un payload di status callback (Twilio o Meta) con firma corretta; verifica in log “Signature verified”, “Status callback received”, “Communication status updated” o “idempotent_skip” in caso di duplicato.
4. **Idempotenza:** Invia due volte lo stesso (messageId, status); la seconda deve essere ignorata (idempotent_skip).
5. **Body troppo grande:** Invia un body > 100 KB; deve rispondere 413.

---

## 7. Checklist pre-produzione

- [ ] Tutte le migrazioni eseguite nell’ordine incluso `20260316000000_ticket_estimate_notes.sql`.
- [ ] Seed eseguito (company_settings, message_templates).
- [ ] `.env.local` (o variabili su hosting) con almeno: Supabase URL, anon key, service role key, `NEXT_PUBLIC_APP_URL` con dominio reale.
- [ ] Per email reali: `RESEND_API_KEY` e mittente configurati.
- [ ] Per diagnosi AI: `OPENAI_API_KEY` configurata.
- [ ] Per webhook WhatsApp in produzione: almeno una tra `WHATSAPP_WEBHOOK_SECRET`/`META_APP_SECRET` (Meta) o `TWILIO_AUTH_TOKEN` (Twilio).
- [ ] Almeno un utente con `role = 'admin'` in `profiles`.
- [ ] Test manuali: creazione ticket + link PDF intake, generazione AI (se usata), flusso preventivo (salva → invia → approva/rifiuta), comunicazioni e, se applicabile, webhook.

---

## 8. Riferimenti rapidi

- **Link pubblici (token = `public_tracking_token` del ticket):**
  - Tracking: `/track/{token}`
  - Approvazione preventivo: `/estimate/{token}`
  - PDF intake: `/api/documents/intake?token={token}`
  - PDF preventivo: `/api/documents/estimate?token={token}`
  - PDF istruzioni pagamento: `/api/documents/payment?token={token}`
  - PDF rapporto finale: `/api/documents/report?token={token}`
- **Documentazione dettagliata:**  
  `docs/AI-DIAGNOSIS-AUDIT.md`, `docs/WHATSAPP-PRODUCTION-HARDENING.md`, `docs/PDF-VERIFICATION.md`, `docs/COMMUNICATION-FLOWS-VERIFICATION-REPORT.md`.
