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

// ഡൈസ് റോൾ ചെയ്യുമ്പോഴുള്ള റിയലിസ്റ്റിക് ശബ്ദം (Google-ന്റെ ഫ്രീ ഓഡിയോ ലൈബ്രറിയിൽ നിന്നുള്ളത്)
const playDiceSound = () => {
  try {
    const audio = new Audio('https://actions.google.com/sounds/v1/foley/rolling_dice_on_table.ogg');
    audio.volume = 0.8;
    audio.play().catch(e => console.log("Sound play error:", e));
  } catch (error) {
    console.log("Audio not supported");
  }
};

// കളങ്ങൾ വരയ്ക്കാനുള്ള ഫംഗ്ഷൻ
const renderCells = (count: number, renderFn: (index: number) => React.ReactNode) => {
  return Array.from({ length: count }).map((_, i) => renderFn(i));
};

// 3D ലുക്കുള്ള ലുഡോ കരുക്കൾ (Tokens)
const Token = ({ colorClass }: { colorClass: string }) => (
  <div className={`w-[60%] h-[60%] rounded-full ${colorClass} shadow-[0_3px_5px_rgba(0,0,0,0.5),inset_0_-3px_5px_rgba(0,0,0,0.3),inset_0_2px_4px_rgba(255,255,255,0.6)] border border-white/20 transform hover:scale-110 transition-transform cursor-pointer`}></div>
);

// റിയലിസ്റ്റിക് ലുഡോ വീടുകൾ (Bases)
const Base = ({ outerClass, tokenClass }: {outerClass: string, tokenClass: string}) => (
  <div className={`p-2 sm:p-3 lg:p-4 flex items-center justify-center ${outerClass} shadow-[inset_0_0_20px_rgba(0,0,0,0.6)] relative border border-black/40`}>
    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
    <div className="w-full h-full bg-gradient-to-br from-[#fdfdfd] to-[#e0e0e0] rounded-[1.2rem] p-2.5 grid grid-cols-2 gap-2.5 shadow-[0_5px_15px_rgba(0,0,0,0.7),inset_0_2px_5px_rgba(255,255,255,0.9)] border border-gray-400 relative z-10">
      {[1,2,3,4].map(i => (
        <div key={i} className="rounded-full bg-[#d4d4d8] shadow-[inset_0_5px_10px_rgba(0,0,0,0.4),0_1px_2px_rgba(255,255,255,0.9)] border border-zinc-400/50 flex items-center justify-center relative overflow-hidden">
           <div className="absolute inset-0 bg-black/10 rounded-full"></div>
           <Token colorClass={tokenClass} />
        </div>
      ))}
    </div>
  </div>
);

// സാധാരണ കളങ്ങൾ (Tiles)
const Tile = ({ colorClass, hasStar, hasStartMark }: {colorClass: string, hasStar: boolean, hasStartMark: boolean}) => (
  <div className={`relative border-[0.5px] border-zinc-400/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.7),inset_0_-1px_2px_rgba(0,0,0,0.1)] ${colorClass} flex items-center justify-center`}>
    {hasStar && <span className="text-black/20 text-[10px] drop-shadow-sm">★</span>}
    {hasStartMark && <span className="text-white/80 text-[11px] drop-shadow-md">★</span>}
  </div>
);

