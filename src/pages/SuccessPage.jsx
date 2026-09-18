import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle, Home, Copy, Search, UserPlus, ArrowRight } from 'lucide-react';
import { lookupByCode } from '../api/data';
import { isSupabaseConfigured } from '../lib/supabase';
import { formatJobType } from '../lib/formatJobType';

/* ── Shared detailed lookup result card ── */
function LookupResultCard({ lookupResult }) {
  const d = lookupResult.data;
  const isTicket = lookupResult.type === 'ticket';
  return (
    <div className="animate-fade-in" style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px',
      padding: '1.25rem',
      marginTop: '1rem',
      textAlign: 'left',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontWeight: 700, color: '#10b981', fontFamily: 'monospace', fontSize: '1.1rem' }}>{d.ticket_code}</span>
        <span className={`status-badge ${(d.status || 'pending').toLowerCase().replace(/ /g, '-')}`}>{d.status}</span>
      </div>

      {/* Info Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem 1rem', fontSize: '0.85rem' }}>
        <div><span className="text-muted">Type:</span> {isTicket ? 'Service Ticket' : 'Info Request'}</div>
        <div><span className="text-muted">Name:</span> {d.name}</div>
        {(d.service || d.job_type) && <div><span className="text-muted">Service:</span> {formatJobType(d.service || d.job_type)}</div>}
        <div><span className="text-muted">Submitted:</span> {new Date(d.created_at).toLocaleDateString()}</div>
        {d.device_type && <div><span className="text-muted">Device:</span> {d.device_type}</div>}
        {d.brand && <div><span className="text-muted">Brand/Model:</span> {d.brand}</div>}
        {d.os && <div><span className="text-muted">OS:</span> {d.os}</div>}
        {d.provider && <div><span className="text-muted">Provider:</span> {d.provider}</div>}
        {d.priority && <div><span className="text-muted">Priority:</span> <span className={`priority-badge ${(d.priority || 'normal').toLowerCase()}`}>{d.priority}</span></div>}
        {d.preferred_contact && <div><span className="text-muted">Preferred Contact:</span> {d.preferred_contact}</div>}
        {d.imei && <div><span className="text-muted">IMEI:</span> {d.imei}</div>}
        {d.iccid && <div><span className="text-muted">ICCID:</span> {d.iccid}</div>}
        {d.snap_medicaid && <div><span className="text-muted">SNAP/Medicaid:</span> {d.snap_medicaid}</div>}
        {d.hardship_financing && <div><span className="text-muted">Hardship:</span> Requested</div>}
        {d.eligible_for_unlock != null && <div><span className="text-muted">Unlock Eligible:</span> {d.eligible_for_unlock ? 'Yes' : 'No'}</div>}
        {d.estimate_amount && <div><span className="text-muted">Estimate:</span> <strong style={{color:'#10b981'}}>${d.estimate_amount}</strong></div>}
        {d.accepted_at && <div><span className="text-muted">Authorized:</span> {new Date(d.accepted_at).toLocaleDateString()}</div>}
      </div>

      {/* Description (for info requests) */}
      {d.description && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.85rem' }}>
          <strong className="text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Description:</strong>
          <p style={{ whiteSpace: 'pre-wrap' }}>{d.description}</p>
        </div>
      )}

      {/* Notes (for tickets) */}
      {d.notes && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.85rem' }}>
          <strong className="text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Notes:</strong>
          <p style={{ whiteSpace: 'pre-wrap' }}>{d.notes}</p>
        </div>
      )}

      {/* Tech Response */}
      {d.tech_response && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(255, 107, 0, 0.08)', borderRadius: '8px', fontSize: '0.85rem' }}>
          <strong style={{ color: 'var(--primary)' }}>Tech Response:</strong>
          <p style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>{d.tech_response}</p>
        </div>
      )}

      {/* Service Summary (if completed) */}
      {d.summary && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(136, 136, 136, 0.08)', borderRadius: '8px', fontSize: '0.85rem' }}>
          <strong style={{ color: '#888888' }}>Service Summary:</strong>
          <pre style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{d.summary}</pre>
        </div>
      )}

      {d.hardship_details && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Hardship note: {d.hardship_details}
        </div>
      )}
    </div>
  );
}

export { LookupResultCard };

