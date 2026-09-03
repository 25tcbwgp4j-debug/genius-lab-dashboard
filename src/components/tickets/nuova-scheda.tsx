'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  cercaClienteAction, storicoClienteAction, modelloDaSerialeAction, creaSchedaAction,
} from '@/app/actions/banco'

/**
 * Aprire una scheda al banco.
 *
 * Una schermata sola, nell'ordine in cui si parla col cliente: chi sei, cos'hai
 * portato, cos'ha. Niente da preparare prima: il cliente che non esiste si crea
 * scrivendone il nome, il dispositivo pure. Se il cliente è già passato di qui
 * lo si riconosce scrivendo tre lettere o il numero di telefono, e i suoi dati
 * si riempiono da soli.
 */

type Cliente = {
  id: string; first_name: string; last_name: string
  company_name: string | null; phone: string; email: string
}

const nomeDi = (c: Cliente) =>
  c.company_name || [c.first_name, c.last_name].filter(Boolean).join(' ')

export function NuovaScheda({ difetti, modelli }: { difetti: string[]; modelli: string[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  const [nome, setNome] = useState('')
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [proposte, setProposte] = useState<Cliente[]>([])
  const [storico, setStorico] = useState<{ totale: number } | null>(null)
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')

  const [modello, setModello] = useState('')
  const [seriale, setSeriale] = useState('')
  const [daSeriale, setDaSeriale] = useState<string | null>(null)
  const [codice, setCodice] = useState('')
  const [difetto, setDifetto] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const campoNome = useRef<HTMLInputElement>(null)

  useEffect(() => { campoNome.current?.focus() }, [])

  // il cliente si cerca mentre si scrive: nome o numero, indifferente
  useEffect(() => {
    if (clienteId || nome.trim().length < 2) { setProposte([]); return }
    const t = setTimeout(() => {
      start(async () => {
        const r = await cercaClienteAction(nome)
        setProposte((r.clienti ?? []) as Cliente[])
      })
    }, 200)
    return () => clearTimeout(t)
  }, [nome, clienteId])

  // dalle ultime 4 cifre del seriale si riconosce il modello
  useEffect(() => {
    const s = seriale.trim()
    if (s.length < 11) { setDaSeriale(null); return }
    const t = setTimeout(() => {
      start(async () => {
        const r = await modelloDaSerialeAction(s)
        const m = r.modello as { model: string; seen: number } | null
        setDaSeriale(m?.model ?? null)
        if (m?.model && !modello.trim()) setModello(m.model)
      })
    }, 300)
    return () => clearTimeout(t)
  }, [seriale])

  const scegli = (c: Cliente) => {
    setClienteId(c.id); setNome(nomeDi(c))
    setTelefono(c.phone === '—' ? '' : c.phone); setEmail(c.email || '')
    setProposte([])
    start(async () => {
      const r = await storicoClienteAction(c.id)
      setStorico({ totale: r.totale ?? 0 })
    })
  }
  const nuovoCliente = () => { setClienteId(null); setStorico(null); setTelefono(''); setEmail('') }

  const crea = () =>
    start(async () => {
      setErrore(null)
      const r = await creaSchedaAction({
        clienteId, nome, telefono, email, modello, seriale, difetto, codiceSblocco: codice,
      })
      if (r?.error) setErrore(r.error)
      else if (r?.id) router.push(`/dashboard/tickets/${r.id}`)
    })

  const Sezione = ({ titolo, children }: { titolo: string; children: React.ReactNode }) => (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{titolo}</h2>
      <div className="grid gap-3">{children}</div>
    </section>
  )
  const Campo = ({ e, children }: { e: string; children: React.ReactNode }) => (
    <label className="block text-xs">
      <span className="mb-1 block font-semibold uppercase tracking-wider text-muted-foreground">{e}</span>
      {children}
    </label>
  )

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Sezione titolo="Cliente">
        <div className="relative">
          <Campo e="Nome, ragione sociale o telefono">
            <Input
              ref={campoNome}
              value={nome}
              onChange={(e) => { setNome(e.target.value); if (clienteId) nuovoCliente() }}
              placeholder="scrivi e cerca — se non c'è lo creo"
              autoComplete="off"
            />
          </Campo>

          {proposte.length > 0 && (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-background shadow-lg">
              {proposte.map((c) => (
                <button key={c.id} type="button" onClick={() => scegli(c)}
                  className="block w-full border-b px-3 py-2 text-left last:border-0 hover:bg-orange-50">
                  <span className="block text-sm font-medium">{nomeDi(c)}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {[c.phone !== '—' && c.phone, c.email].filter(Boolean).join(' · ') || 'nessun contatto'}
                  </span>
                </button>
              ))}
              <p className="bg-muted/50 px-3 py-1.5 text-[11px] text-muted-foreground">
                Nessuno di questi? Continua a scrivere: alla creazione lo aggiungo.
              </p>
            </div>
          )}
        </div>

        {clienteId && (
          <p className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700">cliente già in archivio</span>
            {storico && <span className="text-muted-foreground">{storico.totale} schede precedenti</span>}
            <button type="button" onClick={nuovoCliente} className="text-muted-foreground underline">
              non è lui
            </button>
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo e="Telefono">
            <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} inputMode="tel" className="font-mono" />
          </Campo>
          <Campo e="Email">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" />
          </Campo>
        </div>
      </Sezione>

      <Sezione titolo="Dispositivo">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo e="Numero di serie">
            <Input value={seriale} onChange={(e) => setSeriale(e.target.value.toUpperCase())}
              placeholder="lo leggo e riconosco il modello" className="font-mono" autoComplete="off" />
          </Campo>
          <Campo e="Modello">
            <Input list="modelli-apple" value={modello} onChange={(e) => setModello(e.target.value)}
              placeholder="scrivi o scegli" autoComplete="off" />
            <datalist id="modelli-apple">{modelli.map((m) => <option key={m} value={m} />)}</datalist>
          </Campo>
        </div>
        {daSeriale && (
          <p className="text-xs text-emerald-700">Dal numero di serie risulta: <b>{daSeriale}</b></p>
        )}
        <Campo e="Codice di sblocco">
          <Input value={codice} onChange={(e) => setCodice(e.target.value)}
            placeholder="se il cliente lo lascia" className="font-mono" autoComplete="off" />
        </Campo>
      </Sezione>

      <Sezione titolo="Difetto indicato dal cliente">
        <select
          onChange={(e) => {
            if (!e.target.value) return
            setDifetto((d) => (d.trim() ? d.trim() + '\n' + e.target.value : e.target.value))
            e.target.value = ''
          }}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          aria-label="Difetti ricorrenti"
        >
          <option value="">Scegli dal listino difetti…</option>
          {difetti.map((d) => <option key={d}>{d}</option>)}
        </select>
        <Textarea rows={3} value={difetto} onChange={(e) => setDifetto(e.target.value)}
          placeholder="…oppure scrivilo come te l'ha detto il cliente" />
      </Sezione>

      {errore && <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{errore}</p>}

      <div className="flex items-center gap-3">
        <Button type="button" size="lg" onClick={crea} disabled={pending || !nome.trim() || !modello.trim()}>
          {pending ? 'Apro la scheda…' : 'Apri la scheda'}
        </Button>
        <span className="text-xs text-muted-foreground">
          Il numero viene da sé e prosegue da FileMaker. Il resto si compila sulla scheda.
        </span>
      </div>
    </div>
  )
}
