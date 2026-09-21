import { NextRequest, NextResponse } from 'next/server';
import { container } from '../../../infrastructure/container.ts';
import type { ReceiptOcrResult, DetectedBank } from '../../../core/domain/types.ts';

const PROMPT_OCR_INSTRUCTIONS = `You are an expert OCR parser specialized in Colombian banking receipts (Nequi, Bancolombia, Daviplata, Transfiya, Dale, BBVA, Bre-B).
Analyze this receipt image and extract the following fields in strict JSON format:
{
  "detectedBank": "NEQUI" | "BANCOLOMBIA" | "DAVIPLATA" | "TRANSFIYA" | "DALE" | "BBVA" | "OTHER",
  "amount": number (integer in Colombian Pesos COP, without decimals or cents, e.g. 8500),
  "referenceNumber": string (e.g. "M12345678" for Nequi, approval code or receipt number),
  "transactionDate": string (e.g. "16 de septiembre de 2026"),
  "recipientName": string | null
}
Return ONLY the raw JSON object without markdown formatting, code fences or additional commentary.`;

async function tryGeminiVision(base64Data: string, apiKey: string): Promise<ReceiptOcrResult | null> {
  try {
    const cleanBase64 = base64Data.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
    const mimeMatch = base64Data.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT_OCR_INSTRUCTIONS },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          response_mime_type: 'application/json',
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const json = await res.json();
    const textOut = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOut) return null;

    const parsed = JSON.parse(textOut.replace(/```json/g, '').replace(/```/g, '').trim());
    if (parsed && typeof parsed.amount === 'number') {
      return {
        detectedBank: (parsed.detectedBank as DetectedBank) || 'OTHER',
        amount: parsed.amount,
        referenceNumber: parsed.referenceNumber || undefined,
        transactionDate: parsed.transactionDate || undefined,
        recipientName: parsed.recipientName || undefined,
        confidence: 0.98,
        rawText: JSON.stringify(parsed),
      };
    }
  } catch (err) {
    console.warn('Gemini Vision OCR attempt skipped/failed:', err);
  }
  return null;
}

async function tryLocalLmStudioVision(base64Data: string, localUrl: string): Promise<ReceiptOcrResult | null> {
  try {
    const formattedDataUrl = base64Data.startsWith('data:') ? base64Data : `data:image/jpeg;base64,${base64Data}`;
    const endpoint = localUrl.endsWith('/chat/completions') ? localUrl : `${localUrl.replace(/\/+$/, '')}/chat/completions`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'local-model',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT_OCR_INSTRUCTIONS },
              { type: 'image_url', image_url: { url: formattedDataUrl } },
            ],
          },
        ],
        temperature: 0.1,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return null;

    const cleanJsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJsonStr);
    if (parsed && typeof parsed.amount === 'number') {
      return {
        detectedBank: (parsed.detectedBank as DetectedBank) || 'OTHER',
        amount: parsed.amount,
        referenceNumber: parsed.referenceNumber || undefined,
        transactionDate: parsed.transactionDate || undefined,
        recipientName: parsed.recipientName || undefined,
        confidence: 0.95,
        rawText: cleanJsonStr,
      };
    }
  } catch (err) {
    console.warn('Local LM Studio OCR attempt skipped/failed:', err);
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, imageBase64, defaultAmount } = body;

    // 1. If an image is provided, attempt AI Vision (Gemini or Local LM Studio)
    if (imageBase64 && typeof imageBase64 === 'string') {
      const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (geminiKey) {
        const geminiResult = await tryGeminiVision(imageBase64, geminiKey);
        if (geminiResult) {
          return NextResponse.json({ success: true, data: geminiResult, engine: 'gemini-vision' });
        }
      }

      const localLlmUrl = process.env.LOCAL_LLM_URL || process.env.LM_STUDIO_URL || process.env.OLLAMA_URL;
      if (localLlmUrl) {
        const localResult = await tryLocalLmStudioVision(imageBase64, localLlmUrl);
        if (localResult) {
          return NextResponse.json({ success: true, data: localResult, engine: 'local-vision-llm' });
        }
      }
    }

    // 2. Pure Domain Regex & Intelligent Pattern Heuristic Fallback
    const textToParse = text || imageBase64 || '';
    const result = container.processReceiptOcrUseCase.execute(textToParse);

    // If amount was not detected from raw text and a contextual default was supplied
    if (!result.amount && defaultAmount && typeof defaultAmount === 'number' && defaultAmount > 0) {
      result.amount = defaultAmount;
    }

    return NextResponse.json({
      success: true,
      data: result,
      engine: 'regex-heuristic-parser',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error processing receipt OCR',
      },
      { status: 500 }
    );
  }
}
