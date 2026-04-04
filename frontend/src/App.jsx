import { useState, useRef, useEffect } from 'react';
import './index.css';

/* ═══════════════════════════════════════════════════════════════════════════
   AI Resume Analyzer — Single-File React Frontend (Premium UI)
   ═══════════════════════════════════════════════════════════════════════════ */

// ── SVG Icons (no external dependency needed) ──────────────────────────────
const Icon = ({ d, className = "w-5 h-5", stroke = true }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    fill={stroke ? "none" : "currentColor"} stroke={stroke ? "currentColor" : "none"}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={d} />
  </svg>
);
const UploadIcon = (p) => <Icon {...p} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />;
const CheckIcon = (p) => <Icon {...p} d="M20 6L9 17l-5-5" />;
const XIcon = (p) => <Icon {...p} d="M18 6L6 18M6 6l12 12" />;
const SparkleIcon = (p) => <Icon {...p} d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />;
const ArrowLeftIcon = (p) => <Icon {...p} d="M19 12H5M12 19l-7-7 7-7" />;
const LoaderIcon = ({ className }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);


// ── Score Ring Component ───────────────────────────────────────────────────
function ScoreRing({ value, size = 140, strokeW = 10, color, label }) {
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle cx={center} cy={center} r={r} stroke="#1e293b" strokeWidth={strokeW} fill="none" />
          <circle cx={center} cy={center} r={r} stroke={color} strokeWidth={strokeW} fill="none"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.33,1,0.68,1)' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-white">{value}%</span>
        </div>
      </div>
      <span className="text-xs font-medium tracking-wider uppercase text-slate-400">{label}</span>
    </div>
  );
}


// ── Skill Badge Component ──────────────────────────────────────────────────
function Badge({ text, variant = "green" }) {
  const colors = {
    green: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
    red: "bg-red-500/10 border-red-500/25 text-red-400",
    blue: "bg-sky-500/10 border-sky-500/25 text-sky-400",
  };
  return (
    <span className={`inline-block px-3 py-1.5 text-xs font-semibold rounded-full border ${colors[variant]} transition-transform hover:scale-105`}>
      {text}
    </span>
  );
}


