import { EmailLayout } from '../layout'

type Props = {
  customerName: string
  ticketNumber: string
  status: string
  trackingLink: string
}

const STATUS_LABELS: Record<string, string> = {
  in_diagnosis: 'in diagnosi',
  ai_diagnosis_generated: 'diagnosi completata',
  estimate_ready: 'preventivo pronto',
  waiting_parts: 'in attesa ricambi',
  in_repair: 'in riparazione',
  testing: 'in collaudo',
}

function formatStatus(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, ' ')
}

export function RepairUpdateEmail({ customerName, ticketNumber, status, trackingLink }: Props) {
  const statusLabel = formatStatus(status)
  return (
    <EmailLayout title={`Aggiornamento riparazione ${ticketNumber}`}>
      <p>Gentile {customerName},</p>
      <p>La informiamo che la riparazione con numero <strong>{ticketNumber}</strong> è in fase di aggiornamento.</p>
      <p><strong>Stato attuale:</strong> {statusLabel}.</p>
      <p>Può seguire l&apos;evoluzione in tempo reale dalla pagina di tracciamento: <a href={trackingLink}>Visualizza stato</a></p>
    </EmailLayout>
  )
}
