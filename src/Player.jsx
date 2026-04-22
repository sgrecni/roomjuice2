import React, { useEffect, useRef, useState } from 'react';
import { useStore, isAppleMobile } from './store';

export default function Player({ audioRef }) {
  const { 
    config, playlist, currentIndex, isPlaying, togglePlay, next, previous, play, pause,
    playerKey, triggerPlayerReset, savedTime, setSavedTime
  } = useStore();

  const prevEqEnabled = useRef(config.isEqEnabled);

  const [audioKey, setAudioKey] = useState(0); 
  const recoveryTimeRef = useRef(0); // Safely holds the timestamp during DOM destruction

  // Local state for the progress bar and timers
  const initialTime = Number(localStorage.getItem('rj_saved_time')) || 0;
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const timeSnapshotRef = useRef(0);
  const wasPlayingSnapshotRef = useRef(false);

  const currentSong = playlist[currentIndex];
  const isApple = isAppleMobile();

  const streamingSrc = currentSong
  ? `${config.streamingUrl}play.php?file=${currentSong.url}`
  : '';

  const handleTrackEnded = () => {
    // Calculate if there actually is a next song
    const nextIndex = currentIndex + 1;
    if (nextIndex >= playlist.length) {
      pause(); // End of the line, let the phone sleep!
      return;
    }

    // Wipe the song position
    localStorage.removeItem('rj_saved_time');

    // let Zustand and React handle the handoff!
    // This updates the currentSong, waking up the SRC useEffect.
    next();
  };

  // =========================================
  // AGGRESSIVE NETWORK RECOVERY HANDLER
  // =========================================
  const handleMediaError = (e) => {
    const error = e.target.error;
    console.warn("Media Error (likely hibernation or network drop):", error);

    // Error code 3 is DECODE (corrupt buffer), 4 is SRC_NOT_SUPPORTED (dead network socket)
    if (error && (error.code === 3 || error.code === 4)) {
      console.info("Android killed the socket. Initiating aggressive recovery...");

      pause(); // Sync the UI

      if (audioRef.current) {
        // Save the URL but strip off any old retry tags
        let currentSrc = audioRef.current.src;
        currentSrc = currentSrc.split('&retry=')[0];

        // Violently flush the broken audio buffer
        audioRef.current.removeAttribute('src');
        audioRef.current.load();

        // Wait 500ms for Android to release its lock on the network thread
        setTimeout(() => {
          if (audioRef.current) {
            // The cache buster fools the OS network throttle
            const cacheBuster = `&retry=${Date.now()}`;
            audioRef.current.src = currentSrc + cacheBuster;

            audioRef.current.load();

            // Force play and resync the Zustand store
            audioRef.current.play()
              .then(() => play())
              .catch(err => console.error("Aggressive recovery blocked by OS:", err));
          }
        }, 500);
      }
    } else {
      // Normal error fallback for all other issues
      pause();
    }
  };

  const commonMediaProps = {
    // Remove the `key: audioKey` line entirely from here
    ref: audioRef,
    preload: "auto",
    crossOrigin: "use-credentials",
    onTimeUpdate: (e) => setCurrentTime(e.target.currentTime),
    onLoadedMetadata: (e) => setDuration(e.target.duration),
    onPlay: play,
    onPause: pause,
    onEnded: handleTrackEnded, 
    onError: handleMediaError, 

    onTimeUpdate: (e) => {
      const time = e.target.currentTime;
      setCurrentTime(time);
      
      // Save to LocalStorage once every 5 seconds so the time is saved after hitting F5
      if (Math.floor(time) % 5 === 0) {
        localStorage.setItem('rj_saved_time', time);
      }
    },

    onLoadedData: (e) => {
      const audioNode = e.target;
      // Just handle the time restoration here!
      if (savedTime > 0) {
        audioNode.currentTime = savedTime;
        setSavedTime(0); 
        console.info("Player remounted and time restored. Ready for manual resume.");
      } else if (initialTime > 0) {
        audioNode.currentTime = initialTime; // F5 LocalStorage recovery
      }
    },
    
    style: { display: 'none', width: 0, height: 0 }
  };

  // =========================================
  // HARDWARE AUDIO GRAPH INITIALIZATION
  // =========================================
  useEffect(() => {
    const audioNode = audioRef.current;
    
    // Wire it up the exact millisecond the DOM node mounts
    if (audioNode && !audioNode.dataset.graphWired) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();

        const source = ctx.createMediaElementSource(audioNode);
        source.connect(analyser);
        analyser.connect(ctx.destination);

        // Smuggle the instances
        audioNode.rjAnalyser = analyser;
        audioNode.rjAudioCtx = ctx; 
        audioNode.dataset.graphWired = "true";
        
        console.info("Web Audio Graph built and ready!");
      } catch (err) {
        console.warn("Failed to wire hardware graph:", err);
      }
    }
  }, [audioRef, playlist.length, playerKey]);

  // =========================================
  // SRC MANAGEMENT (Fixed for Next/Prev)
  // =========================================
  useEffect(() => {
    if (audioRef.current && currentSong) {
      const currentUrl = audioRef.current.src;
      const newUrl = `${config.streamingUrl}play.php?file=${currentSong.url}&rescue=${playerKey}`;

      // 🚨 THE FIX: Combine both variables into the string we expect to see
      const expectedPath = `file=${currentSong.url}&rescue=${playerKey}`;

      // Update if it's blank, or if the song OR the rescue key changed!
      if (!currentUrl || !currentUrl.includes(expectedPath)) {
        audioRef.current.src = newUrl;

        if (isPlaying && recoveryTimeRef.current === 0) {
          audioRef.current.play().catch(e => console.warn(e));
        }
      }
    }
  }, [currentSong, isPlaying, config.streamingUrl, playerKey]);

  // =========================================
  // EQ TOGGLE HANDLER (Strict-Mode Proof)
  // =========================================
  useEffect(() => {
    // 🚨 THE FIX: If the toggle value hasn't ACTUALLY changed, stand down!
    if (prevEqEnabled.current === config.isEqEnabled) {
      return;
    }

    // Update the tracker so we don't accidentally fire again
    prevEqEnabled.current = config.isEqEnabled;

    // 1. Throw the timestamp onto the Zustand life-raft
    if (audioRef.current) {
      useStore.getState().setSavedTime(audioRef.current.currentTime);
    }
    
    // 2. Pull the global assassination trigger to rebuild the DOM and the EQ
    triggerPlayerReset();
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.isEqEnabled]);

  useEffect(() => {
    if (audioRef.current && timeSnapshotRef.current > 0) {
      audioRef.current.currentTime = timeSnapshotRef.current;
      if (wasPlayingSnapshotRef.current) {
        audioRef.current.play().catch(error => pause());
      }
      timeSnapshotRef.current = 0;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerKey]); // Only run when the key (and thus the element) changes

  useEffect(() => {
    if (audioRef.current) {
      // Math.max/min clamps it perfectly between 0.0 and 1.0 to prevent API crashes.
      const safeVolume = Number.isFinite(config.volume) ? config.volume : 0.8;
      audioRef.current.volume = Math.max(0, Math.min(1, safeVolume));
    }
  }, [config.volume, audioRef]);

  // React to Play/Pause state changes
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        
        // 🚨 THE WAKEUP CALL: Browsers suspend audio contexts until the user clicks.
        // We must wake it up before we hit play!
        if (audioRef.current.rjAudioCtx && audioRef.current.rjAudioCtx.state === 'suspended') {
            audioRef.current.rjAudioCtx.resume();
        }

        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            if (error.name === 'AbortError') return; 
            pause(); 
            if (error.name === 'NotSupportedError' || error.message.includes('network')) {
               audioRef.current.load(); 
            }
          });
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentIndex, playlist, streamingSrc, audioRef, togglePlay, pause]);

  // =========================================
  // AUDIO PIPELINE HEARTBEAT MONITOR
  // =========================================
  useEffect(() => {
    if (!isPlaying) return;

    let lastTime = audioRef.current?.currentTime || 0;
    let freezeCount = 0;

    const heartbeat = setInterval(() => {
      const audio = audioRef.current;
      if (!audio) return;

      const currentTime = audio.currentTime;
      
      const isBuffering = audio.readyState < 3;
      
      // 🚨 THE FIX: Ask Chrome if it is actively waiting for a timestamp jump
      const isSeeking = audio.seeking; 

      // Symptom: Clock frozen, NOT paused, NOT buffering, AND NOT seeking.
      if (currentTime === lastTime && !audio.paused && !isBuffering && !isSeeking) {
        freezeCount++;
        
        if (freezeCount >= 3) {
          console.warn("Hardware pipeline wedged! Halting playback and resetting DOM...");
          
          useStore.getState().setSavedTime(currentTime);
          pause(); 
          triggerPlayerReset();
          
          freezeCount = 0;
        }
      } else {
        freezeCount = 0; 
      }

      lastTime = currentTime;
    }, 1000); 

    return () => clearInterval(heartbeat);
  }, [isPlaying, pause]);

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
  // THE CONTROLS: Only wire these up once (or if the Zustand functions change)
  useEffect(() => {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', play);
        navigator.mediaSession.setActionHandler('pause', pause);
        navigator.mediaSession.setActionHandler('previoustrack', previous);
        navigator.mediaSession.setActionHandler('nexttrack', next);
      } catch (error) {
        console.warn("Media Session Action Handlers not supported:", error);
      }
    }
  }, [play, pause, previous, next]);

  // THE METADATA: Only update this when the song actually changes
  useEffect(() => {
    if ('mediaSession' in navigator && currentSong) {
      
      //const absoluteLogoUrl = new URL('rj_logo.png', document.baseURI).href;

      // Force the OS to redraw the notification with the new track info
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title || "Unknown Track",
        artist: currentSong.artist || "Unknown Artist",
        album: "Local Library",
        artwork: [
          {
            // src: 'https://dummyimage.com/512x512/6366f1/ffffff.png&text=🎵', // A simple indigo placeholder
            // sizes: '512x512',
            src: `${window.location.origin}/rj/rj_logo.png`,
            sizes: '1024x1024', // The OS will scale it automatically
            type: 'image/png'
          }
        ]
      });
    }
  }, [currentSong]);

  // THE PROGRESS BAR: Sync the position to the OS lock screen
  useEffect(() => {
    if ('mediaSession' in navigator && audioRef.current && duration > 0) {
      try {
        // Tell the OS exactly where we are in the song
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: audioRef.current.playbackRate,
          position: currentTime
        });
      } catch (e) {
        // Fail silently on older browsers that don't support position state
      }
    }
  // Only update the OS every few seconds to save battery, or when duration changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, Math.floor(currentTime / 5)]);

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
          <center style={{fontSize: 10}}>video</center>
        <video
          key={`apple-vid-${playerKey}`}
          playsInline
          webkit-playsinline="true"
          {...commonMediaProps}
        />
        </span>
      ) : (
        <span>
          
        <audio
          key={`android-aud-${playerKey}`}
          {...commonMediaProps}
        />
        </span>
      )}

      {/* Now Playing Header */}
      <div className="mb-6 text-center">
        <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-1">
          Now Playing
          {isApple ? (<> (video) </>):(<> (audio) </>)}
        </p>
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