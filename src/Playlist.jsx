import React from 'react';
import { useStore } from './store';
import AudioSpectrumEQ from './AudioSpectrumEQ'; // 1. Import the visualizer

const FlatlineEQ = ({ color = '#6366f1', barCount = 32 }) => (
  <div className="w-full h-full flex items-end justify-between gap-[2px]">
    {Array.from({ length: barCount }).map((_, i) => (
      <div
        key={`flat-${i}`}
        className="flex-1 rounded-t-sm transition-all duration-[50ms] ease-linear origin-bottom"
        style={{ backgroundColor: color, height: '10%' }} // Fixed at 10%
      />
    ))}
  </div>
);

// 2. Accept audioRef as a prop from the parent that holds the Player
export default function Playlist({ audioRef }) {
  const { playlist, currentIndex, removeSong, playSpecificSong, clearPlaylist,
          config, updateConfig, isPlaying, playerKey } = useStore();
  
  const hidePlayed = config.hidePlayed || false;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl dark:shadow-2xl overflow-hidden mt-6 transition-colors duration-300">
      
      {/* Playlist Header */}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center transition-colors duration-300">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Your Playlist</h3>
        
        {/* Right Side Header Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Violet Toggle Button */}
          {playlist.length > 0 && (
            <button 
              onClick={() => updateConfig({ hidePlayed: !hidePlayed })}
              title="Toggle visibility of finished tracks"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shrink-0 border ${
                hidePlayed 
                  ? 'bg-violet-500 text-white border-violet-500 hover:bg-violet-600 dark:bg-violet-600 dark:hover:bg-violet-500' 
                  : 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/20 hover:bg-violet-500 hover:text-white dark:hover:bg-violet-500 dark:hover:text-white'
              }`}
            >
              Hide Played
            </button>
          )}

          {/* Clear All Button */}
          {playlist.length > 0 && (
            <button 
              onClick={clearPlaylist} 
              className="bg-red-50 dark:bg-red-500/10 hover:bg-red-500 text-red-600 dark:text-red-400 hover:text-white border border-red-200 dark:border-red-500/20 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shrink-0"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Playlist Items */}
      <div className="w-full pb-2">
        {playlist.length === 0 ? (
          <div className="p-10 text-center text-slate-500 dark:text-slate-400 italic text-sm transition-colors duration-300">
            Playlist is empty. Browse to add some music!
          </div>
        ) : (
          <div className="flex flex-col w-full">
            {playlist.map((song, index) => {
              const currentSong = index === currentIndex;
              const isPlayed = index < currentIndex;
              
              if (hidePlayed && isPlayed) {
                return null;
              }
              
              return (
                <div 
                  key={song.id + index} 
                  onClick={() => playSpecificSong(index)}
                  // 3. CRITICAL: Added `relative overflow-hidden` here so the EQ stays inside the bounds
                  className={`relative overflow-hidden cursor-pointer flex items-center justify-between p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800/50 transition-colors group w-full ${
                    currentSong 
                      ? 'bg-indigo-50 dark:bg-indigo-500/10 border-l-4 border-l-indigo-500' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-4 border-l-transparent'
                  }`}
                >
                  
                  {/* 4. THE EQ BACKGROUND: Renders only if this song is actually playing */}
                  {config.isEqEnabled && currentSong && (
                    <div className="absolute inset-0 z-0 pointer-events-none opacity-15 dark:opacity-20">
                      {isPlaying ? (
                        // THE REAL DEAL: Mounts and wires up the Web Audio API safely
                        <AudioSpectrumEQ
                          key={`eq-${playerKey}`}
                          audioRef={audioRef}
                          color="#6366f1"
                          barCount={40}
                        />
                      ) : (
                        // THE VISUAL STAND-IN: Zero CPU usage, zero API risk
                        <FlatlineEQ 
                          color="#6366f1" 
                          barCount={10}
                        />
                      )}
                    </div>
                  )}

                  {/* 5. FOREGROUND WRAPPER: Added `relative z-10` so the text floats above the EQ */}
                  <div className="relative z-10 flex items-center justify-between w-full">
                    <span className={`text-sm sm:text-base font-medium truncate flex-grow min-w-0 pr-4 transition-colors ${
                      currentSong 
                        ? 'text-indigo-600 dark:text-indigo-300' 
                        : 'text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                    }`}>
                      {song.title}
                    </span>
                    
                    <div className="flex items-center shrink-0">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSong(song.id);
                        }} 
                        className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 p-2 transition-colors active:scale-90"
                        title="Remove from playlist"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}