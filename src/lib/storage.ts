/**
 * src/lib/storage.ts
 *
 * Persistent storage using IndexedDB (via idb-keyval) with automatic
 * migration from legacy localStorage. Eliminates the 5MB quota limitation.
 */

import { get, set, del } from 'idb-keyval';

export interface HistoryItem {
  id: string;
  title?: string;
  text: string;
  voiceName: string;
  audioUrl: string;
  srt?: string;
  date: string;
  duration?: number;
  engine?: 'edge' | 'kokoro' | 'piper';
}

export interface PronunciationRule {
  id: string;
  word: string;
  replacement: string;
  enabled: boolean;
}

const HISTORY_KEY = 'tts_history_v2';
const PRONUNCIATIONS_KEY = 'tts_pronunciations_v1';
const FAVORITES_KEY = 'tts_favorites_v2';

/**
 * Migrate legacy localStorage data to IndexedDB on first load.
 */
async function migrateLocalStorageIfNeeded(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const existing = await get<HistoryItem[]>(HISTORY_KEY);
    if (!existing) {
      const oldHistory = localStorage.getItem('tts_history');
      if (oldHistory) {
        const parsed = JSON.parse(oldHistory) as HistoryItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          await set(HISTORY_KEY, parsed);
          // Keep a minimal backup or clean up large audio strings in localStorage
          localStorage.removeItem('tts_history');
        }
      }
    }

    const existingFavs = await get<string[]>(FAVORITES_KEY);
    if (!existingFavs) {
      const oldFavs = localStorage.getItem('tts_favorites');
      if (oldFavs) {
        const parsed = JSON.parse(oldFavs) as string[];
        if (Array.isArray(parsed)) {
          await set(FAVORITES_KEY, parsed);
        }
      }
    }
  } catch (err) {
    console.warn('[storage] Migration check failed:', err);
  }
}

export async function getHistory(): Promise<HistoryItem[]> {
  await migrateLocalStorageIfNeeded();
  try {
    const items = await get<HistoryItem[]>(HISTORY_KEY);
    return Array.isArray(items) ? items : [];
  } catch (err) {
    console.error('[storage] Failed to get history from IndexedDB:', err);
    return [];
  }
}

export async function saveHistoryItem(item: HistoryItem): Promise<void> {
  try {
    const items = await getHistory();
    const updated = [item, ...items.filter(i => i.id !== item.id)];
    await set(HISTORY_KEY, updated);
  } catch (err) {
    console.error('[storage] Failed to save history item to IndexedDB:', err);
  }
}

export async function updateHistoryItem(id: string, updates: Partial<HistoryItem>): Promise<void> {
  try {
    const items = await getHistory();
    const updated = items.map(item => item.id === id ? { ...item, ...updates } : item);
    await set(HISTORY_KEY, updated);
  } catch (err) {
    console.error('[storage] Failed to update history item in IndexedDB:', err);
  }
}

export async function deleteHistoryItem(id: string): Promise<void> {
  try {
    const items = await getHistory();
    const updated = items.filter(i => i.id !== id);
    await set(HISTORY_KEY, updated);
  } catch (err) {
    console.error('[storage] Failed to delete history item from IndexedDB:', err);
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await del(HISTORY_KEY);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tts_history');
    }
  } catch (err) {
    console.error('[storage] Failed to clear history from IndexedDB:', err);
  }
}

export async function getPronunciations(): Promise<PronunciationRule[]> {
  try {
    const rules = await get<PronunciationRule[]>(PRONUNCIATIONS_KEY);
    if (Array.isArray(rules)) return rules;
    // Default helpful examples
    return [
      { id: '1', word: 'GIF', replacement: 'jif', enabled: true },
      { id: '2', word: 'SQL', replacement: 'sequel', enabled: true },
    ];
  } catch (err) {
    console.error('[storage] Failed to get pronunciations:', err);
    return [];
  }
}

export async function savePronunciations(rules: PronunciationRule[]): Promise<void> {
  try {
    await set(PRONUNCIATIONS_KEY, rules);
  } catch (err) {
    console.error('[storage] Failed to save pronunciations:', err);
  }
}

/**
 * Apply pronunciation replacements to script text before sending to synthesis.
 */
export function applyPronunciations(text: string, rules: PronunciationRule[]): string {
  let result = text;
  for (const rule of rules) {
    if (!rule.enabled || !rule.word.trim()) continue;
    // Case-insensitive word boundary replacement
    const escaped = rule.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    result = result.replace(regex, rule.replacement);
  }
  return result;
}

export async function getFavorites(): Promise<string[]> {
  await migrateLocalStorageIfNeeded();
  try {
    const favs = await get<string[]>(FAVORITES_KEY);
    return Array.isArray(favs) ? favs : [];
  } catch (err) {
    return [];
  }
}

export async function toggleFavoriteVoice(voiceId: string): Promise<string[]> {
  try {
    const favs = await getFavorites();
    const updated = favs.includes(voiceId)
      ? favs.filter(id => id !== voiceId)
      : [...favs, voiceId];
    await set(FAVORITES_KEY, updated);
    return updated;
  } catch (err) {
    console.error('[storage] Failed to toggle favorite:', err);
    return [];
  }
}
