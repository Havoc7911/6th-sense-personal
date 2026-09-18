import { Link } from 'react-router-dom';
import { ShieldAlert, HeartHandshake, AlertCircle } from 'lucide-react';
import './ClientPortal.css'; // Reusing portal styles for consistency

export default function Policies() {
  return (
    <div className="page-container animate-fade-in" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
      <h1 className="section-title" style={{ marginBottom: '1rem' }}>Client Support & Guidelines</h1>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '4rem', maxWidth: '600px', margin: '0 auto 4rem auto' }}>
        Please review the following policies regarding financial support, service requirements, and exclusions.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Column */}
        <div className="flex flex-col gap-8">
          <div className="glass-panel" style={{ padding: '2.5rem', borderTop: '4px solid #f59e0b' }}>
            <h2 className="flex items-center gap-2 text-xl mb-4" style={{ color: '#fcd34d' }}>
              <HeartHandshake size={24} /> Community Support & Financial Flexibility
            </h2>
            <p className="mb-4" style={{ lineHeight: 1.7, color: 'var(--text-main)' }}>
              I understand that financial situations vary. While the prices listed are standard, I am committed to supporting my neighbors in Confluence.
            </p>
            <div className="p-4 rounded-lg" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <p className="text-sm m-0" style={{ color: '#fcd34d', lineHeight: 1.6 }}>
                If you are experiencing hardship, please let me know; payment plans and other adjustments are available on a case-by-case basis. <strong>Special consideration will be given for cases where the device is used by a child.</strong>
              </p>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '2.5rem' }}>
            <h2 className="flex items-center gap-2 text-xl mb-4 text-gray-200">
              <ShieldAlert size={24} className="text-emerald-500" /> Service Requirements
            </h2>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--primary)', marginTop: '2px' }}>◦</span>
                <span style={{ color: 'var(--text-muted)' }}>All unlocking services require <strong>proof of ownership</strong>.</span>
              </li>
              <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--primary)', marginTop: '2px' }}>◦</span>
                <span style={{ color: 'var(--text-muted)' }}>Your device must be eligible for carrier unlocking (60 days of consecutive service and currently active).</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-8">
          <div className="glass-panel" style={{ padding: '2.5rem', borderTop: '4px solid #ef4444' }}>
            <h2 className="flex items-center gap-2 text-xl mb-4 text-red-400">
              <AlertCircle size={24} /> Excluded Services
            </h2>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ color: '#ef4444', marginTop: '2px' }}>◦</span>
                <span style={{ color: 'var(--text-muted)' }}>Mobile device hardware repair (screens/batteries).</span>
              </li>
              <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ color: '#ef4444', marginTop: '2px' }}>◦</span>
                <span style={{ color: 'var(--text-muted)' }}>Any activities involving spyware, remote monitoring, or violations of Terms of Service.</span>
              </li>
              <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ color: '#ef4444', marginTop: '2px' }}>◦</span>
                <span style={{ color: 'var(--text-muted)' }}>Service options for managed devices (school or work devices) may be limited due to device policy.</span>
              </li>
            </ul>
          </div>

          <div className="glass-panel" style={{ padding: '2.5rem', background: 'linear-gradient(135deg, rgba(20,20,20,0.8), rgba(249,115,22,0.05))' }}>
            <h2 className="text-xl mb-3 text-gray-200">Custom Service Pricing</h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              For any issues not listed above, or if you're not sure what service you require, please fill out a request form and I will get back to you.
            </p>
            <Link to="/request-info" className="button w-full justify-center">
              Submit Information Request
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
