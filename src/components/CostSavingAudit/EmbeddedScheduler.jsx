import React, { useState } from 'react';
import { Calendar, Clock, CheckCircle, ExternalLink, Shield } from 'lucide-react';

export default function EmbeddedScheduler({ user, ticketCode, bookingUrl }) {
  const [scheduledSlot, setScheduledSlot] = useState(null);
  
  // Default to organizational booking or configured calendar
  const defaultUrl = bookingUrl || import.meta.env.VITE_SCHEDULING_URL || '';

  const params = new URLSearchParams({
    name: user?.name || '',
    email: user?.email || '',
    notes: `Ticket #${ticketCode || 'NEW'} - Cost-Saving Audit Action Plan`,
    theme: 'dark',
    primaryColor: 'ff6b00',
    backgroundColor: '0a0a0a',
  });

  const fullUrl = defaultUrl ? `${defaultUrl}${defaultUrl.includes('?') ? '&' : '?'}${params.toString()}` : '';

  return (
    <div className="embedded-scheduler-panel animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2 m-0">
            <Calendar size={18} /> Schedule Your Turnkey Optimization Review
          </h3>
          <p className="text-xs text-muted mt-1">
            Pick a 15-minute slot to execute your carrier cuts, AI subscription cleanups, and autopay setups.
          </p>
        </div>
        {ticketCode && (
          <span className="step-counter-badge text-xs">
            Linked to Ticket: <strong className="text-primary font-mono">{ticketCode}</strong>
          </span>
        )}
      </div>

      {fullUrl ? (
        <iframe
          src={fullUrl}
          title="Schedule 6th Sense Personal Consultation"
          className="scheduler-iframe"
          loading="lazy"
          allow="camera; microphone; autoplay; encrypted-media"
        />
      ) : (
        /* Fallback Native Fast-Scheduler Card */
        <div className="glass-panel p-6 text-center" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
          <Clock size={36} className="text-primary mx-auto mb-3" />
          <h4 className="text-base font-bold text-white mb-2">Priority Tech Review Window</h4>
          <p className="text-sm text-gray-300 max-w-lg mx-auto mb-4">
            Our technician team reviews audit submissions within 2 business hours. You can choose your preferred contact window or continue to your secure portal.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {['Morning (9AM - 12PM)', 'Afternoon (12PM - 4PM)', 'Evening (4PM - 7PM)'].map(window => (
              <button
                key={window}
                type="button"
                className={`pill-btn ${scheduledSlot === window ? 'selected' : ''}`}
                onClick={() => setScheduledSlot(window)}
              >
                {scheduledSlot === window && <CheckCircle size={14} className="text-primary" />}
                {window}
              </button>
            ))}
          </div>
          {scheduledSlot && (
            <p className="text-xs text-emerald-400 mt-3 animate-fade-in font-semibold">
              ✓ Window recorded: A certified technician will contact you during the {scheduledSlot} window.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted mt-3 pt-3 border-t border-white/5">
        <span className="flex items-center gap-1">
          <Shield size={12} className="text-primary" /> Verified 6th Sense Personal Concierge
        </span>
        <a
          href={`/portal?email=${encodeURIComponent(user?.email || '')}`}
          className="text-primary hover:underline flex items-center gap-1 font-semibold"
        >
          Access Client Portal <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}
