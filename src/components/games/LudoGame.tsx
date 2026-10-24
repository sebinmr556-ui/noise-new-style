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

// സുരക്ഷിതമായ സിനിമാറ്റിക് തീമുകൾ
const CINEMATIC_THEMES = [
  { 
    id: 'egyptian', name: '🏜️ Pyramid', 
    bgWrap: 'from-amber-950 via-stone-950 to-black', 
    boardStyle: 'border-yellow-600 bg-amber-950',
    diceBg: 'bg-gradient-to-br from-amber-500 to-yellow-700 text-yellow-950',
    effectName: 'Ancient Sand Storm',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/ambiences/desert_wind.ogg',
    pathStyle: 'bg-yellow-900/70',
    centerStyle: 'bg-yellow-700',
    tileHighlight: 'bg-amber-600'
  },
  { 
    id: 'snow', name: '❄️ Snow', 
    bgWrap: 'from-blue-950 via-slate-950 to-black', 
    boardStyle: 'border-sky-300 bg-blue-950',
    diceBg: 'bg-gradient-to-br from-sky-100 to-blue-200 text-blue-950',
    effectName: 'Blizzard Ice Storm',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/weather/wind_heavy.ogg',
    pathStyle: 'bg-sky-950/90',
    centerStyle: 'bg-sky-400',
    tileHighlight: 'bg-sky-600'
  },
  { 
    id: 'underwater', name: '🌊 Ocean', 
    bgWrap: 'from-cyan-950 via-blue-950 to-slate-950', 
    boardStyle: 'border-cyan-400 bg-cyan-950',
    diceBg: 'bg-gradient-to-br from-cyan-400 to-blue-700 text-white',
    effectName: 'Deep Sea Currents',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/water/waves_ocean_surfs.ogg',
    pathStyle: 'bg-cyan-950/90',
    centerStyle: 'bg-cyan-600',
    tileHighlight: 'bg-cyan-500'
  },
  { 
    id: 'fire', name: '🔥 Fire', 
    bgWrap: 'from-red-950 via-orange-950 to-black', 
    boardStyle: 'border-orange-500 bg-red-950',
    diceBg: 'bg-gradient-to-br from-orange-500 to-red-700 text-yellow-100',
    effectName: 'Volcanic Magma',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/ambiences/fire_crackling.ogg',
    pathStyle: 'bg-orange-950/90',
    centerStyle: 'bg-orange-600',
    tileHighlight: 'bg-orange-500'
  },
  { 
    id: 'forest', name: '🌳 Forest', 
    bgWrap: 'from-emerald-950 via-green-950 to-black', 
    boardStyle: 'border-emerald-400 bg-emerald-950',
    diceBg: 'bg-gradient-to-br from-green-600 to-emerald-900 text-green-50',
    effectName: 'Deep Jungle Canopy',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/ambiences/outdoor_rain_forest.ogg',
    pathStyle: 'bg-emerald-950/90',
    centerStyle: 'bg-emerald-600',
    tileHighlight: 'bg-emerald-500'
  },
  { 
    id: 'horror', name: '🧛 Horror', 
    bgWrap: 'from-zinc-950 via-red-950 to-black', 
    boardStyle: 'border-red-800 bg-zinc-950',
    diceBg: 'bg-gradient-to-br from-zinc-900 to-red-950 text-red-500',
    effectName: 'Spooky Blood Crypt',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/ambiences/creepy_wind.ogg',
    pathStyle: 'bg-zinc-950/90',
    centerStyle: 'bg-red-900',
    tileHighlight: 'bg-red-700'
  }
];

const renderCells = (count: number, renderFn: (index: number) => React.ReactNode) => {
  return Array.from({ length: count }).map((_, i) => renderFn(i));
};

const Token = ({ colorClass }: { colorClass: string }) => (
  <div className={`w-[75%] h-[75%] rounded-full ${colorClass} shadow-[0_5px_10px_rgba(0,0,0,0.9)] border border-black cursor-pointer`}></div>
);

const Base = ({ outerClass, tokenColor }: { outerClass: string, tokenColor: string }) => (
  <div className={`p-3 flex items-center justify-center ${outerClass} relative border-2 border-black overflow-hidden`}>
    <div className="w-full h-full bg-black/80 rounded p-2 grid grid-cols-2 gap-2 border border-white/20">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="rounded-full bg-black flex items-center justify-center border border-white/30">
           <Token colorClass={tokenColor} />
        </div>
      ))}
    </div>
  </div>
);

