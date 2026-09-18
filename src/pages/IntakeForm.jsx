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

const CARRIER_OPTIONS = [
  'StraightTalk',
  'TracFone',
  'Total Wireless',
  'Verizon',
  'AT&T',
  'US Mobile',
  'Cricket',
  'Visible',
  'T-Mobile',
  'Other',
];

const CREDENTIAL_TYPES = [
  'Device screen lock PIN',
  'Windows Login',
  'Mac OS login',
  'Account security PIN',
  'Device Account',
  'Google',
  'Outlook',
  'iCloud',
  'Yahoo',
  'Other',
];

const EMAIL_DOMAINS = {
  Google: '@gmail.com',
  Outlook: '@outlook.com',
  iCloud: '@icloud.com',
  Yahoo: '@yahoo.com',
};

const createInitialLine = () => ({
  id: Date.now() + Math.random(),
  type: 'Smartphone',
  brand: '',
  model: '',
  os: '',
  provider: '',
  otherProvider: '',
  lockStatus: '',
  onPaymentPlan: '',
  amountOwed: '',
  managed: 'No',
  upgradeEligible: '',
  imei: '',
  imei2: '',
  iccid: '',
  iccid2: '',
  simType: '',
  planType: 'Prepaid',
  planName: '',
  dataAllowance: '',
  planPrice: '',
  serviceStatus: 'Active',
  phoneNumber: '',
  hasServicePin: false,
  hasSimKit: false,
  servicePin: '',
  servicePinPlan: '',
  servicePinPrice: '',
  servicePinProvider: '',
});

