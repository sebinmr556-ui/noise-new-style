import React, { useState, useEffect } from 'react';
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

// ==========================================
// 7 MAXIMUM REALISTIC THEMES WITH DETAILED CSS
// ==========================================
const GAME_THEMES = [
  { 
    id: 'egyptian', name: '🏜️ Pyramid', 
    bgWrap: 'from-amber-900 via-yellow-950 to-stone-950', 
    boardStyle: 'border-yellow-600 bg-amber-950 shadow-[0_0_40px_rgba(202,138,4,0.6),inset_0_0_20px_rgba(0,0,0,0.9)]',
    diceBg: 'bg-gradient-to-br from-amber-500 via-yellow-600 to-yellow-800 border-yellow-400 text-yellow-950 shadow-[0_10px_20px_rgba(0,0,0,0.8)]',
    effectType: 'sand', effectName: '✨ Golden Ancient Sand Storm',
    baseStyle: 'bg-amber-950 border-yellow-600 rounded-lg shadow-[inset_0_0_15px_rgba(0,0,0,0.9)]',
    pathStyle: 'bg-yellow-900/70 border-yellow-700/50',
    centerStyle: 'bg-yellow-700 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]'
  },
  { 
    id: 'snow', name: '❄️ Snow', 
    bgWrap: 'from-blue-950 via-slate-900 to-black', 
    boardStyle: 'border-sky-300 bg-blue-950 shadow-[0_0_40px_rgba(56,189,248,0.7),inset_0_0_20px_rgba(255,255,255,0.2)]',
    diceBg: 'bg-gradient-to-br from-sky-100 via-white to-blue-200 border-white text-blue-900 shadow-[0_10px_25px_rgba(56,189,248,0.4)]',
    effectType: 'snow', effectName: '❄️ Blizzard Ice Storm',
    baseStyle: 'bg-blue-950 border-sky-400 rounded-3xl shadow-[inset_0_0_20px_rgba(255,255,255,0.3)]',
    pathStyle: 'bg-sky-950/90 border-sky-400/40',
    centerStyle: 'bg-sky-400 shadow-[inset_0_0_15px_rgba(255,255,255,0.6)]'
  },
  { 
    id: 'underwater', name: '🌊 Ocean', 
    bgWrap: 'from-cyan-950 via-blue-950 to-slate-950', 
    boardStyle: 'border-cyan-400 bg-cyan-950 shadow-[0_0_40px_rgba(6,182,212,0.7),inset_0_0_25px_rgba(0,0,0,0.9)]',
    diceBg: 'bg-gradient-to-br from-cyan-400 via-blue-600 to-blue-900 border-cyan-200 text-white shadow-[0_10px_25px_rgba(6,182,212,0.5)]',
    effectType: 'bubbles', effectName: '🫧 Deep Ocean Currents',
    baseStyle: 'bg-cyan-950 border-cyan-400 rounded-full shadow-[inset_0_0_20px_rgba(6,182,212,0.4)]',
    pathStyle: 'bg-cyan-950/90 border-cyan-500/50',
    centerStyle: 'bg-cyan-600 shadow-[inset_0_0_15px_rgba(0,255,255,0.5)]'
  },
  { 
    id: 'sky', name: '☁️ Sky', 
    bgWrap: 'from-indigo-950 via-sky-950 to-slate-950', 
    boardStyle: 'border-sky-200 bg-indigo-950 shadow-[0_0_40px_rgba(125,211,252,0.6),inset_0_0_20px_rgba(255,255,255,0.3)]',
    diceBg: 'bg-gradient-to-br from-sky-100 via-sky-300 to-blue-500 border-white text-indigo-950 shadow-[0_10px_25px_rgba(125,211,252,0.5)]',
    effectType: 'clouds', effectName: '☁️ Stratosphere Wind Flow',
    baseStyle: 'bg-indigo-950 border-sky-300 rounded-[2rem] shadow-[inset_0_0_20px_rgba(255,255,255,0.4)]',
    pathStyle: 'bg-sky-950/70 border-sky-200/40',
    centerStyle: 'bg-sky-300 shadow-[inset_0_0_15px_rgba(255,255,255,0.8)]'
  },
  { 
    id: 'fire', name: '🔥 Fire', 
    bgWrap: 'from-red-950 via-orange-950 to-black', 
    boardStyle: 'border-orange-500 bg-red-950 shadow-[0_0_50px_rgba(249,115,22,0.9),inset_0_0_25px_rgba(0,0,0,0.9)]',
    diceBg: 'bg-gradient-to-br from-orange-500 via-red-600 to-black border-yellow-400 text-yellow-200 shadow-[0_10px_30px_rgba(234,88,12,0.8)] animate-pulse',
    effectType: 'fire', effectName: '🔥 Volcanic Magma Eruption',
    baseStyle: 'bg-red-950 border-orange-500 rounded-xl shadow-[inset_0_0_25px_rgba(234,88,12,0.6)]',
    pathStyle: 'bg-orange-950/90 border-orange-600/70',
    centerStyle: 'bg-orange-600 shadow-[inset_0_0_20px_rgba(255,165,0,0.8)]'
  },
  { 
    id: 'forest', name: '🌳 Forest', 
    bgWrap: 'from-emerald-950 via-green-950 to-stone-950', 
    boardStyle: 'border-emerald-400 bg-emerald-950 shadow-[0_0_40px_rgba(16,185,129,0.6),inset_0_0_20px_rgba(0,0,0,0.9)]',
    diceBg: 'bg-gradient-to-br from-green-600 via-emerald-800 to-stone-900 border-green-300 text-green-100 shadow-[0_10px_25px_rgba(16,185,129,0.5)]',
    effectType: 'leaves', effectName: '🍃 Deep Jungle Canopy',
    baseStyle: 'bg-emerald-950 border-emerald-400 rounded-2xl shadow-[inset_0_0_20px_rgba(16,185,129,0.4)]',
    pathStyle: 'bg-emerald-950/90 border-emerald-600/50',
    centerStyle: 'bg-emerald-600 shadow-[inset_0_0_15px_rgba(0,255,0,0.4)]'
  },
  { 
    id: 'horror', name: '🧛 Horror', 
    bgWrap: 'from-zinc-950 via-red-950/50 to-black', 
    boardStyle: 'border-red-700 bg-zinc-950 shadow-[0_0_50px_rgba(185,28,28,0.8),inset_0_0_30px_rgba(0,0,0,1)]',
    diceBg: 'bg-gradient-to-br from-zinc-900 via-red-950 to-black border-red-600 text-red-500 shadow-[0_10px_30px_rgba(153,27,27,0.8)]',
    effectType: 'horror', effectName: '🦇 Haunted Blood Crypt',
    baseStyle: 'bg-black border-red-800 rounded-none shadow-[inset_0_0_25px_rgba(153,27,27,0.8)]',
    pathStyle: 'bg-zinc-950 border-red-950/80',
    centerStyle: 'bg-red-900 shadow-[inset_0_0_20px_rgba(255,0,0,0.6)]'
  }
];

