import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  TrendingUp, 
  Sparkles, 
  Check, 
  RefreshCw,
  HelpCircle,
  Smartphone
} from 'lucide-react';
import { AUDIT_STEPS, calculateAuditSavings } from '../../lib/auditSchema';
import SavingsReport from './SavingsReport';
import './AuditWizard.css';

export default function AuditWizard({ onComplete, onSwitchToStandardIntake }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = sessionStorage.getItem('cost_saving_audit_answers');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem('cost_saving_audit_answers', JSON.stringify(answers));
    } catch (e) {
      console.warn('Could not cache audit answers in session');
    }
  }, [answers]);

  const currentStep = AUDIT_STEPS[currentStepIndex];
  const { totalAnnual, totalMonthly } = calculateAuditSavings(answers);
  const progressPercent = Math.round(((currentStepIndex + 1) / AUDIT_STEPS.length) * 100);

  const handleSelectOption = (questionId, value, isMulti = false) => {
    setAnswers(prev => {
      if (isMulti) {
        const currentArr = Array.isArray(prev[questionId]) ? prev[questionId] : [];
        if (value === 'none') {
          return { ...prev, [questionId]: ['none'] };
        }
        const withoutNone = currentArr.filter(v => v !== 'none');
        const nextArr = withoutNone.includes(value)
          ? withoutNone.filter(v => v !== value)
          : [...withoutNone, value];
        return { ...prev, [questionId]: nextArr.length === 0 ? ['none'] : nextArr };
      }
      return { ...prev, [questionId]: value };
    });
  };

  const handleResetAudit = () => {
    if (window.confirm('Reset all audit answers and start fresh?')) {
      setAnswers({});
      setCurrentStepIndex(0);
      setIsFinished(false);
      try {
        sessionStorage.removeItem('cost_saving_audit_answers');
      } catch {}
    }
  };

  const handleNext = () => {
    if (currentStepIndex < AUDIT_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } else {
      setIsFinished(true);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  if (isFinished) {
    return (
      <div className="audit-wizard-wrapper">
        <SavingsReport answers={answers} onActionRequested={onComplete} />
      </div>
    );
  }

  return (
    <div className="audit-wizard-wrapper animate-fade-in">
      <div className="audit-wizard-card">
        {/* ── Top Progress & Live Savings Ticker ── */}
        <div className="audit-progress-container">
          <div className="audit-progress-track">
            <div className="audit-progress-bar" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="audit-header-stats">
            <div className="flex items-center gap-2">
              <span className="step-counter-badge">
                Phase {currentStepIndex + 1} of {AUDIT_STEPS.length}
              </span>
              <button
                type="button"
                className="icon-button text-muted hover:text-white"
                onClick={handleResetAudit}
                title="Restart Audit"
                style={{ padding: '2px 6px', fontSize: '0.75rem' }}
              >
                <RefreshCw size={12} />
              </button>
            </div>

            <div className="live-savings-hud">
              <TrendingUp size={15} className="text-primary" />
              <span>
                Identified Potential: <strong>${totalAnnual.toLocaleString()}/yr</strong>
              </span>
            </div>
          </div>
        </div>

        {/* ── Step Information ── */}
        <div className="step-info">
          <h2 className="step-title">
            <Sparkles size={20} className="text-primary" />
            {currentStep.title}
          </h2>
          <p className="step-subtitle">{currentStep.subtitle}</p>
        </div>

        {/* ── Questions (Frictionless Zero-Typing UI) ── */}
        <div className="questions-container">
          {currentStep.questions.map((q) => {
            const val = answers[q.id];

            // 1. Numeric Stepper for Line Counts
            if (q.type === 'stepper') {
              const count = val !== undefined ? Number(val) : q.defaultValue;
              return (
                <div key={q.id} className="audit-q-block">
                  <label className="q-label">{q.label}</label>
                  <div className="stepper-control">
                    <button
                      type="button"
                      className="stepper-btn"
                      disabled={count <= q.min}
                      onClick={() => handleSelectOption(q.id, Math.max(q.min, count - 1))}
                      aria-label="Decrease lines"
                    >
                      –
                    </button>
                    <span className="stepper-value">{count}</span>
                    <button
                      type="button"
                      className="stepper-btn"
                      disabled={count >= q.max}
                      onClick={() => handleSelectOption(q.id, Math.min(q.max, count + 1))}
                      aria-label="Increase lines"
                    >
                      +
                    </button>
                    <span className="text-xs text-muted">
                      {count === 1 ? 'cellular line' : 'cellular lines'}
                    </span>
                  </div>
                </div>
              );
            }

            // 2. Tactile Selection Cards
            if (q.type === 'cards') {
              return (
                <div key={q.id} className="audit-q-block">
                  <label className="q-label">{q.label}</label>
                  <div className="tactile-options-grid">
                    {q.options.map((opt) => {
                      const isSelected = val === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          className={`tactile-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleSelectOption(q.id, opt.value)}
                        >
                          <div className="card-title-row">
                            <span>{opt.label}</span>
                            {isSelected && (
                              <div className="check-indicator">
                                <Check size={14} />
                              </div>
                            )}
                          </div>
                          {opt.sublabel && <div className="card-sublabel">{opt.sublabel}</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // 3. Multi-Select Toggles
            if (q.type === 'multi-select') {
              const selectedList = Array.isArray(val) ? val : [];
              return (
                <div key={q.id} className="audit-q-block">
                  <label className="q-label">{q.label}</label>
                  <div className="tactile-options-grid">
                    {q.options.map((opt) => {
                      const isSelected = selectedList.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          className={`tactile-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleSelectOption(q.id, opt.value, true)}
                        >
                          <div className="card-title-row">
                            <span>{opt.label}</span>
                            {isSelected && (
                              <div className="check-indicator">
                                <Check size={14} />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // 4. Pill Badges
            if (q.type === 'pills') {
              return (
                <div key={q.id} className="audit-q-block">
                  <label className="q-label">{q.label}</label>
                  <div className="pills-flex">
                    {q.options.map((opt) => {
                      const isSelected = val === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          className={`pill-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleSelectOption(q.id, opt.value)}
                        >
                          {isSelected && <Check size={14} className="text-primary" />}
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>

        {/* ── Wizard Navigation Controls ── */}
        <div className="wizard-nav-footer">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
            className="button secondary small-btn"
          >
            <ChevronLeft size={16} /> Previous
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="button small-btn flex items-center gap-2"
          >
            {currentStepIndex === AUDIT_STEPS.length - 1 ? (
              <>Calculate Full Report <Sparkles size={16} /></>
            ) : (
              <>Continue <ChevronRight size={16} /></>
            )}
          </button>
        </div>
      </div>

      {/* ── Secondary Route to Standard Device Form ── */}
      {onSwitchToStandardIntake && (
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={onSwitchToStandardIntake}
            className="text-xs text-muted hover:text-primary transition-colors inline-flex items-center gap-1.5"
          >
            <Smartphone size={13} /> Need physical hardware repair or device intake instead? Switch to standard intake form
          </button>
        </div>
      )}
    </div>
  );
}
