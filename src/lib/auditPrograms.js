/**
 * auditPrograms.js
 * Back-end configuration, storage, ingestion, and screening engine
 * for programs, coupons, and credits evaluated during Cost-Saving Audits.
 */

import { getSupabase } from './supabase.js';

export const BENEFIT_TYPES = [
  'Monthly Discount',
  'Bill Credit',
  'Cash Back / Rebate',
  'Fee Waiver',
  'Equipment Subsidy',
  'Plan Optimization',
  'One-Time Incentive',
  'Service Upgrade'
];

export const PROGRAM_CATEGORIES = {
  TELECOM: 'Mobile & Network (MVNO / Carrier)',
  ASSISTANCE: 'Government & Digital Equity Assistance',
  AI_TOOLS: 'AI & Productivity Subscriptions',
  ECOSYSTEM: 'Cloud & Tech Ecosystems',
  STREAMING: 'Streaming & Digital Media Bundles',
  HARDWARE: 'Device Financing & Hardware Strategy',
  INSURANCE: 'Device Protection & Warranties',
  FINTECH: 'Fintech & Autopay Cashback',
  OTHER: 'General Discounts & Perks'
};

export const DEFAULT_PROGRAMS = [
  {
    id: 'prog-autopay-credit',
    name: 'Tier-1 Carrier Autopay & Paperless Billing Credit',
    category: 'TELECOM',
    inclusion_criteria: 'Active postpaid mobile or home internet account enrolled in automatic billing using an ACH checking account, debit card, or branded carrier card.',
    benefit_type: 'Monthly Discount',
    benefit_amount: '$10 / line / mo',
    benefit_numeric: 120, // annual per line
    timeframe: 'Ongoing Monthly',
    description: 'Eliminates standard $10/line manual payment surcharge across Verizon, AT&T, and T-Mobile by transitioning billing rails to compliant debit or ACH mechanisms.',
    tc_notes: 'Requires paperless billing activation. Credit typically applies within 1-2 billing cycles. Standard credit cards forfeit the $10 discount on most tier-1 carriers.',
    active: true,
    document: null,
    created_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'prog-lifeline-equity',
    name: 'Federal Lifeline & Digital Equity Assistance',
    category: 'ASSISTANCE',
    inclusion_criteria: 'Household income at or below 135% of the Federal Poverty Guidelines, or participation in Medicaid, SNAP, SSI, Section 8, or Federal Pell Grant.',
    benefit_type: 'Monthly Discount',
    benefit_amount: '$9.25 - $30.00 / mo',
    benefit_numeric: 240,
    timeframe: 'Ongoing Monthly',
    description: 'Federal subsidy applying monthly credits toward qualifying broadband, wireline, or cellular voice and data packages.',
    tc_notes: 'Limited to one benefit per economic household. Recertification required annually via the National Verifier portal.',
    active: true,
    document: null,
    created_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'prog-military-veteran',
    name: 'Carrier Military, Veteran & First Responder Advantage',
    category: 'TELECOM',
    inclusion_criteria: 'Active military, veterans (DD-214/NGB-22), military spouses, law enforcement officers, EMTs, and career/volunteer firefighters verified via ID.me.',
    benefit_type: 'Monthly Discount',
    benefit_amount: '15% - 25% Off / $10-$25 / mo',
    benefit_numeric: 240,
    timeframe: 'Ongoing Monthly',
    description: 'Direct rate-card discount on qualified multi-line unlimited rate plans, plus waived device activation and upgrade fees.',
    tc_notes: 'Primary account holder must verify credentials through ID.me or military email address. Does not stack with certain corporate affinity plans.',
    active: true,
    document: null,
    created_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'prog-mvno-migration',
    name: 'High-Speed Priority MVNO Rate Optimization',
    category: 'TELECOM',
    inclusion_criteria: 'Customer owns phones unlocked or has remaining balance under $150, monthly high-speed cellular usage under 35GB per line, and coverage verified on target tower network.',
    benefit_type: 'Plan Optimization',
    benefit_amount: '$35.00 - $60.00 / line / mo',
    benefit_numeric: 480,
    timeframe: 'Ongoing Monthly',
    description: 'Migrating lines from legacy $80/mo tier-1 postpaid plans to tier-1 prepaid/MVNO networks (e.g. US Mobile, Mint, Visible) sharing identical priority 5G towers.',
    tc_notes: 'Device must be SIM-unlocked. E-SIM migration completes within minutes. Keep primary carrier active until port-out number PIN completes.',
    active: true,
    document: null,
    created_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'prog-card-insurance',
    name: 'Zero-Annual-Fee Credit Card Cellular Protection',
    category: 'INSURANCE',
    inclusion_criteria: 'Paying entire monthly cellular provider bill with an eligible credit card offering automatic cellular wireless telephone protection (e.g. Wells Fargo Autograph, Chase Freedom Flex, Bilt, Capital One).',
    benefit_type: 'Fee Waiver',
    benefit_amount: '$15 - $25 / line / mo ($180 - $300 / yr)',
    benefit_numeric: 216,
    timeframe: 'Ongoing Monthly',
    description: 'Canceling redundant carrier protection ($18/mo per phone) and relying on credit card automatic protection covering theft and accidental damage up to $600-$800/claim with low $25-$50 deductible.',
    tc_notes: 'Entire bill must be paid on the card every month. Coverage begins the first day of the month following bill payment. Maximum 2 claims per rolling 12-month period.',
    active: true,
    document: null,
    created_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'prog-cloud-family-pool',
    name: 'Unified Cloud Storage & Family Suite Consolidation',
    category: 'ECOSYSTEM',
    inclusion_criteria: 'Household with 2+ members paying individually for standalone cloud storage (iCloud+, Google One, OneDrive) or productivity suites.',
    benefit_type: 'Plan Optimization',
    benefit_amount: '$14.00 - $30.00 / mo',
    benefit_numeric: 216,
    timeframe: 'Ongoing Monthly',
    description: 'Consolidating fragmented storage tiers into unified Apple One Premier or Microsoft 365 Family plan sharing 2TB+ storage and 6 user seats.',
    tc_notes: 'Requires setting up Apple Family Sharing or Microsoft Family Safety group. Existing standalone subscriptions cancel upon bundle activation.',
    active: true,
    document: null,
    created_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'prog-ai-consolidation',
    name: 'Multi-Model AI Tool Consolidation & API Rotation',
    category: 'AI_TOOLS',
    inclusion_criteria: 'Active personal or small-business subscription to two or more $20/month AI consumer subscriptions (e.g. ChatGPT Plus and Claude Pro and Perplexity Pro).',
    benefit_type: 'Monthly Discount',
    benefit_amount: '$20.00 - $40.00 / mo',
    benefit_numeric: 240,
    timeframe: 'Ongoing Monthly',
    description: 'Consolidating duplicate $20/mo chat subscriptions into unified API developer pay-as-you-go keys or single flagship subscription with multi-model web tools.',
    tc_notes: 'Pay-as-you-go API usage typically costs $2-$5/month for identical workloads compared to $20/mo fixed monthly consumer seat pricing.',
    active: true,
    document: null,
    created_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'prog-student-perks',
    name: 'Accredited Higher-Education Student Software Bundle',
    category: 'ASSISTANCE',
    inclusion_criteria: 'Student or educator currently enrolled at a Title IV accredited higher-education institution with an active .edu email address.',
    benefit_type: 'Monthly Discount',
    benefit_amount: '$10.00 - $20.00 / mo ($150 / yr)',
    benefit_numeric: 150,
    timeframe: '12 Months (Renewable)',
    description: 'Accessing official student verification rates for Spotify Premium + Hulu ($5.99/mo bundle), YouTube Premium ($7.99/mo), and GitHub Student Developer Pack.',
    tc_notes: 'Requires annual SheerID or UNiDAYS verification. Valid for up to 4 consecutive years of post-secondary study.',
    active: true,
    document: null,
    created_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'prog-fintech-cashback',
    name: 'Specialized 5% Utility & Telecom Cashback Routing',
    category: 'FINTECH',
    inclusion_criteria: 'Monthly recurring cell phone, home internet, and streaming bills exceeding $100/mo.',
    benefit_type: 'Cash Back / Rebate',
    benefit_amount: '$8.00 - $18.00 / mo',
    benefit_numeric: 120,
    timeframe: 'Ongoing Monthly',
    description: 'Routing recurring utility and telecom accounts through no-annual-fee high-yield cards (e.g. US Bank Cash+ selecting Home Utilities/Cellular at 5% cash back).',
    tc_notes: 'Select categories quarterly. Combine with carriers that permit credit card autopay discounts, or use specialized debit cashback cards for strict ACH carriers.',
    active: true,
    document: null,
    created_at: '2026-01-01T00:00:00.000Z'
  }
];

