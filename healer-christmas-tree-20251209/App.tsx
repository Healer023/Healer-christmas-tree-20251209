import React, { useState, useEffect } from 'react';
import { Scene } from './components/Scene';
import { GestureController } from './components/GestureController';
import { UIOverlay } from './components/UIOverlay';
import { AudioPlayer } from './components/AudioPlayer';
import { AppState } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.TREE_SHAPE);

  // Remove the static loader from index.html once the App component mounts
  useEffect(() => {
    const loader = document.getElementById('loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => {
        loader.remove();
      }, 500); // fade out duration matches CSS
    }
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black selection:bg-emerald-500/30">
      
      {/* Background Music */}
      <AudioPlayer appState={appState} />

      {/* 3D Scene Layer */}
      <Scene appState={appState} />
      
      {/* UI Overlay Layer */}
      <UIOverlay appState={appState} />

      {/* Logic Layer (Hidden/Small Video) */}
      <GestureController appState={appState} setAppState={setAppState} />

      {/* Manual Fallback (Optional, keeps it usable if camera fails or no gesture wanted) */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 md:hidden">
          <button 
            onClick={() => setAppState(prev => prev === AppState.TREE_SHAPE ? AppState.SCATTERED : AppState.TREE_SHAPE)}
            className="px-6 py-3 bg-emerald-600/20 border border-emerald-500/50 text-emerald-100 rounded-full backdrop-blur-md active:bg-emerald-600/40 transition"
          >
            Toggle State
          </button>
      </div>
    </div>
  );
};

export default App;