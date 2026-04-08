'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, Mic, FileText, Target,
  Upload, Loader2, Sparkles, CheckCircle2,
  Download, Award, ChevronDown, ChevronUp, User,
  Briefcase, GraduationCap, Code, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExperienceEntry {
  title: string;
  company: string;
  duration: string;
  bullets: string[];
}
interface EducationEntry {
  degree: string;
  institution: string;
  year: string;
}
interface CertEntry {
  name: string;
  issuer: string;
  year: string;
}
interface ProjectEntry {
  name: string;
  description: string;
  tech: string[];
}
interface ResumeData {
  candidate_name: string;
  summary: string;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  certifications: CertEntry[];
  projects: ProjectEntry[];
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ResumeEvolution() {
  const [resumeFile, setResumeFile]         = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing]       = useState(false);
  const [resumeData, setResumeData]         = useState<ResumeData | null>(null);
  const [verifiedSkills, setVerifiedSkills] = useState<string[]>([]);
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [expandedExp, setExpandedExp]       = useState<number | null>(0);
  const [memories, setMemories]             = useState<string[]>([]);

  // ── NEW: read user_id from sessionStorage ──────────────────────────────
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

  // CHANGED: pass user_id to /api/hindsight to get only THIS user's verified skills
  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/api/hindsight?user_id=${encodeURIComponent(userId)}`)
      .then(r => r.json())
      .then(d => setMemories(d.memories || []))
      .catch(() => {});
  }, [userId]);

  const masteredFromMemory = memories
    .filter(m => m.includes('VERIFIED_MASTERY'))
    .map(m => m.replace('VERIFIED_MASTERY: ', '').trim());

  // CHANGED: pass user_id as FormData field to /api/evolve-resume
  const handleAnalyze = async () => {
    if (!resumeFile) return;
    if (!userId) {
      setError('Not logged in. Please sign in again.');
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    setResumeData(null);

    const formData = new FormData();
    formData.append('resume', resumeFile);
    formData.append('user_id', userId);       // ← NEW

    try {
      const res = await fetch('${API_BASE}/api/evolve-resume', {
        method: 'POST',
        body:   formData,
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setResumeData(data.resume_data);
        setVerifiedSkills(data.verified_skills || []);
      }
    } catch (e) {
      setError('Failed to connect to the backend. Make sure the server is running.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadDocx = async () => {
    if (!resumeData) return;
    setIsGeneratingDocx(true);

    try {
      const res = await fetch('${API_BASE}/api/generate-resume-docx', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ resume_data: resumeData }),
      });

      if (!res.ok) throw new Error('PDF generation failed');

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${resumeData.candidate_name.replace(/\s+/g, '_')}_Evolved_Resume.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('Failed to generate document. Please try again.');
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r border-gray-200 p-6 flex flex-col">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-indigo-600 tracking-tight">AI Advisor</h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Version 2.4 Live</p>
        </div>
        <nav className="flex-1 space-y-2">
          <SidebarItem href="/"                    icon={<LayoutDashboard />} label="Dashboard"            />
          <SidebarItem href="/mock-interview"      icon={<Mic />}            label="Mock Interview Studio" />
          <SidebarItem href="/resume-evolution"    icon={<FileText />}       label="Resume Evolution"      active />
          <SidebarItem href="/skill-gap-analysis"  icon={<Target />}         label="Skill Gap Analysis"    />
          <SidebarItem href="/job-recommendations" icon={<Briefcase />}      label="Job Recommendations"   />
        </nav>

        {/* Shows only THIS user's verified skills from their record */}
        {masteredFromMemory.length > 0 && (
          <div className="mt-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-3 flex items-center gap-1">
              <Award className="w-3 h-3" /> Verified Skills
            </p>
            <div className="space-y-1.5">
              {masteredFromMemory.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> {s}
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto p-8">
        <header className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Resume Evolution</h2>
          <p className="text-gray-500 mt-1 text-sm">
            Upload your current resume. The AI will automatically inject your verified skills and certifications.
          </p>
        </header>

        {/* UPLOAD CARD */}
        <section className="mb-8 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase mb-4 tracking-wider">
                <Sparkles className="w-3 h-3" /> AI-Powered Resume Injection
              </div>
              <h3 className="text-2xl font-bold mb-2">Upgrade Your Resume Automatically</h3>
              <p className="text-indigo-100 text-sm leading-relaxed max-w-md">
                Every skill you've been certified in gets professionally written into your resume —
                added to your Skills section, backed by bullet points under relevant experience,
                and listed as a verified certification.
              </p>

              {masteredFromMemory.length === 0 && (
                <div className="mt-4 bg-amber-400/20 border border-amber-400/30 px-4 py-3 rounded-2xl text-sm text-amber-100 font-medium">
                  ⚠️ No certifications found yet. Complete a mock interview exam first to unlock this feature.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 w-full lg:w-72">
              <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                <label className="text-[10px] font-black uppercase opacity-60 mb-2 block">
                  Your Current Resume (PDF)
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={e => setResumeFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-indigo-100 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-white file:text-indigo-600 font-bold cursor-pointer"
                />
                {resumeFile && (
                  <p className="text-[10px] text-emerald-300 mt-1 font-semibold">✓ {resumeFile.name}</p>
                )}
              </div>

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !resumeFile || masteredFromMemory.length === 0}
                className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-black hover:scale-105 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100 shadow-lg"
              >
                {isAnalyzing
                  ? <><Loader2 className="animate-spin w-4 h-4" /> Evolving Resume...</>
                  : <><Sparkles className="w-4 h-4" /> Evolve My Resume</>
                }
              </button>
            </div>
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* RESULTS */}
        <AnimatePresence>
          {resumeData && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Header bar with download button */}
              <div className="flex items-center justify-between bg-white border border-gray-100 rounded-3xl px-8 py-5 shadow-sm">
                <div>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Evolution Complete</p>
                  <h3 className="text-2xl font-black text-gray-800">{resumeData.candidate_name}</h3>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {verifiedSkills.map((s, i) => (
                      <span key={i} className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wide border border-emerald-200">
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleDownloadDocx}
                  disabled={isGeneratingDocx}
                  className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-60"
                >
                  {isGeneratingDocx
                    ? <><Loader2 className="animate-spin w-5 h-5" /> Generating...</>
                    : <><Download className="w-5 h-5" /> Download PDF</>
                  }
                </button>
              </div>

              {/* SUMMARY */}
              {resumeData.summary && (
                <ResumeSection icon={<User className="w-5 h-5 text-indigo-500" />} title="Professional Summary">
                  <p className="text-gray-600 text-sm leading-relaxed">{resumeData.summary}</p>
                </ResumeSection>
              )}

              {/* SKILLS */}
              {resumeData.skills?.length > 0 && (
                <ResumeSection icon={<Code className="w-5 h-5 text-indigo-500" />} title="Skills">
                  <div className="flex flex-wrap gap-2">
                    {resumeData.skills.map((s, i) => {
                      const isNew = verifiedSkills.some(vs =>
                        s.toLowerCase().includes(vs.toLowerCase().split(' ')[0])
                      );
                      return (
                        <span
                          key={i}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                            isNew
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-300'
                              : 'bg-gray-50 text-gray-600 border-gray-100'
                          }`}
                        >
                          {isNew && '✦ '}{s}
                        </span>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-3 font-medium">✦ = newly added from certifications</p>
                </ResumeSection>
              )}

              {/* EXPERIENCE */}
              {resumeData.experience?.length > 0 && (
                <ResumeSection icon={<Briefcase className="w-5 h-5 text-indigo-500" />} title="Work Experience">
                  <div className="space-y-4">
                    {resumeData.experience.map((exp, i) => (
                      <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden">
                        <button
                          onClick={() => setExpandedExp(expandedExp === i ? null : i)}
                          className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-indigo-50 transition-colors"
                        >
                          <div className="text-left">
                            <p className="font-black text-gray-800 text-sm">{exp.title}</p>
                            <p className="text-gray-500 text-xs font-medium">{exp.company} · {exp.duration}</p>
                          </div>
                          {expandedExp === i
                            ? <ChevronUp className="w-4 h-4 text-gray-400" />
                            : <ChevronDown className="w-4 h-4 text-gray-400" />
                          }
                        </button>
                        <AnimatePresence>
                          {expandedExp === i && (
                            <motion.ul
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="px-6 py-4 space-y-2 overflow-hidden"
                            >
                              {exp.bullets.map((b, j) => (
                                <li key={j} className="flex items-start gap-3 text-sm text-gray-600 leading-relaxed">
                                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-2 shrink-0" />
                                  {b}
                                </li>
                              ))}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </ResumeSection>
              )}

              {/* CERTIFICATIONS */}
              {resumeData.certifications?.length > 0 && (
                <ResumeSection
                  icon={<Award className="w-5 h-5 text-amber-500" />}
                  title="AI-Verified Certifications"
                  highlight
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {resumeData.certifications.map((cert, i) => (
                      <div key={i} className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4">
                        <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-black text-gray-800 text-sm">{cert.name}</p>
                          <p className="text-amber-600 text-[11px] font-semibold mt-0.5">{cert.issuer} · {cert.year}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ResumeSection>
              )}

              {/* EDUCATION */}
              {resumeData.education?.length > 0 && (
                <ResumeSection icon={<GraduationCap className="w-5 h-5 text-indigo-500" />} title="Education">
                  <div className="space-y-3">
                    {resumeData.education.map((edu, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <div className="w-2 h-2 bg-indigo-300 rounded-full mt-2 shrink-0" />
                        <div>
                          <p className="font-black text-gray-800 text-sm">{edu.degree}</p>
                          <p className="text-gray-500 text-xs font-medium">{edu.institution} · {edu.year}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ResumeSection>
              )}

              {/* PROJECTS */}
              {resumeData.projects?.length > 0 && (
                <ResumeSection icon={<Star className="w-5 h-5 text-indigo-500" />} title="Projects">
                  <div className="space-y-4">
                    {resumeData.projects.map((proj, i) => (
                      <div key={i} className="border border-gray-100 rounded-2xl px-6 py-4">
                        <p className="font-black text-gray-800 text-sm mb-1">{proj.name}</p>
                        <p className="text-gray-500 text-xs leading-relaxed mb-2">{proj.description}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {proj.tech?.map((t, j) => (
                            <span key={j} className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-1 rounded-lg border border-indigo-100">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ResumeSection>
              )}

              {/* Bottom download CTA */}
              <div className="flex justify-center pt-4 pb-8">
                <button
                  onClick={handleDownloadDocx}
                  disabled={isGeneratingDocx}
                  className="flex items-center gap-3 bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 active:scale-95 disabled:opacity-60 uppercase tracking-widest"
                >
                  {isGeneratingDocx
                    ? <><Loader2 className="animate-spin w-5 h-5" /> Generating Document...</>
                    : <><Download className="w-5 h-5" /> Download Evolved Resume (.pdf)</>
                  }
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────

function SidebarItem({ icon, label, href = '#', active = false }: any) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-sm transition-all duration-200 ${
        active
          ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
      }`}
    >
      <span className={`transition-colors ${active ? 'text-indigo-600' : 'text-gray-400'}`}>{icon}</span>
      {label}
    </Link>
  );
}

function ResumeSection({ icon, title, children, highlight = false }: any) {
  return (
    <div className={`bg-white rounded-3xl p-8 border shadow-sm ${highlight ? 'border-amber-200 shadow-amber-50' : 'border-gray-100'}`}>
      <h4 className="flex items-center gap-3 font-black text-gray-800 text-base mb-5 pb-4 border-b border-gray-50">
        {icon} {title}
        {highlight && (
          <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-amber-200">
            New
          </span>
        )}
      </h4>
      {children}
    </div>
  );
}