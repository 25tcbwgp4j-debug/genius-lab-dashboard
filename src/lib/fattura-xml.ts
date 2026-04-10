/**
 * Generazione XML FatturaPA (formato SDI v1.2.2) per integrazione con
 * SimplyFatt Network o qualsiasi altro software di fatturazione italiano.
 *
 * Il file generato e' una fattura B2B (FPR12) pre-compilata con:
 *  - Dati cedente (Genius Lab SRLS) da costanti
 *  - Dati cessionario dal DB customers
 *  - Righe dettaglio = servizi/parti del ticket (manodopera + parti)
 *  - Numero fattura placeholder (l'utente lo cambia in SimplyFatt all'import)
 *  - Metodo pagamento bonifico (IBAN SumUp Genius Lab)
 *
 * Adattato dal modulo Python fattura_xml.py del backend tarature.
 *
 * Schema ufficiale FatturaPA:
 * https://www.fatturapa.gov.it/it/norme-e-regole/DocumentazioneFE/
 */

// === Dati cedente Genius Lab SRLS (fissi) ===
const CEDENTE = {
  denominazione: 'GENIUS LAB S.R.L.S.',
  piva: '18295761003',
  codiceFiscale: '18295761003',
  indirizzo: 'Viale Somalia, 246',
  cap: '00199',
  comune: 'Roma',
  provincia: 'RM',
  nazione: 'IT',
  regimeFiscale: 'RF01', // Regime ordinario
}

// === Dati pagamento default ===
const PAGAMENTO = {
  condizioni: 'TP02', // completo
  modalita: 'MP05', // bonifico bancario
  iban: 'IE93SUMU99036512566078',
  bic: 'SUMUIE22XXX',
  istituto: 'SumUp Limited',
}

// Aliquota IVA standard italiana
const IVA_ALIQUOTA = 22.0

