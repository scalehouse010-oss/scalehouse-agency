'use client'
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { supabase } from "./supabase";

const injectFonts = () => {
  if (typeof document === "undefined" || document.getElementById("sh-fonts")) return;
  const s = document.createElement("style");
  s.id = "sh-fonts";
  s.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; font-family: 'DM Sans', sans-serif; background: #0d0d0d; color: #f0f0f0; font-size: 14px; }
    ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
    @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }
    .fu { animation: fadeUp .25s ease forwards; }
    .rh:hover { background: rgba(255,255,255,.03) !important; }
    .nh:hover { background: rgba(255,255,255,.05) !important; }
    .nav-btn { transition: all .15s; }
    .nav-btn:hover { background: rgba(61,255,160,.08) !important; color: #3dffa0 !important; }
    .nav-btn.active { background: rgba(61,255,160,.1) !important; color: #3dffa0 !important; border-left: 2px solid #3dffa0 !important; }
    .btn-green { transition: all .15s; }
    .btn-green:hover { background: #2de890 !important; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(61,255,160,.3) !important; }
    .btn-ghost:hover { background: rgba(255,255,255,.06) !important; }
    .client-btn:hover { background: rgba(255,255,255,.04) !important; }
    .client-btn.active { background: rgba(61,255,160,.08) !important; }
    input, select, textarea { transition: border-color .15s, box-shadow .15s; }
    input:focus, select:focus { outline: none !important; border-color: #3dffa0 !important; box-shadow: 0 0 0 3px rgba(61,255,160,.1) !important; }
    input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1) brightness(0.6); cursor: pointer; }
    select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23555' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 30px !important; }
    .tab-btn { transition: color .15s; position: relative; }
    .tab-btn::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: #3dffa0; transform: scaleX(0); transition: transform .2s; }
    .tab-btn.active::after { transform: scaleX(1); }
    .kpi-card:hover { border-color: rgba(61,255,160,.2) !important; transform: translateY(-1px); transition: all .2s; }
    .card { transition: border-color .2s; }
    .card:hover { border-color: #2a2a2a !important; }
  `;
  document.head.appendChild(s);
};

const C = {
  bg:"#0d0d0d", sur:"#161616", sur2:"#1c1c1c", bd:"#282828", bd2:"#202020",
  ink:"#f0f0f0", ink2:"#909090", ink3:"#505050",
  green:"#3dffa0", gBg:"rgba(61,255,160,0.08)", greenDim:"#1a7a4a",
  red:"#ff5555", rBg:"rgba(255,85,85,0.08)",
  amber:"#ffb340", aBg:"rgba(255,179,64,0.08)",
  blue:"#5aadff", bBg:"rgba(90,173,255,0.08)",
  purple:"#b06bff", pBg:"rgba(176,107,255,0.08)",
  mono:"'JetBrains Mono',monospace", sans:"'DM Sans',sans-serif",
};

const STATUS_MAP = {
  Given:[C.green,C.gBg], "Not Given":[C.red,C.rBg], "Asking for Money":[C.amber,C.aBg],
  Active:[C.green,C.gBg], Paused:[C.amber,C.aBg], Ended:[C.ink3,C.bd2],
  Pending:[C.blue,C.bBg], Onboarding:[C.blue,C.bBg],
};

/* ── Primitives ─────────────────────────────────────────────────────────── */
const Badge = ({v}) => {
  const [fg,bg] = STATUS_MAP[v]||[C.ink3,C.bd2];
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:10,fontWeight:600,color:fg,background:bg,padding:"3px 10px",borderRadius:4,whiteSpace:"nowrap",letterSpacing:".04em",textTransform:"uppercase",border:`1px solid ${fg}22`}}><span style={{width:4,height:4,borderRadius:"50%",background:fg,flexShrink:0}}/>{v}</span>;
};
const Tip = ({active,payload,label}) => {
  if(!active||!payload?.length) return null;
  return <div style={{background:C.sur,border:`1px solid ${C.bd}`,borderRadius:8,padding:"9px 13px",boxShadow:"0 4px 16px rgba(0,0,0,.07)"}}>
    <div style={{fontSize:10,color:C.ink3,fontWeight:700,marginBottom:5,letterSpacing:".06em",textTransform:"uppercase"}}>{label}</div>
    {payload.map((p,i)=><div key={i} style={{fontSize:13,fontWeight:700,color:C.ink,display:"flex",alignItems:"center",gap:7}}><span style={{width:8,height:3,background:p.color,borderRadius:2,display:"inline-block"}}/>${(p.value||0).toLocaleString()}</div>)}
  </div>;
};
const Modal = ({open,onClose,title,children,width=520}) => {
  if(!open || typeof document === "undefined") return null;
  const modal = (
    <div onClick={onClose} style={{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",background:"rgba(0,0,0,.85)",zIndex:99999,backdropFilter:"blur(4px)",overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"center",alignItems:"flex-start",minHeight:"100vh",padding:"48px 24px 64px"}}>
        <div onClick={e=>e.stopPropagation()} style={{background:"#1a1a1a",borderRadius:10,width:"100%",maxWidth:width,border:"1px solid #2a2a2a",boxShadow:"0 40px 100px rgba(0,0,0,.98)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:"1px solid #2a2a2a",borderRadius:"10px 10px 0 0"}}>
            <span style={{fontSize:15,fontWeight:600,color:"#f0f0f0",fontFamily:"'Space Grotesk',sans-serif",letterSpacing:"-.3px"}}>{title}</span>
            <button onClick={onClose} style={{width:28,height:28,border:"1px solid #2a2a2a",background:"transparent",borderRadius:4,cursor:"pointer",fontSize:14,color:"#505050",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#ff5555";e.currentTarget.style.color="#ff5555";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#2a2a2a";e.currentTarget.style.color="#505050";}}>✕</button>
          </div>
          <div style={{padding:24}}>{children}</div>
        </div>
      </div>
    </div>
  );
  return createPortal(modal, document.body);
};
const R2 = ({children}) => <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>{children}</div>;
const Fld = ({label,children}) => <div><label style={{display:"block",fontSize:11,fontWeight:600,color:C.ink2,marginBottom:7,letterSpacing:".04em",textTransform:"uppercase"}}>{label}</label>{children}</div>;
const IS = {width:"100%",padding:"10px 13px",border:`1px solid ${C.bd}`,borderRadius:5,fontSize:14,color:C.ink,background:C.bg,fontFamily:C.sans};
const Inp = p => <input {...p} style={{...IS,...p.style}}/>;
const Sel = ({children,...p}) => <select {...p} style={{...IS,cursor:"pointer"}}>{children}</select>;
const MFoot = ({onClose,onSave,label="Save",loading}) => <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18,paddingTop:14,borderTop:`1px solid ${C.bd}`}}>
  <button onClick={onClose} className="btn-ghost" style={{padding:"8px 16px",border:`1px solid ${C.bd}`,borderRadius:8,background:C.sur,cursor:"pointer",fontSize:13,fontWeight:600,color:C.ink2}}>Cancel</button>
  <button onClick={onSave} className="btn-green" disabled={loading} style={{padding:"9px 18px",background:C.green,color:"#000",border:"none",borderRadius:4,cursor:"pointer",fontSize:12,fontWeight:700,opacity:loading?0.6:1,letterSpacing:".03em"}}>{loading?"Saving...":label}</button>
</div>;
const PBtn = ({onClick,children,loading}) => <button onClick={onClick} className="btn-green" disabled={loading} style={{display:"flex",alignItems:"center",gap:6,background:C.green,color:"#000",border:"none",borderRadius:4,padding:"9px 16px",fontSize:12,fontWeight:700,cursor:"pointer",opacity:loading?0.6:1,letterSpacing:".03em",fontFamily:C.sans}}>{loading?"...":children}</button>;
const PageHead = ({title,sub,right}) => <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28}}>
  <div><h1 style={{fontSize:26,fontWeight:700,color:C.ink,letterSpacing:"-1px",fontFamily:"'Space Grotesk',sans-serif"}}>{title}</h1>{sub&&<p style={{fontSize:13,color:C.ink2,marginTop:6}}>{sub}</p>}</div>
  {right}
</div>;
const Card = ({title,sub,right,children,noPad,style:s={}}) => <div className="card" style={{background:C.sur,border:`1px solid ${C.bd}`,borderRadius:6,overflow:"hidden",...s}}>
  {(title||right)&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",borderBottom:`1px solid ${C.bd}`}}>
    <div><div style={{fontSize:13,fontWeight:600,color:C.ink}}>{title}</div>{sub&&<div style={{fontSize:12,color:C.ink2,marginTop:3}}>{sub}</div>}</div>
    {right}
  </div>}
  <div style={{padding:noPad?0:20}}>{children}</div>
</div>;
const KPI = ({label,value,sub,color=C.ink}) => <div className="kpi-card" style={{background:C.sur,border:`1px solid ${C.bd}`,borderRadius:6,padding:"20px 22px",cursor:"default"}}>
  <div style={{fontSize:11,fontWeight:600,color:C.ink2,letterSpacing:".06em",textTransform:"uppercase",marginBottom:12,fontFamily:C.mono}}>{label}</div>
  <div style={{fontSize:32,fontWeight:700,color,letterSpacing:"-1.5px",lineHeight:1,fontFamily:"'Space Grotesk',sans-serif"}}>{value}</div>
  {sub&&<div style={{fontSize:12,color:C.ink3,marginTop:8}}>{sub}</div>}
</div>;
const Tbl = ({cols,rows,empty="Nothing here yet."}) => <div style={{overflowX:"auto"}}>
  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
    <thead><tr style={{background:"rgba(255,255,255,.03)"}}>{cols.map(c=><th key={c} style={{padding:"11px 16px",textAlign:"left",fontSize:11,fontWeight:600,color:C.ink2,letterSpacing:".05em",textTransform:"uppercase",borderBottom:`1px solid ${C.bd}`,whiteSpace:"nowrap"}}>{c}</th>)}</tr></thead>
    <tbody>{rows.length===0?<tr><td colSpan={cols.length} style={{padding:50,textAlign:"center",color:C.ink3,fontSize:12,fontFamily:C.mono}}>— {empty} —</td></tr>:rows}</tbody>
  </table>
</div>;
const Td = ({children,mono,right,bold,color=C.ink,muted,style:s={}}) => <td style={{padding:"12px 16px",color:muted?C.ink3:color,fontWeight:bold?600:400,fontFamily:mono?C.mono:"inherit",fontSize:mono?12:14,textAlign:right?"right":"left",whiteSpace:"nowrap",borderBottom:`1px solid ${C.bd}`,...s}}>{children}</td>;
const ActBtn = ({onClick,icon}) => <button onClick={onClick} className="btn-ghost" style={{background:"none",border:`1px solid ${C.bd}`,cursor:"pointer",color:C.ink2,width:24,height:24,borderRadius:3,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,marginLeft:3,transition:"all .15s"}}>{icon}</button>;
const Spin = () => {
  const [slow, setSlow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setSlow(true), 5000); return () => clearTimeout(t); }, []);
  return <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",gap:12,background:C.bg}}>
    <div style={{fontSize:13,color:C.ink3,fontFamily:C.sans}}>Loading...</div>
    {slow&&<div style={{fontSize:12,color:C.ink3,maxWidth:300,textAlign:"center",lineHeight:1.6}}>
      Taking longer than usual. Try <button onClick={()=>window.location.reload()} style={{background:"none",border:"none",color:C.green,cursor:"pointer",fontSize:12,textDecoration:"underline"}}>refreshing</button> or check your connection.
    </div>}
  </div>;
};

/* ── Login ──────────────────────────────────────────────────────────────── */
const LoginScreen = () => {
  const [email,setEmail] = useState("");
  const [pass,setPass]   = useState("");
  const [err,setErr]     = useState("");
  const [loading,setLoading] = useState(false);
  const login = async () => {
    if(!email.trim()||!pass.trim()){setErr("Please enter your email and password.");return;}
    setLoading(true); setErr("");
    const {error} = await supabase.auth.signInWithPassword({email:email.trim(),password:pass});
    if(error) {
      setErr(error.message==="Invalid login credentials"?"Incorrect email or password.":error.message);
      setLoading(false);
    }
    // On success: onAuthStateChange fires SIGNED_IN → loadUser handles it
    // Loading spinner stays until app loads, which is correct
  };
  return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,fontFamily:C.sans}}>
    <div style={{width:400,background:C.sur,border:`1px solid ${C.bd}`,borderRadius:16,padding:40,boxShadow:"0 24px 80px rgba(0,0,0,.5)"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <img src="/logo.png" alt="Scale House" style={{height:64,objectFit:"contain",marginBottom:12}}/>
        <div style={{fontSize:12,color:C.ink3,fontWeight:600,letterSpacing:".1em",textTransform:"uppercase"}}>Agency OS</div>
      </div>
      <div style={{fontSize:22,fontWeight:800,color:C.ink,marginBottom:6}}>Welcome back</div>
      <div style={{fontSize:14,color:C.ink2,marginBottom:24}}>Sign in to your dashboard</div>
      <div style={{marginBottom:12}}><Fld label="Email"><Inp type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" onKeyDown={e=>e.key==="Enter"&&login()}/></Fld></div>
      <div style={{marginBottom:20}}><Fld label="Password"><Inp type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&login()}/></Fld></div>
      {err&&<div style={{background:C.rBg,border:`1px solid ${C.red}30`,borderRadius:8,padding:"9px 12px",fontSize:12,color:C.red,marginBottom:14}}>{err}</div>}
      <button onClick={login} className="btn-dark" disabled={loading} style={{width:"100%",padding:12,background:C.green,color:"#000",border:"none",borderRadius:8,cursor:"pointer",fontSize:15,fontWeight:800,opacity:loading?0.6:1,fontFamily:C.sans,letterSpacing:".02em"}}>
        {loading?"Signing in...":"Sign In →"}
      </button>
      <div style={{marginTop:16,fontSize:11,color:C.ink3,textAlign:"center"}}>Contact your Scale House manager to get access.</div>
    </div>
  </div>;
};

/* ── Agency Dashboard ───────────────────────────────────────────────────── */

// Helper: group weekly gmv entries by month, sum, sort chronologically
const groupGmvByMonth = (data) => {
  const MORDER = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const grouped = {};
  data.forEach(g => {
    const d = g.start_date ? new Date(g.start_date) : null;
    const key = d ? `${MORDER[d.getMonth()]} ${d.getFullYear()}` : (g.month?.split("–")[0]?.trim().split(" ").slice(0,2).join(" ")||"Other");
    const sortKey = d ? d.getFullYear()*100+d.getMonth() : 999999;
    if(!grouped[key]) grouped[key]={m:key,v:0,sortKey};
    grouped[key].v += (+g.gmv||0);
  });
  return Object.values(grouped).sort((a,b)=>a.sortKey-b.sortKey);
};

const Dashboard = ({clients,retainers,rights,gmvData}) => {
  const active = clients.filter(c=>c.status==="Active");
  const totalGMV = gmvData.reduce((s,g)=>s+(+g.gmv||0),0);
  const retainerMo = retainers.filter(r=>r.status==="Active").reduce((s,r)=>s+(+r.monthly_fee||0),0);
  const rightsGiven = rights.filter(r=>r.status==="Given").length;
  const chartData = groupGmvByMonth(gmvData);
  const lastKey = chartData[chartData.length-1]?.m;
  return <div className="fu">
    <PageHead title="Dashboard" sub="Agency overview — all clients"/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
      <KPI label="Total GMV" value={`$${(totalGMV/1000).toFixed(1)}K`} color={C.green}/>
      <KPI label="Active Clients" value={active.length} sub={`${clients.length} total`}/>
      <KPI label="Monthly Retainers" value={`$${(retainerMo/1000).toFixed(1)}K`}/>
      <KPI label="Rights Given" value={rightsGiven} sub={`of ${rights.length}`}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:12,marginBottom:12}}>
      <Card title="GMV by Month" sub="Weekly entries grouped by month">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barCategoryGap="30%">
            <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{fill:C.ink3,fontSize:11,fontWeight:600}}/>
            <YAxis axisLine={false} tickLine={false} tick={{fill:C.ink3,fontSize:11}} tickFormatter={v=>`$${(v/1000).toFixed(1)}K`} width={48}/>
            <Tooltip content={<Tip/>}/>
            <Bar dataKey="v" radius={[4,4,0,0]}>{chartData.map((d,i)=><Cell key={i} fill={d.m===lastKey?C.green:"#252525"}/>)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card title="Rights Overview">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
          {[["Given",rights.filter(r=>r.status==="Given").length,C.green,C.gBg],["Not Given",rights.filter(r=>r.status==="Not Given").length,C.red,C.rBg],["Asking $",rights.filter(r=>r.status==="Asking for Money").length,C.amber,C.aBg]]
            .map(([l,n,col,bg])=><div key={l} style={{background:bg,borderRadius:8,padding:"10px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:800,color:col}}>{n}</div>
              <div style={{fontSize:9,color:col,fontWeight:600,textTransform:"uppercase",letterSpacing:".04em",lineHeight:1.3,marginTop:2}}>{l}</div>
            </div>)}
        </div>
        <div style={{height:1,background:C.bd2,marginBottom:14}}/>
        <div style={{fontSize:11,color:C.ink3,fontWeight:600,textTransform:"uppercase",letterSpacing:".05em",marginBottom:6}}>Retainer Spend</div>
        <div style={{fontSize:22,fontWeight:800,color:C.ink}}>${retainerMo.toLocaleString()}<span style={{fontSize:12,fontWeight:400,color:C.ink2}}>/mo</span></div>
      </Card>
    </div>
    <Card title="All Clients" noPad>
      {clients.length===0
        ? <div style={{padding:40,textAlign:"center",color:C.ink3}}>No clients yet — click + in the sidebar to add one.</div>
        : clients.map((cl,i)=><div key={cl.id} className="rh" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",borderBottom:i<clients.length-1?`1px solid ${C.bd2}`:"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:34,height:34,borderRadius:8,background:C.bg,border:`1px solid ${C.bd}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:C.ink}}>{cl.name?.charAt(0)}</div>
              <div><div style={{fontSize:13,fontWeight:600,color:C.ink}}>{cl.name}</div><div style={{fontSize:11,color:C.ink3,fontFamily:C.mono}}>{cl.handle}</div></div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:13,fontWeight:700,color:C.green}}>${((+cl.gmv||0)/1000).toFixed(1)}K GMV</div>
                <div style={{fontSize:11,color:C.ink3}}>{cl.category} · {cl.manager}</div>
              </div>
              <Badge v={cl.status}/>
            </div>
          </div>)}
    </Card>
  </div>;
};

