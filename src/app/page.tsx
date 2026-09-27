'use client';
import ThemeToggle from '@/components/ThemeToggle';
import TTSForm from '@/components/TTSForm';
import { AudioLines } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans selection:bg-gray-200 dark:selection:bg-gray-800">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
              <AudioLines className="w-5 h-5 text-white dark:text-black" />
            </div>
            <span className="font-bold text-lg tracking-tight">FameSpeak<span className="text-gray-400 dark:text-gray-500 font-normal"> Clone</span></span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="w-full h-[calc(100vh-64px)]">
        <TTSForm />
      </div>
    </main>
  );
}
