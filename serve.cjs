const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();
const PORT = process.env.PORT || 4173;

const API_BACKEND = 'https://cryptojournal-api-production.up.railway.app';
const API_KEY = 'd4665c7f7a075109e9a41f1ad3bdd7cd131e91f1cd62110032df842239dd28df';

// Proxy /api/* to the backend
app.use('/api', createProxyMiddleware({
  target: API_BACKEND,
  changeOrigin: true,
  headers: { 'X-API-Key': API_KEY },
  pathRewrite: { '^/api': '/api' },
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// Health check
app.get('/health', (req, res) => res.json({status: 'ok', timestamp: new Date().toISOString()}));

// SPA fallback
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`CryptoJournal on port ${PORT}`));
