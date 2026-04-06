/**
 * Base layout for Italian transactional emails (React Email).
 * Rendered to HTML/text via @react-email/render for Resend.
 */
export function EmailLayout({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <html lang="it">
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
      </head>
      <body style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", margin: 0, padding: 0, backgroundColor: '#f5f5f5' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ borderBottom: '2px solid #1a1a1a', paddingBottom: '12px', marginBottom: '20px' }}>
              <strong style={{ fontSize: '18px' }}>Genius Lab</strong>
              <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>Assistenza Apple</span>
            </div>
            {children}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #eee', fontSize: '12px', color: '#666' }}>
              Questo messaggio è stato inviato da Genius Lab. Per assistenza contattare i recapiti indicati in questa email.
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
