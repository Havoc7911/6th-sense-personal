import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Filter, AlertCircle, FileText, Smartphone, Shield, Database,
  Power, MessageSquare, ClipboardList, Plus, Clock, Paperclip, Download,
  ReceiptText, FileCheck, ChevronDown, ChevronUp, ChevronRight, Unlock, X, Tag, Megaphone,
  Pencil, Trash2, ToggleLeft, ToggleRight, User, ArrowRight
} from 'lucide-react';
import QuoteRequestsPanel from './QuoteRequestsPanel';
import {
  fetchAllTickets,
  fetchMessages,
  insertMessage,
  subscribeTickets,
  subscribeMessages,
  updateTicketStatus,
  updateTicketPriority,
  fetchTicketEvents,
  insertTicketEvent,
  updateTicketEvent,
  deleteTicketEvent,
  fetchTicketFiles,
  uploadTicketFile,
  updateTicketSummary,
  updateTicketInfo,
  generateInvoicePrint,
  fetchAllPromotions,
  insertPromotion,
  updatePromotion,
  deletePromotion,
  deleteTicket,
} from '../api/data';
import { isSupabaseConfigured } from '../lib/supabase';
import { formatTicketId } from '../lib/ticketId';
import { formatJobType } from '../lib/formatJobType';
import { pickServiceIcon } from '../lib/serviceIcon';
import Skeleton from '../components/Skeleton';
import { formatPhone } from '../lib/formatPhone';
import { serviceCategories } from '../lib/services';
import './TechDashboard.css';

