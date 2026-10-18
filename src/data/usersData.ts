import { PublicUserProfile, Post } from '../types';

export const KNOWN_USERS: PublicUserProfile[] = [
  {
    uid: 'host-maya',
    userId: 'maya_9021',
    username: 'maya_beats',
    displayName: 'Maya Beats',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    bio: 'Producer & Beatmaker 🎧 | Live Rooms host & sound designer',
    website: 'https://soundcloud.com/mayabeats',
    followersCount: 1420,
    followingCount: 230,
    isVerified: true,
  },
  {
    uid: 'host-dev',
    userId: 'alex_4082',
    username: 'alex_codes',
    displayName: 'Alex C.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    bio: 'Building apps & open-source 🚀 | Tech creator & indie maker',
    website: 'https://github.com/alexcodes',
    followersCount: 3890,
    followingCount: 412,
    isVerified: true,
  },
  {
    uid: 'user-kai',
    userId: 'kai_7719',
    username: 'kai_dj',
    displayName: 'Kai Music',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
    bio: 'Electronic vibes, live synth & DJ sets ⚡️',
    website: 'https://spotify.com/artist/kaidj',
    followersCount: 2510,
    followingCount: 180,
    isVerified: true,
  },
  {
    uid: 'user-elena',
    userId: 'elena_5190',
    username: 'elena_lens',
    displayName: 'Elena Lens',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    bio: 'Street & portrait photography 📸 | Tokyo & Paris visual journey',
    website: 'https://elenalens.com',
    followersCount: 5200,
    followingCount: 320,
    isVerified: true,
  },
  {
    uid: 'user-sam',
    userId: 'sam_3301',
    username: 'sam_travels',
    displayName: 'Sam R.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    bio: 'Wanderlust & mountain trails 🏔️ Always on the move',
    followersCount: 890,
    followingCount: 440,
    isVerified: false,
  },
  {
    uid: 'user-sarah',
    userId: 'sarah_6628',
    username: 'sarah_lens',
    displayName: 'Sarah Photography',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    bio: 'Visual stories & cinematic frames 🎬 Minimalist aesthetics',
    website: 'https://sarahvisuals.art',
    followersCount: 4100,
    followingCount: 290,
    isVerified: true,
  },
  {
    uid: 'david_k',
    userId: 'david_9124',
    username: 'david_k',
    displayName: 'David Kim',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80',
    bio: 'Coffee, architecture & brutalist design ☕️ Urban explorer',
    followersCount: 1780,
    followingCount: 215,
    isVerified: true,
  },
  {
    uid: 'shoebell_shoe',
    userId: 'shoebell_8888',
    username: 'shoebell_shoe',
    displayName: 'Shoebell Official',
    avatar: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=200&q=80',
    bio: 'Exclusive sneaker drops & street style kicks 👟',
    website: 'https://shoebell.shop',
    followersCount: 9800,
    followingCount: 45,
    isVerified: true,
  },
];

/**
 * Extracts and consolidates all known users from the preset list plus any authors
 * who posted or commented in the application.
 */
export function getAllDiscoverableUsers(posts: Post[] = []): PublicUserProfile[] {
  const usersMap = new Map<string, PublicUserProfile>();

  // Add predefined creators first
  for (const user of KNOWN_USERS) {
    usersMap.set(user.username.toLowerCase(), user);
    usersMap.set(user.uid.toLowerCase(), user);
    usersMap.set(user.userId.toLowerCase(), user);
  }

  // Extract from posts
  for (const post of posts) {
    if (!post.username) continue;
    const key = post.username.toLowerCase();
    if (!usersMap.has(key)) {
      const generatedId = `id_${post.username.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${(post.uid || 'usr').slice(0, 4)}`;
      usersMap.set(key, {
        uid: post.uid || `uid-${key}`,
        userId: generatedId,
        username: post.username,
        displayName: post.username,
        avatar: post.avatar || '',
        bio: `Noise Creator | Sharing moments ✨`,
        followersCount: Math.floor(Math.random() * 200) + 12,
        followingCount: Math.floor(Math.random() * 100) + 5,
        isVerified: post.isVerified || false,
      });
    }
  }

  // Deduplicate by username
  const uniqueUsers: PublicUserProfile[] = [];
  const seenUsernames = new Set<string>();

  for (const user of usersMap.values()) {
    const un = user.username.toLowerCase();
    if (!seenUsernames.has(un)) {
      seenUsernames.add(un);
      uniqueUsers.push(user);
    }
  }

  return uniqueUsers;
}
