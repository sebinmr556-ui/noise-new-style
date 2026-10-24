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

// ഡൈസ് റോൾ ചെയ്യുമ്പോഴുള്ള ശബ്ദം
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

// പഴയ കോട്ടയിലെ കല്ലിൽ പതിപ്പിച്ച രത്നങ്ങൾ പോലെയുള്ള കരുക്കൾ
const Token = ({ colorClass }: { colorClass: string }) => (
  <div className="w-[75%] h-[75%] rounded-full bg-stone-800 shadow-[0_4px_6px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.2)] border-2 border-stone-950 flex items-center justify-center transform hover:scale-110 transition-transform cursor-pointer relative">
     {/* Glowing Gem Inside */}
     <div className={`w-[45%] h-[45%] rounded-full ${colorClass} shadow-[0_0_8px_currentColor] opacity-90`}></div>
     <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] bg-white/30 rounded-full blur-[1px]"></div>
  </div>
);

// തകർന്ന കല്ലുകൾ പോലെയുള്ള വീടുകൾ (Ancient Bases)
const Base = ({ outerClass, tokenClass }: {outerClass: string, tokenClass: string}) => (
  <div className={`p-2 sm:p-3 lg:p-4 flex items-center justify-center ${outerClass} shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] relative border-2 border-stone-900`}>
    {/* കല്ലിന്റെ ടെക്സ്ചർ (Cracks) */}
    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, transparent 20%, #000 120%)' }}></div>
    
    <div className="w-full h-full bg-gradient-to-br from-stone-400 to-stone-600 rounded-lg p-2.5 grid grid-cols-2 gap-2.5 shadow-[0_10px_20px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.4)] border-2 border-stone-800 relative z-10">
      {[1,2,3,4].map(i => (
        <div key={i} className="rounded-full bg-stone-900 shadow-[inset_0_5px_15px_rgba(0,0,0,1),0_1px_1px_rgba(255,255,255,0.3)] border border-stone-700 flex items-center justify-center relative overflow-hidden">
           <Token colorClass={tokenClass} />
        </div>
      ))}
    </div>
  </div>
);

// കല്ലിൽ കൊത്തിയ കളങ്ങൾ (Stone Carved Tiles)
const Tile = ({ colorClass, hasStar, hasStartMark }: {colorClass: string, hasStar: boolean, hasStartMark: boolean}) => (
  <div className={`relative border-[1px] border-stone-600/80 shadow-[inset_0_2px_5px_rgba(255,255,255,0.2),inset_0_-2px_5px_rgba(0,0,0,0.4)] ${colorClass} flex items-center justify-center`}>
    {/* കളങ്ങളിലെ വിള്ളലുകൾ (Small detail) */}
    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')] opacity-20 pointer-events-none"></div>
    {hasStar && <span className="text-stone-900/40 text-[10px] drop-shadow-sm font-serif">★</span>}
    {hasStartMark && <span className="text-white/70 text-[11px] drop-shadow-md font-serif">★</span>}
  </div>
);

