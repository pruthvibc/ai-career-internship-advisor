import os
import json
import re
import io
import requests
import PyPDF2
from fastapi import FastAPI, Request, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
from pypdf import PdfReader
from typing import Annotated, Optional

# 1. SETUP & CONFIGURATION
load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    print("CRITICAL ERROR: GROQ_API_KEY not found.")

groq_client = Groq(api_key=api_key)
MEMORY_FILE = "memory.json"

# Job recommendation: in-memory resume store (your logic)
SERPER_API_KEY = os.environ.get("SERPER_API_KEY")
USER_RESUME_TEXT = {"content": ""}

# ─────────────────────────────────────────────────────────────────────────────
# 2. MEMORY HELPERS  (original — untouched)
# ─────────────────────────────────────────────────────────────────────────────
def load_memories():
    try:
        if os.path.exists(MEMORY_FILE):
            with open(MEMORY_FILE, "r") as f:
                data = json.load(f)
                # Backward-compatible: old format is a plain list
                if isinstance(data, list):
                    return data
                # New format: keyed dict — return the flat legacy list if present
                return data.get("_legacy", [])
        return []
    except Exception: return []

def save_memory(new_insight):
    try:
        mems = load_memories()
        clean = new_insight.strip()
        if "CANDIDATE_NAME:" in clean:
            mems = [m for m in mems if "CANDIDATE_NAME:" not in m]
        if clean and clean not in mems:
            mems.append(clean)

        # Read full file so we don't destroy the users section
        full = _read_full_store()
        full["_legacy"] = mems[-30:]
        _write_full_store(full)
    except Exception as e:
        print(f"Memory Save Error: {e}")

# ─────────────────────────────────────────────────────────────────────────────
# 3. USER PERSISTENCE HELPERS  (new — does not affect existing code)
# ─────────────────────────────────────────────────────────────────────────────

def _read_full_store() -> dict:
    """Read the entire memory.json as a dict. Handles old flat-list format."""
    try:
        if os.path.exists(MEMORY_FILE):
            with open(MEMORY_FILE, "r") as f:
                data = json.load(f)
            if isinstance(data, list):
                # Migrate old flat list into new structure transparently
                return {"_legacy": data, "users": {}}
            return data
    except Exception:
        pass
    return {"_legacy": [], "users": {}}

def _write_full_store(data: dict):
    """Atomic write — writes to .tmp first then renames so file is never half-written."""
    tmp = MEMORY_FILE + ".tmp"
    try:
        with open(tmp, "w") as f:
            json.dump(data, f, indent=2)
        os.replace(tmp, MEMORY_FILE)   # atomic on all platforms
    except Exception as e:
        print(f"Store write error: {e}")
        try: os.unlink(tmp)
        except: pass

def _make_user_id(name: str) -> str:
    """Turn 'Bhavana K.C.' → 'bhavana_kc' — safe dict key."""
    import re as _re
    return _re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')[:40]

def _hash_password(password: str) -> str:
    """SHA-256 hash with a fixed salt — no extra libraries needed."""
    import hashlib
    salted = f"ai_advisor_salt_{password}_2025"
    return hashlib.sha256(salted.encode()).hexdigest()

def _check_password(password: str, stored_hash: str) -> bool:
    return _hash_password(password) == stored_hash

def load_user(user_id: str) -> dict | None:
    store = _read_full_store()
    return store.get("users", {}).get(user_id)

def save_user(user_id: str, user_data: dict):
    store = _read_full_store()
    if "users" not in store:
        store["users"] = {}
    store["users"][user_id] = user_data
    _write_full_store(store)

def upsert_user(name: str, **kwargs) -> dict:
    """Create user if new, update fields if existing. Returns the user record."""
    from datetime import datetime, timezone
    user_id = _make_user_id(name)
    existing = load_user(user_id)
    now = datetime.now(timezone.utc).isoformat()

    if existing:
        existing["last_seen"] = now
        existing["is_new"] = False
        for k, v in kwargs.items():
            if v is not None:
                existing[k] = v
        save_user(user_id, existing)
        return existing
    else:
        user = {
            "id":             user_id,
            "name":           name,
            "is_new":         True,
            "created_at":     now,
            "last_seen":      now,
            "resume_summary": kwargs.get("resume_summary", ""),
            "gaps":           kwargs.get("gaps", []),
            "verified_skills":kwargs.get("verified_skills", []),
            "roadmap":        kwargs.get("roadmap", []),
        }
        save_user(user_id, user)
        return user

