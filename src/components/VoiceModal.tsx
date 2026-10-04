'use client';

import { useState, useEffect, useRef } from 'react';
import { VoiceOption } from '@/types/tts';
import { Search, X, Play, Square, SlidersHorizontal, Star, RotateCw, Filter, Volume2 } from 'lucide-react';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoice: string;
  onSelect: (voiceShortName: string, fullVoiceInfo: VoiceOption) => void;
}

export default function VoiceModal({ isOpen, onClose, selectedVoice, onSelect }: VoiceModalProps) {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
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

  // Load favorites from localStorage
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tts_favorites');
        if (saved) setFavorites(JSON.parse(saved));
      } catch (e) {}
    }
  }, [isOpen]);

  const handleToggleFavorite = (voiceId: string) => {
    const updated = favorites.includes(voiceId)
      ? favorites.filter(id => id !== voiceId)
      : [...favorites, voiceId];
    setFavorites(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('tts_favorites', JSON.stringify(updated));
      } catch (e) {}
    }
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
      audioRef.current = null;
      if (previewingVoice === voice.value) {
        setPreviewingVoice(null);
        return;
      }
    }

    setLoadingPreview(voice.value);
    setPreviewingVoice(null);

    try {
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
        audio.onended = () => {
          setPreviewingVoice(null);
          audioRef.current = null;
        };
        audio.onerror = () => {
          setPreviewingVoice(null);
          audioRef.current = null;
        };
        await audio.play();
        setPreviewingVoice(voice.value);
      }
    } catch (err) {
      console.error('Preview failed:', err);
    } finally {
      setLoadingPreview(null);
    }
  };

  const fetchVoices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tts');
      const data = await res.json();
      if (data.success && Array.isArray(data.voices)) {
        const formatted: VoiceOption[] = data.voices.map((v: any) => ({
          value: v.ShortName,
          label: v.LocalName || v.DisplayName || v.ShortName.split('-')[2] || v.ShortName,
          locale: v.Locale,
          localeName: v.LocaleName || '',
          gender: v.Gender,
          engine: 'edge',
        }));
        setVoices(formatted);
      }
    } catch (err) {
      console.error('Failed to load voices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPreviewingVoice(null);
      setLoadingPreview(null);
      return;
    }
    if (voices.length === 0) {
      fetchVoices();
    }
  }, [isOpen, voices.length]);

  if (!isOpen) return null;

  const parseLocaleName = (localeName: string) => {
    const parts = localeName.split('(');
    const lang = parts[0]?.trim() || 'Unknown';
    const country = parts[1]?.replace(')', '')?.trim() || 'Global';
    return { lang, country };
  };

  const uniqueLanguages = Array.from(
    new Set(voices.map(v => parseLocaleName(v.localeName || '').lang))
  ).filter(Boolean).sort();

  const filteredVoices = voices.filter(v => {
    const { lang } = parseLocaleName(v.localeName || '');
    const matchesSearch =
      v.label.toLowerCase().includes(search.toLowerCase()) || 
      v.locale.toLowerCase().includes(search.toLowerCase()) ||
      (v.localeName && v.localeName.toLowerCase().includes(search.toLowerCase()));
    const matchesGender = genderFilter === 'All' || v.gender.toLowerCase() === genderFilter.toLowerCase();
    const matchesLanguage = languageFilter === 'All' || lang === languageFilter;
    const matchesFavorites = showFavoritesOnly ? favorites.includes(v.value) : true;
    return matchesSearch && matchesGender && matchesLanguage && matchesFavorites;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Choose Voice</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Over 300 natural AI voices across 50+ languages with instant 1-second preview
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3.5 flex flex-col gap-3 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/40 dark:bg-[#141414]">
          <div className="flex gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by voice name, language or accent..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-gray-900 dark:focus:border-white shadow-2xs"
              />
            </div>
            
            <button 
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border rounded-xl transition-colors cursor-pointer ${
                showFilters 
                  ? 'bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white' 
                  : 'bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
            </button>

            <button 
              type="button"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`flex items-center justify-center w-9 h-9 border rounded-xl transition-colors cursor-pointer ${
                showFavoritesOnly 
                  ? 'bg-gray-900 border-gray-900 text-white dark:bg-white dark:border-white dark:text-black' 
                  : 'bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
              }`}
              title="Show Favorites"
            >
              <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current text-amber-400 dark:text-amber-500' : ''}`} />
            </button>

            <button 
              type="button"
              onClick={() => fetchVoices()}
              className="flex items-center justify-center w-9 h-9 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] hover:bg-gray-50 transition-colors cursor-pointer"
              title="Reload voices"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-3 p-3.5 border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-[#181818] rounded-xl shadow-2xs">
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Gender</label>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="w-full bg-white dark:bg-[#202020] border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none"
                >
                  <option value="All">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              {uniqueLanguages.length > 1 && (
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Language</label>
                  <select
                    value={languageFilter}
                    onChange={(e) => setLanguageFilter(e.target.value)}
                    className="w-full bg-white dark:bg-[#202020] border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none"
                  >
                    <option value="All">All Languages ({uniqueLanguages.length})</option>
                    {uniqueLanguages.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-400 px-1">
            <span className="flex items-center gap-1.5">
              <Filter className="w-3 h-3" />
              Showing {filteredVoices.length} voices
            </span>
            {(genderFilter !== 'All' || languageFilter !== 'All' || search || showFavoritesOnly) && (
              <button 
                type="button"
                onClick={clearFilters}
                className="font-medium text-gray-700 dark:text-gray-300 hover:underline cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Voice List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white dark:bg-[#111]">
          {loading && voices.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
              Loading voices...
            </div>
          ) : filteredVoices.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
              No voices match your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredVoices.map(voice => {
                const { lang, country } = parseLocaleName(voice.localeName || '');
                const isPlaying = previewingVoice === voice.value;
                const isLoadingPreview = loadingPreview === voice.value;
                const isFavorite = favorites.includes(voice.value);
                const isSelected = selectedVoice === voice.value;

                return (
                  <div
                    key={voice.value}
                    onClick={() => onSelect(voice.value, voice)}
                    className={`group flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-gray-100 dark:bg-gray-800/90 border-gray-400 dark:border-gray-500 shadow-2xs' 
                        : 'border-gray-100 dark:border-gray-800/80 bg-gray-50/40 dark:bg-[#161616] hover:bg-gray-100/70 dark:hover:bg-gray-800/60 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    <div className="flex flex-col overflow-hidden pr-2">
                      <span className="font-semibold text-gray-900 dark:text-white text-xs truncate">
                        {voice.label}
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
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
                        className={`p-2 rounded-lg transition-colors cursor-pointer ${
                          isPlaying || isLoadingPreview 
                            ? 'bg-orange-500 text-white dark:bg-orange-500 dark:text-white' 
                            : 'text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                        title={isPlaying ? "Stop preview" : "Preview voice"}
                      >
                        {isLoadingPreview ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : isPlaying ? (
                          <Square className="w-3.5 h-3.5 fill-current" />
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
                        className={`p-2 rounded-lg transition-colors cursor-pointer ${
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
