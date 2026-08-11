import { motion } from 'framer-motion';
import { Eye, Crosshair } from 'lucide-react';

export function SplitVRToggle({
  on,
  onToggle,
  onRecenter,
}: {
  on: boolean;
  onToggle: () => void;
  onRecenter: () => void;
}) {
  return (
    <div className="fixed top-3 left-3 z-[60] flex items-center gap-2 pointer-events-auto">
      <motion.button
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggle}
        className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-bold border backdrop-blur-xl shadow-xl transition-all ${
          on
            ? 'bg-emerald-600/90 border-emerald-400/60 text-white shadow-[0_0_18px_rgba(16,185,129,0.4)]'
            : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:text-white hover:border-emerald-500/50'
        }`}
        title="Toggle split-screen stereo (V) — hold the phone in the headset"
      >
        <Eye className={`w-4 h-4 ${on ? 'text-white' : 'text-emerald-400'}`} />
        <span className="hidden min-[420px]:inline">{on ? 'SPLIT VR ON' : 'SPLIT VR'}</span>
      </motion.button>

      {on && (
        <motion.button
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRecenter}
          className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-bold bg-sky-600/90 border border-sky-400/60 text-white backdrop-blur-xl shadow-xl"
          title="Re-center the view straight ahead"
        >
          <Crosshair className="w-4 h-4" />
          <span className="hidden min-[420px]:inline">RECENTER</span>
        </motion.button>
      )}
    </div>
  );
}
