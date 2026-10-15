import React from 'react';
import { X } from 'lucide-react';
import { AppUser } from '../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: AppUser | null;
}

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

        <div className="flex-1 overflow-y-auto divide-y divide-zinc-900 p-8 text-center text-zinc-500 text-xs">
          <p className="font-bold text-zinc-400 text-sm mb-1">No notifications yet</p>
          <p>When someone likes your posts or follows you, it will appear here.</p>
        </div>
      </div>
    </div>
  );
};