// ══════════════════════════════════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  // ── handlers ──
  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type === "application/pdf" || f.name.endsWith(".docx")) {
      setFile(f); setError("");
    } else {
      setError("Only PDF or DOCX files are accepted."); setFile(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      fileRef.current.files = e.dataTransfer.files;
      handleFile({ target: { files: e.dataTransfer.files } });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError("Upload your resume first."); return; }
    if (!jobDescription.trim()) { setError("Paste a job description."); return; }

    setIsLoading(true); setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("job_description", jobDescription);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/analyze`, { method: "POST", body: fd });
      if (!res.ok) {
        const errorText = await res.text();
        let errorMsg = `Server Error (${res.status})`;
        try {
          const errJson = JSON.parse(errorText);
          errorMsg = errJson.detail || errorMsg;
        } catch(e) {
          errorMsg = errorText || errorMsg;
        }
        throw new Error(errorMsg);
      }
      setResults(await res.json());
    } catch (err) {
      setError(`Analysis failed: ${err.message}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => { setResults(null); setFile(null); setJobDescription(""); };

  // ── render ──
  return (
    <div className="aurora-bg min-h-screen w-full flex flex-col items-center justify-center relative text-slate-100">
      {/* Decorative glow orbs */}
      <div className="glow-orb fixed top-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="glow-orb fixed bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" style={{ animationDelay: '2s' }} />
      <div className="glow-orb fixed top-[40%] right-[20%] w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" style={{ animationDelay: '4s' }} />

      <div className="relative z-10 w-full max-w-6xl px-4 py-10 md:py-16 flex flex-col items-center justify-center">
        
        {/* ── Header ── */}
        <header className="text-center mb-12 animate-float-up print:hidden">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full border border-slate-700/50 bg-slate-800/40 backdrop-blur-md text-xs font-medium text-slate-400">
            <SparkleIcon className="w-3.5 h-3.5 text-violet-400" />
            Powered by SpaCy &amp; Sentence Transformers
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight bg-gradient-to-br from-white via-blue-200 to-violet-400 bg-clip-text text-transparent leading-tight">
            Resume Analyzer
          </h1>
          <p className="mt-4 text-base md:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
            Upload your resume &amp; paste a job description — get instant ATS scoring, skill gap analysis, and AI-powered suggestions.
          </p>
        </header>

        {/* ── Content ── */}
        {!results ? (
          /* ════════ Upload Form ════════ */
          <form onSubmit={handleSubmit} className="w-full animate-float-up delay-200">
            {error && (
              <div className="mb-6 glass rounded-xl px-5 py-3 border-red-500/30 text-red-400 text-sm flex items-center gap-3">
                <XIcon className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-8 w-full">
              {/* File Upload */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold">1</span>
                  Upload Resume
                </label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current.click()}
                  className={`glass flex-1 flex flex-col items-center justify-center rounded-2xl cursor-pointer transition-all duration-300 min-h-[350px] group
                    ${file
                      ? 'border-emerald-500/30 shadow-emerald-500/5 shadow-lg'
                      : 'hover:border-blue-500/30 hover:shadow-blue-500/5 hover:shadow-lg'}`}
                >
                  {file ? (
                    <div className="flex flex-col items-center gap-3 p-6 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                        <CheckIcon className="w-8 h-8 text-emerald-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-200 max-w-[200px] truncate">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 p-6 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                        <UploadIcon className="w-8 h-8 text-blue-400" />
                      </div>
                      <p className="text-sm text-slate-300"><span className="font-semibold text-blue-400">Click to upload</span> or drag &amp; drop</p>
                      <p className="text-xs text-slate-500">PDF or DOCX • Max 10 MB</p>
                    </div>
                  )}
                  <input ref={fileRef} type="file" className="hidden"
                    accept=".pdf,.docx" onChange={handleFile} />
                </div>
              </div>

              {/* Job Description */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold">2</span>
                  Paste Job Description
                </label>
                <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full job requirements, responsibilities, and qualifications here..."
                  className="glass flex-1 rounded-2xl p-5 text-sm text-slate-300 placeholder-slate-600 resize-none min-h-[350px] focus:outline-none hover:border-violet-500/30 hover:shadow-violet-500/5 hover:shadow-lg focus:border-violet-500/40 focus:shadow-violet-500/5 focus:shadow-lg transition-all" />
              </div>
            </div>

            <div className="flex justify-center">
              <button type="submit"
                disabled={isLoading || !file || !jobDescription.trim()}
                className="btn-shimmer px-10 py-4 rounded-2xl text-base font-bold text-white shadow-xl shadow-blue-500/10 hover:shadow-blue-500/25 transition-shadow disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-3">
                {isLoading
                  ? <><LoaderIcon className="w-5 h-5" /> Analyzing...</>
                  : <><SparkleIcon className="w-5 h-5" /> Analyze Match</>}
              </button>
            </div>
          </form>
        ) : (
          /* ════════ Results Dashboard ════════ */
          <div className="w-full space-y-8">
            <div className="flex items-center justify-between animate-float-up print:hidden">
              <button onClick={reset}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group">
                <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                New Analysis
              </button>
              <button onClick={() => window.print()}
                className="flex items-center gap-2 text-sm bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg font-medium shadow-lg transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Download Report
              </button>
            </div>

            {/* ── Extracted Contact Info ── */}
            {(results.name || results.email) && (
              <div className="glass rounded-2xl p-5 animate-float-up delay-100 flex flex-wrap items-center gap-6 text-sm">
                {results.name && <span className="text-white font-semibold text-base">{results.name}</span>}
                {results.email && <span className="text-slate-400">{results.email}</span>}
                {results.phone && <span className="text-slate-400">{results.phone}</span>}
                {results.companies?.length > 0 && (
                  <span className="text-slate-500">Orgs: {results.companies.join(', ')}</span>
                )}
              </div>
            )}

            {/* ── Score Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-float-up delay-200">
              {/* Semantic Score */}
              <div className="glass rounded-2xl p-8 flex flex-col items-center relative overflow-hidden">
                <div className="absolute -top-16 -right-16 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
                <ScoreRing value={results.score} color={results.score > 70 ? '#10b981' : results.score > 45 ? '#f59e0b' : '#ef4444'} label="Semantic Match" />
                <p className="mt-4 text-xs text-center text-slate-500 max-w-[200px]">
                  {results.score > 70 ? 'Strong alignment with the job description.' :
                   results.score > 45 ? 'Moderate match — tailor your experience.' :
                   'Low match — consider significant revisions.'}
                </p>
              </div>

              {/* ATS Score */}
              <div className="glass rounded-2xl p-8 flex flex-col items-center relative overflow-hidden">
                <div className="absolute -top-16 -left-16 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl" />
                <ScoreRing value={results.ats_score} color="#a78bfa" label="ATS Score" />
                <p className="mt-4 text-xs text-center text-slate-500 max-w-[200px]">
                  Keyword density &amp; formatting assessment.
                </p>
              </div>

              {/* Quick Stats */}
              <div className="glass rounded-2xl p-8 flex flex-col justify-center gap-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Skills Found</span>
                  <span className="text-2xl font-bold text-sky-400">{results.resume_skills?.length || 0}</span>
                </div>
                <div className="h-px bg-slate-700/50" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Matched</span>
                  <span className="text-2xl font-bold text-emerald-400">{results.matching_skills.length}</span>
                </div>
                <div className="h-px bg-slate-700/50" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Missing</span>
                  <span className="text-2xl font-bold text-red-400">{results.missing_skills.length}</span>
                </div>
              </div>
            </div>

            {/* ── Skills ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-float-up delay-300">
              <div className="glass rounded-2xl p-6">
                <h3 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-400" /> Matching Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {results.matching_skills.length > 0
                    ? results.matching_skills.map((s, i) => <Badge key={i} text={s} variant="green" />)
                    : <p className="text-slate-500 text-sm">No exact keyword overlap detected.</p>}
                </div>
              </div>

              <div className="glass rounded-2xl p-6">
                <h3 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <XIcon className="w-4 h-4 text-red-400" /> Missing Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {results.missing_skills.length > 0
                    ? results.missing_skills.map((s, i) => <Badge key={i} text={s} variant="red" />)
                    : <p className="text-slate-500 text-sm">You cover all the key skills mentioned!</p>}
                </div>
              </div>
            </div>

            {/* ── All Resume Skills ── */}
            {results.resume_skills?.length > 0 && (
              <div className="glass rounded-2xl p-6 animate-float-up delay-300">
                <h3 className="text-base font-semibold text-slate-200 mb-4">All Detected Resume Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {results.resume_skills.map((s, i) => <Badge key={i} text={s} variant="blue" />)}
                </div>
              </div>
            )}

            {/* ── Suggestions ── */}
            <div className="glass rounded-2xl p-6 animate-float-up delay-400">
              <h3 className="text-base font-semibold text-slate-200 mb-5 flex items-center gap-2">
                <SparkleIcon className="w-4 h-4 text-violet-400" /> AI Recommendations
              </h3>
              <ul className="space-y-3">
                {results.suggestions.length > 0
                  ? results.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-3 bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
                      <div className="mt-0.5 bg-violet-500/15 p-1.5 rounded-lg flex-shrink-0">
                        <SparkleIcon className="w-3.5 h-3.5 text-violet-400" />
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">{s}</p>
                    </li>
                  ))
                  : <p className="text-slate-500 text-sm">Your resume looks great — no suggestions needed!</p>}
              </ul>
            </div>
          </div>
        )}

        {/* Developer Credit */}
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-full glass text-xs text-slate-400 flex items-center gap-3 print:hidden">
          <span>Built by <span className="text-violet-400 font-semibold">Krishna Parekh</span></span>
          <div className="w-px h-3 bg-slate-700"></div>
          <a href="https://github.com/KrishnaParekh1803" target="_blank" rel="noreferrer" className="hover:text-white transition-colors" title="GitHub">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          </a>
          <a href="https://www.linkedin.com/in/krishna-parekh1803" target="_blank" rel="noreferrer" className="hover:text-blue-400 transition-colors" title="LinkedIn">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
          </a>
        </div>
      </div>
    </div>
  );
}
