const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8787;
const ROOT_DIR = __dirname;
const SEARX_BASE = process.env.SEARX_BASE || 'https://searx.be';

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

function handleSearch(req, res, query) {
  const q = (query.q || '').toString().trim();
  if (!q) return sendJson(res, 400, { error: 'Missing query' });

  console.log(`[search] query="${q}" base=${SEARX_BASE}`);

  const searxUrl = `${SEARX_BASE.replace(/\/$/, '')}/search?q=${encodeURIComponent(q)}&format=json&time_range=month`;
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
    }
  };

  https.get(searxUrl, options, apiRes => {
    let data = '';
    apiRes.on('data', chunk => { data += chunk; });
    apiRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        const rawResults = Array.isArray(parsed.results) ? parsed.results : [];
        const results = rawResults.slice(0, 6).map(item => ({
          title: item.title || item.url || 'Result',
          url: item.url || '',
          snippet: item.content || ''
        })).filter(r => r.url);

        console.log(`[search] searx status=${apiRes.statusCode} results=${results.length}`);
        sendJson(res, 200, { results });
      } catch (err) {
        console.warn('[search] searx parse error', err.message || err);
        sendJson(res, 500, { error: 'Failed to parse SearXNG response' });
      }
    });
  }).on('error', () => {
    sendJson(res, 502, { error: 'SearXNG request failed' });
  });
}

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(filePath).replace(/^\.+/, '');
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
  if (parsedUrl.pathname === '/search') {
    handleSearch(req, res, parsedUrl.query);
    return;
  }

  serveStatic(req, res, parsedUrl.pathname);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
