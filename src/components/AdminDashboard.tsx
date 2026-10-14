import React from 'react';
import { Users, Trash2, ShieldAlert } from 'lucide-react';
import { AppUser } from '../types';

interface AdminDashboardProps {
  currentUser: AppUser | null;
  onClose?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onClose }) => {
  // നിങ്ങളുടെ യൂസർനെയിം ആണോ എന്ന് ഉറപ്പുവരുത്തുന്നു. അല്ലെങ്കിൽ ഈ പേജ് കാണിക്കില്ല.
  if (currentUser?.username !== 'shoebell_shoe') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-red-500" />
          <h1 className="text-xl font-bold text-white">Master Dashboard</h1>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-zinc-400 hover:text-white px-3 py-1 bg-zinc-900 rounded">
            Close
          </button>
        )}
      </div>

      {/* Admin Controls */}
      <div className="p-4 space-y-4 overflow-y-auto">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-start gap-4">
          <div className="p-3 bg-blue-500/10 rounded-lg">
            <Users className="w-6 h-6 text-blue-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-white font-semibold">User Management</h2>
            <p className="text-sm text-zinc-400 mt-1">ബ്ലൂ ടിക്ക് നൽകാനും, യൂസർമാരെ നിയന്ത്രിക്കാനും</p>
            <button className="mt-3 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
              Manage Users
            </button>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-start gap-4">
          <div className="p-3 bg-red-500/10 rounded-lg">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-white font-semibold">Content Moderation</h2>
            <p className="text-sm text-zinc-400 mt-1">എല്ലാ പോസ്റ്റുകളും സ്റ്റോറികളും കാണാനും ഡിലീറ്റ് ചെയ്യാനും</p>
            <button className="mt-3 text-sm bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700">
              Review Content
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
