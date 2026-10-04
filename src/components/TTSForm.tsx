'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import VoiceModal from '@/components/VoiceModal';
import CustomDropdown from '@/components/CustomDropdown';
import MultiSpeakerPanel from '@/components/MultiSpeakerPanel';
import { VoiceOption } from '@/types/tts';
import { ArrowRight, Loader2, Sparkles, BookA, Clock, Users, User } from 'lucide-react';
import HistoryList, { PendingGeneration } from '@/components/HistoryList';
import PronunciationModal, { getLocalPronunciations, applyPronunciations } from '@/components/PronunciationModal';
import { chunkSpeechText, parsePauses } from '@/lib/chunker';
import {
  decodeAudio,
  createSilence,
  combineAudioBuffers,
  audioBufferToDataUri,
  stitchSrtSegments,
} from '@/lib/audio-utils';

const PRESET_VOICES: VoiceOption[] = [
  { value: 'en-US-AriaNeural', label: 'Aria Multilingual', locale: 'en-US', localeName: 'English (United States)', gender: 'Female', engine: 'edge' },
  { value: 'en-US-GuyNeural', label: 'Guy', locale: 'en-US', localeName: 'English (United States)', gender: 'Male', engine: 'edge' },
  { value: 'en-US-JennyNeural', label: 'Jenny', locale: 'en-US', localeName: 'English (United States)', gender: 'Female', engine: 'edge' },
  { value: 'en-US-ChristopherNeural', label: 'Christopher', locale: 'en-US', localeName: 'English (United States)', gender: 'Male', engine: 'edge' },
  { value: 'en-US-EmmaNeural', label: 'Emma', locale: 'en-US', localeName: 'English (United States)', gender: 'Female', engine: 'edge' },
  { value: 'en-US-BrianNeural', label: 'Brian', locale: 'en-US', localeName: 'English (United States)', gender: 'Male', engine: 'edge' },
];

function base64ToBlob(base64: string, mimeType = 'audio/mp3'): Blob {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function getAudioBlobDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      const dur = audio.duration;
      URL.revokeObjectURL(url);
      resolve(isNaN(dur) || !isFinite(dur) ? 0 : dur);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
  });
}

function parseSrtTime(t: string): number {
  const [hms, ms] = t.split(',');
  const [h, m, s] = (hms || '0:0:0').split(':').map(Number);
  return (h || 0) * 3600000 + (m || 0) * 60000 + (s || 0) * 1000 + (Number(ms) || 0);
}

