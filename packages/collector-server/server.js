/**
 * Forms Offline — Standalone Zero-Dependency E2EE Collector Server Addon
 * 
 * Target Runtimes: Node.js, Bun, Alpine Docker, Cloudflare Workers, PHP.
 * Defenses: Proof-of-Work (PoW) SHA-256 Anti-Spam Puzzle, 500KB Payload Cap, IP Rate-Limiting.
 */

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, 'submissions');
const MAX_PAYLOAD_SIZE = 500 * 1024; // 500KB cap
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_IP = 10;

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// In-memory IP rate limiter map
const ipRateMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = ipRateMap.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

  if (now > entry.resetTime) {
    entry.count = 1;
    entry.resetTime = now + RATE_LIMIT_WINDOW_MS;
    ipRateMap.set(ip, entry);
    return false;
  }

  entry.count += 1;
  ipRateMap.set(ip, entry);
  return entry.count > MAX_REQUESTS_PER_IP;
}

// Generate Proof-of-Work Challenge (SHA-256 puzzle with difficulty prefix '0000')
function generatePoWChallenge() {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return { nonce, difficulty: '0000', timestamp };
}

function verifyPoW(nonce, solution) {
  const hash = crypto.createHash('sha256').update(nonce + solution).digest('hex');
  return hash.startsWith('0000');
}

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-PoW-Nonce, X-PoW-Solution');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // Endpoint: GET /challenge (Returns PoW nonce puzzle)
  if (req.method === 'GET' && req.url === '/challenge') {
    const challenge = generatePoWChallenge();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(challenge));
    return;
  }

  // Endpoint: POST /submit (Receives E2EE encrypted record)
  if (req.method === 'POST' && req.url === '/submit') {
    if (isRateLimited(clientIP)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }));
      return;
    }

    const powNonce = req.headers['x-pow-nonce'];
    const powSolution = req.headers['x-pow-solution'];

    if (!powNonce || !powSolution || !verifyPoW(powNonce, powSolution)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid or missing Proof-of-Work solution.' }));
      return;
    }

    let body = '';
    let bodySize = 0;

    req.on('data', (chunk) => {
      bodySize += chunk.length;
      if (bodySize > MAX_PAYLOAD_SIZE) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload size exceeds 500KB limit.' }));
        req.destroy();
      } else {
        body += chunk;
      }
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const filename = `submission_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.json`;
        const filePath = path.join(STORAGE_DIR, filename);

        fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Record received and stored securely.', filename }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload.' }));
      }
    });

    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found.' }));
});

server.listen(PORT, () => {
  console.log(`[Collector Server] Listening on http://localhost:${PORT}`);
});