/* ── Client Dashboard ───────────────────────────────────────────────────── */
const RANGES = [
  {label:"This Week", days:7},
  {label:"Last Month", days:30},
  {label:"Last 3 Months", days:90},
  {label:"All Time", days:9999},
];
const ClientDashboard = ({client,samples,rights,retainers,gmvData}) => {
  const [range, setRange] = useState(3); // default: All Time
  const now = new Date();
  const cutoff = new Date(now.getTime() - RANGES[range].days * 86400000);
  // Filter gmvData by date range (uses created_at if available, else show all for non-date entries)
  const filteredGmv = range===3 ? gmvData : gmvData.filter(g => {
    const d = g.start_date ? new Date(g.start_date) : (g.created_at ? new Date(g.created_at) : null);
    return !d || d >= cutoff;
  });
  const filteredSamples = range===3 ? samples : samples.filter(s => {
    const d = s.start_date ? new Date(s.start_date) : (s.created_at ? new Date(s.created_at) : null);
    return !d || d >= cutoff;
  });
  const totalGMV = filteredGmv.reduce((s,g)=>s+(+g.gmv||0),0);
  const activeR  = retainers.filter(r=>r.status==="Active");
  const retainerMo = activeR.reduce((s,r)=>s+(+r.monthly_fee||0),0);
  const chartData = groupGmvByMonth(filteredGmv);
  const lastChartKey = chartData[chartData.length-1]?.m;
  return <div className="fu">
    {/* Date range bar */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
      <div>
        <h1 style={{fontSize:24,fontWeight:700,color:C.ink,letterSpacing:"-1px",fontFamily:"'Space Grotesk',sans-serif"}}>{client?.name||"My Dashboard"}</h1>
        <p style={{fontSize:12,color:C.ink3,marginTop:5,fontFamily:C.mono}}>{client?.handle}</p>
      </div>
      <div style={{display:"flex",background:C.sur,border:`1px solid ${C.bd}`,borderRadius:6,overflow:"hidden"}}>
        {RANGES.map((r,i)=><button key={i} onClick={()=>setRange(i)}
          style={{padding:"8px 14px",border:"none",borderRight:i<RANGES.length-1?`1px solid ${C.bd}`:"none",background:range===i?C.green:"transparent",color:range===i?"#000":C.ink3,fontSize:12,fontWeight:range===i?700:400,cursor:"pointer",fontFamily:C.sans,transition:"all .15s",whiteSpace:"nowrap"}}>
          {r.label}
        </button>)}
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:18}}>
      <KPI label="GMV" value={`$${(totalGMV/1000).toFixed(1)}K`} color={C.green} sub={RANGES[range].label}/>
      <KPI label="Samples Sent" value={filteredSamples.reduce((s,x)=>s+(+x.qty||0),0)} sub={RANGES[range].label}/>
      <KPI label="Rights Given" value={rights.filter(r=>r.status==="Given").length} sub={`of ${rights.length} total`}/>
    </div>
    {filteredGmv.length>0&&<Card title="GMV by Month" style={{marginBottom:12}}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} barCategoryGap="30%">
          <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{fill:C.ink3,fontSize:11,fontWeight:600}}/>
          <YAxis axisLine={false} tickLine={false} tick={{fill:C.ink3,fontSize:11}} tickFormatter={v=>`$${(v/1000).toFixed(1)}K`} width={48}/>
          <Tooltip content={<Tip/>}/>
          <Bar dataKey="v" radius={[4,4,0,0]}>{chartData.map((d,i)=><Cell key={i} fill={d.m===lastChartKey?C.green:"#252525"}/>)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Card title="Active Retainers" noPad>
        {activeR.length===0?<div style={{padding:30,textAlign:"center",color:C.ink3,fontSize:13}}>No active retainers</div>:
        activeR.map((r,i)=><div key={r.id} className="rh" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 18px",borderBottom:i<activeR.length-1?`1px solid ${C.bd}`:"none"}}>
          <div><div style={{fontSize:13,fontWeight:600,color:C.ink}}>{r.creator}</div><div style={{fontSize:11,color:C.ink3,fontFamily:C.mono}}>{r.handle}</div></div>
          <div style={{fontSize:13,fontWeight:700,color:C.green}}>${(+r.monthly_fee||0).toLocaleString()}/mo</div>
        </div>)}
        {activeR.length>0&&<div style={{padding:"10px 18px",borderTop:`1px solid ${C.bd}`,background:C.bg,fontSize:12,color:C.ink2,display:"flex",justifyContent:"space-between"}}>
          <span>Monthly total</span><strong style={{color:C.green}}>${retainerMo.toLocaleString()}</strong>
        </div>}
      </Card>
      <Card title="Usage Rights" noPad>
        {rights.length===0?<div style={{padding:30,textAlign:"center",color:C.ink3,fontSize:13}}>No rights tracked yet</div>:
        rights.map((r,i)=><div key={r.id} className="rh" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 18px",borderBottom:i<rights.length-1?`1px solid ${C.bd}`:"none"}}>
          <div><div style={{fontSize:13,fontWeight:600,color:C.ink}}>{r.creator}</div>
            {r.video_link?<a href={r.video_link.startsWith("http")?r.video_link:"https://"+r.video_link} target="_blank" rel="noreferrer" style={{fontSize:11,color:C.green,fontWeight:600}}>Watch video ↗</a>:<span style={{fontSize:11,color:C.ink3}}>No link</span>}
          </div>
          <Badge v={r.status}/>
        </div>)}
      </Card>
    </div>
  </div>;
};

