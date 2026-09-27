'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, Smile, Zap, Volume2, Mic, Frown, Volume1 } from 'lucide-react';

export interface EmotionOption {
  value: string;
  label: string;
  icon: string;
}

export const emotions: EmotionOption[] = [
  { value: 'neutral', label: 'Neutral', icon: 'Smile' },
  { value: 'cheerful', label: 'Cheerful', icon: 'Smile' },
  { value: 'excited', label: 'Excited', icon: 'Zap' },
  { value: 'calm', label: 'Calm', icon: 'Volume2' },
  { value: 'serious', label: 'Serious', icon: 'Mic' },
  { value: 'sad', label: 'Sad', icon: 'Frown' },
  { value: 'angry', label: 'Angry', icon: 'Zap' },
  { value: 'whisper', label: 'Whisper', icon: 'Volume1' },
];

const iconMap: Record<string, React.ReactNode> = {
  Smile: <Smile className="w-4 h-4 text-gray-500" />,
  Zap: <Zap className="w-4 h-4 text-gray-500" />,
  Volume2: <Volume2 className="w-4 h-4 text-gray-500" />,
  Mic: <Mic className="w-4 h-4 text-gray-500" />,
  Frown: <Frown className="w-4 h-4 text-gray-500" />,
  Volume1: <Volume1 className="w-4 h-4 text-gray-500" />,
};

interface CustomDropdownProps {
  value: string;
  onChange: (val: string) => void;
}

export default function CustomDropdown({ value, onChange }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = emotions.find(e => e.value === value) || emotions[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
      >
        <div className="flex items-center gap-2">
          {iconMap[selected.icon]}
          <span className="font-medium">{selected.label}</span>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-lg py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-100">
          {emotions.map((emo) => (
            <button
              key={emo.value}
              type="button"
              onClick={() => {
                onChange(emo.value);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {iconMap[emo.icon]}
                <span>{emo.label}</span>
              </div>
              {value === emo.value && <Check className="w-4 h-4 text-gray-900" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
