import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { insertQuote, BACKEND_NOT_CONFIGURED } from '../api/data';
import { isSupabaseConfigured } from '../lib/supabase';
import { formatPhone } from '../lib/formatPhone';
import { generateTicketCode } from '../lib/ticketCode';
import './QuoteRequest.css';

const DEVICE_TYPES = ['Smartphone', 'Tablet', 'Laptop', 'Desktop', 'Other'];

export default function QuoteRequest() {
  const location = useLocation();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    requestType: 'price_quote',
    deviceType: '',
    brand: '',
    model: '',
    os: '',
    priority: 'Normal',
    preferredContact: 'Email',
    snapMedicaid: '',
    hardshipFinancing: false,
    hardshipDetails: '',
    description: '',
    landlineProvider: '',
    eligibleForUnlock: '',
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const serviceParam = params.get('service');
    if (serviceParam) {
      setFormData(prev => ({ ...prev, service: serviceParam }));
    }
  }, [location]);

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!isSupabaseConfigured()) {
      setSubmitError('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }
    setSubmitting(true);
    try {
      const ticketCode = generateTicketCode();
      await insertQuote({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        service: formData.service,
        request_type: formData.requestType,
        device_type: formData.deviceType || null,
        brand: formData.brand || null,
        model: formData.model || null,
        os: formData.os || null,
        priority: formData.priority,
        preferred_contact: formData.preferredContact,
        snap_medicaid: formData.snapMedicaid,
        hardship_financing: formData.hardshipFinancing,
        hardship_details: formData.hardshipDetails || null,
        description: formData.landlineProvider 
          ? `${formData.description}\n\n--- Landline Service Details ---\nLandline Provider: ${formData.landlineProvider}`
          : formData.description,
        eligible_for_unlock: formData.eligibleForUnlock === 'yes',
        ticket_code: ticketCode,
      });
      navigate('/success', { state: { ticketCode, type: 'info_request' } });
    } catch (err) {
      const msg =
        err?.code === BACKEND_NOT_CONFIGURED
          ? 'Supabase is not configured.'
          : err?.message || 'Could not submit request.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const showUnlockQuestion = formData.deviceType === 'Smartphone' || formData.deviceType === 'Tablet';

  return (
    <div className="quote-page page-container animate-fade-in">
      <div className="quote-header">
        <h2 className="form-title">Request Information</h2>
        <p className="form-subtitle">
          Tell us what you need and we'll get back to you with the right info or a custom quote.
        </p>
      </div>

      <div className="quote-form-container glass-panel">
        {submitError && (
          <p className="form-error" style={{ marginBottom: '1rem', color: '#fca5a5' }}>
            {submitError}
          </p>
        )}
        <form onSubmit={handleSubmit} className="quote-form">
          {/* ─── Row 1: Name + Request Type ─── */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.name}
                onChange={e => set('name', e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Request Type</label>
              <select
                className="form-input"
                value={formData.requestType}
                onChange={e => set('requestType', e.target.value)}
              >
                <option value="price_quote">Custom Quote</option>
                <option value="general_info">General Repair Question</option>
                <option value="status_update">Check Ticket Status</option>
              </select>
            </div>
          </div>

          {/* ─── Row 2: Email + Phone ─── */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                className="form-input"
                required
                value={formData.email}
                onChange={e => set('email', e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input
                type="tel"
                className="form-input"
                required
                value={formData.phone}
                onChange={e => set('phone', formatPhone(e.target.value))}
                placeholder="(555) 555-5555"
              />
            </div>
          </div>

          {/* ─── Row 3: Device Type + Service Type ─── */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Device Type *</label>
              <select
                className="form-input"
                required
                value={formData.deviceType}
                onChange={e => set('deviceType', e.target.value)}
              >
                <option value="" disabled>Select device type...</option>
                {DEVICE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Service Type</label>
              <select
                className="form-input"
                value={formData.service}
                onChange={e => set('service', e.target.value)}
              >
                <option value="">Choose a service (optional)...</option>
                <optgroup label="Benefit Navigation">
                  <option value="cost-saving-audit">Cost-Saving Audit — $35</option>
                </optgroup>
                <optgroup label="Digital Strategy">
                  <option value="content-creation">Content Creation/Editing — $50/hr</option>
                  <option value="ai-prompt-engineering">AI &amp; Prompt Engineering — $75</option>
                  <option value="app-development">App Development — $90/hr</option>
                  <option value="process-automation">Process Automation — $50/hr</option>
                  <option value="database-schema">Database Schema Management — $90/hr</option>
                </optgroup>
                <optgroup label="Data &amp; Cloud">
                  <option value="cloud-storage-setup">Cloud Storage Setup — $40</option>
                  <option value="file-structure-sync">File Structure/Tagging/Sync — $65</option>
                  <option value="self-hosted-app">Self-Hosted App Config — $100</option>
                </optgroup>
                <optgroup label="Identity &amp; Security">
                  <option value="account-email-sso">Account/Email/SSO Setup — $30</option>
                  <option value="password-manager">Password Manager Setup — $50</option>
                  <option value="voip-setup">VOIP Service Setup — $60</option>
                  <option value="screen-lock-bypass">Screen Lock Bypass — $25</option>
                </optgroup>
                <optgroup label="Device Maintenance">
                  <option value="factory-reset">Device Factory Reset — $25</option>
                  <option value="initial-device-setup">Initial Device Setup — $40</option>
                  <option value="backup-restore">Backup &amp; Restore — $45</option>
                  <option value="os-install-upgrade">Install/Upgrade OS — $40</option>
                </optgroup>
                <optgroup label="Mobile &amp; Carrier Services">
                  <option value="landline-to-mobile">Landline to Mobile Porting — $30</option>
                  <option value="psim-esim-install">Install/Change pSIM or eSIM — $20</option>
                  <option value="switch-carriers">Switch Mobile Carriers — $30</option>
                  <option value="activate-mobile">Activate/Reactivate Mobile Service — $10</option>
                  <option value="carrier-unlocking">Carrier Unlocking — $25</option>
                </optgroup>
                <optgroup label="Smart Home &amp; IoT">
                  <option value="smart-home-setup">Smart Home Setup/Device Integration — $50/hr</option>
                </optgroup>
                <option value="other">Other / Custom</option>
              </select>
            </div>
          </div>

          {/* ─── Device Details ─── */}
          <div className="device-info-section mt-4 mb-4">
            <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted">Additional Device Details (Optional)</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Brand</label>
                <input type="text" className="form-input" placeholder="e.g. Apple, Samsung" value={formData.brand} onChange={e => set('brand', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Model</label>
                <input type="text" className="form-input" placeholder="e.g. iPhone 15, Galaxy S23" value={formData.model} onChange={e => set('model', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Operating System</label>
                <input type="text" className="form-input" placeholder="e.g. iOS, Windows, Android" value={formData.os} onChange={e => set('os', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Preferred Contact Method</label>
                <select className="form-input" value={formData.preferredContact} onChange={e => set('preferredContact', e.target.value)}>
                  <option value="Email">Email</option>
                  <option value="Phone">Phone Call</option>
                  <option value="Text">Text Message</option>
                </select>
              </div>
            </div>
            {formData.service === 'landline-to-mobile' && (
              <div className="form-row mt-3">
                <div className="form-group">
                  <label className="form-label">Current Landline Provider</label>
                  <input type="text" className="form-input" placeholder="e.g. Frontier, Xfinity" value={formData.landlineProvider} onChange={e => set('landlineProvider', e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* ─── Unlock Eligibility (Smartphones/Tablets only) ─── */}
          {showUnlockQuestion && (
            <div className="form-group animate-fade-in">
              <label className="form-label">Is your device eligible for carrier unlock?</label>
              <div className="radio-group">
                {['yes', 'no', 'unsure'].map(v => (
                  <label key={v} className="radio-option">
                    <input
                      type="radio"
                      name="eligibleForUnlock"
                      value={v}
                      checked={formData.eligibleForUnlock === v}
                      onChange={e => set('eligibleForUnlock', e.target.value)}
                    />
                    <span className="capitalize">{v === 'unsure' ? "I'm not sure" : v.charAt(0).toUpperCase() + v.slice(1)}</span>
                  </label>
                ))}
              </div>
              <p className="helper-text mt-2" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                💡 Phones are generally eligible for unlocking after 60 consecutive days of service. The phone must currently have an active service plan. Search for "lock status" in your phone's Settings app to check.
              </p>
            </div>
          )}

          {/* ─── Priority ─── */}
          <div className="form-group">
            <label className="form-label">Priority Level</label>
            <div className="radio-group">
              {['Low', 'Normal', 'High', 'Urgent'].map(p => (
                <label key={p} className="radio-option">
                  <input type="radio" name="priority" value={p} checked={formData.priority === p} onChange={e => set('priority', e.target.value)} />
                  <span>{p}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ─── SNAP / Medicaid ─── */}
          <div className="form-group">
            <label className="form-label">Do you currently receive SNAP or Medicaid benefits?</label>
            <div className="radio-group">
              <label className="radio-option">
                <input type="radio" name="snapMedicaid" value="yes" checked={formData.snapMedicaid === 'yes'} onChange={e => set('snapMedicaid', e.target.value)} />
                <span>Yes</span>
              </label>
              <label className="radio-option">
                <input type="radio" name="snapMedicaid" value="no" checked={formData.snapMedicaid === 'no'} onChange={e => set('snapMedicaid', e.target.value)} />
                <span>No</span>
              </label>
            </div>
          </div>

          {/* ─── Hardship Financing ─── */}
          <div className="form-group hardship-group">
            <label className="checkbox-label">
              <input type="checkbox" checked={formData.hardshipFinancing} onChange={e => set('hardshipFinancing', e.target.checked)} />
              <span>I would like to request hardship financing for this service</span>
            </label>
            {formData.hardshipFinancing && (
              <div className="hardship-details animate-fade-in">
                <label className="form-label">Please briefly describe your situation (optional)</label>
                <textarea className="form-input quote-textarea" rows="3" placeholder="Any details that may help us accommodate your request..." value={formData.hardshipDetails} onChange={e => set('hardshipDetails', e.target.value)}></textarea>
              </div>
            )}
          </div>

          {/* ─── Description ─── */}
          <div className="form-group">
            <label className="form-label">Detailed Request / Issue Description</label>
            <textarea
              className="form-input quote-textarea"
              rows="5"
              placeholder="Please describe what you're looking for or what issue you're having..."
              value={formData.description}
              onChange={e => set('description', e.target.value)}
            ></textarea>
          </div>

          <button type="submit" className="button submit-button w-full mt-4" disabled={submitting}>
            {submitting ? 'Sending Request...' : 'Send Information Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
