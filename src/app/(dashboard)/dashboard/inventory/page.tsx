import { getPartsList, getLowStockParts } from '@/services/inventory/parts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireRole } from '@/lib/auth/require-role'
import { canManageInventory } from '@/lib/auth/rbac'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default async function InventoryPage() {
  await requireRole(canManageInventory)
  const [parts, lowStockParts] = await Promise.all([getPartsList(), getLowStockParts()])
  const lowStock = lowStockParts

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ricambi</h1>
        <p className="text-muted-foreground">Scorte e disponibilità</p>
      </div>

      {/* Questi 153 articoli sono stati caricati in due giorni a marzo 2026 e non
          sono mai stati usati: zero movimenti, zero ricambi impegnati su una
          riparazione. I prezzi non vengono da nessun preventivo reale. */}
      <div className="rounded-md border border-l-[3px] border-l-amber-500 bg-amber-50/60 px-4 py-3 text-sm">
        <p className="font-medium text-amber-900">Questi prezzi non sono verificati</p>
        <p className="mt-1 leading-relaxed text-amber-800">
          I 153 articoli sono stati caricati in prova a marzo 2026 e da allora non è mai
          stato registrato un movimento né impegnato un ricambio su una riparazione.
          Gli importi non corrispondono a nessun preventivo realmente fatto.
          <br />
          <b>I preventivi non li usano:</b> i prezzi delle lavorazioni vengono dal listino
          e dall’archivio dei 6.688 preventivi accettati, non da qui.
        </p>
      </div>
      {lowStock.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-sm">Scorte basse ({lowStock.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm">
              {lowStock.map((p) => (
                <li key={p.id}>{p.name}: {p.quantity} / {p.minimum_stock}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Elenco parti</CardTitle>
          <CardDescription>SKU, quantità, prezzi</CardDescription>
        </CardHeader>
        <CardContent>
          {!parts?.length ? (
            <p className="py-8 text-center text-muted-foreground">Nessun articolo in magazzino.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Quantità</TableHead>
                  <TableHead>Soglia</TableHead>
                  <TableHead>Prezzo vendita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.sku ?? '—'}</TableCell>
                    <TableCell>
                      {p.minimum_stock > 0 && p.quantity <= p.minimum_stock ? (
                        <Badge variant="destructive">{p.quantity}</Badge>
                      ) : (
                        p.quantity
                      )}
                    </TableCell>
                    <TableCell>{p.minimum_stock}</TableCell>
                    <TableCell>€ {Number(p.sell_price).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