class ChatRequest(BaseModel):
    messages: list 
    topic_context: Optional[str] = None
    syllabus: Optional[list] = None   # sub-skills from the roadmap module e.g. ["JavaScript basics", "DOM manipulation"]

class MatchRequest(BaseModel):
    job_description: str
    job_title: str

# 3. PDF EXTRACTION
async def extract_text_from_pdf(file: UploadFile):
    try:
        await file.seek(0)
        reader = PdfReader(file.file)
        text = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted: text += extracted + "\n"
        return text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read PDF: {e}")

# 4. LLM LOGIC: IDENTITY & GAP ANALYSIS
def analyze_with_llm(resume_text, jd_text):
    prompt = f"""
    You are a Technical Recruiter. Analyze the Resume and JD provided.
    
    TASK:
    1. Extract the candidate's actual name from the resume.
    2. Identify technical skill gaps.
    
    STRICT RULE: IGNORE celebrity names. If the name is 'Bhavana K.C.', use 'Bhavana'. 
    Focus on the identity as a Software Engineer.

    RESUME: {resume_text[:4000]}
    JD: {jd_text[:4000]}
    
    RETURN ONLY JSON:
    {{ 
        "name": "Extracted Name", 
        "skills_found": ["A", "B"], 
        "skills_missing": ["C", "D"], 
        "reasoning": "Explanation" 
    }}
    """
    completion = groq_client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.3-70b-versatile",
        temperature=0.1,
    )
    raw_response = completion.choices[0].message.content.strip()
    clean_json = re.sub(r'^```json\s*|```$', '', raw_response, flags=re.MULTILINE).strip()
    
    try:
        return json.loads(clean_json)
    except:
        return {"name": "Bhavana", "skills_found": [], "skills_missing": [], "reasoning": "Error"}

# 5. API ENDPOINTS

@app.post("/api/analyze-gap")
async def analyze_gap(resume: Annotated[UploadFile, File(...)], jd: Annotated[UploadFile, File(...)]):
    resume_text = await extract_text_from_pdf(resume)
    jd_text = await extract_text_from_pdf(jd)
    
    gap_data = analyze_with_llm(resume_text, jd_text)
    
    # Store name and gaps (existing behaviour — untouched)
    save_memory(f"CANDIDATE_NAME: {gap_data.get('name', 'Bhavana')}")
    for skill in gap_data.get("skills_missing", []):
        save_memory(f"Gap Identified: {skill}")

    # NEW: persist to user record — safe, additive only
    try:
        upsert_user(
            gap_data.get('name', 'Candidate'),
            resume_summary=resume_text[:500],
            gaps=gap_data.get("skills_missing", []),
        )
    except Exception as e:
        print(f"User upsert error (non-fatal): {e}")

    return gap_data

