'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addOperatorAction, removeOperatorAction, toggleOperatorAction } from '@/app/actions/operators'
import { Plus, Trash2 } from 'lucide-react'

type Operator = { id: string; name: string; active: boolean }

export function OperatorsManager({ operators }: { operators: Operator[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleAdd() {
    if (!newName.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await addOperatorAction(newName)
      if (result?.error) setError(result.error)
      else { setNewName(''); router.refresh() }
    })
  }

  function handleRemove(id: string, name: string) {
    if (!confirm(`Eliminare l'operatore ${name}?`)) return
    startTransition(async () => {
      await removeOperatorAction(id)
      router.refresh()
    })
  }

  function handleToggle(id: string, active: boolean) {
    startTransition(async () => {
      await toggleOperatorAction(id, !active)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {operators.map(op => (
          <li key={op.id} className="flex items-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => handleToggle(op.id, op.active)}
              disabled={isPending}
              className="flex items-center gap-2 hover:opacity-80"
            >
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded border text-xs ${op.active ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground'}`}>
                {op.active ? '✓' : ''}
              </span>
            </button>
            <span className={op.active ? 'font-medium' : 'text-muted-foreground line-through'}>{op.name}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemove(op.id, op.name)} disabled={isPending}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input
          placeholder="Nuovo operatore"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="max-w-[200px]"
        />
        <Button size="sm" onClick={handleAdd} disabled={isPending || !newName.trim()}>
          <Plus className="mr-2 h-4 w-4" /> Aggiungi
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
