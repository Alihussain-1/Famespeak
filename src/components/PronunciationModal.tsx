'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, BookA, Check, Sparkles } from 'lucide-react';
import { PronunciationRule, getPronunciations, savePronunciations } from '@/lib/storage';

interface PronunciationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PronunciationModal({ isOpen, onClose }: PronunciationModalProps) {
  const [rules, setRules] = useState<PronunciationRule[]>([]);
  const [newWord, setNewWord] = useState('');
  const [newReplacement, setNewReplacement] = useState('');

  useEffect(() => {
    if (isOpen) {
      getPronunciations().then(setRules);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || !newReplacement.trim()) return;

    const newRule: PronunciationRule = {
      id: Date.now().toString(),
      word: newWord.trim(),
      replacement: newReplacement.trim(),
      enabled: true,
    };

    const updated = [...rules, newRule];
    setRules(updated);
    savePronunciations(updated);
    setNewWord('');
    setNewReplacement('');
  };

  const handleToggle = (id: string) => {
    const updated = rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r);
    setRules(updated);
    savePronunciations(updated);
  };

  const handleDelete = (id: string) => {
    const updated = rules.filter(r => r.id !== id);
    setRules(updated);
    savePronunciations(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-900 dark:text-white">
              <BookA className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Pronunciation Dictionary</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Teach voices how to pronounce acronyms or custom words.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add Form */}
        <form onSubmit={handleAddRule} className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col gap-3 bg-gray-50/50 dark:bg-[#161616]">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Add New Word Rule</span>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Word (e.g. GIF)"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              className="flex-1 bg-white dark:bg-[#202020] border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-gray-900 dark:focus:border-gray-400"
              required
            />
            <span className="self-center text-gray-400 font-bold">→</span>
            <input
              type="text"
              placeholder="Say as (e.g. jif)"
              value={newReplacement}
              onChange={(e) => setNewReplacement(e.target.value)}
              className="flex-1 bg-white dark:bg-[#202020] border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-gray-900 dark:focus:border-gray-400"
              required
            />
            <button
              type="submit"
              className="bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-200 text-white dark:text-gray-900 font-medium px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </form>

        {/* Rules List */}
        <div className="flex-1 overflow-y-auto max-h-72 p-6 flex flex-col gap-2">
          {rules.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400">
              No custom pronunciations yet. Add your first rule above!
            </div>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#161616] hover:border-gray-200 dark:hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => handleToggle(rule.id)}
                    className="w-4 h-4 rounded text-gray-900 accent-gray-900 dark:accent-white cursor-pointer"
                  />
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-gray-900 dark:text-white font-mono">{rule.word}</span>
                    <span className="text-gray-400 text-xs">pronounced as</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono">&ldquo;{rule.replacement}&rdquo;</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(rule.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                  title="Delete rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end bg-gray-50 dark:bg-[#141414]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
