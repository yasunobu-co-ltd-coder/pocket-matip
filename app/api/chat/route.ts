import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const body = await req.json();
    const { model, messages, response_format } = body;

    const completion = await openai.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: messages,
      response_format: response_format,
    });

    return NextResponse.json(completion);
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Failed to process chat request' }, { status: 500 });
  }
}
