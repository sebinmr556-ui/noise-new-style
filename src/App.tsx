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
import { db, isFirebaseConfigured } from './firebase'; // നിങ്ങളുടെ ഫയർബേസ് കോൺഫിഗറേഷൻ ഇംപോർട്ട് ചെയ്യുക
import { Header } from './components/Header';
import { StoriesBar } from './components/StoriesBar';
import { StoryViewerModal } from './components/StoryViewerModal';
import { Story, AppUser } from './types';

export function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>({
    uid: 'user_123',
    username: 'shoebell_shoe',
    photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
  });

  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);

  // ഫയർബേസിൽ നിന്ന് സ്റ്റോറികൾ ലൈവ് ആയി ഫെച്ച് ചെയ്യുക
  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      // ഫയർബേസ് ഇല്ലെങ്കിൽ ഡമ്മി ഡാറ്റ ഉപയോഗിക്കാം
      return;
    }

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

  // സ്റ്റോറി ഡിലീറ്റ് ചെയ്യാനുള്ള മെയിൻ ഫങ്ഷൻ
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
    <div className="min-h-screen bg-zinc-950 text-white pb-16">
      {/* Header */}
      <Header 
        currentUser={currentUser} 
        onOpenLogin={() => {}}
        onSignOut={() => setCurrentUser(null)}
        onOpenDirect={() => {}}
        onOpenNotifications={() => {}}
      />

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

      {/* Main Content / Feed Area */}
      <div className="p-4 text-center text-zinc-500">
        <p>Welcome to Noise Pro Feed</p>
      </div>

      {/* Story Viewer Modal (ഡിലീറ്റ് പ്രോപ് ഇവിടെയാണ് പാസ്സ് ചെയ്തിരിക്കുന്നത്) */}
      {isStoryModalOpen && selectedStoryIndex !== null && (
        <StoryViewerModal
          stories={stories}
          initialIndex={selectedStoryIndex}
          currentUser={currentUser}
          onClose={() => setIsStoryModalOpen(false)}
          onDeleteStory={handleDeleteStory}
        />
      )}
    </div>
  );
}

export default App;
