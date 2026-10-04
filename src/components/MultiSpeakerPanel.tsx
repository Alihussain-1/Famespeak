'use client';

import { useState } from 'react';
import { Users, Sparkles, MessageSquareQuote } from 'lucide-react';
import { VoiceOption } from '@/types/tts';
import VoiceModal from './VoiceModal';

export interface SpeakerMapping {
  speaker: string;
  voice: VoiceOption;
}

interface MultiSpeakerPanelProps {
  speakers: string[];
  mappings: Record<string, VoiceOption>;
  onMappingChange: (speaker: string, voice: VoiceOption) => void;
  onInsertTemplate: (templateText: string) => void;
  defaultVoice: VoiceOption;
}

export default function MultiSpeakerPanel({
  speakers,
  mappings,
  onMappingChange,
  onInsertTemplate,
  defaultVoice,
}: MultiSpeakerPanelProps) {
  const [activePickerSpeaker, setActivePickerSpeaker] = useState<string | null>(null);

  const sampleInterview = `Host: Welcome to today's episode! We're thrilled to have you with us. ...
Guest: Thank you so much for having me, it's an absolute pleasure.
Host: Tell us about your journey into creative audio production. ...
Guest: It all started when I realized how fast voice synthesis has evolved. Today, anyone can produce studio-quality voiceovers in seconds.`;

  const sampleStory = `Narrator: Deep in the misty valleys of the northern realm, two travelers reached an ancient archway. ...
Eldrin: Are you certain this path leads to the summit?
Vael: The map hasn't failed us yet, my friend. Step forward! ...
Narrator: As they walked through, the arch began to hum with vibrant blue energy.`;

  const samplePodcast = `Alex: Welcome back everyone. Today we are discussing the next generation of creative tools. ...
Jordan: Thanks Alex! What excites me most is how much friction is disappearing from the creator workflow.
Alex: Exactly. You write an idea, and within seconds, you hear it come alive.`;

  return (
    <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              Multi-Speaker Dialogue Mode
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                Active
              </span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Format dialogue lines as <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded font-mono text-gray-800 dark:text-gray-200">Name: spoken text</code>
            </p>
          </div>
        </div>

        {/* Quick Dialogue Templates */}
        <div className="flex items-center flex-wrap gap-1.5">
          <span className="text-xs text-gray-400 mr-1 hidden md:inline">Templates:</span>
          <button
            type="button"
            onClick={() => onInsertTemplate(sampleInterview)}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
          >
            Interview
          </button>
          <button
            type="button"
            onClick={() => onInsertTemplate(sampleStory)}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
          >
            Story
          </button>
          <button
            type="button"
            onClick={() => onInsertTemplate(samplePodcast)}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
          >
            Podcast
          </button>
        </div>
      </div>

      {/* Detected Speakers Mapping List */}
      <div className="flex flex-col gap-2 pt-1 border-t border-gray-100 dark:border-gray-800/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Detected Speakers ({speakers.length})
          </span>
          {speakers.length > 0 && (
            <span className="text-[11px] text-gray-400">
              Each speaker will be generated with their chosen voice and merged seamlessly.
            </span>
          )}
        </div>

        {speakers.length === 0 ? (
          <div className="text-xs text-gray-400 bg-gray-50 dark:bg-[#181818] p-3.5 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-center sm:text-left flex items-center gap-2">
            <MessageSquareQuote className="w-4 h-4 text-gray-400 shrink-0 hidden sm:block" />
            <span>
              No speakers detected in the text yet. Type lines like <strong className="text-gray-700 dark:text-gray-200">Alex: Hello!</strong> or click a template above.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {speakers.map((spk) => {
              const assigned = mappings[spk] || defaultVoice;
              return (
                <div
                  key={spk}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-gray-50/70 dark:bg-[#1a1a1a]"
                >
                  <div className="flex flex-col overflow-hidden pr-2">
                    <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {spk}
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                      {assigned.label} ({assigned.gender})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActivePickerSpeaker(spk)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-[#252525] border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 text-gray-800 dark:text-gray-100 transition-colors shrink-0 shadow-2xs cursor-pointer"
                  >
                    Change Voice
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Voice Picker Modal for specific speaker */}
      {activePickerSpeaker && (
        <VoiceModal
          isOpen={!!activePickerSpeaker}
          onClose={() => setActivePickerSpeaker(null)}
          selectedVoice={mappings[activePickerSpeaker]?.value || defaultVoice.value}
          onSelect={(_, fullInfo) => {
            onMappingChange(activePickerSpeaker, fullInfo);
            setActivePickerSpeaker(null);
          }}
        />
      )}
    </div>
  );
}
