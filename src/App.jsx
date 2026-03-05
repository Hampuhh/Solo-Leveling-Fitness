import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Activity, Swords, Target, Settings,
  Volume2, VolumeX, Zap, Calendar, 
  AlertTriangle, Crown, Box, Award, CheckCircle, Plus, Flame, Clock, Utensils, Info
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, onSnapshot, addDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  // ⚠️ ATENCIÓN CAZADOR: PEGA AQUÍ TUS DATOS REALES DE FIREBASE ⚠️
  apiKey: "AIzaSyCw9Y0w0Ry6AC1qI0Ip-UrNAnDL5T1LO7U",
  authDomain: "solo-leveling-fitness-1ddf4.firebaseapp.com",
  projectId: "solo-leveling-fitness-1ddf4",
  storageBucket: "solo-leveling-fitness-1ddf4.firebasestorage.app",
  messagingSenderId: "939118746731",
  appId: "1:939118746731:web:51a04faeb709bf050a652e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'solo-leveling-fit-ultimate-v4';

// --- AUDIO ASSETS ---
const BGM_URL = "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=epic-battle-114876.mp3"; 
const CLICK_SFX = "https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=button-pressed-38129.mp3";
const SUCCESS_SFX = "https://cdn.pixabay.com/download/audio/2021/08/04/audio_bb630cc098.mp3?filename=success-1-6297.mp3";

const playSound = (url) => {
  const audio = new Audio(url);
  audio.volume = 0.4;
  audio.play().catch(e => console.log("Audio blocked by browser", e));
};

