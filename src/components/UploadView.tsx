import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Sparkles, 
  Sliders, 
  RotateCcw, 
  MapPin, 
  X, 
  Check, 
  Loader2, 
  Sun, 
  Contrast, 
  Droplet,
  Eye,
  Volume2,
  VolumeX,
  Video
} from 'lucide-react';
import { AppUser } from '../types';

interface UploadViewProps {
  currentUser: AppUser | null;
  onPostCreated: (postData: {
    image: string;
    caption: string;
    location?: string;
    filter?: string;
    mediaType?: 'image' | 'video';
  }) => Promise<void>;
  onCancel: () => void;
  onRequireLogin: () => void;
}

interface FilterAdjustments {
  brightness: number; // 50 to 150 (default 100)
  grayscale: number;  // 0 to 100 (default 0)
  sepia: number;      // 0 to 100 (default 0)
  contrast: number;   // 50 to 200 (default 100)
  saturation: number; // 0 to 200 (default 100)
}

const DEFAULT_ADJUSTMENTS: FilterAdjustments = {
  brightness: 100,
  grayscale: 0,
  sepia: 0,
  contrast: 100,
  saturation: 100,
};

const PRESET_FILTERS: {
  id: string;
  name: string;
  adjustments: FilterAdjustments;
}[] = [
  {
    id: 'normal',
    name: 'Normal',
    adjustments: { brightness: 100, grayscale: 0, sepia: 0, contrast: 100, saturation: 100 },
  },
  {
    id: 'grayscale',
    name: 'B&W Mono',
    adjustments: { brightness: 100, grayscale: 100, sepia: 0, contrast: 120, saturation: 0 },
  },
  {
    id: 'sepia',
    name: 'Sepia Glow',
    adjustments: { brightness: 100, grayscale: 0, sepia: 100, contrast: 105, saturation: 110 },
  },
  {
    id: 'bright',
    name: 'Bright',
    adjustments: { brightness: 125, grayscale: 0, sepia: 0, contrast: 105, saturation: 115 },
  },
  {
    id: 'vintage',
    name: 'Vintage',
    adjustments: { brightness: 92, grayscale: 10, sepia: 65, contrast: 115, saturation: 90 },
  },
  {
    id: 'dramatic_bw',
    name: 'Noir Film',
    adjustments: { brightness: 90, grayscale: 100, sepia: 0, contrast: 150, saturation: 0 },
  },
  {
    id: 'warm_sunset',
    name: 'Warm Sunset',
    adjustments: { brightness: 112, grayscale: 0, sepia: 35, contrast: 110, saturation: 135 },
  },
  {
    id: 'cool_dusk',
    name: 'Cool Dusk',
    adjustments: { brightness: 95, grayscale: 20, sepia: 0, contrast: 120, saturation: 85 },
  },
  {
    id: 'high_contrast',
    name: 'High Pop',
    adjustments: { brightness: 105, grayscale: 0, sepia: 0, contrast: 140, saturation: 135 },
  },
];

const EMOJI_SUGGESTIONS = ['✨', '🔥', '📸', '☕️', '🏔️', '🚀', '❤️', '🌴'];

