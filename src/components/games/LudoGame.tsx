import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { AppUser } from '../../types';

interface LudoGameProps {
  roomId: string;
  currentUser: AppUser | null;
}

interface TokenState {
  id: number;
  position: number; // -1: Base, 0-51: Main Track, 52-57: Home Stretch, 99: Finished
  isHome: boolean;
}

interface PlayerTokens {
  red: TokenState[];
  green: TokenState[];
  blue: TokenState[];
  yellow: TokenState[];
}

interface GameState {
  diceValue: number;
  lastRolledBy: string;
  turn: 'red' | 'green' | 'blue' | 'yellow';
  tokens: PlayerTokens;
  winner: string | null;
}

// ====================================================================================
// 🎬 ULTIMATE 2X EXPANDED CINEMATIC REALISTIC THEMES ARCHITECTURE (100% Realism)
// ====================================================================================
const CINEMATIC_THEMES = [
  { 
    id: 'egyptian', 
    name: '🏜️ Ancient Sandstone Vault', 
    bgWrap: 'from-amber-950 via-stone-950 to-black', 
    vignette: 'shadow-[inset_0_0_150px_rgba(0,0,0,0.99)]',
    boardStyle: 'border-yellow-700/90 bg-stone-950 shadow-[0_60px_120px_rgba(0,0,0,1),0_0_90px_rgba(180,130,30,0.6)]',
    diceBg: 'bg-gradient-to-br from-amber-600 via-yellow-700 to-stone-900 border-yellow-500 text-yellow-100 shadow-[0_30px_60px_rgba(0,0,0,0.98)]',
    effectName: 'Cinematic Sand Particles & Torch Illumination',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/ambiences/desert_wind.ogg',
    baseStyle: 'bg-stone-900 border-yellow-700 rounded-md shadow-[inset_0_0_60px_rgba(0,0,0,0.98)]',
    pathStyle: 'bg-stone-900/95 border-yellow-800/70',
    centerStyle: 'bg-gradient-to-br from-yellow-800 to-stone-950 shadow-[inset_0_0_50px_rgba(0,0,0,0.98)]',
    tileHighlight: 'bg-yellow-700 shadow-[inset_0_0_25px_rgba(0,0,0,0.95)]'
  },
  { 
    id: 'snow', 
    name: '❄️ Glacial Ice Monolith', 
    bgWrap: 'from-slate-950 via-blue-950 to-black', 
    vignette: 'shadow-[inset_0_0_150px_rgba(14,165,233,0.5)]',
    boardStyle: 'border-sky-400/90 bg-slate-950 shadow-[0_60px_120px_rgba(0,0,0,1),0_0_90px_rgba(56,189,248,0.7)]',
    diceBg: 'bg-gradient-to-br from-sky-200 via-slate-100 to-blue-600 border-sky-300 text-slate-950 shadow-[0_30px_60px_rgba(0,0,0,0.98)]',
    effectName: 'Glacial Frost & Heavy Blizzard Dynamics',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/weather/wind_heavy.ogg',
    baseStyle: 'bg-slate-900 border-sky-500 rounded-md shadow-[inset_0_0_60px_rgba(0,0,0,0.98)]',
    pathStyle: 'bg-slate-950/95 border-sky-600/60',
    centerStyle: 'bg-gradient-to-br from-sky-600 to-slate-950 shadow-[inset_0_0_50px_rgba(0,0,0,0.98)]',
    tileHighlight: 'bg-sky-600 shadow-[inset_0_0_25px_rgba(0,0,0,0.95)]'
  },
  { 
    id: 'underwater', 
    name: '🌊 Abyssal Trench', 
    bgWrap: 'from-cyan-950 via-slate-950 to-black', 
    vignette: 'shadow-[inset_0_0_150px_rgba(6,182,212,0.6)]',
    boardStyle: 'border-cyan-500/90 bg-slate-950 shadow-[0_60px_120px_rgba(0,0,0,1),0_0_90px_rgba(6,182,212,0.8)]',
    diceBg: 'bg-gradient-to-br from-cyan-500 via-blue-800 to-slate-950 border-cyan-300 text-cyan-100 shadow-[0_30px_60px_rgba(0,0,0,0.98)]',
    effectName: 'Deep Sea Hydro-Pressure & Trench Waves',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/water/waves_ocean_surfs.ogg',
    baseStyle: 'bg-slate-900 border-cyan-500 rounded-md shadow-[inset_0_0_60px_rgba(0,0,0,0.98)]',
    pathStyle: 'bg-slate-950/95 border-cyan-700/60',
    centerStyle: 'bg-gradient-to-br from-cyan-700 to-slate-950 shadow-[inset_0_0_50px_rgba(0,0,0,0.98)]',
    tileHighlight: 'bg-cyan-600 shadow-[inset_0_0_25px_rgba(0,0,0,0.95)]'
  },
  { 
    id: 'sky', 
    name: '☁️ Stratosphere Citadel', 
    bgWrap: 'from-indigo-950 via-slate-950 to-black', 
    vignette: 'shadow-[inset_0_0_150px_rgba(125,211,252,0.5)]',
    boardStyle: 'border-indigo-300/90 bg-slate-950 shadow-[0_60px_120px_rgba(0,0,0,1),0_0_90px_rgba(125,211,252,0.7)]',
    diceBg: 'bg-gradient-to-br from-indigo-200 via-sky-400 to-indigo-950 border-white text-indigo-950 shadow-[0_30px_60px_rgba(0,0,0,0.98)]',
    effectName: 'High Altitude Wind & Stratosphere Flow',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/weather/wind_gust.ogg',
    baseStyle: 'bg-slate-900 border-indigo-400 rounded-md shadow-[inset_0_0_60px_rgba(0,0,0,0.98)]',
    pathStyle: 'bg-slate-950/95 border-indigo-600/60',
    centerStyle: 'bg-gradient-to-br from-indigo-500 to-slate-950 shadow-[inset_0_0_50px_rgba(0,0,0,0.98)]',
    tileHighlight: 'bg-indigo-500 shadow-[inset_0_0_25px_rgba(0,0,0,0.95)]'
  },
  { 
    id: 'fire', 
    name: '🔥 Volcanic Obsidian Core', 
    bgWrap: 'from-red-950 via-stone-950 to-black', 
    vignette: 'shadow-[inset_0_0_150px_rgba(234,88,12,0.8)]',
    boardStyle: 'border-orange-600/90 bg-stone-950 shadow-[0_60px_120px_rgba(0,0,0,1),0_0_100px_rgba(234,88,12,1)]',
    diceBg: 'bg-gradient-to-br from-orange-500 via-red-700 to-black border-yellow-500 text-yellow-200 shadow-[0_30px_60px_rgba(0,0,0,0.98)] animate-pulse',
    effectName: 'Molten Magma Flow & Thermal Radiations',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/ambiences/fire_crackling.ogg',
    baseStyle: 'bg-stone-900 border-orange-600 rounded-md shadow-[inset_0_0_60px_rgba(0,0,0,0.98)]',
    pathStyle: 'bg-stone-950/95 border-orange-700/70',
    centerStyle: 'bg-gradient-to-br from-orange-700 to-stone-950 shadow-[inset_0_0_50px_rgba(0,0,0,0.98)]',
    tileHighlight: 'bg-orange-600 shadow-[inset_0_0_25px_rgba(0,0,0,0.95)]'
  },
  { 
    id: 'forest', 
    name: '🌳 Primeval Jungle Ruin', 
    bgWrap: 'from-emerald-950 via-stone-950 to-black', 
    vignette: 'shadow-[inset_0_0_150px_rgba(16,185,129,0.5)]',
    boardStyle: 'border-emerald-600/90 bg-stone-950 shadow-[0_60px_120px_rgba(0,0,0,1),0_0_90px_rgba(16,185,129,0.8)]',
    diceBg: 'bg-gradient-to-br from-emerald-500 via-green-800 to-stone-950 border-emerald-300 text-emerald-100 shadow-[0_30px_60px_rgba(0,0,0,0.98)]',
    effectName: 'Dense Canopy Shadows & Rainforest Atmosphere',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/ambiences/outdoor_rain_forest.ogg',
    baseStyle: 'bg-stone-900 border-emerald-600 rounded-md shadow-[inset_0_0_60px_rgba(0,0,0,0.98)]',
    pathStyle: 'bg-stone-950/95 border-emerald-700/60',
    centerStyle: 'bg-gradient-to-br from-emerald-700 to-stone-950 shadow-[inset_0_0_50px_rgba(0,0,0,0.98)]',
    tileHighlight: 'bg-emerald-600 shadow-[inset_0_0_25px_rgba(0,0,0,0.95)]'
  },
  { 
    id: 'horror', name: '🧛 Gothic Blood Crypt', 
    bgWrap: 'from-zinc-950 via-red-950/95 to-black', 
    vignette: 'shadow-[inset_0_0_160px_rgba(153,27,27,1)]',
    boardStyle: 'border-red-800 bg-zinc-950 shadow-[0_60px_120px_rgba(0,0,0,1),0_0_100px_rgba(185,28,28,1)]',
    diceBg: 'bg-gradient-to-br from-zinc-900 via-red-950 to-black border-red-600 text-red-500 shadow-[0_30px_60px_rgba(0,0,0,0.98)]',
    effectName: 'Darkness Fog, Gothic Stone & Creepy Winds',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/ambiences/creepy_wind.ogg',
    baseStyle: 'bg-zinc-900 border-red-800 rounded-md shadow-[inset_0_0_60px_rgba(0,0,0,0.98)]',
    pathStyle: 'bg-zinc-950/95 border-red-900/70',
    centerStyle: 'bg-gradient-to-br from-red-950 to-black shadow-[inset_0_0_50px_rgba(0,0,0,0.98)]',
    tileHighlight: 'bg-red-800 shadow-[inset_0_0_25px_rgba(0,0,0,0.95)]'
  }
];

