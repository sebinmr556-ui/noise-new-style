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
  // നിലവിലെ യൂസർക്ക് സ്റ്റോറി ഉണ്ടോ എന്ന് പരിശോധിക്കുന്നു 
  // (userId, authorId, uid ഇവയിൽ ഏതാണെങ്കിലും സപ്പോർട്ട് ചെയ്യാൻ അപ്ഡേറ്റ് ചെയ്തത്)
  const userStoryIndex = stories.findIndex(story => 
    currentUser && (story.userId === currentUser.uid || story.authorId === currentUser.uid || story.uid === currentUser.uid)
  );
  const hasStory = userStoryIndex !== -1;
  const userStory = hasStory ? stories[userStoryIndex] : null;

  return (
    <div className="bg-zinc-950 border-b border-zinc-800/80 py-3.5 px-3">
      <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar">
        
        {/* Current User Story Item */}
        <div 
          className="flex flex-col items-center flex-none cursor-pointer group" 
          onClick={() => (hasStory ? onOpenStory(userStoryIndex) : onAddStory())}
        >
          <div className="relative">
            <div 
              className={`w-[66px] h-[66px] rounded-full p-[2px] transition-transform active:scale-95 group-hover:scale-105 ${
                hasStory 
                  ? (userStory?.hasSeen ? 'ig-story-viewed' : 'ig-story-gradient')
                  : 'border-2 border-zinc-800 group-hover:border-zinc-600 bg-zinc-900'
              }`}
            >
              <div className="w-full h-full rounded-full bg-zinc-950 p-[2px] flex items-center justify-center overflow-hidden">
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
            </div>
            
            {/* Add Story (+) Button Overlay */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation(); // സ്റ്റോറി വ്യൂ ഓപ്പൺ ആവാതെ ആഡ് സ്റ്റോറി മാത്രം വർക്ക് ചെയ്യാൻ
                onAddStory();
              }}
              className="absolute bottom-0 right-0 w-5 h-5 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-full flex items-center justify-center border-2 border-zinc-950 text-xs font-bold shadow-xs z-10 hover:scale-110 transition-transform"
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
          
          // സ്വന്തം സ്റ്റോറി വീണ്ടും വരാതിരിക്കാൻ കൃത്യമായി ചെക്ക് ചെയ്യുന്നു
          // (userId, authorId, uid ഇതിൽ ഏതാണെങ്കിലും അത് വർക്ക് ആവും)
          const isOwner = currentUser && (
            story.userId === currentUser.uid || 
            story.authorId === currentUser.uid || 
            story.uid === currentUser.uid
          );

          if (isOwner) {
            return null; // സ്വന്തം സ്റ്റോറി ഈ ലിസ്റ്റിൽ നിന്നും ഒഴിവാക്കുന്നു
          }

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
