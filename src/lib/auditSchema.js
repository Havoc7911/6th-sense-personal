/**
 * auditSchema.js - Rapid-fire screening configuration & savings heuristics
 * Categories: Cloud/Streaming, AI Subscriptions, Tech Ecosystems, MVNOs,
 * Device Financing, Insurance, and Fintech.
 */

export const AUDIT_CATEGORIES = {
  MVNO: 'Mobile & Network Optimization',
  AI_TOOLS: 'AI & Productivity Subscriptions',
  ECOSYSTEM: 'Cloud & Tech Ecosystems',
  STREAMING: 'Digital Media & Streaming Bundles',
  HARDWARE: 'Device Financing & Hardware Strategy',
  INSURANCE: 'Device Protection & Warranty Optimization',
  FINTECH: 'Payment Processing & Autopay Cashback'
};

export const AUDIT_STEPS = [
  {
    id: 'telecom_mvno',
    title: 'Mobile Service & Wireless Network',
    subtitle: 'Screen for major carrier overpayment, legacy plan surcharges & alternative towers',
    questions: [
      {
        id: 'lines_count',
        type: 'stepper',
        label: 'How many cellular/mobile lines are on your current bill?',
        defaultValue: 1,
        min: 1,
        max: 10
      },
      {
        id: 'carrier_type',
        type: 'cards',
        label: 'What type of mobile service do you currently use?',
        options: [
          { 
            label: 'Major Postpaid Carrier (Unlimited Plan)', 
            sublabel: 'Billed monthly by a tier-1 legacy carrier',
            value: 'postpaid_major' 
          },
          { 
            label: 'Major Carrier (Older / Tiered Data Plan)', 
            sublabel: 'Legacy plan older than 2 years without recent promotions',
            value: 'postpaid_legacy' 
          },
          { 
            label: 'Independent MVNO / Prepaid Provider', 
            sublabel: 'Already on a budget or value carrier',
            value: 'mvno' 
          },
          { 
            label: 'Unsure / Multi-Service Bundle', 
            sublabel: 'Combined with home internet or business account',
            value: 'unsure' 
          }
        ]
      }
    ]
  },
  {
    id: 'ai_and_productivity',
    title: 'AI & Software Subscriptions',
    subtitle: 'Detect redundant AI model licenses, duplicate seats, and standalone productivity tools',
    questions: [
      {
        id: 'ai_tools',
        type: 'multi-select',
        label: 'Which premium generative AI subscriptions are currently active? (Select all that apply)',
        options: [
          { label: 'ChatGPT Plus ($20/mo)', value: 'chatgpt', monthlyCost: 20 },
          { label: 'Claude Pro ($20/mo)', value: 'claude', monthlyCost: 20 },
          { label: 'GitHub Copilot / Cursor ($10-$20/mo)', value: 'copilot', monthlyCost: 15 },
          { label: 'Midjourney / AI Image Suite ($10-$30/mo)', value: 'midjourney', monthlyCost: 15 },
          { label: 'Perplexity Pro / Search AI ($20/mo)', value: 'perplexity', monthlyCost: 20 },
          { label: 'None / Free Tiers Only', value: 'none', monthlyCost: 0 }
        ]
      }
    ]
  },
  {
    id: 'ecosystems_and_cloud',
    title: 'Cloud Storage & Tech Ecosystems',
    subtitle: 'Consolidate fragmented cloud drives, office suites, and family subscriptions',
    questions: [
      {
        id: 'cloud_storage_setup',
        type: 'cards',
        label: 'How do you handle personal cloud backups & storage across devices?',
        options: [
          { 
            label: 'Multiple Separate Cloud Plans', 
            sublabel: 'Paying separately for iCloud, Google Drive, and/or Microsoft OneDrive',
            value: 'fragmented' 
          },
          { 
            label: 'Single Consolidated Family Suite', 
            sublabel: 'Unified Apple One or Microsoft 365 Family plan',
            value: 'bundled' 
          },
          { 
            label: 'Individual 2TB+ Premium Tiers', 
            sublabel: 'High-capacity storage paid on individual personal accounts',
            value: 'individual_heavy' 
          },
          { 
            label: 'Free Baseline Tiers Only', 
            sublabel: 'Relying solely on free 5GB-15GB allocations',
            value: 'free' 
          }
        ]
      }
    ]
  },
  {
    id: 'streaming_and_media',
    title: 'Streaming & Digital Media Bundles',
    subtitle: 'Screen for unbundled entertainment subscriptions with hidden carrier perk credits',
    questions: [
      {
        id: 'streaming_bundles',
        type: 'cards',
        label: 'How do you currently pay for video and music streaming?',
        options: [
          { 
            label: '4+ Standalone Subscriptions (Netflix, Disney, Spotify, etc.)', 
            sublabel: 'Directly billed without carrier discounts or credit card perks',
            value: 'standalone_heavy' 
          },
          { 
            label: '2-3 Standalone Subscriptions', 
            sublabel: 'Directly billed individual monthly services',
            value: 'standalone_moderate' 
          },
          { 
            label: 'Bundled via Cellular / Credit Card Perks', 
            sublabel: 'Discounted or reimbursed through existing monthly perks',
            value: 'perks_optimized' 
          },
          { 
            label: 'Ad-Supported or Free Tiers Only', 
            sublabel: 'Minimal monthly media overhead',
            value: 'minimal' 
          }
        ]
      }
    ]
  },
  {
    id: 'hardware_and_financing',
    title: 'Device Financing & Carrier Installments',
    subtitle: 'Analyze monthly phone installments, trade-in lock-in, and interest terms',
    questions: [
      {
        id: 'financing_status',
        type: 'cards',
        label: 'Are your primary devices currently on 24–36 month carrier payment plans?',
        options: [
          { 
            label: 'Yes, Financing Multiple Devices on Carrier Bill', 
            sublabel: 'Paying $25-$45/mo installment fees per device',
            value: 'carrier_financed_multi' 
          },
          { 
            label: 'Yes, Financing 1 Device on Carrier Bill', 
            sublabel: 'Standard carrier installment plan',
            value: 'carrier_financed_single' 
          },
          { 
            label: 'No, Devices Fully Owned / Purchased Unlocked', 
            sublabel: 'Zero monthly hardware debt',
            value: 'owned' 
          }
        ]
      }
    ]
  },
  {
    id: 'insurance_and_warranties',
    title: 'Device Insurance & Extended Warranties',
    subtitle: 'Screen for overpriced carrier protection vs zero-cost credit card phone coverage',
    questions: [
      {
        id: 'insurance_coverage',
        type: 'pills',
        label: 'Do you pay for monthly insurance or device protection plans?',
        options: [
          { label: 'Carrier Protection ($15–$25/mo per phone)', value: 'carrier_protection' },
          { label: 'Manufacturer Care (AppleCare / Samsung Care)', value: 'oem_care' },
          { label: 'Third-Party Extended Store Warranty', value: 'store_warranty' },
          { label: 'No Monthly Insurance / Covered by Credit Card', value: 'none' }
        ]
      }
    ]
  },
  {
    id: 'fintech_and_rewards',
    title: 'Fintech & Autopay Cashback Yields',
    subtitle: 'Capture missed autopay discounts and cellular credit card protections',
    questions: [
      {
        id: 'bill_payment_method',
        type: 'cards',
        label: 'How do you currently pay your monthly tech, phone, and utility bills?',
        options: [
          { 
            label: 'Standard Credit Card (Without Carrier Auto-Pay Credits)', 
            sublabel: 'Missing the standard $10/line autopay discount',
            value: 'card_missing_autopay' 
          },
          { 
            label: 'Bank Checking Account / Debit Card Auto-Pay', 
            sublabel: 'Receiving autopay discount, but missing 3-5% category cashback or cell protection',
            value: 'checking_autopay' 
          },
          { 
            label: 'Optimized Cellular Protection / High-Yield Cashback Card', 
            sublabel: 'Already capturing both auto-pay discount and automatic cellular damage protection',
            value: 'fully_optimized' 
          }
        ]
      }
    ]
  }
];

