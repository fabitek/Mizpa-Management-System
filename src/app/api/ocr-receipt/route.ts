import { NextRequest, NextResponse } from 'next/server';
import { container } from '../../../infrastructure/container.ts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, imageBase64 } = body;

    let textToParse = text || '';

    if (!textToParse && imageBase64) {
      textToParse = imageBase64;
    }

    const result = container.processReceiptOcrUseCase.execute(textToParse);

    return NextResponse.json({
      success: true,
      data: result,
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
