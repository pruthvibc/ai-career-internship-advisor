'use client';

import React, { useState, useRef } from 'react'; 
import { 
  FileText, Briefcase, 
  Upload, Search, CheckCircle2, XCircle, 
  Loader2, ExternalLink, Sparkles
} from 'lucide-react'; 
import { motion, AnimatePresence } from 'framer-motion';

interface Job {
  title: string;
  company: string;
  description: string;
  link: string;
}

interface AnalysisResult {
  match_percentage: number;
  missing_skills: string[];
  verdict: string;
  improvement_advice: string;
  externalLink?: string;
}

export default function CareerCommandCenter() {
  const [isUploading, setIsUploading] = useState(false);
  const [resumeParsed, setResumeParsed] = useState(false);
  const [candidateName, setCandidateName] = useState('User'); // New state for dynamic name
  const [isSearching, setIsSearching] = useState(false);
  const [liveJobs, setLiveJobs] = useState<Job[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | 'loading' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8000/api/upload-resume', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.status === 'success') {
        setResumeParsed(true);
        // Assuming your backend returns the extracted name in data.name
        if (data.name) {
          setCandidateName(data.name);
        }
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsUploading(false);
    }
  };

  const fetchRealJobs = async () => {
    setIsSearching(true);
    setAnalysis(null);
    try {
      const res = await fetch('http://localhost:8000/api/search-jobs');
      const data = await res.json();
      setLiveJobs(data.jobs || []);
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  const analyzeJob = async (job: Job) => {
    setAnalysis('loading');
    try {
      const res = await fetch('http://localhost:8000/api/match-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          job_title: job.title, 
          job_description: job.description 
        }),
      });
      const data = await res.json();
      setAnalysis({ ...data, externalLink: job.link });
    } catch (err) {
      console.error("Analysis failed", err);
      setAnalysis(null);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      <aside className="w-72 bg-white border-r border-gray-200 p-6 flex flex-col">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-indigo-600 tracking-tight italic">Career and Internship Advisor</h1>
          <p className="text-sm text-gray-500 mt-1">Career Command Center</p>
        </div>

        <nav className="flex-1 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium bg-indigo-50 text-indigo-700">
            <Briefcase size={20} /> Job Hub
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              {candidateName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{candidateName}</p>
              <p className="text-xs text-gray-500"></p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div key="jobs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-6xl mx-auto">
            <header className="mb-10 flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-extrabold text-gray-800">Real-Time Job Match</h2>
                <p className="text-gray-600 mt-1">AI pulls active roles from the web based on your resume.</p>
              </div>
              
              <div className="flex gap-3">
                <input type="file" hidden ref={fileInputRef} onChange={handleUpload} accept=".pdf" />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition-all"
                >
                  {isUploading ? <Loader2 className="animate-spin text-indigo-600" /> : <Upload size={18} />}
                  {resumeParsed ? 'Update PDF' : 'Upload Resume'}
                </button>
                
                {resumeParsed && (
                  <button 
                    onClick={fetchRealJobs}
                    disabled={isSearching}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {isSearching ? <Loader2 className="animate-spin" /> : <Search size={18} />}
                    Search Live Jobs
                  </button>
                )}
              </div>
            </header>

            {!resumeParsed ? (
              <div className="bg-white p-20 rounded-3xl border border-gray-100 text-center shadow-sm flex flex-col items-center">
                <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
                  <FileText className="text-indigo-600 w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Upload your resume to start</h3>
                <p className="text-gray-500 max-w-sm">Our AI will extract your skills and find matching internships in Bengaluru.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-4">
                  <h3 className="font-bold text-gray-400 uppercase text-[10px] tracking-widest flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-500" /> Active Openings
                  </h3>
                  
                  {liveJobs.length === 0 && !isSearching && (
                    <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed text-gray-400">
                      Click &quot;Search Live Jobs&quot;
                    </div>
                  )}

                  {liveJobs.map((job, i) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      key={i} 
                      onClick={() => analyzeJob(job)}
                      className="group bg-white p-5 rounded-2xl border border-gray-200 hover:border-indigo-500 cursor-pointer transition-all shadow-sm hover:shadow-md"
                    >
                      <h4 className="font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">{job.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">{job.company}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">LIVE POST</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="lg:col-span-2">
                  {analysis === 'loading' ? (
                    <div className="bg-white h-[400px] rounded-3xl border flex flex-col items-center justify-center p-10 shadow-sm">
                      <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
                      <p className="font-bold text-gray-800 text-lg">Cross-referencing Skills...</p>
                      <p className="text-gray-500 text-sm">Analyzing your PDF against the job requirements.</p>
                    </div>
                  ) : analysis ? (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl border p-8 shadow-sm">
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-800">Technical Gap Analysis</h3>
                          <p className="text-gray-500">Detailed AI comparison</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-4xl font-black text-indigo-600">{analysis.match_percentage}%</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Match Score</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                          <h4 className="flex items-center gap-2 text-red-700 font-bold mb-4 text-sm">
                            <XCircle size={18} /> Missing Skills/Gaps
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {analysis.missing_skills?.map((s) => (
                              <span key={s} className="bg-white px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 shadow-sm">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                          <h4 className="flex items-center gap-2 text-emerald-700 font-bold mb-4 text-sm">
                            <CheckCircle2 size={18} /> AI Verdict
                          </h4>
                          <p className="text-sm text-emerald-900 leading-relaxed font-medium">
                            {analysis.verdict}
                          </p>
                        </div>
                      </div>

                      <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 mb-8">
                        <h4 className="text-indigo-800 font-bold mb-2 text-sm">Personalized Advice</h4>
                        <p className="text-indigo-900 text-sm leading-relaxed italic">
                          &quot;{analysis.improvement_advice}&quot;
                        </p>
                      </div>
                      
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
                    <div className="bg-gray-50 h-[400px] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-10 text-gray-400">
                      <Briefcase size={40} className="mb-4 opacity-20" />
                      <p className="font-medium">Select an opening from the left to see your match percentage and skill gaps.</p>
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