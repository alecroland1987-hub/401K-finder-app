import { useState, useCallback, useEffect } from "react";

const INDUSTRIES = [
  { label: "All Industries", value: "" },
  { label: "Tech & Software", value: "technology software SaaS" },
  { label: "Healthcare & Medical", value: "healthcare medical dental" },
  { label: "Construction", value: "construction contractor" },
  { label: "Retail & E-Commerce", value: "retail ecommerce" },
  { label: "Professional Services", value: "consulting law accounting" },
  { label: "Manufacturing", value: "manufacturing" },
  { label: "Hospitality & Food", value: "restaurant hospitality food" },
];

const SIZE_RANGES = [
  { label: "Any Size", value: "" },
  { label: "5–20 employees", value: "5 to 20 employees" },
  { label: "20–50 employees", value: "20 to 50 employees" },
  { label: "50–100 employees", value: "50 to 100 employees" },
  { label: "100–250 employees", value: "100 to 250 employees" },
  { label: "250–500 employees", value: "250 to 500 employees" },
];

const TRIGGERS = [
  { id: "hiring",     label: "Rapid Hiring",        desc: "Headcount growth" },
  { id: "funding",    label: "New Funding",          desc: "Seed / Series A–B" },
  { id: "leadership", label: "Leadership Change",    desc: "New CFO or HR hire" },
  { id: "no401k",     label: "No 401k Detected",     desc: "Missing from job posts" },
  { id: "weak401k",   label: "Weak Existing Plan",   desc: "Low participation / fees" },
  { id: "expansion",  label: "Geographic Expansion", desc: "New offices / multi-state" },
  { id: "payroll",    label: "Payroll Change",       desc: "Switching systems" },
  { id: "compliance", label: "Compliance Risk",      desc: "Form 5500 flags" },
];

const STATUS_OPTIONS = ["Uncontacted", "Contacted", "Progressing"];
const STATUS_META = {
  Uncontacted: { color: "#94a3b8", bg: "#f8fafc", border: "#e2e8f0" },
  Contacted:   { color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  Progressing: { color: "#059669", bg: "#f0fdf4", border: "#a7f3d0" },
};

function useLocalStorage(key, init) {
  const [val, setVal] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? init; } catch { return init; }
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(val)); }, [key, val]);
  return [val, setVal];
}

function ScoreRing({ score }) {
  const size = 54, r = 21, circ = 2 * Math.PI * r;
  const pct = (score / 100) * circ;
  const color = score >= 75 ? "#059669" : score >= 50 ? "#d97706" : "#94a3b8";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="4" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${pct} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s ease" }} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="12" fontWeight="700"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px`, fontFamily: "inherit" }}>
        {score}
      </text>
    </svg>
  );
}

function SubBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "11px", color: "#94a3b8", letterSpacing: "0.04em" }}>{label}</span>
        <span style={{ fontSize: "11px", fontWeight: 600, color }}>{value}<span style={{ color: "#cbd5e1", fontWeight: 400 }}>/25</span></span>
      </div>
      <div style={{ height: "3px", background: "#f1f5f9", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(value / 25) * 100}%`, background: color, borderRadius: "2px", transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

function TriggerCheck({ trigger, checked, onChange }) {
  return (
    <button onClick={() => onChange(trigger.id)} style={{
      display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px",
      borderRadius: "8px", border: `1px solid ${checked ? "#5eadd4" : "#e2e8f0"}`,
      background: checked ? "#eef7fc" : "#fafafa",
      cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.15s",
    }}>
      <div style={{
        width: "14px", height: "14px", borderRadius: "4px", flexShrink: 0,
        border: `1.5px solid ${checked ? "#5eadd4" : "#cbd5e1"}`,
        background: checked ? "#5eadd4" : "white",
        display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
      }}>
        {checked && <span style={{ color: "#fff", fontSize: "9px", fontWeight: 700, lineHeight: 1 }}>✓</span>}
      </div>
      <div>
        <div style={{ fontSize: "11.5px", fontWeight: 600, color: checked ? "#1e4f6e" : "#64748b", lineHeight: 1.2 }}>{trigger.label}</div>
        <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "1px" }}>{trigger.desc}</div>
      </div>
    </button>
  );
}

function LeadCard({ prospect, saved, onSave, onUnsave, onStatusChange, index }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("why");
  const [pushMsg, setPushMsg] = useState(null);

  const confColor = { High: "#059669", Medium: "#d97706", Low: "#94a3b8" }[prospect.confidence] || "#94a3b8";
  const has401kColor = { No: "#dc2626", Yes: "#94a3b8", Unknown: "#cbd5e1" }[prospect.has401k] || "#cbd5e1";
  const statusM = saved ? STATUS_META[saved.status] : null;

  const pushToRedtail = async () => {
    const key = localStorage.getItem("redtail_api_key");
    if (!key) { setPushMsg("nokey"); return; }
    setPushMsg("loading");
    try {
      const res = await fetch("https://smf.redtailtechnology.com/api/public/v1/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Basic ${btoa(key + ":")}`, "UserKey": key },
        body: JSON.stringify({
          type: "Business", company_name: prospect.companyName, source: "ProspectIQ", category: "Prospect",
          note: `Score: ${prospect.opportunityScore}/100\n\n${prospect.whyThisCompany}\n\nEmail:\n${prospect.emailDraft}`,
        }),
      });
      setPushMsg(res.ok ? "ok" : "err");
    } catch { setPushMsg("err"); }
  };

  const exportCSV = () => {
    const h = "Company,Industry,Location,Employees,Score,Confidence,401k,Why,Email,Call";
    const r = [prospect.companyName, prospect.industry, prospect.location, prospect.estimatedEmployees,
      prospect.opportunityScore, prospect.confidence, prospect.has401k,
      (prospect.whyThisCompany||"").replace(/,/g,";"),
      (prospect.emailDraft||"").replace(/,/g,";"),
      (prospect.callOpener||"").replace(/,/g,";"),
    ].map(v=>`"${v||""}"`).join(",");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([h+"\n"+r],{type:"text/csv"}));
    a.download = `${(prospect.companyName||"lead").replace(/\s/g,"_")}.csv`;
    a.click();
  };

  return (
    <div style={{
      borderRadius: "12px", overflow: "hidden",
      border: saved ? `1px solid ${statusM.border}` : "1px solid #e8eef4",
      background: "#ffffff",
      boxShadow: open ? "0 8px 32px rgba(0,0,0,0.08)" : "0 2px 8px rgba(0,0,0,0.04)",
      transition: "box-shadow 0.3s ease",
      animationDelay: `${index * 55}ms`, animation: "fadeUp 0.4s ease both",
    }}>
      {saved && <div style={{ height: "3px", background: statusM.color, opacity: 0.6 }} />}

      <div style={{ padding: "18px 20px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
        <ScoreRing score={prospect.opportunityScore} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", flexWrap: "wrap", marginBottom: "5px" }}>
            <div>
              <div style={{ color: "#1e293b", fontWeight: 700, fontSize: "15px", fontFamily: "'Lora', serif", letterSpacing: "-0.2px" }}>{prospect.companyName}</div>
              <div style={{ color: "#94a3b8", fontSize: "11.5px", marginTop: "2px" }}>{prospect.industry} · {prospect.location} · ~{prospect.estimatedEmployees} employees</div>
            </div>
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", flexShrink: 0 }}>
              <Pill color={confColor}>{prospect.confidence} Confidence</Pill>
              {prospect.has401k && <Pill color={has401kColor}>401k: {prospect.has401k}</Pill>}
              {saved && <Pill color={statusM.color}>● {saved.status}</Pill>}
            </div>
          </div>
          <p style={{ color: "#64748b", fontSize: "12.5px", lineHeight: "1.65", marginBottom: "10px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {prospect.whyThisCompany}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {prospect.triggers?.map((t, i) => (
              <span key={i} style={{ fontSize: "10.5px", padding: "2px 9px", borderRadius: "20px", border: "1px solid #bae6fd", color: "#0284c7", background: "#f0f9ff" }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "0 20px 16px", display: "flex", gap: "7px", flexWrap: "wrap" }}>
        <Btn onClick={() => setOpen(!open)} ghost>{open ? "▲ Collapse" : "▼ Details"}</Btn>
        {!saved
          ? <Btn onClick={() => onSave(prospect)} primary>＋ Save Lead</Btn>
          : <select value={saved.status} onChange={e => onStatusChange(prospect.companyName, e.target.value)}
              style={{ fontSize: "11px", padding: "5px 10px", borderRadius: "7px", border: "1px solid #e2e8f0", color: "#64748b", background: "white", cursor: "pointer", outline: "none", fontFamily: "inherit" }}>
              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
        }
        <Btn onClick={exportCSV} ghost>↓ CSV</Btn>
        <Btn onClick={pushToRedtail} teal>→ Redtail</Btn>
        {saved && <Btn onClick={() => onUnsave(prospect.companyName)} ghost>Remove</Btn>}
      </div>

      {pushMsg === "nokey"   && <MsgBar bg="#fffbeb" border="#fde68a" color="#92400e">⚠ No Redtail API key. Open Settings to add credentials.</MsgBar>}
      {pushMsg === "ok"      && <MsgBar bg="#f0fdf4" border="#a7f3d0" color="#065f46">✓ Successfully pushed to Redtail CRM.</MsgBar>}
      {pushMsg === "err"     && <MsgBar bg="#fef2f2" border="#fecaca" color="#991b1b">✗ Push failed. Check your Redtail API key in Settings.</MsgBar>}
      {pushMsg === "loading" && <MsgBar bg="#f8fafc" border="#e2e8f0" color="#94a3b8">Pushing to Redtail…</MsgBar>}

      {open && (
        <div style={{ borderTop: "1px solid #f1f5f9", background: "#fafcff" }}>
          <div style={{ padding: "16px 20px 8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 32px" }}>
            <SubBar label="Growth Score"  value={prospect.subScores?.growth ?? 0}       color="#3b82f6" />
            <SubBar label="Timing Score"  value={prospect.subScores?.timing ?? 0}       color="#8b5cf6" />
            <SubBar label="Plan Weakness" value={prospect.subScores?.planWeakness ?? 0} color="#ef4444" />
            <SubBar label="Fit Score"     value={prospect.subScores?.fit ?? 0}          color="#059669" />
          </div>
          <div style={{ display: "flex", borderBottom: "1px solid #f1f5f9", padding: "0 20px" }}>
            {[["why","Why This Lead"],["email","Email Draft"],["call","Call Script"],["sources","Sources"]].map(([t, lbl]) => (
              <button key={t} onClick={() => setTab(t)} style={{
                fontSize: "11.5px", padding: "10px 14px", background: "none", border: "none", cursor: "pointer",
                color: tab === t ? "#0284c7" : "#94a3b8", fontFamily: "inherit", fontWeight: tab === t ? 600 : 400,
                borderBottom: tab === t ? "2px solid #5eadd4" : "2px solid transparent", marginBottom: "-1px", transition: "color 0.15s",
              }}>{lbl}</button>
            ))}
          </div>
          <div style={{ padding: "18px 20px", fontSize: "12.5px", color: "#475569", lineHeight: "1.75" }}>
            {tab === "why" && <p>{prospect.whyThisCompany}</p>}
            {tab === "email" && (
              <>
                <p style={{ fontSize: "10px", color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>Suggested First-Touch Email</p>
                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", background: "white", border: "1px solid #e8eef4", borderRadius: "8px", padding: "14px", color: "#334155", fontSize: "12px", lineHeight: "1.75" }}>{prospect.emailDraft}</pre>
              </>
            )}
            {tab === "call" && (
              <>
                <p style={{ fontSize: "10px", color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>15-Second Call Opener</p>
                <div style={{ background: "white", border: "1px solid #e8eef4", borderRadius: "8px", padding: "14px", color: "#334155", fontStyle: "italic", lineHeight: "1.75" }}>"{prospect.callOpener}"</div>
              </>
            )}
            {tab === "sources" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {prospect.sources?.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: "8px", fontSize: "11.5px" }}>
                    <span style={{ color: "#5eadd4", flexShrink: 0, marginTop: "2px" }}>◆</span>
                    <span style={{ color: "#64748b" }}>{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Pill({ color, children }) {
  return (
    <span style={{ fontSize: "10.5px", fontWeight: 600, padding: "3px 10px", borderRadius: "20px", border: `1px solid ${color}30`, color, background: `${color}10` }}>{children}</span>
  );
}

function Btn({ onClick, children, primary, ghost, teal, danger }) {
  const s = primary ? { background: "#1a6e9e", color: "#fff", border: "1px solid #1a6e9e" }
    : teal ? { background: "#eef7fc", color: "#1a6e9e", border: "1px solid #bae0f5" }
    : danger ? { background: "white", color: "#ef4444", border: "1px solid #fecaca" }
    : { background: "white", color: "#94a3b8", border: "1px solid #e2e8f0" };
  return (
    <button onClick={onClick} style={{ ...s, fontSize: "11px", fontWeight: 600, padding: "5px 12px", borderRadius: "7px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>{children}</button>
  );
}

function MsgBar({ bg, border, color, children }) {
  return <div style={{ margin: "0 20px 16px", padding: "9px 14px", borderRadius: "7px", background: bg, border: `1px solid ${border}`, color, fontSize: "11.5px" }}>{children}</div>;
}

function SettingsModal({ onClose }) {
  const [key, setKey] = useState(localStorage.getItem("redtail_api_key") || "");
  const [saved, setSaved] = useState(false);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "420px", padding: "28px", boxShadow: "0 24px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
          <span style={{ fontFamily: "'Lora',serif", fontWeight: 700, color: "#1e293b", fontSize: "18px" }}>Settings</span>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", color: "#64748b", width: "30px", height: "30px", borderRadius: "7px", cursor: "pointer", fontSize: "15px" }}>✕</button>
        </div>
        <p style={{ fontSize: "10px", color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>Redtail CRM API Key</p>
        <input type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="Enter your Redtail API key…"
          style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "9px", padding: "11px 14px", color: "#334155", fontSize: "13px", outline: "none", fontFamily: "inherit", boxSizing: "border-box", marginBottom: "12px" }} />
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "9px", padding: "11px 14px", marginBottom: "20px", fontSize: "11.5px", color: "#92400e", lineHeight: "1.65" }}>
          <strong>🔒 Security:</strong> Your key is stored only on this device in browser local storage. It is sent directly and exclusively to Redtail's API — never to any other server. Never share your API key with anyone.
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => { localStorage.setItem("redtail_api_key", key); setSaved(true); setTimeout(()=>setSaved(false),2000); }}
            style={{ flex: 1, background: "#1a6e9e", border: "none", color: "white", fontWeight: 700, padding: "12px", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
            {saved ? "✓ Saved" : "Save Key"}
          </button>
          <button onClick={() => { localStorage.removeItem("redtail_api_key"); setKey(""); }}
            style={{ padding: "12px 18px", background: "#f8fafc", border: "1px solid #e2e8f0", color: "#94a3b8", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("search");
  const [industry, setIndustry] = useState("");
  const [sizeRange, setSizeRange] = useState("");
  const [selectedTriggers, setSelectedTriggers] = useState(TRIGGERS.map(t => t.id));
  const [minScore, setMinScore] = useState(0);
  const [keywords, setKeywords] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [summary, setSummary] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [savedLeads, setSavedLeads] = useLocalStorage("prospectiq_v4", []);

  const toggleTrigger = id => setSelectedTriggers(p => p.includes(id) ? p.filter(t => t !== id) : [...p, id]);
  const activeTriggerLabels = TRIGGERS.filter(t => selectedTriggers.includes(t.id)).map(t => t.label);

  const buildPrompt = () => `You are a 401(k) business development research assistant for a wealth management firm. Use web search to find REAL, specific businesses that are strong candidates to start, switch, or upgrade a 401(k) plan.

Criteria:
- Industry: ${INDUSTRIES.find(i=>i.value===industry)?.label||"All Industries"} ${industry}
- Size: ${SIZE_RANGES.find(s=>s.value===sizeRange)?.label||"Any"} ${sizeRange}
- Triggers to look for: ${activeTriggerLabels.join(", ")}
- Minimum score: ${minScore}/100
${keywords ? `- Keywords: ${keywords}` : ""}

Score 0–100 using four sub-scores (each max 25):
1. Growth Score: hiring, funding, expansion
2. Timing Score: new HR/CFO, payroll change, 2–5 year old company
3. Plan Weakness Score: no 401k in job posts, low Form 5500 participation, bad reviews
4. Fit Score: 10–200 employees, right industry, geography

Detect 401k status from job postings, Form 5500, and review sites.

Return ONLY valid JSON, no markdown:
{
  "prospects": [{
    "companyName": "string",
    "industry": "string",
    "location": "City, State",
    "estimatedEmployees": "string",
    "opportunityScore": number,
    "subScores": { "growth": number, "timing": number, "planWeakness": number, "fit": number },
    "confidence": "High|Medium|Low",
    "has401k": "Yes|No|Unknown",
    "whyThisCompany": "2–3 sentence plain-English explanation",
    "triggers": ["signal 1","signal 2","signal 3"],
    "emailDraft": "Subject: ...\\n\\n[3-4 paragraph email]",
    "callOpener": "15-second script",
    "sources": ["source 1","source 2"]
  }],
  "meta": { "searchSummary": "1–2 sentence summary" }
}
Return 6 prospects, score >= ${minScore}, ranked highest first.`;

  const search = useCallback(async () => {
    setLoading(true); setError(""); setResults([]); setSummary(""); setSearched(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 4000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: buildPrompt() }],
        }),
      });
      const data = await res.json();
      const text = data.content?.filter(b=>b.type==="text").map(b=>b.text).join("");
      if (!text) throw new Error("No response received.");
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Could not parse AI response.");
      const parsed = JSON.parse(match[0]);
      setResults(parsed.prospects || []);
      setSummary(parsed.meta?.searchSummary || "");
    } catch(e) { setError("Search failed: " + e.message); }
    finally { setLoading(false); }
  }, [industry, sizeRange, selectedTriggers, minScore, keywords]);

  const saveLead = p => { if (!savedLeads.find(l=>l.companyName===p.companyName)) setSavedLeads([...savedLeads,{...p,status:"Uncontacted",savedAt:new Date().toLocaleDateString()}]); };
  const unsaveLead = name => setSavedLeads(savedLeads.filter(l=>l.companyName!==name));
  const updateStatus = (name,status) => setSavedLeads(savedLeads.map(l=>l.companyName===name?{...l,status}:l));
  const isSaved = name => savedLeads.find(l=>l.companyName===name);

  const exportAll = () => {
    const h = "Company,Industry,Location,Employees,Score,Confidence,401k,Status,Saved,Why,Email,Call";
    const rows = savedLeads.map(p=>[
      p.companyName,p.industry,p.location,p.estimatedEmployees,p.opportunityScore,
      p.confidence,p.has401k,p.status,p.savedAt,
      (p.whyThisCompany||"").replace(/,/g,";"),
      (p.emailDraft||"").replace(/,/g,";"),
      (p.callOpener||"").replace(/,/g,";"),
    ].map(v=>`"${v||""}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([h+"\n"+rows],{type:"text/csv"}));
    a.download = "prospectiq_pipeline.csv"; a.click();
  };

  const counts = STATUS_OPTIONS.reduce((a,s)=>{a[s]=savedLeads.filter(l=>l.status===s).length;return a},{});

  return (
    <div style={{ minHeight: "100vh", background: "#f7f9fc", fontFamily: "'Inter', sans-serif", color: "#1e293b" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@600;700&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: #cbd5e1; }
        select option { background: white; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      `}</style>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* ── NAV ── */}
      <nav style={{ background: "white", borderBottom: "1px solid #f0f4f8", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 32px", height: "58px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "linear-gradient(135deg,#1a6e9e,#5eadd4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, color: "white", fontFamily: "'Lora',serif" }}>IQ</div>
            <span style={{ fontFamily: "'Lora',serif", fontWeight: 700, fontSize: "16px", color: "#1e293b", letterSpacing: "-0.2px" }}>ProspectIQ</span>
          </div>
          {/* Nav Links */}
          <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
            {[["search","Opportunities"],["pipeline",`Pipeline${savedLeads.length>0?` (${savedLeads.length})`:""}`]].map(([t,lbl])=>(
              <button key={t} onClick={()=>setPage(t)} style={{
                background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                fontSize: "13.5px", fontWeight: page===t ? 600 : 400,
                color: page===t ? "#1a6e9e" : "#64748b",
                borderBottom: page===t ? "2px solid #5eadd4" : "2px solid transparent",
                paddingBottom: "2px", transition: "color 0.15s",
              }}>{lbl}</button>
            ))}
            <button onClick={() => setShowSettings(true)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "13.5px", color: "#94a3b8", fontWeight: 400, transition: "color 0.15s" }}>Settings</button>
          </div>
        </div>
      </nav>

      {/* ── HERO + FILTER BAR ── */}
      {page === "search" && (
        <div style={{ position: "relative", overflow: "hidden" }}>
          {/* Background */}
          <div style={{
            position: "absolute", inset: 0, zIndex: 0,
            background: "linear-gradient(135deg, #e8f4fa 0%, #eef7f0 50%, #faf5ec 100%)",
          }} />
          {/* Decorative circles */}
          <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "300px", height: "300px", borderRadius: "50%", background: "rgba(94,173,212,0.08)", zIndex: 0 }} />
          <div style={{ position: "absolute", bottom: "-40px", left: "10%", width: "200px", height: "200px", borderRadius: "50%", background: "rgba(16,185,129,0.06)", zIndex: 0 }} />

          <div style={{ position: "relative", zIndex: 1, maxWidth: "1100px", margin: "0 auto", padding: "60px 32px 40px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "#5eadd4", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "12px" }}>AI-Powered Lead Intelligence</p>
            <h1 style={{ fontFamily: "'Lora',serif", fontWeight: 700, fontSize: "40px", color: "#1e293b", lineHeight: 1.2, marginBottom: "12px", letterSpacing: "-0.5px" }}>
              Find Your Next<br /><span style={{ color: "#1a6e9e" }}>401k Client</span>
            </h1>
            <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.7, maxWidth: "480px", marginBottom: "36px" }}>
              Search the web in real-time to identify new and growing businesses that are prime candidates for a retirement plan.
            </p>

            {/* ── BOXY FILTER BAR ── */}
            <div style={{ background: "white", borderRadius: "16px", boxShadow: "0 8px 40px rgba(0,0,0,0.1)", overflow: "hidden", maxWidth: "860px" }}>
              {/* Top row: dropdowns */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 180px", borderBottom: "1px solid #f0f4f8" }}>
                {[
                  { label: "Industry", val: industry, set: setIndustry, opts: INDUSTRIES },
                  { label: "Company Size", val: sizeRange, set: setSizeRange, opts: SIZE_RANGES },
                ].map(({ label, val, set, opts }, i) => (
                  <div key={label} style={{ padding: "14px 20px", borderRight: "1px solid #f0f4f8" }}>
                    <div style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "5px" }}>{label}</div>
                    <select value={val} onChange={e => set(e.target.value)} style={{ width: "100%", border: "none", outline: "none", fontSize: "13px", color: "#334155", fontFamily: "inherit", background: "transparent", cursor: "pointer", fontWeight: 500 }}>
                      {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                ))}
                <div style={{ padding: "14px 20px", borderRight: "1px solid #f0f4f8" }}>
                  <div style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "5px" }}>
                    Min Score <span style={{ color: "#1a6e9e", letterSpacing: 0, textTransform: "none" }}>{minScore}</span>
                  </div>
                  <input type="range" min="0" max="85" step="5" value={minScore} onChange={e=>setMinScore(+e.target.value)}
                    style={{ width: "100%", accentColor: "#1a6e9e", cursor: "pointer", marginTop: "6px" }} />
                </div>
                <div style={{ padding: "14px 20px", display: "flex", alignItems: "center" }}>
                  <button onClick={search} disabled={loading || selectedTriggers.length === 0} style={{
                    width: "100%", background: loading ? "#e2e8f0" : "#1a6e9e",
                    color: loading ? "#94a3b8" : "white", border: "none", borderRadius: "10px",
                    padding: "11px 0", fontWeight: 700, fontSize: "13px", cursor: loading ? "not-allowed" : "pointer",
                    fontFamily: "inherit", transition: "all 0.2s", letterSpacing: "0.02em",
                    boxShadow: loading ? "none" : "0 4px 14px rgba(26,110,158,0.25)",
                  }}>
                    {loading ? "Searching…" : "⚡ Search"}
                  </button>
                </div>
              </div>

              {/* Keywords row */}
              <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f4f8", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0 }}>Keywords</span>
                <input type="text" value={keywords} onChange={e=>setKeywords(e.target.value)}
                  placeholder="e.g. 'Utah dental practice', 'recently funded SaaS', 'new HR hire'…"
                  style={{ flex: 1, border: "none", outline: "none", fontSize: "13px", color: "#334155", fontFamily: "inherit", background: "transparent" }} />
              </div>

              {/* Trigger checkboxes */}
              <div style={{ padding: "14px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Opportunity Triggers <span style={{ color: "#1a6e9e", textTransform: "none", letterSpacing: 0 }}>({selectedTriggers.length}/{TRIGGERS.length})</span>
                  </span>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={()=>setSelectedTriggers(TRIGGERS.map(t=>t.id))} style={{ background:"none",border:"none",cursor:"pointer",fontSize:"11px",color:"#5eadd4",fontFamily:"inherit",fontWeight:500 }}>Select all</button>
                    <button onClick={()=>setSelectedTriggers([])} style={{ background:"none",border:"none",cursor:"pointer",fontSize:"11px",color:"#94a3b8",fontFamily:"inherit" }}>Clear</button>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "6px" }}>
                  {TRIGGERS.map(t => <TriggerCheck key={t.id} trigger={t} checked={selectedTriggers.includes(t.id)} onChange={toggleTrigger} />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 32px 60px" }}>

        {/* Search Results */}
        {page === "search" && (
          <>
            {loading && (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"80px 0", gap:"16px" }}>
                <div style={{ width:"34px", height:"34px", borderRadius:"50%", border:"2.5px solid #e2e8f0", borderTopColor:"#1a6e9e", animation:"spin 0.8s linear infinite" }} />
                <p style={{ color:"#94a3b8", fontSize:"13px" }}>Searching the web for opportunities…</p>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            )}
            {error && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"10px", padding:"12px 16px", color:"#991b1b", fontSize:"13px", marginBottom:"20px" }}>{error}</div>}
            {summary && !loading && (
              <div style={{ background:"white", border:"1px solid #bae6fd", borderRadius:"10px", padding:"13px 16px", color:"#0369a1", fontSize:"13px", marginBottom:"20px", lineHeight:"1.65", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
                <span style={{ fontWeight:600 }}>AI Summary: </span>{summary}
              </div>
            )}
            {results.length > 0 && !loading && (
              <>
                <p style={{ color:"#94a3b8", fontSize:"11.5px", marginBottom:"16px", letterSpacing:"0.05em" }}>{results.length} PROSPECTS · RANKED BY OPPORTUNITY SCORE</p>
                <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                  {results.map((p,i) => <LeadCard key={i} prospect={p} index={i} saved={isSaved(p.companyName)} onSave={saveLead} onUnsave={unsaveLead} onStatusChange={updateStatus} />)}
                </div>
              </>
            )}
            {searched && !loading && results.length===0 && !error && (
              <div style={{ textAlign:"center", padding:"80px 0", color:"#cbd5e1" }}>
                <div style={{ fontSize:"44px", marginBottom:"12px" }}>◎</div>
                <p style={{ fontSize:"14px" }}>No prospects found. Try adjusting your filters.</p>
              </div>
            )}
            {!searched && (
              <div style={{ textAlign:"center", padding:"60px 0", color:"#e2e8f0" }}>
                <div style={{ fontSize:"44px", marginBottom:"12px" }}>◈</div>
                <p style={{ fontSize:"13px", color:"#cbd5e1" }}>Results will appear here after you search.</p>
              </div>
            )}
          </>
        )}

        {/* Pipeline */}
        {page === "pipeline" && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"28px" }}>
              <div>
                <h1 style={{ fontFamily:"'Lora',serif", fontWeight:700, fontSize:"30px", color:"#1e293b", letterSpacing:"-0.4px" }}>Your Pipeline</h1>
                <p style={{ color:"#94a3b8", fontSize:"13px", marginTop:"6px" }}>Manage saved leads and track outreach status.</p>
              </div>
              {savedLeads.length > 0 && (
                <button onClick={exportAll} style={{ fontSize:"12px", padding:"8px 16px", background:"white", border:"1px solid #e2e8f0", color:"#64748b", borderRadius:"9px", cursor:"pointer", fontFamily:"inherit", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", marginTop:"4px" }}>↓ Export All CSV</button>
              )}
            </div>

            {savedLeads.length > 0 && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"12px", marginBottom:"32px" }}>
                {STATUS_OPTIONS.map(s => (
                  <div key={s} style={{ borderRadius:"12px", background:"white", border:`1px solid ${STATUS_META[s].border}`, padding:"18px 22px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
                    <p style={{ fontSize:"10px", color:"#94a3b8", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"8px" }}>{s}</p>
                    <p style={{ fontFamily:"'Lora',serif", fontWeight:700, fontSize:"30px", color:STATUS_META[s].color }}>{counts[s]}</p>
                  </div>
                ))}
              </div>
            )}

            {STATUS_OPTIONS.map(status => {
              const group = savedLeads.filter(l=>l.status===status);
              if (!group.length) return null;
              return (
                <div key={status} style={{ marginBottom:"32px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px" }}>
                    <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:STATUS_META[status].color }} />
                    <span style={{ fontSize:"11px", color:"#94a3b8", letterSpacing:"0.08em", textTransform:"uppercase" }}>{status} · {group.length}</span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                    {group.map((p,i) => <LeadCard key={i} prospect={p} index={i} saved={isSaved(p.companyName)} onSave={saveLead} onUnsave={unsaveLead} onStatusChange={updateStatus} />)}
                  </div>
                </div>
              );
            })}

            {savedLeads.length === 0 && (
              <div style={{ textAlign:"center", padding:"80px 0" }}>
                <div style={{ fontSize:"44px", marginBottom:"14px", color:"#e2e8f0" }}>◫</div>
                <p style={{ fontSize:"14px", color:"#94a3b8", marginBottom:"16px" }}>No saved leads yet.</p>
                <button onClick={()=>setPage("search")} style={{ fontSize:"13px", color:"#1a6e9e", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", textDecoration:"underline" }}>Search for prospects →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
