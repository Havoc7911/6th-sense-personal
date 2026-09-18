import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, FileText, CheckCircle, Clock, ThumbsUp, FileCheck, Search, ClipboardList, ReceiptText, Download, Smartphone, Bell, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import {
  fetchTicketsByEmail,
  fetchQuotesByEmail,
  fetchMessages,
  insertMessage,
  subscribeTickets,
  subscribeQuotes,
  subscribeMessages,
  updateTicketAccepted,
  markMagicLinkRequested,
  updateTicketInfo,
  updateQuote,
  convertQuoteToTicket,
  lookupByCode,
  generateInvoicePrint,
} from '../api/data';
import { isSupabaseConfigured } from '../lib/supabase';
import { formatTicketId } from '../lib/ticketId';
import { formatJobType } from '../lib/formatJobType';
import { generateTicketCode } from '../lib/ticketCode';
import { useAuth } from '../context/AuthContext.jsx';
import { LookupResultCard } from './SuccessPage';
import Skeleton from '../components/Skeleton';
import './ClientPortal.css';

const PORTAL_EMAIL_KEY = 'portal_email';

function mapDbMessage(row) {
  return {
    id: row.id,
    sender: row.sender,
    text: row.text,
    time: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isTech: row.is_tech,
  };
}

export default function ClientDashboard() {
  const { user, loading: authLoading, signInWithOtp, signOut: authSignOut } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [newMessage, setNewMessage] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [portalEmail, setPortalEmail] = useState(() => sessionStorage.getItem(PORTAL_EMAIL_KEY) || '');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [tickets, setTickets] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [messages, setMessages] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState(null);
  const [accepting, setAccepting] = useState(null);
  const [acceptingQuote, setAcceptingQuote] = useState(null);
  
  const [editingIntake, setEditingIntake] = useState(false);
  const [intakeForm, setIntakeForm] = useState({});
  const [savingIntake, setSavingIntake] = useState(false);
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('6s_notif_prefs');
      return saved ? JSON.parse(saved) : { email: true, text: false };
    } catch { return { email: true, text: false }; }
  });
  const [notifSaved, setNotifSaved] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // Code-based lookup
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  const effectiveEmail = user?.email?.toLowerCase() || portalEmail || '';

  const loadData = useCallback(async () => {
    if (!effectiveEmail || !isSupabaseConfigured()) return;
    setLoading(true);
    setLoadError('');
    try {
      const [ticketRows, quoteRows] = await Promise.all([
        fetchTicketsByEmail(effectiveEmail),
        fetchQuotesByEmail(effectiveEmail).catch(() => []),
      ]);
      setTickets(ticketRows);
      setQuotes(quoteRows);
      setSelectedTicketId((prev) => {
        if (!ticketRows.length) return null;
        if (prev && ticketRows.some((r) => r.id === prev)) return prev;
        return ticketRows[0].id;
      });
    } catch (e) {
      setLoadError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [effectiveEmail]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!effectiveEmail || !isSupabaseConfigured()) return undefined;
    const unsub1 = subscribeTickets(() => loadData());
    const unsub2 = subscribeQuotes(() => loadData());
    return () => { unsub1(); unsub2(); };
  }, [effectiveEmail, loadData]);

  useEffect(() => {
    if (!selectedTicketId || !isSupabaseConfigured()) { setMessages([]); return undefined; }
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchMessages(selectedTicketId);
        if (!cancelled) setMessages(rows.map(mapDbMessage));
      } catch { if (!cancelled) setMessages([]); }
    })();
    const unsub = subscribeMessages(selectedTicketId, (row) => {
      const m = mapDbMessage(row);
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    });
    return () => { cancelled = true; unsub(); };
  }, [selectedTicketId]);

  const handleEmailGate = (e) => {
    e.preventDefault();
    const next = emailInput.trim().toLowerCase();
    if (!next) return;
    sessionStorage.setItem(PORTAL_EMAIL_KEY, next);
    setPortalEmail(next);
  };

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setOtpError('');
    if (!isSupabaseConfigured()) { setOtpError('Supabase is not configured.'); return; }
    setOtpSending(true);
    try {
      await signInWithOtp(otpEmail);
      await markMagicLinkRequested(otpEmail);
      setOtpSent(true);
    } catch (err) {
      setOtpError(err.message || 'Could not send sign-in email');
    } finally {
      setOtpSending(false);
    }
  };

  const leavePortal = async () => {
    await authSignOut();
    sessionStorage.removeItem(PORTAL_EMAIL_KEY);
    setPortalEmail('');
    setOtpSent(false);
    setOtpEmail('');
    setTickets([]);
    setQuotes([]);
    setSelectedTicketId(null);
    setMessages([]);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicketId) return;
    try {
      const row = await insertMessage({ ticketId: selectedTicketId, sender: 'You', text: newMessage.trim(), isTech: false });
      const m = mapDbMessage(row);
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      setNewMessage('');
    } catch (err) {
      alert(err.message || 'Could not send message');
    }
  };

  const handleAccept = async (ticketId) => {
    if (!window.confirm('By clicking OK you confirm your acceptance of the quoted price and authorize 6th Sense Personal to begin service.')) return;
    setAccepting(ticketId);
    try {
      const updated = await updateTicketAccepted(ticketId);
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...updated } : t));
    } catch (err) {
      alert(err.message || 'Could not accept quote');
    } finally {
      setAccepting(null);
    }
  };

  const handleAcceptQuote = async (quoteId) => {
    if (!window.confirm('By clicking OK you authorize 6th Sense Personal to begin work at the quoted price.')) return;
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;
    
    setAcceptingQuote(quoteId);
    try {
      const ticketCode = generateTicketCode();
      await convertQuoteToTicket(quote, ticketCode);
      alert('Service authorized! A new ticket has been created: ' + ticketCode);
      loadData(); // Refresh to show the new ticket
    } catch (err) {
      alert(err.message || 'Could not authorize service');
    } finally {
      setAcceptingQuote(null);
    }
  };

  const updateNotifications = (key, value) => {
    const next = { ...notifications, [key]: value };
    setNotifications(next);
    try { localStorage.setItem('6s_notif_prefs', JSON.stringify(next)); } catch {}
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2000);
  };

  const calcSubtotal = (items) => {
    let sub = 0;
    for (const item of (items || [])) {
      if (!item.price || String(item.price).includes('/hr')) continue;
      const num = parseFloat(String(item.price).replace(/[^0-9.]/g, ''));
      if (!isNaN(num)) sub += num * (parseFloat(item.qty) || 1);
    }
    return sub;
  };

  const handleSaveIntake = async (e) => {
    e.preventDefault();
    setSavingIntake(true);
    try {
      const dbPayload = {
        device_type: intakeForm.deviceType,
        brand: intakeForm.brand,
        os: intakeForm.os,
        provider: intakeForm.provider,
        imei: intakeForm.imei,
        iccid: intakeForm.iccid,
        notes: intakeForm.notes,
        eligible_for_unlock: intakeForm.eligibleForUnlock === 'yes' ? true : intakeForm.eligibleForUnlock === 'no' ? false : null,
      };
      
      // Also save notification preferences if we want to store them in notes for now
      // Or if there was a column we'd put it here.
      
      const updated = await updateTicketInfo(selectedTicketId, dbPayload);
      setTickets(prev => prev.map(t => t.id === selectedTicketId ? { ...t, ...updated } : t));
      setEditingIntake(false);
    } catch (err) {
      alert(err.message || 'Could not save intake information');
    } finally {
      setSavingIntake(false);
    }
  };

  const startEditIntake = (ticket) => {
    setIntakeForm({
      deviceType: ticket.device_type || '',
      brand: ticket.brand || '',
      os: ticket.os || '',
      provider: ticket.provider || '',
      imei: ticket.imei || '',
      iccid: ticket.iccid || '',
      notes: ticket.notes || '',
      eligibleForUnlock: ticket.eligible_for_unlock === true ? 'yes' : ticket.eligible_for_unlock === false ? 'no' : 'unsure'
    });
    setEditingIntake(true);
  };

  const handleCodeLookup = async (e) => {
    e.preventDefault();
    if (!lookupCode.trim()) return;
    setLookupError('');
    setLookupResult(null);
    setLookupLoading(true);
    try {
      const result = await lookupByCode(lookupCode);
      if (!result) {
        setLookupError('No request found with that code.');
      } else {
        setLookupResult(result);
      }
    } catch (err) {
      setLookupError(err.message || 'Lookup failed.');
    } finally {
      setLookupLoading(false);
    }
  };

  const allItems = [...tickets, ...quotes];
  const firstName = (allItems[0]?.name || 'there').split(' ')[0];
  const activeJobs = tickets.filter((t) => ['Pending', 'In Progress', 'Authorized'].includes(t.status)).length;
  const completedJobs = tickets.filter((t) => t.status === 'Completed').length;
  const techMsgCount = messages.filter((m) => m.isTech).length;
  const pendingRequests = quotes.filter(q => ['Pending', 'Replied', 'Estimated'].includes(q.status)).length;
  const pendingEstimates = [
    ...tickets.filter(t => ['Estimated', 'Needs Authorization'].includes(t.status) && !t.accepted_at),
    ...quotes.filter(q => q.estimate_amount && !q.accepted_at && q.status !== 'Authorized'),
  ];

  if (!isSupabaseConfigured()) {
    return (
      <div className="portal-container page-container animate-fade-in">
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '36rem', margin: '0 auto' }}>
          <h2 className="portal-title">Client Portal</h2>
          <p className="text-muted" style={{ marginTop: '1rem' }}>
            Connect Supabase to load your real tickets and messages.
          </p>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="portal-container page-container animate-fade-in">
        <p className="text-muted">Loading session…</p>
      </div>
    );
  }

  if (!effectiveEmail) {
    return (
      <div className="portal-container page-container animate-fade-in">
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '28rem', margin: '0 auto' }}>
          <h2 className="portal-title">Client Portal</h2>
          {user?.email === 'jmcc5271@gmail.com' && (
            <div style={{ padding: '1rem', background: '#fef3c7', color: '#92400e', borderRadius: '8px', marginBottom: '1rem' }}>
              <strong>Testing as Tech:</strong> You are globally authenticated as admin. Please sign out from below or use incognito to view a client's portal.
              <button onClick={leavePortal} className="button secondary w-full mt-2" style={{borderColor: '#92400e', color: '#92400e'}}>Clear Global Session</button>
            </div>
          )}

          {/* ── Code Lookup (top, easiest access) ── */}
          <div style={{
            background: 'rgba(255, 107, 0, 0.06)',
            border: '1px solid rgba(255, 107, 0, 0.2)',
            borderRadius: '10px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Search size={16} style={{ color: 'var(--primary)' }} /> Look Up by Request Code
            </h3>
            <form onSubmit={handleCodeLookup} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 6S-A3K7"
                value={lookupCode}
                onChange={e => setLookupCode(e.target.value.toUpperCase())}
                style={{ textAlign: 'center', fontFamily: 'monospace', letterSpacing: '2px', fontWeight: 600 }}
              />
              <button type="submit" className="button" disabled={lookupLoading || !lookupCode.trim()}>
                {lookupLoading ? '...' : 'Go'}
              </button>
            </form>
            {lookupError && <p style={{ color: '#fca5a5', fontSize: '0.85rem', marginTop: '0.5rem' }}>{lookupError}</p>}
            {lookupResult && <LookupResultCard lookupResult={lookupResult} />}
          </div>

          {/* ── Create Account (magic link) ── */}
          <p className="text-muted" style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>
            <strong>Create an account</strong> to view all your requests, get messages, and track status.
          </p>
          <form onSubmit={handleMagicLink} className="form-grid" style={{ marginBottom: '1.5rem' }}>
            <input type="email" className="form-input" required value={otpEmail} onChange={(ev) => setOtpEmail(ev.target.value)} placeholder="you@example.com" />
            <button type="submit" className="button submit-button w-full" disabled={otpSending}>
              {otpSending ? 'Sending…' : 'Email me a sign-in link'}
            </button>
          </form>
          {otpSent && <p style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '0.95rem' }}>Check your inbox for the login link. After you open it, return here to see your tickets.</p>}
          {otpError && <p style={{ color: '#fca5a5', marginBottom: '1rem' }}>{otpError}</p>}

          <p className="text-muted text-sm" style={{ marginBottom: '0.75rem' }}>Or continue without an account</p>
          <form onSubmit={handleEmailGate} className="form-grid">
            <input type="email" className="form-input" required value={emailInput} onChange={(ev) => setEmailInput(ev.target.value)} placeholder="Same email as your intake" />
            <button type="submit" className="button secondary w-full">Continue with this email</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-container page-container animate-fade-in">
      <div className="portal-sidebar glass-panel">
        <div className="client-info">
          <div className="avatar">{firstName.slice(0, 2).toUpperCase()}</div>
          <div>
            <h3>{allItems[0]?.name || 'Client'}</h3>
            <p className="text-muted">{effectiveEmail}</p>
            {user?.email && <p className="text-muted text-sm" style={{ marginTop: '0.25rem' }}>Signed in with magic link</p>}
            <button type="button" className="button secondary small-btn" style={{ marginTop: '0.5rem' }} onClick={leavePortal}>
              Sign out / change email
            </button>
          </div>
        </div>

        <nav className="portal-nav">
          <button type="button" className={`portal-nav-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <LayoutDashboardIcon /> Overview
          </button>
          <button type="button" className={`portal-nav-btn ${activeTab === 'tickets' || activeTab === 'ticketDetail' ? 'active' : ''}`} onClick={() => { setActiveTab('tickets'); setSelectedTicketId(tickets[0]?.id || null); }}>
            <FileText size={18} /> Service Tickets
          </button>
          <button type="button" className={`portal-nav-btn ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
            <ClipboardList size={18} /> Info Requests
            {pendingRequests > 0 && <span className="badge">{pendingRequests}</span>}
          </button>
          <button type="button" className={`portal-nav-btn ${activeTab === 'intake' ? 'active' : ''}`} onClick={() => setActiveTab('intake')}>
            <Smartphone size={18} /> Intake Info
          </button>
          <button type="button" className={`portal-nav-btn ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
            <MessageSquare size={18} /> Messages
            {techMsgCount > 0 && <span className="badge">{techMsgCount}</span>}
          </button>
        </nav>
        
        <div className="client-notifications" style={{ marginTop: 'auto', paddingTop: '2rem', fontSize: '0.85rem' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}><Bell size={14}/> Notifications</h4>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={notifications.email} onChange={e => updateNotifications('email', e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
            Email Updates
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={notifications.text} onChange={e => updateNotifications('text', e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
            Text/SMS Updates
          </label>
          {notifSaved && <p style={{ color: 'var(--primary)', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: 600 }}>✓ Preferences saved</p>}
        </div>
      </div>

      <div className="portal-content">
        {loadError && <p style={{ color: '#fca5a5', marginBottom: '1rem' }}>{loadError}</p>}
        {loading && tickets.length === 0 && quotes.length === 0 && (
          <div className="overview-tab animate-fade-in">
            <Skeleton style={{ width: '200px', height: '32px', marginBottom: '1.5rem' }} />
            <div className="dashboard-stats">
              <Skeleton className="stat-card glass-panel" style={{ height: '80px' }} />
              <Skeleton className="stat-card glass-panel" style={{ height: '80px' }} />
            </div>
            <Skeleton style={{ width: '150px', height: '24px', marginTop: '2rem', marginBottom: '1rem' }} />
            <div className="requests-list">
              {[1, 2].map(i => <Skeleton key={i} className="request-card glass-panel" style={{ height: '100px' }} />)}
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="overview-tab animate-fade-in">
            <h2 className="portal-title">Welcome back, {firstName}</h2>

            {/* ── Estimate Alert Banner ── */}
            {pendingEstimates.length > 0 && (
              <div className="estimate-alert" style={{
                background: 'linear-gradient(135deg, rgba(255,107,0,0.12), rgba(255,107,0,0.04))',
                border: '1px solid rgba(255,107,0,0.3)',
                borderRadius: '8px',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}>
                <AlertCircle size={24} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <strong style={{ color: 'var(--primary)' }}>{pendingEstimates.length} estimate{pendingEstimates.length > 1 ? 's' : ''} awaiting your authorization</strong>
                  <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    Review and authorize to begin service.
                  </p>
                </div>
                <button className="button small-btn" onClick={() => {
                  const firstTicket = pendingEstimates.find(e => e.job_type || e.service);
                  if (firstTicket && tickets.some(t => t.id === firstTicket.id)) {
                    setSelectedTicketId(firstTicket.id); setActiveTab('ticketDetail');
                  } else {
                    setActiveTab('requests');
                  }
                }}>Review Now</button>
              </div>
            )}

            <div className="dashboard-stats">
              <div className="stat-card glass-panel">
                <Clock className="stat-icon text-warning" size={24} />
                <div className="stat-details">
                  <h4>Active Jobs</h4>
                  <span className="stat-number">{activeJobs}</span>
                </div>
              </div>
              <div className="stat-card glass-panel">
                <CheckCircle className="stat-icon text-success" size={24} />
                <div className="stat-details">
                  <h4>Completed</h4>
                  <span className="stat-number">{completedJobs}</span>
                </div>
              </div>
              <div className="stat-card glass-panel">
                <ClipboardList className="stat-icon" size={24} style={{color:'var(--primary)'}} />
                <div className="stat-details">
                  <h4>Info Requests</h4>
                  <span className="stat-number">{quotes.length}</span>
                </div>
              </div>
            </div>

            {/* ── Service Tickets ── */}
            {tickets.length > 0 && (
              <>
                <h3 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '1rem' }}>Service Tickets</h3>
                <div className="requests-list">
                  {tickets.map((req) => (
                    <div key={req.id} className="request-card glass-panel" style={{cursor: 'pointer'}} onClick={() => { setSelectedTicketId(req.id); setActiveTab('ticketDetail'); }}>
                      <div className="request-header">
                        <span className="request-id">
                          <FileText size={16} /> {req.ticket_code || formatTicketId(req.id)}
                        </span>
                        <span className={`status-badge ${req.status.replace(/ /g, '-').toLowerCase()}`}>{req.status}</span>
                      </div>
                      <div className="request-body">
                        <h4>{formatJobType(req.job_type || req.service)}</h4>
                        <p className="text-muted">{req.brand} {req.device_type ? `• ${req.device_type}` : ''}</p>
                        <p className="request-date">Submitted: {new Date(req.created_at).toLocaleDateString()}</p>
                      </div>

                      {['Estimated', 'Needs Authorization'].includes(req.status) && !req.accepted_at && (
                        <div className="accept-quote-section">
                          <div className="accept-quote-info">
                            <p className="text-sm" style={{ color: '#fcd34d', marginBottom: '0.5rem' }}>
                              💰 A price estimate is ready for your review.
                              {req.estimate_amount ? ` Quoted: $${req.estimate_amount}` : ''}
                            </p>
                          </div>
                          <button
                            className="button accept-btn w-full"
                            onClick={(e) => { e.stopPropagation(); handleAccept(req.id); }}
                            disabled={accepting === req.id}
                          >
                            <ThumbsUp size={16} />
                            {accepting === req.id ? 'Processing…' : 'Accept Quote & Authorize Service'}
                          </button>
                        </div>
                      )}

                      {req.accepted_at && (
                        <div className="accepted-badge">
                          <CheckCircle size={16} />
                          Service authorized on {new Date(req.accepted_at).toLocaleDateString()}
                        </div>
                      )}

                      {req.status === 'Completed' && req.summary && (
                        <div className="summary-section" style={{ marginTop: '1rem' }}>
                          <div className="summary-header">
                            <FileCheck size={16} />
                            <span>Service Log</span>
                          </div>
                          <pre className="summary-text" style={{ maxHeight: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.summary}</pre>
                          <p className="text-sm text-muted" style={{ marginTop: '0.5rem' }}>Click to view full details</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Info Requests (Quotes) ── */}
            {quotes.length > 0 && (
              <>
                <h3 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '1rem' }}>Information Requests</h3>
                <div className="requests-list">
                  {quotes.map((q) => (
                    <div key={q.id} className="request-card glass-panel" onClick={() => { setSelectedQuoteId(q.id); setActiveTab('requestDetail'); }} style={{cursor:'pointer'}}>
                      <div className="request-header">
                        <span className="request-id">
                          <ClipboardList size={16} /> {q.ticket_code || formatTicketId(q.id)}
                        </span>
                        <span className={`status-badge ${q.status.replace(/ /g, '-').toLowerCase()}`}>{q.status}</span>
                      </div>
                      <div className="request-body">
                        <h4>{formatJobType(q.service) || 'General Request'}</h4>
                        <p className="text-muted">{q.description?.substring(0, 80)}{q.description?.length > 80 ? '…' : ''}</p>
                        <p className="request-date">Submitted: {new Date(q.created_at).toLocaleDateString()}</p>
                      </div>
                      {q.tech_response && (
                        <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(255,107,0,0.08)', borderRadius: '8px', fontSize: '0.85rem' }}>
                          <strong style={{ color: 'var(--primary)' }}>Tech Response:</strong> {q.tech_response.substring(0, 100)}{q.tech_response.length > 100 ? '…' : ''}
                        </div>
                      )}
                      {q.estimate_amount && (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(255,107,0,0.1)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>💰 Estimate: ${q.estimate_amount}</span>
                          {!q.accepted_at && q.status !== 'Authorized' && (
                            <button className="button small-btn accept-btn" onClick={(e) => { e.stopPropagation(); handleAcceptQuote(q.id); }} disabled={acceptingQuote === q.id} style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                              <ThumbsUp size={14} /> {acceptingQuote === q.id ? '...' : 'Authorize'}
                            </button>
                          )}
                          {q.accepted_at && <span style={{ color: '#6ee7b7', fontSize: '0.85rem' }}>✓ Authorized</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {tickets.length === 0 && quotes.length === 0 && !loading && (
              <p className="text-muted" style={{marginTop:'1.5rem'}}>No tickets or requests yet for this email. Submit an intake or info request to create one.</p>
            )}
          </div>
        )}

        {/* ── Tickets List Tab ── */}
        {activeTab === 'tickets' && (
          <div className="overview-tab animate-fade-in">
            <h2 className="portal-title">Service Tickets</h2>
            {tickets.length === 0 ? (
              <p className="text-muted">No service tickets found.</p>
            ) : (
              <div className="requests-list">
                {tickets.map((req) => (
                  <div key={req.id} className="request-card glass-panel" style={{cursor: 'pointer'}} onClick={() => { setSelectedTicketId(req.id); setActiveTab('ticketDetail'); }}>
                    <div className="request-header">
                      <span className="request-id">
                        <FileText size={16} /> {req.ticket_code || formatTicketId(req.id)}
                      </span>
                      <span className={`status-badge ${req.status.replace(/ /g, '-').toLowerCase()}`}>{req.status}</span>
                    </div>
                    <div className="request-body">
                      <h4>{formatJobType(req.job_type || req.service)}</h4>
                      <p className="text-muted">{req.brand} {req.device_type ? `• ${req.device_type}` : ''}</p>
                      <p className="request-date">Submitted: {new Date(req.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Ticket Detail Tab ── */}
        {activeTab === 'ticketDetail' && (() => {
          const ticket = tickets.find(t => t.id === selectedTicketId) || tickets[0];
          if (!ticket) return <p className="text-muted">No ticket selected.</p>;
          
          return (
            <div className="overview-tab animate-fade-in">
              <button className="button secondary small-btn" style={{ marginBottom: '1rem' }} onClick={() => setActiveTab('tickets')}>
                &larr; Back to Tickets
              </button>
              
              <div className="glass-panel" style={{ padding: '2rem' }}>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{formatJobType(ticket.job_type || ticket.service)}</h2>
                    <p className="text-muted text-lg">{ticket.ticket_code || formatTicketId(ticket.id)} • Submitted {new Date(ticket.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`status-badge ${ticket.status.replace(/ /g, '-').toLowerCase()}`} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                    {ticket.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column: Details & Summary */}
                  <div className="flex flex-col gap-6">
                    {/* Device Details Card */}
                    <div className="p-6 glass-panel" style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                      <h3 className="flex items-center gap-2 mb-5 text-lg font-semibold"><Smartphone size={20} style={{color:'var(--primary)'}}/> Device Details</h3>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                        <div><span className="text-muted block text-xs uppercase tracking-wider mb-1">Brand</span> <span className="font-medium text-gray-200">{ticket.brand || '—'}</span></div>
                        <div><span className="text-muted block text-xs uppercase tracking-wider mb-1">Type</span> <span className="font-medium text-gray-200">{ticket.device_type || '—'}</span></div>
                        <div><span className="text-muted block text-xs uppercase tracking-wider mb-1">OS</span> <span className="font-medium text-gray-200">{ticket.os || '—'}</span></div>
                        <div><span className="text-muted block text-xs uppercase tracking-wider mb-1">Carrier</span> <span className="font-medium text-gray-200">{ticket.provider || '—'}</span></div>
                      </div>
                    </div>
                    
                    {/* Service Log Card */}
                    {ticket.summary && (
                      <div className="p-6 glass-panel" style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                        <h3 className="flex items-center gap-2 mb-4 text-lg font-semibold"><FileCheck size={20} style={{color:'var(--primary)'}}/> Service Log</h3>
                        <div className="p-4" style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.9rem', lineHeight: '1.6', color: '#e2e8f0' }}>{ticket.summary}</pre>
                        </div>
                      </div>
                    )}
                    
                    {/* Inline Chat Toggle */}
                    <button className="button secondary w-full md:w-auto mt-2 flex justify-center items-center py-3" onClick={() => setChatOpen(!chatOpen)}>
                      {chatOpen ? <ChevronUp size={18} className="mr-2" /> : <ChevronDown size={18} className="mr-2" />}
                      <MessageSquare size={18} className="mr-2" />
                      {chatOpen ? 'Hide Chat' : 'Chat with Technician'}
                    </button>

                    {chatOpen && (
                      <div className="glass-panel" style={{ padding: '1rem', borderRadius: '8px', maxHeight: '300px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {messages.length === 0 && <p className="text-muted text-sm">No messages yet. Start the conversation.</p>}
                          {messages.map((msg) => (
                            <div key={msg.id} className={`message-bubble ${msg.isTech ? 'tech' : 'client'}`} style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}>
                              <div className="message-sender">{msg.sender} <span className="message-time">{msg.time}</span></div>
                              <div className="message-text">{msg.text}</div>
                            </div>
                          ))}
                        </div>
                        <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
                          <input type="text" className="form-input" placeholder="Type a message…" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} style={{ flex: 1 }} />
                          <button type="submit" className="button small-btn"><MessageSquare size={16} /></button>
                        </form>
                      </div>
                    )}
                  </div>
                  
                  {/* Right Column: Invoice */}
                  <div className="flex flex-col gap-6">
                    <div className="p-6" style={{ background: 'linear-gradient(145deg, rgba(255,107,0,0.08) 0%, rgba(255,107,0,0.02) 100%)', border: '1px solid rgba(255,107,0,0.15)', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                      <h3 className="flex items-center gap-2 mb-6 text-lg font-semibold"><ReceiptText size={20} style={{color:'var(--primary)'}}/> Invoice & Estimate</h3>
                      
                      <div className="flex justify-between items-center mb-6 pb-4" style={{ borderBottom: '1px dashed rgba(255,107,0,0.2)' }}>
                        <span className="text-muted uppercase tracking-wider text-xs font-semibold">Status</span>
                        <strong className="px-3 py-1 rounded-full text-sm" style={{ background: ticket.invoice_status === 'Paid In Full' ? 'rgba(16,185,129,0.1)' : 'rgba(255,107,0,0.1)', color: ticket.invoice_status === 'Paid In Full' ? '#34d399' : 'var(--primary)' }}>
                          {ticket.invoice_status || 'Estimate. Not final.'}
                        </strong>
                      </div>
                      
                      {ticket.invoice_items && ticket.invoice_items.length > 0 ? (
                        <div className="mb-4">
                          {ticket.invoice_items.map((item, idx) => (
                            <div key={idx} className="flex justify-between mb-3 text-sm items-center" style={{ paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                              <span className="text-gray-300"><span className="text-muted mr-2">{item.qty}x</span> {item.description}</span>
                              <span className="font-medium text-gray-200">{item.price}</span>
                            </div>
                          ))}
                          {/* Subtotal */}
                          {(() => {
                            const sub = calcSubtotal(ticket.invoice_items);
                            const hasHourly = ticket.invoice_items.some(i => String(i.price).includes('/hr'));
                            return (
                              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '2px solid rgba(255,107,0,0.3)' }}>
                                <div className="flex justify-between items-center">
                                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>Total</span>
                                  <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary)' }}>
                                    {hasHourly ? 'TBD' : `$${sub.toFixed(2)}`}
                                  </span>
                                </div>
                                {hasHourly && <p className="text-muted text-xs" style={{ marginTop: '0.25rem' }}>Includes hourly items — final total will vary.</p>}
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <p className="text-sm text-muted mb-8 italic text-center p-4 bg-black bg-opacity-20 rounded">Estimate pending evaluation.</p>
                      )}
                      
                      <button className="button w-full flex items-center justify-center gap-2 py-3" onClick={() => generateInvoicePrint({ ...ticket, invoiceStatus: ticket.invoice_status, invoiceItems: ticket.invoice_items })}>
                        <Download size={18}/> Print / Save PDF
                      </button>
                    </div>
                    
                    {['Estimated', 'Needs Authorization'].includes(ticket.status) && !ticket.accepted_at && (
                      <div className="p-5" style={{ background: 'linear-gradient(145deg, rgba(252,211,77,0.1) 0%, rgba(252,211,77,0.02) 100%)', border: '1px solid rgba(252,211,77,0.2)', borderRadius: '12px' }}>
                        <p className="text-sm mb-4 text-warning font-medium text-center">Review the estimate and authorize service to proceed.</p>
                        <button
                          className="button accept-btn w-full flex items-center justify-center gap-2 py-3 shadow-lg"
                          onClick={(e) => { e.stopPropagation(); handleAccept(ticket.id); }}
                          disabled={accepting === ticket.id}
                        >
                          <ThumbsUp size={18} />
                          {accepting === ticket.id ? 'Processing…' : 'Authorize Service'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Info Requests Tab ── */}
        {activeTab === 'requests' && (
          <div className="overview-tab animate-fade-in">
            <h2 className="portal-title">Information Requests</h2>
            {quotes.length === 0 ? (
              <p className="text-muted">No information requests found for this email.</p>
            ) : (
              <div className="requests-list">
                {quotes.map((q) => (
                  <div key={q.id} className="request-card glass-panel" style={{cursor: 'pointer'}} onClick={() => { setSelectedQuoteId(q.id); setActiveTab('requestDetail'); }}>
                    <div className="request-header">
                      <span className="request-id" style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                        {q.ticket_code || formatTicketId(q.id)}
                      </span>
                      <span className={`status-badge ${q.status.replace(/ /g, '-').toLowerCase()}`}>{q.status}</span>
                    </div>
                    <div className="request-body" style={{ marginBottom: '0.75rem' }}>
                      <h4>{formatJobType(q.service) || 'General Request'}</h4>
                      <p className="request-date">Submitted: {new Date(q.created_at).toLocaleDateString()}</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                      {q.device_type && <div><span className="text-muted">Device:</span> {q.device_type}</div>}
                      {q.brand && <div><span className="text-muted">Brand:</span> {q.brand}</div>}
                      {q.os && <div><span className="text-muted">OS:</span> {q.os}</div>}
                      {q.priority && <div><span className="text-muted">Priority:</span> {q.priority}</div>}
                      {q.preferred_contact && <div><span className="text-muted">Contact Via:</span> {q.preferred_contact}</div>}
                    </div>
                    {q.estimate_amount && (
                      <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,107,0,0.1)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.05rem' }}>💰 Estimate: ${q.estimate_amount}</span>
                        {!q.accepted_at && q.status !== 'Authorized' && (
                          <button className="button small-btn accept-btn" onClick={(e) => { e.stopPropagation(); handleAcceptQuote(q.id); }} disabled={acceptingQuote === q.id} style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
                            <ThumbsUp size={14} /> {acceptingQuote === q.id ? '...' : 'Authorize'}
                          </button>
                        )}
                        {q.accepted_at && <span style={{ color: '#6ee7b7', fontSize: '0.85rem' }}>✓ Authorized</span>}
                      </div>
                    )}
                    {q.tech_response && (
                      <div style={{ padding: '0.75rem', background: 'rgba(255,107,0,0.08)', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <strong style={{ color: 'var(--primary)' }}>Tech Response:</strong>
                        <p style={{ marginTop: '0.25rem' }}>{q.tech_response.substring(0, 150)}{q.tech_response.length > 150 ? '…' : ''}</p>
                      </div>
                    )}
                    <p className="text-sm text-muted" style={{ marginTop: '0.5rem' }}>Click to view full details →</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Request Detail Tab ── */}
        {activeTab === 'requestDetail' && (() => {
          const q = quotes.find(x => x.id === selectedQuoteId) || quotes[0];
          if (!q) return <p className="text-muted">No request selected.</p>;
          return (
            <div className="overview-tab animate-fade-in">
              <button className="button secondary small-btn" style={{ marginBottom: '1rem' }} onClick={() => setActiveTab('requests')}>
                &larr; Back to Requests
              </button>
              <div className="glass-panel" style={{ padding: '2rem' }}>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{formatJobType(q.service) || 'General Request'}</h2>
                    <p className="text-muted text-lg">{q.ticket_code || formatTicketId(q.id)} • Submitted {new Date(q.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`status-badge ${q.status.replace(/ /g, '-').toLowerCase()}`} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                    {q.status}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6" style={{ fontSize: '0.9rem' }}>
                  {q.device_type && <div><span className="text-muted block text-xs uppercase tracking-wider mb-1">Device</span>{q.device_type}</div>}
                  {q.brand && <div><span className="text-muted block text-xs uppercase tracking-wider mb-1">Brand</span>{q.brand}</div>}
                  {q.model && <div><span className="text-muted block text-xs uppercase tracking-wider mb-1">Model</span>{q.model}</div>}
                  {q.os && <div><span className="text-muted block text-xs uppercase tracking-wider mb-1">OS</span>{q.os}</div>}
                  {q.priority && <div><span className="text-muted block text-xs uppercase tracking-wider mb-1">Priority</span>{q.priority}</div>}
                  {q.preferred_contact && <div><span className="text-muted block text-xs uppercase tracking-wider mb-1">Preferred Contact</span>{q.preferred_contact}</div>}
                  {q.request_type && <div><span className="text-muted block text-xs uppercase tracking-wider mb-1">Request Type</span>{q.request_type}</div>}
                </div>

                {/* Description */}
                {q.description && (
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <strong className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Description</strong>
                    <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{q.description}</p>
                  </div>
                )}

                {/* Tech Response */}
                {q.tech_response && (
                  <div style={{ padding: '1rem', background: 'rgba(255,107,0,0.08)', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(255,107,0,0.15)' }}>
                    <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '0.5rem' }}>Tech Response</strong>
                    <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{q.tech_response}</p>
                  </div>
                )}

                {/* Estimate & Authorization */}
                {q.estimate_amount && (
                  <div style={{
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, rgba(255,107,0,0.1), rgba(255,107,0,0.03))',
                    border: '1px solid rgba(255,107,0,0.25)',
                    borderRadius: '12px',
                    marginBottom: '1.5rem',
                  }}>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-muted uppercase tracking-wider text-xs font-semibold">Quoted Price</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>${q.estimate_amount}</span>
                    </div>
                    {q.accepted_at ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6ee7b7', fontWeight: 600 }}>
                        <CheckCircle size={18} /> Service authorized on {new Date(q.accepted_at).toLocaleDateString()}
                      </div>
                    ) : q.status !== 'Authorized' ? (
                      <button
                        className="button accept-btn w-full flex items-center justify-center gap-2 py-3"
                        onClick={() => handleAcceptQuote(q.id)}
                        disabled={acceptingQuote === q.id}
                      >
                        <ThumbsUp size={18} />
                        {acceptingQuote === q.id ? 'Processing…' : 'Accept Quote & Authorize Service'}
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6ee7b7', fontWeight: 600 }}>
                        <CheckCircle size={18} /> Authorized
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {activeTab === 'intake' && (() => {
          const ticket = tickets.find(t => t.id === selectedTicketId) || tickets[0];
          if (!ticket) return <p className="text-muted">No tickets found.</p>;
          return (
            <div className="intake-tab glass-panel animate-fade-in" style={{padding: '2rem'}}>
              <div className="flex justify-between items-center mb-6">
                <h3>Intake Information</h3>
                {tickets.length > 1 && (
                  <select className="form-input" style={{width: '200px'}} value={ticket.id} onChange={(e) => { setSelectedTicketId(e.target.value); setEditingIntake(false); }}>
                    {tickets.map(t => <option key={t.id} value={t.id}>{t.ticket_code || formatTicketId(t.id)}</option>)}
                  </select>
                )}
              </div>
              
              {!editingIntake ? (
                <div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div><label className="text-muted block text-sm">Device Type</label><div>{ticket.device_type || '—'}</div></div>
                    <div><label className="text-muted block text-sm">Brand & Model</label><div>{ticket.brand || '—'}</div></div>
                    <div><label className="text-muted block text-sm">Operating System</label><div>{ticket.os || '—'}</div></div>
                    <div><label className="text-muted block text-sm">Service Provider</label><div>{ticket.provider || '—'}</div></div>
                    <div><label className="text-muted block text-sm">IMEI</label><div>{ticket.imei || '—'}</div></div>
                    <div><label className="text-muted block text-sm">ICCID</label><div>{ticket.iccid || '—'}</div></div>
                  </div>
                  <div className="mb-6">
                    <label className="text-muted block text-sm">Notes</label>
                    <div style={{whiteSpace:'pre-wrap'}}>{ticket.notes || '—'}</div>
                  </div>
                  <button onClick={() => startEditIntake(ticket)} className="button">Edit Information</button>
                </div>
              ) : (
                <form onSubmit={handleSaveIntake}>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="form-group">
                      <label className="form-label">Device Type</label>
                      <select className="form-input" value={intakeForm.deviceType} onChange={e=>setIntakeForm({...intakeForm, deviceType: e.target.value})}>
                        <option value="">Select...</option>
                        <option value="Smartphone">Smartphone</option>
                        <option value="Tablet">Tablet</option>
                        <option value="Laptop">Laptop</option>
                        <option value="Desktop">Desktop</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="form-group"><label className="form-label">Brand & Model</label><input type="text" className="form-input" value={intakeForm.brand} onChange={e=>setIntakeForm({...intakeForm, brand: e.target.value})} /></div>
                    <div className="form-group"><label className="form-label">Operating System</label><input type="text" className="form-input" value={intakeForm.os} onChange={e=>setIntakeForm({...intakeForm, os: e.target.value})} /></div>
                    <div className="form-group"><label className="form-label">Service Provider</label><input type="text" className="form-input" value={intakeForm.provider} onChange={e=>setIntakeForm({...intakeForm, provider: e.target.value})} /></div>
                    <div className="form-group"><label className="form-label">IMEI</label><input type="text" className="form-input" value={intakeForm.imei} onChange={e=>setIntakeForm({...intakeForm, imei: e.target.value})} /></div>
                    <div className="form-group"><label className="form-label">ICCID</label><input type="text" className="form-input" value={intakeForm.iccid} onChange={e=>setIntakeForm({...intakeForm, iccid: e.target.value})} /></div>
                  </div>
                  <div className="form-group mb-4">
                    <label className="form-label">Notes</label>
                    <textarea className="form-input" rows="4" value={intakeForm.notes} onChange={e=>setIntakeForm({...intakeForm, notes: e.target.value})}></textarea>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button type="submit" className="button" disabled={savingIntake}>{savingIntake ? 'Saving...' : 'Save Changes'}</button>
                    <button type="button" className="button secondary" onClick={() => setEditingIntake(false)}>Cancel</button>
                  </div>
                </form>
              )}
            </div>
          );
        })()}

        {activeTab === 'messages' && (
          <div className="messaging-tab glass-panel animate-fade-in">
            <div className="messaging-header">
              <h3>Support chat</h3>
              {tickets.length > 1 && (
                <label className="text-muted" style={{ display: 'block', marginTop: '0.5rem' }}>
                  Ticket:{' '}
                  <select
                    className="form-input"
                    style={{ maxWidth: '100%', marginTop: '0.35rem' }}
                    value={selectedTicketId || ''}
                    onChange={(ev) => setSelectedTicketId(ev.target.value)}
                  >
                    {tickets.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.ticket_code || formatTicketId(t.id)} — {formatJobType(t.job_type || t.service)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <p className="text-muted">Messages sync in real time for the selected ticket.</p>
            </div>

            <div className="message-list">
              {messages.map((msg) => (
                <div key={msg.id} className={`message-bubble ${msg.isTech ? 'tech' : 'client'}`}>
                  <div className="message-sender">
                    {msg.sender} <span className="message-time">{msg.time}</span>
                  </div>
                  <div className="message-text">{msg.text}</div>
                </div>
              ))}
            </div>

            <form onSubmit={sendMessage} className="message-input-area">
              <input
                type="text"
                className="form-input chat-input"
                placeholder={selectedTicketId ? 'Type your message…' : 'No ticket selected'}
                value={newMessage}
                disabled={!selectedTicketId}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button type="submit" className="button square-btn" disabled={!selectedTicketId}>
                <MessageSquare size={18} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function LayoutDashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}
