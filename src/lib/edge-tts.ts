/**
 * src/lib/edge-tts.ts
 *
 * Edge TTS logic using the updated @andresaya/edge-tts package
 */

import { EdgeTTS } from '@andresaya/edge-tts';
import { EdgeVoice } from '@/types/tts';
import { buildSrt } from '@/lib/srt';

// ─── Custom error class ───────────────────────────────────────────────────────

export class EdgeTTSError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'EDGE_TTS_ERROR'
  ) {
    super(message);
    this.name = 'EdgeTTSError';
  }
}

// ─── Voice fetching ───────────────────────────────────────────────────────────

export async function fetchVoices(): Promise<EdgeVoice[]> {
  try {
    const tts = new EdgeTTS();
    const voices = await tts.getVoices();
    return voices as any as EdgeVoice[];
  } catch (err) {
    throw new EdgeTTSError(
      `Failed to fetch voices: ${(err as Error).message}`,
      'VOICE_FETCH_ERROR'
    );
  }
}

// ─── Audio generation ─────────────────────────────────────────────────────────

export interface GenerateAudioOptions {
  text: string;
  voice: string;
  rate?: string;   
  pitch?: string;  
  volume?: string; 
  outputDir?: string;
}

export interface GenerateAudioResult {
  base64Audio: string;
  srt: string;
}

export async function generateAudio(
  options: GenerateAudioOptions
): Promise<GenerateAudioResult> {
  const {
    text,
    voice,
    rate = '+0%',
    pitch = '+0Hz',
    volume = '+0%',
  } = options;

  if (!text || text.trim().length === 0) {
    throw new EdgeTTSError('Text cannot be empty.', 'INVALID_INPUT');
  }
  if (!voice || voice.trim().length === 0) {
    throw new EdgeTTSError('Voice must be specified.', 'INVALID_INPUT');
  }

  try {
    const tts = new EdgeTTS();

    // Synthesize audio data in memory
    await tts.synthesize(text, voice, { rate, pitch, volume });

    // Get the audio buffer directly in memory (Vercel read-only filesystem fix)
    const buffer = tts.toBuffer();
    const base64Audio = buffer.toString('base64');

    // Build subtitles from word timings (never fail the whole request over subtitles)
    let srt = '';
    try {
      srt = buildSrt(text, tts.getWordBoundaries());
    } catch (srtErr) {
      console.error('[generateAudio] SRT build failed:', srtErr);
    }

    return { base64Audio, srt };
  } catch (err) {
    const message = (err as Error).message ?? 'Unknown TTS error';

    if (message.includes('voice')) {
      throw new EdgeTTSError(`Invalid voice "${voice}": ${message}`, 'INVALID_VOICE');
    }
    if (message.includes('network') || message.includes('fetch')) {
      throw new EdgeTTSError(`Network error while generating audio: ${message}`, 'NETWORK_ERROR');
    }

    throw new EdgeTTSError(`Audio generation failed: ${message}`, 'GENERATION_ERROR');
  }
}

// ─── Validation helpers ───────────────────────────────────────────────────────

export function isValidRate(rate: string): boolean {
  return /^[+-]\d+%$/.test(rate);
}

export function isValidPitch(pitch: string): boolean {
  return /^[+-]\d+Hz$/.test(pitch);
}

export function isValidVolume(volume: string): boolean {
  return /^[+-]\d+%$/.test(volume);
}
