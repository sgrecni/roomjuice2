import React from 'react';
import { useStore } from './store';
import Player from './Player';
import { SongPicker2 } from './SongPicker';

export default function App() {
  const { playlist, currentIndex, removeSong, playSpecificSong, clearPlaylist } = useStore();

  return (
    <div style={{ 
      maxWidth: '1000px', 
      margin: '20px auto', 
      fontFamily: 'sans-serif', 
      padding: '0 20px' // Keeps it from touching the edges on mobile screens
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>🎵 React Dynamic Audio Player</h2>

      {/* Responsive Flex Container */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '30px',
        alignItems: 'flex-start' // Prevents the shorter column from stretching vertically
      }}>
        
        {/* Left Column (or Top on Mobile): Active Player & Playlist */}
        <div style={{ flex: '1 1 400px', minWidth: '300px' }}>
          <Player />
          
          {/* Playlist Header with Clear Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0 }}>Your Playlist</h3>
            
            {playlist.length > 0 && (
              <button 
                onClick={clearPlaylist} 
                style={{ 
                  background: '#ff4d4f', 
                  color: 'white', 
                  border: 'none', 
                  padding: '5px 10px', 
                  borderRadius: '4px', 
                  cursor: 'pointer' 
                }}
              >
                Clear Playlist
              </button>
            )}
          </div>

          {/* Playlist Items */}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {playlist.map((song, index) => (
              <li 
                key={song.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '10px', 
                  borderBottom: '1px solid #ccc',
                  backgroundColor: index === currentIndex ? '#e6f7ff' : 'transparent',
                  borderRadius: '4px',
                  marginBottom: '5px'
                }}
              >
                <span style={{ fontSize: '14px', flexGrow: 1, paddingRight: '10px', wordBreak: 'break-word' }}>
                  {song.title}
                </span>
                <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                  {/* <button onClick={() => playSpecificSong(index)} style={{ cursor: 'pointer' }}>Play</button> */}
                  <button 
                      onClick={() => playSpecificSong(index)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-md border border-indigo-500/20 transition-all text-xs font-bold uppercase tracking-wider group-hover:scale-105"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Play
                    </button>
                    <button onClick={() => removeSong(song.id)} style={{ color: 'red', cursor: 'pointer' }}>×</button>
                </div>
              </li>
            ))}
            {playlist.length === 0 && (
              <p style={{ color: '#888', padding: '20px', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                Playlist is empty. Browse below to add some music!
              </p>
            )}
          </ul>
        </div>

        {/* Right Column (or Bottom on Mobile): Discovery / Song Picker */}
        <div style={{ flex: '1 1 400px', minWidth: '300px' }}>
          <SongPicker2 />
        </div>

      </div>
    </div>
  );
}