const Tile = ({ colorClass, hasStar }: { colorClass: string, hasStar: boolean }) => (
  <div className={`relative border border-black/70 ${colorClass} flex items-center justify-center`}>
    {hasStar && <span className="text-white text-[10px] font-bold">★</span>}
  </div>
);

const LudoBoardVisual = ({ theme }: { theme: any }) => {
  return (
    <div className={`w-full max-w-[340px] aspect-square p-3 rounded-xl border-4 ${theme.boardStyle} relative shadow-2xl`}>
      <div className="w-full h-full border-2 border-black grid grid-cols-[6fr_3fr_6fr] grid-rows-[6fr_3fr_6fr] overflow-hidden">
        
        <Base outerClass="bg-red-950" tokenColor="bg-red-600" />
        <div className={`grid grid-cols-3 grid-rows-6 ${theme.pathStyle}`}>
          {renderCells(18, (i) => {
            const isHomeStretch = [4,7,10,13,16].includes(i);
            const isStart = i === 5;
            let colorClass = theme.pathStyle; 
            if (isHomeStretch || isStart) colorClass = theme.tileHighlight; 
            return <Tile key={`t-${i}`} colorClass={colorClass} hasStar={i === 6} />
          })}
        </div>
        <Base outerClass="bg-emerald-950" tokenColor="bg-emerald-600" />

        <div className={`grid grid-cols-6 grid-rows-3 ${theme.pathStyle}`}>
          {renderCells(18, (i) => {
            const isHomeStretch = [7,8,9,10,11].includes(i);
            const isStart = i === 1;
            let colorClass = theme.pathStyle;
            if (isHomeStretch || isStart) colorClass = theme.tileHighlight;
            return <Tile key={`l-${i}`} colorClass={colorClass} hasStar={i === 13} />
          })}
        </div>
        
        <div className={`relative border-2 border-black ${theme.centerStyle} flex items-center justify-center`}>
          <svg viewBox="0 0 100 100" className="w-full h-full opacity-90">
            <polygon points="0,0 100,0 50,50" fill="#047857" stroke="#000" strokeWidth="2"/>
            <polygon points="100,0 100,100 50,50" fill="#d97706" stroke="#000" strokeWidth="2"/>
            <polygon points="0,100 100,100 50,50" fill="#1d4ed8" stroke="#000" strokeWidth="2"/>
            <polygon points="0,0 0,100 50,50" fill="#b91c1c" stroke="#000" strokeWidth="2"/>
          </svg>
        </div>

        <div className={`grid grid-cols-6 grid-rows-3 ${theme.pathStyle}`}>
          {renderCells(18, (i) => {
            const isHomeStretch = [6,7,8,9,10].includes(i);
            const isStart = i === 16;
            let colorClass = theme.pathStyle;
            if (isHomeStretch || isStart) colorClass = theme.tileHighlight;
            return <Tile key={`r-${i}`} colorClass={colorClass} hasStar={i === 4} />
          })}
        </div>

        <Base outerClass="bg-blue-950" tokenColor="bg-blue-600" />
        <div className={`grid grid-cols-3 grid-rows-6 ${theme.pathStyle}`}>
          {renderCells(18, (i) => {
            const isHomeStretch = [1,4,7,10,13].includes(i);
            const isStart = i === 12;
            let colorClass = theme.pathStyle;
            if (isHomeStretch || isStart) colorClass = theme.tileHighlight;
            return <Tile key={`b-${i}`} colorClass={colorClass} hasStar={i === 11} />
          })}
        </div>
        <Base outerClass="bg-amber-950" tokenColor="bg-amber-600" />
      </div>
    </div>
  );
};