/** Escape XML per contenuto testuale */
function xmlEscape(s: unknown): string {
  if (s === null || s === undefined) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Arrotonda a N decimali (default 2) con half-up */
function round(value: number, decimals = 2): number {
  const f = Math.pow(10, decimals)
  return Math.round((value + Number.EPSILON) * f) / f
}

function fmt2(v: number): string {
  return round(v, 2).toFixed(2)
}

function fmt5(v: number): string {
  return round(v, 5).toFixed(5)
}

function truncate(s: string, maxLen: number): string {
  if (!s) return ''
  return s.length > maxLen ? s.slice(0, maxLen) : s
}

/** Rimuove suffissi P.IVA dal nome cliente */
function cleanName(name: string): string {
  if (!name) return ''
  return name
    .replace(/\s+P\.?\s*IVA\s*\.?\s*\d+.*$/gi, '')
    .replace(/\s+-\s*P\.?\s*IVA.*$/gi, '')
    .trim()
    .replace(/[ -]+$/, '')
    .trim()
}

/** Parser indirizzo free-text → { via, cap, comune, provincia } */
function splitCapComune(indirizzoCompleto: string): {
  via: string
  cap: string
  comune: string
  provincia: string
} {
  if (!indirizzoCompleto) return { via: '', cap: '00000', comune: '', provincia: 'EE' }
  const s = indirizzoCompleto.trim()
  const m = s.match(/^(.*?)[\s,\-]+(\d{5})\s*(.+?)(?:\s*\(?\s*([A-Za-z]{2})\s*\)?)?$/)
  if (m) {
    return {
      via: m[1].trim().replace(/,$/, '').trim(),
      cap: m[2],
      comune: m[3].trim().replace(/,$/, '').trim(),
      provincia: (m[4] || '').toUpperCase().slice(0, 2) || 'EE',
    }
  }
  return { via: s, cap: '00000', comune: '', provincia: 'EE' }
}

/** Scorpora IVA da un prezzo IVA-inclusa. Formula: imponibile = totale / (1 + aliquota/100) */
function computeImponibile(prezzoIvaInclusa: number, aliquota = IVA_ALIQUOTA): number {
  if (!prezzoIvaInclusa) return 0
  return prezzoIvaInclusa / (1 + aliquota / 100)
}

// === Tipi input ===

export interface FatturaLinea {
  /** Descrizione del servizio/parte (es. "Riparazione display MacBook Pro 13", "Batteria iPhone 13") */
  descrizione: string
  /** Prezzo IVA-inclusa (come arriva dal DB preventivo) */
  prezzoIvaInclusa: number
  /** Quantita (default 1) */
  quantita?: number
}

export interface FatturaCliente {
  /** Ragione sociale o nome+cognome */
  denominazione: string
  /** P.IVA (opzionale) */
  partitaIva?: string | null
  /** Codice Fiscale (opzionale) */
  codiceFiscale?: string | null
  /** Codice destinatario SDI (7 caratteri) */
  codiceSdi?: string | null
  /** PEC (usato come fallback se sdi mancante) */
  pec?: string | null
  /** Indirizzo via + civico (puo' essere free-text completo, viene parsato) */
  indirizzo?: string | null
  cap?: string | null
  comune?: string | null
  provincia?: string | null
}

export interface FatturaInput {
  numeroFattura?: string // default: DA-ASSEGNARE
  dataFattura?: Date // default: oggi
  progressivoInvio?: string // default: 00001
  cliente: FatturaCliente
  righe: FatturaLinea[]
}

// === Main ===

export function buildFatturaXml(input: FatturaInput): string {
  const numeroFattura = input.numeroFattura || 'DA-ASSEGNARE'
  const dataFattura = input.dataFattura || new Date()
  const progressivoInvio = input.progressivoInvio || '00001'

  const cust = input.cliente
  const custName = cleanName(cust.denominazione || '') || 'CLIENTE'
  const custPiva = (cust.partitaIva || '').trim()
  const custCf = (cust.codiceFiscale || '').trim()
  const custSdi = (cust.codiceSdi || '').trim().toUpperCase()
  const custPec = (cust.pec || '').trim()

  // Indirizzo: prova i campi strutturati, fallback al parser free-text
  let via = truncate((cust.indirizzo || '').trim(), 60)
  let cap = truncate((cust.cap || '').trim(), 5) || '00000'
  let comune = truncate((cust.comune || '').trim(), 60)
  let provincia = truncate((cust.provincia || '').trim().toUpperCase(), 2)

  if (via && (!cap || cap === '00000') && !comune) {
    const parsed = splitCapComune(via)
    via = parsed.via
    cap = parsed.cap
    comune = parsed.comune
    if (!provincia) provincia = parsed.provincia
  }

  if (!provincia) provincia = comune.toLowerCase().includes('roma') ? 'RM' : 'EE'
  if (!cap || cap.length !== 5) cap = '00000'

  // === Dettaglio righe + totali ===
  const righeXml: string[] = []
  let totaleImponibile = 0
  let totaleDocumento = 0

  input.righe.forEach((linea, idx) => {
    const descrizione = truncate(linea.descrizione || 'Servizio', 200)
    const quantita = linea.quantita || 1
    const prezzoIvato = linea.prezzoIvaInclusa || 0
    const imponibileUnit = computeImponibile(prezzoIvato, IVA_ALIQUOTA)
    const imponibileRiga = imponibileUnit * quantita

    totaleImponibile += imponibileRiga
    totaleDocumento += prezzoIvato * quantita

    righeXml.push(`      <DettaglioLinee>
        <NumeroLinea>${idx + 1}</NumeroLinea>
        <Descrizione>${xmlEscape(descrizione)}</Descrizione>
        <Quantita>${quantita.toFixed(2)}</Quantita>
        <PrezzoUnitario>${fmt5(imponibileUnit)}</PrezzoUnitario>
        <PrezzoTotale>${fmt5(imponibileRiga)}</PrezzoTotale>
        <AliquotaIVA>${IVA_ALIQUOTA.toFixed(2)}</AliquotaIVA>
      </DettaglioLinee>`)
  })

  const totaleImponibile2 = round(totaleImponibile, 2)
  const totaleDocumento2 = round(totaleDocumento, 2)
  const imposta2 = round(totaleDocumento2 - totaleImponibile2, 2)

  // Codice destinatario SDI
  let codiceDestinatario = '0000000'
  if (custSdi && custSdi.length === 7) {
    codiceDestinatario = custSdi
  }
  const pecDestinatarioXml =
    codiceDestinatario === '0000000' && custPec
      ? `\n      <PECDestinatario>${xmlEscape(custPec)}</PECDestinatario>`
      : ''

  // Cessionario: IdFiscaleIVA se P.IVA, CodiceFiscale se CF
  let cessionarioDati = ''
  if (custPiva && custPiva.length >= 11) {
    cessionarioDati += `      <IdFiscaleIVA>
        <IdPaese>IT</IdPaese>
        <IdCodice>${xmlEscape(custPiva)}</IdCodice>
      </IdFiscaleIVA>`
  }
  if (custCf) {
    cessionarioDati += (cessionarioDati ? '\n' : '') + `      <CodiceFiscale>${xmlEscape(custCf)}</CodiceFiscale>`
  } else if (custPiva && custPiva.length === 11) {
    cessionarioDati += (cessionarioDati ? '\n' : '') + `      <CodiceFiscale>${xmlEscape(custPiva)}</CodiceFiscale>`
  }

  const dataIso = dataFattura.toISOString().slice(0, 10)

  return `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>${CEDENTE.piva}</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>${xmlEscape(progressivoInvio)}</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>${codiceDestinatario}</CodiceDestinatario>${pecDestinatarioXml}
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>${CEDENTE.piva}</IdCodice>
        </IdFiscaleIVA>
        <CodiceFiscale>${CEDENTE.codiceFiscale}</CodiceFiscale>
        <Anagrafica>
          <Denominazione>${xmlEscape(CEDENTE.denominazione)}</Denominazione>
        </Anagrafica>
        <RegimeFiscale>${CEDENTE.regimeFiscale}</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${xmlEscape(CEDENTE.indirizzo)}</Indirizzo>
        <CAP>${CEDENTE.cap}</CAP>
        <Comune>${xmlEscape(CEDENTE.comune)}</Comune>
        <Provincia>${CEDENTE.provincia}</Provincia>
        <Nazione>${CEDENTE.nazione}</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
${cessionarioDati}
        <Anagrafica>
          <Denominazione>${xmlEscape(truncate(custName, 80))}</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${xmlEscape(via || 'Indirizzo non specificato')}</Indirizzo>
        <CAP>${cap}</CAP>
        <Comune>${xmlEscape(comune || 'Roma')}</Comune>
        <Provincia>${provincia}</Provincia>
        <Nazione>IT</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>${dataIso}</Data>
        <Numero>${xmlEscape(numeroFattura)}</Numero>
        <ImportoTotaleDocumento>${fmt2(totaleDocumento2)}</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
${righeXml.join('\n')}
      <DatiRiepilogo>
        <AliquotaIVA>${IVA_ALIQUOTA.toFixed(2)}</AliquotaIVA>
        <ImponibileImporto>${fmt2(totaleImponibile2)}</ImponibileImporto>
        <Imposta>${fmt2(imposta2)}</Imposta>
        <EsigibilitaIVA>I</EsigibilitaIVA>
      </DatiRiepilogo>
    </DatiBeniServizi>
    <DatiPagamento>
      <CondizioniPagamento>${PAGAMENTO.condizioni}</CondizioniPagamento>
      <DettaglioPagamento>
        <ModalitaPagamento>${PAGAMENTO.modalita}</ModalitaPagamento>
        <ImportoPagamento>${fmt2(totaleDocumento2)}</ImportoPagamento>
        <IstitutoFinanziario>${xmlEscape(PAGAMENTO.istituto)}</IstitutoFinanziario>
        <IBAN>${PAGAMENTO.iban}</IBAN>
        <BIC>${PAGAMENTO.bic}</BIC>
      </DettaglioPagamento>
    </DatiPagamento>
  </FatturaElettronicaBody>
</p:FatturaElettronica>
`
}

export function makeFatturaFilename(numeroFattura: string, cliente: string): string {
  const safeCliente = cliente.slice(0, 30).replace(/[^A-Za-z0-9_-]/g, '_')
  const safeNum = String(numeroFattura).slice(0, 20).replace(/[^A-Za-z0-9_-]/g, '_')
  return `Fattura_${safeNum}_${safeCliente}.xml`
}
