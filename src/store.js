import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const defaultConfig = { 
  leftWidth: 400, 
  volume: 0.8, 
  theme: 'dark',
  lastPath: '',
  hidePlayed: false
};

const loadConfig = () => {
  const saved = localStorage.getItem('roomjuice-config');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Merges the parsed save OVER the defaults. 
      // If 'volume' is missing in the save, it keeps the default 0.8.
      return { ...defaultConfig, ...parsed };
    } catch (e) {
      console.error("Failed to parse config", e);
      return defaultConfig;
    }
  }
  return defaultConfig;
};

export const useStore = create(
  persist(
    (set, get) => ({
      // The new configuration object
      config: loadConfig(),

      // Action to update config and automatically persist it
      updateConfig: (newSettings) => set((state) => {
        const updatedConfig = { ...state.config, ...newSettings };
        localStorage.setItem('roomjuice-config', JSON.stringify(updatedConfig));
        return { config: updatedConfig };
      }),

      playlist: [],
      currentIndex: 0,
      isPlaying: false,

      // Add a single song
      addSong: (song) => set((state) => ({ 
        playlist: [...state.playlist, song] 
      })),

      // NEW: Add multiple songs at once (great for folders)
      addSongs: (newSongs) => set((state) => {
        // Ensure every incoming song gets a unique ID for the playlist
        const songsWithIds = newSongs.map(song => ({
          ...song,
          id: crypto.randomUUID()
        }));
        
        return { 
          playlist: [...state.playlist, ...songsWithIds] 
        };
      }),

      // NEW: Wipe the playlist completely
      clearPlaylist: () => set({ 
        playlist: [], 
        currentIndex: 0, 
        isPlaying: false 
      }),

      // Remove a song and intelligently handle the current index
      removeSong: (id) => set((state) => {
        const indexToRemove = state.playlist.findIndex((s) => s.id === id);
        if (indexToRemove === -1) return state;

        const newPlaylist = state.playlist.filter((s) => s.id !== id);
        let newIndex = state.currentIndex;
        let newIsPlaying = state.isPlaying;

        // If we remove a song before the current one, shift the index back
        if (indexToRemove < state.currentIndex) {
          newIndex = state.currentIndex - 1;
        } 
        // If we remove the currently playing song
        else if (indexToRemove === state.currentIndex) {
          if (newPlaylist.length === 0) {
            newIndex = 0;
            newIsPlaying = false;
          } else if (newIndex >= newPlaylist.length) {
            newIndex = 0; // Wrap back to start if it was the last song
            newIsPlaying = false; 
          }
        }

        return { 
          playlist: newPlaylist, 
          currentIndex: newIndex, 
          isPlaying: newIsPlaying 
        };
      }),

      // Playback controls
      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      play: () => set({ isPlaying: true }),
      pause: () => set({ isPlaying: false }),
      previous: () => set((state) => {
        if (state.playlist.length === 0) return state; // Do nothing if playlist is empty
        
        // If we are on the first song, wrap around to the last song. Otherwise, go back one.
        const prevIndex = state.currentIndex === 0 
          ? state.playlist.length - 1 
          : state.currentIndex - 1;
          
        return { 
          currentIndex: prevIndex, 
          isPlaying: true // Auto-play the previous song
        };
      }),
      next: () => set((state) => {
        if (state.playlist.length === 0) return state;
        const nextIndex = state.currentIndex + 1;
        
        // Loop back to the first song if we hit the end
        if (nextIndex < state.playlist.length) {
          return { currentIndex: nextIndex, isPlaying: true };
        }
        return { currentIndex: 0, isPlaying: false }; 
      }),
      
      // Jump to a specific song
      playSpecificSong: (index) => set({ currentIndex: index, isPlaying: true })
    }),
    {
      name: 'audio-player-storage', // Name of the key in localStorage
    }
  )
);
