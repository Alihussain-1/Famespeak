'use client';

import { useState, useEffect, useRef } from 'react';
import { VoiceOption } from '@/types/tts';
import { Search, X, Play, SlidersHorizontal, Star, RotateCw, Filter, Sparkles, Cpu } from 'lucide-react';
import { KOKORO_VOICES, generateKokoroAudio } from '@/lib/kokoro-engine';
import { PIPER_VOICES, generatePiperAudio } from '@/lib/piper-engine';
import { getFavorites, toggleFavoriteVoice } from '@/lib/storage';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoice: string;
  onSelect: (voiceShortName: string, fullVoiceInfo: VoiceOption) => void;
}

type EngineTab = 'edge' | 'kokoro' | 'piper';

export default function VoiceModal({ isOpen, onClose, selectedVoice, onSelect }: VoiceModalProps) {
  const [activeEngine, setActiveEngine] = useState<EngineTab>('edge');
  const [edgeVoices, setEdgeVoices] = useState<VoiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [showFilters, setShowFilters] = useState(false);
  const [genderFilter, setGenderFilter] = useState('All');
  const [languageFilter, setLanguageFilter] = useState('All');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Preview state
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load favorites from IndexedDB
  useEffect(() => {
    if (isOpen) {
      getFavorites().then(setFavorites);
    }
  }, [isOpen]);

  const handleToggleFavorite = async (voiceId: string) => {
    const updated = await toggleFavoriteVoice(voiceId);
    setFavorites(updated);
  };

  const clearFilters = () => {
    setSearch('');
    setGenderFilter('All');
    setLanguageFilter('All');
    setShowFavoritesOnly(false);
  };

  const handlePreview = async (voice: VoiceOption) => {
    if (audioRef.current) {
      audioRef.current.pause();
      if (previewingVoice === voice.value) {
        setPreviewingVoice(null);
        return;
      }
    }

    setLoadingPreview(voice.value);
    setPreviewingVoice(null);

    try {
      if (voice.engine === 'kokoro') {
        const { audioUrl } = await generateKokoroAudio(
          `Hi, this is ${voice.label} using Kokoro AI.`,
          voice.value,
          1.0
        );
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onended = () => setPreviewingVoice(null);
        audio.play();
        setPreviewingVoice(voice.value);
      } else if (voice.engine === 'piper') {
        const { audioUrl } = await generatePiperAudio(
          `Hello, this is ${voice.label} powered by Piper.`,
          voice.value
        );
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onended = () => setPreviewingVoice(null);
        audio.play();
        setPreviewingVoice(voice.value);
      } else {
        // Edge Cloud TTS preview
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `Hi, I am ${voice.label.split('-')[0]}, this is a preview of my voice.`,
            voice: voice.value,
            rate: '+0%',
            pitch: '+0Hz',
            volume: '+0%',
          }),
        });

        const data = await res.json();
        if (data.success && data.audioUrl) {
          const audio = new Audio(data.audioUrl);
          audioRef.current = audio;
          audio.onended = () => setPreviewingVoice(null);
          audio.play();
          setPreviewingVoice(voice.value);
        }
      }
    } catch (err) {
      console.error('Preview failed', err);
    } finally {
      setLoadingPreview(null);
    }
  };

  const fetchEdgeVoices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tts');
      const data = await res.json();
      if (data.success) {
        const formatted: VoiceOption[] = data.voices.map((v: any) => ({
          value: v.ShortName,
          label: v.LocalName || v.DisplayName || v.ShortName.split('-')[2],
          locale: v.Locale,
          localeName: v.LocaleName || '',
          gender: v.Gender,
          engine: 'edge',
        }));
        setEdgeVoices(formatted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (edgeVoices.length === 0) {
      fetchEdgeVoices();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Format Kokoro voices as VoiceOptions
  const kokoroVoiceOptions: VoiceOption[] = KOKORO_VOICES.map(k => ({
    value: k.id,
    label: k.name,
    locale: k.language,
    localeName: k.language,
    gender: k.gender,
    engine: 'kokoro',
  }));

  // Format Piper voices as VoiceOptions
  const piperVoiceOptions: VoiceOption[] = PIPER_VOICES.map(p => ({
    value: p.id,
    label: p.name,
    locale: p.language,
    localeName: p.language,
    gender: p.gender,
    engine: 'piper',
  }));

  const currentVoicesPool =
    activeEngine === 'edge'
      ? edgeVoices
      : activeEngine === 'kokoro'
      ? kokoroVoiceOptions
      : piperVoiceOptions;

  const parseLocaleName = (localeName: string) => {
    const parts = localeName.split('(');
    const lang = parts[0]?.trim() || 'Unknown';
    const country = parts[1]?.replace(')', '')?.trim() || 'Global';
    return { lang, country };
  };

  const uniqueLanguages = Array.from(new Set(currentVoicesPool.map(v => parseLocaleName(v.localeName || '').lang))).filter(Boolean).sort();

  const filteredVoices = currentVoicesPool.filter(v => {
    const { lang } = parseLocaleName(v.localeName || '');
    const matchesSearch = v.label.toLowerCase().includes(search.toLowerCase()) || 
                          v.locale.toLowerCase().includes(search.toLowerCase()) ||
                          (v.localeName && v.localeName.toLowerCase().includes(search.toLowerCase()));
    const matchesGender = genderFilter === 'All' || v.gender === genderFilter;
    const matchesLanguage = languageFilter === 'All' || lang === languageFilter;
    const matchesFavorites = showFavoritesOnly ? favorites.includes(v.value) : true;
    return matchesSearch && matchesGender && matchesLanguage && matchesFavorites;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Choose Voice</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Select between Edge cloud voices, in-browser Kokoro AI, or Piper WASM.</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Engine Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-6 bg-gray-50/50 dark:bg-[#141414]">
          <button
            type="button"
            onClick={() => { setActiveEngine('edge'); clearFilters(); }}
            className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeEngine === 'edge'
                ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Microsoft Edge
            <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              300+ Voices
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveEngine('kokoro'); clearFilters(); }}
            className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeEngine === 'kokoro'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 hover:text-orange-600 dark:hover:text-orange-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            Kokoro AI (Premium Browser)
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300">
              Studio Quality
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveEngine('piper'); clearFilters(); }}
            className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeEngine === 'piper'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-500" />
            Piper TTS (WASM)
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeEngine === 'edge' ? 'Edge' : activeEngine === 'kokoro' ? 'Kokoro AI' : 'Piper'} voices...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-gray-900 dark:focus:border-white"
              />
            </div>
            
            <button 
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-xl transition-colors ${
                showFilters 
                  ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white' 
                  : 'bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
            <button 
              type="button"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`flex items-center justify-center w-10 h-10 border rounded-xl transition-colors ${
                showFavoritesOnly 
                  ? 'bg-gray-900 border-gray-900 text-white dark:bg-white dark:border-white dark:text-black' 
                  : 'bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
              }`}
              title="Show Favorites"
            >
              <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
            </button>
            {activeEngine === 'edge' && (
              <button 
                type="button"
                onClick={() => fetchEdgeVoices()}
                className="flex items-center justify-center w-10 h-10 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-xl transition-colors"
                title="Reload Edge voices"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-4 p-4 border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#161616] rounded-xl">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Gender</label>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="w-full bg-white dark:bg-[#202020] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:outline-none"
                >
                  <option value="All">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              {uniqueLanguages.length > 1 && (
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500">Language</label>
                  <select
                    value={languageFilter}
                    onChange={(e) => setLanguageFilter(e.target.value)}
                    className="w-full bg-white dark:bg-[#202020] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:outline-none"
                  >
                    <option value="All">All Languages</option>
                    {uniqueLanguages.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-400 pb-1">
            <span className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              Showing {filteredVoices.length} voices ({activeEngine.toUpperCase()})
            </span>
            {(genderFilter !== 'All' || languageFilter !== 'All' || search || showFavoritesOnly) && (
              <button 
                type="button"
                onClick={clearFilters}
                className="font-medium text-gray-700 dark:text-gray-300 hover:underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Voice List */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 bg-white dark:bg-[#111]">
          {loading && activeEngine === 'edge' && edgeVoices.length === 0 ? (
            <div className="flex justify-center py-16 text-gray-400">Loading voices...</div>
          ) : filteredVoices.length === 0 ? (
            <div className="flex justify-center py-16 text-gray-400">No voices match your search.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              {filteredVoices.map(voice => {
                const { lang, country } = parseLocaleName(voice.localeName || '');
                const isPlaying = previewingVoice === voice.value;
                const isLoadingPreview = loadingPreview === voice.value;
                const isFavorite = favorites.includes(voice.value);

                return (
                  <div
                    key={voice.value}
                    onClick={() => onSelect(voice.value, voice)}
                    className={`group flex items-center justify-between p-3.5 rounded-xl border border-transparent cursor-pointer transition-all ${
                      selectedVoice === voice.value 
                        ? 'bg-gray-100 dark:bg-gray-800/80 border-gray-300 dark:border-gray-600' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-100 dark:hover:border-gray-800'
                    }`}
                  >
                    <div className="flex flex-col overflow-hidden pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">{voice.label}</span>
                        {voice.engine === 'kokoro' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400">AI</span>
                        )}
                        {voice.engine === 'piper' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">WASM</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {lang} {country !== 'Global' ? `• ${country}` : ''} • {voice.gender}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        type="button"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handlePreview(voice); 
                        }}
                        className={`p-2 rounded-lg transition-colors ${
                          isPlaying || isLoadingPreview 
                            ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400' 
                            : 'text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                        title="Preview voice"
                      >
                        {isLoadingPreview ? (
                          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        )}
                      </button>

                      <button 
                        type="button"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleToggleFavorite(voice.value); 
                        }}
                        className={`p-2 rounded-lg transition-colors ${
                          isFavorite 
                            ? 'text-amber-500' 
                            : 'text-gray-300 dark:text-gray-600 hover:text-gray-900 dark:hover:text-white'
                        }`}
                        title="Favorite"
                      >
                        <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current text-amber-500' : ''}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
