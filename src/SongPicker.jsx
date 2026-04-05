import React, { useEffect, useState } from 'react';
import { useStore } from './store';

export default function SongPicker() {
  const [data, setData] = useState({ dirs: [], files: [], currentPath: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingAll, setIsAddingAll] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const isAuth = useStore(state => state.isAuth);``

  const { addSong, addSongs, addFolder, config, updateConfig } = useStore();

  const fetchPath = async (path = "", recursive = false, searchTerm = "") => {
    let url = `${config.streamingUrl}songs.php?path=${encodeURIComponent(path)}`;
    if (recursive) url += '&recursive=true';
    if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;

    try {
      const res = await fetch(url, { credentials: 'include' });
      const json = await res.json();
      setData(json);
      updateConfig({ lastPath: path });

      if (!searchTerm) {
        setSearchQuery("");
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => { 
    fetchPath(config.lastPath || "");
  }, []);

  useEffect(() => {
    fetchPath(config.lastPath || "")
  }, [isAuth, config.streamingUrl]);

  // Safe split for breadcrumbs
  const breadcrumbs = (data.currentPath || "").split('/').filter(Boolean);
  
  // Safe, broad, multi-word filter for files
  const filteredFiles = (data.files || []).filter(file => {
    if (!searchQuery.trim()) return true;
    
    // 1. Split the search query into individual words (ignoring extra spaces)
    const searchTerms = searchQuery.toLowerCase().split(' ').filter(Boolean);
    
    // 2. Mash all the track's searchable data into one giant string
    const searchableText = [
      file.title,
      file.artist,
      file.album,
      file.folder,
      file.url
    ].filter(Boolean).join(' ').toLowerCase();

    // 3. Return true ONLY if every single search word is found somewhere in that giant string
    return searchTerms.every(term => searchableText.includes(term));
  });

  const handleQueueAll = async () => {
    // Prevent clicking if there are no files AND no folders
    if (filteredFiles.length === 0 && (!data.dirs || data.dirs.length === 0)) return;
    
    setIsAddingAll(true);
    
    try {
      // 1. Start with the files already in the current directory (respecting the search filter)
      let allSongsToQueue = [...filteredFiles];

      // 2. Fetch files from immediate subdirectories (1 level deep)
      if (data.dirs && data.dirs.length > 0) {
        // Create an array of fetch promises for each sub-directory
        // Note: We intentionally do NOT use &recursive=true here
        const subDirPromises = data.dirs.map(dir =>
          fetch(`${config.streamingUrl}songs.php?path=${encodeURIComponent(dir.path)}`, { credentials: 'include' })
            .then(res => res.json())
            .catch(err => {
              console.error(`Failed to fetch ${dir.path}:`, err);
              return { files: [] }; // Fallback to empty array if a folder fails
            })
        );

        // Wait for all sub-directory fetches to finish simultaneously
        const subDirResults = await Promise.all(subDirPromises);

        // 3. Extract the files and apply the same search filter
        subDirResults.forEach(result => {
          if (result.files && result.files.length > 0) {
            const matchingSubFiles = result.files.filter(file =>
              file.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
            allSongsToQueue = [...allSongsToQueue, ...matchingSubFiles];
          }
        });
      }

      // 4. Send everything to Zustand
      if (allSongsToQueue.length > 0) {
        addSongs(allSongsToQueue);
      } else {
        alert("No MP3s found in this folder or its immediate sub-folders.");
      }

    } catch (error) {
      console.error("Failed to queue folders:", error);
    } finally {
      setIsAddingAll(false);
    }
  };

  const handleDeepSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    // Search starting from the current directory path
    await fetchPath(data.currentPath, false, searchQuery);
    setIsSearching(false);
  };

  return (
    // Outer Wrapper
    <div className="w-full max-w-5xl mx-auto px-0 sm:px-4 md:px-6 mb-32">
      
      <div className="bg-white dark:bg-slate-900 sm:border border-slate-200 dark:border-slate-800 sm:rounded-2xl shadow-xl dark:shadow-2xl flex flex-col min-h-[50vh] transition-colors duration-300">
        
        {/* =========================================
            THE STICKY HEADER ZONE
            ========================================= */}
        <div className="sticky top-14 sm:top-16 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sm:rounded-t-2xl border-b border-slate-200 dark:border-slate-700 shadow-sm transition-colors duration-300">
          
        {/* UPDATED: Breadcrumbs + Queue All Container */}
          <div className="p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/50">
            
            {/* Left Side: Breadcrumbs */}
            <div className="flex flex-wrap items-center gap-2 flex-grow min-w-0 pr-4">
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

 {/* Right Side: Queue All Button */}
            {(filteredFiles.length > 0 || (data.dirs && data.dirs.length > 0)) && (
              <button 
                onClick={handleQueueAll}
                disabled={isAddingAll}
                className={`shrink-0 flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all
                  ${isAddingAll 
                    ? 'bg-slate-200 text-slate-500 cursor-wait dark:bg-slate-800 dark:text-slate-400' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-sm'
                  }`}
              >
                {isAddingAll ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Queuing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    {/* NEW: Smart text swapping based on search state */}
                    {searchQuery.trim() !== "" ? "Queue Results" : "Queue Folder"}
                  </>
                )}
              </button>
            )}

          </div>

          {/* Search Bar & Deep Search Button */}
          <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800/50">
            <div className="flex gap-2">
              
              {/* The Input (Takes up remaining space) */}
              <div className="relative flex-grow">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
                <input 
                  type="text"
                  placeholder="Filter or Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleDeepSearch(); }} // <-- Quick Enter key support
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* The Deep Search Button */}
              <button
                onClick={handleDeepSearch}
                disabled={isSearching || !searchQuery.trim()}
                className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all
                  ${isSearching || !searchQuery.trim()
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500' 
                    : 'bg-slate-800 text-white hover:bg-slate-700 active:scale-95 dark:bg-slate-700 dark:hover:bg-slate-600 shadow-sm'
                  }`}
              >
                {isSearching ? 'Searching...' : 'Search Directory'}
              </button>

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
                
                {/* UPDATED: Title and Context Column */}
                <div className="flex flex-col min-w-0">
                  <span className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300 truncate group-hover:text-indigo-600 dark:group-hover:text-white transition-colors">
                    {file.title}
                  </span>
                  
                  {/* NEW: Display Folder and/or Album context below the title */}
                  {(file.folder || (file.album && file.album !== 'Unknown Album')) && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {file.folder ? `📁 ${file.folder}` : ''} 
                      {file.folder && file.album && file.album !== 'Unknown Album' ? ' • ' : ''} 
                      {file.album && file.album !== 'Unknown Album' ? `💿 ${file.album}` : ''}
                    </span>
                  )}
                </div>

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