const LOCAL_STORAGE_KEY = '6th_sense_audit_programs_v1';

/**
 * Load all audit programs from Supabase table or fallback to localStorage / defaults.
 */
export async function fetchAuditPrograms() {
  try {
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb
        .from('audit_programs')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        // Cache in localStorage
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        } catch {}
        return data;
      }
    }
  } catch (err) {
    console.warn('Supabase audit_programs fetch error, falling back to local storage:', err?.message);
  }

  // Fallback to local storage
  try {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading audit_programs from local storage:', err);
  }

  // Seed default programs if none exist
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_PROGRAMS));
  } catch {}
  return DEFAULT_PROGRAMS;
}

/**
 * Save (insert or update) an audit program.
 */
export async function saveAuditProgram(program) {
  const currentPrograms = await fetchAuditPrograms();
  const now = new Date().toISOString();
  
  const programData = {
    ...program,
    id: program.id || `prog-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    name: (program.name || 'Untitled Program').trim(),
    inclusion_criteria: (program.inclusion_criteria || '').trim(),
    benefit_type: program.benefit_type || 'Monthly Discount',
    benefit_amount: (program.benefit_amount || '$0').trim(),
    benefit_numeric: Number(program.benefit_numeric) || extractNumericBenefit(program.benefit_amount),
    timeframe: (program.timeframe || 'Ongoing Monthly').trim(),
    category: program.category || 'TELECOM',
    description: (program.description || '').trim(),
    tc_notes: (program.tc_notes || '').trim(),
    active: program.active !== false,
    document: program.document || null,
    updated_at: now
  };

  if (!program.created_at) {
    programData.created_at = now;
  }

  // Try saving to Supabase
  let savedToDb = false;
  try {
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb
        .from('audit_programs')
        .upsert(programData)
        .select()
        .single();
      if (!error && data) {
        savedToDb = true;
      }
    }
  } catch (e) {
    console.warn('Could not upsert program to Supabase, saving locally:', e?.message);
  }

  // Always update local cache
  const existingIdx = currentPrograms.findIndex(p => p.id === programData.id);
  let updatedList;
  if (existingIdx >= 0) {
    updatedList = [...currentPrograms];
    updatedList[existingIdx] = programData;
  } else {
    updatedList = [programData, ...currentPrograms];
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
  } catch {}

  return programData;
}

/**
 * Delete an audit program by ID.
 */
export async function deleteAuditProgram(id) {
  try {
    const sb = getSupabase();
    if (sb) {
      await sb.from('audit_programs').delete().eq('id', id);
    }
  } catch (e) {
    console.warn('Could not delete from Supabase:', e?.message);
  }

  const currentPrograms = await fetchAuditPrograms();
  const filtered = currentPrograms.filter(p => p.id !== id);
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  } catch {}
  return true;
}

/**
 * Bulk insert or import a list of programs.
 */
export async function bulkImportAuditPrograms(newProgramsList) {
  if (!Array.isArray(newProgramsList) || newProgramsList.length === 0) return [];
  const current = await fetchAuditPrograms();
  const now = new Date().toISOString();

  const formatted = newProgramsList.map((prog, idx) => ({
    ...prog,
    id: prog.id || `prog-import-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
    name: (prog.name || `Imported Program #${idx + 1}`).trim(),
    inclusion_criteria: (prog.inclusion_criteria || 'Inclusion criteria pending review.').trim(),
    benefit_type: prog.benefit_type || 'Monthly Discount',
    benefit_amount: (prog.benefit_amount || '$0').trim(),
    benefit_numeric: Number(prog.benefit_numeric) || extractNumericBenefit(prog.benefit_amount),
    timeframe: (prog.timeframe || 'Ongoing Monthly').trim(),
    category: prog.category || 'OTHER',
    description: (prog.description || '').trim(),
    tc_notes: (prog.tc_notes || '').trim(),
    active: prog.active !== false,
    document: prog.document || null,
    created_at: now,
    updated_at: now
  }));

  // Try bulk upsert to Supabase
  try {
    const sb = getSupabase();
    if (sb) {
      await sb.from('audit_programs').upsert(formatted);
    }
  } catch (e) {
    console.warn('Bulk upsert to Supabase skipped:', e?.message);
  }

  // Prepend to current programs and deduplicate by name
  const existingNames = new Set(current.map(p => p.name.toLowerCase()));
  const filteredNew = formatted.filter(p => !existingNames.has(p.name.toLowerCase()));
  const combined = [...filteredNew, ...current];

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(combined));
  } catch {}

  return formatted;
}

