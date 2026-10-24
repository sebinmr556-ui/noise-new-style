import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { AppUser } from '../../types';

interface LudoGameProps {
  roomId: string;
  currentUser: AppUser | null;
}

interface GameState {
  diceValue: number;
  lastRolledBy: string;
  turn: string;
}

// ====================================================================================
// 🎬 CINEMATIC THEMES WITH THEME-SPECIFIC AMBIENT SOUNDS
// ====================================================================================
const CINEMATIC_THEMES = [
  { 
    id: 'egyptian', name: '🏜️ Pyramid Ruins', 
    bgWrap: 'from-amber-950 via-yellow-950 to-stone-950', 
    vignette: 'shadow-[inset_0_0_100px_rgba(0,0,0,0.95)]',
    boardStyle: 'border-yellow-600/90 bg-amber-950 shadow-[0_30px_70px_rgba(0,0,0,0.95),0_0_50px_rgba(202,138,4,0.5)]',
    diceBg: 'bg-gradient-to-br from-amber-400 via-yellow-600 to-amber-950 border-yellow-300 text-yellow-950 shadow-[0_20px_40px_rgba(0,0,0,0.9),inset_0_3px_6px_rgba(255,255,255,0.7)]',
    effectType: 'sand', effectName: '✨ Golden Ancient Sand Storm',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/ambiences/desert_wind.ogg',
    baseStyle: 'bg-amber-950/95 border-yellow-600 rounded-xl shadow-[inset_0_0_35px_rgba(0,0,0,0.95)]',
    pathStyle: 'bg-yellow-950/90 border-yellow-700/70',
    centerStyle: 'bg-gradient-to-br from-yellow-700 to-amber-950 shadow-[inset_0_0_30px_rgba(0,0,0,0.9)]',
    tileHighlight: 'bg-amber-600 shadow-[0_0_12px_rgba(245,158,11,0.8)]'
  },
  { 
    id: 'snow', name: '❄️ Frozen Throne', 
    bgWrap: 'from-blue-950 via-slate-950 to-black', 
    vignette: 'shadow-[inset_0_0_100px_rgba(56,189,248,0.3)]',
    boardStyle: 'border-sky-200 bg-slate-950 shadow-[0_30px_70px_rgba(0,0,0,0.95),0_0_50px_rgba(56,189,248,0.6)]',
    diceBg: 'bg-gradient-to-br from-sky-100 via-white to-blue-400 border-white text-blue-950 shadow-[0_20px_40px_rgba(56,189,248,0.5),inset_0_3px_6px_rgba(255,255,255,0.95)]',
    effectType: 'snow', effectName: '❄️ Blizzard Wind & Frost',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/weather/wind_heavy.ogg',
    baseStyle: 'bg-slate-950/95 border-sky-300 rounded-[2.5rem] shadow-[inset_0_0_35px_rgba(56,189,248,0.4)]',
    pathStyle: 'bg-sky-950/95 border-sky-400/50',
    centerStyle: 'bg-gradient-to-br from-sky-400 to-blue-800 shadow-[inset_0_0_30px_rgba(255,255,255,0.8)]',
    tileHighlight: 'bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.9)]'
  },
  { 
    id: 'underwater', name: '🌊 Deep Trench', 
    bgWrap: 'from-cyan-950 via-blue-950 to-slate-950', 
    vignette: 'shadow-[inset_0_0_100px_rgba(6,182,212,0.4)]',
    boardStyle: 'border-cyan-400 bg-cyan-950 shadow-[0_30px_70px_rgba(0,0,0,0.95),0_0_50px_rgba(6,182,212,0.7)]',
    diceBg: 'bg-gradient-to-br from-cyan-300 via-blue-600 to-blue-950 border-cyan-200 text-white shadow-[0_20px_40px_rgba(6,182,212,0.6),inset_0_3px_6px_rgba(255,255,255,0.6)]',
    effectType: 'bubbles', effectName: '🫧 Ocean Waves & Current Sound',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/water/waves_ocean_surfs.ogg',
    baseStyle: 'bg-cyan-950/95 border-cyan-400 rounded-full shadow-[inset_0_0_35px_rgba(6,182,212,0.6)]',
    pathStyle: 'bg-cyan-950/95 border-cyan-500/60',
    centerStyle: 'bg-gradient-to-br from-cyan-500 to-blue-950 shadow-[inset_0_0_30px_rgba(0,255,255,0.9)]',
    tileHighlight: 'bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.9)]'
  },
  { 
    id: 'sky', name: '☁️ Celestial Realm', 
    bgWrap: 'from-indigo-950 via-sky-950 to-slate-950', 
    vignette: 'shadow-[inset_0_0_100px_rgba(125,211,252,0.4)]',
    boardStyle: 'border-sky-100 bg-indigo-950 shadow-[0_30px_70px_rgba(0,0,0,0.95),0_0_50px_rgba(125,211,252,0.6)]',
    diceBg: 'bg-gradient-to-br from-white via-sky-200 to-indigo-500 border-white text-indigo-950 shadow-[0_20px_40px_rgba(125,211,252,0.7),inset_0_3px_6px_rgba(255,255,255,0.95)]',
    effectType: 'clouds', effectName: '☁️ High Altitude Wind Breeze',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/weather/wind_gust.ogg',
    baseStyle: 'bg-indigo-950/95 border-sky-200 rounded-[3rem] shadow-[inset_0_0_35px_rgba(255,255,255,0.5)]',
    pathStyle: 'bg-sky-950/90 border-sky-200/50',
    centerStyle: 'bg-gradient-to-br from-sky-300 to-indigo-700 shadow-[inset_0_0_30px_rgba(255,255,255,0.9)]',
    tileHighlight: 'bg-sky-200 shadow-[0_0_12px_rgba(125,211,252,0.9)]'
  },
  { 
    id: 'fire', name: '🔥 Magma Core', 
    bgWrap: 'from-red-950 via-orange-950 to-black', 
    vignette: 'shadow-[inset_0_0_100px_rgba(234,88,12,0.7)]',
    boardStyle: 'border-orange-500 bg-red-950 shadow-[0_30px_70px_rgba(0,0,0,0.95),0_0_60px_rgba(234,88,12,0.9)]',
    diceBg: 'bg-gradient-to-br from-orange-400 via-red-600 to-black border-yellow-300 text-yellow-100 shadow-[0_20px_40px_rgba(234,88,12,0.9),inset_0_3px_6px_rgba(255,255,255,0.7)] animate-pulse',
    effectType: 'fire', effectName: '🔥 Volcanic Crackling Fire Sound',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/ambiences/fire_crackling.ogg',
    baseStyle: 'bg-red-950/95 border-orange-500 rounded-xl shadow-[inset_0_0_40px_rgba(234,88,12,0.8)]',
    pathStyle: 'bg-orange-950/95 border-orange-600/80',
    centerStyle: 'bg-gradient-to-br from-orange-500 to-red-950 shadow-[inset_0_0_30px_rgba(255,165,0,1)]',
    tileHighlight: 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,1)]'
  },
  { 
    id: 'forest', name: '🌳 Ancient Canopy', 
    bgWrap: 'from-emerald-950 via-green-950 to-stone-950', 
    vignette: 'shadow-[inset_0_0_100px_rgba(16,185,129,0.3)]',
    boardStyle: 'border-emerald-400 bg-emerald-950 shadow-[0_30px_70px_rgba(0,0,0,0.95),0_0_50px_rgba(16,185,129,0.7)]',
    diceBg: 'bg-gradient-to-br from-green-500 via-emerald-700 to-stone-900 border-green-200 text-green-50 shadow-[0_20px_40px_rgba(16,185,129,0.6),inset_0_3px_6px_rgba(255,255,255,0.6)]',
    effectType: 'leaves', effectName: '🍃 Deep Jungle Forest Ambient Sound',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/ambiences/outdoor_rain_forest.ogg',
    baseStyle: 'bg-emerald-950/95 border-emerald-400 rounded-2xl shadow-[inset_0_0_35px_rgba(16,185,129,0.6)]',
    pathStyle: 'bg-emerald-950/95 border-emerald-600/60',
    centerStyle: 'bg-gradient-to-br from-emerald-500 to-green-950 shadow-[inset_0_0_30px_rgba(0,255,0,0.6)]',
    tileHighlight: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.9)]'
  },
  { 
    id: 'horror', name: '🧛 Vampire Crypt', 
    bgWrap: 'from-zinc-950 via-red-950/60 to-black', 
    vignette: 'shadow-[inset_0_0_110px_rgba(153,27,27,0.9)]',
    boardStyle: 'border-red-700 bg-zinc-950 shadow-[0_30px_70px_rgba(0,0,0,1),0_0_60px_rgba(185,28,28,0.9)]',
    diceBg: 'bg-gradient-to-br from-zinc-900 via-red-950 to-black border-red-500 text-red-500 shadow-[0_20px_40px_rgba(153,27,27,1),inset_0_3px_6px_rgba(255,255,255,0.2)]',
    effectType: 'horror', effectName: '🦇 Spooky Crypt & Creepy Wind',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/ambiences/creepy_wind.ogg',
    baseStyle: 'bg-black/95 border-red-800 rounded-none shadow-[inset_0_0_40px_rgba(153,27,27,1)]',
    pathStyle: 'bg-zinc-950/95 border-red-950/90',
    centerStyle: 'bg-gradient-to-br from-red-900 to-black shadow-[inset_0_0_30px_rgba(255,0,0,0.9)]',
    tileHighlight: 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,1)]'
  }
];

