import { useState, useRef } from "react";

const STEPS = ["Personal", "Education", "Experience", "Skills", "Preview"];

const ACCENT = "#2b6cb0";
const SIDEBAR_BG = "#1a365d";
const SIDEBAR_TEXT = "#e2e8f0";

const initialForm = {
  name: "", email: "", phone: "", linkedin: "", university: "",
  major: "", gpa: "", gradYear: "", relevantCourses: "",
  experience: [{ title: "", company: "", dates: "", bullets: "" }],
  projects: [{ name: "", tech: "", description: "" }],
  skills: "", certifications: "", targetRole: ""
};

function parseResumeStructured(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const sections = [];
  let current = null;
  for (const line of lines) {
    const clean = line.replace(/\*\*/g, "").replace(/^#+\s*/, "").replace(/^---+$/, "").trim();
    if (!clean) continue;
    const isHeader = (clean === clean.toUpperCase() && clean.length > 2 && /[A-Z]/.test(clean) && !/^[\d•\-\*\|]/.test(clean));
    if (isHeader) {
      if (current) sections.push(current);
      current = { header: clean, items: [] };
    } else if (current) {
      const isBullet = /^[•\-\*]\s/.test(clean);
      current.items.push({
        type: isBullet ? "bullet" : "text",
        content: isBullet ? clean.replace(/^[•\-\*]\s*/, "") : clean
      });
    }
  }
  if (current) sections.push(current);
  const sidebarKeys = ["TECHNICAL SKILLS", "SKILLS", "CERTIFICATIONS", "AWARDS", "CERTIFICATIONS & AWARDS", "LANGUAGES"];
  const sidebar = sections.filter(s => sidebarKeys.some(k => s.header.includes(k)));
  const main = sections.filter(s => !sidebarKeys.some(k => s.header.includes(k)));
  return { sidebar, main };
}

export default function App() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [resume, setResume] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [lastGenerated, setLastGenerated] = useState(null);
  const [headshot, setHeadshot] = useState(null);
  const printRef = useRef(null);
  const fileInputRef = useRef(null);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const updateExp = (i, field, value) => {
    const exp = [...form.experience]; exp[i] = { ...exp[i], [field]: value };
    setForm(f => ({ ...f, experience: exp }));
  };
  const updateProj = (i, field, value) => {
    const proj = [...form.projects]; proj[i] = { ...proj[i], [field]: value };
    setForm(f => ({ ...f, projects: proj }));
  };

  const handleHeadshotUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setHeadshot(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const generateResume = async () => {
    if (lastGenerated && Date.now() - lastGenerated < 30000) {
      const remaining = Math.ceil((30000 - (Date.now() - lastGenerated)) / 1000);
      setError("Please wait " + remaining + " seconds before generating again.");
      setStep(4); return;
    }
    setLoading(true); setError(""); setStep(4);
    const prompt = "You are an expert resume writer specializing in college student internship resumes. Generate a professional, ATS-optimized resume based on this info:\n\n" +
      "Name: " + form.name + "\n" +
      "Email: " + form.email + " | Phone: " + form.phone + " | LinkedIn: " + form.linkedin + "\n" +
      "University: " + form.university + " | Major: " + form.major + " | GPA: " + form.gpa + " | Expected Graduation: " + form.gradYear + "\n" +
      "Relevant Courses: " + form.relevantCourses + "\n" +
      "Target Role: " + form.targetRole + "\n\n" +
      "Experience:\n" + form.experience.map(e => "- " + e.title + " at " + e.company + " (" + e.dates + "): " + e.bullets).join("\n") + "\n\n" +
      "Projects:\n" + form.projects.map(p => "- " + p.name + " (" + p.tech + "): " + p.description).join("\n") + "\n\n" +
      "Skills: " + form.skills + "\n" +
      "Certifications: " + form.certifications + "\n\n" +
      "IMPORTANT FORMATTING RULES:\n" +
      "- First line must be the person's full name only\n" +
      "- Second line must be contact info separated by |\n" +
      "- Section headers must be ALL CAPS on their own line (EDUCATION, RELEVANT EXPERIENCE, PROJECTS, TECHNICAL SKILLS, CERTIFICATIONS)\n" +
      "- Bullet points must start with the • bullet character\n" +
      "- Use strong action verbs, quantify achievements\n" +
      "- Tailor toward " + (form.targetRole || "internship") + " roles\n" +
      "- Do NOT use markdown bold (**) or headers (#)\n" +
      "- Keep to one page of content";

    try {
      const res = await fetch("/.netlify/functions/generate-resume", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate resume");
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
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const downloadPDF = () => {
    const printWindow = window.open("", "_blank");
    const resumeHTML = printRef.current?.innerHTML || "";
    printWindow.document.write("<!DOCTYPE html><html><head><title>" + (form.name || "Resume") + " - Resume</title>" +
      "<style>" +
      "*{margin:0;padding:0;box-sizing:border-box}" +
      "@page{size:letter;margin:0}" +
      "body{font-family:'Segoe UI',Tahoma,sans-serif;font-size:10pt;line-height:1.45;color:#1a202c;width:100%;min-height:100vh}" +
      ".resume-wrap{display:flex;min-height:100vh;width:100%}" +
      "@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}" +
      "</style></head><body>" + resumeHTML + "</body></html>");
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 600);
  };

  const parsed = resume ? parseResumeStructured(resume) : null;

  const renderFormSteps = () => {
    if (step === 0) return (
      <div>
        <h2 style={{fontSize:20,fontWeight:700,marginBottom:4}}>{"👋"} Let's start with you</h2>
        <p style={{color:"#6b7280",fontSize:14,marginBottom:24}}>Basic contact information for your resume header.</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          {[["name","Full Name","Alex Johnson"],["email","Email","alex@university.edu"],
            ["phone","Phone","(555) 123-4567"],["linkedin","LinkedIn URL","linkedin.com/in/alexj"],
            ["targetRole","Target Internship Role","Software Engineering Intern"]
          ].map(([field,label,ph])=>(
            <div key={field} style={field==="targetRole"?{gridColumn:"1/-1"}:{}}>
              <label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>{label}</label>
              <input style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:14,outline:"none",boxSizing:"border-box"}} placeholder={ph} value={form[field]} onChange={e=>update(field,e.target.value)} />
            </div>
          ))}
        </div>
        <div style={{marginTop:24,padding:16,background:"#f9fafb",borderRadius:12,textAlign:"center"}}>
          <p style={{fontSize:13,fontWeight:600,color:"#374151",marginBottom:8}}>{"📷"} Profile Photo (Optional)</p>
          <p style={{fontSize:12,color:"#9ca3af",marginBottom:12}}>Add a headshot for a creative resume layout</p>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleHeadshotUpload} style={{display:"none"}} />
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
            {headshot && <img src={headshot} alt="Preview" style={{width:60,height:60,borderRadius:"50%",objectFit:"cover",border:"2px solid #e5e7eb"}} />}
            <button onClick={()=>fileInputRef.current?.click()} style={{background:ACCENT,color:"white",border:"none",borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
              {headshot ? "Change Photo" : "Upload Photo"}
            </button>
            {headshot && <button onClick={()=>setHeadshot(null)} style={{background:"#ef4444",color:"white",border:"none",borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Remove</button>}
          </div>
        </div>
      </div>
    );

    if (step === 1) return (
      <div>
        <h2 style={{fontSize:20,fontWeight:700,marginBottom:4}}>{"🎓"} Education</h2>
        <p style={{color:"#6b7280",fontSize:14,marginBottom:24}}>Your school and academic achievements.</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          {[["university","University","State University"],["major","Major / Degree","B.S. Computer Science"],
            ["gpa","GPA (optional)","3.7"],["gradYear","Expected Graduation","May 2026"]].map(([field,label,ph])=>(
            <div key={field}>
              <label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>{label}</label>
              <input style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:14,outline:"none",boxSizing:"border-box"}} placeholder={ph} value={form[field]} onChange={e=>update(field,e.target.value)} />
            </div>
          ))}
          <div style={{gridColumn:"1/-1"}}>
            <label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Relevant Coursework</label>
            <input style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:14,outline:"none",boxSizing:"border-box"}} placeholder="Data Structures, Algorithms, Web Development, Database Systems" value={form.relevantCourses} onChange={e=>update("relevantCourses",e.target.value)} />
          </div>
        </div>
      </div>
    );

    if (step === 2) return (
      <div>
        <h2 style={{fontSize:20,fontWeight:700,marginBottom:4}}>{"💼"} Experience & Projects</h2>
        <p style={{color:"#6b7280",fontSize:14,marginBottom:20}}>Jobs, internships, clubs — anything counts!</p>
        {form.experience.map((exp,i)=>(
          <div key={i} style={{background:"#f9fafb",borderRadius:12,padding:16,marginBottom:12}}>
            <div style={{fontWeight:600,fontSize:13,color:"#374151",marginBottom:12}}>Experience #{i+1}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[["title","Job Title","Software Developer Intern"],["company","Company/Org","Tech Startup"],["dates","Dates","Jun 2024 – Aug 2024"]].map(([field,label,ph])=>(
                <div key={field}>
                  <label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>{label}</label>
                  <input style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:14,outline:"none",background:"white",boxSizing:"border-box"}} placeholder={ph} value={exp[field]} onChange={e=>updateExp(i,field,e.target.value)} />
                </div>
              ))}
            </div>
            <div style={{marginTop:12}}>
              <label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>What did you do? (bullet points)</label>
              <textarea style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:14,outline:"none",background:"white",boxSizing:"border-box",resize:"vertical"}} rows={3} placeholder="Built REST APIs using Node.js, Reduced load time by 40%..." value={exp.bullets} onChange={e=>updateExp(i,"bullets",e.target.value)} />
            </div>
          </div>
        ))}
        <button onClick={()=>setForm(f=>({...f,experience:[...f.experience,{title:"",company:"",dates:"",bullets:""}]}))} style={{fontSize:13,color:"#6366f1",fontWeight:600,background:"none",border:"2px dashed #c7d2fe",borderRadius:8,padding:"8px 16px",cursor:"pointer",width:"100%",marginBottom:20}}>+ Add Another Experience</button>
        <div style={{borderTop:"1px solid #e5e7eb",paddingTop:20}}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>{"🚀"} Projects</div>
          {form.projects.map((proj,i)=>(
            <div key={i} style={{background:"#f0fdf4",borderRadius:12,padding:16,marginBottom:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <div><label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Project Name</label><input style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:14,outline:"none",background:"white",boxSizing:"border-box"}} placeholder="Personal Portfolio Website" value={proj.name} onChange={e=>updateProj(i,"name",e.target.value)} /></div>
                <div><label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Technologies Used</label><input style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:14,outline:"none",background:"white",boxSizing:"border-box"}} placeholder="React, Node.js, MongoDB" value={proj.tech} onChange={e=>updateProj(i,"tech",e.target.value)} /></div>
              </div>
              <div><label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Description</label><input style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:14,outline:"none",background:"white",boxSizing:"border-box"}} placeholder="Built a full-stack app with 500+ users..." value={proj.description} onChange={e=>updateProj(i,"description",e.target.value)} /></div>
            </div>
          ))}
          <button onClick={()=>setForm(f=>({...f,projects:[...f.projects,{name:"",tech:"",description:""}]}))} style={{fontSize:13,color:"#16a34a",fontWeight:600,background:"none",border:"2px dashed #bbf7d0",borderRadius:8,padding:"8px 16px",cursor:"pointer",width:"100%"}}>+ Add Another Project</button>
        </div>
      </div>
    );

    if (step === 3) return (
      <div>
        <h2 style={{fontSize:20,fontWeight:700,marginBottom:4}}>{"⚡"} Skills & Extras</h2>
        <p style={{color:"#6b7280",fontSize:14,marginBottom:24}}>Last step before your AI resume is generated!</p>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div><label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Technical Skills</label><textarea style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:14,outline:"none",resize:"vertical",boxSizing:"border-box"}} rows={3} placeholder="Python, JavaScript, React, SQL, Git, AWS, Figma, Excel..." value={form.skills} onChange={e=>update("skills",e.target.value)} /></div>
          <div><label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Certifications / Awards (optional)</label><input style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:14,outline:"none",boxSizing:"border-box"}} placeholder="AWS Cloud Practitioner, Dean's List, Hackathon Winner" value={form.certifications} onChange={e=>update("certifications",e.target.value)} /></div>
        </div>
        <div style={{background:"linear-gradient(135deg, #667eea20, #764ba220)",borderRadius:12,padding:16,marginTop:24,textAlign:"center"}}>
          <p style={{fontSize:14,color:"#374151",margin:0}}>{"🤖"} Ready to generate your AI-powered resume tailored for <strong>{form.targetRole||"internships"}</strong></p>
        </div>
      </div>
    );
    return null;
  };

  const renderStyledResume = () => {
    if (!parsed) return null;
    const sidebarStyle = {width:220,background:SIDEBAR_BG,color:SIDEBAR_TEXT,padding:"28px 20px",flexShrink:0};
    const mainStyle = {flex:1,padding:"28px 28px 20px",background:"#fff"};
    const sSectionTitle = {fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:"#90cdf4",borderBottom:"1px solid rgba(255,255,255,0.15)",paddingBottom:4,margin:"16px 0 8px"};
    const sText = {fontSize:11,color:"#e2e8f0",marginBottom:3,lineHeight:1.4};
    const mSectionTitle = {fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:SIDEBAR_BG,borderBottom:"2px solid " + ACCENT,paddingBottom:3,marginBottom:8,marginTop:16};

    return (
      <div className="resume-wrap" style={{display:"flex",width:"100%",minHeight:792,background:"#fff",borderRadius:4,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.12)"}}>
        <div style={sidebarStyle}>
          {headshot && <img src={headshot} alt="Photo" style={{width:100,height:100,borderRadius:"50%",border:"3px solid rgba(255,255,255,0.3)",objectFit:"cover",display:"block",margin:"0 auto 16px"}} />}
          <div style={{fontSize:14,fontWeight:700,textAlign:"center",marginBottom:4,color:"#fff"}}>{form.name||"Your Name"}</div>
          <div style={{fontSize:10,textAlign:"center",color:"#90cdf4",marginBottom:20,textTransform:"uppercase",letterSpacing:"0.08em"}}>{form.targetRole||"Intern"}</div>

          <div style={sSectionTitle}>Contact</div>
          {form.email && <div style={sText}>{"✉️"} {form.email}</div>}
          {form.phone && <div style={sText}>{"☎️"} {form.phone}</div>}
          {form.linkedin && <div style={sText}>{"🔗"} {form.linkedin}</div>}

          <div style={sSectionTitle}>Education</div>
          <div style={{...sText,fontWeight:600,color:"#fff"}}>{form.university||"University"}</div>
          <div style={sText}>{form.major||"Major"}</div>
          {form.gpa && <div style={sText}>GPA: {form.gpa}</div>}
          <div style={{...sText,color:"#cbd5e0"}}>{form.gradYear||""}</div>

          {parsed.sidebar.map((section,si)=>(
            <div key={si}>
              <div style={sSectionTitle}>{section.header}</div>
              {section.items.map((item,ii)=>(
                item.type==="bullet"
                  ? <div key={ii} style={{...sText,paddingLeft:10,position:"relative"}}><span style={{position:"absolute",left:0,color:"#90cdf4"}}>{"•"}</span>{item.content}</div>
                  : <div key={ii} style={sText}>{item.content}</div>
              ))}
            </div>
          ))}
        </div>

        <div style={mainStyle}>
          <div style={{fontSize:28,fontWeight:800,color:SIDEBAR_BG,marginBottom:2,letterSpacing:"-0.02em"}}>{form.name||"Your Name"}</div>
          <div style={{fontSize:11,color:"#718096",marginBottom:20}}>
            {[form.email,form.phone,form.linkedin].filter(Boolean).join(" | ")}
          </div>

          {parsed.main.map((section,si)=>(
            <div key={si} style={{marginBottom:14}}>
              <div style={mSectionTitle}>{section.header}</div>
              {section.items.map((item,ii)=>(
                item.type==="bullet"
                  ? <div key={ii} style={{fontSize:12,color:"#2d3748",marginBottom:2,paddingLeft:14,position:"relative",lineHeight:1.45}}><span style={{position:"absolute",left:2,color:ACCENT}}>{"•"}</span>{item.content}</div>
                  : <div key={ii} style={{fontSize:12,marginBottom:2,color:"#2d3748",fontWeight:item.content.includes("|")||item.content.includes("–")?600:400}}>{item.content}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg, #667eea 0%, #764ba2 100%)",fontFamily:"'Inter', sans-serif"}}>
      <div style={{background:"rgba(255,255,255,0.1)",backdropFilter:"blur(10px)",borderBottom:"1px solid rgba(255,255,255,0.2)"}}>
        <div style={{maxWidth:900,margin:"0 auto",padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <h1 style={{color:"white",fontSize:22,fontWeight:800,margin:0}}>{"🎓"} InternReady</h1>
            <p style={{color:"rgba(255,255,255,0.7)",fontSize:12,margin:0}}>AI Resume Builder for College Students</p>
          </div>
          <div style={{background:"rgba(255,255,255,0.2)",borderRadius:20,padding:"4px 12px"}}>
            <span style={{color:"white",fontSize:12,fontWeight:600}}>{"✨"} AI Powered</span>
          </div>
        </div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"32px 24px"}}>
        <div style={{display:"flex",gap:8,marginBottom:32}}>
          {STEPS.map((s,i)=>(
            <div key={i} style={{flex:1,textAlign:"center"}}>
              <div style={{height:4,borderRadius:2,marginBottom:6,background:i<=step?"white":"rgba(255,255,255,0.3)",transition:"background 0.3s"}} />
              <span style={{color:i<=step?"white":"rgba(255,255,255,0.5)",fontSize:11,fontWeight:600}}>{s}</span>
            </div>
          ))}
        </div>

        <div style={{background:"white",borderRadius:20,padding:step===4?24:32,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",maxWidth:step===4?880:800,margin:"0 auto"}}>
          {step < 4 && renderFormSteps()}

          {step === 4 && (
            <div>
              <h2 style={{fontSize:20,fontWeight:700,marginBottom:4}}>
                {loading?"⏳ Generating your resume...":error?"❌ Something went wrong":"✅ Your Resume is Ready!"}
              </h2>
              <p style={{color:"#6b7280",fontSize:14,marginBottom:20}}>
                {loading?"Our AI is crafting a tailored internship resume for you...":error?"":"Download as PDF or copy the text below."}
              </p>

              {loading ? (
                <div style={{textAlign:"center",padding:60}}>
                  <div style={{fontSize:48,marginBottom:16}}>{"✨"}</div>
                  <div style={{color:"#6366f1",fontWeight:600}}>AI is writing your resume...</div>
                  <div style={{color:"#9ca3af",fontSize:13,marginTop:8}}>Using action verbs, ATS keywords, and internship-focused formatting</div>
                </div>
              ) : error ? (
                <div style={{textAlign:"center",padding:40}}>
                  <div style={{fontSize:40,marginBottom:16}}>{"⚠️"}</div>
                  <p style={{color:"#dc2626",marginBottom:20}}>{error}</p>
                  <button onClick={()=>{setStep(3);setError("");}} style={{background:"#6366f1",color:"white",border:"none",borderRadius:8,padding:"10px 20px",fontSize:14,fontWeight:600,cursor:"pointer"}}>{"←"} Go Back & Try Again</button>
                </div>
              ) : (
                <>
                  <div style={{display:"flex",gap:8,marginBottom:20}}>
                    <button onClick={downloadPDF} style={{flex:1,background:"linear-gradient(135deg, " + ACCENT + ", " + SIDEBAR_BG + ")",color:"white",border:"none",borderRadius:8,padding:"10px 16px",fontSize:14,fontWeight:600,cursor:"pointer"}}>{"⬇️"} Download PDF</button>
                    <button onClick={copyToClipboard} style={{flex:1,background:copied?"#16a34a":"#f3f4f6",color:copied?"white":"#374151",border:"none",borderRadius:8,padding:"10px 16px",fontSize:14,fontWeight:600,cursor:"pointer"}}>{copied?"✅ Copied!":"📋 Copy Text"}</button>
                    <button onClick={()=>{setStep(0);setResume("");setError("");}} style={{background:"#f3f4f6",color:"#374151",border:"none",borderRadius:8,padding:"10px 16px",fontSize:14,fontWeight:600,cursor:"pointer"}}>{"🔄"} Start Over</button>
                  </div>
                  <div ref={printRef}>{renderStyledResume()}</div>
                  <div style={{textAlign:"center",marginTop:16}}>
                    <button onClick={generateResume} style={{background:"none",border:"none",color:"#6366f1",fontSize:13,fontWeight:600,cursor:"pointer",textDecoration:"underline"}}>{"🔁"} Regenerate resume</button>
                  </div>
                </>
              )}
            </div>
          )}

          {step < 4 && (
            <div style={{display:"flex",justifyContent:"space-between",marginTop:32,paddingTop:24,borderTop:"1px solid #f3f4f6"}}>
              <button onClick={()=>setStep(s=>Math.max(0,s-1))} disabled={step===0} style={{background:step===0?"#f3f4f6":"white",color:step===0?"#9ca3af":"#374151",border:"1px solid #e5e7eb",borderRadius:8,padding:"10px 20px",fontSize:14,fontWeight:600,cursor:step===0?"default":"pointer"}}>{"←"} Back</button>
              {step<3?(
                <button onClick={()=>setStep(s=>s+1)} style={{background:"linear-gradient(135deg, #667eea, #764ba2)",color:"white",border:"none",borderRadius:8,padding:"10px 24px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Next {"→"}</button>
              ):(
                <button onClick={generateResume} style={{background:"linear-gradient(135deg, #667eea, #764ba2)",color:"white",border:"none",borderRadius:8,padding:"10px 24px",fontSize:14,fontWeight:700,cursor:"pointer"}}>{"✨"} Generate My Resume</button>
              )}
            </div>
          )}
        </div>
        <p style={{textAlign:"center",color:"rgba(255,255,255,0.6)",fontSize:12,marginTop:20}}>Powered by Claude AI {"•"} Built for college students {"🎓"}</p>
      </div>
    </div>
  );
}
