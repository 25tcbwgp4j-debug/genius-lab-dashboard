import { EmailLayout } from '../layout'

type Props = {
  customerName: string
  ticketNumber: string
  amountDue: string
  iban: string
  beneficiary: string
  paymentReference: string
  proofOfPaymentInstructions?: string
}

export function PaymentInstructionsEmail({
  customerName,
  ticketNumber,
  amountDue,
  iban,
  beneficiary,
  paymentReference,
  proofOfPaymentInstructions,
}: Props) {
  return (
    <EmailLayout title={`Istruzioni di pagamento – ${ticketNumber}`}>
      <p>Gentile {customerName},</p>
      <p>Di seguito le coordinate per saldare l&apos;importo della riparazione <strong>{ticketNumber}</strong>: <strong>{amountDue} €</strong>.</p>
      <p><strong>IBAN:</strong> {iban}</p>
      <p><strong>Intestatario:</strong> {beneficiary}</p>
      <p><strong>Riferimento di pagamento (causale obbligatoria):</strong> {paymentReference}</p>
      <p>Indicare sempre la causale sopra indicata per una corretta attribuzione del pagamento.</p>
      {proofOfPaymentInstructions && (
        <p><strong>Dopo il pagamento:</strong> {proofOfPaymentInstructions}</p>
      )}
    </EmailLayout>
  )
}
