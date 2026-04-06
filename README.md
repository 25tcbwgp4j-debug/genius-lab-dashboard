# Genius Lab — Piattaforma gestione riparazioni

Piattaforma operativa per centro assistenza Apple: gestione clienti, dispositivi, ticket di riparazione, preventivi, pagamenti, magazzino e comunicazioni (email/WhatsApp).

## Stack

- **Next.js** (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Supabase**: PostgreSQL, Auth, Storage, Realtime
- **Resend**: email transazionali
- **WhatsApp**: architettura a adapter (integrabile con API Business)
- **Vercel**: deployment

## Requisiti

- Node.js 18+
- Account Supabase
- (Opzionale) Resend, OpenAI per AI diagnosis

## Setup locale

1. **Clona e installa**
   ```bash
   cd genius-lab
   npm install
   ```

2. **Variabili d’ambiente**
   Copia `env.example` in `.env.local` e compila:
   ```bash
   cp env.example .env.local
   ```
   - `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` dal progetto Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` per operazioni server-side (es. seed)
   - `NEXT_PUBLIC_APP_URL`: es. `http://localhost:3000`

3. **Database**
   - Crea un progetto su [Supabase](https://supabase.com)
   - Esegui le migrazioni in `supabase/migrations/` (SQL Editor o Supabase CLI)
   - Esegui `supabase/seed.sql` per impostazioni azienda e template messaggi

4. **Primo utente**
   - Iscriviti dalla app (route `/login` o pagina pubblica poi login)
   - In Supabase Dashboard → Table Editor → `profiles`: imposta `role = 'admin'` per il tuo utente

5. **Avvio**
   ```bash
   npm run dev
   ```
   Apri `http://localhost:3000`. Accedi e vai alla dashboard.

## Script

- `npm run dev` — sviluppo
- `npm run build` — build produzione
- `npm run start` — avvio dopo build
- `npm run lint` — lint

## Struttura principale

- `app/` — route Next.js (pubbliche, auth, dashboard)
- `components/` — UI, form, tabelle, ticket, clienti
- `lib/` — Supabase client, auth, validazioni
- `services/` — ticket numbering, (futuro: comunicazioni, AI)
- `app/actions/` — server actions (clienti, ticket, stime)
- `supabase/migrations/` — schema PostgreSQL
- `docs/ARCHITECTURE.md` — architettura e piano implementazione

## Ruoli

- **admin**: accesso completo
- **manager**: ticket, analytics, magazzino, comunicazioni, pagamenti
- **reception**: intake, clienti, creazione ticket, pagamenti, spedizioni
- **technician**: diagnosi, note riparazione, parti, stati, test

## Verifica e messa in esercizio

Per una **verifica generale** di tutte le funzionalità (intake PDF, diagnosi AI, preventivo, WhatsApp) e le istruzioni per **metterle in esercizio e testarle**, vedi **[docs/VERIFICA-E-MESSA-IN-ESERCIZIO.md](docs/VERIFICA-E-MESSA-IN-ESERCIZIO.md)**.

## Deploy (Vercel)

1. Collega il repo a Vercel
2. Imposta le stesse variabili d’ambiente (incl. `NEXT_PUBLIC_APP_URL` con dominio reale)
3. Deploy: Vercel usa `next build` e `next start`

## Checklist funzionalità

- [x] Auth (login, sessioni, profili con ruolo)
- [x] CRM clienti (CRUD, ricerca, canale preferito)
- [x] Dispositivi (legati a cliente, storico ticket)
- [x] Ticket riparazione (numero GL-YYYY-NNNNNN, token tracking, stati)
- [x] Workflow stati e eventi (ticket_events)
- [x] Pagina pubblica tracking `/track/[token]`
- [x] Pagina approvazione/rifiuto preventivo `/estimate/[token]`
- [x] Dashboard (conteggi, scorte basse, azioni rapide)
- [x] Magazzino (elenco parti, soglie)
- [x] Pagamenti (elenco)
- [x] Comunicazioni (log)
- [x] Impostazioni (lettura dati azienda)
- [ ] AI diagnosis (strato servizio e UI “Genera suggerimento”)
- [ ] Generazione PDF (scheda assistenza, preventivo, istruzioni pagamento)
- [ ] Invio email (Resend) e WhatsApp (adapter) su eventi
- [ ] Registrazione pagamento da UI ticket
- [ ] Assegnazione parti a ticket e movimenti magazzino
- [ ] Modifica impostazioni azienda da UI admin

## Estensioni future

- Invio automatico scheda assistenza (email + WhatsApp) alla creazione ticket
- Notifiche su cambio stato (in riparazione, pronto ritiro, ecc.)
- Template messaggi modificabili da UI
- Report e analytics (ricavi, conversioni preventivi)
- Multi-tenant (più negozi)
- Coda job per PDF e notifiche (es. Inngest)
- App mobile o PWA per tecnici

## Licenza

Uso interno / come da accordi.
