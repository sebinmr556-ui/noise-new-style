import React, { useState } from 'react';
import { X, LogIn, AlertCircle } from 'lucide-react';
import { auth, GoogleAuthProvider, signInWithPopup, isFirebaseConfigured } from '../firebase';
import { AppUser } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AppUser) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!isFirebaseConfigured || !auth) {
        throw new Error('Firebase Auth is not initialized. Please verify Firebase setup.');
      }

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;

      const appUser: AppUser = {
        uid: fbUser.uid,
        displayName: fbUser.displayName || 'Noise Creator',
        username: (fbUser.displayName || 'user')
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '_')
          .slice(0, 15),
        email: fbUser.email || undefined,
        photoURL: fbUser.photoURL || '',
        bio: 'Digital Creator ✨\nNoise App Official 🚀',
        followersCount: 0,
        followingCount: 0,
      };

      onLoginSuccess(appUser);
      onClose();
    } catch (err: any) {
      console.error('Firebase Google Sign-in error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setErrorMessage(
          `Firebase Auth Domain Warning: This preview URL domain is not yet in your Firebase Console authorized domains list. In Firebase Console > Authentication > Settings > Authorized Domains, add "${window.location.hostname}".`
        );
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMessage('The sign-in popup was blocked by your browser. Please allow popups for this site.');
      } else if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Sign-in cancelled. Please click Sign In to try again.');
      } else {
        setErrorMessage(err.message || 'Firebase login failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-zinc-950 text-zinc-100 border border-zinc-800 max-w-sm w-full rounded-2xl overflow-hidden shadow-2xl p-6 relative animate-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center pt-2 pb-5">
          <h2 className="font-brand text-4xl font-bold tracking-tight brand-gradient-text">
            Noise
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Sign in with your Google account to post pictures, like posts, and share stories.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-none mt-0.5" />
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 rounded-xl text-xs font-semibold text-zinc-100 shadow-md flex items-center justify-center gap-3 transition-all active:scale-98 disabled:opacity-50"
            type="button"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isLoading ? 'Connecting to Google...' : 'Sign In with Google'}</span>
          </button>
        </div>

        <div className="mt-6 text-center text-[10px] text-zinc-500">
          Connected to Firebase Authentication
        </div>
      </div>
    </div>
  );
};
