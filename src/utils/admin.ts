import { AppUser } from '../types';

export const ADMIN_EMAILS = ['sebinmr556@gmail.com'];
export const ADMIN_USERNAMES = ['sebin_mr', 'sebinmr', 'shoebell_shoe'];

export const isGlobalAdmin = (user: AppUser | null | undefined): boolean => {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  const username = (user.username || '').toLowerCase().trim();
  const displayName = (user.displayName || '').toLowerCase().trim();
  const uid = (user.uid || '').toLowerCase().trim();

  return (
    ADMIN_EMAILS.includes(email) ||
    email.startsWith('sebinmr556@') ||
    ADMIN_USERNAMES.includes(username) ||
    username === 'sebin_mr' ||
    displayName === 'sebin_mr' ||
    uid === 'admin' ||
    uid.includes('sebin')
  );
};

export const isVerifiedUser = (
  userOrObj?: { isVerified?: boolean; username?: string; uid?: string } | string | null
): boolean => {
  if (!userOrObj) return false;
  if (typeof userOrObj === 'string') {
    const un = userOrObj.toLowerCase().trim();
    return ADMIN_USERNAMES.includes(un) || un === 'sebin_mr' || un === 'shoebell_shoe' || un.includes('verified');
  }
  if (userOrObj.isVerified) return true;
  const un = (userOrObj.username || '').toLowerCase().trim();
  const uid = (userOrObj.uid || '').toLowerCase().trim();
  return ADMIN_USERNAMES.includes(un) || un === 'sebin_mr' || un === 'shoebell_shoe' || uid === 'admin' || uid.includes('sebin');
};

