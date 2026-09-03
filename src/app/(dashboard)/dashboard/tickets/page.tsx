import { TrovaSchede } from '@/components/tickets/trova-schede'

/**
 * «Trova» — l'elenco di tutte le schede, non solo le ultime cento.
 * Una casella sola cerca su numero, cliente, telefono, modello e seriale,
 * come il Trova di FileMaker.
 */
export default async function ElencoSchede({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Schede</h1>
        <p className="text-sm text-muted-foreground">
          Scrivi e cerca: numero di scheda, cognome, telefono, modello o numero di serie.
        </p>
      </div>
      <TrovaSchede statoIniziale={status ?? 'tutte'} />
    </div>
  )
}