/* ── Products Tab ───────────────────────────────────────────────────────── */
const ProductsTab = ({clientId,products,setProducts,isAgency}) => {
  const [open,setOpen] = useState(false);
  const [saving,setSaving] = useState(false);
  const [formErr,setFormErr] = useState("");
  const blank = {name:"",sku:"",price:"",cogs:"",shipping:"",tiktok:"6",agency:"15",creator:"10",description:""};
  const [form,setForm] = useState(blank);
  const u = (k,v) => { setFormErr(""); setForm(f=>({...f,[k]:v})); };

  const onSave = async () => {
    if(!form.name?.trim()) { setFormErr("Product name is required."); return; }
    if(!form.price || isNaN(+form.price) || +form.price<=0) { setFormErr("Sell price must be greater than 0."); return; }
    if(form.cogs===""||isNaN(+form.cogs)) { setFormErr("COGS is required."); return; }
    setFormErr(""); setSaving(true);
    const payload = {name:form.name,sku:form.sku,price:+form.price,cogs:+form.cogs,shipping:+form.shipping,tiktok_fee:+form.tiktok,agency_fee:+form.agency,creator_fee:+form.creator,description:form.description};
    if(form.id) {
      const {data} = await supabase.from("products").update(payload).eq("id",form.id).select();
      if(data) setProducts(p=>p.map(x=>x.id===form.id?data[0]:x));
    } else {
      const {data} = await supabase.from("products").insert({client_id:clientId,...payload}).select();
      if(data) setProducts(p=>[...p,data[0]]);
    }
    setSaving(false); setOpen(false); setForm(blank);
  };
  const onDel = async id => { await supabase.from("products").delete().eq("id",id); setProducts(p=>p.filter(x=>x.id!==id)); };
  const toForm = p => ({...p,tiktok:p.tiktok_fee??6,agency:p.agency_fee??15,creator:p.creator_fee??10});

  return <div className="fu">
    <PageHead title="Products" sub={`${products.length} product${products.length!==1?"s":""} in catalog`}
      right={isAgency&&<PBtn onClick={()=>{setForm(blank);setOpen(true);}}>+ Add Product</PBtn>}/>
    {products.length===0
      ? <div style={{background:C.sur,border:`1px solid ${C.bd}`,borderRadius:6,padding:60,textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:600,color:C.ink,marginBottom:6}}>No products yet</div>
          <div style={{fontSize:13,color:C.ink2,marginBottom:20}}>Add your client's products to track COGs and assign to samples</div>
          {isAgency&&<PBtn onClick={()=>{setForm(blank);setOpen(true);}}>+ Add First Product</PBtn>}
        </div>
      : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
          {products.map(p=>{
            const price=+p.price||0,cogs=+p.cogs||0,ship=+p.shipping||0;
            const fees=price*((+(p.tiktok_fee??6)+(p.agency_fee??15)+(p.creator_fee??10))/100);
            const net=price-cogs-ship-fees, marg=price?(net/price*100):0;
            return <div key={p.id} className="card" style={{background:C.sur,border:`1px solid ${C.bd}`,borderRadius:8,padding:18,position:"relative"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:C.ink,marginBottom:2}}>{p.name}</div>
                  {p.sku&&<div style={{fontSize:11,color:C.ink3,fontFamily:C.mono}}>SKU: {p.sku}</div>}
                </div>
                {isAgency&&<div style={{display:"flex",gap:4}}>
                  <ActBtn onClick={()=>{setForm(toForm(p));setOpen(true);}} icon="✎"/>
                  <ActBtn onClick={()=>onDel(p.id)} icon="✕"/>
                </div>}
              </div>
              {p.description&&<div style={{fontSize:12,color:C.ink2,marginBottom:12,lineHeight:1.5}}>{p.description}</div>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <div style={{background:C.bg,borderRadius:4,padding:"8px 10px"}}>
                  <div style={{fontSize:9,color:C.ink3,fontFamily:C.mono,letterSpacing:".08em",textTransform:"uppercase",marginBottom:3}}>Sell Price</div>
                  <div style={{fontSize:16,fontWeight:700,color:C.ink}}>${price.toFixed(2)}</div>
                </div>
                <div style={{background:C.bg,borderRadius:4,padding:"8px 10px"}}>
                  <div style={{fontSize:9,color:C.ink3,fontFamily:C.mono,letterSpacing:".08em",textTransform:"uppercase",marginBottom:3}}>Net/Unit</div>
                  <div style={{fontSize:16,fontWeight:700,color:net>=0?C.green:C.red}}>${net.toFixed(2)}</div>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:10,borderTop:`1px solid ${C.bd}`}}>
                <div style={{fontSize:11,color:C.ink3}}>
                  COGS ${cogs.toFixed(2)} · Ship ${ship.toFixed(2)}
                  {p.created_at&&<span style={{marginLeft:8,color:C.ink3}}>· Added {new Date(p.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>}
                </div>
                <span style={{fontSize:12,fontWeight:700,color:marg>30?C.green:marg>15?C.amber:C.red,background:marg>30?C.gBg:marg>15?C.aBg:C.rBg,padding:"2px 8px",borderRadius:3}}>{marg.toFixed(1)}%</span>
              </div>
            </div>;
          })}
        </div>}
    {isAgency&&<Modal open={open} onClose={()=>setOpen(false)} title={form.id?"Edit Product":"Add Product"} width={540}>
      <R2><Fld label="Product Name"><Inp value={form.name} onChange={e=>u("name",e.target.value)} placeholder="Vitamin C Serum"/></Fld>
      <Fld label="SKU"><Inp value={form.sku} onChange={e=>u("sku",e.target.value)} placeholder="SKU-001"/></Fld></R2>
      <div style={{marginBottom:12}}><Fld label="Description (optional)"><Inp value={form.description} onChange={e=>u("description",e.target.value)} placeholder="Brief product description..."/></Fld></div>
      <R2><Fld label="Sell Price ($)"><Inp type="number" value={form.price} onChange={e=>u("price",e.target.value)}/></Fld>
      <Fld label="COGS ($)"><Inp type="number" value={form.cogs} onChange={e=>u("cogs",e.target.value)}/></Fld></R2>
      <R2><Fld label="Shipping ($)"><Inp type="number" value={form.shipping} onChange={e=>u("shipping",e.target.value)}/></Fld><div/></R2>
      <div style={{height:1,background:C.bd,margin:"12px 0"}}/>
      <div style={{fontSize:9,color:C.ink3,fontFamily:C.mono,letterSpacing:".1em",textTransform:"uppercase",marginBottom:10}}>Fee Percentages</div>
      <R2><Fld label="TikTok (%)"><Inp type="number" value={form.tiktok} onChange={e=>u("tiktok",e.target.value)}/></Fld>
      <Fld label="Agency (%)"><Inp type="number" value={form.agency} onChange={e=>u("agency",e.target.value)}/></Fld></R2>
      <R2><Fld label="Creator (%)"><Inp type="number" value={form.creator} onChange={e=>u("creator",e.target.value)}/></Fld><div/></R2>
      {formErr&&<div style={{background:C.rBg,border:`1px solid ${C.red}30`,borderRadius:5,padding:"9px 13px",fontSize:13,color:C.red,marginBottom:4}}>{formErr}</div>}
      <MFoot onClose={()=>setOpen(false)} onSave={onSave} loading={saving}/>
    </Modal>}
  </div>;
};

/* ── COGs Tab ───────────────────────────────────────────────────────────── */
const CogsTab = ({clientId,products,setProducts,isAgency}) => {
  const [open,setOpen] = useState(false);
  const [saving,setSaving] = useState(false);
  const [formErr,setFormErr] = useState("");
  const blank = {name:"",sku:"",price:"",cogs:"",shipping:"",tiktok:"6",agency:"15",creator:"10"};
  const [form,setForm] = useState(blank);
  const u = (k,v) => { setFormErr(""); setForm(f=>({...f,[k]:v})); };
  const calc = p => {
    const price=+p.price||0,cogs=+p.cogs||0,ship=+p.shipping||0;
    const tt=price*((+p.tiktok||6)/100),ag=price*((+p.agency||15)/100),cr=price*((+p.creator||10)/100);
    const total=cogs+ship+tt+ag+cr,net=price-total,marg=price?(net/price*100):0;
    return {tt,ag,cr,total,net,marg};
  };
  const onSave = async () => {
    if(!form.name?.trim()) { setFormErr("Product name is required."); return; }
    if(!form.price || +form.price<=0) { setFormErr("Sell price is required."); return; }
    setFormErr(""); setSaving(true);
    const payload = {name:form.name,sku:form.sku,price:+form.price,cogs:+form.cogs,shipping:+form.shipping,tiktok_fee:+form.tiktok,agency_fee:+form.agency,creator_fee:+form.creator};
    if(form.id) {
      const {data} = await supabase.from("products").update(payload).eq("id",form.id).select();
      if(data) setProducts(p=>p.map(x=>x.id===form.id?data[0]:x));
    } else {
      const {data} = await supabase.from("products").insert({client_id:clientId,...payload}).select();
      if(data) setProducts(p=>[...p,data[0]]);
    }
    setSaving(false); setOpen(false); setForm(blank);
  };
  const onDel = async id => { await supabase.from("products").delete().eq("id",id); setProducts(p=>p.filter(x=>x.id!==id)); };
  const toForm = p => ({...p, tiktok:p.tiktok_fee??6, agency:p.agency_fee??15, creator:p.creator_fee??10});
  return <div className="fu">
    <PageHead title="COGs & Profit" sub="Fees are set per product" right={isAgency&&<PBtn onClick={()=>{setForm(blank);setOpen(true);}}>+ Add Product</PBtn>}/>
    <Card noPad>
      <Tbl cols={["Product","SKU","Price","COGS","Ship","TikTok%","Agency%","Creator%","Total Fees","Net/Unit","Margin",...(isAgency?[""]:[""])]} empty="No products yet."
        rows={products.map(p=>{
          const fp = {...p, tiktok:p.tiktok_fee??6, agency:p.agency_fee??15, creator:p.creator_fee??10};
          const {tt,ag,cr,total,net,marg}=calc(fp);
          return <tr key={p.id} className="rh">
            <Td bold>{p.name}</Td><Td mono muted>{p.sku}</Td>
            <Td right>${(+p.price||0).toFixed(2)}</Td>
            <Td right color={C.red}>${(+p.cogs||0).toFixed(2)}</Td>
            <Td right color={C.ink2}>${(+p.shipping||0).toFixed(2)}</Td>
            <Td right color={C.amber}>{fp.tiktok}%</Td>
            <Td right color={C.amber}>{fp.agency}%</Td>
            <Td right color={C.amber}>{fp.creator}%</Td>
            <Td right bold color={C.red}>${total.toFixed(2)}</Td>
            <Td right bold color={net>=0?C.green:C.red}>${net.toFixed(2)}</Td>
            <Td right><span style={{fontWeight:700,color:marg>30?C.green:marg>15?C.amber:C.red}}>{marg.toFixed(1)}%</span></Td>
            {isAgency&&<Td><ActBtn onClick={()=>{setForm(toForm(p));setOpen(true);}} icon="✎"/><ActBtn onClick={()=>onDel(p.id)} icon="✕"/></Td>}
          </tr>;
        })}/>
    </Card>
    {isAgency&&<Modal open={open} onClose={()=>setOpen(false)} title={form.id?"Edit Product":"Add Product"} width={560}>
      <R2><Fld label="Product Name"><Inp value={form.name} onChange={e=>u("name",e.target.value)} placeholder="Vitamin C Serum"/></Fld><Fld label="SKU"><Inp value={form.sku} onChange={e=>u("sku",e.target.value)} placeholder="SKU-001"/></Fld></R2>
      <R2><Fld label="Sell Price ($)"><Inp type="number" value={form.price} onChange={e=>u("price",e.target.value)}/></Fld><Fld label="COGS ($)"><Inp type="number" value={form.cogs} onChange={e=>u("cogs",e.target.value)}/></Fld></R2>
      <R2><Fld label="Shipping ($)"><Inp type="number" value={form.shipping} onChange={e=>u("shipping",e.target.value)}/></Fld><div/></R2>
      <div style={{height:1,background:C.bd,margin:"12px 0"}}/>
      <div style={{fontSize:9,fontWeight:600,color:C.ink3,letterSpacing:".1em",textTransform:"uppercase",fontFamily:C.mono,marginBottom:10}}>Fee Percentages</div>
      <R2>
        <Fld label="TikTok Platform Fee (%)"><Inp type="number" value={form.tiktok} onChange={e=>u("tiktok",e.target.value)} placeholder="6"/></Fld>
        <Fld label="Agency Commission (%)"><Inp type="number" value={form.agency} onChange={e=>u("agency",e.target.value)} placeholder="15"/></Fld>
      </R2>
      <R2><Fld label="Creator Affiliate (%)"><Inp type="number" value={form.creator} onChange={e=>u("creator",e.target.value)} placeholder="10"/></Fld><div/></R2>
      {form.price&&<div style={{background:C.gBg,border:`1px solid ${C.green}20`,borderRadius:4,padding:"10px 14px",marginTop:4,fontSize:12,color:C.ink2,fontFamily:C.mono}}>
        Net/unit: <strong style={{color:calc(form).net>=0?C.green:C.red}}>${calc(form).net.toFixed(2)}</strong> · Margin: <strong style={{color:calc(form).marg>30?C.green:calc(form).marg>15?C.amber:C.red}}>{calc(form).marg.toFixed(1)}%</strong>
      </div>}
      {formErr&&<div style={{background:C.rBg,border:`1px solid ${C.red}30`,borderRadius:5,padding:"9px 13px",fontSize:13,color:C.red,marginBottom:4}}>{formErr}</div>}
      <MFoot onClose={()=>setOpen(false)} onSave={onSave} loading={saving}/>
    </Modal>}
  </div>;
};

/* ── Date Range Picker ──────────────────────────────────────────────────── */
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const YEARS = Array.from({length:5},(_,i)=>2023+i);
const DAYS = Array.from({length:31},(_,i)=>i+1);

const DateRangePicker = ({value, onChange}) => {
  // value: { startMonth, startDay, startYear, endMonth, endDay, endYear }
  // We store as a formatted string like "Jan 6 – Jan 12, 2026"
  const now = new Date();
  const [sm, setSm] = useState(value?.sm ?? now.getMonth());
  const [sd, setSd] = useState(value?.sd ?? now.getDate());
  const [sy, setSy] = useState(value?.sy ?? now.getFullYear());
  const [em, setEm] = useState(value?.em ?? now.getMonth());
  const [ed, setEd] = useState(value?.ed ?? now.getDate());
  const [ey, setEy] = useState(value?.ey ?? now.getFullYear());

  useEffect(() => {
    const label = `${MONTHS[sm].slice(0,3)} ${sd} – ${MONTHS[em].slice(0,3)} ${ed}, ${ey}`;
    const startDate = new Date(sy, sm, sd).toISOString();
    onChange({label, startDate, sm, sd, sy, em, ed, ey});
  }, [sm, sd, sy, em, ed, ey]);

  const SS = {padding:"8px 10px",border:`1px solid ${C.bd}`,borderRadius:4,background:"#0a0a0a",color:C.ink,fontSize:13,fontFamily:C.sans,cursor:"pointer"};
  return <div>
    <div style={{marginBottom:12}}>
      <div style={{fontSize:9,fontWeight:600,color:C.ink3,letterSpacing:".1em",textTransform:"uppercase",fontFamily:"monospace",marginBottom:8}}>Start Date</div>
      <div style={{display:"flex",gap:8}}>
        <select value={sm} onChange={e=>setSm(+e.target.value)} style={{...SS,flex:2}}>
          {MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
        </select>
        <select value={sd} onChange={e=>setSd(+e.target.value)} style={{...SS,flex:1}}>
          {DAYS.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
        <select value={sy} onChange={e=>setSy(+e.target.value)} style={{...SS,flex:1}}>
          {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
    <div>
      <div style={{fontSize:9,fontWeight:600,color:C.ink3,letterSpacing:".1em",textTransform:"uppercase",fontFamily:"monospace",marginBottom:8}}>End Date</div>
      <div style={{display:"flex",gap:8}}>
        <select value={em} onChange={e=>setEm(+e.target.value)} style={{...SS,flex:2}}>
          {MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
        </select>
        <select value={ed} onChange={e=>setEd(+e.target.value)} style={{...SS,flex:1}}>
          {DAYS.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
        <select value={ey} onChange={e=>setEy(+e.target.value)} style={{...SS,flex:1}}>
          {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
    <div style={{marginTop:10,padding:"8px 12px",background:C.gBg,border:`1px solid ${C.green}20`,borderRadius:4,fontSize:12,color:C.green,fontFamily:"monospace"}}>
      {MONTHS[sm].slice(0,3)} {sd} – {MONTHS[em].slice(0,3)} {ed}, {ey}
    </div>
  </div>;
};

/* ── Samples Tab ────────────────────────────────────────────────────────── */
const SamplesTab = ({clientId,samples,setSamples,isAgency,products}) => {
  const [open,setOpen] = useState(false);
  const [saving,setSaving] = useState(false);
  const [formErr,setFormErr] = useState("");
  const [dateFilter,setDateFilter] = useState("all");
  const MONTHS2 = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const blank = { creator_name:"", tiktok_link:"", product_id:"", date_sent:todayStr, notes:"" };
  const [form,setForm] = useState(blank);
  const u = (k,v) => { setFormErr(""); setForm(f=>({...f,[k]:v})); };

  const onSave = async () => {
    if(!form.creator_name?.trim()) { setFormErr("Creator name is required."); return; }
    if(!form.date_sent) { setFormErr("Date sent is required."); return; }
    setFormErr(""); setSaving(true);
    const product = products.find(p=>p.id===+form.product_id||p.id===form.product_id);
    const payload = {
      client_id:clientId, creator_name:form.creator_name, tiktok_link:form.tiktok_link,
      product_id:form.product_id||null, product_name:product?.name||"",
      date_sent:form.date_sent, creator_gmv:0, notes:form.notes,
      month:`${MONTHS2[new Date(form.date_sent+"T12:00:00").getMonth()]} ${new Date(form.date_sent+"T12:00:00").getFullYear()}`,
      start_date:new Date(form.date_sent+"T12:00:00").toISOString(),
    };
    if(form.id) {
      const {data} = await supabase.from("samples").update(payload).eq("id",form.id).select();
      if(data) setSamples(p=>p.map(x=>x.id===form.id?data[0]:x));
    } else {
      const {data} = await supabase.from("samples").insert(payload).select();
      if(data) setSamples(p=>[...p,data[0]]);
    }
    setSaving(false); setOpen(false); setForm(blank);
  };
  const onDel = async id => { await supabase.from("samples").delete().eq("id",id); setSamples(p=>p.filter(x=>x.id!==id)); };

  // Date filtering
  const getFilteredSamples = () => {
    const n = new Date(); n.setHours(0,0,0,0);
    if(dateFilter==="today") return samples.filter(s=>s.date_sent===todayStr);
    if(dateFilter==="yesterday") { const y=new Date(n); y.setDate(y.getDate()-1); const ys=`${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,"0")}-${String(y.getDate()).padStart(2,"0")}`; return samples.filter(s=>s.date_sent===ys); }
    if(dateFilter==="week") { const w=new Date(n); w.setDate(w.getDate()-7); return samples.filter(s=>s.date_sent&&new Date(s.date_sent+"T12:00:00")>=w); }
    if(dateFilter==="month") { const m=new Date(n); m.setDate(1); return samples.filter(s=>s.date_sent&&new Date(s.date_sent+"T12:00:00")>=m); }
    if(dateFilter==="lastmonth") {
      const start=new Date(n.getFullYear(),n.getMonth()-1,1);
      const end=new Date(n.getFullYear(),n.getMonth(),1);
      return samples.filter(s=>{if(!s.date_sent)return false; const d=new Date(s.date_sent+"T12:00:00"); return d>=start&&d<end;});
    }
    return samples;
  };
  const filtered = getFilteredSamples();

  // Build daily bar chart data — last 30 days
  // Build date string from LOCAL date parts to avoid UTC timezone shift
  const localDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const chartDays = Array.from({length:30},(_,i)=>{
    const d=new Date(now); d.setDate(d.getDate()-29+i);
    const ds=localDateStr(d);
    return {d:`${d.getMonth()+1}/${d.getDate()}`,v:samples.filter(s=>s.date_sent===ds).length};
  });
  const maxDay = Math.max(...chartDays.map(d=>d.v),1);

  const FILTERS = [{id:"all",label:"All Time"},{id:"today",label:"Today"},{id:"yesterday",label:"Yesterday"},{id:"week",label:"Last Week"},{id:"month",label:"This Month"},{id:"lastmonth",label:"Last Month"}];

  return <div className="fu">
    <PageHead title="Samples" sub={`${samples.length} total samples logged`}
      right={isAgency&&<PBtn onClick={()=>{setForm(blank);setOpen(true);}}>+ Log Sample</PBtn>}/>

    {/* Date filter */}
    <div style={{display:"flex",background:C.sur,border:`1px solid ${C.bd}`,borderRadius:6,overflow:"hidden",marginBottom:20,width:"fit-content"}}>
      {FILTERS.map((f,i)=><button key={f.id} onClick={()=>setDateFilter(f.id)}
        style={{padding:"8px 16px",border:"none",borderRight:i<FILTERS.length-1?`1px solid ${C.bd}`:"none",background:dateFilter===f.id?C.green:"transparent",color:dateFilter===f.id?"#000":C.ink2,fontSize:12,fontWeight:dateFilter===f.id?700:400,cursor:"pointer",fontFamily:C.sans,whiteSpace:"nowrap",transition:"all .15s"}}>
        {f.label}
      </button>)}
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
      <KPI label="Samples" value={filtered.length} sub={FILTERS.find(f=>f.id===dateFilter)?.label}/>
      <KPI label="Products Sampled" value={new Set(filtered.filter(s=>s.product_name).map(s=>s.product_name)).size} sub="unique products"/>
      <KPI label="Total All Time" value={samples.length}/>
    </div>

    {/* Daily bar chart */}
    {samples.length>0&&<Card title="Daily Samples" sub="Last 30 days" style={{marginBottom:16}}>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartDays} barCategoryGap="20%">
          <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{fill:C.ink3,fontSize:10}} interval={4}/>
          <YAxis axisLine={false} tickLine={false} tick={{fill:C.ink3,fontSize:11}} allowDecimals={false} width={28}/>
          <Tooltip content={({active,payload,label})=>active&&payload?.length?<div style={{background:C.sur,border:`1px solid ${C.bd}`,borderRadius:6,padding:"8px 12px",fontSize:12}}><div style={{color:C.ink3,marginBottom:3}}>{label}</div><div style={{color:C.green,fontWeight:700}}>{payload[0].value} sample{payload[0].value!==1?"s":""}</div></div>:null}/>
          <Bar dataKey="v" radius={[3,3,0,0]}>
            {chartDays.map((d,i)=><Cell key={i} fill={d.v>0?C.green:"#1e1e1e"}/>)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>}

    <Card noPad>
      <Tbl cols={["Date","Creator","TikTok","Product",...(isAgency?[""]:[""])]} empty="No samples logged yet."
        rows={[...filtered].sort((a,b)=>new Date(b.date_sent||b.created_at||0)-new Date(a.date_sent||a.created_at||0)).map(s=><tr key={s.id} className="rh">
          <Td mono muted>{s.date_sent||"—"}</Td>
          <Td bold>{s.creator_name||"—"}</Td>
          <Td>{s.tiktok_link
            ?<a href={s.tiktok_link.startsWith("http")?s.tiktok_link:"https://"+s.tiktok_link} target="_blank" rel="noreferrer" style={{color:C.blue,fontSize:12,fontWeight:600,textDecoration:"none"}}>↗ Profile</a>
            :<span style={{color:C.ink3,fontSize:12}}>—</span>}
          </Td>
          <Td>{s.product_name||<span style={{color:C.ink3}}>—</span>}</Td>
          {isAgency&&<Td><ActBtn onClick={()=>{setForm({...s,product_id:s.product_id||""});setOpen(true);}} icon="✎"/><ActBtn onClick={()=>onDel(s.id)} icon="✕"/></Td>}
        </tr>)}/>
    </Card>

    {isAgency&&<Modal open={open} onClose={()=>setOpen(false)} title={form.id?"Edit Sample":"Log Sample"} width={480}>
      <R2>
        <Fld label="Creator Name *"><Inp value={form.creator_name} onChange={e=>u("creator_name",e.target.value)} placeholder="Jane Doe"/></Fld>
        <Fld label="Date Sent *"><Inp type="date" value={form.date_sent} onChange={e=>u("date_sent",e.target.value)}/></Fld>
      </R2>
      <div style={{marginBottom:12}}><Fld label="TikTok Profile Link"><Inp value={form.tiktok_link} onChange={e=>u("tiktok_link",e.target.value)} placeholder="https://tiktok.com/@creator"/></Fld></div>
      <Fld label="Product"><select value={form.product_id} onChange={e=>u("product_id",e.target.value)} style={{...IS,paddingRight:30,marginBottom:12}}>
        <option value="">— Select product —</option>
        {products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select></Fld>
      <div style={{marginBottom:12}}><Fld label="Notes (optional)"><Inp value={form.notes} onChange={e=>u("notes",e.target.value)} placeholder="Any notes..."/></Fld></div>
      {formErr&&<div style={{background:C.rBg,border:`1px solid ${C.red}30`,borderRadius:5,padding:"9px 13px",fontSize:13,color:C.red,marginBottom:4}}>{formErr}</div>}
      <MFoot onClose={()=>setOpen(false)} onSave={onSave} loading={saving}/>
    </Modal>}
  </div>;
};

/* ── Rights Tab ─────────────────────────────────────────────────────────── */
const RightsTab = ({clientId,rights,setRights,isAgency}) => {
  const [open,setOpen] = useState(false);
  const [saving,setSaving] = useState(false);
  const [formErr,setFormErr] = useState("");
  const blank = {creator:"",video_link:"",status:"Not Given",amount_asking:""};
  const [form,setForm] = useState(blank);
  const u = (k,v) => { setFormErr(""); setForm(f=>({...f,[k]:v})); };
  const onSave = async () => {
    if(!form.creator?.trim()) { setFormErr("Creator name is required."); return; }
    setFormErr(""); setSaving(true);
    const payload = {creator:form.creator,video_link:form.video_link,status:form.status,amount_asking:form.status==="Asking for Money"?(+form.amount_asking||0):null};
    if(form.id) {
      const {data} = await supabase.from("rights").update(payload).eq("id",form.id).select();
      if(data) setRights(p=>p.map(x=>x.id===form.id?data[0]:x));
    } else {
      const {data} = await supabase.from("rights").insert({client_id:clientId,...payload}).select();
      if(data) setRights(p=>[...p,data[0]]);
    }
    setSaving(false); setOpen(false); setForm(blank);
  };
  const onDel = async id => { await supabase.from("rights").delete().eq("id",id); setRights(p=>p.filter(x=>x.id!==id)); };
  const updStatus = async (id,status) => { await supabase.from("rights").update({status}).eq("id",id); setRights(p=>p.map(x=>x.id===id?{...x,status}:x)); };
  return <div className="fu">
    <PageHead title="Usage Rights" right={isAgency&&<PBtn onClick={()=>{setForm(blank);setOpen(true);}}>+ Add Creator</PBtn>}/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:18}}>
      {[["Rights Given",rights.filter(r=>r.status==="Given").length,C.green,C.gBg],["Not Given",rights.filter(r=>r.status==="Not Given").length,C.red,C.rBg],["Asking for Money",rights.filter(r=>r.status==="Asking for Money").length,C.amber,C.aBg]]
        .map(([l,n,col,bg])=><div key={l} style={{background:bg,border:`1px solid ${col}20`,borderRadius:12,padding:"16px 20px"}}>
          <div style={{fontSize:26,fontWeight:800,color:col}}>{n}</div>
          <div style={{fontSize:11,color:col,fontWeight:600,marginTop:4,textTransform:"uppercase",letterSpacing:".05em"}}>{l}</div>
        </div>)}
    </div>
    <Card noPad>
      <Tbl cols={["Creator","Video Link","Status","Asking",...(isAgency?[""]:[""])]} empty="No creators yet."
        rows={rights.map(r=><tr key={r.id} className="rh">
          <Td bold>{r.creator}</Td>
          <Td>{r.video_link?<a href={r.video_link.startsWith("http")?r.video_link:"https://"+r.video_link} target="_blank" rel="noreferrer" style={{color:C.green,fontSize:12,fontWeight:600,textDecoration:"none"}}>Open video ↗</a>:<span style={{color:C.ink3,fontSize:12}}>No link</span>}</Td>
          <Td><select value={r.status} onChange={e=>updStatus(r.id,e.target.value)} disabled={!isAgency}
            style={{...IS,width:"auto",padding:"4px 28px 4px 9px",fontSize:12,fontWeight:600,color:STATUS_MAP[r.status]?.[0]||C.ink2,background:STATUS_MAP[r.status]?.[1]||C.bd2,border:`1px solid ${STATUS_MAP[r.status]?.[0]||C.bd}30`,borderRadius:20}}>
            <option>Given</option><option>Not Given</option><option>Asking for Money</option>
          </select></Td>
          <Td>{r.status==="Asking for Money"&&r.amount_asking?<span style={{color:C.amber,fontWeight:700}}>${(+r.amount_asking).toLocaleString()}</span>:<span style={{color:C.ink3}}>—</span>}</Td>
          {isAgency&&<Td><ActBtn onClick={()=>{setForm({...r,amount_asking:r.amount_asking||""});setOpen(true);}} icon="✎"/><ActBtn onClick={()=>onDel(r.id)} icon="✕"/></Td>}
        </tr>)}/>
    </Card>
    {isAgency&&<Modal open={open} onClose={()=>setOpen(false)} title={form.id?"Edit":"Add Creator"}>
      <R2><Fld label="Creator Name"><Inp value={form.creator} onChange={e=>u("creator",e.target.value)}/></Fld>
      <Fld label="Status"><Sel value={form.status} onChange={e=>u("status",e.target.value)}><option>Given</option><option>Not Given</option><option>Asking for Money</option></Sel></Fld></R2>
      {form.status==="Asking for Money"&&<div style={{marginBottom:12}}><Fld label="Amount Asking ($)"><Inp type="number" value={form.amount_asking} onChange={e=>u("amount_asking",e.target.value)} placeholder="500"/></Fld></div>}
      <div style={{marginBottom:12}}><Fld label="Video Link"><Inp value={form.video_link} onChange={e=>u("video_link",e.target.value)} placeholder="https://tiktok.com/..."/></Fld></div>
      {formErr&&<div style={{background:C.rBg,border:`1px solid ${C.red}30`,borderRadius:5,padding:"9px 13px",fontSize:13,color:C.red,marginBottom:4}}>{formErr}</div>}
      <MFoot onClose={()=>setOpen(false)} onSave={onSave} loading={saving}/>
    </Modal>}
  </div>;
};

/* ── Retainers Tab ──────────────────────────────────────────────────────── */
const RetainersTab = ({clientId,retainers,setRetainers,isAgency}) => {
  const [open,setOpen] = useState(false);
  const [saving,setSaving] = useState(false);
  const [formErr,setFormErr] = useState("");
  const blank = {creator:"",handle:"",monthly_fee:"",videos_per_month:"",status:"Active",notes:""};
  const [form,setForm] = useState(blank);
  const u = (k,v) => { setFormErr(""); setForm(f=>({...f,[k]:v})); };
  const active = retainers.filter(r=>r.status==="Active");
  const totalMo = active.reduce((s,r)=>s+(+r.monthly_fee||0),0);
  const onSave = async () => {
    if(!form.creator?.trim()) { setFormErr("Creator name is required."); return; }
    if(!form.monthly_fee || isNaN(+form.monthly_fee) || +form.monthly_fee<=0) { setFormErr("Monthly fee must be greater than 0."); return; }
    setFormErr(""); setSaving(true);
    const d = {creator:form.creator,handle:form.handle,monthly_fee:+form.monthly_fee,videos_per_month:+form.videos_per_month,status:form.status,notes:form.notes};
    if(form.id) {
      const {data} = await supabase.from("retainers").update(d).eq("id",form.id).select();
      if(data) setRetainers(p=>p.map(x=>x.id===form.id?data[0]:x));
    } else {
      const {data} = await supabase.from("retainers").insert({...d,client_id:clientId}).select();
      if(data) setRetainers(p=>[...p,data[0]]);
    }
    setSaving(false); setOpen(false); setForm(blank);
  };
  const onDel = async id => { await supabase.from("retainers").delete().eq("id",id); setRetainers(p=>p.filter(x=>x.id!==id)); };
  const updStatus = async (id,status) => { await supabase.from("retainers").update({status}).eq("id",id); setRetainers(p=>p.map(x=>x.id===id?{...x,status}:x)); };
  return <div className="fu">
    <PageHead title="Retainers" right={isAgency&&<PBtn onClick={()=>{setForm(blank);setOpen(true);}}>+ Add Retainer</PBtn>}/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:18}}>
      <KPI label="Active Contracts" value={active.length}/>
      <KPI label="Monthly Spend" value={`$${totalMo.toLocaleString()}`} color={C.green}/>
      <KPI label="Videos / Month" value={active.reduce((s,r)=>s+(+r.videos_per_month||0),0)}/>
    </div>
    <Card noPad>
      <Tbl cols={["Creator","Handle","Monthly Fee","Videos/Mo","$/Video","Status","Notes",...(isAgency?[""]:[""])]} empty="No retainers yet."
        rows={retainers.map(r=>{
          const fpv=(+r.videos_per_month>0)?(+r.monthly_fee/+r.videos_per_month):0;
          return <tr key={r.id} className="rh">
            <Td bold>{r.creator}</Td><Td mono muted>{r.handle}</Td>
            <Td right bold color={C.green}>${(+r.monthly_fee||0).toLocaleString()}<span style={{fontSize:10,color:C.ink3,fontWeight:400}}>/mo</span></Td>
            <Td right>{r.videos_per_month}</Td><Td right color={C.amber}>${fpv.toFixed(0)}</Td>
            <Td><select value={r.status} onChange={e=>updStatus(r.id,e.target.value)} disabled={!isAgency}
              style={{...IS,width:"auto",padding:"4px 28px 4px 9px",fontSize:12,fontWeight:600,color:STATUS_MAP[r.status]?.[0]||C.ink2,background:STATUS_MAP[r.status]?.[1]||C.bd2,border:`1px solid ${STATUS_MAP[r.status]?.[0]||C.bd}30`,borderRadius:20}}>
              <option>Active</option><option>Paused</option><option>Ended</option><option>Pending</option>
            </select></Td>
            <Td muted>{r.notes}</Td>
            {isAgency&&<Td><ActBtn onClick={()=>{setForm(r);setOpen(true);}} icon="✎"/><ActBtn onClick={()=>onDel(r.id)} icon="✕"/></Td>}
          </tr>;
        })}/>
    </Card>
    {isAgency&&<Modal open={open} onClose={()=>setOpen(false)} title={form.id?"Edit":"Add Retainer"}>
      <R2><Fld label="Creator Name"><Inp value={form.creator} onChange={e=>u("creator",e.target.value)}/></Fld><Fld label="Handle"><Inp value={form.handle} onChange={e=>u("handle",e.target.value)} placeholder="@creator"/></Fld></R2>
      <R2><Fld label="Monthly Fee ($)"><Inp type="number" value={form.monthly_fee} onChange={e=>u("monthly_fee",e.target.value)}/></Fld><Fld label="Videos/Mo"><Inp type="number" value={form.videos_per_month} onChange={e=>u("videos_per_month",e.target.value)}/></Fld></R2>
      <R2><Fld label="Status"><Sel value={form.status} onChange={e=>u("status",e.target.value)}><option>Active</option><option>Paused</option><option>Ended</option><option>Pending</option></Sel></Fld>
      <Fld label="Notes"><Inp value={form.notes} onChange={e=>u("notes",e.target.value)}/></Fld></R2>
      <MFoot onClose={()=>setOpen(false)} onSave={onSave} loading={saving}/>
    </Modal>}
  </div>;
};

/* ── GMV Tab ────────────────────────────────────────────────────────────── */
const GmvTab = ({clientId,gmvData,setGmvData,isAgency}) => {
  const [open,setOpen] = useState(false);
  const [saving,setSaving] = useState(false);
  const [formErr,setFormErr] = useState("");
  const now2 = new Date();
  const blankDate2 = {sm:now2.getMonth(),sd:now2.getDate(),sy:now2.getFullYear(),em:now2.getMonth(),ed:now2.getDate(),ey:now2.getFullYear(),label:"",startDate:""};
  const blank = {dateRange:blankDate2,gmv:""};
  const [form,setForm] = useState(blank);
  const u = (k,v) => { setFormErr(""); setForm(f=>({...f,[k]:v})); };
  const totalGMV = gmvData.reduce((s,g)=>s+(+g.gmv||0),0);
  const maxGMV = Math.max(...gmvData.map(g=>+g.gmv||0),1);
  const onSave = async () => {
    if(!form.gmv || isNaN(+form.gmv) || +form.gmv<=0) { setFormErr("GMV amount is required and must be greater than 0."); return; }
    setFormErr(""); setSaving(true);
    const label = form.dateRange?.label || "";
    const startDate = form.dateRange?.startDate || new Date().toISOString();
    if(form.id) {
      const {data} = await supabase.from("gmv").update({month:label,gmv:+form.gmv,start_date:startDate}).eq("id",form.id).select();
      if(data) setGmvData(p=>p.map(x=>x.id===form.id?data[0]:x));
    } else {
      const {data} = await supabase.from("gmv").insert({client_id:clientId,month:label,gmv:+form.gmv,start_date:startDate}).select();
      if(data) setGmvData(p=>[...p,data[0]]);
    }
    setSaving(false); setOpen(false); setForm(blank);
  };
  const onDel = async id => { await supabase.from("gmv").delete().eq("id",id); setGmvData(p=>p.filter(x=>x.id!==id)); };
  const toEditForm = g => {
    const d = g.start_date ? new Date(g.start_date) : new Date();
    return {...g, dateRange:{sm:d.getMonth(),sd:d.getDate(),sy:d.getFullYear(),em:d.getMonth(),ed:d.getDate()+6,ey:d.getFullYear(),label:g.month,startDate:g.start_date||""}};
  };
  return <div className="fu">
    <PageHead title="GMV" sub="Weekly gross merchandise value" right={isAgency&&<PBtn onClick={()=>{setForm(blank);setOpen(true);}}>+ Add Week</PBtn>}/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:18}}>
      <KPI label="Total GMV" value={`$${(totalGMV/1000).toFixed(1)}K`} color={C.green}/>
      <KPI label="Best Week" value={`$${(maxGMV/1000).toFixed(1)}K`}/>
      <KPI label="Weeks Tracked" value={gmvData.length}/>
    </div>
    {gmvData.length>0&&(()=>{
      // Group entries by "Month Year" using start_date, sum GMV, sort chronologically
      const MORDER = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const grouped = {};
      gmvData.forEach(g => {
        const d = g.start_date ? new Date(g.start_date) : null;
        const key = d ? `${MORDER[d.getMonth()]} ${d.getFullYear()}` : (g.month?.split("–")[0]?.trim().split(" ").slice(0,2).join(" ") || "Other");
        const sortKey = d ? d.getFullYear()*100 + d.getMonth() : 999999;
        if(!grouped[key]) grouped[key] = {m:key, v:0, sortKey};
        grouped[key].v += (+g.gmv||0);
      });
      const chartData = Object.values(grouped).sort((a,b)=>a.sortKey-b.sortKey);
      const lastKey = chartData[chartData.length-1]?.m;
      return <Card title="Monthly GMV" style={{marginBottom:12}}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barCategoryGap="30%">
            <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{fill:C.ink3,fontSize:11,fontWeight:600}}/>
            <YAxis axisLine={false} tickLine={false} tick={{fill:C.ink3,fontSize:11}} tickFormatter={v=>`$${(v/1000).toFixed(1)}K`} width={48}/>
            <Tooltip content={<Tip/>}/>
            <Bar dataKey="v" radius={[4,4,0,0]}>{chartData.map((d,i)=><Cell key={i} fill={d.m===lastKey?C.green:"#2a2a2a"}/>)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>;
    })()}
    <Card noPad>
      <Tbl cols={["Week","GMV",...(isAgency?[""]:[""])]} empty="No GMV data yet."
        rows={[...gmvData].sort((a,b)=>{
          const da = a.start_date ? new Date(a.start_date) : new Date(0);
          const db = b.start_date ? new Date(b.start_date) : new Date(0);
          return db-da; // newest first
        }).map(g=><tr key={g.id} className="rh">
          <Td bold>{g.month}</Td>
          <Td right bold color={C.green} style={{fontSize:15}}>${(+g.gmv||0).toLocaleString()}</Td>
          {isAgency&&<Td><ActBtn onClick={()=>{setForm(toEditForm(g));setOpen(true);}} icon="✎"/><ActBtn onClick={()=>onDel(g.id)} icon="✕"/></Td>}
        </tr>)}/>
    </Card>
    {isAgency&&<Modal open={open} onClose={()=>setOpen(false)} title={form.id?"Edit Week":"Add Week"} width={480}>
      <div style={{marginBottom:16}}><DateRangePicker value={form.dateRange} onChange={dr=>u("dateRange",dr)}/></div>
      <Fld label="GMV ($)"><Inp type="number" value={form.gmv} onChange={e=>u("gmv",e.target.value)} placeholder="0"/></Fld>
      {formErr&&<div style={{background:C.rBg,border:`1px solid ${C.red}30`,borderRadius:5,padding:"9px 13px",fontSize:13,color:C.red,marginBottom:4}}>{formErr}</div>}
      <MFoot onClose={()=>setOpen(false)} onSave={onSave} loading={saving}/>
    </Modal>}
  </div>;
};

/* ── Monthly Report ─────────────────────────────────────────────────────── */
const MonthlyReport = ({clientId,samples,gmvData,retainers,rights}) => {
  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth());
  const [selYear,  setSelYear]  = useState(now.getFullYear());
  const MONTHS_L = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const YEARS = [2024,2025,2026,2027];

  const inMonth = (dateStr) => {
    if(!dateStr) return false;
    const d = new Date(dateStr+"T12:00:00");
    return d.getMonth()===selMonth && d.getFullYear()===selYear;
  };

  const mSamples  = samples.filter(s=>inMonth(s.date_sent||s.start_date?.slice(0,10)));
  const mGmv      = gmvData.filter(g=>inMonth(g.start_date?.slice(0,10)||g.created_at?.slice(0,10)));
  const totalGmv  = mGmv.reduce((s,g)=>s+(+g.gmv||0),0);
  const activeRet = retainers.filter(r=>r.status==="Active");
  const retainerTotal = activeRet.reduce((s,r)=>s+(+r.monthly_fee||0),0);
  const rightsGiven = rights.filter(r=>r.status==="Given").length;
  const rightsAsking = rights.filter(r=>r.status==="Asking for Money");

  return <div className="fu">
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28}}>
      <div>
        <h1 style={{fontSize:26,fontWeight:700,color:C.ink,letterSpacing:"-1px",fontFamily:"'Space Grotesk',sans-serif"}}>Monthly Report</h1>
        <p style={{fontSize:13,color:C.ink2,marginTop:6}}>Summary for {MONTHS_L[selMonth]} {selYear}</p>
      </div>
      <div style={{display:"flex",gap:8}}>
        <select value={selMonth} onChange={e=>setSelMonth(+e.target.value)} style={{...IS,width:"auto",padding:"8px 32px 8px 12px"}}>
          {MONTHS_L.map((m,i)=><option key={i} value={i}>{m}</option>)}
        </select>
        <select value={selYear} onChange={e=>setSelYear(+e.target.value)} style={{...IS,width:"auto",padding:"8px 32px 8px 12px"}}>
          {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>

    {/* KPI row */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
      <KPI label="GMV" value={`$${(totalGmv/1000).toFixed(1)}K`} color={C.green} sub={`${mGmv.length} entries`}/>
      <KPI label="Samples Sent" value={mSamples.length} sub="this month"/>
      <KPI label="Retainer Revenue" value={`$${retainerTotal.toLocaleString()}`} sub={`${activeRet.length} active`}/>
      <KPI label="Rights Given" value={rightsGiven} sub={`of ${rights.length} total`}/>
    </div>

    {/* GMV breakdown */}
    <Card title={`GMV Entries — ${MONTHS_L[selMonth]} ${selYear}`} style={{marginBottom:14}}>
      {mGmv.length===0 && <div style={{padding:"24px 0",textAlign:"center",color:C.ink3,fontSize:13}}>No GMV logged for this month</div>}
      {mGmv.length>0 && <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:"rgba(255,255,255,.03)"}}>
            {["Week","GMV"].map(c=><th key={c} style={{padding:"11px 16px",textAlign:"left",fontSize:11,fontWeight:600,color:C.ink2,letterSpacing:".05em",textTransform:"uppercase",borderBottom:`1px solid ${C.bd}`}}>{c}</th>)}
          </tr></thead>
          <tbody>{mGmv.map(g=><tr key={g.id} className="rh">
            <td style={{padding:"12px 16px",color:C.ink,fontSize:14,borderBottom:`1px solid ${C.bd}`}}>{g.month}</td>
            <td style={{padding:"12px 16px",color:C.green,fontWeight:700,fontSize:14,borderBottom:`1px solid ${C.bd}`}}>{`$${(+g.gmv||0).toLocaleString()}`}</td>
          </tr>)}</tbody>
        </table>
        <div style={{padding:"12px 16px",borderTop:`1px solid ${C.bd}`,display:"flex",justifyContent:"space-between",background:"rgba(61,255,160,.04)"}}>
          <span style={{fontSize:13,fontWeight:600,color:C.ink}}>Total GMV</span>
          <span style={{fontSize:15,fontWeight:800,color:C.green}}>{`$${totalGmv.toLocaleString()}`}</span>
        </div>
      </div>}
    </Card>

    {/* Samples breakdown */}
    <Card title={`Samples Sent — ${MONTHS_L[selMonth]} ${selYear}`} style={{marginBottom:14}}>
      {mSamples.length===0 && <div style={{padding:"24px 0",textAlign:"center",color:C.ink3,fontSize:13}}>No samples logged for this month</div>}
      {mSamples.length>0 && <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:"rgba(255,255,255,.03)"}}>
            {["Date","Creator","Product","TikTok"].map(c=><th key={c} style={{padding:"11px 16px",textAlign:"left",fontSize:11,fontWeight:600,color:C.ink2,letterSpacing:".05em",textTransform:"uppercase",borderBottom:`1px solid ${C.bd}`}}>{c}</th>)}
          </tr></thead>
          <tbody>{mSamples.map(s=><tr key={s.id} className="rh">
            <td style={{padding:"12px 16px",color:C.ink3,fontSize:12,fontFamily:C.mono,borderBottom:`1px solid ${C.bd}`}}>{s.date_sent||"—"}</td>
            <td style={{padding:"12px 16px",color:C.ink,fontWeight:600,fontSize:14,borderBottom:`1px solid ${C.bd}`}}>{s.creator_name||"—"}</td>
            <td style={{padding:"12px 16px",color:C.ink2,fontSize:13,borderBottom:`1px solid ${C.bd}`}}>{s.product_name||"—"}</td>
            <td style={{padding:"12px 16px",borderBottom:`1px solid ${C.bd}`}}>{s.tiktok_link?<a href={s.tiktok_link.startsWith("http")?s.tiktok_link:"https://"+s.tiktok_link} target="_blank" rel="noreferrer" style={{color:C.blue,fontSize:12,fontWeight:600,textDecoration:"none"}}>↗ Profile</a>:<span style={{color:C.ink3,fontSize:12}}>—</span>}</td>
          </tr>)}</tbody>
        </table>
        <div style={{padding:"12px 16px",borderTop:`1px solid ${C.bd}`,background:"rgba(255,255,255,.02)",fontSize:13,color:C.ink2}}>
          {mSamples.length} sample{mSamples.length!==1?"s":""} sent this month
        </div>
      </div>}
    </Card>

    {/* Retainers */}
    <Card title="Active Retainers" style={{marginBottom:14}}>
      {activeRet.length===0 && <div style={{padding:"24px 0",textAlign:"center",color:C.ink3,fontSize:13}}>No active retainers</div>}
      {activeRet.length>0 && <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:"rgba(255,255,255,.03)"}}>
            {["Creator","Handle","Videos/Mo","Monthly Fee"].map(c=><th key={c} style={{padding:"11px 16px",textAlign:"left",fontSize:11,fontWeight:600,color:C.ink2,letterSpacing:".05em",textTransform:"uppercase",borderBottom:`1px solid ${C.bd}`}}>{c}</th>)}
          </tr></thead>
          <tbody>{activeRet.map(r=><tr key={r.id} className="rh">
            <td style={{padding:"12px 16px",color:C.ink,fontWeight:600,fontSize:14,borderBottom:`1px solid ${C.bd}`}}>{r.creator}</td>
            <td style={{padding:"12px 16px",color:C.ink3,fontSize:12,fontFamily:C.mono,borderBottom:`1px solid ${C.bd}`}}>{r.handle||"—"}</td>
            <td style={{padding:"12px 16px",color:C.ink2,fontSize:13,borderBottom:`1px solid ${C.bd}`}}>{r.videos_per_month||"—"}</td>
            <td style={{padding:"12px 16px",color:C.green,fontWeight:700,fontSize:14,borderBottom:`1px solid ${C.bd}`}}>{`$${(+r.monthly_fee||0).toLocaleString()}`}</td>
          </tr>)}</tbody>
        </table>
        <div style={{padding:"12px 16px",borderTop:`1px solid ${C.bd}`,display:"flex",justifyContent:"space-between",background:"rgba(61,255,160,.04)"}}>
          <span style={{fontSize:13,fontWeight:600,color:C.ink}}>Monthly Retainer Total</span>
          <span style={{fontSize:15,fontWeight:800,color:C.green}}>{`$${retainerTotal.toLocaleString()}`}</span>
        </div>
      </div>}
    </Card>

    {/* Rights asking for money */}
    {rightsAsking.length>0&&<Card title="Creators Asking for Payment" style={{marginBottom:14}}>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:"rgba(255,255,255,.03)"}}>
            {["Creator","Amount Asking","Video"].map(c=><th key={c} style={{padding:"11px 16px",textAlign:"left",fontSize:11,fontWeight:600,color:C.ink2,letterSpacing:".05em",textTransform:"uppercase",borderBottom:`1px solid ${C.bd}`}}>{c}</th>)}
          </tr></thead>
          <tbody>{rightsAsking.map(r=><tr key={r.id} className="rh">
            <td style={{padding:"12px 16px",color:C.ink,fontWeight:600,fontSize:14,borderBottom:`1px solid ${C.bd}`}}>{r.creator}</td>
            <td style={{padding:"12px 16px",color:C.amber,fontWeight:700,fontSize:14,borderBottom:`1px solid ${C.bd}`}}>{r.amount_asking?`$${(+r.amount_asking).toLocaleString()}`:"Not specified"}</td>
            <td style={{padding:"12px 16px",borderBottom:`1px solid ${C.bd}`}}>{r.video_link?<a href={r.video_link.startsWith("http")?r.video_link:"https://"+r.video_link} target="_blank" rel="noreferrer" style={{color:C.green,fontSize:12,fontWeight:600,textDecoration:"none"}}>↗ Video</a>:<span style={{color:C.ink3,fontSize:12}}>—</span>}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </Card>}
  </div>;
};

