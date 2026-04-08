'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, Loader2, ArrowRight, Sparkles, User, Lock, Eye, EyeOff } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type Mode = 'login' | 'signup';
type Status = 'idle' | 'success_returning' | 'success_new';

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode]               = useState<Mode>('login');
  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState('');
  const [status, setStatus]           = useState<Status>('idle');

  // If already logged in this session, skip to dashboard
  useEffect(() => {
    const saved = sessionStorage.getItem('ai_advisor_user');
    if (saved) router.replace('/');
  }, [router]);

  const clearForm = () => {
    setError('');
    setUsername('');
    setPassword('');
    setStatus('idle');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = username.trim();
    const p = password.trim();

    // Frontend validation
    if (!u) return setError('Please enter a username.');
    if (u.length < 2) return setError('Username must be at least 2 characters.');
    if (!p) return setError('Please enter a password.');
    if (mode === 'signup' && p.length < 4)
      return setError('Password must be at least 4 characters.');

    setError('');
    setIsLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/login' : '/api/signup';
      const res  = await fetch(`${API_BASE}${endpoint}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: u, password: p }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Something went wrong. Please try again.');
        setIsLoading(false);
        return;
      }

      // Save session
      sessionStorage.setItem('ai_advisor_user', JSON.stringify({
        name: data.user.name,
        id:   data.user.id,
      }));

      // Show success state briefly before redirecting
      setStatus(data.is_new ? 'success_new' : 'success_returning');
      setTimeout(() => router.replace('/'), 1400);

    } catch {
      setError('Could not connect to the server. Make sure the backend is running on port 8000.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 flex items-center justify-center p-6">

      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
              <BrainCircuit className="w-8 h-8 text-indigo-300" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">AI Career Advisor</h1>
            <p className="text-indigo-300 text-sm mt-1 font-medium">Your personalised growth platform</p>
          </div>

          {/* Mode toggle */}
          <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 mb-8">
            {(['login', 'signup'] as Mode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); clearForm(); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all duration-200 ${
                  mode === m
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                    : 'text-indigo-400 hover:text-indigo-200'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Success states */}
          <AnimatePresence mode="wait">
            {status === 'success_returning' && (
              <motion.div key="ret" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="py-8 text-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">👋</span>
                </div>
                <p className="text-emerald-300 font-black text-xl">Welcome back, {username}!</p>
                <p className="text-emerald-400/60 text-sm mt-2">Restoring your progress...</p>
              </motion.div>
            )}

            {status === 'success_new' && (
              <motion.div key="new" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="py-8 text-center">
                <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">✨</span>
                </div>
                <p className="text-indigo-200 font-black text-xl">Welcome, {username}!</p>
                <p className="text-indigo-300/60 text-sm mt-2">Setting up your profile...</p>
              </motion.div>
            )}

            {status === 'idle' && (
              <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onSubmit={handleSubmit} className="space-y-4">

                {/* Username */}
                <div>
                  <label className="block text-[11px] font-black text-indigo-300 uppercase tracking-widest mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                    <input
                      type="text"
                      value={username}
                      onChange={e => { setUsername(e.target.value); setError(''); }}
                      placeholder="Enter your username"
                      autoFocus
                      autoComplete="username"
                      className="w-full bg-white/5 border border-white/10 text-white placeholder:text-indigo-400/40 rounded-2xl pl-11 pr-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400/40 transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[11px] font-black text-indigo-300 uppercase tracking-widest mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      placeholder={mode === 'signup' ? 'Create a password (min 4 chars)' : 'Enter your password'}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      className="w-full bg-white/5 border border-white/10 text-white placeholder:text-indigo-400/40 rounded-2xl pl-11 pr-12 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400/40 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-indigo-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="bg-red-500/10 border border-red-400/30 rounded-xl px-4 py-3"
                    >
                      <p className="text-red-300 text-[12px] font-semibold">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Info note for signup */}
                {mode === 'signup' && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-3">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-indigo-300/70 text-[11px] leading-relaxed">
                      Your username must be unique. Your roadmap, skill gaps, and certifications will be saved to your account.
                    </p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading || !username.trim() || !password.trim()}
                  className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 mt-2"
                >
                  {isLoading
                    ? <><Loader2 className="animate-spin w-5 h-5" /> {mode === 'login' ? 'Signing in...' : 'Creating account...'}</>
                    : <><ArrowRight className="w-5 h-5" /> {mode === 'login' ? 'Sign In' : 'Create Account'}</>
                  }
                </button>

                {/* Switch mode link */}
                <p className="text-center text-indigo-400/60 text-[12px] pt-1">
                  {mode === 'login'
                    ? <>Don't have an account?{' '}
                        <button type="button" onClick={() => { setMode('signup'); clearForm(); }}
                          className="text-indigo-300 font-black hover:text-white transition-colors underline underline-offset-2">
                          Sign up
                        </button>
                      </>
                    : <>Already have an account?{' '}
                        <button type="button" onClick={() => { setMode('login'); clearForm(); }}
                          className="text-indigo-300 font-black hover:text-white transition-colors underline underline-offset-2">
                          Sign in
                        </button>
                      </>
                  }
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-indigo-400/40 text-[11px] mt-6 font-medium">
          Passwords are hashed and stored securely · No email required
        </p>
      </motion.div>
    </div>
  );
}