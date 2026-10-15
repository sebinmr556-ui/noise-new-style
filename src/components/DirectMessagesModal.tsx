import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Search, 
  Image as ImageIcon, 
  Heart, 
  Phone, 
  Video, 
  ArrowLeft, 
  Plus, 
  Mic, 
  MicOff,
  PhoneOff
} from 'lucide-react';
import { AppUser } from '../types';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

interface DirectMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
}

interface Message {
  id: string;
  sender: string;
  text: string;
  image?: string;
  time: string;
  isMe: boolean;
  reaction?: string;
}

interface ChatContact {
  id: string;
  name: string;
  username: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  online: boolean;
}

const QUICK_EMOJIS = ['❤️', '🔥', '😂', '😍', '👏'];

const ContactAvatar: React.FC<{ contact: ChatContact; className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({
  contact,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-13 h-13 text-sm',
    lg: 'w-18 h-18 text-xl',
    xl: 'w-24 h-24 text-2xl',
  };

  const hasPhoto = Boolean(
    contact.avatar &&
    !contact.avatar.includes('unsplash.com') &&
    !contact.avatar.includes('ui-avatars.com')
  );

  if (hasPhoto) {
    return (
      <img
        src={contact.avatar}
        alt={contact.name}
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-rose-500/20 via-purple-600/30 to-indigo-600/30 border border-zinc-700/80 flex items-center justify-center font-bold text-white uppercase select-none shadow-xs ${className}`}
    >
      {contact.name.charAt(0)}
    </div>
  );
};

export const DirectMessagesModal: React.FC<DirectMessagesModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  // സാമ്പിൾ കോൺടാക്റ്റുകൾ ഒഴിവാക്കി ശൂന്യമായ അറേ നൽകിയിരിക്കുന്നു
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [threads, setThreads] = useState<Record<string, Message[]>>({});
  const [inputText, setInputText] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [newChatInput, setNewChatInput] = useState('');

  // Simulated Call state
  const [activeCall, setActiveCall] = useState<{ type: 'audio' | 'video'; user: ChatContact; status: string } | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom of active chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads, selectedContact]);

  // ഫയർബേസിൽ നിന്ന് റിയൽ ചാറ്റുകൾ ഫെച്ച് ചെയ്യാനുള്ള കോഡ്
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !currentUser) return;

    const chatsQuery = query(collection(db, 'direct_messages'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const realContacts: ChatContact[] = [];
      const realThreads: Record<string, Message[]> = {};

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // ഇവിടെ നിങ്ങളുടെ ഫയർബേസ് സ്ട്രക്ചർ അനുസരിച്ച് ഡാറ്റ മാപ്പ് ചെയ്യാം
      });

      setContacts(realContacts);
      setThreads(realThreads);
    }, (error) => {
      console.warn('Direct messages sync notice:', error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  if (!isOpen) return null;

  const handleSelectContact = (contact: ChatContact) => {
    setSelectedContact(contact);
    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, unread: false } : c))
    );
  };

  const handleSendMessage = async (textToSend?: string, attachedImage?: string) => {
    const text = textToSend !== undefined ? textToSend : inputText.trim();
    if (!text && !attachedImage) return;
    if (!selectedContact || !currentUser) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: currentUser.username || 'me',
      text: text,
      image: attachedImage,
      time: 'Just now',
      isMe: true,
    };

    setThreads((prev) => ({
      ...prev,
      [selectedContact.id]: [...(prev[selectedContact.id] || []), newMsg],
    }));

    if (textToSend === undefined) {
      setInputText('');
    }

    // ഫയർബേസിലേക്ക് മെസ്സേജ് സേവ് ചെയ്യാൻ
    if (isFirebaseConfigured && db) {
      try {
        await addDoc(collection(db, 'direct_messages'), {
          senderId: currentUser.uid,
          receiverId: selectedContact.id,
          text: text,
          image: attachedImage || '',
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Message send error:', err);
      }
    }
  };

  const handleImageAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      handleSendMessage('', dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleStartNewChat = (e: React.FormEvent) => {
    e.preventDefault();
    const handle = newChatInput.trim().replace(/^@/, '');
    if (!handle) return;

    const existing = contacts.find(
      (c) => c.username.toLowerCase() === handle.toLowerCase()
    );

    if (existing) {
      handleSelectContact(existing);
      setIsComposing(false);
      setNewChatInput('');
      return;
    }

    const newContact: ChatContact = {
      id: `u-${Date.now()}`,
      name: handle.charAt(0).toUpperCase() + handle.slice(1),
      username: handle.toLowerCase(),
      avatar: '',
      lastMessage: 'Started new conversation',
      time: 'Just now',
      unread: false,
      online: true,
    };

    setContacts((prev) => [newContact, ...prev]);
    setSelectedContact(newContact);
    setIsComposing(false);
    setNewChatInput('');
  };

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeMessages = selectedContact ? threads[selectedContact.id] || [] : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex justify-end">
      <div className="w-full sm:max-w-md h-full bg-zinc-950 text-zinc-100 border-l border-zinc-800/80 shadow-2xl flex flex-col animate-drawer-in select-none">
        
        {!selectedContact && (
          <div className="flex flex-col h-full">
            <div className="px-4 py-3.5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-brand text-2xl text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-500 to-purple-500">
                  Noise Direct
                </span>
                <span className="text-[11px] font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                  @{currentUser?.username || 'me'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsComposing(!isComposing)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition-colors"
                  title="New Message"
                  type="button"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition-colors"
                  type="button"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {isComposing && (
              <form onSubmit={handleStartNewChat} className="p-3 bg-zinc-900 border-b border-zinc-800 flex items-center gap-2">
                <input
                  type="text"
                  value={newChatInput}
                  onChange={(e) => setNewChatInput(e.target.value)}
                  placeholder="Enter @username to message..."
                  autoFocus
                  className="flex-1 bg-zinc-950 text-xs text-zinc-100 placeholder-zinc-500 px-3.5 py-2.5 rounded-xl border border-zinc-700/80 focus:outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  disabled={!newChatInput.trim()}
                  className="px-3.5 py-2.5 bg-gradient-to-r from-rose-500 to-purple-600 disabled:opacity-40 text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity"
                >
                  Chat
                </button>
              </form>
            )}

            <div className="p-3 border-b border-zinc-900">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full text-xs pl-9 pr-3.5 py-2.5 bg-zinc-900/90 text-zinc-200 placeholder-zinc-500 rounded-xl border border-zinc-800 focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-24 px-4 text-zinc-500 text-xs">
                  <p className="font-bold text-zinc-400 text-sm mb-1">No messages yet</p>
                  <p>Start a conversation with creators by tapping the plus (+) icon above.</p>
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => handleSelectContact(contact)}
                    className="p-3.5 hover:bg-zinc-900/80 flex items-center gap-3.5 cursor-pointer transition-colors group"
                  >
                    <div className="relative flex-none">
                      <ContactAvatar contact={contact} size="md" className="ring-1 ring-zinc-800" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-semibold text-zinc-200">{contact.name}</p>
                        <span className="text-[10px] text-zinc-500 font-mono">{contact.time}</span>
                      </div>
                      <p className="text-xs text-zinc-400 truncate">{contact.lastMessage}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {selectedContact && (
          <div className="flex flex-col h-full">
            <div className="px-3 py-2.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/90 backdrop-blur-md">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => setSelectedContact(null)}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                  type="button"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <ContactAvatar contact={selectedContact} size="sm" className="ring-1 ring-zinc-700" />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate leading-tight">{selectedContact.name}</h4>
                  <p className="text-[10px] text-zinc-400 truncate">@{selectedContact.username}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-none">
                <button onClick={() => setActiveCall({ type: 'audio', user: selectedContact, status: 'Calling...' })} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg" type="button">
                  <Phone className="w-4 h-4" />
                </button>
                <button onClick={() => setActiveCall({ type: 'video', user: selectedContact, status: 'Calling...' })} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg" type="button">
                  <Video className="w-4 h-4" />
                </button>
                <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg" type="button">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-zinc-950">
              <div className="text-center py-4 border-b border-zinc-900 mb-2">
                <div className="flex justify-center mb-2">
                  <ContactAvatar contact={selectedContact} size="lg" className="ring-2 ring-zinc-800" />
                </div>
                <h3 className="text-sm font-bold text-white">{selectedContact.name}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">@{selectedContact.username} • Noise Direct</p>
              </div>

              {activeMessages.map((msg) => (
                <div key={msg.id} className={`flex flex-col group ${msg.isMe ? 'items-end' : 'items-start'}`}>
                  <div className="relative max-w-[80%]">
                    {msg.image && (
                      <div className="mb-1 rounded-2xl overflow-hidden border border-zinc-800 max-w-[220px]">
                        <img src={msg.image} alt="Attachment" className="w-full h-auto object-cover" />
                      </div>
                    )}
                    {msg.text && (
                      <div className={`px-4 py-2.5 text-xs leading-relaxed ${msg.isMe ? 'bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 text-white rounded-2xl rounded-br-xs shadow-md' : 'bg-zinc-900 text-zinc-100 rounded-2xl rounded-bl-xs border border-zinc-800'}`}>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-zinc-500 mt-1 px-1">{msg.time}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t border-zinc-800/80 bg-zinc-950 flex flex-col gap-2">
              <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full transition-colors flex-none">
                  <ImageIcon className="w-5 h-5" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageAttachment} className="hidden" />

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Message ${selectedContact.name}...`}
                  className="flex-1 bg-zinc-900 text-xs text-zinc-100 placeholder-zinc-500 rounded-full px-4 py-2.5 border border-zinc-800 focus:outline-none focus:border-zinc-600 transition-colors"
                />

                {inputText.trim() ? (
                  <button type="submit" className="p-2.5 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-full hover:opacity-90 active:scale-95 transition-all flex-none">
                    <Send className="w-4 h-4 -rotate-12" />
                  </button>
                ) : (
                  <button type="button" onClick={() => handleSendMessage('❤️')} className="p-2 text-zinc-400 hover:text-[#ff3040] hover:scale-120 transition-all flex-none">
                    <Heart className="w-5 h-5 fill-[#ff3040] text-[#ff3040]" />
                  </button>
                )}
              </form>
            </div>
          </div>
        )}

        {activeCall && (
          <div className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-between p-8 text-center">
            <div className="w-full flex justify-end">
              <button onClick={() => setActiveCall(null)} className="text-zinc-400 hover:text-white p-2" type="button">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative mx-auto w-24 h-24 flex justify-center">
                <ContactAvatar contact={activeCall.user} size="xl" className="ring-4 ring-rose-500/40" />
              </div>
              <h3 className="text-lg font-bold text-white">{activeCall.user.name}</h3>
              <p className="text-xs text-rose-400 font-mono tracking-wide">{activeCall.status}</p>
            </div>

            <div className="flex items-center gap-6">
              <button onClick={() => setIsMuted(!isMuted)} className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-zinc-800 text-rose-400' : 'bg-zinc-800 text-white'}`} type="button">
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <button onClick={() => setActiveCall(null)} className="p-4 rounded-full bg-red-600 text-white shadow-xl" type="button">
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
