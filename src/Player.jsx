import React, { useEffect, useRef, useState } from 'react';
import { useStore, isAppleMobile } from './store';

export default function Player({ audioRef }) {
  const { config, playlist, currentIndex, isPlaying, togglePlay, next, previous, play, pause } = useStore();
  
  // Local state for the progress bar and timers
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  //  use this key to force React to DESTROY and REBUILD the video tag
  // from scratch whenever the EQ setting changes.
  const [playerKey, setPlayerKey] = useState(Date.now());

  const timeSnapshotRef = useRef(0);
  const wasPlayingSnapshotRef = useRef(false);

  const currentSong = playlist[currentIndex];
  const isApple = isAppleMobile();

  const streamingSrc = currentSong
  ? `${config.streamingUrl}play.php?file=${currentSong.url}`
  : '';

  const commonMediaProps = {
    ref: audioRef,
    src: streamingSrc, // Your existing stream URL logic
    crossOrigin: "use-credentials",
    onTimeUpdate: (e) => setCurrentTime(e.target.currentTime),
    onLoadedMetadata: (e) => setDuration(e.target.duration),
    onPlay: play,
    onPause: pause,   // Sync store if paused natively
    onEnded: next,
    onError: (e) => {
      console.warn("Media Error (likely hibernation or network drop):", e.target.error);
      pause(); // Force UI to pause
      // Optional: You could trigger a playerKey change here to force a remount
      // setPlayerKey(Date.now()); 
    },
    onWaiting: () => {
      // The browser is trying to play but the buffer is empty.
      console.info("Waiting for data...");
    },
    style: { display: 'none', width: 0, height: 0 }
  };

  // THE DESTRUCTION TRIGGER
  useEffect(() => {
    // Before we destroy the element, grab its final state
    if (audioRef.current) {
      timeSnapshotRef.current = audioRef.current.currentTime;
      wasPlayingSnapshotRef.current = isPlaying;
    }
    // Now trigger the destruction
    setPlayerKey(Date.now());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.isEqEnabled]); // Only run when EQ toggles

  // THE REBIRTH INJECTION
  useEffect(() => {
    // This runs immediately after React mounts the NEW audio element
    // triggered by the new playerKey.
    if (audioRef.current && timeSnapshotRef.current > 0) {
      // Restore the exact timestamp
      audioRef.current.currentTime = timeSnapshotRef.current;

      // If it was playing before we destroyed it, force it to play again
      if (wasPlayingSnapshotRef.current) {
        audioRef.current.play().catch(error => {
           console.warn("Baton handoff play blocked:", error);
           pause(); // Sync store if the browser rejected the rebirth autoplay
        });
      }

      // Clear the snapshot so normal track changes don't inherit this time
      timeSnapshotRef.current = 0;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerKey]); // Only run when the key (and thus the element) changes

  useEffect(() => {
    if (audioRef.current) {
      // Ensure it's a valid number. If not, default to 0.8.
      // Math.max/min clamps it perfectly between 0.0 and 1.0 to prevent API crashes.
      const safeVolume = Number.isFinite(config.volume) ? config.volume : 0.8;
      audioRef.current.volume = Math.max(0, Math.min(1, safeVolume));
    }
  }, [config.volume, audioRef]);

  // React to Play/Pause state changes
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            if (error.name === 'AbortError') return; // Normal during track skip

            console.warn("Play failed (Hibernation/Network?):", error);
            pause(); // Sync the UI back to paused

            // If it's a network error from waking up, force the browser to re-fetch the src
            if (error.name === 'NotSupportedError' || error.message.includes('network')) {
               audioRef.current.load(); 
            }
          });
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentIndex, playlist, streamingSrc, audioRef, togglePlay]);

  // =========================================
  // KEYBOARD SHORTCUTS (Space, Left, Right)
  // =========================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 1. THE SEARCH BAR TRAP: Ignore keystrokes if the user is typing in an input field
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
      }

      // 2. Map the keys to your Zustand store functions
      switch (e.code) {
        case 'Space':
          e.preventDefault(); // Prevents the browser from scrolling down the page!
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          previous();
          break;
        case 'ArrowRight':
          e.preventDefault();
          next();
          break;
        default:
          break;
      }
    };

    // Attach the listener to the whole window
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup function so we don't cause memory leaks if the component unmounts
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, previous, next]);

  // =========================================
  // OS NATIVE MEDIA CONTROLS (Media Session API)
  // =========================================
  useEffect(() => {
    // 1. Check if the browser supports the API
    if ('mediaSession' in navigator) {
      
      // 2. Send the "Now Playing" text to the OS (Windows/Mac volume popup)
      if (currentSong) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentSong.title || "Unknown Track",
          artist: currentSong.artist || "Unknown Artist",
          album: "Local Library"
        });
      }

      navigator.mediaSession.setActionHandler('play', play);
      navigator.mediaSession.setActionHandler('pause', pause);
      navigator.mediaSession.setActionHandler('previoustrack', previous);
      navigator.mediaSession.setActionHandler('nexttrack', next);
    }
  }, [currentSong, isPlaying, togglePlay, previous, next]);

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
      <div className="p-8 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-2xl shadow-xl mb-6 flex flex-col items-center justify-center min-h-[220px] border border-slate-200 dark:border-slate-800 transition-colors duration-300">
        <svg className="w-12 h-12 mb-3 opacity-50" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
        <p className="text-sm font-medium tracking-wide uppercase">No music queued</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded-2xl shadow-xl mb-6 flex flex-col w-full border border-slate-200 dark:border-slate-800 transition-colors duration-300">
      
      {/* Serve Video to Apple, Audio to Everyone Else */}
      {isApple ? (
        <span>
          video
        <video
          key={`apple-vid-${playerKey}`}
          playsInline
          webkit-playsinline="true"
          {...commonMediaProps}
        />
        </span>
      ) : (
        <span>
          audio
        <audio
          key={`android-aud-${playerKey}`}
          {...commonMediaProps}
        />
        </span>
      )}

      {/* Now Playing Header */}
      <div className="mb-6 text-center">
        <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-1">Now Playing</p>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 truncate w-full px-4" title={currentSong?.title}>
          {currentSong?.title || "Unknown Track"}
        </h2>
      </div>

      {/* Progress Slider & Timestamps */}
      <div className="w-full flex items-center gap-4 mb-2">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono w-10 text-right">
          {formatTime(currentTime)}
        </span>
        
        <input 
          type="range" 
          min="0" 
          max={duration || 0} 
          value={currentTime} 
          onChange={handleProgressChange}
          className="flex-grow h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-all"
        />
        
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono w-10 text-left">
          {formatTime(duration)}
        </span>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-6 mt-4">
        
        {/* Previous Button */}
        <button 
          onClick={previous}
          className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          aria-label="Previous track"
        >
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        {/* Play/Pause Button */}
        <button 
          onClick={togglePlay}
          className="p-4 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg hover:shadow-indigo-500/50 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
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
          className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
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