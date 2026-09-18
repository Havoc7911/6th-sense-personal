import { getSupabase } from '../lib/supabase';
import { getServicePricing } from '../lib/services';

export const BACKEND_NOT_CONFIGURED = 'BACKEND_NOT_CONFIGURED';

export function assertSupabase() {
  const sb = getSupabase();
  if (!sb) {
    const err = new Error('Supabase is not configured');
    err.code = BACKEND_NOT_CONFIGURED;
    throw err;
  }
  return sb;
}

export async function insertQuote(row) {
  const sb = assertSupabase();
  const { data, error } = await sb.from('quotes').insert({
    name: row.name,
    email: row.email,
    phone: row.phone,
    service: row.service,
    request_type: row.request_type || 'quote',
    device_type: row.device_type || null,
    brand: row.brand || null,
    model: row.model || null,
    os: row.os || null,
    priority: row.priority || 'Normal',
    preferred_contact: row.preferred_contact || 'Email',
    status: 'Pending',
    snap_medicaid: row.snap_medicaid || null,
    hardship_financing: row.hardship_financing || false,
    hardship_details: row.hardship_details || null,
    description: row.description,
    eligible_for_unlock: row.eligible_for_unlock || false,
    ticket_code: row.ticket_code || null,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateQuote(quoteId, updates) {
  const sb = assertSupabase();
  const { data, error } = await sb.from('quotes').update(updates).eq('id', quoteId).select().single();
  if (error) throw error;
  return data;
}

export async function convertQuoteToTicket(quote, ticketCode) {
  const payload = {
    name: quote.name,
    email: quote.email,
    phone: quote.phone,
    job_type: quote.service || null,
    service: quote.service || null,
    device_type: quote.device_type || 'Unknown',
    brand: quote.brand || 'Unknown',
    os: quote.os || 'Unknown',
    snap_medicaid: quote.snap_medicaid || null,
    hardship_financing: quote.hardship_financing || false,
    hardship_details: quote.hardship_details || null,
    eligible_for_unlock: quote.eligible_for_unlock || false,
    notes: `Converted from Information Request (${quote.ticket_code || ''}). Original Description: ${quote.description || ''}`,
    credentials: [],
    status: 'Pending',
    priority: quote.priority || 'Normal',
    ticket_code: ticketCode,
  };
  
  const ticket = await insertTicket(payload);
  await updateQuote(quote.id, { status: 'Converted', accepted_at: new Date().toISOString() });
  
  // Log the authorization
  try {
    await insertTicketEvent(ticket.id, 'Client Authorization', 'Quote/estimate accepted. Work Authorized');
  } catch (e) { console.error('Failed to log authorization', e); }
  
  return ticket;
}

export async function insertTicket(row) {
  const sb = assertSupabase();
  const serviceTarget = row.service || row.job_type;
  
  let initialInvoiceStatus = 'Estimate. Not final.';
  let initialInvoiceItems = [];

  if (serviceTarget) {
    const matchedService = getServicePricing(serviceTarget);
    if (matchedService) {
      if (typeof matchedService.price === 'string' && matchedService.price.includes('/hr')) {
        initialInvoiceStatus = 'Awaiting Consult for Estimate.';
        initialInvoiceItems = [{ description: matchedService.title, qty: 1, price: matchedService.price }];
      } else {
        initialInvoiceStatus = 'Estimate. Not final.';
        initialInvoiceItems = [{ description: matchedService.title, qty: 1, price: matchedService.price }];
      }
      
      if (row.priority === 'Urgent') {
        const isHourly = typeof matchedService.price === 'string' && matchedService.price.includes('/hr');
        const surchargeTitle = 'Urgent Priority Service Charge';
        const surchargePrice = isHourly ? '$15/hr' : '$50';
        initialInvoiceItems.push({ description: surchargeTitle, qty: 1, price: surchargePrice });
      }
    } else if (row.priority === 'Urgent') {
       initialInvoiceItems.push({ description: 'Urgent Priority Service Charge', qty: 1, price: '$50' });
    }
  } else if (row.priority === 'Urgent') {
     initialInvoiceItems.push({ description: 'Urgent Priority Service Charge', qty: 1, price: '$50' });
  }

  // Explicit field mapping to prevent stray fields from causing insert errors
  const { data, error } = await sb.from('tickets').insert({
    name: row.name,
    email: row.email,
    phone: row.phone,
    job_type: row.job_type || serviceTarget || '',
    service: serviceTarget || null,
    device_type: row.device_type || 'Unknown',
    brand: row.brand || 'Unknown',
    os: row.os || 'Unknown',
    imei: row.imei || null,
    iccid: row.iccid || null,
    provider: row.provider || null,
    snap_medicaid: row.snap_medicaid || null,
    hardship_financing: row.hardship_financing || false,
    hardship_details: row.hardship_details || null,
    notes: row.notes || null,
    credentials: row.credentials || [],
    status: row.status || 'Pending',
    priority: row.priority || 'Normal',
    eligible_for_unlock: row.eligible_for_unlock || false,
    ticket_code: row.ticket_code || null,
    invoice_status: row.invoice_status || initialInvoiceStatus,
    invoice_items: initialInvoiceItems,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function fetchAllTickets() {
  const sb = assertSupabase();
  const { data, error } = await sb
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchAllQuotes() {
  const sb = assertSupabase();
  const { data, error } = await sb
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchTicketsByEmail(email) {
  const sb = assertSupabase();
  const normalized = email.trim().toLowerCase();
  const { data, error } = await sb
    .from('tickets')
    .select('*')
    .eq('email', normalized)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchQuotesByEmail(email) {
  const sb = assertSupabase();
  const normalized = email.trim().toLowerCase();
  const { data, error } = await sb
    .from('quotes')
    .select('*')
    .eq('email', normalized)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ── Code-based lookups (public, no auth required) ─────────────────────────

export async function fetchQuoteByCode(code) {
  const sb = assertSupabase();
  const { data, error } = await sb
    .from('quotes')
    .select('*')
    .eq('ticket_code', code.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchTicketByCode(code) {
  const sb = assertSupabase();
  const { data, error } = await sb
    .from('tickets')
    .select('*')
    .eq('ticket_code', code.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function lookupByCode(code) {
  const normalized = code.trim().toUpperCase();
  // Try tickets first, then quotes
  const ticket = await fetchTicketByCode(normalized);
  if (ticket) return { type: 'ticket', data: ticket };
  const quote = await fetchQuoteByCode(normalized);
  if (quote) return { type: 'quote', data: quote };
  return null;
}

// ── Status/field updates ──────────────────────────────────────────────────

export async function updateTicketStatus(ticketId, status) {
  const sb = assertSupabase();
  const { error } = await sb.from('tickets').update({ status }).eq('id', ticketId);
  if (error) throw error;
}

export async function updateTicketPriority(ticketId, priority) {
  const sb = assertSupabase();
  const { error } = await sb.from('tickets').update({ priority }).eq('id', ticketId);
  if (error) throw error;
}

export async function updateTicketAccepted(ticketId) {
  const sb = assertSupabase();
  const { data, error } = await sb
    .from('tickets')
    .update({ accepted_at: new Date().toISOString(), status: 'Authorized' })
    .eq('id', ticketId)
    .select()
    .single();
  if (error) throw error;

  // Log the authorization
  try {
    await insertTicketEvent(ticketId, 'Client Authorization', 'Quote/estimate accepted. Work Authorized');
  } catch (e) { console.error('Failed to log authorization', e); }

  return data;
}

export async function updateTicketSummary(ticketId, summary) {
  const sb = assertSupabase();
  const { data, error } = await sb
    .from('tickets')
    .update({ summary })
    .eq('id', ticketId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTicket(ticketId) {
  const sb = assertSupabase();
  const { error } = await sb.from('tickets').delete().eq('id', ticketId);
  if (error) throw error;
}

export async function deleteQuote(quoteId) {
  const sb = assertSupabase();
  const { error } = await sb.from('quotes').delete().eq('id', quoteId);
  if (error) throw error;
}

export async function updateTicketInfo(ticketId, payload) {
  const sb = assertSupabase();
  const { data, error } = await sb
    .from('tickets')
    .update(payload)
    .eq('id', ticketId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markMagicLinkRequested(email) {
  const sb = assertSupabase();
  const normalized = email.trim().toLowerCase();
  const { error } = await sb
    .from('tickets')
    .update({ magic_link_requested: true })
    .eq('email', normalized);
  if (error) throw error;
}

// ─── Ticket Events ───────────────────────────────────────────────────────

export async function fetchTicketEvents(ticketId) {
  const sb = assertSupabase();
  const { data, error } = await sb
    .from('ticket_events')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function insertTicketEvent(ticketId, eventType, note) {
  const sb = assertSupabase();
  const { data, error } = await sb
    .from('ticket_events')
    .insert({ ticket_id: ticketId, event_type: eventType, note })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTicketEvent(eventId, updates) {
  const sb = assertSupabase();
  const { data, error } = await sb
    .from('ticket_events')
    .update(updates)
    .eq('id', eventId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTicketEvent(eventId) {
  const sb = assertSupabase();
  const { error } = await sb
    .from('ticket_events')
    .delete()
    .eq('id', eventId);
  if (error) throw error;
}

// ─── Ticket Files ────────────────────────────────────────────────────────

export async function fetchTicketFiles(ticketId) {
  const sb = assertSupabase();
  const { data, error } = await sb
    .from('ticket_files')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function uploadTicketFile(ticketId, file) {
  const sb = assertSupabase();
  const ext = file.name.split('.').pop();
  const path = `${ticketId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await sb.storage
    .from('ticket-attachments')
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (uploadError) throw uploadError;

  const { data: urlData } = sb.storage.from('ticket-attachments').getPublicUrl(path);

  const { data, error } = await sb
    .from('ticket_files')
    .insert({ ticket_id: ticketId, file_name: file.name, storage_path: urlData.publicUrl })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Messages ────────────────────────────────────────────────────────────

export async function fetchMessages(ticketId) {
  const sb = assertSupabase();
  const { data, error } = await sb
    .from('messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function insertMessage({ ticketId, sender, text, isTech }) {
  const sb = assertSupabase();
  const { data, error } = await sb
    .from('messages')
    .insert({
      ticket_id: ticketId,
      sender,
      text,
      is_tech: isTech,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Promotions ──────────────────────────────────────────────────────────

export async function fetchAllPromotions() {
  const sb = assertSupabase();
  const { data, error } = await sb.from('promotions').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function insertPromotion(row) {
  const sb = assertSupabase();
  const { data, error } = await sb.from('promotions').insert({
    title: row.title,
    description: row.description,
    code: row.code || null,
    active: row.active !== false,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updatePromotion(id, updates) {
  const sb = assertSupabase();
  const { data, error } = await sb.from('promotions').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deletePromotion(id) {
  const sb = assertSupabase();
  const { error } = await sb.from('promotions').delete().eq('id', id);
  if (error) throw error;
}

// ─── Subscriptions ───────────────────────────────────────────────────────

export function subscribeQuotes(onChange) {
  const sb = getSupabase();
  if (!sb) return () => {};
  const channel = sb
    .channel('public:quotes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, onChange)
    .subscribe();
  return () => {
    sb.removeChannel(channel);
  };
}

export function subscribeTickets(onChange) {
  const sb = getSupabase();
  if (!sb) return () => {};
  const channel = sb
    .channel('public:tickets')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, onChange)
    .subscribe();
  return () => {
    sb.removeChannel(channel);
  };
}

export function subscribeMessages(ticketId, onInsert) {
  const sb = getSupabase();
  if (!sb || !ticketId) return () => {};
  const channel = sb
    .channel(`public:messages:${ticketId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `ticket_id=eq.${ticketId}`,
      },
      (payload) => onInsert(payload.new)
    )
    .subscribe();
  return () => {
    sb.removeChannel(channel);
  };
}

// ─── Invoice Generation (client-side print) ──────────────────────────────

export function generateInvoicePrint(ticket, runtimeEstimate) {
  const invoiceNumber = `INV-${ticket.displayId || ticket.id?.slice(0, 8).toUpperCase()}`;
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const deviceInfo = [ticket.intake?.brand, ticket.intake?.deviceType].filter(Boolean).join(' - ');

  // Extract payment details if recorded
  let payment = ticket.invoicePayment || null;
  const rawItems = ticket.invoiceItems || [];
  const paymentItem = rawItems.find(it => it.__isPayment || it.isPayment);
  if (paymentItem && !payment) {
    payment = {
      name: paymentItem.name || paymentItem.payerName,
      paymentType: paymentItem.paymentType || paymentItem.type,
      account: paymentItem.account,
      amount: paymentItem.amount,
      date: paymentItem.date
    };
  }

  // Filter out any metadata/payment records from billable line items
  let items = rawItems.filter(it => !it.__isPayment && !it.isPayment);
  if (items.length === 0) {
    items = [{ 
      description: ticket.service || ticket.intake?.service || 'Tech Support Services', 
      qty: 1, 
      price: runtimeEstimate ? `$${parseFloat(runtimeEstimate).toFixed(2)}` : 'TBD' 
    }];
  }

  let subtotal = 0;
  let hasPendingOrHourly = false;

  const itemsHtml = items.map(item => {
    let lineTotalDisplay = 'TBD';
    const isNegative = String(item.price || '').includes('-') || String(item.description || '').toLowerCase().includes('discount');
    const cleanPrice = String(item.price || '').replace(/[^0-9.]/g, '');
    let numPrice = parseFloat(cleanPrice);
    
    if (!isNaN(numPrice) && !String(item.price).includes('/hr')) {
      if (isNegative && numPrice > 0) numPrice = -numPrice;
      const qty = parseFloat(item.qty) || 1;
      const lineTotal = numPrice * qty;
      subtotal += lineTotal;
      if (lineTotal < 0) {
        lineTotalDisplay = `-$${Math.abs(lineTotal).toFixed(2)}`;
      } else {
        lineTotalDisplay = '$' + lineTotal.toFixed(2);
      }
    } else {
      hasPendingOrHourly = true;
    }

    const isDiscountRow = isNegative || (typeof lineTotalDisplay === 'string' && lineTotalDisplay.startsWith('-'));

    return `
      <tr style="${isDiscountRow ? 'color: #166534; font-weight: 500;' : ''}">
        <td>${item.description}</td>
        <td>${item.qty || 1}</td>
        <td>${item.price || 'TBD'}</td>
        <td class="amount-col" style="${isDiscountRow ? 'color: #166534; font-weight: 600;' : ''}">${lineTotalDisplay}</td>
      </tr>
    `;
  }).join('');

  const totalDisplay = hasPendingOrHourly ? 'TBD' : '$' + Math.max(0, subtotal).toFixed(2);
  const safeInvoiceStatus = ticket.invoiceStatus || 'Estimate. Not final.';

  let amountPaid = 0;
  if (payment && payment.amount) {
    const cleanAmt = String(payment.amount).replace(/[^0-9.]/g, '');
    const numAmt = parseFloat(cleanAmt);
    if (!isNaN(numAmt)) amountPaid = numAmt;
  }
  const balanceDue = Math.max(0, subtotal - amountPaid);
  const isPaidInFull = (amountPaid >= subtotal && subtotal > 0) || safeInvoiceStatus === 'Paid In Full';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; padding: 48px; }
    .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; border-bottom: 3px solid #ff6b00; padding-bottom: 24px; }
    .brand { font-size: 26px; font-weight: 800; color: #ff6b00; letter-spacing: -0.5px; }
    .brand span { color: #1e293b; }
    .invoice-meta { text-align: right; }
    .invoice-meta h2 { font-size: 22px; font-weight: 700; color: #1e293b; }
    .invoice-meta p { font-size: 13px; color: #64748b; margin-top: 4px; }
    .section { margin-bottom: 32px; }
    .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 10px; font-weight: 600; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
    .field-label { font-size: 12px; color: #94a3b8; margin-bottom: 2px; }
    .field-value { font-size: 15px; font-weight: 500; color: #1e293b; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    thead th { background: #f1f5f9; padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600; }
    tbody td { padding: 16px; border-bottom: 1px solid #e2e8f0; }
    .total-row { background: #f8fafc; }
    .total-row td { font-weight: 700; font-size: 16px; color: #1e293b; }
    .amount-col { text-align: right; }
    .payment-box { margin-top: 28px; padding: 18px 22px; background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; }
    .payment-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px dashed #bbf7d0; padding-bottom: 8px; }
    .payment-badge { background: #15803d; color: #fff; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 4px; text-transform: uppercase; }
    .payment-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 16px; }
    .status-row { margin-top: 28px; padding: 16px 20px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; color: #166534; font-size: 14px; }
    .status-row.estimate { background: #fffbeb; border-color: #fde68a; color: #92400e; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="invoice-header">
    <div>
      <div class="brand">6th <span>Sense</span> Personal</div>
      <p style="font-size:13px; color:#64748b; margin-top:6px;">Confluence, PA</p>
      <p style="font-size:13px; color:#64748b;">(724) 780-3223</p>
    </div>
    <div class="invoice-meta">
      <h2>Invoice</h2>
      <p>${invoiceNumber}</p>
      <p>Date: ${today}</p>
      <p style="margin-top: 8px; font-weight: 600; color: #ff6b00;">Status: ${safeInvoiceStatus}</p>
    </div>
  </div>

  <div class="two-col section">
    <div>
      <p class="section-title">Bill To</p>
      <div class="field-value">${ticket.client || ticket.name || '-'}</div>
      <div class="field-label" style="margin-top:6px;">${ticket.email || '-'}</div>
      <div class="field-label">${ticket.phone || '-'}</div>
    </div>
    <div>
      <p class="section-title">Device & Service</p>
      <div class="field-value">${deviceInfo || '-'}</div>
      <div class="field-label" style="margin-top:4px;">${ticket.service || ticket.job_type || 'General Support'}</div>
      ${ticket.intake?.os ? `<div class="field-label">${ticket.intake.os}</div>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th class="amount-col">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="3">Total Amount</td>
        <td class="amount-col">${totalDisplay}</td>
      </tr>
    </tfoot>
  </table>

  ${payment ? `
    <div class="payment-box">
      <div class="payment-header">
        <span style="font-weight: 700; color: #166534; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Payment & Settlement Details</span>
        <span class="payment-badge">${isPaidInFull ? 'Paid in Full' : 'Payment Recorded'}</span>
      </div>
      <div class="payment-grid">
        <div>
          <div class="field-label">Payer Name</div>
          <div class="field-value" style="font-size: 14px;">${payment.name || ticket.client || '-'}</div>
        </div>
        <div>
          <div class="field-label">Payment Method</div>
          <div class="field-value" style="font-size: 14px; font-weight: 600; color: #15803d;">${payment.paymentType || 'Card'}</div>
        </div>
        <div>
          <div class="field-label">Card / Account ID</div>
          <div class="field-value" style="font-size: 14px; font-family: monospace;">${payment.account || '—'}</div>
        </div>
        <div>
          <div class="field-label">Amount Paid</div>
          <div class="field-value" style="font-size: 14px; font-weight: 700; color: #166534;">$${amountPaid.toFixed(2)}</div>
        </div>
      </div>
      ${balanceDue > 0.01 && !isPaidInFull ? `
        <div style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed #bbf7d0; font-size: 13px; font-weight: 600; color: #b45309; display: flex; justify-content: space-between;">
          <span>Remaining Balance Due:</span>
          <span>$${balanceDue.toFixed(2)}</span>
        </div>
      ` : ''}
    </div>
  ` : ''}

  ${!isPaidInFull && safeInvoiceStatus !== 'Paid In Full' ? `<div class="status-row estimate">ℹ Current Invoice Status: <strong>${safeInvoiceStatus}</strong></div>` : ''}
  ${ticket.raw?.accepted_at ? `<div class="status-row">✔ Service authorized by client on ${new Date(ticket.raw.accepted_at).toLocaleDateString()}</div>` : ''}

  <div class="footer">
    Thank you for choosing 6th Sense Personal. Payment is due upon completion of service.<br/>
    Questions? Call (724) 780-3223 or email jmcc5271@gmail.com
  </div>

  <script>window.print();</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

// ─── Branded Service Summary Generation (client-side print/save) ───────────

export function generateServiceSummaryPrint(ticket, summaryText, events = []) {
  const summaryRef = `SUM-${ticket.ticket_code || ticket.displayId || ticket.id?.slice(0, 8).toUpperCase()}`;
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const deviceInfo = [ticket.intake?.brand, ticket.intake?.deviceType].filter(Boolean).join(' - ') || 'Device Service';

  // Section parsing from summaryText
  const cleanSummary = String(summaryText || '').trim();
  
  let serviceLogText = '';
  let outcomeText = '';
  let recsText = '';
  let issuesText = '';

  const logMatch = cleanSummary.match(/Service Log:\s*([\s\S]*?)(?=(Outcome:|Follow-Up Recommendations:|Issues Addressed:|$))/i);
  if (logMatch) serviceLogText = logMatch[1].trim();

  const outcomeMatch = cleanSummary.match(/Outcome:\s*([\s\S]*?)(?=(Follow-Up Recommendations:|Issues Addressed:|$))/i);
  if (outcomeMatch) outcomeText = outcomeMatch[1].trim();

  const recsMatch = cleanSummary.match(/Follow-Up Recommendations:\s*([\s\S]*?)(?=(Issues Addressed:|$))/i);
  if (recsMatch) recsText = recsMatch[1].trim();

  const issuesMatch = cleanSummary.match(/Issues Addressed:\s*([\s\S]*?)$/i);
  if (issuesMatch) issuesText = issuesMatch[1].trim();

  // If sections weren't split cleanly via regex, format from events
  const outcomeEvents = events.filter(e => e.event_type === 'Outcome' || e.event_type === 'Resolution');
  const recEvents = events.filter(e => e.event_type === 'Recommendations');
  const workEvents = events.filter(e => 
    e.event_type !== 'Outcome' && 
    e.event_type !== 'Resolution' && 
    e.event_type !== 'Recommendations'
  );

  const displayOutcome = outcomeText || (outcomeEvents.length 
    ? outcomeEvents.map(e => e.note.replace(/\[Summary\]\s*/g, '')).join('\n') 
    : 'All requested service procedures and diagnostics were completed successfully.');

  const displayRecs = recsText || (recEvents.length 
    ? recEvents.map(e => e.note.replace(/\[Summary\]\s*/g, '')).join('\n') 
    : 'Maintain regular data backups and update passwords and software periodically.');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Service Summary - ${summaryRef}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; padding: 48px; line-height: 1.6; }
    .report-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; border-bottom: 3px solid #ff6b00; padding-bottom: 24px; }
    .brand { font-size: 26px; font-weight: 800; color: #ff6b00; letter-spacing: -0.5px; }
    .brand span { color: #1e293b; }
    .report-meta { text-align: right; }
    .report-meta h2 { font-size: 22px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; }
    .report-meta p { font-size: 13px; color: #64748b; margin-top: 4px; }
    .badge { display: inline-block; background: rgba(255, 107, 0, 0.1); color: #ff6b00; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 6px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
    .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 8px; font-weight: 700; }
    .field-label { font-size: 12px; color: #94a3b8; }
    .field-value { font-size: 15px; font-weight: 600; color: #1e293b; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
    .card.outcome { background: #f0fdf4; border-color: #86efac; }
    .card.recs { background: #faf5ff; border-color: #d8b4fe; }
    .card-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
    .card.outcome .card-title { color: #15803d; }
    .card.recs .card-title { color: #7e22ce; }
    .card-body { font-size: 14px; color: #334155; white-space: pre-line; line-height: 1.7; }
    .log-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
    .log-table th { background: #f1f5f9; padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; }
    .log-table td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    .event-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: #e2e8f0; color: #475569; }
    .signoff-section { margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
    .signature-line { margin-top: 36px; border-top: 1px solid #94a3b8; width: 80%; padding-top: 6px; font-size: 12px; color: #64748b; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="report-header">
    <div>
      <div class="brand">6th <span>Sense</span> Personal</div>
      <p style="font-size:13px; color:#64748b; margin-top:6px;">Technical Support &amp; IT Consulting</p>
      <p style="font-size:13px; color:#64748b;">Confluence, PA • (724) 780-3223 • jmcc5271@gmail.com</p>
    </div>
    <div class="report-meta">
      <h2>Service Summary</h2>
      <p>${summaryRef}</p>
      <p>Completion Date: ${today}</p>
      <span class="badge">Verified Completion</span>
    </div>
  </div>

  <div class="two-col">
    <div>
      <p class="section-title">Client Information</p>
      <div class="field-value">${ticket.client || ticket.name || '-'}</div>
      <div class="field-label" style="margin-top:4px;">${ticket.email || '-'}</div>
      <div class="field-label">${ticket.phone || '-'}</div>
    </div>
    <div>
      <p class="section-title">Device &amp; Service</p>
      <div class="field-value">${ticket.service || ticket.job_type || 'Tech Support'}</div>
      <div class="field-label" style="margin-top:4px;">${deviceInfo}</div>
      ${ticket.intake?.imei ? `<div class="field-label" style="font-family:monospace;">IMEI: ${ticket.intake.imei}</div>` : ''}
    </div>
  </div>

  <!-- Outcome & Resolution -->
  <div class="card outcome">
    <div class="card-title">✔ Service Outcome &amp; Resolution</div>
    <div class="card-body">${displayOutcome}</div>
  </div>

  <!-- Follow-Up Recommendations -->
  <div class="card recs">
    <div class="card-title">💡 Follow-Up Recommendations &amp; Advice</div>
    <div class="card-body">${displayRecs}</div>
  </div>

  <!-- Service Log & Actions -->
  <div class="card">
    <div class="card-title" style="color: #0284c7;">📋 Service Log &amp; Actions Performed</div>
    ${workEvents.length > 0 ? `
      <table class="log-table">
        <thead>
          <tr>
            <th style="width: 140px;">Type</th>
            <th>Details</th>
            <th style="width: 120px;">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          ${workEvents.map(e => `
            <tr>
              <td><span class="event-tag">${e.event_type}</span></td>
              <td>${e.note.replace(/\[Summary\]\s*/g, '')}</td>
              <td style="color:#64748b; font-size:12px;">${new Date(e.created_at).toLocaleDateString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : `
      <div class="card-body">${serviceLogText || 'All diagnostic steps, hardware/software procedures, and configurations were performed according to industry standards.'}</div>
    `}
  </div>

  <div class="signoff-section">
    <div>
      <div class="section-title">Serviced By</div>
      <div style="font-size: 14px; font-weight: 600; color: #1e293b;">6th Sense Personal Technical Support</div>
      <div class="field-label">Confluence, PA</div>
      <div class="signature-line">Technician Signature / Date</div>
    </div>
    <div>
      <div class="section-title">Client Confirmation</div>
      <div style="font-size: 14px; font-weight: 600; color: #1e293b;">${ticket.client || ticket.name || 'Client'}</div>
      <div class="field-label">${ticket.email || ''}</div>
      <div class="signature-line">Client Signature / Acknowledgement</div>
    </div>
  </div>

  <div class="footer">
    6th Sense Personal • Premium Tech Support, Device Repairs, and IT Consulting • Confluence, PA<br/>
    For assistance or follow-up consultations, call (724) 780-3223 or visit 6th-sense-personal.vercel.app
  </div>

  <script>window.print();</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

