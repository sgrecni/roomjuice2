import React, { useEffect, useRef } from 'react';
import { useStore } from './store';

export default function AudioSpectrumEQ({ audioRef, color = "#6366f1", barCount = 40 }) {
  const isPlaying = useStore(state => state.isPlaying);

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

    // 🚨 OPTION 2: The Canvas Gravity Memory Array
    // This remembers where every bar was sitting on the exact previous frame
    let previousHeights = new Array(barCount).fill(0);

    const draw = () => {
      // don't draw if paused AND all bars have fallen to the floor
      if (!isPlaying && previousHeights.every(h => h <= 2)) {
        return;
      }

      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = color;

      const barWidth = canvas.width / barCount;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * (bufferLength * 0.75)); 
        const barValue = dataArray[dataIndex]; 
        const percent = barValue / 255;
        
        // This is where the hardware says the bar SHOULD be
        const targetHeight = Math.max(2, percent * canvas.height);

        // 🚨 THE GRAVITY MATH
        if (targetHeight < previousHeights[i]) {
          // If the music suddenly gets quiet, don't snap the bar down!
          // Only let it fall by exactly 3 pixels per frame. 
          // (Tweak this number: 1 is very slow, 5 is fast)
          previousHeights[i] = Math.max(2, previousHeights[i] - 2);
        } else {
          // If the music gets loud, let it snap up instantly!
          previousHeights[i] = targetHeight;
        }

        const x = i * barWidth;
        const y = canvas.height - previousHeights[i]; // Use the gravity height

        ctx.fillRect(x, y, barWidth - 2, previousHeights[i]);
      }
    };

    draw(); 

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [audioRef, color, barCount]);

  return (
    <canvas 
      ref={canvasRef} 
      width="800" 
      height="200" 
      className="w-full h-full drop-shadow-md" 
    />
  );
}