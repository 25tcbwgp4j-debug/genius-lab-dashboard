import { EmailLayout } from '../layout'

type Props = {
  customerName: string
  ticketNumber: string
  courierName: string
  trackingCode: string
  trackingLink: string
}

export function ShippedEmail({
  customerName,
  ticketNumber,
  courierName,
  trackingCode,
  trackingLink,
}: Props) {
  return (
    <EmailLayout title={`Dispositivo spedito – ${ticketNumber}`}>
      <p>Gentile {customerName},</p>
      <p>Il suo dispositivo (riparazione <strong>{ticketNumber}</strong>) è stato spedito.</p>
      <p>
        <strong>Corriere:</strong> {courierName || '—'}<br />
        <strong>Codice tracciamento:</strong> {trackingCode || '—'}
      </p>
      <p>Può seguire la spedizione qui: <a href={trackingLink}>{trackingLink}</a></p>
    </EmailLayout>
  )
}
