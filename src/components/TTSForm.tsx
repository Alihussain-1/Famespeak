'use client';

import { useState } from 'react';
import VoiceModal from '@/components/VoiceModal';
import CustomDropdown from '@/components/CustomDropdown';
import { VoiceOption } from '@/types/tts';
import { ArrowRight, Settings2, Loader2, Play } from 'lucide-react';
import { HistoryItem } from '@/components/HistoryList';

export default function TTSForm() {
  const [text, setText] = useState('');
  const [voiceShortName, setVoiceShortName] = useState('en-US-AriaNeural');
  const [voiceNameDisplay, setVoiceNameDisplay] = useState('Aria Multilingual');
  const [voiceDetails, setVoiceDetails] = useState('English (US) • Female');
  
  const [emotion, setEmotion] = useState('neutral');
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(0);
  
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [activeRightTab, setActiveRightTab] = useState<'settings' | 'history'>('settings');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    setLoading(true);

    // Convert speed (0.5 to 2.0) to edge-tts rate format (e.g., +20%, -10%)
    const ratePercent = Math.round((speed - 1) * 100);
    const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

    // Convert pitch (-50 to +50) to edge-tts format
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

      if (data.success && data.audioUrl) {
        // Save to History
        const newHistoryItem = {
          id: Date.now().toString(),
          title: `Generated Audio (${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`,
          text: text,
          voiceName: voiceNameDisplay,
          audioUrl: data.audioUrl,
          date: new Date().toISOString()
        };
        const saved = localStorage.getItem('tts_history');
        const historyList = saved ? JSON.parse(saved) : [];
        localStorage.setItem('tts_history', JSON.stringify([newHistoryItem, ...historyList]));

        // Switch to history tab after generation
        setActiveRightTab('history');

        // Play audio immediately
        const audio = new Audio(data.audioUrl);
        audio.play();
      } else {
        alert(data.error || 'Failed to generate audio.');
      }
    } catch (err) {
      alert('Network error. Please check your connection.');
    } finally {
      setLoading(false);
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

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl mx-auto">
        
        {/* LEFT PANEL: Script Input (66%) */}
        <div className="lg:w-2/3 flex flex-col">
          <div className="relative flex-grow flex flex-col bg-white border border-gray-200 rounded-2xl shadow-sm p-2">
            <div className="flex justify-end px-4 pt-3 pb-1">
              <span className="text-xs text-gray-400 font-medium tracking-wide">
                {text.length} characters
              </span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Start typing your script here..."
              className="w-full flex-grow p-4 text-gray-800 text-lg resize-none placeholder-gray-300 focus:outline-none min-h-[400px]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="mt-6 w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white font-semibold text-lg py-4 rounded-xl transition-colors shadow-sm"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Synthesizing...</>
            ) : (
              'Generate Audio'
            )}
          </button>
        </div>

        {/* RIGHT PANEL: Tabs & Content (33%) */}
        <div className="lg:w-1/3 flex flex-col gap-6">
          
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setActiveRightTab('settings')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeRightTab === 'settings' 
                  ? 'border-gray-900 text-gray-900' 
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              Settings
            </button>
            <button
              type="button"
              onClick={() => setActiveRightTab('history')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeRightTab === 'history' 
                  ? 'border-gray-900 text-gray-900' 
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              History
            </button>
          </div>

          {activeRightTab === 'settings' ? (
            <>
              {/* Voice Selector Card */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-gray-400" />
                  Voice Model
                </label>
                <button
                  type="button"
                  onClick={() => setIsVoiceModalOpen(true)}
                  className="group flex items-center justify-between bg-white border border-gray-200 hover:border-gray-300 rounded-xl p-4 shadow-sm transition-all text-left"
                >
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-bold text-gray-900 text-base truncate">{voiceNameDisplay}</span>
                    <span className="text-sm text-gray-500 mt-0.5">{voiceDetails}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-gray-100 flex items-center justify-center transition-colors">
                    <ArrowRight className="w-4 h-4 text-gray-600" />
                  </div>
                </button>
              </div>

              {/* Emotion Dropdown */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-900">Emotion Style</label>
                <CustomDropdown value={emotion} onChange={setEmotion} />
              </div>

              {/* Speed Slider */}
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-gray-900">Speed</label>
                  <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded">{speed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
                />
              </div>

              {/* Pitch Slider */}
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-gray-900">Pitch</label>
                  <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded">{pitch > 0 ? `+${pitch}` : pitch}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={pitch}
                  onChange={(e) => setPitch(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
                />
              </div>
            </>
          ) : (
            <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <HistoryList />
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
