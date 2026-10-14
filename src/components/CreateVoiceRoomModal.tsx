import React, { useState } from 'react';
import { X, Mic, Radio, Sparkles, Hash, Music } from 'lucide-react';
import { AppUser, VoiceRoom } from '../types';

interface CreateVoiceRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  onCreateRoom: (roomData: {
    title: string;
    topic: string;
    tags: string[];
    ambientVibe: 'none' | 'lofi' | 'rain' | 'cafe' | 'synth';
  }) => void;
}

const POPULAR_TOPICS = [
  { name: 'Casual Hangout', emoji: '💬', defaultTags: ['hangout', 'chill', 'chat'] },
  { name: 'Chill & Lo-Fi', emoji: '🎧', defaultTags: ['lofi', 'beats', 'music'] },
  { name: 'Photography & Art', emoji: '📸', defaultTags: ['photo', 'aesthetic', 'art'] },
  { name: 'Creators & Tech', emoji: '💡', defaultTags: ['creators', 'tech', 'design'] },
  { name: 'Late Night Lounge', emoji: '🌙', defaultTags: ['night', 'relax', 'talk'] },
  { name: 'Coffee & Code', emoji: '☕', defaultTags: ['coding', 'coffee', 'build'] },
];

const AMBIENT_OPTIONS: { id: 'none' | 'lofi' | 'rain' | 'cafe' | 'synth'; label: string; icon: string }[] = [
  { id: 'none', label: 'Off', icon: '🔇' },
  { id: 'lofi', label: 'Lo-Fi Chill', icon: '🎧' },
  { id: 'rain', label: 'Rain Ambience', icon: '🌧️' },
  { id: 'cafe', label: 'Cozy Cafe', icon: '☕' },
  { id: 'synth', label: 'Ambient Synth', icon: '✨' },
];

export const CreateVoiceRoomModal: React.FC<CreateVoiceRoomModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCreateRoom,
}) => {
  const [title, setTitle] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('Casual Hangout');
  const [tagsInput, setTagsInput] = useState('chill, hangout, vibes');
  const [ambientVibe, setAmbientVibe] = useState<'none' | 'lofi' | 'rain' | 'cafe' | 'synth'>('lofi');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSelectTopic = (topic: typeof POPULAR_TOPICS[0]) => {
    setSelectedTopic(topic.name);
    setTagsInput(topic.defaultTags.join(', '));
    if (!title) {
      setTitle(`${topic.name} Lounge`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
      .filter(Boolean);

    onCreateRoom({
      title: title.trim(),
      topic: selectedTopic,
      tags: tags.length > 0 ? tags : ['chat', 'voice'],
      ambientVibe,
    });

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80 bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center shadow-md">
              <Radio className="w-4 h-4 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Start a Voice Room</h2>
              <p className="text-xs text-zinc-400">Go live and invite your followers to talk</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto no-scrollbar">
          {/* Room Title */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Room Title
            </label>
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What are you discussing? (e.g. Late Night Vibes)"
                maxLength={70}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
              />
              <span className="absolute right-3 top-3 text-[10px] text-zinc-500">
                {title.length}/70
              </span>
            </div>
          </div>

          {/* Topics Quick Select */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Choose Topic
            </label>
            <div className="grid grid-cols-2 gap-2">
              {POPULAR_TOPICS.map((topic) => {
                const isSelected = selectedTopic === topic.name;
                return (
                  <button
                    key={topic.name}
                    type="button"
                    onClick={() => handleSelectTopic(topic)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left border transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-rose-500/20 to-purple-600/20 border-rose-500/80 text-white font-semibold shadow-xs'
                        : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-sm">{topic.emoji}</span>
                    <span className="truncate">{topic.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Tags <span className="text-[10px] text-zinc-500 lowercase">(comma separated)</span>
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="lofi, photography, tech"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>
          </div>

          {/* Ambient Background Vibe */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-rose-400" />
                Background Atmosphere
              </label>
              <span className="text-[10px] text-zinc-400">Web Audio Synth</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {AMBIENT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAmbientVibe(opt.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                    ambientVibe === opt.id
                      ? 'bg-rose-500/15 border-rose-500 text-white font-semibold'
                      : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <span className="text-base mb-0.5">{opt.icon}</span>
                  <span className="text-[10px] leading-tight truncate w-full">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Host Info Box */}
          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-rose-500 to-purple-600 p-[1.5px] flex-none">
              <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden">
                {currentUser?.photoURL ? (
                  <img src={currentUser.photoURL} alt={currentUser.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-white uppercase">
                    {currentUser?.username?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate">
                  {currentUser?.displayName || currentUser?.username || 'You'}
                </span>
                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                  Host
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">You will be the primary speaker with mic enabled</p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-rose-500 to-purple-600 hover:opacity-95 active:scale-[0.98] transition-all shadow-lg shadow-rose-950/40 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              <Mic className="w-4 h-4" />
              <span>Go Live Now</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
