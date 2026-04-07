'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Mic, FileText, Target, Briefcase,
  LogOut, MicOff, Send, RefreshCw, AlertCircle,
  CheckCircle2, XCircle, Loader2, Sparkles, Volume2,
  ChevronRight, Star, Zap, MessageSquare, Award,
  User, Code2, Folder, Briefcase as BriefcaseIcon,
  Trophy, BarChart3, Copy, Check
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface SubScores { clarity: number; relevance: number; impact: number; professionalism: number }
interface Mistake { text: string; issue: string; severity: 'high' | 'medium' | 'low'; fix: string }
interface WhatIncluded {
  name_and_academic: boolean; core_technical_skills: boolean; impactful_projects: boolean;
  experience_highlights: boolean; key_strengths_with_proof: boolean; career_goal: boolean;
}
interface AnalysisResult {
  effectiveness_score: number;
  sub_scores: SubScores;
  estimated_duration_seconds: number;
  mistakes: Mistake[];
  key_issue: string;
  what_included: WhatIncluded;
  improved_intro: string;
  improvement_highlights: string[];
  improved_skills_shown: string[];
  personalized_tips: string[];
  readiness_verdict: string;
  readiness_color: string;
}

// ── Sidebar (same as rest of app) ───────────────────────────────────────────
function SidebarItem({ icon, label, href = '#', active = false }: any) {
  return (
    <Link href={href} className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-sm transition-all duration-200 ${active ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}>
      <span className={`transition-colors ${active ? 'text-indigo-600' : 'text-gray-400'}`}>{icon}</span>
      {label}
    </Link>
  );
}

// ── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 120, stroke = 10 }: { score: number; size?: number; stroke?: number }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
    </svg>
  );
}

