import { useState, useRef } from "react";

const STEPS = ["Personal", "Education", "Experience", "Skills", "Preview"];

const initialForm = {
  name: "", email: "", phone: "", linkedin: "", university: "",
  major: "", gpa: "", gradYear: "", relevantCourses: "",
  experience: [{ title: "", company: "", dates: "", bullets: "" }],
  projects: [{ name: "", tech: "", description: "" }],
  skills: "", certifications: "", targetRole: ""
};

// Parse plain-text resume into structured sections for styled rendering
function parseResume(text) {
  const lines = text.split("\n");
  const sections = [];
  let current = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (current) current.items.push({ type: "spacer" });
      continue;
    }
    // ALL CAPS line = section header
    if (line === line.toUpperCase() && line.length > 2 && !/^[\d\W]+$/.test(line)) {
      if (current) sections.push(current);
      current = { header: line, items: [] };
    } else if (current) {
      const isBullet = line.startsWith("•") || line.startsWith("-") || line.startsWith("*");
      current.items.push({
        type: isBullet ? "bullet" : "text",
        content: isBullet ? line.replace(/^[•\-\*]\s*/, "") : line
      });
    } else {
      // Pre-header content (name/contact block)
      sections.push({ header: null, items: [{ type: "text", content: line }] });
    }
  }
  if (current) sections.push(current);
  return sections;
}

export default function App() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [resume, setResume] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [lastGenerated, setLastGenerated] = useState(null);
  const printRef = useRef(null);

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
    // Client-side rate limiting: 30 second cooldown
    if (lastGenerated && Date.now() - lastGenerated < 30000) {
      const remaining = Math.ceil((30000 - (Date.now() - lastGenerated)) / 1000);
      setError(`Please wait ${remaining} seconds before generating again.`);
      setStep(4);
      return;
    }

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
1. Header (name + contact) - put name on first line, contact info on second line
2. EDUCATION
3. RELEVANT EXPERIENCE (use strong action verbs, quantify achievements where possible)
4. PROJECTS
5. TECHNICAL SKILLS
6. CERTIFICATIONS (if any, otherwise omit this section)

Rules:
- Section headers must be in ALL CAPS on their own line
- Bullet points must start with • (bullet character)
- Use strong action verbs for all bullet points
- Tailor everything toward ${form.targetRole || "internship"} roles
- Make it compelling for a college student with limited experience
- Keep it to one page worth of content`;

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
      setLastGenerated(Date.now());
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

  const downloadPDF = () => {
    const printWindow = window.open("", "_blank");
    const resumeHTML = printRef.current?.innerHTML || "";
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${form.name || "Resume"} - Resume</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; color: #000; padding: 0.75in; }
            .resume-name { font-size: 18pt; font-weight: bold; text-align: center; margin-bottom: 4px; }
            .resume-contact { text-align: center; font-size: 10pt; margin-bottom: 16px; color: #333; }
            .resume-section-header { font-size: 11pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1.5px solid #000; padding-bottom: 2px; margin: 14px 0 6px; }
            .resume-text { margin: 2px 0; font-size: 10.5pt; }
            .resume-bullet { margin: 2px 0 2px 16px; font-size: 10.5pt; }
            .resume-bullet::before { content: "•"; margin-right: 6px; }
            @media print { body { padding: 0.5in; } }
          </style>
        </head>
        <body>${resumeHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const sections = resume ? parseResume(resume) : [];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", fontFamily: "'Inter', sans-serif" }}>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: fixed; top: 0; left: 0; width: 100%; padding: 0.75in; background: white; }
        }
      `}</style>

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
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</label>
                    <input style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
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
                {loading ? "Our AI is crafting a tailored internship resume for you..." : error ? "" : "Download as PDF or copy the text below."}
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
                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    <button onClick={downloadPDF}
                      style={{ flex: 1, background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                      ⬇️ Download PDF
                    </button>
                    <button onClick={copyToClipboard}
                      style={{ flex: 1, background: copied ? "#16a34a" : "#f3f4f6", color: copied ? "white" : "#374151", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                      {copied ? "✅ Copied!" : "📋 Copy Text"}
                    </button>
                    <button onClick={() => { setStep(0); setResume(""); setError(""); }}
                      style={{ background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                      🔄 Start Over
                    </button>
                  </div>

                  {/* Styled resume preview */}
                  <div id="print-area" ref={printRef}
                    style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: "32px 36px", fontFamily: "'Times New Roman', serif", fontSize: 13, lineHeight: 1.5, color: "#111" }}>
                    {sections.map((section, si) => (
                      <div key={si}>
                        {section.header === null ? (
                          // Name/contact header block
                          section.items.map((item, ii) => (
                            <div key={ii} style={{
                              textAlign: "center",
                              fontWeight: ii === 0 ? 700 : 400,
                              fontSize: ii === 0 ? 20 : 12,
                              color: ii === 0 ? "#111" : "#555",
                              marginBottom: ii === 0 ? 4 : 12,
                              fontFamily: ii === 0 ? "'Inter', sans-serif" : "inherit"
                            }}>
                              {item.content}
                            </div>
                          ))
                        ) : (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                              borderBottom: "1.5px solid #111",
                              paddingBottom: 3,
                              marginBottom: 6,
                              fontFamily: "'Inter', sans-serif",
                              color: "#111"
                            }}>
                              {section.header}
                            </div>
                            {section.items.map((item, ii) => {
                              if (item.type === "spacer") return <div key={ii} style={{ height: 4 }} />;
                              if (item.type === "bullet") return (
                                <div key={ii} style={{ display: "flex", gap: 8, marginBottom: 2, paddingLeft: 8 }}>
                                  <span style={{ flexShrink: 0, marginTop: 1 }}>•</span>
                                  <span>{item.content}</span>
                                </div>
                              );
                              return <div key={ii} style={{ marginBottom: 2 }}>{item.content}</div>;
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Regenerate option */}
                  <div style={{ textAlign: "center", marginTop: 16 }}>
                    <button onClick={generateResume}
                      style={{ background: "none", border: "none", color: "#6366f1", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>
                      🔁 Regenerate resume
                    </button>
                  </div>
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
