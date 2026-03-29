import React from 'react';
import { useStore } from './store';

export default function Settings({ isOpen, onClose }) {
  const { config, updateConfig } = useStore();

  if (!isOpen) return null;

  return (
    // Backdrop: Light grey in light mode, Dark slate in dark mode
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 dark:bg-slate-950/80 backdrop-blur-sm transition-all">
      
      {/* Modal Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 flex flex-col gap-8">
          
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

      <label className="flex items-center gap-3 cursor-pointer">
        <input 
          type="checkbox" 
          className="w-5 h-5 accent-indigo-500 rounded cursor-pointer"
          checked={config.isEqEnabled}
          onChange={() => updateConfig({ isEqEnabled: !config.isEqEnabled })}
        />
        <span className="text-sm font-medium">Enable Spectrum Analyzer</span>
      </label>
        </div>
      </div>
    </div>
  );
}