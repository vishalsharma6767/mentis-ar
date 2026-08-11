import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Orbit, Hand, Mic, X, Volume2, RotateCcw, Sun } from 'lucide-react';
import { solarState, solarCmd } from './solarState';
import { bodyById, SolarBody } from './solarData';

interface AcademyHUDProps {
  onExit: () => void;
  isListening: boolean;
  voiceError?: string | null;
  onToggleMic: () => void;
}

function useSolarTicker(ms: number) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}

export function AcademyHUD({ onExit, isListening, voiceError, onToggleMic }: AcademyHUDProps) {
  useSolarTicker(200);

  const mode = solarState.mode;
  const hovered = solarState.hoveredId || solarState.selectedId || solarState.gazeId;
  const body: SolarBody | undefined = hovered ? bodyById(hovered) : undefined;
  const grabbing = solarState.hand.active && solarState.hand.pinch;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none font-sans select-none">
      {/* Gaze reticle (centre) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative w-5 h-5">
          <div className="absolute inset-0 rounded-full border border-white/50" />
          <div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full transition-colors ${
              solarState.grabbedId ? 'bg-emerald-300' : body ? 'bg-sky-300' : 'bg-white/70'
            }`}
          />
        </div>
      </div>

      {/* Top-left: mode + title */}
      <div className="absolute top-6 left-6 pointer-events-auto flex items-center gap-2">
        <div className="bg-slate-900/85 border border-indigo-500/30 backdrop-blur-xl rounded-2xl px-4 py-2 flex items-center gap-2.5 shadow-xl">
          <Sun className="w-4 h-4 text-amber-400" />
          <span className="text-white font-black text-sm tracking-wide">SOLAR SYSTEM ACADEMY</span>
          <span
            className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
              mode === 'camera'
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-indigo-500/15 text-indigo-300'
            }`}
          >
            {mode === 'camera' ? 'Mixed Reality' : 'Space Mode'}
          </span>
        </div>
      </div>

      {/* Top-right: actions */}
      <div className="absolute top-6 right-6 pointer-events-auto flex items-center gap-2">
        <button
          onClick={() => solarCmd.cameraToggle++}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider backdrop-blur-xl border shadow-xl transition-all ${
            mode === 'camera'
              ? 'bg-emerald-600 text-white border-emerald-400/50'
              : 'bg-slate-900/85 text-white border-white/15 hover:bg-slate-800'
          }`}
          title="Toggle camera passthrough / space"
        >
          <Camera className="w-4 h-4" />
          {mode === 'camera' ? 'Camera On' : 'Turn Camera On'}
        </button>
        <button
          onClick={onToggleMic}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider backdrop-blur-xl border shadow-xl transition-all ${
            isListening
              ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.6)]'
              : 'bg-slate-900/85 text-white border-white/15 hover:bg-slate-800'
          }`}
        >
          <Mic className={`w-4 h-4 ${isListening ? 'animate-pulse' : ''}`} />
          Nova Voice
        </button>
      </div>

      {voiceError && (
        <div className="absolute top-20 right-6 bg-slate-900/95 border border-amber-500/40 text-amber-300 text-[10px] px-3 py-1.5 rounded-xl max-w-xs text-right shadow-xl pointer-events-auto">
          {voiceError}
        </div>
      )}

      {/* Bottom-left: help card */}
      <div className="absolute bottom-6 left-6 pointer-events-auto">
        <div className="bg-slate-900/85 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-xl max-w-[280px]">
          <div className="flex items-center gap-2 mb-2 text-white font-black text-xs uppercase tracking-wider">
            <Hand className="w-4 h-4 text-indigo-300" /> How to play
          </div>
          <div className="space-y-1.5 text-[11px] text-slate-300 leading-snug">
            <p className="flex items-start gap-2">
              <Orbit className="w-3.5 h-3.5 text-sky-300 shrink-0 mt-0.5" />
              Look with the reticle to highlight a planet
            </p>
            <p className="flex items-start gap-2">
              <Hand className="w-3.5 h-3.5 text-emerald-300 shrink-0 mt-0.5" />
              Pinch in front of the camera to grab & drag, pinch-zoom to scale
            </p>
            <p className="flex items-start gap-2">
              <Volume2 className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
              Talk to Nova: “show Jupiter”, “spin Mars”, “bigger”, “tell me about Saturn”
            </p>
            <p className="text-[10px] text-slate-500">
              Out of headset: drag to rotate, scroll / pinch to zoom, click to select.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom-right: exit */}
      <div className="absolute bottom-6 right-6 pointer-events-auto flex items-center gap-2">
        <button
          onClick={() => solarCmd.reset++}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-slate-900/85 text-white border border-white/15 backdrop-blur-xl hover:bg-slate-800 shadow-xl"
          title="Reset all planets to their orbits"
        >
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
        <button
          onClick={onExit}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-slate-900/85 text-white border border-red-500/40 backdrop-blur-xl hover:bg-red-600/30 shadow-xl"
        >
          <X className="w-4 h-4" /> Exit
        </button>
      </div>

      {/* Planet fact card (hovered / selected) */}
      <AnimatePresence>
        {body && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[min(560px,92vw)] pointer-events-auto"
          >
            <div className="bg-slate-950/80 backdrop-blur-xl border border-white/15 rounded-2xl px-5 py-4 shadow-2xl">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full" style={{ background: body.color }} />
                  <span className="text-white font-black text-sm tracking-wide">{body.name.toUpperCase()}</span>
                  {grabbing && <span className="text-[9px] font-black text-emerald-300 uppercase tracking-widest">Grabbed ✋</span>}
                </div>
              </div>
              <p className="text-[12px] text-slate-300 leading-relaxed">{body.fact.en}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
