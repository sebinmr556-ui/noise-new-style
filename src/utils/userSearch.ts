import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  updateDoc, 
  increment,
  query, 
  limit as firestoreLimit 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { PublicUserProfile, AppUser } from '../types';

/**
 * Strips any sensitive properties and ensures only safe public profile data
 * with the real primary key database ID is exposed.
 */
export function sanitizePublicUser(docId: string, data: any): PublicUserProfile {
  const realUid = docId || data.uid || data.userId || '';
  return {
    uid: realUid,
    userId: realUid,
    username: String(data.username || `user_${realUid.slice(0, 6)}`),
    displayName: String(data.displayName || data.username || 'User'),
    avatar: String(data.avatar || data.photoURL || ''),
    bio: typeof data.bio === 'string' ? data.bio : '',
    website: typeof data.website === 'string' ? data.website : '',
    followersCount: typeof data.followersCount === 'number' ? data.followersCount : 0,
    followingCount: typeof data.followingCount === 'number' ? data.followingCount : 0,
    isVerified: Boolean(data.isVerified),
    isPrivate: Boolean(data.isPrivate),
  };
}

/**
 * Searches the actual Firestore 'users' collection for registered users
 * matching username, displayName, or database user ID.
 */
export async function searchRegisteredUsers(
  searchQuery: string,
  options?: {
    currentUser?: AppUser | null;
    maxResults?: number;
  }
): Promise<PublicUserProfile[]> {
  if (!isFirebaseConfigured || !db) {
    console.warn('Firestore database is not configured for user search.');
    return [];
  }

  const currentUser = options?.currentUser;
  const maxResults = options?.maxResults || 25;
  const rawQuery = (searchQuery || '').trim();
  const cleanQ = rawQuery.toLowerCase().replace(/^@/, '').replace(/^id:/, '');

  try {
    const usersCol = collection(db, 'users');
    // If search term is an exact database ID match, check that doc directly first
    let directMatchUser: PublicUserProfile | null = null;
    if (rawQuery.length >= 10 && !rawQuery.includes(' ')) {
      try {
        const directSnap = await getDoc(doc(db, 'users', rawQuery));
        if (directSnap.exists()) {
          directMatchUser = sanitizePublicUser(directSnap.id, directSnap.data());
        }
      } catch (err) {
        console.debug('Direct ID lookup skipped:', err);
      }
    }

    // Query users collection
    const q = query(usersCol, firestoreLimit(maxResults * 3));
    const snapshot = await getDocs(q);

    const resultsMap = new Map<string, PublicUserProfile>();

    if (directMatchUser) {
      resultsMap.set(directMatchUser.uid, directMatchUser);
    }

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const user = sanitizePublicUser(docSnap.id, data);

      // Visibility & Block Check
      if (currentUser) {
        // Exclude current user from their own search results if searching generic terms
        if (user.uid === currentUser.uid && cleanQ.length === 0) {
          return;
        }

        // Respect currentUser's blocked list
        if (currentUser.blockedUsers?.includes(user.uid)) {
          return;
        }

        // Respect target user's blocked list
        if (Array.isArray(data.blockedUsers) && data.blockedUsers.includes(currentUser.uid)) {
          return;
        }
      }

      if (!cleanQ) {
        // Empty query: collect all available users up to limit
        resultsMap.set(user.uid, user);
        return;
      }

      // Case-insensitive matching on real database fields
      const matchUsername = user.username.toLowerCase().includes(cleanQ);
      const matchDisplayName = user.displayName.toLowerCase().includes(cleanQ);
      const matchUserId = user.uid.toLowerCase().includes(cleanQ) || user.userId.toLowerCase().includes(cleanQ);
      const matchBio = user.bio ? user.bio.toLowerCase().includes(cleanQ) : false;

      if (matchUsername || matchDisplayName || matchUserId || matchBio) {
        resultsMap.set(user.uid, user);
      }
    });

    const results = Array.from(resultsMap.values());

    // Sort: exact username/id matches first, then verified, then follower count
    if (cleanQ) {
      results.sort((a, b) => {
        const aExact = a.username.toLowerCase() === cleanQ || a.uid.toLowerCase() === cleanQ;
        const bExact = b.username.toLowerCase() === cleanQ || b.uid.toLowerCase() === cleanQ;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        const aStartsWith = a.username.toLowerCase().startsWith(cleanQ);
        const bStartsWith = b.username.toLowerCase().startsWith(cleanQ);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        return (b.followersCount || 0) - (a.followersCount || 0);
      });
    } else {
      results.sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0));
    }

    return results.slice(0, maxResults);
  } catch (error) {
    console.error('Error querying registered users from database:', error);
    throw error;
  }
}