@app.get("/api/generate-roadmap")
async def generate_roadmap():
    try:
        mems = load_memories()
        from urllib.parse import unquote_plus
        gaps = [unquote_plus(m) for m in mems if "Gap" in m]
        if not gaps: return {"roadmap": [], "reasoning_trace": "No gaps found."}

        prompt = f"""
        Based on technical gaps: {gaps}, create a 3-step learning roadmap.

        STRICT RULES FOR RESOURCES:
        - Only recommend from these 4 platforms: Udemy, YouTube, Coursera, NPTEL.
        - For each resource provide a relevant course or video title specific to the skill.
        - Build the link as a SEARCH URL using the skill topic as the query (never invent direct course URLs):
            Udemy:   https://www.udemy.com/courses/search/?q=TOPIC
            YouTube: https://www.youtube.com/results?search_query=TOPIC
            Coursera:https://www.coursera.org/search?query=TOPIC
            NPTEL:   https://nptel.ac.in/course.html
        - Replace TOPIC with the URL-encoded skill name.
        - Provide exactly 3 resources per step, one from different platforms where possible.

        RETURN ONLY A JSON LIST with no extra text:
        [{{
            "skill": "...",
            "topic": "...",
            "syllabus": ["subtopic1", "subtopic2"],
            "resources": [
                {{"platform": "YouTube", "title": "Relevant course/video title", "url": "https://www.youtube.com/results?search_query=..."}},
                {{"platform": "Udemy",   "title": "Relevant course title",       "url": "https://www.udemy.com/courses/search/?q=..."}},
                {{"platform": "Coursera","title": "Relevant course title",       "url": "https://www.coursera.org/search?query=..."}}
            ],
            "effort": "X weeks",
            "reasoning": "..."
        }}]
        """
        comp = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.5,
        )
        clean_json = re.sub(r'^```json\s*|```$', '', comp.choices[0].message.content.strip(), flags=re.MULTILINE).strip()
        roadmap_data = json.loads(clean_json)

        # NEW: persist roadmap to user record
        try:
            mems2 = load_memories()
            cname = next((m.split(": ")[1] for m in mems2 if "CANDIDATE_NAME" in m), None)
            if cname:
                upsert_user(cname, roadmap=roadmap_data)
        except Exception as e:
            print(f"Roadmap user save error (non-fatal): {e}")

        return {"roadmap": roadmap_data}
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/chat")
async def chat_with_ai(request: ChatRequest):
    try:
        mems = load_memories()
        # 1. Personalization: Get name from memory
        candidate_name = next((m.split(": ")[1] for m in mems if "CANDIDATE_NAME" in m), "Candidate")
        
        # FIX: Correctly count only user-role messages from properly structured history
        # The frontend now sends {"role": "user"/"assistant", "content": "..."} objects
        user_msgs = [m for m in request.messages if isinstance(m, dict) and m.get('role') == 'user']
        q_num = len(user_msgs) + 1

        # Dynamically use whatever topic the roadmap module passed — never hardcoded
        target_topic = request.topic_context if request.topic_context else "Software Engineering"

        # Sub-skills from the roadmap module syllabus (e.g. ["JavaScript basics", "DOM manipulation"])
        # Used to make questions laser-focused on exactly what the module teaches
        syllabus_items = request.syllabus if request.syllabus else []
        syllabus_context = (
            f"The module syllabus covers these specific sub-skills: {', '.join(syllabus_items)}. "
            f"Rotate questions across ALL of these sub-skills — do not repeat the same sub-skill twice."
            if syllabus_items else ""
        )

        # --- EVALUATION MODE (AFTER 10 QUESTIONS) ---
        if q_num > 10:
            eval_prompt = f"""
            The 10-question technical interview for {target_topic} is complete.
            Review the interaction for {candidate_name}.
            CRITERIA: 8/10 correct = PASS.
            RETURN ONLY JSON: {{ "text": "Feedback string", "is_complete": true, "passed": true/false }}
            HISTORY: {request.messages}
            """
            comp = groq_client.chat.completions.create(
                messages=[{"role":"user","content":eval_prompt}], 
                model="llama-3.3-70b-versatile"
            )
            content = re.sub(r'^```json\s*|```$', '', comp.choices[0].message.content.strip(), flags=re.MULTILINE).strip()
            result = json.loads(content)
            
            if result.get("passed"):
                save_memory(f"VERIFIED_MASTERY: {target_topic}")
                # NEW: update verified_skills in user record
                try:
                    mems2 = load_memories()
                    cname = next((m.split(": ")[1] for m in mems2 if "CANDIDATE_NAME" in m), None)
                    if cname:
                        user = load_user(_make_user_id(cname))
                        if user:
                            verified = user.get("verified_skills", [])
                            if target_topic not in verified:
                                verified.append(target_topic)
                            upsert_user(cname, verified_skills=verified)
                except Exception as e:
                    print(f"Verified skill save error (non-fatal): {e}")
            return result

        # --- PROGRESSIVE DIFFICULTY LOGIC ---
        if q_num <= 3:
            level = "Foundational/Easy (Syntax, definitions, core concepts)"
        elif q_num <= 9:
            level = "Application-based/Moderate (Scenario handling, common logic)"
        else:
            level = "Deep Logic/Hard (Optimization, edge cases, complex problem-solving)"

        # --- SYSTEM INSTRUCTIONS ---
        system_instr = (
            f"ROLE: Senior Technical Examiner conducting a SILENT CERTIFICATION TEST.\n"
            f"TOPIC: {target_topic}. CANDIDATE: {candidate_name}.\n"
            f"{syllabus_context}\n"
            f"STRICT EXAM RULES:\n"
            f"1. Address the candidate as {candidate_name}.\n"
            f"2. Ask exactly ONE question. This is Question {q_num} of 10.\n"
            f"3. DIFFICULTY: {level}.\n"
            f"4. Keep the question CONCISE — maximum 2 sentences.\n"
            f"5. Stay strictly professional. No pop-culture references.\n"
            f"6. CRITICAL — THIS IS AN EXAM: Do NOT give any feedback, hints, corrections, "
            f"praise, or commentary on the candidate's previous answer. "
            f"Immediately ask the next question without reacting to their response. "
            f"Silence on correctness is mandatory until the exam ends."
        )

        # FIX: Build messages list with system instruction + properly structured history
        # History is already in {"role": "user"/"assistant", "content": "..."} format from frontend
        messages = [{"role": "system", "content": system_instr}]
        for msg in request.messages:
            if isinstance(msg, dict) and msg.get('role') in ('user', 'assistant') and msg.get('content'):
                messages.append({"role": msg["role"], "content": msg["content"]})

        completion = groq_client.chat.completions.create(
            messages=messages, 
            model="llama-3.3-70b-versatile", 
            temperature=0.4
        )
        
        return {
            "text": completion.choices[0].message.content, 
            "q_num": q_num, 
            "is_complete": False,
            "candidate": candidate_name
        }
        
    except Exception as e:
        return {"text": f"Error: {str(e)}", "is_complete": False}

