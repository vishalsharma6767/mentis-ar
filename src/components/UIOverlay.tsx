import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  FlaskConical,
  Atom,
  Dna,
  Play,
  Mic,
  ChevronRight,
  Activity,
  Volume2,
  RotateCcw
} from 'lucide-react';
import { Experiment, EXPERIMENTS } from '../types';

interface UIOverlayProps {
  mode: 'menu' | 'countdown' | 'lab';
  countdown: number;
  selectedLab: 'chemistry' | 'physics' | 'biology';
  setSelectedLab: (lab: 'chemistry' | 'physics' | 'biology') => void;
  labMode: 'guided' | 'sandbox';
  setLabMode: (mode: 'guided' | 'sandbox') => void;
  selectedExperiment: Experiment | null;
  onSelectExperiment: (exp: Experiment) => void;
  onStartVR: () => void;
  novaMessage: string;
  isListening: boolean;
  voiceError?: string | null;
  onAskNovaGuide?: () => void;
  onResetExperimentEquipment?: () => void;
}

export function UIOverlay({
  mode,
  countdown,
  selectedLab,
  setSelectedLab,
  labMode,
  setLabMode,
  selectedExperiment,
  onSelectExperiment,
  onStartVR,
  novaMessage,
  isListening,
  voiceError,
  onAskNovaGuide,
  onResetExperimentEquipment,
}: UIOverlayProps) {
  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-6">
      <AnimatePresence>
        {mode === 'menu' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col justify-between max-w-7xl w-full mx-auto"
          >
            {/* Header */}
            <header className="flex justify-between items-start pointer-events-auto">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-[0_0_30px_rgba(37,99,235,0.5)]">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-blue-400">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-wider text-white flex items-center gap-2">
                    MENTIS <span className="text-blue-500 font-light">VR LAB</span>
                  </h1>
                  <p className="text-xs text-blue-300 font-medium tracking-widest uppercase">
                    Interactive Chemistry Simulator
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 p-1.5 rounded-2xl backdrop-blur-xl">
                <button
                  onClick={() => setLabMode('guided')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    labMode === 'guided'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Guided Protocol
                </button>
                <button
                  onClick={() => setLabMode('sandbox')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    labMode === 'sandbox'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Open Sandbox
                </button>
              </div>
            </header>

            {/* Center Content */}
            <main className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center my-auto">
              {/* Left Column - Lab Discipline Selection */}
              <div className="md:col-span-4 space-y-4 pointer-events-auto">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block mb-2">
                  1. Select Discipline
                </span>

                <button
                  onClick={() => setSelectedLab('chemistry')}
                  className={`w-full p-5 rounded-3xl border transition-all flex items-center gap-4 text-left ${
                    selectedLab === 'chemistry'
                      ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.3)] scale-[1.02]'
                      : 'bg-black/40 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <FlaskConical className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-lg">Chemistry Lab</div>
                    <div className="text-xs text-slate-400">Reagents, Neutralization & Reactions</div>
                  </div>
                </button>

                <button
                  disabled
                  className="w-full p-5 rounded-3xl border border-white/5 bg-black/20 text-slate-500 flex items-center gap-4 text-left opacity-50 cursor-not-allowed"
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                    <Atom className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-400 text-lg">Physics Lab</div>
                    <div className="text-xs text-slate-600">Optics, Mechanics & Electromagnetism</div>
                  </div>
                </button>

                <button
                  disabled
                  className="w-full p-5 rounded-3xl border border-white/5 bg-black/20 text-slate-500 flex items-center gap-4 text-left opacity-50 cursor-not-allowed"
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                    <Dna className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-400 text-lg">Biology Lab</div>
                    <div className="text-xs text-slate-600">Cellular Structures & Dissection</div>
                  </div>
                </button>
              </div>

              {/* Middle Column - Experiment Catalog / Guided Selection */}
              <div className="md:col-span-8 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 pointer-events-auto shadow-2xl space-y-6">
                <div>
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block mb-1">
                    2. Choose Protocol
                  </span>
                  <h2 className="text-2xl font-black text-white">Select Predefined Experiment</h2>
                </div>

                {labMode === 'guided' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {EXPERIMENTS.map((exp) => (
                      <button
                        key={exp.id}
                        onClick={() => onSelectExperiment(exp)}
                        className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                          selectedExperiment?.id === exp.id
                            ? 'bg-blue-600/30 border-blue-400 shadow-xl ring-2 ring-blue-500/50'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 block mb-1">
                            Guided Protocol
                          </span>
                          <h3 className="font-bold text-white text-sm mb-1.5">{exp.name}</h3>
                          <p className="text-[11px] text-sky-200 line-clamp-2 mb-2 italic">
                            Aim: {exp.aim}
                          </p>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Includes: {exp.initialTableItems.map((i) => i.name.split(' ')[0]).join(', ')}
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-xs font-bold text-blue-400">
                          <span>{exp.steps.length} Steps</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-blue-950/40 border border-blue-500/20 text-slate-300 text-sm leading-relaxed">
                    <p className="font-bold text-white mb-2">Open Sandbox Mode Activated</p>
                    <p>
                      You have full access to all wall shelves. Pick glassware, mix reagents, ignite the Bunsen burner, and conduct unrestricted reactions!
                    </p>
                  </div>
                )}

                {/* Enter Lab Action Button */}
                <button
                  onClick={onStartVR}
                  disabled={selectedLab !== 'chemistry'}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-base transition-all shadow-[0_0_30px_rgba(37,99,235,0.4)] flex justify-center items-center gap-3 border border-blue-400/40"
                >
                  <Play className="w-5 h-5 fill-current" /> ENTER CHEMISTRY LAB
                </button>
              </div>
            </main>
          </motion.div>
        )}

        {mode === 'countdown' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 2 }}
            className="flex-1 flex flex-col items-center justify-center pointer-events-auto bg-black/80 backdrop-blur-sm"
          >
            <div className="text-[12rem] font-black text-white drop-shadow-[0_0_50px_rgba(37,99,235,0.8)] mb-8 leading-none">
              {countdown}
            </div>
            <div className="bg-blue-600 text-white px-10 py-4 rounded-full font-black uppercase tracking-[0.3em] shadow-[0_0_30px_rgba(37,99,235,0.6)] animate-pulse text-center">
              Entering Chemistry Lab Room...<br />
              <span className="text-[10px] font-medium opacity-80 normal-case tracking-normal mt-1 block">
                Use WASD to Walk, Mouse to Look Around, Keys 1-3 to Open Racks
              </span>
            </div>
          </motion.div>
        )}

        {mode === 'lab' && (
          <>
            {/* Top Left - Small Compact Experiment Badge & Selector */}
            <div className="absolute top-6 left-6 pointer-events-auto z-20">
              {labMode === 'guided' && selectedExperiment && (
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="bg-slate-900/90 backdrop-blur-2xl text-white px-3.5 py-2 rounded-2xl shadow-xl border border-sky-500/30 flex items-center gap-2.5"
                >
                  <div className="flex items-center gap-1.5 text-sky-400 font-black text-xs">
                    <FlaskConical className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Experiment:</span>
                  </div>

                  {/* Quick Experiment Selector inside Lab */}
                  <select
                    value={selectedExperiment.id}
                    onChange={(e) => {
                      const found = EXPERIMENTS.find((x) => x.id === e.target.value);
                      if (found) onSelectExperiment(found);
                    }}
                    className="bg-slate-800 border border-slate-700 text-xs font-bold text-sky-300 px-2 py-1 rounded-xl focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {EXPERIMENTS.map((exp) => (
                      <option key={exp.id} value={exp.id}>
                        {exp.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={onAskNovaGuide}
                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-1 px-2.5 rounded-xl transition-all flex items-center gap-1 shrink-0"
                    title="Ask AI Nova for Speech Guidance"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Voice Guide</span>
                  </button>

                  <button
                    onClick={onResetExperimentEquipment}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs py-1 px-2.5 rounded-xl transition-all flex items-center gap-1 shrink-0"
                    title="Reset Preset Equipment on Table"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </motion.div>
              )}
            </div>

            {/* Top Right - Voice Indicator Button */}
            <div className="absolute top-6 right-6 pointer-events-auto flex flex-col items-end gap-2 z-20">
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={`flex items-center gap-3 px-5 py-2.5 rounded-full backdrop-blur-xl border transition-all ${
                  isListening
                    ? 'bg-blue-600/90 border-blue-400 shadow-[0_0_25px_rgba(37,99,235,0.6)] scale-105'
                    : 'bg-slate-900/90 border-slate-800 shadow-2xl'
                }`}
              >
                <Mic className={`w-4 h-4 ${isListening ? 'text-white animate-pulse' : 'text-blue-400'}`} />
                <div className="flex flex-col">
                  <span className="text-white font-bold text-[11px] tracking-wider uppercase">
                    {isListening ? 'Listening...' : 'Spacebar / N for Nova'}
                  </span>
                  <span className="text-[9px] text-blue-200 font-medium uppercase tracking-widest">
                    Nova Voice AI Assistant
                  </span>
                </div>
              </motion.div>

              {voiceError && (
                <div className="bg-slate-900/95 border border-amber-500/40 text-amber-300 text-[10px] px-3 py-1.5 rounded-xl max-w-xs text-right shadow-xl">
                  {voiceError}
                </div>
              )}
            </div>

            {/* TOP CENTER - MINIMAL NON-INTRUSIVE STATUS BADGE */}
            {novaMessage && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-auto max-w-lg w-full px-4 z-20">
                <motion.div
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="bg-slate-900/90 border border-sky-500/30 backdrop-blur-md text-white px-4 py-2 rounded-2xl shadow-lg text-center flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <p className="text-xs text-sky-100 font-medium truncate">
                    {novaMessage}
                  </p>
                </motion.div>
              </div>
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