/**
 * Fetches a single user by their exact real database user ID or username.
 */
export async function getRegisteredUserById(userIdOrUsername: string): Promise<PublicUserProfile | null> {
  if (!isFirebaseConfigured || !db || !userIdOrUsername) return null;

  const target = userIdOrUsername.trim();

  // Try direct document ID lookup (real primary key)
  try {
    const userDocRef = doc(db, 'users', target);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return sanitizePublicUser(snap.id, snap.data());
    }
  } catch (err) {
    console.debug('Direct doc lookup error:', err);
  }

  // Fallback: search by lowercase username in database
  try {
    const cleanHandle = target.toLowerCase().replace(/^@/, '');
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(query(usersCol, firestoreLimit(50)));

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      if (
        docSnap.id === target ||
        (data.username && String(data.username).toLowerCase() === cleanHandle)
      ) {
        return sanitizePublicUser(docSnap.id, data);
      }
    }
  } catch (err) {
    console.error('Error fetching registered user by handle:', err);
  }

  return null;
}

/**
 * Fetches initial suggested registered users from the real database.
 */
export async function getSuggestedDatabaseUsers(
  currentUser: AppUser | null,
  limitCount = 15
): Promise<PublicUserProfile[]> {
  return searchRegisteredUsers('', { currentUser, maxResults: limitCount });
}

/**
 * Saves/updates user account in Firestore 'users' collection using their real Auth UID.
 */
export async function syncUserToDatabase(user: {
  uid: string;
  username: string;
  displayName?: string;
  photoURL?: string;
  avatar?: string;
  bio?: string;
  website?: string;
  followersCount?: number;
  followingCount?: number;
  isVerified?: boolean;
  isPrivate?: boolean;
  blockedUsers?: string[];
}): Promise<void> {
  if (!isFirebaseConfigured || !db || !user.uid) return;

  try {
    const userDocRef = doc(db, 'users', user.uid);
    const payload: Record<string, any> = {
      uid: user.uid,
      userId: user.uid,
      username: user.username,
      displayName: user.displayName || user.username,
      avatar: user.photoURL || user.avatar || '',
      photoURL: user.photoURL || user.avatar || '',
      bio: user.bio || '',
      website: user.website || '',
      updatedAt: new Date().toISOString(),
    };

    if (typeof user.followersCount === 'number') payload.followersCount = user.followersCount;
    if (typeof user.followingCount === 'number') payload.followingCount = user.followingCount;
    if (typeof user.isVerified === 'boolean') payload.isVerified = user.isVerified;
    if (typeof user.isPrivate === 'boolean') payload.isPrivate = user.isPrivate;
    if (Array.isArray(user.blockedUsers)) payload.blockedUsers = user.blockedUsers;

    await setDoc(userDocRef, payload, { merge: true });
  } catch (err) {
    console.error('Failed to sync user profile to database:', err);
  }
}

/**
 * Updates follower/following relationships and counts in Firestore using real user IDs.
 */
export async function toggleFollowInDatabase(
  currentUserId: string,
  targetUserId: string,
  isFollowing: boolean
): Promise<void> {
  if (!isFirebaseConfigured || !db || !currentUserId || !targetUserId) return;
  if (currentUserId === targetUserId) return;

  try {
    // Update target user's followersCount
    const targetRef = doc(db, 'users', targetUserId);
    await updateDoc(targetRef, {
      followersCount: increment(isFollowing ? 1 : -1)
    }).catch(async () => {
      // If doc didn't have followersCount, merge it
      await setDoc(targetRef, {
        followersCount: isFollowing ? 1 : 0
      }, { merge: true });
    });

    // Update currentUser's followingCount
    const currentUserRef = doc(db, 'users', currentUserId);
    await updateDoc(currentUserRef, {
      followingCount: increment(isFollowing ? 1 : -1)
    }).catch(async () => {
      await setDoc(currentUserRef, {
        followingCount: isFollowing ? 1 : 0
      }, { merge: true });
    });
  } catch (err) {
    console.debug('Follow relationship database sync warning:', err);
  }
}
