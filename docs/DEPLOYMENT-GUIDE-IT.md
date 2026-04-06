# Guida al deploy — Genius Lab: passaggi per metterlo online

Questa guida descrive **nel dettaglio** tutti i passaggi per rendere operativo il progetto Genius Lab e metterlo online in produzione.

---

## Panoramica di cosa serve

1. **Supabase** — Database, autenticazione, storage (backend).
2. **Resend** (o altro SMTP) — Invio email (notifiche ai clienti).
3. **WhatsApp** (opzionale) — Invio messaggi; senza configurazione l’app usa uno “stub” (nessun invio reale).
4. **OpenAI** (opzionale) — Diagnosi AI sui ticket; senza chiave la funzionalità non funziona.
5. **Hosting** — Vercel (consigliato), o altro (Node.js).
6. **Dominio** (opzionale) — Per avere un URL tipo `https://app.geniuslab.it`.

---

## Parte 1 — Account e strumenti

### 1.1 Account Supabase

1. Vai su [supabase.com](https://supabase.com) e crea un account (o accedi).
2. Clicca **“New project”**.
3. Compila:
   - **Name:** ad es. `genius-lab-prod`
   - **Database password:** scegli una password forte e **conservala** (serve per collegarti al DB).
   - **Region:** scegli la più vicina ai tuoi utenti (es. `West EU` per l’Italia).
4. Clicca **“Create new project”** e attendi il provisioning (1–2 minuti).

### 1.2 Ottenere le chiavi Supabase

1. Nel progetto Supabase vai su **Project Settings** (icona ingranaggio) → **API**.
2. Annota:
   - **Project URL** → sarà `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** (chiave pubblica) → sarà `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (chiave segreta) → sarà `SUPABASE_SERVICE_ROLE_KEY`  
     **Attenzione:** la `service_role` bypassa le policy di sicurezza; non esporla mai nel frontend o in repository pubblici.

### 1.3 Account Resend (email)

1. Vai su [resend.com](https://resend.com) e registrati.
2. Aggiungi e verifica un **dominio** (es. `geniuslab.it`) nelle impostazioni, oppure usa il dominio di test `onboarding.resend.dev` solo per prove.
3. In **API Keys** crea una chiave → sarà `RESEND_API_KEY`.
4. L’app invia da un indirizzo configurato in `company_settings` nel DB (es. `noreply@geniuslab.it`). Il dominio dell’email deve essere verificato su Resend.

### 1.4 OpenAI (solo se usi la diagnosi AI)

1. Vai su [platform.openai.com](https://platform.openai.com), accedi e crea una **API key**.
2. La chiave sarà `OPENAI_API_KEY`.  
   Opzionale: `OPENAI_MODEL` (default `gpt-4o-mini`), `OPENAI_BASE_URL` (se usi un proxy).

### 1.5 WhatsApp (opzionale)

L’app è predisposta per webhook WhatsApp (Twilio o Meta). Se **non** configuri nulla, l’adapter è “stub”: le notifiche WhatsApp non partono davvero ma l’app non va in errore.

- Per **Twilio:** account Twilio, numero WhatsApp, variabili `TWILIO_AUTH_TOKEN` e webhook URL.
- Per **Meta Cloud API:** app Meta, token, `META_APP_SECRET` / `WHATSAPP_WEBHOOK_SECRET`.

Se non ti serve WhatsApp subito, puoi lasciare lo stub e configurare dopo.

---

## Parte 2 — Database Supabase

### 2.1 Eseguire le migrazioni

Le migrazioni creano tabelle, indici, RLS e trigger.

1. Installa Supabase CLI (se non l’hai già):
   ```bash
   npm install -g supabase
   ```
2. Nella cartella del progetto (dove si trova `supabase/`):
   ```bash
   cd /path/to/genius-lab
   supabase login
   supabase link --project-ref <TUO_PROJECT_REF>
   ```
   Il **Project ref** è nell’URL del progetto Supabase (es. `https://app.supabase.com/project/abcdefgh` → ref = `abcdefgh`).

3. Esegui le migrazioni:
   ```bash
   supabase db push
   ```
   In alternativa, da **Supabase Dashboard** → **SQL Editor** puoi incollare ed eseguire a mano il contenuto di ogni file in `supabase/migrations/` nell’ordine (prima `20260109000000_initial_schema.sql`, poi `20260309000000_whatsapp_webhook_idempotency.sql`).

### 2.2 Seed dati iniziali (impostazioni e template)

1. In **SQL Editor** apri il file `supabase/seed.sql` del progetto.
2. Copia tutto il contenuto ed eseguilo nel SQL Editor.  
   Questo inserisce:
   - una riga in `company_settings` (nome azienda, indirizzo, telefono, email, orari, IBAN, intestatario, istruzioni pagamento, telefono WhatsApp, nome/email mittente);
   - le righe in `message_templates` (template email e WhatsApp per intake, preventivo, pronto ritiro, pagamento, spedito, concluso).

3. **Modifica** i valori in `company_settings` con i dati reali della tua attività (ragione sociale, indirizzo, telefono, email, IBAN, orari, ecc.).

### 2.3 Creare il primo utente (admin)

L’app non ha una pagina “Registrati”: il primo utente si crea da Supabase.

1. In Supabase vai su **Authentication** → **Users** → **Add user** → **Create new user**.
2. Inserisci **Email** e **Password** (e eventuale conferma email se l’hai abilitata).
3. Clicca **Create user**.  
   Il trigger `on_auth_user_created` crea in automatico una riga in `profiles` con ruolo `reception`.

4. Assegna il ruolo **admin** al primo utente:
   - Vai su **Table Editor** → tabella **profiles**.
   - Trova la riga con l’`id` uguale all’utente appena creato (stesso UUID di Auth → Users).
   - Nella colonna **role** imposta `admin` e salva.

Da questo momento puoi accedere con email/password dalla pagina di login dell’app.

### 2.4 Autenticazione: impostazioni consigliate

In **Authentication** → **Providers**:

- **Email:** abilitato (l’app usa `signInWithPassword`).
- Se vuoi che i nuovi utenti si registrino da te (in futuro), puoi abilitare **Enable email signup**; altrimenti crei gli utenti solo da Dashboard.
- **Email confirmations:** a tua scelta (se le abiliti, l’utente deve confermare l’email prima di accedere).

In **Authentication** → **URL Configuration**:

- **Site URL:** in produzione metti l’URL finale dell’app (es. `https://app.geniuslab.it`).
- **Redirect URLs:** aggiungi lo stesso URL e, se usi Vercel, anche `https://*.vercel.app/**` per i preview.

---

## Parte 3 — Variabili d’ambiente (produzione)

L’app legge queste variabili. In produzione le imposti nella piattaforma di hosting (es. Vercel).

### 3.1 Obbligatorie (app e DB)

| Variabile | Descrizione | Esempio |
|-----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL progetto Supabase | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chiave anon (pubblica) | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Chiave service role (segreta) | `eyJhbGc...` |

Senza queste l’app non si collega al database e l’auth non funziona.

### 3.2 URL dell’app (link nei messaggi e nei PDF)

| Variabile | Descrizione | Esempio |
|-----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | URL pubblico dell’app (senza slash finale) | `https://app.geniuslab.it` |

Usata per generare link di tracking, preventivo e documenti nei messaggi e nei PDF. In produzione **deve** essere l’URL reale.

### 3.3 Email (Resend)

| Variabile | Descrizione | Esempio |
|-----------|-------------|---------|
| `RESEND_API_KEY` | API key Resend | `re_xxxx` |
| `EMAIL_FROM_ADDRESS` (opzionale) | Indirizzo mittente | `noreply@geniuslab.it` |
| `EMAIL_FROM_NAME` (opzionale) | Nome mittente | `Genius Lab` |

Se `RESEND_API_KEY` non è impostata, l’invio email viene saltato (con warning in console). I valori in `company_settings` (email_from_address, email_from_name) possono essere usati dall’app; il dominio deve essere verificato su Resend.

### 3.4 Diagnosi AI (opzionale)

| Variabile | Descrizione | Esempio |
|-----------|-------------|---------|
| `OPENAI_API_KEY` | Chiave API OpenAI | `sk-...` |
| `OPENAI_MODEL` (opzionale) | Modello | `gpt-4o-mini` (default) |
| `OPENAI_BASE_URL` (opzionale) | Base URL API (es. proxy) | `https://api.openai.com/v1` |

Senza `OPENAI_API_KEY` la generazione diagnosi AI non funziona; il resto dell’app sì.

### 3.5 WhatsApp (opzionale)

| Variabile | Descrizione |
|-----------|-------------|
| `WHATSAPP_ADAPTER` | `stub` (default) oppure il nome dell’adapter (es. twilio/meta) se implementato |
| `TWILIO_AUTH_TOKEN` | Se usi Twilio |
| `META_APP_SECRET` o `WHATSAPP_WEBHOOK_SECRET` | Per verifica firma webhook Meta |

Webhook URL da configurare nel provider (Twilio/Meta) verso la tua app:  
`https://<TUO_DOMINIO>/api/webhooks/whatsapp`

---

## Parte 4 — Hosting (es. Vercel)

### 4.1 Connettere il repository

1. Vai su [vercel.com](https://vercel.com) e accedi (anche con GitHub/GitLab/Bitbucket).
2. **Add New** → **Project** e importa il repository che contiene Genius Lab.
3. Configura il progetto:
   - **Framework Preset:** Next.js (rilevato automaticamente).
   - **Root Directory:** lascia `.` se il progetto è nella root del repo.
   - **Build Command:** `npm run build` (default).
   - **Output Directory:** default di Next.js (non serve impostarlo).

### 4.2 Variabili d’ambiente su Vercel

1. Nella pagina del progetto: **Settings** → **Environment Variables**.
2. Aggiungi **tutte** le variabili elencate sopra (Parte 3), con valore **Production** (e, se vuoi, anche Preview).
3. Per le chiavi segrete (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `OPENAI_API_KEY`, ecc.) usa il campo “sensitive” se disponibile.
4. **Importante:** imposta `NEXT_PUBLIC_APP_URL` con l’URL di produzione (es. `https://genius-lab.vercel.app` o il tuo dominio personalizzato).

### 4.3 Deploy

1. Clicca **Deploy** (o fai push sul branch collegato se hai attivato i deploy automatici).
2. Attendi la fine del build. Se ci sono errori, controlla i log (spesso sono variabili d’ambiente mancanti o errori TypeScript).
3. Una volta completato avrai un URL tipo `https://genius-lab-xxx.vercel.app`.

### 4.4 Dominio personalizzato (opzionale)

1. **Settings** → **Domains** → aggiungi il dominio (es. `app.geniuslab.it`).
2. Segui le istruzioni Vercel per puntare il DNS (record CNAME o A) al dominio Vercel.
3. Dopo la propagazione DNS, aggiorna:
   - `NEXT_PUBLIC_APP_URL` = `https://app.geniuslab.it`
   - In Supabase **Authentication** → **URL Configuration** → **Site URL** e **Redirect URLs** con lo stesso dominio.

---

## Parte 5 — Verifiche dopo il deploy

### 5.1 Login

1. Apri l’URL dell’app (Vercel o tuo dominio).
2. Vai alla pagina di login e accedi con l’utente creato in Supabase (ruolo admin).
3. Dovresti entrare nella dashboard senza errori.

### 5.2 Dati azienda e template

1. Vai in **Impostazioni**: dovresti vedere i dati da `company_settings` (ragione sociale, indirizzo, IBAN, ecc.).
2. Vai in **Impostazioni** → **Gestisci template**: controlla che i template email/WhatsApp ci siano (quelli inseriti con il seed).

### 5.3 Creare un ticket di prova

1. Crea un **Cliente** (nome, email, telefono).
2. Aggiungi un **Dispositivo** al cliente.
3. Crea una **Riparazione** (nuovo ticket) per quel cliente e dispositivo.
4. Controlla che:
   - Il ticket appaia in dashboard e in dettaglio.
   - Se le email sono configurate, il cliente dovrebbe ricevere l’email di intake (se il sistema la invia alla creazione).

### 5.4 Link pubblici (tracking e preventivo)

1. Dal dettaglio ticket copia il **link tracking** (es. `https://tuodominio.com/track/xxxx`).
2. Apri il link in una finestra in incognito (senza essere loggato): deve mostrare stato e importi senza chiedere login.
3. Se il ticket è in “In attesa approvazione”, apri il link **approvazione preventivo** (es. `https://tuodominio.com/estimate/xxxx`): deve mostrare il preventivo e i pulsanti Approva/Rifiuta.

### 5.5 Documenti PDF

1. Dal dettaglio ticket usa i link ai documenti (intake, preventivo, pagamento, report) che contengono `?token=...`.
2. Apri un link in incognito: deve scaricare/aprire il PDF senza richiedere login.

### 5.6 Email

Se hai configurato Resend e il dominio:

- Crea o aggiorna un ticket in uno stato che invia notifica (es. “Preventivo pronto”).
- Verifica che il cliente riceva l’email e che i link dentro l’email puntino a `NEXT_PUBLIC_APP_URL`.

---

## Parte 6 — Riepilogo ordine operativo

Ecco l’ordine consigliato dei passaggi:

1. Creare progetto Supabase e annotare URL e chiavi.
2. Eseguire migrazioni (`supabase db push` o SQL a mano).
3. Eseguire il seed (`seed.sql`) e aggiornare `company_settings` con i dati reali.
4. Creare il primo utente da Authentication → Users e impostare `profiles.role = admin`.
5. Configurare in Supabase Auth: Site URL e Redirect URLs (anche temporanei se ancora senza dominio).
6. Creare progetto su Vercel (o altro host) e collegare il repo.
7. Impostare tutte le variabili d’ambiente (minimo: Supabase URL, anon key, service_role key, `NEXT_PUBLIC_APP_URL`).
8. Fare il primo deploy e verificare che il build sia verde.
9. Testare login, dashboard, creazione ticket, link pubblici (tracking, estimate, PDF).
10. (Opzionale) Aggiungere Resend e `RESEND_API_KEY`, poi testare l’invio email.
11. (Opzionale) Aggiungere dominio personalizzato e aggiornare `NEXT_PUBLIC_APP_URL` e URL in Supabase.
12. (Opzionale) Configurare OpenAI e WhatsApp quando servono.

---

## Troubleshooting rapidi

- **“Non autenticato” / redirect a login:** controlla che le variabili Supabase siano corrette e che l’utente esista in Auth e in `profiles` con ruolo adeguato.
- **Link di tracking/estimate/documenti non funzionano:** verifica `NEXT_PUBLIC_APP_URL` (nessuno slash finale, stesso dominio usato dall’utente).
- **Email non partono:** controlla `RESEND_API_KEY`, dominio verificato su Resend e che l’indirizzo mittente sia autorizzato.
- **Build fallisce:** di solito manca una variabile d’ambiente obbligatoria o c’è un errore TypeScript; controlla i log di build su Vercel.

Con questi passaggi il progetto Genius Lab può essere reso operativo e messo online in produzione.
