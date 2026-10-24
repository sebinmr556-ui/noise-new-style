import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Film, 
  Image as ImageIcon, 
  Loader2, 
  AlertCircle, 
  Check, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { AppUser, Story } from '../types';
import { db, isFirebaseConfigured, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface StoryUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  onStoryPublished?: (story: Story) => void;
  onRequireLogin: () => void;
  initialFile?: File | null;
}

const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const StoryUploadModal: React.FC<StoryUploadModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onStoryPublished,
  onRequireLogin,
  initialFile,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('My moment ✨');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Video player controls
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialFile) {
      handleProcessFile(initialFile);
    }
  }, [initialFile]);

  // Clean up object URLs on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  const handleProcessFile = (file: File) => {
    setErrorMessage(null);

    // Validate MIME type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|ogg|m4v)$/i.test(file.name);

    if (!isImage && !isVideo) {
      setErrorMessage('Please select a valid image or video file (MP4, WebM, MOV, JPG, PNG).');
      return;
    }

    // Validate size limit
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    setMediaType(isVideo ? 'video' : 'image');
    setIsPlaying(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handlePublishStory = async () => {
    if (!currentUser) {
      onRequireLogin();
      return;
    }

    if (!selectedFile) {
      setErrorMessage('Please select a photo or video to share.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    setErrorMessage(null);

    try {
      // 1. Convert file to base64 for reliable transmission to /api/upload
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });

      setUploadProgress(45);

      // 2. Upload to server backend storage
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileData: base64Data,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Upload failed with HTTP ${res.status}`);
      }

      const uploadResult = await res.json();
      setUploadProgress(80);

      const persistentMediaUrl = uploadResult.url;
      const detectedType: 'image' | 'video' = uploadResult.mediaType || mediaType;
      const senderUid = auth?.currentUser?.uid || currentUser.uid;
      const now = Date.now();
      const expiresAt = now + 24 * 60 * 60 * 1000; // Exact 24 hours expiry

      const localStoryId = `story-${now}`;
      const newStory: Story = {
        id: localStoryId,
        uid: senderUid,
        userId: senderUid,
        authorId: senderUid,
        username: currentUser.username,
        avatar: currentUser.photoURL,
        mediaUrl: persistentMediaUrl,
        mediaType: detectedType,
        caption: caption.trim() || 'My moment ✨',
        timestamp: 'Just now',
        hasSeen: false,
      };

      // 3. Save to Firestore
      if (isFirebaseConfigured && db) {
        try {
          const docRef = await addDoc(collection(db, 'stories'), {
            uid: senderUid,
            userId: senderUid,
            authorId: senderUid,
            username: currentUser.username,
            avatar: currentUser.photoURL || '',
            mediaUrl: persistentMediaUrl,
            mediaType: detectedType,
            caption: caption.trim() || 'My moment ✨',
            createdAt: serverTimestamp(),
            expiresAt: expiresAt,
          });
          newStory.id = docRef.id;
        } catch (dbErr) {
          console.error('[Story Upload] Firestore write error:', dbErr);
        }
      }

      setUploadProgress(100);
      setIsSuccess(true);

      if (onStoryPublished) {
        onStoryPublished(newStory);
      }

      setTimeout(() => {
        onClose();
        setIsUploading(false);
        setIsSuccess(false);
      }, 900);

    } catch (err: any) {
      console.error('[Story Upload] Publish error:', err);
      setErrorMessage(err.message || 'Failed to upload story. Please check your network and try again.');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in select-none">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Create Story</h3>
              <p className="text-[11px] text-zinc-400">Expires automatically after 24 hours</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition-colors cursor-pointer"
            title="Close"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-none mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-rose-200">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Media Preview or Picker */}
          {!previewUrl ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-800 hover:border-purple-500/70 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-zinc-900/40 hover:bg-zinc-900/70 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <div className="flex items-center gap-1 text-zinc-400 group-hover:text-purple-400 transition-colors">
                  <Film className="w-6 h-6" />
                  <ImageIcon className="w-6 h-6" />
                </div>
              </div>
              <p className="text-sm font-bold text-white mb-1">
                Select Photo or Video
              </p>
              <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                Choose a video (MP4, WebM, MOV) or photo from your device. High-resolution media supported up to 100 MB.
              </p>
              <div className="mt-4 px-3.5 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                <Upload className="w-3.5 h-3.5" />
                <span>Browse Files</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-zinc-800/80 aspect-[9/14] max-h-[380px] mx-auto w-full group">
                {mediaType === 'video' ? (
                  <>
                    <video
                      ref={videoRef}
                      src={previewUrl}
                      controls
                      playsInline
                      autoPlay
                      loop
                      muted={isMuted}
                      className="w-full h-full object-contain"
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                    {/* Floating Controls Overlay */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full text-white text-xs border border-white/20">
                      <button 
                        type="button" 
                        onClick={toggleMute}
                        className="p-1 hover:text-purple-400 transition-colors cursor-pointer"
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    </div>
                  </>
                ) : (
                  <img
                    src={previewUrl}
                    alt="Story preview"
                    className="w-full h-full object-contain"
                  />
                )}

                {/* Media Type Badge */}
                <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 text-[10px] font-bold text-white flex items-center gap-1.5">
                  {mediaType === 'video' ? (
                    <>
                      <Film className="w-3 h-3 text-pink-400" />
                      <span>Video Story</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-3 h-3 text-cyan-400" />
                      <span>Photo Story</span>
                    </>
                  )}
                  {selectedFile && (
                    <span className="text-zinc-400 border-l border-zinc-700 pl-1.5">
                      {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  )}
                </div>

                {/* Replace File Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute top-3 left-3 bg-black/60 hover:bg-black/80 backdrop-blur-md p-1.5 rounded-full border border-white/20 text-white text-xs transition-colors cursor-pointer"
                  title="Choose different media"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Caption Input */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Story Caption
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption to your story..."
                  maxLength={120}
                  disabled={isUploading}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {/* 24-hour Expiration Notice */}
              <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/80 text-[11px] text-zinc-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-none" />
                <span>Story will stay active for 24 hours and will then be automatically deleted from the server.</span>
              </div>
            </div>
          )}

          {/* Hidden File Input supporting both images and videos */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,video/mp4,video/webm,video/quicktime,video/x-m4v"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Progress Bar */}
          {isUploading && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                  <span>Uploading {mediaType}...</span>
                </span>
                <span className="font-mono text-purple-400 font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 transition-all duration-200 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-800/80 flex items-center justify-between gap-3 bg-zinc-950">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handlePublishStory}
            disabled={!previewUrl || isUploading || isSuccess}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 hover:opacity-95 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            {isSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Story Shared!</span>
              </>
            ) : isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publishing Story...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Share to Story</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
