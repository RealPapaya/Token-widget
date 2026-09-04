'use strict';

// ---------- Antigravity (Google) usage ----------
// Antigravity is a VS Code fork, so its synced account state lives in the
// standard globalStorage key/value DB (%APPDATA%/Antigravity/User/
// globalStorage/state.vscdb) under `antigravityUnifiedStateSync.*` keys. The
// values are base64-encoded protobuf, so reading usage means two decoders:
// a read-only SQLite b-tree walk and a protobuf field walk.
//
// Both are hand-rolled on purpose. The widget ships as a portable exe with no
// native modules, and Electron 33's Node 20 has no built-in sqlite, so pulling
// in better-sqlite3 would mean an electron-rebuild step and a per-arch binary
// for one small read. The DB is only ever opened read-only; we never write.

const fs = require('fs');
const os = require('os');
const path = require('path');

const AG_STATE_DB = path.join(
  process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
  'Antigravity', 'User', 'globalStorage', 'state.vscdb'
);

// ---------- minimal read-only SQLite reader ----------
// Supports exactly what state.vscdb needs: table b-trees, overflow chains, and
// the serial types VS Code stores (NULL / int / float / text / blob). Index
// b-trees are skipped; we only ever scan a table by its root page.

// SQLite varint: up to 9 bytes, 7 bits each, big-endian. Returns [value, size].
function readVarint(buf, off) {
  let v = 0;
  for (let i = 0; i < 8; i++) {
    const b = buf[off + i];
    if (b === undefined) return [v, i];
    if (i === 8) break;
    v = v * 128 + (b & 0x7f);
    if (!(b & 0x80)) return [v, i + 1];
  }
  // 9th byte contributes all 8 bits. Values this large never appear in the
  // fields we read (record sizes, serial types), so precision loss is moot.
  return [v * 256 + buf[off + 8], 9];
}

// Byte length of a record column given its serial type.
function serialSize(t) {
  if (t < 5) return [0, 1, 2, 3, 4][t];
  if (t === 5) return 6;
  if (t === 6 || t === 7) return 8;
  if (t === 8 || t === 9) return 0;
  return (t - 12) >> 1;   // 12+ = blob (even) / text (odd)
}

function decodeColumn(buf, off, t) {
  if (t === 0) return null;
  if (t === 8) return 0;
  if (t === 9) return 1;
  if (t === 7) return buf.readDoubleBE(off);
  if (t <= 6) {
    const n = serialSize(t);
    let v = buf[off] & 0x80 ? -1 : 0;      // sign-extend: these ints are signed
    for (let i = 0; i < n; i++) v = v * 256 + buf[off + i];
    return v;
  }
  const n = serialSize(t);
  const raw = buf.subarray(off, off + n);
  return t & 1 ? raw.toString('utf8') : Buffer.from(raw);
}

// Reassemble a cell payload, following the overflow page chain if the record
// is larger than fits on one page.
function readPayload(db, pageSize, off, payloadSize) {
  const usable = pageSize;               // reserved-space byte is 0 in this DB
  const maxLocal = usable - 35;
  if (payloadSize <= maxLocal) return db.subarray(off, off + payloadSize);

  const minLocal = Math.floor(((usable - 12) * 32) / 255) - 23;
  const k = minLocal + ((payloadSize - minLocal) % (usable - 4));
  const local = k <= maxLocal ? k : minLocal;

  const parts = [db.subarray(off, off + local)];
  let next = db.readUInt32BE(off + local);
  let left = payloadSize - local;
  while (next > 0 && left > 0) {
    const p = (next - 1) * pageSize;
    if (p + pageSize > db.length) break;
    const chunk = Math.min(left, usable - 4);
    parts.push(db.subarray(p + 4, p + 4 + chunk));
    left -= chunk;
    next = db.readUInt32BE(p);
  }
  return Buffer.concat(parts);
}