const playDiceSound = () => {
  try {
    const audio = new Audio('https://actions.google.com/sounds/v1/foley/rolling_dice_on_table.ogg');
    audio.volume = 0.8;
    audio.play().catch(e => console.log("Sound play error:", e));
  } catch (error) {
    console.log("Audio not supported");
  }
};

const renderCells = (count: number, renderFn: (index: number) => React.ReactNode) => {
  return Array.from({ length: count }).map((_, i) => renderFn(i));
};

const Token = ({ colorClass }: { colorClass: string }) => (
  <div className={`w-[70%] h-[70%] rounded-full ${colorClass} shadow-[0_5px_8px_rgba(0,0,0,0.8),inset_0_-3px_5px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.6)] border border-black transform hover:scale-110 transition-transform cursor-pointer relative`}></div>
);

const Base = ({ outerClass, tokenColor }: {outerClass: string, tokenColor: string}) => (
  <div className={`p-2 sm:p-3 flex items-center justify-center ${outerClass} relative border-[2px] border-black/80 overflow-hidden`}>
    <div className="w-full h-full bg-black/40 backdrop-blur-md rounded-lg p-3 grid grid-cols-2 gap-3 shadow-[inset_0_4px_8px_rgba(0,0,0,0.9)] border border-white/10 relative z-10">
      {[1,2,3,4].map(i => (
        <div key={i} className="rounded-full bg-black/70 shadow-[inset_0_6px_12px_rgba(0,0,0,1)] border border-white/20 flex items-center justify-center relative overflow-hidden">
           <Token colorClass={tokenColor} />
        </div>
      ))}
    </div>
  </div>
);