const createInitialCredential = (type = 'Device screen lock PIN') => ({
  id: Date.now() + Math.random(),
  type,
  accountName: '',
  username: EMAIL_DOMAINS[type] || '',
  password: '',
  requires2FA: false,
  targetDevice: 'all',
});

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
    lines: [createInitialLine()],
    otherUsage: '',
    otherSubscription: '',
    otherBrand: ''
  });

  const [credentials, setCredentials] = useState([createInitialCredential('Device screen lock PIN')]);

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

  const addCredential = (type = 'Device screen lock PIN') => {
    setCredentials([...credentials, createInitialCredential(type)]);
  };

  const getSuggestedCredentials = () => {
    const suggestions = new Set();
    const { serviceType } = formData;
    const primaryLine = auditData.lines[0] || {};
    const osLower = (primaryLine.os || '').toLowerCase();
    const brandLower = (primaryLine.brand || '').toLowerCase();
    const deviceType = primaryLine.type;

    // Service-based suggestions
    if (serviceType === 'account-email-sso') suggestions.add('Google');
    if (serviceType === 'password-manager') suggestions.add('Other');
    if (serviceType === 'cloud-storage-setup') suggestions.add('iCloud');
    if (['switch-carriers', 'psim-esim-install', 'activate-mobile', 'carrier-unlocking', 'number-porting'].includes(serviceType)) {
      suggestions.add('Account security PIN');
      suggestions.add('Device Account');
    }
    if (serviceType === 'screen-lock-bypass' || serviceType === 'factory-reset') {
      suggestions.add('Google');
      suggestions.add('iCloud');
    }

    // Device/OS based suggestions
    if (deviceType === 'Smartphone' || deviceType === 'Tablet') {
      suggestions.add('Device screen lock PIN');
      if (osLower.includes('ios') || brandLower.includes('apple') || brandLower.includes('ipad') || brandLower.includes('iphone')) {
        suggestions.add('iCloud');
      } else if (osLower.includes('android') || brandLower.includes('samsung') || brandLower.includes('google') || brandLower.includes('motorola')) {
        suggestions.add('Google');
      }
    } else if (deviceType === 'Laptop' || deviceType === 'Desktop') {
      if (osLower.includes('windows')) {
        suggestions.add('Windows Login');
        suggestions.add('Outlook');
      } else if (osLower.includes('mac') || brandLower.includes('apple')) {
        suggestions.add('Mac OS login');
        suggestions.add('iCloud');
      } else {
        suggestions.add('Device Account');
      }
    }

    return Array.from(suggestions);
  };

  const removeCredential = (id) => {
    setCredentials(credentials.filter(c => c.id !== id));
  };

  const updateCredential = (id, field, value) => {
    setCredentials(credentials.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, [field]: value };
      if (field === 'type') {
        const domain = EMAIL_DOMAINS[value];
        if (domain) {
          const cur = c.username || '';
          if (!cur || cur.startsWith('@') || Object.values(EMAIL_DOMAINS).some(d => cur.endsWith(d))) {
            const prefix = cur ? cur.split('@')[0] : '';
            updated.username = prefix ? `${prefix}${domain}` : domain;
          }
        }
      }
      return updated;
    }));
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
      lines: [...prev.lines, createInitialLine()]
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
      const primaryProvider = (primaryLine.provider === 'Other' ? primaryLine.otherProvider : primaryLine.provider) || null;
      const ticketCode = generateTicketCode();
      const credPayload = credentials.map((c) => ({
        type: c.type,
        accountName: c.accountName || null,
        username: c.username,
        password: c.password,
        requires2FA: c.requires2FA || false,
        targetDevice: c.targetDevice || 'all',
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
          const p = l.provider === 'Other' ? (l.otherProvider || 'Other') : (l.provider || 'N/A');
          auditDetails.push(`\nLine ${idx+1}: ${l.brand} ${l.model} (${l.os}) | Provider: ${p} | Lock: ${l.lockStatus} | Owed: ${l.amountOwed} | Managed: ${l.managed} | Upgrade: ${l.upgradeEligible} | IMEI 1: ${l.imei || 'N/A'}${l.imei2 ? ` | IMEI 2: ${l.imei2}` : ''} | ICCID 1: ${l.iccid || 'N/A'}${l.iccid2 ? ` | ICCID 2: ${l.iccid2}` : ''} | SIM: ${l.simType}`);
        });

        finalNotes += (finalNotes ? '\n\n' : '') + '--- Audit Questionnaire Details ---\n' + auditDetails.join('\n');
      }

      // Add line details for all forms if present
      if (auditData.lines.length > 0 && (auditData.lines[0].brand || auditData.lines[0].model || auditData.lines[0].imei || auditData.lines[0].provider)) {
        const lineDetails = auditData.lines.map((l, idx) => {
          const providerDisp = l.provider === 'Other' ? (l.otherProvider || 'Other') : (l.provider || 'N/A');
          const planInfo = [
            l.phoneNumber ? `Phone: ${l.phoneNumber}` : null,
            l.planType ? `Plan Type: ${l.planType}` : null,
            l.planName ? `Plan: ${l.planName}` : null,
            l.dataAllowance ? `Data: ${l.dataAllowance}` : null,
            l.planPrice ? `Cost: ${l.planPrice}` : null,
            l.serviceStatus ? `Status: ${l.serviceStatus}` : null,
          ].filter(Boolean).join(' | ');

          const redemptionInfo = (l.hasServicePin || l.hasSimKit) ? [
            l.hasSimKit ? '[SIM Kit: Yes]' : null,
            l.hasServicePin ? `[Service Card PIN: ${l.servicePin || 'Provided'} (Plan: ${l.servicePinPlan || 'N/A'}, Price: ${l.servicePinPrice || 'N/A'}, Provider: ${l.servicePinProvider || providerDisp})]` : null
          ].filter(Boolean).join(' ') : '';

          return `Line ${idx+1}: ${l.brand || ''} ${l.model || ''} (${l.os || l.type}) | Provider: ${providerDisp} | IMEI 1: ${l.imei || 'N/A'}${l.imei2 ? ` | IMEI 2: ${l.imei2}` : ''} | ICCID 1: ${l.iccid || 'N/A'}${l.iccid2 ? ` | ICCID 2: ${l.iccid2}` : ''} | SIM: ${l.simType || 'N/A'} | Lock: ${l.lockStatus || 'N/A'} | Owed: ${l.amountOwed || '$0'} | Managed: ${l.managed || 'No'}${planInfo ? `\n   Plan Details: ${planInfo}` : ''}${redemptionInfo ? `\n   Card/Kit: ${redemptionInfo}` : ''}`;
        });
        finalNotes += (finalNotes ? '\n\n' : '') + '--- Per-Line Device & Service Details ---\n' + lineDetails.join('\n');
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
        provider: primaryProvider,
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
          provider: primaryProvider,
          imei: primaryLine.imei,
          imei2: primaryLine.imei2,
          iccid: primaryLine.iccid,
          iccid2: primaryLine.iccid2,
          credentials: credPayload,
          lines: auditData.lines,
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
                  <span className="font-bold text-primary">{idx === 0 ? 'Primary Device / Line' : `Additional Device / Line #${idx + 1}`}</span>
                  {auditData.lines.length > 1 && (
                    <button type="button" onClick={() => removeLine(line.id)} className="text-red-400 hover:text-red-300" title="Remove line"><Trash2 size={16} /></button>
                  )}
                </div>
                <div className="form-grid grid-cols-2">
                  <div className="form-group">
                    <label className="form-label text-xs">Device Type</label>
                    <select className="form-input text-sm" value={line.type} onChange={e => updateLine(line.id, 'type', e.target.value)}>
                      {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  {/* Carrier / Provider Dropdown */}
                  <div className="form-group">
                    <label className="form-label text-xs">Current Provider / Carrier</label>
                    <select className="form-input text-sm" value={line.provider} onChange={e => updateLine(line.id, 'provider', e.target.value)}>
                      <option value="">Select Provider...</option>
                      {CARRIER_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {line.provider === 'Other' && (
                      <input
                        type="text"
                        className="form-input text-sm mt-2"
                        placeholder="Specify other provider..."
                        value={line.otherProvider || ''}
                        onChange={e => updateLine(line.id, 'otherProvider', e.target.value)}
                      />
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label text-xs">Brand</label>
                    <input type="text" className="form-input text-sm" placeholder="e.g. Apple, Samsung" value={line.brand} onChange={e => updateLine(line.id, 'brand', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">Model</label>
                    <input type="text" className="form-input text-sm" placeholder="e.g. iPhone 14 Pro, Galaxy S23" value={line.model} onChange={e => updateLine(line.id, 'model', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">Operating System</label>
                    <input type="text" className="form-input text-sm" placeholder="e.g. iOS 17, Android 14, Windows 11" value={line.os} onChange={e => updateLine(line.id, 'os', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">SIM Type</label>
                    <select className="form-input text-sm" value={line.simType} onChange={e => updateLine(line.id, 'simType', e.target.value)}>
                      <option value="">Select SIM type...</option>
                      <option value="pSIM">Physical SIM (pSIM)</option>
                      <option value="eSIM">Digital eSIM</option>
                      <option value="None">None</option>
                    </select>
                  </div>

                  {/* Dual IMEI Spaces */}
                  <div className="form-group">
                    <label className="form-label text-xs">IMEI 1 (Primary IMEI / Serial)</label>
                    <input type="text" className="form-input text-sm monospace" placeholder="Primary 15-digit IMEI" value={line.imei || ''} onChange={e => updateLine(line.id, 'imei', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">IMEI 2 (Secondary / eSIM)</label>
                    <input type="text" className="form-input text-sm monospace" placeholder="Secondary IMEI 2 (optional)" value={line.imei2 || ''} onChange={e => updateLine(line.id, 'imei2', e.target.value)} />
                  </div>

                  {/* Dual ICCID Spaces */}
                  <div className="form-group">
                    <label className="form-label text-xs">ICCID 1 (Primary SIM Number)</label>
                    <input type="text" className="form-input text-sm monospace" placeholder="Primary 20-digit ICCID" value={line.iccid || ''} onChange={e => updateLine(line.id, 'iccid', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">ICCID 2 (Secondary SIM Number)</label>
                    <input type="text" className="form-input text-sm monospace" placeholder="Secondary ICCID 2 (optional)" value={line.iccid2 || ''} onChange={e => updateLine(line.id, 'iccid2', e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label text-xs">Lock Status</label>
                    <select className="form-input text-sm" value={line.lockStatus} onChange={e => updateLine(line.id, 'lockStatus', e.target.value)}>
                      <option value="">Unknown</option>
                      <option value="Locked">Locked to carrier</option>
                      <option value="Unlocked">Unlocked</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">Still Owed on Device ($)</label>
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
                      <option value="No">No (Personal)</option>
                      <option value="Work">Work Managed</option>
                      <option value="School">School Managed</option>
                    </select>
                  </div>

                  {/* ─── Service Plan & Line Information ─── */}
                  <div className="full-width" style={{ gridColumn: '1 / -1', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                    <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Service Plan &amp; Line Details</h4>
                    <div className="form-grid grid-cols-3">
                      <div className="form-group">
                        <label className="form-label text-xs">Service Plan Type</label>
                        <select className="form-input text-sm" value={line.planType || 'Prepaid'} onChange={e => updateLine(line.id, 'planType', e.target.value)}>
                          <option value="Prepaid">Prepaid</option>
                          <option value="Postpaid">Postpaid</option>
                          <option value="Unknown">Unknown</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label text-xs">Plan Name</label>
                        <input type="text" className="form-input text-sm" placeholder="e.g. Unlimited Plus" value={line.planName || ''} onChange={e => updateLine(line.id, 'planName', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label text-xs">Data Allowance</label>
                        <input type="text" className="form-input text-sm" placeholder="e.g. Unlimited, 15GB" value={line.dataAllowance || ''} onChange={e => updateLine(line.id, 'dataAllowance', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label text-xs">Cost Per Month ($)</label>
                        <input type="text" className="form-input text-sm" placeholder="e.g. $45/mo" value={line.planPrice || ''} onChange={e => updateLine(line.id, 'planPrice', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label text-xs">Current Service Status</label>
                        <select className="form-input text-sm" value={line.serviceStatus || 'Active'} onChange={e => updateLine(line.id, 'serviceStatus', e.target.value)}>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Suspended">Suspended</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label text-xs">Line Phone Number</label>
                        <input type="text" className="form-input text-sm" placeholder="e.g. (724) 555-0199" value={line.phoneNumber || ''} onChange={e => updateLine(line.id, 'phoneNumber', e.target.value)} />
                      </div>
                    </div>

                    {/* Checkboxes: Service Card PIN and SIM Card Kit */}
                    <div className="flex flex-wrap gap-5 mt-3 mb-2">
                      <label className="checkbox-label" style={{ fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={line.hasServicePin || false}
                          onChange={e => updateLine(line.id, 'hasServicePin', e.target.checked)}
                          style={{ width: '16px', height: '16px' }}
                        />
                        <span>I have a service card/PIN to redeem</span>
                      </label>
                      <label className="checkbox-label" style={{ fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={line.hasSimKit || false}
                          onChange={e => updateLine(line.id, 'hasSimKit', e.target.checked)}
                          style={{ width: '16px', height: '16px' }}
                        />
                        <span>I have a SIM card kit</span>
                      </label>
                    </div>

                    {/* Conditional section if either is checked */}
                    {(line.hasServicePin || line.hasSimKit) && (
                      <div className="conditional-service-card animate-fade-in" style={{
                        background: 'rgba(255, 107, 0, 0.06)',
                        border: '1px solid rgba(255, 107, 0, 0.25)',
                        borderRadius: '6px',
                        padding: '1rem',
                        marginTop: '0.75rem'
                      }}>
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-semibold text-sm text-primary">Redemption &amp; SIM Kit Details</span>
                          {line.hasSimKit && (
                            <span className="status-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '3px 8px', fontSize: '0.75rem', fontWeight: 600 }}>
                              ✓ Client has a SIM card kit on hand
                            </span>
                          )}
                        </div>
                        <div className="form-grid grid-cols-2">
                          <div className="form-group">
                            <label className="form-label text-xs">Provider</label>
                            <select className="form-input text-sm" value={line.servicePinProvider || line.provider || ''} onChange={e => updateLine(line.id, 'servicePinProvider', e.target.value)}>
                              <option value="">Select Provider...</option>
                              {CARRIER_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label text-xs">Service Card PIN / Redemption Code</label>
                            <input type="text" className="form-input text-sm monospace" placeholder="e.g. 1234-5678-9012" value={line.servicePin || ''} onChange={e => updateLine(line.id, 'servicePin', e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label className="form-label text-xs">Plan / Denomination</label>
                            <input type="text" className="form-input text-sm" placeholder="e.g. $45 Unlimited 30-Day" value={line.servicePinPlan || ''} onChange={e => updateLine(line.id, 'servicePinPlan', e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label className="form-label text-xs">Purchase Price ($)</label>
                            <input type="text" className="form-input text-sm" placeholder="e.g. $45.00" value={line.servicePinPrice || ''} onChange={e => updateLine(line.id, 'servicePinPrice', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    )}
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
            
            {credentials.map((cred, credIdx) => {
              const isDomainEmail = ['Google', 'Outlook', 'iCloud', 'Yahoo'].includes(cred.type);
              const isOther = cred.type === 'Other';
              const isSecurityPin = cred.type === 'Account security PIN';
              const hasMultipleDevices = auditData.lines.length > 1;

              return (
                <div key={cred.id} className="credential-row glass-panel" style={{
                  marginBottom: '1.25rem',
                  padding: '1.25rem',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">Credential #{credIdx + 1}</span>
                      {isDomainEmail && (
                        <span className="badge" style={{ background: 'rgba(255,107,0,0.12)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          {EMAIL_DOMAINS[cred.type]}
                        </span>
                      )}
                    </div>
                    {credentials.length > 1 && (
                      <button type="button" onClick={() => removeCredential(cred.id)} className="text-red-400 hover:text-red-300 icon-button" title="Remove Credential">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="form-grid grid-cols-3">
                    {/* Dropdown in place of login text input */}
                    <div className="form-group">
                      <label className="form-label text-xs">Credential Type</label>
                      <select
                        className="form-input text-sm"
                        value={cred.type}
                        onChange={(e) => updateCredential(cred.id, 'type', e.target.value)}
                      >
                        {CREDENTIAL_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    {/* If Account security PIN is selected: Account Name input */}
                    {isSecurityPin && (
                      <div className="form-group">
                        <label className="form-label text-xs">Account Name</label>
                        <input
                          type="text"
                          className="form-input text-sm"
                          placeholder="e.g. Verizon, AT&T, Bank"
                          value={cred.accountName || ''}
                          onChange={(e) => updateCredential(cred.id, 'accountName', e.target.value)}
                          required
                        />
                      </div>
                    )}

                    {/* If Other is selected: App / Service / Account Name */}
                    {isOther && (
                      <div className="form-group">
                        <label className="form-label text-xs">App / Service / Account</label>
                        <input
                          type="text"
                          className="form-input text-sm"
                          placeholder="e.g. Netflix, Banking, WiFi"
                          value={cred.accountName || ''}
                          onChange={(e) => updateCredential(cred.id, 'accountName', e.target.value)}
                          required
                        />
                      </div>
                    )}

                    {/* Username / Email field */}
                    {!isSecurityPin && (
                      <div className="form-group">
                        <label className="form-label text-xs">
                          {isDomainEmail ? `${cred.type} Email / Username` : 'Username / Login ID'}
                        </label>
                        <input
                          type="text"
                          className="form-input text-sm"
                          placeholder={isDomainEmail ? `username${EMAIL_DOMAINS[cred.type]}` : 'Username or Email'}
                          value={cred.username}
                          onChange={(e) => updateCredential(cred.id, 'username', e.target.value)}
                          required={!['Device screen lock PIN'].includes(cred.type)}
                        />
                      </div>
                    )}

                    {/* Password / PIN field */}
                    <div className="form-group">
                      <label className="form-label text-xs">
                        {cred.type.includes('PIN') ? 'PIN / Passcode' : 'Password / PIN'}
                      </label>
                      <input
                        type="text"
                        className="form-input text-sm monospace"
                        placeholder={cred.type.includes('PIN') ? 'Enter PIN/Passcode' : 'Password'}
                        value={cred.password}
                        onChange={(e) => updateCredential(cred.id, 'password', e.target.value)}
                        required
                      />
                    </div>

                    {/* Multi-device selector if more than 1 device exists */}
                    {hasMultipleDevices && (
                      <div className="form-group">
                        <label className="form-label text-xs">Applies to Device</label>
                        <select
                          className="form-input text-sm"
                          value={cred.targetDevice || 'all'}
                          onChange={(e) => updateCredential(cred.id, 'targetDevice', e.target.value)}
                        >
                          <option value="all">All Devices</option>
                          {auditData.lines.map((l, i) => (
                            <option key={l.id} value={`device-${i + 1}`}>
                              Device #{i + 1}: {l.brand ? `${l.brand} ${l.model || ''}`.trim() : l.type || `Device ${i + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Keep 2FA Checkbox */}
                  <div className="mt-2 pt-2" style={{ borderTop: '1px dashed rgba(255,255,255,0.06)' }}>
                    <label className="checkbox-label" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <input 
                        type="checkbox" 
                        checked={cred.requires2FA || false} 
                        onChange={(e) => updateCredential(cred.id, 'requires2FA', e.target.checked)} 
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span>This account requires Two-Factor Authentication (2FA)</span>
                    </label>
                  </div>
                </div>
              );
            })}
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
