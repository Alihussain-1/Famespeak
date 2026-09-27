'use client';

import { useState, useEffect } from 'react';
import { Play, Calendar, Trash2, Edit2, Check } from 'lucide-react';

export interface HistoryItem {
  id: string;
  title?: string;
  text: string;
  voiceName: string;
  audioUrl: string;
  date: string;
}

export default function HistoryList() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

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
    const audio = new Audio(url);
    audio.play();
    setPlayingId(id);
    audio.onended = () => setPlayingId(null);
  };

  const clearHistory = () => {
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

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-400">
        <p className="text-sm">Generated scripts will appear here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px]">
      <div className="flex justify-between items-center p-4 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-800">Recent Generations</h2>
        <button 
          onClick={clearHistory}
          className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
        >
          Clear All
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {history.map((item) => (
          <div key={item.id} className="flex flex-col gap-2 p-3 bg-gray-50 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors group">
            <div className="flex items-center justify-between gap-2">
              {editingId === item.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 text-sm font-bold bg-white border border-gray-300 rounded px-2 py-1 outline-none focus:border-gray-900"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && saveTitle(item.id)}
                  />
                  <button onClick={() => saveTitle(item.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1 overflow-hidden">
                  <h3 className="text-sm font-bold text-gray-900 truncate">
                    {item.title || 'Generated Audio'}
                  </h3>
                  <button 
                    onClick={() => startEdit(item)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-900 transition-opacity"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              
              <button
                onClick={() => playAudio(item.id, item.audioUrl)}
                className="shrink-0 w-8 h-8 rounded-full bg-gray-900 hover:bg-gray-800 flex items-center justify-center text-white transition-colors"
              >
                <Play className={`w-3.5 h-3.5 ml-0.5 ${playingId === item.id ? 'animate-pulse text-indigo-400' : 'fill-current'}`} />
              </button>
            </div>
            
            <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed">{item.text}</p>
            
            <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-1">
              <span>{new Date(item.date).toLocaleDateString()}</span>
              <span>•</span>
              <span>{item.voiceName}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
