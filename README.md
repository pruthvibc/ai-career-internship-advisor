<div align="center">

# 🚀 AI Career & Internship Advisor
### *Your AI-Powered Career Co-Pilot — From Skill Gaps to Internship Offer*

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.135-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Groq](https://img.shields.io/badge/Groq-LLaMA_3.3_70B-orange?style=for-the-badge)](https://groq.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-blue?style=for-the-badge&logo=python)](https://python.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<br/>

> **Built for Microsoft Hackathon 2026** — An end-to-end AI platform that analyzes your resume, identifies skill gaps, builds a personalized learning roadmap, conducts a proctored voice mock interview, and recommends live internships — all in one seamless pipeline powered by LLaMA 3.3 70B.

</div>

---

## 🎯 The Problem We Solve

Students and fresh graduates face three painful bottlenecks when hunting for internships:

1. **They don't know what skills they're missing** for their target role
2. **They can't practice interviews** in a realistic, AI-driven environment
3. **They waste hours** applying to internships that don't match their actual profile

We eliminate all three — with a single, unified AI pipeline that **learns from your mistakes** across sessions.

---

## ✨ The 4 Core Features

### 1. 🔍 Dashboard — Intelligent Skill-Gap Analysis
> *"Don't guess what recruiters want."*

Upload your **Resume PDF** and the **Job Description PDF**. LLaMA 3.3 70B acts as a technical recruiter and returns:
- ✅ Skills you already have
- ❌ Skills you're missing (gap badges)
- 💡 AI reasoning behind each gap
- 🗺️ One-click **Personalized Learning Roadmap** with curated resources from YouTube, Udemy, Coursera & NPTEL
- 🧠 **Hindsight Feed** — persistent AI memory that logs your gaps and verified skills across every session

---

### 2. 🎙️ Mock Interview Studio
> *"A proctored, voice-driven certification exam — not just a chatbot."*

A fully AI-powered technical interview with:
- 🔴 **Live proctoring badge** — simulates real exam pressure
- 🤖 **AI speaks questions** via Text-to-Speech (Web Speech API)
- 🎙️ **Voice recognition** captures and auto-submits your spoken answers
- 🚫 **Noise guard** — ignores background sounds (min 3 words + 0.4 confidence threshold)
- 📊 **Progressive difficulty** — Easy (Q1–3) → Medium (Q4–9) → Hard (Q10)
- 🏆 **Pass/Fail certification** — 8/10 correct = Skill Verified badge added to your profile
- 📹 **Session recording** — download your full exam as `.webm` for self-review
- 📝 **Live transcript sidebar** — full Q&A log during the exam
- 🔒 **Gap Analysis Gate** — blocks access if you haven't completed gap analysis first

---

### 3. 📄 Resume Evolution Engine
> *"Your resume, upgraded with AI-verified proof."*

After passing mock interview certifications:
- Adds **verified skills** to your Skills section automatically
- Generates **quantified bullet points** under the most relevant experience entry
- Creates an **"AI-Verified Certifications"** section with exam proof
- Exports a professionally formatted, styled **PDF resume** via ReportLab — no Word, no templates

---

### 4. 💼 Live Internship Recommendations + Job Match Analyzer
> *"Stop guessing. See your exact fit score before you apply."*

**Step 1 — Upload Resume:**
- AI extracts your top 5 technical skill tags

**Step 2 — Search Live Internships:**
- LLaMA generates a targeted search query from your resume
- **Serper API** fetches real-time listings from LinkedIn, Naukri & Internshala
- Returns 6 matched internship cards instantly

**Step 3 — Click Any Listing for Deep Analysis:**
- 📊 **Match percentage** (0–100%)
- ❌ **Missing skills** for that specific role
- 🟢 **AI verdict** — should you apply?
- 💡 **Personalized improvement advice**

---

## 🧠 The Hindsight Memory System
> *"The scariest part wasn't the LLM calls — it was realizing every 'personalized' interview was just expensive theater without persistent memory."*

The platform uses a **dual-path AI architecture** that learns across sessions:

```
User Answer
     │
     ├──► Path A: Interviewer LLM (temp=0.7)
     │         Warm, conversational, asks next question
     │         System prompt injected with known gaps
     │
     └──► Path B: Judge LLM (temp=0.1) — silent, never shown to user
               Evaluates technical correctness
               If wrong → saves 1-sentence gap to memory.json
               If correct → outputs PASS, nothing saved
```

- **5-entry memory cap** — only the 5 most recent, distilled gaps are kept. More stored context ≠ better context.
- **Deduplication** — the same gap is never saved twice
- **Cross-session persistence** — returning users see their gaps and verified skills restored automatically
- **Drives everything downstream** — gaps found in the interview surface in skill analysis and filter internship recommendations

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 14)                     │
│                                                              │
│   Dashboard  ──►  Mock Interview  ──►  Resume Evolution      │
│       │                                      │               │
│       └──────────►  Job Recommendations  ◄───┘               │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API
┌──────────────────────────▼──────────────────────────────────┐
│                     BACKEND (FastAPI)                         │
│                                                              │
│  /api/analyze-gap       →  LLaMA 3.3 70B (Gap Analysis)     │
│  /api/generate-roadmap  →  LLaMA 3.3 70B (Roadmap Builder)  │
│  /api/chat              →  Dual LLM (Interviewer + Judge)    │
│  /api/upload-resume     →  PyPDF2 + LLaMA (Tag Extraction)  │
│  /api/search-jobs       →  Serper API + LLaMA Query Gen     │
│  /api/match-job         →  LLaMA 3.3 70B (Resume vs JD)     │
│  /api/evolve-resume     →  LLaMA 3.3 70B (Resume Writer)    │
│  /api/generate-resume-docx → ReportLab (PDF Export)         │
│  /api/signup + /login   →  SHA-256 Auth + JSON Persistence  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| **Next.js 14** | App router, SSR, routing |
| **Tailwind CSS** | Utility-first styling |
| **Framer Motion** | Smooth page & component animations |
| **Lucide React** | Icon library |
| **Web Speech API** | Browser-native TTS + STT for mock interview |
| **canvas-confetti** | Celebration on exam pass 🎉 |

