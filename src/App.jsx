import { useState, useRef } from "react";

const STEPS = ["Personal", "Education", "Experience", "Skills", "Preview"];

const COLOR_THEMES = [
  { name: "Navy", sidebar: "#1a365d", accent: "#2b6cb0", light: "#90cdf4" },
  { name: "Emerald", sidebar: "#064e3b", accent: "#059669", light: "#6ee7b7" },
  { name: "Burgundy", sidebar: "#4a1130", accent: "#be123c", light: "#fda4af" },
  { name: "Charcoal", sidebar: "#1f2937", accent: "#4b5563", light: "#d1d5db" },
  { name: "Purple", sidebar: "#3b0764", accent: "#7c3aed", light: "#c4b5fd" },
  { name: "Teal", sidebar: "#134e4a", accent: "#0d9488", light: "#5eead4" },
  { name: "Slate Blue", sidebar: "#1e3a5f", accent: "#3b82f6", light: "#93c5fd" },
  { name: "Rose", sidebar: "#4c0519", accent: "#e11d48", light: "#fecdd3" },
];

const FONT_OPTIONS = [
  { name: "Inter", value: "'Inter', sans-serif" },
  { name: "Georgia", value: "Georgia, serif" },
  { name: "Garamond", value: "'EB Garamond', Garamond, serif" },
  { name: "Roboto", value: "'Roboto', sans-serif" },
  { name: "Playfair", value: "'Playfair Display', serif" },
  { name: "Lato", value: "'Lato', sans-serif" },
  { name: "Merriweather", value: "'Merriweather', serif" },
  { name: "Open Sans", value: "'Open Sans', sans-serif" },
];

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