// ─── Promotions Panel ────────────────────────────────────────────────────────
function PromotionsPanel() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Create / Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '', price: '', code: '', active: true });
  const [saving, setSaving] = useState(false);

  const loadPromos = useCallback(async () => {
    try {
      const data = await fetchAllPromotions();
      setPromotions(data);
    } catch (e) {
      setError(e.message || 'Failed to load promotions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPromos(); }, [loadPromos]);

  const handleEdit = (p) => {
    setEditId(p.id);
    const parts = (p.description || '').split('|||');
    const desc = parts[0].trim();
    const price = parts.length > 1 ? parts[1].trim() : '';
    setFormData({ title: p.title, description: desc, price, code: p.code || '', active: p.active });
    setIsEditing(true);
  };

  const handleAddNew = () => {
    setEditId(null);
    setFormData({ title: '', description: '', price: '', code: '', active: true });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditId(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const finalDesc = formData.price ? `${formData.description.trim()} ||| ${formData.price.trim()}` : formData.description.trim();
      const payload = { ...formData, description: finalDesc };
      if (editId) {
        await updatePromotion(editId, payload);
      } else {
        await insertPromotion(payload);
      }
      await loadPromos();
      setIsEditing(false);
    } catch (e) {
      alert(e.message || 'Failed to save promotion');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this promotion?")) return;
    try {
      await deletePromotion(id);
      await loadPromos();
    } catch (e) {
      alert(e.message || 'Failed to delete promotion');
    }
  };

  const toggleActive = async (p) => {
    try {
      await updatePromotion(p.id, { active: !p.active });
      await loadPromos();
    } catch (e) {
      alert(e.message || 'Failed to toggle status');
    }
  };

  if (isEditing) {
    return (
      <div className="promotions-view animate-fade-in">
        <div className="tech-header mb-4">
          <div className="flex items-center gap-4">
            <button onClick={cancelEdit} className="button secondary square-btn"><X size={20}/></button>
            <h2>{editId ? 'Edit Promotion' : 'New Promotion'}</h2>
          </div>
        </div>
        <form onSubmit={handleSave} className="glass-panel" style={{padding: '2rem', maxWidth: '600px'}}>
          <div className="form-group mb-4">
            <label className="form-label">Title</label>
            <input type="text" className="form-input" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. 🚀 Spring Refresh" />
          </div>
          <div className="form-group mb-4">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows="3" required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Get 15% off..." />
          </div>
          <div className="form-group mb-4">
            <label className="form-label">Price / Discount Value (optional)</label>
            <input type="text" className="form-input" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="e.g. $50, $15/hr, 20% OFF, $20 OFF" />
          </div>
          <div className="form-group mb-4">
            <label className="form-label">Promo Code (optional)</label>
            <input type="text" className="form-input" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="e.g. SPRING15" />
          </div>
          <div className="form-group mb-4 flex items-center justify-between">
            <label className="form-label" style={{marginBottom: 0}}>Active Status</label>
            <button type="button" onClick={() => setFormData({...formData, active: !formData.active})} className="icon-button" style={{color: formData.active ? 'var(--primary)' : '#888888'}}>
              {formData.active ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
            </button>
          </div>
          <button type="submit" className="button" disabled={saving}>{saving ? 'Saving...' : 'Save Promotion'}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="promotions-view animate-fade-in">
      <div className="tech-header mb-4">
        <div>
          <h2 className="flex items-center gap-2"><Megaphone size={28}/> Promotions</h2>
          <p className="text-muted text-sm">Manage banners on the public Home and Services pages.</p>
        </div>
        <button onClick={handleAddNew} className="button small-btn flex items-center gap-2"><Plus size={16}/> New Promo</button>
      </div>
      
      {error && <p style={{color: '#fca5a5'}}>{error}</p>}
      {loading ? <p className="text-muted">Loading...</p> : (
        <div className="ticket-detail-grid">
          {promotions.map(p => (
            <div key={p.id} className={`glass-panel p-4 flex flex-col justify-between ${!p.active ? 'opacity-50' : ''}`} style={{padding: '1.5rem'}}>
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    {p.title}
                    {!p.active && <span className="status-badge cancelled" style={{fontSize: '0.65rem'}}>Draft</span>}
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={() => toggleActive(p)} className="icon-button" title={p.active ? 'Deactivate' : 'Activate'}>
                      {p.active ? <ToggleRight size={20} color="var(--primary)" /> : <ToggleLeft size={20} />}
                    </button>
                    <button onClick={() => handleEdit(p)} className="icon-button"><Pencil size={18}/></button>
                    <button onClick={() => handleDelete(p.id)} className="icon-button text-error"><Trash2 size={18}/></button>
                  </div>
                </div>
                <p className="text-muted mb-4">{p.description.split('|||')[0].trim()}</p>
                <div className="flex gap-2 items-center">
                  {p.description.includes('|||') && <span className="home-promo-code inline-block" style={{background: 'rgba(255,107,0,0.1)', color: 'var(--primary)', border: '1px solid var(--primary)'}}>{p.description.split('|||')[1].trim()}</span>}
                  {p.code && <span className="home-promo-code inline-block">{p.code}</span>}
                </div>
              </div>
            </div>
          ))}
          {!promotions.length && <p className="text-muted">No promotions configured.</p>}
        </div>
      )}
    </div>
  );
}

function mapDbMessage(row) {
  return {
    id: row.id,
    sender: row.sender,
    text: row.text,
    time: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isTech: row.is_tech,
  };
}

function mapRowToTicket(row) {
  const Icon = pickServiceIcon(row.job_type, row.brand);
  return {
    raw: row,
    id: row.id,
    displayId: formatTicketId(row.id),
    ticket_code: row.ticket_code || null,
    client: row.name,
    email: row.email,
    phone: formatPhone(row.phone),
    service: formatJobType(row.job_type || row.service),
    rawService: row.job_type || row.service,
    status: row.status || 'Pending',
    priority: row.priority || 'Normal',
    date: new Date(row.created_at).toLocaleDateString(),
    icon: Icon,
    intake: {
      deviceType: row.device_type,
      brand: row.brand,
      os: row.os,
      provider: row.provider,
      imei: row.imei,
      iccid: row.iccid,
      notes: row.notes,
      credentials: Array.isArray(row.credentials) ? row.credentials : [],
      eligibleForUnlock: row.eligible_for_unlock,
    },
    magicLinkRequested: !!row.magic_link_requested,
    invoiceStatus: row.invoice_status,
    invoiceItems: Array.isArray(row.invoice_items) ? row.invoice_items : [],
  };
}

// ─── Ticket Group Component ──────────────────────────────────────────────────
function TicketGroup({ title, items, onSelect, defaultOpen = true, accent = '#10b981' }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!items.length) return null;

  return (
    <div className="ticket-group" style={{ marginBottom: '1.5rem' }}>
      <button
        className="quote-group-header"
        onClick={() => setOpen(o => !o)}
        style={{ borderLeft: `3px solid ${accent}` }}
      >
        <span className="flex items-center gap-2">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="font-semibold" style={{ color: accent }}>{title}</span>
          <span className="quote-group-count">{items.length}</span>
        </span>
        <span className="text-muted text-sm">{open ? 'Collapse' : 'Expand'}</span>
      </button>
      {open && (
        <div className="ticket-grid animate-fade-in">
          {items.map((ticket) => {
            const Icon = ticket.icon;
            return (
              <div
                key={ticket.id}
                className="ticket-card glass-panel"
                onClick={() => onSelect(ticket)}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(ticket)}
                role="button"
                tabIndex={0}
              >
                <div className="ticket-card-header">
                  <span className="ticket-id">{ticket.ticket_code || ticket.displayId}</span>
                  <div className="flex gap-2 items-center text-xs">
                    {ticket.magicLinkRequested && <span className="status-badge" style={{background: '#818cf8', color: '#fff', border: 'none', padding: '2px 6px'}} title="Client has an account">👤 Account</span>}
                    <span className={`status-badge ${(ticket.status || 'pending').replace(/ /g, '-').toLowerCase()}`}>{ticket.status || 'Pending'}</span>
                  </div>
                </div>
                <div className="ticket-card-body">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="service-icon-small"><Icon size={20} /></div>
                    <div>
                      <h3 className="ticket-client">{ticket.client}</h3>
                      <p className="ticket-service">{ticket.service}</p>
                    </div>
                  </div>
                  <p className="ticket-device">
                    <Smartphone size={14} /> {ticket.intake.brand || ticket.intake.deviceType || '—'}
                  </p>
                </div>
                <div className="ticket-card-footer">
                  <span className="text-muted text-sm">{ticket.date}</span>
                  <span className={`priority-badge ${(ticket.priority || 'normal').toLowerCase()}`}>{ticket.priority} Priority</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const STATUS_OPTIONS = ['Pending', 'Needs Authorization', 'Authorized', 'In Progress', 'Completed', 'Cancelled'];
const PRIORITY_OPTIONS = ['Low', 'Normal', 'High', 'Urgent'];
const EVENT_TYPES = [
  'Note',
  'Outcome',
  'Recommendations',
  'Credentials',
  'Account',
  'App',
  'Content',
  'Editing',
  'Meeting',
  'Troubleshooting',
  'OS',
  'Photography',
  'Mobile Service',
  'SIM/eSIM',
  'Backup/Restore',
  'Configuration',
  'Update',
  'Research/Planning',
  'Consult',
  'Communication',
  'Cost Savings',
  'Status Change',
  'Part Used',
  'Issue Found',
  'Resolution',
  'Client Authorization',
  'Other',
];

const EVENT_STATUSES = ['Successful', 'Unsuccessful', 'Pending', 'Delayed', 'Completed', 'None'];

// ─── Summary Modal ─────────────────────────────────────────────────────────────────────────────

function buildSummaryFromEvents(ticket, events) {
  const cleanNote = (n) => String(n || '')
    .replace(/\[Summary\]\s*/g, '')
    .replace(/\[(Successful|Unsuccessful|Pending|Delayed|Completed)\]\s*/g, '')
    .trim();

  // Outcome events
  const outcomeEvents = events.filter(e => e.event_type === 'Outcome' || e.event_type === 'Resolution');
  // Recommendation events
  const recommendationEvents = events.filter(e => e.event_type === 'Recommendations');
  // Issue events
  const issueEvents = events.filter(e => e.event_type === 'Issue Found');
  
  // Work log events: Filter those with [Summary] tag, or if none tagged with [Summary], all non-outcome/recommendation/issue
  const summaryWorkEvents = events.filter(e => 
    e.event_type !== 'Outcome' && 
    e.event_type !== 'Resolution' && 
    e.event_type !== 'Recommendations' && 
    e.event_type !== 'Issue Found' &&
    e.note.includes('[Summary]')
  );

  const displayWorkEvents = summaryWorkEvents.length > 0 
    ? summaryWorkEvents 
    : events.filter(e => 
        e.event_type !== 'Outcome' && 
        e.event_type !== 'Resolution' && 
        e.event_type !== 'Recommendations' && 
        e.event_type !== 'Issue Found'
      );

  const workLines = displayWorkEvents.length
    ? displayWorkEvents.map(e => `  • [${e.event_type}] ${cleanNote(e.note)}`).join('\n')
    : '  [No work events logged yet]';

  const outcomeLines = outcomeEvents.length
    ? outcomeEvents.map(e => `  • ${cleanNote(e.note)}`).join('\n')
    : '  [Service completed successfully]';

  const recLines = recommendationEvents.length
    ? recommendationEvents.map(e => `  • ${cleanNote(e.note)}`).join('\n')
    : '  [None at this time]';

  const issueLines = issueEvents.length
    ? `\nIssues Addressed:\n${issueEvents.map(e => `  • ${cleanNote(e.note)}`).join('\n')}` 
    : '';

  return `Service Summary for ${ticket.client}
Service: ${ticket.service}
Device: ${ticket.intake?.brand || ''} ${ticket.intake?.deviceType || ''}

Service Log:
${workLines}

Outcome:
${outcomeLines}${issueLines}

Follow-Up Recommendations:
${recLines}`;
}

function SummaryModal({ ticket, events, onClose, onSave }) {

  const hasExistingSummary = !!ticket.raw?.summary;
  const generated = buildSummaryFromEvents(ticket, events);
  const defaultText = hasExistingSummary ? ticket.raw.summary : generated;
  const [text, setText] = useState(defaultText);
  const [saving, setSaving] = useState(false);

  const regenerate = () => setText(buildSummaryFromEvents(ticket, events));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(text);
      onClose();
    } catch (e) {
      alert(e.message || 'Failed to save summary');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel glass-panel" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="flex items-center gap-2" style={{ color: 'var(--primary)' }}>
            <FileCheck size={20} /> Service Summary
          </h3>
          <div className="flex gap-2">
            <button onClick={regenerate} className="button secondary small-btn" title="Re-generate from event log" style={{fontSize:'0.78rem'}}>
              ↺ Re-generate
            </button>
            <button onClick={onClose} className="icon-button"><X size={20} /></button>
          </div>
        </div>
        <p className="text-muted text-sm mb-3">This summary will be visible to the client in their portal.</p>
        <textarea
          className="form-input"
          rows="12"
          value={text}
          onChange={e => setText(e.target.value)}
          style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
        />
        <div className="flex gap-3 mt-4">
          <button className="button w-full" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Summary'}
          </button>
          <button className="button secondary w-full" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function TechDashboard() {
  const [activeView, setActiveView] = useState('tickets');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [messages, setMessages] = useState([]);
  const [techReply, setTechReply] = useState('');
  const [msgSending, setMsgSending] = useState(false);

  // Event log
  const [events, setEvents] = useState([]);
  const [eventType, setEventType] = useState('Note');
  const [eventStatus, setEventStatus] = useState('Successful');
  const [eventNote, setEventNote] = useState('');
  const [eventIncludeInSummary, setEventIncludeInSummary] = useState(true);

  // Specialized event fields for Credentials & Account
  const [eventUserId, setEventUserId] = useState('');
  const [eventPassword, setEventPassword] = useState('');
  const [eventCredNotes, setEventCredNotes] = useState('');
  const [accountApp, setAccountApp] = useState('');
  const [accountUserId, setAccountUserId] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountStatus, setAccountStatus] = useState('New');
  const [accountNotes, setAccountNotes] = useState('');

  const [addingEvent, setAddingEvent] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(true);
  const [editingEventId, setEditingEventId] = useState(null);
  const [editEventNote, setEditEventNote] = useState('');
  const [editEventType, setEditEventType] = useState('');
  const [editEventStatus, setEditEventStatus] = useState('Successful');
  const [editIncludeInSummary, setEditIncludeInSummary] = useState(true);
  const [eventUpdating, setEventUpdating] = useState(false);

  // Credentials management in Tech Portal
  const [editingCreds, setEditingCreds] = useState(false);
  const [credForm, setCredForm] = useState([]);
  const [showAddCredModal, setShowAddCredModal] = useState(false);
  const [newCredItem, setNewCredItem] = useState({
    type: 'Device Account',
    accountName: '',
    username: '',
    password: '',
    notes: '',
    requires2FA: false,
    targetDevice: 'all'
  });
  const [savingCreds, setSavingCreds] = useState(false);

  // Files
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [editingIntake, setEditingIntake] = useState(false);
  const [intakeForm, setIntakeForm] = useState({});
  const [savingIntake, setSavingIntake] = useState(false);

  // Invoice
  const [invoiceFormItems, setInvoiceFormItems] = useState([]);
  const [invoiceStatus, setInvoiceStatus] = useState('Estimate. Not final.');
  const [savingInvoice, setSavingInvoice] = useState(false);

  // Summary modal
  const [showSummary, setShowSummary] = useState(false);

  const loadTickets = useCallback(async () => {
    if (!isSupabaseConfigured()) { setLoading(false); return; }
    setLoadError('');
    try {
      const rows = await fetchAllTickets();
      const mapped = rows.map(mapRowToTicket);
      setTickets(mapped);
      setSelectedTicket((prev) => {
        if (!prev) return null;
        const next = mapped.find((t) => t.id === prev.id);
        return next || null;
      });
    } catch (e) {
      setLoadError(e.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);
  useEffect(() => {
    if (!isSupabaseConfigured()) return undefined;
    
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    return subscribeTickets((payload) => {
      if (payload.eventType === 'INSERT' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('New Service Ticket', {
          body: `A new ticket was created for ${payload.new?.name || 'a client'}.`,
        });
      }
      loadTickets();
    });
  }, [loadTickets]);

  // Load messages for selected ticket
  useEffect(() => {
    if (!selectedTicket || !isSupabaseConfigured()) { setMessages([]); return undefined; }
    const ticketId = selectedTicket.id;
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchMessages(ticketId);
        if (!cancelled) setMessages(rows.map(mapDbMessage));
      } catch { if (!cancelled) setMessages([]); }
    })();
    const unsub = subscribeMessages(ticketId, (row) => {
      const m = mapDbMessage(row);
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      if (!m.isTech && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('New Message', {
          body: `${m.sender}: ${m.text}`,
        });
      }
    });
    return () => { cancelled = true; unsub(); };
  }, [selectedTicket?.id]);

  // Load events & files for selected ticket
  useEffect(() => {
    if (!selectedTicket || !isSupabaseConfigured()) {
      setEvents([]);
      setFiles([]);
      return;
    }
    
    // Sync Invoice Editor State
    setInvoiceStatus(selectedTicket.invoiceStatus || 'Estimate. Not final.');
    setInvoiceFormItems(selectedTicket.invoiceItems && selectedTicket.invoiceItems.length > 0
        ? JSON.parse(JSON.stringify(selectedTicket.invoiceItems))
        : []
    );

    fetchTicketEvents(selectedTicket.id).then(setEvents).catch(() => setEvents([]));
    fetchTicketFiles(selectedTicket.id).then(setFiles).catch(() => setFiles([]));
  }, [selectedTicket?.id]);

  const filteredTickets = tickets.filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      t.displayId.toLowerCase().includes(q) ||
      t.client.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      (t.intake.brand && t.intake.brand.toLowerCase().includes(q)) ||
      (t.intake.imei && t.intake.imei.includes(q))
    );
  });

  const sendTechReply = async (e) => {
    e.preventDefault();
    if (!techReply.trim() || !selectedTicket) return;
    setMsgSending(true);
    try {
      const row = await insertMessage({ ticketId: selectedTicket.id, sender: 'Tech', text: techReply.trim(), isTech: true });
      const m = mapDbMessage(row);
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      setTechReply('');
    } catch (err) {
      alert(err.message || 'Could not send');
    } finally {
      setMsgSending(false);
    }
  };

  const onStatusChange = async (e) => {
    const status = e.target.value;
    if (!selectedTicket) return;
    try {
      await updateTicketStatus(selectedTicket.id, status);
      setSelectedTicket((t) => (t ? { ...t, status, raw: { ...t.raw, status } } : t));
      setTickets((list) => list.map((x) => (x.id === selectedTicket.id ? { ...x, status } : x)));
    } catch (err) { alert(err.message || 'Update failed'); }
  };

  const onPriorityChange = async (e) => {
    const priority = e.target.value;
    if (!selectedTicket) return;
    try {
      await updateTicketPriority(selectedTicket.id, priority);
      setSelectedTicket((t) => (t ? { ...t, priority, raw: { ...t.raw, priority } } : t));
      setTickets((list) => list.map((x) => (x.id === selectedTicket.id ? { ...x, priority } : x)));
    } catch (err) { alert(err.message || 'Update failed'); }
  };

  const handleDeleteTicket = async () => {
    if (!selectedTicket) return;
    if (!window.confirm('Are you sure you want to permanently delete this ticket? This action cannot be undone.')) return;
    try {
      await deleteTicket(selectedTicket.id);
      setSelectedTicket(null);
      loadTickets();
    } catch (err) {
      alert(err.message || 'Failed to delete ticket');
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;

    let computedNote = '';
    let newCredToSync = null;

    if (eventType === 'Credentials') {
      if (!eventUserId.trim() && !eventPassword.trim()) {
        alert('Please enter a User ID or Password for the credentials entry.');
        return;
      }
      computedNote = `User ID: ${eventUserId.trim()} | Password: ${eventPassword.trim()}${eventCredNotes.trim() ? ` | Notes: ${eventCredNotes.trim()}` : ''}`;
      newCredToSync = {
        type: 'Credentials',
        username: eventUserId.trim(),
        password: eventPassword.trim(),
        notes: eventCredNotes.trim(),
        requires2FA: false,
      };
    } else if (eventType === 'Account') {
      if (!accountApp.trim() && !accountUserId.trim()) {
        alert('Please provide the App/Site or User ID for the account entry.');
        return;
      }
      computedNote = `[${accountStatus}] App/Site: ${accountApp.trim()} | User ID: ${accountUserId.trim()} | Password: ${accountPassword.trim()}${accountNotes.trim() ? ` | Notes: ${accountNotes.trim()}` : ''}`;
      newCredToSync = {
        type: `${accountApp.trim() || 'Account'} (${accountStatus})`,
        username: accountUserId.trim(),
        password: accountPassword.trim(),
        notes: accountNotes.trim(),
        requires2FA: false,
      };
    } else {
      if (!eventNote.trim()) return;
      computedNote = eventNote.trim();
    }

    setAddingEvent(true);
    try {
      const summaryPrefix = eventIncludeInSummary ? '[Summary] ' : '';
      const statusPrefix = eventStatus !== 'None' ? `[${eventStatus}] ` : '';
      const finalNote = `${summaryPrefix}${statusPrefix}${computedNote}`;

      await insertTicketEvent(selectedTicket.id, eventType, finalNote);

      // Auto-sync to ticket credentials if Credential or Account was added
      if (newCredToSync) {
        const currentCreds = Array.isArray(selectedTicket.intake?.credentials) 
          ? [...selectedTicket.intake.credentials] 
          : [];
        const updatedCreds = [...currentCreds, newCredToSync];
        await updateTicketInfo(selectedTicket.id, { credentials: updatedCreds });
        
        // Update local state
        setSelectedTicket(t => t ? {
          ...t,
          intake: { ...t.intake, credentials: updatedCreds }
        } : t);
        setTickets(list => list.map(t => t.id === selectedTicket.id ? {
          ...t,
          intake: { ...t.intake, credentials: updatedCreds }
        } : t));
      }

      // Reset form fields
      setEventNote('');
      setEventUserId('');
      setEventPassword('');
      setEventCredNotes('');
      setAccountApp('');
      setAccountUserId('');
      setAccountPassword('');
      setAccountNotes('');
      setAccountStatus('New');
      setEventStatus('Successful');
      setEventIncludeInSummary(true);

      fetchTicketEvents(selectedTicket.id).then(setEvents);
    } catch (e) {
      alert(e.message || 'Failed to add event');
    } finally {
      setAddingEvent(false);
    }
  };

  const startEditEvent = (ev) => {
    setEditingEventId(ev.id);
    setEditEventType(ev.event_type);
    
    const hasSummary = ev.note.includes('[Summary]');
    setEditIncludeInSummary(hasSummary);

    // Extract status if present
    const statusMatch = ev.note.match(/\[(Successful|Unsuccessful|Pending|Delayed|Completed)\]/);
    setEditEventStatus(statusMatch ? statusMatch[1] : 'None');

    // Clean note
    const clean = ev.note
      .replace(/\[Summary\]\s*/g, '')
      .replace(/\[(Successful|Unsuccessful|Pending|Delayed|Completed)\]\s*/g, '');
    setEditEventNote(clean);
  };

  const handleEditEventSave = async (id) => {
    if (!editEventNote.trim()) return;
    setEventUpdating(true);
    try {
      const summaryPrefix = editIncludeInSummary ? '[Summary] ' : '';
      const statusPrefix = editEventStatus && editEventStatus !== 'None' ? `[${editEventStatus}] ` : '';
      
      let cleanNote = editEventNote.trim()
        .replace(/^\[Summary\]\s*/, '')
        .replace(/^\[(Successful|Unsuccessful|Pending|Delayed|Completed|None)\]\s*/, '');

      const finalNote = `${summaryPrefix}${statusPrefix}${cleanNote}`;

      await updateTicketEvent(id, { note: finalNote, event_type: editEventType });
      setEditingEventId(null);
      fetchTicketEvents(selectedTicket.id).then(setEvents);
    } catch (e) {
      alert(e.message || 'Failed to update event');
    } finally {
      setEventUpdating(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm("Delete this service log entry?")) return;
    try {
      await deleteTicketEvent(id);
      fetchTicketEvents(selectedTicket.id).then(setEvents);
    } catch (e) {
      alert(e.message || 'Failed to delete event');
    }
  };

  // ─── File Upload Handler ───
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTicket) return;
    setUploading(true);
    try {
      await uploadTicketFile(selectedTicket.id, file);
      const updatedFiles = await fetchTicketFiles(selectedTicket.id);
      setFiles(updatedFiles);
      alert(`File "${file.name}" uploaded successfully.`);
    } catch (err) {
      alert(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ─── Credentials Management Handlers ───
  const startEditCreds = () => {
    const current = Array.isArray(selectedTicket?.intake?.credentials) 
      ? JSON.parse(JSON.stringify(selectedTicket.intake.credentials)) 
      : [];
    setCredForm(current);
    setEditingCreds(true);
  };

  const updateCredFormField = (index, field, val) => {
    const next = [...credForm];
    next[index] = { ...next[index], [field]: val };
    setCredForm(next);
  };

  const deleteCredFormRow = (index) => {
    setCredForm(credForm.filter((_, i) => i !== index));
  };

  const addCredFormRow = () => {
    setCredForm([...credForm, { type: 'Device Account', username: '', password: '', notes: '', requires2FA: false }]);
  };

  const handleSaveCreds = async () => {
    if (!selectedTicket) return;
    setSavingCreds(true);
    try {
      await updateTicketInfo(selectedTicket.id, { credentials: credForm });
      setSelectedTicket(t => t ? {
        ...t,
        intake: { ...t.intake, credentials: credForm }
      } : t);
      setTickets(list => list.map(t => t.id === selectedTicket.id ? {
        ...t,
        intake: { ...t.intake, credentials: credForm }
      } : t));
      setEditingCreds(false);
      alert('Credentials updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to save credentials');
    } finally {
      setSavingCreds(false);
    }
  };

  const handleAddNewCred = async (e) => {
    e.preventDefault();
    if (!newCredItem.type || (!newCredItem.username && !newCredItem.password && !newCredItem.accountName)) {
      alert('Please fill in credential details.');
      return;
    }
    const current = Array.isArray(selectedTicket?.intake?.credentials) 
      ? [...selectedTicket.intake.credentials] 
      : [];
    const updated = [...current, { ...newCredItem, id: Date.now() }];
    
    setSavingCreds(true);
    try {
      await updateTicketInfo(selectedTicket.id, { credentials: updated });
      setSelectedTicket(t => t ? {
        ...t,
        intake: { ...t.intake, credentials: updated }
      } : t);
      setTickets(list => list.map(t => t.id === selectedTicket.id ? {
        ...t,
        intake: { ...t.intake, credentials: updated }
      } : t));
      setNewCredItem({
        type: 'Device Account',
        accountName: '',
        username: '',
        password: '',
        notes: '',
        requires2FA: false,
        targetDevice: 'all'
      });
      setShowAddCredModal(false);
      alert('New credential added to ticket!');
    } catch (err) {
      alert(err.message || 'Failed to add credential');
    } finally {
      setSavingCreds(false);
    }
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
      await updateTicketInfo(selectedTicket.id, dbPayload);
      setEditingIntake(false);
      loadTickets(); // Refresh tickets to show updated info
    } catch (err) {
      alert(err.message || 'Could not save intake information');
    } finally {
      setSavingIntake(false);
    }
  };

  const startEditIntake = () => {
    setIntakeForm({
      deviceType: selectedTicket.intake.deviceType || '',
      brand: selectedTicket.intake.brand || '',
      os: selectedTicket.intake.os || '',
      provider: selectedTicket.intake.provider || '',
      imei: selectedTicket.intake.imei || '',
      iccid: selectedTicket.intake.iccid || '',
      notes: selectedTicket.intake.notes || '',
      eligibleForUnlock: selectedTicket.intake.eligibleForUnlock === true ? 'yes' : selectedTicket.intake.eligibleForUnlock === false ? 'no' : 'unsure'
    });
    setEditingIntake(true);
  };

  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    setSavingInvoice(true);
    try {
      await updateTicketInfo(selectedTicket.id, {
        invoice_status: invoiceStatus,
        invoice_items: invoiceFormItems
      });
      loadTickets(); // Refresh
      alert('Invoice updated securely!');
    } catch (err) {
      alert(err.message || 'Could not save invoice');
    } finally {
      setSavingInvoice(false);
    }
  };

  const addInvoiceItem = () => {
    setInvoiceFormItems([...invoiceFormItems, { description: '', qty: 1, price: '' }]);
  };

  const updateInvoiceItem = (index, field, value) => {
    const fresh = [...invoiceFormItems];
    fresh[index][field] = value;
    setInvoiceFormItems(fresh);
  };

  const deleteInvoiceItem = (index) => {
    const fresh = invoiceFormItems.filter((_, i) => i !== index);
    setInvoiceFormItems(fresh);
  };

  const calculateInvoiceSubtotal = () => {
    let subtotal = 0;
    let percentageDiscounts = 0;

    for (const item of invoiceFormItems) {
      if (!item.price) continue;
      
      // Handle percentage discounts
      if (String(item.price).includes('%')) {
        const pct = parseFloat(item.price.replace(/[^0-9.-]/g, ''));
        if (!isNaN(pct)) percentageDiscounts += pct;
        continue;
      }

      if (item.price.includes('/hr')) continue;
      const numPrice = parseFloat(item.price.replace(/[^0-9.-]/g, ''));
      if (!isNaN(numPrice)) {
        subtotal += numPrice * (parseFloat(item.qty) || 1);
      }
    }

    if (percentageDiscounts !== 0) {
      subtotal = subtotal * (1 + (percentageDiscounts / 100));
    }

    return Math.max(0, subtotal);
  };

  const handleSaveSummary = async (text) => {
    if (!selectedTicket) return;
    await updateTicketSummary(selectedTicket.id, text);
    setSelectedTicket(t => t ? { ...t, raw: { ...t.raw, summary: text } } : t);
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="tech-dashboard animate-fade-in">
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '40rem', margin: '2rem auto' }}>
          <h2>Technician dashboard</h2>
          <p className="text-muted" style={{ marginTop: '1rem' }}>
            Connect Supabase to load live intake tickets and messages.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="tech-dashboard animate-fade-in">
      <div className="tech-sidebar">
        <div className="tech-profile">
          <div className="avatar tech-avatar">T</div>
          <div>
            <h3>Tech Portal</h3>
            <p className="text-muted text-sm">Live queue</p>
          </div>
        </div>
        <nav className="tech-nav">
          <button
            type="button"
            className={`tech-nav-btn ${activeView === 'tickets' ? 'active' : ''}`}
            onClick={() => { setActiveView('tickets'); setSelectedTicket(null); }}
          >
            <FileText size={18} /> Service Tickets
          </button>
          <button
            type="button"
            className={`tech-nav-btn ${activeView === 'quotes' ? 'active' : ''}`}
            onClick={() => { setActiveView('quotes'); setSelectedTicket(null); }}
          >
            <ClipboardList size={18} /> Info Requests
          </button>
          <button type="button" className={`tech-nav-btn ${activeView === 'promotions' ? 'active' : ''}`}
            onClick={() => { setActiveView('promotions'); setSelectedTicket(null); }}>
            <Megaphone size={18} /> Promotions
          </button>
          <button type="button" className="tech-nav-btn" disabled>
            <Database size={18} /> Knowledge Base
          </button>
        </nav>
      </div>

      <div className="tech-content">
        {activeView === 'quotes' ? (
          <QuoteRequestsPanel />
        ) : activeView === 'promotions' ? (
          <PromotionsPanel />
        ) : (
          <>
            {loadError && <p style={{ color: '#fca5a5', marginBottom: '1rem' }}>{loadError}</p>}

            {!selectedTicket ? (
              /* ── Ticket List ── */
              <div className="ticket-list-view animate-fade-in">
                <div className="tech-header">
                  <h2>Active service requests</h2>
                  <div className="tech-actions">
                    <div className="search-bar">
                      <Search size={16} className="search-icon" />
                      <input
                        type="text"
                        placeholder="Search tickets, clients, IMEIs…"
                        className="form-input tech-search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <button type="button" className="button secondary tech-filter-btn" disabled>
                      <Filter size={16} /> Filter
                    </button>
                  </div>
                </div>

                {loading && (
                  <div className="ticket-grid">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="ticket-card glass-panel" style={{ height: '180px' }}>
                        <div className="flex justify-between mb-4">
                          <Skeleton style={{ width: '80px', height: '16px' }} />
                          <Skeleton style={{ width: '60px', height: '16px' }} />
                        </div>
                        <div className="flex gap-3 mb-4">
                          <Skeleton style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                          <div className="flex-1">
                            <Skeleton style={{ width: '120px', height: '20px', marginBottom: '8px' }} />
                            <Skeleton style={{ width: '100px', height: '14px' }} />
                          </div>
                        </div>
                        <Skeleton style={{ width: '100%', height: '14px', marginTop: 'auto' }} />
                      </div>
                    ))}
                  </div>
                )}
                {!loading && !filteredTickets.length && (
                  <p className="text-muted">No tickets yet. Submissions from the intake form appear here in real time.</p>
                )}

                {(() => {
                  if (!filteredTickets.length) return null;
                  
                  const needsAction = filteredTickets.filter(t => ['Pending', 'Estimated', 'Needs Authorization'].includes(t.status));
                  const inProgress = filteredTickets.filter(t => ['Authorized', 'In Progress'].includes(t.status));
                  const closed = filteredTickets.filter(t => ['Completed', 'Cancelled'].includes(t.status));

                  return (
                    <div className="ticket-groups">
                      <TicketGroup title="Needs Action" items={needsAction} onSelect={setSelectedTicket} accent="#f87171" />
                      <TicketGroup title="In Progress" items={inProgress} onSelect={setSelectedTicket} accent="#fbbf24" />
                      <TicketGroup title="Closed" items={closed} onSelect={setSelectedTicket} defaultOpen={false} accent="#9ca3af" />
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* ── Ticket Detail ── */
              <div className="ticket-detail-view animate-fade-in">
                <div className="ticket-detail-header">
                  <div className="flex items-center gap-4 flex-wrap">
                    <button type="button" onClick={() => setSelectedTicket(null)} className="button secondary small-btn">
                      ← Back
                    </button>
                    <h2>Ticket {selectedTicket.displayId}: {selectedTicket.service}</h2>
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    {/* Invoice + Summary buttons */}
                    <button
                      type="button"
                      className="button secondary small-btn flex items-center gap-2"
                      onClick={() => generateInvoicePrint(selectedTicket, selectedTicket.raw?.estimate_amount)}
                      title="Generate Invoice"
                    >
                      <ReceiptText size={16} /> Invoice
                    </button>
                    <button
                      type="button"
                      className="button secondary small-btn flex items-center gap-2"
                      onClick={() => setShowSummary(true)}
                      title="Generate/Edit Service Summary"
                    >
                      <FileCheck size={16} /> Summary
                    </button>
                    <label className="text-muted text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      Status
                      <select 
                        className={`select-badge status-${(selectedTicket.status || 'pending').toLowerCase().replace(/ /g, '-')}`} 
                        value={selectedTicket.status} 
                        onChange={onStatusChange}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </label>
                    <label className="text-muted text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      Priority
                      <select 
                        className={`select-badge priority-${(selectedTicket.priority || 'normal').toLowerCase()}`} 
                        value={selectedTicket.priority} 
                        onChange={onPriorityChange}
                      >
                        {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </label>
                    <button 
                      onClick={handleDeleteTicket} 
                      className="button secondary small-btn" 
                      style={{ borderColor: '#ef4444', color: '#ef4444' }} 
                      title="Delete Ticket"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="ticket-detail-grid mt-6">
                  {/* Column 1: Client Info */}
                  <div className="detail-panel glass-panel">
                    <h3 className="text-emerald-400"><User size={18} className="panel-icon" /> Client Contact</h3>
                    <div className="info-list mt-4">
                      <div className="info-item">
                        <label>Name</label>
                        <p className="text-lg">{selectedTicket.client}</p>
                      </div>
                      <div className="info-item">
                        <label>Phone</label>
                        <p>{selectedTicket.phone}</p>
                      </div>
                      <div className="info-item">
                        <label>Email</label>
                        <p className="text-sm truncate" title={selectedTicket.email}>{selectedTicket.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Device Details */}
                  <div className="detail-panel glass-panel">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-emerald-400"><Smartphone size={18} className="panel-icon" /> Device Data</h3>
                      {!editingIntake && (
                        <button onClick={startEditIntake} className="button secondary small-btn"><Pencil size={12}/> Edit</button>
                      )}
                    </div>
                    {!editingIntake ? (
                      <div className="info-list">
                        <div className="info-item">
                          <label>Type / Brand</label>
                          <p>{selectedTicket.intake.deviceType || '—'} {selectedTicket.intake.brand && `(${selectedTicket.intake.brand})`}</p>
                        </div>
                        <div className="info-item">
                          <label>Operating System</label>
                          <p>{selectedTicket.intake.os || '—'}</p>
                        </div>
                        <div className="info-item">
                          <label>Carrier / Provider</label>
                          <p>{selectedTicket.intake.provider || 'N/A'}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted text-sm">Editing in progress...</p>
                    )}
                  </div>

                  {/* Column 3: Service Meta */}
                  <div className="detail-panel glass-panel">
                    <h3 className="text-emerald-400"><Tag size={18} className="panel-icon" /> Service Meta</h3>
                    <div className="info-list mt-4">
                      <div className="info-item">
                        <label>Service Category</label>
                        <p style={{ color: 'var(--primary)', fontWeight: 600 }}>{selectedTicket.service}</p>
                      </div>
                      <div className="info-item">
                        <label>Submission Date</label>
                        <p>{selectedTicket.date}</p>
                      </div>
                      <div className="info-item">
                        <label>Invoice Status</label>
                        <p className="text-sm font-semibold text-emerald-400">{selectedTicket.invoiceStatus || 'Draft / Estimate'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Intake Details (Full Width if editing, else span 2) & ID/Sim */}
                  <div className={`detail-panel glass-panel ${editingIntake ? 'span-3' : 'span-2'}`}>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="flex items-center gap-2 m-0 text-muted uppercase tracking-widest text-xs font-bold">Comprehensive Intake & Notes</h4>
                    </div>
                    {!editingIntake ? (
                      <div className="grid grid-cols-2 gap-6">
                        <div className="info-list">
                          <div className="info-item">
                            <label>IMEI / Serial</label>
                            <p className="monospace text-sm">{selectedTicket.intake.imei || 'N/A'}</p>
                          </div>
                          <div className="info-item">
                            <label>ICCID / SIM</label>
                            <p className="monospace text-sm">{selectedTicket.intake.iccid || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="info-item">
                          <label>Client Request Notes</label>
                          <div className="notes-box text-sm" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                            {selectedTicket.intake.notes || 'No specific notes provided.'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleSaveIntake} className="animate-fade-in">
                        <div className="intake-grid">
                          <div className="form-group">
                            <label className="form-label">Device Type</label>
                            <select className="form-input text-sm" value={intakeForm.deviceType} onChange={e=>setIntakeForm({...intakeForm, deviceType: e.target.value})}>
                              <option value="">Select...</option>
                              <option value="Smartphone">Smartphone</option>
                              <option value="Tablet">Tablet</option>
                              <option value="Laptop">Laptop</option>
                              <option value="Desktop">Desktop</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="form-group"><label className="form-label">Brand & Model</label><input type="text" className="form-input text-sm" value={intakeForm.brand} onChange={e=>setIntakeForm({...intakeForm, brand: e.target.value})} /></div>
                          <div className="form-group"><label className="form-label">Operating System</label><input type="text" className="form-input text-sm" value={intakeForm.os} onChange={e=>setIntakeForm({...intakeForm, os: e.target.value})} /></div>
                          <div className="form-group"><label className="form-label">Service Provider</label><input type="text" className="form-input text-sm" value={intakeForm.provider} onChange={e=>setIntakeForm({...intakeForm, provider: e.target.value})} /></div>
                          <div className="form-group"><label className="form-label">IMEI</label><input type="text" className="form-input text-sm" value={intakeForm.imei} onChange={e=>setIntakeForm({...intakeForm, imei: e.target.value})} /></div>
                          <div className="form-group"><label className="form-label">ICCID</label><input type="text" className="form-input text-sm" value={intakeForm.iccid} onChange={e=>setIntakeForm({...intakeForm, iccid: e.target.value})} /></div>
                        </div>
                        <div className="form-group mt-3">
                          <label className="form-label">Client Notes</label>
                          <textarea className="form-input text-sm" rows="3" value={intakeForm.notes} onChange={e=>setIntakeForm({...intakeForm, notes: e.target.value})}></textarea>
                        </div>
                        <div className="flex gap-2 mt-4 justify-end">
                          <button type="submit" className="button" disabled={savingIntake}>{savingIntake ? 'Saving...' : 'Save Changes'}</button>
                          <button type="button" className="button secondary" onClick={() => setEditingIntake(false)}>Cancel</button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Credentials (Tabular, Editable & Addable) */}
                  <div className="detail-panel glass-panel">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-amber-400 m-0"><Shield size={18} className="panel-icon" /> Credentials</h3>
                      <div className="flex gap-2">
                        {!editingCreds ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setShowAddCredModal(v => !v)}
                              className="button secondary small-btn"
                              title="Add credential to ticket"
                            >
                              <Plus size={12} /> Add
                            </button>
                            <button
                              type="button"
                              onClick={startEditCreds}
                              className="button secondary small-btn"
                              title="Edit credentials"
                            >
                              <Pencil size={12} /> Edit
                            </button>
                          </>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={handleSaveCreds}
                              disabled={savingCreds}
                              className="button small-btn"
                            >
                              {savingCreds ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCreds(false)}
                              className="button secondary small-btn"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Add Credential Card */}
                    {showAddCredModal && (
                      <form onSubmit={handleAddNewCred} className="mb-4 p-3 glass-panel animate-fade-in" style={{ background: 'rgba(255,107,0,0.06)', border: '1px solid rgba(255,107,0,0.25)', borderRadius: '6px' }}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-primary">Add New Credential</span>
                          <button type="button" onClick={() => setShowAddCredModal(false)} className="text-muted hover:text-white"><X size={14}/></button>
                        </div>
                        <div className="form-grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <label className="form-label text-xs">Type / Account</label>
                            <input
                              type="text"
                              className="form-input text-xs"
                              placeholder="e.g. Google, Screen PIN, iCloud"
                              value={newCredItem.type}
                              onChange={e => setNewCredItem({ ...newCredItem, type: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <label className="form-label text-xs">Username / Email / App</label>
                            <input
                              type="text"
                              className="form-input text-xs"
                              placeholder="e.g. user@gmail.com"
                              value={newCredItem.username}
                              onChange={e => setNewCredItem({ ...newCredItem, username: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="form-label text-xs">Password / PIN</label>
                            <input
                              type="text"
                              className="form-input text-xs monospace"
                              placeholder="Password or PIN"
                              value={newCredItem.password}
                              onChange={e => setNewCredItem({ ...newCredItem, password: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="form-label text-xs">Notes (optional)</label>
                            <input
                              type="text"
                              className="form-input text-xs"
                              placeholder="e.g. Recovery email, hints"
                              value={newCredItem.notes}
                              onChange={e => setNewCredItem({ ...newCredItem, notes: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <label className="checkbox-label text-xs flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newCredItem.requires2FA}
                              onChange={e => setNewCredItem({ ...newCredItem, requires2FA: e.target.checked })}
                            />
                            <span>Requires 2FA</span>
                          </label>
                          <button type="submit" disabled={savingCreds} className="button small-btn">
                            Add Credential
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="mt-2 overflow-x-auto">
                      {!editingCreds ? (
                        <table className="creds-table w-full text-xs">
                          <thead>
                            <tr>
                              <th>Account / Type</th>
                              <th>Credentials &amp; Notes</th>
                              <th style={{ width: '40px' }}>2FA</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(!selectedTicket.intake?.credentials || selectedTicket.intake.credentials.length === 0) ? (
                              <tr><td colSpan={3} className="text-muted py-3 text-center">No credentials saved for this ticket.</td></tr>
                            ) : (
                              selectedTicket.intake.credentials.map((cred, idx) => (
                                <tr key={idx}>
                                  <td>
                                    <span className="font-bold text-gray-200">{cred.type || cred.accountName || 'Credential'}</span>
                                    {cred.targetDevice && cred.targetDevice !== 'all' && (
                                      <div className="text-muted text-xs" style={{ fontSize: '0.7rem' }}>{cred.targetDevice}</div>
                                    )}
                                  </td>
                                  <td className="monospace sensitive">
                                    {cred.username && <div><span className="text-muted">User:</span> {cred.username}</div>}
                                    {cred.password && <div><span className="text-muted">Pass:</span> {cred.password}</div>}
                                    {cred.notes && <div className="text-muted text-xs" style={{ fontSize: '0.7rem', fontFamily: 'sans-serif' }}>Note: {cred.notes}</div>}
                                  </td>
                                  <td>
                                    {cred.requires2FA ? (
                                      <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px' }}>2FA</span>
                                    ) : (
                                      <span className="text-muted text-xs">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      ) : (
                        <div>
                          <table className="creds-table w-full text-xs mb-2">
                            <thead>
                              <tr>
                                <th>Type</th>
                                <th>Username / ID</th>
                                <th>Password / PIN</th>
                                <th>Notes</th>
                                <th style={{ width: '30px' }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {credForm.map((c, i) => (
                                <tr key={i}>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-input text-xs w-full"
                                      value={c.type || ''}
                                      onChange={e => updateCredFormField(i, 'type', e.target.value)}
                                      placeholder="Type"
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-input text-xs w-full"
                                      value={c.username || ''}
                                      onChange={e => updateCredFormField(i, 'username', e.target.value)}
                                      placeholder="Username"
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-input text-xs w-full monospace"
                                      value={c.password || ''}
                                      onChange={e => updateCredFormField(i, 'password', e.target.value)}
                                      placeholder="Password"
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-input text-xs w-full"
                                      value={c.notes || ''}
                                      onChange={e => updateCredFormField(i, 'notes', e.target.value)}
                                      placeholder="Notes"
                                    />
                                  </td>
                                  <td className="text-center">
                                    <button type="button" onClick={() => deleteCredFormRow(i)} className="text-red-400 hover:text-red-300">
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <button type="button" onClick={addCredFormRow} className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold">
                            + Add Credential Row
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Service Progress Log */}
                  <div className="detail-panel glass-panel span-2">
                    <div
                      className="flex justify-between items-center mb-4"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setEventsOpen(o => !o)}
                    >
                      <h3 className="text-emerald-400"><Clock size={18} className="panel-icon" /> Service Progress Log</h3>
                      {eventsOpen ? <ChevronUp size={20} className="text-muted" /> : <ChevronDown size={20} className="text-muted" />}
                    </div>
                    {eventsOpen && (
                      <div className="mt-4 overflow-x-auto">
                         <table className="quotes-table w-full text-xs">
                           <thead>
                             <tr>
                               <th style={{width: '130px'}}>Type</th>
                               <th>Note / Entry</th>
                               <th style={{width: '140px'}}>Timestamp</th>
                               <th style={{width: '80px'}}>Actions</th>
                             </tr>
                           </thead>
                           <tbody>
                             {events.length === 0 ? (
                               <tr><td colSpan={4} className="text-muted text-center py-4">No progress entries yet.</td></tr>
                             ) : (
                               events.map(ev => {
                                 const isEditing = editingEventId === ev.id;
                                 const isSummary = ev.note && ev.note.includes('[Summary]');
                                 const cleanDisplayNote = ev.note ? ev.note.replace(/\[Summary\]\s*/g, '') : '';

                                 if (isEditing) {
                                   return (
                                     <tr key={ev.id} style={{ background: 'rgba(255,255,255,0.04)' }}>
                                       <td colSpan={4} className="p-3">
                                         <form onSubmit={(e) => { e.preventDefault(); handleEditEventSave(ev.id); }} className="flex flex-col gap-2">
                                           <div className="flex flex-wrap items-center gap-2">
                                             <select
                                               className="form-input text-xs"
                                               style={{ width: '140px' }}
                                               value={editEventType}
                                               onChange={e => setEditEventType(e.target.value)}
                                             >
                                               {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                             </select>
                                             <select
                                               className="form-input text-xs"
                                               style={{ width: '110px' }}
                                               value={editEventStatus}
                                               onChange={e => setEditEventStatus(e.target.value)}
                                             >
                                               {EVENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                             </select>
                                             <label className="checkbox-label text-xs flex items-center gap-1 cursor-pointer">
                                               <input
                                                 type="checkbox"
                                                 checked={editIncludeInSummary}
                                                 onChange={e => setEditIncludeInSummary(e.target.checked)}
                                               />
                                               <span className="text-gray-300 font-medium">Include in Summary</span>
                                             </label>
                                           </div>
                                           <div className="flex gap-2">
                                             <input
                                               type="text"
                                               className="form-input text-xs flex-1"
                                               value={editEventNote}
                                               onChange={e => setEditEventNote(e.target.value)}
                                               placeholder="Edit progress note..."
                                               required
                                             />
                                             <button type="submit" className="button small-btn" disabled={eventUpdating} title="Save changes">
                                               Save
                                             </button>
                                             <button type="button" onClick={() => setEditingEventId(null)} className="button secondary small-btn" title="Cancel">
                                               Cancel
                                             </button>
                                           </div>
                                         </form>
                                       </td>
                                     </tr>
                                   );
                                 }

                                 const typeSlug = (ev.event_type || 'note').toLowerCase().replace(/[\/\s]+/g, '-');

                                 return (
                                   <tr key={ev.id}>
                                     <td>
                                       <span className={`event-type-badge event-type-${typeSlug}`}>
                                         {ev.event_type}
                                       </span>
                                     </td>
                                     <td>
                                       <div className="flex items-center gap-2 flex-wrap">
                                         <span>{cleanDisplayNote}</span>
                                         {isSummary && (
                                           <span className="summary-indicator-badge" title="Flagged for inclusion in Service Summary">
                                             📄 Summary
                                           </span>
                                         )}
                                       </div>
                                     </td>
                                     <td className="text-muted">{new Date(ev.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                                     <td>
                                       <div className="flex gap-1">
                                         <button onClick={() => startEditEvent(ev)} className="icon-button" title="Edit this entry"><Pencil size={14}/></button>
                                         <button onClick={() => handleDeleteEvent(ev.id)} className="icon-button text-error" title="Delete entry"><Trash2 size={14}/></button>
                                       </div>
                                     </td>
                                   </tr>
                                 );
                               })
                             )}
                           </tbody>
                         </table>

                         {/* Add Event Form with Specialized Credential/Account inputs */}
                         <form onSubmit={handleAddEvent} className="mt-4 p-3 glass-panel" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                           <div className="flex flex-wrap items-center gap-2 mb-2">
                             <span className="text-xs font-bold text-gray-300">Add Log Entry:</span>
                             <select className="form-input text-xs" style={{width:'150px'}} value={eventType} onChange={e=>setEventType(e.target.value)}>
                               {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                             </select>
                             <select className="form-input text-xs" style={{width:'110px'}} value={eventStatus} onChange={e=>setEventStatus(e.target.value)}>
                               {EVENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                             </select>
                             <label className="checkbox-label text-xs flex items-center gap-1 cursor-pointer">
                               <input
                                 type="checkbox"
                                 checked={eventIncludeInSummary}
                                 onChange={e => setEventIncludeInSummary(e.target.checked)}
                               />
                               <span className="text-gray-300 font-medium">Include in Summary</span>
                             </label>
                           </div>

                           {/* Specialized Form for Credentials */}
                           {eventType === 'Credentials' && (
                             <div className="form-grid grid-cols-3 gap-2 mt-2 pt-2" style={{ borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                               <div className="form-group mb-0">
                                 <label className="form-label text-xs">User ID / Login</label>
                                 <input
                                   type="text"
                                   className="form-input text-xs"
                                   placeholder="Username or email"
                                   value={eventUserId}
                                   onChange={e => setEventUserId(e.target.value)}
                                   required
                                 />
                               </div>
                               <div className="form-group mb-0">
                                 <label className="form-label text-xs">Password / PIN</label>
                                 <input
                                   type="text"
                                   className="form-input text-xs monospace"
                                   placeholder="Password or PIN"
                                   value={eventPassword}
                                   onChange={e => setEventPassword(e.target.value)}
                                   required
                                 />
                               </div>
                               <div className="form-group mb-0">
                                 <label className="form-label text-xs">Notes / Details</label>
                                 <input
                                   type="text"
                                   className="form-input text-xs"
                                   placeholder="Account context / notes"
                                   value={eventCredNotes}
                                   onChange={e => setEventCredNotes(e.target.value)}
                                 />
                               </div>
                             </div>
                           )}

                           {/* Specialized Form for Account */}
                           {eventType === 'Account' && (
                             <div className="form-grid grid-cols-3 gap-2 mt-2 pt-2" style={{ borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                               <div className="form-group mb-0">
                                 <label className="form-label text-xs">App / Site</label>
                                 <input
                                   type="text"
                                   className="form-input text-xs"
                                   placeholder="e.g. Gmail, Verizon, Apple"
                                   value={accountApp}
                                   onChange={e => setAccountApp(e.target.value)}
                                   required
                                 />
                               </div>
                               <div className="form-group mb-0">
                                 <label className="form-label text-xs">Account Status</label>
                                 <select
                                   className="form-input text-xs"
                                   value={accountStatus}
                                   onChange={e => setAccountStatus(e.target.value)}
                                 >
                                   <option value="New">New</option>
                                   <option value="Updated">Updated</option>
                                   <option value="Recovered">Recovered</option>
                                 </select>
                               </div>
                               <div className="form-group mb-0">
                                 <label className="form-label text-xs">User ID / Username</label>
                                 <input
                                   type="text"
                                   className="form-input text-xs"
                                   placeholder="User ID or Email"
                                   value={accountUserId}
                                   onChange={e => setAccountUserId(e.target.value)}
                                   required
                                 />
                               </div>
                               <div className="form-group mb-0">
                                 <label className="form-label text-xs">Password / PIN</label>
                                 <input
                                   type="text"
                                   className="form-input text-xs monospace"
                                   placeholder="Password or PIN"
                                   value={accountPassword}
                                   onChange={e => setAccountPassword(e.target.value)}
                                 />
                               </div>
                               <div className="form-group mb-0 span-2">
                                 <label className="form-label text-xs">Account Notes</label>
                                 <input
                                   type="text"
                                   className="form-input text-xs"
                                   placeholder="Additional recovery details / notes"
                                   value={accountNotes}
                                   onChange={e => setAccountNotes(e.target.value)}
                                 />
                               </div>
                             </div>
                           )}

                           {/* Standard Text Note Input */}
                           {eventType !== 'Credentials' && eventType !== 'Account' && (
                             <div className="flex gap-2 mt-2">
                               <input
                                 type="text"
                                 className="form-input text-xs flex-1"
                                 placeholder={eventType === 'Outcome' ? "Describe service outcome..." : eventType === 'Recommendations' ? "Add follow-up recommendation..." : "Add progress note..."}
                                 value={eventNote}
                                 onChange={e=>setEventNote(e.target.value)}
                               />
                               <button type="submit" className="button small-btn" disabled={addingEvent} title="Add Entry">
                                 <Plus size={14}/> Add Entry
                               </button>
                             </div>
                           )}

                           {(eventType === 'Credentials' || eventType === 'Account') && (
                             <div className="flex justify-end mt-3">
                               <button type="submit" className="button small-btn" disabled={addingEvent}>
                                 <Plus size={14}/> Add to Log &amp; Auto-Sync to Credentials
                               </button>
                             </div>
                           )}
                         </form>
                      </div>
                    )}
                  </div>

                  {/* Files Panel with Upload Button */}
                  <div className="detail-panel glass-panel">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-emerald-400 m-0"><Paperclip size={18} className="panel-icon" /> Files</h3>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="button secondary small-btn"
                        title="Upload file attachment"
                      >
                        <Plus size={12} /> {uploading ? 'Uploading...' : 'Attach File'}
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                      />
                    </div>
                    <div className="mt-2">
                      <p className="text-muted text-xs mb-2">Ticket Attachments</p>
                      <ul className="file-list">
                         {files.length === 0 ? <li className="text-muted text-xs py-2">No files attached yet.</li> : files.map(f => (
                           <li key={f.id} className="file-item p-2 flex justify-between items-center">
                             <span className="file-name text-xs truncate max-w-[200px]" title={f.name}>{f.name}</span>
                             <a href={f.url} target="_blank" rel="noreferrer" className="icon-button" title="Download"><Download size={14}/></a>
                           </li>
                         ))}
                      </ul>
                    </div>
                  </div>

                  {/* Invoice Configuration (Grouped Bottom) */}
                  <div className="detail-panel glass-panel span-3 mt-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-emerald-400"><ReceiptText size={18} className="panel-icon" /> Financial / Invoice Configuration</h3>
                      <button onClick={handleSaveInvoice} disabled={savingInvoice} className="button small-btn">
                        {savingInvoice ? 'Saving...' : 'Save Configuration'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div className="form-group">
                        <label className="form-label font-bold text-gray-300">Billing Status</label>
                        <select className="form-input text-sm font-semibold" value={invoiceStatus} onChange={e=>setInvoiceStatus(e.target.value)}>
                          <option value="Estimate. Not final.">Estimate. Not final.</option>
                          <option value="Awaiting Consult for Estimate.">Awaiting Consult for Estimate.</option>
                          <option value="Final. Amount Due">Final. Amount Due</option>
                          <option value="Paid In Full">Paid In Full</option>
                        </select>
                      </div>
                      <div className="flex items-end pb-1">
                        <p className="text-muted text-xs">This status appears on the client's invoice and magic link portal.</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="creds-table w-full">
                        <thead>
                          <tr>
                            <th>Service Description</th>
                            <th style={{width: '15%'}}>Qty</th>
                            <th style={{width: '15%'}}>Price</th>
                            <th style={{width: '50px'}}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceFormItems.length === 0 ? (
                            <tr><td colSpan={4} className="text-muted text-center py-4">No line items configured.</td></tr>
                          ) : (
                            invoiceFormItems.map((item, idx) => (
                              <tr key={idx}>
                                <td>
                                  <div className="flex flex-col gap-1">
                                    <select 
                                      className="form-input text-xs mb-1" 
                                      onChange={(e) => {
                                        if (!e.target.value) return;
                                        const [desc, price] = e.target.value.split('|');
                                        updateInvoiceItem(idx, 'description', desc);
                                        updateInvoiceItem(idx, 'price', price);
                                      }}
                                    >
                                      <option value="">Quick Select Service / Discount...</option>
                                      <optgroup label="Discounts & Surcharges">
                                        <option value="Negotiated Discount|-$25.00">Negotiated Discount (-$25.00)</option>
                                        <option value="Negotiated Discount|-$50.00">Negotiated Discount (-$50.00)</option>
                                        <option value="Negotiated Discount|-$10.00">Negotiated Discount (-$10.00)</option>
                                        <option value="Discount (%)|-10%">Discount (-10%)</option>
                                        <option value="Urgent Priority Surcharge ($50)|$50">Urgent Priority Surcharge ($50)</option>
                                        <option value="Urgent Priority Surcharge ($15/hr)|$15/hr">Urgent Priority Surcharge ($15/hr)</option>
                                      </optgroup>
                                      {serviceCategories.map(cat => (
                                        <optgroup key={cat.name} label={cat.name}>
                                          {cat.items.map(s => (
                                            <option key={s.id} value={`${s.title}|${s.price}`}>{s.title} ({s.price})</option>
                                          ))}
                                        </optgroup>
                                      ))}
                                    </select>
                                    <input className="form-input text-sm w-full" value={item.description} onChange={e=>updateInvoiceItem(idx, 'description', e.target.value)} />
                                  </div>
                                </td>
                                <td><input type="number" step="0.5" className="form-input text-sm w-full" value={item.qty} onChange={e=>updateInvoiceItem(idx, 'qty', e.target.value)} /></td>
                                <td><input className="form-input text-sm w-full" value={item.price} onChange={e=>updateInvoiceItem(idx, 'price', e.target.value)} /></td>
                                <td className="text-center"><button onClick={()=>deleteInvoiceItem(idx)} className="text-red-400 hover:text-red-300"><Trash2 size={16}/></button></td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={4}>
                              <div className="flex items-center gap-3">
                                <button type="button" onClick={addInvoiceItem} className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold mt-2">+ Add Line Item</button>
                                <button
                                  type="button"
                                  onClick={() => setInvoiceFormItems([...invoiceFormItems, { description: 'Negotiated Discount', qty: 1, price: '-$25.00' }])}
                                  className="text-amber-400 hover:text-amber-300 text-sm font-semibold mt-2"
                                >
                                  + Add Negotiated Discount
                                </button>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={2} className="text-right font-bold py-3 pr-4 text-muted">Estimated Total:</td>
                            <td className="font-bold py-3 text-emerald-400 text-lg">${calculateInvoiceSubtotal().toFixed(2)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="detail-panel glass-panel mt-6">
                  <h3><MessageSquare size={18} className="panel-icon" /> Client Communications (Real-time)</h3>
                  <div className="tech-msg-list mt-4" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {messages.length === 0 ? (
                      <p className="text-muted text-sm text-center py-8">No messages exchanged yet.</p>
                    ) : (
                      messages.map((m) => (
                        <div key={m.id} className={`message-bubble ${m.isTech ? 'tech' : 'client'}`}>
                          <div className="message-sender">
                            {m.isTech ? 'You (Technician)' : selectedTicket.client}
                            <span className="message-time">{m.time}</span>
                          </div>
                          <div className="message-text">{m.text}</div>
                        </div>
                      ))
                    )}
                  </div>
                  <form onSubmit={sendTechReply} className="message-input-area mt-6">
                    <input
                      type="text"
                      className="form-input chat-input"
                      placeholder="Type a message to the client..."
                      value={techReply}
                      onChange={(e) => setTechReply(e.target.value)}
                    />
                    <button type="submit" className="button square-btn" disabled={msgSending || !techReply.trim()}>
                      <ArrowRight size={20} />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Summary Modal */}
      {showSummary && selectedTicket && (
        <SummaryModal
          ticket={selectedTicket}
          events={events}
          onClose={() => setShowSummary(false)}
          onSave={handleSaveSummary}
        />
      )}
    </div>
  );
}
