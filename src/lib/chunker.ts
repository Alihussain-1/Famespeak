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
 * Detect if text is written in multi-speaker dialogue format.
 * Format example:
 *   Speaker 1: Hello world!
 *   Speaker 2: Hi there, how are you?
 */
export function isDialogueScript(text: string): boolean {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return false;
  let dialogueMatches = 0;
  for (const line of lines) {
    if (/^[A-Za-z0-9_\s]{1,30}\s*:\s*.+$/.test(line)) {
      dialogueMatches++;
    }
  }
  return dialogueMatches >= 2 && dialogueMatches >= Math.floor(lines.length * 0.6);
}

/**
 * Extract unique speaker names from a dialogue script.
 */
export function extractSpeakers(text: string): string[] {
  const lines = text.split('\n');
  const speakersSet = new Set<string>();
  for (const line of lines) {
    const match = line.match(/^([A-Za-z0-9_\s]{1,30})\s*:\s*(.+)$/);
    if (match) {
      speakersSet.add(match[1].trim());
    }
  }
  return Array.from(speakersSet);
}

/**
 * Parse dialogue script into turns.
 */
export function parseDialogue(text: string): DialogueLine[] {
  const lines = text.split('\n');
  const result: DialogueLine[] = [];
  let currentSpeaker = 'Speaker 1';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(/^([A-Za-z0-9_\s]{1,30})\s*:\s*(.+)$/);
    if (match) {
      currentSpeaker = match[1].trim();
      result.push({ speaker: currentSpeaker, text: match[2].trim() });
    } else {
      if (result.length > 0) {
        result[result.length - 1].text += ' ' + line;
      } else {
        result.push({ speaker: currentSpeaker, text: line });
      }
    }
  }
  return result;
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

/**
 * Split a speech text into safe chunks (approx 400-600 characters max)
 * while respecting sentence boundaries (. ! ? \n).
 */
export function chunkSpeechText(text: string, maxChunkLength = 500): string[] {
  const cleaned = text.trim();
  if (cleaned.length <= maxChunkLength) {
    return [cleaned];
  }

  // Split on sentence boundaries
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
        // Fallback for massive sentences without punctuation: split on words
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

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.filter(c => c.trim().length > 0);
}
