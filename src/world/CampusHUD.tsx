import { useEffect, useState } from 'react';
import { campusBridge } from './campusState';

export function CampusHUD({ onLaunch, onExit }: { onLaunch: () => void; onExit: () => void }) {
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 150);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-30 pointer-events-none select-none">
      {/* Top center — location banner */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <div className="bg-slate-900/80 border border-amber-500/30 backdrop-blur-xl rounded-2xl px-5 py-2 shadow-xl text-center">
          <div className="text-[11px] font-black tracking-[0.3em] text-amber-300 uppercase">
            Mentis Drone Academy
          </div>
          <div className="text-[10px] font-bold tracking-widest text-slate-300 uppercase mt-0.5">
            Campus · Walk to the Flight Terminal to take off
          </div>
        </div>
      </div>

      {/* Bottom center — launch prompt when near the terminal */}
      {campusBridge.nearTerminal && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto">
          <button
            onClick={onLaunch}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm px-6 py-3 rounded-2xl tracking-widest shadow-2xl border border-amber-300/50 animate-pulse"
          >
            ▶ LAUNCH DRONE
          </button>
        </div>
      )}

      {/* Bottom left — controls card */}
      <div className="absolute bottom-6 left-4">
        <div className="bg-slate-900/85 backdrop-blur-xl rounded-xl border border-slate-700/60 px-4 py-3 shadow-xl flex flex-col gap-1 text-[11px] font-bold">
          <div className="flex items-center gap-2 text-slate-200">
            <span className="text-slate-500 w-6">WASD</span> Walk
          </div>
          <div className="flex items-center gap-2 text-slate-200">
            <span className="text-slate-500 w-6">DRAG</span> Look around
          </div>
          <div className="flex items-center gap-2 text-amber-300">
            <span className="text-slate-500 w-6">E</span> Launch drone at terminal
          </div>
        </div>
      </div>

      {/* Top right — exit */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <button
          onClick={onExit}
          className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-black text-xs px-4 py-2 rounded-xl tracking-widest shadow-lg border border-slate-600/60"
        >
          EXIT
        </button>
      </div>
    </div>
  );
}
