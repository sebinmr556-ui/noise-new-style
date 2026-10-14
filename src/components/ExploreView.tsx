import React, { useState } from 'react';
import { Search, Heart, X } from 'lucide-react';
import { Post } from '../types';

interface ExploreViewProps {
  allPosts: Post[];
  onSelectPost: (post: Post) => void;
}

const TRENDING_TAGS = [
  'All',
  'Noise',
  'Photography',
  'Travel',
  'Art',
  'Architecture',
  'Vintage',
  'Nature',
];

export const ExploreView: React.FC<ExploreViewProps> = ({
  allPosts,
  onSelectPost,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');

  // പോസ്റ്റുകൾ ഫിൽറ്റർ ചെയ്ത ശേഷം ലൈക്കിന്റെ അടിസ്ഥാനത്തിൽ (Trending) അടുക്കുന്നു
  const filteredPosts = allPosts.filter((post) => {
    const query = searchQuery.toLowerCase().trim();
    const tagMatch =
      selectedTag === 'All' ||
      post.caption.toLowerCase().includes(selectedTag.toLowerCase()) ||
      post.filter?.toLowerCase() === selectedTag.toLowerCase();

    if (!query) return tagMatch;

    return (
      tagMatch &&
      (post.caption.toLowerCase().includes(query) ||
        post.username.toLowerCase().includes(query) ||
        (post.location && post.location.toLowerCase().includes(query)))
    );
  }).sort((a, b) => (b.likes || 0) - (a.likes || 0));

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-[calc(100vh-110px)] pb-20">
      {/* Search Header */}
      <div className="sticky top-14 z-30 bg-zinc-950/95 backdrop-blur-md px-3 pt-3 pb-2 border-b border-zinc-800/80">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search posts, captions, authors..."
            className="w-full bg-zinc-900 hover:bg-zinc-850 focus:bg-zinc-900 text-xs text-zinc-100 placeholder-zinc-500 pl-9 pr-9 py-2.5 rounded-xl border border-zinc-800 focus:border-zinc-600 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
              type="button"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tags horizontal pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2.5 pb-1">
          {TRENDING_TAGS.map((tag) => {
            const isActive = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                type="button"
                className={`flex-none text-xs px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-zinc-100 text-zinc-950 shadow-xs'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                }`}
              >
                {tag === 'All' ? tag : `#${tag}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Explore Grid of Real Firebase Posts */}
      {filteredPosts.length > 0 ? (
        <div className="grid grid-cols-3 gap-1 p-1 mt-1">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              onClick={() => onSelectPost(post)}
              className="group relative aspect-square bg-zinc-900 overflow-hidden cursor-pointer"
            >
              <img
                src={post.image}
                alt={post.caption || 'Explore post'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-2">
                <div className="flex items-center gap-1 font-bold text-xs">
                  <Heart className="w-4 h-4 fill-white" />
                  <span>{post.likes || 0}</span>
                </div>
                {post.caption && (
                  <span className="text-[10px] text-zinc-200 mt-1 truncate max-w-full">
                    {post.caption}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 px-4 text-zinc-500 text-xs">
          {searchQuery ? (
            <p>No posts matching "{searchQuery}".</p>
          ) : (
            <div className="space-y-1">
              <p className="font-semibold text-zinc-300">No explore posts yet</p>
              <p className="text-zinc-500">Share your filtered photo to be the first on Explore!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
