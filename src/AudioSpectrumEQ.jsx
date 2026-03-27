import React, { useEffect, useRef, useState } from 'react';

export default function AudioSpectrumEQ({ audioRef, color = '#6366f1', barCount = 32 }) {
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const analyserRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Watch the actual source URL so it resets when the song changes
  const currentSrc = audioRef?.current?.src;

  useEffect(() => {
    const initAudio = async () => {
      if (!audioRef?.current || isInitialized) return;

      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }

        // 1. FORCE THE BROWSER TO WAKE UP
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
          console.log("AudioContext forcibly woken up! State:", audioContextRef.current.state);
        }

        if (!analyserRef.current) {
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 64; 
        }

        // 1. Smooth out the drop. (0.0 is jittery, 0.99 is super sluggish)
        analyserRef.current.smoothingTimeConstant = 0.85; 
          
        // 2. Adjust sensitivity. This ignores quiet static and gives the peaks more headroom.
        // Default is usually -100 to -30. Widening it requires louder sounds to peak the bars.
        analyserRef.current.minDecibels = -90;
        analyserRef.current.maxDecibels = -10;

        if (!sourceNodeRef.current) {
          sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
          sourceNodeRef.current.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
        }

        setIsInitialized(true);
        startAnimation();
      } catch (error) {
        console.error("Web Audio API failed to start:", error);
      }
    };

    const audioElement = audioRef?.current;
    if (audioElement) {
      audioElement.addEventListener('play', initAudio);
      if (!audioElement.paused) initAudio(); 
    }

    return () => {
      if (audioElement) audioElement.removeEventListener('play', initAudio);
      cancelAnimationFrame(animationRef.current);
    };
  }, [audioRef, isInitialized, currentSrc]);

  const startAnimation = () => {
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const animate = () => {
      // 2. SAFETY CHECK: Prevent the loop from crashing if React unmounts the component
      if (!containerRef.current || !analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      
      const bars = containerRef.current.children;

      for (let i = 0; i < barCount; i++) {
        // Offset by +1 or +2 to skip the constant sub-bass mud
        const dataIndex = Math.floor(i * (dataArray.length / barCount)) + 1; 
        
        // Safety check to ensure we don't read past the end of the array
        const safeIndex = Math.min(dataIndex, dataArray.length - 1);
        const value = dataArray[safeIndex]; 
        
        // Tame the multiplier. Instead of * 100, we use * 85. 
        // This means a maximum volume of 255 will only push the bar to 85% height, leaving some breathing room.
        const heightPercent = Math.max(10, (value / 255) * 85); 
        
        if (bars[i]) {
          bars[i].style.height = `${heightPercent}%`;
        }
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
  };

  return (
    <div ref={containerRef} className="w-full h-full flex items-end justify-between gap-[2px]">
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm transition-all duration-[50ms] ease-linear origin-bottom"
          style={{ backgroundColor: color, height: '10%' }}
        />
      ))}
    </div>
  );
}