import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = (import.meta.env.VITE_API_URL || "https://student-management-system-2-g0rt.onrender.com/api").replace(/\/$/, "");
const emptyStudent = { name:"", email:"", rollNumber:"", course:"B.Tech CSE", year:1, phone:"", address:"", attendance:75, marks:{dsa:0,dbms:0,os:0,ai:0}, status:"Active" };

async function request(path, options={}) {
  const token = localStorage.getItem("sms_token");
  const res = await fetch(API + path, {
    ...options,
    headers: { "Content-Type":"application/json", ...(token ? {Authorization:`Bearer ${token}`} : {}), ...(options.headers || {}) }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
}

function App() {
  const [user,setUser]=useState(()=>JSON.parse(localStorage.getItem("sms_user")||"null"));
  const [authMode,setAuthMode]=useState("login");
  const [auth,setAuth]=useState({name:"",email:"",password:""});
  const [students,setStudents]=useState([]);
  const [dashboard,setDashboard]=useState({total:0,active:0,inactive:0,averageAttendance:0,averageMarks:0,courses:0});
  const [search,setSearch]=useState("");
  const [course,setCourse]=useState("");
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState(null);
  const [form,setForm]=useState(emptyStudent);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [toast,setToast]=useState("");

  const load=async()=>{ try { const [s,d]=await Promise.all([request(`/students?search=${encodeURIComponent(search)}&course=${encodeURIComponent(course)}`),request("/dashboard")]); setStudents(s.students);setDashboard(d); } catch(e){setError(e.message)} };
  useEffect(()=>{ if(user) load(); },[user,search,course]);
  useEffect(()=>{ if(toast){const t=setTimeout(()=>setToast(""),3000);return()=>clearTimeout(t)} },[toast]);

  const courses=useMemo(()=>[...new Set(students.map(s=>s.course))],[students]);
  const average=(s)=>Math.round(Object.values(s.marks||{}).reduce((a,b)=>a+b,0)/4);

  async function submitAuth(e){
    e.preventDefault();setLoading(true);setError("");
    try{const data=await request(authMode==="login"?"/auth/login":"/auth/register",{method:"POST",body:JSON.stringify(auth)});localStorage.setItem("sms_token",data.token);localStorage.setItem("sms_user",JSON.stringify(data.user));setUser(data.user);setAuth({name:"",email:"",password:""});}
    catch(e){setError(e.message)}finally{setLoading(false)}
  }
  function logout(){localStorage.removeItem("sms_token");localStorage.removeItem("sms_user");setUser(null);}

  function openAdd(){setEditing(null);setForm({...emptyStudent,marks:{...emptyStudent.marks}});setModal(true);setError("")}
  function openEdit(s){setEditing(s._id);setForm({...s,marks:{...s.marks}});setModal(true);setError("")}
  const change=(key,value)=>setForm(f=>({...f,[key]:value}));
  const markChange=(key,value)=>setForm(f=>({...f,marks:{...f.marks,[key]:Number(value)}}));

  async function saveStudent(e){
    e.preventDefault();setLoading(true);setError("");
    try{const method=editing?"PUT":"POST";const data=await request(editing?`/students/${editing}`:"/students",{method,body:JSON.stringify({...form,year:Number(form.year),attendance:Number(form.attendance)})});setToast(data.message);setModal(false);await load();}
    catch(e){setError(e.message)}finally{setLoading(false)}
  }
  async function removeStudent(id){if(!confirm("Delete this student permanently?"))return;try{const d=await request(`/students/${id}`,{method:"DELETE"});setToast(d.message);load()}catch(e){setError(e.message)}}

  if(!user) return <Auth mode={authMode} setMode={setAuthMode} value={auth} setValue={setAuth} submit={submitAuth} loading={loading} error={error}/>;

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><span>🎓</span><div><strong>Edu<span>Manage</span></strong><small>Student Portal</small></div></div>
      <nav><a className="active">▦ <span>Dashboard</span></a><a>👥 <span>Students</span></a><a>📊 <span>Performance</span></a><a>📅 <span>Attendance</span></a></nav>
      <div className="side-bottom"><div className="user-mini"><div className="avatar">{user.name?.[0]?.toUpperCase()}</div><div><b>{user.name}</b><small>{user.role}</small></div></div><button onClick={logout}>↪ Logout</button></div>
    </aside>
    <main>
      <header><div><p className="eyebrow">OVERVIEW</p><h1>Student Dashboard</h1><p>Manage students, performance and academic records in one place.</p></div><button className="primary" onClick={openAdd}>＋ Add Student</button></header>
      {error&&<div className="alert">⚠ {error}<button onClick={()=>setError("")}>×</button></div>}
      <section className="stats">
        <Stat icon="👥" label="Total Students" value={dashboard.total} sub={`${dashboard.active} active`}/>
        <Stat icon="✓" label="Average Attendance" value={dashboard.averageAttendance+"%"} sub="Across all students"/>
        <Stat icon="🏆" label="Average Marks" value={dashboard.averageMarks+"%"} sub="All subjects"/>
        <Stat icon="📚" label="Courses" value={dashboard.courses} sub={`${dashboard.inactive} inactive`}/>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Student Records</h2><p>{students.length} record{students.length!==1?"s":""} found</p></div><div className="filters"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="⌕ Search name, email or roll..." /><select value={course} onChange={e=>setCourse(e.target.value)}><option value="">All courses</option>{courses.map(c=><option key={c}>{c}</option>)}</select></div></div>
        <div className="table-wrap"><table><thead><tr><th>STUDENT</th><th>ROLL NO.</th><th>COURSE</th><th>YEAR</th><th>ATTENDANCE</th><th>AVG. MARKS</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>
        {students.map(s=><tr key={s._id}><td><div className="student"><div className="avatar small">{s.name[0]}</div><div><b>{s.name}</b><small>{s.email}</small></div></div></td><td>{s.rollNumber}</td><td>{s.course}</td><td>Year {s.year}</td><td><div className="progress"><span style={{width:`${s.attendance}%`}}></span></div><small>{s.attendance}%</small></td><td><strong>{average(s)}%</strong></td><td><span className={`badge ${s.status==="Active"?"green":"gray"}`}>{s.status}</span></td><td><button className="icon-btn" onClick={()=>openEdit(s)}>✎</button><button className="icon-btn danger" onClick={()=>removeStudent(s._id)}>⌫</button></td></tr>)}
        {!students.length&&<tr><td colSpan="8"><div className="empty">No students found. <button onClick={openAdd}>Add your first student</button></div></td></tr>}
        </tbody></table></div>
      </section>
    </main>
    {modal&&<div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setModal(false)}><form className="modal" onSubmit={saveStudent}><div className="modal-title"><div><p className="eyebrow">{editing?"EDIT RECORD":"NEW RECORD"}</p><h2>{editing?"Update Student":"Add Student"}</h2></div><button type="button" onClick={()=>setModal(false)}>×</button></div><div className="form-grid">
      <label>Full name<input required value={form.name} onChange={e=>change("name",e.target.value)} /></label><label>Email<input type="email" required value={form.email} onChange={e=>change("email",e.target.value)} /></label>
      <label>Roll number<input required value={form.rollNumber} onChange={e=>change("rollNumber",e.target.value)} /></label><label>Course<input required value={form.course} onChange={e=>change("course",e.target.value)} /></label>
      <label>Year<select value={form.year} onChange={e=>change("year",e.target.value)}>{[1,2,3,4,5,6].map(y=><option key={y}>{y}</option>)}</select></label><label>Phone<input value={form.phone} onChange={e=>change("phone",e.target.value)} /></label>
      <label>Attendance %<input type="number" min="0" max="100" value={form.attendance} onChange={e=>change("attendance",e.target.value)} /></label><label>Status<select value={form.status} onChange={e=>change("status",e.target.value)}><option>Active</option><option>Inactive</option></select></label>
      <label className="wide">Address<input value={form.address} onChange={e=>change("address",e.target.value)} /></label>
    </div><h3>Subject Marks</h3><div className="marks">{Object.keys(form.marks).map(k=><label key={k}>{k.toUpperCase()}<input type="number" min="0" max="100" value={form.marks[k]} onChange={e=>markChange(k,e.target.value)} /></label>)}</div>{error&&<div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary" onClick={()=>setModal(false)}>Cancel</button><button className="primary" disabled={loading}>{loading?"Saving...":editing?"Save Changes":"Create Student"}</button></div></form></div>}
    {toast&&<div className="toast">✓ {toast}</div>}
  </div>
}

function Stat({icon,label,value,sub}){return <div className="stat"><div className="stat-icon">{icon}</div><div><small>{label}</small><strong>{value}</strong><span>{sub}</span></div></div>}
function Auth({mode,setMode,value,setValue,submit,loading,error}){return <div className="auth-page"><div className="auth-art"><div className="orb"></div><div className="auth-copy"><span className="logo-mark">🎓</span><p className="eyebrow">SMART CAMPUS</p><h1>Student management,<br/><em>made simple.</em></h1><p>Keep student records, attendance and academic performance organized in one secure dashboard.</p><div className="feature-line">✓ Real-time student records &nbsp; ✓ Secure authentication</div></div></div><div className="auth-card"><div className="brand dark"><span>🎓</span><div><strong>Edu<span>Manage</span></strong><small>Student Portal</small></div></div><div className="auth-heading"><h2>{mode==="login"?"Welcome back":"Create admin account"}</h2><p>{mode==="login"?"Sign in to manage your students.":"Start managing your student records today."}</p></div><form onSubmit={submit}>{mode==="register"&&<label>Full name<input required value={value.name} onChange={e=>setValue({...value,name:e.target.value})} placeholder="Your name"/></label>}<label>Email<input type="email" required value={value.email} onChange={e=>setValue({...value,email:e.target.value})} placeholder="admin@example.com"/></label><label>Password<input type="password" required minLength="6" value={value.password} onChange={e=>setValue({...value,password:e.target.value})} placeholder="••••••••"/></label>{error&&<div className="form-error">{error}</div>}<button className="primary full" disabled={loading}>{loading?"Please wait...":mode==="login"?"Sign in":"Create account"}</button></form><p className="switch">{mode==="login"?"Don't have an account?":"Already have an account?"} <button onClick={()=>{setMode(mode==="login"?"register":"login")}}> {mode==="login"?"Create one":"Sign in"}</button></p></div></div>}

export default App;
