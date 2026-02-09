// Cargar variables de entorno desde .env
require('dotenv').config();

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
// Use the global `fetch` available in recent Node.js versions.
// If running an older Node version, install and import a fetch polyfill.

const PORT = process.env.PORT || 8787;
const ROOT_DIR = __dirname;

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
}

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(filePath).replace(/^\.\.+/, '');
  const fullPath = path.join(ROOT_DIR, safePath);

  fs.stat(fullPath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(fullPath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  console.log('Request received:', { method: req.method, url: req.url });
  console.log('Request headers:', req.headers);

  if (parsedUrl.pathname === '/api/ai') {
    try {
      const apiKey = process.env.OPENROUTER_API_KEY;
      const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

      console.log('Loaded OPENROUTER_API_KEY:', apiKey ? 'Present' : 'Missing');
      console.log('Forwarding to OpenRouter with API Key:', apiKey);

      const body = [];
      req.on('data', chunk => body.push(chunk));
      req.on('end', async () => {
        const requestBody = Buffer.concat(body).toString();
        console.log('Request body:', requestBody);

        let response;
        try {
          response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: requestBody
          });
        } catch (e) {
          console.error('Fetch to OpenRouter failed:', e && e.message ? e.message : e);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Bad Gateway', details: e && e.message ? e.message : String(e) }));
          return;
        }

        if (!response || !response.ok) {
          console.error('OpenRouter responded with an error:', {
            status: response ? response.status : 'no-response',
            statusText: response ? response.statusText : ''
          });
        }

        let data;
        try {
          data = await response.json();
        } catch (e) {
          console.error('Error parsing OpenRouter response as JSON:', e && e.message ? e.message : e);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Bad Gateway', details: 'Invalid JSON from upstream' }));
          return;
        }

        res.writeHead(response.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      });
    } catch (error) {
      console.error('Error al conectar con la API de IA:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Error interno del servidor' }));
    }
    return;
  }

  serveStatic(req, res, parsedUrl.pathname);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
