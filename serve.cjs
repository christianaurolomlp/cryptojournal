const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 4173;

const API_BACKEND = 'https://cryptojournal-api-production.up.railway.app';
const API_KEY = 'd4665c7f7a075109e9a41f1ad3bdd7cd131e91f1cd62110032df842239dd28df';

// Delete all trades of a month (handled here since backend API may not have this endpoint)
app.delete('/api/trades/month/:yearMonth', async (req, res) => {
  try {
    const { yearMonth } = req.params; // "2026-01"
    const fetch = (await import('node-fetch')).default;
    const headers = { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' };
    
    // Get all trades
    const tradesResp = await fetch(`${API_BACKEND}/api/trades`, { headers });
    const trades = await tradesResp.json();
    
    // Filter trades matching the month
    const toDelete = trades.filter(t => {
      const d = t.date || t.openDate || '';
      return d.startsWith(yearMonth);
    });
    
    // Delete each one
    let deleted = 0;
    for (const t of toDelete) {
      try {
        await fetch(`${API_BACKEND}/api/trades/${t.id}`, { method: 'DELETE', headers });
        deleted++;
      } catch (e) { /* continue */ }
    }
    
    res.json({ ok: true, deleted, month: yearMonth });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Simple API proxy (no external dependency needed)
app.use('/api', async (req, res) => {
  try {
    const url = API_BACKEND + req.originalUrl;
    const headers = {
      'X-API-Key': API_KEY,
      'Content-Type': req.headers['content-type'] || 'application/json',
    };
    
    const fetch = (await import('node-fetch')).default;
    const opts = { method: req.method, headers };
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      let body = '';
      await new Promise((resolve) => {
        req.on('data', chunk => body += chunk);
        req.on('end', resolve);
      });
      if (body) opts.body = body;
    }
    
    const resp = await fetch(url, opts);
    const data = await resp.text();
    res.status(resp.status).set('Content-Type', resp.headers.get('content-type') || 'application/json').send(data);
  } catch (e) {
    res.status(502).json({error: 'Proxy error', detail: e.message});
  }
});

// Serve static assets with long cache (hashed filenames)
app.use('/assets', express.static(path.join(__dirname, 'dist/assets'), {
  maxAge: '1y',
  immutable: true,
}));

// Serve other static files (no cache)
app.use(express.static(path.join(__dirname, 'dist'), { maxAge: 0 }));

// Health check
app.get('/health', (req, res) => res.json({status: 'ok', timestamp: new Date().toISOString()}));

// SPA fallback — NEVER cache index.html
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => console.log(`CryptoJournal on port ${PORT}`));