function formatSrtTime(msTotal: number): string {
  const total = Math.max(0, Math.round(msTotal));
  const h = Math.floor(total / 3600000);
  const m = Math.floor((total % 3600000) / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const ms = total % 1000;
  const pad = (n: number, l = 2) => n.toString().padStart(l, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

function shiftSrt(
  srt: string,
  offsetMs: number,
  startCueIndex: number
): { shiftedSrt: string; nextCueIndex: number; maxEndMs: number } {
  if (!srt || !srt.trim()) {
    return { shiftedSrt: '', nextCueIndex: startCueIndex, maxEndMs: offsetMs };
  }
  const blocks = srt.trim().split(/\r?\n\r?\n/);
  const result: string[] = [];
  let cueIdx = startCueIndex;
  let maxEnd = offsetMs;

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 3) continue;
    const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
    if (!timeMatch) continue;
    const startMs = parseSrtTime(timeMatch[1]) + offsetMs;
    const endMs = parseSrtTime(timeMatch[2]) + offsetMs;
    if (endMs > maxEnd) maxEnd = endMs;
    const textLines = lines.slice(2).join('\n');
    result.push(`${cueIdx}\n${formatSrtTime(startMs)} --> ${formatSrtTime(endMs)}\n${textLines}`);
    cueIdx++;
  }
  return { shiftedSrt: result.join('\n\n'), nextCueIndex: cueIdx, maxEndMs: maxEnd };
}

function saveHistoryItem(item: any) {
  if (typeof window === 'undefined') return;
  try {
    const saved = localStorage.getItem('tts_history');
    let list = saved ? JSON.parse(saved) : [];
    list = [item, ...list];
    while (list.length > 0) {
      try {
        localStorage.setItem('tts_history', JSON.stringify(list));
        break;
      } catch (e) {
        list.pop();
      }
    }
  } catch (err) {
    console.warn('Storage error:', err);
  }
}

export default function TTSForm() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'single' | 'dialogue'>('single');
  
  // Voice settings
  const [voiceShortName, setVoiceShortName] = useState('en-US-AriaNeural');
  const [voiceNameDisplay, setVoiceNameDisplay] = useState('Aria Multilingual');
  const [voiceDetails, setVoiceDetails] = useState('English - United States - Female');
  const [selectedVoiceObj, setSelectedVoiceObj] = useState<VoiceOption>(PRESET_VOICES[0]);
  
  const [emotion, setEmotion] = useState('neutral');
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(0);
  
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isPronunciationOpen, setIsPronunciationOpen] = useState(false);

  // Multi-Speaker mappings
  const [speakerMappings, setSpeakerMappings] = useState<Record<string, VoiceOption>>({});

  // Loading and Pending state for History
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingGeneration | null>(null);

  const [activeRightTab, setActiveRightTab] = useState<'settings' | 'history'>('settings');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Extract detected speakers from text
  const detectedSpeakers = useMemo(() => {
    if (mode !== 'dialogue') return [];
    const lines = text.split('\n');
    const set = new Set<string>();
    for (const raw of lines) {
      const trimmed = raw.trim();
      const match = trimmed.match(/^([A-Za-z0-9_-]+)\s*:\s*(.+)$/);
      if (match) {
        set.add(match[1]);
      }
    }
    return Array.from(set);
  }, [text, mode]);

  // Auto-assign distinct voices to newly detected speakers
  useEffect(() => {
    if (detectedSpeakers.length === 0) return;
    setSpeakerMappings(prev => {
      const next = { ...prev };
      let changed = false;
      detectedSpeakers.forEach((spk, index) => {
        if (!next[spk]) {
          const fallback = PRESET_VOICES[index % PRESET_VOICES.length];
          next[spk] = fallback;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [detectedSpeakers]);

  const insertTextAtCursor = (insertion: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setText(prev => prev + insertion);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = text.substring(0, start) + insertion + text.substring(end);
    setText(next);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + insertion.length;
    }, 10);
  };

  const handleSpeakerMappingChange = (speaker: string, voice: VoiceOption) => {
    setSpeakerMappings(prev => ({
      ...prev,
      [speaker]: voice,
    }));
  };

  const handleVoiceSelect = (shortName: string, info: VoiceOption) => {
    setVoiceShortName(shortName);
    setVoiceNameDisplay(info.label);
    setSelectedVoiceObj(info);
    
    const parts = (info.localeName || '').split('(');
    const lang = parts[0]?.trim() || 'Unknown';
    const country = parts[1]?.replace(')', '')?.trim() || 'Global';
    setVoiceDetails(`${lang} - ${country} - ${info.gender}`);
    
    setIsVoiceModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || loading) return;
    
    setLoading(true);
    setActiveRightTab('history');

    const ratePercent = Math.round((speed - 1) * 100);
    const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;
    const pitchStr = pitch >= 0 ? `+${pitch}Hz` : `${pitch}Hz`;

    try {
      const rules = getLocalPronunciations();
      const processedScript = applyPronunciations(text, rules);

      if (mode === 'dialogue') {
        // Multi-Speaker Dialogue Mode
        const rawLines = text.split('\n');
        interface Turn {
          speaker: string | null;
          text: string;
        }
        const turns: Turn[] = [];

        for (const raw of rawLines) {
          const trimmed = raw.trim();
          if (!trimmed) continue;
          const match = trimmed.match(/^([A-Za-z0-9_-]+)\s*:\s*(.+)$/);
          if (match) {
            turns.push({ speaker: match[1], text: match[2] });
          } else {
            turns.push({ speaker: null, text: trimmed });
          }
        }

        if (turns.length === 0) {
          throw new Error('Please enter dialogue lines or click a template.');
        }

        interface DialogueTask {
          type: 'speech' | 'pause';
          speaker: string;
          voice: string;
          text?: string;
          durationMs?: number;
        }
        const tasks: DialogueTask[] = [];

        for (const turn of turns) {
          const speakerName = turn.speaker || 'Narrator';
          const speakerVoice = (turn.speaker && speakerMappings[turn.speaker])
            ? speakerMappings[turn.speaker].value
            : voiceShortName;

          const segments = parsePauses(turn.text);
          for (const seg of segments) {
            if (seg.type === 'pause' && seg.durationMs) {
              tasks.push({ type: 'pause', speaker: speakerName, voice: speakerVoice, durationMs: seg.durationMs });
            } else if (seg.type === 'speech' && seg.text) {
              const chunks = chunkSpeechText(seg.text, 450);
              for (const ch of chunks) {
                tasks.push({ type: 'speech', speaker: speakerName, voice: speakerVoice, text: ch });
              }
            }
          }
        }

        const audioBuffers: AudioBuffer[] = [];
        const srtSegments: { srt: string; durationSec: number }[] = [];
        const speechTasks = tasks.filter(t => t.type === 'speech');
        let speechIdx = 0;

        for (let i = 0; i < tasks.length; i++) {
          const task = tasks[i];
          if (task.type === 'pause' && task.durationMs) {
            const silenceBuf = createSilence(task.durationMs);
            audioBuffers.push(silenceBuf);
            srtSegments.push({ srt: '', durationSec: silenceBuf.duration });
          } else if (task.type === 'speech' && task.text) {
            speechIdx++;
            const progressPct = Math.round((speechIdx / speechTasks.length) * 85);
            setPending({
              text: `[${task.speaker}]: ${task.text.slice(0, 70)}...`,
              voiceName: task.speaker,
              progress: progressPct,
              statusText: `Synthesizing part ${speechIdx} of ${speechTasks.length} (${task.speaker})...`,
            });

            const res = await fetch('/api/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: task.text,
                voice: task.voice,
                rate: rateStr,
                pitch: pitchStr,
                volume: '+0%',
                style: emotion,
              }),
            });

            const data = await res.json();
            if (!data.success || !data.audioUrl) {
              throw new Error(data.error || `Failed to synthesize dialogue part ${speechIdx}`);
            }

            const buf = await decodeAudio(data.audioUrl);
            audioBuffers.push(buf);
            srtSegments.push({ srt: data.srt || '', durationSec: buf.duration });
          }
        }

        setPending(prev => prev ? { ...prev, progress: 95, statusText: 'Stitching dialogue audio...' } : null);

        const finalBuffer = combineAudioBuffers(audioBuffers);
        const finalAudioUrl = await audioBufferToDataUri(finalBuffer);
        const finalSrt = stitchSrtSegments(srtSegments);

        saveHistoryItem({
          id: Date.now().toString(),
          title: `Dialogue (${turns.length} lines)`,
          text: text,
          voiceName: `Multi-Speaker (${detectedSpeakers.length || 1} voices)`,
          audioUrl: finalAudioUrl,
          srt: finalSrt,
          date: new Date().toISOString(),
          engine: 'edge',
        });

        window.dispatchEvent(new Event('tts_history_updated'));
      } else {
        // Standard Single-Voice Mode with Sentence Chunking & Pauses
        const segments = parsePauses(processedScript);

        interface ChunkItem {
          type: 'speech' | 'pause';
          text?: string;
          durationMs?: number;
        }
        const tasks: ChunkItem[] = [];

        for (const seg of segments) {
          if (seg.type === 'pause' && seg.durationMs) {
            tasks.push({ type: 'pause', durationMs: seg.durationMs });
          } else if (seg.type === 'speech' && seg.text) {
            const chunks = chunkSpeechText(seg.text, 450);
            for (const ch of chunks) {
              tasks.push({ type: 'speech', text: ch });
            }
          }
        }

        // Fast path: if there is only 1 speech chunk and no pauses
        if (tasks.length === 1 && tasks[0].type === 'speech') {
          setPending({
            text: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
            voiceName: voiceNameDisplay,
            progress: 35,
            statusText: 'Synthesizing audio...',
          });

          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: tasks[0].text,
              voice: voiceShortName,
              rate: rateStr,
              pitch: pitchStr,
              volume: '+0%',
              style: emotion,
            }),
          });

          const data = await res.json();
          if (!data.success || !data.audioUrl) {
            throw new Error(data.error || 'Failed to generate audio.');
          }

          saveHistoryItem({
            id: Date.now().toString(),
            title: 'Generated Audio',
            text: text,
            voiceName: voiceNameDisplay,
            audioUrl: data.audioUrl,
            srt: data.srt || '',
            date: new Date().toISOString(),
            engine: 'edge',
          });

          window.dispatchEvent(new Event('tts_history_updated'));
        } else {
          // Multi-chunk / Pause processing (Prevents Vercel 10s timeouts)
          const audioBuffers: AudioBuffer[] = [];
          const srtSegments: { srt: string; durationSec: number }[] = [];
          const speechTasks = tasks.filter(t => t.type === 'speech');
          let speechIdx = 0;

          for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            if (task.type === 'pause' && task.durationMs) {
              const silenceBuf = createSilence(task.durationMs);
              audioBuffers.push(silenceBuf);
              srtSegments.push({ srt: '', durationSec: silenceBuf.duration });
            } else if (task.type === 'speech' && task.text) {
              speechIdx++;
              const progressPct = Math.round((speechIdx / speechTasks.length) * 85);
              setPending({
                text: `${task.text.slice(0, 80)}...`,
                voiceName: voiceNameDisplay,
                progress: progressPct,
                statusText: `Synthesizing part ${speechIdx} of ${speechTasks.length}...`,
              });

              const res = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  text: task.text,
                  voice: voiceShortName,
                  rate: rateStr,
                  pitch: pitchStr,
                  volume: '+0%',
                  style: emotion,
                }),
              });

              const data = await res.json();
              if (!data.success || !data.audioUrl) {
                throw new Error(data.error || `Failed to synthesize part ${speechIdx}`);
              }

              const buf = await decodeAudio(data.audioUrl);
              audioBuffers.push(buf);
              srtSegments.push({ srt: data.srt || '', durationSec: buf.duration });
            }
          }

          setPending(prev => prev ? { ...prev, progress: 95, statusText: 'Stitching audio & subtitles...' } : null);

          const finalBuffer = combineAudioBuffers(audioBuffers);
          const finalAudioUrl = await audioBufferToDataUri(finalBuffer);
          const finalSrt = stitchSrtSegments(srtSegments);

          saveHistoryItem({
            id: Date.now().toString(),
            title: 'Generated Audio',
            text: text,
            voiceName: voiceNameDisplay,
            audioUrl: finalAudioUrl,
            srt: finalSrt,
            date: new Date().toISOString(),
            engine: 'edge',
          });

          window.dispatchEvent(new Event('tts_history_updated'));
        }
      }
    } catch (err: any) {
      console.error('Generation failed:', err);
      alert(err.message || 'Generation failed. Please try again.');
    } finally {
      setLoading(false);
      setPending(null);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row w-full flex-1">
        
        {/* LEFT PANEL: Script Input & Dialogue Controls */}
        <div className="lg:w-[65%] flex flex-col justify-between border-r border-gray-100 dark:border-gray-800 p-6 lg:p-10 lg:pr-14">
          <div className="flex-1 flex flex-col gap-3">
            
            {/* Mode Switcher & Script Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 gap-2.5">
              
              {/* Mode Toggle (Single vs Multi-Speaker Dialogue) */}
              <div className="inline-flex p-1 rounded-xl bg-gray-100 dark:bg-[#181818] border border-gray-200/80 dark:border-gray-800 self-start">
                <button
                  type="button"
                  onClick={() => setMode('single')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === 'single'
                      ? 'bg-white dark:bg-[#252525] text-gray-900 dark:text-white shadow-2xs'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Single Voice
                </button>
                <button
                  type="button"
                  onClick={() => setMode('dialogue')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === 'dialogue'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Multi-Speaker Dialogue
                </button>
              </div>

              {/* Action Buttons: Pause & Pronunciations */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => insertTextAtCursor(' ... ')}
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#161616] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
                  title="Insert a natural pause"
                >
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  + Pause (...)
                </button>

                <button
                  type="button"
                  onClick={() => setIsPronunciationOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#161616] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
                  title="Custom word pronunciations"
                >
                  <BookA className="w-3.5 h-3.5 text-emerald-500" />
                  Pronunciations
                </button>
              </div>
            </div>

            {/* Multi-Speaker Dialogue Panel (Visible only in Dialogue Mode) */}
            {mode === 'dialogue' && (
              <MultiSpeakerPanel
                speakers={detectedSpeakers}
                mappings={speakerMappings}
                onMappingChange={handleSpeakerMappingChange}
                onInsertTemplate={(tmpl) => setText(tmpl)}
                defaultVoice={selectedVoiceObj}
              />
            )}

            {/* Main Textarea */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                mode === 'dialogue'
                  ? `Alex: Hello there! How are you doing? ...\nSam: I'm great! Welcome to FameSpeak multi-speaker dialogue.\nAlex: This feature makes podcast and story generation effortless!`
                  : "Write or paste your script here..."
              }
              className="w-full flex-grow text-gray-800 dark:text-gray-100 text-lg lg:text-xl resize-none placeholder-gray-400 dark:placeholder-gray-600 bg-transparent focus:outline-none min-h-[300px] leading-relaxed pt-2"
              required
            />
          </div>

          {/* Bottom Bar inside Left Column */}
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500 font-mono">
                {text.length} characters
              </span>
              {mode === 'dialogue' && detectedSpeakers.length > 0 && (
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  {detectedSpeakers.length} speaker{detectedSpeakers.length > 1 ? 's' : ''} detected
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white dark:text-gray-900 disabled:opacity-40 text-white font-medium px-6 py-2.5 rounded-xl transition-all shadow-sm text-sm cursor-pointer"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> {mode === 'dialogue' ? 'Generate Dialogue' : 'Generate Audio'}</>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: Settings & History */}
        <div className="lg:w-[35%] flex flex-col p-6 lg:p-8 lg:pl-10 h-full overflow-y-auto">
          
          <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6">
            <button
              type="button"
              onClick={() => setActiveRightTab('settings')}
              className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                activeRightTab === 'settings' 
                  ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100' 
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Settings
            </button>
            <button
              type="button"
              onClick={() => setActiveRightTab('history')}
              className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                activeRightTab === 'history' 
                  ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100' 
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              History
            </button>
          </div>

          {activeRightTab === 'settings' ? (
            <div className="flex flex-col gap-6">
              {/* Voice Selector Card */}
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {mode === 'dialogue' ? 'Default / Narrator Voice' : 'Voice'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsVoiceModalOpen(true)}
                    className="text-xs font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3"/> Browse All Voices
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVoiceModalOpen(true)}
                  className="group flex items-center justify-between bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-xl p-4 shadow-sm transition-all text-left cursor-pointer"
                >
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-bold text-gray-900 dark:text-gray-100 text-base truncate">{voiceNameDisplay}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{voiceDetails}</span>
                  </div>
                  <div className="w-6 h-6 flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
                  </div>
                </button>
              </div>

              {/* Emotion Dropdown */}
              <div className="flex flex-col gap-2.5">
                <label className="text-sm font-bold text-gray-900 dark:text-gray-100">Emotion Style</label>
                <CustomDropdown value={emotion} onChange={setEmotion} />
              </div>

              {/* Speed Slider */}
              <div className="flex flex-col gap-2 mt-1">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-gray-900 dark:text-gray-100">Speed</label>
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{speed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
                />
              </div>

              {/* Pitch Slider */}
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-gray-900 dark:text-gray-100">Pitch</label>
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{pitch > 0 ? `+${pitch}` : pitch}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={pitch}
                  onChange={(e) => setPitch(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              <HistoryList pending={pending} />
            </div>
          )}
        </div>
      </form>

      {/* Voice Selection Modal */}
      <VoiceModal 
        isOpen={isVoiceModalOpen} 
        onClose={() => setIsVoiceModalOpen(false)} 
        selectedVoice={voiceShortName}
        onSelect={handleVoiceSelect}
      />

      {/* Pronunciation Dictionary Modal */}
      <PronunciationModal
        isOpen={isPronunciationOpen}
        onClose={() => setIsPronunciationOpen(false)}
      />
    </>
  );
}
