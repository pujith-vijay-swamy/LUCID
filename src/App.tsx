import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  BarChart2, 
  Settings, 
  LogOut, 
  Send, 
  AlertCircle, 
  Wind, 
  Heart,
  Moon,
  Sun,
  User as UserIcon,
  ChevronRight,
  Info,
  Grid
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LabelList
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, signInWithGoogle, logout, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc, getDocs, limit } from 'firebase/firestore';
import { getCounselorResponse, SentimentResult } from './services/geminiService';
import ReactMarkdown from 'react-markdown';
import StressReliefGame from './components/StressReliefGame';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const LucidLogo = ({ className, size = 24, theme = 'dark' }: { className?: string; size?: number; theme?: 'dark' | 'light' }) => {
  const primaryColor = theme === 'dark' ? 'white' : '#059669'; // emerald-600
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={`lucidGradient-${theme}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={primaryColor} stopOpacity="1" />
          <stop offset="100%" stopColor={primaryColor} stopOpacity="0.6" />
        </linearGradient>
        <filter id={`lucidGlow-${theme}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <g filter={`url(#lucidGlow-${theme})`}>
        <path 
          d="M50 90C27.9086 90 10 72.0914 10 50C10 27.9086 27.9086 10 50 10C72.0914 10 90 27.9086 90 50C90 68 80 85 62 88C52 90 45 85 45 75C45 62 55 52 68 52C81 52 90 62 90 75C90 82 85 88 78 90" 
          stroke={`url(#lucidGradient-${theme})`} 
          strokeWidth="6" 
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path 
          d="M50 82C32.3269 82 18 67.6731 18 50C18 32.3269 32.3269 18 50 18C67.6731 18 82 32.3269 82 50" 
          stroke={primaryColor} 
          strokeWidth="1" 
          strokeOpacity="0.2"
        />
      </g>
    </svg>
  );
};

// --- Constants ---

const STRESSOR_TIPS: Record<string, { title: string; tip: string; color: string; icon: any }> = {
  exams: { 
    title: "Assessments", 
    tip: "Break your tasks into 25-minute blocks (Pomodoro) and take short walks between them to stay fresh.", 
    color: "emerald",
    icon: Sun
  },
  sleep: { 
    title: "Sleep Hygiene", 
    tip: "Try a digital curfew 30 minutes before bed. Dim the lights and avoid blue light to help your brain wind down naturally.", 
    color: "blue",
    icon: Moon
  },
  social: { 
    title: "Social Balance", 
    tip: "It's okay to set boundaries. Prioritize quality interactions over quantity to protect your emotional energy.", 
    color: "purple",
    icon: Heart
  },
  work: { 
    title: "Work Boundaries", 
    tip: "Define a clear 'end of day' ritual to separate your professional responsibilities from your personal space.", 
    color: "emerald",
    icon: LucidLogo
  },
  family: { 
    title: "Family Dynamics", 
    tip: "Focus on what you can control. Practice active listening and take space when conversations feel overwhelming.", 
    color: "blue",
    icon: Heart
  },
  health: { 
    title: "Self-Care", 
    tip: "Small movements matter. Even a 5-minute stretch or a glass of water can significantly shift your physical state.", 
    color: "emerald",
    icon: Sun
  },
  finance: { 
    title: "Financial Focus", 
    tip: "Focus on one small, manageable step today—like reviewing a single subscription or setting a tiny savings goal.", 
    color: "blue",
    icon: BarChart2
  }
};



