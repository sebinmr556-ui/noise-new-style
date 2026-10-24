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

// കല്ലിൽ തീർത്ത ഭാരമുള്ള കരുക്കൾ (Heavy Stone Tokens)
const Token = ({ colorClass, innerGlow }: { colorClass: string, innerGlow: string }) => (
  <div className={`w-[70%] h-[70%] rounded-full bg-stone-700 shadow-[0_5px_10px_rgba(0,0,0,0.9),inset_0_-3px_5px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.3)] border-2 border-stone-900 transform hover:scale-110 transition-transform cursor-pointer relative flex items-center justify-center`}>
     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')] opacity-50 rounded-full"></div>
     {/* കരുക്കൾക്ക് ഉള്ളിലെ മാന്ത്രിക വെളിച്ചം */}
     <div className={`w-[40%] h-[40%] rounded-full ${colorClass} ${innerGlow} opacity-90 border border-black/50 z-10`}></div>
  </div>
);

// ഇടിഞ്ഞു പൊളിഞ്ഞ കോൺക്രീറ്റ് തറകൾ (Ruined Concrete Bases)
const Base = ({ outerClass, tokenColor, tokenGlow }: {outerClass: string, tokenColor: string, tokenGlow: string}) => (
  <div className={`p-2 sm:p-3 flex items-center justify-center ${outerClass} shadow-[inset_0_0_40px_rgba(0,0,0,0.9)] relative border-[3px] border-stone-900 overflow-hidden`}>
    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')] opacity-60 mix-blend-multiply pointer-events-none"></div>
    
    <div className="w-full h-full bg-stone-600/40 backdrop-blur-sm rounded-sm p-3 grid grid-cols-2 gap-3 shadow-[0_10px_25px_rgba(0,0,0,0.9),inset_0_2px_5px_rgba(255,255,255,0.1)] border-t border-l border-stone-500/30 border-b-2 border-r-2 border-stone-900 relative z-10">
      {[1,2,3,4].map(i => (
        <div key={i} className="rounded-full bg-stone-900 shadow-[inset_0_8px_15px_rgba(0,0,0,1),0_1px_2px_rgba(255,255,255,0.2)] border-2 border-stone-800 flex items-center justify-center relative overflow-hidden">
           <Token colorClass={tokenColor} innerGlow={tokenGlow} />
        </div>
      ))}
    </div>
  </div>
);

// വിള്ളൽ വീണ കല്ലുകൾ (Cracked Stone Tiles)
const Tile = ({ colorClass, hasStar, isSafe }: {colorClass: string, hasStar: boolean, isSafe: boolean}) => (
  <div className={`relative border-[1.5px] border-stone-800 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15),inset_0_-2px_4px_rgba(0,0,0,0.6)] ${colorClass} flex items-center justify-center overflow-hidden`}>
    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wall-4-light.png')] opacity-40 mix-blend-multiply pointer-events-none"></div>
    {hasStar && <span className="text-stone-900/60 text-[11px] drop-shadow-md font-black opacity-60">✖</span>}
    {isSafe && <span className="text-white/40 text-[12px] drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] font-black">✖</span>}
  </div>
);

