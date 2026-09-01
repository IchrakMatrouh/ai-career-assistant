import React,{useState} from 'react';import ReactDOM from 'react-dom/client';import {ArrowUpRight,Menu,X, Github, Linkedin, Mail, MapPin, Sparkles, Code2, BrainCircuit, ExternalLink} from 'lucide-react';import './index.css';
const projects=[
 {title:'AI Portfolio',tag:'AI + Frontend',desc:'A personal portfolio experience designed to present software engineering projects, skills, and AI-assisted work.',tech:'React · Vite · Tailwind',featured:true},
 {title:'UtopiaHire',tag:'AI Job Platform',desc:'A job-platform concept focused on connecting candidates and opportunities with an AI-oriented experience.',tech:'Angular · TypeScript · AI'},
 {title:'Mini Todo App',tag:'Full-Stack Web',desc:'A task-management application built during a full-stack internship with a Laravel backend and React frontend.',tech:'Laravel · React · JWT · Docker'},
 {title:'Smart Bracelet',tag:'IoT + Microservices',desc:'An IoT architecture concept combining device management, telemetry, processing, notifications, storage, and analytics.',tech:'ESP32 · MQTT · APIs'},
];
const skills=['React','JavaScript','TypeScript','Angular','Laravel','PHP','Python','MySQL','MongoDB','Docker','AI / ML','REST APIs'];
function App(){
 const [open,setOpen]=useState(false);
 const [active,setActive]=useState('home');
 const go=id=>{setActive(id);setOpen(false);document.getElementById(id)?.scrollIntoView({behavior:'smooth'});}
 return <div className="site">
  <header className="nav"><a className="logo" href="#home" onClick={()=>go('home')}><img src="/logo.jfif" alt="Ichrak Matrouh portfolio logo"/></a>
   <nav className={open?'nav-links open':'nav-links'}>{['home','about','skills','projects','experience','contact'].map(x=><a key={x} className={active===x?'active':''} href={'#'+x} onClick={()=>go(x)}>{x[0].toUpperCase()+x.slice(1)}</a>)}</nav>
   <button className="menu" onClick={()=>setOpen(!open)} aria-label="Toggle navigation">{open?<X/>:<Menu/>}</button>
  </header>
  <main>
   <section id="home" className="hero section">
    <div className="hero-copy"><p className="kicker"><Sparkles size={15}/> AI & SOFTWARE ENGINEERING</p><h1>Building digital experiences with <em>AI.</em></h1><p className="lead">I'm Ichrak Matrouh, a computer science engineering student focused on software engineering, artificial intelligence, and practical digital products.</p>
    <div className="hero-actions"><a className="btn primary" href="#projects" onClick={()=>go('projects')}>View my work <ArrowUpRight size={17}/></a><a className="btn ghost" href="#contact" onClick={()=>go('contact')}>Let's connect</a></div></div>
    <div className="hero-card"><div className="orb"><BrainCircuit size={86}/></div><p>AI-assisted<br/><strong>Software Builder</strong></p><span>Based in Tunisia · Open to opportunities</span></div>
   </section>
   <section id="about" className="section split"><div><p className="kicker">01 · ABOUT</p><h2>Curious by nature.<br/><em>Builder by choice.</em></h2></div><div className="text"><p>I combine software engineering fundamentals with AI to turn ideas into useful digital experiences. My work spans frontend development, backend APIs, machine learning, and connected systems.</p><p>I care about clean interfaces, thoughtful product decisions, and using AI as a development partner—not a replacement for engineering judgment.</p><div className="facts"><div><b>CS</b><span>Engineering</span></div><div><b>AI</b><span>Focused</span></div><div><b>WEB</b><span>Full-stack</span></div></div></div></section>
   <section id="skills" className="section"><div className="section-head"><div><p className="kicker">02 · TOOLKIT</p><h2>Skills that turn ideas<br/><em>into products.</em></h2></div><Code2 size={34}/></div><div className="skill-grid">{skills.map(s=><span key={s}>{s}</span>)}</div></section>
   <section id="projects" className="section projects"><div className="section-head"><div><p className="kicker">03 · SELECTED WORK</p><h2>Projects with a<br/><em>purpose.</em></h2></div><p className="section-note">A selection of academic, internship, AI, web, and IoT work.</p></div><div className="project-grid">{projects.map((p,i)=><article className={p.featured?'project featured':'project'} key={p.title}><div className="project-number">0{i+1}</div><div className="project-icon">{p.featured?<BrainCircuit/>:<Code2/>}</div><p className="project-tag">{p.tag}</p><h3>{p.title}</h3><p>{p.desc}</p><small>{p.tech}</small><button className="project-link">Explore project <ArrowUpRight size={16}/></button></article>)}</div></section>
   <section id="experience" className="section split experience"><div><p className="kicker">04 · EXPERIENCE</p><h2>Learning through<br/><em>real work.</em></h2></div><div className="timeline"><div className="item"><span>2026 · PRESENT</span><h3>Frontend AI Engineering Intern · FlyRank</h3><p>Building frontend experiences while developing an AI-assisted engineering workflow.</p></div><div className="item"><span>2025</span><h3>Full-Stack Web Development Intern · IEC Telecom</h3><p>Built a mini Todo application with Laravel, React, Vite, Tailwind, JWT, Redux Toolkit, and Docker.</p></div><div className="item"><span>2024 · PRESENT</span><h3>Engineering Degree in Computer Science · EPI Digital School</h3><p>Focus areas include software engineering, cybersecurity, AI, and distributed systems.</p></div></div></section>
   <section id="contact" className="contact section"><div><p className="kicker">05 · CONTACT</p><h2>Have an idea?<br/><em>Let's build it.</em></h2><p className="lead">I'm open to internships, remote opportunities, collaborations, and AI/software projects.</p></div><div className="contact-card"><a href="mailto:matrouhichrak7@gmail.com"><Mail/>matrouhichrak7@gmail.com</a><div><MapPin/>Sousse, Tunisia</div><div className="socials"><a href="https://github.com/" target="_blank" rel="noreferrer"><Github/></a><a href="https://www.linkedin.com/" target="_blank" rel="noreferrer"><Linkedin/></a></div></div></section>
  </main>
  <footer><span>© 2026 Ichrak Matrouh</span><span>AI · Software · Technology</span></footer>
 </div>
}
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);