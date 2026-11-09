/**
 * Vercel Serverless Function: /api/notify-tech
 * Sends real-time notifications (email / SMS gateway) to the technician
 * for new service tickets, info/quote requests, and client messages.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, title, message, ticketCode, clientName, clientEmail, clientPhone } = req.body || {};

    const techEmail = process.env.TECH_NOTIFY_EMAIL || 'jmcc5271@gmail.com';
    const techPhone = process.env.TECH_NOTIFY_PHONE || '7247803223';
    const resendApiKey = process.env.RESEND_API_KEY;

    const eventTitle = title || (type === 'quote' ? 'New Information / Quote Request' : type === 'message' ? 'New Client Message' : 'New Service Ticket');
    const displayCode = ticketCode ? `[${ticketCode}]` : '';

    console.log(`[Tech Notification] ${eventTitle} ${displayCode} for ${clientName || 'Client'}: ${message || ''}`);

    if (resendApiKey) {
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 8px;">
            <h2 style="color: #ff6b00; margin-top: 0;">6th Sense Personal - Tech Alert</h2>
            <div style="background: rgba(255, 107, 0, 0.1); border-left: 4px solid #ff6b00; padding: 12px 16px; margin: 16px 0;">
              <strong style="font-size: 16px; color: #fff;">${eventTitle} ${displayCode}</strong>
              <p style="margin: 6px 0 0 0; color: #cbd5e1; font-size: 14px;">${message || 'A new action was submitted on the portal.'}</p>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #cbd5e1; margin-top: 16px;">
              ${clientName ? `<tr><td style="padding: 6px 0; color: #94a3b8;">Client:</td><td style="color: #fff; font-weight: bold;">${clientName}</td></tr>` : ''}
              ${clientEmail ? `<tr><td style="padding: 6px 0; color: #94a3b8;">Email:</td><td>${clientEmail}</td></tr>` : ''}
              ${clientPhone ? `<tr><td style="padding: 6px 0; color: #94a3b8;">Phone:</td><td>${clientPhone}</td></tr>` : ''}
              ${ticketCode ? `<tr><td style="padding: 6px 0; color: #94a3b8;">Ref Code:</td><td style="font-family: monospace; color: #ff6b00;">${ticketCode}</td></tr>` : ''}
            </table>
            <div style="margin-top: 24px;">
              <a href="https://6th-sense-personal.vercel.app/tech" style="background: #ff6b00; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block;">Open Tech Portal</a>
            </div>
          </div>
        `;

        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: '6th Sense Personal Alerts <system@resend.dev>',
            to: [techEmail],
            subject: `🚨 ${eventTitle} ${displayCode} - 6th Sense Personal`,
            html: emailHtml
          })
        });

        const resData = await resendRes.json();
        return res.status(200).json({ success: true, provider: 'resend', id: resData.id });
      } catch (sendErr) {
        console.warn('Resend send failed, falling back to logged dispatch:', sendErr?.message);
      }
    }

    return res.status(200).json({
      success: true,
      logged: true,
      notification: { eventTitle, displayCode, clientName, clientPhone, clientEmail }
    });
  } catch (error) {
    console.error('notify-tech error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
