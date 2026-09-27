'use client';

import { useRef, useState, useEffect } from 'react';
import { Play, Pause, Download, Volume2 } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
}

export default function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(isNaN(p) ? 0 : p);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const time = (Number(e.target.value) / 100) * audioRef.current.duration;
      audioRef.current.currentTime = time;
      setProgress(Number(e.target.value));
    }
  };

  return (
    <div className="bg-gradient-to-r from-gray-900 to-black rounded-2xl p-6 border border-white/10 shadow-xl flex flex-col sm:flex-row items-center gap-6">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />

      <button
        onClick={togglePlay}
        className="flex-shrink-0 w-16 h-16 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/30"
      >
        {playing ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
      </button>

      <div className="flex-grow w-full flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-indigo-400">
            <Volume2 className="w-4 h-4" />
            <span className="text-xs font-semibold tracking-wider">OUTPUT AUDIO</span>
          </div>
          <a
            href={audioUrl}
            download
            className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 py-1.5 px-3 rounded-lg border border-white/5"
          >
            <Download className="w-4 h-4" />
            Save MP3
          </a>
        </div>
        
        {/* Custom Progress Bar */}
        <div className="relative group mt-1">
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