const Tile = ({ colorClass, hasStar }: {colorClass: string, hasStar: boolean}) => (
  <div className={`relative border-[1px] border-black/50 shadow-[inset_0_1px_3px_rgba(255,255,255,0.3),inset_0_-1px_3px_rgba(0,0,0,0.6)] ${colorClass} flex items-center justify-center overflow-hidden`}>
    {hasStar && <span className="text-white/80 text-[12px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] font-black">★</span>}
  </div>
);

// Advanced Theme-Based Structured Ludo Board
const LudoBoardVisual = ({ theme }: { theme: any }) => {
  return (
    <div className={`w-full max-w-[340px] aspect-square p-3 rounded-2xl border-4 ${theme.boardStyle} relative select-none overflow-hidden transition-all duration-700`}>
      
      {/* Detailed Dynamic Visual Effects for Each Theme */}
      {theme.effectType === 'fire' && (
        <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center opacity-60 animate-pulse bg-[radial-gradient(circle,_rgba(249,115,22,0.5)_0%,_transparent_75%)]">
          <span className="text-3xl absolute top-1 left-3 animate-bounce">🔥</span>
          <span className="text-2xl absolute bottom-2 right-4 animate-pulse">✨</span>
          <span className="text-3xl absolute top-1/2 right-1 animate-ping">🔥</span>
        </div>
      )}

      {theme.effectType === 'snow' && (
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden opacity-80">
          <div className="absolute top-1 left-6 animate-bounce text-white text-xs">❄️</div>
          <div className="absolute top-4 left-28 animate-pulse text-sky-200 text-sm">❅</div>
          <div className="absolute top-2 right-8 animate-bounce text-white text-xs">❄️</div>
          <div className="absolute top-6 right-24 animate-pulse text-sky-100 text-sm">❆</div>
        </div>
      )}

      {theme.effectType === 'leaves' && (
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden opacity-85">
          <div className="absolute top-2 left-6 animate-spin text-green-300 text-xs">🍃</div>
          <div className="absolute top-4 right-10 animate-bounce text-emerald-400 text-sm">🍂</div>
          <div className="absolute bottom-4 left-14 animate-pulse text-green-400 text-xs">🍃</div>
        </div>
      )}

      {theme.effectType === 'bubbles' && (
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden opacity-75">
          <div className="absolute bottom-3 left-8 animate-ping text-cyan-200 text-xs">🫧</div>
          <div className="absolute bottom-6 right-12 animate-bounce text-blue-200 text-xs">💧</div>
        </div>
      )}

      {theme.effectType === 'horror' && (
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden opacity-75">
          <div className="absolute top-2 right-6 animate-pulse text-red-500 text-sm">🦇</div>
          <div className="absolute bottom-2 left-8 animate-bounce text-red-600 text-xs">👁️</div>
        </div>
      )}

      <div className={`w-full h-full ${theme.baseStyle} border-2 border-black/90 grid grid-cols-[6fr_3fr_6fr] grid-rows-[6fr_3fr_6fr] gap-0 overflow-hidden relative z-10 transition-all duration-700`}>
        
        {/* Base 1 (Red) */}
        <Base outerClass="bg-red-600" tokenColor="bg-red-400" />
        <div className={`grid grid-cols-3 grid-rows-6 ${theme.pathStyle} z-0 relative transition-all duration-500`}>
          {renderCells(18, (i) => {
            const isHomeStretch = [4,7,10,13,16].includes(i);
            const isStart = i === 5;
            const isStar = i === 6;
            let colorClass = theme.pathStyle; 
            if (isHomeStretch || isStart) colorClass = "bg-green-600 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]"; 
            return <Tile key={`t-${i}`} colorClass={colorClass} hasStar={isStar} />
          })}
        </div>
        {/* Base 2 (Green) */}
        <Base outerClass="bg-green-600" tokenColor="bg-green-400" />

        {/* Path Left */}
        <div className={`grid grid-cols-6 grid-rows-3 ${theme.pathStyle} z-0 relative transition-all duration-500`}>
          {renderCells(18, (i) => {
            const isHomeStretch = [7,8,9,10,11].includes(i);
            const isStart = i === 1;
            const isStar = i === 13;
            let colorClass = theme.pathStyle;
            if (isHomeStretch || isStart) colorClass = "bg-red-600 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]";
            return <Tile key={`l-${i}`} colorClass={colorClass} hasStar={isStar} />
          })}
        </div>
        
        {/* Center Home */}
        <div className={`relative border-[1.5px] border-black/70 ${theme.centerStyle} overflow-hidden z-10 flex items-center justify-center transition-all duration-700`}>
          <svg viewBox="0 0 100 100" className="w-[100%] h-[100%] opacity-95 drop-shadow-md">
            <polygon points="0,0 100,0 50,50" fill="#22c55e" stroke="#000" strokeWidth="2"/>
            <polygon points="100,0 100,100 50,50" fill="#eab308" stroke="#000" strokeWidth="2"/>
            <polygon points="0,100 100,100 50,50" fill="#3b82f6" stroke="#000" strokeWidth="2"/>
            <polygon points="0,0 0,100 50,50" fill="#ef4444" stroke="#000" strokeWidth="2"/>
          </svg>
        </div>

        {/* Path Right */}
        <div className={`grid grid-cols-6 grid-rows-3 ${theme.pathStyle} z-0 relative transition-all duration-500`}>
          {renderCells(18, (i) => {
            const isHomeStretch = [6,7,8,9,10].includes(i);
            const isStart = i === 16;
            const isStar = i === 4;
            let colorClass = theme.pathStyle;
            if (isHomeStretch || isStart) colorClass = "bg-yellow-500 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]";
            return <Tile key={`r-${i}`} colorClass={colorClass} hasStar={isStar} />
          })}
        </div>

        {/* Base 3 (Blue) */}
        <Base outerClass="bg-blue-600" tokenColor="bg-blue-400" />
        <div className={`grid grid-cols-3 grid-rows-6 ${theme.pathStyle} z-0 relative transition-all duration-500`}>
          {renderCells(18, (i) => {
            const isHomeStretch = [1,4,7,10,13].includes(i);
            const isStart = i === 12;
            const isStar = i === 11;
            let colorClass = theme.pathStyle;
            if (isHomeStretch || isStart) colorClass = "bg-blue-500 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]";
            return <Tile key={`b-${i}`} colorClass={colorClass} hasStar={isStar} />
          })}
        </div>
        {/* Base 4 (Yellow) */}
        <Base outerClass="bg-yellow-500" tokenColor="bg-yellow-300" />
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

  const activeTheme = GAME_THEMES.find(t => t.id === activeThemeId) || GAME_THEMES[0];

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

  // Dice rolling complete blur and random number generation
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRolling) {
      interval = setInterval(() => {
        setDisplayFace(Math.floor(Math.random() * 6) + 1);
      }, 70);
    } else {
      setDisplayFace(gameState.diceValue || 1);
    }
    return () => clearInterval(interval);
  }, [isRolling, gameState.diceValue]);

  const rollDice = async () => {
    if (!currentUser || !roomId || isRolling) return;
    
    playDiceSound();
    setIsRolling(true);
    
    const randomNum = Math.floor(Math.random() * 6) + 1;
    const gameDocRef = doc(db, 'voice_rooms', roomId, 'games', 'ludo');
    try {
      await updateDoc(gameDocRef, { diceValue: randomNum, lastRolledBy: currentUser.username });
    } catch (error) {
      await setDoc(gameDocRef, { diceValue: randomNum, lastRolledBy: currentUser.username, turn: 'player_1' });
    }
    
    setTimeout(() => setIsRolling(false), 800);
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
      <div className={`grid grid-cols-3 grid-rows-3 gap-1 w-full h-full p-2 relative z-10 transition-all duration-200 ${isRolling ? 'opacity-0 scale-50 blur-xl' : 'opacity-100 scale-100 blur-0'}`}>
        {[0,1,2,3,4,5,6,7,8].map(i => (
          <div key={i} className="flex items-center justify-center">
            {activeDots.includes(i) && (
              <div className={`w-3 h-3 bg-white rounded-full shadow-[inset_0_-1px_2px_rgba(0,0,0,0.6),0_1px_2px_rgba(0,0,0,0.8)]`}>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`flex flex-col items-center justify-center p-3 bg-gradient-to-br ${activeTheme.bgWrap} rounded-xl w-full border border-black/60 shadow-[inset_0_0_60px_rgba(0,0,0,0.9)] relative overflow-hidden transition-colors duration-700`}>
      
      {/* Theme Selector Navigation */}
      <div className="w-full flex overflow-x-auto gap-2 pb-3 mb-2 scrollbar-hide snap-x">
        {GAME_THEMES.map(theme => (
          <button 
            key={theme.id}
            onClick={() => setActiveThemeId(theme.id)}
            className={`snap-center shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider transition-all ${activeThemeId === theme.id ? 'bg-white text-black shadow-[0_0_12px_#fff] scale-105' : 'bg-black/50 text-white/60 border border-white/20 hover:bg-black/70'}`}
          >
            {theme.name}
          </button>
        ))}
      </div>

      <div className="mb-4 text-center flex flex-col items-center relative z-20">
        <span className="text-[9px] text-yellow-300 mb-1 uppercase tracking-widest font-extrabold drop-shadow">
          {activeTheme.effectName}
        </span>
        <span className="text-[10px] text-white mb-3 uppercase tracking-widest font-black drop-shadow-md">
          {gameState.lastRolledBy ? `ROLLED BY: @${gameState.lastRolledBy}` : 'CHOOSE YOUR REALM'}
        </span>
        
        {/* Realistic Animated Dice Box */}
        <div className={`w-16 h-16 ${activeTheme.diceBg} rounded-xl flex items-center justify-center mb-4 border-2 relative overflow-hidden transform transition-all duration-500 ${isRolling ? 'animate-spin scale-110' : ''}`}>
          {renderDiceDots(displayFace)}
        </div>
        
        <button 
          onClick={rollDice}
          disabled={isRolling}
          className={`px-6 py-2.5 bg-black/70 border border-white/30 text-white text-xs font-black tracking-widest rounded-sm hover:bg-black/90 active:scale-95 transition-all disabled:opacity-50 uppercase shadow-xl`}
        >
          {isRolling ? 'ROLLING...' : 'ROLL DICE 🎲'}
        </button>
      </div>

      {/* Structured Themed Board */}
      <div className="w-full flex justify-center mt-2 pb-2 relative z-20 drop-shadow-2xl">
        <LudoBoardVisual theme={activeTheme} />
      </div>

    </div>
  );
};

export default LudoGame;