// Walk a table b-tree from `pageNum`, calling cb(columns) for each row.
function walkTable(db, pageSize, pageNum, cb, seen) {
  seen = seen || new Set();
  if (seen.has(pageNum) || pageNum < 1) return;   // guard against cycles
  seen.add(pageNum);

  const base = (pageNum - 1) * pageSize;
  if (base + pageSize > db.length) return;
  const hdr = base + (pageNum === 1 ? 100 : 0);
  const type = db[hdr];
  if (type !== 0x0d && type !== 0x05) return;     // table leaf / table interior

  const cellCount = db.readUInt16BE(hdr + 3);
  const ptrArray = hdr + (type === 0x05 ? 12 : 8);

  for (let i = 0; i < cellCount; i++) {
    const cellOff = base + db.readUInt16BE(ptrArray + i * 2);
    if (type === 0x05) {
      walkTable(db, pageSize, db.readUInt32BE(cellOff), cb, seen);
      continue;
    }
    let o = cellOff;
    const [payloadSize, n1] = readVarint(db, o); o += n1;
    const [, n2] = readVarint(db, o); o += n2;          // rowid, unused
    const rec = readPayload(db, pageSize, o, payloadSize);

    const [hdrSize, n3] = readVarint(rec, 0);
    const types = [];
    let h = n3;
    while (h < hdrSize) {
      const [t, n] = readVarint(rec, h);
      types.push(t); h += n;
    }
    let body = hdrSize;
    const cols = types.map((t) => {
      const v = decodeColumn(rec, body, t);
      body += serialSize(t);
      return v;
    });
    cb(cols);
  }

  if (type === 0x05) walkTable(db, pageSize, db.readUInt32BE(hdr + 8), cb, seen);
}

// Read `tableName` out of a SQLite file. Returns an array of column arrays.
function readSqliteTable(dbPath, tableName) {
  const db = fs.readFileSync(dbPath);
  if (db.length < 100 || db.toString('latin1', 0, 15) !== 'SQLite format 3') return [];
  let pageSize = db.readUInt16BE(16);
  if (pageSize === 1) pageSize = 65536;

  let root = 0;
  // sqlite_master always lives on page 1: (type, name, tbl_name, rootpage, sql)
  walkTable(db, pageSize, 1, (c) => {
    if (c[0] === 'table' && c[1] === tableName) root = c[3];
  });
  if (!root) return [];

  const rows = [];
  walkTable(db, pageSize, root, (c) => rows.push(c));
  return rows;
}

// ---------- minimal protobuf walker ----------
// We have no .proto for Antigravity's messages, so decode structurally and
// address fields by their numeric path (e.g. '33.1.15.1'). Returns a flat list
// of { path, type, value } so callers can pick fields without a schema.

function protoVarint(buf, i) {
  let v = 0, shift = 1;
  for (;;) {
    if (i >= buf.length) throw new Error('truncated varint');
    const b = buf[i++];
    v += (b & 0x7f) * shift;
    if (!(b & 0x80)) return [v, i];
    shift *= 128;
    if (shift > Number.MAX_SAFE_INTEGER) throw new Error('varint too large');
  }
}

function isPrintable(buf) {
  for (const c of buf) {
    if (c < 32 && c !== 9 && c !== 10 && c !== 13) return false;
    if (c >= 127) return false;
  }
  return buf.length > 0;
}

