'use client';

import { useState } from 'react';
import VoiceModal from '@/components/VoiceModal';
import CustomDropdown from '@/components/CustomDropdown';
import { VoiceOption } from '@/types/tts';
import { ArrowRight, Settings2, Loader2, Play, Sparkles } from 'lucide-react';
import HistoryList from '@/components/HistoryList';

export default function TTSForm() {
  const [text, setText] = useState('');
  const [voiceShortName, setVoiceShortName] = useState('en-US-AriaNeural');
  const [voiceNameDisplay, setVoiceNameDisplay] = useState('Aria Multilingual');
  const [voiceDetails, setVoiceDetails] = useState('English - United States - Female');
  
  const [emotion, setEmotion] = useState('neutral');
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(0);
  
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [activeRightTab, setActiveRightTab] = useState<'settings' | 'history'>('settings');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    setLoading(true);
    setProgress(0);
    setActiveRightTab('history');

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 400);

    const ratePercent = Math.round((speed - 1) * 100);
    const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;
    const pitchStr = pitch >= 0 ? `+${pitch}Hz` : `${pitch}Hz`;

    const payload = { 
      text, 
      voice: voiceShortName, 
      rate: rateStr, 
      pitch: pitchStr,
      volume: '+0%',
      style: emotion
    };

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      
      clearInterval(progressInterval);
      setProgress(100);

      if (data.success && data.audioUrl) {
        const newHistoryItem = {
          id: Date.now().toString(),
          title: `Generated Audio`,
          text: text,
          voiceName: voiceNameDisplay,
          audioUrl: data.audioUrl,
          srt: data.srt || '',
          date: new Date().toISOString()
        };
        const saved = localStorage.getItem('tts_history');
        const historyList = saved ? JSON.parse(saved) : [];
        localStorage.setItem('tts_history', JSON.stringify([newHistoryItem, ...historyList]));
        window.dispatchEvent(new Event("storage"));
      } else {
        alert(data.error || 'Failed to generate audio.');
      }
    } catch (err) {
      clearInterval(progressInterval);
      setProgress(0);
      alert('Network error. Please check your connection.');
    } finally {
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 500);
    }
  };

  const handleVoiceSelect = (shortName: string, info: VoiceOption) => {
    setVoiceShortName(shortName);
    setVoiceNameDisplay(info.label);
    
    const parts = (info.localeName || '').split('(');
    const lang = parts[0]?.trim() || 'Unknown';
    const country = parts[1]?.replace(')', '')?.trim() || 'Unknown';
    setVoiceDetails(`${lang} - ${country} - ${info.gender}`);
    
    setIsVoiceModalOpen(false);
  };

  const historyKey = loading ? 'loading' : 'idle';

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row w-full flex-1">
        
        {/* LEFT PANEL: Script Input */}
        <div className="lg:w-[65%] flex flex-col justify-between border-r border-gray-100 dark:border-gray-800 p-6 lg:p-12 lg:pr-16">
          <div className="flex-1 flex flex-col">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write or paste your script..."
              className="w-full flex-grow text-gray-800 dark:text-gray-100 text-xl lg:text-2xl resize-none placeholder-gray-400 dark:placeholder-gray-600 bg-transparent focus:outline-none min-h-[350px] leading-relaxed"
              required
            />
          </div>

          <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
            <span className="text-sm font-medium text-gray-400 dark:text-gray-500">
              {text.length} characters
            </span>
            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white dark:text-gray-900 disabled:opacity-40 text-white font-medium px-6 py-2.5 rounded-xl transition-all shadow-sm text-sm cursor-pointer"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate</>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: Settings & History */}
        <div className="lg:w-[35%] flex flex-col p-6 lg:p-8 lg:pl-10 h-full overflow-y-auto">
          
          <div className="flex border-b border-gray-200 dark:border-gray-800 mb-8">
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
            <div className="flex flex-col gap-8">
              {/* Voice Selector */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-gray-900 dark:text-gray-100">Voice</label>
                  <span className="text-xs font-semibold text-orange-500 flex items-center gap-1 cursor-pointer"><Sparkles className="w-3 h-3"/> Try Premium</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVoiceModalOpen(true)}
                  className="group flex items-center justify-between bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-xl p-4 shadow-sm transition-all text-left"
                >
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-bold text-gray-900 dark:text-gray-100 text-base truncate">{voiceNameDisplay}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{voiceDetails}</span>
                  </div>
                  <div className="w-6 h-6 flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
                  </div>
                </button>
              </div>

              {/* Emotion */}
              <div className="flex flex-col gap-3">
                <label className="text-sm font-bold text-gray-900 dark:text-gray-100">Emotion</label>
                <CustomDropdown value={emotion} onChange={setEmotion} />
              </div>

              {/* Speed */}
              <div className="flex flex-col gap-3 mt-2">
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

              {/* Pitch */}
              <div className="flex flex-col gap-3 mt-4">
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
            <div className="flex-1">
              <HistoryList 
                key={historyKey} 
                pending={loading ? { progress, text, voiceName: voiceNameDisplay } : null} 
              />
            </div>
          )}
        </div>
      </form>

      <VoiceModal 
        isOpen={isVoiceModalOpen} 
        onClose={() => setIsVoiceModalOpen(false)} 
        selectedVoice={voiceShortName}
        onSelect={handleVoiceSelect}
      />
    </>
  );
}
