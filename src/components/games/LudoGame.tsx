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

// ലുഡോ ബോർഡിന്റെ ഗ്രിഡ് (കളങ്ങൾ) വരയ്ക്കാനുള്ള സഹായ ഫംഗ്ഷൻ
const renderCells = (count: number, renderFn: (index: number) => React.ReactNode) => {
  return Array.from({ length: count }).map((_, i) => renderFn(i));
};

// ലുഡോ ബോർഡ് ഡിസൈൻ (UI Component)
const LudoBoardVisual = () => {
  return (
    <div className="w-full max-w-[280px] aspect-square bg-white border-4 border-zinc-800 grid grid-cols-[6fr_3fr_6fr] grid-rows-[6fr_3fr_6fr] gap-0 rounded-md overflow-hidden shadow-2xl">
      
      {/* മുകൾ ഭാഗം: ചുവപ്പും പച്ചയും വീടുകളും നടുവിലെ വഴിയും */}
      <div className="bg-red-500 border border-zinc-800 p-3 flex items-center justify-center">
        <div className="w-full h-full bg-white rounded-xl p-2 grid grid-cols-2 gap-2 shadow-inner">
          <div className="bg-red-500 rounded-full shadow-md border-2 border-red-700"></div>
          <div className="bg-red-500 rounded-full shadow-md border-2 border-red-700"></div>
          <div className="bg-red-500 rounded-full shadow-md border-2 border-red-700"></div>
          <div className="bg-red-500 rounded-full shadow-md border-2 border-red-700"></div>
        </div>
      </div>
      <div className="grid grid-cols-3 grid-rows-6 bg-white border border-zinc-800">
        {renderCells(18, (i) => {
          const isGreenHomeStretch = i % 3 === 1 && i !== 1; 
          const isStart = i === 2;
          return <div key={`t-${i}`} className={`border border-zinc-300 ${isGreenHomeStretch || isStart ? 'bg-green-500' : 'bg-white'}`}></div>
        })}
      </div>
      <div className="bg-green-500 border border-zinc-800 p-3 flex items-center justify-center">
        <div className="w-full h-full bg-white rounded-xl p-2 grid grid-cols-2 gap-2 shadow-inner">
          <div className="bg-green-500 rounded-full shadow-md border-2 border-green-700"></div>
          <div className="bg-green-500 rounded-full shadow-md border-2 border-green-700"></div>
          <div className="bg-green-500 rounded-full shadow-md border-2 border-green-700"></div>
          <div className="bg-green-500 rounded-full shadow-md border-2 border-green-700"></div>
        </div>
      </div>

      {/* നടുവിലുള്ള ഭാഗം: ഇടത്തെ വഴിയും വലത്തെ വഴിയും നടുവിലെ കേന്ദ്രവും (Home) */}
      <div className="grid grid-cols-6 grid-rows-3 bg-white border border-zinc-800">
        {renderCells(18, (i) => {
          const isRedHomeStretch = Math.floor(i / 6) === 1 && i !== 6;
          const isStart = i === 7; // safe zone
          return <div key={`l-${i}`} className={`border border-zinc-300 ${isRedHomeStretch || isStart ? 'bg-red-500' : 'bg-white'}`}></div>
        })}
      </div>
      <div className="relative border border-zinc-800 bg-zinc-900 overflow-hidden">
        {/* Ludo Home Center (SVG Triangles) */}
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon points="0,0 100,0 50,50" fill="#22c55e" /> {/* പച്ച */}
          <polygon points="100,0 100,100 50,50" fill="#eab308" /> {/* മഞ്ഞ */}
          <polygon points="0,100 100,100 50,50" fill="#3b82f6" /> {/* നീല */}
          <polygon points="0,0 0,100 50,50" fill="#ef4444" /> {/* ചുവപ്പ് */}
        </svg>
      </div>
      <div className="grid grid-cols-6 grid-rows-3 bg-white border border-zinc-800">
        {renderCells(18, (i) => {
          const isYellowHomeStretch = Math.floor(i / 6) === 1 && i !== 11;
          const isStart = i === 10;
          return <div key={`r-${i}`} className={`border border-zinc-300 ${isYellowHomeStretch || isStart ? 'bg-yellow-400' : 'bg-white'}`}></div>
        })}
      </div>

      {/* താഴെയുള്ള ഭാഗം: നീലയും മഞ്ഞയും വീടുകളും നടുവിലെ വഴിയും */}
      <div className="bg-blue-500 border border-zinc-800 p-3 flex items-center justify-center">
        <div className="w-full h-full bg-white rounded-xl p-2 grid grid-cols-2 gap-2 shadow-inner">
          <div className="bg-blue-500 rounded-full shadow-md border-2 border-blue-700"></div>
          <div className="bg-blue-500 rounded-full shadow-md border-2 border-blue-700"></div>
          <div className="bg-blue-500 rounded-full shadow-md border-2 border-blue-700"></div>
          <div className="bg-blue-500 rounded-full shadow-md border-2 border-blue-700"></div>
        </div>
      </div>
      <div className="grid grid-cols-3 grid-rows-6 bg-white border border-zinc-800">
        {renderCells(18, (i) => {
          const isBlueHomeStretch = i % 3 === 1 && i !== 16;
          const isStart = i === 15;
          return <div key={`b-${i}`} className={`border border-zinc-300 ${isBlueHomeStretch || isStart ? 'bg-blue-500' : 'bg-white'}`}></div>
        })}
      </div>
      <div className="bg-yellow-400 border border-zinc-800 p-3 flex items-center justify-center">
        <div className="w-full h-full bg-white rounded-xl p-2 grid grid-cols-2 gap-2 shadow-inner">
          <div className="bg-yellow-400 rounded-full shadow-md border-2 border-yellow-600"></div>
          <div className="bg-yellow-400 rounded-full shadow-md border-2 border-yellow-600"></div>
          <div className="bg-yellow-400 rounded-full shadow-md border-2 border-yellow-600"></div>
          <div className="bg-yellow-400 rounded-full shadow-md border-2 border-yellow-600"></div>
        </div>
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
    <div className="flex flex-col items-center justify-center p-3 bg-zinc-900 rounded-xl w-full border border-blue-500/30">
      
      {/* ഡൈസ് റോൾ ചെയ്യുന്ന ഭാഗം */}
      <div className="mb-4 text-center text-white flex flex-col items-center">
        <span className="text-[10px] text-amber-400 mb-2 uppercase tracking-wider font-bold">
          {gameState.lastRolledBy ? `Last rolled by: @${gameState.lastRolledBy}` : 'Ready to start!'}
        </span>
        
        <div className="w-14 h-14 bg-white rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.3)] flex items-center justify-center mb-3 border-2 border-zinc-200">
          <span className={`text-3xl font-black text-black ${isRolling ? 'animate-spin' : ''}`}>
            {gameState.diceValue}
          </span>
        </div>
        
        <button 
          onClick={rollDice}
          disabled={isRolling}
          className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold rounded-full shadow-lg shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          {isRolling ? 'Rolling...' : 'Roll Dice 🎲'}
        </button>
      </div>

      {/* പുതിയ ലുഡോ ബോർഡ് ഇവിടെ കാണിക്കുന്നു */}
      <div className="w-full flex justify-center mt-2 drop-shadow-xl">
        <LudoBoardVisual />
      </div>

    </div>
  );
};

export default LudoGame;