// ബോർഡിന് ചുറ്റുമുള്ള വള്ളിച്ചെടികൾ (Creeping Vines & Leaves Overlay)
const VinesOverlay = () => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none z-30 drop-shadow-[0_5px_5px_rgba(0,0,0,0.7)]" viewBox="0 0 100 100" preserveAspectRatio="none">
    {/* Top Left Vines */}
    <path d="M0,0 Q15,5 20,20 T-5,45" stroke="#14532d" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    <path d="M0,0 Q5,15 15,-5" stroke="#064e3b" strokeWidth="3" fill="none" />
    <path d="M0,20 Q10,25 5,35" stroke="#166534" strokeWidth="1.5" fill="none" />
    {/* Top Right Vines */}
    <path d="M100,0 Q80,10 90,30 T105,60" stroke="#14532d" strokeWidth="2" fill="none" />
    <path d="M100,0 Q90,5 85,-5" stroke="#064e3b" strokeWidth="2.5" fill="none" />
    {/* Bottom Left Vines */}
    <path d="M0,100 Q10,80 25,95 T-5,60" stroke="#166534" strokeWidth="2" fill="none" />
    <path d="M0,100 Q20,95 25,105" stroke="#064e3b" strokeWidth="3" fill="none" />
    {/* Bottom Right Vines */}
    <path d="M100,100 Q80,85 95,70 T105,40" stroke="#14532d" strokeWidth="2.5" fill="none" />
    
    {/* Scattered Leaves (ഇലകൾ) */}
    <ellipse cx="12" cy="8" rx="2.5" ry="5" fill="#15803d" transform="rotate(45 12 8)" />
    <ellipse cx="18" cy="22" rx="2" ry="4" fill="#16a34a" transform="rotate(-30 18 22)" />
    <ellipse cx="5" cy="30" rx="1.5" ry="3" fill="#22c55e" transform="rotate(20 5 30)" />
    <ellipse cx="88" cy="15" rx="2" ry="4.5" fill="#166534" transform="rotate(60 88 15)" />
    <ellipse cx="92" cy="40" rx="1.5" ry="3" fill="#15803d" transform="rotate(-15 92 40)" />
    <ellipse cx="10" cy="85" rx="2.5" ry="5" fill="#166534" transform="rotate(20 10 85)" />
    <ellipse cx="22" cy="95" rx="2" ry="4" fill="#15803d" transform="rotate(-40 22 95)" />
    <ellipse cx="85" cy="90" rx="2.5" ry="5" fill="#16a34a" transform="rotate(-60 85 90)" />
    <ellipse cx="95" cy="75" rx="1.5" ry="3.5" fill="#22c55e" transform="rotate(30 95 75)" />
  </svg>
);

