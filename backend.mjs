/**
 * Smart Civic Connect — Backend API Server (backend.mjs)
 * ========================================================
 * Provides REST API endpoints for:
 *   POST /api/upload-photo      — Camera photo upload with geotagging
 *   GET  /api/photos            — List all uploaded photos
 *   GET  /api/photos/:id        — Get a single photo record
 *   DELETE /api/photos/:id      — Delete a photo by ID
 *   GET  /api/track/:ticketId   — Track a complaint by ticket ID
 *   POST /api/complaints        — Submit or update a complaint record
 *   GET  /api/complaints        — List all stored complaints
 *   GET  /uploads/:filename     — Serve uploaded photo files
 *   GET  /                      — Serve index.html (static site host)
 *   GET  /health                — Server health check
 *
 * How to Run:
 *   node backend.mjs
 *   (Requires Node.js v18+; set DATABASE_URL to use PostgreSQL)
 *
 * Listens on: http://localhost:4200
 * Static site: index.html is served at /
 */

import 'dotenv/config';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir, unlink, access } from 'node:fs/promises';
import { extname, resolve, sep, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { Pool } from 'pg';

const __dir = resolve(fileURLToPath(new URL('.', import.meta.url)));
const UPLOADS_DIR = join(__dir, 'uploads');
const DATA_FILE = join(__dir, 'civic_data.json');
const PORT = Number(process.env.PORT || 4200);
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 10,
    })
  : null;

// ============================================================================
// BOOTSTRAP: Initialize PostgreSQL or local JSON storage
// ============================================================================
async function bootstrap() {
  if (pool) {
    const schema = await readFile(join(__dir, 'database.sql'), 'utf8');
    await pool.query(schema);
    await pool.query('SELECT 1');
    console.log('[BOOT] PostgreSQL database ready');
    return;
  }

  await mkdir(UPLOADS_DIR, { recursive: true });
  try {
    await access(DATA_FILE);
  } catch {
    await writeFile(DATA_FILE, JSON.stringify({ photos: [], complaints: [] }, null, 2), 'utf8');
  }
  console.log(`[BOOT] Uploads dir: ${UPLOADS_DIR}`);
  console.log(`[BOOT] Data file:   ${DATA_FILE}`);
}

