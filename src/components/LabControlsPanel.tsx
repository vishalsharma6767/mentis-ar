import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, Gamepad2, X, HelpCircle } from 'lucide-react';
import { remoteControl } from '../gamepad/gamepadInput';

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-1.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-sky-300 font-mono text-[10px] font-bold leading-none">
      {children}
    </span>
  );
}

function Row({ keys, label }: { keys: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px]">
      <span className="flex items-center gap-1 flex-wrap min-w-0">{keys}</span>
      <span className="text-slate-300 text-right shrink-0">{label}</span>
    </div>
  );
}

const KEYBOARD_ROWS = [
  { keys: <><Kbd>W</Kbd><Kbd>A</Kbd><Kbd>S</Kbd><Kbd>D</Kbd></>, label: 'Walk around' },
  { keys: <><Kbd>Mouse drag</Kbd></>, label: 'Look around' },
  { keys: <><Kbd>1</Kbd><Kbd>2</Kbd><Kbd>3</Kbd></>, label: 'Glassware / Chemicals / Tools' },
  { keys: <><Kbd>Tab</Kbd> or <Kbd>Q</Kbd><Kbd>E</Kbd></>, label: 'Cycle table item' },
  { keys: <><Kbd>P</Kbd></>, label: 'Pour / Mix reaction' },
  { keys: <><Kbd>F</Kbd></>, label: 'Heat (Bunsen burner)' },
  { keys: <><Kbd>X</Kbd> / <Kbd>Del</Kbd></>, label: 'Remove item' },
  { keys: <><Kbd>C</Kbd></>, label: 'Clear table' },
  { keys: <><Kbd>N</Kbd></>, label: 'Ask Nova' },
  { keys: <><Kbd>Space</Kbd> (hold)</>, label: 'Talk to Nova' },
  { keys: <><Kbd>M</Kbd></>, label: 'Close Mic' },
];

const GAMEPAD_ROWS = [
  { keys: <><Kbd>L-Stick</Kbd></>, label: 'Walk around' },
  { keys: <><Kbd>R-Stick</Kbd></>, label: 'Look around' },
  { keys: <><Kbd>X</Kbd></>, label: 'Glassware rack' },
  { keys: <><Kbd>Y</Kbd></>, label: 'Chemicals rack' },
  { keys: <><Kbd>B</Kbd></>, label: 'Tools rack / Back' },
  { keys: <><Kbd>A</Kbd></>, label: 'Confirm / activate wall pill' },
  { keys: <><Kbd>D-pad ↑↓</Kbd></>, label: 'Move focus within a wall' },
  { keys: <><Kbd>D-pad ←→</Kbd></>, label: 'Switch wall segment' },
  { keys: <><Kbd>D-pad ←→</Kbd> (no VR)</>, label: 'Cycle table item (desktop)' },
  { keys: <><Kbd>Start</Kbd></>, label: 'Heat (Bunsen burner)' },
  { keys: <><Kbd>Select</Kbd></>, label: 'Clear table' },
  { keys: <><Kbd>Home</Kbd></>, label: 'Recenter view' },
  { keys: <><Kbd>LT</Kbd></>, label: 'Remove item' },
  { keys: <><Kbd>RT</Kbd><Kbd>RB</Kbd><Kbd>LB</Kbd> (hold)</>, label: 'Talk to Nova' },
  { keys: <><Kbd>M</Kbd></>, label: 'Close Mic' },
];

function Section({
  icon: Icon,
  title,
  rows,
  accent,
}: {
  icon: typeof Keyboard;
  title: string;
  rows: typeof KEYBOARD_ROWS;
  accent: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${accent} mb-1`}>
        <Icon className="w-3.5 h-3.5" />
        {title}
      </div>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <Row key={i} keys={r.keys} label={r.label} />
        ))}
      </div>
    </div>
  );
}

export function LabControlsPanel({ onCloseMic }: { onCloseMic: () => void }) {
  const [open, setOpen] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => tick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  const toggle = () => setOpen((o) => !o);

  const gamepadOn = remoteControl.gamepadCount > 0;

  return (
    <>
      <button
        onClick={toggle}
        className="fixed top-3 right-3 z-[60] pointer-events-auto flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 backdrop-blur-xl rounded-full px-3 py-2 text-[11px] font-bold text-slate-300 hover:text-white hover:border-sky-500/50 transition-all shadow-xl"
        title="Controls reference"
      >
        <HelpCircle className="w-4 h-4 text-sky-400" />
        <span className="hidden min-[420px]:inline">CONTROLS</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            className="fixed top-14 right-3 z-[60] pointer-events-auto w-[min(92vw,400px)] max-h-[80vh] overflow-y-auto rounded-2xl bg-slate-900/95 border border-slate-700/80 backdrop-blur-xl shadow-2xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-black text-white tracking-wide flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-sky-400" /> LAB CONTROLS
              </div>
              <button
                onClick={toggle}
                className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <Section icon={Keyboard} title="Keyboard" rows={KEYBOARD_ROWS} accent="text-sky-400" />
              <Section icon={Gamepad2} title="Bluetooth gamepad" rows={GAMEPAD_ROWS} accent="text-emerald-400" />

              <div
                className={`rounded-xl px-3 py-2 text-[11px] font-bold border flex items-center gap-2 ${
                  gamepadOn
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-800/70 border-slate-700/60 text-slate-400'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    gamepadOn ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]' : 'bg-slate-600'
                  }`}
                />
                {gamepadOn ? `Gamepad connected: ${remoteControl.gamepadName || 'active'}` : 'No gamepad connected — plug in any Bluetooth controller'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
