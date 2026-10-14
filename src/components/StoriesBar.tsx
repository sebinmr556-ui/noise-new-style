import React from 'react';
import { Plus } from 'lucide-react';
import { Story, AppUser } from '../types';

interface StoriesBarProps {
  stories: Story[];
  currentUser: AppUser | null;
  onOpenStory: (index: number) => void;
  onAddStory: () => void;
}

export const StoriesBar: React.FC<StoriesBarProps> = ({
  stories,
  currentUser,
  onOpenStory,
  onAddStory,
}) => {
  return (
    <div className="bg-zinc-950 border-b border-zinc-800/80 py-3.5 px-3">
      <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar">
        {/* Current User Story Item */}
        <div className="flex flex-col items-center flex-none cursor-pointer group" onClick={onAddStory}>
          <div className="relative">
            <div className="w-[66px] h-[66px] rounded-full p-[2px] border-2 border-zinc-800 flex items-center justify-center group-hover:border-zinc-600 transition-colors bg-zinc-900 overflow-hidden">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="Your story"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400">
                  <Plus className="w-6 h-6 text-zinc-400 stroke-[2]" />
                </div>
              )}
            </div>
            <button
              type="button"
              className="absolute bottom-0 right-0 w-5 h-5 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-full flex items-center justify-center border-2 border-zinc-950 text-xs font-bold shadow-xs"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
            </button>
          </div>
          <span className="text-[11px] text-zinc-400 font-medium mt-1.5 w-[66px] text-center truncate">
            Your story
          </span>
        </div>

        {/* Stories List */}
        {stories.map((story, index) => {
          const isSeen = story.hasSeen;
          return (
            <div
              key={story.id}
              onClick={() => onOpenStory(index)}
              className="flex flex-col items-center flex-none cursor-pointer group"
            >
              <div
                className={`w-[66px] h-[66px] rounded-full p-[2px] transition-transform active:scale-95 group-hover:scale-105 ${
                  isSeen ? 'ig-story-viewed' : 'ig-story-gradient'
                }`}
              >
                <div className="w-full h-full rounded-full bg-zinc-950 p-[2px]">
                  <img
                    src={story.avatar}
                    alt={story.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
              </div>
              <span className="text-[11px] text-zinc-300 font-medium mt-1.5 w-[66px] text-center truncate">
                {story.username}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
