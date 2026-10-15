import React, { useEffect, useState } from 'react';

interface TopLoadingBarProps {
  isLoading: boolean;
  progress?: number;
}

export const TopLoadingBar: React.FC<TopLoadingBarProps> = ({ isLoading, progress: customProgress }) => {
  const [internalProgress, setInternalProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let interval: any;
    let timeout: any;

    if (isLoading) {
      setVisible(true);
      setInternalProgress(25);

      interval = setInterval(() => {
        setInternalProgress((prev) => {
          if (prev >= 88) return prev;
          if (prev >= 60) return prev + 3;
          return prev + 8;
        });
      }, 180);
    } else {
      setInternalProgress(100);
      timeout = setTimeout(() => {
        setVisible(false);
        setInternalProgress(0);
      }, 350);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [isLoading]);

  const displayProgress = customProgress !== undefined ? customProgress : internalProgress;

  if (!visible && !isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-[3px] bg-transparent overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-500 relative shadow-[0_0_12px_rgba(244,63,94,0.9)]"
        style={{
          width: `${displayProgress}%`,
          opacity: visible ? 1 : 0,
          transition: displayProgress === 100 ? 'width 200ms ease-out, opacity 300ms 200ms' : 'width 300ms ease-out',
        }}
      >
        <div className="absolute top-0 right-0 bottom-0 w-8 bg-white/80 blur-[2px] shadow-[0_0_10px_#fff]" />
      </div>
    </div>
  );
};
