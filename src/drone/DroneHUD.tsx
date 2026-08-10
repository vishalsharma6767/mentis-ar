import { useEffect, useState } from 'react';
import { droneState, droneCmd } from './droneState';
import { modeLabel, DroneMode } from './droneModes';

const MODE_ORDER: DroneMode[] = ['free', 'race', 'mission'];
const CAM_LABEL: Record<string, string> = { fpv: 'FPV', chase: 'CHASE', orbit: 'ORBIT' };

function StatusChip() {
  const s = droneState.status;
  const map: Record<string, { label: string; cls: string }> = {
    idle: { label: 'READY', cls: 'bg-slate-700/80 text-slate-200 border-slate-500/40' },
    flying: { label: 'FLYING', cls: 'bg-emerald-600/80 text-white border-emerald-400/50' },
    landing: { label: 'LANDING', cls: 'bg-amber-600/80 text-white border-amber-300/50' },
    landed: { label: 'LANDED', cls: 'bg-sky-600/80 text-white border-sky-400/50' },
    crashed: { label: 'CRASHED', cls: 'bg-red-600/80 text-white border-red-400/50' },
    completed: { label: 'COMPLETED', cls: 'bg-amber-500/80 text-slate-950 border-amber-300/50' },
  };
  const c = map[s] || map.idle;
  return (
    <span className={`px-3 py-1 rounded-full text-[11px] font-black tracking-widest border backdrop-blur-xl ${c.cls}`}>
      {c.label}
    </span>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="w-32 h-2 rounded-full bg-slate-800/90 overflow-hidden border border-slate-700/60">
      <div
        className="h-full rounded-full transition-[width] duration-150"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

function FpvOverlay() {
  const { roll, pitch } = droneState;
  const horizonY = pitch * 3.2;
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Center crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-8 h-8 rounded-full border-2 border-lime-300/80" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-lime-300" />
      </div>
      {/* Artificial horizon */}
      <div
        className="absolute left-1/2 top-1/2 w-[240px] h-[240px] -translate-x-1/2 -translate-y-1/2"
        style={{ transform: `translate(-50%, -50%) rotate(${-roll}deg)` }}
      >
        <div
          className="absolute left-0 right-0 h-px bg-lime-300/70"
          style={{ top: `calc(50% + ${horizonY}px)` }}
        />
        <div
          className="absolute left-0 right-0 h-[46%] border-t-2 border-lime-300/40"
          style={{ top: `calc(50% + ${horizonY}px)` }}
        />
      </div>
    </div>
  );
}

// Rotates an arrow around the screen center to point at the nav target.
function FpvNavArrow() {
  const { targetBearing } = droneState;
  if (!droneState.targetLabel) return null;
  return (
    <div
      className="absolute top-1/2 left-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      style={{ transform: `translate(-50%, -50%) rotate(${targetBearing}deg)` }}
    >
      <div className="absolute left-1/2 -top-1 -translate-x-1/2 text-orange-400 text-xl leading-none drop-shadow-[0_0_4px_rgba(0,0,0,0.9)]">
        ▲
      </div>
    </div>
  );
}

// Edge of screen marker when the target is behind the FPV view.
function FpvEdgeMarker() {
  const { targetLabel, targetBearing } = droneState;
  if (!targetLabel) return null;
  const deg = ((targetBearing % 360) + 360) % 360;
  const rad = (deg * Math.PI) / 180;
  const angle = Math.atan2(Math.sin(rad), Math.cos(rad));
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const r = Math.min(window.innerWidth, window.innerHeight) / 2 - 20;
  const x = cx + Math.sin(angle) * r;
  const y = cy - Math.cos(angle) * r;
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 text-2xl text-orange-400 drop-shadow-[0_0_6px_rgba(0,0,0,0.9)]"
      style={{ left: x, top: y }}
    >
      ▶
    </div>
  );
}

