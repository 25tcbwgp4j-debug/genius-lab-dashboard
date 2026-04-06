import { EmailLayout } from '../layout'

type Props = {
  customerName: string
  ticketNumber: string
  trackingLink: string
  shopPhone: string
}

export function IntakeCreatedEmail({ customerName, ticketNumber, trackingLink, shopPhone }: Props) {
  return (
    <EmailLayout title={`Scheda assistenza ${ticketNumber}`}>
      <p>Gentile {customerName},</p>
      <p>Le confermiamo l&apos;avvenuta registrazione del suo dispositivo. La scheda di assistenza è stata aperta con numero <strong>{ticketNumber}</strong>.</p>
      <p>Può seguire in tempo reale lo stato della riparazione dal seguente link: <a href={trackingLink}>Visualizza stato riparazione</a></p>
      <p>Per qualsiasi informazione siamo a disposizione al numero {shopPhone}.</p>
    </EmailLayout>
  )
}