### Backend
| Technology | Purpose |
|-----------|---------|
| **FastAPI** | High-performance async Python API |
| **Groq + LLaMA 3.3 70B** | Core AI inference (ultra-fast, free tier) |
| **Serper API** | Real-time Google internship/job search |
| **ReportLab** | Styled PDF resume generation |
| **pypdf / PyPDF2** | PDF text extraction |
| **SHA-256** | Password hashing (zero external auth libs) |
| **JSON persistence** | Lightweight user + hindsight memory store |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- Python v3.10+
- **Google Chrome or Microsoft Edge** *(required for Web Speech API)*
- Groq API key → [console.groq.com](https://console.groq.com)
- Serper API key → [serper.dev](https://serper.dev)

### 1. Clone the Repository
```bash
git clone https://github.com/pruthvibc/ai-career-internship-advisor.git
cd ai-career-internship-advisor
```

### 2. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate
# Mac/Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file
GROQ_API_KEY=your_groq_key_here
SERPER_API_KEY=your_serper_key_here

# Start the server
uvicorn main:app --reload
```
Backend runs at → `http://localhost:8000`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at → `http://localhost:3000`

---

## 📁 Project Structure

```
ai-career-internship-advisor/
├── frontend/
│   ├── app/
│   │   ├── page.tsx                    # Dashboard (Gap Analysis + Roadmap + Hindsight)
│   │   ├── mock-interview/
│   │   │   └── page.tsx                # Proctored Mock Interview Studio
│   │   ├── resume-evolution/
│   │   │   └── page.tsx                # AI Resume Upgrade Engine
│   │   ├── job-recommendations/
│   │   │   └── page.tsx                # Live Internship Hub + Match Analyzer
│   │   └── login/
│   │       └── page.tsx                # Auth (Login / Signup)
│   ├── package.json
│   └── tailwind.config.ts
│
├── backend/
│   ├── main.py                         # All FastAPI endpoints + Dual LLM logic
│   ├── memory.json                     # Persistent hindsight memory + user store
│   ├── requirements.txt
│   └── .env                            # API keys (never committed)
│
└── README.md
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analyze-gap` | Resume + JD gap analysis |
| `GET` | `/api/generate-roadmap` | Generate personalized learning roadmap |
| `POST` | `/api/chat` | Mock interview dual-LLM engine |
| `POST` | `/api/upload-resume` | Upload resume for internship matching |
| `GET` | `/api/search-jobs` | Fetch live internship listings via Serper |
| `POST` | `/api/match-job` | Score resume vs job description |
| `POST` | `/api/evolve-resume` | Generate evolved resume JSON |
| `POST` | `/api/generate-resume-docx` | Export resume as styled PDF |
| `POST` | `/api/signup` | Create new account |
| `POST` | `/api/login` | Authenticate existing user |
| `GET` | `/api/hindsight` | Retrieve AI hindsight memory |
| `GET` | `/api/user/{user_id}` | Fetch full user profile |

---

## ⚠️ Known Browser Policies

- **Web Speech API** (voice interview) only works in **Google Chrome** or **Microsoft Edge**
- Click anywhere on the page once after loading to **unlock the AI voice engine** (Chrome autoplay policy)
- For best microphone accuracy, use in a **quiet environment** — the noise guard filters short/low-confidence captures automatically

---

## 🔒 Security

- Passwords hashed with **SHA-256 + fixed salt** before storage — never stored in plain text
- Password hash is **stripped from all API responses** before returning to frontend
- `memory.json` uses **atomic writes** (`.tmp` → rename) to prevent data corruption on concurrent requests

---

## 🗺️ What's Next

- [ ] WebRTC remote proctoring with eye-tracking detection
- [ ] Multi-language interview support (Hindi, Tamil, Telugu)
- [ ] LinkedIn OAuth — auto-import profile data
- [ ] AI-generated cover letter tailored per internship listing
- [ ] Leaderboard for certification scores across users
- [ ] Mobile app (React Native)

---

## 👥 Team

Built with ❤️ for **Microsoft Hackathon 2026**

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**⭐ If this helped you land your internship, star the repo! ⭐**

*From resume to offer — powered by AI.*

</div>