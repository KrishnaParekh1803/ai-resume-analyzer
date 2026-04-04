# ============================================================================
# AI Resume Analyzer — Consolidated Backend (Single File)
# All services, models, and endpoints in one place.
# ============================================================================

import io
import re
import uvicorn

import PyPDF2
import docx
import spacy
from sentence_transformers import SentenceTransformer, util

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional


# ── SpaCy Model ──────────────────────────────────────────────────────────────
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    import spacy.cli
    spacy.cli.download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

# ── Sentence Transformer Model ──────────────────────────────────────────────
model = SentenceTransformer("all-MiniLM-L6-v2")


# ── Pydantic Models ─────────────────────────────────────────────────────────
class MatchResult(BaseModel):
    score: float
    matching_skills: List[str]
    missing_skills: List[str]
    suggestions: List[str]
    ats_score: float
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    companies: List[str] = []
    resume_skills: List[str] = []


# ── Text Extraction ─────────────────────────────────────────────────────────
def extract_text(file_bytes: bytes, filename: str) -> str:
    if filename.lower().endswith(".pdf"):
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        return "\n".join(
            page.extract_text() for page in reader.pages if page.extract_text()
        )
    elif filename.lower().endswith(".docx"):
        doc = docx.Document(io.BytesIO(file_bytes))
        return "\n".join(para.text for para in doc.paragraphs)
    else:
        try:
            return file_bytes.decode("utf-8")
        except Exception:
            return ""


# ── Entity / Skill Extraction (spaCy + regex) ───────────────────────────────
COMMON_SKILLS = [
    # Top Programming Languages
    "python", "java", "c++", "c#", "javascript", "typescript", "ruby", "php", "swift", "kotlin", "go", "rust", "r", "matlab", "scala", "dart", "perl", "bash", "powershell", "shell",
    
    # Frontend & UI
    "react", "angular", "vue", "svelte", "next.js", "nuxt", "html", "css", "tailwind", "sass", "less", "bootstrap", "material ui", "figma", "ui/ux", "webassembly", "jquery", "solid.js",
    
    # Backend & Frameworks
    "node", "express", "django", "flask", "fastapi", "spring boot", "laravel", "ruby on rails", "asp.net", "graphql", "rest api", "grpc", "nest.js", "socket.io",
    
    # Database & Data Stores
    "sql", "nosql", "mongodb", "postgresql", "mysql", "redis", "elasticsearch", "cassandra", "dynamodb", "firebase", "supabase", "oracle", "mariadb", "sqlite", "neo4j",
    
    # Cloud, DevOps & Infrastructure
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ansible", "jenkins", "github actions", "gitlab ci", "circleci", "prometheus", "grafana", "splunk", "nginx", "apache", "linux", "unix",
    
    # Machine Learning & Data Science
    "machine learning", "deep learning", "nlp", "computer vision", "pytorch", "tensorflow", "keras", "scikit-learn", "pandas", "numpy", "matplotlib", "seaborn", "apache spark", "hadoop", "databricks", "snowflake", "tableau", "power bi", "llms", "openai", "langchain",
    
    # Methodologies & Tools
    "agile", "scrum", "kanban", "jira", "git", "github", "gitlab", "bitbucket", "ci/cd", "microservices", "serverless", "tdd", "bdd",
    
    # General & Soft Skills (Often looked for in JDs)
    "leadership", "project management", "problem solving", "communication", "teamwork", "critical thinking", "mentoring", "public speaking", "strategy", "sales", "marketing", "seo"
]

def extract_entities(text: str) -> dict:
    doc = nlp(text)
    names = [ent.text for ent in doc.ents if ent.label_ == "PERSON"]
    companies = list({ent.text for ent in doc.ents if ent.label_ == "ORG"})

    text_lower = text.lower()
    found_skills = list({
        skill for skill in COMMON_SKILLS
        if re.search(r"\b" + re.escape(skill) + r"\b", text_lower)
    })

    emails = re.findall(r"[\w\.\-]+@[\w\.\-]+", text)
    phones = re.findall(r"\(?\d{3}\)?[\-.\s]?\d{3}[\-.\s]?\d{4}", text)

    return {
        "name": names[0] if names else None,
        "email": emails[0] if emails else None,
        "phone": phones[0] if phones else None,
        "companies": companies,
        "skills": found_skills,
    }


# ── Semantic Similarity ─────────────────────────────────────────────────────
def compute_similarity(text1: str, text2: str) -> float:
    e1 = model.encode(text1, convert_to_tensor=True)
    e2 = model.encode(text2, convert_to_tensor=True)
    score = util.cos_sim(e1, e2)[0][0].item()
    return round(max(0, score * 100), 2)


# ── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(title="AI Resume Analyzer API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "AI Resume Analyzer API v2 — visit /docs for Swagger UI"}


@app.post("/api/analyze", response_model=MatchResult)
async def analyze_resume(
    file: UploadFile = File(...),
    job_description: str = Form(...),
):
    try:
        contents = await file.read()
    except Exception:
        raise HTTPException(400, "Could not read the uploaded file bytes.")

    text = extract_text(contents, file.filename)
    if not text.strip():
        raise HTTPException(400, "Could not extract any text. Please ensure you are uploading a valid text-based PDF or DOCX (image-based or scanned PDFs are not supported yet).")

    entities = extract_entities(text)
    jd_entities = extract_entities(job_description)

    semantic_score = compute_similarity(text, job_description)

    resume_skills = set(entities["skills"])
    jd_skills = set(jd_entities["skills"])
    matching = sorted(resume_skills & jd_skills)
    missing = sorted(jd_skills - resume_skills)

    ats_score = min(100.0, 50.0 + len(matching) * 5 + semantic_score * 0.3)

    suggestions = []
    if missing:
        suggestions.append(f"Add these keywords to your resume: {', '.join(missing[:5])}.")
    if semantic_score < 50:
        suggestions.append(
            "Your resume doesn't closely align with this JD. "
            "Tailor your summary and experience sections."
        )
    if not entities["email"]:
        suggestions.append("Contact info seems missing — add a clear email address.")
    if semantic_score >= 50 and not missing:
        suggestions.append("Great match! Consider quantifying achievements for extra impact.")

    return MatchResult(
        score=semantic_score,
        matching_skills=matching,
        missing_skills=missing,
        suggestions=suggestions,
        ats_score=round(ats_score, 2),
        name=entities["name"],
        email=entities["email"],
        phone=entities["phone"],
        companies=entities["companies"],
        resume_skills=sorted(resume_skills),
    )


# ── Entry Point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