// ============================================================================
// DATA HELPERS (simple JSON flat-file database)
// ============================================================================
async function readData() {
  const raw = await readFile(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

async function writeData(data) {
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

async function listComplaints() {
  if (pool) {
    const { rows } = await pool.query('SELECT record FROM civic_complaints ORDER BY saved_at DESC');
    return rows.map(row => row.record);
  }
  return (await readData()).complaints;
}

async function saveComplaint(complaint) {
  if (pool) {
    await pool.query(
      `INSERT INTO civic_complaints (id, record, saved_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (id) DO UPDATE SET record = EXCLUDED.record, saved_at = now()`,
      [complaint.id, JSON.stringify(complaint)]
    );
    return;
  }

  const data = await readData();
  const existingIdx = data.complaints.findIndex(item => item.id === complaint.id);
  if (existingIdx >= 0) data.complaints[existingIdx] = complaint;
  else data.complaints.unshift(complaint);
  await writeData(data);
}

async function listPhotos() {
  if (pool) {
    const { rows } = await pool.query('SELECT record FROM civic_photos ORDER BY saved_at DESC');
    return rows.map(row => row.record);
  }
  return (await readData()).photos;
}

async function findPhoto(id) {
  if (pool) {
    const { rows } = await pool.query(
      'SELECT record FROM civic_photos WHERE id = $1 OR filename = $1 LIMIT 1',
      [id]
    );
    return rows[0]?.record || null;
  }
  return (await readData()).photos.find(photo => photo.id === id || photo.filename === id) || null;
}

async function savePhoto(photo, content, contentType) {
  if (pool) {
    await pool.query(
      `INSERT INTO civic_photos (id, filename, record, content_type, file_content, saved_at)
       VALUES ($1, $2, $3::jsonb, $4, $5, now())
       ON CONFLICT (id) DO UPDATE SET
         filename = EXCLUDED.filename, record = EXCLUDED.record,
         content_type = EXCLUDED.content_type, file_content = EXCLUDED.file_content,
         saved_at = now()`,
      [photo.id, photo.filename, JSON.stringify(photo), contentType, content]
    );
    return;
  }

  await writeFile(join(UPLOADS_DIR, photo.filename), content);
  const data = await readData();
  const existingIdx = data.photos.findIndex(item => item.id === photo.id);
  if (existingIdx >= 0) data.photos[existingIdx] = photo;
  else data.photos.unshift(photo);
  await writeData(data);
}

async function deletePhoto(id) {
  if (pool) {
    const { rows } = await pool.query(
      'DELETE FROM civic_photos WHERE id = $1 RETURNING id',
      [id]
    );
    return rows.length > 0;
  }

  const data = await readData();
  const index = data.photos.findIndex(photo => photo.id === id);
  if (index < 0) return false;
  const [photo] = data.photos.splice(index, 1);
  try {
    await unlink(join(UPLOADS_DIR, photo.filename));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await writeData(data);
  return true;
}

async function readUploadedPhoto(filename) {
  if (pool) {
    const { rows } = await pool.query(
      'SELECT content_type, file_content FROM civic_photos WHERE filename = $1 LIMIT 1',
      [filename]
    );
    return rows[0] ? { contentType: rows[0].content_type, content: rows[0].file_content } : null;
  }

  try {
    return {
      contentType: MIME[extname(filename).toLowerCase()] || 'application/octet-stream',
      content: await readFile(join(UPLOADS_DIR, filename)),
    };
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

// ============================================================================
// CORS & Content-Type HEADERS
// ============================================================================
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function sendJSON(res, statusCode, body) {
  const json = JSON.stringify(body);
  res.writeHead(statusCode, {
    ...CORS_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
}

function sendError(res, code, message) {
  sendJSON(res, code, { error: message });
}

// ============================================================================
// MULTIPART FORM PARSER (built-in, no multer/busboy needed)
// ============================================================================
async function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
    if (!boundaryMatch) return reject(new Error('No multipart boundary found'));
    const boundary = `--${boundaryMatch[1]}`;

    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('error', reject);
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks);
        const parts = {};
        let fileBuffer = null;
        let fileName = 'upload.jpg';
        let fileField = 'photo';

        const bodyStr = body.toString('binary');
        const partBlocks = bodyStr.split(boundary);

        for (const block of partBlocks) {
          if (!block.includes('Content-Disposition')) continue;

          const headerEnd = block.indexOf('\r\n\r\n');
          if (headerEnd === -1) continue;

          const headerSection = block.substring(0, headerEnd);
          const bodyStart = headerEnd + 4;
          const bodySection = block.substring(bodyStart).replace(/\r\n--$/, '');

          const nameMatch = headerSection.match(/name="([^"]+)"/);
          const fileNameMatch = headerSection.match(/filename="([^"]+)"/);
          const isFile = headerSection.includes('Content-Type:');

          if (!nameMatch) continue;
          const fieldName = nameMatch[1];

          if (isFile && fileNameMatch) {
            fileName = fileNameMatch[1];
            fileField = fieldName;
            // Extract binary portion from binary string
            const binaryStr = bodySection.replace(/\r\n$/, '');
            fileBuffer = Buffer.from(binaryStr, 'binary');
          } else {
            parts[fieldName] = bodySection.replace(/\r\n$/, '').trim();
          }
        }

        resolve({ fields: parts, file: fileBuffer ? { buffer: fileBuffer, originalName: fileName, fieldName: fileField } : null });
      } catch (err) {
        reject(err);
      }
    });
  });
}

// ============================================================================
// STATIC FILE MIME TYPES
// ============================================================================
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.txt':  'text/plain; charset=utf-8',
  '.md':   'text/plain; charset=utf-8',
  '.sql':  'text/plain; charset=utf-8',
};

