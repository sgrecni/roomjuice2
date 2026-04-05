import React, { useEffect, useRef } from 'react';

// ==========================================
// TRUE SINGLETONS
// ==========================================
let globalAudioContext = null;
let globalAnalyserNode = null;
let globalSourceNode = null;

export default function AudioSpectrumEQ({ audioRef, color = '#6366f1', barCount = 32 }) {
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  
  // Use a ref to act as a traffic light for the animation loop
  const isDrawing = useRef(true); 

  useEffect(() => {
    const initAudioEngine = async () => {
      if (!audioRef?.current) return;

      try {
        if (!globalAudioContext) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          globalAudioContext = new AudioContext();
          
          globalAnalyserNode = globalAudioContext.createAnalyser();
          globalAnalyserNode.fftSize = 64;
          globalAnalyserNode.smoothingTimeConstant = 0.85;
          globalAnalyserNode.minDecibels = -90;
          globalAnalyserNode.maxDecibels = -10;
          
          globalAnalyserNode.connect(globalAudioContext.destination);
        }

        if (globalAudioContext.state === 'suspended') {
          await globalAudioContext.resume();
        }

        if (!audioRef.current._isPluggedIntoEQ) {
          globalSourceNode = globalAudioContext.createMediaElementSource(audioRef.current);
          globalSourceNode.connect(globalAnalyserNode);
          audioRef.current._isPluggedIntoEQ = true;
        }

        isDrawing.current = true;
        startAnimation();
      } catch (error) {
        console.error("Audio engine init error", error);
      }
    };

    // ==========================================
    // THE NEW VISIBILITY TRAFFIC COP
    // ==========================================
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App went to background: ONLY stop the math and rendering to save battery.
        // DO NOT unplug the audio nodes, or the video element will freeze!
        isDrawing.current = false;
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      } else {
        // App came back to foreground: Turn the light green and resume drawing
        isDrawing.current = true;
        const audioElement = audioRef?.current;
        if (audioElement && !audioElement.paused) {
          startAnimation();
        }
      }
    };

    const audioElement = audioRef?.current;
    
    if (audioElement) {
      audioElement.addEventListener('play', initAudioEngine);
      if (!audioElement.paused) initAudioEngine(); 
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // 1. Stop animations and listeners
      isDrawing.current = false;
      cancelAnimationFrame(animationRef.current);
      if (audioElement) audioElement.removeEventListener('play', initAudioEngine);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // 2. Destructive cleanup ONLY happens when the user explicitly unmounts the EQ in settings
      if (globalSourceNode) {
        globalSourceNode.disconnect();
        globalSourceNode = null;
      }
      if (globalAnalyserNode) {
        globalAnalyserNode.disconnect();
        globalAnalyserNode = null;
      }
      if (globalAudioContext && globalAudioContext.state !== 'closed') {
        globalAudioContext.close();
        globalAudioContext = null;
      }
      if (audioElement) {
        delete audioElement._isPluggedIntoEQ;
      }
    };
  }, [audioRef]);

  const startAnimation = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    const dataArray = new Uint8Array(globalAnalyserNode.frequencyBinCount);

    const animate = () => {
      // If the screen is locked, kill the loop instantly
      if (!isDrawing.current || !containerRef.current || !globalAnalyserNode) return;

      globalAnalyserNode.getByteFrequencyData(dataArray);
      const bars = containerRef.current.children;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor(i * (dataArray.length / barCount)) + 1; 
        const safeIndex = Math.min(dataIndex, dataArray.length - 1);
        const value = dataArray[safeIndex]; 
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