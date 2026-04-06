import { EmailLayout } from '../layout'

type Props = {
  customerName: string
  ticketNumber: string
  amountDue: string
  workingHours: string
  shopPhone: string
}

export function ReadyForPickupEmail({ customerName, ticketNumber, amountDue, workingHours, shopPhone }: Props) {
  return (
    <EmailLayout title={`Dispositivo pronto per il ritiro – ${ticketNumber}`}>
      <p>Gentile {customerName},</p>
      <p>La informiamo che il suo dispositivo è pronto per il ritiro. Riparazione numero <strong>{ticketNumber}</strong>.</p>
      <p>Importo da saldare al ritiro: <strong>{amountDue} €</strong>.</p>
      <p>Orari di ritiro: {workingHours || 'Contattare il punto vendita'}.</p>
      <p>Per confermare il ritiro o per informazioni: {shopPhone}</p>
    </EmailLayout>
  )
}