const renderCells = (count: number, renderFn: (index: number) => React.ReactNode) => {
  return Array.from({ length: count }).map((_, i) => renderFn(i));
};

const Token = ({ colorClass, onClick }: { colorClass: string, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={`w-[75%] h-[75%] rounded-full ${colorClass} shadow-[0_8px_12px_rgba(0,0,0,0.9),inset_0_-4px_6px_rgba(0,0,0,0.7),inset_0_4px_6px_rgba(255,255,255,0.8)] border border-black/90 transform hover:scale-110 transition-transform cursor-pointer relative`}
  ></div>
);

const Base = ({ outerClass, tokenColor, onTokenClick }: {outerClass: string, tokenColor: string, onTokenClick?: () => void}) => (
  <div className={`p-2.5 sm:p-3.5 flex items-center justify-center ${outerClass} relative border-[2.5px] border-black overflow-hidden`}>
    <div className="w-full h-full bg-black/50 backdrop-blur-md rounded-lg p-3 grid grid-cols-2 gap-3 shadow-[inset_0_6px_12px_rgba(0,0,0,1)] border border-white/20 relative z-10">
      {[1,2,3,4].map(i => (
        <div key={i} className="rounded-full bg-black/85 shadow-[inset_0_8px_16px_rgba(0,0,0,1)] border border-white/30 flex items-center justify-center relative overflow-hidden">
           <Token colorClass={tokenColor} onClick={onTokenClick} />
        </div>
      ))}
    </div>
  </div>
);

const Tile = ({ colorClass, hasStar }: {colorClass: string, hasStar: boolean}) => (
  <div className={`relative border-[1px] border-black/70 shadow-[inset_0_2px_5px_rgba(255,255,255,0.35),inset_0_-2px_5px_rgba(0,0,0,0.8)] ${colorClass} flex items-center justify-center overflow-hidden`}>
    {hasStar && <span className="text-white text-[13px] drop-shadow-[0_2px_8px_rgba(0,0,0,1)] font-black">★</span>}
  </div>
);

const LudoBoardVisual = ({ theme, onTokenClick }: { theme: any, onTokenClick: () => void }) => {
  return (
    <div className={`w-full max-w-[340px] aspect-square p-3.5 rounded-3xl border-[5px] ${theme.boardStyle} relative select-none overflow-hidden transition-all duration-700`}>
      
      {theme.effectType === 'fire' && (
        <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center opacity-70 animate-pulse bg-[radial-gradient(circle,_rgba(234,88,12,0.7)_0%,_transparent_85%)]">
          <span className="text-4xl absolute top-1 left-2 animate-bounce">🔥</span>
          <span className="text-3xl absolute bottom-1 right-3 animate-pulse">🌋</span>
          <span className="text-3xl absolute top-1/2 right-1 animate-ping">🔥</span>
        </div>
      )}

      {theme.effectType === 'snow' && (
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden opacity-95">
          <div className="absolute top-1 left-4 animate-bounce text-white text-sm">❄️</div>
          <div className="absolute top-5 left-24 animate-pulse text-sky-100 text-base">❅</div>
          <div className="absolute top-2 right-6 animate-bounce text-white text-sm">❄️</div>
        </div>
      )}

      {theme.effectType === 'leaves' && (
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden opacity-95">
          <div className="absolute top-2 left-4 animate-spin text-green-200 text-sm">🍃</div>
          <div className="absolute top-5 right-8 animate-bounce text-emerald-300 text-base">🍂</div>
        </div>
      )}

      {theme.effectType === 'bubbles' && (
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden opacity-90">
          <div className="absolute bottom-2 left-6 animate-ping text-cyan-100 text-sm">🫧</div>
          <div className="absolute bottom-6 right-10 animate-bounce text-blue-100 text-sm">💧</div>
        </div>
      )}

      {theme.effectType === 'horror' && (
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden opacity-90">
          <div className="absolute top-2 right-4 animate-pulse text-red-600 text-base">🦇</div>
          <div className="absolute bottom-2 left-4 animate-bounce text-red-500 text-sm">👁️‍🗨️</div>
        </div>
      )}

      <div className={`w-full h-full ${theme.baseStyle} border-[2.5px] border-black grid grid-cols-[6fr_3fr_6fr] grid-rows-[6fr_3fr_6fr] gap-0 overflow-hidden relative z-10 transition-all duration-700`}>
        
        <Base outerClass="bg-red-600" tokenColor="bg-red-400" onTokenClick={onTokenClick} />
        <div className={`grid grid-cols-3 grid-rows-6 ${theme.pathStyle} z-0 relative transition-all duration-500`}>
          {renderCells(18, (i) => {
            const isHomeStretch = [4,7,10,13,16].includes(i);
            const isStart = i === 5;
            const isStar = i === 6;
            let colorClass = theme.pathStyle; 
            if (isHomeStretch || isStart) colorClass = `${theme.tileHighlight} shadow-[inset_0_0_12px_rgba(0,0,0,0.8)]`; 
            return <Tile key={`t-${i}`} colorClass={colorClass} hasStar={isStar} />
          })}
        </div>
        <Base outerClass="bg-green-600" tokenColor="bg-green-400" onTokenClick={onTokenClick} />

        <div className={`grid grid-cols-6 grid-rows-3 ${theme.pathStyle} z-0 relative transition-all duration-500`}>
          {renderCells(18, (i) => {
            const isHomeStretch = [7,8,9,10,11].includes(i);
            const isStart = i === 1;
            const isStar = i === 13;
            let colorClass = theme.pathStyle;
            if (isHomeStretch || isStart) colorClass = `${theme.tileHighlight} shadow-[inset_0_0_12px_rgba(0,0,0,0.8)]`;
            return <Tile key={`l-${i}`} colorClass={colorClass} hasStar={isStar} />
          })}
        </div>
        
        <div className={`relative border-[2px] border-black ${theme.centerStyle} overflow-hidden z-10 flex items-center justify-center transition-all duration-700`}>
          <svg viewBox="0 0 100 100" className="w-[100%] h-[100%] opacity-95 drop-shadow-[0_6px_12px_rgba(0,0,0,0.9)]">
            <polygon points="0,0 100,0 50,50" fill="#22c55e" stroke="#000" strokeWidth="2.5"/>
            <polygon points="100,0 100,100 50,50" fill="#eab308" stroke="#000" strokeWidth="2.5"/>
            <polygon points="0,100 100,100 50,50" fill="#3b82f6" stroke="#000" strokeWidth="2.5"/>
            <polygon points="0,0 0,100 50,50" fill="#ef4444" stroke="#000" strokeWidth="2.5"/>
          </svg>
        </div>

        <div className={`grid grid-cols-6 grid-rows-3 ${theme.pathStyle} z-0 relative transition-all duration-500`}>
          {renderCells(18, (i) => {
            const isHomeStretch = [6,7,8,9,10].includes(i);
            const isStart = i === 16;
            const isStar = i === 4;
            let colorClass = theme.pathStyle;
            if (isHomeStretch || isStart) colorClass = `${theme.tileHighlight} shadow-[inset_0_0_12px_rgba(0,0,0,0.8)]`;
            return <Tile key={`r-${i}`} colorClass={colorClass} hasStar={isStar} />
          })}
        </div>

        <Base outerClass="bg-blue-600" tokenColor="bg-blue-400" onTokenClick={onTokenClick} />
        <div className={`grid grid-cols-3 grid-rows-6 ${theme.pathStyle} z-0 relative transition-all duration-500`}>
          {renderCells(18, (i) => {
            const isHomeStretch = [1,4,7,10,13].includes(i);
            const isStart = i === 12;
            const isStar = i === 11;
            let colorClass = theme.pathStyle;
            if (isHomeStretch || isStart) colorClass = `${theme.tileHighlight} shadow-[inset_0_0_12px_rgba(0,0,0,0.8)]`;
            return <Tile key={`b-${i}`} colorClass={colorClass} hasStar={isStar} />
          })}
        </div>
        <Base outerClass="bg-yellow-500" tokenColor="bg-yellow-300" onTokenClick={onTokenClick} />
      </div>
    </div>
  );
};

const LudoGame: React.FC<LudoGameProps> = ({ roomId, currentUser }) => {
  const [gameState, setGameState] = useState<GameState>({
    diceValue: 1,
    lastRolledBy: '',
    turn: 'player_1'
  });
  const [isRolling, setIsRolling] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState('egyptian');
  const [displayFace, setDisplayFace] = useState(1);
  const [isSoundOn, setIsSoundOn] = useState(true);

  const activeTheme = CINEMATIC_THEMES.find(t => t.id === activeThemeId) || CINEMATIC_THEMES[0];
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);

  // Database synchronization
  useEffect(() => {
    if (!roomId || !db) return;
    const gameDocRef = doc(db, 'voice_rooms', roomId, 'games', 'ludo');
    const unsubscribe = onSnapshot(gameDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        setGameState(docSnap.data() as GameState);
      } else {
        try {
          await setDoc(gameDocRef, { diceValue: 1, lastRolledBy: '', turn: 'player_1' });
        } catch (e) {
          console.log("Firebase Error:", e);
        }
      }
    });
    return () => unsubscribe();
  }, [roomId]);

  // Theme ambient audio management
  useEffect(() => {
    if (ambientAudioRef.current) {
      ambientAudioRef.current.pause();
    }
    if (isSoundOn && activeTheme.ambientSoundUrl) {
      const audio = new Audio(activeTheme.ambientSoundUrl);
      audio.loop = true;
      audio.volume = 0.3;
      audio.play().catch(e => console.log("Ambient audio blocked/error:", e));
      ambientAudioRef.current = audio;
    }
    return () => {
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
      }
    };
  }, [activeThemeId, isSoundOn]);

  // Sound Effect Functions
  const playSfx = (type: 'dice' | 'move' | 'win') => {
    if (!isSoundOn) return;
    try {
      let url = 'https://actions.google.com/sounds/v1/foley/rolling_dice_on_table.ogg';
      if (type === 'move') url = 'https://actions.google.com/sounds/v1/foley/wood_click.ogg';
      if (type === 'win') url = 'https://actions.google.com/sounds/v1/cartoon/trumpet_fanfare.ogg';
      
      const sound = new Audio(url);
      sound.volume = 0.7;
      sound.play().catch(e => console.log("SFX error:", e));
    } catch (e) {
      console.log("Audio error", e);
    }
  };

  // Dice rolling animation
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRolling) {
      interval = setInterval(() => {
        setDisplayFace(Math.floor(Math.random() * 6) + 1);
      }, 50);
    } else {
      setDisplayFace(gameState.diceValue || 1);
    }
    return () => clearInterval(interval);
  }, [isRolling, gameState.diceValue]);

  const rollDice = async () => {
    if (!currentUser || !roomId || isRolling) return;
    
    playSfx('dice');
    setIsRolling(true);
    
    const randomNum = Math.floor(Math.random() * 6) + 1;
    const gameDocRef = doc(db, 'voice_rooms', roomId, 'games', 'ludo');
    try {
      await updateDoc(gameDocRef, { diceValue: randomNum, lastRolledBy: currentUser.username });
    } catch (error) {
      await setDoc(gameDocRef, { diceValue: randomNum, lastRolledBy: currentUser.username, turn: 'player_1' });
    }
    
    setTimeout(() => {
      setIsRolling(false);
      // Example trigger win sound on rolling 6 for demonstration or token movement
      if (randomNum === 6) {
        playSfx('win');
      }
    }, 1000);
  };

  const handleTokenMove = () => {
    playSfx('move');
  };

  const renderDiceDots = (value: number) => {
    const getDots = (v: number) => {
      switch(v) {
        case 1: return [4];
        case 2: return [0, 8];
        case 3: return [0, 4, 8];
        case 4: return [0, 2, 6, 8];
        case 5: return [0, 2, 4, 6, 8];
        case 6: return [0, 3, 6, 2, 5, 8];
        default: return [4];
      }
    };
    
    const activeDots = getDots(value);
    
    return (
      <div className={`grid grid-cols-3 grid-rows-3 gap-1 w-full h-full p-2 relative z-10 transition-all duration-200 ${isRolling ? 'opacity-0 scale-40 blur-3xl' : 'opacity-100 scale-100 blur-0'}`}>
        {[0,1,2,3,4,5,6,7,8].map(i => (
          <div key={i} className="flex items-center justify-center">
            {activeDots.includes(i) && (
              <div className="w-3.5 h-3.5 bg-white rounded-full shadow-[inset_0_-2px_4px_rgba(0,0,0,0.9),0_2px_6px_rgba(0,0,0,1)]">
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`flex flex-col items-center justify-center p-3 bg-gradient-to-br ${activeTheme.bgWrap} rounded-3xl w-full border-2 border-white/30 ${activeTheme.vignette} relative overflow-hidden transition-colors duration-700`}>
      
      {/* Top Header with Sound ON/OFF Toggle Button */}
      <div className="w-full flex items-center justify-between pb-2 px-1 mb-1">
        <span className="text-[10px] text-amber-300 font-extrabold uppercase tracking-widest">
          {activeTheme.effectName}
        </span>
        <button
          onClick={() => setIsSoundOn(!isSoundOn)}
          className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider transition-all border ${
            isSoundOn 
              ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_10px_#10b981]' 
              : 'bg-rose-900/80 text-rose-200 border-rose-500/50'
          }`}
        >
          {isSoundOn ? '🔊 SOUND ON' : '🔇 SOUND OFF'}
        </button>
      </div>

      {/* Cinematic Theme Selector Bar */}
      <div className="w-full flex overflow-x-auto gap-2 pb-3 mb-2 scrollbar-hide snap-x">
        {CINEMATIC_THEMES.map(theme => (
          <button 
            key={theme.id}
            onClick={() => setActiveThemeId(theme.id)}
            className={`snap-center shrink-0 px-4 py-1.5 rounded-full text-[11px] font-black tracking-wider transition-all ${activeThemeId === theme.id ? 'bg-white text-black shadow-[0_0_20px_#fff] scale-105' : 'bg-black/70 text-white/70 border border-white/25 hover:bg-black/90'}`}
          >
            {theme.name}
          </button>
        ))}
      </div>

      <div className="mb-4 text-center flex flex-col items-center relative z-20">
        <span className="text-[11px] text-white/95 mb-3 uppercase tracking-widest font-black drop-shadow-[0_2px_6px_rgba(0,0,0,1)]">
          {gameState.lastRolledBy ? `ROLLED BY: @${gameState.lastRolledBy}` : 'ENTER THE CINEMATIC REALM'}
        </span>
        
        {/* Hyper-Realistic Cinematic Dice */}
        <div className={`w-18 h-18 ${activeTheme.diceBg} w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border-2 relative overflow-hidden transform transition-all duration-500 ${isRolling ? 'animate-spin scale-110' : ''}`}>
          {renderDiceDots(displayFace)}
        </div>
        
        <button 
          onClick={rollDice}
          disabled={isRolling}
          className={`px-7 py-3 bg-black/90 border border-white/40 text-white text-xs font-black tracking-widest rounded-md hover:bg-black active:scale-95 transition-all disabled:opacity-50 uppercase shadow-[0_10px_25px_rgba(0,0,0,0.9)]`}
        >
          {isRolling ? 'ROLLING...' : 'ROLL DICE 🎲'}
        </button>
      </div>

      {/* Structured Cinematic Board with Token Move Sounds */}
      <div className="w-full flex justify-center mt-2 pb-2 relative z-20 drop-shadow-[0_25px_40px_rgba(0,0,0,1)]">
        <LudoBoardVisual theme={activeTheme} onTokenClick={handleTokenMove} />
      </div>

    </div>
  );
};

export default LudoGame;
