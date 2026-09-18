import { useState, useEffect, useCallback } from 'react';
import { Search, ClipboardList, MessageSquare, DollarSign, Ticket, FileInput, X, ArrowRight, User, Phone, Mail, Clock, Shield, Zap, ChevronDown, ChevronRight, Unlock, Hash, Pause, Ban, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchAllQuotes, subscribeQuotes, updateQuote, insertTicket, convertQuoteToTicket, deleteQuote } from '../api/data';
import { isSupabaseConfigured } from '../lib/supabase';
import { formatJobType } from '../lib/formatJobType';
import { generateTicketCode } from '../lib/ticketCode';
import { formatPhone } from '../lib/formatPhone';
import './TechDashboard.css';

// Statuses that need action vs. resolved
const ACTION_STATUSES = ['Pending', 'Estimated', 'Authorized'];

// Request type display names
const REQUEST_TYPE_LABELS = {
  price_quote: 'Custom Quotes',
  general_info: 'General Repair Questions',
  status_update: 'Status Check Requests',
};
const REQUEST_TYPE_ACCENTS = {
  price_quote: '#ff6b00',
  general_info: '#888888',
  status_update: '#f59e0b',
};

function StatusGroup({ title, quotes, onSelect, defaultOpen = false, accent }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!quotes.length) return null;
  return (
    <div className="quote-group" style={{ marginBottom: '1rem' }}>
      <button
        className="quote-group-header"
        onClick={() => setOpen(o => !o)}
        style={{ borderLeft: `3px solid ${accent}` }}
      >
        <span className="flex items-center gap-2">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="font-semibold" style={{ color: accent }}>{title}</span>
          <span className="quote-group-count">{quotes.length}</span>
        </span>
        <span className="text-muted text-sm">{open ? 'Collapse' : 'Expand'}</span>
      </button>
      {open && (
        <div className="quotes-table-wrap glass-panel">
          <table className="quotes-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Date</th>
                <th>Status</th>
                <th>Client</th>
                <th>Service</th>
                <th>Priority</th>
                <th>Estimate</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr
                  key={q.id}
                  onClick={() => onSelect(q)}
                  className="clickable-row"
                >
                  <td>
                    {q.ticket_code ? (
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#10b981', fontSize: '0.85rem' }}>
                        {q.ticket_code}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="text-muted text-sm whitespace-nowrap">
                    {new Date(q.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <span className={`status-badge ${(q.status || 'pending').toLowerCase().replace(/ /g, '-')}`}>
                      {q.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span>{q.name}</span>
                      <span className="text-xs text-muted">{q.email}</span>
                    </div>
                  </td>
                  <td>{q.service ? formatJobType(q.service) : <span className="text-muted">—</span>}</td>
                  <td>
                    <span className={`priority-badge ${(q.priority || 'normal').toLowerCase()}`}>
                      {q.priority || 'Normal'}
                    </span>
                  </td>
                  <td>{q.estimate_amount ? `$${q.estimate_amount}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RequestTypeGroup({ requestType, quotes, onSelect }) {
  const [open, setOpen] = useState(true);
  const label = REQUEST_TYPE_LABELS[requestType] || requestType;
  const accent = REQUEST_TYPE_ACCENTS[requestType] || '#94a3b8';

  if (!quotes.length) return null;

  const actionQuotes = quotes.filter(q => ACTION_STATUSES.includes(q.status));
  const repliedQuotes = quotes.filter(q => q.status === 'Replied');
  const convertedQuotes = quotes.filter(q => q.status === 'Converted');
  const onHoldQuotes = quotes.filter(q => q.status === 'On Hold');
  const cancelledQuotes = quotes.filter(q => q.status === 'Cancelled');
  const otherQuotes = quotes.filter(q =>
    !ACTION_STATUSES.includes(q.status) && !['Replied', 'Converted', 'On Hold', 'Cancelled'].includes(q.status)
  );

  return (
    <div style={{ marginBottom: '2rem' }}>
      <button
        className="quote-group-header"
        onClick={() => setOpen(o => !o)}
        style={{
          borderLeft: `4px solid ${accent}`,
          background: 'rgba(255,255,255,0.03)',
          marginBottom: open ? '0.75rem' : 0,
          padding: '0.85rem 1.25rem',
        }}
      >
        <span className="flex items-center gap-3">
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <span className="font-semibold" style={{ color: accent, fontSize: '1.05rem' }}>{label}</span>
          <span className="quote-group-count" style={{ fontSize: '0.8rem' }}>{quotes.length}</span>
        </span>
        <span className="text-muted text-sm">{open ? 'Collapse' : 'Expand'}</span>
      </button>

      {open && (
        <div style={{ paddingLeft: '0.5rem' }}>
          <StatusGroup title="Needs Action" quotes={actionQuotes} onSelect={onSelect} defaultOpen={true} accent="#ff6b00" />
          <StatusGroup title="Replied" quotes={repliedQuotes} onSelect={onSelect} defaultOpen={false} accent="#888888" />
          <StatusGroup title="Converted" quotes={convertedQuotes} onSelect={onSelect} defaultOpen={false} accent="#10b981" />
          <StatusGroup title="On Hold" quotes={onHoldQuotes} onSelect={onSelect} defaultOpen={false} accent="#fbbf24" />
          <StatusGroup title="Cancelled" quotes={cancelledQuotes} onSelect={onSelect} defaultOpen={false} accent="#f87171" />
          {otherQuotes.length > 0 && (
            <StatusGroup title="Other" quotes={otherQuotes} onSelect={onSelect} defaultOpen={false} accent="#cbd5e1" />
          )}
        </div>
      )}
    </div>
  );
}

export default function QuoteRequestsPanel() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedQuote, setSelectedQuote] = useState(null);

  // Action states
  const [techResponse, setTechResponse] = useState('');
  const [estimateAmount, setEstimateAmount] = useState('');
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    setError('');
    try {
      const rows = await fetchAllQuotes();
      setQuotes(rows);
      setSelectedQuote(prev => {
        if (!prev) return null;
        return rows.find(r => r.id === prev.id) || null;
      });
    } catch (e) {
      setError(e.message || 'Failed to load quotes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return undefined;
    return subscribeQuotes(() => load());
  }, [load]);

  const handleUpdate = async (updates) => {
    if (!selectedQuote) return;
    setUpdating(true);
    try {
      await updateQuote(selectedQuote.id, updates);
    } catch (err) {
      alert(err.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!techResponse.trim()) return;
    await handleUpdate({ tech_response: techResponse.trim(), status: 'Replied' });
    setTechResponse('');
  };

  const handleSetEstimate = async (e) => {
    e.preventDefault();
    if (!estimateAmount) return;
    await handleUpdate({ estimate_amount: parseFloat(estimateAmount), status: 'Estimated' });
    setEstimateAmount('');
  };
  
  const handleStatusUpdate = async (newStatus) => {
    if (!selectedQuote) return;
    const confirmMsg = newStatus === 'Cancelled' 
      ? 'Are you sure you want to cancel this request?' 
      : `Move this request to ${newStatus}?`;
    if (!window.confirm(confirmMsg)) return;
    await handleUpdate({ status: newStatus });
  };

  const handleDeleteQuote = async () => {
    if (!selectedQuote) return;
    if (!window.confirm('Are you sure you want to permanently delete this request? This action cannot be undone.')) return;
    setUpdating(true);
    try {
      await deleteQuote(selectedQuote.id);
      setSelectedQuote(null);
      await load();
    } catch (err) {
      alert(err.message || 'Failed to delete request');
    } finally {
      setUpdating(false);
    }
  };

  const generateTicketAction = async () => {
    if (!selectedQuote) return;
    if (!window.confirm('Convert this request into an active service ticket?')) return;
    setUpdating(true);
    try {
      const ticketCode = generateTicketCode();
      await convertQuoteToTicket(selectedQuote, ticketCode);
      alert('Ticket generated successfully! Code: ' + ticketCode);
    } catch (err) {
      alert(err.message || 'Failed to generate ticket');
    } finally {
      setUpdating(false);
    }
  };

  const generateIntakeForm = () => {
    if (!selectedQuote) return;
    const params = new URLSearchParams({
      service: selectedQuote.service || '',
      name: selectedQuote.name,
      email: selectedQuote.email,
      phone: selectedQuote.phone,
      device: selectedQuote.device_type || '',
      brand: `${selectedQuote.brand || ''} ${selectedQuote.model || ''}`.trim(),
      os: selectedQuote.os || ''
    });
    navigate(`/intake?${params.toString()}`);
  };

  const filtered = quotes.filter((q) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return (
      q.name?.toLowerCase().includes(s) ||
      q.email?.toLowerCase().includes(s) ||
      q.phone?.includes(s) ||
      q.service?.toLowerCase().includes(s) ||
      q.description?.toLowerCase().includes(s) ||
      q.status?.toLowerCase().includes(s) ||
      q.ticket_code?.toLowerCase().includes(s)
    );
  });

  // Group by request type
  const requestTypes = ['price_quote', 'general_info', 'status_update'];
  const groupedByType = {};
  requestTypes.forEach(type => {
    groupedByType[type] = filtered.filter(q => q.request_type === type);
  });
  // Catch any with unknown request types
  const otherType = filtered.filter(q => !requestTypes.includes(q.request_type));

  return (
    <div className="quote-requests-view animate-fade-in">
      {!selectedQuote ? (
        <>
          <div className="tech-header">
            <div>
              <h2 className="flex items-center gap-2" style={{ marginBottom: '0.25rem' }}>
                <ClipboardList size={28} /> Information Requests
              </h2>
              <p className="text-muted text-sm">Public requests for quotes and info (live updates). Grouped by request type.</p>
            </div>
            <div className="tech-actions">
              <div className="search-bar">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search name, code, status…"
                  className="form-input tech-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && <p style={{ color: '#fca5a5', marginBottom: '1rem' }}>{error}</p>}
          {loading && <p className="text-muted">Loading requests…</p>}
          {!loading && !filtered.length && (
            <p className="text-muted">No requests yet. Submissions from /request-info appear here.</p>
          )}

          {requestTypes.map(type => (
            <RequestTypeGroup
              key={type}
              requestType={type}
              quotes={groupedByType[type]}
              onSelect={setSelectedQuote}
            />
          ))}
          {otherType.length > 0 && (
            <RequestTypeGroup
              requestType="Other"
              quotes={otherType}
              onSelect={setSelectedQuote}
            />
          )}
        </>
      ) : (
        <div className="quote-detail-view animate-fade-in">
          <div className="tech-header">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedQuote(null)}
                className="button secondary square-btn"
                title="Back to list"
              >
                <X size={20} />
              </button>
              <div>
                <h2 className="flex items-center gap-2">
                  Request from {selectedQuote.name}
                  {selectedQuote.ticket_code && (
                    <span style={{ fontFamily: 'monospace', color: '#10b981', fontSize: '0.85rem', fontWeight: 700 }}>
                      {selectedQuote.ticket_code}
                    </span>
                  )}
                </h2>
                <p className="text-muted text-sm capitalize">
                  {REQUEST_TYPE_LABELS[selectedQuote.request_type] || selectedQuote.request_type} • {new Date(selectedQuote.created_at).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <select
                className={`status-badge big ${(selectedQuote.status || 'pending').toLowerCase().replace(/ /g, '-')}`}
                value={selectedQuote.status || 'Pending'}
                onChange={(e) => handleStatusUpdate(e.target.value)}
                disabled={updating}
                style={{ cursor: 'pointer', border: 'none', appearance: 'none', textAlign: 'center' }}
              >
                {['Pending', 'Estimated', 'Replied', 'Authorized', 'Converted', 'On Hold', 'Cancelled'].map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <button onClick={handleDeleteQuote} className="button secondary small-btn" style={{ borderColor: '#ef4444', color: '#ef4444' }} disabled={updating} title="Delete Request">
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="ticket-detail-grid mt-6">
            {/* Left Column */}
            <div className="flex flex-col gap-6">
              <div className="detail-panel glass-panel">
                <h3><User size={18} className="panel-icon" /> Contact Details</h3>
                <div className="info-list mt-4">
                  <div className="info-item">
                    <label><Mail size={14} /> Email</label>
                    <p>{selectedQuote.email}</p>
                  </div>
                  <div className="info-item">
                    <label><Phone size={14} /> Phone</label>
                    <p>{formatPhone(selectedQuote.phone)}</p>
                  </div>
                  <div className="info-item">
                    <label><MessageSquare size={14} /> Preferred Contact</label>
                    <p>{selectedQuote.preferred_contact || '—'}</p>
                  </div>
                  {selectedQuote.ticket_code && (
                    <div className="info-item">
                      <label><Hash size={14} /> Request Code</label>
                      <p style={{ fontFamily: 'monospace', fontWeight: 700, color: '#10b981' }}>{selectedQuote.ticket_code}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="detail-panel glass-panel">
                <h3><Zap size={18} className="panel-icon" /> Device Details</h3>
                <div className="info-list mt-4">
                  <div className="info-item">
                    <label>Device Type</label>
                    <p>{selectedQuote.device_type || '—'}</p>
                  </div>
                  <div className="info-item">
                    <label>Brand / Model</label>
                    <p>{[selectedQuote.brand, selectedQuote.model].filter(Boolean).join(' ') || '—'}</p>
                  </div>
                  <div className="info-item">
                    <label>OS</label>
                    <p>{selectedQuote.os || '—'}</p>
                  </div>
                  {selectedQuote.eligible_for_unlock !== undefined && selectedQuote.eligible_for_unlock !== null && (
                    <div className="info-item">
                      <label><Unlock size={12} style={{display:'inline', marginRight:'4px'}} /> Unlock Eligible</label>
                      <p>{selectedQuote.eligible_for_unlock ? 'Yes' : 'No'}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="detail-panel glass-panel">
                <h3><Shield size={18} className="panel-icon" /> Benefits &amp; Hardship</h3>
                <div className="info-list mt-4">
                  <div className="info-item">
                    <label>SNAP/Medicaid</label>
                    <p className="capitalize">{selectedQuote.snap_medicaid || 'No'}</p>
                  </div>
                  <div className="info-item">
                    <label>Hardship Financing</label>
                    <p>{selectedQuote.hardship_financing ? 'Requested' : 'No'}</p>
                  </div>
                  {selectedQuote.hardship_details && (
                    <div className="info-item full-width mt-2">
                      <label>Hardship Notes</label>
                      <p className="text-sm italic">{selectedQuote.hardship_details}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-6 span-2">
              <div className="detail-panel glass-panel description-panel">
                <div className="flex justify-between items-center mb-4">
                  <h3><ClipboardList size={18} className="panel-icon" /> Request Description</h3>
                  <span className={`priority-badge ${(selectedQuote.priority || 'normal').toLowerCase()}`}>
                    {selectedQuote.priority || 'Normal'} Priority
                  </span>
                </div>
                {selectedQuote.service && (
                  <div className="info-item mb-4">
                    <label>Service Requested</label>
                    <p style={{color:'#10b981', fontWeight:600}}>{formatJobType(selectedQuote.service)}</p>
                  </div>
                )}
                <div className="notes-box min-h-[120px]">
                  {selectedQuote.description || <span className="text-muted">No description provided.</span>}
                </div>
              </div>

              {selectedQuote.tech_response && (
                <div className="detail-panel glass-panel response-panel border-accent">
                  <h3><MessageSquare size={18} className="panel-icon" /> Your Last Response</h3>
                  <div className="notes-box mt-3 bg-accent/10">
                    {selectedQuote.tech_response}
                  </div>
                </div>
              )}

              <div className="actions-grid">
                {/* Reply */}
                <div className="action-card glass-panel">
                  <h4><MessageSquare size={16} /> Send Reply</h4>
                  <form onSubmit={handleReply} className="mt-3">
                    <textarea
                      className="form-input text-sm mb-2"
                      rows="3"
                      placeholder="Type your response here..."
                      value={techResponse}
                      onChange={e => setTechResponse(e.target.value)}
                    ></textarea>
                    <button type="submit" className="button small-btn w-full" disabled={updating || !techResponse.trim()}>
                      Mark as Replied
                    </button>
                  </form>
                </div>

                {/* Estimate */}
                <div className="action-card glass-panel">
                  <h4><DollarSign size={16} /> Set Estimate</h4>
                  <form onSubmit={handleSetEstimate} className="mt-3">
                    <div className="flex gap-2 mb-2">
                      <span className="currency-prefix">$</span>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input text-sm"
                        placeholder="0.00"
                        value={estimateAmount}
                        onChange={e => setEstimateAmount(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="button secondary small-btn w-full" disabled={updating || !estimateAmount}>
                      Update Quote
                    </button>
                  </form>
                  {selectedQuote.estimate_amount && (
                    <p className="mt-2 text-xs text-center text-muted">Current: ${selectedQuote.estimate_amount}</p>
                  )}
                </div>

                {/* Management Actions */}
                <div className="action-card glass-panel">
                  <h4><Shield size={16} /> Management</h4>
                  <div className="flex flex-col gap-2 mt-3">
                    <button
                      onClick={generateTicketAction}
                      className="button primary small-btn flex items-center justify-center gap-2"
                      disabled={updating || selectedQuote.status === 'Converted'}
                    >
                      <Ticket size={16} /> Generate Ticket
                    </button>
                    <button
                      onClick={() => handleStatusUpdate('On Hold')}
                      className="button secondary small-btn flex items-center justify-center gap-2"
                      disabled={updating || selectedQuote.status === 'On Hold'}
                    >
                      <Pause size={16} /> Put on Hold
                    </button>
                    <button
                      onClick={() => handleStatusUpdate('Cancelled')}
                      className="button secondary small-btn flex items-center justify-center gap-2 text-red-400"
                      disabled={updating || selectedQuote.status === 'Cancelled'}
                    >
                      <Ban size={16} /> Cancel Request
                    </button>
                    <button
                      onClick={generateIntakeForm}
                      className="button secondary small-btn flex items-center justify-center gap-2"
                      disabled={updating}
                    >
                      <FileInput size={16} /> Send Intake Form
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