// ലുഡോ ബോർഡ് ഡിസൈൻ (Realistic UI Component)
const LudoBoardVisual = () => {
  return (
    <div className="w-full max-w-[320px] aspect-square bg-gradient-to-br from-zinc-800 to-zinc-950 p-2 sm:p-2.5 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.7),inset_0_2px_5px_rgba(255,255,255,0.2)] border border-zinc-700 select-none">
      <div className="w-full h-full bg-[#eaeaea] border-[3px] border-zinc-900 grid grid-cols-[6fr_3fr_6fr] grid-rows-[6fr_3fr_6fr] gap-0 rounded-xl overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] relative">
        
        {/* വരി 1: ചുവപ്പ് വീട്, പച്ച വഴി, പച്ച വീട് */}
        <Base 
          outerClass="bg-gradient-to-br from-rose-500 to-red-700" 
          tokenClass="bg-gradient-to-br from-red-400 to-red-700" 
        />
        
        {/* മുകളിലെ പച്ച വഴി */}
        <div className="grid grid-cols-3 grid-rows-6 bg-[#eaeaea] shadow-[inset_0_0_10px_rgba(0,0,0,0.2)] z-0">
          {renderCells(18, (i) => {
            const isHomeStretch = [4,7,10,13,16].includes(i);
            const isStart = i === 5;
            const isStar = i === 6;
            let colorClass = "bg-gradient-to-b from-[#fdfdfd] to-[#e0e0e0]";
            if (isHomeStretch || isStart) colorClass = "bg-gradient-to-br from-emerald-400 to-green-600 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]";
            return <Tile key={`t-${i}`} colorClass={colorClass} hasStar={isStar} hasStartMark={isStart} />
          })}
        </div>

        <Base 
          outerClass="bg-gradient-to-br from-emerald-400 to-green-700" 
          tokenClass="bg-gradient-to-br from-green-400 to-green-700" 
        />

        {/* വരി 2: ഇടത്തെ ചുവപ്പ് വഴി, നടുവിലെ ഹോം, വലത്തെ മഞ്ഞ വഴി */}
        <div className="grid grid-cols-6 grid-rows-3 bg-[#eaeaea] shadow-[inset_0_0_10px_rgba(0,0,0,0.2)] z-0">
          {renderCells(18, (i) => {
            const isHomeStretch = [7,8,9,10,11].includes(i);
            const isStart = i === 1;
            const isStar = i === 13;
            let colorClass = "bg-gradient-to-b from-[#fdfdfd] to-[#e0e0e0]";
            if (isHomeStretch || isStart) colorClass = "bg-gradient-to-br from-rose-400 to-red-600 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]";
            return <Tile key={`l-${i}`} colorClass={colorClass} hasStar={isStar} hasStartMark={isStart} />
          })}
        </div>
        
        {/* നടുവിലെ ഹോം (Center Home - 3D Pyramids) */}
        <div className="relative border border-zinc-800 bg-zinc-900 overflow-hidden shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] z-10">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
            <polygon points="0,0 100,0 50,50" fill="url(#gradGreen)" stroke="#064e3b" strokeWidth="1"/>
            <polygon points="100,0 100,100 50,50" fill="url(#gradYellow)" stroke="#713f12" strokeWidth="1"/>
            <polygon points="0,100 100,100 50,50" fill="url(#gradBlue)" stroke="#1e3a8a" strokeWidth="1"/>
            <polygon points="0,0 0,100 50,50" fill="url(#gradRed)" stroke="#7f1d1d" strokeWidth="1"/>
            <defs>
              <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#166534"/></linearGradient>
              <linearGradient id="gradYellow" x1="1" y1="0" x2="0" y2="0"><stop offset="0%" stopColor="#fde047"/><stop offset="100%" stopColor="#854d0e"/></linearGradient>
              <linearGradient id="gradBlue" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#1e40af"/></linearGradient>
              <linearGradient id="gradRed" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#f87171"/><stop offset="100%" stopColor="#991b1b"/></linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <span className="text-[10px] font-black text-white/50 drop-shadow-md tracking-widest uppercase rotate-45">HOME</span>
          </div>
        </div>

        <div className="grid grid-cols-6 grid-rows-3 bg-[#eaeaea] shadow-[inset_0_0_10px_rgba(0,0,0,0.2)] z-0">
          {renderCells(18, (i) => {
            const isHomeStretch = [6,7,8,9,10].includes(i);
            const isStart = i === 16;
            const isStar = i === 4;
            let colorClass = "bg-gradient-to-b from-[#fdfdfd] to-[#e0e0e0]";
            if (isHomeStretch || isStart) colorClass = "bg-gradient-to-br from-yellow-300 to-amber-500 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]";
            return <Tile key={`r-${i}`} colorClass={colorClass} hasStar={isStar} hasStartMark={isStart} />
          })}
        </div>

        {/* വരി 3: നീല വീട്, താഴെയുള്ള നീല വഴി, മഞ്ഞ വീട് */}
        <Base 
          outerClass="bg-gradient-to-br from-cyan-400 to-blue-700" 
          tokenClass="bg-gradient-to-br from-blue-400 to-blue-700" 
        />

        <div className="grid grid-cols-3 grid-rows-6 bg-[#eaeaea] shadow-[inset_0_0_10px_rgba(0,0,0,0.2)] z-0">
          {renderCells(18, (i) => {
            const isHomeStretch = [1,4,7,10,13].includes(i);
            const isStart = i === 12;
            const isStar = i === 11;
            let colorClass = "bg-gradient-to-b from-[#fdfdfd] to-[#e0e0e0]";
            if (isHomeStretch || isStart) colorClass = "bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]";
            return <Tile key={`b-${i}`} colorClass={colorClass} hasStar={isStar} hasStartMark={isStart} />
          })}
        </div>

        <Base 
          outerClass="bg-gradient-to-br from-yellow-300 to-amber-600" 
          tokenClass="bg-gradient-to-br from-yellow-300 to-amber-600" 
        />
      </div>
    </div>
  );
};