@app.post("/api/evolve-resume")
async def evolve_resume(resume: Annotated[UploadFile, File(...)]):
    """
    Reads the candidate's existing resume + all VERIFIED_MASTERY entries from memory,
    then uses the LLM to produce a structured JSON of resume edits.
    The frontend uses that JSON to generate the updated .docx via the Anthropic API.
    """
    try:
        resume_text = await extract_text_from_pdf(resume)
        mems = load_memories()

        candidate_name = next((m.split(": ")[1] for m in mems if "CANDIDATE_NAME" in m), "Candidate")
        mastered_skills = [m.replace("VERIFIED_MASTERY: ", "").strip() for m in mems if "VERIFIED_MASTERY" in m]

        if not mastered_skills:
            return {"error": "No verified skills found. Complete at least one certification exam first."}

        prompt = f"""
        You are an expert resume writer. Below is a candidate's current resume text and a list of skills they have recently been AI-certified in.

        CANDIDATE NAME: {candidate_name}
        RESUME TEXT:
        {resume_text[:5000]}

        NEWLY VERIFIED SKILLS (AI-certified, must be added):
        {json.dumps(mastered_skills)}

        TASK:
        Produce a complete, improved version of this resume with these changes:
        1. Add all verified skills to the Skills section (create one if it doesn't exist).
        2. For each verified skill, add ONE strong, quantified bullet point under the most relevant work experience entry.
        3. Add or update an "AI-Verified Certifications" section at the bottom listing each verified skill with the text "Certified via AI Proctored Exam".
        4. Keep everything else exactly the same — do not invent new jobs, degrees, or facts.
        5. Return the full resume content structured for a professional document.

        RETURN ONLY JSON in this exact format:
        {{
            "candidate_name": "...",
            "summary": "one paragraph professional summary (keep original if present, else write one)",
            "skills": ["skill1", "skill2", "...all skills including new ones"],
            "experience": [
                {{
                    "title": "Job Title",
                    "company": "Company Name",
                    "duration": "Start – End",
                    "bullets": ["bullet 1", "bullet 2", "..."]
                }}
            ],
            "education": [
                {{
                    "degree": "...",
                    "institution": "...",
                    "year": "..."
                }}
            ],
            "certifications": [
                {{
                    "name": "Skill Name",
                    "issuer": "AI Proctored Exam",
                    "year": "2025"
                }}
            ],
            "projects": [
                {{
                    "name": "...",
                    "description": "...",
                    "tech": ["..."]
                }}
            ]
        }}
        """

        comp = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.2,
        )
        raw = comp.choices[0].message.content.strip()
        clean_json = re.sub(r'^```json\s*|```$', '', raw, flags=re.MULTILINE).strip()
        resume_data = json.loads(clean_json)
        return {"resume_data": resume_data, "verified_skills": mastered_skills}

    except Exception as e:
        return {"error": str(e)}


