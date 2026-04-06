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
        <h1 className="text-2xl font-bold tracking-tight">Magazzino</h1>
        <p className="text-muted-foreground">Ricambi e parti</p>
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
