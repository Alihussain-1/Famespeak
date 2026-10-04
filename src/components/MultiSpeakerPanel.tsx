'use client';

import { useState } from 'react';
import { Users, Sparkles, Plus } from 'lucide-react';
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

  const sampleInterview = `Host: Welcome to today's show! We're thrilled to have you here. [pause 800ms]
Guest: Thank you so much for having me, it's an absolute pleasure.
Host: Let's start with your new project. What inspired it? [pause 500ms]
Guest: It all started when I realized how much time people spend on manual audio production.`;

  const sampleStory = `Narrator: Once upon a time in a distant kingdom, two wizards stood at the castle gates. [pause 1s]
Eldrin: Are you certain the portal is stable?
Vael: Stable enough for us, my friend. Step through quickly! [pause 800ms]
Narrator: And with that, they vanished into the swirling light.`;

  return (
    <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Multi-Speaker Dialogue</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Format lines as <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded font-mono text-gray-800 dark:text-gray-200">Name: speech</code>
            </p>
          </div>
        </div>

        {/* Templates */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onInsertTemplate(sampleInterview)}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 text-gray-700 dark:text-gray-200 transition-colors"
          >
            Interview Template
          </button>
          <button
            type="button"
            onClick={() => onInsertTemplate(sampleStory)}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 text-gray-700 dark:text-gray-200 transition-colors"
          >
            Story Template
          </button>
        </div>
      </div>

      {/* Detected Speakers Mapping List */}
      <div className="flex flex-col gap-2 pt-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Detected Speakers ({speakers.length})
        </span>

        {speakers.length === 0 ? (
          <div className="text-xs text-gray-400 bg-gray-50 dark:bg-[#161616] p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
            No speakers detected yet. Type lines like <span className="font-mono text-gray-600 dark:text-gray-300">Alex: Hello</span> and <span className="font-mono text-gray-600 dark:text-gray-300">Sam: Hi there!</span> or click a template above.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {speakers.map((spk) => {
              const assigned = mappings[spk] || defaultVoice;
              return (
                <div
                  key={spk}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-[#181818]"
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
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 text-gray-800 dark:text-gray-100 transition-colors shrink-0 shadow-2xs"
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
