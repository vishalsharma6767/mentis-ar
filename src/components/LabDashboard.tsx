import { motion } from 'framer-motion';
import { FlaskConical, Orbit, Play, ChevronLeft, ChevronRight, ShieldCheck, Keyboard, Hand, Camera, Volume2, Sparkles } from 'lucide-react';
import { Experiment, EXPERIMENTS } from '../types';

interface LabDashboardProps {
  world: 'chemistry' | 'solar';
  labMode: 'guided' | 'sandbox';
  setLabMode: (mode: 'guided' | 'sandbox') => void;
  selectedExperiment: Experiment | null;
  onSelectExperiment: (exp: Experiment) => void;
  onStartVR: () => void;
  onBack: () => void;
}

export function LabDashboard({
  world,
  labMode,
  setLabMode,
  selectedExperiment,
  onSelectExperiment,
  onStartVR,
  onBack,
}: LabDashboardProps) {
  const isSolar = world === 'solar';

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
                isSolar
                  ? 'text-indigo-300 border-indigo-500/40 bg-indigo-500/10'
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
                isSolar ? 'bg-indigo-500/20 text-indigo-400' : 'bg-blue-500/20 text-blue-400'
              }`}
            >
              {isSolar ? <Orbit className="w-8 h-8" /> : <FlaskConical className="w-8 h-8" />}
            </div>
            <div>
              <h2 className="text-3xl font-black text-white">
                {isSolar ? 'Solar System Academy' : 'Chemistry Lab'}
              </h2>
              <p className="text-sm text-slate-400">
                {isSolar
                  ? 'Mixed reality · AI voice astronomy · hand tracking'
                  : 'Guided experiments · realistic reactions · open sandbox'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left: overview */}
            <div className="space-y-5">
              <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 space-y-4">
                <h3 className="font-black text-white text-lg tracking-wide">Overview</h3>
                {isSolar ? (
                  <>
                    <p className="text-[13px] text-slate-300 leading-relaxed">
                      Put your phone in the VR headset and the camera opens — the Sun, all eight planets and the
                      Moon float over your real room. Look with the reticle, pinch in front of the camera to grab
                      a planet and drag it around, pinch with two hands to zoom. Nova teaches you about every
                      planet by voice, in English or Hindi.
                    </p>
                    <ul className="space-y-2 text-[12px] text-slate-300">
                      <li className="flex items-center gap-2"><Camera className="w-4 h-4 text-indigo-400 shrink-0" /> Mixed-reality camera passthrough (works in the headset)</li>
                      <li className="flex items-center gap-2"><Hand className="w-4 h-4 text-emerald-400 shrink-0" /> Pinch to grab, drag & rotate planets by hand</li>
                      <li className="flex items-center gap-2"><Volume2 className="w-4 h-4 text-amber-400 shrink-0" /> Ask Nova anything — “tell me about Saturn”</li>
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
                      <li className="flex items-center gap-2"><FlaskConical className="w-4 h-4 text-blue-400 shrink-0" /> Reagents, neutralization & reactions</li>
                      <li className="flex items-center gap-2"><Keyboard className="w-4 h-4 text-blue-400 shrink-0" /> Full keyboard & voice control</li>
                    </ul>
                  </>
                )}
              </div>

              {/* Controls */}
              <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 space-y-3">
                <h3 className="font-black text-white text-base tracking-wide">Controls</h3>
                {isSolar ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] text-slate-400 font-mono">
                    <span>Reticle (centre) — look to select</span>
                    <span>Pinch — grab & drag planet</span>
                    <span>Two-hand pinch — zoom in / out</span>
                    <span>Space — talk to Nova</span>
                    <span>C — camera on / off</span>
                    <span>R — reset planets</span>
                    <span>Drag — rotate model (out of headset)</span>
                    <span>Scroll — zoom (out of headset)</span>
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
                  {isSolar
                    ? 'Best with the phone in your VR headset — the camera shows your room. Hand tracking also works with the phone out of the headset.'
                    : 'VR headset supported when connected.'}
                </p>
              </div>
            </div>

            {/* Right: setup */}
            <div
              className={`bg-slate-900/60 border rounded-3xl p-6 space-y-5 ${
                isSolar ? 'border-indigo-500/25' : 'border-blue-500/25'
              }`}
            >
              {isSolar ? (
                <>
                  <div className="space-y-3">
                    <h3 className="font-black text-white text-lg tracking-wide">What you will see</h3>
                    {[
                      { icon: Sparkles, title: 'The Sun & 8 planets + the Moon', desc: 'A true-to-order model of the solar system floating in your room, with orbiting motion.' },
                      { icon: Hand, title: 'Grab by hand', desc: 'Pinch in front of the camera to pick up a planet, then move it around the room.' },
                      { icon: Volume2, title: 'Nova teaches by voice', desc: 'Say a planet name and Nova tells you its story — in English or Hindi (हिंदी).' },
                    ].map((m) => (
                      <div
                        key={m.title}
                        className="w-full p-4 rounded-2xl border border-white/10 bg-white/5 text-left flex items-start gap-3"
                      >
                        <m.icon className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <div className="font-bold text-white text-sm">{m.title}</div>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{m.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-black text-white text-lg tracking-wide">Choose Protocol</h3>
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
                  isSolar
                    ? 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)] border-indigo-400/40'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.4)] border-blue-400/40'
                }`}
              >
                <Play className="w-5 h-5 fill-current" /> {isSolar ? 'ENTER SOLAR SYSTEM ACADEMY' : 'ENTER CHEMISTRY LAB'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
