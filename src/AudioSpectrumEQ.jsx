import React, { useEffect, useRef } from 'react';
import { useStore } from './store'; // 🚨 Your store import!

export default function AudioSpectrumEQ({ audioRef, color = "#6366f1", barCount = 40, useGradient = false }) {
  const isPlaying = useStore(state => state.isPlaying); // 🚨 Your state hook!
  
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioRef.current) return;
    
    const ctx = canvas.getContext('2d');
    const analyser = audioRef.current.rjAnalyser;

    if (!analyser) {
      ctx.fillStyle = color;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = canvas.width / barCount;
      for (let i = 0; i < barCount; i++) {
        ctx.fillRect(i * barWidth, canvas.height / 2, barWidth - 2, 2);
      }
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let previousHeights = new Array(barCount).fill(0); 

    // =========================================
    // THE DRAW LOOP
    // =========================================
    const draw = () => {
      
      // 🚨 YOUR CPU MICRO-OPTIMIZATION
      // If paused AND all bars have fallen to the floor, stop asking for animation frames!
      if (!isPlaying && previousHeights.every(h => h <= 2)) {
        return; 
      }

      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // The Heat Map Gradient Logic
      if (useGradient) {
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0.0, color);       
        gradient.addColorStop(0.25, "#facc15");   // 1. Swapped to a brighter, purer Yellow
        gradient.addColorStop(0.42, "#f59e0b");   // 2. Added an Amber bridge to smooth the math!
        gradient.addColorStop(0.60, "#ea580c");   // 3. Swapped to a slightly deeper Orange
        
        gradient.addColorStop(0.9, "#ef4444");    // Red at the peak
        ctx.fillStyle = gradient; 
      } else {
        ctx.fillStyle = color;    
      }

      const barWidth = canvas.width / barCount;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * (bufferLength * 0.75)); 
        const barValue = dataArray[dataIndex]; 
        const percent = barValue / 255;
        
        const targetHeight = Math.max(2, percent * canvas.height);

        // The Gravity Math
        if (targetHeight < previousHeights[i]) {
          previousHeights[i] = Math.max(2, previousHeights[i] - 3);
        } else {
          previousHeights[i] = targetHeight;
        }

        const x = i * barWidth;
        const y = canvas.height - previousHeights[i]; 

        ctx.fillRect(x, y, barWidth - 2, previousHeights[i]);
      }
    };

    draw(); 

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [audioRef, color, barCount, useGradient, isPlaying]); // 🚨 Added isPlaying to dependencies!

  return (
    <canvas 
      ref={canvasRef} 
      width="800" 
      height="200" 
      className="w-full h-full drop-shadow-md" 
    />
  );
}