// ==========================================
// PANTALLA DE INICIO (SPLASH SCREEN)
// ==========================================
function SplashScreen({ onStart }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden selection:bg-blue-900">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vw] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950/90 to-slate-950 animate-[spin_60s_linear_infinite] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>

      <div className="z-10 text-center animate-fade-in-up flex flex-col items-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
          <Zap className="w-24 h-24 text-blue-500 relative animate-bounce-slow filter drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
        </div>
        
        <h1 className="text-5xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-blue-500 mb-2 uppercase filter drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
          Sistema
        </h1>
        <p className="text-blue-300 font-mono tracking-[0.3em] uppercase text-xs mb-16 opacity-80 shadow-blue-500/50">
          Nivelación en Solitario
        </p>

        <button
          onClick={onStart}
          className="relative inline-flex h-14 active:scale-95 transition-transform overflow-hidden rounded-full p-[2px] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900 group"
        >
          <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#60a5fa_0%,#c084fc_50%,#60a5fa_100%)] group-hover:bg-[conic-gradient(from_90deg_at_50%_50%,#3b82f6_0%,#a855f7_50%,#3b82f6_100%)]" />
          <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-10 py-1 text-sm font-black uppercase tracking-widest text-white backdrop-blur-3xl transition-colors hover:bg-slate-900/90 gap-2">
            Despertar <Zap size={16} className="text-blue-400 animate-pulse" />
          </span>
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .animate-fade-in-up { animation: fadeInUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-bounce-slow { animation: bounceSlow 3s ease-in-out infinite; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounceSlow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
      `}} />
    </div>
  );
}

// ==========================================
// APP PRINCIPAL
// ==========================================
export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [logs, setLogs] = useState([]);
  const [quests, setQuests] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [foodLogs, setFoodLogs] = useState([]);
  
  const [activeTab, setActiveTab] = useState('status');
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  
  const [penaltyMessage, setPenaltyMessage] = useState('');
  const [systemAlert, setSystemAlert] = useState(null);
  const [timeToReset, setTimeToReset] = useState('');
  const [isRiskZone, setIsRiskZone] = useState(false);
  
  const audioRef = useRef(null);

  // --- AUTHENTICATION ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) { console.error("Error Auth:", error); }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- SYSTEM CLOCK & RISK ZONE ---
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      const diff = tomorrow - now;
      
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      
      setTimeToReset(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      setIsRiskZone(now.getHours() >= 21);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- DATA FETCHING ---
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'system', 'profile');
    const logsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'logs');
    const questsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'quests');
    const rewardsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'rewards');
    const foodRef = collection(db, 'artifacts', appId, 'users', user.uid, 'food');

    const unsubProfile = onSnapshot(profileRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile(data);
        
        const todayStr = new Date().toLocaleDateString('en-CA'); 
        const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
        
        if (data.lastCompletedDate && data.lastCompletedDate < yesterdayStr) {
          playSound(SUCCESS_SFX); 
          const penaltyXP = 100;
          const newXP = Math.max(0, (data.xp || 0) - penaltyXP);
          setPenaltyMessage(`ADVERTENCIA: No completaste la Misión de ayer. Penalización: -${penaltyXP} XP.`);
          await updateDoc(profileRef, { xp: newXP, lastCompletedDate: yesterdayStr });
          setTimeout(() => setPenaltyMessage(''), 8000);
        }
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    const unsubLogs = onSnapshot(logsRef, (snap) => {
      const data = []; snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      data.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis());
      setLogs(data);
    });

    const unsubQuests = onSnapshot(questsRef, (snap) => {
      const data = []; snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      data.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis());
      setQuests(data);
    });

    const unsubRewards = onSnapshot(rewardsRef, (snap) => {
      const data = []; snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      data.sort((a, b) => a.targetKg - b.targetKg);
      setRewards(data);
    });

    const unsubFood = onSnapshot(foodRef, (snap) => {
      const data = []; snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      data.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis());
      setFoodLogs(data);
    });

    return () => { unsubProfile(); unsubLogs(); unsubQuests(); unsubRewards(); unsubFood(); };
  }, [user]);

  // --- HANDLERS ---
  const handleStartSystem = () => {
    playSound(CLICK_SFX);
    setShowSplash(false);
    if (audioRef.current) {
      audioRef.current.play().then(() => setIsMusicPlaying(true)).catch(e => console.log(e));
    }
  };

  const toggleMusic = () => {
    playSound(CLICK_SFX);
    if (audioRef.current) {
      if (isMusicPlaying) audioRef.current.pause();
      else audioRef.current.play().catch(e => console.log(e));
      setIsMusicPlaying(!isMusicPlaying);
    }
  };

  const navChange = (tab) => {
    playSound(CLICK_SFX);
    setActiveTab(tab);
  };

  const showAlert = (title, message, type = 'success') => {
    playSound(SUCCESS_SFX);
    setSystemAlert({ title, message, type });
    setTimeout(() => setSystemAlert(null), 4000);
  };

  // --- RENDER ---
  if (showSplash) {
    return <SplashScreen onStart={handleStartSystem} />;
  }

  if (isLoading || !user) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500">
      <Zap className="w-12 h-12 animate-bounce filter drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
    </div>
  );

  const currentWeight = logs.length > 0 ? logs[0].weight : profile?.baseWeight;
  const totalLost = profile?.baseWeight - currentWeight;
  const todayStr = new Date().toLocaleDateString('en-CA');
  const hasCompletedDailyToday = profile?.lastCompletedDate === todayStr;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-900 selection:text-blue-100 flex justify-center pb-20 md:pb-0">
      <audio ref={audioRef} src={BGM_URL} loop />
      
      <div className="w-full max-w-md bg-slate-900 min-h-screen relative shadow-2xl shadow-blue-900/20 md:border-x border-blue-900/30 overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <header className="bg-slate-950 border-b border-blue-800/50 p-4 sticky top-0 z-30 flex justify-between items-center shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-2">
            <Zap className="text-blue-500 w-6 h-6 animate-pulse" />
            <h1 className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 uppercase">
              El Sistema
            </h1>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleMusic} className={`p-2 rounded-full border transition-all duration-300 ${isMusicPlaying ? 'border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'border-slate-700 text-slate-500 hover:text-slate-300'}`}>
              {isMusicPlaying ? <Volume2 size={18} className="animate-pulse" /> : <VolumeX size={18} />}
            </button>
            {profile && (
              <button onClick={() => navChange('settings')} className={`p-2 rounded-full border transition-all duration-300 ${activeTab === 'settings' ? 'border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)] bg-blue-900/20' : 'border-slate-700 text-slate-500 hover:text-slate-300'}`}>
                <Settings size={18} className={activeTab === 'settings' ? 'animate-[spin_4s_linear_infinite]' : ''} />
              </button>
            )}
          </div>
        </header>

        {/* RISK ZONE WARNING */}
        {profile && !hasCompletedDailyToday && isRiskZone && activeTab !== 'settings' && (
          <div className="bg-red-950/90 border-b border-red-500 p-2 flex items-center justify-center gap-2 animate-pulse">
            <AlertTriangle className="text-red-500 w-4 h-4" />
            <span className="text-red-400 text-[10px] font-bold uppercase tracking-widest">
              Alerta: Quedan {timeToReset} para evitar penalización
            </span>
          </div>
        )}

        {/* PENALTY MESSAGE */}
        {penaltyMessage && (
          <div className="absolute top-20 left-0 w-full z-40 p-4 animate-fade-in-down">
            <div className="bg-red-950/95 border border-red-500 p-4 rounded-md shadow-[0_0_30px_rgba(239,68,68,0.6)] flex items-start gap-3 backdrop-blur-md">
              <AlertTriangle className="text-red-500 w-6 h-6 shrink-0 animate-pulse" />
              <p className="text-red-200 text-sm font-bold tracking-wide leading-relaxed">{penaltyMessage}</p>
            </div>
          </div>
        )}

        {/* SYSTEM ALERT POPUP */}
        {systemAlert && (
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-11/12 z-50 animate-popup pointer-events-none">
            <div className={`border p-6 rounded-lg shadow-2xl backdrop-blur-md text-center ${
              systemAlert.type === 'success' ? 'bg-blue-950/95 border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.6)]' :
              systemAlert.type === 'reward' ? 'bg-yellow-950/95 border-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.6)]' :
              'bg-purple-950/95 border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.6)]'
            }`}>
              <div className="flex justify-center mb-3">
                {systemAlert.type === 'success' ? <CheckCircle className="w-12 h-12 text-blue-400 animate-bounce" /> : 
                 systemAlert.type === 'reward' ? <Award className="w-12 h-12 text-yellow-400 animate-[spin_3s_linear_infinite]" /> :
                 <Zap className="w-12 h-12 text-purple-400 animate-pulse" />}
              </div>
              <h2 className={`text-xl font-black uppercase tracking-widest mb-2 ${
                systemAlert.type === 'success' ? 'text-blue-300' : 
                systemAlert.type === 'reward' ? 'text-yellow-300' : 'text-purple-300'
              }`}>{systemAlert.title}</h2>
              <p className="text-slate-300 font-mono text-sm">{systemAlert.message}</p>
            </div>
          </div>
        )}

        {/* CONTENT AREA */}
        <main className="flex-1 p-4 overflow-y-auto custom-scrollbar relative z-10 scroll-smooth">
          {!profile ? (
            <AwakeningScreen user={user} setProfile={setProfile} playSound={playSound} />
          ) : (
            <div className="animate-fade-in pb-16">
              {activeTab === 'status' && <PlayerStatus profile={profile} currentWeight={currentWeight} totalLost={totalLost} />}
              {activeTab === 'log' && <DailyLog user={user} profile={profile} logs={logs} showAlert={showAlert} playSound={playSound} />}
              {activeTab === 'food' && <FoodTracker user={user} profile={profile} foodLogs={foodLogs} todayStr={todayStr} playSound={playSound} />}
              {activeTab === 'quest' && <QuestBoard user={user} profile={profile} quests={quests} showAlert={showAlert} hasCompletedDailyToday={hasCompletedDailyToday} timeToReset={timeToReset} playSound={playSound} />}
              {activeTab === 'goals' && <GoalsBoard user={user} rewards={rewards} totalLost={totalLost} showAlert={showAlert} playSound={playSound} />}
              {activeTab === 'settings' && <SettingsMenu user={user} profile={profile} playSound={playSound} />}
            </div>
          )}
        </main>

        {/* BOTTOM NAV */}
        {profile && (
          <nav className="fixed bottom-0 w-full max-w-md bg-slate-950/95 backdrop-blur-md border-t border-blue-900/50 flex justify-around p-2 z-30 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
            <NavItem icon={<User />} label="Estado" isActive={activeTab === 'status'} onClick={() => navChange('status')} />
            <NavItem icon={<Activity />} label="Físico" isActive={activeTab === 'log'} onClick={() => navChange('log')} />
            <NavItem icon={<Flame />} label="Energía" isActive={activeTab === 'food'} onClick={() => navChange('food')} />
            <NavItem icon={<Swords />} label="Misiones" isActive={activeTab === 'quest'} onClick={() => navChange('quest')} />
            <NavItem icon={<Target />} label="Metas" isActive={activeTab === 'goals'} onClick={() => navChange('goals')} />
          </nav>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e40af; border-radius: 10px; }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        .animate-popup { animation: popupAnim 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-fade-in-down { animation: fadeInDown 0.5s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popupAnim { 
          0% { opacity: 0; transform: translateX(-50%) scale(0.8) translateY(20px); } 
          50% { transform: translateX(-50%) scale(1.05) translateY(0); }
          100% { opacity: 1; transform: translateX(-50%) scale(1) translateY(0); } 
        }
        .system-box { background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(59, 130, 246, 0.3); box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4); border-radius: 0.5rem; backdrop-filter: blur(8px); }
        .system-input { background: rgba(2, 6, 23, 0.9); border: 1px solid rgba(59, 130, 246, 0.4); color: #60a5fa; padding: 0.75rem; border-radius: 0.375rem; width: 100%; outline: none; transition: all 0.3s; font-family: monospace; }
        .system-input:focus { border-color: #3b82f6; box-shadow: 0 0 10px rgba(59, 130, 246, 0.3); }
        .system-btn { background: linear-gradient(to right, #1e3a8a, #2563eb); color: white; padding: 0.75rem 1.5rem; border-radius: 0.375rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; transition: all 0.2s; border: 1px solid #60a5fa; text-shadow: 0 0 5px rgba(255,255,255,0.3); box-shadow: 0 0 10px rgba(37, 99, 235, 0.3); width: 100%; display: flex; justify-content: center; align-items: center; gap: 0.5rem; cursor: pointer; }
        .system-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 0 20px rgba(59, 130, 246, 0.6); }
        .system-btn:active:not(:disabled) { transform: translateY(1px); }
        .system-btn:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(1); }
      `}} />
    </div>
  );
}

// --- SHARED COMPONENTS ---
function NavItem({ icon, label, isActive, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-[72px] h-[56px] transition-all duration-300 relative ${isActive ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'text-slate-500 hover:text-slate-400'}`}>
      {isActive && <div className="absolute top-0 w-8 h-1 bg-blue-500 rounded-b-full shadow-[0_0_10px_rgba(59,130,246,1)]"></div>}
      <div className={`mb-1 transition-transform ${isActive ? '-translate-y-1 scale-110' : ''}`}>{icon}</div>
      <span className={`text-[9px] font-bold uppercase tracking-wider transition-all ${isActive ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
    </button>
  );
}

function SystemMessage({ title, children, type = 'info' }) {
  const colors = {
    info: 'border-blue-500 shadow-blue-500/10 text-blue-400',
    warning: 'border-yellow-500 shadow-yellow-500/10 text-yellow-400',
    success: 'border-purple-500 shadow-purple-500/20 text-purple-400'
  };
  return (
    <div className={`border bg-slate-950/90 p-4 rounded-md mb-6 shadow-lg ${colors[type]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-5 h-5 animate-pulse" />
        <h3 className="font-bold uppercase tracking-widest">{title}</h3>
      </div>
      <div className="text-slate-300 text-sm font-mono leading-relaxed">{children}</div>
    </div>
  );
}

// ==========================================
// 1. AWAKENING (Setup + Calorie Math)
// ==========================================
function AwakeningScreen({ user, setProfile, playSound }) {
  const [formData, setFormData] = useState({
    playerName: '', gender: 'male', age: '', height: '',
    baseWeight: '', targetWeight: '', deficit: '500', 
    dailyQuestTitle: 'El Entrenamiento del Cazador',
    dailyQuestDesc: '100 Flexiones\n100 Abdominales\n100 Sentadillas\n10km Correr',
  });
  const [loading, setLoading] = useState(false);

  const calculateTargetCalories = (weight, height, age, gender, deficit) => {
    let bmr;
    if (gender === 'male') {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
    const tdee = bmr * 1.55;
    return Math.round(tdee - deficit);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    playSound(CLICK_SFX);
    setLoading(true);
    try {
      const weight = parseFloat(formData.baseWeight);
      const height = parseFloat(formData.height);
      const age = parseInt(formData.age);
      const deficit = parseInt(formData.deficit);
      
      const targetCalories = calculateTargetCalories(weight, height, age, formData.gender, deficit);

      const profileData = {
        playerName: formData.playerName || 'Jugador',
        gender: formData.gender,
        age: age,
        height: height,
        level: 1, xp: 0,
        baseWeight: weight,
        targetWeight: parseFloat(formData.targetWeight),
        deficit: deficit,
        calorieTarget: targetCalories,
        avatarUrl: '', // Using the new dynamic SVG instead of image URL
        dailyQuestTitle: formData.dailyQuestTitle,
        dailyQuestDesc: formData.dailyQuestDesc,
        lastCompletedDate: new Date().toLocaleDateString('en-CA'),
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'system', 'profile'), profileData);
      playSound(SUCCESS_SFX);
    } catch (error) { console.error("Error Awakening:", error); }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full py-4">
      <SystemMessage title="Mensaje del Sistema" type="warning">
        EL DESPERTAR ESTÁ INICIANDO.<br/>Registra tus atributos físicos reales para calibrar tu Físico y tu Energía Base.
      </SystemMessage>

      <form onSubmit={handleSubmit} className="system-box p-5 space-y-4">
        <div>
          <label className="block text-[10px] uppercase text-blue-400 font-bold mb-1">Nombre del Cazador</label>
          <input type="text" required className="system-input py-2" value={formData.playerName} onChange={e => setFormData({...formData, playerName: e.target.value})} placeholder="Ej: Sung Jin-Woo" />
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-4">
          <div>
            <label className="block text-[10px] uppercase text-blue-400 font-bold mb-1">Género del Avatar</label>
            <select className="system-input py-2 appearance-none" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase text-blue-400 font-bold mb-1">Edad</label>
            <input type="number" required className="system-input py-2" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} placeholder="Años" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-slate-800 pt-4">
          <div>
            <label className="block text-[10px] uppercase text-blue-400 font-bold mb-1">Estatura (cm)</label>
            <input type="number" required className="system-input py-2" value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} />
          </div>
          <div>
            <label className="block text-[10px] uppercase text-blue-400 font-bold mb-1">Peso Base (kg)</label>
            <input type="number" step="0.1" required className="system-input py-2" value={formData.baseWeight} onChange={e => setFormData({...formData, baseWeight: e.target.value})} />
          </div>
          <div>
            <label className="block text-[10px] uppercase text-blue-400 font-bold mb-1">Peso Meta (kg)</label>
            <input type="number" step="0.1" required className="system-input py-2" value={formData.targetWeight} onChange={e => setFormData({...formData, targetWeight: e.target.value})} />
          </div>
        </div>

        <div className="border-t border-slate-800 pt-4">
          <label className="block text-[10px] uppercase text-orange-400 font-bold mb-1 flex justify-between items-center">
            <span>Déficit Calórico Diario</span>
          </label>
          <select className="system-input py-2 border-orange-900/50" value={formData.deficit} onChange={e => setFormData({...formData, deficit: e.target.value})}>
            <option value="300">Suave (300 kcal)</option>
            <option value="500">Moderado (500 kcal)</option>
            <option value="750">Agresivo (750 kcal)</option>
            <option value="1000">Extremo (1000 kcal)</option>
          </select>
          <div className="bg-slate-900/50 p-2 mt-2 border border-slate-800 rounded flex gap-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[9px] text-slate-400 leading-tight">Las calorías diarias se calcularán automáticamente considerando tu metabolismo basal, tu actividad como cazador y el déficit seleccionado.</p>
          </div>
        </div>
        
        <div className="border-t border-slate-800 pt-4">
          <label className="block text-[10px] uppercase text-purple-400 font-bold mb-1">Título Misión Diaria Constante</label>
          <input type="text" required className="system-input py-2 mb-2" value={formData.dailyQuestTitle} onChange={e => setFormData({...formData, dailyQuestTitle: e.target.value})} />
          
          <label className="block text-[10px] uppercase text-purple-400 font-bold mb-1">Detalles de la Misión</label>
          <textarea required className="system-input py-2 h-20 resize-none" value={formData.dailyQuestDesc} onChange={e => setFormData({...formData, dailyQuestDesc: e.target.value})} />
        </div>

        <button type="submit" disabled={loading} className="system-btn mt-6">
          {loading ? 'Inicializando...' : 'Aceptar Contrato'}
        </button>
      </form>
    </div>
  );
}

// ==========================================
// 2. PLAYER STATUS (Dashboard + New SVG Avatar)
// ==========================================

const BeautifulAvatar = ({ progressPct, gender, isAdvancedClass }) => {
  const p = Math.max(0, Math.min(100, progressPct)) / 100;

  // Calculando proporciones suaves basadas en progreso (0 a 1)
  const shoulderW = gender === 'male' ? 24 + (p * 4) : 18 + (p * 2);
  const waistW = gender === 'male' ? 24 - (p * 8) : 22 - (p * 10);
  const hipW = gender === 'male' ? 19 - (p * 3) : 24 - (p * 5);

  const colorPrimary = isAdvancedClass ? "#c084fc" : "#60a5fa"; // Purple-400 or Blue-400
  const colorGlow = isAdvancedClass ? "#e9d5ff" : "#bfdbfe"; // Lighter for core

  return (
    <div className={`w-24 h-24 rounded-full border-[3px] flex items-end justify-center overflow-hidden bg-slate-950 transition-all duration-1000 ${isAdvancedClass ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.8)]' : 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]'}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorPrimary} stopOpacity="0.9" />
            <stop offset="100%" stopColor={colorPrimary} stopOpacity="0.1" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Aura Oscilante */}
        <path d={`M 50 15 C ${50+shoulderW+5} 15, ${50+waistW+10} 60, ${50+hipW+5} 100 L ${50-hipW-5} 100 C ${50-waistW-10} 60, ${50-shoulderW-5} 15, 50 15 Z`} 
              fill={colorPrimary} opacity="0.15" filter="url(#glow)" className="animate-pulse" />

        {/* Silueta Estilizada */}
        <path d={`
          M 46 25
          L 54 25
          L 54 32
          C ${50 + shoulderW} 32, ${50 + shoulderW} 38, ${50 + shoulderW} 45
          C ${50 + waistW} 60, ${50 + waistW} 75, ${50 + hipW} 85
          L ${50 + hipW} 100
          L ${50 - hipW} 100
          C ${50 - hipW} 85, ${50 - waistW} 75, ${50 - waistW} 60
          C ${50 - shoulderW} 45, ${50 - shoulderW} 38, 46 32
          Z
        `} fill="url(#bodyGrad)" className="transition-all duration-1000" />

        {/* Cabeza Minimalista */}
        <circle cx="50" cy="16" r="10" fill={colorPrimary} opacity="0.95" />

        {/* Núcleo de Energía (Crece con el progreso) */}
        <circle cx="50" cy="42" r={2 + (p * 2.5)} fill={colorGlow} filter="url(#glow)" className="animate-pulse" />
      </svg>
    </div>
  );
};

function PlayerStatus({ profile, currentWeight, totalLost }) {
  const progressPct = Math.max(0, Math.min(100, (totalLost / (profile.baseWeight - profile.targetWeight)) * 100));
  const currentLevel = Math.floor((profile.xp || 0) / 100) + 1;
  const currentXp = (profile.xp || 0) % 100;

  let playerRank = 'E'; let rankColor = 'text-slate-400'; let rankShadow = '';
  if (progressPct >= 100) { playerRank = 'S'; rankColor = 'text-yellow-400'; rankShadow = 'drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]'; }
  else if (progressPct >= 80) { playerRank = 'A'; rankColor = 'text-red-400'; rankShadow = 'drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]'; }
  else if (progressPct >= 60) { playerRank = 'B'; rankColor = 'text-purple-400'; rankShadow = 'drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]'; }
  else if (progressPct >= 40) { playerRank = 'C'; rankColor = 'text-blue-400'; rankShadow = 'drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]'; }
  else if (progressPct >= 20) { playerRank = 'D'; rankColor = 'text-green-400'; }

  const isAdvancedClass = progressPct >= 50;
  const playerClass = isAdvancedClass ? "Cazador de Sombras" : "Recluta";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="system-box p-5 relative overflow-hidden flex gap-5 items-center">
        {/* Nuevo Avatar Hermoso */}
        <div className="relative shrink-0">
          <BeautifulAvatar progressPct={progressPct} gender={profile.gender} isAdvancedClass={isAdvancedClass} />
          <div className={`absolute -bottom-2 -right-2 bg-slate-900 border rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold font-mono text-white ${isAdvancedClass ? 'border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.6)]' : 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]'}`}>
            {currentLevel}
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest leading-none mb-1">Cazador</p>
          <h2 className="text-xl md:text-2xl font-black uppercase text-white truncate leading-none mb-2 tracking-wide" title={profile.playerName}>
            {profile.playerName}
          </h2>
          <div className="flex items-center flex-wrap gap-2">
            <span className={`text-lg leading-none font-black font-mono ${rankColor} ${rankShadow}`}>Rango {playerRank}</span>
            <span className="text-[10px] leading-none font-bold uppercase text-slate-400 border-l border-slate-600 pl-2 py-0.5 mt-0.5">{playerClass}</span>
          </div>
        </div>
      </div>

      <div className="system-box p-4">
        <div className="flex justify-between text-[10px] mb-1 font-mono text-slate-400 uppercase">
          <span>Transformación a Rango S</span>
          <span className={progressPct >= 100 ? 'text-yellow-400 font-bold' : ''}>{progressPct.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-900 overflow-hidden rounded-full mb-4">
          <div className={`h-full transition-all duration-1000 ${progressPct >= 100 ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]' : 'bg-blue-500'}`} style={{ width: `${progressPct}%` }} />
        </div>

        <div className="flex justify-between text-[10px] mb-1 font-mono uppercase mt-2">
          <span className="text-purple-400 font-bold">Experiencia (Nivel {currentLevel + 1})</span>
          <span className="text-purple-300">{currentXp} / 100</span>
        </div>
        <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-purple-900/50">
          <div className="h-full bg-gradient-to-r from-purple-800 to-purple-400 transition-all duration-1000 ease-out" style={{ width: `${currentXp}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="system-box p-4 text-center">
          <p className="text-[10px] text-blue-400 uppercase font-bold mb-1">Peso Actual</p>
          <p className="text-2xl font-mono text-white">{currentWeight.toFixed(1)} <span className="text-xs text-slate-500">kg</span></p>
        </div>
        <div className="system-box p-4 text-center">
          <p className="text-[10px] text-blue-400 uppercase font-bold mb-1">Total Perdido</p>
          <p className="text-2xl font-mono text-green-400">{totalLost > 0 ? '-' : ''}{Math.abs(totalLost).toFixed(1)} <span className="text-xs text-slate-500">kg</span></p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. PHYSICAL LOG
// ==========================================
function DailyLog({ user, profile, logs, showAlert, playSound }) {
  const [formData, setFormData] = useState({ weight: '', waist: '', hips: '', chest: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.weight) return;
    playSound(CLICK_SFX);
    setLoading(true);
    
    try {
      const logData = {
        weight: parseFloat(formData.weight),
        waist: formData.waist ? parseFloat(formData.waist) : null,
        hips: formData.hips ? parseFloat(formData.hips) : null,
        chest: formData.chest ? parseFloat(formData.chest) : null,
        timestamp: serverTimestamp(),
        dateStr: new Date().toLocaleDateString('en-CA')
      };
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'logs'), logData);
      setFormData({ weight: '', waist: '', hips: '', chest: '' });
      showAlert("Registro Exitoso", "Atributos físicos sincronizados.");
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="system-box p-5">
        <h3 className="text-blue-400 font-bold uppercase tracking-widest text-sm mb-4 border-b border-blue-900/50 pb-2 flex items-center gap-2">
          <Calendar size={16}/> Actualizar Atributos
        </h3>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-[10px] uppercase text-slate-400 mb-1">Peso Obligatorio (kg)</label>
            <input type="number" step="0.1" required className="system-input py-3 text-2xl font-black text-center text-white" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} placeholder={logs[0]?.weight || profile.baseWeight} />
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-slate-800 pt-3">
            <div><label className="block text-[9px] uppercase text-slate-500 mb-1">Cintura</label><input type="number" step="0.1" className="system-input py-1 text-sm text-center" value={formData.waist} onChange={e => setFormData({...formData, waist: e.target.value})} /></div>
            <div><label className="block text-[9px] uppercase text-slate-500 mb-1">Cadera</label><input type="number" step="0.1" className="system-input py-1 text-sm text-center" value={formData.hips} onChange={e => setFormData({...formData, hips: e.target.value})} /></div>
            <div><label className="block text-[9px] uppercase text-slate-500 mb-1">Pecho</label><input type="number" step="0.1" className="system-input py-1 text-sm text-center" value={formData.chest} onChange={e => setFormData({...formData, chest: e.target.value})} /></div>
          </div>
        </div>
        <button type="submit" disabled={loading} className="system-btn">{loading ? 'Guardando...' : 'Registrar'}</button>
      </form>

      <div className="system-box p-4">
        <h3 className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-3">Historial</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
          {logs.map((log) => (
            <div key={log.id} className="bg-slate-900/60 p-2 rounded border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-blue-300 font-bold font-mono text-sm block">{log.weight} kg</span>
                <div className="text-[9px] text-slate-500 uppercase flex gap-2">
                  {log.waist && <span>Cin:{log.waist}</span>}
                  {log.hips && <span>Cad:{log.hips}</span>}
                  {log.chest && <span>Pec:{log.chest}</span>}
                </div>
              </div>
              <span className="text-slate-500 font-mono text-[10px]">
                {log.timestamp ? new Date(log.timestamp.toMillis()).toLocaleDateString() : 'Hoy'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. ENERGY & FOOD TRACKER
// ==========================================
function FoodTracker({ user, profile, foodLogs, todayStr, playSound }) {
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [loading, setLoading] = useState(false);

  const todayLogs = foodLogs.filter(log => log.dateStr === todayStr);
  const calsConsumed = todayLogs.reduce((sum, log) => sum + log.calories, 0);
  const target = profile.calorieTarget || 2000;
  
  const calsRemaining = target - calsConsumed;
  const pctConsumed = Math.min(100, (calsConsumed / target) * 100);

  const isOverLimit = calsRemaining < 0;

  const handleAddFood = async (e) => {
    e.preventDefault();
    if (!foodName || !calories) return;
    playSound(CLICK_SFX);
    setLoading(true);

    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'food'), {
        name: foodName, calories: parseInt(calories),
        timestamp: serverTimestamp(), dateStr: todayStr
      });
      setFoodName(''); setCalories('');
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    playSound(CLICK_SFX);
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'food', id));
  };

  return (
    <div className="space-y-6">
      <div className="system-box p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Flame className="w-24 h-24 text-orange-500" />
        </div>
        
        <div className="flex justify-between items-start mb-4 border-b border-orange-900/50 pb-2">
          <h3 className="text-orange-400 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
            <Flame size={16}/> Energía Diaria
          </h3>
          <div className="text-[9px] text-right font-mono text-slate-400">
            Déficit Activo: <br/><span className="text-orange-300">-{profile.deficit} kcal</span>
          </div>
        </div>
        
        <div className="text-center mb-6">
          <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Calorías Restantes</p>
          <p className={`text-4xl font-black font-mono ${isOverLimit ? 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'text-white'}`}>
            {isOverLimit ? '0' : calsRemaining}
          </p>
          {isOverLimit && <p className="text-xs text-red-400 font-bold mt-1 uppercase">¡Límite Excedido (+{Math.abs(calsRemaining)})!</p>}
        </div>

        <div className="mb-2">
          <div className="flex justify-between text-[10px] mb-1 font-mono text-slate-400 uppercase">
            <span>Consumido: {calsConsumed}</span>
            <span>Meta: {target}</span>
          </div>
          <div className="h-2 w-full bg-slate-900 overflow-hidden rounded-full border border-slate-700">
            <div className={`h-full transition-all duration-500 ${isOverLimit ? 'bg-red-500' : 'bg-gradient-to-r from-orange-600 to-orange-400'}`} style={{ width: `${pctConsumed}%` }} />
          </div>
        </div>
      </div>

      <form onSubmit={handleAddFood} className="system-box p-4 border-orange-500/30">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-orange-400 mb-3">Registrar Consumo</h4>
        <div className="flex gap-2 mb-3">
          <input type="text" required className="system-input flex-1 py-2 text-sm" placeholder="Alimento" value={foodName} onChange={e=>setFoodName(e.target.value)} />
          <input type="number" required className="system-input w-24 py-2 text-sm" placeholder="Kcal" value={calories} onChange={e=>setCalories(e.target.value)} />
        </div>
        <button type="submit" disabled={loading} className="w-full py-2 bg-gradient-to-r from-orange-900 to-orange-600 text-white text-xs font-bold uppercase rounded border border-orange-500 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all">
          Añadir Energía
        </button>
      </form>

      <div className="system-box p-4">
        <h3 className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-3 flex items-center gap-1">
          <Utensils size={12}/> Historial Diario
        </h3>
        {todayLogs.length === 0 ? (
           <p className="text-slate-500 text-xs italic text-center py-2">Sin registros hoy.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {todayLogs.map((log) => (
              <div key={log.id} className="bg-slate-900/60 p-2 rounded border border-slate-800 flex justify-between items-center group">
                <span className="text-xs text-slate-300 truncate pr-2">{log.name}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] font-mono text-orange-300">{log.calories} kcal</span>
                  <button onClick={() => handleDelete(log.id)} className="text-slate-600 hover:text-red-400">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 5. QUEST BOARD
// ==========================================
function QuestBoard({ user, profile, quests, showAlert, hasCompletedDailyToday, timeToReset, playSound }) {
  const [extraTitle, setExtraTitle] = useState('');
  const [extraDuration, setExtraDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const todayStr = new Date().toLocaleDateString('en-CA');

  const handleCompleteDaily = async () => {
    if (hasCompletedDailyToday) return;
    playSound(CLICK_SFX);
    setLoading(true);
    try {
      const xpReward = 100;
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'quests'), {
        title: profile.dailyQuestTitle || "Misión Diaria",
        isDaily: true, xpEarned: xpReward, timestamp: serverTimestamp()
      });
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'system', 'profile'), {
        xp: (profile.xp || 0) + xpReward, lastCompletedDate: todayStr
      });
      showAlert("Misión Completada", `Has obtenido +${xpReward} XP. El Sistema reconoce tu esfuerzo.`);
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const handleCompleteExtra = async (e) => {
    e.preventDefault();
    if (!extraTitle || !extraDuration) return;
    playSound(CLICK_SFX);
    setLoading(true);

    try {
      const xpReward = 50; 
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'quests'), {
        title: `[Extra] ${extraTitle}`, duration: parseInt(extraDuration),
        xpEarned: xpReward, timestamp: serverTimestamp()
      });
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'system', 'profile'), {
        xp: (profile.xp || 0) + xpReward
      });
      setExtraTitle(''); setExtraDuration('');
      showAlert("Entrenamiento Extra", `XP Adicional obtenida: +${xpReward} XP.`, "purple");
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      
      <div className="system-box p-3 text-center border-blue-500/30 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
          <Clock size={12}/> Reinicio del Ciclo del Sistema en
        </p>
        <div className="text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-blue-100 to-blue-500 tracking-widest drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]">
          {timeToReset}
        </div>
      </div>

      <div className={`system-box p-1 relative overflow-hidden transition-all duration-500 ${hasCompletedDailyToday ? 'border-green-500/50 opacity-80' : 'border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.2)]'}`}>
        <div className={`absolute top-0 left-0 w-1 h-full ${hasCompletedDailyToday ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
        <div className="p-4 pl-5">
          <h3 className={`font-bold uppercase tracking-widest text-sm flex items-center gap-2 mb-2 ${hasCompletedDailyToday ? 'text-green-400' : 'text-red-400'}`}>
            <AlertTriangle size={16}/> Misión Diaria Constante
          </h3>
          
          <div className="bg-slate-950/50 p-3 rounded border border-slate-800 mb-4">
            <h4 className="text-white font-bold mb-2 border-b border-slate-800 pb-1">{profile.dailyQuestTitle}</h4>
            <p className="text-sm font-mono text-slate-300 whitespace-pre-line leading-relaxed">
              {profile.dailyQuestDesc}
            </p>
          </div>
          
          <button onClick={handleCompleteDaily} disabled={hasCompletedDailyToday || loading} 
            className={`w-full py-3 rounded uppercase font-bold tracking-widest text-xs transition-all flex justify-center items-center gap-2 ${
              hasCompletedDailyToday ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed' : 'bg-red-900/80 text-red-100 border border-red-500 hover:bg-red-800 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
            }`}
          >
            {hasCompletedDailyToday ? <><CheckCircle size={16}/> Misión Cumplida</> : 'Reportar Cumplimiento'}
          </button>
        </div>
      </div>

      <form onSubmit={handleCompleteExtra} className="system-box p-5 border-purple-500/30">
        <h3 className="text-purple-400 font-bold uppercase tracking-widest text-sm mb-4 border-b border-purple-900/50 pb-2 flex items-center gap-2">
          <Swords size={16}/> Entrenamiento Extra
        </h3>
        <div className="space-y-3 mb-4">
          <input type="text" required className="system-input border-purple-900/50 py-2 text-sm" value={extraTitle} onChange={e => setExtraTitle(e.target.value)} placeholder="Actividad (ej. Gimnasio)" />
          <input type="number" required className="system-input border-purple-900/50 py-2 text-sm" value={extraDuration} onChange={e => setExtraDuration(e.target.value)} placeholder="Duración (Minutos)" />
        </div>
        <button type="submit" disabled={loading} className="system-btn bg-gradient-to-r from-purple-900 to-purple-600 border-purple-400 text-xs py-2">
          Reclamar XP Extra
        </button>
      </form>
    </div>
  );
}

// ==========================================
// 6. GOALS & REWARDS
// ==========================================
function GoalsBoard({ user, rewards, totalLost, showAlert, playSound }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRewardName, setNewRewardName] = useState('');
  const [newTargetKg, setNewTargetKg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddReward = async (e) => {
    e.preventDefault();
    if (!newRewardName || !newTargetKg) return;
    playSound(CLICK_SFX);
    setLoading(true);

    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'rewards'), {
        name: newRewardName, targetKg: parseFloat(newTargetKg),
        claimed: false, createdAt: serverTimestamp()
      });
      setNewRewardName(''); setNewTargetKg(''); setShowAddForm(false);
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const handleClaim = async (reward) => {
    playSound(CLICK_SFX);
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'rewards', reward.id), {
        claimed: true, claimedAt: serverTimestamp()
      });
      showAlert("¡Recompensa Desbloqueada!", `Has reclamado: ${reward.name}. Disfruta tu botín.`, "reward");
    } catch (error) { console.error(error); }
  };

  const handleDelete = async (rewardId) => {
    if(confirm("¿Eliminar esta meta?")) {
      playSound(CLICK_SFX);
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'rewards', rewardId));
    }
  };

  return (
    <div className="space-y-6">
      <SystemMessage title="Inventario de Metas" type="warning">
        Establece recompensas por los kilos perdidos. Reclámalas al cumplir el objetivo.
      </SystemMessage>

      <div className="system-box p-4 border-yellow-500/30">
        {!showAddForm ? (
          <button onClick={() => { playSound(CLICK_SFX); setShowAddForm(true); }} className="w-full py-3 border border-yellow-500/50 text-yellow-400 font-bold uppercase tracking-widest text-xs rounded flex justify-center items-center gap-2 hover:bg-yellow-900/20 transition-colors">
            <Plus size={16} /> Agregar Nueva Meta
          </button>
        ) : (
          <form onSubmit={handleAddReward} className="space-y-3 animate-fade-in">
            <h3 className="text-yellow-400 font-bold uppercase tracking-widest text-xs mb-2">Crear Recompensa</h3>
            <input type="text" required className="system-input border-yellow-900/50 py-2 text-sm" value={newRewardName} onChange={e => setNewRewardName(e.target.value)} placeholder="Ej: Zapatillas Nuevas" />
            <input type="number" step="0.1" required className="system-input border-yellow-900/50 py-2 text-sm" value={newTargetKg} onChange={e => setNewTargetKg(e.target.value)} placeholder="Kilos a perder (Ej: 2.5)" />
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => { playSound(CLICK_SFX); setShowAddForm(false); }} className="flex-1 py-2 border border-slate-600 text-slate-400 text-xs uppercase font-bold rounded">Cancelar</button>
              <button type="submit" disabled={loading} className="flex-1 py-2 bg-yellow-600 text-white text-xs uppercase font-bold rounded">Guardar</button>
            </div>
          </form>
        )}
      </div>

      <div className="space-y-3">
        {rewards.length === 0 && <p className="text-center text-slate-500 text-sm italic p-4">Inventario vacío.</p>}
        {rewards.map(reward => {
          const isUnlocked = totalLost >= reward.targetKg;
          return (
            <div key={reward.id} className={`system-box p-4 relative overflow-hidden transition-all ${reward.claimed ? 'opacity-60 grayscale border-slate-700' : isUnlocked ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)] bg-yellow-900/10' : 'border-slate-800'}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="pr-4">
                  <h4 className={`font-bold ${reward.claimed ? 'text-slate-400 line-through' : isUnlocked ? 'text-yellow-400' : 'text-slate-300'}`}>{reward.name}</h4>
                  <p className="text-[10px] text-slate-500 uppercase font-mono mt-1">Meta: Perder {reward.targetKg}kg</p>
                </div>
                {!reward.claimed && <button onClick={() => handleDelete(reward.id)} className="text-slate-600 hover:text-red-400">✕</button>}
              </div>
              {!reward.claimed ? (
                isUnlocked ? (
                  <button onClick={() => handleClaim(reward)} className="w-full mt-3 py-2 bg-gradient-to-r from-yellow-600 to-yellow-400 text-slate-900 font-black uppercase text-xs rounded tracking-widest animate-pulse shadow-[0_0_10px_rgba(234,179,8,0.5)]">
                    Reclamar Botín
                  </button>
                ) : (
                  <div className="mt-3">
                    <div className="flex justify-between text-[9px] mb-1 font-mono text-slate-500">
                      <span>Progreso</span><span>{Math.max(0, totalLost).toFixed(1)} / {reward.targetKg} kg</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 overflow-hidden rounded-full">
                      <div className="h-full bg-slate-600 transition-all" style={{ width: `${Math.min(100, (Math.max(0, totalLost) / reward.targetKg) * 100)}%` }} />
                    </div>
                  </div>
                )
              ) : (
                <div className="mt-2 text-[10px] text-slate-500 uppercase font-bold tracking-widest flex items-center gap-1"><CheckCircle size={12} /> Reclamado</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// 7. SETTINGS
// ==========================================
function SettingsMenu({ user, profile, playSound }) {
  const logout = () => { playSound(CLICK_SFX); setTimeout(() => { auth.signOut(); window.location.reload(); }, 300); };
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    baseWeight: profile.baseWeight,
    targetWeight: profile.targetWeight,
    deficit: profile.deficit,
    calorieTarget: profile.calorieTarget
  });

  const handleUpdate = async (e) => {
    e.preventDefault();
    playSound(CLICK_SFX);
    setLoading(true);
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'system', 'profile'), {
        baseWeight: parseFloat(formData.baseWeight),
        targetWeight: parseFloat(formData.targetWeight),
        deficit: parseInt(formData.deficit),
        calorieTarget: parseInt(formData.calorieTarget)
      });
      alert("Parámetros del Sistema actualizados.");
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <SystemMessage title="Ajustes del Sistema" type="info">Recalibración de parámetros del Cazador.</SystemMessage>
      
      <form onSubmit={handleUpdate} className="system-box p-5 space-y-4">
        <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-2 border-b border-slate-800 pb-2">Editar Metas Físicas</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[9px] uppercase text-blue-400 mb-1">Peso Base (kg)</label>
            <input type="number" step="0.1" required className="system-input py-1 text-sm" value={formData.baseWeight} onChange={e => setFormData({...formData, baseWeight: e.target.value})} />
          </div>
          <div>
            <label className="block text-[9px] uppercase text-blue-400 mb-1">Peso Meta (kg)</label>
            <input type="number" step="0.1" required className="system-input py-1 text-sm" value={formData.targetWeight} onChange={e => setFormData({...formData, targetWeight: e.target.value})} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-[9px] uppercase text-orange-400 mb-1">Déficit Diario</label>
            <input type="number" required className="system-input py-1 text-sm border-orange-900/50" value={formData.deficit} onChange={e => setFormData({...formData, deficit: e.target.value})} />
          </div>
          <div>
            <label className="block text-[9px] uppercase text-orange-400 mb-1">Meta Calórica</label>
            <input type="number" required className="system-input py-1 text-sm border-orange-900/50" value={formData.calorieTarget} onChange={e => setFormData({...formData, calorieTarget: e.target.value})} />
          </div>
        </div>
        
        <p className="text-[9px] text-slate-500 leading-tight">Si modificas el déficit o la meta calórica manualmente, sobreescribirás el cálculo automático inicial de la TMB.</p>

        <button type="submit" disabled={loading} className="system-btn w-full py-2 text-xs mt-4">
          {loading ? 'Guardando...' : 'Aplicar Cambios'}
        </button>
      </form>

      <div className="system-box p-5 text-center mt-6">
        <p className="text-[10px] text-slate-500 font-mono break-all mb-4">ID de Jugador: <br/>{user?.uid}</p>
        <button onClick={logout} className="system-btn bg-gradient-to-r from-red-900 to-red-600 border-red-500 text-xs py-2">Abandonar Mazmorra (Cerrar Sesión)</button>
      </div>
    </div>
  );
}