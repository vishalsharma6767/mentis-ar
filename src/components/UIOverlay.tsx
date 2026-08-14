import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  FlaskConical,
  Mic,
  Volume2,
  RotateCcw,
  Languages,
  Brain,
  Gamepad2,
} from 'lucide-react';
import { Experiment, EXPERIMENTS, NovaLanguage, NovaModelInfo } from '../types';
import { remoteControl } from '../gamepad/gamepadInput';
import { LandingPage } from './LandingPage';
import { LabDashboard } from './LabDashboard';

interface UIOverlayProps {
  mode: 'menu' | 'dashboard' | 'countdown' | 'lab' | 'solar';
  countdown: number;
  world: 'chemistry' | 'solar';
  onOpenLab: (world: 'chemistry' | 'solar') => void;
  onBack: () => void;
  labMode: 'guided' | 'sandbox';
  setLabMode: (mode: 'guided' | 'sandbox') => void;
  selectedExperiment: Experiment | null;
  onSelectExperiment: (exp: Experiment) => void;
  onStartVR: () => void;
  isListening: boolean;
  voiceError?: string | null;
  language: NovaLanguage;
  onLanguageChange: (lang: NovaLanguage) => void;
  models: NovaModelInfo[];
  activeModel: string;
  onModelChange: (modelId: string) => void;
  onAskNovaGuide?: () => void;
  onResetExperimentEquipment?: () => void;
}

export function UIOverlay({
  mode,
  countdown,
  world,
  onOpenLab,
  onBack,
  labMode,
  setLabMode,
  selectedExperiment,
  onSelectExperiment,
  onStartVR,
  isListening,
  voiceError,
  language,
  onLanguageChange,
  models,
  activeModel,
  onModelChange,
  onAskNovaGuide,
  onResetExperimentEquipment,
}: UIOverlayProps) {
  const [, forceTick] = useState(0);

  // Poll the shared bridge state so the chip shows live link status.
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Gamepad status chip appears in the lab, its dashboard and the academy.
  const showPhoneController = mode === 'dashboard' || mode === 'lab' || mode === 'solar';

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-6">
      {/* Bottom Left - Bluetooth Gamepad Status Chip */}
      {showPhoneController && (
        <div className="absolute bottom-6 left-6 pointer-events-auto z-20">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-slate-900/90 border border-emerald-500/30 backdrop-blur-xl rounded-2xl shadow-xl p-3 flex items-center gap-2.5"
          >
            <Gamepad2
              className={`w-5 h-5 shrink-0 ${
                remoteControl.gamepadCount > 0 ? 'text-emerald-400' : 'text-slate-500'
              }`}
            />
            <div className="flex flex-col gap-0.5">
              <span
                className={`flex items-center gap-1.5 text-[11px] font-bold rounded-lg px-1.5 py-0.5 ${
                  remoteControl.gamepadCount > 0
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-slate-800/80 text-slate-400'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    remoteControl.gamepadCount > 0
                      ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]'
                      : 'bg-red-500'
                  }`}
                />
                {remoteControl.gamepadCount > 0
                  ? `Gamepad connected: ${remoteControl.gamepadName || 'active'}`
                  : 'No Bluetooth gamepad yet'}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                Left stick walk · Right stick look · racks & actions on the walls · ray or D-pad to press
              </span>
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {mode === 'menu' && <LandingPage onOpenLab={onOpenLab} />}

        {mode === 'dashboard' && (
          <LabDashboard
            world={world}
            labMode={labMode}
            setLabMode={setLabMode}
            selectedExperiment={selectedExperiment}
            onSelectExperiment={onSelectExperiment}
            onStartVR={onStartVR}
            onBack={onBack}
          />
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
            <div
              className={`text-white px-10 py-4 rounded-full font-black uppercase tracking-[0.3em] shadow-[0_0_30px_rgba(37,99,235,0.6)] animate-pulse text-center ${
                world === 'solar' ? 'bg-indigo-600' : 'bg-blue-600'
              }`}
            >
              {world === 'solar' ? 'Opening Solar System Academy...' : 'Entering Chemistry Lab Room...'}
              <br />
              <span className="text-[10px] font-medium opacity-80 normal-case tracking-normal mt-1 block">
                {world === 'solar'
                  ? 'Camera opens — the Sun and planets float in your room'
                  : 'Use WASD to Walk, Mouse to Look Around, Keys 1-3 to Open Racks'}
              </span>
            </div>
          </motion.div>
        )}

        {mode === 'lab' && (
          <>
            {/* Top Left - AI LANGUAGE + MODEL ROUTER CONTROLS */}
            <div className="absolute top-6 left-6 pointer-events-auto z-20 flex items-center gap-2">
              <div className="bg-slate-900/90 border border-sky-500/30 backdrop-blur-xl rounded-2xl shadow-xl px-3 py-1.5 flex items-center gap-2">
                <Languages className="w-4 h-4 text-sky-400 shrink-0" />
                <div className="flex bg-slate-800 rounded-lg p-0.5">
                  <button
                    onClick={() => onLanguageChange('en-GB')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wide transition-all ${
                      language === 'en-GB' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                    title="English (UK) — British voice"
                  >
                    EN
                  </button>
                  <button
                    onClick={() => onLanguageChange('hi-IN')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wide transition-all ${
                      language === 'hi-IN' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                    title="हिंग्लिश — Indian teacher voice (Hindi + English)"
                  >
                    हिं
                  </button>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-sky-500/30 backdrop-blur-xl rounded-2xl shadow-xl px-3 py-1.5 flex items-center gap-2">
                <Brain className="w-4 h-4 text-sky-400 shrink-0" />
                <select
                  value={activeModel}
                  onChange={(e) => onModelChange(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-[11px] font-bold text-sky-200 px-1.5 py-1 rounded-lg focus:outline-none focus:border-sky-500 cursor-pointer max-w-[190px]"
                  title="Choose which free AI model Nova uses"
                >
                  {models.length === 0 && <option value={activeModel}>Default model…</option>}
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} · {m.providerLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Below AI Controls - Small Compact Experiment Badge & Selector */}
            <div className="absolute top-20 left-6 pointer-events-auto z-20">
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
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
