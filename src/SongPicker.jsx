import React, { useEffect, useState } from 'react';
import { useStore } from './store';
import { API_BASE_URL } from './config';

export function SongPickerOld() {
  const [data, setData] = useState({ dirs: [], files: [], currentPath: "" });
  const [loading, setLoading] = useState(true);
  const [path, setPath] = useState(""); 
  const [addingFolder, setAddingFolder] = useState(null); 
  const [isAddingAll, setIsAddingAll] = useState(false);  
  
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

  const handleAddCurrentFolder = () => {
    if (data.files.length > 0) {
      setIsAddingAll(true);
      setTimeout(() => {
        addSongs(data.files);
        setIsAddingAll(false);
      }, 50);
    }
  };

  const handleAddSubFolder = async (folderPath, e) => {
    e.stopPropagation(); 
    setAddingFolder(folderPath); 
    
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
      setAddingFolder(null); 
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

export default function SongPicker() {
  const [data, setData] = useState({ dirs: [], files: [], currentPath: "" });
  const [searchQuery, setSearchQuery] = useState("");

  const { addSong, addFolder, config, updateConfig } = useStore();

  const fetchPath = async (path = "", recursive = false) => {
    const url = `${API_BASE_URL}/songs.php?path=${encodeURIComponent(path)}${recursive ? '&recursive=true' : ''}`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      setData(json);

      updateConfig({ lastPath: path });
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => { 
    fetchPath(config.lastPath || ""); 
  }, []);

  // Safe split for breadcrumbs
  const breadcrumbs = (data.currentPath || "").split('/').filter(Boolean);
  
  // Safe filter for files
  const filteredFiles = (data.files || []).filter(file => 
    file.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    // Outer Wrapper
    <div className="w-full max-w-5xl mx-auto px-0 sm:px-4 md:px-6 mb-32">
      
      <div className="bg-white dark:bg-slate-900 sm:border border-slate-200 dark:border-slate-800 sm:rounded-2xl shadow-xl dark:shadow-2xl flex flex-col min-h-[50vh] transition-colors duration-300">
        
        {/* =========================================
            THE STICKY HEADER ZONE
            ========================================= */}
        <div className="sticky top-14 sm:top-16 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sm:rounded-t-2xl border-b border-slate-200 dark:border-slate-700 shadow-sm transition-colors duration-300">
          
          {/* Breadcrumbs */}
          <div className="p-3 sm:p-4 flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-800/50">
            <button 
              onClick={() => fetchPath("")}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold text-xs sm:text-sm uppercase tracking-wider shrink-0 transition-colors"
            >
              Root
            </button>
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                <span className="text-slate-400 dark:text-slate-600 shrink-0">/</span>
                <button 
                  onClick={() => fetchPath(breadcrumbs.slice(0, i + 1).join('/'))}
                  className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white text-xs sm:text-sm font-medium shrink-0 transition-colors"
                >
                  {crumb}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Search Bar */}
          <div className="p-3 sm:p-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input 
                type="text"
                placeholder="Search this folder..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* =========================================
            THE LIST ZONE (Directories and Files)
            ========================================= */}
        <div className="flex flex-col w-full pb-4">
          
          {/* Directories */}
          {data.dirs && data.dirs.map(dir => (
            <div key={dir.path} className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group w-full cursor-pointer" onClick={() => fetchPath(dir.path)}>
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors min-w-0 pr-4">
                <svg className="w-5 h-5 text-indigo-500/70 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                </svg>
                <span className="font-medium text-sm sm:text-base truncate">{dir.name}</span>
              </div>
              <svg className="w-4 h-4 text-slate-400 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          ))}

          {/* Files */}
          {filteredFiles.map(file => (
            <div key={file.id} className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group w-full">
              
              <div className="flex items-center gap-3 sm:gap-4 flex-grow min-w-0 pr-4">
                <div className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 shrink-0 transition-colors">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                  </svg>
                </div>
                <span className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300 truncate group-hover:text-indigo-600 dark:group-hover:text-white transition-colors">
                  {file.title}
                </span>
              </div>

              {/* Queue Button */}
              <button 
                onClick={() => addSong(file)}
                className="shrink-0 whitespace-nowrap bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-500 text-indigo-600 dark:text-indigo-400 hover:text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all active:scale-95"
              >
                Queue
              </button>
            </div>
          ))}

          {/* Empty State */}
          {(!data.dirs?.length && !filteredFiles.length) && (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 italic text-sm transition-colors duration-300">
              No music found here.
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}