import React, { useState } from 'react';
import { X, Send, Heart, Trash2, User } from 'lucide-react';
import { Post, AppUser } from '../types';
import { formatRelativeTime } from '../utils/time';

interface CommentsModalProps {
  post: Post | null;
  currentUser: AppUser | null;
  onClose: () => void;
  onAddComment: (postId: string, text: string) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  post,
  currentUser,
  onClose,
  onAddComment,
  onDeleteComment,
}) => {
  const [commentText, setCommentText] = useState('');

  if (!post) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(post.id, commentText.trim());
    setCommentText('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-zinc-950 text-zinc-100 border border-zinc-800/90 w-full sm:max-w-md h-[80vh] sm:h-[650px] rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="relative py-3.5 px-4 border-b border-zinc-800 flex items-center justify-center">
          <div className="w-10 h-1 bg-zinc-700 rounded-full sm:hidden absolute top-2" />
          <h3 className="font-bold text-white text-sm">Comments</h3>
          <button
            onClick={onClose}
            className="absolute right-3.5 text-zinc-400 hover:text-white p-1"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Post Caption as first entry */}
          <div className="flex items-start gap-3 pb-3 border-b border-zinc-900">
            <img
              src={post.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.username || 'User')}&background=18181b&color=fff`}
              alt={post.username}
              className="w-8 h-8 rounded-full object-cover flex-none ring-1 ring-zinc-800"
            />
            <div className="flex-1 text-xs">
              <span className="font-bold text-white mr-1.5">{post.username}</span>
              <span className="text-zinc-300 whitespace-pre-wrap">{post.caption}</span>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-1">
                <span>Author</span>
                {post.createdAt && (
                  <>
                    <span>•</span>
                    <span>{formatRelativeTime(post.createdAt)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {post.comments.length === 0 ? (
            <div className="text-center py-14 text-zinc-500 text-xs">
              No comments yet. Be the first to start the conversation!
            </div>
          ) : (
            post.comments.map((comment) => (
              <div key={comment.id} className="flex items-start justify-between gap-2 group">
                <div className="flex items-start gap-3">
                  <img
                    src={comment.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.username || 'User')}&background=18181b&color=fff`}
                    alt={comment.username}
                    className="w-8 h-8 rounded-full object-cover flex-none ring-1 ring-zinc-800"
                  />
                  <div className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white">{comment.username}</span>
                      <span className="text-[10px] text-zinc-500 font-normal">
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-zinc-300 mt-0.5">{comment.text}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {currentUser && (currentUser.uid === comment.uid || currentUser.uid === post.uid) && onDeleteComment && (
                    <button
                      onClick={() => onDeleteComment(post.id, comment.id)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 p-1 transition-opacity"
                      title="Delete comment"
                      type="button"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button className="text-zinc-500 hover:text-rose-500 p-1" type="button">
                    <Heart className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 bg-zinc-900/90 border-t border-zinc-800 flex items-center gap-2">
          {currentUser?.photoURL && !currentUser.photoURL.includes('unsplash.com') && !currentUser.photoURL.includes('ui-avatars.com') ? (
            <img
              src={currentUser.photoURL}
              alt="Current user"
              className="w-7 h-7 rounded-full object-cover flex-none ring-1 ring-zinc-700"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center flex-none ring-1 ring-zinc-700 text-zinc-400">
              <User className="w-3.5 h-3.5 stroke-[2]" />
            </div>
          )}
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={currentUser ? "Add a comment..." : "Log in to comment..."}
            disabled={!currentUser}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-full px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!commentText.trim() || !currentUser}
            className="text-rose-500 font-semibold text-xs px-2 py-1.5 disabled:opacity-40 hover:text-rose-400"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