@app.post("/api/generate-resume-docx")
async def generate_resume_pdf(request: Request):
    """
    Pure Python PDF generation using reportlab — fully synchronous,
    written to an in-memory BytesIO buffer, streamed directly back.
    No Node.js, no temp files, no race conditions, opens in any PDF viewer.
    """
    import io
    from fastapi.responses import StreamingResponse
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib.enums import TA_CENTER
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle

    try:
        body = await request.json()
        data = body.get("resume_data", {})

        # ── COLORS ────────────────────────────────────────────────────────
        INDIGO   = colors.HexColor('#4F46E5')
        AMBER    = colors.HexColor('#D97706')
        DARK     = colors.HexColor('#1E1B4B')
        GRAY     = colors.HexColor('#374151')
        LGRAY    = colors.HexColor('#6B7280')
        WHITE    = colors.white
        BG_CERT  = colors.HexColor('#FFFBEB')
        BG_BADGE = colors.HexColor('#D97706')
        BROWN    = colors.HexColor('#92400E')
        RULE_CLR = colors.HexColor('#E0E7FF')

        # ── STYLES ────────────────────────────────────────────────────────
        # All style names are unique to avoid reportlab's global style cache conflicts
        S = {
            'name':      ParagraphStyle('re_name',      fontName='Helvetica-Bold',    fontSize=26,  textColor=DARK,  alignment=TA_CENTER, spaceAfter=6),
            'body':      ParagraphStyle('re_body',      fontName='Helvetica',         fontSize=10,  textColor=GRAY,  spaceAfter=4,  leading=14),
            'italic':    ParagraphStyle('re_italic',    fontName='Helvetica-Oblique', fontSize=10,  textColor=GRAY,  spaceAfter=6,  leading=15),
            'bullet':    ParagraphStyle('re_bullet',    fontName='Helvetica',         fontSize=10,  textColor=GRAY,  spaceAfter=2,  leading=14, leftIndent=16),
            'job_title': ParagraphStyle('re_job_title', fontName='Helvetica-Bold',    fontSize=11,  textColor=DARK,  spaceAfter=1,  spaceBefore=10),
            'company':   ParagraphStyle('re_company',   fontName='Helvetica',         fontSize=9.5, textColor=LGRAY, spaceAfter=4),
            'cert_name': ParagraphStyle('re_cert_name', fontName='Helvetica-Bold',    fontSize=10,  textColor=BROWN, spaceAfter=1),
            'cert_sub':  ParagraphStyle('re_cert_sub',  fontName='Helvetica-Oblique', fontSize=8.5, textColor=AMBER, spaceAfter=0),
            'badge':     ParagraphStyle('re_badge',     fontName='Helvetica-Bold',    fontSize=8,   textColor=WHITE, alignment=TA_CENTER),
        }

        def sec(title, color=None):
            """Returns section heading + thin rule as a list of flowables."""
            c = color or INDIGO
            return [
                Spacer(1, 8),
                Paragraph(title.upper(), ParagraphStyle(
                    f're_sec_{title[:6]}', fontName='Helvetica-Bold', fontSize=9.5,
                    textColor=c, spaceBefore=4, spaceAfter=3,
                )),
                HRFlowable(width='100%', thickness=0.75, color=RULE_CLR, spaceAfter=6),
            ]

        def bul(text):
            # Use XML entity for bullet — avoids any Unicode encoding issue
            safe = str(text).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            return Paragraph(f'&#8226;  {safe}', S['bullet'])

        def safe(val, fallback=''):
            """Safely stringify any value from LLM JSON."""
            return str(val).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;') if val else fallback

        # ── BUILD STORY ───────────────────────────────────────────────────
        story = []

        # Name header
        story.append(Paragraph(safe(data.get('candidate_name'), 'Resume'), S['name']))
        story.append(HRFlowable(width='100%', thickness=2, color=INDIGO, spaceAfter=12))

        # Summary
        if data.get('summary'):
            story += sec('Professional Summary')
            story.append(Paragraph(safe(data['summary']), S['italic']))

        # Skills
        if data.get('skills'):
            story += sec('Skills')
            skills_txt = '  |  '.join(safe(s) for s in data['skills'])
            story.append(Paragraph(skills_txt, S['body']))

        # Work Experience
        if data.get('experience'):
            story += sec('Work Experience')
            for exp in data['experience']:
                story.append(Paragraph(safe(exp.get('title')), S['job_title']))
                story.append(Paragraph(
                    f"{safe(exp.get('company'))}  |  {safe(exp.get('duration'))}",
                    S['company']
                ))
                for b in (exp.get('bullets') or []):
                    story.append(bul(b))

        # AI-Verified Certifications — badge table rows
        if data.get('certifications'):
            story += sec('AI-Verified Certifications', AMBER)
            for cert in data['certifications']:
                cert_name = safe(cert.get('name'))
                issuer    = safe(cert.get('issuer'))
                year      = safe(cert.get('year'))
                tbl = Table(
                    [[
                        Paragraph('VERIFIED', S['badge']),
                        Paragraph(cert_name,  S['cert_name']),
                        Paragraph(f'{issuer}  |  {year}', S['cert_sub']),
                    ]],
                    colWidths=[0.8*inch, 4.2*inch, 2.25*inch]
                )
                tbl.setStyle(TableStyle([
                    ('BACKGROUND',    (0, 0), (0, 0),   BG_BADGE),
                    ('BACKGROUND',    (1, 0), (2, 0),   BG_CERT),
                    ('ALIGN',         (0, 0), (0, 0),   'CENTER'),
                    ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
                    ('TOPPADDING',    (0, 0), (-1, -1), 7),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
                    ('LEFTPADDING',   (0, 0), (-1, -1), 8),
                    ('RIGHTPADDING',  (0, 0), (-1, -1), 8),
                    ('BOX',           (0, 0), (-1, -1), 0.5, colors.HexColor('#FDE68A')),
                    ('LINEAFTER',     (0, 0), (0, 0),   0.5, colors.HexColor('#FDE68A')),
                    ('ROUNDEDCORNERS', [4]),
                ]))
                story.append(tbl)
                story.append(Spacer(1, 6))

        # Education
        if data.get('education'):
            story += sec('Education')
            for edu in data['education']:
                degree = safe(edu.get('degree'))
                inst   = safe(edu.get('institution'))
                yr     = safe(edu.get('year'))
                story.append(Paragraph(f'<b>{degree}</b>  |  {inst}  |  {yr}', S['body']))

        # Projects
        if data.get('projects'):
            story += sec('Projects')
            for proj in data['projects']:
                tech_parts = [safe(t) for t in (proj.get('tech') or [])]
                tech_str   = f'  [{", ".join(tech_parts)}]' if tech_parts else ''
                story.append(Paragraph(f'<b>{safe(proj.get("name"))}</b>{tech_str}', S['job_title']))
                if proj.get('description'):
                    story.append(Paragraph(safe(proj['description']), S['body']))

        # ── RENDER — synchronous, in-memory, no temp files ────────────────
        buf = io.BytesIO()
        pdf_doc = SimpleDocTemplate(
            buf, pagesize=letter,
            leftMargin=0.75*inch, rightMargin=0.75*inch,
            topMargin=0.75*inch,  bottomMargin=0.75*inch,
        )
        pdf_doc.build(story)
        buf.seek(0)

        filename = safe(data.get('candidate_name'), 'Resume').replace(' ', '_')
        return StreamingResponse(
            buf,
            media_type='application/pdf',
            headers={'Content-Disposition': f'attachment; filename="{filename}_Evolved_Resume.pdf"'}
        )

    except Exception as e:
        import traceback
        return {"error": str(e), "trace": traceback.format_exc()}


