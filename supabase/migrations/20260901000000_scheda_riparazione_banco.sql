-- Scheda di riparazione rifatta sul modo in cui si lavora davvero al banco.
-- Quello che c'era: due caselle, manodopera e ricambi. Non bastano, perché
-- un preventivo è fatto di voci che si sommano e spesso di due ipotesi
-- alternative fra cui il cliente sceglie.

-- ── Preventivo a righe ──────────────────────────────────────────────────────
-- [{ t: testo, p: importo, iva: bool, listino: prezzo barrato,
--    nota: 'compreso|senza|solo recupero dati', opt: null|0|1, on: bool }]
-- Le righe con opt valorizzato sono ALTERNATIVE: nel totale ne entra una sola.
alter table public.tickets
  add column if not exists estimate_lines jsonb not null default '[]'::jsonb;

-- ── Diario della lavorazione ────────────────────────────────────────────────
-- [{ chi, quando, testo }] — ogni nota firmata e datata, la più recente in testa
alter table public.tickets
  add column if not exists work_log jsonb not null default '[]'::jsonb;

-- ── Chi segue la pratica in ufficio ─────────────────────────────────────────
-- Diverso dal tecnico: una scheda può essere ferma al banco E in ufficio.
alter table public.tickets add column if not exists office_owner  text;
alter table public.tickets add column if not exists office_reason text;
alter table public.tickets add column if not exists office_note   text;

-- ── Tappe che mancavano al percorso ─────────────────────────────────────────
-- La scheda si apre anche prima che il pezzo arrivi (ritiro col corriere):
-- finché non è arrivato non si preventiva nulla.
alter table public.tickets add column if not exists arrived_at              timestamptz;
alter table public.tickets add column if not exists pickup_requested_at     timestamptz;
alter table public.tickets add column if not exists intake_receipt_sent_at  timestamptz;
alter table public.tickets add column if not exists repaired_at             timestamptz;

-- ── Come paga ───────────────────────────────────────────────────────────────
-- 'link' = pagina di pagamento con carta senza registrazione (come la tassa
-- di soggiorno su Vatican), 'bonifico', 'paypal'.
alter table public.tickets add column if not exists payment_mode text;
alter table public.tickets add column if not exists payment_link text;

comment on column public.tickets.estimate_lines is
  'Righe del preventivo. opt non nullo = ipotesi alternativa, solo quella con on=true entra nel totale.';
comment on column public.tickets.work_log is
  'Diario della lavorazione: note firmate e datate scritte dal tecnico.';
comment on column public.tickets.office_owner is
  'Chi segue la pratica in ufficio quando è ferma per un motivo non tecnico.';

-- ── Listino delle lavorazioni ───────────────────────────────────────────────
create table if not exists public.price_list (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  intervention text,                 -- BATTERIA, DISPLAY, SCHEDA LOGICA…
  price       numeric(10,2),         -- null = si scrive a mano
  is_shipping boolean not null default false,
  sort_order  int not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.price_list enable row level security;
drop policy if exists price_list_read on public.price_list;
create policy price_list_read on public.price_list for select using (true);
drop policy if exists price_list_write on public.price_list;
create policy price_list_write on public.price_list for all using (auth.role() = 'authenticated');

-- ── Le coppie di ipotesi che si usano davvero ───────────────────────────────
create table if not exists public.estimate_pairs (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  first_line jsonb not null,         -- { t, i, nota }
  second_line jsonb not null,
  sort_order int not null default 0,
  active     boolean not null default true
);
alter table public.estimate_pairs enable row level security;
drop policy if exists estimate_pairs_read on public.estimate_pairs;
create policy estimate_pairs_read on public.estimate_pairs for select using (true);

-- ── Riconoscere il dispositivo dal numero di serie ──────────────────────────
-- Le ultime 4 cifre del seriale Apple sono il codice del modello.
create table if not exists public.serial_models (
  code      text primary key,        -- le ultime 4 cifre
  model     text not null,
  family    text,
  seen      int not null default 1   -- su quanti dispositivi lo abbiamo visto
);
alter table public.serial_models enable row level security;
drop policy if exists serial_models_read on public.serial_models;
create policy serial_models_read on public.serial_models for select using (true);

-- ── Archivio dei preventivi già fatti ───────────────────────────────────────
-- Sostituisce la ricerca a tre termini che si faceva in FileMaker e il
-- copia-incolla dalla scheda più recente.
create table if not exists public.past_estimates (
  id        bigserial primary key,
  card_no   text,
  model     text,
  family    text,
  fault     text,
  body      text not null,
  price     numeric(10,2),
  year      int,
  month     int
);
alter table public.past_estimates enable row level security;
drop policy if exists past_estimates_read on public.past_estimates;
create policy past_estimates_read on public.past_estimates for select using (true);

create index if not exists past_estimates_search
  on public.past_estimates using gin (to_tsvector('simple',
    coalesce(model,'') || ' ' || coalesce(family,'') || ' ' ||
    coalesce(body,'')  || ' ' || coalesce(fault,'')));
create index if not exists past_estimates_year on public.past_estimates (year desc, month desc);
