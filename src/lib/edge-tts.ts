/**
 * src/lib/edge-tts.ts
 *
 * Edge TTS logic using the updated @andresaya/edge-tts package
 */

import { EdgeTTS } from '@andresaya/edge-tts';
import path from 'path';
import fs from 'fs/promises';
import { EdgeVoice } from '@/types/tts';

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
    return voices as EdgeVoice[];
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
  filePath: string;
  fileName: string;
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
    outputDir = path.join(process.cwd(), 'public', 'audio'),
  } = options;

  if (!text || text.trim().length === 0) {
    throw new EdgeTTSError('Text cannot be empty.', 'INVALID_INPUT');
  }
  if (!voice || voice.trim().length === 0) {
    throw new EdgeTTSError('Voice must be specified.', 'INVALID_INPUT');
  }

  await fs.mkdir(outputDir, { recursive: true });

  const baseFileName = `tts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const filePath = path.join(outputDir, baseFileName); // Library will add .mp3 to this file path
  const finalFileName = `${baseFileName}.mp3`; // This is what we return to the frontend

  try {
    const tts = new EdgeTTS();

    // Synthesize audio data in memory
    await tts.synthesize(text, voice, { rate, pitch, volume });

    // Write to disk (library will save as `filePath` + `.mp3`)
    await tts.toFile(filePath);

    return { filePath: filePath + '.mp3', fileName: finalFileName };
  } catch (err) {
    await fs.unlink(filePath).catch(() => {});

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
