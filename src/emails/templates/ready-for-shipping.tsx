import { EmailLayout } from '../layout'

type Props = {
  customerName: string
  ticketNumber: string
  amountDue: string
  paymentInstructions: string
  shopPhone: string
}

export function ReadyForShippingEmail({
  customerName,
  ticketNumber,
  amountDue,
  paymentInstructions,
  shopPhone,
}: Props) {
  return (
    <EmailLayout title={`Pronto per spedizione – ${ticketNumber}`}>
      <p>Gentile {customerName},</p>
      <p>La riparazione del suo dispositivo (numero <strong>{ticketNumber}</strong>) è stata completata.</p>
      <p>Importo da saldare prima della spedizione: <strong>{amountDue} €</strong>.</p>
      {paymentInstructions ? (
        <p>Istruzioni per il pagamento: {paymentInstructions}</p>
      ) : (
        <p>Le invieremo a breve le coordinate per il bonifico. Per informazioni: {shopPhone}</p>
      )}
      <p>Dopo l&apos;accredito del pagamento provvederemo all&apos;invio del dispositivo.</p>
    </EmailLayout>
  )
}