const GlassCard = ({ children, className, delay = 0, theme = 'dark' }: { children: React.ReactNode; className?: string; delay?: number; theme?: 'dark' | 'light' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={cn(
      "backdrop-blur-3xl border rounded-xl xs:rounded-2xl sm:rounded-[40px] shadow-2xl transition-all duration-500 w-full",
      theme === 'dark' 
        ? "bg-white/10 border-white/20 shadow-black/40" 
        : "bg-white/50 border-white/40 shadow-slate-200/50",
      className
    )}
  >
    {children}
  </motion.div>
);

const CrisisModal = ({ isOpen, onClose, theme = 'dark' }: { isOpen: boolean; onClose: () => void; theme?: 'dark' | 'light' }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className={cn(
            "backdrop-blur-3xl border rounded-[32px] p-6 sm:p-10 max-w-md w-full shadow-2xl relative overflow-hidden",
            theme === 'dark' 
              ? "bg-[#1a1f2e]/90 border-red-500/30 text-white" 
              : "bg-white/80 border-red-500/20 text-slate-900"
          )}
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500/50" />
          <div className="flex items-center gap-4 text-red-500 mb-6">
            <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center">
              <AlertCircle size={32} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">You are not alone</h2>
              <p className="text-xs uppercase tracking-widest opacity-60">Crisis Support</p>
            </div>
          </div>
          <p className={cn(
            "mb-8 text-sm sm:text-base leading-relaxed font-medium",
            theme === 'dark' ? "text-white/80" : "text-slate-700"
          )}>
            It sounds like you're going through a very difficult time. Please know that your life matters, and there are people who want to support you through this.
          </p>
          <div className="space-y-4 mb-10">
            <div className={cn(
              "p-5 rounded-2xl border transition-colors",
              theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/5"
            )}>
              <p className={cn(
                "text-[10px] sm:text-xs uppercase tracking-[0.2em] mb-2 font-bold",
                theme === 'dark' ? "text-white/30" : "text-slate-400"
              )}>National Suicide Prevention Lifeline</p>
              <p className={cn("text-xl sm:text-2xl font-mono font-bold", theme === 'dark' ? "text-white" : "text-slate-900")}>988</p>
            </div>
            <div className={cn(
              "p-5 rounded-2xl border transition-colors",
              theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/5"
            )}>
              <p className={cn(
                "text-[10px] sm:text-xs uppercase tracking-[0.2em] mb-2 font-bold",
                theme === 'dark' ? "text-white/30" : "text-slate-400"
              )}>Crisis Text Line</p>
              <p className={cn("text-xl sm:text-2xl font-mono font-bold", theme === 'dark' ? "text-white" : "text-slate-900")}>Text HOME to 741741</p>
            </div>
            <div className={cn(
              "p-5 rounded-2xl border transition-colors",
              theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/5"
            )}>
              <p className={cn(
                "text-[10px] sm:text-xs uppercase tracking-[0.2em] mb-2 font-bold",
                theme === 'dark' ? "text-white/30" : "text-slate-400"
              )}>International Resources</p>
              <a 
                href="https://findahelpline.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className={cn("text-sm font-medium underline", theme === 'dark' ? "text-emerald-400" : "text-emerald-600")}
              >
                Find a helpline in your country
              </a>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 text-sm sm:text-base active:scale-[0.98]"
          >
            I understand, thank you
          </button>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const BreathingExercise = () => {
  const [phase, setPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [count, setCount] = useState(4);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((prev) => {
        if (prev === 1) {
          if (phase === 'Inhale') { setPhase('Hold'); return 4; }
          if (phase === 'Hold') { setPhase('Exhale'); return 4; }
          if (phase === 'Exhale') { setPhase('Inhale'); return 4; }
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  return (
    <div className="flex flex-col items-center justify-center p-2 sm:p-8 text-center">
      <motion.div
        animate={{
          scale: phase === 'Inhale' ? 1.2 : phase === 'Exhale' ? 1 : 1.2,
          opacity: phase === 'Hold' ? 0.8 : 1
        }}
        transition={{ duration: 4, ease: "easeInOut" }}
        className="w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-emerald-400/20 border-2 border-emerald-400/40 flex items-center justify-center mb-4 sm:mb-6 shadow-[0_0_40px_rgba(52,211,153,0.2)]"
      >
        <Wind className="text-emerald-400 w-6 h-6 sm:w-10 sm:h-10" />
      </motion.div>
      <h3 className="text-lg sm:text-2xl font-light mb-1 sm:mb-2">{phase}</h3>
      <p className="text-2xl sm:text-4xl font-mono opacity-60">{count}</p>
    </div>
  );
};

const BubblePopGame = ({ theme }: { theme: 'dark' | 'light' }) => {
  const [bubbles, setBubbles] = useState<{ id: number; x: number; y: number; size: number; color: string }[]>([]);
  const [score, setScore] = useState(0);

  const addBubble = () => {
    const id = Date.now() + Math.random();
    const x = Math.random() * 80 + 10;
    const y = Math.random() * 80 + 10;
    const size = Math.random() * 40 + 40;
    const colors = ['bg-emerald-400/30', 'bg-blue-400/30', 'bg-purple-400/30', 'bg-pink-400/30'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    setBubbles(prev => [...prev, { id, x, y, size, color }]);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (bubbles.length < 10) addBubble();
    }, 1000);
    return () => clearInterval(interval);
  }, [bubbles]);

  const popBubble = (id: number) => {
    setBubbles(prev => prev.filter(b => b.id !== id));
    setScore(s => s + 1);
  };

  return (
    <div className="relative w-full h-full min-h-[300px] bg-black/10 rounded-3xl overflow-hidden cursor-crosshair">
      <div className="absolute top-4 left-6 text-sm font-mono opacity-40">Bubbles Popped: {score}</div>
      <AnimatePresence>
        {bubbles.map(bubble => (
          <motion.button
            key={bubble.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            onClick={() => popBubble(bubble.id)}
            style={{ 
              left: `${bubble.x}%`, 
              top: `${bubble.y}%`, 
              width: bubble.size, 
              height: bubble.size 
            }}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 backdrop-blur-sm shadow-xl transition-transform hover:scale-110 active:scale-90",
              bubble.color
            )}
          />
        ))}
      </AnimatePresence>
      {bubbles.length === 0 && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center italic",
          theme === 'dark' ? "text-white/20" : "text-black/20"
        )}>
          Wait for bubbles...
        </div>
      )}
    </div>
  );
};

