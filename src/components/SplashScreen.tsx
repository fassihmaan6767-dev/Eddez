import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [loading, setLoading] = useState(false);
  const [contentVisible, setContentVisible] = useState(true);
  const [startExit, setStartExit] = useState(false);

  const SLICE_COUNT = 5; 

  useEffect(() => {
    const t1 = setTimeout(() => {
      setLoading(true);
    }, 100);

    const t2 = setTimeout(() => {
      setContentVisible(false);
    }, 2000);

    const t3 = setTimeout(() => {
      setStartExit(true);
    }, 2600);

    const t4 = setTimeout(() => {
      onFinish();
    }, 3800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[100] flex pointer-events-none">
      {[...Array(SLICE_COUNT)].map((_, i) => (
        <div 
          key={i}
          className="h-full bg-black transition-transform duration-1000 ease-[cubic-bezier(0.76,0,0.24,1)]"
          style={{
            width: `${100 / SLICE_COUNT}%`,
            transform: startExit ? 'translateY(-100%)' : 'translateY(0%)',
            transitionDelay: `${i * 100}ms`
          }}
        />
      ))}

      <div 
        className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-700 ${
          contentVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="w-28 h-28 md:w-32 md:h-32 mb-8 relative">
           <img 
             src="https://raw.githubusercontent.com/pakgraphicsedupk-cpu/agent-pic/673c0bfcb3b2a057f5ac966ec8fc101b85f039e0/yalcilpmgtuc0cyo7fee.webp" 
             alt="Eddez Logo" 
             className="w-full h-full object-cover rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.2)] ring-1 ring-white/20"
           />
        </div>

        <div className="w-48 md:w-64 h-[4px] bg-white/10 rounded-full overflow-hidden mb-5 relative">
            <div 
                className="absolute left-0 top-0 bottom-0 bg-white shadow-[0_0_20px_rgba(255,255,255,0.9)] transition-all duration-[2000ms] ease-out rounded-full"
                style={{ width: loading ? '100%' : '0%' }}
            ></div>
        </div>

        <div className="text-white font-bold tracking-[0.5em] text-sm md:text-base drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] z-10">
            EDDEZ
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;