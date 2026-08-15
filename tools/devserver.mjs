/* devserver.mjs — 本機開發伺服器
   靜態檔案 + POST /__save 把畫面截圖寫到 shots/（自動驗證用）
   用法：node tools/devserver.mjs   → http://localhost:5833 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 5833;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.md': 'text/markdown; charset=utf-8'
};

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/__save') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const { name, data } = JSON.parse(body);
        const dir = path.join(ROOT, 'shots');
        fs.mkdirSync(dir, { recursive: true });
        const safe = String(name).replace(/[^\w.-]/g, '_');
        fs.writeFileSync(path.join(dir, safe + '.png'), Buffer.from(data.split(',')[1], 'base64'));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, file: 'shots/' + safe + '.png' }));
      } catch (e) {
        res.writeHead(500); res.end(String(e));
      }
    });
    return;
  }
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('404');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`dev server on http://localhost:${PORT}`));