const GamesView = ({ theme }: { theme: 'dark' | 'light' }) => {
  const [activeGame, setActiveGame] = useState<'none' | 'breathing' | 'bubbles' | 'grid'>('none');

  return (
    <div className="w-full max-w-2xl xs:max-w-3xl sm:max-w-4xl mx-auto space-y-3 xs:space-y-6 sm:space-y-8">
      <GlassCard theme={theme} className="p-3 xs:p-6 sm:p-10 flex flex-col min-h-[400px] xs:min-h-[500px] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 xs:mb-8">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold">Stress Relief Games</h3>
              <p className="text-sm opacity-40 mt-1">Take a moment to breathe and reset</p>
            </div>
            <div className="p-3 bg-purple-400/10 rounded-2xl border border-purple-400/20">
              <LucidLogo size={24} theme={theme} />
            </div>
          </div>

          {activeGame === 'none' ? (
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-2 xs:gap-4 lg:gap-6">
              <button
                onClick={() => setActiveGame('breathing')}
                className={cn(
                  "flex flex-col gap-2 xs:gap-4 p-4 xs:p-8 border rounded-2xl xs:rounded-[32px] transition-all text-left group min-h-[120px] xs:min-h-[180px] touch-manipulation",
                  theme === 'dark' ? "bg-white/5 hover:bg-white/10 border-white/10" : "bg-white/40 hover:bg-white/60 border-white/60"
                )}
              >
                <div className="w-14 h-14 bg-emerald-400/20 rounded-2xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Wind size={28} />
                </div>
                <div>
                  <p className="font-bold text-lg">Guided Breathing</p>
                  <p className="text-sm opacity-40 mt-1">Slow down and find your center with rhythmic breathing.</p>
                </div>
                <div className="mt-auto pt-4 flex items-center gap-2 text-xs font-bold text-emerald-400 opacity-0 group-hover:opacity-100 transition-all">
                  START EXERCISE <ChevronRight size={14} />
                </div>
              </button>

              <button
                onClick={() => setActiveGame('bubbles')}
                className={cn(
                  "flex flex-col gap-2 xs:gap-4 p-4 xs:p-8 border rounded-2xl xs:rounded-[32px] transition-all text-left group min-h-[120px] xs:min-h-[180px] touch-manipulation",
                  theme === 'dark' ? "bg-white/5 hover:bg-white/10 border-white/10" : "bg-white/40 hover:bg-white/60 border-white/60"
                )}
              >
                <div className="w-14 h-14 bg-blue-400/20 rounded-2xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                  <Heart size={28} />
                </div>
                <div>
                  <p className="font-bold text-lg">Bubble Pop</p>
                  <p className="text-sm opacity-40 mt-1">Satisfying and mindless relaxation to clear your mind.</p>
                </div>
                <div className="mt-auto pt-4 flex items-center gap-2 text-xs font-bold text-blue-400 opacity-0 group-hover:opacity-100 transition-all">
                  PLAY NOW <ChevronRight size={14} />
                </div>
              </button>

              <button
                onClick={() => setActiveGame('grid')}
                className={cn(
                  "flex flex-col gap-2 xs:gap-4 p-4 xs:p-8 border rounded-2xl xs:rounded-[32px] transition-all text-left group min-h-[120px] xs:min-h-[180px] touch-manipulation",
                  theme === 'dark' ? "bg-white/5 hover:bg-white/10 border-white/10" : "bg-white/40 hover:bg-white/60 border-white/60"
                )}
              >
                <div className="w-14 h-14 bg-amber-400/20 rounded-2xl flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                  <Grid size={28} />
                </div>
                <div>
                  <p className="font-bold text-lg">Stress Grid</p>
                  <p className="text-sm opacity-40 mt-1">Interactive grid to release tension through motion.</p>
                </div>
                <div className="mt-auto pt-4 flex items-center gap-2 text-xs font-bold text-amber-400 opacity-0 group-hover:opacity-100 transition-all">
                  PLAY NOW <ChevronRight size={14} />
                </div>
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <button
                onClick={() => setActiveGame('none')}
                className="flex items-center gap-2 text-sm font-medium opacity-40 hover:opacity-100 transition-opacity mb-6"
              >
                <ChevronRight size={16} className="rotate-180" />
                Back to Games Menu
              </button>
              <div className={cn(
                "flex-1 rounded-[32px] border overflow-hidden relative",
                theme === 'dark' ? "bg-black/5 border-white/5" : "bg-white/30 border-white/40"
              )}>
                {activeGame === 'breathing' && <BreathingExercise />}
                {activeGame === 'bubbles' && <BubblePopGame theme={theme} />}
                {activeGame === 'grid' && <StressReliefGame theme={theme} />}
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    );
  };

const SettingsView = ({ theme, setTheme, logout, user }: { theme: 'dark' | 'light'; setTheme: (t: 'dark' | 'light') => void; logout: () => void; user: User }) => {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 sm:space-y-8 pt-2">
      {/* Profile & Theme */}
        <GlassCard theme={theme} className="p-6 sm:p-10">
          <h3 className="text-xl sm:text-2xl font-bold mb-8">Account Settings</h3>
          <div className="flex flex-col sm:flex-row items-center gap-6 mb-10">
            <div className="w-24 h-24 bg-emerald-400/20 rounded-[32px] flex items-center justify-center border border-emerald-400/30 overflow-hidden shadow-2xl relative group">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="text-emerald-400 w-12 h-12" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Settings className="text-white w-6 h-6 animate-spin-slow" />
              </div>
            </div>
            <div className="text-center sm:text-left">
              <p className="font-bold text-3xl tracking-tight">{user.displayName}</p>
              <p className="text-sm opacity-40 mt-1 font-medium">{user.email}</p>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-400/10 border border-emerald-400/20 rounded-full text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Verified User
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className={cn(
              "p-6 rounded-[32px] border transition-all duration-500",
              theme === 'dark' ? "bg-white/5 border-white/10 shadow-inner" : "bg-white/40 border-white/60 shadow-inner"
            )}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors duration-500",
                    theme === 'dark' ? "bg-indigo-500/20 text-indigo-400" : "bg-amber-500/20 text-amber-500"
                  )}>
                    {theme === 'dark' ? <Moon size={24} /> : <Sun size={24} />}
                  </div>
                  <div>
                    <p className="font-bold text-lg">Appearance</p>
                    <p className="text-xs opacity-40">Choose your preferred interface style</p>
                  </div>
                </div>
              </div>

              <div className={cn(
                "grid grid-cols-2 gap-2 p-1.5 rounded-2xl border relative overflow-hidden",
                theme === 'dark' ? "bg-black/40 border-white/5" : "bg-white/60 border-white/80"
              )}>
                <motion.div
                  initial={false}
                  animate={{ x: theme === 'light' ? 0 : '100%' }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className={cn(
                    "absolute inset-y-1.5 left-1.5 w-[calc(50%-6px)] rounded-xl shadow-xl z-0",
                    theme === 'dark' ? "bg-white/10" : "bg-white"
                  )}
                />
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    "relative z-10 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300",
                    theme === 'light' ? "text-amber-600 font-bold" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  <Sun size={18} className={cn(theme === 'light' ? "animate-pulse" : "")} />
                  <span className="text-sm">Light</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    "relative z-10 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300",
                    theme === 'dark' ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  <Moon size={18} className={cn(theme === 'dark' ? "animate-pulse" : "")} />
                  <span className="text-sm">Dark</span>
                </button>
              </div>
            </div>

            <button
              onClick={logout}
              className={cn(
                "w-full flex items-center justify-between p-6 border rounded-[32px] transition-all group relative overflow-hidden",
                theme === 'dark' ? "bg-red-500/5 hover:bg-red-500/10 border-red-500/10" : "bg-red-500/10 hover:bg-red-500/20 border-red-500/20"
              )}
            >
              <div className="flex items-center gap-4 text-red-400 relative z-10">
                <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <LogOut size={24} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-lg">Sign Out</p>
                  <p className="text-xs opacity-40">Securely end your current session</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-red-400/40 group-hover:translate-x-2 transition-transform relative z-10" />
            </button>
          </div>
        </GlassCard>

        <GlassCard theme={theme} className="p-6 sm:p-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-purple-400/10 rounded-2xl flex items-center justify-center text-purple-400">
              <Info size={24} />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold">About Lucid</h3>
          </div>
          <p className="text-sm opacity-60 leading-relaxed mb-8 text-justify">
            Lucid is your personal companion, designed to provide a safe space for you to express yourself and receive empathetic support. We prioritize your privacy and emotional well-being above all else. Built with advanced AI to understand and support your journey.
          </p>
          <div className={cn(
            "flex flex-col sm:flex-row items-center justify-between pt-8 border-t gap-4",
            theme === 'dark' ? "border-white/5" : "border-black/5"
          )}>
            <div className="text-[10px] uppercase tracking-[0.3em] opacity-30 font-bold">Version 2.1.0 • Standard Edition</div>
            <div className="flex gap-6 opacity-40 text-xs font-bold">
              <button className="hover:text-emerald-400 transition-colors">Privacy Policy</button>
              <button className="hover:text-emerald-400 transition-colors">Terms of Service</button>
            </div>
          </div>
        </GlassCard>

        {/* Footer Info */}
        <footer className="pt-8 pb-4 text-center">
          <p className={cn(
            "text-[10px] uppercase tracking-[0.2em]",
            theme === 'dark' ? "text-white/20" : "text-black/20"
          )}>
            Lucid AI Counselor · Private & Secure · 2026
          </p>
        </footer>
      </div>
    );
  };

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'games' | 'settings'>('chat');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCrisisOpen, setIsCrisisOpen] = useState(false);
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [sentimentData, setSentimentData] = useState<any[]>([]);
  const [stressorData, setStressorData] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const personalizedInsights = useMemo(() => {
    const insights: any[] = [];
    
    // 1. Stressor-based insights
    stressorData.forEach(s => {
      const key = s.name.toLowerCase();
      if (STRESSOR_TIPS[key]) {
        insights.push({ ...STRESSOR_TIPS[key], id: `stressor-${key}` });
      }
    });

    // 2. Sentiment-based insights
    const avgSentiment = sentimentData.length > 0 
      ? sentimentData.reduce((acc, curr) => acc + curr.score, 0) / sentimentData.length 
      : 0;

    if (avgSentiment > 0.4) {
      insights.push({
        title: "Positive Momentum",
        tip: "You've been in a great headspace lately! Take a moment to acknowledge what's working well for you.",
        color: "emerald",
        icon: Sun,
        id: "sentiment-positive"
      });
    } else if (avgSentiment < -0.3) {
      insights.push({
        title: "Grounding Needed",
        tip: "Things feel a bit heavy right now. Try the 'Quick Calm' breathing exercise to reset your nervous system.",
        color: "blue",
        icon: Wind,
        id: "sentiment-negative"
      });
    }

    // Default insight if empty
    if (insights.length === 0) {
      insights.push({
        title: "Daily Check-in",
        tip: "You're doing great by showing up for yourself. Continue to notice your feelings without judgment.",
        color: "emerald",
        icon: Sun,
        id: "default-insight"
      });
    }

    return insights.slice(0, 3);
  }, [stressorData, sentimentData]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('mindglass-theme') as 'dark' | 'light';
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem('mindglass-theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'messages'),
      orderBy('timestamp', 'asc')
    );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Fetched messages:", msgs.length);
        setMessages(msgs);
        
        // Process dashboard data
        const sentimentHistory = msgs
          .filter((m: any) => m.sentiment !== undefined && m.timestamp)
          .map((m: any) => {
            try {
              const date = m.timestamp?.toDate ? m.timestamp.toDate() : new Date(m.timestamp);
              return {
                time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                score: m.sentiment
              };
            } catch (e) {
              return { time: '...', score: m.sentiment };
            }
          })
          .slice(-15);
        
        console.log("Sentiment history:", sentimentHistory.length);
        setSentimentData(sentimentHistory);

        const stressors: Record<string, number> = {};
        msgs.forEach((m: any) => {
          m.stressors?.forEach((s: string) => {
            if (typeof s === 'string') {
              stressors[s] = (stressors[s] || 0) + 1;
            }
          });
        });
        const topStressors = Object.entries(stressors)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);
        
        console.log("Top stressors:", topStressors.length);
        setStressorData(topStressors);
      }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/messages`));

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;

    const text = inputText;
    setInputText('');
    setIsTyping(true);

    try {
      // 1. Save user message
      await addDoc(collection(db, 'users', user.uid, 'messages'), {
        userId: user.uid,
        role: 'user',
        content: text,
        timestamp: serverTimestamp()
      });

      // 2. Get AI response
      const history = messages.slice(-5).map(m => ({ role: m.role, content: m.content }));
      const aiResult = await getCounselorResponse(text, history);

      if (aiResult.isCrisis) setIsCrisisOpen(true);

      // 3. Save AI response
      await addDoc(collection(db, 'users', user.uid, 'messages'), {
        userId: user.uid,
        role: 'model',
        content: aiResult.response,
        timestamp: serverTimestamp(),
        sentiment: aiResult.sentiment,
        stressors: aiResult.stressors
      });

    } catch (err: any) {
      console.error("Error in chat flow", err);
      alert("Error sending message: " + (err?.message || err));
    } finally {
      setIsTyping(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-emerald-400/20 border-t-emerald-400 rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden relative transition-colors duration-500",
        theme === 'dark' ? "bg-[#0a0f1d]" : "bg-gradient-to-br from-slate-50 to-blue-50"
      )}>
        {/* Animated Background Gradients */}
        <div className={cn(
          "absolute top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full animate-pulse",
          theme === 'dark' ? "bg-emerald-500/20" : "bg-emerald-400/30"
        )} />
        <div className={cn(
          "absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full animate-pulse delay-1000",
          theme === 'dark' ? "bg-blue-500/20" : "bg-blue-400/30"
        )} />
        
        <GlassCard theme={theme} className="max-w-md w-full p-6 sm:p-10 text-center relative z-10">
          <div className={cn(
            "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8 border",
            theme === 'dark' ? "bg-white/5 border-white/10" : "bg-emerald-400/10 border-emerald-400/20"
          )}>
            <LucidLogo size={40} theme={theme} />
          </div>
          <h1 className={cn(
            "text-3xl sm:text-4xl font-light mb-3 sm:mb-4 tracking-[0.4em]",
            theme === 'dark' ? "text-white" : "text-slate-900"
          )}>LUCID</h1>
          <p className={cn(
            "text-sm sm:text-base mb-8 sm:mb-10 leading-relaxed px-2",
            theme === 'dark' ? "text-white/60" : "text-slate-600"
          )}>
            A private, empathetic space to navigate your personal journey and well-being.
          </p>
          <button
            onClick={signInWithGoogle}
            className={cn(
              "w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl text-sm sm:text-base",
              theme === 'dark' ? "bg-white text-[#0a0f1d] hover:bg-emerald-50 shadow-emerald-400/10" : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20"
            )}
          >
            <UserIcon size={18} />
            Sign in with Google
          </button>
          <p className={cn(
            "mt-6 text-[10px] uppercase tracking-widest",
            theme === 'dark' ? "text-white/30" : "text-slate-400"
          )}>Secure & Anonymous Venting</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-500 selection:bg-emerald-400/30",
      theme === 'dark' ? "bg-[#0a0f1d] text-white" : "bg-[#f1f5f9] text-[#0a0f1d]"
    )}>
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={cn(
          "absolute top-[-10%] left-1/4 w-[600px] h-[600px] blur-[150px] rounded-full transition-all duration-1000",
          theme === 'dark' ? "bg-blue-600/10 opacity-100" : "bg-emerald-400/20 opacity-70"
        )} />
        <div className={cn(
          "absolute bottom-[-10%] right-1/4 w-[600px] h-[600px] blur-[150px] rounded-full transition-all duration-1000",
          theme === 'dark' ? "bg-purple-600/10 opacity-100" : "bg-blue-400/20 opacity-70"
        )} />
        <div className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] blur-[180px] rounded-full transition-all duration-1000",
          theme === 'dark' ? "bg-indigo-600/5 opacity-100" : "bg-purple-400/10 opacity-50"
        )} />
      </div>

      <CrisisModal isOpen={isCrisisOpen} onClose={() => setIsCrisisOpen(false)} theme={theme} />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 p-2 xs:p-3 sm:p-6">
        <div className={cn(
          "max-w-6xl mx-auto flex items-center justify-between backdrop-blur-3xl border rounded-xl xs:rounded-2xl sm:rounded-3xl px-2 xs:px-4 sm:px-8 py-2 xs:py-3 sm:py-4 shadow-2xl transition-all duration-500",
          theme === 'dark' ? "bg-white/5 border-white/10" : "bg-white/40 border-black/5"
        )}>
          <div className="flex items-center gap-1 xs:gap-2 sm:gap-3">
            <div className={cn(
              "w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-md xs:rounded-lg sm:rounded-xl flex items-center justify-center border transition-all",
              theme === 'dark' ? "bg-white/5 border-white/10" : "bg-emerald-400/10 border-emerald-400/20"
            )}>
              <LucidLogo size={24} theme={theme} />
            </div>
            <span className="text-base xs:text-lg sm:text-xl font-light tracking-[0.3em] hidden xs:block">LUCID</span>
          </div>
          
          <div className={cn(
            "flex items-center gap-0.5 xs:gap-1 sm:gap-2 p-0.5 xs:p-1 rounded-lg xs:rounded-xl sm:rounded-2xl border transition-all",
            theme === 'dark' ? "bg-black/20 border-white/5" : "bg-white/50 border-black/5"
          )}>
            <button
              onClick={() => setActiveTab('chat')}
              className={cn(
                "px-2 xs:px-3 sm:px-6 py-1 xs:py-1.5 sm:py-2 rounded-md xs:rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-1 xs:gap-2",
                activeTab === 'chat' 
                  ? (theme === 'dark' ? "bg-white/10 text-white shadow-lg" : "bg-black/10 text-black shadow-lg")
                  : (theme === 'dark' ? "text-white/40 hover:text-white/60" : "text-black/40 hover:text-black/60")
              )}
            >
              <MessageSquare size={16} />
              <span className="hidden md:inline">Counselor</span>
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                "px-2 xs:px-3 sm:px-6 py-1 xs:py-1.5 sm:py-2 rounded-md xs:rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-1 xs:gap-2",
                activeTab === 'dashboard'
                  ? (theme === 'dark' ? "bg-white/10 text-white shadow-lg" : "bg-black/10 text-black shadow-lg")
                  : (theme === 'dark' ? "text-white/40 hover:text-white/60" : "text-black/40 hover:text-black/60")
              )}
            >
              <BarChart2 size={16} />
              <span className="hidden md:inline">Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('games')}
              className={cn(
                "px-2 xs:px-3 sm:px-6 py-1 xs:py-1.5 sm:py-2 rounded-md xs:rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-1 xs:gap-2",
                activeTab === 'games'
                  ? (theme === 'dark' ? "bg-white/10 text-white shadow-lg" : "bg-black/10 text-black shadow-lg")
                  : (theme === 'dark' ? "text-white/40 hover:text-white/60" : "text-black/40 hover:text-black/60")
              )}
            >
              <LucidLogo size={16} theme={theme} />
              <span className="hidden md:inline">Games</span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-sm font-medium">{user.displayName}</span>
              <span className={cn(
                "text-[10px] uppercase tracking-widest",
                theme === 'dark' ? "text-white/40" : "text-black/40"
              )}>User</span>
            </div>
            <button
              onClick={() => setActiveTab('settings')}
              className={cn(
                "p-1.5 xs:p-2 sm:p-3 border rounded-md xs:rounded-lg sm:rounded-xl transition-all",
                activeTab === 'settings'
                  ? (theme === 'dark' ? "bg-emerald-400/20 border-emerald-400/40 text-emerald-400" : "bg-emerald-400/10 border-emerald-400/20 text-emerald-600")
                  : (theme === 'dark' 
                      ? "bg-white/5 hover:bg-white/10 border-white/10 text-white/60 hover:text-white" 
                      : "bg-black/5 hover:bg-black/10 border-black/10 text-black/60 hover:text-black")
              )}
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </nav>

      <main className="w-full max-w-6xl mx-auto pt-20 sm:pt-36 pb-4 sm:pb-8 px-1.5 xs:px-2 sm:px-6 h-[100dvh] flex flex-col overflow-hidden min-h-[100svh]">
        <AnimatePresence mode="wait">
          {activeTab === 'chat' ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full flex-1 flex flex-col min-h-0 gap-3 sm:gap-6"
            >
              <div className={cn(
                "flex-1 backdrop-blur-2xl border rounded-2xl xs:rounded-3xl sm:rounded-[40px] p-2 xs:p-3 sm:p-8 flex flex-col shadow-2xl min-h-0 relative transition-all duration-500",
                theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
              )}>
                <div className="flex-1 overflow-y-auto pr-0.5 xs:pr-2 sm:pr-4 space-y-3 xs:space-y-5 sm:space-y-8">
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center max-w-xs xs:max-w-md mx-auto space-y-3 xs:space-y-4 sm:space-y-6 px-2 xs:px-4">
                      <div className="w-14 h-14 sm:w-20 sm:h-20 bg-emerald-400/10 rounded-full flex items-center justify-center animate-bounce">
                        <Heart className="text-emerald-400 w-6 h-6 sm:w-8 sm:h-8" />
                      </div>
                      <h2 className="text-lg sm:text-2xl font-light">How are you feeling today?</h2>
                      <p className="text-xs sm:text-base opacity-40 leading-relaxed">
                        I'm here to listen. You can talk about your day, your stress, or anything that's on your mind.
                      </p>
                    </div>
                  )}
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={msg.id || idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-2 sm:gap-4",
                        msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-2xl flex items-center justify-center flex-shrink-0 border",
                        msg.role === 'user' 
                          ? "bg-blue-500/20 border-blue-500/30 text-blue-400" 
                          : (theme === 'dark' ? "bg-white/5 border-white/10" : "bg-emerald-400/10 border-emerald-400/20")
                      )}>
                        {msg.role === 'user' ? <UserIcon className="w-3.5 h-3.5 sm:w-5 sm:h-5" /> : <LucidLogo size={20} theme={theme} />}
                      </div>
                      <div className={cn(
                        "max-w-[95vw] xs:max-w-[90%] sm:max-w-[80%] p-2 xs:p-3.5 sm:p-6 rounded-xl xs:rounded-2xl sm:rounded-3xl leading-relaxed text-xs xs:text-sm backdrop-blur-2xl shadow-xl transition-all duration-300",
                        msg.role === 'user' 
                          ? "bg-blue-500/30 border border-blue-500/40 text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] rounded-tr-none" 
                          : (theme === 'dark' 
                              ? "bg-white/10 border border-white/20 text-white/90 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)] rounded-tl-none" 
                              : "bg-white/60 border border-white/80 text-slate-800 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] rounded-tl-none")
                      )}>
                        <div className={cn(
                          "prose prose-sm max-w-none",
                          theme === 'dark' ? "prose-invert" : ""
                        )}>
                          <ReactMarkdown>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                        {msg.stressors?.length > 0 && (
                          <div className="mt-2.5 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
                            {msg.stressors.map((s: string, idx: number) => (
                              <motion.span 
                                key={s} 
                                initial={{ opacity: 0, scale: 0.8, y: 5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ 
                                  duration: 0.3, 
                                  delay: 0.2 + (idx * 0.1),
                                  ease: "easeOut"
                                }}
                                whileHover={{ scale: 1.1, opacity: 1 }}
                                className={cn(
                                  "px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] uppercase tracking-wider transition-all cursor-default font-bold",
                                  theme === 'dark' 
                                    ? (STRESSOR_TIPS[s.toLowerCase()]?.color === 'blue' ? "bg-blue-500/40 border border-blue-400/50 text-blue-100 shadow-[0_0_10px_rgba(96,165,250,0.3)]" :
                                       STRESSOR_TIPS[s.toLowerCase()]?.color === 'purple' ? "bg-purple-500/40 border border-purple-400/50 text-purple-100 shadow-[0_0_10px_rgba(192,132,252,0.3)]" :
                                       "bg-emerald-500/40 border border-emerald-400/50 text-emerald-100 shadow-[0_0_10px_rgba(52,211,153,0.3)]")
                                    : (STRESSOR_TIPS[s.toLowerCase()]?.color === 'blue' ? "bg-blue-500/10 border border-blue-500/20 text-blue-700" :
                                       STRESSOR_TIPS[s.toLowerCase()]?.color === 'purple' ? "bg-purple-500/10 border border-purple-500/20 text-purple-700" :
                                       "bg-emerald-500/10 border border-emerald-500/20 text-emerald-700")
                                )}
                              >
                                {s}
                              </motion.span>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-2 sm:gap-4">
                      <div className={cn(
                        "w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-2xl flex items-center justify-center border",
                        theme === 'dark' ? "bg-white/5 border-white/10" : "bg-emerald-400/10 border-emerald-400/20"
                      )}>
                        <LucidLogo size={20} theme={theme} />
                      </div>
                      <div className={cn(
                        "p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl rounded-tl-none flex gap-1 items-center border",
                        theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                      )}>
                        <span className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce" />
                        <span className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce delay-100" />
                        <span className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>

                <form onSubmit={handleSendMessage} className="mt-2 xs:mt-3 sm:mt-8 relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Tell me what's on your mind..."
                    className={cn(
                      "w-full border rounded-lg xs:rounded-xl sm:rounded-2xl px-3 xs:px-4 sm:px-8 py-2.5 xs:py-3.5 sm:py-5 pr-12 xs:pr-14 sm:pr-20 focus:outline-none focus:border-emerald-400/50 transition-all placeholder:opacity-30 text-xs xs:text-sm sm:text-base",
                      theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                    )}
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isTyping}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-2 xs:right-1.5 xs:p-2.5 sm:right-3 sm:p-3 bg-emerald-400 text-[#0a0f1d] rounded-md xs:rounded-lg sm:rounded-xl hover:bg-emerald-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </form>
              </div>
            </motion.div>
          ) : activeTab === 'dashboard' ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full flex-1 overflow-y-auto px-0.5 xs:px-1 sm:px-2 grid grid-cols-1 lg:grid-cols-3 gap-2 xs:gap-4 sm:gap-8 pb-8 min-h-0"
            >
              {/* Mood Trend */}
              <GlassCard theme={theme} className="lg:col-span-2 p-5 sm:p-8 min-h-[320px] sm:min-h-[400px] flex flex-col">
                <div className="flex items-center justify-between mb-5 sm:mb-8">
                  <div>
                    <h3 className="text-base sm:text-xl font-bold">Mood Trend</h3>
                    <p className="text-[10px] sm:text-sm opacity-40">Your sentiment over recent interactions</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-emerald-400/10 rounded-lg sm:rounded-2xl border border-emerald-400/20">
                    <BarChart2 className="text-emerald-400 w-4 h-4 sm:w-6 sm:h-6" />
                  </div>
                </div>
                <div className="flex-1 w-full relative min-h-[200px] sm:min-h-[250px]">
                  {sentimentData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sentimentData} margin={{ left: -30, right: 10, top: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "#ffffff10" : "#00000010"} vertical={false} />
                        <XAxis 
                          dataKey="time" 
                          tick={{ fill: theme === 'dark' ? '#ffffff' : '#334155', fontSize: 9 }}
                          tickLine={false} 
                          axisLine={false}
                          dy={10}
                          hide={sentimentData.length > 8}
                        />
                        <YAxis 
                          tick={{ fill: theme === 'dark' ? '#ffffff' : '#334155', fontSize: 9 }}
                          tickLine={false} 
                          axisLine={false}
                          domain={[-1, 1]}
                          ticks={[-1, -0.5, 0, 0.5, 1]}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
                            border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.1)', 
                            borderRadius: '12px',
                            fontSize: '12px',
                            padding: '10px 14px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                            color: theme === 'dark' ? '#ffffff' : '#000000'
                          }} 
                          itemStyle={{
                            color: theme === 'dark' ? '#ffffff' : '#000000',
                            fontWeight: 'bold',
                            fontSize: '12px'
                          }}
                          labelStyle={{
                            color: theme === 'dark' ? '#cbd5e1' : '#475569',
                            marginBottom: '6px',
                            fontWeight: '600'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="score" 
                          stroke="#34d399" 
                          strokeWidth={2.5} 
                          dot={{ r: 2, fill: '#34d399', strokeWidth: 0 }}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center opacity-20 text-xs italic">
                      Start chatting to see your mood trend
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* Stressor Analysis */}
              <GlassCard theme={theme} className="p-5 sm:p-8 min-h-[280px] sm:min-h-[400px] flex flex-col">
                <div className="flex items-center justify-between mb-5 sm:mb-8">
                  <div>
                    <h3 className="text-base sm:text-xl font-bold">Stressors</h3>
                    <p className="text-[10px] sm:text-sm opacity-40">Common themes</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-blue-400/10 rounded-lg sm:rounded-2xl border border-blue-400/20">
                    <AlertCircle className="text-blue-400 w-4 h-4 sm:w-6 sm:h-6" />
                  </div>
                </div>
                <div className="flex-1 w-full relative min-h-[200px] sm:min-h-[250px]">
                  {stressorData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stressorData} layout="vertical" margin={{ left: 5, right: 15 }}>
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          tick={{ fill: theme === 'dark' ? '#ffffff' : '#1e293b', fontSize: 11, fontWeight: 600 }}
                          width={90}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip 
                          cursor={{ fill: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}
                          contentStyle={{ 
                            backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
                            border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.1)', 
                            borderRadius: '12px',
                            fontSize: '12px',
                            padding: '10px 14px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                            color: theme === 'dark' ? '#ffffff' : '#000000'
                          }} 
                          itemStyle={{
                            color: theme === 'dark' ? '#ffffff' : '#000000',
                            fontWeight: 'bold',
                            fontSize: '12px'
                          }}
                          labelStyle={{
                            color: theme === 'dark' ? '#cbd5e1' : '#475569',
                            marginBottom: '6px',
                            fontWeight: '600'
                          }}
                        />
                        <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={18}>
                          <LabelList 
                            dataKey="value" 
                            position="right" 
                            fill={theme === 'dark' ? '#ffffff' : '#059669'} 
                            fontSize={12} 
                            fontWeight="bold"
                            offset={12}
                          />
                          {stressorData.map((entry, index) => {
                            const stressorKey = entry.name.toLowerCase();
                            const stressorColor = STRESSOR_TIPS[stressorKey]?.color;
                            let barColor = '#34d399'; // default emerald
                            if (stressorColor === 'blue') barColor = '#60a5fa';
                            if (stressorColor === 'purple') barColor = '#c084fc';
                            
                            return (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={theme === 'dark' ? barColor : `${barColor}99`} 
                                style={{ 
                                  filter: theme === 'dark' ? `drop-shadow(0 0 6px ${barColor}40)` : 'none' 
                                }}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center opacity-20 text-xs italic">
                      No stressors identified yet
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* Relaxation Tool */}
              <GlassCard theme={theme} className="p-4 sm:p-8 min-h-[380px] sm:min-h-[400px] flex flex-col">
                <div className="flex items-center justify-between mb-4 sm:mb-8">
                  <div>
                    <h3 className="text-base sm:text-xl font-bold">Quick Calm</h3>
                    <p className="text-[10px] sm:text-sm opacity-40">Guided breathing</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-emerald-400/10 rounded-lg sm:rounded-2xl border border-emerald-400/20">
                    <Wind className="text-emerald-400 w-4 h-4 sm:w-6 sm:h-6" />
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  {isBreathingActive ? (
                    <div className="w-full flex flex-col items-center">
                      <BreathingExercise />
                      <button 
                        onClick={() => setIsBreathingActive(false)}
                        className="mt-4 sm:mt-8 px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95"
                      >
                        Stop
                      </button>
                    </div>
                  ) : (
                    <div className="text-center space-y-3 sm:space-y-6">
                      <div className="w-14 h-14 sm:w-20 sm:h-20 bg-emerald-400/10 rounded-full flex items-center justify-center mx-auto border border-emerald-400/20">
                        <Wind className="text-emerald-400 w-5 h-5 sm:w-8 sm:h-8 opacity-40" />
                      </div>
                      <p className="text-[10px] sm:text-sm opacity-60 max-w-[160px] sm:max-w-[200px] mx-auto leading-relaxed">Take a moment to reset your nervous system.</p>
                      <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <button 
                          onClick={() => setIsBreathingActive(true)}
                          className="px-6 sm:px-10 py-2.5 sm:py-4 bg-emerald-400 text-[#0a0f1d] rounded-xl sm:rounded-2xl font-bold hover:bg-emerald-300 transition-all shadow-lg shadow-emerald-400/20 uppercase tracking-widest text-[9px] sm:text-xs active:scale-95"
                        >
                          Start Session
                        </button>
                        <button 
                          disabled
                          className={cn(
                            "px-6 sm:px-10 py-2.5 sm:py-4 rounded-xl sm:rounded-2xl font-bold border uppercase tracking-widest text-[9px] sm:text-xs cursor-not-allowed",
                            theme === 'dark' ? "bg-white/5 text-white/20 border-white/5" : "bg-black/5 text-black/20 border-black/5"
                          )}
                        >
                          Stop
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* Insights */}
              <GlassCard theme={theme} className="lg:col-span-2 p-5 sm:p-8 min-h-[280px] sm:min-h-[400px]">
                <div className="flex items-center justify-between mb-5 sm:mb-8">
                  <div>
                    <h3 className="text-base sm:text-xl font-bold">Insights</h3>
                    <p className="text-[10px] sm:text-sm opacity-40">AI-generated summary</p>
                  </div>
                  <div className={cn(
                    "p-2 sm:p-3 rounded-lg sm:rounded-2xl border",
                    theme === 'dark' ? "bg-white/5 border-white/10" : "bg-emerald-400/10 border-emerald-400/20"
                  )}>
                    <LucidLogo size={24} theme={theme} />
                  </div>
                </div>
                <div className="space-y-3 sm:space-y-6">
                  {personalizedInsights.map((insight) => {
                    const Icon = insight.icon;
                    const colorClass = insight.color === 'emerald' ? 'emerald' : insight.color === 'blue' ? 'blue' : 'purple';
                    
                    return (
                      <div key={insight.id} className={cn(
                        "flex gap-3 sm:gap-4 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border",
                        theme === 'dark' ? "bg-white/5 border-white/10" : "bg-white/40 border-white/60"
                      )}>
                        <div className={cn(
                          "w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl flex items-center justify-center flex-shrink-0",
                          colorClass === 'emerald' ? "bg-emerald-400/20" : colorClass === 'blue' ? "bg-blue-400/20" : "bg-purple-400/20"
                        )}>
                          <Icon className={cn(
                            "w-4 h-4 sm:w-6 sm:h-6",
                            colorClass === 'emerald' ? (theme === 'dark' ? "text-emerald-400" : "text-emerald-600") : 
                            colorClass === 'blue' ? (theme === 'dark' ? "text-blue-400" : "text-blue-600") : 
                            (theme === 'dark' ? "text-purple-400" : "text-purple-600")
                          )} theme={theme} />
                        </div>
                        <div>
                          <h4 className={cn(
                            "text-xs sm:text-base font-medium mb-0.5 sm:mb-1",
                            theme === 'dark' ? "text-white" : "text-slate-900"
                          )}>{insight.title}</h4>
                          <p className={cn(
                            "text-[10px] sm:text-sm leading-relaxed",
                            theme === 'dark' ? "text-white/80" : "text-slate-600"
                          )}>
                            {insight.tip}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>
          ) : activeTab === 'games' ? (
            <motion.div
              key="games"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full flex-1 overflow-y-auto px-0.5 xs:px-1 sm:px-2 pb-8 min-h-0 flex flex-col"
            >
              <GamesView theme={theme} />
            </motion.div>
          ) : (
            <motion.div
              key="settings"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full flex-1 overflow-y-auto px-0.5 xs:px-1 sm:px-2 pb-8 min-h-0 flex flex-col"
            >
              <SettingsView theme={theme} setTheme={setTheme} logout={logout} user={user} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
