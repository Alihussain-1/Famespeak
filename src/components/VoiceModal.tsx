'use client';

import { useState, useEffect, useRef } from 'react';
import { VoiceOption } from '@/types/tts';
import { Search, X, Play, SlidersHorizontal, Star, RotateCw, Filter } from 'lucide-react';

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
  
  const [showFilters, setShowFilters] = useState(true);
  const [genderFilter, setGenderFilter] = useState('All');
  const [languageFilter, setLanguageFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Preview state
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load favorites on mount
  useEffect(() => {
    const savedFavs = localStorage.getItem('tts_favorites');
    if (savedFavs) {
      try { setFavorites(JSON.parse(savedFavs)); } catch (e) {}
    }
  }, []);

  const toggleFavorite = (voiceId: string) => {
    let newFavs;
    if (favorites.includes(voiceId)) {
      newFavs = favorites.filter(id => id !== voiceId);
    } else {
      newFavs = [...favorites, voiceId];
    }
    setFavorites(newFavs);
    localStorage.setItem('tts_favorites', JSON.stringify(newFavs));
  };

  const clearFilters = () => {
    setSearch('');
    setGenderFilter('All');
    setLanguageFilter('All');
    setCountryFilter('All');
    setShowFavoritesOnly(false);
  };

  const activeFilterCount = (genderFilter !== 'All' ? 1 : 0) + (languageFilter !== 'All' ? 1 : 0) + (countryFilter !== 'All' ? 1 : 0);

  const handlePreview = async (voice: VoiceOption) => {
    // If playing, stop it
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
    } catch (err) {
      console.error('Preview failed', err);
    } finally {
      setLoadingPreview(null);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    
    async function fetchVoices() {
      if (voices.length > 0) return;
      try {
        const res = await fetch('/api/tts');
        const data = await res.json();
        if (data.success) {
          const formatted = data.voices.map((v: any) => ({
            value: v.ShortName,
            label: v.LocalName || v.DisplayName || v.ShortName.split('-')[2], // Get cleaner name
            locale: v.Locale,
            localeName: v.LocaleName || '', // e.g., "English (United States)"
            gender: v.Gender,
          }));
          setVoices(formatted);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchVoices();
  }, [isOpen, voices.length]);

  if (!isOpen) return null;

  // Helper to parse language and country from "Language (Country)"
  const parseLocaleName = (localeName: string) => {
    const parts = localeName.split('(');
    const lang = parts[0]?.trim() || 'Unknown';
    const country = parts[1]?.replace(')', '')?.trim() || 'Unknown';
    return { lang, country };
  };

  // Build unique filter lists
  const uniqueLanguages = Array.from(new Set(voices.map(v => parseLocaleName(v.localeName || '').lang))).filter(Boolean).sort();
  const uniqueCountries = Array.from(new Set(voices.map(v => parseLocaleName(v.localeName || '').country))).filter(Boolean).sort();

  const filteredVoices = voices.filter(v => {
    const { lang, country } = parseLocaleName(v.localeName || '');
    
    const matchesSearch = v.label.toLowerCase().includes(search.toLowerCase()) || 
                          v.locale.toLowerCase().includes(search.toLowerCase()) ||
                          (v.localeName && v.localeName.toLowerCase().includes(search.toLowerCase()));
                          
    const matchesGender = genderFilter === 'All' || v.gender === genderFilter;
    const matchesLanguage = languageFilter === 'All' || lang === languageFilter;
    const matchesCountry = countryFilter === 'All' || country === countryFilter;
    const matchesFavorites = showFavoritesOnly ? favorites.includes(v.value) : true;
    
    return matchesSearch && matchesGender && matchesLanguage && matchesCountry && matchesFavorites;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-gray-900">Select free voice</h2>
            <p className="text-sm text-gray-500">Search, filter, and choose a voice for this generation.</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar (Search & Buttons) */}
        <div className="px-6 pb-4 flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search voices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>
            
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg transition-colors ${showFilters ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters {activeFilterCount > 0 && <span className="text-xs">({activeFilterCount})</span>}
            </button>
            <button 
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`flex items-center justify-center w-10 h-10 border rounded-lg transition-colors ${showFavoritesOnly ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current text-white' : ''}`} />
            </button>
            <button 
              onClick={() => { fetchVoices(); }}
              className="flex items-center justify-center w-10 h-10 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-4 p-4 border border-gray-100 bg-gray-50/50 rounded-xl">
              
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Gender</label>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-gray-300 shadow-sm appearance-none cursor-pointer"
                >
                  <option value="All">All</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Language</label>
                <select
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-gray-300 shadow-sm appearance-none cursor-pointer"
                >
                  <option value="All">All</option>
                  {uniqueLanguages.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Country</label>
                <select
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-gray-300 shadow-sm appearance-none cursor-pointer"
                >
                  <option value="All">All</option>
                  {uniqueCountries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
              
            </div>
          )}

          {/* Results Info */}
          <div className="flex items-center justify-between pt-2 text-xs text-gray-500 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5" />
              Showing {filteredVoices.length} of {voices.length} free voices
            </div>
            {(activeFilterCount > 0 || search || showFavoritesOnly) && (
              <button 
                onClick={clearFilters}
                className="font-medium text-gray-800 hover:text-black transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Voice List Grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 bg-white">
          {loading ? (
            <div className="flex justify-center py-12 text-gray-400">Loading library...</div>
          ) : filteredVoices.length === 0 ? (
            <div className="flex justify-center py-12 text-gray-400">No voices match your filters.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              {filteredVoices.map(voice => {
                const { lang, country } = parseLocaleName(voice.localeName || '');
                const isPlaying = previewingVoice === voice.value;
                const isLoadingPreview = loadingPreview === voice.value;
                const isFavorite = favorites.includes(voice.value);

                return (
                  <div
                    key={voice.value}
                    onClick={() => onSelect(voice.value, voice)}
                    className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedVoice === voice.value ? 'bg-gray-50' : 'hover:bg-gray-50/80'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900 text-[15px]">{voice.label}</span>
                      <span className="text-xs text-gray-400 mt-0.5">{lang} - {country} - {voice.gender}</span>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handlePreview(voice); 
                        }}
                        className={`p-2 rounded-md transition-colors ${isPlaying || isLoadingPreview ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
                      >
                        {isLoadingPreview ? (
                           <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                           <Play className="w-4 h-4 fill-current" />
                        )}
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          toggleFavorite(voice.value);
                        }}
                        className={`p-2 rounded-md transition-colors ${isFavorite ? 'text-gray-900' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-200'}`}
                      >
                        <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
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
