'use client';

import { useEffect, useState } from 'react';
import { VoiceOption } from '@/types/tts';
import { Search, Globe2, Loader2, ChevronDown } from 'lucide-react';

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
}

export default function VoiceSelector({ selectedVoice, onVoiceChange }: VoiceSelectorProps) {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    async function loadVoices() {
      try {
        const res = await fetch('/api/tts');
        const data = await res.json();
        if (data.success) {
          const options: VoiceOption[] = data.voices.map((v: any) => ({
            value: v.ShortName,
            label: v.FriendlyName,
            locale: v.Locale,
            gender: v.Gender,
          }));
          setVoices(options);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadVoices();
  }, []);

  const filtered = voices.filter(
    (v) =>
      v.label.toLowerCase().includes(filter.toLowerCase()) ||
      v.locale.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-indigo-400" />
          Voice Profile
        </label>
        {!loading && (
          <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded text-gray-400">
            {filtered.length} available
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search language or name..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            disabled={loading}
            className="w-full bg-black/40 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 border border-white/5 disabled:opacity-50 transition-colors"
          />
        </div>

        <div className="relative group">
          {loading ? (
            <div className="w-full bg-black/40 rounded-xl py-3 px-4 border border-white/5 flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading library...
            </div>
          ) : (
            <select
              value={selectedVoice}
              onChange={(e) => onVoiceChange(e.target.value)}
              className="w-full appearance-none bg-black/40 hover:bg-black/60 rounded-xl py-3 pl-4 pr-10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 border border-white/5 cursor-pointer transition-colors"
            >
              {filtered.map((v) => (
                <option key={v.value} value={v.value} className="bg-gray-900 text-white">
                  {v.label}
                </option>
              ))}
            </select>
          )}
          {!loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 group-hover:text-indigo-400 transition-colors">
              <ChevronDown className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
