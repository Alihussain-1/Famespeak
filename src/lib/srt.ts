/**
 * src/lib/srt.ts
 *
 * Builds an .srt subtitle file from Edge TTS word boundaries.
 * Edge TTS reports offsets/durations in 100-nanosecond ticks.
 */

export interface WordTiming {
  offset: number;   // 100ns ticks
  duration: number; // 100ns ticks
  text: string;
}

const TICKS_PER_MS = 10_000;
const MAX_WORDS_PER_CUE = 10;
const MAX_CUE_MS = 5_000;

function formatTime(ms: number): string {
  const total = Math.max(0, Math.round(ms));
  const h = Math.floor(total / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1000);
  const msPart = total % 1000;
  const pad = (n: number, l = 2) => n.toString().padStart(l, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(msPart, 3)}`;
}

export function buildSrt(script: string, words: WordTiming[]): string {
  if (!words.length) return '';

  interface Cue { start: number; end: number; from: number; to: number; }
  const cues: Cue[] = [];

  let cursor = 0;
  let current: Cue | null = null;
  let wordCount = 0;

  for (const w of words) {
    const startMs = w.offset / TICKS_PER_MS;
    const endMs = (w.offset + w.duration) / TICKS_PER_MS;

    // Locate this word in the original script so we keep punctuation/casing
    let idx = script.indexOf(w.text, cursor);
    if (idx === -1) idx = cursor;
    let wordEnd = idx + w.text.length;

    // Absorb trailing punctuation / closing quotes
    while (wordEnd < script.length && /[.,!?;:'"”’)\]…-]/.test(script[wordEnd])) wordEnd++;
    const trailing = script.slice(idx + w.text.length, wordEnd);

    if (!current) {
      current = { start: startMs, end: endMs, from: idx, to: wordEnd };
      wordCount = 0;
    }
    current.end = endMs;
    current.to = wordEnd;
    wordCount++;
    cursor = wordEnd;

    const sentenceEnd = /[.!?…]/.test(trailing);
    const tooLong = wordCount >= MAX_WORDS_PER_CUE || current.end - current.start >= MAX_CUE_MS;
    const softBreak = /[,;:]/.test(trailing) && wordCount >= 5;

    if (sentenceEnd || tooLong || softBreak) {
      cues.push(current);
      current = null;
    }
  }
  if (current) cues.push(current);

  return cues
    .map((c, i) => {
      const text = script.slice(c.from, c.to).replace(/\s+/g, ' ').trim();
      return `${i + 1}\n${formatTime(c.start)} --> ${formatTime(c.end)}\n${text}\n`;
    })
    .join('\n');
}