const LudoGame: React.FC<LudoGameProps> = ({ roomId, currentUser }) => {
  const [gameState, setGameState] = useState<GameState>({
    diceValue: 1,
    lastRolledBy: '',
    turn: 'red'
  });
  const [isRolling, setIsRolling] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState('egyptian');
  const [displayFace, setDisplayFace] = useState(1);
  const [isSoundOn, setIsSoundOn] = useState(true);

  const activeTheme = CINEMATIC_THEMES.find(t => t.id === activeThemeId) || CINEMATIC_THEMES[0];
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!roomId || !db) return;
    const gameDocRef = doc(db, 'voice_rooms', roomId, 'games', 'ludo');
    const unsubscribe = onSnapshot(gameDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        setGameState(docSnap.data() as GameState);
      } else {
        try {
          await setDoc(gameDocRef, { diceValue: 1, lastRolledBy: '', turn: 'red' });
        } catch (e) {
          console.log("Firebase Error:", e);
        }
      }
    });
    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    if (ambientAudioRef.current) {
      ambientAudioRef.current.pause();
      ambientAudioRef.current = null;
    }
    if (isSoundOn && activeTheme.ambientSoundUrl) {
      const audio = new Audio(activeTheme.ambientSoundUrl);
      audio.loop = true;
      audio.volume = 0.3;
      audio.play().catch(e => console.log("Audio block:", e));
      ambientAudioRef.current = audio;
    }
    return () => {
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
        ambientAudioRef.current = null;
      }
    };
  }, [activeThemeId, isSoundOn]);

  const playSfx = () => {
    if (!isSoundOn) return;
    try {
      const sound = new Audio('https://actions.google.com/sounds/v1/foley/rolling_dice_on_table.ogg');
      sound.volume = 0.8;
      sound.play().catch(e => console.log("SFX error:", e));
    } catch (e) {
      console.log("Audio error", e);
    }
  };

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
    
    playSfx();
    setIsRolling(true);
    
    const randomNum = Math.floor(Math.random() * 6) + 1;
    const gameDocRef = doc(db, 'voice_rooms', roomId, 'games', 'ludo');
    try {
      await updateDoc(gameDocRef, { diceValue: randomNum, lastRolledBy: currentUser.username });
    } catch (error) {
      await setDoc(gameDocRef, { diceValue: randomNum, lastRolledBy: currentUser.username, turn: 'red' });
    }
    
    setTimeout(() => setIsRolling(false), 900);
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
              <div className="w-3 h-3 bg-white rounded-full shadow-md"></div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`flex flex-col items-center justify-center p-3 bg-gradient-to-br ${activeTheme.bgWrap} rounded-2xl w-full border border-white/20 relative overflow-hidden transition-colors duration-700`}>
      
      {/* Sound Toggle Button */}
      <div className="w-full flex items-center justify-between pb-2 px-1 mb-1 border-b border-white/10">
        <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
          {activeTheme.effectName}
        </span>
        <button
          onClick={() => setIsSoundOn(!isSoundOn)}
          className={`px-3 py-1 rounded text-[10px] font-bold transition-all border ${
            isSoundOn ? 'bg-emerald-700 text-white border-emerald-400' : 'bg-rose-950 text-rose-300 border-rose-600'
          }`}
        >
          {isSoundOn ? '🔊 SOUND ON' : '🔇 SOUND OFF'}
        </button>
      </div>

      {/* Theme Selector Bar */}
      <div className="w-full flex overflow-x-auto gap-2 pb-2 mb-2 scrollbar-hide snap-x">
        {CINEMATIC_THEMES.map(theme => (
          <button 
            key={theme.id}
            onClick={() => setActiveThemeId(theme.id)}
            className={`snap-center shrink-0 px-3 py-1.5 rounded text-[10px] font-bold transition-all ${activeThemeId === theme.id ? 'bg-white text-black shadow-md scale-105' : 'bg-black/80 text-white/70 border border-white/20'}`}
          >
            {theme.name}
          </button>
        ))}
      </div>

      {/* Dice & Roll Section */}
      <div className="mb-3 text-center flex flex-col items-center relative z-20">
        <span className="text-[10px] text-white/90 mb-2 uppercase tracking-wider font-bold">
          {gameState.lastRolledBy ? `ROLLED BY: @${gameState.lastRolledBy}` : 'READY TO ROLL'}
        </span>
        
        <div className={`w-16 h-16 ${activeTheme.diceBg} rounded-xl flex items-center justify-center mb-3 border-2 relative overflow-hidden transition-all duration-500 ${isRolling ? 'animate-spin scale-110' : ''}`}>
          {renderDiceDots(displayFace)}
        </div>
        
        <button 
          onClick={rollDice}
          disabled={isRolling}
          className="px-6 py-2.5 bg-black border border-white/40 text-white text-xs font-bold rounded hover:bg-zinc-900 active:scale-95 transition-all disabled:opacity-50 uppercase shadow-lg"
        >
          {isRolling ? 'ROLLING...' : 'ROLL DICE 🎲'}
        </button>
      </div>

      {/* Board Visual */}
      <div className="w-full flex justify-center mt-1 pb-1 relative z-20">
        <LudoBoardVisual theme={activeTheme} />
      </div>

    </div>
  );
};

export default LudoGame;
