import React, { useEffect, useRef } from 'react';

// TRUE SINGLETONS
let globalAudioContext = null;
let globalAnalyserNode = null;

export default function AudioSpectrumEQ({ audioRef, color = '#6366f1', barCount = 32 }) {
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const isDrawing = useRef(true); 

  useEffect(() => {
    const audioElement = audioRef?.current;
    if (!audioElement) return;

    const initAudioEngine = () => {
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

        // Attach the pipes synchronously
        if (!audioElement._sourceNode) {
          audioElement._sourceNode = globalAudioContext.createMediaElementSource(audioElement);
        }
        audioElement._sourceNode.connect(globalAnalyserNode);

        // Wake it up
        if (globalAudioContext.state === 'suspended') {
          globalAudioContext.resume().catch(e => console.warn("Resume blocked:", e));
        }

        isDrawing.current = true;
        startAnimation();
      } catch (error) {
        console.error("Audio engine wiring error", error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isDrawing.current = false;
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      } else {
        isDrawing.current = true;
        if (audioElement && !audioElement.paused) {
          startAnimation();
        }
      }
    };

    // =========================================
    // LISTEN FOR THE CUSTOM EVENT
    // =========================================
    audioElement.addEventListener('wire-eq-now', initAudioEngine);
    
    // Keep the native play fallback just in case the OS triggers playback natively
    audioElement.addEventListener('play', initAudioEngine); 

    if (!audioElement.paused) initAudioEngine(); 

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isDrawing.current = false;
      cancelAnimationFrame(animationRef.current);
      
      if (audioElement) {
        audioElement.removeEventListener('wire-eq-now', initAudioEngine);
        audioElement.removeEventListener('play', initAudioEngine);
        if (audioElement._sourceNode) {
          audioElement._sourceNode.disconnect();
        }
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [audioRef]);

  const startAnimation = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    const dataArray = new Uint8Array(globalAnalyserNode.frequencyBinCount);

    const animate = () => {
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