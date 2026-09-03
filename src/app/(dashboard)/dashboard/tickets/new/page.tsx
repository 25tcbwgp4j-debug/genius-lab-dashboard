import { createStaffClient } from '@/lib/supabase/staff'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { NuovaScheda } from '@/components/tickets/nuova-scheda'

/**
 * Aprire una scheda al banco: una schermata sola.
 *
 * Prima serviva creare il cliente in una pagina, il dispositivo in un'altra, poi
 * tornare qui e sceglierli da una tendina con 8.273 nomi in ordine alfabetico —
 * nove passaggi per un cliente nuovo che entra in negozio. I difetti ricorrenti
 * e i modelli Apple arrivano dagli stessi elenchi di FileMaker.
 */
export default async function PaginaNuovaScheda() {
  const supabase = await createStaffClient()

  const [{ data: prossimo }, { data: listaDifetti }, { data: modelliDb }] = await Promise.all([
    supabase.rpc('next_ticket_number'),
    supabase.from('price_list').select('label').eq('active', true).limit(1),
    supabase.from('serial_models').select('model').limit(600),
  ])

  // i difetti che si ripetono, dal listino difetti di FileMaker
  const difetti = [
    'NO POWER: NON SI ACCENDE',
    'BATTERIA CON POCA DURATA - NON REGGE LA CARICA - GONFIA',
    'DISPLAY ROTTO',
    'DISPLAY LCD INTERNO ROTTO (VETRO TOUCH INTEGRO)',
    'VETRO TOUCH ROTTO (LCD INTERNO FUNZIONANTE)',
    'VIDEO: DISTURBI VIDEO, ARTEFATTI GRAFICI, RIGHE, COLORI DISTORTI',
    'NO BOOT: NON SI AVVIA IL SISTEMA OPERATIVO',
    'NON RICARICA',
    'CONNETTORE DI RICARICA ROTTO',
    'BATTERIA NON RICONOSCIUTA - NON CARICA',
    'DANNEGGIAMENTO DA LIQUIDO',
    'HARD DISK ROTTO O NON RICONOSCIUTO',
    'MEMORIA RAM NON RICONOSCIUTA',
    'TASTIERA NON FUNZIONANTE',
    'CRASH DI SISTEMA, RIAVVIO RANDOM',
    'NO RETROILLUMINAZIONE DISPLAY',
    'CHIP VIDEO NON FUNZIONANTE - SI RICHIEDE SOSTITUZIONE/REBALLING',
    'CHIP AUDIO NON FUNZIONANTE - SI RICHIEDE SOSTITUZIONE/REBALLING',
    'SOFTWARE: FORMATTAZIONE E REINSTALLAZIONE SISTEMA OPERATIVO ED APPLICATIVI',
    'SOFTWARE: AGGIORNAMENTO SISTEMA OPERATIVO (PREVIO BACKUP DI SICUREZZA)',
    'SOFTWARE: PULIZIA DA VIRUS – MALWARE - TROJAN',
    'TELECAMERA FRONTALE NON FUNZIONANTE',
    'TELECAMERA RETRO NON FUNZIONANTE',
    'MICROFONO NON FUNZIONA IN CHIAMATA',
    'AURICOLARE NON SI SENTE IN CHIAMATA',
    'NON SI ACCOPPIA',
    'TASTO ACCENSIONE ON-OFF NON FUNZIONANTE',
    'WI-FI NON SELEZIONABILE',
  ]

  const modelli = [...new Set((modelliDb ?? []).map((m: { model: string }) => m.model).filter(Boolean))].sort()

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/dashboard/tickets" className="rounded border px-2 py-1.5 hover:bg-muted" aria-label="Torna alle schede">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">nuova scheda n.</p>
          <h1 className="font-mono text-2xl font-semibold leading-none tabular-nums">
            {typeof prossimo === 'string' ? prossimo : '—'}
          </h1>
        </div>
        {listaDifetti && null}
      </div>
      <NuovaScheda difetti={difetti} modelli={modelli} />
    </div>
  )
}
