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
  PhoneOff,
  Check,
  CheckCheck,
  Smile,
  Play,
  Pause,
  MoreVertical,
  Trash2,
  Sparkles,
  Volume2,
  Copy,
  Bell,
  BellOff,
  Maximize2
} from 'lucide-react';
import { AppUser } from '../types';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { isVerifiedUser } from '../utils/admin';

interface DirectMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  initialTargetUsername?: string | null;
}

interface Message {
  id: string;
  sender: string;
  text: string;
  image?: string;
  voiceDuration?: string;
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
  category?: 'primary' | 'general';
}

const DEFAULT_CONTACTS: ChatContact[] = [
  {
    id: 'u-alex',
    name: 'Alex Creates',
    username: 'alex_creates',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    lastMessage: 'Hey! Loved your recent story ✨',
    time: '2m ago',
    unread: true,
    online: true,
    category: 'primary',
  },
  {
    id: 'u-maya',
    name: 'Maya Beats',
    username: 'maya_beats',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    lastMessage: 'Are you hopping in the voice chatroom today? 🎧',
    time: '24m ago',
    unread: false,
    online: true,
    category: 'primary',
  },
  {
    id: 'u-kai',
    name: 'Kai DJ',
    username: 'kai_dj',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
    lastMessage: 'Sent a voice clip',
    time: '1h ago',
    unread: false,
    online: false,
    category: 'general',
  },
  {
    id: 'u-shoebell',
    name: 'Noise Official',
    username: 'shoebell_shoe',
    avatar: '',
    lastMessage: 'Welcome to Noise! Enjoy the music & stories 🚀',
    time: '1d ago',
    unread: false,
    online: true,
    category: 'primary',
  },
];

const DEFAULT_THREADS: Record<string, Message[]> = {
  'u-alex': [
    {
      id: 'm1',
      sender: 'alex_creates',
      text: 'Hey! Welcome to Noise Direct 👋',
      time: '10:15 AM',
      isMe: false,
      reaction: '❤️',
    },
    {
      id: 'm2',
      sender: 'alex_creates',
      text: 'Loved your recent story and photos! What camera filter was that?',
      time: '10:16 AM',
      isMe: false,
    },
  ],
  'u-maya': [
    {
      id: 'm3',
      sender: 'maya_beats',
      text: 'Hey! We are hosting a live lofi music room later tonight 🎵',
      time: '11:20 AM',
      isMe: false,
    },
    {
      id: 'm4',
      sender: 'maya_beats',
      text: 'Are you hopping in the voice chatroom today? 🎧',
      time: '11:21 AM',
      isMe: false,
    },
  ],
  'u-kai': [
    {
      id: 'm5',
      sender: 'kai_dj',
      text: 'Check out the new mix I uploaded to Reels!',
      time: 'Yesterday',
      isMe: false,
    },
    {
      id: 'm6',
      sender: 'kai_dj',
      text: '',
      voiceDuration: '0:14',
      time: 'Yesterday',
      isMe: false,
    },
  ],
  'u-shoebell': [
    {
      id: 'm7',
      sender: 'shoebell_shoe',
      text: 'Welcome to Noise! Create posts, stream voice chatrooms, and connect with people 🚀',
      time: '2 days ago',
      isMe: false,
    },
  ],
};

