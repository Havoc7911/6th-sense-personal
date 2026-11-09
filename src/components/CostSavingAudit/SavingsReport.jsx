import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ArrowRight, 
  Lock, 
  CheckCircle2, 
  Copy, 
  Check, 
  Mail, 
  Key, 
  FileText, 
  Calendar,
  ExternalLink,
  Sparkles,
  Printer,
  TrendingUp
} from 'lucide-react';
import { calculateAuditSavings } from '../../lib/auditSchema';
import { insertQuote, generateCostSavingAuditPrint } from '../../api/data';
import { fetchAuditPrograms } from '../../lib/auditPrograms';
import { generateTicketCode } from '../../lib/ticketCode';
import { getSupabase } from '../../lib/supabase';
import EmbeddedScheduler from './EmbeddedScheduler';
import './AuditWizard.css';

export default function SavingsReport({ answers, onActionRequested }) {
  const { breakdown, totalMonthly, totalAnnual } = calculateAuditSavings(answers);
  const [auditPrograms, setAuditPrograms] = useState([]);
  const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  useEffect(() => {
    fetchAuditPrograms().then(setAuditPrograms).catch(() => {});
  }, []);

  const handlePrintAuditReport = (ticketCode = null) => {
    const reportTicket = {
      ticket_code: ticketCode || submittedTicket || 'PREVIEW',
      name: leadForm.name || 'Valued Client',
      client: leadForm.name || 'Valued Client',
      email: leadForm.email || 'Client Email',
      phone: leadForm.phone || '',
      service: 'cost-saving-audit',
      intake: {
        auditAnswers: answers,
        breakdown,
        totalAnnual,
        totalMonthly
      }
    };
    generateCostSavingAuditPrint(reportTicket, { answers, breakdown, totalAnnual, totalMonthly }, auditPrograms);
  };

  const handleCopyTicket = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setError('');

    const cleanName = leadForm.name.trim();
    const cleanEmail = leadForm.email.trim().toLowerCase();
    const cleanPhone = leadForm.phone.trim();

    if (!cleanName || !cleanEmail) {
      setError('Please provide your name and email address to receive your customized report.');
      return;
    }

    setSubmitting(true);
    try {
      const ticketCode = generateTicketCode();
      const formattedBreakdownText = breakdown
        .map(b => `• ${b.category}: +$${b.annual}/year ($${b.monthly}/mo)\n  Insight: ${b.insight}`)
        .join('\n\n');

      const fullDescription = `--- Cost-Saving Audit Screening Results ---\n` +
        `Total Estimated Annual Savings: $${totalAnnual.toLocaleString()}/year\n` +
        `Estimated Monthly Savings: $${totalMonthly.toFixed(0)}/month\n\n` +
        `Categorized Breakdown:\n${formattedBreakdownText}`;

      // 1. Insert into Supabase quotes table (which maps to Info Requests / Tickets)
      await insertQuote({
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone || 'Not provided',
        service: 'cost-saving-audit',
        request_type: 'audit_action_plan',
        description: fullDescription,
        priority: 'Normal',
        preferred_contact: 'Email',
        ticket_code: ticketCode,
        intake: {
          auditAnswers: answers,
          totalAnnual,
          totalMonthly,
          breakdown,
          submittedAt: new Date().toISOString()
        }
      });

      // 2. Dispatch official Magic Link credentials via Supabase Auth
      try {
        const sb = getSupabase();
        if (sb?.auth?.signInWithOtp) {
          await sb.auth.signInWithOtp({
            email: cleanEmail,
            options: {
              emailRedirectTo: `${window.location.origin}/portal?email=${encodeURIComponent(cleanEmail)}`,
              data: {
                ticket_code: ticketCode,
                full_name: cleanName
              }
            }
          });
          setMagicLinkSent(true);
        }
      } catch (authErr) {
        console.warn('Supabase Auth OTP dispatch notice:', authErr?.message);
      }

      // 3. Dispatch serverless confirmation email with full summary report
      try {
        await fetch('/api/send-audit-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: cleanName,
            email: cleanEmail,
            ticketCode,
            totalAnnual,
            totalMonthly,
            breakdown
          })
        });
      } catch (mailErr) {
        console.warn('Serverless confirmation email API notice:', mailErr?.message);
      }

      setSubmittedTicket(ticketCode);
      if (onActionRequested) onActionRequested(ticketCode);
    } catch (err) {
      setError(err?.message || 'Failed to submit audit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Post-Submission Success & Scheduling Screen ──
  if (submittedTicket) {
    return (
      <div className="report-success-panel glass-panel animate-fade-in p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="text-2xl font-bold text-white">Your Audit Action Plan is Confirmed!</h2>
          <p className="text-muted text-sm max-w-md mx-auto mt-1">
            We have generated your service ticket and dispatched your login credentials and breakdown to your email.
          </p>
        </div>

        {/* Ticket & Credentials Card */}
        <div className="glass-panel p-5 mb-6 border border-emerald-500/30 bg-emerald-500/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <span className="text-xs text-muted block uppercase tracking-wider font-semibold">Assigned Ticket Identifier</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl font-bold font-mono text-primary">{submittedTicket}</span>
                <button
                  type="button"
                  className="copy-mini-btn"
                  onClick={() => handleCopyTicket(submittedTicket)}
                  title="Copy ticket code"
                >
                  {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div>
              <span className="text-xs text-muted block uppercase tracking-wider font-semibold">Client Portal Credentials</span>
              <div className="flex items-center gap-2 mt-1">
                <Key size={14} className="text-emerald-400" />
                <span className="text-xs text-gray-200">
                  One-click magic link sent to <strong className="text-white">{leadForm.email}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-500/20 flex justify-end">
            <button
              type="button"
              className="button secondary small-btn flex items-center gap-2"
              onClick={() => handlePrintAuditReport(submittedTicket)}
            >
              <Printer size={15} className="text-emerald-400" /> Print / Save Formal Audit Report
            </button>
          </div>
        </div>

        {/* Embedded Scheduling Section */}
        <EmbeddedScheduler
          user={leadForm}
          ticketCode={submittedTicket}
        />
      </div>
    );
  }

  // ── Initial Savings Report Presentation ──
  return (
    <div className="savings-report-container animate-fade-in">
      {/* ── Summary Hero Card ── */}
      <div className="savings-hero-card">
        <span className="hero-eyebrow">
          <Sparkles size={13} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} />
          Screening Results &amp; Projected Impact
        </span>
        <div className="hero-figure">
          <span className="hero-currency">$</span>
          <span className="hero-amount">{totalAnnual.toLocaleString()}</span>
          <span className="hero-period">/ year</span>
        </div>
        <p className="hero-subtext">
          Equivalent to approximately <strong>${totalMonthly.toFixed(0)}/month</strong> in recoverable telecommunications, software redundancies, and payment optimization.
        </p>
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            className="button secondary small-btn flex items-center gap-2"
            onClick={() => handlePrintAuditReport()}
          >
            <Printer size={14} className="text-primary" /> Print / Save Full Audit Report
          </button>
        </div>
      </div>

      {/* ── Categorized Savings Breakdown (General terms, no restricted provider names) ── */}
      <div className="report-category-list">
        <h3 className="text-base font-bold text-gray-200 mb-3 uppercase tracking-wider text-xs">
          Estimated Savings by Service Category
        </h3>
        
        {breakdown.length === 0 ? (
          <div className="glass-panel p-5 text-muted text-sm text-center">
            Your current digital stack is already lean! Our technicians can still inspect your bills for carrier administrative fee credits and dispute refunds.
          </div>
        ) : (
          breakdown.map((item, idx) => (
            <div key={idx} className="category-savings-card">
              <div className="category-header-row">
                <div className="flex-1">
                  <h4 className="category-title">{item.category}</h4>
                  <p className="category-insight">{item.insight}</p>
                </div>
                <div className="text-right pl-3">
                  <span className="category-amount-annual">+${item.annual.toLocaleString()}/yr</span>
                  <span className="category-amount-monthly">${item.monthly}/mo</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Call To Action Form ── */}
      <form onSubmit={handleSubmitReport} className="lead-capture-card mt-8">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={22} className="text-primary" />
          <h3 className="text-lg font-bold text-white m-0">Claim Your Step-by-Step Action Plan</h3>
        </div>
        <p className="text-xs text-muted mb-5 leading-relaxed">
          Receive a turnkey migration checklist, phone carrier porting scripts, and client portal credentials to execute these savings with personal technician guidance.
        </p>

        {error && (
          <div className="p-3 bg-red-900/30 border border-red-500/40 text-red-200 text-xs rounded mb-4 animate-fade-in">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="form-group mb-0">
            <label className="form-label text-xs">Your Full Name *</label>
            <input
              type="text"
              className="form-input text-sm"
              placeholder="e.g. Alex Morgan"
              value={leadForm.name}
              onChange={e => setLeadForm({ ...leadForm, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group mb-0">
            <label className="form-label text-xs">Email Address (for plan &amp; credentials) *</label>
            <input
              type="email"
              className="form-input text-sm"
              placeholder="alex@example.com"
              value={leadForm.email}
              onChange={e => setLeadForm({ ...leadForm, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group mb-0">
            <label className="form-label text-xs">Mobile Phone (Optional)</label>
            <input
              type="tel"
              className="form-input text-sm"
              placeholder="(555) 000-0000"
              value={leadForm.phone}
              onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="button w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2"
        >
          {submitting ? 'Generating Ticket & Credentials...' : 'Email My Complete Savings Report & Open Ticket'}
          <ArrowRight size={16} />
        </button>

        <div className="flex items-center justify-center gap-1.5 text-xs text-muted mt-3">
          <Lock size={12} className="text-emerald-400" />
          <span>100% confidential. Your information is protected by 6th Sense Personal data privacy.</span>
        </div>
      </form>
    </div>
  );
}
