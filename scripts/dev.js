// scripts/dev.js
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const url = require('url');

const ROOT = process.cwd();
const BASE = path.join(ROOT, 'dist');

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', ...opts });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`))));
  });
}

let building = false;
let pending = false;

async function build() {
  if (building) { pending = true; return; }
  building = true;
  try {
    await run('node', ['scripts/generate-urls.js'], { cwd: ROOT });
  } catch (e) {
    console.error(e.message);
  } finally {
    building = false;
    if (pending) { pending = false; build(); }
  }
}

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.ico': return 'image/x-icon';
    case '.txt': return 'text/plain; charset=utf-8';
    default: return 'application/octet-stream';
  }
}

function startServer(port = 8080) {
  const server = http.createServer((req, res) => {
    try {
      const parsed = url.parse(req.url);
      let p = decodeURIComponent(parsed.pathname || '/');
      if (p.endsWith('/')) p += 'index.html';
      if (p === '/') p = '/index.html';

      const filePath = path.join(BASE, p);
      fs.promises.readFile(filePath)
        .then((buf) => {
          res.writeHead(200, { 'Content-Type': contentType(filePath), 'Cache-Control': 'no-store' });
          res.end(buf);
        })
        .catch(() => {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not found');
        });
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Server error');
    }
  });

  server.listen(port, () => {
    console.log(`Dev server: http://localhost:${port}`);
  });

  return server;
}

function watch() {
  const watchTargets = [
    path.join(ROOT, 'directory'),
    path.join(ROOT, 'index.html'),
    path.join(ROOT, 'scripts', 'generate-urls.js')
  ];
  const debounceMs = 150;
  let timer = null;

  for (const t of watchTargets) {
    try {
      fs.watch(t, { recursive: true }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          console.log('Change detected. Rebuilding…');
          build();
        }, debounceMs);
      });
    } catch (e) {
      // Non-fatal if a path is missing
    }
  }
}

(async function main() {
  await build();
  startServer(8080);
  watch();
})();