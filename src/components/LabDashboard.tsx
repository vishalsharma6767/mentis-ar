import { motion } from 'framer-motion';
import { FlaskConical, Activity, Play, ChevronLeft, ChevronRight, Target, Trophy, Cloud, ShieldCheck, Keyboard, Building2 } from 'lucide-react';
import { Experiment, EXPERIMENTS } from '../types';
import { DroneMode, modeLabel } from '../drone/droneModes';

interface LabDashboardProps {
  world: 'chemistry' | 'drone';
  labMode: 'guided' | 'sandbox';
  setLabMode: (mode: 'guided' | 'sandbox') => void;
  selectedExperiment: Experiment | null;
  onSelectExperiment: (exp: Experiment) => void;
  droneMode: DroneMode;
  onSelectDroneMode: (mode: DroneMode) => void;
  onStartVR: () => void;
  onBack: () => void;
}

const DRONE_MODES = [
  {
    id: 'free' as DroneMode,
    icon: Cloud,
    title: 'Free Flight',
    desc: 'Practice takeoff, hover, turns and landing over the desert field at your own pace.',
  },
  {
    id: 'race' as DroneMode,
    icon: Trophy,
    title: 'Obstacle Race',
    desc: 'Fly FPV through 7 realistic gates as fast as you can. Timer + best time tracking.',
  },
  {
    id: 'mission' as DroneMode,
    icon: Target,
    title: 'Mission Training',
    desc: 'Deliver the package to every helipad by landing on it to complete the mission.',
  },
];

