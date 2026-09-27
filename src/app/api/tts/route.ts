/**
 * src/app/api/tts/route.ts
 *
 * Responsibility: HTTP request handling ONLY.
 *
 * Flow:
 *   Receive request → Validate input → Call edge-tts.ts → Return response
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAudio, fetchVoices, EdgeTTSError, isValidRate, isValidPitch, isValidVolume } from '@/lib/edge-tts';
import { TTSRequest, TTSApiResponse } from '@/types/tts';

// ─── POST /api/tts ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse<TTSApiResponse>> {
  // 1. Receive request
  let body: TTSRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body.', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }

  // 2. Validate input
  const { text, voice, rate = '+0%', pitch = '+0Hz', volume = '+0%' } = body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'Field "text" is required and must be a non-empty string.', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }


  if (!voice || typeof voice !== 'string' || voice.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'Field "voice" is required.', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  if (rate && !isValidRate(rate)) {
    return NextResponse.json(
      { success: false, error: `Invalid "rate" format. Expected e.g. "+0%", "-20%". Got: "${rate}"`, code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  if (pitch && !isValidPitch(pitch)) {
    return NextResponse.json(
      { success: false, error: `Invalid "pitch" format. Expected e.g. "+0Hz", "-10Hz". Got: "${pitch}"`, code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  if (volume && !isValidVolume(volume)) {
    return NextResponse.json(
      { success: false, error: `Invalid "volume" format. Expected e.g. "+0%", "+100%". Got: "${volume}"`, code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  // 3. Call edge-tts.ts
  try {
    const { base64Audio } = await generateAudio({ text, voice, rate, pitch, volume });

    // 4. Return response
    return NextResponse.json({
      success: true,
      audioUrl: `data:audio/mp3;base64,${base64Audio}`,
    });
  } catch (err) {
    if (err instanceof EdgeTTSError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: err.code === 'INVALID_INPUT' || err.code === 'INVALID_VOICE' ? 400 : 502 }
      );
    }

    console.error('[POST /api/tts] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// ─── GET /api/tts ─────────────────────────────────────────────────────────────
// Returns available voices for the VoiceSelector component

export async function GET(): Promise<NextResponse> {
  try {
    const voices = await fetchVoices();
    return NextResponse.json({ success: true, voices });
  } catch (err) {
    if (err instanceof EdgeTTSError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to fetch voices.', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
