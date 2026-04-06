import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_BASE_URL } from './config';

/* enabling the EQ on Apple mobile causes background music to be denied, so disable by default */
export const isAppleMobile = () => {
  if (typeof window === 'undefined') return false; // Safety check
  
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  
  // Catch modern iPads that claim to be a Mac but have a touch screen
  const isMacWithTouch = ua.includes('Macintosh') && navigator.maxTouchPoints > 1; 
  
  return isIOS || isMacWithTouch;
};
const defaultConfig = { 
  leftWidth: 400, 
  volume: 0.8, 
  theme: 'dark',
  lastPath: '',
  hidePlayed: false,
  isEqEnabled: !isAppleMobile(),
  streamingUrl: API_BASE_URL || '',
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
      isAuth: false,
      setAuth: (status) => set({ isAuth: status }),

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

      // Add a single song and auto-play if it's the first one
      addSong: (song) => set((state) => {
        const isPlaylistEmpty = state.playlist.length === 0;
        
        return { 
          playlist: [...state.playlist, song],
          // If the playlist was empty, immediately start playing
          isPlaying: isPlaylistEmpty ? true : state.isPlaying,
          // Ensure we are pointing at the first track
          currentIndex: isPlaylistEmpty ? 0 : state.currentIndex
        };
      }),

      // Add multiple songs at once and auto-play the first one if empty
      addSongs: (newSongs) => set((state) => {
        if (!newSongs || newSongs.length === 0) return state;

        const songsWithIds = newSongs.map(song => ({
          ...song,
          id: crypto.randomUUID()
        }));
        
        const isPlaylistEmpty = state.playlist.length === 0;
        
        return { 
          playlist: [...state.playlist, ...songsWithIds],
          // If empty, start playing the first song in the newly added batch
          isPlaying: isPlaylistEmpty ? true : state.isPlaying,
          currentIndex: isPlaylistEmpty ? 0 : state.currentIndex
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
