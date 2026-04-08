'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  FileText, Briefcase,
  Upload, Search, CheckCircle2, XCircle,
  Loader2, ExternalLink, Sparkles, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Job {
  title: string;
  company: string;
  snippet: string;       // short preview shown in the card
  description: string;   // full text sent to match-job
  link: string;
}

interface AnalysisResult {
  match_percentage: number;
  matched_skills: string[];
  missing_skills: string[];
  verdict: string;
  improvement_advice: string;
  externalLink?: string;
}

// Generate a stable random session ID for this browser tab.
// This ensures the resume uploaded in this tab is only used by this tab.
function makeSessionId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function CareerCommandCenter() {
  const [sessionId] = useState<string>(makeSessionId);

  const [isUploading, setIsUploading]   = useState(false);
  const [resumeParsed, setResumeParsed] = useState(false);
  const [candidateName, setCandidateName] = useState('User');
  const [resumeTags, setResumeTags]     = useState<string[]>([]);

  const [isSearching, setIsSearching]   = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');     // for debug display
  const [liveJobs, setLiveJobs]         = useState<Job[]>([]);

  const [selectedJob, setSelectedJob]   = useState<Job | null>(null);
  const [analysis, setAnalysis]         = useState<AnalysisResult | 'loading' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Upload resume ──────────────────────────────────────────────────────────
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', sessionId);   // ← pass session_id

    try {
      const res  = await fetch(`${API_BASE}/api/upload-resume`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.status === 'success') {
        setResumeParsed(true);
        if (data.name) setCandidateName(data.name);
        if (data.tags) setResumeTags(data.tags);
        // Reset previous search results when a new resume is uploaded
        setLiveJobs([]);
        setAnalysis(null);
        setSelectedJob(null);
        setSearchQuery('');
      }
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setIsUploading(false);
      // Reset file input so the same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Search jobs ────────────────────────────────────────────────────────────
  const fetchRealJobs = async () => {
    setIsSearching(true);
    setAnalysis(null);
    setSelectedJob(null);

    try {
      const res  = await fetch(
        `${API_BASE}/api/search-jobs?session_id=${sessionId}`
      );
      const data = await res.json();

      setLiveJobs(data.jobs || []);
      if (data.search_query) setSearchQuery(data.search_query);
      if (data.candidate_name) setCandidateName(data.candidate_name);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsSearching(false);
    }
  };

  // ── Analyse a job ──────────────────────────────────────────────────────────
  const analyzeJob = async (job: Job) => {
    setSelectedJob(job);
    setAnalysis('loading');

    try {
      const res  = await fetch(`${API_BASE}/api/match-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_title:       job.title,
          job_description: job.description,   // ← full page text, not just snippet
          job_url:         job.link,
          session_id:      sessionId,         // ← pass session_id
        }),
      });
      const data = await res.json();
      setAnalysis({ ...data, externalLink: job.link });
    } catch (err) {
      console.error('Analysis failed', err);
      setAnalysis(null);
    }
  };

  // ── Match-score colour helper ──────────────────────────────────────────────
  const scoreColor = (pct: number) => {
    if (pct >= 70) return 'text-emerald-600';
    if (pct >= 40) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">

      {/* ── Sidebar ── */}
      <aside className="w-72 bg-white border-r border-gray-200 p-6 flex flex-col">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-indigo-600 tracking-tight italic">
            Career & Internship Advisor
          </h1>
          <p className="text-sm text-gray-500 mt-1">Career Command Center</p>
        </div>

        <nav className="flex-1 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium bg-indigo-50 text-indigo-700">
            <Briefcase size={20} /> Job Hub
          </button>
        </nav>

        {/* Skill tags extracted from resume */}
        {resumeTags.length > 0 && (
          <div className="mt-6">
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-2 flex items-center gap-1">
              <Tag size={11} /> Detected Skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {resumeTags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto pt-6 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              {candidateName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{candidateName}</p>
              <p className="text-xs text-gray-500">
                {resumeParsed ? 'Resume loaded ✓' : 'No resume uploaded'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 p-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key="jobs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-6xl mx-auto"
          >
            {/* Header */}
            <header className="mb-10 flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-extrabold text-gray-800">Real-Time Job Match</h2>
                <p className="text-gray-600 mt-1">
                  AI pulls active roles from the web and scores them against your resume.
                </p>
                {searchQuery && (
                  <p className="text-xs text-indigo-400 mt-1">
                    Search used: <span className="font-mono">{searchQuery}</span>
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <input
                  type="file"
                  hidden
                  ref={fileInputRef}
                  onChange={handleUpload}
                  accept=".pdf"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition-all"
                >
                  {isUploading
                    ? <Loader2 className="animate-spin text-indigo-600" size={18} />
                    : <Upload size={18} />}
                  {resumeParsed ? 'Update Resume' : 'Upload Resume'}
                </button>

                {resumeParsed && (
                  <button
                    onClick={fetchRealJobs}
                    disabled={isSearching}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {isSearching
                      ? <Loader2 className="animate-spin" size={18} />
                      : <Search size={18} />}
                    {isSearching ? 'Searching…' : 'Search Live Jobs'}
                  </button>
                )}
              </div>
            </header>

            {/* Body */}
            {!resumeParsed ? (
              /* ── Empty state ── */
              <div className="bg-white p-20 rounded-3xl border border-gray-100 text-center shadow-sm flex flex-col items-center">
                <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
                  <FileText className="text-indigo-600 w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  Upload your resume to start
                </h3>
                <p className="text-gray-500 max-w-sm">
                  Our AI extracts your skills and searches for matching internships across
                  LinkedIn, Naukri, Internshala, and more.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* ── Job list ── */}
                <div className="lg:col-span-1 space-y-4">
                  <h3 className="font-bold text-gray-400 uppercase text-[10px] tracking-widest flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-500" /> Active Openings
                  </h3>

                  {liveJobs.length === 0 && !isSearching && (
                    <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed text-gray-400 text-sm">
                      Click &quot;Search Live Jobs&quot; to find matches
                    </div>
                  )}

                  {isSearching && (
                    <div className="text-center py-10 text-indigo-400 text-sm">
                      <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                      Scanning job boards…
                    </div>
                  )}

                  {liveJobs.map((job, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      onClick={() => analyzeJob(job)}
                      className={`group bg-white p-5 rounded-2xl border cursor-pointer transition-all shadow-sm hover:shadow-md
                        ${selectedJob?.link === job.link
                          ? 'border-indigo-500 shadow-md'
                          : 'border-gray-200 hover:border-indigo-400'}`}
                    >
                      <h4 className="font-bold text-gray-800 group-hover:text-indigo-600 transition-colors text-sm leading-tight">
                        {job.title}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">{job.company}</p>
                      <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                        {job.snippet}
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                          LIVE POST
                        </span>
                        {selectedJob?.link === job.link && analysis === 'loading' && (
                          <Loader2 size={12} className="animate-spin text-indigo-400" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* ── Analysis panel ── */}
                <div className="lg:col-span-2">
                  {analysis === 'loading' ? (
                    <div className="bg-white h-[420px] rounded-3xl border flex flex-col items-center justify-center p-10 shadow-sm">
                      <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
                      <p className="font-bold text-gray-800 text-lg">Cross-referencing Skills…</p>
                      <p className="text-gray-500 text-sm">Comparing your full resume against the job posting.</p>
                    </div>

                  ) : analysis ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white rounded-3xl border p-8 shadow-sm"
                    >
                      {/* Score row */}
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-800">Technical Gap Analysis</h3>
                          <p className="text-gray-500 text-sm mt-0.5">
                            {selectedJob?.title && (
                              <span className="font-medium text-gray-700">{selectedJob.title}</span>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`text-4xl font-black ${scoreColor(analysis.match_percentage)}`}>
                            {analysis.match_percentage}%
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Match Score
                          </span>
                        </div>
                      </div>

                      {/* Matched vs missing */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Missing */}
                        <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                          <h4 className="flex items-center gap-2 text-red-700 font-bold mb-4 text-sm">
                            <XCircle size={18} /> Skills to Acquire
                          </h4>
                          {analysis.missing_skills?.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {analysis.missing_skills.map((s) => (
                                <span
                                  key={s}
                                  className="bg-white px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 shadow-sm"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-red-600 font-medium">No critical gaps found 🎉</p>
                          )}
                        </div>

                        {/* Matched */}
                        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                          <h4 className="flex items-center gap-2 text-emerald-700 font-bold mb-4 text-sm">
                            <CheckCircle2 size={18} /> Your Matching Skills
                          </h4>
                          {analysis.matched_skills?.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {analysis.matched_skills.map((s) => (
                                <span
                                  key={s}
                                  className="bg-white px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-200 text-emerald-700 shadow-sm"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-emerald-700 italic">{analysis.verdict}</p>
                          )}
                        </div>
                      </div>

                      {/* Verdict */}
                      {analysis.verdict && analysis.matched_skills?.length > 0 && (
                        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 mb-4">
                          <h4 className="text-gray-700 font-bold mb-1 text-sm">AI Verdict</h4>
                          <p className="text-gray-600 text-sm leading-relaxed">{analysis.verdict}</p>
                        </div>
                      )}

                      {/* Improvement advice */}
                      <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 mb-6">
                        <h4 className="text-indigo-800 font-bold mb-1 text-sm">Personalised Advice</h4>
                        <p className="text-indigo-900 text-sm leading-relaxed italic">
                          &quot;{analysis.improvement_advice}&quot;
                        </p>
                      </div>

                      {/* Apply button */}
                      <a
                        href={analysis.externalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all shadow-lg"
                      >
                        <ExternalLink size={18} /> Apply on Original Platform
                      </a>
                    </motion.div>

                  ) : (
                    <div className="bg-gray-50 h-[420px] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-10 text-gray-400">
                      <Briefcase size={40} className="mb-4 opacity-20" />
                      <p className="font-medium text-center max-w-xs">
                        Select a job opening from the left to see your match score and skill gaps.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}