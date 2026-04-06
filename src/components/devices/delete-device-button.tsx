'use client'

import { useTransition, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { deleteDeviceAction } from '@/app/actions/devices'

export function DeleteDeviceButton({ deviceId }: { deviceId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete() {
    if (!confirm('Sei sicuro di voler eliminare questo dispositivo?')) return
    setError(null)
    startTransition(async () => {
      const result = await deleteDeviceAction(deviceId)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={isPending}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {isPending ? 'Eliminazione...' : 'Elimina dispositivo'}
      </Button>
      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
