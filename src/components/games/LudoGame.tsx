/**
 * ====================================================================================
 * NOISE / THE DIGITALIGHT - ULTIMATE LUDO ENGINE (SLOT AVATARS & PROFILES INTEGRATED)
 * ====================================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import {
  doc,
  onSnapshot,
  setDoc,
  runTransaction,
} from 'firebase/firestore';
import { AppUser } from '../../types';

interface LudoGameProps {
  roomId: string;
  currentUser: AppUser | null;
}

export type PlayerColor = 'red' | 'green' | 'blue' | 'yellow';

export interface TokenState {
  id: number;
  position: number; // -1: Base, 0-51: Main Track, 52-56: Home Stretch, 57: Finished Goal
  isHome: boolean;
}

export interface PlayerTokens {
  red: TokenState[];
  green: TokenState[];
  blue: TokenState[];
  yellow: TokenState[];
}

export interface PlayerSlot {
  username: string;
  avatar?: string;
}

export interface PlayersMap {
  red: PlayerSlot | null;
  green: PlayerSlot | null;
  blue: PlayerSlot | null;
  yellow: PlayerSlot | null;
}

interface GameState {
  diceValue: number;
  lastRolledBy: string;
  turn: PlayerColor;
  tokens: PlayerTokens;
  players: PlayersMap;
  consecutiveSixes: number;
  winner: string | null;
  turnTimer: number;
  hasRolled: boolean;
  turnStartedAt: number;
  revision: number;
}

const initialTokensState: PlayerTokens = {
  red: [{id: 1, position: -1, isHome: true}, {id: 2, position: -1, isHome: true}, {id: 3, position: -1, isHome: true}, {id: 4, position: -1, isHome: true}],
  green: [{id: 1, position: -1, isHome: true}, {id: 2, position: -1, isHome: true}, {id: 3, position: -1, isHome: true}, {id: 4, position: -1, isHome: true}],
  blue: [{id: 1, position: -1, isHome: true}, {id: 2, position: -1, isHome: true}, {id: 3, position: -1, isHome: true}, {id: 4, position: -1, isHome: true}],
  yellow: [{id: 1, position: -1, isHome: true}, {id: 2, position: -1, isHome: true}, {id: 3, position: -1, isHome: true}, {id: 4, position: -1, isHome: true}]
};

const initialPlayersState: PlayersMap = {
  red: null,
  green: null,
  blue: null,
  yellow: null
};

const COLORS: PlayerColor[] = [
  'red',
  'green',
  'blue',
  'yellow',
];

const START_OFFSETS: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  blue: 26,
  yellow: 39,
};

const getGlobalPosition = (
  color: PlayerColor,
  position: number,
): number => {
  if (position < 0 || position > 51) return -1;
  return (START_OFFSETS[color] + position) % 52;
};

const getNextTurn = (
  color: PlayerColor,
): PlayerColor => {
  return COLORS[
    (COLORS.indexOf(color) + 1) % COLORS.length
  ];
};

const canMoveToken = (
  token: TokenState,
  dice: number,
): boolean => {
  if (token.position === -1) return dice === 6;
  if (token.position === 57) return false;
  return token.position + dice <= 57;
};

const hasValidMove = (
  tokens: PlayerTokens,
  color: PlayerColor,
  dice: number,
): boolean => {
  return tokens[color].some(token =>
    canMoveToken(token, dice)
  );
};

const createInitialTokens = (): PlayerTokens =>
  JSON.parse(JSON.stringify(initialTokensState));

const SAFE_GLOBAL_POSITIONS = [0, 8, 13, 21, 26, 34, 39, 47];

const CINEMATIC_THEMES = [
  { 
    id: 'egyptian', name: '🏜️ Pyramid', 
    bgWrap: 'from-amber-950 via-stone-950 to-black', 
    boardStyle: 'border-yellow-600/90 bg-stone-950 shadow-[0_20px_50px_rgba(180,130,30,0.3)]',
    diceBg: 'bg-gradient-to-br from-amber-500 via-yellow-600 to-stone-900 text-amber-100',
    effectName: 'Ancient Sand Storm',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/ambiences/desert_wind.ogg'
  },
  { 
    id: 'snow', name: '❄️ Snow', 
    bgWrap: 'from-slate-950 via-blue-950 to-black', 
    boardStyle: 'border-sky-400/90 bg-slate-950 shadow-[0_20px_50px_rgba(56,189,248,0.3)]',
    diceBg: 'bg-gradient-to-br from-sky-200 via-slate-100 to-blue-700 text-slate-950',
    effectName: 'Blizzard Ice Storm',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/weather/wind_heavy.ogg'
  },
  { 
    id: 'underwater', name: '🌊 Ocean', 
    bgWrap: 'from-cyan-950 via-slate-950 to-black', 
    boardStyle: 'border-cyan-500/90 bg-slate-950 shadow-[0_20px_50px_rgba(6,182,212,0.3)]',
    diceBg: 'bg-gradient-to-br from-cyan-400 via-blue-800 to-slate-950 text-cyan-50',
    effectName: 'Deep Sea Currents',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/water/waves_ocean_surfs.ogg'
  },
  { 
    id: 'sky', name: '☁️ Sky', 
    bgWrap: 'from-indigo-950 via-slate-950 to-black', 
    boardStyle: 'border-indigo-300/90 bg-slate-950 shadow-[0_20px_50px_rgba(125,211,252,0.3)]',
    diceBg: 'bg-gradient-to-br from-indigo-200 via-sky-400 to-indigo-950 text-indigo-950',
    effectName: 'Stratosphere Wind',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/weather/wind_gust.ogg'
  },
  { 
    id: 'fire', name: '🔥 Fire', 
    bgWrap: 'from-red-950 via-stone-950 to-black', 
    boardStyle: 'border-orange-500/90 bg-stone-950 shadow-[0_20px_50px_rgba(249,115,22,0.4)]',
    diceBg: 'bg-gradient-to-br from-orange-500 via-red-700 to-black text-yellow-100 animate-pulse',
    effectName: 'Volcanic Magma',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/ambiences/fire_crackling.ogg'
  },
  { 
    id: 'forest', name: '🌳 Forest', 
    bgWrap: 'from-emerald-950 via-stone-950 to-black', 
    boardStyle: 'border-emerald-500/90 bg-stone-950 shadow-[0_20px_50px_rgba(16,185,129,0.3)]',
    diceBg: 'bg-gradient-to-br from-emerald-500 via-green-800 to-stone-950 text-emerald-50',
    effectName: 'Deep Jungle Canopy',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/ambiences/outdoor_rain_forest.ogg'
  },
  { 
    id: 'horror', name: '🧛 Horror', 
    bgWrap: 'from-zinc-950 via-red-950/90 to-black', 
    boardStyle: 'border-red-800/90 bg-zinc-950 shadow-[0_20px_50px_rgba(239,68,68,0.4)]',
    diceBg: 'bg-gradient-to-br from-zinc-900 via-red-950 to-black text-red-500',
    effectName: 'Spooky Blood Crypt',
    ambientSoundUrl: 'https://actions.google.com/sounds/v1/ambiences/creepy_wind.ogg'
  }
];

const renderCells = (count: number, renderFn: (index: number) => React.ReactNode) => {
  return Array.from({ length: count }).map((_, i) => renderFn(i));
};

const Token = ({ colorClass, tokenId, onClick }: { colorClass: string, tokenId: number, onClick?: () => void }) => (
  <div 
    onClick={onClick} 
    className={`w-6 h-6 cursor-pointer transform hover:scale-125 transition-all flex items-center justify-center relative drop-shadow-[0_4px_6px_rgba(0,0,0,0.9)] z-20`}
    title={`Token ${tokenId}`}
  >
    <svg viewBox="0 0 24 24" className={`w-full h-full ${colorClass} filter drop-shadow`}>
      <path 
        d="M12 2C10.34 2 9 3.34 9 5C9 5.74 9.27 6.42 9.72 6.95C7.52 7.76 6 9.87 6 12.3C6 14.12 6.92 15.69 8.32 16.59C7.5 18.1 7 19.98 7 22H17C17 19.98 16.5 18.1 15.68 16.59C17.08 15.69 18 14.12 18 12.3C18 9.87 16.48 7.76 14.28 6.95C14.73 6.42 15 5.74 15 5C15 3.34 13.66 2 12 2Z" 
        stroke="#ffffff" 
        strokeWidth="1.5" 
        fill="currentColor"
      />
    </svg>
    <span className="absolute text-[8px] font-black text-white top-1.5 drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">{tokenId}</span>
  </div>
);

const Base = ({ outerClass, tokenColor, tokens, playerColor, onTokenClick }: { outerClass: string, tokenColor: string, tokens: TokenState[], playerColor: PlayerColor, onTokenClick: (p: PlayerColor, id: number) => void }) => {
  const safeTokens = tokens || createInitialTokens()[playerColor];
  return (
    <div className={`p-3 flex items-center justify-center ${outerClass} relative border-[3px] border-black overflow-hidden shadow-inner`}>
      <div className="w-full h-full bg-black/90 rounded-md p-2.5 grid grid-cols-2 gap-2.5 border border-white/25 shadow-[inset_0_8px_16px_rgba(0,0,0,1)]">
        {safeTokens.map(token => (
          <div key={token.id} className="rounded-full bg-gradient-to-b from-stone-900 to-black flex items-center justify-center border border-white/30 shadow-[inset_0_4px_8px_rgba(0,0,0,1)] relative overflow-hidden">
             {token.position === -1 && (
               <Token colorClass={tokenColor} tokenId={token.id} onClick={() => onTokenClick(playerColor, token.id)} />
             )}
          </div>
        ))}
      </div>
    </div>
  );
};

const Tile = ({ colorClass, hasStar, tokensOnTile, onTokenClick }: { colorClass: string, hasStar: boolean, tokensOnTile?: {player: PlayerColor, id: number}[], onTokenClick: (p: PlayerColor, id: number) => void }) => {
  const colorMap: Record<PlayerColor, string> = {
    red: 'text-red-500 fill-red-600',
    green: 'text-emerald-400 fill-emerald-500',
    blue: 'text-blue-500 fill-blue-600',
    yellow: 'text-amber-400 fill-amber-500'
  };

  return (
    <div className={`relative border-[1px] border-black/80 ${colorClass} flex items-center justify-center overflow-hidden shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)]`}>
      {hasStar && (
        <span className="text-yellow-300 text-[11px] font-black absolute z-0 drop-shadow-[0_1px_3px_rgba(0,0,0,1)] animate-pulse">
          ★
        </span>
      )}
      <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-0.5 z-10 p-0.5">
        {tokensOnTile && tokensOnTile.map(t => (
          <div key={`${t.player}-${t.id}`} className="w-5 h-5 flex items-center justify-center">
            <Token colorClass={colorMap[t.player]} tokenId={t.id} onClick={() => onTokenClick(t.player, t.id)} />
          </div>
        ))}
      </div>
    </div>
  );
};

const LudoBoardVisual = ({ theme, gameState, onTokenClick }: { theme: any, gameState: GameState, onTokenClick: (p: PlayerColor, id: number) => void }) => {
  const tokens = gameState?.tokens || createInitialTokens();
  const players = gameState?.players || initialPlayersState;

  const getTokensOnTrackIndex = (tileIndex: number) => {
    const result: {player: PlayerColor, id: number}[] = [];
    COLORS.forEach(color => {
      if (tokens[color]) {
        tokens[color].forEach(token => {
          const globalPos = getGlobalPosition(color, token.position);
          if (globalPos === tileIndex) {
            result.push({ player: color, id: token.id });
          }
        });
      }
    });
    return result;
  };

  const renderPlayerCard = (color: PlayerColor) => {
    const player = players[color];
    const isCurrentTurn = gameState.turn === color && !gameState.winner;

    const borderColorMap: Record<PlayerColor, string> = {
      red: 'border-red-500',
      green: 'border-emerald-500',
      blue: 'border-blue-500',
      yellow: 'border-amber-400'
    };

    return (
      <div className={`flex items-center gap-1.5 p-1.5 rounded-xl bg-black/80 border-2 ${isCurrentTurn ? 'border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.8)] animate-pulse' : borderColorMap[color]} backdrop-blur-sm max-w-[130px]`}>
        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/40 shrink-0 bg-zinc-800 flex items-center justify-center">
          {player?.avatar ? (
            <img src={player.avatar} alt={player.username} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] font-black text-white">{player ? player.username.charAt(0).toUpperCase() : color.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-[9px] font-black text-white truncate">{player ? player.username : `${color} (Empty)`}</span>
          <span className="text-[7px] text-amber-300 font-bold uppercase">{isCurrentTurn ? 'Playing...' : player ? 'Joined' : 'Open Slot'}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div className="w-full flex justify-between px-2">
        {renderPlayerCard('red')}
        {renderPlayerCard('green')}
      </div>

      <div className={`w-full max-w-[340px] aspect-square p-3 rounded-2xl border-[5px] ${theme.boardStyle} relative select-none overflow-hidden backdrop-blur-md`}>
        <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-transparent to-white/10 pointer-events-none z-30"></div>

        <div className="w-full h-full border-[3px] border-black grid grid-cols-[6fr_3fr_6fr] grid-rows-[6fr_3fr_6fr] overflow-hidden bg-stone-950 relative z-10 shadow-[0_25px_50px_rgba(0,0,0,1)]">
          
          {/* Red Base */}
          <Base outerClass="bg-red-950" tokenColor="text-red-500 fill-red-600" tokens={tokens.red} playerColor="red" onTokenClick={onTokenClick} />
          
          {/* Top Track (Green section) */}
          <div className="grid grid-cols-3 grid-rows-6 bg-stone-900">
            {renderCells(18, (i) => {
              const isHomeStretch = [4,7,10,13,16].includes(i);
              const isStart = i === 5;
              let colorClass = "bg-stone-900/90"; 
              if (isHomeStretch || isStart) colorClass = "bg-gradient-to-b from-emerald-600 to-emerald-800"; 
              
              const trackIdx = i < 6 ? i + 12 : i; 
              const tokensHere = getTokensOnTrackIndex(trackIdx >= 52 ? trackIdx % 52 : trackIdx);
              const isStarTile = SAFE_GLOBAL_POSITIONS.includes(trackIdx);

              return <Tile key={`t-${i}`} colorClass={colorClass} hasStar={isStarTile} tokensOnTile={tokensHere} onTokenClick={onTokenClick} />
            })}
          </div>

          {/* Green Base */}
          <Base outerClass="bg-emerald-950" tokenColor="text-emerald-400 fill-emerald-500" tokens={tokens.green} playerColor="green" onTokenClick={onTokenClick} />

          {/* Left Track (Red section) */}
          <div className="grid grid-cols-6 grid-rows-3 bg-stone-900">
            {renderCells(18, (i) => {
              const isHomeStretch = [7,8,9,10,11].includes(i);
              const isStart = i === 1;
              let colorClass = "bg-stone-900/90";
              if (isHomeStretch || isStart) colorClass = "bg-gradient-to-r from-red-600 to-red-800";
              
              const trackIdx = i + 18;
              const tokensHere = getTokensOnTrackIndex(trackIdx >= 52 ? trackIdx % 52 : trackIdx);
              const isStarTile = SAFE_GLOBAL_POSITIONS.includes(trackIdx);

              return <Tile key={`l-${i}`} colorClass={colorClass} hasStar={isStarTile} tokensOnTile={tokensHere} onTokenClick={onTokenClick} />
            })}
          </div>
          
          {/* Center Home */}
          <div className="relative border-[2.5px] border-black bg-black flex items-center justify-center shadow-[inset_0_0_25px_rgba(0,0,0,1)]">
            <svg viewBox="0 0 100 100" className="w-full h-full opacity-95 drop-shadow-[0_8px_16px_rgba(0,0,0,1)]">
              <polygon points="0,0 100,0 50,50" fill="#059669" stroke="#000" strokeWidth="2.5"/>
              <polygon points="100,0 100,100 50,50" fill="#d97706" stroke="#000" strokeWidth="2.5"/>
              <polygon points="0,100 100,100 50,50" fill="#2563eb" stroke="#000" strokeWidth="2.5"/>
              <polygon points="0,0 0,100 50,50" fill="#dc2626" stroke="#000" strokeWidth="2.5"/>
            </svg>
          </div>

          {/* Right Track (Yellow section) */}
          <div className="grid grid-cols-6 grid-rows-3 bg-stone-900">
            {renderCells(18, (i) => {
              const isHomeStretch = [6,7,8,9,10].includes(i);
              const isStart = i === 16;
              let colorClass = "bg-stone-900/90";
              if (isHomeStretch || isStart) colorClass = "bg-gradient-to-r from-amber-500 to-amber-700";
              
              const trackIdx = i + 36;
              const tokensHere = getTokensOnTrackIndex(trackIdx >= 52 ? trackIdx % 52 : trackIdx);
              const isStarTile = SAFE_GLOBAL_POSITIONS.includes(trackIdx);

              return <Tile key={`r-${i}`} colorClass={colorClass} hasStar={isStarTile} tokensOnTile={tokensHere} onTokenClick={onTokenClick} />
            })}
          </div>

          {/* Blue Base */}
          <Base outerClass="bg-blue-950" tokenColor="text-blue-500 fill-blue-600" tokens={tokens.blue} playerColor="blue" onTokenClick={onTokenClick} />

          {/* Bottom Track (Blue section) */}
          <div className="grid grid-cols-3 grid-rows-6 bg-stone-900">
            {renderCells(18, (i) => {
              const isHomeStretch = [1,4,7,10,13].includes(i);
              const isStart = i === 12;
              let colorClass = "bg-stone-900/90";
              if (isHomeStretch || isStart) colorClass = "bg-gradient-to-b from-blue-600 to-blue-800";
              
              const trackIdx = i + 54;
              const tokensHere = getTokensOnTrackIndex(trackIdx >= 52 ? trackIdx % 52 : trackIdx);
              const isStarTile = SAFE_GLOBAL_POSITIONS.includes(trackIdx);

              return <Tile key={`b-${i}`} colorClass={colorClass} hasStar={isStarTile} tokensOnTile={tokensHere} onTokenClick={onTokenClick} />
            })}
          </div>

          {/* Yellow Base */}
          <Base outerClass="bg-amber-950" tokenColor="text-amber-400 fill-amber-500" tokens={tokens.yellow} playerColor="yellow" onTokenClick={onTokenClick} />
        </div>
      </div>

      <div className="w-full flex justify-between px-2">
        {renderPlayerCard('blue')}
        {renderPlayerCard('yellow')}
      </div>
    </div>
  );
};