export const UploadView: React.FC<UploadViewProps> = ({
  currentUser,
  onPostCreated,
  onCancel,
  onRequireLogin,
}) => {
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('normal');
  const [adjustments, setAdjustments] = useState<FilterAdjustments>(DEFAULT_ADJUSTMENTS);
  const [editorTab, setEditorTab] = useState<'presets' | 'adjust'>('presets');
  
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  const getFilterString = (adj: FilterAdjustments) => {
    return `brightness(${adj.brightness}%) grayscale(${adj.grayscale}%) sepia(${adj.sepia}%) contrast(${adj.contrast}%) saturate(${adj.saturation}%)`;
  };

  const handleMediaFile = (file: File) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Please select an image or video file');
      return;
    }

    if (file.type.startsWith('video/')) {
      setMediaType('video');
      const reader = new FileReader();
      reader.onload = (event) => {
        const videoDataUrl = event.target?.result as string;
        setRawImageSrc(videoDataUrl);
      };
      reader.readAsDataURL(file);
      setAdjustments(DEFAULT_ADJUSTMENTS);
      setSelectedPreset('normal');
      return;
    }

    setMediaType('image');
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 950;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > MAX) {
            h = Math.round((h * MAX) / w);
            w = MAX;
          }
        } else {
          if (h > MAX) {
            w = Math.round((w * MAX) / h);
            h = MAX;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const normalizedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
          setRawImageSrc(normalizedDataUrl);
          
          const cleanImg = new Image();
          cleanImg.src = normalizedDataUrl;
          cleanImg.onload = () => {
            loadedImageRef.current = cleanImg;
            renderPreviewToCanvas(cleanImg, DEFAULT_ADJUSTMENTS);
          };
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setSelectedPreset('normal');
  };

  const renderPreviewToCanvas = (img: HTMLImageElement, adj: FilterAdjustments) => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !img) return;

    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = getFilterString(adj);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    if (loadedImageRef.current) {
      renderPreviewToCanvas(loadedImageRef.current, adjustments);
    }
  }, [adjustments]);

  const handleSelectPreset = (preset: typeof PRESET_FILTERS[0]) => {
    setSelectedPreset(preset.id);
    setAdjustments(preset.adjustments);
  };

  const handleAdjustmentChange = (key: keyof FilterAdjustments, val: number) => {
    setAdjustments((prev) => ({
      ...prev,
      [key]: val,
    }));
    setSelectedPreset('custom');
  };

  const handleResetAdjustments = () => {
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setSelectedPreset('normal');
  };

  const bakeFinalImage = (): string | null => {
    if (!loadedImageRef.current) return rawImageSrc;

    const img = loadedImageRef.current;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = img.width;
    exportCanvas.height = img.height;

    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return rawImageSrc;

    ctx.filter = getFilterString(adjustments);
    ctx.drawImage(img, 0, 0, exportCanvas.width, exportCanvas.height);

    return exportCanvas.toDataURL('image/jpeg', 0.84);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleMediaFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleMediaFile(file);
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    if (!rawImageSrc) {
      alert('Please select a photo or video first');
      return;
    }

    setIsUploading(true);
    setProgress(25);

    try {
      setProgress(45);
      let finalMedia = rawImageSrc;
      if (mediaType === 'image') {
        finalMedia = bakeFinalImage() || rawImageSrc;
      }

      setProgress(70);
      await onPostCreated({
        image: finalMedia,
        caption: caption.trim(),
        location: location.trim(),
        filter: selectedPreset,
        mediaType,
      });

      setProgress(100);
      setTimeout(() => {
        setIsUploading(false);
      }, 350);
    } catch (err: any) {
      setIsUploading(false);
      alert('Upload failed: ' + (err.message || 'Please check your connection.'));
    }
  };

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-[calc(100vh-110px)] pb-24">
      {/* Top Header */}
      <div className="sticky top-14 z-30 bg-zinc-950/95 backdrop-blur-md flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <button
          onClick={onCancel}
          className="text-zinc-400 hover:text-white text-sm font-medium"
          type="button"
        >
          Cancel
        </button>
        <h2 className="text-sm font-bold text-white">
          {mediaType === 'video' ? 'Create new video post' : 'Create new post'}
        </h2>
        <button
          onClick={handleSubmit}
          disabled={!rawImageSrc || isUploading}
          className="text-xs font-bold text-rose-500 hover:text-rose-400 disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-1"
          type="button"
        >
          {isUploading ? 'Sharing...' : 'Share'}
        </button>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-4">
        {/* Upload Dropzone or Filter Canvas/Video Preview */}
        {!rawImageSrc ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-square border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:border-zinc-700 hover:bg-zinc-900/40 transition-all bg-zinc-900/20"
          >
            <div className="w-16 h-16 rounded-full bg-zinc-900 text-rose-400 flex items-center justify-center mb-3 ring-1 ring-zinc-800">
              <Upload className="w-8 h-8 stroke-[1.8]" />
            </div>
            <p className="text-sm font-semibold text-zinc-200">Select photo or video from device</p>
            <p className="text-xs text-zinc-500 mt-1">Drag and drop or tap to choose (MP4, MOV, JPG, PNG)</p>
            <div className="flex items-center gap-2 mt-4">
              <span className="text-xs font-semibold px-4 py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-xl hover:opacity-90 transition-opacity">
                Choose Photo or Video
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Live Filter Media Preview */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-black shadow-xl ring-1 ring-zinc-800 flex items-center justify-center">
              {mediaType === 'video' ? (
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  <video
                    ref={videoPreviewRef}
                    src={rawImageSrc}
                    autoPlay
                    loop
                    playsInline
                    muted={isVideoMuted}
                    style={{ filter: getFilterString(adjustments) }}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-white flex items-center gap-1.5 border border-white/10">
                    <Video className="w-3 h-3 text-rose-500" />
                    <span>Video Post</span>
                  </div>
                  <button
                    onClick={() => setIsVideoMuted(!isVideoMuted)}
                    className="absolute bottom-2.5 right-2.5 p-2 bg-black/70 hover:bg-black text-white rounded-full transition-colors z-10"
                    type="button"
                    title={isVideoMuted ? 'Unmute' : 'Mute'}
                  >
                    {isVideoMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <canvas
                  ref={previewCanvasRef}
                  className="w-full h-full object-cover"
                />
              )}
              <button
                onClick={() => {
                  setRawImageSrc(null);
                  loadedImageRef.current = null;
                }}
                className="absolute top-2.5 right-2.5 p-1.5 bg-black/70 hover:bg-black text-white rounded-full transition-colors z-10"
                title="Change media"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="absolute bottom-2.5 left-2.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-zinc-200 flex items-center gap-1.5 border border-zinc-700/40">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Filters baked into post</span>
              </div>
            </div>

            {/* Editor Switcher: Presets vs Adjustments */}
            <div className="bg-zinc-900 p-1 rounded-xl flex items-center text-xs font-semibold border border-zinc-800">
              <button
                onClick={() => setEditorTab('presets')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  editorTab === 'presets'
                    ? 'bg-zinc-800 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
                type="button"
              >
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                <span>Photo Filters</span>
              </button>
              <button
                onClick={() => setEditorTab('adjust')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  editorTab === 'adjust'
                    ? 'bg-zinc-800 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
                type="button"
              >
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                <span>Adjustments</span>
              </button>
            </div>

            {/* TAB 1: Filter Presets Carousel */}
            {editorTab === 'presets' && (
              <div className="space-y-2 animate-in fade-in duration-150">
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
                  {PRESET_FILTERS.map((preset) => {
                    const isSelected = selectedPreset === preset.id;
                    const previewFilterCss = getFilterString(preset.adjustments);

                    return (
                      <button
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset)}
                        type="button"
                        className={`flex-none text-center cursor-pointer transition-transform active:scale-95 ${
                          isSelected ? 'scale-105' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div
                          className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shadow-md ${
                            isSelected
                              ? 'border-rose-500 ring-2 ring-rose-500/20'
                              : 'border-zinc-800'
                          }`}
                        >
                          <img
                            src={rawImageSrc}
                            alt={preset.name}
                            style={{ filter: previewFilterCss }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className={`text-[10px] font-semibold block mt-1 ${
                          isSelected ? 'text-rose-400' : 'text-zinc-400'
                        }`}>
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: Fine-Tuning Sliders */}
            {editorTab === 'adjust' && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs pb-1 border-b border-zinc-800">
                  <span className="font-bold text-zinc-200">Fine-tune adjustments</span>
                  <button
                    onClick={handleResetAdjustments}
                    className="text-zinc-400 hover:text-white flex items-center gap-1 text-[11px]"
                    type="button"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>

                {/* Brightness */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-zinc-300 flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      Brightness
                    </span>
                    <span className="text-zinc-400 text-[11px] font-mono">
                      {adjustments.brightness - 100 > 0 ? `+${adjustments.brightness - 100}%` : `${adjustments.brightness - 100}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={adjustments.brightness}
                    onChange={(e) => handleAdjustmentChange('brightness', Number(e.target.value))}
                    className="w-full accent-rose-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Grayscale */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-zinc-300 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-zinc-400" />
                      Grayscale (B&W)
                    </span>
                    <span className="text-zinc-400 text-[11px] font-mono">
                      {adjustments.grayscale}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={adjustments.grayscale}
                    onChange={(e) => handleAdjustmentChange('grayscale', Number(e.target.value))}
                    className="w-full accent-zinc-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Sepia */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-zinc-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Sepia
                    </span>
                    <span className="text-zinc-400 text-[11px] font-mono">
                      {adjustments.sepia}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={adjustments.sepia}
                    onChange={(e) => handleAdjustmentChange('sepia', Number(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Contrast */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-zinc-300 flex items-center gap-1.5">
                      <Contrast className="w-3.5 h-3.5 text-purple-400" />
                      Contrast
                    </span>
                    <span className="text-zinc-400 text-[11px] font-mono">
                      {adjustments.contrast - 100 > 0 ? `+${adjustments.contrast - 100}%` : `${adjustments.contrast - 100}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="180"
                    value={adjustments.contrast}
                    onChange={(e) => handleAdjustmentChange('contrast', Number(e.target.value))}
                    className="w-full accent-purple-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Saturation */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-zinc-300 flex items-center gap-1.5">
                      <Droplet className="w-3.5 h-3.5 text-rose-400" />
                      Saturation
                    </span>
                    <span className="text-zinc-400 text-[11px] font-mono">
                      {adjustments.saturation - 100 > 0 ? `+${adjustments.saturation - 100}%` : `${adjustments.saturation - 100}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="180"
                    value={adjustments.saturation}
                    onChange={(e) => handleAdjustmentChange('saturation', Number(e.target.value))}
                    className="w-full accent-rose-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Caption & Location Input */}
        <div className="space-y-3 pt-2">
          {/* Quick emoji tray */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {EMOJI_SUGGESTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setCaption((prev) => prev + emoji)}
                className="text-base px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>

          <div>
            <textarea
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption... (e.g. Midnight city lights 🌃 #Noise)"
              className="w-full text-xs p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors resize-none"
            />
          </div>

          <div className="relative">
            <MapPin className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location (e.g. Shibuya, Tokyo)"
              className="w-full text-xs pl-9 pr-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>
        </div>

        {/* Progress Bar when uploading */}
        {isUploading && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs text-rose-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Processing filters & uploading...
              </span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-purple-600 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Share Button bottom */}
        <button
          onClick={handleSubmit}
          disabled={!rawImageSrc || isUploading}
          className="w-full py-3 bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-950/30 transition-all flex items-center justify-center gap-2"
          type="button"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Publishing Post...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Share Post</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
