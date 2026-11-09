import React, { useState, useEffect, useCallback, useId } from 'react';
import { 
  BadgePercent, 
  Plus, 
  UploadCloud, 
  Globe, 
  FileSpreadsheet, 
  FileText, 
  FileCheck, 
  Search, 
  Trash2, 
  Edit3, 
  ToggleLeft, 
  ToggleRight, 
  ExternalLink, 
  Download, 
  Paperclip, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  Clock,
  DollarSign,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  fetchAuditPrograms, 
  saveAuditProgram, 
  deleteAuditProgram, 
  bulkImportAuditPrograms, 
  parseTabularData, 
  parseWebOrTextContent,
  BENEFIT_TYPES, 
  PROGRAM_CATEGORIES,
  DEFAULT_PROGRAMS
} from '../../lib/auditPrograms';
import { extractTextFromPdf, readFileAsDataUrl } from '../../lib/pdfTextExtractor';
import './AuditProgramsConfig.css';

export default function AuditProgramsConfig() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [tcViewerFile, setTcViewerFile] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'TELECOM',
    inclusion_criteria: '',
    benefit_type: 'Monthly Discount',
    benefit_amount: '',
    timeframe: 'Ongoing Monthly',
    description: '',
    tc_notes: '',
    active: true,
    document: null
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Ingestion Modal State
  const [ingestTab, setIngestTab] = useState('web'); // 'web', 'table', 'pdf'
  const [webUrl, setWebUrl] = useState('');
  const [rawWebContent, setRawWebContent] = useState('');
  const [tabularText, setTabularText] = useState('');
  const [parsedCandidates, setParsedCandidates] = useState([]);
  const [selectedCandidateIdxs, setSelectedCandidateIdxs] = useState(new Set());
  const [ingesting, setIngesting] = useState(false);
  const [ingestError, setIngestError] = useState('');
  const [ingestSuccessMsg, setIngestSuccessMsg] = useState('');
  const singleTcInputId = useId();
  const pdfInputId = useId();
  const tabularInputId = useId();

  // Load programs
  const loadPrograms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAuditPrograms();
      setPrograms(data);
    } catch (err) {
      console.error('Failed to load programs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingProgram(null);
    setFormData({
      name: '',
      category: 'TELECOM',
      inclusion_criteria: '',
      benefit_type: 'Monthly Discount',
      benefit_amount: '',
      timeframe: 'Ongoing Monthly',
      description: '',
      tc_notes: '',
      active: true,
      document: null
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (prog) => {
    setEditingProgram(prog);
    setFormData({
      id: prog.id,
      name: prog.name || '',
      category: prog.category || 'TELECOM',
      inclusion_criteria: prog.inclusion_criteria || '',
      benefit_type: prog.benefit_type || 'Monthly Discount',
      benefit_amount: prog.benefit_amount || '',
      timeframe: prog.timeframe || 'Ongoing Monthly',
      description: prog.description || '',
      tc_notes: prog.tc_notes || '',
      active: prog.active !== false,
      document: prog.document || null,
      created_at: prog.created_at
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Toggle active status
  const handleToggleActive = async (prog) => {
    try {
      const updated = { ...prog, active: !prog.active };
      await saveAuditProgram(updated);
      setPrograms(prev => prev.map(p => p.id === prog.id ? updated : p));
    } catch (e) {
      alert('Failed to toggle status: ' + e.message);
    }
  };

  // Delete program
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await deleteAuditProgram(id);
      setPrograms(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      alert('Failed to delete program: ' + e.message);
    }
  };

  // Save Program (Create or Update)
  const handleSaveProgram = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Program Name is required.');
      return;
    }
    if (!formData.inclusion_criteria.trim()) {
      setFormError('Inclusion Criteria is required.');
      return;
    }
    if (!formData.benefit_amount.trim()) {
      setFormError('Benefit Amount is required (e.g. $10/line/mo, $30/mo, 15% off).');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const saved = await saveAuditProgram(formData);
      setIsEditModalOpen(false);
      await loadPrograms();
    } catch (err) {
      setFormError(err.message || 'Failed to save program.');
    } finally {
      setSaving(false);
    }
  };

  // Handle file attachment for T&C in the Add/Edit form
  const handleTcFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setFormData(prev => ({
        ...prev,
        document: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'application/pdf',
          uploadedAt: new Date().toISOString(),
          dataUrl
        }
      }));
    } catch (err) {
      alert('Could not attach file: ' + err.message);
    }
  };

  // Remove attached T&C document
  const handleRemoveTcFile = () => {
    setFormData(prev => ({ ...prev, document: null }));
  };

  // Ingestion: Web URL or Pasted Text
  const handleRunWebIngestion = async () => {
    setIngestError('');
    setIngestSuccessMsg('');
    setIngesting(true);
    setParsedCandidates([]);

    try {
      let contentToParse = rawWebContent.trim();

      // If URL is provided and content is empty, attempt to fetch
      if (webUrl.trim() && !contentToParse) {
        let fetchedText = '';
        try {
          const apiRes = await fetch('/api/ingest-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: webUrl.trim() })
          });
          if (apiRes.ok) {
            const data = await apiRes.json();
            fetchedText = data.html || '';
          }
        } catch {}

        if (!fetchedText) {
          try {
            const directRes = await fetch(webUrl.trim());
            if (directRes.ok) fetchedText = await directRes.text();
          } catch {}
        }

        if (fetchedText) {
          contentToParse = fetchedText;
        } else {
          setIngestError(
            'Direct browser cross-origin fetch was blocked by the remote website. Please copy/paste the article or webpage text directly into the "Raw Web Content / Text" box below.'
          );
          setIngesting(false);
          return;
        }
      }

      if (!contentToParse) {
        setIngestError('Please enter a URL or paste web page text/HTML to ingest.');
        setIngesting(false);
        return;
      }

      const extracted = parseWebOrTextContent(contentToParse, webUrl);
      if (extracted.length === 0) {
        setIngestError('No clear program or benefit offers could be extracted. Try pasting more descriptive text.');
      } else {
        setParsedCandidates(extracted);
        setSelectedCandidateIdxs(new Set(extracted.map((_, i) => i)));
      }
    } catch (err) {
      setIngestError(err.message || 'Web ingestion failed.');
    } finally {
      setIngesting(false);
    }
  };

  // Ingestion: Tabular Data (CSV / TSV / JSON)
  const handleRunTabularIngestion = (text) => {
    setIngestError('');
    setIngestSuccessMsg('');
    const content = text || tabularText;
    if (!content.trim()) {
      setIngestError('Please paste or upload tabular CSV, TSV, or JSON data.');
      return;
    }

    try {
      const parsed = parseTabularData(content);
      if (parsed.length === 0) {
        setIngestError('Could not identify valid tabular program rows. Check header format (Name, Inclusion Criteria, Benefit Type, Amount, Timeframe).');
      } else {
        setParsedCandidates(parsed);
        setSelectedCandidateIdxs(new Set(parsed.map((_, i) => i)));
      }
    } catch (err) {
      setIngestError('Error parsing table: ' + err.message);
    }
  };

  // Ingestion: Tabular File Upload
  const handleTabularFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result || '';
      setTabularText(text);
      handleRunTabularIngestion(text);
    };
    reader.readAsText(file);
  };

  // Ingestion: PDF File Upload & Extraction
  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIngesting(true);
    setIngestError('');
    setIngestSuccessMsg('');
    try {
      const extractedText = await extractTextFromPdf(file);
      if (!extractedText || extractedText.trim().length < 20) {
        setIngestError('Could not extract sufficient text from this PDF. It may be scanned or image-based.');
      } else {
        const parsed = parseWebOrTextContent(extractedText, file.name);
        if (parsed.length === 0) {
          setIngestError('Extracted PDF text did not match discount/benefit heuristics. Check file content.');
        } else {
          // Attach PDF as default document to all extracted items
          const dataUrl = await readFileAsDataUrl(file);
          const withDoc = parsed.map(p => ({
            ...p,
            document: {
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type || 'application/pdf',
              uploadedAt: new Date().toISOString(),
              dataUrl
            }
          }));
          setParsedCandidates(withDoc);
          setSelectedCandidateIdxs(new Set(withDoc.map((_, i) => i)));
        }
      }
    } catch (err) {
      setIngestError('Failed to process PDF: ' + err.message);
    } finally {
      setIngesting(false);
    }
  };

  // Import Selected Candidates into the system
  const handleImportSelected = async () => {
    const toImport = parsedCandidates.filter((_, idx) => selectedCandidateIdxs.has(idx));
    if (toImport.length === 0) {
      alert('Please select at least one program to import.');
      return;
    }

    setIngesting(true);
    try {
      await bulkImportAuditPrograms(toImport);
      setIngestSuccessMsg(`Successfully imported ${toImport.length} program(s) into your screening database!`);
      await loadPrograms();
      setTimeout(() => {
        setIsIngestModalOpen(false);
        setParsedCandidates([]);
        setIngestSuccessMsg('');
      }, 1400);
    } catch (err) {
      setIngestError('Failed to import programs: ' + err.message);
    } finally {
      setIngesting(false);
    }
  };

  // Reset to default curated programs
  const handleResetDefaults = async () => {
    if (window.confirm('Reset the programs database back to the factory-curated screening list? Custom items will be replaced.')) {
      try {
        localStorage.removeItem('6th_sense_audit_programs_v1');
        await loadPrograms();
      } catch (e) {
        alert('Reset failed: ' + e.message);
      }
    }
  };

  // Filtered programs calculation
  const filteredPrograms = programs.filter(p => {
    const matchesSearch = !search || 
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.inclusion_criteria?.toLowerCase().includes(search.toLowerCase()) ||
      p.benefit_amount?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && p.active !== false) || 
      (statusFilter === 'inactive' && p.active === false);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const activeCount = programs.filter(p => p.active !== false).length;
  const totalScreenableAnnualValue = programs
    .filter(p => p.active !== false)
    .reduce((acc, curr) => acc + (Number(curr.benefit_numeric) || 0), 0);

  return (
    <div className="audit-config-container animate-fade-in">
      {/* ── Top Header & Stats ── */}
      <div className="audit-config-header">
        <div>
          <h2 className="flex items-center gap-2 m-0 text-white font-bold">
            <BadgePercent size={26} className="text-primary" /> Cost-Saving Programs &amp; Credits Configuration
          </h2>
          <p className="text-muted text-sm mt-1 max-w-2xl">
            Configure specific programs, subsidies, carrier credits, and discounts to automatically screen clients for during Cost-Saving Audits.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button 
            type="button" 
            className="button secondary small-btn flex items-center gap-2"
            onClick={handleResetDefaults}
            title="Reset to factory defaults"
          >
            <RefreshCw size={15} /> Defaults
          </button>
          <button 
            type="button" 
            className="button secondary small-btn flex items-center gap-2"
            onClick={() => {
              setParsedCandidates([]);
              setIngestError('');
              setIngestSuccessMsg('');
              setIsIngestModalOpen(true);
            }}
          >
            <UploadCloud size={16} /> Ingest &amp; Import
          </button>
          <button 
            type="button" 
            className="button small-btn flex items-center gap-2"
            onClick={handleOpenAddModal}
          >
            <Plus size={16} /> New Program
          </button>
        </div>
      </div>

      {/* ── Overview Statistics Cards ── */}
      <div className="audit-stats-grid">
        <div className="audit-stat-card">
          <div className="audit-stat-icon">
            <BadgePercent size={20} />
          </div>
          <div>
            <span className="text-xs text-muted block uppercase tracking-wider font-semibold">Active Programs</span>
            <span className="text-xl font-bold font-mono text-white">{activeCount} / {programs.length}</span>
          </div>
        </div>

        <div className="audit-stat-card">
          <div className="audit-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            <DollarSign size={20} />
          </div>
          <div>
            <span className="text-xs text-muted block uppercase tracking-wider font-semibold">Max Screened Yield</span>
            <span className="text-xl font-bold font-mono text-emerald-400">
              ${totalScreenableAnnualValue.toLocaleString()} / yr
            </span>
          </div>
        </div>

        <div className="audit-stat-card">
          <div className="audit-stat-icon" style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9' }}>
            <Layers size={20} />
          </div>
          <div>
            <span className="text-xs text-muted block uppercase tracking-wider font-semibold">Active Categories</span>
            <span className="text-xl font-bold font-mono text-sky-400">
              {Object.keys(PROGRAM_CATEGORIES).length}
            </span>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="audit-filter-bar glass-panel p-3">
        <div className="search-bar" style={{ minWidth: '280px', flex: '1 1 300px' }}>
          <Search size={16} className="search-icon" />
          <input 
            type="text"
            className="form-input tech-search"
            placeholder="Search programs, inclusion criteria, benefits…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <select 
            className="form-input text-xs" 
            style={{ width: 'auto', padding: '0.4rem 0.75rem' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* ── Category Pills ── */}
      <div className="category-pills">
        <button
          type="button"
          className={`cat-pill ${selectedCategory === 'ALL' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('ALL')}
        >
          All Domains ({programs.length})
        </button>
        {Object.entries(PROGRAM_CATEGORIES).map(([catKey, label]) => {
          const count = programs.filter(p => p.category === catKey).length;
          return (
            <button
              key={catKey}
              type="button"
              className={`cat-pill ${selectedCategory === catKey ? 'active' : ''}`}
              onClick={() => setSelectedCategory(catKey)}
            >
              {label.split('(')[0].trim()} ({count})
            </button>
          );
        })}
      </div>

      {/* ── Programs Grid ── */}
      {loading ? (
        <div className="glass-panel p-8 text-center text-muted">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-primary" />
          Loading screening programs…
        </div>
      ) : filteredPrograms.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <AlertCircle size={36} className="mx-auto mb-3 text-muted" />
          <h3 className="text-lg font-bold text-white mb-1">No Programs Found</h3>
          <p className="text-muted text-sm max-w-md mx-auto mb-4">
            {search || selectedCategory !== 'ALL' 
              ? 'Try clearing your search or selecting a different category filter.' 
              : 'Start by creating your first screening program or importing an official list.'}
          </p>
          <div className="flex justify-center gap-3">
            <button type="button" className="button small-btn" onClick={handleOpenAddModal}>
              <Plus size={16} className="mr-1" /> Add Program
            </button>
            <button type="button" className="button secondary small-btn" onClick={() => setIsIngestModalOpen(true)}>
              <UploadCloud size={16} className="mr-1" /> Ingest From Web / File
            </button>
          </div>
        </div>
      ) : (
        <div className="programs-grid">
          {filteredPrograms.map((prog) => (
            <div 
              key={prog.id} 
              className={`program-card ${!prog.active ? 'inactive' : ''}`}
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-1">
                  <h3 className="text-base font-bold text-white m-0 leading-snug">
                    {prog.name}
                  </h3>
                  <button 
                    type="button" 
                    className="icon-button text-muted hover:text-primary"
                    onClick={() => handleToggleActive(prog)}
                    title={prog.active ? 'Deactivate Program' : 'Activate Program'}
                  >
                    {prog.active ? <ToggleRight size={26} className="text-primary" /> : <ToggleLeft size={26} />}
                  </button>
                </div>

                <div className="text-xs font-semibold text-muted mb-2">
                  {PROGRAM_CATEGORIES[prog.category] || prog.category}
                </div>

                {/* Badges: Benefit Type, Amount, Timeframe */}
                <div className="prog-badges">
                  <span className="badge-benefit-type">{prog.benefit_type}</span>
                  <span className="badge-amount">{prog.benefit_amount}</span>
                  <span className="badge-timeframe flex items-center gap-1">
                    <Clock size={11} /> {prog.timeframe}
                  </span>
                </div>

                {/* Inclusion Criteria block */}
                <div className="prog-criteria-box">
                  <strong className="text-white block mb-1 text-xs uppercase tracking-wider">
                    Inclusion Criteria:
                  </strong>
                  {prog.inclusion_criteria}
                </div>

                {/* Description or T&C Notes */}
                {prog.tc_notes && (
                  <p className="text-xs text-muted italic mt-1 line-clamp-2">
                    Terms: {prog.tc_notes}
                  </p>
                )}

                {/* Attached Official T&C file */}
                {prog.document && (
                  <div className="prog-tc-attachment">
                    <Paperclip size={14} />
                    <span className="truncate flex-1 font-medium">{prog.document.fileName}</span>
                    <button 
                      type="button" 
                      className="icon-button text-primary hover:underline text-xs"
                      onClick={() => setTcViewerFile(prog.document)}
                      title="View Official T&C"
                    >
                      View
                    </button>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="prog-footer">
                <span className="text-xs text-muted">
                  {prog.active ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      ● Active in Audits
                    </span>
                  ) : (
                    <span className="text-gray-500 font-semibold">○ Disabled</span>
                  )}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="button secondary square-btn"
                    style={{ padding: '6px' }}
                    onClick={() => handleOpenEditModal(prog)}
                    title="Edit Program Details"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    type="button"
                    className="button secondary square-btn text-rose-400 hover:text-rose-300"
                    style={{ padding: '6px' }}
                    onClick={() => handleDelete(prog.id, prog.name)}
                    title="Delete Program"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: Add / Edit Program ── */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-bold text-white m-0 flex items-center gap-2">
                <BadgePercent size={20} className="text-primary" />
                {editingProgram ? 'Edit Screening Program' : 'New Screening Program'}
              </h3>
              <button 
                type="button" 
                className="icon-button text-muted hover:text-white"
                onClick={() => setIsEditModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
                <AlertCircle size={16} /> {formError}
              </div>
            )}

            <form onSubmit={handleSaveProgram}>
              <div className="form-group mb-3">
                <label className="form-label">Program / Coupon / Credit Name *</label>
                <input 
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Federal Lifeline Internet Subsidy, Tier-1 Autopay Credit"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="form-group">
                  <label className="form-label">Category / Domain *</label>
                  <select 
                    className="form-input"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {Object.entries(PROGRAM_CATEGORIES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Benefit Type *</label>
                  <select 
                    className="form-input"
                    value={formData.benefit_type}
                    onChange={(e) => setFormData({ ...formData, benefit_type: e.target.value })}
                  >
                    {BENEFIT_TYPES.map(bt => (
                      <option key={bt} value={bt}>{bt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="form-group">
                  <label className="form-label">Benefit Amount *</label>
                  <input 
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. $10 / line / mo, $30 / mo, $150 Bill Credit"
                    value={formData.benefit_amount}
                    onChange={(e) => setFormData({ ...formData, benefit_amount: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Time-frame *</label>
                  <input 
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. Ongoing Monthly, 24 Months, One-Time"
                    value={formData.timeframe}
                    onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group mb-3">
                <label className="form-label">Inclusion Criteria *</label>
                <textarea 
                  className="form-input"
                  rows={3}
                  required
                  placeholder="Specific rules, income limits, eligible plans, student/veteran/assistance requirements to qualify the user…"
                  value={formData.inclusion_criteria}
                  onChange={(e) => setFormData({ ...formData, inclusion_criteria: e.target.value })}
                />
              </div>

              <div className="form-group mb-3">
                <label className="form-label">Official Terms &amp; Conditions / Policy Caveats</label>
                <textarea 
                  className="form-input"
                  rows={2}
                  placeholder="Official restrictions, recertification rules, provider disclaimers…"
                  value={formData.tc_notes}
                  onChange={(e) => setFormData({ ...formData, tc_notes: e.target.value })}
                />
              </div>

              {/* Official T&C File Upload */}
              <div className="form-group mb-4">
                <label className="form-label flex items-center justify-between">
                  <span>Official T&amp;C Document (PDF, DOC, TXT)</span>
                  {formData.document && (
                    <button 
                      type="button" 
                      className="text-xs text-rose-400 hover:underline"
                      onClick={handleRemoveTcFile}
                    >
                      Remove File
                    </button>
                  )}
                </label>

                {formData.document ? (
                  <div className="prog-tc-attachment p-3">
                    <Paperclip size={18} />
                    <div className="flex-1 truncate">
                      <strong className="block text-white text-xs truncate">{formData.document.fileName}</strong>
                      <span className="text-muted text-xs">{(formData.document.fileSize / 1024).toFixed(1)} KB</span>
                    </div>
                    <button 
                      type="button" 
                      className="button secondary small-btn"
                      onClick={() => setTcViewerFile(formData.document)}
                    >
                      Preview
                    </button>
                  </div>
                ) : (
                  <div>
                    <input 
                      type="file" 
                      id={singleTcInputId} 
                      className="hidden" 
                      accept=".pdf,.doc,.docx,.txt,image/*" 
                      onChange={handleTcFileChange}
                    />
                    <label 
                      htmlFor={singleTcInputId}
                      className="dropzone-box block"
                      style={{ padding: '1rem' }}
                    >
                      <Paperclip size={20} className="mx-auto mb-1 text-muted" />
                      <span className="text-xs text-muted block">Click to upload official program PDF or Terms &amp; Conditions</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <button 
                  type="button" 
                  className="button secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="button flex items-center gap-2"
                  disabled={saving}
                >
                  {saving ? 'Saving…' : editingProgram ? 'Save Changes' : 'Create Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Multi-Source Ingestion & Import ── */}
      {isIngestModalOpen && (
        <div className="modal-overlay" onClick={() => setIsIngestModalOpen(false)}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '820px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="text-lg font-bold text-white m-0 flex items-center gap-2">
                  <UploadCloud size={22} className="text-primary" /> Ingest &amp; Import Screening Programs
                </h3>
                <p className="text-muted text-xs mt-1">
                  Extract program names, inclusion criteria, benefit types, amounts, and timeframes automatically.
                </p>
              </div>
              <button 
                type="button" 
                className="icon-button text-muted hover:text-white"
                onClick={() => setIsIngestModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Ingestion Tabs */}
            <div className="tab-nav">
              <button 
                type="button" 
                className={`tab-btn ${ingestTab === 'web' ? 'active' : ''}`}
                onClick={() => setIngestTab('web')}
              >
                <Globe size={16} /> Website / Web Content
              </button>
              <button 
                type="button" 
                className={`tab-btn ${ingestTab === 'table' ? 'active' : ''}`}
                onClick={() => setIngestTab('table')}
              >
                <FileSpreadsheet size={16} /> Tabular (CSV / TSV / JSON)
              </button>
              <button 
                type="button" 
                className={`tab-btn ${ingestTab === 'pdf' ? 'active' : ''}`}
                onClick={() => setIngestTab('pdf')}
              >
                <FileText size={16} /> PDF Program Document
              </button>
            </div>

            {ingestError && (
              <div className="p-3 mb-4 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
                <AlertCircle size={16} /> {ingestError}
              </div>
            )}

            {ingestSuccessMsg && (
              <div className="p-3 mb-4 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2">
                <CheckCircle2 size={16} /> {ingestSuccessMsg}
              </div>
            )}

            {/* Tab 1: Web Ingestion */}
            {ingestTab === 'web' && (
              <div className="space-y-4">
                <div className="form-group mb-3">
                  <label className="form-label">Target Website URL (Optional)</label>
                  <input 
                    type="url"
                    className="form-input"
                    placeholder="https://example.com/carrier-discount-program"
                    value={webUrl}
                    onChange={(e) => setWebUrl(e.target.value)}
                  />
                </div>

                <div className="form-group mb-3">
                  <label className="form-label">
                    Pasted Web Article, HTML, or Program Description Text
                  </label>
                  <textarea 
                    className="form-input"
                    rows={5}
                    placeholder="Paste the promotion text, terms, or web page content here. The parser will automatically locate discounts, dollar figures, criteria, and durations…"
                    value={rawWebContent}
                    onChange={(e) => setRawWebContent(e.target.value)}
                  />
                </div>

                <button 
                  type="button" 
                  className="button flex items-center gap-2"
                  onClick={handleRunWebIngestion}
                  disabled={ingesting}
                >
                  <Sparkles size={16} /> {ingesting ? 'Analyzing Web Text…' : 'Extract Programs & Benefits'}
                </button>
              </div>
            )}

            {/* Tab 2: Tabular Ingestion */}
            {ingestTab === 'table' && (
              <div className="space-y-4">
                <div>
                  <input 
                    type="file" 
                    id={tabularInputId} 
                    className="hidden" 
                    accept=".csv,.tsv,.json,.txt" 
                    onChange={handleTabularFileUpload}
                  />
                  <label 
                    htmlFor={tabularInputId}
                    className="dropzone-box block mb-3"
                  >
                    <FileSpreadsheet size={28} className="mx-auto mb-2 text-primary" />
                    <strong className="block text-white text-sm mb-1">Click to Upload CSV, TSV, or JSON File</strong>
                    <span className="text-xs text-muted">Supports spreadsheet exports containing program columns</span>
                  </label>
                </div>

                <div className="form-group mb-3">
                  <label className="form-label">Or Paste Delimited Table / JSON Text</label>
                  <textarea 
                    className="form-input font-mono text-xs"
                    rows={5}
                    placeholder="Name, Inclusion Criteria, Benefit Type, Benefit Amount, Timeframe, Category&#10;ACP Subsidy, Low-income or SNAP recipient, Monthly Discount, $30/mo, Ongoing Monthly, ASSISTANCE"
                    value={tabularText}
                    onChange={(e) => setTabularText(e.target.value)}
                  />
                </div>

                <button 
                  type="button" 
                  className="button flex items-center gap-2"
                  onClick={() => handleRunTabularIngestion()}
                >
                  <FileCheck size={16} /> Parse Tabular Data
                </button>
              </div>
            )}

            {/* Tab 3: PDF Document Ingestion */}
            {ingestTab === 'pdf' && (
              <div className="space-y-4">
                <div>
                  <input 
                    type="file" 
                    id={pdfInputId} 
                    className="hidden" 
                    accept=".pdf" 
                    onChange={handlePdfUpload}
                  />
                  <label 
                    htmlFor={pdfInputId}
                    className="dropzone-box block"
                  >
                    <FileText size={32} className="mx-auto mb-2 text-primary" />
                    <strong className="block text-white text-sm mb-1">Upload Official PDF Schedule or Brochure</strong>
                    <span className="text-xs text-muted block mb-2">
                      Extracts text streams and attaches the PDF as the official verified Terms &amp; Conditions file.
                    </span>
                    <span className="button secondary small-btn inline-flex">Browse PDF</span>
                  </label>
                </div>
              </div>
            )}

            {/* Parsed Candidates Preview Table */}
            {parsedCandidates.length > 0 && (
              <div className="mt-6 pt-4 border-t border-white/10">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-white m-0">
                    Extracted Candidate Programs ({parsedCandidates.length})
                  </h4>
                  <div className="text-xs text-muted">
                    {selectedCandidateIdxs.size} selected for import
                  </div>
                </div>

                <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th style={{ width: '32px' }}>
                          <input 
                            type="checkbox"
                            checked={selectedCandidateIdxs.size === parsedCandidates.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCandidateIdxs(new Set(parsedCandidates.map((_, i) => i)));
                              } else {
                                setSelectedCandidateIdxs(new Set());
                              }
                            }}
                          />
                        </th>
                        <th>Program Name</th>
                        <th>Benefit &amp; Timeframe</th>
                        <th>Inclusion Criteria</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedCandidates.map((cand, idx) => (
                        <tr key={idx}>
                          <td>
                            <input 
                              type="checkbox"
                              checked={selectedCandidateIdxs.has(idx)}
                              onChange={(e) => {
                                const next = new Set(selectedCandidateIdxs);
                                if (e.target.checked) next.add(idx);
                                else next.delete(idx);
                                setSelectedCandidateIdxs(next);
                              }}
                            />
                          </td>
                          <td>
                            <strong className="text-white block">{cand.name}</strong>
                            <span className="text-xs text-muted">{cand.benefit_type}</span>
                          </td>
                          <td>
                            <span className="text-emerald-400 font-mono font-semibold block">{cand.benefit_amount}</span>
                            <span className="text-xs text-muted">{cand.timeframe}</span>
                          </td>
                          <td className="text-xs text-gray-300 max-w-xs truncate">
                            {cand.inclusion_criteria}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-white/10">
                  <button 
                    type="button" 
                    className="button secondary"
                    onClick={() => setParsedCandidates([])}
                  >
                    Clear
                  </button>
                  <button 
                    type="button" 
                    className="button flex items-center gap-2"
                    onClick={handleImportSelected}
                    disabled={ingesting || selectedCandidateIdxs.size === 0}
                  >
                    <CheckCircle2 size={16} /> Import Selected ({selectedCandidateIdxs.size})
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: View Attached Official T&C ── */}
      {tcViewerFile && (
        <div className="modal-overlay" onClick={() => setTcViewerFile(null)}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-base font-bold text-white m-0 flex items-center gap-2 truncate">
                <Paperclip size={18} className="text-primary" /> {tcViewerFile.fileName}
              </h3>
              <div className="flex items-center gap-2">
                {tcViewerFile.dataUrl && (
                  <a 
                    href={tcViewerFile.dataUrl} 
                    download={tcViewerFile.fileName}
                    className="button secondary small-btn flex items-center gap-1"
                  >
                    <Download size={14} /> Download
                  </a>
                )}
                <button 
                  type="button" 
                  className="icon-button text-muted hover:text-white"
                  onClick={() => setTcViewerFile(null)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-4 bg-black/40 rounded-lg text-center">
              {tcViewerFile.fileType?.includes('pdf') ? (
                <iframe 
                  src={tcViewerFile.dataUrl} 
                  title="Official T&C Document" 
                  className="w-full h-96 rounded border border-white/10" 
                />
              ) : tcViewerFile.fileType?.includes('image') ? (
                <img 
                  src={tcViewerFile.dataUrl} 
                  alt="Official T&C" 
                  className="max-h-96 mx-auto rounded"
                />
              ) : (
                <div className="p-8 text-muted">
                  <FileText size={48} className="mx-auto mb-2 text-primary" />
                  <p className="text-sm">Official Document on File: {tcViewerFile.fileName}</p>
                  <a 
                    href={tcViewerFile.dataUrl} 
                    download={tcViewerFile.fileName}
                    className="button small-btn inline-flex mt-3"
                  >
                    <Download size={15} className="mr-1" /> Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