const SUGGESTED_USERS = [
  { name: 'Alex Creates', username: 'alex_creates', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80' },
  { name: 'Maya Beats', username: 'maya_beats', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80' },
  { name: 'Kai DJ', username: 'kai_dj', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80' },
  { name: 'Elena Visuals', username: 'elena_lens', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80' },
  { name: 'Noise Official', username: 'shoebell_shoe', avatar: '' },
];

const ContactAvatar: React.FC<{ contact: ChatContact; className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({
  contact,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-2xl',
  };

  const hasPhoto = Boolean(
    contact.avatar &&
    !contact.avatar.includes('ui-avatars.com')
  );

  if (hasPhoto) {
    return (
      <div className="relative inline-block">
        <img
          src={contact.avatar}
          alt={contact.name}
          className={`${sizeClasses[size]} rounded-full object-cover border border-[#3a1af2]/40 ${className}`}
        />
        {contact.online && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-950 shadow-sm" />
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-rose-500 via-purple-600 to-indigo-600 border border-[#3a1af2]/40 flex items-center justify-center font-bold text-white uppercase select-none shadow-md ${className}`}
      >
        {contact.name.charAt(0)}
      </div>
      {contact.online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-950 shadow-sm" />
      )}
    </div>
  );
};

export const DirectMessagesModal: React.FC<DirectMessagesModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialTargetUsername,
}) => {
  const [contacts, setContacts] = useState<ChatContact[]>(() => {
    try {
      const saved = localStorage.getItem('noise_dm_contacts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_CONTACTS;
  });

  const [threads, setThreads] = useState<Record<string, Message[]>>(() => {
    try {
      const saved = localStorage.getItem('noise_dm_threads');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_THREADS;
  });

  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [inboxTab, setInboxTab] = useState<'primary' | 'general'>('primary');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [newChatInput, setNewChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioRecordSeconds, setAudioRecordSeconds] = useState(0);

  // Enhancements for rich inbox experience
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isThreadMenuOpen, setIsThreadMenuOpen] = useState(false);
  const [isMutedThread, setIsMutedThread] = useState(false);
  const [threadSearchQuery, setThreadSearchQuery] = useState('');
  const [showThreadSearch, setShowThreadSearch] = useState(false);

  // Call simulation state
  const [activeCall, setActiveCall] = useState<{
    type: 'audio' | 'video';
    user: ChatContact;
    status: string;
    duration: number;
  } | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordTimerRef = useRef<any>(null);
  const callTimerRef = useRef<any>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads, selectedContact, isTyping]);

  // Persist contacts and threads to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('noise_dm_contacts', JSON.stringify(contacts));
      localStorage.setItem('noise_dm_threads', JSON.stringify(threads));
    } catch {}
  }, [contacts, threads]);

  // Open initial target username if requested from stories/posts
  useEffect(() => {
    if (initialTargetUsername && isOpen) {
      const cleanHandle = initialTargetUsername.toLowerCase().replace('@', '');
      const existing = contacts.find((c) => c.username.toLowerCase() === cleanHandle);
      if (existing) {
        setSelectedContact(existing);
      } else {
        const newContact: ChatContact = {
          id: `u-${cleanHandle}`,
          name: cleanHandle.charAt(0).toUpperCase() + cleanHandle.slice(1),
          username: cleanHandle,
          avatar: '',
          lastMessage: 'Started new conversation',
          time: 'Just now',
          unread: false,
          online: true,
          category: 'primary',
        };
        setContacts((prev) => [newContact, ...prev]);
        setSelectedContact(newContact);
      }
    }
  }, [initialTargetUsername, isOpen]);

  // Handle call timer
  useEffect(() => {
    if (activeCall && activeCall.status === 'Connected') {
      callTimerRef.current = setInterval(() => {
        setActiveCall((prev) => prev ? { ...prev, duration: prev.duration + 1 } : null);
      }, 1000);
      return () => clearInterval(callTimerRef.current);
    }
  }, [activeCall?.status]);

  if (!isOpen) return null;

  const handleSelectContact = (contact: ChatContact) => {
    setSelectedContact(contact);
    setShowThreadSearch(false);
    setThreadSearchQuery('');
    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, unread: false } : c))
    );
  };

  const handleSendMessage = async (textToSend?: string, attachedImage?: string, voiceDuration?: string) => {
    const text = textToSend !== undefined ? textToSend : inputText.trim();
    if (!text && !attachedImage && !voiceDuration) return;
    if (!selectedContact) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: currentUser?.username || 'me',
      text: text,
      image: attachedImage,
      voiceDuration: voiceDuration,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
    };

    const targetContactId = selectedContact.id;
    const targetUsername = selectedContact.username;

    setThreads((prev) => ({
      ...prev,
      [targetContactId]: [...(prev[targetContactId] || []), newMsg],
    }));

    setContacts((prev) =>
      prev.map((c) =>
        c.id === targetContactId
          ? {
              ...c,
              lastMessage: text || (attachedImage ? '📷 Photo' : '🎙️ Voice note'),
              time: 'Just now',
            }
          : c
      )
    );

    if (textToSend === undefined) {
      setInputText('');
    }

    // Firestore sync if configured
    if (isFirebaseConfigured && db && currentUser) {
      try {
        await addDoc(collection(db, 'direct_messages'), {
          senderId: currentUser.uid,
          receiverId: targetContactId,
          text: text,
          image: attachedImage || '',
          voiceDuration: voiceDuration || '',
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Direct message sync error:', err);
      }
    }

    // Simulate smart interactive reply after 1.5 seconds from contact
    triggerSimulatedReply(targetContactId, targetUsername, text);
  };

  const triggerSimulatedReply = (contactId: string, contactUsername: string, userText: string) => {
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const replies = [
          `Hey! Thanks for the message 😊`,
          `Appreciate you reaching out! Hope you're enjoying Noise ✨`,
          `Love that! Are you tuning into the voice room later? 🎧`,
          `Totally agree! Let's talk more soon 🚀`,
          `🔥 That is awesome!`,
          `Nice! Looking forward to your next story post 📸`,
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];

        const replyMsg: Message = {
          id: `reply-${Date.now()}`,
          sender: contactUsername,
          text: randomReply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isMe: false,
        };

        setThreads((prev) => ({
          ...prev,
          [contactId]: [...(prev[contactId] || []), replyMsg],
        }));

        setContacts((prev) =>
          prev.map((c) =>
            c.id === contactId
              ? {
                  ...c,
                  lastMessage: randomReply,
                  time: 'Just now',
                  unread: selectedContact?.id !== contactId,
                }
              : c
          )
        );
      }, 1500);
    }, 800);
  };

  // Image attachment
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

  // Simulated Voice Note recording
  const startVoiceRecording = () => {
    setIsRecordingAudio(true);
    setAudioRecordSeconds(0);
    recordTimerRef.current = setInterval(() => {
      setAudioRecordSeconds((s) => s + 1);
    }, 1000);
  };

  const stopVoiceRecording = (send: boolean) => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setIsRecordingAudio(false);
    if (send && audioRecordSeconds > 0) {
      const durationStr = `0:${audioRecordSeconds < 10 ? '0' : ''}${audioRecordSeconds}`;
      handleSendMessage('', undefined, durationStr);
    }
    setAudioRecordSeconds(0);
  };

  // Voice playback simulation
  const handleToggleVoicePlayback = (msgId: string) => {
    if (playingVoiceId === msgId) {
      setPlayingVoiceId(null);
    } else {
      setPlayingVoiceId(msgId);
      setTimeout(() => {
        setPlayingVoiceId((curr) => (curr === msgId ? null : curr));
      }, 4000);
    }
  };

  // Toggle emoji reaction on message
  const handleToggleReaction = (msgId: string, emoji: string) => {
    if (!selectedContact) return;
    setThreads((prev) => ({
      ...prev,
      [selectedContact.id]: (prev[selectedContact.id] || []).map((m) =>
        m.id === msgId ? { ...m, reaction: m.reaction === emoji ? undefined : emoji } : m
      ),
    }));
  };

  // Delete/unsend message
  const handleDeleteMessage = (msgId: string) => {
    if (!selectedContact) return;
    setThreads((prev) => {
      const updated = (prev[selectedContact.id] || []).filter((m) => m.id !== msgId);
      const lastMsg = updated[updated.length - 1];
      setContacts((prevC) =>
        prevC.map((c) =>
          c.id === selectedContact.id
            ? {
                ...c,
                lastMessage: lastMsg ? lastMsg.text || (lastMsg.image ? '📷 Photo' : '🎙️ Voice note') : 'No messages',
                time: lastMsg ? lastMsg.time : '',
              }
            : c
        )
      );
      return { ...prev, [selectedContact.id]: updated };
    });
  };

  // Copy message text
  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Clear thread history
  const handleClearThread = () => {
    if (!selectedContact) return;
    setThreads((prev) => ({ ...prev, [selectedContact.id]: [] }));
    setContacts((prev) =>
      prev.map((c) => (c.id === selectedContact.id ? { ...c, lastMessage: 'No messages', time: '' } : c))
    );
    setIsThreadMenuOpen(false);
  };

  // Start new chat with username
  const handleStartNewChat = (e?: React.FormEvent, customHandle?: string) => {
    if (e) e.preventDefault();
    const handle = (customHandle || newChatInput).trim().replace(/^@/, '');
    if (!handle) return;

    const existing = contacts.find((c) => c.username.toLowerCase() === handle.toLowerCase());
    if (existing) {
      handleSelectContact(existing);
      setIsComposing(false);
      setNewChatInput('');
      return;
    }

    const newContact: ChatContact = {
      id: `u-${handle.toLowerCase()}`,
      name: handle.charAt(0).toUpperCase() + handle.slice(1),
      username: handle.toLowerCase(),
      avatar: '',
      lastMessage: 'Started new conversation',
      time: 'Just now',
      unread: false,
      online: true,
      category: 'primary',
    };

    setContacts((prev) => [newContact, ...prev]);
    setSelectedContact(newContact);
    setIsComposing(false);
    setNewChatInput('');
  };

  // Start call simulation
  const startCall = (type: 'audio' | 'video') => {
    if (!selectedContact) return;
    setActiveCall({ type, user: selectedContact, status: 'Calling...', duration: 0 });
    setTimeout(() => {
      setActiveCall((prev) => prev ? { ...prev, status: 'Ringing...' } : null);
      setTimeout(() => {
        setActiveCall((prev) => prev ? { ...prev, status: 'Connected' } : null);
      }, 2000);
    }, 1500);
  };

  const formatCallTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = c.category ? c.category === inboxTab : true;
    return matchesSearch && (searchQuery.trim() ? true : matchesTab);
  });

  const rawMessages = selectedContact ? threads[selectedContact.id] || [] : [];
  const activeMessages = threadSearchQuery.trim()
    ? rawMessages.filter((m) => m.text?.toLowerCase().includes(threadSearchQuery.toLowerCase()))
    : rawMessages;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex justify-end">
      <div className="w-full sm:max-w-md h-full bg-zinc-950 text-zinc-100 border-l border-zinc-800/80 shadow-2xl flex flex-col animate-drawer-in select-none">
        
        {/* INBOX LIST VIEW */}
        {!selectedContact && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-brand text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500">
                  Noise Direct
                </span>
                <span className="text-[11px] font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                  @{currentUser?.username || 'me'}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsComposing(!isComposing)}
                  className={`p-2 rounded-xl transition-all ${
                    isComposing 
                      ? 'bg-rose-500/20 text-rose-400' 
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
                  }`}
                  title="New Message"
                  type="button"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-xl transition-colors"
                  type="button"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Compose New Message Input & Suggested Users */}
            {isComposing && (
              <div className="p-3 bg-zinc-900/95 border-b border-zinc-800 space-y-2.5 animate-in fade-in duration-150">
                <form onSubmit={handleStartNewChat} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newChatInput}
                    onChange={(e) => setNewChatInput(e.target.value)}
                    placeholder="Type @username to start chat..."
                    autoFocus
                    className="flex-1 bg-zinc-950 text-xs text-zinc-100 placeholder-zinc-500 px-3.5 py-2.5 rounded-xl border border-zinc-700 focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="submit"
                    disabled={!newChatInput.trim()}
                    className="px-3.5 py-2.5 bg-gradient-to-r from-rose-500 to-purple-600 disabled:opacity-40 text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Chat
                  </button>
                </form>

                {/* Suggested user chips */}
                <div className="pt-1">
                  <p className="text-[10px] text-zinc-400 font-semibold mb-1.5 uppercase tracking-wider">Suggested creators:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_USERS.map((u) => (
                      <button
                        key={u.username}
                        type="button"
                        onClick={() => handleStartNewChat(undefined, u.username)}
                        className="flex items-center gap-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 px-2.5 py-1 rounded-full text-xs text-zinc-300 transition-all active:scale-95"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>@{u.username}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Search Bar */}
            <div className="p-3 border-b border-zinc-900">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search direct messages..."
                  className="w-full text-xs pl-9 pr-3.5 py-2 bg-zinc-900 text-zinc-200 placeholder-zinc-500 rounded-xl border border-zinc-800/80 focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>
            </div>

            {/* Inbox Filter Tabs: Primary / General */}
            <div className="flex border-b border-zinc-900 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setInboxTab('primary')}
                className={`flex-1 py-2.5 text-center transition-colors relative ${
                  inboxTab === 'primary' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Primary
                {inboxTab === 'primary' && (
                  <span className="absolute bottom-0 inset-x-8 h-0.5 bg-rose-500 rounded-full" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setInboxTab('general')}
                className={`flex-1 py-2.5 text-center transition-colors relative ${
                  inboxTab === 'general' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                General
                {inboxTab === 'general' && (
                  <span className="absolute bottom-0 inset-x-8 h-0.5 bg-rose-500 rounded-full" />
                )}
              </button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/80">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-20 px-4 text-zinc-500 text-xs">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-400">
                    <Send className="w-5 h-5 -rotate-12" />
                  </div>
                  <p className="font-bold text-zinc-300 text-sm mb-1">No messages here</p>
                  <p>Send photos, voice notes, and private messages to friends.</p>
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => handleSelectContact(contact)}
                    className="p-3.5 hover:bg-zinc-900/70 flex items-center gap-3.5 cursor-pointer transition-colors group"
                  >
                    <div className="flex-none">
                      <ContactAvatar contact={contact} size="md" className="ring-1 ring-zinc-800" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1 min-w-0">
                          <p className="text-xs font-bold text-zinc-100 truncate">{contact.name}</p>
                          {isVerifiedUser(contact) && (
                            <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] flex-none">
                              ✓
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono flex-none ml-2">{contact.time}</span>
                      </div>
                      <p className={`text-xs truncate ${contact.unread ? 'font-bold text-white' : 'text-zinc-400'}`}>
                        {contact.lastMessage}
                      </p>
                    </div>
                    {contact.unread && (
                      <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-rose-500 to-purple-600 flex-none shadow-xs" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* CHAT THREAD VIEW */}
        {selectedContact && (
          <div className="flex flex-col h-full">
            {/* Chat Thread Header */}
            <div className="px-3 py-2.5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/90 backdrop-blur-md relative">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={() => setSelectedContact(null)}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                  type="button"
                  title="Back to Inbox"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <ContactAvatar contact={selectedContact} size="sm" className="ring-1 ring-zinc-700" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-bold text-white truncate leading-tight">{selectedContact.name}</h4>
                    {isVerifiedUser(selectedContact) && (
                      <span className="w-3 h-3 rounded-full bg-blue-500 text-white flex items-center justify-center text-[7px] flex-none">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate">
                    {selectedContact.online ? (
                      <span className="text-emerald-400 font-medium">Active now</span>
                    ) : (
                      `@${selectedContact.username}`
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Audio Call, Video Call, Search, Thread Menu, Close */}
              <div className="flex items-center gap-1 flex-none">
                <button
                  onClick={() => startCall('audio')}
                  className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                  type="button"
                  title="Voice Call"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => startCall('video')}
                  className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                  type="button"
                  title="Video Call"
                >
                  <Video className="w-4 h-4" />
                </button>
                
                {/* 3-dots thread menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsThreadMenuOpen(!isThreadMenuOpen)}
                    className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                    type="button"
                    title="Conversation Options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {isThreadMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1 z-30 animate-in fade-in zoom-in-95">
                      <button
                        onClick={() => {
                          setShowThreadSearch(!showThreadSearch);
                          setIsThreadMenuOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800 flex items-center gap-2"
                      >
                        <Search className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Search in chat</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsMutedThread(!isMutedThread);
                          setIsThreadMenuOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800 flex items-center gap-2"
                      >
                        {isMutedThread ? <Bell className="w-3.5 h-3.5 text-zinc-400" /> : <BellOff className="w-3.5 h-3.5 text-zinc-400" />}
                        <span>{isMutedThread ? 'Unmute chat' : 'Mute chat'}</span>
                      </button>
                      <button
                        onClick={handleClearThread}
                        className="w-full px-3 py-2 text-left text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 border-t border-zinc-800"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Clear conversation</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={onClose}
                  className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                  type="button"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* In-Thread Search Bar */}
            {showThreadSearch && (
              <div className="px-3 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center gap-2 animate-in fade-in">
                <Search className="w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={threadSearchQuery}
                  onChange={(e) => setThreadSearchQuery(e.target.value)}
                  placeholder="Filter messages in this chat..."
                  autoFocus
                  className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
                />
                {threadSearchQuery && (
                  <button onClick={() => setThreadSearchQuery('')} className="text-zinc-400 hover:text-white text-xs">
                    Clear
                  </button>
                )}
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-zinc-950">
              {/* User Profile Info Card in Chat */}
              <div className="text-center py-5 border-b border-zinc-900 mb-3">
                <div className="flex justify-center mb-2">
                  <ContactAvatar contact={selectedContact} size="lg" className="ring-2 ring-[#3a1af2]/50 shadow-xl" />
                </div>
                <h3 className="text-sm font-bold text-white flex items-center justify-center gap-1">
                  {selectedContact.name}
                  {isVerifiedUser(selectedContact) && (
                    <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px]">
                      ✓
                    </span>
                  )}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">@{selectedContact.username} • Instagram Direct</p>
                <p className="text-[10px] text-zinc-500 mt-1">End-to-end encrypted messaging</p>
              </div>

              {/* Message Bubbles */}
              {activeMessages.map((msg) => (
                <div key={msg.id} className={`flex flex-col group ${msg.isMe ? 'items-end' : 'items-start'}`}>
                  <div className="relative max-w-[82%]">
                    {/* Attached Photo */}
                    {msg.image && (
                      <div 
                        onClick={() => setLightboxImage(msg.image || null)}
                        className="mb-1 rounded-2xl overflow-hidden border border-zinc-800 max-w-[240px] shadow-lg cursor-pointer hover:opacity-95 transition-opacity group/img relative"
                      >
                        <img src={msg.image} alt="Attachment" className="w-full h-auto object-cover" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                          <Maximize2 className="w-5 h-5 text-white drop-shadow" />
                        </div>
                      </div>
                    )}

                    {/* Voice Note Clip with Playback */}
                    {msg.voiceDuration && (
                      <div className={`px-3.5 py-2.5 rounded-2xl flex items-center gap-2.5 shadow-md ${
                        msg.isMe 
                          ? 'bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 text-white rounded-br-xs' 
                          : 'bg-zinc-900 border border-zinc-800 text-white rounded-bl-xs'
                      }`}>
                        <button
                          type="button"
                          onClick={() => handleToggleVoicePlayback(msg.id)}
                          className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all active:scale-90"
                          title={playingVoiceId === msg.id ? "Pause Voice Clip" : "Play Voice Clip"}
                        >
                          {playingVoiceId === msg.id ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>
                        <div className="flex items-center gap-1">
                          <div className={`w-1 rounded-full transition-all duration-200 ${playingVoiceId === msg.id ? 'h-4 bg-white animate-pulse' : 'h-3 bg-white/80'}`} />
                          <div className={`w-1 rounded-full transition-all duration-200 ${playingVoiceId === msg.id ? 'h-6 bg-white' : 'h-5 bg-white/90'}`} />
                          <div className={`w-1 rounded-full transition-all duration-200 ${playingVoiceId === msg.id ? 'h-3 bg-white' : 'h-2 bg-white/60'}`} />
                          <div className={`w-1 rounded-full transition-all duration-200 ${playingVoiceId === msg.id ? 'h-5 bg-white' : 'h-4 bg-white/80'}`} />
                          <div className={`w-1 rounded-full transition-all duration-200 ${playingVoiceId === msg.id ? 'h-4 bg-white' : 'h-3 bg-white/60'}`} />
                        </div>
                        <span className="text-[10px] font-mono opacity-90">{msg.voiceDuration}</span>
                      </div>
                    )}

                    {/* Message Text Bubble */}
                    {msg.text && (
                      <div 
                        onDoubleClick={() => handleToggleReaction(msg.id, '❤️')}
                        className={`px-4 py-2.5 text-xs leading-relaxed transition-all cursor-pointer ${
                          msg.isMe 
                            ? 'bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 text-white rounded-2xl rounded-br-xs shadow-md' 
                            : 'bg-zinc-900 text-zinc-100 rounded-2xl rounded-bl-xs border border-zinc-800'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    )}

                    {/* Reaction Badge on Bubble */}
                    {msg.reaction && (
                      <div className="absolute -bottom-2 right-1 bg-zinc-900 border border-zinc-800 rounded-full px-1.5 py-0.5 text-xs shadow-md animate-in zoom-in-75">
                        {msg.reaction}
                      </div>
                    )}

                    {/* Hover Reaction & Actions Toolbar */}
                    <div className="absolute -top-7 right-0 hidden group-hover:flex items-center gap-1 bg-zinc-900/95 border border-zinc-800 rounded-full px-2 py-0.5 shadow-xl z-10 backdrop-blur-sm">
                      {['❤️', '🔥', '😂', '👏', '😍'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleToggleReaction(msg.id, emoji)}
                          className="hover:scale-130 transition-transform text-xs"
                        >
                          {emoji}
                        </button>
                      ))}

                      {/* Copy message button */}
                      {msg.text && (
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.text)}
                          className="hover:scale-120 transition-transform text-zinc-400 hover:text-white p-0.5"
                          title="Copy text"
                        >
                          {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}

                      {/* Delete/unsend message button */}
                      {msg.isMe && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="hover:scale-120 transition-transform text-zinc-400 hover:text-rose-400 p-0.5"
                          title="Unsend Message"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Timestamp & Read Receipt */}
                  <div className="flex items-center gap-1 text-[9px] text-zinc-500 mt-1 px-1">
                    <span>{msg.time}</span>
                    {msg.isMe && (
                      <CheckCheck className="w-3 h-3 text-sky-400 inline" />
                    )}
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex items-center gap-2 text-zinc-400 text-xs py-1 animate-in fade-in">
                  <div className="px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-[10px] text-zinc-500">{selectedContact.name} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Emoji Reaction Shortcuts */}
            <div className="px-3 py-1 bg-zinc-950 border-t border-zinc-900 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] text-zinc-500 pl-1 font-semibold flex-none">Quick:</span>
              {['🔥', '❤️', '😂', '😍', '🙌', '👏', '✨', '💯'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSendMessage(emoji)}
                  className="px-2 py-0.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-xs hover:scale-120 transition-all flex-none border border-zinc-800/60"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Chat Input & Recording Bar */}
            <div className="p-3 border-t border-zinc-800/80 bg-zinc-950 flex flex-col gap-2">
              {isRecordingAudio ? (
                /* Live Voice Note Recording Bar */
                <div className="flex items-center justify-between p-2 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 px-4 animate-pulse">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-xs font-mono font-bold">
                      Recording: 0:{audioRecordSeconds < 10 ? '0' : ''}{audioRecordSeconds}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => stopVoiceRecording(false)}
                      className="text-xs text-zinc-400 hover:text-white px-2 py-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => stopVoiceRecording(true)}
                      className="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-500"
                    >
                      Send Note
                    </button>
                  </div>
                </div>
              ) : (
                /* Standard Message Input Form */
                <form 
                  onSubmit={(e) => { 
                    e.preventDefault(); 
                    handleSendMessage(); 
                  }} 
                  className="flex items-center gap-2"
                >
                  {/* Photo Attachment Button */}
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full transition-colors flex-none"
                    title="Attach Photo"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageAttachment} className="hidden" />

                  {/* Mic Voice Note Button */}
                  <button
                    type="button"
                    onClick={startVoiceRecording}
                    className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 rounded-full transition-colors flex-none"
                    title="Record Voice Note"
                  >
                    <Mic className="w-5 h-5" />
                  </button>

                  {/* Text Input */}
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Message ${selectedContact.name}...`}
                    className="flex-1 bg-zinc-900 text-xs text-zinc-100 placeholder-zinc-500 rounded-full px-4 py-2.5 border border-zinc-800 focus:outline-none focus:border-zinc-600 transition-colors"
                  />

                  {/* Send or Heart Button */}
                  {inputText.trim() ? (
                    <button 
                      type="submit" 
                      className="p-2.5 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-full hover:opacity-90 active:scale-95 transition-all flex-none shadow-md shadow-rose-500/20"
                    >
                      <Send className="w-4 h-4 -rotate-12" />
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => handleSendMessage('❤️')} 
                      className="p-2 text-zinc-400 hover:text-[#ff3040] hover:scale-120 transition-all flex-none"
                      title="Send Heart"
                    >
                      <Heart className="w-5 h-5 fill-[#ff3040] text-[#ff3040]" />
                    </button>
                  )}
                </form>
              )}
            </div>
          </div>
        )}

        {/* PHOTO LIGHTBOX MODAL */}
        {lightboxImage && (
          <div 
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          >
            <div className="relative max-w-lg max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white"
                type="button"
              >
                <X className="w-6 h-6" />
              </button>
              <img src={lightboxImage} alt="Enlarged" className="rounded-2xl max-h-[80vh] w-auto object-contain shadow-2xl border border-white/10" />
            </div>
          </div>
        )}

        {/* ACTIVE AUDIO / VIDEO CALL OVERLAY */}
        {activeCall && (
          <div className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-between p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="w-full flex justify-end">
              <button onClick={() => setActiveCall(null)} className="text-zinc-400 hover:text-white p-2" type="button">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative mx-auto w-24 h-24 flex justify-center">
                <ContactAvatar contact={activeCall.user} size="xl" className="ring-4 ring-rose-500/50 shadow-2xl animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-white">{activeCall.user.name}</h3>
              <p className="text-xs text-rose-400 font-mono tracking-wide">
                {activeCall.status === 'Connected' ? `In Call • ${formatCallTime(activeCall.duration)}` : activeCall.status}
              </p>
            </div>

            <div className="flex items-center gap-6">
              <button 
                onClick={() => setIsMuted(!isMuted)} 
                className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-zinc-800 text-rose-400' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`} 
                type="button"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <button 
                onClick={() => setActiveCall(null)} 
                className="p-4 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-xl hover:scale-105 active:scale-95 transition-all" 
                type="button"
                title="End Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
