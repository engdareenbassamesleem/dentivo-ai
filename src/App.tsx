import { chatWithAI } from './lib/gemini';
import { auth, signInWithGoogle, signOut, db, handleFirestoreError, emailSignIn, emailSignUp } from './lib/firebase';
import { onAuthStateChanged, User, updateProfile } from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  where,
  doc,
  setDoc,
  getDocs,
  limit,
  getDoc
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  MessageSquare, 
  Bell, 
  Menu,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ChevronRight,
  MoreVertical,
  Search,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Clock,
  ArrowRight,
  Sparkles,
  Stethoscope,
  Scan,
  X,
  Settings,
  Activity,
  Sun,
  Moon,
  Mail,
  Lock,
  User as UserIcon,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { cn } from './lib/utils';

// --- Types ---
type TabId = 'dashboard' | 'booking' | 'patients' | 'chat';

interface NavItem {
  id: TabId;
  label: string;
  icon: any;
}

interface Patient {
  id: string;
  name: string;
  email: string;
  avatar: string;
  status: string;
  lastVisit: string;
  nextAppt: string;
  userId: string;
  createdAt?: any;
}

interface Clinic {
  id?: string;
  userId: string;
  clinicName: string;
  ownerName: string;
  email: string;
  phone: string;
  location: string;
  services: string[];
  workingHours: string;
  createdAt: any;
}

interface Appointment {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  service?: string;
  date?: string;
  time?: string;
  message?: string;
  status: string;
  userId: string;
  userEmail?: string;
  createdAt?: any;
  // Fallbacks for older data
  patientName?: string;
  serviceType?: string;
  apptDate?: string;
  apptTime?: string;
}

// --- Constants & Mock Data ---
const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'AI Dashboard', icon: LayoutDashboard },
  { id: 'booking', label: 'Auto Booking', icon: Calendar },
  { id: 'patients', label: 'Leads AI', icon: Users },
  { id: 'chat', label: 'AI Assistant', icon: Sparkles },
];

const ANALYTICS_DATA = [
  { name: 'Mon', value: 40 },
  { name: 'Tue', value: 60 },
  { name: 'Wed', value: 45 },
  { name: 'Thu', value: 85 },
  { name: 'Fri', value: 55 },
  { name: 'Sat', value: 70 },
  { name: 'Sun', value: 95 },
];

