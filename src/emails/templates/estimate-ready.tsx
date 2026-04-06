import { EmailLayout } from '../layout'

type Props = {
  customerName: string
  ticketNumber: string
  amountDue: string
  estimateLink: string
  shopPhone: string
}

export function EstimateReadyEmail({ customerName, ticketNumber, amountDue, estimateLink, shopPhone }: Props) {
  return (
    <EmailLayout title={`Preventivo ${ticketNumber}`}>
      <p>Gentile {customerName},</p>
      <p>Il preventivo per la riparazione con numero <strong>{ticketNumber}</strong> è pronto. L&apos;importo totale è di <strong>{amountDue} €</strong>.</p>
      <p>Può approvare o rifiutare il preventivo dalla pagina dedicata: <a href={estimateLink}>Apri preventivo e rispondi</a></p>
      <p>Per chiarimenti siamo a disposizione al numero {shopPhone}.</p>
    </EmailLayout>
  )
}