export function LabDashboard({
  world,
  labMode,
  setLabMode,
  selectedExperiment,
  onSelectExperiment,
  droneMode,
  onSelectDroneMode,
  onStartVR,
  onBack,
}: LabDashboardProps) {
  const isDrone = world === 'drone';

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="absolute inset-0 overflow-y-auto pointer-events-auto"
    >
      <div className="min-h-full w-full bg-gradient-to-b from-slate-950/75 via-slate-950/50 to-slate-950/75 backdrop-blur-[2px]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-8">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2 transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Labs
            </button>
            <span
              className={`text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full border ${
                isDrone
                  ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
                  : 'text-blue-300 border-blue-500/40 bg-blue-500/10'
              }`}
            >
              Lab Dashboard
            </span>
          </div>

          {/* Title */}
          <div className="flex items-center gap-5">
            <div
              className={`w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 ${
                isDrone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
              }`}
            >
              {isDrone ? <Activity className="w-8 h-8" /> : <FlaskConical className="w-8 h-8" />}
            </div>
            <div>
              <h2 className="text-3xl font-black text-white">
                {isDrone ? 'Drone Flight Academy' : 'Chemistry Lab'}
              </h2>
              <p className="text-sm text-slate-400">
                {isDrone
                  ? 'Realistic desert flight training · FPV cameras · live telemetry'
                  : 'Guided experiments · realistic reactions · open sandbox'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left: overview */}
            <div className="space-y-5">
              <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 space-y-4">
                <h3 className="font-black text-white text-lg tracking-wide">Overview</h3>
                {isDrone ? (
                  <>
                    <p className="text-[13px] text-slate-300 leading-relaxed">
                      Walk a full desert drone academy — HQ, hangars, control tower, solar farm and display wing —
                      then launch your quad from the flight terminal. The drone obeys true physics — gravity,
                      thrust, tilt, drag and battery — with live FPV OSD and chase or orbit cameras.
                    </p>
                    <ul className="space-y-2 text-[12px] text-slate-300">
                      <li className="flex items-center gap-2"><Building2 className="w-4 h-4 text-emerald-400 shrink-0" /> Explore a walkable academy campus before flying</li>
                      <li className="flex items-center gap-2"><Trophy className="w-4 h-4 text-emerald-400 shrink-0" /> Track your best race time</li>
                      <li className="flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-400 shrink-0" /> Live altitude, speed, heading, battery & throttle</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="text-[13px] text-slate-300 leading-relaxed">
                      A fully equipped 3D laboratory. Open wall racks, pick glassware and chemicals, mix and heat
                      reactions with realistic results. Follow guided protocols step by step with AI Nova, or go
                      freestyle in sandbox mode.
                    </p>
                    <ul className="space-y-2 text-[12px] text-slate-300">
                      <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" /> Complete safety — no real hazards</li>
                      <li className="flex items-center gap-2"><Activity className="w-4 h-4 text-blue-400 shrink-0" /> Reagents, neutralization & reactions</li>
                      <li className="flex items-center gap-2"><Keyboard className="w-4 h-4 text-blue-400 shrink-0" /> Full keyboard & voice control</li>
                    </ul>
                  </>
                )}
              </div>

              {/* Controls */}
              <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 space-y-3">
                <h3 className="font-black text-white text-base tracking-wide">Controls</h3>
                {isDrone ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] text-slate-400 font-mono">
                    <span>WASD — walk the academy</span>
                    <span>Drag — look around</span>
                    <span>E — launch drone at terminal</span>
                    <span>W / S — throttle up / down</span>
                    <span>↑ ↓ — pitch forward / back</span>
                    <span>← → — roll left / right</span>
                    <span>A / D — yaw left / right</span>
                    <span>Shift — turbo boost</span>
                    <span>Space — takeoff / land</span>
                    <span>R — reset &nbsp;·&nbsp; M — mode</span>
                    <span>C — camera (FPV / chase / orbit)</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] text-slate-400 font-mono">
                    <span>WASD — walk around</span>
                    <span>Mouse — look around</span>
                    <span>1 / 2 / 3 — open racks</span>
                    <span>Space — talk to Nova</span>
                    <span>N — Nova voice guide</span>
                    <span>F — toggle heat · P — pour</span>
                  </div>
                )}
                <p className="text-[10px] text-slate-500">
                  {isDrone
                    ? 'Works with keyboard, Bluetooth/USB gamepad, or the phone controller (QR bottom-left). VR headset supported when connected.'
                    : 'VR headset supported when connected.'}
                </p>
              </div>
            </div>

            {/* Right: setup */}
            <div
              className={`bg-slate-900/60 border rounded-3xl p-6 space-y-5 ${
                isDrone ? 'border-emerald-500/25' : 'border-blue-500/25'
              }`}
            >
              <h3 className="font-black text-white text-lg tracking-wide">
                {isDrone ? 'Choose Training Mode' : 'Choose Protocol'}
              </h3>

              {isDrone ? (
                <div className="space-y-3">
                  {DRONE_MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => onSelectDroneMode(m.id)}
                      className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                        droneMode === m.id
                          ? 'bg-emerald-600/20 border-emerald-400 ring-2 ring-emerald-500/40'
                          : 'bg-white/5 border-white/10 hover:border-white/25'
                      }`}
                    >
                      <m.icon className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">{m.title}</span>
                          <span className="text-[10px] font-black text-emerald-400 uppercase">{modeLabel(m.id)}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{m.desc}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 mt-1 shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex bg-slate-800/80 rounded-xl p-1 w-full">
                    <button
                      onClick={() => setLabMode('guided')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        labMode === 'guided' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Guided Protocol
                    </button>
                    <button
                      onClick={() => setLabMode('sandbox')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        labMode === 'sandbox' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Open Sandbox
                    </button>
                  </div>

                  {labMode === 'guided' ? (
                    <div className="space-y-3">
                      {EXPERIMENTS.map((exp) => (
                        <button
                          key={exp.id}
                          onClick={() => onSelectExperiment(exp)}
                          className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                            selectedExperiment?.id === exp.id
                              ? 'bg-blue-600/20 border-blue-400 ring-2 ring-blue-500/40'
                              : 'bg-white/5 border-white/10 hover:border-white/25'
                          }`}
                        >
                          <FlaskConical className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-sm">{exp.name}</span>
                              <span className="text-[10px] font-black text-blue-400 uppercase">{exp.steps.length} Steps</span>
                            </div>
                            <p className="text-[11px] text-sky-200 mt-1 italic">{exp.aim}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-500 mt-1 shrink-0" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/20 text-slate-300 text-sm leading-relaxed">
                      <p className="font-bold text-white mb-1">Open Sandbox Mode</p>
                      <p className="text-[12px]">
                        Full access to all wall shelves. Pick glassware, mix reagents, ignite the Bunsen burner and
                        conduct unrestricted reactions.
                      </p>
                    </div>
                  )}
                </>
              )}

              <button
                onClick={onStartVR}
                className={`w-full text-white font-black py-5 rounded-2xl uppercase tracking-widest text-base transition-all flex justify-center items-center gap-3 border shadow-[0_0_30px_rgba(37,99,235,0.3)] ${
                  isDrone
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)] border-emerald-400/40'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.4)] border-blue-400/40'
                }`}
              >
                <Play className="w-5 h-5 fill-current" /> {isDrone ? 'ENTER DRONE ACADEMY' : 'ENTER CHEMISTRY LAB'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