const APPOINTMENTS = [
  { id: 1, name: 'Emma Miller', procedure: 'Root Canal Therapy', time: '09:30 AM', status: 'Confirmed', room: 'Room 04', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATnv4pTbp2JUSgkXooQsfm5GJHHgSV5dEognciImDRISZWKeHRzQMot7Xzu0ULg4Sh28ubZKTwXt4h10j1L5xvw3YcWOnmScij7JSBBPOJE95zbkebPTnOYr097Txm5QZ49FpMsmkWMWGSgsrVqPUxIRtT7BQOMaFzxfGMwmjhi7ucN30wjttyFIuhXGhuxu-Z8g3sloGq7IvZREu0TXGVUhG-YzkbrJxQ4n6Uw4Ch-7q0tvRXez5OV7SBeuOpzTEaxs2F6cz5EoRH' },
  { id: 2, name: 'James Davis', procedure: 'General Cleaning', time: '11:00 AM', status: 'In Progress', room: 'Room 02', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAmtq5ydSGlKj-h1sg9jDbWcmfkE2wF-dF4trIk0D2Hxtry6X4fiuNT7n5OyJdiVLllfG4seDJ8k0TV0-im0N7BmFllQe_3MLsYbusaZ23EThxOwFqtJqBpqHi8kbSIDZxa3bSnuFJiGhyyQPNknj3sBkLCDiVVnw0P_WnWNumlCUcvFC8xU9IMsIa0EVzYW3YgK1Yca-dDg_7RgSyLYOX7-FgzojEtcOWglyWwmkOrGqtnoOlPbFifNzG___Xy0apkJmC-TWjeGd9K' },
  { id: 3, name: 'Sarah Connor', procedure: 'Wisdom Tooth Consultation', time: '02:15 PM', status: 'Scheduled', room: 'Room 01', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB4zPobh1JHW12Q-Mw0g73j0nXwLM36FRuGVCwqQaoi-6ArinDhJfPuJel2_ew1HP0RkkUlqLUPgdbvTZodNuzI9XEuF8W8jvZrn4lDSzr3m1LSb6nXoKLTAnkLXSUl5JRj-8YXTLSzFMv70DFi7DTzEH9bTGk1zTKieyZzB3Es3uDhCSv3Qc8f8dinG2sCuYEfwiTCaRrl0-iOSRhPglF04-ItQyPHeikuKu_1uW0-HVwqXTa9r_1vFctzGD5-S8zIcyl7DQJNH8DW' },
];

const PATIENTS = [
  { id: '#DENT-9920', name: 'Jane Williams', email: 'jane.w@email.com', lastVisit: 'Oct 12, 2023', nextAppt: 'Dec 04, 2023', status: 'Stable', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD01gIkMSJ3QdLyHiuHpDInFp_jUJ1ueUASO8gJ9CNq20i_CuN5bzcZ-LUpdJG3nc454mZE-yDK7w6mAk3c_QOtNKHqWtgAV7hXO-G3ZPvdmO68BiOyR0lWpCp8xT02j30JlaP8HF-f1ZOOkH5ax10yJ2FpCNZMTbeX-LZesZy50UkuXPpH-VpTdxkDroJNEFl3jaIWCVvCDspVnJ5FqXKC_zHj1-uHe93LlHtzHBgO-J-H0_CSnXH_JLfsT8pmAiYBpZicQdDOxJl_' },
  { id: '#DENT-8841', name: 'Marcus Reed', email: 'm.reed@provider.net', lastVisit: 'Nov 02, 2023', nextAppt: 'Jan 15, 2024', status: 'Treatment', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0xav7aRheJVLwDEN-u6VHL59tsrDE5_4LmoZJb99ZXJOq5ts02ppDjwcMXpRmXF7P2XhUu4LoybSSLL610T9IwAsPbGbG7XTB1bhZ7Qo4Ax_KKpRCiUP2UotDd_s4PGXwwEpNnduWh1QB3IMQ_780c7qUH_YvLlzPWypITFbeN1Erjsd_fAYSRUgNOdQ4mHuIQ0y6OlcFV-XMLWbSnfcXeROhhTcPDeW6q0xccheSoGDGPtvTzHaRV4uJg-lzlM-xRJ2CuOM8Gfk4' },
  { id: '#DENT-7712', name: 'Sarah Loft', email: 'loft.sarah@web.com', lastVisit: 'Oct 30, 2023', nextAppt: '--', status: 'Pending', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAGJwhfmnwA-xzjF-8eVOIydXcj-4DaQv9NSfFY9wT9SzCSYyCZiNDSNnHOwhZxS5BOXkv06NHQsdGeRUUAy3lUf7vWfOwyQcOiugJ_ODalxDgU_iwBZ-BXm6P9sDFmCBhHW4VSG-zINFQF9dQzPvLuVgJ9uEX21QnTo6gqPbMOSrkvkBefbrpYKIqU2SpMCAHe2XJF1qhU5PXpDaszVGb9V6erVJNpFbv_-7SaYGvjsIuKER8uxvC-h717-AL6egLvvntiufEZELjK' },
  { id: '#DENT-4456', name: 'David Alvarez', email: 'alvarez.d@email.com', lastVisit: 'Sep 15, 2023', nextAppt: 'Dec 12, 2023', status: 'Stable', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDRz490Kh1vB7x7GqVZ0Fa0MUhMFeww2aP2FNo78jsf4AGas7z69dnrDCTgpxI3NrXipjO7l3Iw3HxBDZOtlNfbgNdQ0W70x6AUm_qz63GLP2JsKZQoZcEGbpiNmKWAcqMYoFTVuHc8YWNE_iC-7OwYjxn0hJmIlryUg-zNcNJuT_PAK4L6KkaZ6qNdXUhdpZ6eorE_2G5rgf5ObhahdaOGcFWYqYaouuES9qxpiAgM_a6YtUFvDY3PT9zYPn17rr5RH7ck1p1HYMFA' },
];

// --- Components ---

function AuthGate() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;

    try {
      if (isLogin) {
        await emailSignIn(email, password);
      } else {
        const cred = await emailSignUp(email, password);
        await updateProfile(cred.user, { displayName: name });
        // Store user profile in Firestore
        await setDoc(doc(db, 'users', cred.user.uid), {
          name,
          email,
          role: 'clinic_owner',
          onboarded: false,
          createdAt: serverTimestamp(),
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
        });
      }
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        setError('Unauthorized Domain. Please add "europe-west2.run.app" to your Firebase Console > Authentication > Settings > Authorized domains.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_50%_-20%,#D4FF3315,transparent_50%)]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-[#D4FF33] rounded-[32px] flex items-center justify-center text-black mb-6 shadow-[0_0_50px_rgba(212,255,51,0.2)] rotate-12">
            <Activity size={40} strokeWidth={3} />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white mb-2">Dentivo AI</h1>
          <p className="text-zinc-500 font-medium">{isLogin ? 'Automate your clinic\'s growth with AI' : 'Start generating more revenue today'}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[40px] shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Display Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                  <input name="name" required type="text" placeholder="Your Name" className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-[#D4FF33] transition-all" />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                <input name="email" required type="email" placeholder="email@dentivo.ai" className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-[#D4FF33] transition-all" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Secure Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                <input name="password" required type="password" placeholder="••••••••" className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-[#D4FF33] transition-all" />
              </div>
            </div>

            {error && <p className="text-red-500 text-xs font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</p>}

            <button 
              disabled={loading}
              type="submit"
              className="w-full bg-[#D4FF33] text-black py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:brightness-110 active:scale-[0.98] transition-all shadow-xl disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isLogin ? 'Access Dashboard' : 'Create Account')}
            </button>
          </form>

          <div className="mt-8 flex flex-col gap-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800" /></div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest"><span className="bg-zinc-900 px-4 text-zinc-600">OR</span></div>
            </div>

            <button 
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  await signInWithGoogle();
                } catch (err: any) {
                  if (err.code === 'auth/unauthorized-domain') {
                    setError('Unauthorized Domain. Please add "europe-west2.run.app" to your Firebase Console > Authentication > Settings > Authorized domains.');
                  } else {
                    setError(err.message);
                  }
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebase/anonymous-scan.png" className="w-5 h-5 hidden" alt="" />
              Continue with Google
            </button>
          </div>
        </div>

        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-8 text-zinc-500 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors"
        >
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
        </button>
      </motion.div>
    </div>
  );
}

function ViewWrapper({ children }: { children: React.ReactNode, key?: React.Key }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="flex-1 overflow-auto bg-surface-base p-4 md:p-8"
    >
      {children}
    </motion.div>
  );
}

// 1. Dashboard View
function DashboardView({ appointments, clinicInfo, onBook }: { appointments: Appointment[], clinicInfo: Clinic | null, onBook: () => void }) {
  const displayAppts = appointments.length > 0 ? appointments : APPOINTMENTS;
  
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-800 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-6 bg-[#D4FF33] rounded-full" />
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase">
              {clinicInfo?.clinicName || "Dentivo AI"} Dashboard
            </h1>
          </div>
          <p className="text-zinc-500 text-sm font-medium">
            AI-powered management for {clinicInfo?.clinicName || "your clinic"}
          </p>
        </div>
        
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Today AI Performance</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[#D4FF33] font-black text-lg">+{displayAppts.length + 4}</span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Bookings Generated</span>
              </div>
              <div className="w-px h-8 bg-zinc-800" />
              <div className="flex items-center gap-1.5">
                <span className="text-[#D4FF33] font-black text-lg">${((displayAppts.length + 4) * 150).toLocaleString()}</span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Revenue Impact</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onBook}
            className="bg-[#D4FF33] text-black px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-[0_0_20px_rgba(212,255,51,0.2)] hover:brightness-110 transition-all flex items-center gap-2"
          >
            <Sparkles size={16} strokeWidth={3} />
            Start AI Booking
          </button>
        </div>
      </div>

      {/* 2. MAIN KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<Calendar className="text-[#D4FF33]" />} 
          label="Bookings Today" 
          value={String(displayAppts.length + 4)} 
          trend="+18%" 
          trendType="up" 
        />
        <StatCard 
          icon={<MessageSquare className="text-blue-400" />} 
          label="AI Conversations" 
          value="142" 
          trend="+22%" 
          trendType="up" 
        />
        <StatCard 
          icon={<Clock className="text-emerald-400" />} 
          label="AI Response Time" 
          value="Instant" 
          trend="0.2s" 
          trendType="up" 
        />
        <StatCard 
          icon={<DollarSign className="text-purple-400" />} 
          label="Revenue Generated by AI" 
          value={`$${((displayAppts.length + 12) * 125).toLocaleString()}`} 
          trend="+15.4%" 
          trendType="up" 
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* left Col: AI Insights & Schedule */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* 3. AI INSIGHT PANEL */}
          <div className="bg-[#D4FF33] rounded-[32px] p-8 text-black relative overflow-hidden group border-b-8 border-black/10">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-black rounded-xl text-[#D4FF33]">
                    <Sparkles size={24} fill="currentColor" />
                  </div>
                  <h3 className="font-black uppercase text-2xl tracking-tighter">AI Insights</h3>
                </div>
                <span className="px-3 py-1 bg-black/10 rounded-full text-[10px] font-black uppercase tracking-widest border border-black/5">High Impact Detected</span>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={20} className="mt-1" />
                    <div>
                      <p className="font-black text-lg">3 patients missed cleaning appointments</p>
                      <p className="text-sm font-medium opacity-70 italic tracking-tight leading-snug mt-1">"AI recommendation: Send automated priority rescheduling links immediately."</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <TrendingUp size={20} className="mt-1" />
                    <div>
                      <p className="font-black text-lg">High demand for whitening this week</p>
                      <p className="text-sm font-medium opacity-70 italic tracking-tight mt-1">"AI recommendation: Open 2 additional slots on Friday morning."</p>
                    </div>
                  </div>
                </div>

                <div className="bg-black/5 rounded-3xl p-6 border border-black/10 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Suggested Action</p>
                    <p className="font-bold text-lg leading-tight mb-4">Send automated reminders + offer 10% loyalty discount for missed sessions.</p>
                  </div>
                  <button className="w-full bg-black text-[#D4FF33] py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] transition-all shadow-xl">
                    Apply AI Suggestion
                  </button>
                </div>
              </div>
            </div>
            {/* Decorative BG element */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
          </div>

          {/* 6. UPCOMING SCHEDULE */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500">Upcoming Schedule</h3>
                <p className="text-xs font-medium text-zinc-600 mt-1">AI verified status of all patients</p>
              </div>
              <button className="text-xs font-black uppercase tracking-widest text-[#D4FF33] bg-[#D4FF33]/5 px-4 py-2 rounded-xl hover:bg-[#D4FF33]/10 transition-all">Optimization Log</button>
            </div>
            
            <div className="space-y-4">
              {displayAppts.slice(0, 4).map((appt) => (
                <div key={appt.id} className="bg-zinc-800/40 border border-zinc-800/50 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-zinc-800/60 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 p-0.5 relative">
                      <img src={appt.avatar || "https://lh3.googleusercontent.com/a/default_user"} className="w-full h-full rounded-xl object-cover" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-zinc-900 border-2 border-zinc-800 rounded-full flex items-center justify-center">
                        <div className={cn("w-2 h-2 rounded-full", appt.status === 'Confirmed' ? "bg-[#D4FF33]" : "bg-zinc-600")} />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-black text-lg text-white tracking-tight">{appt.name || appt.patientName}</h4>
                      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{appt.service || appt.serviceType}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-8">
                    <div className="text-right">
                      <p className="text-sm font-black text-white">{appt.time || appt.apptTime}</p>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{appt.date || appt.apptDate}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                    <span className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm",
                        appt.status === 'Confirmed' ? "bg-[#D4FF33]/10 text-[#D4FF33]" :
                        appt.status === 'In Progress' ? "bg-blue-500/10 text-blue-400" :
                        "bg-zinc-800 text-zinc-500"
                      )}>
                        {appt.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                       <button className="p-3 bg-zinc-800 text-zinc-400 rounded-xl hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">Reschedule</button>
                       <button className={cn(
                         "p-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                         appt.status === 'Confirmed' ? "bg-zinc-800 text-zinc-600 cursor-not-allowed" : "bg-[#D4FF33] text-black hover:brightness-110"
                       )}>
                         Confirm
                       </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-6 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:border-zinc-700 transition-all">
              Load 18 More Appointments
            </button>
          </div>
        </div>

        {/* Right Col: Live Activity & Funnel */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* 4. LIVE AI ACTIVITY */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 shadow-[0_0_50px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500">Live AI Activity</h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#D4FF33] rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-[#D4FF33] uppercase">Active</span>
              </div>
            </div>
            
            <div className="space-y-6">
              {[
                { label: 'Replied to patients', count: 124, icon: MessageSquare, color: 'text-blue-400' },
                { label: 'Booked appointments', count: 48, icon: Calendar, color: 'text-[#D4FF33]' },
                { label: 'Sent recall reminders', count: 86, icon: Clock, color: 'text-orange-400' },
                { label: 'Revenue qualified leads', count: 12, icon: DollarSign, color: 'text-purple-400' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-2xl bg-zinc-800/50 border border-zinc-800", item.color)}>
                      <item.icon size={18} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">{item.label}</span>
                  </div>
                  <span className="text-lg font-black text-white">{item.count}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-[#D4FF33]/5 border border-[#D4FF33]/10 rounded-[28px]">
              <p className="text-[10px] font-black text-[#D4FF33] uppercase tracking-widest mb-2">Recent Success</p>
              <p className="text-xs text-zinc-300 font-medium leading-relaxed italic">"AI automatically booked Sarah Miller for Implants after a 2min conversation. Est. Revenue: $4,500"</p>
            </div>
          </div>

          {/* 5. PATIENT FLOW (FUNNEL) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-8">AI Conversion Funnel</h3>
            
            <div className="space-y-2">
              {[
                { stage: 'Messages', count: 420, percent: '100%', color: 'bg-zinc-800' },
                { stage: 'Interested', count: 185, percent: '44%', color: 'bg-zinc-700' },
                { stage: 'Booked', count: 92, percent: '22%', color: 'bg-zinc-600' },
                { stage: 'Confirmed', count: 84, percent: '20%', color: 'bg-[#D4FF33] text-black' },
              ].map((step, idx) => (
                <div key={idx} className="relative group overflow-hidden rounded-2xl">
                  <div 
                    className={cn("h-16 flex items-center justify-between px-6 transition-all duration-500", step.color)}
                    style={{ width: `calc(${step.percent} + (100% - ${step.percent}) * 0.1)` }}
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{step.stage}</span>
                      <span className="font-black text-lg">{step.count}</span>
                    </div>
                    <span className="font-black text-sm">{step.percent}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-6 text-center">
              Never miss a patient again • AI efficiency: 98.4%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend, trendType }: { icon: any, label: string, value: string, trend: string, trendType: 'up' | 'down' }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 flex flex-col justify-between group hover:border-zinc-700 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className={cn(
          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
          trendType === 'up' ? "bg-[#D4FF33]/10 text-[#D4FF33]" : "bg-zinc-800 text-zinc-500"
        )}>
          {trend}
        </div>
      </div>
      <div>
        <p className="text-4xl font-bold tracking-tighter text-white mb-1 group-hover:translate-x-1 transition-transform">{value}</p>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{label}</p>
      </div>
    </div>
  );
}

// 2. Booking View
function BookingView() {
  const user = auth.currentUser;
  const displayName = user?.displayName || user?.email;
  const [selectedDate, setSelectedDate] = useState(12);
  const [selectedService, setSelectedService] = useState('Routine Checkup & Cleaning');
  const [selectedTime, setSelectedTime] = useState('11:00 AM');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBook = async () => {
    if (!auth.currentUser) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'appointments'), {
        name: auth.currentUser.displayName || 'Valued Patient',
        phone: 'Contact Profile',
        email: auth.currentUser.email || '',
        service: selectedService,
        date: `${selectedDate} Oct 2023`,
        time: selectedTime,
        message: 'Booked via Portal',
        status: 'Scheduled',
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email || '',
        createdAt: serverTimestamp(),
      });
      alert('Your appointment request has been received. We will contact you shortly.');
    } catch (error) {
      handleFirestoreError(error, 'create', 'appointments');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
      <div className="flex-1 bg-zinc-900 border border-zinc-800 p-8 rounded-[32px] shadow-sm">
        <h2 className="text-2xl font-bold mb-8 text-zinc-900 dark:text-white tracking-tight">Focus Appointment</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Calendar Picker */}
          <div className="space-y-4">
            <label className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-zinc-500">
              <Calendar size={16} className="text-[#D4FF33]" />
              Select Date
            </label>
            <div className="bg-zinc-800/50 rounded-[24px] p-6 border border-zinc-800">
              <div className="flex justify-between items-center mb-6">
                <span className="font-bold text-zinc-900 dark:text-white">October 2023</span>
                <div className="flex gap-2">
                  <button className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors"><ChevronRight size={16} className="rotate-180" /></button>
                  <button className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors"><ChevronRight size={16} /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 text-center text-[10px] font-black text-zinc-600 mb-4 tracking-tighter">
                <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <button
                    key={d}
                    onClick={() => setSelectedDate(d)}
                    className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all",
                      d === selectedDate ? "bg-[#D4FF33] text-black scale-110 shadow-[0_0_20px_rgba(212,255,51,0.2)]" : "text-zinc-400 hover:bg-zinc-800"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Service & Time */}
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-zinc-500">
                <Stethoscope size={16} className="text-[#D4FF33]" />
                Procedure
              </label>
              <select 
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full p-4 bg-zinc-800 border border-zinc-700 rounded-2xl outline-none focus:border-[#D4FF33] transition-all text-sm font-bold text-zinc-900 dark:text-white appearance-none cursor-pointer"
              >
                <option>Routine Checkup & Cleaning</option>
                <option>Teeth Whitening</option>
                <option>Dental Implants Consultation</option>
                <option>Emergency Tooth Extraction</option>
              </select>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-zinc-500">
                <Clock size={16} className="text-[#D4FF33]" />
                Time Slot
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'].map(t => (
                  <button
                    key={t}
                    onClick={() => setSelectedTime(t)}
                    className={cn(
                      "py-2 px-1 text-[10px] rounded-xl border font-black uppercase tracking-tighter transition-all",
                      selectedTime === t ? "bg-[#D4FF33] border-[#D4FF33] text-black" : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
                    )}
                  >
                    {t}
                  </button>
                ))}
                <button className="py-2 text-[10px] rounded-xl border border-zinc-900/50 text-zinc-700 font-bold uppercase tracking-tighter cursor-not-allowed line-through">05:00 PM</button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 text-zinc-500">
            <AlertCircle size={18} className="text-[#D4FF33]" />
            <p className="text-xs font-bold uppercase tracking-widest">Est. Duration: 45m</p>
          </div>
          <button 
            onClick={handleBook}
            disabled={isSubmitting}
            className="bg-[#D4FF33] text-black px-10 py-4 rounded-full font-black uppercase tracking-widest text-xs shadow-xl hover:brightness-110 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? 'Processing...' : 'Lock Session'}
            <ArrowRight size={18} strokeWidth={3} />
          </button>
        </div>
      </div>

      <aside className="w-full lg:w-80 space-y-4">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[32px] overflow-hidden relative group">
          <div className="relative z-10">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-2">Location</h3>
            <p className="text-xl font-bold text-white mb-4">Central Dental Plaza</p>
            <div className="h-40 rounded-[24px] overflow-hidden mb-6 border border-zinc-800">
              <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDfLbTOk26favym8ixdEaxs3XvpbnOPWjO58QFwcEZw9TUSOnBAylGT2wQqRqxxD403f6A_C61hLgV6iMLmNgP1l1Lc6WqQw-XbAz80mK8LIxcYIUExNLa3VHepFbos1oAJoM_IekdoubXleHxCKF7Sk6wjrK_nEsj_oyVUib3jyQlT1Y-hobuQuOprqKNKZUBdwEyoS_eZQg1jnhEzX4YkCh4p0SHW16tKGR4_m9XG7W2Qul928E6b0l1MPlX86Eo7s2jDUxD86zjs" alt="Map" className="w-full h-full object-cover grayscale opacity-50 group-hover:opacity-80 transition-all group-hover:scale-110 duration-700" />
            </div>
            <button className="w-full bg-zinc-800 text-[#D4FF33] py-4 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-700 transition-colors">
              <MapPin size={16} />
              Directions
            </button>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#D4FF33]/5 rounded-full blur-3xl" />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[32px] space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Practitioner</h3>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[24px] bg-zinc-800 border border-zinc-700 p-1">
              <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDNXumDmurxCKN2aQRL7H12nXBgBS85I0EuA70CjeiZU_q7g3obBM48eRrwhf-7EcaDL-kdHp-486pGCk4HnrpI_WFwHhWaZGghlQY5C810y65v5WnIYXtIJ8Tn5K-OMLpXdi6P507ZiQ8zyGHD9R37qpSxi5bhHfIwteWrhvPJKhRzDem2j21uQkWQxD2dR7IcMTl-vKVcbtvU-LJVIHVJToCcUreG6nPctGjFEhvqPVjdUIR9rUwW6Dxk4_5HFUP586D_xyDYb8qW" alt="Doctor" className="w-full h-full rounded-xl object-cover" />
            </div>
            <div>
              <p className="font-bold text-white">{displayName || "Head of Clinic"}</p>
              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-tighter">Growth Optimization Expert</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="bg-[#D4FF33]/10 text-[#D4FF33] px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Top Rated</span>
            <span className="bg-zinc-800 text-zinc-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">15+ Yrs</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

// 3. Patients View
function PatientsView({ patients, onAdd }: { patients: Patient[], onAdd: () => void }) {
  const displayPatients = patients.length > 0 ? patients : PATIENTS;
  
  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Intelligence Directory</h1>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mt-1">AI verified: {displayPatients.length} Active Records</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
            <input 
              type="text" 
              placeholder="Search Intelligence..." 
              className="w-full pl-12 pr-4 py-4 bg-zinc-800 border border-zinc-700 rounded-2xl outline-none focus:border-[#D4FF33] transition-all text-xs font-bold uppercase tracking-widest placeholder:text-zinc-600 text-white"
            />
          </div>
          <button 
            onClick={onAdd}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-[#D4FF33] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg"
          >
            <Plus size={16} strokeWidth={3} />
            Add New Lead
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={<TrendingUp className="text-[#D4FF33]" />} label="AI Lead Flow" value={`+${displayPatients.length + 8}%`} trend="Automated" trendType="up" />
        <StatCard icon={<CheckCircle2 className="text-blue-400" />} label="Retention Rate" value="98.2%" trend="Stability" trendType="up" />
        <StatCard icon={<Bell className="text-orange-400" />} label="AI Auto-Recalls" value="124" trend="Active" trendType="up" />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden shadow-sm">
        <div className="flex justify-between items-center px-8 py-6 border-b border-zinc-800 bg-zinc-900/50">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Resource Database</h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#D4FF33]">Live Extraction</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-800/10 border-b border-zinc-800">
                <th className="px-8 py-6 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Client Identity</th>
                <th className="px-8 py-6 text-[10px] font-black text-zinc-600 uppercase tracking-widest">ID Hash</th>
                <th className="px-8 py-6 text-[10px] font-black text-zinc-600 uppercase tracking-widest text-center">Protocol History</th>
                <th className="px-8 py-6 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Status</th>
                <th className="px-8 py-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {displayPatients.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors group cursor-pointer">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 p-0.5 border border-zinc-700 group-hover:scale-110 transition-transform">
                        <img src={p.avatar || "https://lh3.googleusercontent.com/a/default_user"} className="w-full h-full rounded-lg object-cover" />
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-white text-sm tracking-tight">{p.name}</p>
                        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">{p.email || 'patient@example.com'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-[11px] font-bold text-zinc-500 font-mono">{p.id.slice(0, 8)}</td>
                  <td className="px-8 py-6 text-center">
                    <div className="inline-flex flex-col items-center">
                      <p className="text-xs font-bold text-zinc-300 dark:text-zinc-300">{p.lastVisit || 'N/A'}</p>
                      <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Last Sync</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                      p.status === 'Stable' || p.status === 'Standard' ? "bg-[#D4FF33]/10 text-[#D4FF33]" :
                      p.status === 'Treatment' || p.status === 'VIP' ? "bg-blue-500/10 text-blue-400" :
                      "bg-zinc-800 text-zinc-500"
                    )}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-3 hover:bg-zinc-800 rounded-2xl transition-colors text-zinc-600 hover:text-zinc-300 dark:hover:text-white">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-8 py-6 bg-zinc-800/10 flex justify-between items-center border-t border-zinc-800">
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Showing {PATIENTS.length} / 1.2k</span>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-zinc-800 rounded-xl transition-all border border-zinc-800"><ChevronRight size={16} className="rotate-180" /></button>
            <span className="w-10 h-10 flex items-center justify-center bg-[#D4FF33] text-black text-xs font-black rounded-xl">1</span>
            <button className="p-2 hover:bg-zinc-800 rounded-xl transition-all border border-zinc-800"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Booking Form Modal ---

function BookingModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const user = auth.currentUser;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      service: formData.get('service') as string,
      date: formData.get('date') as string,
      time: formData.get('time') as string,
      message: formData.get('message') as string,
      userId: user.uid,
      userEmail: user.email || '',
      status: 'Pending',
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'appointments'), data);
      setSuccess(true);
      form.reset();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 3000);
    } catch (error) {
      handleFirestoreError(error, 'create', 'appointments');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 w-full max-w-xl relative z-10 shadow-2xl my-auto"
        >
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <Calendar className="text-[#D4FF33]" size={28} />
              Appointment Concierge
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
              <X size={24} />
            </button>
          </div>

          {success ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 flex flex-col items-center text-center space-y-4"
            >
              <div className="w-20 h-20 bg-[#D4FF33] rounded-full flex items-center justify-center text-black mb-4">
                <CheckCircle2 size={48} strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Booking Requested</h3>
              <p className="text-zinc-500 font-medium">Your appointment request has been received. We will contact you shortly.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Full Name</label>
                <input name="name" required placeholder="John Doe" className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none focus:border-[#D4FF33] transition-all text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Phone Number</label>
                <input name="phone" required placeholder="+1 (555) 000-0000" className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none focus:border-[#D4FF33] transition-all text-sm" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Email Address</label>
                <input name="email" required type="email" placeholder="john@example.com" className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none focus:border-[#D4FF33] transition-all text-sm" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Preferred service</label>
                <select name="service" required className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none focus:border-[#D4FF33] transition-all text-sm appearance-none">
                  <option>General Checkup</option>
                  <option>Teeth Whitening</option>
                  <option>Dental Implants</option>
                  <option>Orthodontics</option>
                  <option>Cosmetic Dentistry</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Preferred Date</label>
                <input name="date" required type="date" className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none focus:border-[#D4FF33] transition-all text-sm [color-scheme:dark]" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Preferred Time</label>
                <select name="time" required className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none focus:border-[#D4FF33] transition-all text-sm appearance-none">
                  <option value="">Select time</option>
                  <option value="09:00">09:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="14:00">02:00 PM</option>
                  <option value="15:00">03:00 PM</option>
                  <option value="16:00">04:00 PM</option>
                  <option value="17:00">05:00 PM</option>
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Additional Message</label>
                <textarea name="message" rows={3} placeholder="Any specific concerns?" className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none focus:border-[#D4FF33] transition-all text-sm resize-none"></textarea>
              </div>

              <div className="md:col-span-2 mt-4">
                <button 
                  disabled={isSubmitting}
                  type="submit" 
                  className="w-full bg-[#D4FF33] text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Securing Session...' : 'Confirm Request'}
                  <ArrowRight size={18} strokeWidth={3} />
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// 4. Chat View
function ChatView() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const user = auth.currentUser;

  React.useEffect(() => {
    if (!user) return;

    const chatRef = collection(db, 'users', user.uid, 'chats');
    const q = query(chatRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort in memory to avoid index requirements
      msgs.sort((a: any, b: any) => {
        const getTime = (val: any) => {
          if (!val) return 0;
          if (typeof val.toDate === 'function') return val.toDate().getTime();
          if (val instanceof Date) return val.getTime();
          if (typeof val === 'number') return val;
          if (typeof val === 'string') return new Date(val).getTime();
          return 0;
        };
        return getTime(a.createdAt) - getTime(b.createdAt);
      });
      
      if (msgs.length === 0) {
        // Seed initial message if new chat
        addDoc(chatRef, {
          role: 'assistant',
          content: "Hello! I'm your Dentivo AI assistant. I can answer your questions about our clinic in Geneva or help you book an appointment. How can I help you today?",
          createdAt: serverTimestamp(),
          userId: user.uid
        });
      } else {
        setMessages(msgs);
      }
    }, (error) => {
      handleFirestoreError(error, 'list' as any, `users/${user.uid}/chats`);
    });

    return () => unsubscribe();
  }, [user]);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (overrideMessage?: string) => {
    const finalMessage = overrideMessage || input;
    if (!finalMessage.trim() || isTyping || !user) return;

    const userMessage = finalMessage.trim();
    setInput('');
    setIsTyping(true);

    try {
      const chatRef = collection(db, 'users', user.uid, 'chats');
      
      // 1. Add user message to Firestore
      await addDoc(chatRef, {
        role: 'user',
        content: userMessage,
        createdAt: serverTimestamp(),
        userId: user.uid
      });

      // 2. Prepare history for AI
      const history = messages
        .slice(-10) // Limit history context
        .map(m => ({
          role: (m.role === 'assistant' ? 'model' : 'user') as 'model' | 'user',
          parts: [{ text: m.content }]
        }));

      // 3. Get AI response
      const response = await chatWithAI(userMessage, history);
      
      // 4. Add AI response to Firestore
      await addDoc(chatRef, {
        role: 'assistant',
        content: response,
        createdAt: serverTimestamp(),
        userId: user.uid
      });
    } catch (error) {
      handleFirestoreError(error, 'create', `users/${user.uid}/chats`);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <BookingModal isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} />
      <div className="flex flex-col h-full max-w-4xl mx-auto bg-zinc-900 rounded-[40px] border border-zinc-800 overflow-hidden shadow-2xl">
      {/* Chat Header */}
      <div className="px-8 py-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center text-[#D4FF33] shadow-[0_0_20px_rgba(212,255,51,0.1)]">
            <Sparkles size={24} fill="#D4FF33" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-white leading-tight">Clinic Assistant</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 bg-[#D4FF33] rounded-full animate-pulse shadow-[0_0_8px_#D4FF33]" />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">AI Ready</span>
            </div>
          </div>
        </div>
        <button className="p-3 hover:bg-zinc-800 rounded-full transition-colors"><MoreVertical size={20} className="text-zinc-600" /></button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
        <div className="flex justify-center">
          <span className="bg-zinc-800/50 border border-zinc-800 text-zinc-500 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">Support Protocol • Today</span>
        </div>
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-4 max-w-[85%] md:max-w-[75%]", m.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform hover:scale-110 shadow-lg border",
              m.role === 'assistant' ? "bg-zinc-800 border-zinc-700 text-[#D4FF33]" : "bg-[#D4FF33] border-[#D4FF33] text-black"
            )}>
              {m.role === 'assistant' ? <Sparkles size={18} /> : <Users size={18} strokeWidth={3} />}
            </div>
            <div className={cn(
              "p-6 rounded-[28px] shadow-sm border text-sm leading-relaxed font-medium whitespace-pre-wrap",
              m.role === 'assistant' ? "bg-zinc-800 border-zinc-700 rounded-tl-none text-zinc-200" : "bg-[#D4FF33] border-[#D4FF33] text-black rounded-tr-none shadow-[0_8px_20px_rgba(212,255,51,0.2)] font-bold"
            )}>
              {m.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-4 max-w-[75%]">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 bg-zinc-800 border border-zinc-700 text-[#D4FF33]">
              <Sparkles size={18} className="animate-spin" />
            </div>
            <div className="bg-zinc-800 border border-zinc-700 rounded-[28px] rounded-tl-none p-6 text-zinc-500 italic text-sm">
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        className="p-8 bg-zinc-900 border-t border-zinc-800 space-y-6"
      >
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
          {['Book Appointment', 'Whitening', 'Cleaning', 'Orthodontics', 'Pediatric Dentistry'].map(t => (
            <button 
              key={t}
              type="button"
              onClick={() => {
                if (t === 'Book Appointment') {
                  setIsBookingModalOpen(true);
                } else {
                  handleSend(t);
                }
              }}
              className="whitespace-nowrap px-6 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-full text-[10px] font-black uppercase tracking-widest hover:border-[#D4FF33] hover:text-[#D4FF33] transition-all"
            >
              {t}
            </button>
          ))}
        </div>
        <div className="relative group">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
            placeholder="Ask a question..." 
            className="w-full bg-zinc-800 border border-zinc-700 rounded-[28px] py-6 pl-16 pr-32 outline-none focus:border-[#D4FF33] focus:ring-4 focus:ring-[#D4FF33]/5 transition-all font-bold text-white placeholder:text-zinc-600 shadow-inner"
          />
          <Plus className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-hover:text-[#D4FF33] transition-colors cursor-pointer" size={24} />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button type="button" className="w-12 h-12 rounded-full hover:bg-zinc-700 flex items-center justify-center text-zinc-500 transition-colors"><Bell size={20} /></button>
            <button 
              type="submit"
              disabled={isTyping || !input.trim()}
              className="w-14 h-14 bg-[#D4FF33] text-black rounded-full shadow-[0_4px_15px_rgba(212,255,51,0.3)] flex items-center justify-center active:scale-90 transition-all hover:brightness-110 disabled:grayscale"
            >
              <ArrowRight size={24} strokeWidth={3} />
            </button>
          </div>
        </div>
      </form>
    </div>
    </>
  );
}

// 5. Clinic Onboarding View
function ClinicOnboardingView({ user, onComplete }: { user: User, onComplete: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  const SERVICE_OPTIONS = ['Cleaning', 'Whitening', 'Implants', 'Orthodontics', 'Pediatric'];

  const toggleService = (service: string) => {
    setSelectedServices(prev => 
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedServices.length === 0) {
      setError("Please select at least one service.");
      return;
    }
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    
    const clinicData = {
      userId: user.uid,
      clinicName: formData.get('clinicName') as string,
      ownerName: formData.get('ownerName') as string,
      email: formData.get('clinicEmail') as string,
      phone: formData.get('phone') as string,
      location: formData.get('location') as string,
      services: selectedServices,
      workingHours: formData.get('hours') as string,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'clinics'), clinicData);
      await setDoc(doc(db, 'users', user.uid), {
        onboarded: true,
        role: 'clinic_owner'
      }, { merge: true });
      
      // Artificial delay for "setting up" feel
      await new Promise(r => setTimeout(r, 2000));
      onComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6">
        <div className="relative w-32 h-32 mb-8">
          <div className="absolute inset-0 border-4 border-[#D4FF33]/10 rounded-full" />
          <motion.div 
            className="absolute inset-0 border-4 border-t-[#D4FF33] rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="text-[#D4FF33] animate-pulse" size={40} fill="#D4FF33" />
          </div>
        </div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[#D4FF33] font-black uppercase tracking-[0.3em] text-sm"
        >
          Setting up your AI assistant...
        </motion.p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_50%_-20%,#D4FF3310,transparent_50%)]">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl"
      >
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12 border-b border-zinc-800 pb-8">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-[#D4FF33]/10 text-[#D4FF33] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-[#D4FF33]/20">Step 1 of 2 — Clinic Setup</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-3 uppercase leading-none">Launch Your AI Booking System</h1>
            <p className="text-zinc-500 font-medium text-lg leading-snug">Activate your AI assistant to handle patient communication and bookings automatically.</p>
          </div>
          <div className="hidden lg:flex items-center gap-4 text-right">
            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">System Status</p>
              <p className="text-[#D4FF33] font-black uppercase text-xl">Ready for Sync</p>
            </div>
            <div className="w-px h-10 bg-zinc-800" />
            <Sparkles size={32} className="text-[#D4FF33]" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[40px] shadow-2xl">
              <form onSubmit={handleSubmit} className="space-y-10">
                {/* Clinic Info Section */}
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1.5 h-1.5 bg-[#D4FF33] rounded-full" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#D4FF33]">Clinic Info</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Clinic Name</label>
                      <input name="clinicName" required placeholder="Alpine Dental" className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none focus:border-[#D4FF33] focus:ring-1 focus:ring-[#D4FF33]/20 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Clinic Email</label>
                      <input name="clinicEmail" required type="email" placeholder="contact@alpinedental.com" className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none focus:border-[#D4FF33] transition-all" defaultValue={user.email || ''} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Phone Number</label>
                       <input name="phone" required placeholder="+41 22 123 45 67" className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none focus:border-[#D4FF33] transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Working Hours</label>
                       <input name="hours" required placeholder="Mon-Fri: 08:30 - 18:30" className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none focus:border-[#D4FF33] transition-all" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Location</label>
                      <input name="location" required placeholder="Rue du Rhône 14, 1204 Geneva" className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none focus:border-[#D4FF33] transition-all" />
                    </div>
                  </div>
                </div>

                {/* Owner Info Section */}
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-blue-400">Owner Info</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Owner Name</label>
                      <input name="ownerName" required placeholder="Dr. Sarah Smith" className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none focus:border-[#D4FF33] transition-all" defaultValue={user.displayName || ''} />
                    </div>
                  </div>
                </div>

                {/* Services Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-purple-400">Services Selection</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {SERVICE_OPTIONS.map(service => (
                      <button
                        key={service}
                        type="button"
                        onClick={() => toggleService(service)}
                        className={cn(
                          "px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all duration-300",
                          selectedServices.includes(service)
                            ? "bg-[#D4FF33] text-black border-[#D4FF33] shadow-[0_0_20px_rgba(212,255,51,0.2)]"
                            : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-500"
                        )}
                      >
                        {service}
                      </button>
                    ))}
                  </div>
                </div>

                {error && <p className="text-red-500 text-xs font-bold bg-red-500/10 p-4 rounded-2xl border border-red-500/20">{error}</p>}

                <button 
                  disabled={loading}
                  type="submit"
                  className="w-full bg-[#D4FF33] text-black py-6 rounded-[24px] font-black uppercase tracking-[0.2em] text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_40px_rgba(212,255,51,0.2)] border-b-4 border-black/10"
                >
                   Activate AI Assistant
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[40px] sticky top-8">
              <h4 className="text-white font-black uppercase tracking-widest text-sm mb-8 flex items-center gap-2">
                <Sparkles size={18} fill="#D4FF33" className="text-[#D4FF33]" />
                Your AI Will:
              </h4>
              <ul className="space-y-6">
                {[
                  { text: 'Reply instantly to patients', desc: 'Real-time multi-channel communication.' },
                  { text: 'Book appointments automatically', desc: 'Zero human intervention needed for scheduling.' },
                  { text: 'Reduce staff workload', desc: 'AI handles 80% of repetitive admin tasks.' },
                  { text: 'Increase revenue', desc: 'Never miss a lead with 24/7 responsiveness.' }
                ].map((item, idx) => (
                  <li key={idx} className="group">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-xl bg-[#D4FF33]/5 border border-[#D4FF33]/10 flex items-center justify-center text-[#D4FF33] shrink-0 group-hover:bg-[#D4FF33] group-hover:text-black transition-all">
                         <CheckCircle2 size={16} strokeWidth={3} />
                      </div>
                      <div>
                        <p className="text-white font-black uppercase text-[10px] tracking-widest mb-1">{item.text}</p>
                        <p className="text-zinc-500 text-xs font-medium leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              
              <div className="mt-12 p-6 bg-[#D4FF33]/5 border border-[#D4FF33]/10 rounded-3xl">
                <p className="text-[10px] font-black text-[#D4FF33] uppercase tracking-widest mb-2">Pro Tip</p>
                <p className="text-xs text-zinc-400 italic">"The more services you enable, the more revenue paths the AI can automatically optimize."</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// --- Layout & Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [clinicOnboarded, setClinicOnboarded] = useState<boolean | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [clinicInfo, setClinicInfo] = useState<Clinic | null>(null);

  const seedData = async () => {
    if (!user) return;
    try {
      // Seed Patients
      const patientsRef = collection(db, 'patients');
      const s = await getDocs(query(
        patientsRef, 
        where('userId', '==', user.uid),
        limit(1)
      ));
      if (s.empty) {
        for (const p of PATIENTS) {
          await addDoc(patientsRef, {
            ...p,
            userId: user.uid,
            createdAt: serverTimestamp(),
            lastVisit: 'Oct 24, 2023',
          });
        }
      }

      // Seed Appointments
      const apptsRef = collection(db, 'appointments');
      const s2 = await getDocs(query(
        apptsRef, 
        where('userId', '==', user.uid),
        limit(1)
      ));
      if (s2.empty) {
        for (const a of APPOINTMENTS) {
          await addDoc(apptsRef, {
            patientName: a.name,
            phone: '555-0199',
            email: 'patient@example.com',
            serviceType: a.procedure,
            apptDate: '2023-10-24',
            apptTime: a.time,
            status: a.status,
            userId: user.uid,
            createdAt: serverTimestamp(),
          });
        }
      }
    } catch (e) {
      console.error("Seeding failed", e);
    }
  };

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setAuthLoading(true);
      setUser(currentUser);
      
      if (currentUser) {
        // Ensure user document exists (for OAuth users)
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          const newUserData = {
            name: currentUser.displayName || 'Unnamed User',
            email: currentUser.email || '',
            role: 'clinic_owner',
            onboarded: false,
            createdAt: serverTimestamp(),
            avatar: currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.uid}`
          };
          await setDoc(userRef, newUserData);
          setClinicOnboarded(false);
        } else {
          const userData = userDoc.data();
          setClinicOnboarded(userData.onboarded || false);
          
          if (userData.onboarded) {
            // Fetch clinic info
            const clinicsRef = collection(db, 'clinics');
            const q = query(clinicsRef, where('userId', '==', currentUser.uid), limit(1));
            const clinicSnap = await getDocs(q);
            if (!clinicSnap.empty) {
              setClinicInfo({ id: clinicSnap.docs[0].id, ...clinicSnap.docs[0].data() } as Clinic);
            }
          }
        }
        seedData();
      } else {
        setClinicOnboarded(null);
        setClinicInfo(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (!user) return;

    // Fetch Patients
    const patientsRef = collection(db, 'patients');
    const qPatients = query(
      patientsRef, 
      where('userId', '==', user.uid)
    );
    const unsubPatients = onSnapshot(qPatients, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory instead of Firestore to avoid missing index errors
      const sortedData = (data as Patient[]).sort((a, b) => {
        const getTime = (val: any) => {
          if (!val) return 0;
          if (typeof val.toDate === 'function') return val.toDate().getTime();
          if (val instanceof Date) return val.getTime();
          if (typeof val === 'number') return val;
          if (typeof val === 'string') return new Date(val).getTime();
          return 0;
        };
        return getTime(b.createdAt) - getTime(a.createdAt);
      });
      setPatients(sortedData);
    }, (error) => {
      handleFirestoreError(error, 'list' as any, 'patients');
    });

    // Fetch Appointments
    const apptsRef = collection(db, 'appointments');
    const qAppts = query(
      apptsRef, 
      where('userId', '==', user.uid)
    );
    const unsubAppts = onSnapshot(qAppts, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory to avoid index requirements
      const sortedData = (data as Appointment[]).sort((a, b) => {
        const timeA = a.time || '';
        const timeB = b.time || '';
        return timeA.localeCompare(timeB);
      });
      setAppointments(sortedData);
    }, (error) => {
      handleFirestoreError(error, 'list' as any, 'appointments');
    });

    return () => {
      unsubPatients();
      unsubAppts();
    };
  }, [user]);

  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  if (authLoading) {
    return (
      <div className="h-screen bg-[#0A0A0A] flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-[#D4FF33] border-t-transparent rounded-full shadow-[0_0_20px_rgba(212,255,51,0.2)]"
        />
      </div>
    );
  }

  if (!user) {
    return <AuthGate />;
  }

  if (clinicOnboarded === false) {
    return <ClinicOnboardingView user={user} onComplete={() => setClinicOnboarded(true)} />;
  }

  return (
    <div className="flex h-screen bg-surface-base text-zinc-900 dark:text-zinc-100 font-sans selection:bg-[#D4FF33] selection:text-black transition-colors duration-300">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-24 bg-surface-base border-r border-zinc-900 dark:border-zinc-800 py-8 items-center justify-between z-50">
        <div className="space-y-12 flex flex-col items-center">
          <div className="w-12 h-12 bg-[#D4FF33] rounded-2xl flex items-center justify-center text-black shadow-[0_0_30px_rgba(212,255,51,0.2)] group cursor-pointer hover:rotate-12 transition-transform">
            <Activity size={24} strokeWidth={3} />
          </div>
          <nav className="flex flex-col gap-6">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "p-4 rounded-2xl transition-all duration-300 relative group",
                  activeTab === item.id ? "bg-surface-panel text-[#D4FF33]" : "text-content-subtle hover:text-content-base"
                )}
                title={item.label}
              >
                <item.icon size={20} />
                {activeTab === item.id && (
                  <motion.div layoutId="activeNav" className="absolute inset-0 bg-surface-panel border border-surface-card rounded-2xl -z-10" />
                )}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-4 items-center">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className="p-4 text-zinc-600 hover:text-[#D4FF33] transition-colors" 
            title={isDarkMode ? "Light Mode" : "Dark Mode"}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={signOut} className="p-4 text-zinc-600 hover:text-red-500 transition-colors" title="Sign Out"><Settings size={20} /></button>
          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-800 p-0.5 relative group cursor-pointer">
            <img src={user.photoURL || "https://lh3.googleusercontent.com/a/default_user"} className="w-full h-full rounded-full object-cover" alt="Profile" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative bg-surface-base">
        {/* Header */}
        <header className="h-20 flex items-center justify-between px-8 bg-surface-base/80 backdrop-blur-xl border-b border-zinc-900 dark:border-zinc-800 z-40 sticky top-0">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-zinc-900 dark:text-zinc-100" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">{clinicInfo?.clinicName || "Precision Care"}</span>
              <h2 className="font-black text-lg tracking-tight uppercase text-zinc-900 dark:text-zinc-100 italic">
                {NAV_ITEMS.find(i => i.id === activeTab)?.label || activeTab}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center bg-surface-panel border border-surface-card rounded-full px-4 py-2 gap-3 group focus-within:border-[#D4FF33] transition-all">
              <Search size={16} className="text-content-muted group-focus-within:text-[#D4FF33]" />
              <input type="text" placeholder="Search protocol..." className="bg-transparent border-none outline-none text-xs font-bold uppercase tracking-widest placeholder:text-content-subtle w-40 text-content-base" />
              <div className="bg-surface-card px-2 py-1 rounded text-[8px] font-black text-content-muted">⌘K</div>
            </div>
            
            <div className="h-8 w-px bg-zinc-800 mx-2 hidden lg:block" />

            <div className="flex items-center gap-4">
              <div className="hidden lg:flex flex-col items-end">
                <span className="text-[10px] font-black text-[#D4FF33] uppercase tracking-widest leading-none mb-0.5">Welcome Back</span>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[150px]">
                  {user.displayName || user.email}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <button className="relative p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                  <Bell size={20} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#D4FF33] rounded-full shadow-[0_0_10px_#D4FF33]" />
                </button>
                <button 
                  onClick={signOut}
                  className="p-2 text-zinc-500 hover:text-red-500 transition-colors" 
                  title="Sign Out"
                >
                  <Settings size={20} />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            <ViewWrapper key={activeTab}>
              {activeTab === 'dashboard' && <DashboardView appointments={appointments} clinicInfo={clinicInfo} onBook={() => setIsBookingModalOpen(true)} />}
              {activeTab === 'booking' && <BookingView />}
              {activeTab === 'patients' && <PatientsView patients={patients} onAdd={() => setIsAddingPatient(true)} />}
              {activeTab === 'chat' && <ChatView />}
            </ViewWrapper>
          </AnimatePresence>
        </div>

        <BookingModal isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} />

        {/* Add Patient Modal */}
        <AnimatePresence>
          {isAddingPatient && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAddingPatient(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 w-full max-w-lg relative z-10 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-white tracking-tight uppercase">New Lead Acquisition</h2>
                  <button onClick={() => setIsAddingPatient(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
                    <X size={20} />
                  </button>
                </div>
                
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const name = formData.get('name') as string;
                  const email = formData.get('email') as string;
                  const user = auth.currentUser;
                  if (!user) return;
                  
                  try {
                    await addDoc(collection(db, 'patients'), {
                      name,
                      email,
                      status: 'Stable',
                      userId: user.uid,
                      createdAt: serverTimestamp(),
                      lastVisit: 'Today',
                      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
                    });
                    setIsAddingPatient(false);
                  } catch (error) {
                    handleFirestoreError(error, 'create', 'patients');
                  }
                }} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Lead Identity</label>
                    <input name="name" required type="text" className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none focus:border-[#D4FF33] transition-all" placeholder="Full Name" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Email Address</label>
                    <input name="email" required type="email" className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none focus:border-[#D4FF33] transition-all" placeholder="email@example.com" />
                  </div>
                  <button type="submit" className="w-full bg-[#D4FF33] text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    Inject into Funnel
                    <CheckCircle2 size={18} strokeWidth={3} />
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 z-50 md:hidden flex flex-col p-8"
            >
              <div className="flex justify-between items-center mb-12">
                <div className="w-10 h-10 bg-[#D4FF33] rounded-xl flex items-center justify-center text-black">
                  <Activity size={20} strokeWidth={3} />
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2"><X size={24} /></button>
              </div>
              <nav className="flex flex-col gap-8">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "text-3xl font-black uppercase tracking-tighter text-left transition-colors",
                      activeTab === item.id ? "text-[#D4FF33]" : "text-zinc-700"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Action Button (Mobile) */}
        <button 
          onClick={() => setIsBookingModalOpen(true)}
          className="md:hidden fixed bottom-6 right-6 w-16 h-16 bg-[#D4FF33] text-black rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-40"
        >
          <Plus size={28} strokeWidth={3} />
        </button>
      </main>
    </div>
  );
}
