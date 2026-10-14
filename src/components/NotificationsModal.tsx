import React from 'react';
import { X, Heart, MessageCircle, UserPlus } from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NOTIFICATIONS = [
  {
    id: 'n-1',
    type: 'like',
    user: 'alex_architect',
    avatar: '',
    text: 'liked your photo.',
    time: '2h',
    postThumb: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=100',
  },
  {
    id: 'n-2',
    type: 'comment',
    user: 'sophia',
    avatar: '',
    text: 'commented: "Incredible depth of field!"',
    time: '4h',
    postThumb: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=100',
  },
  {
    id: 'n-3',
    type: 'follow',
    user: 'tokyoneon',
    avatar: '',
    text: 'started following you.',
    time: '1d',
  },
  {
    id: 'n-4',
    type: 'like',
    user: 'liam_lens',
    avatar: '',
    text: 'liked your reel.',
    time: '2d',
    postThumb: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=100',
  },
];

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-zinc-950 text-zinc-100 border border-zinc-800 max-w-sm w-full rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 max-h-[550px] flex flex-col">
        <div className="px-4 py-3.5 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">Notifications</h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
          {NOTIFICATIONS.map((item) => (
            <div key={item.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-zinc-900/60 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-850 to-zinc-900 border border-zinc-800 flex items-center justify-center flex-none text-zinc-200 font-bold text-xs uppercase shadow-xs">
                  {item.user.charAt(0)}
                </div>
                <div className="text-xs">
                  <p className="text-zinc-200">
                    <span className="font-bold text-white mr-1">{item.user}</span>
                    {item.text}
                  </p>
                  <span className="text-[10px] text-zinc-500">{item.time} ago</span>
                </div>
              </div>

              {item.postThumb ? (
                <img
                  src={item.postThumb}
                  alt="Post"
                  className="w-10 h-10 rounded-lg object-cover flex-none ring-1 ring-zinc-800"
                />
              ) : (
                <button
                  type="button"
                  className="text-xs font-semibold px-3 py-1 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-lg hover:opacity-90 flex-none"
                >
                  Follow
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
