'use client';

import { useState } from 'react';
import TTSForm from '@/components/TTSForm';
import HistoryList from '@/components/HistoryList';
import { AudioLines } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');

  return (
    <main className="min-h-screen bg-[#FDFDFD] text-gray-900 font-sans selection:bg-gray-200">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <AudioLines className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">FameSpeak<span className="text-gray-400 font-normal"> Clone</span></span>
          </div>
          
          <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-lg border border-gray-100">
            <button
              onClick={() => setActiveTab('generate')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === 'generate' 
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Generate
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === 'history' 
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              History
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {activeTab === 'generate' ? <TTSForm /> : <HistoryList />}
      </div>
      
    </main>
  );
}
