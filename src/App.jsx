import { useState } from "react";

const STEPS = ["Personal", "Education", "Experience", "Skills", "Preview"];

const initialForm = {
  name: "", email: "", phone: "", linkedin: "", university: "",
  major: "", gpa: "", gradYear: "", relevantCourses: "",
  experience: [{ title: "", company: "", dates: "", bullets: "" }],
  projects: [{ name: "", tech: "", description: "" }],
  skills: "", certifications: "", targetRole: ""
};

export default function App() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [resume, setResume] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const updateExp = (i, field, value) => {
    const exp = [...form.experience];
    exp[i] = { ...exp[i], [field]: value };
    setForm(f => ({ ...f, experience: exp }));
  };

  const updateProj = (i, field, value) => {
    const proj = [...form.projects];
    proj[i] = { ...proj[i], [field]: value };
    setForm(f => ({ ...f, projects: proj }));
  };

  const generateResume = async () => {
    setLoading(true);
    setError("");
    setStep(4);

    const prompt = `You are an expert resume writer specializing in college student internship resumes.
Generate a professional, ATS-optimized resume for an internship application based on this info:

Name: ${form.name}
Email: ${form.email} | Phone: ${form.phone} | LinkedIn: ${form.linkedin}
University: ${form.university} | Major: ${form.major} | GPA: ${form.gpa} | Expected Graduation: ${form.gradYear}
Relevant Courses: ${form.relevantCourses}
Target Role: ${form.targetRole}

Experience:
${form.experience.map(e => `- ${e.title} at ${e.company} (${e.dates}): ${e.bullets}`).join("\n")}

Projects:
${form.projects.map(p => `- ${p.name} (${p.tech}): ${p.description}`).join("\n")}

Skills: ${form.skills}
Certifications: ${form.certifications}

Format as a clean, professional resume with these sections:
1. Header (name + contact)
2. Education
3. Relevant Experience (use strong action verbs, quantify achievements)
4. Projects
5. Technical Skills
6. Certifications (if any)

Use plain text formatting with clear section headers in ALL CAPS. Make bullet points start with strong action verbs. Tailor everything toward ${form.targetRole || "internship"} roles. Make it compelling for a college student with limited experience.`;

    try {
      const res = await fetch("/.netlify/functions/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }]
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate resume");
      }

      setResume(data.content[0].text);
    } catch (e) {
      setError(e.message || "Error generating resume. Please try again.");
      setResume("");
    }

    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(resume);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white";
  const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,255,255,0.2)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ color: "white", fontSize: 22, fontWeight: 800, margin: 0 }}>🎓 InternReady</h1>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, margin: 0 }}>AI Resume Builder for College Students</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 20, padding: "4px 12px" }}>
            <span style={{ color: "white", fontSize: 12, fontWeight: 600 }}>✨ AI Powered</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
        {/* Progress Bar */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center" }}>
              <div style={{
                height: 4, borderRadius: 2, marginBottom: 6,
                background: i <= step ? "white" : "rgba(255,255,255,0.3)",
                transition: "background 0.3s"
              }} />
              <span style={{ color: i <= step ? "white" : "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600 }}>{s}</span>
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: "white", borderRadius: 20, padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>

          {/* Step 0: Personal */}
          {step === 0 && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>👋 Let's start with you</h2>
              <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>Basic contact information for your resume header.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[["name","Full Name","Alex Johnson"],["email","Email","alex@university.edu"],
                  ["phone","Phone","(555) 123-4567"],["linkedin","LinkedIn URL","linkedin.com/in/alexj"],
                  ["targetRole","Target Internship Role","Software Engineering Intern"]
                ].map(([field, label, ph]) => (
                  <div key={field} style={field === "targetRole" ? { gridColumn: "1/-1" } : {}}>
                    <label className={labelClass} style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</label>
                    <input className={inputClass} style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                      placeholder={ph} value={form[field]} onChange={e => update(field, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Education */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>🎓 Education</h2>
              <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>Your school and academic achievements.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[["university","University","State University"],["major","Major / Degree","B.S. Computer Science"],
                  ["gpa","GPA (optional)","3.7"],["gradYear","Expected Graduation","May 2026"]].map(([field, label, ph]) => (
                  <div key={field}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</label>
                    <input style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                      placeholder={ph} value={form[field]} onChange={e => update(field, e.target.value)} />
                  </div>
                ))}
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Relevant Coursework</label>
                  <input style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                    placeholder="Data Structures, Algorithms, Web Development, Database Systems" value={form.relevantCourses} onChange={e => update("relevantCourses", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Experience */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>💼 Experience & Projects</h2>
              <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 20 }}>Jobs, internships, clubs — anything counts!</p>

              {form.experience.map((exp, i) => (
                <div key={i} style={{ background: "#f9fafb", borderRadius: 12, padding: 16, marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 12 }}>Experience #{i+1}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[["title","Job Title","Software Developer Intern"],["company","Company/Org","Tech Startup"],["dates","Dates","Jun 2024 – Aug 2024"]].map(([field, label, ph]) => (
                      <div key={field}>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</label>
                        <input style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", background: "white", boxSizing: "border-box" }}
                          placeholder={ph} value={exp[field]} onChange={e => updateExp(i, field, e.target.value)} />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>What did you do? (bullet points)</label>
                    <textarea style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", background: "white", boxSizing: "border-box", resize: "vertical" }}
                      rows={3} placeholder="Built REST APIs using Node.js, Reduced load time by 40%, Led team of 3 developers..."
                      value={exp.bullets} onChange={e => updateExp(i, "bullets", e.target.value)} />
                  </div>
                </div>
              ))}
              <button onClick={() => setForm(f => ({ ...f, experience: [...f.experience, { title: "", company: "", dates: "", bullets: "" }] }))}
                style={{ fontSize: 13, color: "#6366f1", fontWeight: 600, background: "none", border: "2px dashed #c7d2fe", borderRadius: 8, padding: "8px 16px", cursor: "pointer", width: "100%", marginBottom: 20 }}>
                + Add Another Experience
              </button>

              <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>🚀 Projects</div>
                {form.projects.map((proj, i) => (
                  <div key={i} style={{ background: "#f0fdf4", borderRadius: 12, padding: 16, marginBottom: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Project Name</label>
                        <input style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", background: "white", boxSizing: "border-box" }}
                          placeholder="Personal Portfolio Website" value={proj.name} onChange={e => updateProj(i, "name", e.target.value)} />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Technologies Used</label>
                        <input style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", background: "white", boxSizing: "border-box" }}
                          placeholder="React, Node.js, MongoDB" value={proj.tech} onChange={e => updateProj(i, "tech", e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Description</label>
                      <input style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", background: "white", boxSizing: "border-box" }}
                        placeholder="Built a full-stack app with 500+ users..." value={proj.description} onChange={e => updateProj(i, "description", e.target.value)} />
                    </div>
                  </div>
                ))}
                <button onClick={() => setForm(f => ({ ...f, projects: [...f.projects, { name: "", tech: "", description: "" }] }))}
                  style={{ fontSize: 13, color: "#16a34a", fontWeight: 600, background: "none", border: "2px dashed #bbf7d0", borderRadius: 8, padding: "8px 16px", cursor: "pointer", width: "100%" }}>
                  + Add Another Project
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Skills */}
          {step === 3 && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>⚡ Skills & Extras</h2>
              <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>Last step before your AI resume is generated!</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Technical Skills</label>
                  <textarea style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box" }}
                    rows={3} placeholder="Python, JavaScript, React, SQL, Git, AWS, Figma, Excel..."
                    value={form.skills} onChange={e => update("skills", e.target.value)} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Certifications / Awards (optional)</label>
                  <input style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                    placeholder="AWS Cloud Practitioner, Dean's List, Hackathon Winner" value={form.certifications} onChange={e => update("certifications", e.target.value)} />
                </div>
              </div>
              <div style={{ background: "linear-gradient(135deg, #667eea20, #764ba220)", borderRadius: 12, padding: 16, marginTop: 24, textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "#374151", margin: 0 }}>🤖 Ready to generate your AI-powered resume tailored for <strong>{form.targetRole || "internships"}</strong></p>
              </div>
            </div>
          )}

          {/* Step 4: Result */}
          {step === 4 && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                {loading ? "⏳ Generating your resume..." : error ? "❌ Something went wrong" : "✅ Your Resume is Ready!"}
              </h2>
              <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 20 }}>
                {loading ? "Our AI is crafting a tailored internship resume for you..." : error ? error : "Copy and paste into a Word doc or Google Docs to format."}
              </p>
              {loading ? (
                <div style={{ textAlign: "center", padding: 60 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
                  <div style={{ color: "#6366f1", fontWeight: 600 }}>AI is writing your resume...</div>
                  <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 8 }}>Using action verbs, ATS keywords, and internship-focused formatting</div>
                </div>
              ) : error ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
                  <p style={{ color: "#dc2626", marginBottom: 20 }}>{error}</p>
                  <button onClick={() => { setStep(3); setError(""); }}
                    style={{ background: "#6366f1", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                    ← Go Back & Try Again
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <button onClick={copyToClipboard}
                      style={{ flex: 1, background: copied ? "#16a34a" : "#6366f1", color: "white", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                      {copied ? "✅ Copied!" : "📋 Copy Resume"}
                    </button>
                    <button onClick={() => { setStep(0); setResume(""); setError(""); }}
                      style={{ background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                      🔄 Start Over
                    </button>
                  </div>
                  <pre style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "monospace", maxHeight: 500, overflow: "auto" }}>
                    {resume}
                  </pre>
                </>
              )}
            </div>
          )}

          {/* Navigation */}
          {step < 4 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32, paddingTop: 24, borderTop: "1px solid #f3f4f6" }}>
              <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
                style={{ background: step === 0 ? "#f3f4f6" : "white", color: step === 0 ? "#9ca3af" : "#374151", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: step === 0 ? "default" : "pointer" }}>
                ← Back
              </button>
              {step < 3 ? (
                <button onClick={() => setStep(s => s + 1)}
                  style={{ background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  Next →
                </button>
              ) : (
                <button onClick={generateResume}
                  style={{ background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  ✨ Generate My Resume
                </button>
              )}
            </div>
          )}
        </div>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 20 }}>
          Powered by Claude AI • Built for college students 🎓
        </p>
      </div>
    </div>
  );
}