const LudoGame: React.FC<LudoGameProps> = ({ roomId, currentUser }) => {
  const [gameState, setGameState] = useState<GameState>({
    diceValue: 1,
    lastRolledBy: '',
    turn: 'red',
    tokens: createInitialTokens(),
    players: initialPlayersState,
    consecutiveSixes: 0,
    winner: null,
    turnTimer: 15,
    hasRolled: false,
    turnStartedAt: Date.now(),
    revision: 0
  });
  const [isRolling, setIsRolling] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState('egyptian');
  const [displayFace, setDisplayFace] = useState(1);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [displayTimer, setDisplayTimer] = useState(15);

  const activeTheme = CINEMATIC_THEMES.find(t => t.id === activeThemeId) || CINEMATIC_THEMES[0];
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!roomId || !db) return;
    const gameDocRef = doc(db, 'voice_rooms', roomId, 'games', 'ludo');
    const unsubscribe = onSnapshot(gameDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as GameState;
        setGameState({
          diceValue: data.diceValue || 1,
          lastRolledBy: data.lastRolledBy || '',
          turn: data.turn || 'red',
          tokens: data.tokens || createInitialTokens(),
          players: data.players || initialPlayersState,
          consecutiveSixes: data.consecutiveSixes || 0,
          winner: data.winner || null,
          turnTimer: data.turnTimer !== undefined ? data.turnTimer : 15,
          hasRolled: data.hasRolled || false,
          turnStartedAt: data.turnStartedAt || Date.now(),
          revision: data.revision !== undefined ? data.revision : 0
        });
      } else {
        setDoc(gameDocRef, { 
          diceValue: 1, 
          lastRolledBy: '', 
          turn: 'red', 
          tokens: createInitialTokens(),
          players: initialPlayersState,
          consecutiveSixes: 0,
          winner: null,
          turnTimer: 15,
          hasRolled: false,
          turnStartedAt: Date.now(),
          revision: 0
        }).catch(e => console.log(e));
      }
    });
    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Math.max(0, 15 - Math.floor((Date.now() - gameState.turnStartedAt) / 1000));
      setDisplayTimer(diff);
    }, 200);
    return () => clearInterval(timer);
  }, [gameState.turnStartedAt]);

  useEffect(() => {
    if (!roomId || !db || gameState.winner) return;
    const timerInterval = setInterval(async () => {
      const gameDocRef = doc(db, 'voice_rooms', roomId, 'games', 'ludo');
      try {
        await runTransaction(db, async (transaction) => {
          const docSnap = await transaction.get(gameDocRef);
          if (!docSnap.exists()) return;
          const data = docSnap.data() as GameState;
          
          if (data.turnTimer > 0) {
            transaction.set(gameDocRef, { turnTimer: data.turnTimer - 1 }, { merge: true });
          } else {
            const nextCol = getNextTurn(data.turn);
            transaction.set(gameDocRef, { 
              turn: nextCol, 
              turnTimer: 15,
              consecutiveSixes: 0,
              hasRolled: false,
              turnStartedAt: Date.now(),
              revision: (data.revision || 0) + 1
            }, { merge: true });
          }
        });
      } catch (e) {}
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [gameState.turnTimer, gameState.turn, gameState.winner, roomId]);

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

  const playSfx = (type: 'dice' | 'move' | 'win') => {
    if (!isSoundOn) return;
    try {
      let url = 'https://actions.google.com/sounds/v1/foley/rolling_dice_on_table.ogg';
      if (type === 'move') url = 'https://actions.google.com/sounds/v1/foley/wood_click.ogg';
      if (type === 'win') url = 'https://actions.google.com/sounds/v1/cartoon/trumpet_fanfare.ogg';
      const sound = new Audio(url);
      sound.volume = 0.8;
      sound.play().catch(e => console.log(e));
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRolling) {
      interval = setInterval(() => {
        setDisplayFace(Math.floor(Math.random() * 6) + 1);
      }, 50);
    } else {
      setDisplayFace(gameState.diceValue);
    }
    return () => clearInterval(interval);
  }, [isRolling, gameState.diceValue]);

  const handleJoinSlot = async (color: PlayerColor) => {
    if (!currentUser || !roomId || !db) return;

    const username = currentUser.username;
    const avatar = currentUser.avatar || currentUser.photoURL || '';
    const gameDocRef = doc(
      db, 'voice_rooms', roomId, 'games', 'ludo'
    );

    try {
      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(gameDocRef);

        if (!snapshot.exists()) {
          throw new Error('Game has not been initialized.');
        }

        const state = snapshot.data() as GameState;
        const players = {
          ...initialPlayersState,
          ...state.players,
        };

        const existingColor = COLORS.find(
          c => players[c]?.username === username
        );

        if (existingColor && existingColor !== color) {
          throw new Error('You already own another color.');
        }

        if (players[color] && players[color]?.username !== username) {
          throw new Error('This color is already taken.');
        }

        players[color] = { username, avatar };

        transaction.update(gameDocRef, { players });
      });
    } catch (error) {
      console.error('Join slot failed:', error);
    }
  };

  const rollDice = async () => {
    if (!currentUser || !roomId || !db || isRolling) return;

    setIsRolling(true);
    playSfx('dice');

    const gameDocRef = doc(
      db, 'voice_rooms', roomId, 'games', 'ludo'
    );

    try {
      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(gameDocRef);

        if (!snapshot.exists()) {
          throw new Error('Game not initialized.');
        }

        const state = snapshot.data() as GameState;

        if (state.winner || state.hasRolled) {
          throw new Error('Cannot roll now.');
        }

        if (state.players?.[state.turn]?.username !== currentUser.username) {
          throw new Error('It is not your turn.');
        }

        const dice = Math.floor(Math.random() * 6) + 1;

        const sixes =
          dice === 6 ? state.consecutiveSixes + 1 : 0;

        if (sixes >= 3) {
          transaction.update(gameDocRef, {
            diceValue: dice,
            lastRolledBy: currentUser.username,
            consecutiveSixes: 0,
            turn: getNextTurn(state.turn),
            hasRolled: false,
            turnTimer: 15,
            turnStartedAt: Date.now(),
            revision: (state.revision ?? 0) + 1,
          });
          return;
        }

        const updatedTokens = state.tokens ?? createInitialTokens();

        const canMove = hasValidMove(
          updatedTokens, state.turn, dice
        );

        const nextTurn =
          dice === 6 || canMove
            ? state.turn
            : getNextTurn(state.turn);

        transaction.update(gameDocRef, {
          diceValue: dice,
          lastRolledBy: currentUser.username,
          consecutiveSixes: sixes,
          turn: nextTurn,
          hasRolled: canMove,
          turnTimer: 15,
          turnStartedAt: Date.now(),
          revision: (state.revision ?? 0) + 1,
        });
      });
    } catch (error) {
      console.error('Dice roll failed:', error);
    } finally {
      setTimeout(() => setIsRolling(false), 900);
    }
  };

  const handleTokenClick = async (
    playerColor: PlayerColor,
    tokenId: number,
  ) => {
    if (!currentUser || !roomId || !db) return;

    const gameDocRef = doc(
      db, 'voice_rooms', roomId, 'games', 'ludo'
    );

    try {
      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(gameDocRef);

        if (!snapshot.exists()) {
          throw new Error('Game not initialized.');
        }

        const state = snapshot.data() as GameState;

        if (state.winner || !state.hasRolled) {
          throw new Error('Roll the dice first.');
        }

        if (state.turn !== playerColor) {
          throw new Error('Wrong player turn.');
        }

        if (state.players?.[playerColor]?.username !== currentUser.username) {
          throw new Error('You do not own this color.');
        }

        const tokens = JSON.parse(
          JSON.stringify(state.tokens)
        ) as PlayerTokens;

        const token = tokens[playerColor].find(
          t => t.id === tokenId
        );

        if (!token || !canMoveToken(token, state.diceValue)) {
          throw new Error('Invalid token move.');
        }

        const oldPosition = token.position;

        token.position =
          oldPosition === -1
            ? 0
            : oldPosition + state.diceValue;

        token.isHome = false;

        let captured = false;

        if (
          oldPosition >= 0 &&
          oldPosition <= 51 &&
          token.position <= 51
        ) {
          const globalPosition = getGlobalPosition(
            playerColor, token.position
          );

          if (!SAFE_GLOBAL_POSITIONS.includes(globalPosition)) {
            for (const opponent of COLORS) {
              if (opponent === playerColor) continue;

              for (const enemy of tokens[opponent]) {
                if (
                  enemy.position >= 0 &&
                  enemy.position <= 51 &&
                  getGlobalPosition(
                    opponent, enemy.position
                  ) === globalPosition
                ) {
                  enemy.position = -1;
                  enemy.isHome = true;
                  captured = true;
                }
              }
            }
          }
        }

        const winner = tokens[playerColor].every(
          t => t.position === 57
        )
          ? playerColor.toUpperCase()
          : null;

        const bonusTurn =
          state.diceValue === 6 || captured ||
          token.position === 57;

        const nextTurn = bonusTurn
          ? state.turn
          : getNextTurn(state.turn);

        const nextCanRoll = bonusTurn && !winner;

        transaction.update(gameDocRef, {
          tokens,
          winner: winner ?? state.winner ?? null,
          turn: nextTurn,
          hasRolled: false,
          consecutiveSixes:
            nextCanRoll ? state.consecutiveSixes : 0,
          turnTimer: 15,
          turnStartedAt: Date.now(),
          revision: (state.revision ?? 0) + 1,
        });
      });

      playSfx('move');
    } catch (error) {
      console.error('Token move failed:', error);
    }
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
              <div className="w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.9)]"></div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`flex flex-col items-center justify-center p-3.5 bg-gradient-to-br ${activeTheme.bgWrap} rounded-3xl w-full border border-white/20 relative overflow-hidden transition-colors duration-700 shadow-2xl`}>
      
      {/* Top Header & Timer */}
      <div className="w-full flex items-center justify-between pb-2.5 px-2 mb-1.5 border-b border-white/10">
        <div className="flex flex-col">
          <span className="text-[11px] text-amber-400 font-extrabold uppercase tracking-widest drop-shadow">
            {gameState.winner ? `🏆 WINNER: ${gameState.winner}` : `TURN: ${gameState.turn.toUpperCase()}`}
          </span>
          <span className="text-[9px] text-sky-300 font-bold">
            ⏱️ Time Left: {displayTimer}s
          </span>
        </div>
        <button
          onClick={() => setIsSoundOn(!isSoundOn)}
          className={`px-3.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider transition-all border shadow-md ${
            isSoundOn ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_12px_#10b981]' : 'bg-rose-950 text-rose-300 border-rose-600'
          }`}
        >
          {isSoundOn ? '🔊 SOUND ON' : '🔇 SOUND OFF'}
        </button>
      </div>

      {/* Slot Joining Bar with Avatars */}
      <div className="w-full grid grid-cols-4 gap-1.5 mb-2 px-1">
        {COLORS.map(col => {
          const player = gameState.players[col];
          const isMySlot = player?.username === currentUser?.username;

          return (
            <button
              key={col}
              onClick={() => handleJoinSlot(col)}
              className={`py-1.5 px-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 truncate ${
                isMySlot 
                  ? 'bg-emerald-600 text-white border-emerald-300 shadow-[0_0_10px_#10b981]' 
                  : player 
                  ? 'bg-zinc-900 text-zinc-300 border-zinc-700' 
                  : 'bg-black/60 text-white/80 border-white/30 hover:bg-black'
              }`}
            >
              <div className="w-5 h-5 rounded-full overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center border border-white/40">
                {player?.avatar ? (
                  <img src={player.avatar} alt={player.username} className="w-full h-full object-cover" />
                ) : (
                  <span>{player ? player.username.charAt(0).toUpperCase() : '+'}</span>
                )}
              </div>
              <span className="truncate">{player ? player.username : `Join ${col}`}</span>
            </button>
          );
        })}
      </div>

      {/* Theme Selector Bar */}
      <div className="w-full flex overflow-x-auto gap-2 pb-2.5 mb-2 scrollbar-hide snap-x">
        {CINEMATIC_THEMES.map(theme => (
          <button 
            key={theme.id}
            onClick={() => setActiveThemeId(theme.id)}
            className={`snap-center shrink-0 px-3.5 py-1.5 rounded-lg text-[10px] font-black tracking-wider transition-all ${activeThemeId === theme.id ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.8)] scale-105' : 'bg-black/80 text-white/70 border border-white/20 hover:bg-black'}`}
          >
            {theme.name}
          </button>
        ))}
      </div>

      {/* Dice & Roll Section */}
      <div className="mb-3 text-center flex flex-col items-center relative z-20">
        <span className="text-[10px] text-white/90 mb-2.5 uppercase tracking-widest font-black drop-shadow">
          {gameState.lastRolledBy ? `ROLLED BY: @${gameState.lastRolledBy}` : 'READY TO ROLL'}
        </span>
        
        <div className={`w-20 h-20 ${activeTheme.diceBg} rounded-2xl flex items-center justify-center mb-3.5 border-[2px] border-white/40 relative overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.9)] transition-all duration-500 ${isRolling ? 'animate-spin scale-110' : ''}`}>
          {renderDiceDots(displayFace)}
        </div>
        
        <button 
          onClick={rollDice}
          disabled={isRolling || !!gameState.winner || gameState.hasRolled}
          className="px-7 py-3 bg-gradient-to-r from-zinc-900 via-black to-zinc-900 border border-white/40 text-white text-xs font-black tracking-widest rounded-xl hover:bg-zinc-800 active:scale-95 transition-all disabled:opacity-50 uppercase shadow-[0_10px_25px_rgba(0,0,0,1)]"
        >
          {isRolling ? 'ROLLING...' : gameState.hasRolled ? 'MOVE TOKEN' : 'ROLL DICE 🎲'}
        </button>
      </div>

      {/* Luxury Board Visual with Surrounding Player Avatars */}
      <div className="w-full flex justify-center mt-1 pb-1 relative z-20 drop-shadow-[0_25px_40px_rgba(0,0,0,1)]">
        <LudoBoardVisual theme={activeTheme} gameState={gameState} onTokenClick={handleTokenClick} />
      </div>

    </div>
  );
};

export default LudoGame;
