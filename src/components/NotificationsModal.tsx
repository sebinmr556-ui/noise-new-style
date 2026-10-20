import React, { useState } from 'react';
import { 
  X, 
  Heart, 
  MessageCircle, 
  UserPlus, 
  Sparkles, 
  CheckCheck, 
  Trash2, 
  Bell, 
  Clock 
} from 'lucide-react';
import { AppUser } from '../types';
import { formatRelativeTime } from '../utils/time';

export interface AppNotification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention';
  username: string;
  displayName?: string;
  avatar: string;
  actionText: string;
  targetImage?: string;
  createdAt: number | string; // Raw timestamp (Unix ms, Unix seconds, or ISO date string)
  isRead?: boolean;
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: AppUser | null;
  notifications?: AppNotification[];
  onSelectUser?: (username: string) => void;
}

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    type: 'like',
    username: 'maya_beats',
    displayName: 'Maya Beats',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    actionText: 'liked your photo',
    targetImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80',
    createdAt: Date.now() - 2 * 60 * 1000, // 2 minutes ago
    isRead: false,
  },
  {
    id: 'notif-2',
    type: 'comment',
    username: 'alex_codes',
    displayName: 'Alex Codes',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    actionText: 'commented: "This looks incredible! 🔥"',
    targetImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80',
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago (raw ISO string)
    isRead: false,
  },
  {
    id: 'notif-3',
    type: 'follow',
    username: 'kai_dj',
    displayName: 'Kai Music',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
    actionText: 'started following you',
    createdAt: Date.now() - 3 * 3600 * 1000, // 3 hours ago
    isRead: true,
  },
  {
    id: 'notif-4',
    type: 'like',
    username: 'sarah_lens',
    displayName: 'Sarah Photography',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    actionText: 'liked your reel',
    targetImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300&q=80',
    createdAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(), // 18 hours ago
    isRead: true,
  },
  {
    id: 'notif-5',
    type: 'mention',
    username: 'sam_travels',
    displayName: 'Sam Travels',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    actionText: 'mentioned you in a story',
    targetImage: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=300&q=80',
    createdAt: Date.now() - 2 * 86400 * 1000, // 2 days ago
    isRead: true,
  },
  {
    id: 'notif-6',
    type: 'follow',
    username: 'elena_lens',
    displayName: 'Elena Lens',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80',
    actionText: 'started following you',
    createdAt: new Date(Date.now() - 5 * 86400 * 1000).toISOString(), // 5 days ago
    isRead: true,
  },
];

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  notifications: initialPropsNotifications,
  onSelectUser,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(
    initialPropsNotifications || INITIAL_NOTIFICATIONS
  );
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const renderIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'like':
        return <Heart className="w-3 h-3 text-[#ff3040] fill-[#ff3040]" />;
      case 'comment':
        return <MessageCircle className="w-3 h-3 text-sky-400 fill-sky-400/20" />;
      case 'follow':
        return <UserPlus className="w-3 h-3 text-purple-400" />;
      case 'mention':
        return <Sparkles className="w-3 h-3 text-amber-400" />;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-950 text-zinc-100 border border-zinc-800/90 w-full sm:max-w-md h-[80vh] sm:h-[600px] rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="w-10 h-1 bg-zinc-700 rounded-full sm:hidden absolute top-2 left-1/2 -translate-x-1/2" />
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-base">Notifications</h3>
            {unreadCount > 0 && (
              <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {notifications.length > 0 && unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded-md hover:bg-zinc-900 transition-colors flex items-center gap-1"
                title="Mark all as read"
                type="button"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Mark read</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-zinc-400 hover:text-rose-400 p-1.5 rounded-md hover:bg-zinc-900 transition-colors"
                title="Clear all"
                type="button"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-zinc-900 transition-colors"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-900 text-xs bg-zinc-900/40">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              filter === 'all'
                ? 'bg-zinc-800 text-white font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            type="button"
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              filter === 'unread'
                ? 'bg-zinc-800 text-white font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            type="button"
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/60 p-2 sm:p-3 space-y-1">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-16 px-4 text-zinc-500 text-xs">
              <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-3 text-zinc-600">
                <Bell className="w-6 h-6" />
              </div>
              <p className="font-bold text-zinc-300 text-sm mb-1">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
              <p className="text-zinc-500 max-w-xs mx-auto">
                When someone likes your photos, comments on your reels, or follows you, you'll see it here.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              // Convert raw timestamp to human-readable relative time (e.g., '2m ago', '1h ago')
              const relativeTime = formatRelativeTime(notification.createdAt);

              return (
                <div
                  key={notification.id}
                  className={`flex items-center justify-between gap-3 p-2.5 rounded-xl transition-colors ${
                    notification.isRead
                      ? 'hover:bg-zinc-900/50'
                      : 'bg-zinc-900/40 hover:bg-zinc-900/80 border-l-2 border-rose-500'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* User Avatar with Type Badge */}
                    <div 
                      className="relative flex-none cursor-pointer"
                      onClick={() => onSelectUser?.(notification.username)}
                    >
                      <img
                        src={notification.avatar}
                        alt={notification.username}
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-zinc-800"
                      />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-xs">
                        {renderIcon(notification.type)}
                      </div>
                    </div>

                    {/* Text info and relative timestamp */}
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="text-zinc-200 leading-snug">
                        <span 
                          onClick={() => onSelectUser?.(notification.username)}
                          className="font-bold text-white hover:text-purple-300 cursor-pointer transition-colors mr-1"
                        >
                          {notification.username}
                        </span>
                        <span className="text-zinc-300">{notification.actionText}</span>
                      </p>
                      
                      {/* Human-readable relative timestamp (e.g. '2m ago', '1h ago') */}
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-500">
                        <Clock className="w-3 h-3 text-zinc-600" />
                        <span className="font-medium text-zinc-400">{relativeTime}</span>
                        {!notification.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 ml-1" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Target Thumbnail if present */}
                  {notification.targetImage && (
                    <img
                      src={notification.targetImage}
                      alt="Post thumbnail"
                      className="w-10 h-10 rounded-lg object-cover ring-1 ring-zinc-800 flex-none bg-zinc-900"
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// Also export as NotificationModal for singular naming compatibility
export const NotificationModal = NotificationsModal;
export default NotificationsModal;
