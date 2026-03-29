import React, { useState } from 'react';
import { useStore } from './store';

export default function Settings({ isOpen, onClose }) {
  // 1. Pull in both config and auth state from the store
  const { config, updateConfig, isAuth, setAuth } = useStore();

  // 2. Local state for the remote login form
  const [password, setPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

const handleLogin = async (e) => {
    e.preventDefault();
    
    // Safety check: Don't try to log in if they haven't set a URL!
    if (!config.streamingUrl) {
      setStatusMsg('❌ Please enter a Server URL first');
      return;
    }

    setIsLoading(true);
    setStatusMsg('');
    
    try {
      const res = await fetch(`${config.streamingUrl}auth.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        setAuth(true);
        setStatusMsg('✅ Connected to remote server!');
        setPassword('');
      } else {
        setStatusMsg('❌ Incorrect passphrase');
      }
    } catch (err) {
      setStatusMsg('❌ Network error connecting to server');
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await fetch(`${config.streamingUrl}/logout.php`, { credentials: 'include' });
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      setAuth(false);
      setStatusMsg('Disconnected from remote server.');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    // Backdrop: Light grey in light mode, Dark slate in dark mode
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 dark:bg-slate-950/80 backdrop-blur-sm transition-all">
      
      {/* Modal Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Settings Body - Added overflow-y-auto so it scrolls if it gets too tall on mobile */}
        <div className="p-6 flex flex-col gap-8 overflow-y-auto">
          
          {/* Volume Control */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex justify-between">
              <span>Master Volume</span>
              <span className="text-indigo-500 dark:text-indigo-400">{Math.round(config.volume * 100)}%</span>
            </label>
            <div className="flex items-center gap-4">
              <svg className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
              </svg>
              <input 
                type="range" 
                min="0" max="1" step="0.01"
                value={config.volume}
                onChange={(e) => updateConfig({ volume: parseFloat(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <svg className="w-6 h-6 text-slate-400 dark:text-slate-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" />
              </svg>
            </div>
          </div>

          {/* Theme Control */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Interface Theme
            </label>
            <div className="flex bg-slate-100 dark:bg-slate-950 rounded-lg p-1 border border-slate-200 dark:border-slate-800">
              <button 
                onClick={() => updateConfig({ theme: 'dark' })}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  config.theme === 'dark' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Dark
              </button>
              <button 
                onClick={() => updateConfig({ theme: 'light' })}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  config.theme === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Light
              </button>
            </div>
          </div>

          {/* EQ Toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              className="w-5 h-5 accent-indigo-500 rounded cursor-pointer"
              checked={config.isEqEnabled}
              onChange={() => updateConfig({ isEqEnabled: !config.isEqEnabled })}
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Enable Spectrum Analyzer</span>
          </label>

          {/* Divider */}
          <hr className="border-slate-200 dark:border-slate-800" />

{/* --- REMOTE SERVER SECTION --- */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Remote Library
            </h3>
            
            {/* NEW: Server URL Input */}
            <div className="flex flex-col gap-1.5 mb-2">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Server API URL
              </label>
              <input 
                type="text" 
                placeholder="e.g., https://paradise.gifpaste.net/rjapi/"
                value={config.streamingUrl || ''}
                disabled={isAuth} 
                onChange={e => updateConfig({ streamingUrl: e.target.value })}
                // NEW: Auto-append the slash when they click away from the input
                onBlur={(e) => {
                  let val = e.target.value.trim();
                  if (val && !val.endsWith('/')) {
                    updateConfig({ streamingUrl: val + '/' });
                  }
                }}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {isAuth ? (
              <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                <span className="text-emerald-700 dark:text-emerald-400 font-medium text-sm">
                  🟢 Connected to Server
                </span>
                <button 
                  onClick={handleLogout}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded shadow-sm hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input 
                    type="password" 
                    placeholder="Passphrase"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <button 
                    type="submit" 
                    disabled={isLoading || !password || !config.streamingUrl}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50 shrink-0"
                  >
                    {isLoading ? '...' : 'Connect'}
                  </button>
                </div>
                {statusMsg && (
                  <p className={`text-xs font-medium mt-1 ${statusMsg.includes('✅') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                    {statusMsg}
                  </p>
                )}
              </form>
            )}
          </div>

          {/* --- LOCAL LIBRARY SECTION (Placeholder) --- */}
          <div className="flex flex-col gap-3">
             <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
               Local Folders
             </h3>
             <p className="text-xs text-slate-400 dark:text-slate-500 italic bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
               Local folder access coming soon...
             </p>
          </div>

        </div>
      </div>
    </div>
  );
}