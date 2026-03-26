import React, { useEffect, useState } from 'react';
import { useStore } from './store';
import { API_BASE_URL } from './config';

export default function SongPicker() {
  const [data, setData] = useState({ dirs: [], files: [], currentPath: "" });
  const [loading, setLoading] = useState(true);
  const [path, setPath] = useState(""); 
  const [addingFolder, setAddingFolder] = useState(null); // Tracks which sub-folder is loading
  const [isAddingAll, setIsAddingAll] = useState(false);  // Tracks the "Add All" button
  
  // Bring in both add functions
  const addSong = useStore((state) => state.addSong);
  const addSongs = useStore((state) => state.addSongs);

  const fetchPath = async (path = "", recursive = false) => {
    const url = `${API_BASE_URL}/songs.php?path=${encodeURIComponent(path)}${recursive ? '&recursive=true' : ''}`;
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    setLoading(true);
    fetchPath(path);
  }, [path]);

  const navigateUp = () => {
    const segments = path.split('/').filter(Boolean);
    segments.pop();
    setPath(segments.join('/'));
  };

  // Update the "Add All" function
  const handleAddCurrentFolder = () => {
    if (data.files.length > 0) {
      setIsAddingAll(true);
      // Small timeout to allow the UI to re-render the button state before locking up the thread adding songs
      setTimeout(() => {
        addSongs(data.files);
        setIsAddingAll(false);
      }, 50);
    }
  };

  // Update the "Add Sub-Folder" function
  const handleAddSubFolder = async (folderPath, e) => {
    e.stopPropagation(); 
    setAddingFolder(folderPath); // Start the loading spinner for this specific folder
    
    try {
      const res = await fetch(`${API_BASE_URL}/songs.php?path=${encodeURIComponent(folderPath)}&recursive=true`);
      const json = await res.json();
      
      if (json.files && json.files.length > 0) {
        addSongs(json.files);
      } else {
        alert("No MP3s found in this folder or any of its sub-folders.");
      }
    } catch (err) {
      console.error("Failed to add folder:", err);
      alert("Error scanning folder.");
    } finally {
      setAddingFolder(null); // Stop the loading spinner
    }
  };

  if (loading) return <p>Loading directory...</p>;
 
  const breadcrumbs = data.currentPath.split('/').filter(Boolean);
 
  return (
    <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', background: '#f9f9f9' }}>
      
      {/* Header & Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0 }}>Library: /{path}</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
            {data.files.length > 0 && (
             <button 
                onClick={handleAddCurrentFolder} 
                disabled={isAddingAll}
                style={{ 
                  background: isAddingAll ? '#ccc' : '#4CAF50', 
                  color: 'white', 
                  border: 'none', 
                  padding: '5px 10px', 
                  borderRadius: '4px', 
                  cursor: isAddingAll ? 'wait' : 'pointer' 
                }}
              >
               {isAddingAll ? '⏳ Adding...' : `➕ Add All (${data.files.length})`}
             </button>
            )}
            {path !== "" && <button onClick={navigateUp}>⬆️ Up</button>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        
        {/* Render Directories */}
        {data.dirs.map((dir) => (
          <div 
            key={dir.path} 
            onClick={() => setPath(dir.path)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#fff', cursor: 'pointer', border: '1px solid #eee', borderRadius: '4px' }}
          >
            <div>📁 <strong>{dir.name}</strong></div>
            <button 
              onClick={(e) => handleAddSubFolder(dir.path, e)}
              disabled={addingFolder === dir.path}
              style={{ 
                cursor: addingFolder === dir.path ? 'wait' : 'pointer',
                opacity: addingFolder === dir.path ? 0.6 : 1
              }}
            >
              {addingFolder === dir.path ? '⏳ Scanning...' : '➕ Add Folder'}
            </button>
          </div>
        ))}

        {/* Render MP3 Files */}
        {data.files.map((song) => (
          <div 
            key={song.id} 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #eee' }}
          >
            <span>🎵 {song.title}</span>
            <button 
              onClick={() => addSong({ ...song, id: crypto.randomUUID() })}
              style={{ cursor: 'pointer' }}
            >
              ➕ Add
            </button>
          </div>
        ))}

        {data.dirs.length === 0 && data.files.length === 0 && <p style={{ color: '#888' }}>This folder is empty.</p>}
      </div>
    </div>
  );
}

export function SongPicker2() {
  const [data, setData] = useState({ dirs: [], files: [], currentPath: "" });
  const { addSong, addFolder } = useStore();

  const fetchPath = async (path = "", recursive = false) => {
    const url = `https://paradise.gifpaste.net/backend/api/songs.php?path=${encodeURIComponent(path)}${recursive ? '&recursive=true' : ''}`;
    const res = await fetch(url);
    const json = await res.json();
    setData(json);
  };

  useEffect(() => { fetchPath(); }, []);

  // Breadcrumb helper: turns "home/mp3s/rock" into clickable links
  const breadcrumbs = data.currentPath.split('/').filter(Boolean);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
      
      {/* Header / Breadcrumbs */}
      <div className="bg-slate-800/50 p-4 border-b border-slate-800 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <button 
          onClick={() => fetchPath("")}
          className="text-indigo-400 hover:text-indigo-300 font-bold text-sm uppercase tracking-wider"
        >
          Root
        </button>
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={i}>
            <span className="text-slate-600">/</span>
            <button 
              onClick={() => fetchPath(breadcrumbs.slice(0, i + 1).join('/'))}
              className="text-slate-300 hover:text-white text-sm font-medium"
            >
              {crumb}
            </button>
          </React.Fragment>
        ))}
      </div>

      <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
        {/* Directories Section */}
        {data.dirs.map(dir => (
          <div key={dir.path} className="flex items-center justify-between p-3 border-b border-slate-800/50 hover:bg-slate-800 transition-colors group">
            <button 
              onClick={() => fetchPath(dir.path)}
              className="flex items-center gap-3 text-slate-300 group-hover:text-indigo-300 transition-colors flex-grow text-left"
            >
              <svg className="w-5 h-5 text-indigo-500/70" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
              </svg>
              <span className="font-medium">{dir.name}</span>
            </button>
            
            <button 
              onClick={() => fetchPath(dir.path, true)}
              className="opacity-0 group-hover:opacity-100 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 px-3 py-1 rounded text-[10px] font-bold uppercase transition-all"
            >
              + Add All
            </button>
          </div>
        ))}

        {/* Files Section */}
        {data.files.map(file => (
          <div key={file.id} className="flex items-center justify-between p-3 border-b border-slate-800/50 hover:bg-indigo-500/5 transition-colors group">
            <div className="flex items-center gap-3 overflow-hidden">
              <svg className="w-5 h-5 text-slate-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              <span className="text-sm text-slate-300 truncate" title={file.title}>{file.title}</span>
            </div>

            <button 
              onClick={() => addSong(file)}
              className="flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/20 px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-tight transition-all active:scale-95 shadow-sm"
            >
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              Queue
            </button>
          </div>
        ))}

        {/* Empty State */}
        {data.dirs.length === 0 && data.files.length === 0 && (
          <div className="p-12 text-center text-slate-500 italic text-sm">
            This folder is empty
          </div>
        )}
      </div>
    </div>
  );
}