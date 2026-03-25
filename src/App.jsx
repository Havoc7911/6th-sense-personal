import React, { useState, useMemo, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Zap, Menu, X, DollarSign, Search, CheckCircle2, AlertTriangle,
  ArrowRight, Home, Layers, Sparkles, Loader2, LayoutDashboard,
  MessageSquare, FileText, LogOut, Clock, Activity, UserCheck
} from 'lucide-react';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : '6th-sense-tech';

const App = () => {
  // Application State
  const [user, setUser] = useState(null);
  const [view, setView] = useState('landing'); // 'landing' | 'portal'
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Data State
  const [tickets, setTickets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form & AI State
  const [formStatus, setFormStatus] = useState('idle');
  const [issueDescription, setIssueDescription] = useState('');
  const [aiInsight, setAiInsight] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // --- RAW DATA ---
  const rawServices = [
    { cat: "Mobile Essentials", name: "Carrier Unlocking", price: 25, note: "Eligible devices only" },
    { cat: "Mobile Essentials", name: "Simple Device Unlocking", price: 20, note: "Screen lock/PIN" },
    { cat: "Mobile Essentials", name: "pSIM / eSIM Setup & Transfer", price: 15, note: "" },
    { cat: "Mobile Essentials", name: "Mobile Activation / Porting", price: 30, note: "" },
    { cat: "Device Maintenance", name: "Device Factory Reset", price: 25, note: "Secure Wipe" },
    { cat: "Device Maintenance", name: "Backup & Restore", price: 45, note: "Phone to Phone/Cloud" },
    { cat: "Device Maintenance", name: "Initial Device Setup", price: 40, note: "" },
    { cat: "Identity & Security", name: "Account/Email/SSO Setup", price: 30, note: "Google, Apple, etc." },
    { cat: "Identity & Security", name: "Password Manager Setup", price: 50, note: "Includes Training" },
    { cat: "Identity & Security", name: "VOIP Service Setup", price: 60, note: "Ooma, Google Voice" },
    { cat: "Data & Cloud", name: "Cloud Storage Setup", price: 40, note: "iCloud, OneDrive, etc." },
    { cat: "Data & Cloud", name: "File Structure/Tagging/Sync", price: 65, note: "" },
    { cat: "Data & Cloud", name: "Self-Hosted App Config", price: 100, note: "Base Rate" },
    { cat: "Digital Strategy", name: "AI & Prompt Engineering", price: 75, note: "Per Session" },
    { cat: "Digital Strategy", name: "Database Schema Management", price: 90, note: "Hourly Rate" },
    { cat: "Digital Strategy", name: "Content Creation/Editing", price: 50, note: "Hourly Rate" },
    { cat: "Benefit Navigation", name: "Cost-Saving Audit", price: 35, note: "Or 20% of savings" },
  ];

  // --- AUTHENTICATION ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- FIRESTORE SYNC ---
  useEffect(() => {
    if (!user) return;
    const ticketsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'tickets');
    
    const unsubscribe = onSnapshot(ticketsRef, (snapshot) => {
      const ticketData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by creation time descending (client-side sort to avoid complex indexing rules)
      ticketData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setTickets(ticketData);
    }, (err) => console.error("Firestore Sync Error:", err));

    return () => unsubscribe();
  }, [user]);

  // --- AI INTEGRATION ---
  const generateDiagnosticInsight = async () => {
    if (!issueDescription) return;
    setIsAiLoading(true);
    setAiError('');
    
    const apiKey = ""; 
    const systemPrompt = "Expert technical consultant. User is describing an IT/Tech problem. Provide a 2-3 sentence 'Initial Insight' explaining likely causes, followed by 2 specific technical questions that would help you resolve this faster. Keep it professional and strictly formatted as raw text.";
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: issueDescription }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] }
        })
      });
      
      if (!response.ok) throw new Error('API Request Failed');
      const data = await response.json();
      setAiInsight(data.candidates?.[0]?.content?.parts?.[0]?.text || '');
    } catch (err) {
      setAiError('AI diagnostic service temporarily unavailable.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // --- ACTIONS ---
  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setFormStatus('submitting');

    const formData = new FormData(e.target);
    const newTicket = {
      name: formData.get('name'),
      contact: formData.get('contact'),
      device: formData.get('device'),
      description: issueDescription,
      billing: formData.get('billing'),
      status: 'pending_review',
      aiInsight: aiInsight || null,
      createdAt: serverTimestamp()
    };

    try {
      const ticketsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'tickets');
      await addDoc(ticketsRef, newTicket);
      setFormStatus('success');
      setIssueDescription('');
      setAiInsight('');
      e.target.reset();
    } catch (err) {
      console.error(err);
      setFormStatus('idle');
      alert("Failed to submit ticket. Please try again.");
    }
  };

  const navigateTo = (destination) => {
    setView(destination);
    setIsMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const scrollToSection = (id) => {
    if (view !== 'landing') {
      setView('landing');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  // --- COMPUTED DATA ---
  const groupedServices = useMemo(() => {
    const filtered = rawServices.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.cat.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const groups = filtered.reduce((acc, service) => {
      if (!acc[service.cat]) acc[service.cat] = [];
      acc[service.cat].push(service);
      return acc;
    }, {});
    Object.keys(groups).forEach(key => groups[key].sort((a, b) => a.price - b.price));
    return groups;
  }, [searchQuery]);

  // --- REUSABLE COMPONENTS ---
  const Logo = ({ className = "h-10" }) => (
    <div className={`flex items-center gap-3 cursor-pointer ${className}`} onClick={() => navigateTo('landing')}>
      <div className="relative">
        <div className="absolute inset-0 bg-orange-500/20 blur-md rounded-lg"></div>
        <svg viewBox="0 0 100 100" className="h-10 w-10 relative z-10 drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]">
          <path d="M50 10 L90 42 V85 H10 V42 L50 10 Z" fill="none" stroke="#F97316" strokeWidth="3" strokeLinejoin="round" />
          <path d="M65 35 C 45 20, 25 35, 25 55 C 25 75, 45 80, 55 75 C 65 70, 70 55, 55 45 C 45 38, 30 45, 30 55" fill="none" stroke="#F97316" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 85 L35 85 L42 75 L50 95 L58 85 L85 85" stroke="#F97316" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.4" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="text-white font-bold text-xl tracking-tight leading-none">6th Sense</span>
        <span className="text-orange-500 font-medium text-[10px] tracking-widest uppercase">Personal Tech</span>
      </div>
    </div>
  );

  // ==========================================
  // VIEW: CLIENT PORTAL
  // ==========================================
  if (view === 'portal') {
    return (
      <div className="min-h-screen bg-[#080808] text-neutral-400 flex flex-col md:flex-row font-sans">
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-[#0d0d0d] border-b md:border-b-0 md:border-r border-neutral-800 p-6 flex flex-col justify-between shrink-0">
          <div>
            <Logo />
            <nav className="mt-12 space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 bg-orange-500/10 text-orange-500 rounded-xl font-bold text-sm">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </button>
              <button disabled className="w-full flex items-center gap-3 px-4 py-3 text-neutral-600 rounded-xl font-bold text-sm cursor-not-allowed">
                <MessageSquare className="w-4 h-4" /> Support Hub (WIP)
              </button>
              <button disabled className="w-full flex items-center gap-3 px-4 py-3 text-neutral-600 rounded-xl font-bold text-sm cursor-not-allowed">
                <FileText className="w-4 h-4" /> Invoices (WIP)
              </button>
            </nav>
          </div>
          <div className="pt-6 border-t border-neutral-800 space-y-4 mt-8">
            <div className="px-4">
              <p className="text-[10px] font-bold text-neutral-600 uppercase">Current Client ID</p>
              <p className="text-[10px] font-mono text-neutral-400 truncate">{user?.uid || 'Authenticating...'}</p>
            </div>
            <button onClick={() => navigateTo('landing')} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-xl font-bold text-sm transition-colors">
              <LogOut className="w-4 h-4" /> Return to Site
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Client Hub</h1>
              <p className="text-sm italic text-neutral-500">Manage active diagnostics and service records.</p>
            </div>
            <div className="flex items-center gap-4 bg-neutral-900 border border-neutral-800 px-6 py-3 rounded-2xl">
              <Activity className="w-4 h-4 text-green-500 animate-pulse shrink-0" />
              <div className="text-xs">
                <p className="text-neutral-500 font-bold uppercase tracking-wider">System Status</p>
                <p className="text-white font-mono uppercase">All Operations Normal</p>
              </div>
            </div>
          </header>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-white uppercase tracking-widest text-xs">Active Tickets</h3>
                  <button onClick={() => scrollToSection('contact')} className="text-orange-500 text-[10px] font-bold uppercase tracking-widest border-b border-orange-500/20 hover:border-orange-500 transition-colors">
                    New Intake
                  </button>
                </div>
                <div className="space-y-4">
                  {tickets.length === 0 ? (
                    <div className="p-12 text-center bg-neutral-900/50 rounded-3xl border border-dashed border-neutral-800">
                      <Clock className="w-8 h-8 text-neutral-700 mx-auto mb-4" />
                      <p className="text-sm font-medium">No active service requests found.</p>
                      <button onClick={() => scrollToSection('contact')} className="mt-4 text-orange-500 text-xs font-bold uppercase hover:underline">Start Diagnostic Intake</button>
                    </div>
                  ) : (
                    tickets.map(ticket => (
                      <div key={ticket.id} className="p-6 bg-neutral-900/50 border border-neutral-800 rounded-2xl hover:border-orange-500/30 transition-all">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                          <div>
                            <h4 className="text-white font-bold text-lg">{ticket.device}</h4>
                            <p className="text-[10px] text-neutral-600 font-mono mt-1 uppercase tracking-tighter">ID: {ticket.id}</p>
                          </div>
                          <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${
                            ticket.status === 'pending_review' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'
                          }`}>
                            {ticket.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-400 line-clamp-2 italic bg-black/30 p-3 rounded-lg border border-neutral-800/50">"{ticket.description}"</p>
                        {ticket.aiInsight && (
                          <div className="mt-3 text-xs text-neutral-500 flex items-start gap-2">
                            <Sparkles className="w-3 h-3 text-orange-500 mt-0.5 shrink-0" />
                            <span className="line-clamp-1 truncate block">AI Log attached to ticket.</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <aside className="space-y-8">
              <div className="p-8 bg-gradient-to-br from-orange-600 to-orange-800 rounded-3xl text-white shadow-xl shadow-orange-500/10">
                <Zap className="w-8 h-8 mb-6 text-orange-200" />
                <h3 className="text-xl font-bold mb-2">Priority Access</h3>
                <p className="text-sm text-white/80 leading-relaxed mb-6">Clients logged into the portal receive priority diagnostic queue placement.</p>
                <button className="w-full bg-black/50 hover:bg-black py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors backdrop-blur-sm">
                  Ping Technician
                </button>
              </div>
            </aside>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // VIEW: PUBLIC LANDING PAGE
  // ==========================================
  return (
    <div className="min-h-screen bg-[#0d0d0d] font-sans text-neutral-400 selection:bg-orange-500/30 smooth-scroll">
      {/* Texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-0">
        <svg width="100%" height="100%">
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* NAVIGATION */}
      <nav className="sticky top-0 z-50 bg-[#121212]/90 backdrop-blur-xl border-b border-neutral-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <Logo />
            
            {/* Desktop Nav */}
            <div className="hidden md:flex gap-8 items-center">
              <button onClick={() => scrollToSection('services')} className="text-sm font-medium hover:text-orange-500 transition-colors">Services</button>
              <button onClick={() => scrollToSection('ethics')} className="text-sm font-medium hover:text-orange-500 transition-colors">Ethics</button>
              <div className="w-px h-6 bg-neutral-800 mx-2"></div>
              <button onClick={() => navigateTo('portal')} className="text-sm font-bold flex items-center gap-2 px-4 py-2 border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-all text-white">
                <UserCheck className="w-4 h-4 text-orange-500" /> Client Portal
              </button>
              <button onClick={() => scrollToSection('contact')} className="bg-orange-500 text-black px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-white transition-all shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                Intake Form
              </button>
            </div>

            {/* Mobile Nav Toggle */}
            <button className="md:hidden text-white p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        
        {/* Mobile Nav Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-[#121212] border-b border-neutral-800 p-4 flex flex-col gap-4 shadow-2xl">
            <button onClick={() => scrollToSection('services')} className="text-left py-3 px-4 hover:bg-neutral-900 rounded-xl font-medium">Services</button>
            <button onClick={() => scrollToSection('ethics')} className="text-left py-3 px-4 hover:bg-neutral-900 rounded-xl font-medium">Ethics</button>
            <button onClick={() => navigateTo('portal')} className="text-left py-3 px-4 bg-neutral-900 rounded-xl font-bold flex items-center gap-2 text-white">
              <UserCheck className="w-4 h-4 text-orange-500" /> Client Portal
            </button>
            <button onClick={() => scrollToSection('contact')} className="text-center py-4 bg-orange-500 text-black rounded-xl font-bold mt-2">
              Start Intake Form
            </button>
          </div>
        )}
      </nav>

      {/* HERO */}
      <header className="relative py-28 px-4 overflow-hidden border-b border-neutral-800/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#f9731608_0%,_transparent_50%)]"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-neutral-900/50 border border-neutral-800 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-orange-500 mb-8">
            <Zap className="w-3 h-3" /> Digital Confluence Support
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white leading-tight tracking-tighter">
            Professional Tech Support <br />
            <span className="text-orange-500 italic">Refined for You.</span>
          </h1>
          <p className="text-lg text-neutral-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Strategic assistance for complex digital environments. From AI integration to secure device management, I provide clinical precision for your personal technology.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <button onClick={() => navigateTo('portal')} className="w-full sm:w-auto bg-white text-black px-10 py-4 rounded-xl font-bold text-lg hover:bg-orange-500 hover:text-white transition-all shadow-xl">
              Access My Portal
            </button>
            <button onClick={() => scrollToSection('services')} className="w-full sm:w-auto border border-neutral-800 px-10 py-4 rounded-xl font-bold text-lg hover:bg-neutral-900 transition-all text-white">
              View Rates
            </button>
          </div>
        </div>
      </header>

      {/* TABULAR SERVICE MENU */}
      <section id="services" className="py-24 max-w-7xl mx-auto px-4 relative z-10">
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 text-orange-500 mb-2">
              <Layers className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Categorized Index</span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">Standardized Rates</h2>
            <p className="text-neutral-500 font-medium italic">Tabular data. Grouped by division and sorted by value.</p>
          </div>
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 group-focus-within:text-orange-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search services..."
              className="w-full pl-12 pr-4 py-4 bg-neutral-900/30 border border-neutral-800 rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-8">
          {Object.entries(groupedServices).map(([category, items]) => (
            <div key={category} className="bg-[#121212] rounded-2xl border border-neutral-800/60 overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-black/40 border-b border-neutral-800/60 flex items-center justify-between">
                <h3 className="text-orange-500 text-xs font-bold uppercase tracking-[0.2em]">{category}</h3>
                <span className="text-[10px] text-neutral-600 font-mono italic">{items.length} Units</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <tbody className="divide-y divide-neutral-800/40">
                    {items.map((s, idx) => (
                      <tr key={idx} className="hover:bg-neutral-900 transition-colors group">
                        <td className="px-6 py-5 w-2/3">
                          <div className="font-bold text-neutral-300 group-hover:text-white transition-colors">{s.name}</div>
                          {s.note && <div className="text-[11px] text-neutral-600 mt-1 italic font-medium">{s.note}</div>}
                        </td>
                        <td className="px-6 py-5 text-right font-mono font-bold text-orange-500 group-hover:text-orange-400">
                          ${s.price}{typeof s.price === 'number' && (s.name.includes('Rate') || s.name.includes('Management') || s.name.includes('Creation')) ? '/hr' : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {Object.keys(groupedServices).length === 0 && (
            <div className="text-center py-12 text-neutral-600 italic">No services match your query.</div>
          )}
        </div>
      </section>

      {/* ETHICS SECTION */}
      <section id="ethics" className="py-24 bg-[#0a0a0a] border-y border-neutral-800/30 relative z-10">
        <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-block px-3 py-1 rounded bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-bold uppercase tracking-widest mb-6">Security Protocol</div>
            <h2 className="text-4xl font-bold text-white mb-6 tracking-tighter">Integrity In Practice.</h2>
            <p className="text-lg text-neutral-500 mb-10 leading-relaxed font-medium">
              As a former paramedic, I operate on a strict ethical code derived from public service standards. Community equity and clinical transparency guide every session.
            </p>
            <div className="grid gap-4">
              {[
                { title: "Privacy First", desc: "No data is stored or mirrored. I operate within your view." },
                { title: "Verification Required", desc: "Ownership validation is required for all unlocking services." },
                { title: "Community Equity", desc: "Hardship pricing and payment plans are always available." }
              ].map((item, i) => (
                <div key={i} className="flex gap-5 p-5 bg-neutral-900/30 border border-neutral-800 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center border border-neutral-800 shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">{item.title}</h4>
                    <p className="text-sm text-neutral-600 font-medium">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-[#121212] p-10 rounded-3xl border border-neutral-800 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl group-hover:bg-red-500/10 transition-colors"></div>
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-red-500/20 p-3 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-white">Refused Services</h3>
            </div>
            <p className="text-sm text-neutral-600 mb-8 italic">To protect the community, the following are strictly prohibited:</p>
            <ul className="space-y-4">
              {[
                "Spyware or monitoring tools",
                "Third-party credential harvesting",
                "Unauthorized network intrusion",
                "Physical hardware repair (Screens/Batteries)"
              ].map((text, i) => (
                <li key={i} className="flex items-center gap-4 text-neutral-400 font-medium text-sm">
                  <X className="w-4 h-4 text-red-600 shrink-0" /> {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CONTACT / INTAKE WITH FIRESTORE & GEMINI */}
      <section id="contact" className="py-32 max-w-4xl mx-auto px-4 relative z-10">
        <div className="bg-neutral-900/40 p-8 md:p-16 rounded-[2.5rem] border border-neutral-800 relative shadow-2xl overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 right-0 m-12 text-orange-500/5 rotate-12 pointer-events-none hidden md:block">
            <Home className="w-64 h-64" />
          </div>

          <div className="text-center mb-16 relative z-10">
            <h2 className="text-4xl font-bold text-white mb-4 italic tracking-tighter">Diagnostic Intake</h2>
            <p className="text-sm text-neutral-500 font-medium">Data is saved securely to your private Client Portal.</p>
          </div>

          {formStatus === 'success' ? (
            <div className="text-center py-16 animate-in zoom-in duration-300 relative z-10">
              <div className="bg-orange-500 text-black w-20 h-20 rounded-2xl rotate-12 flex items-center justify-center mx-auto mb-8 shadow-xl shadow-orange-500/20">
                <CheckCircle2 className="w-10 h-10 -rotate-12" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">Transmission Logged</h3>
              <p className="text-neutral-500 font-medium mb-10 max-w-md mx-auto">
                Your diagnostic request has been securely recorded to the backend. You can track its status live.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button onClick={() => navigateTo('portal')} className="bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-orange-500 hover:text-white transition-all">
                  Open Client Portal
                </button>
                <button onClick={() => setFormStatus('idle')} className="text-orange-500 font-bold text-sm border border-orange-500/30 px-8 py-3 rounded-xl hover:bg-orange-500/10 transition-all">
                  New Intake
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleTicketSubmit} className="space-y-8 relative z-10">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Name</label>
                  <input required name="name" type="text" className="w-full px-5 py-4 bg-black/80 border border-neutral-800 rounded-xl text-white focus:border-orange-500 outline-none transition-all placeholder:text-neutral-700 font-medium" placeholder="Required" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Contact Detail</label>
                  <input required name="contact" type="text" className="w-full px-5 py-4 bg-black/80 border border-neutral-800 rounded-xl text-white focus:border-orange-500 outline-none transition-all placeholder:text-neutral-700 font-medium" placeholder="Email or Phone" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Device / Hardware</label>
                <input required name="device" type="text" className="w-full px-5 py-4 bg-black/80 border border-neutral-800 rounded-xl text-white focus:border-orange-500 outline-none transition-all placeholder:text-neutral-700 font-medium" placeholder="e.g. iPhone 15, Windows PC, Cloud Data" />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Issue Description</label>
                  <button 
                    type="button"
                    onClick={generateDiagnosticInsight}
                    disabled={!issueDescription || isAiLoading}
                    className="flex items-center gap-2 text-[10px] font-bold text-orange-500 bg-orange-500/10 hover:bg-orange-500/20 px-3 py-1.5 rounded disabled:opacity-30 transition-all uppercase tracking-widest border border-orange-500/20"
                  >
                    {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Analyze with AI
                  </button>
                </div>
                <textarea 
                  required 
                  name="description"
                  rows="4" 
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  className="w-full px-5 py-4 bg-black/80 border border-neutral-800 rounded-xl text-white focus:border-orange-500 outline-none transition-all resize-none placeholder:text-neutral-700 font-medium leading-relaxed" 
                  placeholder="Detail the technical barrier you are facing..."
                ></textarea>

                {/* AI INSIGHT BOX */}
                { (aiInsight || aiError) && (
                  <div className="p-6 rounded-xl bg-orange-500/[0.05] border border-orange-500/30">
                    <div className="flex items-center gap-2 mb-3 text-orange-500">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Initial AI Diagnostic Log</span>
                    </div>
                    {aiError ? (
                      <p className="text-xs text-red-500 italic">{aiError}</p>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-neutral-300 leading-relaxed font-medium italic">"{aiInsight}"</p>
                        <div className="text-[10px] text-neutral-500 font-mono uppercase border-t border-orange-500/20 pt-2">Powered by Gemini 2.5 Flash API</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Billing Request</label>
                <select name="billing" className="w-full px-5 py-4 bg-black/80 border border-neutral-800 rounded-xl text-white focus:border-orange-500 outline-none cursor-pointer font-medium appearance-none">
                  <option>Standard Rate Execution</option>
                  <option>Community Equity / Hardship Pricing</option>
                  <option>Installment Payment Plan</option>
                </select>
              </div>

              <div className="bg-[#121212] p-6 rounded-xl border border-neutral-800 space-y-4">
                <label className="flex items-start gap-4 cursor-pointer group">
                  <input required type="checkbox" className="accent-orange-500 mt-1 w-4 h-4" />
                  <span className="text-xs text-neutral-500 group-hover:text-neutral-300 transition-colors leading-relaxed">
                    I certify legal ownership of the specified hardware/accounts and acknowledge the ethical service limitations.
                  </span>
                </label>
              </div>

              <button 
                type="submit" 
                disabled={formStatus === 'submitting'}
                className="w-full bg-orange-600 text-white py-5 rounded-xl font-bold text-lg hover:bg-orange-500 hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
              >
                {formStatus === 'submitting' ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                {formStatus === 'submitting' ? 'Transmitting to Server...' : 'Submit to Hub & Create Portal'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-20 border-t border-neutral-800/30 bg-[#0a0a0a] relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-10 text-center md:text-left">
          <div className="max-w-xs">
            <Logo className="h-8 mb-4 justify-center md:justify-start" />
            <p className="text-[10px] text-neutral-600 leading-relaxed font-medium uppercase tracking-widest">
              Precise • Local • Secure
            </p>
          </div>
          
          <div className="flex gap-10">
            <div className="space-y-3">
              <h5 className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Navigation</h5>
              <div className="flex flex-col gap-2 text-xs font-semibold text-neutral-600">
                <button onClick={() => scrollToSection('services')} className="hover:text-white transition-colors text-left">Services</button>
                <button onClick={() => scrollToSection('ethics')} className="hover:text-white transition-colors text-left">Ethics</button>
                <button onClick={() => navigateTo('portal')} className="hover:text-white transition-colors text-left">Client Portal</button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;


