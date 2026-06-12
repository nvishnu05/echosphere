import React, { useEffect, useState } from 'react';

interface VoiceWaveformProps {
  state: 'idle' | 'listening' | 'speaking';
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({ state }) => {
  const [barHeights, setBarHeights] = useState<number[]>([15, 15, 15, 15, 15, 15, 15, 15]);

  useEffect(() => {
    let intervalId: any;

    if (state === 'idle') {
      // Static flat bars when idle (no movement)
      setBarHeights(Array.from({ length: 10 }, () => 6));
    } else if (state === 'listening') {
      // Dynamic, fast dancing soundwave (User talking)
      intervalId = setInterval(() => {
        setBarHeights(
          Array.from({ length: 12 }, () => Math.floor(Math.random() * 32) + 8)
        );
      }, 80);
    } else if (state === 'speaking') {
      // Conversational flow waves (AI talking)
      let step = 0;
      intervalId = setInterval(() => {
        step += 0.25;
        setBarHeights(
          Array.from({ length: 12 }, (_, i) => {
            const multi = i % 2 === 0 ? 0.7 : 1.2;
            const height = 18 + Math.sin(step + i) * 18 * multi;
            return Math.max(6, height);
          })
        );
      }, 70);
    }

    return () => clearInterval(intervalId);
  }, [state]);

  return (
    <div className="flex items-center justify-center gap-1.5 h-16 px-4">
      {barHeights.map((height, index) => {
        // Color mapping based on state for standard premium look
        let colorClass = 'bg-zinc-600/70'; // Idle: neutral zinc
        if (state === 'listening') {
          // Listening: vibrant green/cyan gradient feel
          colorClass = index % 2 === 0 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.5)]';
        } else if (state === 'speaking') {
          // Speaking: Gemini blue/violet gradient feel
          colorClass = index % 3 === 0 
            ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]' 
            : index % 3 === 1 
              ? 'bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.5)]' 
              : 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]';
        }

        return (
          <div
            key={index}
            className={`w-1 rounded-full sound-bar transition-all duration-75 ${colorClass}`}
            style={{
              height: `${height}px`,
            }}
          />
        );
      })}
    </div>
  );
};
