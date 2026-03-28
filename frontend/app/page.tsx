'use client';

import Link from 'next/link';
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Mic, FileText, Target,
  Briefcase,
  CheckCircle2, Loader2,
  Sparkles, BookOpen, Lightbulb,
  Youtube, GraduationCap, Clock, ExternalLink, LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Platform config ────────────────────────────────────────────────────────
const PLATFORM_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  YouTube:  { color: 'text-red-600',    bg: 'bg-red-50 border-red-100',       icon: <Youtube className="w-3.5 h-3.5" /> },
  Udemy:    { color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100', icon: <GraduationCap className="w-3.5 h-3.5" /> },
  Coursera: { color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-100',     icon: <GraduationCap className="w-3.5 h-3.5" /> },
  NPTEL:    { color: 'text-green-700',  bg: 'bg-green-50 border-green-100',   icon: <GraduationCap className="w-3.5 h-3.5" /> },
};

export default function CareerCommandCenter() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const roadmapRef   = useRef<HTMLDivElement>(null);

  const [resumeFile, setResumeFile]                   = useState<File | null>(null);
  const [jdFile, setJdFile]                           = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing]                 = useState(false);
  const [analysisResult, setAnalysisResult]           = useState<any>(null);
  const [memories, setMemories]                       = useState<string[]>([]);
  const [roadmap, setRoadmap]                         = useState<any[]>([]);
  const [showRoadmap, setShowRoadmap]                 = useState(false);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [completedSteps, setCompletedSteps]           = useState<Record<number, boolean>>({});
  const [isReturningUser, setIsReturningUser]         = useState<boolean | null>(null);

  // ── NEW: read session user (has both name and id) ──────────────────────
  const [sessionUser, setSessionUser] = useState<{ name: string; id: string } | null>(null);

  // ── Auth gate ───────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = sessionStorage.getItem('ai_advisor_user');
    if (!saved) {
      router.replace('/login');
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      setSessionUser(parsed);
    } catch {
      router.replace('/login');
    }
  }, [router]);

  const candidateName = sessionUser?.name || null;
  // ── NEW: use user_id from session for all API calls ────────────────────
  const userId = sessionUser?.id || null;

  // ── Load this user's data from their own record ────────────────────────
  // CHANGED: pass user_id to /api/hindsight so we get only THIS user's data
  useEffect(() => {
    if (!userId) return;
    fetch(`http://localhost:8000/api/hindsight?user_id=${encodeURIComponent(userId)}`)
      .then(res => res.json())
      .then(data => setMemories(data.memories || []))
      .catch(err => console.error("Failed to load memories", err));
  }, [userId]);

  // ── Restore roadmap + analysis result from user record ─────────────────
  // CHANGED: use /api/user/{user_id} instead of /api/check-user?name=...
  useEffect(() => {
    if (!userId) return;
    fetch(`http://localhost:8000/api/user/${encodeURIComponent(userId)}`)
      .then(res => res.json())
      .then(data => {
        if (data.exists && data.user) {
          const user = data.user;
          setIsReturningUser(!user.is_new);

          if (user.roadmap && user.roadmap.length > 0) {
            setRoadmap(user.roadmap);
            setShowRoadmap(true);
          }

          if (user.gaps && user.gaps.length > 0) {
            setAnalysisResult((prev: any) => prev || {
              skills_missing: user.gaps,
              reasoning: "Restored from your previous session.",
            });
          }
        } else {
          setIsReturningUser(false);
        }
      })
      .catch(() => setIsReturningUser(false));
  }, [userId]);

  // ── CHANGED: pass user_id in FormData to /api/analyze-gap ─────────────
  const handleUpload = async () => {
    if (!resumeFile || !jdFile) return alert("Please upload both Resume and JD");
    if (!userId) return alert("Not logged in");
    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append('resume', resumeFile);
    formData.append('jd', jdFile);
    formData.append('user_id', userId);           // ← NEW
    try {
      const response = await fetch('http://localhost:8000/api/analyze-gap', { method: 'POST', body: formData });
      const data = await response.json();
      setAnalysisResult(data);
      // Refresh memories from this user's record
      const memRes  = await fetch(`http://localhost:8000/api/hindsight?user_id=${encodeURIComponent(userId)}`);
      const memData = await memRes.json();
      setMemories(memData.memories || []);
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── CHANGED: pass user_id as query param to /api/generate-roadmap ──────
  const fetchRoadmap = async () => {
    if (!userId) return;
    setIsGeneratingRoadmap(true);
    try {
      const res  = await fetch(`http://localhost:8000/api/generate-roadmap?user_id=${encodeURIComponent(userId)}`);
      const data = await res.json();
      setRoadmap(data.roadmap || []);
      setShowRoadmap(true);
    } catch (error) {
      console.error("Roadmap generation failed", error);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const toggleStep = (index: number) =>
    setCompletedSteps(prev => ({ ...prev, [index]: !prev[index] }));

  useEffect(() => {
    if (searchParams.get('showRoadmap') === 'true') {
      fetchRoadmap().then(() => {
        setTimeout(() => {
          roadmapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 400);
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isResourceObject = (r: any) => typeof r === 'object' && r !== null && 'platform' in r;

  // Derive hindsight feed items — now from this user's memories only
  const masteredFromMemory = memories
    .filter(m => m.includes('VERIFIED_MASTERY'))
    .map(m => m.replace('VERIFIED_MASTERY: ', '').trim());

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">

      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r border-gray-200 p-6 flex flex-col">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-indigo-600 tracking-tight">AI Advisor</h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Version 2.4 Live</p>
        </div>
        <nav className="flex-1 space-y-2">
          <SidebarItem href="/"                    icon={<LayoutDashboard />} label="Dashboard"            active />
          <SidebarItem href="/mock-interview"      icon={<Mic />}            label="Mock Interview Studio" />
          <SidebarItem href="/resume-evolution"    icon={<FileText />}       label="Resume Evolution"      />
          <SidebarItem href="/skill-gap-analysis"  icon={<Target />}         label="Skill Gap Analysis"    />
          <SidebarItem href="/job-recommendations" icon={<Briefcase />}      label="Job Recommendations"   />
        </nav>

        <button
          onClick={() => {
            sessionStorage.removeItem('ai_advisor_user');
            router.replace('/login');
          }}
          className="flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-black text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200 mt-4"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">

        {/* HEADER */}
        <header className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">
            {isReturningUser === null
              ? 'Career Command Center'
              : isReturningUser && candidateName
                ? `Welcome back, ${candidateName}. 👋`
                : candidateName
                  ? `Welcome, ${candidateName}!`
                  : 'Welcome!'}
          </h2>
          <p className="text-gray-500 mt-1 text-sm">
            {isReturningUser
              ? 'Your previous progress has been restored below.'
              : 'Upload your Resume and Job Description to generate a personalised skill roadmap.'}
          </p>
        </header>

        {/* UPLOAD HERO */}
        <section className="mb-10 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase mb-4 tracking-wider">
                <Sparkles className="w-3 h-3" /> Powered by Llama 3.3
              </div>
              <h3 className="text-3xl font-bold mb-4">Intelligent Skill-Gap Analysis</h3>
              <p className="text-indigo-100 mb-8 leading-relaxed max-w-md">
                Don't guess what recruiters want. Our AI parses the Job Description and your Resume to create a verified bridge to your next role.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <label className="text-[10px] font-black uppercase opacity-60 mb-2 block">Resume (PDF)</label>
                  <input type="file" accept=".pdf" onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-indigo-100 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-white file:text-indigo-600 font-bold cursor-pointer" />
                </div>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <label className="text-[10px] font-black uppercase opacity-60 mb-2 block">Job Description (PDF)</label>
                  <input type="file" accept=".pdf" onChange={(e) => setJdFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-indigo-100 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-white file:text-indigo-600 font-bold cursor-pointer" />
                </div>
              </div>
              <button
                onClick={handleUpload}
                disabled={isAnalyzing || !resumeFile || !jdFile}
                className="mt-8 bg-white text-indigo-600 px-8 py-3 rounded-xl font-black hover:scale-105 transition-all flex items-center gap-3 disabled:opacity-50 disabled:scale-100 shadow-lg"
              >
                {isAnalyzing ? <Loader2 className="animate-spin w-5 h-5" /> : <Target className="w-5 h-5" />}
                {isAnalyzing ? "Processing Documents..." : "Identify Technical Gaps"}
              </button>
            </div>

            <AnimatePresence>
              {analysisResult && (
                <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }}
                  className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl">
                  <h4 className="font-bold flex items-center gap-2 text-white mb-4 text-xl">
                    <CheckCircle2 className="text-emerald-400" /> Gap Analysis Results
                  </h4>
                  <p className="text-sm text-indigo-50 mb-6 leading-relaxed italic border-l-2 border-emerald-400 pl-4">
                    "{analysisResult.reasoning}"
                  </p>
                  <div className="flex flex-wrap gap-2 mb-8">
                    {analysisResult.skills_missing?.map((s: string, i: number) => (
                      <span key={i} className="bg-red-500/30 border border-red-400/50 text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest">
                        {s}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={fetchRoadmap}
                    disabled={isGeneratingRoadmap}
                    className="w-full bg-amber-400 text-amber-950 py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-amber-300 transition-all shadow-xl active:scale-95"
                  >
                    {isGeneratingRoadmap ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                    {isGeneratingRoadmap ? "Calculating Path..." : "Build Personalized Roadmap"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ROADMAP */}
        <AnimatePresence>
          {showRoadmap && (
            <motion.section ref={roadmapRef} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
              <div className="flex items-center justify-between mb-8 px-2">
                <div>
                  <h3 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                    <BookOpen className="text-indigo-600 w-7 h-7" /> AI-Adaptive Onboarding Path
                  </h3>
                  <p className="text-gray-500 text-sm mt-1 font-medium">
                    Follow these curated steps to reach job-readiness. Test each skill as you learn.
                  </p>
                </div>
              </div>

              <div className="relative border-l-2 border-indigo-100 ml-6 space-y-12">
                {roadmap.map((step, i) => (
                  <motion.div key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }} className="relative pl-12">

                    <div className={`absolute -left-[13px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black ring-8 ring-white transition-all duration-500 shadow-md ${completedSteps[i] ? 'bg-emerald-500 scale-110' : 'bg-indigo-600'}`}>
                      {completedSteps[i] ? '✓' : i + 1}
                    </div>

                    <div className={`bg-white border rounded-3xl p-8 transition-all duration-300 ${completedSteps[i] ? 'border-emerald-100 bg-emerald-50/10' : 'border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-100'}`}>

                      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] bg-indigo-50 px-2 py-1 rounded-md">{step.skill}</span>
                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] bg-amber-50 px-2 py-1 rounded-md">{step.level}</span>
                          </div>
                          <h4 className="text-2xl font-black text-gray-800">
                            {decodeURIComponent(step.topic.replace(/\+/g, ' '))}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-2xl text-xs font-bold text-gray-500">
                          <Clock className="w-4 h-4" /> Recommended Effort: {step.effort}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-8">

                        {/* SYLLABUS */}
                        <div className="space-y-4">
                          <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-indigo-500" /> What you must learn:
                          </h5>
                          <ul className="space-y-3">
                            {step.syllabus?.map((item: string, idx: number) => (
                              <li key={idx} className="text-sm text-gray-600 flex items-start gap-3 leading-relaxed font-medium">
                                <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full mt-1.5 shrink-0" /> {item}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* RESOURCES */}
                        <div className="space-y-4">
                          <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Youtube className="w-4 h-4 text-red-500" /> Recommended Study Sources:
                          </h5>

                          <div className="flex flex-col gap-3">
                            {step.resources?.map((res: any, idx: number) => {
                              if (isResourceObject(res)) {
                                const cfg = PLATFORM_CONFIG[res.platform] || PLATFORM_CONFIG['Coursera'];
                                return (
                                  <a key={idx} href={res.url} target="_blank" rel="noopener noreferrer"
                                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-[11px] font-bold shadow-sm hover:shadow-md transition-all group ${cfg.bg}`}>
                                    <span className={`flex items-center gap-1 shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${cfg.color} ${cfg.bg}`}>
                                      {cfg.icon} {res.platform}
                                    </span>
                                    <span className="text-gray-700 leading-snug flex-1 line-clamp-1">{res.title}</span>
                                    <ExternalLink className={`w-3.5 h-3.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity ${cfg.color}`} />
                                  </a>
                                );
                              }
                              return (
                                <div key={idx} className="bg-white border border-gray-100 px-4 py-3 rounded-2xl text-[11px] font-bold text-gray-700 shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-colors">
                                  <GraduationCap className="w-4 h-4 text-indigo-400" /> {res}
                                </div>
                              );
                            })}
                          </div>

                          <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 mt-4">
                            <p className="text-[10px] text-indigo-800 font-bold leading-relaxed">
                              💡 <span className="uppercase">AI Guidance:</span> {step.reasoning}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Complete + exam */}
                      <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
                        <label className="flex items-center gap-4 cursor-pointer group bg-white border px-6 py-4 rounded-2xl hover:border-indigo-200 transition-all shadow-sm active:scale-95">
                          <input
                            type="checkbox"
                            checked={completedSteps[i] || false}
                            onChange={() => toggleStep(i)}
                            className="w-6 h-6 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-all"
                          />
                          <div>
                            <span className="block text-sm font-black text-gray-800 group-hover:text-indigo-600 transition-colors leading-none">I've completed this module</span>
                            <span className="text-[10px] text-gray-400 font-medium mt-1 block">Ready to start the verification exam?</span>
                          </div>
                        </label>

                        <AnimatePresence>
                          {completedSteps[i] && (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                              <Link
                                href={`/mock-interview?topic=${encodeURIComponent(decodeURIComponent(step.topic.replace(/\+/g, ' ')))}&syllabus=${encodeURIComponent((step.syllabus || []).join(','))}`}
                                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all flex items-center gap-3 shadow-2xl shadow-indigo-200 active:scale-95"
                              >
                                <Mic className="w-5 h-5" /> START SKILL VERIFICATION TEST
                              </Link>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* HINDSIGHT FEED — now shows only this user's memories */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-xl font-black mb-6 border-b border-gray-50 pb-4 text-gray-800">Hindsight Feed</h3>
          {memories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {memories.map((mem, i) => (
                <FeedItem key={i} title="AI Insight" desc={mem}
                  type={mem.toLowerCase().includes('weak') || mem.toLowerCase().includes('improve') || mem.toLowerCase().includes('gap') ? 'gap' : 'growth'}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10 font-medium">No activity logged. Upload documents to begin.</p>
          )}
        </div>

      </main>
    </div>
  );
}

/* ── HELPERS ─────────────────────────────────────────────────────────────── */

function SidebarItem({ icon, label, href = "#", active = false }: any) {
  return (
    <Link href={href} className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-sm transition-all duration-200 ${active ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}>
      <span className={`transition-colors ${active ? 'text-indigo-600' : 'text-gray-400'}`}>{icon}</span>
      {label}
    </Link>
  );
}

function FeedItem({ title, desc, type }: any) {
  const colors: any = {
    gap:    'bg-red-100 text-red-600 border-red-200',
    growth: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  };
  return (
    <div className="flex items-start gap-4 group">
      <div className={`w-3 h-3 rounded-full mt-2 shrink-0 shadow-sm ${colors[type].split(' ')[0]}`} />
      <div className="flex-1 p-4 rounded-2xl border border-gray-50 bg-slate-50/50 group-hover:bg-white group-hover:border-gray-100 group-hover:shadow-sm transition-all duration-200">
        <div className="font-black text-xs text-gray-800 mb-1">{title}</div>
        <div className="text-gray-500 text-[11px] font-medium leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}