// പ്രധാന ഗെയിം കമ്പോണന്റ്
const LudoGame: React.FC<LudoGameProps> = ({ roomId, currentUser }) => {
  const [gameState, setGameState] = useState<GameState>({
    diceValue: 1,
    lastRolledBy: '',
    turn: 'player_1'
  });
  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    if (!roomId || !db) return;

    const gameDocRef = doc(db, 'voice_rooms', roomId, 'games', 'ludo');
    
    const unsubscribe = onSnapshot(gameDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        setGameState(docSnap.data() as GameState);
      } else {
        try {
          await setDoc(gameDocRef, {
            diceValue: 1,
            lastRolledBy: '',
            turn: 'player_1'
          });
        } catch (e) {
          console.log("Firebase Ludo Doc Creation Error:", e);
        }
      }
    });

    return () => unsubscribe();
  }, [roomId]);

  const rollDice = async () => {
    if (!currentUser || !roomId || isRolling) return;
    
    // ഡൈസ് റോൾ ചെയ്യുമ്പോൾ ശബ്ദം പ്ലേ ചെയ്യുന്നു 🔊
    playDiceSound();
    
    setIsRolling(true);
    const randomNum = Math.floor(Math.random() * 6) + 1;
    
    const gameDocRef = doc(db, 'voice_rooms', roomId, 'games', 'ludo');
    try {
      await updateDoc(gameDocRef, {
        diceValue: randomNum,
        lastRolledBy: currentUser.username
      });
    } catch (error) {
      await setDoc(gameDocRef, {
        diceValue: randomNum,
        lastRolledBy: currentUser.username,
        turn: 'player_1'
      });
    }
    
    setTimeout(() => setIsRolling(false), 500);
  };

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-zinc-900/80 rounded-xl w-full">
      
      {/* ഡൈസ് റോൾ ചെയ്യുന്ന ഭാഗം */}
      <div className="mb-4 text-center text-white flex flex-col items-center">
        <span className="text-[10px] text-amber-400 mb-3 uppercase tracking-widest font-black drop-shadow-md">
          {gameState.lastRolledBy ? `ROLLED BY: @${gameState.lastRolledBy}` : 'READY TO START!'}
        </span>
        
        {/* 3D ഡൈസ് ബോക്സ് */}
        <div className="w-16 h-16 bg-gradient-to-b from-white to-gray-200 rounded-2xl shadow-[0_10px_20px_rgba(0,0,0,0.5),inset_0_-4px_8px_rgba(0,0,0,0.2),inset_0_4px_8px_rgba(255,255,255,0.9)] flex items-center justify-center mb-4 border border-gray-300">
          <span className={`text-4xl font-black text-gray-800 drop-shadow-sm ${isRolling ? 'animate-spin blur-[1px]' : ''}`}>
            {gameState.diceValue}
          </span>
        </div>
        
        <button 
          onClick={rollDice}
          disabled={isRolling}
          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold rounded-full shadow-[0_5px_15px_rgba(59,130,246,0.5)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          {isRolling ? 'Rolling...' : 'Roll Dice 🎲'}
        </button>
      </div>

      {/* പുതിയ റിയലിസ്റ്റിക് ലുഡോ ബോർഡ് */}
      <div className="w-full flex justify-center mt-2 pb-2">
        <LudoBoardVisual />
      </div>

    </div>
  );
};

export default LudoGame;
