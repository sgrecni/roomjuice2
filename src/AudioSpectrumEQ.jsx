import React, { useEffect, useRef } from 'react';

// ==========================================
// TRUE SINGLETONS: Kept strictly OUTSIDE the React component.
// This prevents React from spawning multiple audio engines in the 
// background when the component unmounts/remounts during song changes.
// ==========================================
let globalAudioContext = null;
let globalAnalyserNode = null;
let globalSourceNode = null;

export default function AudioSpectrumEQ({ audioRef, color = '#6366f1', barCount = 32 }) {
  const containerRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const initAudioEngine = async () => {
      if (!audioRef?.current) return;

      try {
        // 1. Initialize the global audio engine only ONCE for the entire app
        if (!globalAudioContext) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          globalAudioContext = new AudioContext();
          
          globalAnalyserNode = globalAudioContext.createAnalyser();
          globalAnalyserNode.fftSize = 64;
          globalAnalyserNode.smoothingTimeConstant = 0.85;
          globalAnalyserNode.minDecibels = -90;
          globalAnalyserNode.maxDecibels = -10;
          
          // Connect the analyser to the speakers permanently
          globalAnalyserNode.connect(globalAudioContext.destination);
        }

        // 2. Wake up the browser's audio engine if suspended
        if (globalAudioContext.state === 'suspended') {
          await globalAudioContext.resume();
        }

        // 3. Connect the audio tag to our global engine
        // We use a custom flag on the DOM element so we never double-plug it.
        if (!audioRef.current._isPluggedIntoEQ) {
          globalSourceNode = globalAudioContext.createMediaElementSource(audioRef.current);
          globalSourceNode.connect(globalAnalyserNode);
          audioRef.current._isPluggedIntoEQ = true;
        }

        startAnimation();
      } catch (error) {
        // If the connection already exists, we just make sure the animation is running
        startAnimation();
      }
    };

    const audioElement = audioRef?.current;
    if (audioElement) {
      audioElement.addEventListener('play', initAudioEngine);
      // If it's already playing when this mounts, initialize immediately
      if (!audioElement.paused) initAudioEngine(); 
    }

    return () => {
      // Cleanup the event listener and stop the animation loop when unmounting, 
      // but leave the global audio nodes safely running.
      if (audioElement) audioElement.removeEventListener('play', initAudioEngine);
      cancelAnimationFrame(animationRef.current);
    };
  }, [audioRef]);

  const startAnimation = () => {
    // Kill any existing animation loops to prevent stuttering
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    
    const dataArray = new Uint8Array(globalAnalyserNode.frequencyBinCount);

    const animate = () => {
      if (!containerRef.current || !globalAnalyserNode) return;

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