export function DroneHUD({ onExit }: { onExit: () => void }) {
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, []);

  const s = droneState;

  const cycleMode = () => {
    droneCmd.mode = MODE_ORDER[(MODE_ORDER.indexOf(s.mode) + 1) % MODE_ORDER.length];
  };

  const takeoffOrLand = () => {
    if (s.status === 'idle' || s.status === 'landed') droneCmd.takeoff++;
    else if (s.status === 'flying') droneCmd.land++;
  };

  return (
    <div className="fixed inset-0 z-30 pointer-events-none select-none">
      {s.cameraMode === 'fpv' && <FpvOverlay />}
      {s.cameraMode === 'fpv' && <FpvNavArrow />}
      {s.cameraMode === 'fpv' && s.targetLabel && (s.targetBearing < -100 || s.targetBearing > 100) && <FpvEdgeMarker />}

      {/* Top center — mode + status */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
        <div className="bg-slate-900/80 border border-sky-500/30 backdrop-blur-xl rounded-2xl px-4 py-1.5 shadow-xl flex items-center gap-2">
          <span className="text-[10px] font-black tracking-[0.3em] text-sky-400 uppercase">
            Drone Flight Academy · {modeLabel(s.mode)}
          </span>
          <span className="text-[10px] font-black tracking-widest text-amber-300 uppercase border border-amber-400/40 rounded-lg px-2 py-0.5">
            {CAM_LABEL[s.cameraMode]} CAM
          </span>
        </div>
        <StatusChip />
      </div>

      {/* Top left — telemetry (FPV OSD style) */}
      <div className="absolute top-4 left-4 flex flex-col gap-1.5 text-[11px] font-bold">
        <div className="bg-slate-900/85 backdrop-blur-xl rounded-xl border border-slate-700/60 px-3 py-2 flex flex-col gap-1.5 shadow-xl">
          <div className="flex justify-between gap-6 text-slate-300">
            <span className="text-slate-500">ALT</span>
            <span className="text-white tabular-nums">{s.altitude.toFixed(1)} m</span>
          </div>
          <div className="flex justify-between gap-6 text-slate-300">
            <span className="text-slate-500">SPD</span>
            <span className="text-white tabular-nums">{(s.speed * 3.6).toFixed(0)} km/h</span>
          </div>
          <div className="flex justify-between gap-6 text-slate-300">
            <span className="text-slate-500">HDG</span>
            <span className="text-white tabular-nums">{Math.round(s.heading).toString().padStart(3, '0')}°</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">BAT</span>
            <Bar value={s.battery} max={100} color={s.battery > 25 ? '#22c55e' : '#ef4444'} />
            <span className="text-white tabular-nums w-8 text-right">{Math.round(s.battery)}%</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">THR</span>
            <Bar value={s.throttle} max={1} color="#38bdf8" />
            <span className="text-white tabular-nums w-8 text-right">{Math.round(s.throttle * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Top right — timer / gates / objectives */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5 text-[11px] font-bold">
        <div className="bg-slate-900/85 backdrop-blur-xl rounded-xl border border-slate-700/60 px-3 py-2 shadow-xl flex flex-col gap-1.5 items-end">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-slate-500">TIME</span>
            <span className="text-white tabular-nums text-sm">{s.time.toFixed(1)}s</span>
          </div>
          {s.bestTime > 0 && (
            <div className="text-[10px] text-amber-300 tabular-nums">BEST {s.bestTime.toFixed(1)}s</div>
          )}
          {s.mode === 'race' && (
            <div className="text-sky-300 tabular-nums">
              GATES {s.gatesHit}/{s.gatesTotal}
            </div>
          )}
        </div>
        {s.objectives.length > 0 && (
          <div className="bg-slate-900/85 backdrop-blur-xl rounded-xl border border-slate-700/60 px-3 py-2 shadow-xl flex flex-col gap-1">
            {s.objectives.map((o, i) => (
              <div key={i} className={`flex items-center gap-1.5 ${o.done ? 'text-emerald-400' : 'text-slate-300'}`}>
                <span className={`w-2 h-2 rounded-full ${o.done ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                {o.label}
                {o.done && <span className="text-emerald-400 font-black">✓</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom center — message */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 max-w-md w-[80%]">
        <div className="bg-slate-950/85 backdrop-blur-xl border border-sky-500/30 rounded-xl px-4 py-2 text-center text-[12px] font-semibold text-sky-100 shadow-2xl">
          {s.message}
        </div>
      </div>

      {/* Bottom left — nav pill (target, distance, bearing) */}
      {s.targetLabel && (
        <div className="absolute bottom-6 left-4 pointer-events-none">
          <div className="bg-slate-900/85 backdrop-blur-xl rounded-xl border border-orange-500/40 px-3 py-2 flex items-center gap-2 shadow-xl">
            <span className="text-orange-400 text-sm">▶</span>
            <div className="flex flex-col">
              <span className="text-[11px] font-black tracking-wider text-orange-200 uppercase">{s.targetLabel}</span>
              <span className="text-[10px] font-bold text-slate-300 tabular-nums">
                {s.targetDist.toFixed(0)} m
                {Math.abs(s.targetBearing) > 2 &&
                  ` · ${s.targetBearing > 0 ? 'R' : 'L'} ${Math.round(Math.abs(s.targetBearing))}°`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom right — controls */}
      <div className="absolute bottom-6 right-4 pointer-events-auto flex flex-col gap-2">
        <button
          onClick={onExit}
          className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-black text-xs px-4 py-2 rounded-xl tracking-widest shadow-lg border border-slate-600/60"
        >
          EXIT FLIGHT
        </button>
        <button
          onClick={takeoffOrLand}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-2.5 rounded-xl tracking-widest shadow-lg border border-emerald-400/40"
        >
          {s.status === 'flying' ? 'LAND' : 'TAKEOFF'}
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => droneCmd.reset++}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] px-3 py-2 rounded-lg border border-slate-600/60"
          >
            RESET
          </button>
          <button
            onClick={cycleMode}
            className="bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-[10px] px-3 py-2 rounded-lg border border-slate-600/60"
          >
            MODE: {modeLabel(s.mode)}
          </button>
          <button
            onClick={() => droneCmd.camera++}
            className="bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-[10px] px-3 py-2 rounded-lg border border-slate-600/60"
          >
            CAM: {CAM_LABEL[s.cameraMode]}
          </button>
        </div>
      </div>
    </div>
  );
}