// ── Sub-score bar ────────────────────────────────────────────────────────────
function SubScoreBar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  const color = value >= 8 ? 'bg-emerald-500' : value >= 6 ? 'bg-amber-400' : value >= 4 ? 'bg-orange-400' : 'bg-red-400';
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs font-black text-gray-500 flex items-center gap-1.5">{icon}{label}</span>
        <span className="text-sm font-black text-gray-800">{value}<span className="text-gray-400 font-medium">/10</span></span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${value * 10}%` }} transition={{ duration: 0.8, delay: 0.2 }}
          className={`h-full rounded-full ${color}`} />
      </div>
    </div>
  );
}

// ── Checklist Item ───────────────────────────────────────────────────────────
function CheckItem({ label, done, icon }: { label: string; done: boolean; icon: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-bold transition-all ${done ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
      <span className={done ? 'text-emerald-500' : 'text-red-400'}>{done ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}</span>
      <span className="text-gray-500 mr-1">{icon}</span>
      {label}
    </div>
  );
}

// ── Severity badge ───────────────────────────────────────────────────────────
const SEV: any = {
  high:   'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low:    'bg-blue-100 text-blue-700 border-blue-200',
};

// ── Verdict config ────────────────────────────────────────────────────────────
const VERDICT: any = {
  'Not Ready':      { bg: 'bg-red-50',     border: 'border-red-200',    text: 'text-red-700',    icon: '🚫' },
  'Needs Work':     { bg: 'bg-orange-50',  border: 'border-orange-200', text: 'text-orange-700', icon: '⚠️' },
  'Almost There':   { bg: 'bg-amber-50',   border: 'border-amber-200',  text: 'text-amber-700',  icon: '🎯' },
  'Interview Ready':{ bg: 'bg-emerald-50', border: 'border-emerald-200',text: 'text-emerald-700',icon: '🏆' },
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function SelfIntroCoach() {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<{ name: string; id: string } | null>(null);

  // Input state
  const [introText, setIntroText]   = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [inputMode, setInputMode]   = useState<'type' | 'speak'>('type');

  // Recording state
  const [isRecording, setIsRecording]   = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript]     = useState('');
  const recognitionRef = useRef<any>(null);
  const timerRef       = useRef<any>(null);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing]   = useState(false);
  const [result, setResult]             = useState<AnalysisResult | null>(null);
  const [copied, setCopied]             = useState(false);
  const [activeTab, setActiveTab]       = useState<'analysis' | 'improved'>('analysis');
  const [isRegenerating, setIsRegenerating] = useState(false);

  // ── Auth gate ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = sessionStorage.getItem('ai_advisor_user');
    if (!saved) { router.replace('/login'); return; }
    try { setSessionUser(JSON.parse(saved)); } catch { router.replace('/login'); }
  }, [router]);

  // ── Recording timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ── Speech recognition ─────────────────────────────────────────────────────
  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('Speech recognition not supported. Please use Chrome.'); return; }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    let finalTranscript = '';
    recognition.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      setTranscript(finalTranscript + interim);
      setIntroText(finalTranscript + interim);
    };
    recognition.onerror = () => stopRecording();
    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
    setRecordingTime(0);
    setTranscript('');
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  // ── Analyze ────────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!introText.trim() || introText.trim().length < 30) {
      alert('Please provide a more complete self-introduction (at least a few sentences).');
      return;
    }
    setIsAnalyzing(true);
    setResult(null);
    try {
      const res = await fetch('http://localhost:8000/api/analyze-intro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intro_text: introText,
          user_id: sessionUser?.id || null,
          target_role: targetRole || 'Software Engineering',
        }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      setResult(data);
      setActiveTab('analysis');
      setTimeout(() => document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' }), 200);
    } catch (e) {
      alert('Analysis failed. Check your backend connection.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Regenerate improved version ────────────────────────────────────────────
  const handleRegenerate = async () => {
    if (!result) return;
    setIsRegenerating(true);
    try {
      const res = await fetch('http://localhost:8000/api/regenerate-intro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intro_text: introText,
          user_id: sessionUser?.id || null,
          target_role: targetRole || 'Software Engineering',
        }),
      });
      const data = await res.json();
      if (data.improved_intro) {
        setResult(prev => prev ? { ...prev, improved_intro: data.improved_intro } : prev);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRegenerating(false);
    }
  };

  const copyImproved = () => {
    if (result?.improved_intro) {
      navigator.clipboard.writeText(result.improved_intro);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const verdict = result ? (VERDICT[result.readiness_verdict] || VERDICT['Needs Work']) : null;

  const CHECKLIST_LABELS: { key: keyof WhatIncluded; label: string; icon: React.ReactNode }[] = [
    { key: 'name_and_academic',       label: 'Name & Academic Details',   icon: <User className="w-3 h-3" /> },
    { key: 'core_technical_skills',   label: 'Core Technical Skills',      icon: <Code2 className="w-3 h-3" /> },
    { key: 'impactful_projects',      label: 'Impactful Projects',         icon: <Folder className="w-3 h-3" /> },
    { key: 'experience_highlights',   label: 'Experience Highlights',      icon: <BriefcaseIcon className="w-3 h-3" /> },
    { key: 'key_strengths_with_proof',label: 'Key Strengths (with proof)', icon: <Star className="w-3 h-3" /> },
    { key: 'career_goal',             label: 'Clear Career Goal',          icon: <Target className="w-3 h-3" /> },
  ];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">

      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r border-gray-200 p-6 flex flex-col shrink-0">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-indigo-600 tracking-tight">AI Advisor</h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Version 2.4 Live</p>
        </div>
        <nav className="flex-1 space-y-2">
          <SidebarItem href="/"                    icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" />
          <SidebarItem href="/mock-interview"      icon={<Mic className="w-4 h-4" />}            label="Mock Interview Studio" />
          <SidebarItem href="/resume-evolution"    icon={<FileText className="w-4 h-4" />}       label="Resume Evolution" />
          <SidebarItem href="/skill-gap-analysis"  icon={<Target className="w-4 h-4" />}         label="Skill Gap Analysis" />
          <SidebarItem href="/job-recommendations" icon={<Briefcase className="w-4 h-4" />}      label="Job Recommendations" />
          <SidebarItem href="/self-intro"          icon={<MessageSquare className="w-4 h-4" />}  label="Intro Coach" active />
        </nav>
        <button onClick={() => { sessionStorage.removeItem('ai_advisor_user'); router.replace('/login'); }}
          className="flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-black text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200 mt-4">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto">

        {/* HERO HEADER */}
        <div className="bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 px-10 py-10 text-white relative overflow-hidden">
          {/* decorative blobs */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-violet-400/20 rounded-full translate-y-1/2 blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/15 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
              <Zap className="w-3 h-3 text-amber-300" /> AI-Powered · Real-Time Feedback
            </div>
            <h2 className="text-4xl font-black mb-2 tracking-tight">Self-Introduction Coach</h2>
            <p className="text-purple-200 text-sm max-w-xl leading-relaxed">
              Type or speak your intro. Our AI scores it on 4 dimensions, catches every mistake,
              and rewrites it into a placement-ready version — in seconds.
            </p>
          </div>
        </div>

        <div className="px-10 py-8 space-y-8 max-w-6xl">

          {/* INPUT CARD */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Tab switcher */}
            <div className="flex border-b border-gray-100">
              {(['type', 'speak'] as const).map(mode => (
                <button key={mode} onClick={() => setInputMode(mode)}
                  className={`flex-1 py-4 text-sm font-black flex items-center justify-center gap-2 transition-all ${inputMode === mode ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
                  {mode === 'type' ? <><MessageSquare className="w-4 h-4" /> Type Your Intro</> : <><Mic className="w-4 h-4" /> Speak Your Intro</>}
                </button>
              ))}
            </div>

            <div className="p-8 space-y-6">
              {/* Target role */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Target Role / Company (optional)
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value)}
                  placeholder="e.g. Frontend Developer at Flipkart, DevOps Intern, ML Engineer…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all"
                />
              </div>

              {/* TYPE mode */}
              {inputMode === 'type' && (
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    Your Self-Introduction
                  </label>
                  <textarea
                    value={introText}
                    onChange={e => setIntroText(e.target.value)}
                    placeholder={`Start typing your self-introduction here...\n\nTip: A good intro is 45–60 seconds when spoken (~120–150 words). Include your name, college, skills, a project, and your career goal.`}
                    rows={8}
                    className="w-full border border-gray-200 rounded-2xl px-5 py-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent resize-none transition-all font-medium text-gray-700 placeholder:text-gray-300"
                  />
                  <div className="flex justify-between mt-2">
                    <span className="text-[10px] text-gray-400 font-medium">
                      {introText.split(/\s+/).filter(Boolean).length} words · ~{Math.round(introText.split(/\s+/).filter(Boolean).length / 2.5)}s spoken
                    </span>
                    <span className={`text-[10px] font-bold ${introText.length > 50 ? 'text-emerald-500' : 'text-gray-300'}`}>
                      {introText.length > 50 ? '✓ Ready to analyze' : 'Type more to enable analysis'}
                    </span>
                  </div>
                </div>
              )}

              {/* SPEAK mode */}
              {inputMode === 'speak' && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center py-6">
                    <motion.button
                      onClick={isRecording ? stopRecording : startRecording}
                      whileTap={{ scale: 0.95 }}
                      className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${isRecording ? 'bg-red-500 shadow-red-200 animate-pulse' : 'bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700'}`}>
                      {isRecording ? <MicOff className="w-10 h-10 text-white" /> : <Mic className="w-10 h-10 text-white" />}
                    </motion.button>
                    <p className="mt-4 text-sm font-black text-gray-500">
                      {isRecording ? (
                        <span className="text-red-500">● Recording — {fmtTime(recordingTime)}</span>
                      ) : transcript ? '✓ Recording complete' : 'Tap to start speaking'}
                    </p>
                    {isRecording && (
                      <p className="text-xs text-gray-400 mt-1">Speak clearly · Tap again to stop</p>
                    )}

                    {/* Live waveform bars */}
                    {isRecording && (
                      <div className="flex items-end gap-1 mt-4 h-8">
                        {Array.from({ length: 20 }).map((_, i) => (
                          <motion.div key={i} className="w-1.5 bg-indigo-400 rounded-full"
                            animate={{ height: [4, Math.random() * 28 + 4, 4] }}
                            transition={{ duration: 0.4 + Math.random() * 0.3, repeat: Infinity, delay: i * 0.05 }} />
                        ))}
                      </div>
                    )}
                  </div>

                  {introText && (
                    <div className="border border-gray-100 rounded-2xl p-5 bg-gray-50">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Live Transcript</p>
                      <p className="text-sm text-gray-700 leading-relaxed font-medium">{introText}</p>
                      <div className="flex justify-between mt-3">
                        <span className="text-[10px] text-gray-400">{introText.split(/\s+/).filter(Boolean).length} words</span>
                        <button onClick={() => { setIntroText(''); setTranscript(''); }}
                          className="text-[10px] text-red-400 font-bold hover:text-red-600 transition-colors">Clear</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Analyze button */}
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || introText.trim().length < 30}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-100 active:scale-[0.98]">
                {isAnalyzing
                  ? <><Loader2 className="animate-spin w-5 h-5" /> Analyzing Your Introduction…</>
                  : <><Sparkles className="w-5 h-5" /> Analyze My Introduction</>}
              </button>
            </div>
          </div>

          {/* ── RESULTS ──────────────────────────────────────────────────────── */}
          <AnimatePresence>
            {result && (
              <motion.div id="results-section" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

                {/* VERDICT BANNER */}
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                  className={`flex items-center justify-between p-6 rounded-3xl border-2 ${verdict?.bg} ${verdict?.border}`}>
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{verdict?.icon}</span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Readiness Verdict</p>
                      <p className={`text-2xl font-black ${verdict?.text}`}>{result.readiness_verdict}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Duration</p>
                    <p className="text-lg font-black text-gray-700">~{result.estimated_duration_seconds}s</p>
                    <p className="text-[10px] text-gray-400">{result.estimated_duration_seconds < 30 ? 'Too short' : result.estimated_duration_seconds > 75 ? 'Too long' : '✓ Good length'}</p>
                  </div>
                </motion.div>

                {/* SCORES ROW */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Effectiveness Ring */}
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col items-center justify-center">
                    <div className="relative">
                      <ScoreRing score={result.effectiveness_score} size={140} stroke={12} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-black text-gray-800">{result.effectiveness_score}</span>
                        <span className="text-[10px] text-gray-400 font-bold">/100</span>
                      </div>
                    </div>
                    <p className="mt-4 text-xs font-black text-gray-500 uppercase tracking-widest">Effectiveness Score</p>
                  </div>

                  {/* Sub scores */}
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 col-span-2 space-y-5">
                    <h3 className="text-sm font-black text-gray-800 mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-indigo-500" /> Dimension Breakdown</h3>
                    <SubScoreBar label="Clarity"         value={result.sub_scores?.clarity ?? 0}         icon={<MessageSquare className="w-3 h-3" />} />
                    <SubScoreBar label="Relevance"       value={result.sub_scores?.relevance ?? 0}       icon={<Target className="w-3 h-3" />} />
                    <SubScoreBar label="Impact"          value={result.sub_scores?.impact ?? 0}          icon={<Zap className="w-3 h-3" />} />
                    <SubScoreBar label="Professionalism" value={result.sub_scores?.professionalism ?? 0} icon={<Award className="w-3 h-3" />} />
                  </div>
                </div>

                {/* TAB SWITCHER: Analysis vs Improved */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex border-b border-gray-100">
                    {(['analysis', 'improved'] as const).map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-4 text-sm font-black flex items-center justify-center gap-2 transition-all ${activeTab === tab ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
                        {tab === 'analysis'
                          ? <><AlertCircle className="w-4 h-4" /> Mistake Analysis</>
                          : <><Sparkles className="w-4 h-4 text-amber-400" /> AI-Improved Version</>}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {activeTab === 'analysis' && (
                      <motion.div key="analysis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 space-y-8">

                        {/* Key Issue */}
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-black text-amber-700 mb-1">KEY ISSUE</p>
                            <p className="text-sm text-amber-800 leading-relaxed">{result.key_issue}</p>
                          </div>
                        </div>

                        {/* Mistakes */}
                        <div>
                          <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-red-500" /> Detected Issues ({result.mistakes.length})
                          </h3>
                          <div className="space-y-3">
                            {result.mistakes.map((m, i) => (
                              <motion.div key={i} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.08 }}
                                className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-red-100 transition-all group">
                                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {m.text && <span className="text-xs font-bold text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded-lg italic">"{m.text}"</span>}
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${SEV[m.severity]}`}>{m.issue}</span>
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${m.severity === 'high' ? 'bg-red-50 text-red-500' : m.severity === 'medium' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'}`}>{m.severity}</span>
                                  </div>
                                  <p className="text-xs text-emerald-600 font-bold flex items-center gap-1.5">
                                    <ChevronRight className="w-3 h-3" /> Fix: {m.fix}
                                  </p>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>

                        {/* Checklist */}
                        <div>
                          <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-indigo-500" /> Intro Completeness Check
                          </h3>
                          <div className="grid grid-cols-2 gap-2">
                            {CHECKLIST_LABELS.map(({ key, label, icon }) => (
                              <CheckItem key={key} label={label} done={result.what_included[key]} icon={icon} />
                            ))}
                          </div>
                        </div>

                        {/* Personalized Tips */}
                        {result.personalized_tips?.length > 0 && (
                          <div>
                            <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-violet-500" /> Personalized Tips
                            </h3>
                            <div className="space-y-3">
                              {result.personalized_tips.map((tip, i) => (
                                <div key={i} className="flex gap-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                  <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center text-[10px] font-black text-indigo-600 shrink-0">{i + 1}</div>
                                  <p className="text-sm text-indigo-800 font-medium leading-relaxed">{tip}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {activeTab === 'improved' && (
                      <motion.div key="improved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 space-y-6">

                        {/* Improved intro box */}
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-3xl p-6 relative">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <Trophy className="w-5 h-5 text-emerald-600" />
                              <span className="text-sm font-black text-emerald-800">AI-Improved Introduction</span>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={handleRegenerate} disabled={isRegenerating}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-xs font-black text-emerald-600 hover:bg-emerald-50 transition-all disabled:opacity-50">
                                {isRegenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                Regenerate
                              </button>
                              <button onClick={copyImproved}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-xs font-black text-emerald-600 hover:bg-emerald-50 transition-all">
                                {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 leading-8 font-medium border-l-4 border-emerald-400 pl-5 italic">
                            "{result.improved_intro}"
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {result.improved_skills_shown?.map((s, i) => (
                              <span key={i} className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg">✓ {s}</span>
                            ))}
                          </div>
                        </div>

                        {/* What was improved */}
                        <div>
                          <h3 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-500" /> What We Improved
                          </h3>
                          <div className="space-y-2">
                            {result.improvement_highlights?.map((h, i) => (
                              <div key={i} className="flex items-start gap-3 text-sm text-gray-600 font-medium">
                                <span className="text-emerald-500 font-black mt-0.5">↑</span> {h}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Practice CTA */}
                        <div className="bg-indigo-600 rounded-2xl p-6 text-white flex items-center justify-between">
                          <div>
                            <p className="font-black text-lg">Ready to Practice?</p>
                            <p className="text-indigo-200 text-sm">Use the Mock Interview Studio to rehearse this intro under pressure.</p>
                          </div>
                          <Link href="/mock-interview"
                            className="bg-white text-indigo-600 font-black text-sm px-6 py-3 rounded-xl hover:bg-indigo-50 transition-all shrink-0 flex items-center gap-2">
                            <Mic className="w-4 h-4" /> Practice Now
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Try another */}
                <button onClick={() => { setResult(null); setIntroText(''); setTranscript(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-black hover:border-indigo-300 hover:text-indigo-500 transition-all">
                  ↑ Try Another Introduction
                </button>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}