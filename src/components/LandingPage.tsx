import { motion } from 'framer-motion';
import { Sparkles, FlaskConical, Activity, Headset, Bot, Boxes, GaugeCircle, ArrowRight, GraduationCap, Wifi, Cpu } from 'lucide-react';

interface LandingPageProps {
  onOpenLab: (world: 'chemistry' | 'drone') => void;
}

const FEATURES = [
  {
    icon: Boxes,
    title: 'Immersive 3D Training Labs',
    desc: 'Step inside fully interactive 3D environments built for hands-on, safe and repeatable training.',
  },
  {
    icon: Headset,
    title: 'VR Headset Ready',
    desc: 'Slip on your VR headset and move through labs naturally — with controllers, hands and presence.',
  },
  {
    icon: Bot,
    title: 'AI Assistant Nova',
    desc: 'A spoken AI guide that explains every step, corrects mistakes and answers questions in real time.',
  },
  {
    icon: GaugeCircle,
    title: 'Real-time Physics',
    desc: 'Chemical reactions and drone flight behave with realistic physics, live telemetry and instant feedback.',
  },
];

const LABS = [
  {
    world: 'chemistry' as const,
    icon: FlaskConical,
    title: 'Chemistry Lab',
    tagline: 'Reagents, Neutralization & Reactions',
    desc: 'Mix glassware, ignite the Bunsen burner, run guided experiments or explore an open sandbox. Guided protocols with step-by-step AI support.',
    accent: 'blue',
    points: ['Guided experiments + open sandbox', 'Realistic reactions & color mixing', 'AI Nova voice guidance'],
  },
  {
    world: 'drone' as const,
    icon: Activity,
    title: 'Drone Flight Academy',
    tagline: 'FPV Racing, Missions & Free Flight',
    desc: 'Take off over a real desert training field. Fly first-person with a live OSD, race through gates, deliver mission packages and learn true stick control.',
    accent: 'emerald',
    points: ['Realistic desert world & FPV cameras', 'Free flight, gate racing & missions', 'Keyboard, gamepad or phone controller'],
  },
];

export function LandingPage({ onOpenLab }: LandingPageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="absolute inset-0 overflow-y-auto pointer-events-auto"
    >
      <div className="min-h-full w-full bg-gradient-to-b from-slate-950/80 via-slate-950/50 to-slate-950/80 backdrop-blur-[2px]">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col gap-12">
          {/* Header */}
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-[0_0_30px_rgba(37,99,235,0.5)]">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-blue-400">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-wider text-white flex items-center gap-2">
                  MENTIS <span className="text-blue-500 font-light">VR</span>
                </h1>
                <p className="text-xs text-blue-300 font-medium tracking-widest uppercase">
                  Immersive 3D Training Labs
                </p>
              </div>
            </div>
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-slate-400 border border-slate-800 bg-slate-900/70 rounded-full px-3 py-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" /> Real-time Physics Engine
            </span>
          </header>

          {/* Hero */}
          <section className="text-center space-y-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-sky-300 bg-sky-500/10 border border-sky-500/30 rounded-full px-4 py-1.5">
                <GraduationCap className="w-3.5 h-3.5" /> Virtual Training Platform
              </span>
            </motion.div>
            <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
              Train like it's real.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-emerald-400">
                Before it's real.
              </span>
            </h2>
            <p className="max-w-2xl mx-auto text-slate-300 text-sm md:text-base leading-relaxed">
              Mentis VR turns any room into a training facility. We provide fully 3D, interactive training labs —
              from the chemistry bench to the drone flight field — with VR headset support, an AI voice assistant
              and realistic real-time physics. Learn by doing, safely and repeatedly.
            </p>
          </section>

          {/* Feature strip */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 flex flex-col gap-2.5 hover:border-white/25 transition-all"
              >
                <f.icon className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-bold text-white">{f.title}</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </section>

          {/* Labs segment */}
          <section>
            <div className="flex items-center gap-3 mb-5">
              <span className="w-8 h-px bg-gradient-to-r from-transparent to-blue-500" />
              <h2 className="text-xl font-black text-white tracking-wide uppercase">Choose Your Lab</h2>
              <span className="w-8 h-px bg-gradient-to-l from-transparent to-blue-500" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {LABS.map((lab) => (
                <button
                  key={lab.world}
                  onClick={() => onOpenLab(lab.world)}
                  className={`group text-left p-6 rounded-3xl border transition-all bg-black/40 hover:scale-[1.02] ${
                    lab.accent === 'blue'
                      ? 'border-white/10 hover:border-blue-500/60 hover:shadow-[0_0_40px_rgba(37,99,235,0.25)]'
                      : 'border-white/10 hover:border-emerald-500/60 hover:shadow-[0_0_40px_rgba(16,185,129,0.25)]'
                  }`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                        lab.accent === 'blue'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      <lab.icon className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="font-black text-white text-lg">{lab.title}</div>
                      <div className="text-xs text-slate-400">{lab.tagline}</div>
                    </div>
                  </div>
                  <p className="text-[12px] text-slate-300 leading-relaxed mb-4">{lab.desc}</p>
                  <ul className="space-y-1.5 mb-5">
                    {lab.points.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-[11px] text-slate-400">
                        <Wifi className="w-3 h-3 text-emerald-400 shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <div
                    className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest ${
                      lab.accent === 'blue' ? 'text-blue-400 group-hover:text-blue-300' : 'text-emerald-400 group-hover:text-emerald-300'
                    }`}
                  >
                    Open Dashboard <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </button>
              ))}
            </div>
          </section>

          <footer className="text-center text-[10px] text-slate-500 font-mono pb-2">
            Mentis VR · 3D Training Labs · VR-Ready · AI-Assisted
          </footer>
        </div>
      </div>
    </motion.div>
  );
}