/**
 * Extracts a numeric yearly dollar value from a benefit amount string.
 */
export function extractNumericBenefit(amountStr) {
  if (!amountStr) return 0;
  const str = String(amountStr);
  const match = str.match(/\$?\s*([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  if (isNaN(num)) return 0;

  const lower = str.toLowerCase();
  if (lower.includes('/yr') || lower.includes('/year') || lower.includes('annual')) {
    return num;
  }
  if (lower.includes('/mo') || lower.includes('/month') || lower.includes('monthly') || lower.includes('/line')) {
    return num * 12;
  }
  return num;
}

/**
 * Parse tabular data (CSV, TSV, or JSON) into structured programs.
 */
export function parseTabularData(content) {
  if (!content || !content.trim()) return [];
  const trimmed = content.trim();

  // Try parsing JSON first
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(item => normalizeProgramFields(item));
      }
    } catch {}
  }

  // Otherwise parse CSV or TSV
  const lines = trimmed.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Detect delimiter
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;

  let delimiter = ',';
  if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';
  else if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';

  const parseLine = (text) => {
    // Basic CSV cell extraction respecting quotes
    const regex = new RegExp(`(?:^|${delimiter})(?:"([^"]*(?:""[^"]*)*)"|([^"${delimiter}]*))`, 'g');
    const cells = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      let cell = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
      cells.push((cell || '').trim());
      if (regex.lastIndex === match.index) regex.lastIndex++;
    }
    return cells;
  };

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 0 || values.every(v => !v)) continue;

    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] || '';
    });

    // Map common header variations
    const name = rowObj.name || rowObj.program || rowObj.programname || rowObj.title || rowObj.discount || values[0];
    const criteria = rowObj.inclusioncriteria || rowObj.criteria || rowObj.eligibility || rowObj.requirements || rowObj.qualification || values[1] || '';
    const benefitType = rowObj.benefittype || rowObj.type || rowObj.category || values[2] || 'Monthly Discount';
    const amount = rowObj.benefitamount || rowObj.amount || rowObj.value || rowObj.savings || values[3] || '$0';
    const timeframe = rowObj.timeframe || rowObj.duration || rowObj.period || rowObj.term || values[4] || 'Ongoing Monthly';
    const category = rowObj.category || 'OTHER';

    if (name) {
      results.push({
        name,
        inclusion_criteria: criteria || 'Eligible based on program guidelines.',
        benefit_type: benefitType,
        benefit_amount: amount,
        timeframe,
        category: mapCategory(category),
        active: true
      });
    }
  }

  return results;
}

