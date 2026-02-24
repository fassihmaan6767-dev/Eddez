
import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [loading, setLoading] = useState(false); // Triggers bar filling
  const [contentVisible, setContentVisible] = useState(true); // Triggers logo/text fade out
  const [startExit, setStartExit] = useState(false); // Triggers vertical bars moving up

  // Number of vertical slices for the split effect
  const SLICE_COUNT = 5; 

  useEffect(() => {
    // 1. Start Loading Bar immediately
    const t1 = setTimeout(() => {
      setLoading(true);
    }, 100);

    // 2. Loading Complete (Bar full) -> Fade out Content
    const t2 = setTimeout(() => {
      setContentVisible(false);
    }, 2000); // 2s loading time

    // 3. Start Curtain/Slice Exit Animation
    const t3 = setTimeout(() => {
      setStartExit(true);
    }, 2600); // Wait for content fade out

    // 4. Unmount component
    const t4 = setTimeout(() => {
      onFinish();
    }, 3800); // Allow time for slices to move up

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[100] flex pointer-events-none">
      
      {/* BACKGROUND SLICES (The Split Bars) */}
      {/* 
          Updated: Solid Black to hide seams.
          We removed borders and inner shadows so it looks like one solid screen 
          until the animation starts.
      */}
      {[...Array(SLICE_COUNT)].map((_, i) => (
        <div 
          key={i}
          className="h-full bg-black transition-transform duration-1000 ease-[cubic-bezier(0.76,0,0.24,1)]"
          style={{
            width: `${100 / SLICE_COUNT}%`,
            // If exit started, translate UP (-100%). Stagger delay based on index.
            transform: startExit ? 'translateY(-100%)' : 'translateY(0%)',
            transitionDelay: `${i * 100}ms`
          }}
        />
      ))}

      {/* CONTENT LAYER (Logo, Bar, Text) */}
      {/* Positioned absolutely over the slices */}
      <div 
        className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-700 ${
          contentVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        
        {/* LOGO */}
        <div className="w-28 h-28 md:w-32 md:h-32 mb-8 relative">
           <img 
             src="https://raw.githubusercontent.com/pakgraphicsedupk-cpu/agent-pic/673c0bfcb3b2a057f5ac966ec8fc101b85f039e0/yalcilpmgtuc0cyo7fee.webp" 
             alt="Eddez Logo" 
             className="w-full h-full object-cover rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.2)] ring-1 ring-white/20"
           />
        </div>

        {/* PROGRESS BAR CONTAINER */}
        <div className="w-48 md:w-64 h-[4px] bg-white/10 rounded-full overflow-hidden mb-5 relative">
            {/* FILLING BAR */}
            <div 
                className="absolute left-0 top-0 bottom-0 bg-white shadow-[0_0_20px_rgba(255,255,255,0.9)] transition-all duration-[2000ms] ease-out rounded-full"
                style={{ width: loading ? '100%' : '0%' }}
            ></div>
        </div>

        {/* TEXT */}
        <div className="text-white font-bold tracking-[0.5em] text-sm md:text-base drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] z-10">
            EDDEZ
        </div>

      </div>
    </div>
  );
};

export default SplashScreen;
