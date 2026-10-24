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

const LudoGame: React.FC<LudoGameProps> = ({ roomId, currentUser }) => {
  // ലോഡിങ് നിൽക്കാതിരിക്കാൻ ഡിഫോൾട്ട് വാല്യൂ കൊടുക്കുന്നു
  const [gameState, setGameState] = useState<GameState>({
    diceValue: 1,
    lastRolledBy: '',
    turn: 'player_1'
  });
  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    if (!roomId || !db) return;

    // ലുഡോ ഡാറ്റാബേസ് പാത്ത്
    const gameDocRef = doc(db, 'voice_rooms', roomId, 'games', 'ludo');
    
    const unsubscribe = onSnapshot(gameDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        setGameState(docSnap.data() as GameState);
      } else {
        // ആദ്യമായി ഓപ്പൺ ചെയ്യുമ്പോൾ ഫയർബേസിൽ ക്രിയേറ്റ് ചെയ്യാൻ
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
      // ഡോക്യുമെന്റ് ഇല്ലെങ്കിൽ പുതിയത് ഉണ്ടാക്കാൻ
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
      
      <div className="mb-4 text-center text-white flex flex-col items-center">
        <span className="text-[10px] text-amber-400 mb-2 uppercase tracking-wider font-bold">
          {gameState.lastRolledBy ? `Last rolled by: @${gameState.lastRolledBy}` : 'Ready to start!'}
        </span>
        
        {/* ഡൈസ് ബോക്സ് */}
        <div className="w-14 h-14 bg-white rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.3)] flex items-center justify-center mb-3 border-2 border-zinc-200">
          <span className={`text-3xl font-black text-black ${isRolling ? 'animate-spin' : ''}`}>
            {gameState.diceValue}
          </span>
        </div>
        
        {/* റോൾ ബട്ടൺ */}
        <button 
          onClick={rollDice}
          disabled={isRolling}
          className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold rounded-full shadow-lg shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          {isRolling ? 'Rolling...' : 'Roll Dice 🎲'}
        </button>
      </div>

      {/* ബോർഡ് വരുന്ന ഭാഗം */}
      <div className="w-full max-w-[280px] aspect-square bg-zinc-950 border border-zinc-700 rounded-lg flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[conic-gradient(at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-purple-500/10 to-blue-500/10 opacity-50" />
        <p className="text-center text-zinc-500 font-bold text-[10px] z-10 px-4">
          Ludo Board design will appear here...
        </p>
      </div>

    </div>
  );
};

export default LudoGame;