function generateDocxBlob(text, fontFamily) {
  const escaped = text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const lines = escaped.split("\n");
  let body = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { body += "<w:p/>"; continue; }
    const isHeader = (trimmed === trimmed.toUpperCase() && trimmed.length > 2 && /[A-Z]/.test(trimmed));
    if (isHeader) {
      body += '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="000000"/></w:pBdr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:t>' + trimmed + '</w:t></w:r></w:p>';
    } else if (/^[•\-\*]/.test(trimmed)) {
      const bullet = trimmed.replace(/^[•\-\*]\s*/, "");
      body += '<w:p><w:pPr><w:ind w:left="360"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>• ' + bullet + '</w:t></w:r></w:p>';
    } else {
      body += '<w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>' + trimmed + '</w:t></w:r></w:p>';
    }
  }
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:body>' + body + '</w:body></w:document>';
  const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '</Types>';
  const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>';
  return { xml, contentTypes, rels };
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
  const [themeIdx, setThemeIdx] = useState(0);
  const [fontIdx, setFontIdx] = useState(0);
  const printRef = useRef(null);
  const fileInputRef = useRef(null);

  const theme = COLOR_THEMES[themeIdx];
  const font = FONT_OPTIONS[fontIdx];

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
    if (file) { const reader = new FileReader(); reader.onloadend = () => setHeadshot(reader.result); reader.readAsDataURL(file); }
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
      "Skills: " + form.skills + "\nCertifications: " + form.certifications + "\n\n" +
      "IMPORTANT FORMATTING RULES:\n- First line must be the person's full name only\n- Second line must be contact info separated by |\n- Section headers must be ALL CAPS on their own line (EDUCATION, RELEVANT EXPERIENCE, PROJECTS, TECHNICAL SKILLS, CERTIFICATIONS)\n- Bullet points must start with the • bullet character\n- Use strong action verbs, quantify achievements\n- Tailor toward " + (form.targetRole || "internship") + " roles\n- Do NOT use markdown bold (**) or headers (#)\n- Keep to one page of content";
    try {
      const res = await fetch("/.netlify/functions/generate-resume", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate resume");
      setResume(data.content[0].text);
      setLastGenerated(Date.now());
    } catch (e) { setError(e.message || "Error generating resume."); setResume(""); }
    setLoading(false);
  };

  const copyToClipboard = () => { navigator.clipboard.writeText(resume); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const downloadPDF = () => {
    const pw = window.open("", "_blank");
    const html = printRef.current?.innerHTML || "";
    pw.document.write("<!DOCTYPE html><html><head><title>" + (form.name || "Resume") + "</title>" +
      "<link href='https://fonts.googleapis.com/css2?family=EB+Garamond&family=Inter&family=Lato&family=Merriweather&family=Open+Sans&family=Playfair+Display&family=Roboto&display=swap' rel='stylesheet'>" +
      "<style>*{margin:0;padding:0;box-sizing:border-box}@page{size:letter;margin:0}body{font-family:" + font.value + ";font-size:10pt;line-height:1.45;color:#1a202c;width:100%;min-height:100vh}.resume-wrap{display:flex;min-height:100vh;width:100%}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>" +
      "</head><body>" + html + "</body></html>");
    pw.document.close(); pw.focus();
    setTimeout(() => { pw.print(); pw.close(); }, 800);
  };

  const openInGoogleDocs = () => {
    const text = resume || "";
    const encoded = encodeURIComponent(text);
    window.open("https://docs.google.com/document/create?title=" + encodeURIComponent((form.name || "Resume") + " - Resume") + "&body=" + encoded, "_blank");
  };

  const downloadWord = () => {
    const text = resume || "";
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><style>body{font-family:" + font.value + ";font-size:11pt;line-height:1.5;color:#1a202c;margin:0.75in}</style></head><body>";
    const lines = text.split("\n");
    let body = "";
    for (const line of lines) {
      const t = line.trim();
      if (!t) { body += "<br/>"; continue; }
      const isH = (t === t.toUpperCase() && t.length > 2 && /[A-Z]/.test(t) && !/^[\d•\-\*\|]/.test(t));
      if (isH) body += "<h3 style='font-size:11pt;border-bottom:1.5px solid #333;padding-bottom:2px;margin:12px 0 4px;text-transform:uppercase;letter-spacing:0.05em'>" + t + "</h3>";
      else if (/^[•\-\*]/.test(t)) body += "<p style='margin:2px 0 2px 20px;font-size:10.5pt'>" + t + "</p>";
      else body += "<p style='margin:2px 0;font-size:10.5pt'>" + t + "</p>";
    }
    const blob = new Blob([header + body + "</body></html>"], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = (form.name || "Resume") + "_Resume.doc"; a.click();
    URL.revokeObjectURL(url);
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
            <button onClick={()=>fileInputRef.current?.click()} style={{background:theme.accent,color:"white",border:"none",borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>{headshot?"Change Photo":"Upload Photo"}</button>
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
            <input style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:14,outline:"none",boxSizing:"border-box"}} placeholder="Data Structures, Algorithms, Web Development" value={form.relevantCourses} onChange={e=>update("relevantCourses",e.target.value)} />
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
                <div key={field}><label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>{label}</label>
                <input style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:14,outline:"none",background:"white",boxSizing:"border-box"}} placeholder={ph} value={exp[field]} onChange={e=>updateExp(i,field,e.target.value)} /></div>
              ))}
            </div>
            <div style={{marginTop:12}}><label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>What did you do?</label>
            <textarea style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:14,outline:"none",background:"white",boxSizing:"border-box",resize:"vertical"}} rows={3} placeholder="Built REST APIs using Node.js, Reduced load time by 40%..." value={exp.bullets} onChange={e=>updateExp(i,"bullets",e.target.value)} /></div>
          </div>
        ))}
        <button onClick={()=>setForm(f=>({...f,experience:[...f.experience,{title:"",company:"",dates:"",bullets:""}]}))} style={{fontSize:13,color:"#6366f1",fontWeight:600,background:"none",border:"2px dashed #c7d2fe",borderRadius:8,padding:"8px 16px",cursor:"pointer",width:"100%",marginBottom:20}}>+ Add Another Experience</button>
        <div style={{borderTop:"1px solid #e5e7eb",paddingTop:20}}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>{"🚀"} Projects</div>
          {form.projects.map((proj,i)=>(
            <div key={i} style={{background:"#f0fdf4",borderRadius:12,padding:16,marginBottom:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <div><label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Project Name</label><input style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:14,outline:"none",background:"white",boxSizing:"border-box"}} placeholder="Personal Portfolio" value={proj.name} onChange={e=>updateProj(i,"name",e.target.value)} /></div>
                <div><label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Technologies</label><input style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:14,outline:"none",background:"white",boxSizing:"border-box"}} placeholder="React, Node.js" value={proj.tech} onChange={e=>updateProj(i,"tech",e.target.value)} /></div>
              </div>
              <div><label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Description</label><input style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:14,outline:"none",background:"white",boxSizing:"border-box"}} placeholder="Built a full-stack app..." value={proj.description} onChange={e=>updateProj(i,"description",e.target.value)} /></div>
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
          <div><label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Technical Skills</label><textarea style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:14,outline:"none",resize:"vertical",boxSizing:"border-box"}} rows={3} placeholder="Python, JavaScript, React, SQL..." value={form.skills} onChange={e=>update("skills",e.target.value)} /></div>
          <div><label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Certifications / Awards (optional)</label><input style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:14,outline:"none",boxSizing:"border-box"}} placeholder="AWS Cloud Practitioner, Dean's List" value={form.certifications} onChange={e=>update("certifications",e.target.value)} /></div>
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
    const sidebarStyle = {width:220,background:theme.sidebar,color:"#e2e8f0",padding:"28px 20px",flexShrink:0,fontFamily:font.value};
    const mainStyle = {flex:1,padding:"28px 28px 20px",background:"#fff",fontFamily:font.value};
    const sSectionTitle = {fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:theme.light,borderBottom:"1px solid rgba(255,255,255,0.15)",paddingBottom:4,margin:"16px 0 8px"};
    const sText = {fontSize:11,color:"#e2e8f0",marginBottom:3,lineHeight:1.4};
    const mSectionTitle = {fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:theme.sidebar,borderBottom:"2px solid " + theme.accent,paddingBottom:3,marginBottom:8,marginTop:16};
    const editable = {outline:"none",cursor:"text",borderBottom:"1px dashed transparent"};
    const editHover = "border-bottom-color: " + theme.accent;

    return (
      <div className="resume-wrap" style={{display:"flex",width:"100%",minHeight:792,background:"#fff",borderRadius:4,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.12)"}}>
        <style>{`[contenteditable]:hover{border-bottom:1px dashed ${theme.accent}!important}[contenteditable]:focus{border-bottom:1px solid ${theme.accent}!important;background:rgba(0,0,0,0.02)}`}</style>
        <div style={sidebarStyle}>
          {headshot && <img src={headshot} alt="Photo" style={{width:100,height:100,borderRadius:"50%",border:"3px solid rgba(255,255,255,0.3)",objectFit:"cover",display:"block",margin:"0 auto 16px"}} />}
          <div contentEditable suppressContentEditableWarning style={{...editable,fontSize:14,fontWeight:700,textAlign:"center",marginBottom:4,color:"#fff"}}>{form.name||"Your Name"}</div>
          <div contentEditable suppressContentEditableWarning style={{...editable,fontSize:10,textAlign:"center",color:theme.light,marginBottom:20,textTransform:"uppercase",letterSpacing:"0.08em"}}>{form.targetRole||"Intern"}</div>
          <div style={sSectionTitle}>Contact</div>
          {form.email && <div contentEditable suppressContentEditableWarning style={{...editable,...sText}}>{"✉️"} {form.email}</div>}
          {form.phone && <div contentEditable suppressContentEditableWarning style={{...editable,...sText}}>{"☎️"} {form.phone}</div>}
          {form.linkedin && <div contentEditable suppressContentEditableWarning style={{...editable,...sText}}>{"🔗"} {form.linkedin}</div>}
          <div style={sSectionTitle}>Education</div>
          <div contentEditable suppressContentEditableWarning style={{...editable,...sText,fontWeight:600,color:"#fff"}}>{form.university||"University"}</div>
          <div contentEditable suppressContentEditableWarning style={{...editable,...sText}}>{form.major||"Major"}</div>
          {form.gpa && <div contentEditable suppressContentEditableWarning style={{...editable,...sText}}>GPA: {form.gpa}</div>}
          <div contentEditable suppressContentEditableWarning style={{...editable,...sText,color:"#cbd5e0"}}>{form.gradYear||""}</div>
          {parsed.sidebar.map((section,si)=>(
            <div key={si}>
              <div contentEditable suppressContentEditableWarning style={{...editable,...sSectionTitle}}>{section.header}</div>
              {section.items.map((item,ii)=>(
                item.type==="bullet"
                  ? <div key={ii} contentEditable suppressContentEditableWarning style={{...editable,...sText,paddingLeft:10,position:"relative"}}><span style={{position:"absolute",left:0,color:theme.light}}>{"•"}</span>{item.content}</div>
                  : <div key={ii} contentEditable suppressContentEditableWarning style={{...editable,...sText}}>{item.content}</div>
              ))}
            </div>
          ))}
        </div>
        <div style={mainStyle}>
          <div contentEditable suppressContentEditableWarning style={{...editable,fontSize:28,fontWeight:800,color:theme.sidebar,marginBottom:2,letterSpacing:"-0.02em"}}>{form.name||"Your Name"}</div>
          <div contentEditable suppressContentEditableWarning style={{...editable,fontSize:11,color:"#718096",marginBottom:20}}>
            {[form.email,form.phone,form.linkedin].filter(Boolean).join(" | ")}
          </div>
          {parsed.main.map((section,si)=>(
            <div key={si} style={{marginBottom:14}}>
              <div contentEditable suppressContentEditableWarning style={{...editable,...mSectionTitle}}>{section.header}</div>
              {section.items.map((item,ii)=>(
                item.type==="bullet"
                  ? <div key={ii} contentEditable suppressContentEditableWarning style={{...editable,fontSize:12,color:"#2d3748",marginBottom:2,paddingLeft:14,position:"relative",lineHeight:1.45}}><span style={{position:"absolute",left:2,color:theme.accent}}>{"•"}</span>{item.content}</div>
                  : <div key={ii} contentEditable suppressContentEditableWarning style={{...editable,fontSize:12,marginBottom:2,color:"#2d3748",fontWeight:item.content.includes("|")||item.content.includes("–")?600:400}}>{item.content}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg, #667eea 0%, #764ba2 100%)",fontFamily:"'Inter', sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=EB+Garamond&family=Inter&family=Lato&family=Merriweather&family=Open+Sans&family=Playfair+Display&family=Roboto&display=swap" rel="stylesheet" />
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

        <div style={{background:"white",borderRadius:20,padding:step===4?24:32,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",maxWidth:step===4?900:800,margin:"0 auto"}}>
          {step < 4 && renderFormSteps()}

          {step === 4 && (
            <div>
              <h2 style={{fontSize:20,fontWeight:700,marginBottom:4}}>
                {loading?"⏳ Generating your resume...":error?"❌ Something went wrong":"✅ Your Resume is Ready!"}
              </h2>
              <p style={{color:"#6b7280",fontSize:14,marginBottom:16}}>
                {loading?"Our AI is crafting a tailored internship resume for you...":error?"":"Click any text on the resume to edit it directly."}
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
                  {/* CUSTOMIZATION TOOLBAR */}
                  <div style={{background:"#f8fafc",borderRadius:12,padding:16,marginBottom:16,border:"1px solid #e2e8f0"}}>
                    <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
                      <div>
                        <label style={{display:"block",fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Color Theme</label>
                        <div style={{display:"flex",gap:6}}>
                          {COLOR_THEMES.map((t,i)=>(
                            <button key={i} onClick={()=>setThemeIdx(i)} title={t.name} style={{width:28,height:28,borderRadius:"50%",background:t.sidebar,border:i===themeIdx?"3px solid "+t.accent:"3px solid transparent",cursor:"pointer",outline:i===themeIdx?"2px solid "+t.accent:"none",outlineOffset:2,transition:"all 0.2s"}} />
                          ))}
                        </div>
                      </div>
                      <div style={{borderLeft:"1px solid #e2e8f0",paddingLeft:20}}>
                        <label style={{display:"block",fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Font Family</label>
                        <select value={fontIdx} onChange={e=>setFontIdx(Number(e.target.value))} style={{border:"1px solid #e2e8f0",borderRadius:6,padding:"6px 10px",fontSize:13,fontFamily:font.value,background:"white",cursor:"pointer",minWidth:140}}>
                          {FONT_OPTIONS.map((f,i)=><option key={i} value={i} style={{fontFamily:f.value}}>{f.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
                    <button onClick={downloadPDF} style={{flex:1,minWidth:120,background:"linear-gradient(135deg, "+theme.accent+", "+theme.sidebar+")",color:"white",border:"none",borderRadius:8,padding:"10px 12px",fontSize:13,fontWeight:600,cursor:"pointer"}}>{"⬇️"} PDF</button>
                    <button onClick={downloadWord} style={{flex:1,minWidth:120,background:"#2563eb",color:"white",border:"none",borderRadius:8,padding:"10px 12px",fontSize:13,fontWeight:600,cursor:"pointer"}}>{"📄"} Word (.doc)</button>
                    <button onClick={openInGoogleDocs} style={{flex:1,minWidth:120,background:"#4285f4",color:"white",border:"none",borderRadius:8,padding:"10px 12px",fontSize:13,fontWeight:600,cursor:"pointer"}}>{"📁"} Google Docs</button>
                    <button onClick={copyToClipboard} style={{flex:1,minWidth:100,background:copied?"#16a34a":"#f3f4f6",color:copied?"white":"#374151",border:"none",borderRadius:8,padding:"10px 12px",fontSize:13,fontWeight:600,cursor:"pointer"}}>{copied?"✅ Copied!":"📋 Copy"}</button>
                    <button onClick={()=>{setStep(0);setResume("");setError("");}} style={{background:"#f3f4f6",color:"#374151",border:"none",borderRadius:8,padding:"10px 12px",fontSize:13,fontWeight:600,cursor:"pointer"}}>{"🔄"}</button>
                  </div>

                  <div style={{fontSize:11,color:"#9ca3af",marginBottom:10,textAlign:"center",fontStyle:"italic"}}>
                    {"✏️"} Click any text on the resume below to edit it directly
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
