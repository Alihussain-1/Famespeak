'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Square, Edit2, Check, Loader2, Download, FileAudio, FileText } from 'lucide-react';

export interface HistoryItem {
  id: string;
  title?: string;
  text: string;
  voiceName: string;
  audioUrl: string;
  srt?: string;
  date: string;
}

export interface PendingGeneration {
  progress: number;
  text: string;
  voiceName: string;
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

export default function HistoryList({ pending }: { pending?: PendingGeneration | null }) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Close the download menu when clicking anywhere else
  useEffect(() => {
    if (!menuId) return;
    const close = () => setMenuId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menuId]);

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

  useEffect(() => {
    const saved = localStorage.getItem('tts_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const playAudio = (id: string, url: string) => {
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

  const clearHistory = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
    localStorage.removeItem('tts_history');
    setHistory([]);
  };

  const saveTitle = (id: string) => {
    const newHistory = history.map(item => 
      item.id === id ? { ...item, title: editTitle } : item
    );
    setHistory(newHistory);
    localStorage.setItem('tts_history', JSON.stringify(newHistory));
    setEditingId(null);
  };

  const startEdit = (item: HistoryItem) => {
    setEditingId(item.id);
    setEditTitle(item.title || 'Generated Audio');
  };

  if (history.length === 0 && !pending) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-400">
        <p className="text-sm">Generated scripts will appear here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px]">
      <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">Recent Generations</h2>
        <button 
          type="button"
          onClick={clearHistory}
          className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
        >
          Clear All
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {pending && (
          <div className="flex flex-col gap-2 p-3 bg-white dark:bg-[#111] border border-gray-100 dark:border-gray-800 rounded-lg group animate-pulse">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Generating Audio...</h3>
            </div>
            
            <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed mt-1">{pending.text}</p>
            <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-1">
              <span>{pending.voiceName}</span>
            </div>
          </div>
        )}

        {history.map((item) => (
          <div key={item.id} className="flex flex-col gap-2 p-3 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-lg hover:border-gray-200 dark:border-gray-700 transition-colors group">
            <div className="flex items-center justify-between gap-2">
              {editingId === item.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 text-sm font-bold bg-white dark:bg-[#111] border border-gray-300 dark:border-gray-700 rounded px-2 py-1 outline-none focus:border-gray-900"
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
                    onClick={() => startEdit(item)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-900 dark:text-white transition-opacity"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="relative">
                  <button
                    type="button"
                    title="Download"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuId(menuId === item.id ? null : item.id);
                    }}
                    className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {menuId === item.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-10 z-30 w-56 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-1.5"
                    >
                      <button
                        type="button"
                        onClick={() => downloadAudio(item)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
                      >
                        <FileAudio className="w-4 h-4 text-gray-500" />
                        Audio (.mp3)
                      </button>
                      <button
                        type="button"
                        disabled={!item.srt}
                        onClick={() => downloadSrt(item)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed text-left"
                      >
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="flex flex-col">
                          <span>Subtitles (.srt)</span>
                          {!item.srt && <span className="text-[10px] text-gray-400">Not available for older clips</span>}
                        </span>
                      </button>
                      <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                      <button
                        type="button"
                        disabled={!item.srt}
                        onClick={() => downloadBoth(item)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed text-left"
                      >
                        <Download className="w-4 h-4 text-gray-500" />
                        Audio + Subtitles
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => playAudio(item.id, item.audioUrl)}
                  className="w-8 h-8 rounded-full bg-gray-900 hover:bg-gray-800 flex items-center justify-center text-white transition-colors cursor-pointer"
                >
                  {playingId === item.id ? (
                    <Square className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
                  )}
                </button>
              </div>
            </div>
            
            <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed">{item.text}</p>
            
            <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-1">
              <span>{new Date(item.date).toLocaleDateString()}</span>
              <span>-</span>
              <span>{item.voiceName}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