// ============================================================================
// REQUEST ROUTER
// ============================================================================
async function handleRequest(req, res) {
  const rawUrl = req.url || '/';
  const queryIdx = rawUrl.indexOf('?');
  const pathname = decodeURIComponent(queryIdx >= 0 ? rawUrl.slice(0, queryIdx) : rawUrl);
  const method = req.method?.toUpperCase() || 'GET';

  // --- Preflight CORS ---
  if (method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  console.log(`[${new Date().toLocaleTimeString()}] ${method} ${pathname}`);

  // --- Health Check ---
  if (pathname === '/health' && method === 'GET') {
    if (pool) await pool.query('SELECT 1');
    sendJSON(res, 200, {
      status: 'ok',
      database: pool ? 'postgresql' : 'json-file',
      server: 'Smart Civic Connect Backend v1.0',
      uptime: process.uptime().toFixed(1) + 's',
      endpoints: [
        'GET  /health',
        'POST /api/upload-photo',
        'GET  /api/photos',
        'GET  /api/photos/:id',
        'DELETE /api/photos/:id',
        'GET  /api/track/:ticketId',
        'POST /api/complaints',
        'GET  /api/complaints',
        'GET  /uploads/:filename',
        'GET  / (static site)',
      ]
    });
    return;
  }

  // ── POST /api/upload-photo ─────────────────────────────────────────────────
  if (pathname === '/api/upload-photo' && method === 'POST') {
    try {
      const { fields, file } = await parseMultipart(req);

      if (!file || !file.buffer || file.buffer.length < 10) {
        return sendError(res, 400, 'No photo file received. Send the image in the "photo" form field.');
      }

      // Generate a unique filename
      const ext = extname(file.originalName || '.jpg') || '.jpg';
      const hash = createHash('sha1').update(file.buffer).digest('hex').slice(0, 8);
      const timestamp = Date.now();
      const safeId = (fields.id || `CAM-${Math.floor(1000 + Math.random() * 9000)}`).replace(/[^a-zA-Z0-9-_]/g, '_');
      const filename = `${safeId}_${hash}_${timestamp}${ext}`;
      const sizeKb = Math.round(file.buffer.length / 1024);
      const contentType = MIME[ext.toLowerCase()] || 'application/octet-stream';

      // Build record
      const photoRecord = {
        id: fields.id || safeId,
        filename,
        url: `/uploads/${filename}`,
        title: fields.title || 'Civic Evidence Photo',
        ticketId: fields.ticketId || '',
        category: fields.category || 'public-infra',
        lat: parseFloat(fields.lat) || null,
        lng: parseFloat(fields.lng) || null,
        ward: fields.ward || '',
        address: fields.address || '',
        timestamp: parseInt(fields.timestamp, 10) || timestamp,
        notes: fields.notes || '',
        sizeKb,
        uploadedAt: new Date().toISOString(),
        serverSynced: true,
      };

      await savePhoto(photoRecord, file.buffer, contentType);

      console.log(`[UPLOAD] Saved ${filename} (${sizeKb} KB) — ticketId: ${photoRecord.ticketId || 'none'}`);
      sendJSON(res, 201, { success: true, ...photoRecord });
    } catch (err) {
      console.error('[UPLOAD ERROR]', err);
      sendError(res, 500, `Upload failed: ${err.message}`);
    }
    return;
  }

  // ── GET /api/photos ────────────────────────────────────────────────────────
  if (pathname === '/api/photos' && method === 'GET') {
    const photos = await listPhotos();
    sendJSON(res, 200, { total: photos.length, photos });
    return;
  }

  // ── GET /api/photos/:id ────────────────────────────────────────────────────
  if (pathname.startsWith('/api/photos/') && method === 'GET') {
    const id = decodeURIComponent(pathname.slice('/api/photos/'.length));
    const photo = await findPhoto(id);
    if (!photo) return sendError(res, 404, `Photo not found: ${id}`);
    sendJSON(res, 200, photo);
    return;
  }

  // ── DELETE /api/photos/:id ─────────────────────────────────────────────────
  if (pathname.startsWith('/api/photos/') && method === 'DELETE') {
    const id = decodeURIComponent(pathname.slice('/api/photos/'.length));
    if (!await deletePhoto(id)) return sendError(res, 404, `Photo not found: ${id}`);

    sendJSON(res, 200, { success: true, deleted: id });
    return;
  }

  // ── GET /api/track/:ticketId ───────────────────────────────────────────────
  if (pathname.startsWith('/api/track/') && method === 'GET') {
    const ticketId = decodeURIComponent(pathname.slice('/api/track/'.length)).toUpperCase();
    const [complaints, photos] = await Promise.all([listComplaints(), listPhotos()]);

    const complaint = complaints.find(c =>
      (c.id || '').toUpperCase() === ticketId ||
      (c.phone || '').replace(/\s/g, '').includes(ticketId.replace(/\s/g, '')) ||
      (c.author || '').toLowerCase().includes(ticketId.toLowerCase())
    );

    const matchingPhotos = photos.filter(p => p.ticketId === ticketId);

    if (!complaint) {
      sendJSON(res, 200, {
        found: false,
        ticketId,
        message: `No server-side record for ${ticketId}. Check the app's local database.`,
        serverPhotos: matchingPhotos,
      });
      return;
    }

    sendJSON(res, 200, {
      found: true,
      complaint,
      serverPhotos: matchingPhotos,
    });
    return;
  }

  // ── POST /api/complaints ───────────────────────────────────────────────────
  if (pathname === '/api/complaints' && method === 'POST') {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks).toString('utf8');
      const complaint = JSON.parse(body);

      if (!complaint.id) complaint.id = `SCC-${Math.floor(1000 + Math.random() * 9000)}`;
      complaint.serverSavedAt = new Date().toISOString();
      if (typeof complaint.id !== 'string' || !complaint.id.trim()) {
        return sendError(res, 400, 'Complaint must include a valid ticket ID.');
      }

      await saveComplaint(complaint);
      console.log(`[COMPLAINT] Saved ${complaint.id}`);

      sendJSON(res, 201, { success: true, id: complaint.id });
    } catch (err) {
      console.error('[COMPLAINT ERROR]', err);
      sendError(res, 500, `Could not save complaint: ${err.message}`);
    }
    return;
  }

  // ── GET /api/complaints ────────────────────────────────────────────────────
  if (pathname === '/api/complaints' && method === 'GET') {
    const complaints = await listComplaints();
    sendJSON(res, 200, { total: complaints.length, complaints });
    return;
  }

  // ── GET /uploads/:filename  (serve uploaded photo files) ──────────────────
  if (pathname.startsWith('/uploads/') && method === 'GET') {
    const filename = basename(decodeURIComponent(pathname.slice('/uploads/'.length)));
    // Only allow safe filenames (alphanumeric, dash, underscore, dot)
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename)) {
      return sendError(res, 400, 'Invalid filename');
    }
    try {
      const uploaded = await readUploadedPhoto(filename);
      if (!uploaded) return sendError(res, 404, `File not found: ${filename}`);
      res.writeHead(200, {
        ...CORS_HEADERS,
        'Content-Type': uploaded.contentType,
        'Content-Length': uploaded.content.length,
        'Cache-Control': 'public, max-age=86400',
      });
      res.end(uploaded.content);
    } catch (error) {
      console.error('[PHOTO READ ERROR]', error);
      sendError(res, 500, 'Could not read the uploaded photo.');
    }
    return;
  }

  // ── Static Site (serves index.html, app.js, styles.css, etc.) ─────────────
  if (method === 'GET') {
    const requested = pathname === '/' ? '/index.html' : pathname;
    const safeRequested = requested.startsWith('/') ? requested : `/${requested}`;
    const publicFiles = new Set([
      '/index.html',
      '/app.js',
      '/styles.css',
      '/favicon.svg',
      '/logo.svg',
      '/logo-light.svg',
      '/icon.svg',
    ]);
    const isImageAsset = safeRequested.startsWith('/images/')
      && ['.png', '.jpg', '.jpeg', '.webp', '.ico'].includes(extname(safeRequested).toLowerCase());
    if (!publicFiles.has(safeRequested) && !isImageAsset) {
      return sendError(res, 404, 'Not found');
    }

    const filePath = resolve(__dir, `.${safeRequested}`);

    // Prevent path traversal
    if (!filePath.startsWith(__dir + sep) && filePath !== __dir) {
      return sendError(res, 403, 'Access denied');
    }

    try {
      const buf = await readFile(filePath);
      const mime = MIME[extname(filePath).toLowerCase()] || 'text/plain; charset=utf-8';
      res.writeHead(200, {
        ...CORS_HEADERS,
        'Content-Type': mime,
        'Cache-Control': 'no-cache',
        'Content-Length': buf.length,
      });
      res.end(buf);
    } catch {
      sendError(res, 404, `Not found: ${pathname}`);
    }
    return;
  }

  // ── 405 Method Not Allowed ─────────────────────────────────────────────────
  sendError(res, 405, `Method ${method} not allowed on ${pathname}`);
}

// ============================================================================
// START SERVER
// ============================================================================
await bootstrap();

const server = createServer((req, res) => {
  handleRequest(req, res).catch(err => {
    console.error('[UNCAUGHT]', err);
    try {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    } catch {}
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   Smart Civic Connect — Backend API Server               ║');
  console.log('║   SDG 11: Sustainable Cities & Communities               ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║   Website:    http://localhost:${PORT}                       ║`);
  console.log(`║   API Root:   http://localhost:${PORT}/api                   ║`);
  console.log(`║   Health:     http://localhost:${PORT}/health                ║`);
  console.log(`║   Uploads:    http://localhost:${PORT}/uploads               ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║   Endpoints:                                             ║');
  console.log('║   POST /api/upload-photo  — Camera photo upload         ║');
  console.log('║   GET  /api/photos        — List all photos              ║');
  console.log('║   GET  /api/track/:id     — Track complaint by ID        ║');
  console.log('║   POST /api/complaints    — Save complaint to server     ║');
  console.log('║   GET  /api/complaints    — List all complaints          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use.`);
    console.error(`   Stop the other server or change PORT= environment variable.\n`);
  } else {
    console.error('[SERVER ERROR]', err);
  }
  process.exit(1);
});
