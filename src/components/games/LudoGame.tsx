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

// ----------------------------------------------------
// 7 വ്യത്യസ്ത തീമുകൾ (The 7 Multiverse Themes)
// ----------------------------------------------------
const GAME_THEMES = [
  { 
    id: 'egyptian', name: '🏜️ Pyramid', 
    bgWrap: 'from-amber-700 via-orange-800 to-yellow-900', 
    texture: 'https://www.transparenttextures.com/patterns/sandpaper.png', 
    boardBorder: 'border-yellow-900', 
    diceBg: 'bg-gradient-to-br from-amber-400 to-yellow-600 border-yellow-800', 
    diceDot: 'bg-yellow-950', 
    btn: 'bg-yellow-800 text-yellow-100 shadow-[0_0_10px_#854d0e]', text: 'text-amber-300' 
  },
  { 
    id: 'snow', name: '❄️ Snow', 
    bgWrap: 'from-sky-100 via-blue-50 to-blue-200', 
    texture: 'https://www.transparenttextures.com/patterns/snow.png', 
    boardBorder: 'border-blue-300', 
    diceBg: 'bg-white border-blue-200 shadow-[0_0_15px_#93c5fd]', 
    diceDot: 'bg-blue-500', 
    btn: 'bg-blue-500 text-white shadow-[0_0_10px_#3b82f6]', text: 'text-blue-800' 
  },
  { 
    id: 'underwater', name: '🌊 Ocean', 
    bgWrap: 'from-cyan-800 via-blue-900 to-slate-900', 
    texture: 'https://www.transparenttextures.com/patterns/water.png', 
    boardBorder: 'border-cyan-900', 
    diceBg: 'bg-gradient-to-br from-cyan-400 to-blue-500 border-cyan-700 shadow-[0_0_15px_#06b6d4]', 
    diceDot: 'bg-white', 
    btn: 'bg-cyan-700 text-cyan-100 shadow-[0_0_10px_#0891b2]', text: 'text-cyan-300' 
  },
  { 
    id: 'sky', name: '☁️ Sky', 
    bgWrap: 'from-blue-300 via-sky-200 to-blue-400', 
    texture: 'https://www.transparenttextures.com/patterns/stardust.png', 
    boardBorder: 'border-white', 
    diceBg: 'bg-white border-sky-100 shadow-[0_0_15px_#fff]', 
    diceDot: 'bg-sky-400', 
    btn: 'bg-sky-500 text-white shadow-[0_0_10px_#0ea5e9]', text: 'text-sky-900' 
  },
  { 
    id: 'fire', name: '🔥 Fire', 
    bgWrap: 'from-red-900 via-orange-900 to-black', 
    texture: 'https://www.transparenttextures.com/patterns/asphalt-pattern.png', 
    boardBorder: 'border-orange-600', 
    diceBg: 'bg-gradient-to-br from-orange-500 to-red-600 border-red-900 shadow-[0_0_20px_#ea580c]', 
    diceDot: 'bg-yellow-300', 
    btn: 'bg-red-800 text-orange-100 shadow-[0_0_15px_#991b1b]', text: 'text-orange-400' 
  },
  { 
    id: 'forest', name: '🌳 Forest', 
    bgWrap: 'from-green-900 via-emerald-800 to-green-950', 
    texture: 'https://www.transparenttextures.com/patterns/leaves.png', 
    boardBorder: 'border-green-950', 
    diceBg: 'bg-gradient-to-br from-amber-800 to-yellow-900 border-amber-950 shadow-[0_0_15px_#064e3b]', 
    diceDot: 'bg-green-300', 
    btn: 'bg-green-800 text-green-100 shadow-[0_0_10px_#166534]', text: 'text-green-400' 
  },
  { 
    id: 'horror', name: '🧛 Horror', 
    bgWrap: 'from-zinc-900 via-black to-zinc-950', 
    texture: 'https://www.transparenttextures.com/patterns/black-scales.png', 
    boardBorder: 'border-red-900', 
    diceBg: 'bg-zinc-800 border-red-900 shadow-[0_0_15px_#7f1d1d]', 
    diceDot: 'bg-red-600', 
    btn: 'bg-red-950 text-red-500 border border-red-900 shadow-[0_0_15px_#7f1d1d]', text: 'text-red-500' 
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

// കരുക്കൾ
const Token = ({ colorClass }: { colorClass: string }) => (
  <div className={`w-[70%] h-[70%] rounded-full ${colorClass} shadow-[0_4px_6px_rgba(0,0,0,0.6),inset_0_-2px_4px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,0.4)] border border-black/50 transform hover:scale-110 transition-transform cursor-pointer relative`}>
  </div>
);

const Base = ({ outerClass, tokenColor }: {outerClass: string, tokenColor: string}) => (
  <div className={`p-2 sm:p-3 flex items-center justify-center ${outerClass} relative border-[2px] border-black/50 overflow-hidden`}>
    <div className="w-full h-full bg-white/20 backdrop-blur-sm rounded-md p-3 grid grid-cols-2 gap-3 shadow-[0_5px_15px_rgba(0,0,0,0.5),inset_0_2px_5px_rgba(255,255,255,0.2)] border-2 border-black/30 relative z-10">
      {[1,2,3,4].map(i => (
        <div key={i} className="rounded-full bg-black/40 shadow-[inset_0_5px_10px_rgba(0,0,0,0.8)] border border-black/50 flex items-center justify-center relative overflow-hidden">
           <Token colorClass={tokenColor} />
        </div>
      ))}
    </div>
  </div>
);

const Tile = ({ colorClass, hasStar }: {colorClass: string, hasStar: boolean}) => (
  <div className={`relative border-[1px] border-black/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] ${colorClass} flex items-center justify-center overflow-hidden`}>
    {hasStar && <span className="text-black/50 text-[12px] drop-shadow-md font-black opacity-80">★</span>}
  </div>
);

// റിയലിസ്റ്റിക് മൾട്ടി-തീം ബോർഡ്
const LudoBoardVisual = ({ theme }: { theme: any }) => {
  return (
    <div className={`w-full max-w-[340px] aspect-square bg-[#111] p-2 rounded-lg shadow-2xl border-4 ${theme.boardBorder} relative select-none overflow-hidden transition-colors duration-500`}>
      
      {/* 🌟 Theme Texture Overlay (Magic happens here!) 🌟 */}
      <div className="absolute inset-0 z-20 pointer-events-none mix-blend-overlay opacity-60 transition-all duration-500" style={{ backgroundImage: `url(${theme.texture})` }}></div>

      <div className="w-full h-full bg-gray-200 border-2 border-black/80 grid grid-cols-[6fr_3fr_6fr] grid-rows-[6fr_3fr_6fr] gap-0 overflow-hidden relative z-10">
        
        {/* വരി 1 */}
        <Base outerClass="bg-red-600" tokenColor="bg-red-500" />
        <div className="grid grid-cols-3 grid-rows-6 bg-gray-100 z-0 relative">
          {renderCells(18, (i) => {
            const isHomeStretch = [4,7,10,13,16].includes(i);
            const isStart = i === 5;
            const isStar = i === 6;
            let colorClass = "bg-white"; 
            if (isHomeStretch || isStart) colorClass = "bg-green-500"; 
            return <Tile key={`t-${i}`} colorClass={colorClass} hasStar={isStar} />
          })}
        </div>
        <Base outerClass="bg-green-600" tokenColor="bg-green-500" />

        {/* വരി 2 */}
        <div className="grid grid-cols-6 grid-rows-3 bg-gray-100 z-0 relative">
          {renderCells(18, (i) => {
            const isHomeStretch = [7,8,9,10,11].includes(i);
            const isStart = i === 1;
            const isStar = i === 13;
            let colorClass = "bg-white";
            if (isHomeStretch || isStart) colorClass = "bg-red-500";
            return <Tile key={`l-${i}`} colorClass={colorClass} hasStar={isStar} />
          })}
        </div>
        
        {/* നടുവിലെ ഹോം */}
        <div className="relative border-[1.5px] border-black/50 bg-black overflow-hidden z-10 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-[100%] h-[100%] opacity-90">
            <polygon points="0,0 100,0 50,50" fill="#22c55e" stroke="#000" strokeWidth="2"/>
            <polygon points="100,0 100,100 50,50" fill="#eab308" stroke="#000" strokeWidth="2"/>
            <polygon points="0,100 100,100 50,50" fill="#3b82f6" stroke="#000" strokeWidth="2"/>
            <polygon points="0,0 0,100 50,50" fill="#ef4444" stroke="#000" strokeWidth="2"/>
          </svg>
        </div>

        <div className="grid grid-cols-6 grid-rows-3 bg-gray-100 z-0 relative">
          {renderCells(18, (i) => {
            const isHomeStretch = [6,7,8,9,10].includes(i);
            const isStart = i === 16;
            const isStar = i === 4;
            let colorClass = "bg-white";
            if (isHomeStretch || isStart) colorClass = "bg-yellow-400";
            return <Tile key={`r-${i}`} colorClass={colorClass} hasStar={isStar} />
          })}
        </div>

        {/* വരി 3 */}
        <Base outerClass="bg-blue-600" tokenColor="bg-blue-500" />
        <div className="grid grid-cols-3 grid-rows-6 bg-gray-100 z-0 relative">
          {renderCells(18, (i) => {
            const isHomeStretch = [1,4,7,10,13].includes(i);
            const isStart = i === 12;
            const isStar = i === 11;
            let colorClass = "bg-white";
            if (isHomeStretch || isStart) colorClass = "bg-blue-500";
            return <Tile key={`b-${i}`} colorClass={colorClass} hasStar={isStar} />
          })}
        </div>
        <Base outerClass="bg-yellow-500" tokenColor="bg-yellow-400" />
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
  const [activeThemeId, setActiveThemeId] = useState('egyptian'); // Default Theme

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

  // ഡൈസിലെ കുത്തുകൾ (dots) വരയ്ക്കാനുള്ള ഫംഗ്ഷൻ
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
      <div className={`grid grid-cols-3 grid-rows-3 gap-1 w-full h-full p-2 relative z-10 transition-all duration-300 ${isRolling ? 'opacity-0 scale-0 blur-xl' : 'opacity-100 scale-100 blur-0'}`}>
        {[0,1,2,3,4,5,6,7,8].map(i => (
          <div key={i} className="flex items-center justify-center">
            {activeDots.includes(i) && (
              <div className={`w-3 h-3 ${activeTheme.diceDot} rounded-full shadow-[inset_0_-1px_2px_rgba(0,0,0,0.5),0_1px_1px_rgba(255,255,255,0.9)]`}></div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`flex flex-col items-center justify-center p-3 bg-gradient-to-br ${activeTheme.bgWrap} rounded-xl w-full border border-black/50 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden transition-colors duration-700`}>
      
      {/* Theme Selector (തീം മാറ്റാനുള്ള ബട്ടണുകൾ) */}
      <div className="w-full flex overflow-x-auto gap-2 pb-3 mb-2 scrollbar-hide snap-x">
        {GAME_THEMES.map(theme => (
          <button 
            key={theme.id}
            onClick={() => setActiveThemeId(theme.id)}
            className={`snap-center shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider transition-all ${activeThemeId === theme.id ? 'bg-white text-black shadow-[0_0_10px_#fff] scale-105' : 'bg-black/40 text-white/50 border border-white/20 hover:bg-black/60'}`}
          >
            {theme.name}
          </button>
        ))}
      </div>

      <div className="mb-4 text-center flex flex-col items-center relative z-20">
        <span className={`text-[10px] ${activeTheme.text} mb-3 uppercase tracking-widest font-black drop-shadow-md transition-colors`}>
          {gameState.lastRolledBy ? `ROLLED BY: @${gameState.lastRolledBy}` : 'CHOOSE YOUR WORLD'}
        </span>
        
        {/* Dynamic Theme Dice */}
        <div className={`w-16 h-16 ${activeTheme.diceBg} rounded-xl flex items-center justify-center mb-4 border-2 relative overflow-hidden transform transition-all duration-500 ${isRolling ? 'animate-spin scale-110' : ''}`}>
          {/* Dice Texture */}
          <div className="absolute inset-0 opacity-40 mix-blend-multiply pointer-events-none transition-all duration-500" style={{ backgroundImage: `url(${activeTheme.texture})` }}></div>
          {renderDiceDots(gameState.diceValue || 1)}
        </div>
        
        <button 
          onClick={rollDice}
          disabled={isRolling}
          className={`px-6 py-2.5 ${activeTheme.btn} border border-white/10 text-xs font-black tracking-widest rounded-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 uppercase`}
        >
          {isRolling ? 'ROLLING...' : 'ROLL DICE 🎲'}
        </button>
      </div>

      {/* Themed Ludo Board */}
      <div className="w-full flex justify-center mt-2 pb-2 relative z-20 drop-shadow-2xl">
        <LudoBoardVisual theme={activeTheme} />
      </div>

    </div>
  );
};

export default LudoGame;
