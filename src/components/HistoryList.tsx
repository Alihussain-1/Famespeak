'use client';

import { useState, useEffect } from 'react';
import { Play, Calendar, Trash2 } from 'lucide-react';

export interface HistoryItem {
  id: string;
  text: string;
  voiceName: string;
  audioUrl: string;
  date: string;
}

export default function HistoryList() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);

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
    // If something is already playing, the browser handles it, 
    // but for UI sake we'll just open it or play it in a hidden audio tag.
    // For simplicity, we just use a native audio object.
    const audio = new Audio(url);
    audio.play();
    setPlayingId(id);
    audio.onended = () => setPlayingId(null);
  };

  const clearHistory = () => {
    localStorage.removeItem('tts_history');
    setHistory([]);
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <p>No generation history found.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Your Generations</h2>
        <button 
          onClick={clearHistory}
          className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Clear History
        </button>
      </div>

      {history.map((item) => (
        <div key={item.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-col gap-2 overflow-hidden pr-6">
            <p className="text-gray-800 text-sm font-medium truncate">{item.text}</p>
            <div className="flex gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(item.date).toLocaleDateString()}
              </span>
              <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600 font-medium">
                {item.voiceName}
              </span>
            </div>
          </div>
            
          <button
            onClick={() => playAudio(item.id, item.audioUrl)}
            className="shrink-0 w-12 h-12 rounded-full bg-gray-900 hover:bg-gray-800 flex items-center justify-center text-white transition-colors"
          >
            <Play className={`w-5 h-5 ml-1 ${playingId === item.id ? 'animate-pulse text-indigo-400' : 'fill-current'}`} />
          </button>
        </div>
      ))}
    </div>
  );
}