// Old Building Ludo Board
const LudoBoardVisual = () => {
  return (
    <div className="w-full max-w-[320px] aspect-square bg-stone-900 p-2 sm:p-3 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_2px_10px_rgba(255,255,255,0.1)] border-4 border-stone-800 relative select-none">
      
      {/* വള്ളിച്ചെടികൾ */}
      <VinesOverlay />

      <div className="w-full h-full bg-stone-500 border-4 border-stone-900 grid grid-cols-[6fr_3fr_6fr] grid-rows-[6fr_3fr_6fr] gap-0 rounded-md overflow-hidden shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] relative z-10">
        
        {/* വരി 1: ചുവപ്പ്, പച്ച വഴി, പച്ച */}
        <Base 
          outerClass="bg-gradient-to-br from-red-900 to-[#4a0000]" 
          tokenClass="bg-rose-500 text-rose-500" 
        />
        
        {/* മുകളിലെ വഴി */}
        <div className="grid grid-cols-3 grid-rows-6 bg-stone-400 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)] z-0 relative">
          <div className="absolute inset-0 bg-green-900/10 pointer-events-none"></div> {/* പായൽ പിടിച്ച എഫക്ട് */}
          {renderCells(18, (i) => {
            const isHomeStretch = [4,7,10,13,16].includes(i);
            const isStart = i === 5;
            const isStar = i === 6;
            let colorClass = "bg-stone-300";
            if (isHomeStretch || isStart) colorClass = "bg-gradient-to-br from-green-800 to-[#052e16] shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)]";
            return <Tile key={`t-${i}`} colorClass={colorClass} hasStar={isStar} hasStartMark={isStart} />
          })}
        </div>

        <Base 
          outerClass="bg-gradient-to-br from-green-900 to-[#052e16]" 
          tokenClass="bg-emerald-500 text-emerald-500" 
        />

        {/* വരി 2: ഇടത്തെ വഴി, ഹോം, വലത്തെ വഴി */}
        <div className="grid grid-cols-6 grid-rows-3 bg-stone-400 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)] z-0 relative">
          {renderCells(18, (i) => {
            const isHomeStretch = [7,8,9,10,11].includes(i);
            const isStart = i === 1;
            const isStar = i === 13;
            let colorClass = "bg-stone-300";
            if (isHomeStretch || isStart) colorClass = "bg-gradient-to-br from-red-800 to-[#450a0a] shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)]";
            return <Tile key={`l-${i}`} colorClass={colorClass} hasStar={isStar} hasStartMark={isStart} />
          })}
        </div>
        
        {/* നടുവിലെ ഹോം (Ancient Temple Top) */}
        <div className="relative border border-stone-800 bg-stone-900 overflow-hidden shadow-[inset_0_0_25px_rgba(0,0,0,1)] z-10 flex items-center justify-center">
          <div className="absolute inset-0 opacity-50 bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')]"></div>
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_5px_10px_rgba(0,0,0,0.9)] opacity-90">
            <polygon points="0,0 100,0 50,50" fill="#14532d" stroke="#000" strokeWidth="2"/>
            <polygon points="100,0 100,100 50,50" fill="#78350f" stroke="#000" strokeWidth="2"/>
            <polygon points="0,100 100,100 50,50" fill="#1e3a8a" stroke="#000" strokeWidth="2"/>
            <polygon points="0,0 0,100 50,50" fill="#7f1d1d" stroke="#000" strokeWidth="2"/>
          </svg>
          <div className="absolute w-8 h-8 bg-stone-800 rounded-full border-2 border-stone-600 shadow-2xl flex items-center justify-center">
             <div className="w-4 h-4 bg-amber-500 rounded-full shadow-[0_0_10px_#f59e0b] animate-pulse"></div>
          </div>
        </div>

        <div className="grid grid-cols-6 grid-rows-3 bg-stone-400 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)] z-0">
          {renderCells(18, (i) => {
            const isHomeStretch = [6,7,8,9,10].includes(i);
            const isStart = i === 16;
            const isStar = i === 4;
            let colorClass = "bg-stone-300";
            if (isHomeStretch || isStart) colorClass = "bg-gradient-to-br from-amber-700 to-[#78350f] shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)]";
            return <Tile key={`r-${i}`} colorClass={colorClass} hasStar={isStar} hasStartMark={isStart} />
          })}
        </div>

        {/* വരി 3: നീല, താഴെയുള്ള വഴി, മഞ്ഞ */}
        <Base 
          outerClass="bg-gradient-to-br from-blue-900 to-[#0f172a]" 
          tokenClass="bg-blue-400 text-blue-400" 
        />

        <div className="grid grid-cols-3 grid-rows-6 bg-stone-400 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)] z-0">
          {renderCells(18, (i) => {
            const isHomeStretch = [1,4,7,10,13].includes(i);
            const isStart = i === 12;
            const isStar = i === 11;
            let colorClass = "bg-stone-300";
            if (isHomeStretch || isStart) colorClass = "bg-gradient-to-br from-blue-800 to-[#1e3a8a] shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)]";
            return <Tile key={`b-${i}`} colorClass={colorClass} hasStar={isStar} hasStartMark={isStart} />
          })}
        </div>

        <Base 
          outerClass="bg-gradient-to-br from-amber-700 to-[#451a03]" 
          tokenClass="bg-yellow-400 text-yellow-400" 
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

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800 via-stone-900 to-black rounded-xl w-full border border-stone-800 shadow-[inset_0_0_50px_rgba(0,0,0,1)]">
      
      {/* ഡൈസ് റോൾ ചെയ്യുന്ന ഭാഗം */}
      <div className="mb-4 text-center text-stone-300 flex flex-col items-center relative z-20">
        <span className="text-[10px] text-amber-600 mb-3 uppercase tracking-widest font-black drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
          {gameState.lastRolledBy ? `ROLLED BY: @${gameState.lastRolledBy}` : 'AWAKEN THE RUINS'}
        </span>
        
        {/* കല്ലിൽ കൊത്തിയ ഡൈസ് (Stone Dice) */}
        <div className="w-16 h-16 bg-gradient-to-br from-stone-400 to-stone-600 rounded-xl shadow-[0_10px_20px_rgba(0,0,0,0.8),inset_0_0_10px_rgba(0,0,0,0.5),inset_0_4px_8px_rgba(255,255,255,0.3)] flex items-center justify-center mb-4 border-2 border-stone-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')] opacity-40"></div>
          <span className={`text-4xl font-black text-stone-900 drop-shadow-md relative z-10 ${isRolling ? 'animate-spin blur-[2px]' : ''}`}>
            {gameState.diceValue}
          </span>
        </div>
        
        <button 
          onClick={rollDice}
          disabled={isRolling}
          className="px-6 py-2.5 bg-gradient-to-b from-stone-700 to-stone-900 border border-stone-500 text-amber-500 text-xs font-black tracking-wider rounded-full shadow-[0_5px_15px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          {isRolling ? 'ROLLING...' : 'ROLL DICE 🎲'}
        </button>
      </div>

      {/* Old Building Ludo Board */}
      <div className="w-full flex justify-center mt-2 pb-2">
        <LudoBoardVisual />
      </div>

    </div>
  );
};

export default LudoGame;
