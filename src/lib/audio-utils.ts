/**
 * src/lib/audio-utils.ts
 *
 * In-browser Web Audio manipulation:
 * - Decodes audio chunks (data URI or Blob) into AudioBuffers
 * - Generates silence buffers for [pause 2s] tags
 * - Stitches multiple audio segments into a seamless single audio file
 * - Converts AudioBuffer into high quality standard WAV Blob/DataURI
 * - Stitches SRT subtitles with progressive time offsets
 */

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioContext = new AudioCtx();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

/**
 * Decode a data URI, Blob, or ArrayBuffer into an AudioBuffer.
 */
export async function decodeAudio(source: string | Blob | ArrayBuffer): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  let arrayBuffer: ArrayBuffer;

  if (typeof source === 'string') {
    if (source.startsWith('data:')) {
      const base64 = source.split(',')[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      arrayBuffer = bytes.buffer;
    } else {
      const res = await fetch(source);
      arrayBuffer = await res.arrayBuffer();
    }
  } else if (source instanceof Blob) {
    arrayBuffer = await source.arrayBuffer();
  } else {
    arrayBuffer = source;
  }

  // decodeAudioData detaches the arrayBuffer, so we slice a copy if needed
  return await ctx.decodeAudioData(arrayBuffer.slice(0));
}

/**
 * Create an AudioBuffer containing pure silence of specified duration.
 */
export function createSilence(durationMs: number, sampleRate = 24000): AudioBuffer {
  const ctx = getAudioContext();
  const actualSampleRate = ctx.sampleRate || sampleRate;
  const numFrames = Math.max(1, Math.round((durationMs / 1000) * actualSampleRate));
  return ctx.createBuffer(1, numFrames, actualSampleRate);
}

/**
 * Combine multiple AudioBuffers sequentially into one continuous AudioBuffer.
 */
export function combineAudioBuffers(buffers: AudioBuffer[]): AudioBuffer {
  if (buffers.length === 0) {
    return createSilence(100);
  }
  if (buffers.length === 1) {
    return buffers[0];
  }

  const ctx = getAudioContext();
  const maxChannels = Math.max(...buffers.map(b => b.numberOfChannels));
  const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);
  const sampleRate = buffers[0].sampleRate;

  const result = ctx.createBuffer(maxChannels, totalLength, sampleRate);

  let offset = 0;
  for (const buffer of buffers) {
    for (let channel = 0; channel < maxChannels; channel++) {
      const sourceChannelData = buffer.getChannelData(Math.min(channel, buffer.numberOfChannels - 1));
      result.getChannelData(channel).set(sourceChannelData, offset);
    }
    offset += buffer.length;
  }

  return result;
}

/**
 * Encode an AudioBuffer into a 16-bit PCM WAV Blob.
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // 1 = PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const numFrames = buffer.length;
  const dataSize = numFrames * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // Helper write string
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF identifier
  writeString(0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + dataSize, true);
  // RIFF type
  writeString(8, 'WAVE');
  // format chunk identifier
  writeString(12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw PCM)
  view.setUint16(20, format, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * blockAlign, true);
  // block align
  view.setUint16(32, blockAlign, true);
  // bits per sample
  view.setUint16(34, bitDepth, true);
  // data chunk identifier
  writeString(36, 'data');
  // data chunk length
  view.setUint32(40, dataSize, true);

  // Write interleaved PCM samples
  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      // Convert float [-1.0, 1.0] to 16-bit integer
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export async function audioBufferToDataUri(buffer: AudioBuffer): Promise<string> {
  const blob = audioBufferToWavBlob(buffer);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Format milliseconds to SRT timestamp: HH:MM:SS,mmm
 */
export function formatSrtTime(ms: number): string {
  const total = Math.max(0, Math.round(ms));
  const h = Math.floor(total / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1000);
  const msPart = total % 1000;
  const pad = (n: number, l = 2) => n.toString().padStart(l, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(msPart, 3)}`;
}

/**
 * Parse an SRT timestamp string HH:MM:SS,mmm into milliseconds.
 */
function parseSrtTime(str: string): number {
  const [hms, msStr = '0'] = str.trim().split(/[,.]/);
  const [h, m, s] = hms.split(':').map(Number);
  return (h * 3600 + m * 60 + s) * 1000 + parseInt(msStr.padEnd(3, '0').slice(0, 3), 10);
}

/**
 * Stitch multiple SRT blocks together, shifting each block by the cumulative
 * time offset of previously played audio segments.
 */
export function stitchSrtSegments(
  segments: { srt: string; durationSec: number }[]
): string {
  const allCues: { startMs: number; endMs: number; text: string }[] = [];
  let currentOffsetMs = 0;

  for (const seg of segments) {
    if (seg.srt && seg.srt.trim().length > 0) {
      // Parse cues from srt
      const blocks = seg.srt.trim().split(/\n\s*\n/);
      for (const block of blocks) {
        const lines = block.trim().split('\n');
        if (lines.length >= 2) {
          const timeLineIndex = lines[0].includes('-->') ? 0 : 1;
          const timeLine = lines[timeLineIndex];
          if (timeLine && timeLine.includes('-->')) {
            const [startStr, endStr] = timeLine.split('-->');
            const startMs = parseSrtTime(startStr) + currentOffsetMs;
            const endMs = parseSrtTime(endStr) + currentOffsetMs;
            const text = lines.slice(timeLineIndex + 1).join('\n').trim();
            if (text) {
              allCues.push({ startMs, endMs, text });
            }
          }
        }
      }
    }
    currentOffsetMs += Math.round(seg.durationSec * 1000);
  }

  if (allCues.length === 0) return '';

  return allCues
    .map((cue, idx) => {
      return `${idx + 1}\n${formatSrtTime(cue.startMs)} --> ${formatSrtTime(cue.endMs)}\n${cue.text}\n`;
    })
    .join('\n');
}
