import React from 'react';
import { X } from 'lucide-react';
import { Post, AppUser } from '../types';
import { PostCard } from './PostCard';

interface PostDetailModalProps {
  post: Post | null;
  currentUser: AppUser | null;
  onClose: () => void;
  onLikeToggle: (postId: string) => void;
  onSaveToggle: (postId: string) => void;
  onOpenComments: (post: Post) => void;
  onQuickComment: (postId: string, text: string) => void;
  onDeletePost?: (postId: string) => void;
  onBlockUser?: (userId: string) => void;
  onRequireLogin: () => void;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  post,
  currentUser,
  onClose,
  onLikeToggle,
  onSaveToggle,
  onOpenComments,
  onQuickComment,
  onDeletePost,
  onBlockUser,
  onRequireLogin,
}) => {
  if (!post) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="relative w-full max-w-[440px] bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 max-h-[95vh] overflow-y-auto no-scrollbar">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-1.5 bg-black/80 text-white rounded-full hover:bg-black transition-colors ring-1 ring-zinc-700"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>

        <PostCard
          post={post}
          currentUser={currentUser}
          onLikeToggle={onLikeToggle}
          onSaveToggle={onSaveToggle}
          onOpenComments={onOpenComments}
          onQuickComment={onQuickComment}
          onDeletePost={(id) => {
            if (onDeletePost) onDeletePost(id);
            onClose();
          }}
          onBlockUser={(userId) => {
            if (onBlockUser) onBlockUser(userId);
            setTimeout(() => onClose(), 600);
          }}
          onRequireLogin={onRequireLogin}
        />
      </div>
    </div>
  );
};
