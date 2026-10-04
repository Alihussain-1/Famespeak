'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Download, FileText, FileAudio, RotateCcw } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';

interface WaveformPlayerProps {
  audioUrl: string;
  srt?: string;
  title?: string;
  voiceName?: string;
  onClose?: () => void;
}

export default function WaveformPlayer({ audioUrl, srt, title, voiceName }: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    // Destroy any existing instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#9ca3af',
      progressColor: '#111827',
      cursorColor: '#2563eb',
      barWidth: 3,
      barGap: 2,
      barRadius: 3,
      height: 48,
      normalize: true,
      url: audioUrl,
    });

    wavesurferRef.current = ws;

    ws.on('ready', () => {
      setDuration(ws.getDuration());
      setCurrentTime(0);
      setIsPlaying(false);
    });

    ws.on('audioprocess', () => {
      setCurrentTime(ws.getCurrentTime());
    });

    ws.on('seeking', () => {
      setCurrentTime(ws.getCurrentTime());
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => {
      setIsPlaying(false);
      setCurrentTime(ws.getDuration());
    });

    return () => {
      ws.destroy();
    };
  }, [audioUrl]);

  const togglePlay = () => {
    wavesurferRef.current?.playPause();
  };

  const handleRestart = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.seekTo(0);
      wavesurferRef.current.play();
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    wavesurferRef.current?.setVolume(newVol);
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      wavesurferRef.current?.setVolume(volume || 1);
    } else {
      setIsMuted(true);
      wavesurferRef.current?.setVolume(0);
    }
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackRate(nextSpeed);
    wavesurferRef.current?.setPlaybackRate(nextSpeed);
  };

  const formatSec = (sec: number) => {
    const s = Math.floor(sec || 0);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, '0')}`;
  };

  const downloadFile = (href: string, filename: string) => {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setShowDownloadMenu(false);
  };

  const safeName = (title || 'generated-audio').replace(/[\\/:*?"<>|]+/g, '').trim().replace(/\s+/g, '_') || 'audio';

  return (
    <div className="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col gap-3 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex flex-col overflow-hidden pr-2">
          <span className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
            {title || 'Generated Audio'}
          </span>
          {voiceName && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {voiceName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Speed Toggle */}
          <button
            type="button"
            onClick={cycleSpeed}
            className="text-xs font-semibold px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
            title="Playback Speed"
          >
            {playbackRate}x
          </button>

          {/* Download Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Download Options"
            >
              <Download className="w-4 h-4" />
            </button>

            {showDownloadMenu && (
              <div className="absolute right-0 top-9 z-30 w-48 bg-white dark:bg-[#181818] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => downloadFile(audioUrl, `${safeName}.mp3`)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-left font-medium"
                >
                  <FileAudio className="w-3.5 h-3.5 text-gray-500" />
                  Audio (.mp3)
                </button>
                {srt && (
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([srt], { type: 'application/x-subrip;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      downloadFile(url, `${safeName}.srt`);
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-left font-medium"
                  >
                    <FileText className="w-3.5 h-3.5 text-gray-500" />
                    Subtitles (.srt)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Waveform Canvas */}
      <div className="w-full cursor-pointer py-1" ref={containerRef} />

      {/* Control Bar */}
      <div className="flex items-center justify-between pt-1 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 flex items-center justify-center transition-transform active:scale-95 shadow-sm"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 ml-0.5 fill-current" />
            )}
          </button>

          <button
            type="button"
            onClick={handleRestart}
            className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
            title="Restart from beginning"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <span className="font-mono">
            {formatSec(currentTime)} / {formatSec(duration)}
          </span>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-500" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-white"
          />
        </div>
      </div>
    </div>
  );
}
