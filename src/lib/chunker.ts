/**
 * src/lib/chunker.ts
 *
 * Text analysis utilities:
 * - Chunks long scripts into sentence-bounded segments to prevent Vercel 10s timeouts
 * - Parses [pause 2s] / [pause 500ms] inline tags
 * - Parses multi-speaker dialogue lines ("Host: Hello", "Guest: Hi!")
 */

export interface ScriptSegment {
  type: 'speech' | 'pause';
  text?: string;
  durationMs?: number;
  speaker?: string;
}

export interface DialogueLine {
  speaker: string;
  text: string;
}

/**
 * Split a speech text into safe chunks (approx 400-500 characters max)
 * while respecting sentence boundaries (. ! ? \n).
 * This completely avoids Vercel serverless 10s execution timeouts!
 */
export function chunkSpeechText(text: string, maxChunkLength = 450): string[] {
  const cleaned = text.trim();
  if (cleaned.length <= maxChunkLength) {
    return [cleaned];
  }

  // Split on sentence boundaries (. ! ? or newline)
  const sentenceRegex = /([^.!?\n]+[.!?\n]+|[^.!?\n]+$)/g;
  const sentences = cleaned.match(sentenceRegex) || [cleaned];

  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const s = sentence.trim();
    if (!s) continue;

    if (currentChunk.length + s.length + 1 <= maxChunkLength) {
      currentChunk = currentChunk ? `${currentChunk} ${s}` : s;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      if (s.length > maxChunkLength) {
        // Fallback for long run-on sentences: split on words
        const words = s.split(' ');
        let wordChunk = '';
        for (const w of words) {
          if (wordChunk.length + w.length + 1 <= maxChunkLength) {
            wordChunk = wordChunk ? `${wordChunk} ${w}` : w;
          } else {
            if (wordChunk) chunks.push(wordChunk);
            wordChunk = w;
          }
        }
        if (wordChunk) currentChunk = wordChunk;
        else currentChunk = '';
      } else {
        currentChunk = s;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(c => c.trim().length > 0);
}

/**
 * Parse pause tags like [pause 2s], [pause 500ms], [pause 1.5s] out of text.
 */
export function parsePauses(text: string): ScriptSegment[] {
  const regex = /\[pause\s*(\d+(?:\.\d+)?)\s*(s|ms)\]/gi;
  const segments: ScriptSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim();
    if (before) {
      segments.push({ type: 'speech', text: before });
    }

    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    const durationMs = unit === 's' ? Math.round(value * 1000) : Math.round(value);

    segments.push({ type: 'pause', durationMs: Math.max(100, Math.min(30000, durationMs)) });
    lastIndex = regex.lastIndex;
  }

  const remainder = text.slice(lastIndex).trim();
  if (remainder) {
    segments.push({ type: 'speech', text: remainder });
  }

  return segments.length > 0 ? segments : [{ type: 'speech', text: text.trim() }];
}