/**
 * Parses freeform website text, HTML, or scraped promotion blocks
 * into structured benefit programs.
 */
export function parseWebOrTextContent(content, sourceUrl = '') {
  if (!content) return [];
  const text = content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const candidatePrograms = [];

  // Patterns for discounts, dollars, credits, savings
  const dollarRegex = /\$\s*(\d+(?:\.\d{2})?)\s*(?:\/|\s+per|\s+a)?\s*(mo|month|line|yr|year|bill|credit)?/i;
  const percentRegex = /(\d+%\s*(?:off|discount|cashback|cash\s*back))/i;

  let currentBlock = [];
  const flushBlock = (blockLines) => {
    if (blockLines.length === 0) return;
    const blockText = blockLines.join(' ');
    const dollarMatch = blockText.match(dollarRegex);
    const percentMatch = blockText.match(percentRegex);

    if (dollarMatch || percentMatch || /discount|benefit|eligible|credit|rebate|subsidy|promo/i.test(blockText)) {
      // Pick best line for name
      const titleLine = blockLines.find(l => l.length > 5 && l.length < 80 && !l.includes('http')) || blockLines[0];
      const amount = dollarMatch ? dollarMatch[0] : (percentMatch ? percentMatch[0] : 'Varies');
      
      let benefitType = 'Monthly Discount';
      if (/credit/i.test(blockText)) benefitType = 'Bill Credit';
      else if (/cashback|cash back|rebate/i.test(blockText)) benefitType = 'Cash Back / Rebate';
      else if (/waiver|waived/i.test(blockText)) benefitType = 'Fee Waiver';
      else if (/subsidy/i.test(blockText)) benefitType = 'Monthly Discount';

      let timeframe = 'Ongoing Monthly';
      if (/one-time|one time|initial/i.test(blockText)) timeframe = 'One-Time Incentive';
      else if (/24\s*month|36\s*month/i.test(blockText)) timeframe = '24-36 Months';
      else if (/annual|year/i.test(blockText)) timeframe = 'Annual';

      // Look for criteria in the block
      const criteriaLines = blockLines.filter(l => 
        /require|eligible|eligibility|qualif|criteria|enroll|must\s*be|household/i.test(l)
      );
      const criteria = criteriaLines.length > 0 ? criteriaLines.join(' ') : blockText.slice(0, 200);

      candidatePrograms.push({
        name: titleLine.replace(/^[-•*#\d.]+\s*/, ''),
        inclusion_criteria: criteria || 'Verify program participation and terms.',
        benefit_type: benefitType,
        benefit_amount: amount,
        timeframe,
        category: detectCategory(blockText),
        description: `Ingested from ${sourceUrl || 'web source'}. Raw summary: ${blockText.slice(0, 150)}...`,
        active: true
      });
    }
  };

  // Group text into sections based on empty lines or bullet headers
  for (const line of lines) {
    if (/^[#*•-]|\b(program|discount|offer|credit|tier|benefit)\b/i.test(line) && currentBlock.length > 2) {
      flushBlock(currentBlock);
      currentBlock = [line];
    } else {
      currentBlock.push(line);
      if (currentBlock.length > 8) {
        flushBlock(currentBlock);
        currentBlock = [];
      }
    }
  }
  flushBlock(currentBlock);

  // Fallback: If nothing was detected, make a single candidate out of the content
  if (candidatePrograms.length === 0 && lines.length > 0) {
    candidatePrograms.push({
      name: lines[0].slice(0, 60),
      inclusion_criteria: lines.slice(1, 4).join(' ') || 'General terms & conditions apply.',
      benefit_type: 'Monthly Discount',
      benefit_amount: 'Review Pending',
      timeframe: 'Ongoing Monthly',
      category: 'OTHER',
      description: `Ingested from ${sourceUrl || 'source'}`,
      active: true
    });
  }

  // Deduplicate by name
  const seen = new Set();
  return candidatePrograms.filter(p => {
    const key = p.name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Screen a user's audit answers against the active programs list.
 * Returns matched programs with explanation of why the user qualified.
 */
export function screenUserAgainstPrograms(answers = {}, programs = []) {
  const activePrograms = (programs || []).filter(p => p.active !== false);
  const matched = [];
  const linesCount = Number(answers.lines_count) || 1;

  for (const prog of activePrograms) {
    let qualifies = false;
    let matchReason = '';
    const id = (prog.id || '').toLowerCase();
    const cat = (prog.category || '').toUpperCase();
    const name = (prog.name || '').toLowerCase();
    const criteria = (prog.inclusion_criteria || '').toLowerCase();

    // 1. Autopay program
    if (id.includes('autopay') || name.includes('autopay') || criteria.includes('autopay')) {
      if (answers.bill_payment_method === 'card_missing_autopay') {
        qualifies = true;
        matchReason = `User is currently paying with a credit card that does not capture carrier autopay credits. Configuring ACH or compliant debit captures ${prog.benefit_amount} across ${linesCount} line(s).`;
      }
    }

    // 2. Government / Assistance / Lifeline
    if (cat === 'ASSISTANCE' || name.includes('lifeline') || criteria.includes('snap') || criteria.includes('medicaid')) {
      const subsidies = Array.isArray(answers.subsidies) ? answers.subsidies : [];
      if (subsidies.some(s => /snap|medicaid|ssi|pell/i.test(s)) || answers.snap_medicaid) {
        qualifies = true;
        matchReason = `User indicated enrollment in income-qualified assistance programs (SNAP/Medicaid/SSI), satisfying primary inclusion criteria.`;
      }
    }

    // 3. Military / Veteran
    if (name.includes('military') || name.includes('veteran') || criteria.includes('veteran')) {
      if (answers.veteranStatus === 'Yes' || answers.isVeteran) {
        qualifies = true;
        matchReason = `User indicated military or veteran status, qualifying for tier-1 carrier affinity discounts.`;
      }
    }

    // 4. Student
    if (name.includes('student') || criteria.includes('student')) {
      if (answers.isStudent === 'Yes' || answers.student) {
        qualifies = true;
        matchReason = `User indicated student enrollment, qualifying for verified education software and streaming tiers.`;
      }
    }

    // 5. MVNO / Tower Migration
    if (cat === 'TELECOM' && (name.includes('mvno') || name.includes('migration') || name.includes('alternative'))) {
      if (answers.carrier_type === 'postpaid_major' || answers.carrier_type === 'postpaid_legacy') {
        qualifies = true;
        matchReason = `User currently pays high-tier postpaid rates on ${linesCount} line(s). Retaining 5G towers via prioritized MVNO captures direct savings.`;
      }
    }

    // 6. Device Insurance / Credit Card Protection
    if (cat === 'INSURANCE' || name.includes('insurance') || name.includes('protection') || name.includes('warranty')) {
      if (answers.insurance_coverage === 'carrier_protection' || answers.insurance_coverage === 'store_warranty') {
        qualifies = true;
        matchReason = `User pays monthly carrier/retailer protection ($15-$25/mo per phone). Transitioning to credit card wireless protection recovers recurring fees.`;
      }
    }

    // 7. Cloud & Ecosystems
    if (cat === 'ECOSYSTEM' || name.includes('cloud') || name.includes('family')) {
      if (answers.cloud_storage_setup === 'fragmented' || answers.cloud_storage_setup === 'individual_heavy') {
        qualifies = true;
        matchReason = `User has fragmented cloud subscriptions across multiple standalone plans. Consolidating into a unified suite provides instant savings.`;
      }
    }

    // 8. AI Tools
    if (cat === 'AI_TOOLS' || name.includes('ai') || criteria.includes('chatgpt')) {
      const aiList = (answers.ai_tools || []).filter(x => x !== 'none');
      if (aiList.length > 1) {
        qualifies = true;
        matchReason = `User has ${aiList.length} overlapping AI subscriptions (${aiList.join(', ')}). Consolidating seats eliminates redundant overhead.`;
      }
    }

    // 9. Fintech Cashback
    if (cat === 'FINTECH' || name.includes('cashback') || name.includes('cash back')) {
      if (answers.bill_payment_method !== 'fully_optimized') {
        qualifies = true;
        matchReason = `User bills are not currently routed through high-yield 5% utility/telecom cash back rails.`;
      }
    }

    if (qualifies) {
      matched.push({
        ...prog,
        matchReason,
        estimatedYearlyValue: prog.benefit_numeric || extractNumericBenefit(prog.benefit_amount)
      });
    }
  }

  // If no automatic matches hit, include the top active general programs as recommendations
  if (matched.length === 0 && activePrograms.length > 0) {
    const topThree = activePrograms.slice(0, 3);
    topThree.forEach(p => {
      matched.push({
        ...p,
        matchReason: 'General tech ecosystem optimization program recommended for audit review.',
        estimatedYearlyValue: p.benefit_numeric || extractNumericBenefit(p.benefit_amount)
      });
    });
  }

  return matched;
}

function normalizeProgramFields(item) {
  return {
    name: item.name || item.title || 'Untitled Program',
    inclusion_criteria: item.inclusion_criteria || item.criteria || item.eligibility || 'Standard terms apply.',
    benefit_type: item.benefit_type || item.type || 'Monthly Discount',
    benefit_amount: item.benefit_amount || item.amount || '$0',
    timeframe: item.timeframe || item.duration || 'Ongoing Monthly',
    category: mapCategory(item.category),
    active: item.active !== false,
    tc_notes: item.tc_notes || item.terms || '',
    description: item.description || ''
  };
}

function detectCategory(text) {
  const t = text.toLowerCase();
  if (t.includes('snap') || t.includes('medicaid') || t.includes('lifeline') || t.includes('fcc') || t.includes('subsidy')) return 'ASSISTANCE';
  if (t.includes('phone') || t.includes('mobile') || t.includes('carrier') || t.includes('verizon') || t.includes('t-mobile') || t.includes('att') || t.includes('cellular')) return 'TELECOM';
  if (t.includes('ai') || t.includes('chatgpt') || t.includes('claude') || t.includes('copilot') || t.includes('software')) return 'AI_TOOLS';
  if (t.includes('cloud') || t.includes('icloud') || t.includes('google one') || t.includes('onedrive') || t.includes('apple one')) return 'ECOSYSTEM';
  if (t.includes('stream') || t.includes('netflix') || t.includes('spotify') || t.includes('disney') || t.includes('hulu')) return 'STREAMING';
  if (t.includes('device') || t.includes('trade-in') || t.includes('hardware') || t.includes('iphone') || t.includes('samsung')) return 'HARDWARE';
  if (t.includes('insurance') || t.includes('applecare') || t.includes('warranty') || t.includes('protection')) return 'INSURANCE';
  if (t.includes('card') || t.includes('cashback') || t.includes('autopay') || t.includes('bank') || t.includes('checking')) return 'FINTECH';
  return 'OTHER';
}

function mapCategory(cat) {
  if (!cat) return 'OTHER';
  const c = String(cat).toUpperCase();
  if (PROGRAM_CATEGORIES[c]) return c;
  for (const [key, val] of Object.entries(PROGRAM_CATEGORIES)) {
    if (val.toUpperCase().includes(c) || key.includes(c)) return key;
  }
  return 'OTHER';
}
