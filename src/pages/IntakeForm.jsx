import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { insertTicket, BACKEND_NOT_CONFIGURED } from '../api/data';
import { isSupabaseConfigured } from '../lib/supabase';
import { getServicePricing } from '../lib/services';
import { formatPhone } from '../lib/formatPhone';
import { generateTicketCode } from '../lib/ticketCode';
import './IntakeForm.css';

const DEVICE_TYPES = ['Smartphone', 'Tablet', 'Laptop', 'Desktop', 'Other'];

const USAGE_OPTIONS = [
  'Calling/Texting', 'Video Calls', 'Generative AI', 'Documents', 
  'Spreadsheets', 'Notes', 'Collaboration', 'Email', 
  'Messaging', 'Internet Browsing', 'Shopping', 'Social Media', 'Gaming', 'Other (please describe)'
];

const SUBSIDY_OPTIONS = ['SNAP', 'Medicaid', 'WIC', 'SSDI', 'Other Assistance'];
const SUBSCRIPTION_OPTIONS = ['iCloud Storage', 'Google One', 'Microsoft 365', 'Netflix', 'Hulu/Disney+', 'Spotify/Apple Music', 'Amazon Prime', 'Other'];


export default function IntakeForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', serviceType: '',
    snapMedicaid: '',
    hardshipFinancing: false,
    hardshipDetails: '',
    notes: '',
    eligibleForUnlock: '',
    servicePin: '',
    portingNumber: '',
    portingProvider: '',
    portingType: 'Mobile',
    portingActive: 'Yes',
  });

  const [auditData, setAuditData] = useState({
    subsidies: [],
    currentProvider: '',
    prePostPaid: '',
    numLines: 1,
    contractLength: '',
    planPrice: '',
    isActive: '',
    usagePatterns: [],
    preferredBrand: '',
    useComputer: '',
    subscriptions: [],
    isStudent: '',
    state: '',
    householdSize: '',
    veteranStatus: '',
    lines: [{ id: Date.now(), type: 'Smartphone', brand: '', model: '', os: '', provider: '', lockStatus: '', onPaymentPlan: '', amountOwed: '', managed: '', upgradeEligible: '', imei: '', iccid: '', simType: '' }],
    otherUsage: '',
    otherSubscription: '',
    otherBrand: ''
  });

  const [credentials, setCredentials] = useState([{ id: Date.now(), type: 'Login', username: '', password: '' }]);

  // Pre-select service from URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const updates = {};
    if (params.get('service')) updates.serviceType = params.get('service');
    if (params.get('name'))    updates.name = params.get('name');
    if (params.get('email'))   updates.email = params.get('email');
    if (params.get('phone'))   updates.phone = params.get('phone');
    if (params.get('promo') === 'landline') updates.serviceType = 'number-porting';
    if (params.get('promo') === 'porting')  updates.serviceType = 'number-porting';
    if (params.get('promo') === 'audit')    updates.serviceType = 'cost-saving-audit';
    if (Object.keys(updates).length) setFormData(prev => ({ ...prev, ...updates }));
    
    // Set first line data from params if provided
    if (params.get('device') || params.get('brand') || params.get('os')) {
      setAuditData(prev => ({
        ...prev,
        lines: prev.lines.map((l, idx) => idx === 0 ? {
          ...l,
          type: params.get('device') || l.type,
          brand: params.get('brand') || l.brand,
          os: params.get('os') || l.os
        } : l)
      }));
    }
  }, [location]);

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const addCredential = (type = 'Login') => {
    setCredentials([...credentials, { id: Date.now(), type, username: '', password: '' }]);
  };

  const getSuggestedCredentials = () => {
    const suggestions = new Set();
    const { serviceType } = formData;
    const primaryLine = auditData.lines[0] || {};
    const osLower = (primaryLine.os || '').toLowerCase();
    const brandLower = (primaryLine.brand || '').toLowerCase();
    const deviceType = primaryLine.type;

    // Service-based suggestions
    if (serviceType === 'account-email-sso') suggestions.add('Email/Account Password');
    if (serviceType === 'password-manager') suggestions.add('Master Password');
    if (serviceType === 'cloud-storage-setup') suggestions.add('Cloud Login (iCloud/OneDrive)');
    if (['switch-carriers', 'psim-esim-install', 'activate-mobile', 'carrier-unlocking', 'number-porting'].includes(serviceType)) {
      suggestions.add('Carrier Login (Username/Email & Password)');
      suggestions.add('Carrier Security PIN/Passcode');
    }
    if (serviceType === 'screen-lock-bypass') suggestions.add('Original Google/Apple ID (Activation Lock)');
    if (serviceType === 'factory-reset') suggestions.add('Google/Apple ID (Activation Lock)');

    // Device/OS based suggestions
    if (deviceType === 'Smartphone' || deviceType === 'Tablet') {
      suggestions.add('Screen PIN/Passcode');
      if (osLower.includes('ios') || brandLower.includes('apple') || brandLower.includes('ipad') || brandLower.includes('iphone')) {
        suggestions.add('Apple ID');
      } else if (osLower.includes('android') || brandLower.includes('samsung') || brandLower.includes('google') || brandLower.includes('motorola')) {
        suggestions.add('Google Account');
      }
    } else if (deviceType === 'Laptop' || deviceType === 'Desktop') {
      if (osLower.includes('windows')) {
        suggestions.add('Windows Login PIN/Password');
        suggestions.add('Microsoft Account');
      } else if (osLower.includes('mac') || brandLower.includes('apple')) {
        suggestions.add('Mac Login Password');
        suggestions.add('Apple ID');
      } else {
        suggestions.add('Computer Login Password');
      }
    }

    // Always suggest 2FA options
    suggestions.add('2FA (Code to Phone)');
    suggestions.add('2FA (Code to Email)');
    suggestions.add('2FA (Authenticator App)');

    return Array.from(suggestions);
  };

  const removeCredential = (id) => {
    setCredentials(credentials.filter(c => c.id !== id));
  };

  const updateCredential = (id, field, value) => {
    setCredentials(credentials.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const updateAudit = (field, value) => setAuditData(prev => ({ ...prev, [field]: value }));
  
  const toggleAuditList = (field, item) => {
    setAuditData(prev => {
      const current = prev[field] || [];
      const next = current.includes(item) ? current.filter(i => i !== item) : [...current, item];
      return { ...prev, [field]: next };
    });
  };

  const addLine = () => {
    setAuditData(prev => ({
      ...prev,
      lines: [...prev.lines, { id: Date.now(), type: 'Smartphone', brand: '', model: '', os: '', provider: '', lockStatus: '', onPaymentPlan: '', amountOwed: '', managed: '', upgradeEligible: '', imei: '', iccid: '', simType: '' }]
    }));
  };

  const updateLine = (id, field, value) => {
    setAuditData(prev => ({
      ...prev,
      lines: prev.lines.map(l => l.id === id ? { ...l, [field]: value } : l)
    }));
  };

  const removeLine = (id) => {
    setAuditData(prev => ({
      ...prev,
      lines: prev.lines.length > 1 ? prev.lines.filter(l => l.id !== id) : prev.lines
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!isSupabaseConfigured()) {
      setSubmitError('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }
    setSubmitting(true);
    try {
      const primaryLine = auditData.lines[0] || {};
      const ticketCode = generateTicketCode();
      const credPayload = credentials.map((c) => ({
        type: c.type,
        username: c.username,
        password: c.password,
        requires2FA: c.requires2FA || false,
      }));
      const isMobileSvc = ['switch-carriers', 'psim-esim-install', 'activate-mobile', 'carrier-unlocking', 'number-porting'].includes(formData.serviceType);
      let finalNotes = formData.notes || '';
      if (isMobileSvc) {
        const mobileDetails = [];
        if (formData.servicePin) mobileDetails.push(`Service PIN/Passcode: ${formData.servicePin}`);
        if (formData.serviceType === 'number-porting') {
          mobileDetails.push(`--- Porting Details ---`);
          mobileDetails.push(`Number to Port: ${formData.portingNumber}`);
          mobileDetails.push(`Previous Provider: ${formData.portingProvider}`);
          mobileDetails.push(`Line Type: ${formData.portingType}`);
          mobileDetails.push(`Active: ${formData.portingActive}`);
        }
        
        if (mobileDetails.length > 0) {
          finalNotes += (finalNotes ? '\n\n' : '') + '--- Mobile Service Details ---\n' + mobileDetails.join('\n');
        }
      }

      if (formData.serviceType === 'cost-saving-audit') {
        const auditDetails = [
          `Subsidies: ${auditData.subsidies.join(', ') || 'None'}`,
          `Provider: ${auditData.currentProvider}`,
          `Pre/Post Paid: ${auditData.prePostPaid}`,
          `Lines: ${auditData.numLines}`,
          `Contract: ${auditData.contractLength}`,
          `Current Plan: ${auditData.planPrice}`,
          `Active Service: ${auditData.isActive}`,
          `Preferred Brand: ${auditData.preferredBrand} ${auditData.preferredBrand === 'Other' ? `(${auditData.otherBrand})` : ''}`,
          `Use Computer: ${auditData.useComputer}`,
          `Subscriptions: ${auditData.subscriptions.join(', ')} ${auditData.subscriptions.includes('Other') ? `(${auditData.otherSubscription})` : ''}`,
          `Is Student: ${auditData.isStudent}`,
          `State: ${auditData.state}`,
          `Household Size: ${auditData.householdSize}`,
          `Veteran Status: ${auditData.veteranStatus}`,
          `Usage: ${auditData.usagePatterns.join(', ')} ${auditData.usagePatterns.includes('Other (please describe)') ? `(${auditData.otherUsage})` : ''}`,
        ];
        
        auditData.lines.forEach((l, idx) => {
          auditDetails.push(`\nLine ${idx+1}: ${l.brand} ${l.model} (${l.os}) | Lock: ${l.lockStatus} | Owed: ${l.amountOwed} | Managed: ${l.managed} | Upgrade: ${l.upgradeEligible} | IMEI: ${l.imei} | ICCID: ${l.iccid} | SIM: ${l.simType}`);
        });

        finalNotes += (finalNotes ? '\n\n' : '') + '--- Audit Questionnaire Details ---\n' + auditDetails.join('\n');
      }

      // Add line details for all forms if present
      if (auditData.lines.length > 0 && (auditData.lines[0].brand || auditData.lines[0].model || auditData.lines[0].imei)) {
        const lineDetails = auditData.lines.map((l, idx) => 
          `Line ${idx+1}: ${l.brand} ${l.model} (${l.os}) | Lock: ${l.lockStatus} | Owed: ${l.amountOwed} | Managed: ${l.managed} | Upgrade: ${l.upgradeEligible} | IMEI: ${l.imei} | ICCID: ${l.iccid} | SIM: ${l.simType}`
        );
        finalNotes += (finalNotes ? '\n\n' : '') + '--- Per-Line Device Details ---\n' + lineDetails.join('\n');
      }

      const isAudit = formData.serviceType === 'cost-saving-audit';

      await insertTicket({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        job_type: formData.serviceType,
        service: formData.serviceType,
        device_type: primaryLine.type,
        brand: primaryLine.brand,
        os: primaryLine.os,
        imei: primaryLine.imei || null,
        iccid: primaryLine.iccid || null,
        provider: primaryLine.provider || null,
        snap_medicaid: formData.snapMedicaid,
        hardship_financing: formData.hardshipFinancing,
        hardship_details: formData.hardshipDetails || null,
        notes: finalNotes || null,
        credentials: credPayload,
        status: isAudit ? 'Needs Authorization' : 'Pending',
        invoice_status: isAudit ? 'Pending Authorization' : null,
        priority: 'Normal',
        eligible_for_unlock: formData.eligibleForUnlock === 'yes',
        ticket_code: ticketCode,
        intake: {
          ...formData,
          ...auditData,
          deviceType: primaryLine.type,
          brand: primaryLine.brand,
          model: primaryLine.model,
          os: primaryLine.os,
          provider: primaryLine.provider,
          imei: primaryLine.imei,
          iccid: primaryLine.iccid
        }
      });
      navigate('/success', { state: { ticketCode, type: 'intake' } });
    } catch (err) {
      const msg =
        err?.code === BACKEND_NOT_CONFIGURED
          ? 'Supabase is not configured.'
          : err?.message || 'Could not save intake.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const showUnlockQuestion = formData.serviceType === 'carrier-unlocking';
  const isMobileSvc = ['switch-carriers', 'psim-esim-install', 'activate-mobile', 'carrier-unlocking', 'number-porting'].includes(formData.serviceType);
  
  const selectedServiceInfo = formData.serviceType && !formData.serviceType.startsWith('promo-')
    ? getServicePricing(formData.serviceType)
    : null;

  return (
    <div className="intake-page page-container animate-fade-in">
      <div className="section-header">
        <h1 className="section-title">Device Intake Form</h1>
        
        {selectedServiceInfo && selectedServiceInfo.detail && (
          <div className="animate-fade-in" style={{
            background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.08), rgba(255, 107, 0, 0.02))',
            border: '1px solid rgba(255, 107, 0, 0.15)',
            borderRadius: '12px',
            padding: '1.25rem',
            textAlign: 'left',
            maxWidth: '700px',
            margin: '1.5rem auto 2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '1rem' }}>
              <strong style={{ color: 'var(--primary)', fontSize: '1.1rem', lineHeight: '1.3' }}>
                {selectedServiceInfo.title}
              </strong>
              {selectedServiceInfo.price && (
                <span style={{ background: 'rgba(255, 107, 0, 0.1)', color: 'var(--primary)', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                  Base: {selectedServiceInfo.price}
                </span>
              )}
            </div>
            <span style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.5', display: 'block', marginBottom: '0.75rem' }}>
              {selectedServiceInfo.detail}
            </span>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255, 107, 0, 0.1)', paddingTop: '0.5rem', lineHeight: '1.4' }}>
              <em>Note: The base price shown may change depending on the complexity of the request or if a preliminary consultation is needed. Any updated pricing will be presented for your explicit authorization before work begins.</em>
            </div>
          </div>
        )}

        <p className="subtitle" style={{ marginTop: selectedServiceInfo ? '0' : '1rem' }}>Please provide comprehensive details about the device for our technicians.</p>
      </div>

      <div className="intake-container glass-panel">
        {submitError && (
          <p className="form-error" style={{ marginBottom: '1rem', color: '#fca5a5' }}>
            {submitError}
          </p>
        )}
        <form onSubmit={handleSubmit} className="intake-form">
          
          <h2 className="form-section-title">Client Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input type="text" className="form-input" required value={formData.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input type="tel" className="form-input" required value={formData.phone} onChange={e => set('phone', formatPhone(e.target.value))} placeholder="(555) 555-5555" />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input type="email" className="form-input" required value={formData.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Service Type</label>
              <select className="form-input" value={formData.serviceType} onChange={e => set('serviceType', e.target.value)}>
                <option value="" disabled>Select Service Type...</option>
                {formData.serviceType?.startsWith('promo-') && (
                  <option value={formData.serviceType}>Special Promotion</option>
                )}
                <optgroup label="Benefit Navigation">
                  <option value="cost-saving-audit">Cost-Saving Audit</option>
                </optgroup>
                <optgroup label="Digital Strategy">
                  <option value="content-creation">Content Creation/Editing</option>
                  <option value="ai-prompt-engineering">AI &amp; Prompt Engineering</option>
                  <option value="app-development">App Development</option>
                  <option value="process-automation">Process Automation</option>
                  <option value="database-schema">Database Schema Management</option>
                </optgroup>
                <optgroup label="Data &amp; Cloud">
                  <option value="cloud-storage-setup">Cloud Storage Setup</option>
                  <option value="file-structure-sync">File Structure/Tagging/Sync</option>
                  <option value="self-hosted-app">Self-Hosted App Config</option>
                </optgroup>
                <optgroup label="Identity & Security">
                  <option value="account-email-sso">Account/Email/SSO Setup — $30</option>
                  <option value="password-manager">Password Manager Setup — $50</option>
                  <option value="voip-setup">VOIP Service Setup — $60</option>
                  <option value="screen-lock-bypass">Screen Lock Bypass — $25</option>
                </optgroup>
                <optgroup label="Device Maintenance">
                  <option value="factory-reset">Device Factory Reset — $25</option>
                  <option value="initial-device-setup">Initial Device Setup — $40</option>
                  <option value="backup-restore">Backup & Restore — $45</option>
                  <option value="os-install-upgrade">Install/Upgrade OS — $40</option>
                </optgroup>
                <optgroup label="Mobile & Carrier Services">
                  <option value="number-porting">Number Porting — $30</option>
                  <option value="psim-esim-install">Install/Change pSIM or eSIM — $20</option>
                  <option value="switch-carriers">Switch Mobile Carriers — $30</option>
                  <option value="activate-mobile">Activate/Reactivate Mobile Service — $10</option>
                  <option value="carrier-unlocking">Carrier Unlocking — $25</option>
                </optgroup>
                <optgroup label="Smart Home & IoT">
                  <option value="smart-home-setup">Smart Home Setup/Device Integration</option>
                </optgroup>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* ─── Public Assistance ─── */}
          <div className="form-group">
            <label className="form-label">Do you receive any public assistance (e.g. Medicaid, SNAP, WIC)?</label>
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
                <textarea className="form-input form-textarea" rows="3" placeholder="Any details that may help us accommodate your request..." value={formData.hardshipDetails} onChange={e => set('hardshipDetails', e.target.value)}></textarea>
              </div>
            )}
          </div>

          {isMobileSvc && (
            <div className="form-group" style={{ maxWidth: '400px' }}>
              <label className="form-label">Carrier Account PIN / Passcode</label>
              <input type="text" className="form-input" placeholder="Required for porting/activation" value={formData.servicePin} onChange={e => set('servicePin', e.target.value)} />
              <p className="helper-text">This is your internal account PIN, not your screen lock code.</p>
            </div>
          )}

          {formData.serviceType === 'number-porting' && (
            <div className="animate-fade-in" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)', marginBottom: '2.5rem' }}>
              <h3 className="text-primary mb-4" style={{ fontSize: '1rem', fontWeight: 600 }}>Porting Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Number to Port</label>
                  <input type="tel" className="form-input" placeholder="(555) 555-5555" value={formData.portingNumber} onChange={e => set('portingNumber', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Current Provider</label>
                  <input type="text" className="form-input" placeholder="e.g. Frontier, T-Mobile" value={formData.portingProvider} onChange={e => set('portingProvider', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Type of Line</label>
                  <select className="form-input" value={formData.portingType} onChange={e => set('portingType', e.target.value)}>
                    <option value="Mobile">Mobile</option>
                    <option value="Landline">Landline / VOIP</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Is the service currently active?</label>
                  <select className="form-input" value={formData.portingActive} onChange={e => set('portingActive', e.target.value)}>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="line-details-section">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Device &amp; Line Inventory</h3>
              <button type="button" onClick={addLine} className="button secondary small-btn"><Plus size={16} /> Add Another Device/Line</button>
            </div>
            <p className="text-muted text-xs mb-4">Please provide details for each device involved in this request.</p>
            {auditData.lines.map((line, idx) => (
              <div key={line.id} className="line-card glass-panel mb-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-primary">{idx === 0 ? 'Primary Device' : `Additional Device #${idx}`}</span>
                  {auditData.lines.length > 1 && (
                    <button type="button" onClick={() => removeLine(line.id)} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                  )}
                </div>
                <div className="form-grid grid-cols-2">
                  <div className="form-group">
                    <label className="form-label text-xs">Device Type</label>
                    <select className="form-input text-sm" value={line.type} onChange={e => updateLine(line.id, 'type', e.target.value)}>
                      {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">Provider / Carrier</label>
                    <input type="text" className="form-input text-sm" placeholder="e.g. Verizon" value={line.provider} onChange={e => updateLine(line.id, 'provider', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">Brand</label>
                    <input type="text" className="form-input text-sm" value={line.brand} onChange={e => updateLine(line.id, 'brand', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">Model</label>
                    <input type="text" className="form-input text-sm" value={line.model} onChange={e => updateLine(line.id, 'model', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">OS</label>
                    <input type="text" className="form-input text-sm" value={line.os} onChange={e => updateLine(line.id, 'os', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">IMEI / Serial</label>
                    <input type="text" className="form-input text-sm monospace" placeholder="IMEI or Serial Number" value={line.imei} onChange={e => updateLine(line.id, 'imei', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">ICCID / SIM</label>
                    <input type="text" className="form-input text-sm monospace" placeholder="SIM Card Number" value={line.iccid} onChange={e => updateLine(line.id, 'iccid', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">SIM Type</label>
                    <select className="form-input text-sm" value={line.simType} onChange={e => updateLine(line.id, 'simType', e.target.value)}>
                      <option value="">None</option>
                      <option value="pSIM">Physical SIM</option>
                      <option value="eSIM">Digital eSIM</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">Lock Status</label>
                    <select className="form-input text-sm" value={line.lockStatus} onChange={e => updateLine(line.id, 'lockStatus', e.target.value)}>
                      <option value="">Unknown</option>
                      <option value="Locked">Locked</option>
                      <option value="Unlocked">Unlocked</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">Still Owed ($)</label>
                    <input type="text" className="form-input text-sm" placeholder="e.g. $250 or None" value={line.amountOwed} onChange={e => updateLine(line.id, 'amountOwed', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">Upgrade Eligible?</label>
                    <select className="form-input text-sm" value={line.upgradeEligible} onChange={e => updateLine(line.id, 'upgradeEligible', e.target.value)}>
                      <option value="">Unknown</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">Managed Device?</label>
                    <select className="form-input text-sm" value={line.managed} onChange={e => updateLine(line.id, 'managed', e.target.value)}>
                      <option value="No">No</option>
                      <option value="Work">Work Managed</option>
                      <option value="School">School Managed</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ─── Unlock Eligibility ─── */}
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
                    <span>{v === 'unsure' ? "I'm not sure" : v.charAt(0).toUpperCase() + v.slice(1)}</span>
                  </label>
                ))}
              </div>
              <p className="helper-text mt-2" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5', marginTop: '0.5rem' }}>
                💡 Phones are generally eligible for unlocking after 60 consecutive days of service. The phone must currently have an active service plan. Search for "lock status" in your phone's Settings app to check.
              </p>
            </div>
          )}

          {/* ─── Credentials ─── */}
          <div className="credentials-section">
            <div className="credentials-header">
              <h2 className="form-section-title" style={{marginBottom: 0}}>Login Credentials</h2>
              <button type="button" onClick={() => addCredential('Login')} className="button secondary small-btn">
                <Plus size={16} /> Add Credential
              </button>
            </div>
            <p className="helper-text">Add any passwords, PINs, or accounts needed to service the device.</p>
            
            {/* Suggested Credentials */}
            {(() => {
              const suggestions = getSuggestedCredentials();
              if (suggestions.length === 0) return null;
              return (
                <div style={{ marginBottom: '1.5rem' }}>
                  <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600 }}>Suggested for this request:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {suggestions.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addCredential(s)}
                        style={{
                          background: 'rgba(255, 107, 0, 0.08)',
                          border: '1px solid rgba(255, 107, 0, 0.25)',
                          color: 'var(--primary)',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(255, 107, 0, 0.15)';
                          e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(255, 107, 0, 0.08)';
                          e.target.style.transform = 'none';
                        }}
                      >
                        <Plus size={12} /> Add {s}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
            
            {credentials.map((cred) => (
              <div key={cred.id} className="credential-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'start', marginBottom: '1.25rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <input type="text" className="form-input" placeholder="Type (e.g. Screen PIN, Apple ID)" value={cred.type} onChange={e => updateCredential(cred.id, 'type', e.target.value)} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <input type="text" className="form-input" placeholder="Username / Email" value={cred.username} onChange={e => updateCredential(cred.id, 'username', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <input type="text" className="form-input" placeholder="Password / PIN" value={cred.password} onChange={e => updateCredential(cred.id, 'password', e.target.value)} required />
                </div>
                {credentials.length > 1 && (
                  <button type="button" onClick={() => removeCredential(cred.id)} className="icon-button delete-btn" title="Remove" style={{ padding: '0.6rem' }}>
                    <Trash2 size={20} />
                  </button>
                )}
                <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0, marginTop: '0.5rem' }}>
                  <label className="checkbox-label" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <input 
                      type="checkbox" 
                      checked={cred.requires2FA || false} 
                      onChange={e => updateCredential(cred.id, 'requires2FA', e.target.checked)} 
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span>This account requires Two-Factor Authentication (2FA)</span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          {/* ─── Audit Special Form ─── */}
          {formData.serviceType === 'cost-saving-audit' && (
            <div className="audit-section animate-fade-in">
              <h2 className="form-section-title">Cost-Saving Audit Questionnaire</h2>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">Eligible for Subsidies? (Select all that apply)</label>
                  <div className="checkbox-grid">
                    {SUBSIDY_OPTIONS.map(opt => (
                      <label key={opt} className="checkbox-label">
                        <input type="checkbox" checked={auditData.subsidies.includes(opt)} onChange={() => toggleAuditList('subsidies', opt)} />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Current Mobile Provider</label>
                  <input type="text" className="form-input" placeholder="e.g. AT&T, Verizon" value={auditData.currentProvider} onChange={e => updateAudit('currentProvider', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Plan Type</label>
                  <div className="radio-group">
                    <label className="radio-option">
                      <input type="radio" checked={auditData.prePostPaid === 'Prepaid'} onChange={() => updateAudit('prePostPaid', 'Prepaid')} />
                      <span>Prepaid</span>
                    </label>
                    <label className="radio-option">
                      <input type="radio" checked={auditData.prePostPaid === 'Postpaid'} onChange={() => updateAudit('prePostPaid', 'Postpaid')} />
                      <span>Postpaid</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Number of Lines</label>
                  <input type="number" className="form-input" value={auditData.numLines} onChange={e => updateAudit('numLines', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Contract Length / End Date</label>
                  <input type="text" className="form-input" placeholder="e.g. 24 months, Ends Dec 2024" value={auditData.contractLength} onChange={e => updateAudit('contractLength', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Current Service Plan/Price</label>
                  <input type="text" className="form-input" placeholder="e.g. Unlimited Starter - $65/mo" value={auditData.planPrice} onChange={e => updateAudit('planPrice', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Is Service Currently Active?</label>
                  <div className="radio-group">
                    <label className="radio-option">
                      <input type="radio" checked={auditData.isActive === 'Yes'} onChange={() => updateAudit('isActive', 'Yes')} />
                      <span>Yes</span>
                    </label>
                    <label className="radio-option">
                      <input type="radio" checked={auditData.isActive === 'No'} onChange={() => updateAudit('isActive', 'No')} />
                      <span>No</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">What do you typically use your device for?</label>
                  <div className="checkbox-grid">
                    {USAGE_OPTIONS.map(opt => (
                      <label key={opt} className="checkbox-label">
                        <input type="checkbox" checked={auditData.usagePatterns.includes(opt)} onChange={() => toggleAuditList('usagePatterns', opt)} />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                  {auditData.usagePatterns.includes('Other (please describe)') && (
                    <input 
                      type="text" 
                      className="form-input mt-2 animate-fade-in" 
                      placeholder="Please describe..." 
                      value={auditData.otherUsage} 
                      onChange={e => updateAudit('otherUsage', e.target.value)} 
                    />
                  )}
                </div>

                 <div className="form-group">
                  <label className="form-label">Preferred Device Brand</label>
                  <select className="form-input" value={auditData.preferredBrand} onChange={e => updateAudit('preferredBrand', e.target.value)}>
                    <option value="">Select...</option>
                    <option value="Apple">Apple</option>
                    <option value="Samsung">Samsung</option>
                    <option value="Google">Google</option>
                    <option value="Other">Other</option>
                  </select>
                  {auditData.preferredBrand === 'Other' && (
                    <input 
                      type="text" 
                      className="form-input mt-2 animate-fade-in" 
                      placeholder="Specify brand..." 
                      value={auditData.otherBrand} 
                      onChange={e => updateAudit('otherBrand', e.target.value)} 
                    />
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Do you use a desktop/laptop?</label>
                  <select className="form-input" value={auditData.useComputer} onChange={e => updateAudit('useComputer', e.target.value)}>
                    <option value="">Select...</option>
                    <option value="Both">Both Desktop & Laptop</option>
                    <option value="Laptop">Laptop Only</option>
                    <option value="Desktop">Desktop Only</option>
                    <option value="No">Neither</option>
                  </select>
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Subscriptions (Storage, Cloud, Premium Apps)</label>
                  <div className="checkbox-grid">
                    {SUBSCRIPTION_OPTIONS.map(opt => (
                      <label key={opt} className="checkbox-label">
                        <input type="checkbox" checked={auditData.subscriptions.includes(opt)} onChange={() => toggleAuditList('subscriptions', opt)} />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                  {auditData.subscriptions.includes('Other') && (
                    <input 
                      type="text" 
                      className="form-input mt-2 animate-fade-in" 
                      placeholder="Specify other subscriptions..." 
                      value={auditData.otherSubscription} 
                      onChange={e => updateAudit('otherSubscription', e.target.value)} 
                    />
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Are you a student?</label>
                  <div className="radio-group">
                    <label className="radio-option">
                      <input type="radio" checked={auditData.isStudent === 'Yes'} onChange={() => updateAudit('isStudent', 'Yes')} />
                      <span>Yes</span>
                    </label>
                    <label className="radio-option">
                      <input type="radio" checked={auditData.isStudent === 'No'} onChange={() => updateAudit('isStudent', 'No')} />
                      <span>No</span>
                    </label>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">State of Residence</label>
                  <input type="text" className="form-input" placeholder="e.g. Pennsylvania" value={auditData.state} onChange={e => updateAudit('state', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Household Size</label>
                  <input type="number" className="form-input" value={auditData.householdSize} onChange={e => updateAudit('householdSize', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Veteran / Military Status?</label>
                  <select className="form-input" value={auditData.veteranStatus} onChange={e => updateAudit('veteranStatus', e.target.value)}>
                    <option value="No">No</option>
                    <option value="Veteran">Veteran</option>
                    <option value="Active Duty">Active Duty</option>
                    <option value="Dependent">Military Dependent</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="form-group" style={{marginTop: '2rem'}}>
            <label className="form-label">Additional Notes</label>
            <textarea className="form-input form-textarea" rows="3" placeholder="Any specific issues, damages, or context..." value={formData.notes} onChange={e => set('notes', e.target.value)}></textarea>
          </div>

          <div className="form-actions">
            <button type="submit" className="button submit-button w-full" disabled={submitting}>
              {submitting ? 'Saving…' : 'Submit Intake Form'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