/* ════════════════════════════════════════════════════════════════════════════
   ROOT
════════════════════════════════════════════════════════════════════════════ */
export default function App() {
  injectFonts();
  const [session,   setSession]   = useState(null);
  const [profile,   setProfile]   = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [tab,       setTab]       = useState("dashboard");
  const [clientId,  setClientId]  = useState(null);
  const [clients,   setClients]   = useState([]);
  const [products,  setProducts]  = useState([]);
  const [samples,   setSamples]   = useState([]);
  const [rights,    setRights]    = useState([]);
  const [retainers, setRetainers] = useState([]);
  const [gmvData,   setGmvData]   = useState([]);
  const [addClient, setAddClient] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const blankC = {name:"",handle:"",category:"Beauty",status:"Active",gmv:0,manager:"",email:"",password:""};
  const [cForm,setCForm] = useState(blankC);

  const isAgency = profile?.role === "agency"; // admin — all clients, add/delete
  const isStaff  = profile?.role === "staff";   // employee — edit one client's data
  const isClient = profile?.role === "client";  // client — view only
  const canEdit  = isAgency || isStaff;         // who can edit

  useEffect(() => {
    let mounted = true;

    const loadUser = async (session) => {
      if (!session) { if (mounted) setAuthLoading(false); return; }
      try {
        // Fetch profile — retry once if it doesn't exist yet (new user race condition)
        let prof = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
          if (data) { prof = data; break; }
          if (attempt < 2) await new Promise(r => setTimeout(r, 800)); // wait 800ms then retry
        }
        if (!mounted) return;

        if (!prof) {
          console.error("No profile found for user:", session.user.email);
          if (mounted) setAuthLoading(false);
          return;
        }

        setSession(session);
        setProfile(prof);

        if (prof.role === "agency") {
          // Admin sees all clients
          const { data: cl } = await supabase.from("clients").select("*").order("created_at");
          if (!mounted) return;
          const list = cl || [];
          setClients(list);
          if (list.length) setClientId(list[0].id);
        } else if (prof.role === "staff") {
          // Staff sees only their assigned client
          if (prof.client_id) {
            const { data: cl } = await supabase.from("clients").select("*").eq("id", prof.client_id).single();
            if (!mounted) return;
            if (cl) { setClients([cl]); setClientId(cl.id); }
          }
        } else {
          // Client — read only, sees their client
          if (prof.client_id) {
            const { data: cl } = await supabase.from("clients").select("*").eq("id", prof.client_id).single();
            if (!mounted) return;
            if (cl) { setClients([cl]); setClientId(cl.id); }
          }
        }
      } catch (e) {
        console.error("loadUser error:", e);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    // Run on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) loadUser(session).then(() => { initialLoadDone = true; });
    });

    // Track whether initial load completed
    let initialLoadDone = false;

    // Also handle sign-in events (covers login from LoginScreen)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && !initialLoadDone) {
        // Only re-run if initial load hasn't completed (i.e. this is a real new login)
        if (mounted) {
          setSession(null);
          setProfile(null);
          setClients([]);
          setClientId(null);
          loadUser(session).then(() => { initialLoadDone = true; });
        }
      } else if (event === "SIGNED_OUT") {
        if (mounted) {
          setSession(null);
          setProfile(null);
          setClients([]);
          setClientId(null);
          setAuthLoading(false);
        }
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!clientId) return;
    let mounted = true;
    (async () => {
      setDataLoading(true);
      try {
        const [pr, sa, ri, re, gv] = await Promise.all([
          supabase.from("products").select("*").eq("client_id", clientId),
          supabase.from("samples").select("*").eq("client_id", clientId).order("created_at"),
          supabase.from("rights").select("*").eq("client_id", clientId),
          supabase.from("retainers").select("*").eq("client_id", clientId),
          supabase.from("gmv").select("*").eq("client_id", clientId).order("created_at"),
        ]);
        if (!mounted) return;
        setProducts(pr.data || []); setSamples(sa.data || []);
        setRights(ri.data || []); setRetainers(re.data || []);
        setGmvData(gv.data || []);
      } catch (e) {
        console.error("Data load error:", e);
      } finally {
        if (mounted) setDataLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [clientId]);

  const [addStep, setAddStep] = useState(1); // 1=form, 2=success
  const [newClientId, setNewClientId] = useState(null);
  const [clientErr, setClientErr] = useState("");

  const saveClient = async () => {
    if(!cForm.name?.trim()) { setClientErr("Brand name is required."); return; }
    if(!cForm.email?.trim()) { setClientErr("Client email is required to create their login."); return; }
    setClientErr(""); setAddSaving(true);
    const {data:cl, error} = await supabase.from("clients").insert({
      name:cForm.name, handle:cForm.handle, category:cForm.category,
      status:cForm.status, gmv:+cForm.gmv||0, manager:cForm.manager,
    }).select().single();
    if(error || !cl) { setClientErr("Failed to save client. Try again."); setAddSaving(false); return; }
    setClients(p=>[...p,cl]);
    setNewClientId(cl.id);
    setAddSaving(false);
    setAddStep(2); // show success step with SQL instructions
  };

  const closeAddClient = () => { setAddClient(false); setAddStep(1); setCForm(blankC); setClientErr(""); setNewClientId(null); };

  const signOut = async () => { await supabase.auth.signOut(); setSession(null); setProfile(null); setClients([]); };

  const [menuOpenId, setMenuOpenId] = useState(null); // which client's 3-dot menu is open
  const deleteClient = async (id) => {
    if(!confirm("Delete this client and ALL their data? This cannot be undone.")) return;
    await supabase.from("gmv").delete().eq("client_id", id);
    await supabase.from("samples").delete().eq("client_id", id);
    await supabase.from("rights").delete().eq("client_id", id);
    await supabase.from("retainers").delete().eq("client_id", id);
    await supabase.from("products").delete().eq("client_id", id);
    await supabase.from("clients").delete().eq("id", id);
    const remaining = clients.filter(c => c.id !== id);
    setClients(remaining);
    if(clientId === id) {
      setClientId(remaining[0]?.id || null);
      setTab("dashboard");
    }
    setMenuOpenId(null);
  };
  const current = clients.find(c=>c.id===clientId);
  const ALL_TABS = [{id:"dashboard",label:isAgency?"Overview":"My Dashboard"},{id:"products",label:"Products"},{id:"cogs",label:"COGs & Profit"},{id:"samples",label:"Samples"},{id:"rights",label:"Usage Rights"},{id:"retainers",label:"Retainers"},{id:"gmv",label:"GMV"},{id:"monthly",label:"Monthly Report"}];
  // Client sees limited tabs (no COGs, no Products detail)
  const NAV = isClient
    ? ALL_TABS.filter(t=>["dashboard","samples","rights","retainers","gmv","monthly"].includes(t.id))
    : ALL_TABS;

  if(authLoading) return <Spin/>;
  if(!session)    return <LoginScreen/>;

  return <div style={{display:"flex",height:"100vh",background:C.bg,fontFamily:C.sans}}>
    {/* Sidebar */}
    <aside style={{width:220,background:"#0a0a0a",borderRight:`1px solid ${C.bd}`,display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto",height:"100vh"}}>
      {/* Logo */}
      <div style={{padding:"20px 20px 16px",borderBottom:`1px solid ${C.bd}`}}>
        <img src="/logo.png" alt="Scale House" style={{height:38,objectFit:"contain",display:"block"}}/>
      </div>

      {/* Client selector — agency */}
      {isAgency&&<div style={{padding:"16px 12px 8px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 8px",marginBottom:8}}>
          <span style={{fontSize:10,fontWeight:600,color:C.ink3,letterSpacing:".08em",textTransform:"uppercase"}}>Clients</span>
          {isAgency&&<button onClick={()=>{setCForm(blankC);setAddClient(true);}}
            style={{width:20,height:20,border:`1px solid ${C.bd}`,background:"transparent",borderRadius:3,cursor:"pointer",fontSize:14,color:C.green,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,transition:"all .15s"}}
            onMouseEnter={e=>{e.currentTarget.style.background=C.gBg;e.currentTarget.style.borderColor=C.green;}}
            onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor=C.bd;}}>+</button>}
        </div>
        {clients.map(cl=>{
          const active = clientId===cl.id;
          const menuOpen = menuOpenId===cl.id;
          return <div key={cl.id} style={{position:"relative",marginBottom:2}}>
            <div style={{display:"flex",alignItems:"center",borderRadius:4,borderLeft:active?`2px solid ${C.green}`:"2px solid transparent",background:active?C.gBg:"transparent",transition:"all .15s"}}>
              <button onClick={()=>{setClientId(cl.id);setTab("dashboard");setMenuOpenId(null);}} className={`client-btn${active?" active":""}`}
                style={{flex:1,display:"flex",alignItems:"center",gap:9,padding:"8px 8px 8px 10px",border:"none",background:"transparent",cursor:"pointer",textAlign:"left",minWidth:0}}>
                <div style={{width:24,height:24,borderRadius:4,background:active?C.green:"#1a1a1a",border:`1px solid ${active?C.green:C.bd}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:active?"#000":C.ink2,flexShrink:0}}>{cl.name?.charAt(0)?.toUpperCase()}</div>
                <span style={{fontSize:13,fontWeight:active?600:400,color:active?C.green:C.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cl.name}</span>
              </button>
              <button onClick={e=>{e.stopPropagation();setMenuOpenId(menuOpen?null:cl.id);}}
                style={{width:24,height:24,border:"none",background:"transparent",cursor:"pointer",color:C.ink3,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:3,flexShrink:0,marginRight:4,lineHeight:1,transition:"color .15s"}}
                onMouseEnter={e=>e.currentTarget.style.color=C.ink}
                onMouseLeave={e=>e.currentTarget.style.color=C.ink3}>···</button>
            </div>
            {menuOpen&&<div style={{position:"absolute",right:4,top:"100%",zIndex:100,background:"#1e1e1e",border:`1px solid ${C.bd}`,borderRadius:5,boxShadow:"0 8px 24px rgba(0,0,0,.6)",minWidth:140,overflow:"hidden"}}>
              <button onClick={()=>{setMenuOpenId(null);setClientId(cl.id);setTab("dashboard");}}
                style={{width:"100%",padding:"9px 14px",border:"none",background:"transparent",color:C.ink,fontSize:13,textAlign:"left",cursor:"pointer",display:"block"}}
                onMouseEnter={e=>e.currentTarget.style.background=C.sur2}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>View Dashboard</button>
              <div style={{height:1,background:C.bd}}/>
              <button onClick={()=>deleteClient(cl.id)}
                style={{width:"100%",padding:"9px 14px",border:"none",background:"transparent",color:C.red,fontSize:13,textAlign:"left",cursor:"pointer",display:"block"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,85,85,.08)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Delete Client</button>
            </div>}
          </div>;
        })}
        {clients.length===0&&<div style={{padding:"8px 10px",fontSize:12,color:C.ink3}}>No clients yet</div>}
      </div>}

      {/* Client info — client view */}
      {!isAgency&&current&&<div style={{padding:"14px 20px",borderBottom:`1px solid ${C.bd}`}}>
        <div style={{fontSize:9,color:C.ink3,marginBottom:6,fontFamily:C.mono,letterSpacing:".1em",textTransform:"uppercase"}}>Account</div>
        <div style={{fontSize:14,fontWeight:600,color:C.ink,fontFamily:"'Space Grotesk',sans-serif"}}>{current.name}</div>
        <div style={{fontSize:11,color:C.green,fontFamily:C.mono,marginTop:2}}>{current.handle}</div>
      </div>}

      <div style={{height:1,background:C.bd,margin:"8px 0"}}/>

      {/* Nav */}
      <nav style={{padding:"4px 12px",flex:1}}>
        <div style={{fontSize:10,fontWeight:600,color:C.ink3,letterSpacing:".08em",textTransform:"uppercase",padding:"0 8px",marginBottom:6}}>Navigation</div>
        {NAV.map(n=>{
          const active = tab===n.id;
          return <button key={n.id} onClick={()=>setTab(n.id)} className={`nav-btn${active?" active":""}`}
            style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"9px 10px",borderRadius:4,border:"none",borderLeft:active?`2px solid ${C.green}`:"2px solid transparent",background:active?C.gBg:"transparent",cursor:"pointer",marginBottom:2,textAlign:"left",transition:"all .15s",color:active?C.green:C.ink,fontSize:14,fontWeight:active?600:400}}>
            {n.label}
          </button>;
        })}
      </nav>

      {/* Sign out */}
      <div style={{padding:"12px"}}>
        <button onClick={signOut} className="btn-ghost"
          style={{width:"100%",padding:"9px 10px",border:`1px solid ${C.bd}`,borderRadius:4,background:"transparent",cursor:"pointer",fontSize:12,color:C.ink3,textAlign:"left",fontFamily:C.sans,transition:"all .15s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=C.red;e.currentTarget.style.color=C.red;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=C.bd;e.currentTarget.style.color=C.ink3;}}>
          Sign out
        </button>
      </div>
    </aside>

    {/* Main */}
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",height:"100vh"}}>
      {/* Top bar */}
      <header style={{height:48,background:"#0a0a0a",borderBottom:`1px solid ${C.bd}`,display:"flex",alignItems:"center",padding:"0 28px",gap:14,flexShrink:0}}>
        <div style={{flex:1,display:"flex",alignItems:"center",gap:10}}>
          {current&&<>
            <span style={{fontSize:14,fontWeight:600,color:C.ink,fontFamily:"'Space Grotesk',sans-serif"}}>{current.name}</span>
            <span style={{fontSize:11,color:C.green,fontFamily:C.mono}}>{current.handle}</span>
            <Badge v={current.status}/>
          </>}
        </div>
        <span style={{fontSize:12,color:C.ink2}}>{session?.user?.email}</span>
        <span style={{fontSize:9,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",padding:"3px 8px",borderRadius:3,
          background:isAgency?C.gBg:isStaff?C.bBg:"rgba(176,107,255,.08)",
          color:isAgency?C.green:isStaff?C.blue:"#b06bff",
          border:`1px solid ${isAgency?C.green:isStaff?C.blue:"#b06bff"}33`
        }}>{isAgency?"Admin":isStaff?"Staff":"Client"}</span>
        <div style={{width:28,height:28,borderRadius:4,background:isAgency?C.green:isStaff?C.blue:"#b06bff",display:"flex",alignItems:"center",justifyContent:"center",color:"#000",fontSize:11,fontWeight:800,fontFamily:"'Space Grotesk',sans-serif"}}>
          {isAgency?"SH":current?.name?.charAt(0)||"?"}
        </div>
      </header>

      {/* Tab bar */}
      <div style={{height:40,background:"#0a0a0a",borderBottom:`1px solid ${C.bd}`,display:"flex",alignItems:"center",padding:"0 28px",flexShrink:0,gap:2}}>
        {NAV.map(n=>{
          const active = tab===n.id;
          return <button key={n.id} onClick={()=>setTab(n.id)} className={`tab-btn${active?" active":""}`}
            style={{height:"100%",padding:"0 14px",border:"none",background:"transparent",cursor:"pointer",fontSize:13,fontWeight:active?600:400,color:active?C.green:C.ink2,fontFamily:C.sans,position:"relative",letterSpacing:".01em",transition:"color .15s"}}>
            {n.label}
          </button>;
        })}
      </div>

      <main style={{flex:1,overflowY:"auto",overflowX:"hidden",padding:28}} onClick={()=>setMenuOpenId(null)}>
        {(dataLoading && !profile) ? <Spin/> : <>
          {tab==="dashboard"  && (isAgency ? <Dashboard clients={clients} retainers={retainers} rights={rights} gmvData={gmvData}/> : <ClientDashboard client={current} samples={samples} rights={rights} retainers={retainers} gmvData={gmvData}/>)}
          {tab==="products"   && <ProductsTab  clientId={clientId} products={products}   setProducts={setProducts}   isAgency={canEdit}/>}
          {tab==="cogs"       && <CogsTab      clientId={clientId} products={products}   setProducts={setProducts}   isAgency={canEdit}/>}
          {tab==="samples"    && <SamplesTab   clientId={clientId} samples={samples}     setSamples={setSamples}     isAgency={canEdit} products={products}/>}
          {tab==="rights"     && <RightsTab    clientId={clientId} rights={rights}       setRights={setRights}       isAgency={canEdit}/>}
          {tab==="retainers"  && <RetainersTab clientId={clientId} retainers={retainers} setRetainers={setRetainers} isAgency={canEdit}/>}
          {tab==="gmv"        && <GmvTab       clientId={clientId} gmvData={gmvData}     setGmvData={setGmvData}     isAgency={canEdit}/>}
          {tab==="monthly"    && <MonthlyReport clientId={clientId} samples={samples} gmvData={gmvData} retainers={retainers} rights={rights}/>}
        </>}
      </main>
    </div>

    {/* Add Client */}
    {isAgency&&<Modal open={addClient} onClose={closeAddClient} title={addStep===1?"Add New Client":"Client Added — Set Up Login"} width={580}>
      {addStep===1 ? <>
        <R2><Fld label="Brand Name *"><Inp value={cForm.name} onChange={e=>setCForm(f=>({...f,name:e.target.value}))} placeholder="GlowLab Beauty"/></Fld>
        <Fld label="TikTok Handle"><Inp value={cForm.handle} onChange={e=>setCForm(f=>({...f,handle:e.target.value}))} placeholder="@glowlabbeauty"/></Fld></R2>
        <R2><Fld label="Category"><Sel value={cForm.category} onChange={e=>setCForm(f=>({...f,category:e.target.value}))}><option>Beauty</option><option>Fashion</option><option>Health</option><option>Fitness</option><option>Food</option><option>Pets</option><option>Tech</option><option>Home</option><option>Other</option></Sel></Fld>
        <Fld label="Status"><Sel value={cForm.status} onChange={e=>setCForm(f=>({...f,status:e.target.value}))}><option>Active</option><option>Onboarding</option><option>Paused</option></Sel></Fld></R2>
        <R2><Fld label="GMV to Date ($)"><Inp type="number" value={cForm.gmv} onChange={e=>setCForm(f=>({...f,gmv:e.target.value}))}/></Fld>
        <Fld label="Account Manager"><Inp value={cForm.manager} onChange={e=>setCForm(f=>({...f,manager:e.target.value}))} placeholder="Alex R."/></Fld></R2>
        <div style={{height:1,background:C.bd,margin:"12px 0"}}/>
        <div style={{marginBottom:6}}><Fld label="Client Login Email *"><Inp type="email" value={cForm.email} onChange={e=>setCForm(f=>({...f,email:e.target.value}))} placeholder="client@example.com"/></Fld></div>
        <div style={{fontSize:12,color:C.ink3,marginBottom:14}}>You will set their password in the next step.</div>
        {clientErr&&<div style={{background:C.rBg,border:`1px solid ${C.red}30`,borderRadius:5,padding:"9px 13px",fontSize:13,color:C.red,marginBottom:12}}>{clientErr}</div>}
        <MFoot onClose={closeAddClient} onSave={saveClient} label="Add Client →" loading={addSaving}/>
      </> : <>
        <div style={{background:C.gBg,border:`1px solid ${C.green}30`,borderRadius:6,padding:"12px 16px",marginBottom:20,fontSize:13,color:C.green,fontWeight:600}}>
          {cForm.name} has been added successfully. Now follow the steps below to create their login.
        </div>
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:600,color:C.ink,marginBottom:10}}>Step 1 — Create their account in Supabase</div>
          <div style={{fontSize:12,color:C.ink2,lineHeight:1.7,marginBottom:8}}>
            Go to <strong style={{color:C.ink}}>supabase.com</strong> → your project → <strong style={{color:C.ink}}>Authentication → Users → Add User → Create New User</strong>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"80px 1fr",gap:6,marginBottom:8}}>
            <span style={{fontSize:12,color:C.ink3,paddingTop:2}}>Email:</span>
            <code style={{fontSize:13,color:C.green,background:C.bg,padding:"4px 10px",borderRadius:4,border:`1px solid ${C.bd}`,display:"block"}}>{cForm.email}</code>
          </div>
          <div style={{fontSize:12,color:C.ink2}}>Set any password you want — you will share it with the client/VA.</div>
        </div>
        <div style={{height:1,background:C.bd,marginBottom:20}}/>
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:600,color:C.ink,marginBottom:10}}>Step 2 — Link their account to this client</div>
          <div style={{fontSize:12,color:C.ink2,lineHeight:1.7,marginBottom:10}}>
            After creating the user, go to <strong style={{color:C.ink}}>Table Editor → profiles</strong>, find their row, and run this SQL:
          </div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,color:C.ink3,marginBottom:6}}>For the CLIENT login (view only):</div>
            <div style={{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:6,padding:"12px 14px",fontFamily:"monospace",fontSize:12,color:C.green,lineHeight:1.8,userSelect:"all"}}>
              {"UPDATE profiles SET role = 'client',"}<br/>
              {`    client_id = '${newClientId}'`}<br/>
              {`WHERE email = 'CLIENT_EMAIL_HERE';`}
            </div>
          </div>
          <div>
            <div style={{fontSize:11,color:C.ink3,marginBottom:6}}>For the STAFF login (can edit):</div>
            <div style={{background:C.bg,border:`1px solid ${C.bd}`,borderRadius:6,padding:"12px 14px",fontFamily:"monospace",fontSize:12,color:C.blue,lineHeight:1.8,userSelect:"all"}}>
              {"UPDATE profiles SET role = 'staff',"}<br/>
              {`    client_id = '${newClientId}'`}<br/>
              {`WHERE email = 'STAFF_EMAIL_HERE';`}
            </div>
          </div>
          <div style={{fontSize:11,color:C.ink3,marginTop:8}}>Create both users in Supabase Auth first, then run the matching SQL for each.</div>
        </div>
        <div style={{height:1,background:C.bd,marginBottom:16}}/>
        <div style={{display:"flex",justifyContent:"flex-end"}}>
          <PBtn onClick={closeAddClient}>Done</PBtn>
        </div>
      </>}
    </Modal>}
  </div>;
}
