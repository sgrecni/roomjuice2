import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useStore } from './store';
import Player from './Player';
import SongPicker from './SongPicker';
import Playlist from './Playlist';
import Settings from './Settings';

export default function App() {
  const { config, updateConfig } = useStore();
  const audioRef = useRef(null);
  
  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Dragging State
  const [dragWidth, setDragWidth] = useState(config.leftWidth);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setDragWidth(config.leftWidth);
  }, [config.leftWidth]);

  const startDragging = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDrag = useCallback((e) => {
    if (!isDragging) return;
    
    const newWidth = e.clientX;
    const minWidth = 320; 
    const maxWidth = window.innerWidth * 0.6; 
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setDragWidth(newWidth);
    }
  }, [isDragging]);

  const stopDragging = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      updateConfig({ leftWidth: dragWidth });
    }
  }, [isDragging, dragWidth, updateConfig]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onDrag);
      window.addEventListener('mouseup', stopDragging);
      document.body.style.cursor = 'col-resize'; 
      document.body.style.userSelect = 'none'; 
    } else {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDragging);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }
    return () => {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDragging);
    };
  }, [isDragging, onDrag, stopDragging]);

  return (
    // The master wrapper controls the global background and text color based on the theme
    <div 
      className={`min-h-screen font-sans pb-32 transition-colors duration-300 ${
        config.theme === 'dark' ? 'dark bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-900'
      }`}
      style={{ '--left-col-width': `${dragWidth}px` }}
    >
      
      {/* Header with Gear Icon */}
      <header className="h-14 sm:h-16 px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center mb-6 shadow-sm sticky top-0 z-40 transition-colors duration-300">
        <div className="w-8"></div> {/* Invisible spacer to keep title centered */}
        
        <h1 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500 tracking-widest uppercase text-center">
          RoomJuice
        </h1>
        
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </header>

      {/* Main Layout */}
      <main className="w-full px-2 sm:px-4 lg:px-8">
        <div className="flex flex-col lg:flex-row items-stretch gap-8 lg:gap-0 relative">
          
          {/* LEFT COLUMN */}
          <div className="w-full lg:w-[var(--left-col-width)] shrink-0 flex flex-col gap-6">
            <Player audioRef={audioRef} />
            <Playlist audioRef={audioRef} />
          </div>

          {/* DRAGGABLE DIVIDER */}
          <div 
            onMouseDown={startDragging}
            className="hidden lg:flex flex-col items-center justify-center w-8 cursor-col-resize shrink-0 group z-10"
          >
            <div className={`w-1 h-full rounded-full transition-colors ${
              isDragging ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700 group-hover:bg-indigo-400'
            }`}></div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="w-full flex-grow min-w-0">
            <SongPicker />
          </div>

        </div>
      </main>

      {/* The Settings Modal */}
      <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

    </div>
  );
}