# ─────────────────────────────────────────────────────────────────────────────
# JOB RECOMMENDATION ENDPOINTS  (your logic — merged in, untouched)
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    """
    Upload a resume PDF for job recommendation.
    Stores resume text in memory and returns AI-generated skill tags.
    """
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(await file.read()))
        text = "".join([page.extract_text() for page in pdf_reader.pages])
        USER_RESUME_TEXT["content"] = text

        summary_prompt = f"Summarize this resume into 5 key technical tags. Commas only. Resume: {text[:2000]}"
        completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": summary_prompt}],
            model="llama-3.3-70b-versatile",
        )
        tags = completion.choices[0].message.content.split(",")
        return {"status": "success", "tags": [t.strip() for t in tags]}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/api/search-jobs")
async def search_jobs():
    """
    Search for live job listings based on the uploaded resume using Serper API.
    Requires /api/upload-resume to be called first.
    """
    if not USER_RESUME_TEXT["content"]:
        raise HTTPException(status_code=400, detail="Please upload a resume first.")

    # Generate search query based on resume
    resume_snippet = USER_RESUME_TEXT["content"][:800]
    query_prompt = f"Write a 4-word job role title for an internship based on this resume: {resume_snippet}. Return ONLY the job title, nothing else."

    query_completion = groq_client.chat.completions.create(
        messages=[{"role": "user", "content": query_prompt}],
        model="llama-3.3-70b-versatile",
    )
    search_query = query_completion.choices[0].message.content.strip().replace('"', '')
    print(f"Generated search query: {search_query}")  # debug log

    # Call Serper Jobs API  (jobs endpoint — not news)
    url = "https://google.serper.dev/search"
    payload = json.dumps({
        "q": f"{search_query} internship Bengaluru site:linkedin.com OR site:naukri.com OR site:internshala.com",
        "gl": "in",
        "hl": "en",
        "num": 10
    })
    headers = {'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json'}

    try:
        response = requests.post(url, headers=headers, data=payload)
        results = response.json()
        print(f"Serper raw response keys: {list(results.keys())}")  # debug log

        job_listings = []

        # Serper returns organic results for normal search
        for item in results.get("organic", [])[:6]:
            title = item.get("title", "")
            snippet = item.get("snippet", "")
            link = item.get("link", "")

            # Extract company name from title or snippet
            company = ""
            if " at " in title:
                company = title.split(" at ")[-1].strip()
            elif " - " in title:
                company = title.split(" - ")[-1].strip()
            else:
                company = snippet.split(".")[0].strip()

            job_listings.append({
                "title": title,
                "company": company,
                "link": link,
                "description": snippet
            })

        if not job_listings:
            print(f"No jobs found. Full Serper response: {results}")  # debug log

        return {"jobs": job_listings}
    except Exception as e:
        print(f"Serper API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.post("/api/match-job")
async def match_job(request: MatchRequest):
    """
    Deep-dive match analysis between the uploaded resume and a specific job description.
    Returns match percentage, missing skills, improvement advice, and a verdict.
    """
    if not USER_RESUME_TEXT["content"]:
        return {"error": "No resume found."}

    match_prompt = (
        "You are a Technical Recruiter. Compare Resume vs Job. "
        "Return ONLY JSON with keys: 'match_percentage' (int), 'missing_skills' (list), "
        "'improvement_advice' (string), 'verdict' (string)."
        f"\n\nRESUME: {USER_RESUME_TEXT['content'][:3000]}"
        f"\n\nJOB: {request.job_description}"
    )

    try:
        completion = groq_client.chat.completions.create(
            messages=[{"role": "system", "content": "Return valid JSON object only."},
                      {"role": "user", "content": match_prompt}],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"}
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        return {"error": "Analysis failed"}


# ─────────────────────────────────────────────────────────────────────────────
# AUTH ENDPOINTS  (friend's original — untouched)
# ─────────────────────────────────────────────────────────────────────────────

class AuthRequest(BaseModel):
    username: str
    password: str

@app.post("/api/signup")
def signup(req: AuthRequest):
    """
    Create a new account.
    Returns error if username is already taken.
    """
    username = req.username.strip()
    password = req.password.strip()

    if not username or len(username) < 2:
        return {"success": False, "error": "Username must be at least 2 characters."}
    if not password or len(password) < 4:
        return {"success": False, "error": "Password must be at least 4 characters."}

    user_id  = _make_user_id(username)
    existing = load_user(user_id)

    if existing:
        # Username already taken — tell user to pick another
        return {"success": False, "error": f"Username '{username}' is already taken. Please choose a different one."}

    # Create new user record with hashed password
    from datetime import datetime, timezone
    now  = datetime.now(timezone.utc).isoformat()
    user = {
        "id":              user_id,
        "name":            username,
        "password_hash":   _hash_password(password),
        "is_new":          True,
        "created_at":      now,
        "last_seen":       now,
        "resume_summary":  "",
        "gaps":            [],
        "verified_skills": [],
        "roadmap":         [],
    }
    save_user(user_id, user)

    # Don't return password hash to frontend — strip it out
    safe_user = {k: v for k, v in user.items() if k != "password_hash"}
    return {"success": True, "is_new": True, "user": safe_user}


@app.post("/api/login")
def login(req: AuthRequest):
    """
    Log in with username + password.
    Returns error if username not found or password is wrong.
    """
    username = req.username.strip()
    password = req.password.strip()

    if not username or not password:
        return {"success": False, "error": "Please enter both username and password."}

    user_id = _make_user_id(username)
    user    = load_user(user_id)

    if not user:
        return {"success": False, "error": f"No account found for '{username}'. Please sign up first."}

    if not _check_password(password, user.get("password_hash", "")):
        return {"success": False, "error": "Incorrect password. Please try again."}

    # Update last_seen
    from datetime import datetime, timezone
    user["last_seen"] = datetime.now(timezone.utc).isoformat()
    user["is_new"]    = False
    save_user(user_id, user)

    # Strip password hash before returning
    safe_user = {k: v for k, v in user.items() if k != "password_hash"}
    return {"success": True, "is_new": False, "user": safe_user}


@app.get("/api/user/{user_id}")
def get_user(user_id: str):
    """Load a specific user's full record by ID."""
    user = load_user(user_id)
    if not user:
        return {"exists": False, "user": None}
    safe_user = {k: v for k, v in user.items() if k != "password_hash"}
    return {"exists": True, "user": safe_user}


@app.get("/api/check-user")
def check_user(name: str):
    """
    Legacy endpoint kept for backward compatibility.
    New code should use /api/login instead.
    """
    if not name or not name.strip():
        return {"exists": False, "user": None}
    user_id = _make_user_id(name.strip())
    user    = load_user(user_id)
    if not user:
        return {"exists": False, "user": None}
    from datetime import datetime, timezone
    user["last_seen"] = datetime.now(timezone.utc).isoformat()
    user["is_new"]    = False
    save_user(user_id, user)
    safe_user = {k: v for k, v in user.items() if k != "password_hash"}
    return {"exists": True, "user": safe_user}


@app.get("/api/all-users")
def get_all_users():
    """List all stored users — useful for debugging. Strips password hashes."""
    store = _read_full_store()
    users = [
        {k: v for k, v in u.items() if k != "password_hash"}
        for u in store.get("users", {}).values()
    ]
    return {"users": users}

@app.get("/api/hindsight")
def get_hindsight():
    return {"memories": load_memories()}

@app.get("/")
def health_check():
    return {"status": "Backend Active"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)