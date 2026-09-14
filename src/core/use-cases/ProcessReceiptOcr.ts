import type { ReceiptOcrResult, DetectedBank } from '../domain/types.ts';

export class ProcessReceiptOcrUseCase {
  /**
   * Parses raw extracted text from a Colombian banking receipt image
   * and extracts Bank, Amount ($ COP), Reference Number, Date, and Parties.
   */
  execute(text: string): ReceiptOcrResult {
    if (!text || !text.trim()) {
      return {
        detectedBank: 'OTHER',
        confidence: 0,
        rawText: '',
      };
    }

    const cleanText = text.replace(/\r\n/g, '\n');
    const lower = cleanText.toLowerCase();

    // 1. Detect Bank
    let detectedBank: DetectedBank = 'OTHER';
    let bankConfidence = 0.3;

    if (
      lower.includes('nequi') ||
      lower.includes('¡envío exitoso!') ||
      lower.includes('envio exitoso') ||
      lower.includes('nequi panamá') ||
      lower.includes('movimiento exitoso') ||
      /m\d{7,9}/i.test(cleanText)
    ) {
      detectedBank = 'NEQUI';
      bankConfidence = 0.95;
    } else if (
      lower.includes('bancolombia') ||
      lower.includes('transferencia exitosa') ||
      lower.includes('comprobante no.') ||
      lower.includes('bancolombia a la mano')
    ) {
      detectedBank = 'BANCOLOMBIA';
      bankConfidence = 0.95;
    } else if (
      lower.includes('daviplata') ||
      lower.includes('davivienda') ||
      lower.includes('número de autorización') ||
      lower.includes('sacar plata')
    ) {
      detectedBank = 'DAVIPLATA';
      bankConfidence = 0.9;
    } else if (
      lower.includes('transfiya') ||
      lower.includes('transfi ya')
    ) {
      detectedBank = 'TRANSFIYA';
      bankConfidence = 0.9;
    } else if (
      lower.includes('dale!') ||
      lower.includes('dale')
    ) {
      detectedBank = 'DALE';
      bankConfidence = 0.85;
    } else if (
      lower.includes('bbva') ||
      lower.includes('bbva móvil')
    ) {
      detectedBank = 'BBVA';
      bankConfidence = 0.85;
    }

    // 2. Extract Amount ($ COP)
    let amount: number | undefined = undefined;
    let amountConfidence = 0;

    // Matches: $ 50.000,00 | $50.000 | 50.000 COP | $ 120,000 | $ 25 000
    const amountRegexes = [
      /\$\s*([0-9]{1,3}(?:\.[0-9]{3})+(?:,[0-9]{2})?)/i,
      /\$\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{2})?)/i,
      /(?:valor|monto|total|cuánto|cuanto|enviaste|enviado)[\s:]+\$?\s*([0-9]{1,3}(?:\.[0-9]{3})+)/i,
      /\$\s*([0-9]{4,7})/i,
      /(?:^|\s)([1-9][0-9]{0,2}(?:\.[0-9]{3})+)\s*(?:cop|pesos)?/i,
    ];

    for (const regex of amountRegexes) {
      const match = cleanText.match(regex);
      if (match && match[1]) {
        // Clean formatting: remove periods and commas for decimals
        let numStr = match[1].replace(/\./g, '').replace(/,/g, '');
        // If it ended with 00 cents, remove if > 100k
        const parsed = parseInt(numStr, 10);
        if (!isNaN(parsed) && parsed >= 1000 && parsed <= 50000000) {
          amount = parsed;
          amountConfidence = 0.9;
          break;
        }
      }
    }

    // 3. Extract Reference / Authorization Number
    let referenceNumber: string | undefined = undefined;

    // Nequi reference pattern: M12345678 or M followed by 6-9 digits
    const nequiRefMatch = cleanText.match(/\b([M|C][0-9]{6,10})\b/i);
    if (nequiRefMatch) {
      referenceNumber = nequiRefMatch[1].toUpperCase();
    } else {
      const genericRefMatches = [
        /(?:referencia|comprobante|autorización|autorizacion|código|codigo|transacción|transaccion|no\.)[\s:#.-]+([A-Z0-9]{5,15})/i,
        /n(?:ú|u)mero\s+de\s+(?:aprobaci(?:ó|o)n|autorizaci(?:ó|o)n|comprobante)[\s:]+([0-9]{4,12})/i,
      ];
      for (const rx of genericRefMatches) {
        const m = cleanText.match(rx);
        if (m && m[1]) {
          referenceNumber = m[1].trim();
          break;
        }
      }
    }

    // 4. Extract Date / Time
    let transactionDate: string | undefined = undefined;
    const dateMatches = [
      // 14 de septiembre de 2026 - 08:30 a. m.
      /([0-9]{1,2}\s+de\s+[a-zA-ZáéíóúÁÉÍÓÚ]+\s+(?:de\s+)?[0-9]{4}(?:[\s,-]+[0-9]{1,2}:[0-9]{2}(?:\s*[aApP]\.?\s*[mM]\.?)?)?)/i,
      // 14/09/2026 20:30
      /([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4}(?:\s+[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?)?)/,
      // 14 sep 2026
      /([0-9]{1,2}\s+(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*\s+[0-9]{4})/i,
    ];

    for (const drx of dateMatches) {
      const dm = cleanText.match(drx);
      if (dm && dm[1]) {
        transactionDate = dm[1].trim();
        break;
      }
    }

    // 5. Extract Recipient / Sender Name if present
    let recipientName: string | undefined = undefined;
    const recipientMatch = cleanText.match(/(?:para|destinatario|a|hacia)[\s:]+([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{3,30})/i);
    if (recipientMatch && recipientMatch[1]) {
      const candidate = recipientMatch[1].split('\n')[0].trim();
      if (candidate.length > 2 && !candidate.toLowerCase().includes('nequi')) {
        recipientName = candidate;
      }
    }

    // Calculate total confidence
    let score = bankConfidence;
    if (amount) score += 0.4;
    if (referenceNumber) score += 0.3;
    if (transactionDate) score += 0.2;
    const confidence = Math.min(1.0, Math.max(0.1, Number((score / 1.8).toFixed(2))));

    return {
      detectedBank,
      amount,
      referenceNumber,
      transactionDate,
      recipientName,
      confidence,
      rawText: cleanText,
    };
  }
}