// റിയലിസ്റ്റിക് ബിൽഡിംഗ് ലുഡോ ബോർഡ്
const LudoBoardVisual = () => {
  return (
    <div className="w-full max-w-[340px] aspect-square bg-[#111] p-2 rounded-lg shadow-[0_30px_60px_rgba(0,0,0,1),inset_0_0_20px_rgba(0,0,0,1)] border-y-[8px] border-x-[6px] border-stone-800 relative select-none">
      
      {/* പൊളിഞ്ഞ മേൽക്കൂരയിൽ നിന്നുള്ള സൂര്യപ്രകാശം (Sunbeam from broken roof) */}
      <div className="absolute -top-10 -left-10 w-[150%] h-[150%] bg-gradient-to-br from-white/10 via-transparent to-transparent transform -rotate-12 pointer-events-none z-30 blur-md"></div>

      {/* പൊടിപടലങ്ങൾ (Dust particles overlay) */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dust.png')] opacity-30 pointer-events-none z-20"></div>

      <div className="w-full h-full bg-stone-500 border-2 border-stone-900 grid grid-cols-[6fr_3fr_6fr] grid-rows-[6fr_3fr_6fr] gap-0 overflow-hidden shadow-[inset_0_0_50px_rgba(0,0,0,0.9)] relative z-10">
        
        {/* വരി 1: മങ്ങിയ ചുവപ്പ്, പച്ച വഴി, മങ്ങിയ പച്ച */}
        <Base 
          outerClass="bg-red-950" 
          tokenColor="bg-red-600" 
          tokenGlow="shadow-[0_0_15px_#dc2626]"
        />
        
        <div className="grid grid-cols-3 grid-rows-6 bg-stone-600 shadow-[inset_0_0_20px_rgba(0,0,0,0.7)] z-0 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')] opacity-30 pointer-events-none"></div>
          {renderCells(18, (i) => {
            const isHomeStretch = [4,7,10,13,16].includes(i);
            const isStart = i === 5;
            const isStar = i === 6;
            let colorClass = "bg-[#78716c]";
            if (isHomeStretch || isStart) colorClass = "bg-green-900 shadow-[inset_0_0_10px_#064e3b]"; 
            return <Tile key={`t-${i}`} colorClass={colorClass} hasStar={isStar} isSafe={isStart} />
          })}
        </div>

        <Base 
          outerClass="bg-green-950" 
          tokenColor="bg-green-600" 
          tokenGlow="shadow-[0_0_15px_#16a34a]"
        />

        {/* വരി 2: ഇടത്തെ വഴി, ഹോം (തകർന്ന കുഴി), വലത്തെ വഴി */}
        <div className="grid grid-cols-6 grid-rows-3 bg-stone-600 shadow-[inset_0_0_20px_rgba(0,0,0,0.7)] z-0 relative">
          {renderCells(18, (i) => {
            const isHomeStretch = [7,8,9,10,11].includes(i);
            const isStart = i === 1;
            const isStar = i === 13;
            let colorClass = "bg-[#78716c]";
            if (isHomeStretch || isStart) colorClass = "bg-red-900 shadow-[inset_0_0_10px_#7f1d1d]";
            return <Tile key={`l-${i}`} colorClass={colorClass} hasStar={isStar} isSafe={isStart} />
          })}
        </div>
        
        {/* നടുവിലെ ഹോം: കോൺക്രീറ്റ് പൊളിഞ്ഞ വലിയൊരു ഇരുണ്ട കുഴി (Abyss / Ruined Center) */}
        <div className="relative border-4 border-stone-900 bg-black overflow-hidden shadow-[inset_0_0_30px_rgba(0,0,0,1)] z-10 flex items-center justify-center">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')] opacity-20"></div>
          <div className="absolute w-[80%] h-[80%] bg-stone-900 rounded-full blur-md opacity-50"></div>
          <svg viewBox="0 0 100 100" className="w-[90%] h-[90%] drop-shadow-[0_10px_15px_rgba(0,0,0,1)] opacity-70">
            <polygon points="0,0 100,0 50,50" fill="#064e3b" stroke="#000" strokeWidth="3"/>
            <polygon points="100,0 100,100 50,50" fill="#713f12" stroke="#000" strokeWidth="3"/>
            <polygon points="0,100 100,100 50,50" fill="#1e3a8a" stroke="#000" strokeWidth="3"/>
            <polygon points="0,0 0,100 50,50" fill="#7f1d1d" stroke="#000" strokeWidth="3"/>
          </svg>
        </div>

        <div className="grid grid-cols-6 grid-rows-3 bg-stone-600 shadow-[inset_0_0_20px_rgba(0,0,0,0.7)] z-0 relative">
          {renderCells(18, (i) => {
            const isHomeStretch = [6,7,8,9,10].includes(i);
            const isStart = i === 16;
            const isStar = i === 4;
            let colorClass = "bg-[#78716c]";
            if (isHomeStretch || isStart) colorClass = "bg-yellow-900 shadow-[inset_0_0_10px_#713f12]";
            return <Tile key={`r-${i}`} colorClass={colorClass} hasStar={isStar} isSafe={isStart} />
          })}
        </div>

        {/* വരി 3: മങ്ങിയ നീല, താഴെയുള്ള വഴി, മങ്ങിയ മഞ്ഞ */}
        <Base 
          outerClass="bg-blue-950" 
          tokenColor="bg-blue-600" 
          tokenGlow="shadow-[0_0_15px_#2563eb]"
        />

        <div className="grid grid-cols-3 grid-rows-6 bg-stone-600 shadow-[inset_0_0_20px_rgba(0,0,0,0.7)] z-0 relative">
          {renderCells(18, (i) => {
            const isHomeStretch = [1,4,7,10,13].includes(i);
            const isStart = i === 12;
            const isStar = i === 11;
            let colorClass = "bg-[#78716c]";
            if (isHomeStretch || isStart) colorClass = "bg-blue-900 shadow-[inset_0_0_10px_#1e3a8a]";
            return <Tile key={`b-${i}`} colorClass={colorClass} hasStar={isStar} isSafe={isStart} />
          })}
        </div>

        <Base 
          outerClass="bg-yellow-950" 
          tokenColor="bg-amber-500" 
          tokenGlow="shadow-[0_0_15px_#d97706]"
        />
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
      <div className="grid grid-cols-3 grid-rows-3 gap-1 w-full h-full p-2 relative z-10">
        {[0,1,2,3,4,5,6,7,8].map(i => (
          <div key={i} className="flex items-center justify-center">
            {activeDots.includes(i) && (
              // മരത്തിൽ കൊത്തിയ വെളുത്ത കുത്തുകൾ (White inlaid dots)
              <div className="w-3 h-3 bg-[#fdfdfd] rounded-full shadow-[inset_0_-1px_2px_rgba(0,0,0,0.5),0_1px_1px_rgba(255,255,255,0.9)] border-[0.5px] border-black/20"></div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-zinc-950 rounded-xl w-full border border-zinc-900 shadow-[inset_0_0_50px_#000] relative overflow-hidden">
      
      {/* ബാക്ക്ഗ്രൗണ്ടിലെ പഴയ ഭിത്തിയുടെ ഫീൽ (Background wall texture) */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')] opacity-10 pointer-events-none"></div>

      <div className="mb-4 text-center text-stone-400 flex flex-col items-center relative z-20">
        <span className="text-[10px] text-stone-500 mb-3 uppercase tracking-widest font-black drop-shadow-md">
          {gameState.lastRolledBy ? `ROLLED BY: @${gameState.lastRolledBy}` : 'EXPLORE THE RUINS'}
        </span>
        
        {/* മരത്തിൽ തീർത്ത ഡൈസ് (Wooden Dice with Dots) */}
        <div className={`w-16 h-16 bg-gradient-to-br from-[#925c2d] to-[#4e2c13] rounded-xl shadow-[0_15px_25px_rgba(0,0,0,0.9),inset_0_-3px_8px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.3)] flex items-center justify-center mb-4 border-[2px] border-[#2d180a] relative overflow-hidden transform transition-all ${isRolling ? 'animate-spin blur-[1px] scale-110' : ''}`}>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-70 mix-blend-multiply pointer-events-none"></div>
          {renderDiceDots(gameState.diceValue || 1)}
        </div>
        
        <button 
          onClick={rollDice}
          disabled={isRolling}
          className="px-6 py-2.5 bg-stone-800 border border-stone-600 text-stone-300 text-xs font-black tracking-widest rounded-sm shadow-[0_5px_15px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.1)] hover:bg-stone-700 active:scale-95 transition-all disabled:opacity-50 uppercase"
        >
          {isRolling ? 'ROLLING...' : 'ROLL DICE 🎲'}
        </button>
      </div>

      {/* Ruined Building Ludo Board */}
      <div className="w-full flex justify-center mt-2 pb-2 relative z-20">
        <LudoBoardVisual />
      </div>

    </div>
  );
};

export default LudoGame;