export default function SuccessPage() {
  const location = useLocation();
  const ticketCode = location.state?.ticketCode || null;
  const submissionType = location.state?.type || 'info_request';
  const [copied, setCopied] = useState(false);

  // Lookup state
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  const copyCode = () => {
    if (ticketCode) {
      navigator.clipboard.writeText(ticketCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!lookupCode.trim() || !isSupabaseConfigured()) return;
    setLookupError('');
    setLookupResult(null);
    setLookupLoading(true);
    try {
      const result = await lookupByCode(lookupCode);
      if (!result) {
        setLookupError('No request found with that code. Please check and try again.');
      } else {
        setLookupResult(result);
      }
    } catch (err) {
      setLookupError(err.message || 'Lookup failed.');
    } finally {
      setLookupLoading(false);
    }
  };

  const typeLabel = submissionType === 'intake' ? 'Service Ticket' : 'Information Request';

  return (
    <div className="page-container animate-fade-in flex items-center justify-center" style={{ minHeight: '70vh' }}>
      <div className="glass-panel text-center" style={{ maxWidth: '640px', padding: '3rem' }}>
        {/* ── Success Header ── */}
        <div className="flex justify-center mb-6">
          <div style={{ 
            background: 'rgba(34, 197, 94, 0.1)', 
            color: '#4ade80',
            padding: '1.5rem',
            borderRadius: '50%',
            display: 'inline-flex'
          }}>
            <CheckCircle size={48} />
          </div>
        </div>
        
        <h1 className="section-title" style={{ marginBottom: '1rem' }}>
          {typeLabel} Received!
        </h1>
        
        <p className="hero-subtitle" style={{ fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
          Thanks for your submission! I will contact you via your preferred method of contact shortly.
        </p>

        {/* ── Ticket Code Display ── */}
        {ticketCode && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '2px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem',
          }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Your Request Code
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
              <span style={{
                fontSize: '2rem',
                fontWeight: 800,
                fontFamily: 'monospace',
                color: '#10b981',
                letterSpacing: '3px',
              }}>
                {ticketCode}
              </span>
              <button
                onClick={copyCode}
                style={{
                  background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  color: copied ? '#10b981' : 'var(--text-muted)',
                  transition: 'all 0.2s',
                }}
                title="Copy code"
              >
                <Copy size={18} />
              </button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.75rem', lineHeight: '1.5' }}>
              Save this code — you can use it anytime to check your request status and view updates.
            </p>
          </div>
        )}

        {/* ── Action Buttons ── */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center" style={{ marginBottom: '2rem' }}>
          <Link to="/" className="button secondary flex items-center gap-2 justify-center">
            <Home size={18} /> Back to Home
          </Link>
          <Link to="/portal" className="button flex items-center gap-2 justify-center">
            <ArrowRight size={18} /> View My Requests
          </Link>
        </div>

        {/* ── Create Account CTA ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.05), rgba(136, 136, 136, 0.05))',
          border: '1px solid rgba(255, 107, 0, 0.2)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem',
          textAlign: 'left',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <UserPlus size={22} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Create a Free Account</h3>
            <span style={{
              background: 'rgba(255, 107, 0, 0.15)',
              color: 'var(--primary)',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: 600,
              textTransform: 'uppercase',
            }}>Recommended</span>
          </div>
          <ul style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.7', paddingLeft: '1.25rem', margin: 0 }}>
            <li>View <strong>all</strong> your current and past requests in one place</li>
            <li>Real-time status updates and progress tracking</li>
            <li>Direct messaging with your technician</li>
            <li>Service summaries and invoices</li>
          </ul>
          <Link
            to="/portal"
            className="button flex items-center gap-2 justify-center"
            style={{ marginTop: '1rem', width: '100%', background: 'linear-gradient(135deg, #ff6b00, #ff8533)', color: '#000' }}
          >
            <UserPlus size={16} /> Create Account (Sign in via Email)
          </Link>
        </div>

        {/* ── Lookup By Code ── */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: '1.5rem',
          marginBottom: '1.5rem',
        }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
            <Search size={16} /> Look Up an Existing Request
          </h3>
          <form onSubmit={handleLookup} style={{ display: 'flex', gap: '0.5rem', maxWidth: '320px', margin: '0 auto' }}>
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

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
          <p className="text-muted text-sm">
            Need immediate help? Give us a call at <br/>
            <strong style={{ color: 'white' }}>(724) 780-3223</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