function decodeProto(buf, prefix, depth) {
  prefix = prefix || '';
  depth = depth || 0;
  const out = [];
  let i = 0;
  while (i < buf.length) {
    let tag;
    try { [tag, i] = protoVarint(buf, i); } catch { return out; }
    const field = tag >> 3, wire = tag & 7;
    const p = prefix ? `${prefix}.${field}` : String(field);
    try {
      if (wire === 0) {
        let v; [v, i] = protoVarint(buf, i);
        out.push({ path: p, type: 'varint', value: v });
      } else if (wire === 1) {
        out.push({ path: p, type: 'double', value: buf.readDoubleLE(i) }); i += 8;
      } else if (wire === 5) {
        out.push({ path: p, type: 'float', value: buf.readFloatLE(i) }); i += 4;
      } else if (wire === 2) {
        let len; [len, i] = protoVarint(buf, i);
        const sub = buf.subarray(i, i + len); i += len;
        // A length-delimited field is either a nested message or a string; try
        // nesting first and fall back to text when the bytes parse as ASCII.
        let nested = null;
        if (depth < 8 && sub.length > 1) {
          try {
            const t = decodeProto(sub, p, depth + 1);
            if (t.length) nested = t;
          } catch { nested = null; }
        }
        if (isPrintable(sub) && (!nested || sub.length < 60)) {
          out.push({ path: p, type: 'string', value: sub.toString('utf8') });
        } else if (nested) {
          out.push(...nested);
        } else {
          out.push({ path: p, type: 'bytes', value: sub });
        }
      } else {
        return out;   // groups (3/4) are not used by these messages
      }
    } catch {
      return out;
    }
  }
  return out;
}

// ---------- Antigravity state access ----------

// Read the named `antigravityUnifiedStateSync.*` keys out of the state DB.
// Values are stored base64-encoded; returns a { key: Buffer } map of the
// decoded protobuf bytes, skipping keys that are absent or empty.
function readStateBlobs(keys, dbPath = AG_STATE_DB) {
  const want = new Set(keys);
  const out = {};
  let rows;
  try {
    rows = readSqliteTable(dbPath, 'ItemTable');
  } catch {
    return out;
  }
  for (const [key, value] of rows) {
    if (!want.has(key) || value == null || value === '') continue;
    const text = Buffer.isBuffer(value) ? value.toString('utf8') : String(value);
    try {
      const buf = Buffer.from(text, 'base64');
      if (buf.length) out[key] = buf;
    } catch {}
  }
  return out;
}

// Several sync keys wrap their real payload: { 1: <sentinel name>, 2: <base64> }.
// Unwrap to the inner message when that shape is present.
function unwrapSentinel(buf) {
  const fields = decodeProto(buf);
  const inner = fields.filter((f) => f.type === 'string' && f.value.length > 200);
  if (!inner.length) return buf;
  const decoded = Buffer.from(inner[inner.length - 1].value, 'base64');
  return decoded.length ? decoded : buf;
}

// ---------- Antigravity CLI (agy / cockpit) usage ----------
// The IDE's state.vscdb only carries credit sentinels, not per-model quota, so
// the usable numbers come from the CLI's cockpit cache. Both files there are
// plain JSON, no SQLite or protobuf needed:
//   quota_history/<hash>.json                 -> per-model % history + resetTime
//   quota_api_v1_plugin/authorized/<hash>.json -> per-model quotaInfo snapshot
const AG_COCKPIT_CACHE = path.join(os.homedir(), '.antigravity_cockpit', 'cache');

// Newest (by mtime) *.json in `dir`, parsed. Null when absent or unreadable.
function readNewestJson(dir) {
  let names;
  try { names = fs.readdirSync(dir).filter((n) => n.endsWith('.json')); } catch { return null; }
  let best = null;
  for (const n of names) {
    const full = path.join(dir, n);
    let st;
    try { st = fs.statSync(full); } catch { continue; }
    if (!st.isFile()) continue;
    if (!best || st.mtimeMs > best.mtimeMs) best = { full, mtimeMs: st.mtimeMs };
  }
  if (!best) return null;
  try { return JSON.parse(fs.readFileSync(best.full, 'utf8')); } catch { return null; }
}

const AG_MODEL_LABELS = {
  'claude-4-5': 'Claude',
  'g3-pro': 'Gemini Pro',
  'g3-flash': 'Gemini Flash',
  'g3-image': 'Gemini Image',
};

// A quota window whose resetTime has already passed has rolled over: the cache
// still holds the pre-reset percentage because nothing rewrote it, so report a
// fresh window instead of a stale bar.
function normalizeWindow(pct, resetMs) {
  if (resetMs && resetMs <= Date.now()) return { pct: 0, resetsAt: null };
  return { pct, resetsAt: resetMs ? new Date(resetMs).toISOString() : null };
}

