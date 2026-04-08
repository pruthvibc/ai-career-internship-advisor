'use client';

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, Target, AlertTriangle, BookOpen,
  Database, Layout, Server, Loader2, BrainCircuit,
  CheckCircle2, Mic, TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCategory(skill: string) {
  const s = skill.toLowerCase();
  if (s.includes('database') || s.includes('mongo') || s.includes('sql') || s.includes('backend') || s.includes('api') || s.includes('node'))
    return { label: 'Backend', icon: <Database className="w-5 h-5" /> };
  if (s.includes('react') || s.includes('ui') || s.includes('css') || s.includes('html') || s.includes('dom') || s.includes('frontend') || s.includes('front-end'))
    return { label: 'Frontend', icon: <Layout className="w-5 h-5" /> };
  return { label: 'Technical', icon: <Server className="w-5 h-5" /> };
}

function getCriticality(index: number, total: number) {
  if (index === 0)                    return 'High';
  if (index < Math.ceil(total / 2))  return 'Medium';
  return 'Low';
}

const CRITICALITY_STYLE: Record<string, string> = {
  High:   'bg-red-50 text-red-700 border-red-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Low:    'bg-slate-50 text-slate-600 border-slate-200',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function SkillGapAnalysis() {
  const [openGaps,       setOpenGaps]       = useState<any[]>([]);
  const [masteredSkills, setMasteredSkills] = useState<string[]>([]);
  const [loading,        setLoading]        = useState(true);

  // ── NEW: read user_id from sessionStorage ─────────────────────────────
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('ai_advisor_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUserId(parsed.id || null);
      } catch {
        setUserId(null);
      }
    }
  }, []);

  // CHANGED: pass user_id to /api/hindsight so we only get THIS user's data
  useEffect(() => {
    if (userId === null) return;   // wait until userId is resolved

    const fetchData = async () => {
      try {
        const res  = await fetch(`${API_BASE}/api/hindsight?user_id=${encodeURIComponent(userId)}`);
        const data = await res.json();
        const memories: string[] = data.memories || [];

        const gapEntries      = memories.filter(m => m.includes('Gap Identified:'));
        const masteredEntries = memories.filter(m => m.includes('VERIFIED_MASTERY:'));

        const masteredNames = masteredEntries.map(m =>
          m.replace('VERIFIED_MASTERY:', '').trim().toLowerCase()
        );

        // Only show gaps that have NOT been verified yet
        const pending = gapEntries.filter(entry => {
          const skillName = entry.replace('Gap Identified:', '').trim().toLowerCase();
          return !masteredNames.some(mastered => mastered.includes(skillName) || skillName.includes(mastered));
        });

        const formatted = pending.map((entry, i) => {
          const skillName = entry.replace('Gap Identified:', '').trim();
          const cat = getCategory(skillName);
          return {
            id:          i,
            skill:       skillName,
            category:    cat.label,
            icon:        cat.icon,
            criticality: getCriticality(i, pending.length),
          };
        });

        setOpenGaps(formatted);
        setMasteredSkills(masteredNames);
      } catch (err) {
        console.error("Failed to fetch gaps:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);   // re-run when userId resolves

  const totalSkills  = openGaps.length + masteredSkills.length;
  const overallMatch = totalSkills === 0
    ? 0
    : Math.round((masteredSkills.length / totalSkills) * 100);

  const firstOpenGap = openGaps[0]?.skill || '';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Skill Gap Analysis</h1>
            <p className="text-sm text-slate-500">
              {openGaps.length} gap{openGaps.length !== 1 ? 's' : ''} remaining · {masteredSkills.length} verified
            </p>
          </div>
        </div>

        <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold flex items-center gap-2 border border-indigo-100">
          <TrendingUp className="w-4 h-4" />
          Profile Match: {overallMatch}%
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-8 flex flex-col lg:flex-row gap-8">

        {/* LEFT: Open gaps */}
        <div className="flex-1 space-y-6">

          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Pending Skill Gaps
            </h2>

            {loading ? (
              <div className="flex items-center gap-3 text-slate-400 p-10 justify-center">
                <Loader2 className="animate-spin w-6 h-6" /> Analysing your profile...
              </div>
            ) : openGaps.length > 0 ? (
              <div className="space-y-4">
                {openGaps.map((gap, i) => (
                  <motion.div
                    key={gap.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                          {gap.icon}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800">{gap.skill}</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5 uppercase font-bold tracking-wider">
                            {gap.category}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${CRITICALITY_STYLE[gap.criticality]}`}>
                          {gap.criticality} Priority
                        </span>

                        <Link
                          href={`/mock-interview?topic=${encodeURIComponent(gap.skill)}`}
                          className="text-[10px] font-black bg-indigo-600 text-white px-3 py-1.5 rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <Mic className="w-3 h-3" /> Test Now
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                {totalSkills === 0
                  ? <p className="text-slate-400">No gaps found yet. Upload your Resume &amp; JD on the Dashboard first.</p>
                  : <p className="text-emerald-600 font-bold">🎉 All identified gaps have been verified! Great work.</p>
                }
              </div>
            )}
          </div>

          {/* Verified skills */}
          {masteredSkills.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Verified Skills
              </h2>
              <div className="space-y-3">
                {masteredSkills.map((skill, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span className="font-bold text-emerald-800 text-sm capitalize">{skill}</span>
                    <span className="ml-auto text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-widest">
                      Certified
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Action plan */}
        <div className="w-full lg:w-96 space-y-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-indigo-500" />
            Adaptive Action Plan
          </h2>

          <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200">
            <h3 className="font-bold text-lg mb-2">Onboarding Pathway</h3>
            <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
              {openGaps.length > 0
                ? `${openGaps.length} skill gap${openGaps.length !== 1 ? 's' : ''} remaining. Follow the roadmap to close them.`
                : 'All gaps verified! Your profile is job-ready.'}
            </p>

            <div className="space-y-3">
              <Link
                href="/?showRoadmap=true"
                className="w-full bg-white text-indigo-600 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                View Training Roadmap
              </Link>

              {firstOpenGap ? (
                <Link
                  href={`/mock-interview?topic=${encodeURIComponent(firstOpenGap)}`}
                  className="w-full bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-800 transition-colors border border-indigo-500"
                >
                  <Target className="w-4 h-4" />
                  Challenge Top Gap: {firstOpenGap.length > 20 ? firstOpenGap.slice(0, 20) + '…' : firstOpenGap}
                </Link>
              ) : (
                <div className="w-full bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-indigo-500 opacity-60 cursor-not-allowed">
                  <Target className="w-4 h-4" />
                  No Pending Gaps
                </div>
              )}
            </div>
          </div>

          {/* Progress summary card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Progress Summary</h4>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>Profile Match</span>
                <span>{overallMatch}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${overallMatch}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className={`h-full rounded-full ${overallMatch === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-red-600">{openGaps.length}</p>
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mt-0.5">Pending</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-emerald-600">{masteredSkills.length}</p>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-0.5">Verified</p>
              </div>
            </div>

            {openGaps.length > 0 && (
              <p className="text-[11px] text-slate-500 leading-relaxed italic border-t border-slate-100 pt-3">
                "{openGaps[0].skill} is your highest priority gap. Complete the roadmap module and pass the verification exam to close it."
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}