/**
 * Calculates categorized estimated savings in general terms.
 * Avoids restricted specific provider names in the output categories.
 */
export function calculateAuditSavings(answers) {
  const breakdown = [];
  const lines = Number(answers.lines_count) || 1;

  // 1. Mobile & Network (MVNO vs Major Postpaid)
  if (answers.carrier_type === 'postpaid_major') {
    const monthly = lines * 35;
    breakdown.push({
      category: AUDIT_CATEGORIES.MVNO,
      monthly,
      annual: monthly * 12,
      insight: `Transitioning ${lines} line(s) to tier-1 high-speed network alternatives eliminates carrier franchise surcharges while retaining 5G priority network access.`
    });
  } else if (answers.carrier_type === 'postpaid_legacy') {
    const monthly = lines * 22;
    breakdown.push({
      category: AUDIT_CATEGORIES.MVNO,
      monthly,
      annual: monthly * 12,
      insight: `Legacy postpaid plans typically carry $15-$25/line premium surcharges compared to modernized shared data allotments and prioritized MVNO tiers.`
    });
  } else if (answers.carrier_type === 'unsure') {
    const monthly = lines * 15;
    breakdown.push({
      category: AUDIT_CATEGORIES.MVNO,
      monthly,
      annual: monthly * 12,
      insight: `Carrier line unbundling review identified potential rate-card reductions on active voice and cellular data lines.`
    });
  }

  // 2. AI & Productivity Subscriptions
  const aiList = (answers.ai_tools || []).filter(x => x !== 'none');
  if (aiList.length > 1) {
    const redundantCount = aiList.length - 1;
    const monthly = redundantCount * 20;
    breakdown.push({
      category: AUDIT_CATEGORIES.AI_TOOLS,
      monthly,
      annual: monthly * 12,
      insight: `Identified ${aiList.length} overlapping AI subscriptions. Consolidating into unified multi-model developer APIs or shared productivity suites eliminates duplicate monthly seats.`
    });
  }

  // 3. Cloud & Tech Ecosystems
  if (answers.cloud_storage_setup === 'fragmented') {
    breakdown.push({
      category: AUDIT_CATEGORIES.ECOSYSTEM,
      monthly: 16,
      annual: 192,
      insight: 'Consolidating isolated storage tiers across multiple providers into a single family ecosystem or hybrid local backup eliminates redundant subscription overhead.'
    });
  } else if (answers.cloud_storage_setup === 'individual_heavy') {
    breakdown.push({
      category: AUDIT_CATEGORIES.ECOSYSTEM,
      monthly: 10,
      annual: 120,
      insight: 'Re-allocating high-tier individual storage into annual family pools or local NAS archiving provides long-term cost containment.'
    });
  }

  // 4. Digital Media & Streaming Bundles
  if (answers.streaming_bundles === 'standalone_heavy') {
    breakdown.push({
      category: AUDIT_CATEGORIES.STREAMING,
      monthly: 28,
      annual: 336,
      insight: 'Consolidating 4+ standalone digital services through carrier perk subsidies and quarterly rotation captures up to 40% immediate rate reduction.'
    });
  } else if (answers.streaming_bundles === 'standalone_moderate') {
    breakdown.push({
      category: AUDIT_CATEGORIES.STREAMING,
      monthly: 14,
      annual: 168,
      insight: 'Activating bundled network provider streaming perks and family sharing pools recovers monthly recurring entertainment fees.'
    });
  }

  // 5. Device Financing Strategy
  if (answers.financing_status === 'carrier_financed_multi') {
    const monthly = 25 * Math.min(lines, 3);
    breakdown.push({
      category: AUDIT_CATEGORIES.HARDWARE,
      monthly,
      annual: monthly * 12,
      insight: 'Carrier 36-month bill-credit financing structures lock users into high-tier postpaid plans. Shifting to unlocked manufacturer financing or certified refurbished hardware frees lines for lower-cost networks.'
    });
  } else if (answers.financing_status === 'carrier_financed_single') {
    breakdown.push({
      category: AUDIT_CATEGORIES.HARDWARE,
      monthly: 20,
      annual: 240,
      insight: 'Payoff timing analysis and trade-in optimization can break carrier installment lock-in, enabling migration to value cellular networks.'
    });
  }

  // 6. Device Protection & Warranties
  if (answers.insurance_coverage === 'carrier_protection') {
    const monthly = 18 * Math.min(lines, 2);
    breakdown.push({
      category: AUDIT_CATEGORIES.INSURANCE,
      monthly,
      annual: monthly * 12,
      insight: 'Carrier monthly insurance carries high recurring fees and steep deductibles. Transitioning to zero-annual-fee credit card automatic cell protection saves up to $216/year per device.'
    });
  } else if (answers.insurance_coverage === 'store_warranty') {
    breakdown.push({
      category: AUDIT_CATEGORIES.INSURANCE,
      monthly: 12,
      annual: 144,
      insight: 'Third-party retailer warranties often overlap with statutory consumer rights and primary payment card protections.'
    });
  }

  // 7. Fintech, Autopay & Cashback
  if (answers.bill_payment_method === 'card_missing_autopay') {
    const monthly = 10 * lines;
    breakdown.push({
      category: AUDIT_CATEGORIES.FINTECH,
      monthly,
      annual: monthly * 12,
      insight: `Configuring compliant banking rails unlocks the standard $10/month per-line autopay credit ($${10 * lines}/mo for ${lines} line${lines > 1 ? 's' : ''}).`
    });
  } else if (answers.bill_payment_method === 'checking_autopay') {
    breakdown.push({
      category: AUDIT_CATEGORIES.FINTECH,
      monthly: 8,
      annual: 96,
      insight: 'Pairing specialized fintech bill-pay cards captures both carrier auto-pay rate discounts and 3%-5% recurring cash back yield.'
    });
  }

  const totalMonthly = breakdown.reduce((acc, curr) => acc + curr.monthly, 0);
  const totalAnnual = breakdown.reduce((acc, curr) => acc + curr.annual, 0);

  return {
    breakdown,
    totalMonthly,
    totalAnnual
  };
}