// Latest point per model out of quota_history. `remainingPercentage` counts
// down, so used% is its complement.
function modelsFromHistory(hist) {
  const models = hist && hist.models;
  if (!models || typeof models !== 'object') return [];
  const out = [];
  for (const [id, m] of Object.entries(models)) {
    const points = (m && Array.isArray(m.points)) ? m.points : [];
    let latest = null;
    for (const p of points) {
      if (!p || typeof p.remainingPercentage !== 'number') continue;
      if (!latest || (p.timestamp || 0) > (latest.timestamp || 0)) latest = p;
    }
    if (!latest) continue;
    const w = normalizeWindow(
      Math.max(0, Math.min(100, 100 - latest.remainingPercentage)),
      latest.resetTime || null
    );
    out.push({ id, label: (m && m.label) || AG_MODEL_LABELS[id] || id, ...w });
  }
  return out;
}

// Fallback source: payload.models.<id>.quotaInfo = { remainingFraction, resetTime }.
// Only the ids we have labels for are surfaced; the payload lists dozens of
// internal models that would swamp the gauge list.
function modelsFromAuthorized(auth) {
  const models = auth && auth.payload && auth.payload.models;
  if (!models || typeof models !== 'object') return [];
  const out = [];
  for (const [id, m] of Object.entries(models)) {
    const q = m && m.quotaInfo;
    if (!q || typeof q.remainingFraction !== 'number') continue;
    const label = AG_MODEL_LABELS[id];
    if (!label) continue;
    const resetMs = q.resetTime ? Date.parse(q.resetTime) : null;
    out.push({
      id,
      label,
      ...normalizeWindow(Math.max(0, Math.min(100, (1 - q.remainingFraction) * 100)),
        Number.isFinite(resetMs) ? resetMs : null),
    });
  }
  return out;
}

const AG_MODEL_ORDER = ['claude-4-5', 'g3-pro', 'g3-flash', 'g3-image'];

// Read the CLI's cached quota. Returns { models, updatedAt, email } or null.
// `models` is [{ id, label, pct, resetsAt }] ordered for display.
function readCliUsage(cacheDir = AG_COCKPIT_CACHE) {
  const hist = readNewestJson(path.join(cacheDir, 'quota_history'));
  const auth = readNewestJson(path.join(cacheDir, 'quota_api_v1_plugin', 'authorized'));
  let models = modelsFromHistory(hist);
  if (!models.length) models = modelsFromAuthorized(auth);
  if (!models.length) return null;
  models.sort((a, b) => {
    const ia = AG_MODEL_ORDER.indexOf(a.id), ib = AG_MODEL_ORDER.indexOf(b.id);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  const updatedAt = Math.max(
    (hist && hist.updatedAt) || 0,
    (auth && auth.updatedAt) || 0
  ) || null;
  return {
    models,
    updatedAt,
    email: (hist && hist.email) || (auth && auth.email) || null,
  };
}

// True when the CLI has written a quota cache on this machine.
function hasAntigravityCli(cacheDir = AG_COCKPIT_CACHE) {
  for (const sub of [['quota_history'], ['quota_api_v1_plugin', 'authorized']]) {
    try {
      if (fs.readdirSync(path.join(cacheDir, ...sub)).some((n) => n.endsWith('.json'))) return true;
    } catch {}
  }
  return false;
}

// True when Antigravity is installed with a readable profile on this machine.
function hasAntigravityState(dbPath = AG_STATE_DB) {
  try { return fs.statSync(dbPath).isFile(); } catch { return false; }
}

module.exports = {
  AG_STATE_DB,
  AG_COCKPIT_CACHE,
  readCliUsage,
  hasAntigravityCli,
  readSqliteTable,
  decodeProto,
  readStateBlobs,
  unwrapSentinel,
  hasAntigravityState,
};
