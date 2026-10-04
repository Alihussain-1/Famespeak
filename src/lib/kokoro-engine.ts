/**
 * src/lib/kokoro-engine.ts
 *
 * In-browser Kokoro AI Text-to-Speech Engine (running ONNX WebAssembly).
 * 100% free, runs locally in the client browser, studio-quality voices.
 * Loaded dynamically at runtime via ESM to prevent Webpack/Terser bundling issues on Vercel.
 */

export interface KokoroVoice {
  id: string;
  name: string;
  gender: string;
  language: string;
  traits?: string;
}

export const KOKORO_VOICES: KokoroVoice[] = [
  { id: 'af_heart', name: 'Heart (American Female - Top Quality)', gender: 'Female', language: 'English (US)', traits: 'Warm, natural, clear' },
  { id: 'af_bella', name: 'Bella (American Female)', gender: 'Female', language: 'English (US)', traits: 'Expressive' },
  { id: 'af_sarah', name: 'Sarah (American Female)', gender: 'Female', language: 'English (US)' },
  { id: 'af_nicole', name: 'Nicole (American Female)', gender: 'Female', language: 'English (US)' },
  { id: 'af_sky', name: 'Sky (American Female)', gender: 'Female', language: 'English (US)' },
  { id: 'am_adam', name: 'Adam (American Male)', gender: 'Male', language: 'English (US)' },
  { id: 'am_michael', name: 'Michael (American Male)', gender: 'Male', language: 'English (US)' },
  { id: 'am_eric', name: 'Eric (American Male)', gender: 'Male', language: 'English (US)' },
  { id: 'am_liam', name: 'Liam (American Male)', gender: 'Male', language: 'English (US)' },
  { id: 'am_onyx', name: 'Onyx (American Male)', gender: 'Male', language: 'English (US)' },
  { id: 'bf_emma', name: 'Emma (British Female)', gender: 'Female', language: 'English (UK)' },
  { id: 'bf_isabella', name: 'Isabella (British Female)', gender: 'Female', language: 'English (UK)' },
  { id: 'bf_alice', name: 'Alice (British Female)', gender: 'Female', language: 'English (UK)' },
  { id: 'bm_george', name: 'George (British Male)', gender: 'Male', language: 'English (UK)' },
  { id: 'bm_lewis', name: 'Lewis (British Male)', gender: 'Male', language: 'English (UK)' },
  { id: 'bm_daniel', name: 'Daniel (British Male)', gender: 'Male', language: 'English (UK)' },
];

let kokoroInstance: any = null;
let isLoadingModel = false;
let loadPromise: Promise<any> | null = null;

export type ProgressCallback = (percent: number, status: string) => void;

/**
 * Helper to dynamically load an ESM package in the browser without Webpack analyzing it.
 */
function importExternal(url: string): Promise<any> {
  // Using new Function avoids Webpack trying to bundle the URL at build time
  const dynamicImport = new Function('moduleUrl', 'return import(moduleUrl);');
  return dynamicImport(url);
}

/**
 * Lazy-load KokoroTTS instance in browser.
 */
export async function getKokoroTTS(onProgress?: ProgressCallback): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('Kokoro TTS can only run in the browser.');
  }

  if (kokoroInstance) return kokoroInstance;
  if (isLoadingModel && loadPromise) return loadPromise;

  isLoadingModel = true;
  loadPromise = (async () => {
    onProgress?.(10, 'Loading Kokoro AI engine from CDN...');

    const { KokoroTTS } = await importExternal('https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm');

    const modelId = 'onnx-community/Kokoro-82M-v1.0-ONNX';
    const instance = await KokoroTTS.from_pretrained(modelId, {
      dtype: 'q8',
      device: 'wasm',
      progress_callback: (progressInfo: any) => {
        if (progressInfo && typeof progressInfo.progress === 'number') {
          const pct = Math.round(progressInfo.progress);
          const file = progressInfo.file ? ` (${progressInfo.file})` : '';
          onProgress?.(Math.min(95, Math.max(10, pct)), `Downloading voice model${file}...`);
        }
      },
    });

    kokoroInstance = instance;
    isLoadingModel = false;
    onProgress?.(100, 'Kokoro AI ready!');
    return instance;
  })();

  return loadPromise;
}

/**
 * Generate audio using Kokoro-js in browser.
 */
export async function generateKokoroAudio(
  text: string,
  voiceId: string,
  speed = 1.0,
  onProgress?: ProgressCallback
): Promise<{ audioUrl: string; duration: number }> {
  const tts = await getKokoroTTS(onProgress);
  onProgress?.(60, 'Synthesizing with Kokoro AI...');

  const rawAudio = await tts.generate(text, {
    voice: voiceId || 'af_heart',
    speed: speed,
  });

  const blob: Blob = rawAudio.toBlob();
  const audioUrl = URL.createObjectURL(blob);
  const duration = rawAudio.audio.length / rawAudio.sampling_rate;

  return { audioUrl, duration };
}
