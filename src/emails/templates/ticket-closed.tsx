import { EmailLayout } from '../layout'

type Props = {
  customerName: string
  ticketNumber: string
}

export function TicketClosedEmail({ customerName, ticketNumber }: Props) {
  return (
    <EmailLayout title={`Riparazione conclusa – ${ticketNumber}`}>
      <p>Gentile {customerName},</p>
      <p>La riparazione con numero <strong>{ticketNumber}</strong> risulta conclusa. Grazie per aver scelto Genius Lab.</p>
      <p>Restiamo a disposizione per qualsiasi necessità futura.</p>
    </EmailLayout>
  )
}