const initialTokensState: PlayerTokens = {
  red: [{id: 1, position: -1, isHome: true}, {id: 2, position: -1, isHome: true}, {id: 3, position: -1, isHome: true}, {id: 4, position: -1, isHome: true}],
  green: [{id: 1, position: -1, isHome: true}, {id: 2, position: -1, isHome: true}, {id: 3, position: -1, isHome: true}, {id: 4, position: -1, isHome: true}],
  blue: [{id: 1, position: -1, isHome: true}, {id: 2, position: -1, isHome: true}, {id: 3, position: -1, isHome: true}, {id: 4, position: -1, isHome: true}],
  yellow: [{id: 1, position: -1, isHome: true}, {id: 2, position: -1, isHome: true}, {id: 3, position: -1, isHome: true}, {id: 4, position: -1, isHome: true}]
};

const renderCells = (count: number, renderFn: (index: number) => React.ReactNode) => {
  return Array.from({ length: count }).map((_, i) => renderFn(i));
};

const Token = ({ colorClass, onClick }: { colorClass: string, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={`w-[80%] h-[80%] rounded-full ${colorClass} shadow-[0_12px_18px_rgba(0,0,0,1),inset_0_-6px_8px_rgba(0,0,0,0.95),inset_0_6px_8px_rgba(255,255,255,0.95)] border-2 border-black transform hover:scale-110 transition-transform cursor-pointer relative`}
  ></div>
);

const Base = ({ outerClass, tokenColor, tokens, playerColor, onTokenClick }: {outerClass: string, tokenColor: string, tokens: TokenState[], playerColor: keyof PlayerTokens, onTokenClick?: (player: keyof PlayerTokens, tokenId: number) => void}) => (
  <div className={`p-3.5 sm:p-4.5 flex items-center justify-center ${outerClass} relative border-[3.5px] border-black overflow-hidden`}>
    <div className="w-full h-full bg-black/90 backdrop-blur-xl rounded-sm p-3 grid grid-cols-2 gap-3 shadow-[inset_0_15px_30px_rgba(0,0,0,1)] border border-white/20 relative z-10">
      {tokens.map((token) => (
        <div key={token.id} className="rounded-full bg-black shadow-[inset_0_15px_30px_rgba(0,0,0,1)] border border-white/30 flex items-center justify-center relative overflow-hidden">
           <Token colorClass={tokenColor} onClick={() => onTokenClick && onTokenClick(playerColor, token.id)} />
        </div>
      ))}
    </div>
  </div>
);

const Tile = ({ colorClass, hasStar }: {colorClass: string, hasStar: boolean}) => (
  <div className={`relative border-[1px] border-black shadow-[inset_0_3px_8px_rgba(255,255,255,0.35),inset_0_-3px_8px_rgba(0,0,0,0.98)] ${colorClass} flex items-center justify-center overflow-hidden`}>
    {hasStar && <span className="text-white text-[13px] drop-shadow-[0_2px_8px_rgba(0,0,0,1)] font-black">✦</span>}
  </div>
);

const LudoBoardVisual = ({ theme, gameState, onTokenClick }: { theme: any, gameState: GameState, onTokenClick: (player: keyof PlayerTokens, tokenId: number) => void }) => {
  return (
    <div className={`w-full max-w-[360px] aspect-square p-4 rounded-2xl border-[8px] ${theme.boardStyle} relative select-none overflow-hidden transition-all duration-700`}>
      
      <div className="absolute inset-0 bg-gradient-to-tr from-black/95 via-transparent to-white/10 pointer-events-none z-30"></div>

      <div className={`w-full h-full ${theme.baseStyle} border-[3px] border-black grid grid-cols-[6fr_3fr_6fr] grid-rows-[6fr_3fr_6fr] gap-0 overflow-hidden relative z-10 transition-all duration-700`}>
        
        {/* Red Base */}
        <Base outerClass="bg-red-950" tokenColor="bg-red-600" tokens={gameState.tokens.red} playerColor="red" onTokenClick={onTokenClick} />
        
        <div className={`grid grid-cols-3 grid-rows-6 ${theme.pathStyle} z-0 relative transition-all duration-500`}>
          {renderCells(18, (i) => {
            const isHomeStretch = [4,7,10,13,16].includes(i);
            const isStart = i === 5;
            const isStar = i === 6;
            let colorClass = theme.pathStyle; 
            if (isHomeStretch || isStart) colorClass = `${theme.tileHighlight} shadow-[inset_0_0_20px_rgba(0,0,0,0.98)]`; 
            return <Tile key={`t-${i}`} colorClass={colorClass} hasStar={isStar} />
          })}
        </div>

        {/* Green Base */}
        <Base outerClass="bg-emerald-950" tokenColor="bg-emerald-600" tokens={gameState.tokens.green} playerColor="green" onTokenClick={onTokenClick} />

        {/* Path Left */}
        <div className={`grid grid-cols-6 grid-rows-3 ${theme.pathStyle} z-0 relative transition-all duration-500`}>
          {renderCells(18, (i) => {
            const isHomeStretch = [7,8,9,10,11].includes(i);
            const isStart = i === 1;
            const isStar = i === 13;
            let colorClass = theme.pathStyle;
            if (isHomeStretch || isStart) colorClass = `${theme.tileHighlight} shadow-[inset_0_0_20px_rgba(0,0,0,0.98)]`;
            return <Tile key={`l-${i}`} colorClass={colorClass} hasStar={isStar} />
          })}
        </div>
        
        {/* Center Home */}
        <div className={`relative border-[3px] border-black ${theme.centerStyle} overflow-hidden z-10 flex items-center justify-center transition-all duration-700`}>
          <div className="absolute inset-0 bg-black/60"></div>
          <svg viewBox="0 0 100 100" className="w-[100%] h-[100%] opacity-95 drop-shadow-[0_12px_24px_rgba(0,0,0,1)]">
            <polygon points="0,0 100,0 50,50" fill="#047857" stroke="#000" strokeWidth="4"/>
            <polygon points="100,0 100,100 50,50" fill="#d97706" stroke="#000" strokeWidth="4"/>
            <polygon points="0,100 100,100 50,50" fill="#1d4ed8" stroke="#000" strokeWidth="4"/>
            <polygon points="0,0 0,100 50,50" fill="#b91c1c" stroke="#000" strokeWidth="4"/>
          </svg>
        </div>

        {/* Path Right */}
        <div className={`grid grid-cols-6 grid-rows-3 ${theme.pathStyle} z-0 relative transition-all duration-500`}>
          {renderCells(18, (i) => {
            const isHomeStretch = [6,7,8,9,10].includes(i);
            const isStart = i === 16;
            const isStar = i === 4;
            let colorClass = theme.pathStyle;
            if (isHomeStretch || isStart) colorClass = `${theme.tileHighlight} shadow-[inset_0_0_20px_rgba(0,0,0,0.98)]`;
            return <Tile key={`r-${i}`} colorClass={colorClass} hasStar={isStar} />
          })}
        </div>

        {/* Blue Base */}
        <Base outerClass="bg-blue-950" tokenColor="bg-blue-600" tokens={gameState.tokens.blue} playerColor="blue" onTokenClick={onTokenClick} />

        <div className={`grid grid-cols-3 grid-rows-6 ${theme.pathStyle} z-0 relative transition-all duration-500`}>
          {renderCells(18, (i) => {
            const isHomeStretch = [1,4,7,10,13].includes(i);
            const isStart = i === 12;
            const isStar = i === 11;
            let colorClass = theme.pathStyle;
            if (isHomeStretch || isStart) colorClass = `${theme.tileHighlight} shadow-[inset_0_0_20px_rgba(0,0,0,0.98)]`;
            return <Tile key={`b-${i}`} colorClass={colorClass} hasStar={isStar} />
          })}
        </div>

        {/* Yellow Base */}
        <Base outerClass="bg-amber-950" tokenColor="bg-amber-600" tokens={gameState.tokens.yellow} playerColor="yellow" onTokenClick={onTokenClick} />
      </div>
    </div>
  );
};

const LudoGame: React.FC<LudoGameProps> = ({ roomId, currentUser }) => {
  const [gameState, setGameState] = useState<GameState>({
    diceValue: 1,
    lastRolledBy: '',
    turn: 'red',
    tokens: initialTokensState,
    winner: null
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
          await setDoc(gameDocRef, { diceValue: 1, lastRolledBy: '', turn: 'red', tokens: initialTokensState, winner: null });
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
      audio.volume = 0.4;
      audio.play().catch(e => console.log("Ambient audio blocked:", e));
      ambientAudioRef.current = audio;
    }
    return () => {
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
        ambientAudioRef.current = null;
      }
    };
  }, [activeThemeId, isSoundOn]);

  const playSfx = (type: 'dice' | 'move' | 'win') => {
    if (!isSoundOn) return;
    try {
      let url = 'https://actions.google.com/sounds/v1/foley/rolling_dice_on_table.ogg';
      if (type === 'move') url = 'https://actions.google.com/sounds/v1/foley/wood_click.ogg';
      if (type === 'win') url = 'https://actions.google.com/sounds/v1/cartoon/trumpet_fanfare.ogg';
      
      const sound = new Audio(url);
      sound.volume = 0.9;
      sound.play().catch(e => console.log("SFX error:", e));
    } catch (e) {
      console.log("Audio exception", e);
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRolling) {
      interval = setInterval(() => {
        setDisplayFace(Math.floor(Math.random() * 6) + 1);
      }, 35);
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
      await setDoc(gameDocRef, { diceValue: randomNum, lastRolledBy: currentUser.username, turn: gameState.turn, tokens: gameState.tokens, winner: null });
    }
    
    setTimeout(() => {
      setIsRolling(false);
      if (randomNum === 6) {
        playSfx('win');
      }
    }, 1200);
  };

  // Comprehensive Token Movement Logic (Moving tokens on track according to dice)
  const handleTokenClick = async (playerColor: keyof PlayerTokens, tokenId: number) => {
    if (!currentUser || !roomId) return;
    playSfx('move');

    const updatedTokens = { ...gameState.tokens };
    const tokenList = updatedTokens[playerColor];
    const tokenIndex = tokenList.findIndex(t => t.id === tokenId);
    
    if (tokenIndex === -1) return;
    const token = tokenList[tokenIndex];

    // If in base (-1) and rolled 6, bring it out to start position (0)
    if (token.position === -1) {
      if (gameState.diceValue === 6) {
        token.position = 0;
        token.isHome = false;
      }
    } else {
      // Advance token position based on dice value
      token.position += gameState.diceValue;
      if (token.position >= 56) {
        token.position = 99; // Reached goal / finished
      }
    }

    const gameDocRef = doc(db, 'voice_rooms', roomId, 'games', 'ludo');
    try {
      await updateDoc(gameDocRef, { 
        tokens: updatedTokens,
        turn: gameState.diceValue === 6 ? gameState.turn : getNextTurn(gameState.turn)
      });
    } catch (e) {
      console.log("Token movement sync error:", e);
    }
  };

  const getNextTurn = (currentTurn: string): 'red' | 'green' | 'blue' | 'yellow' => {
    if (currentTurn === 'red') return 'green';
    if (currentTurn === 'green') return 'blue';
    if (currentTurn === 'blue') return 'yellow';
    return 'red';
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
      <div className={`grid grid-cols-3 grid-rows-3 gap-1.5 w-full h-full p-2.5 relative z-10 transition-all duration-200 ${isRolling ? 'opacity-0 scale-20 blur-3xl' : 'opacity-100 scale-100 blur-0'}`}>
        {[0,1,2,3,4,5,6,7,8].map(i => (
          <div key={i} className="flex items-center justify-center">
            {activeDots.includes(i) && (
              <div className="w-4 h-4 bg-white rounded-full shadow-[inset_0_-2px_4px_rgba(0,0,0,0.98),0_3px_8px_rgba(0,0,0,1)]">
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`flex flex-col items-center justify-center p-4 bg-gradient-to-br ${activeTheme.bgWrap} rounded-3xl w-full border-[3.5px] border-white/30 ${activeTheme.vignette} relative overflow-hidden transition-colors duration-700`}>
      
      {/* Top Header with Sound Control & Turn Indicator */}
      <div className="w-full flex items-center justify-between pb-2.5 px-1 mb-1 border-b border-white/10">
        <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest drop-shadow">
          TURN: {gameState.turn.toUpperCase()}
        </span>
        <button
          onClick={() => setIsSoundOn(!isSoundOn)}
          className={`px-4 py-1.5 rounded-md text-[10px] font-black tracking-wider transition-all border ${
            isSoundOn 
              ? 'bg-emerald-700 text-white border-emerald-400 shadow-[0_0_15px_#10b981]' 
              : 'bg-rose-950 text-rose-300 border-rose-600/60'
          }`}
        >
          {isSoundOn ? '🔊 SOUND ON' : '🔇 SOUND OFF'}
        </button>
      </div>

      {/* Cinematic Theme Selector Bar */}
      <div className="w-full flex overflow-x-auto gap-2.5 pb-3 mb-2 scrollbar-hide snap-x">
        {CINEMATIC_THEMES.map(theme => (
          <button 
            key={theme.id}
            onClick={() => setActiveThemeId(theme.id)}
            className={`snap-center shrink-0 px-4.5 py-2 rounded-md text-[11px] font-black tracking-wider transition-all ${activeThemeId === theme.id ? 'bg-white text-black shadow-[0_0_25px_#fff] scale-105' : 'bg-black/90 text-white/70 border border-white/20 hover:bg-black'}`}
          >
            {theme.name}
          </button>
        ))}
      </div>

      <div className="mb-4 text-center flex flex-col items-center relative z-20">
        <span className="text-[11px] text-white/95 mb-3 uppercase tracking-widest font-black drop-shadow-[0_2px_6px_rgba(0,0,0,1)]">
          {gameState.lastRolledBy ? `ROLLED BY: @${gameState.lastRolledBy}` : 'ENTER THE REALISTIC REALM'}
        </span>
        
        {/* High Fidelity Dice Container */}
        <div className={`w-20 h-20 ${activeTheme.diceBg} rounded-2xl flex items-center justify-center mb-4 border-[3px] relative overflow-hidden transform transition-all duration-500 ${isRolling ? 'animate-spin scale-110' : ''}`}>
          {renderDiceDots(displayFace)}
        </div>
        
        <button 
          onClick={rollDice}
          disabled={isRolling}
          className={`px-8 py-3.5 bg-black border border-white/40 text-white text-xs font-black tracking-widest rounded-md hover:bg-zinc-900 active:scale-95 transition-all disabled:opacity-50 uppercase shadow-[0_15px_35px_rgba(0,0,0,1)]`}
        >
          {isRolling ? 'ROLLING...' : 'ROLL DICE 🎲'}
        </button>
      </div>

      {/* Structured Realistically Detailed Board with Real Token Sync */}
      <div className="w-full flex justify-center mt-2 pb-2 relative z-20 drop-shadow-[0_35px_60px_rgba(0,0,0,1)]">
        <LudoBoardVisual theme={activeTheme} gameState={gameState} onTokenClick={handleTokenMove} />
      </div>

    </div>
  );
};

export default LudoGame;
