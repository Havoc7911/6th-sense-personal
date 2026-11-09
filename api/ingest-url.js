/**
 * Vercel Serverless Function: /api/ingest-url
 * Fetches public webpage text server-side to bypass client browser CORS limitations.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const targetUrl = req.method === 'POST' ? req.body?.url : req.query?.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing required parameter: url' });
  }

  try {
    const parsed = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Invalid URL protocol' });
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Remote server responded with ${response.status}` });
    }

    const html = await response.text();
    return res.status(200).json({ url: targetUrl, html });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch target URL' });
  }
}
