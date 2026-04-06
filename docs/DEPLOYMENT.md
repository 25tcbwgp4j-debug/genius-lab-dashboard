# Genius Lab — Note di deploy

## Vercel

1. Connessione repo GitHub/GitLab a Vercel.
2. Root directory: `genius-lab` (se monorepo) o lasciare vuoto.
3. Build command: `npm run build` (default Next.js).
4. Output directory: `.next` (default).
5. Variabili d’ambiente (Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` = `https://tuodominio.vercel.app`
   - (Quando attivi) `RESEND_API_KEY`, `OPENAI_API_KEY`, ecc.

## Supabase

- Creare progetto nella stessa region del pubblico (es. EU).
- In Authentication → URL Configuration:
  - Site URL: `https://tuodominio.vercel.app`
  - Redirect URLs: `https://tuodominio.vercel.app/**`, `http://localhost:3000/**`
- Eseguire migrazioni e seed come da README.

## Post-deploy

- Verificare login e redirect dopo signup.
- Assegnare ruolo `admin` al primo utente in `profiles`.
- Testare pagina pubblica `/track/[token]` con un token valido.
