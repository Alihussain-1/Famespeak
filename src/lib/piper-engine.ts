/**
 * src/lib/piper-engine.ts
 *
 * In-browser Piper Text-to-Speech Engine (running WASM in browser).
 * Extremely lightweight, multilingual, open-source.
 * Loaded dynamically at runtime via ESM to prevent Webpack bundling issues.
 */

export interface PiperVoiceItem {
  id: string;
  name: string;
  language: string;
  gender: string;
}

export const PIPER_VOICES: PiperVoiceItem[] = [
  { id: 'en_US-lessac-medium', name: 'Lessac (US English)', language: 'English (US)', gender: 'Female' },
  { id: 'en_US-amy-medium', name: 'Amy (US English)', language: 'English (US)', gender: 'Female' },
  { id: 'en_US-ryan-medium', name: 'Ryan (US English)', language: 'English (US)', gender: 'Male' },
  { id: 'en_US-danny-low', name: 'Danny (US English)', language: 'English (US)', gender: 'Male' },
  { id: 'en_GB-alan-medium', name: 'Alan (British English)', language: 'English (UK)', gender: 'Male' },
  { id: 'en_GB-jenny_dioco-medium', name: 'Jenny (British English)', language: 'English (UK)', gender: 'Female' },
  { id: 'es_ES-davefx-medium', name: 'Dave (Spanish)', language: 'Spanish (Spain)', gender: 'Male' },
  { id: 'fr_FR-siwis-medium', name: 'Siwis (French)', language: 'French (France)', gender: 'Female' },
  { id: 'de_DE-thorsten-medium', name: 'Thorsten (German)', language: 'German (Germany)', gender: 'Male' },
  { id: 'it_IT-riccardo-x_low', name: 'Riccardo (Italian)', language: 'Italian (Italy)', gender: 'Male' },
];

function importExternal(url: string): Promise<any> {
  const dynamicImport = new Function('moduleUrl', 'return import(moduleUrl);');
  return dynamicImport(url);
}

export async function generatePiperAudio(
  text: string,
  voiceId: string,
  onProgress?: (percent: number, status: string) => void
): Promise<{ audioUrl: string; duration: number }> {
  if (typeof window === 'undefined') {
    throw new Error('Piper TTS can only run in the browser.');
  }

  onProgress?.(15, 'Loading Piper WASM engine from CDN...');
  const { predict } = await importExternal('https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.5/+esm');

  onProgress?.(40, 'Generating audio with Piper...');
  const blob: Blob = await predict(
    {
      text,
      voiceId: voiceId as any,
    },
    (progress: { loaded: number; total: number }) => {
      if (progress.total > 0) {
        const pct = Math.round((progress.loaded / progress.total) * 100);
        onProgress?.(Math.min(95, Math.max(15, pct)), `Downloading Piper voice (${pct}%)...`);
      }
    }
  );

  const audioUrl = URL.createObjectURL(blob);
  return { audioUrl, duration: 0 };
}
