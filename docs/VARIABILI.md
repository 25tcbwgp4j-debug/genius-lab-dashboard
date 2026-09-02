# Le variabili d'ambiente di questa dashboard

## ⚠️ L'a-capo che fermava le mail

Fino al 02/09/2026 **dodici variabili su Vercel portavano un a-capo finale**.
`EMAIL_FROM` valeva `"info@apple-assistenza.it\n"`: non è un indirizzo valido, e
Resend rifiuta il messaggio — le mail ai clienti non sarebbero partite.
`NEXT_PUBLIC_SUPABASE_URL` aveva lo stesso difetto e rompeva i link e lo
sviluppo in locale (ogni pagina rispondeva 404).

Sono state ripulite tutte alla fonte. In più `lib/env.ts` fa `.trim()` su ogni
valore, così un a-capo non fa più danni anche se rientra.

**Quando si aggiunge una variabile su Vercel**, incollare il valore senza
premere Invio prima di salvare: è così che ci finisce dentro.

## Come è fatto l'accesso

⚠️ **Non c'è Supabase Auth.** Si entra con **una sola password** per tutto lo
staff (`DASHBOARD_PASSWORD`), e il proxy respinge ogni richiesta senza cookie
firmato valido — server action comprese.

Ne discende una regola che vale per tutto il codice:

| Dove | Cosa usare |
|---|---|
| pagine e azioni dietro accesso | `createStaffClient()` — verifica il cookie, poi la chiave di servizio |
| azioni | `richiediStaff()` — restituisce l'id dello staff |
| servizi interni, cron, webhook | `createAdminClient()` |
| `/track` e `/estimate` (pubbliche) | client anonimo: il token vale da identità |

⛔ **`requireUserAndProfile()` e `getUser()` non funzionano qui**: cercano una
sessione Supabase che non esiste. Usarli significa rompere la pagina in
silenzio — è quello che rendeva irraggiungibili Magazzino, Comunicazioni,
Impostazioni e Modelli messaggi.

## Le variabili che contano

| Nome | A cosa serve |
|---|---|
| `DASHBOARD_PASSWORD` | la password d'ingresso |
| `AUTH_SECRET` | firma il cookie di sessione |
| `NEXT_PUBLIC_SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` | database |
| `RESEND_API_KEY` · `EMAIL_FROM` | invio mail (dominio `apple-assistenza.it`, verificato) |
| `NEXT_PUBLIC_APP_URL` | i link dentro mail e PDF |
| `CRON_SECRET` | protegge il riepilogo giornaliero |
