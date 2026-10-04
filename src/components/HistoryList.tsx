'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Edit2, Check, Loader2, Download, FileAudio, FileText, Activity, Trash2 } from 'lucide-react';
import WaveformPlayer from './WaveformPlayer';

export interface HistoryItem {
  id: string;
  title?: string;
  text: string;
  voiceName: string;
  audioUrl: string;
  srt?: string;
  date: string;
  duration?: number;
  engine?: string;
}

export interface PendingGeneration {
  progress?: number;
  text: string;
  voiceName: string;
  statusText?: string;
}

function safeFileName(name: string) {
  return (name || 'generated-audio').replace(/[\\/:*?"<>|]+/g, '').trim().replace(/\s+/g, '_') || 'generated-audio';
}

function triggerDownload(href: string, fileName: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

interface HistoryListProps {
  pending?: PendingGeneration | null;
}

export default function HistoryList({ pending }: HistoryListProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [activeWaveformId, setActiveWaveformId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadItems = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('tts_history');
      if (saved) {
        const items = JSON.parse(saved);
        if (Array.isArray(items)) {
          setHistory(items);
          if (!activeWaveformId && items.length > 0) {
            setActiveWaveformId(items[0].id);
          }
          return;
        }
      }
    } catch (e) {}
    setHistory([]);
  }, [activeWaveformId]);

  useEffect(() => {
    loadItems();

    const handleStorage = () => loadItems();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('tts_history_updated', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('tts_history_updated', handleStorage);
    };
  }, [loadItems]);

  useEffect(() => {
    if (!pending) {
      loadItems();
    }
  }, [pending, loadItems]);

  useEffect(() => {
    if (!menuId) return;
    const close = () => setMenuId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menuId]);

  const playAudio = (id: string, url: string) => {
    setActiveWaveformId(id);

    if (audioRef.current && playingId === id) {
      audioRef.current.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    
    audio.play();
    setPlayingId(id);
    audio.onended = () => setPlayingId(null);
  };

  const handleClearHistory = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
    setActiveWaveformId(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tts_history');
    }
    setHistory([]);
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingId === id && audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
    }
    if (activeWaveformId === id) {
      setActiveWaveformId(null);
    }
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tts_history', JSON.stringify(updated));
    }
  };

  const saveTitle = (id: string) => {
    const updated = history.map(item => item.id === id ? { ...item, title: editTitle } : item);
    setHistory(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tts_history', JSON.stringify(updated));
    }
    setEditingId(null);
  };

  const startEdit = (item: HistoryItem) => {
    setEditingId(item.id);
    setEditTitle(item.title || 'Generated Audio');
  };

  const downloadAudio = (item: HistoryItem) => {
    triggerDownload(item.audioUrl, `${safeFileName(item.title || 'Generated Audio')}.mp3`);
    setMenuId(null);
  };

  const downloadSrt = (item: HistoryItem) => {
    if (!item.srt) return;
    const blob = new Blob([item.srt], { type: 'application/x-subrip;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${safeFileName(item.title || 'Generated Audio')}.srt`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMenuId(null);
  };

  const downloadBoth = (item: HistoryItem) => {
    downloadAudio(item);
    if (item.srt) setTimeout(() => downloadSrt(item), 300);
  };

  const activeWaveformItem = history.find(h => h.id === activeWaveformId);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Active Waveform Player */}
      {activeWaveformItem && (
        <div className="shrink-0 animate-in fade-in duration-200">
          <WaveformPlayer
            key={activeWaveformItem.id}
            audioUrl={activeWaveformItem.audioUrl}
            srt={activeWaveformItem.srt}
            title={activeWaveformItem.title}
            voiceName={activeWaveformItem.voiceName}
          />
        </div>
      )}

      {/* History List Section */}
      <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">Generations</h2>
            <span className="text-xs text-gray-400 font-mono">({history.length})</span>
          </div>
          {history.length > 0 && (
            <button 
              type="button"
              onClick={handleClearHistory}
              className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {pending && (
            <div className="flex flex-col gap-2 p-4 bg-gray-50 dark:bg-[#161616] border border-gray-200 dark:border-gray-700 rounded-xl animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-700 dark:text-gray-300" />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    {pending.statusText || 'Generating Audio...'}
                  </h3>
                </div>
                {typeof pending.progress === 'number' && (
                  <span className="text-xs font-mono font-semibold text-gray-600 dark:text-gray-300">
                    {pending.progress}%
                  </span>
                )}
              </div>
              
              <p className="text-gray-500 dark:text-gray-400 text-xs line-clamp-2 leading-relaxed mt-0.5">{pending.text}</p>
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <span>{pending.voiceName}</span>
              </div>
            </div>
          )}

          {history.length === 0 && !pending ? (
            <div className="flex flex-col items-center justify-center p-12 text-gray-400 text-center">
              <p className="text-sm">Generated scripts will appear here.</p>
            </div>
          ) : (
            history.map((item) => {
              const isSelected = activeWaveformId === item.id;
              return (
                <div 
                  key={item.id}
                  onClick={() => setActiveWaveformId(item.id)}
                  className={`flex flex-col gap-2 p-3.5 rounded-xl border cursor-pointer transition-all group ${
                    isSelected 
                      ? 'bg-gray-50 dark:bg-[#181818] border-gray-300 dark:border-gray-600 shadow-xs' 
                      : 'bg-white dark:bg-[#141414] border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    {editingId === item.id ? (
                      <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="flex-1 text-sm font-bold bg-white dark:bg-[#202020] border border-gray-300 dark:border-gray-700 rounded px-2 py-1 outline-none focus:border-gray-900"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && saveTitle(item.id)}
                        />
                        <button type="button" onClick={() => saveTitle(item.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1 overflow-hidden">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {item.title || 'Generated Audio'}
                        </h3>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); startEdit(item); }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-opacity"
                          title="Rename clip"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Download Menu */}
                      <div className="relative">
                        <button
                          type="button"
                          title="Download"
                          onClick={() => setMenuId(menuId === item.id ? null : item.id)}
                          className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#161616] hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-200 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {menuId === item.id && (
                          <div className="absolute right-0 top-10 z-30 w-52 bg-white dark:bg-[#181818] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-1.5 text-xs">
                            <button
                              type="button"
                              onClick={() => downloadAudio(item)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-left font-medium"
                            >
                              <FileAudio className="w-3.5 h-3.5 text-gray-500" />
                              Audio (.mp3)
                            </button>
                            <button
                              type="button"
                              disabled={!item.srt}
                              onClick={() => downloadSrt(item)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-transparent text-left font-medium"
                            >
                              <FileText className="w-3.5 h-3.5 text-gray-500" />
                              Subtitles (.srt)
                            </button>
                            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                            <button
                              type="button"
                              disabled={!item.srt}
                              onClick={() => downloadBoth(item)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 text-left"
                            >
                              <Download className="w-3.5 h-3.5 text-gray-500" />
                              Audio + Subtitles
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Play / Stop */}
                      <button
                        type="button"
                        onClick={() => playAudio(item.id, item.audioUrl)}
                        className="w-8 h-8 rounded-full bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 flex items-center justify-center transition-colors cursor-pointer"
                        title={playingId === item.id ? 'Pause' : 'Play'}
                      >
                        {playingId === item.id ? (
                          <Square className="w-3 h-3 fill-current" />
                        ) : (
                          <Play className="w-3 h-3 ml-0.5 fill-current" />
                        )}
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-opacity"
                        title="Delete generation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-gray-500 dark:text-gray-400 text-xs line-clamp-2 leading-relaxed">{item.text}</p>
                  
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mt-0.5">
                    <div className="flex items-center gap-2">
                      <span>{new Date(item.date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{item.voiceName}</span>
                      {item.engine && (
                        <span className="uppercase text-[9px] font-bold px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                          {item.engine}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                        <Activity className="w-3 h-3" /> Playing above
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
