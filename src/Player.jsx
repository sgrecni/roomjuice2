import React, { useRef, useEffect, useState } from 'react';
import { useStore } from './store';

export default function Player() {
  const { playlist, currentIndex, isPlaying, togglePlay, next, previous } = useStore();
  
  // Local state for the progress bar and timers
  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const currentSong = playlist[currentIndex];

  // React to Play/Pause state changes
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Playback prevented:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentIndex, playlist]);

  // Format seconds into MM:SS
  const formatTime = (time) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Handle user dragging the slider
  const handleProgressChange = (e) => {
    const newTime = e.target.value;
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  // If there are no songs, show a nice empty state instead of a broken player
  if (playlist.length === 0) {
    return (
      <div className="p-8 bg-slate-800 text-slate-400 rounded-2xl shadow-xl mb-6 flex flex-col items-center justify-center min-h-[220px] border border-slate-700">
        <svg className="w-12 h-12 mb-3 opacity-50" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
        <p className="text-sm font-medium tracking-wide uppercase">No music queued</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-800 text-white rounded-2xl shadow-2xl mb-6 flex flex-col w-full border border-slate-700">
      
      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef}
        src={currentSong?.url}
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={next} // Automatically skip to next track
        autoPlay={isPlaying}
      />

      {/* Now Playing Header */}
      <div className="mb-6 text-center">
        <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Now Playing</p>
        <h2 className="text-lg font-semibold text-slate-100 truncate w-full px-4" title={currentSong?.title}>
          {currentSong?.title || "Unknown Track"}
        </h2>
      </div>

      {/* Progress Slider & Timestamps */}
      <div className="w-full flex items-center gap-4 mb-2">
        <span className="text-xs text-slate-400 font-mono w-10 text-right">
          {formatTime(currentTime)}
        </span>
        
        <input 
          type="range" 
          min="0" 
          max={duration || 0} 
          value={currentTime} 
          onChange={handleProgressChange}
          className="flex-grow h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all"
        />
        
        <span className="text-xs text-slate-400 font-mono w-10 text-left">
          {formatTime(duration)}
        </span>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-6 mt-4">
        
        {/* Previous Button */}
        <button 
          onClick={previous}
          className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-800"
          aria-label="Previous track"
        >
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        {/* Play/Pause Button */}
        <button 
          onClick={togglePlay}
          className="p-4 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg hover:shadow-indigo-500/50 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-800"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="w-8 h-8 fill-current translate-x-[2px]" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Next Button */}
        <button 
          onClick={next}
          className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-800"
          aria-label="Next track"
        >
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>

      </div>
    </div>
  );
}