import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { Header } from './components/Header';
import { StoriesBar } from './components/StoriesBar';
import { StoryViewerModal } from './components/StoryViewerModal';
import { Story, AppUser } from './types';
import { Home, Search, PlusSquare, Clapperboard, User, Radio } from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>({
    uid: 'user_123',
    username: 'shoebell_shoe',
    photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
  });

  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  
  // നാവിഗേഷൻ ടാബുകളും പേജുകളും ട്രാക്ക് ചെയ്യാൻ
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'rooms' | 'reels' | 'profile'>('home');
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);

  // ഫയർബേസിൽ നിന്ന് സ്റ്റോറികൾ ലൈവ് ആയി ഫെച്ച് ചെയ്യുക
  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;

    const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedStories: Story[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId || data.uid,
          authorId: data.authorId || data.uid,
          uid: data.uid,
          username: data.username,
          avatar: data.avatar,
          mediaUrl: data.mediaUrl,
          caption: data.caption,
          timestamp: 'Just now',
          hasSeen: false,
        };
      });
      setStories(fetchedStories);
    });

    return () => unsubscribe();
  }, []);

  // പുതിയ സ്റ്റോറി ആഡ് ചെയ്യാനുള്ള ഫങ്ഷൻ
  const handleAddUserStory = () => {
    if (!currentUser) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/mp4,video/webm,video/quicktime'; 
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.type.startsWith('video/') && file.size > 1048576) {
        alert("ഫയർബേസ് ഫയർസ്റ്റോറിൽ 1MB വരെയുള്ള ചെറിയ വീഡിയോകൾ മാത്രമേ നേരിട്ട് സേവ് ചെയ്യാൻ കഴിയൂ.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const raw = ev.target?.result as string;

        if (file.type.startsWith('video/')) {
          if (isFirebaseConfigured && db) {
            try {
              addDoc(collection(db, 'stories'), {
                uid: currentUser.uid,
                userId: currentUser.uid,
                username: currentUser.username,
                avatar: currentUser.photoURL,
                mediaUrl: raw,
                caption: 'My video moment 🎥',
                createdAt: serverTimestamp(),
              });
            } catch (err) {
              console.warn('Video story save error:', err);
            }
          }
        } else {
          const img = new Image();
          img.onload = async () => {
            const canvas = document.createElement('canvas');
            const MAX = 800;
            let w = img.width, h = img.height;
            if (w > h) { if (w > MAX) { h = Math.round((h * MAX) / w); w = MAX; } } 
            else { if (h > MAX) { w = Math.round((h * MAX) / h); h = MAX; } }
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              const mediaUrl = canvas.toDataURL('image/jpeg', 0.85);
              if (isFirebaseConfigured && db) {
                try {
                  await addDoc(collection(db, 'stories'), {
                    uid: currentUser.uid,
                    userId: currentUser.uid,
                    username: currentUser.username,
                    avatar: currentUser.photoURL,
                    mediaUrl: mediaUrl,
                    caption: 'My moment ✨',
                    createdAt: serverTimestamp(),
                  });
                } catch (err) {}
              }
            }
          };
          img.src = raw;
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // സ്റ്റോറി ഡിലീറ്റ് ചെയ്യാനുള്ള ഫങ്ഷൻ (മാസ്റ്റർ അഡ്മിൻ പവറോട് കൂടി)
  const handleDeleteStory = async (storyId: string) => {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'stories', storyId));
        setStories(prev => prev.filter(s => s.id !== storyId));
        setIsStoryModalOpen(false);
      } catch (err) {
        console.error("സ്റ്റോറി ഡിലീറ്റ് ചെയ്യുന്നതിൽ പിഴവ്:", err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20 select-none">
      {/* Header */}
      <Header 
        currentUser={currentUser} 
        onOpenLogin={() => {}}
        onSignOut={() => setCurrentUser(null)}
        onOpenDirect={() => {}}
        onOpenNotifications={() => {}}
        onOpenVoiceRooms={() => setActiveTab('rooms')}
        onOpenAdmin={() => setIsAdminDashboardOpen(true)}
      />

      {/* Main Content Area based on Active Tab */}
      {activeTab === 'home' && (
        <div>
          {/* Stories Bar */}
          <StoriesBar 
            stories={stories}
            currentUser={currentUser}
            onOpenStory={(index) => {
              setSelectedStoryIndex(index);
              setIsStoryModalOpen(true);
            }}
            onAddStory={handleAddUserStory}
          />

          {/* Feed Content */}
          <div className="p-4 space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center text-zinc-400">
              <p className="text-lg font-semibold text-white">Welcome to Noise Pro Feed</p>
              <p className="text-sm mt-1">Explore posts, stories, and chatrooms here.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rooms' && (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Radio className="w-6 h-6 text-emerald-500 animate-pulse" />
              Voice Chatrooms
            </h2>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center text-zinc-400">
            <p className="text-white font-medium">Live Voice Rooms are active</p>
            <p className="text-xs mt-1">Join or host rooms seamlessly.</p>
          </div>
        </div>
      )}

      {activeTab === 'search' && (
        <div className="p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-400 text-sm">
            Search users, posts, and tags...
          </div>
        </div>
      )}

      {activeTab === 'reels' && (
        <div className="p-4 text-center text-zinc-400">
          <p className="text-white font-medium">Reels Feed</p>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
            <img 
              src={currentUser?.photoURL || 'https://via.placeholder.com/150'} 
              alt="Profile" 
              className="w-16 h-16 rounded-full object-cover"
            />
            <div>
              <h3 className="font-bold text-lg text-white">{currentUser?.username || 'User'}</h3>
              <p className="text-xs text-zinc-400">Noise Pro Member</p>
            </div>
          </div>
        </div>
      )}

      {/* Story Viewer Modal */}
      {isStoryModalOpen && selectedStoryIndex !== null && (
        <StoryViewerModal
          stories={stories}
          initialIndex={selectedStoryIndex}
          currentUser={currentUser}
          onClose={() => setIsStoryModalOpen(false)}
          onDeleteStory={handleDeleteStory}
        />
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/80 px-4 py-2 flex items-center justify-around">
        <button onClick={() => setActiveTab('home')} className={`p-2 transition-colors ${activeTab === 'home' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
          <Home className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('search')} className={`p-2 transition-colors ${activeTab === 'search' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
          <Search className="w-6 h-6" />
        </button>
        <button onClick={handleAddUserStory} className={`p-2 transition-colors text-zinc-400 hover:text-white`}>
          <PlusSquare className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('reels')} className={`p-2 transition-colors ${activeTab === 'reels' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
          <Clapperboard className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('profile')} className={`p-2 transition-colors ${activeTab === 'profile' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
          <User className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );
}

export default App;
