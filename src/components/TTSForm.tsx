'use client';

import { useState, useRef } from 'react';
import VoiceModal from '@/components/VoiceModal';
import CustomDropdown from '@/components/CustomDropdown';
import { VoiceOption } from '@/types/tts';
import { ArrowRight, Loader2, Sparkles, BookA, Clock } from 'lucide-react';
import HistoryList, { PendingGeneration } from '@/components/HistoryList';
import PronunciationModal, { getLocalPronunciations, applyPronunciations } from '@/components/PronunciationModal';
import { generateKokoroAudio } from '@/lib/kokoro-engine';
import { generatePiperAudio } from '@/lib/piper-engine';

export default function TTSForm() {
  const [text, setText] = useState('');
  const [voiceShortName, setVoiceShortName] = useState('en-US-AriaNeural');
  const [voiceNameDisplay, setVoiceNameDisplay] = useState('Aria Multilingual');
  const [voiceDetails, setVoiceDetails] = useState('English - United States - Female');
  const [selectedVoiceObj, setSelectedVoiceObj] = useState<VoiceOption>({
    value: 'en-US-AriaNeural',
    label: 'Aria Multilingual',
    locale: 'en-US',
    localeName: 'English (United States)',
    gender: 'Female',
    engine: 'edge',
  });
  
  const [emotion, setEmotion] = useState('neutral');
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(0);
  
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isPronunciationOpen, setIsPronunciationOpen] = useState(false);

  // Loading and Pending state for History
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingGeneration | null>(null);

  const [activeRightTab, setActiveRightTab] = useState<'settings' | 'history'>('settings');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || loading) return;
    
    setLoading(true);
    setActiveRightTab('history');
    setPending({
      text: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
      voiceName: voiceNameDisplay,
      progress: 25,
      statusText: 'Generating audio...',
    });

    try {
      // Apply Pronunciation replacements if configured
      const rules = getLocalPronunciations();
      const processedScript = applyPronunciations(text, rules);

      let audioUrl = '';
      let srt = '';

      if (selectedVoiceObj.engine === 'kokoro') {
        const res = await generateKokoroAudio(processedScript, selectedVoiceObj.value, speed, (pct, status) => {
          setPending(prev => prev ? { ...prev, progress: pct, statusText: status } : null);
        });
        audioUrl = res.audioUrl;
      } else if (selectedVoiceObj.engine === 'piper') {
        const res = await generatePiperAudio(processedScript, selectedVoiceObj.value, (pct, status) => {
          setPending(prev => prev ? { ...prev, progress: pct, statusText: status } : null);
        });
        audioUrl = res.audioUrl;
      } else {
        // Direct Edge Cloud API call
        const ratePercent = Math.round((speed - 1) * 100);
        const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;
        const pitchStr = pitch >= 0 ? `+${pitch}Hz` : `${pitch}Hz`;

        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: processedScript,
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

        audioUrl = data.audioUrl;
        srt = data.srt || '';
      }

      // Save directly to localStorage
      const newHistoryItem = {
        id: Date.now().toString(),
        title: 'Generated Audio',
        text: text,
        voiceName: voiceNameDisplay,
        audioUrl: audioUrl,
        srt: srt,
        date: new Date().toISOString(),
        engine: selectedVoiceObj.engine,
      };

      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('tts_history');
          const historyList = saved ? JSON.parse(saved) : [];
          localStorage.setItem('tts_history', JSON.stringify([newHistoryItem, ...historyList]));
        } catch (storageErr) {
          console.warn('Storage full or error:', storageErr);
        }
      }

      window.dispatchEvent(new Event('tts_history_updated'));
    } catch (err: any) {
      console.error('Generation failed:', err);
      alert(err.message || 'Generation failed. Please try again.');
    } finally {
      setLoading(false);
      setPending(null);
    }
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

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row w-full flex-1">
        
        {/* LEFT PANEL: Script Input */}
        <div className="lg:w-[65%] flex flex-col justify-between border-r border-gray-100 dark:border-gray-800 p-6 lg:p-10 lg:pr-14">
          <div className="flex-1 flex flex-col">
            
            {/* Script Toolbar */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => insertTextAtCursor(' ... ')}
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#161616] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors"
                  title="Insert a natural pause"
                >
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  + Pause (...)
                </button>

                <button
                  type="button"
                  onClick={() => setIsPronunciationOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#161616] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors"
                  title="Custom word pronunciations"
                >
                  <BookA className="w-3.5 h-3.5 text-emerald-500" />
                  Pronunciations
                </button>
              </div>
            </div>

            {/* Main Textarea */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write or paste your script here..."
              className="w-full flex-grow text-gray-800 dark:text-gray-100 text-xl lg:text-2xl resize-none placeholder-gray-400 dark:placeholder-gray-600 bg-transparent focus:outline-none min-h-[350px] leading-relaxed"
              required
            />
          </div>

          {/* Bottom Bar inside Left Column */}
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-400 dark:text-gray-500 font-mono">
                {text.length} characters
              </span>
              {selectedVoiceObj.engine && selectedVoiceObj.engine !== 'edge' && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  {selectedVoiceObj.engine} engine
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
                <><Sparkles className="w-4 h-4" /> Generate Audio</>
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
              className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
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
              className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
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
                  <label className="text-sm font-bold text-gray-900 dark:text-gray-100">Default Voice</label>
                  <button
                    type="button"
                    onClick={() => setIsVoiceModalOpen(true)}
                    className="text-xs font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3"/> Switch Engine
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVoiceModalOpen(true)}
                  className="group flex items-center justify-between bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-xl p-4 shadow-sm transition-all text-left"
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
