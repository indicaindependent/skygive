// ═══════════════════════════════════════════════════════════════════════════
// SkyGive — Bitcoin donation campaigns for Bluesky
// Version: v0.11.2  (May 19, 2026)
//
// PROJECT MISSION — LOCKED IN
// ───────────────────────────
//   SkyGive is a 100% FREE, 100% NON-CUSTODIAL positivity project.
//   We exist to help good causes raise Bitcoin donations on Bluesky.
//
//   ZERO FEES. ZERO MIDDLEMEN. ZERO HOLDING OF USER FUNDS.
//
//   Every donor's QR / BIP21 link points DIRECTLY at the creator's BTC
//   address. SkyGive infrastructure NEVER touches a single satoshi of
//   donation flow. Our only role: generate beautiful tip cards and host
//   them under skygive.app.
//
//   If a future maintainer wants to add fees, splits, or any kind of
//   custodial routing — DO NOT. That is a different project. Fork it,
//   give it a different name, and assume the regulatory burden (MSB
//   licensing, MTL, BitLicense, etc.) that comes with handling other
//   people's money.
//
//   A future Lightning Network tier MAY be considered later (see
//   SKYGIVE_LIGHTNING_SPLITS_PLAN_v1.md in the agent workspace) but
//   that is PARKED indefinitely. Today and for the foreseeable future,
//   SkyGive is a free gift to the Bluesky community.
//
//   — Pete McVries / Indica Independent Media / May 19, 2026
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SkyGive API Worker — Phase 1
 * Domain: skygive.app (+ www, api, v, badge subdomains)
 */

const VERSION = '0.11.0';
const DEMO_BTC_ADDRESS = 'bc1qREPLACE_WITH_YOUR_DEMO_BTC_ADDRESS_HERE'; // used ONLY for /v/demo placeholder cards. SkyGive collects ZERO fees — see PROJECT_MISSION at top of file.
const BADGE_WIDTH = 1200;
const BADGE_HEIGHT = 630;
const VARIANT_BUCKET_SECONDS = 28800;
// ═══════════════════════════════════════════════════════════════════
//  SKYGIVE v0.11 — UNNAMED PALETTE LIBRARY (May 19, 2026)
//  Themes are numbered. Colors speak for themselves.
//  Each palette: [bgDark, bgMid, accent, accent2, text]
// ═══════════════════════════════════════════════════════════════════

const THEMES = {
  t01: { mood: 'bold',    palette: ['#0a0a0a', '#1a1a1a', '#8ACE00', '#a3e635', '#ffffff'] },
  t02: { mood: 'bold',    palette: ['#1a0a1a', '#3d1538', '#ff006e', '#ffbe0b', '#ffffff'] },
  t03: { mood: 'soft',    palette: ['#1a1f3d', '#2d3a6e', '#55cdfc', '#f7a8b8', '#ffffff'] },
  t04: { mood: 'bold',    palette: ['#0d0a05', '#1f1a08', '#ffb700', '#dc2626', '#ffffff'] },
  t05: { mood: 'bold',    palette: ['#2d0a1a', '#5d1538', '#ff5400', '#ec4899', '#fff5e6'] },
  t06: { mood: 'cool',    palette: ['#0a1230', '#1e3a8a', '#3b82f6', '#fbbf24', '#ffffff'] },
  t07: { mood: 'warm',    palette: ['#1a0505', '#4a1208', '#ff5722', '#ffd166', '#ffffff'] },
  t08: { mood: 'bold',    palette: ['#0a0010', '#2a0838', '#ff006e', '#8ace00', '#ffffff'] },
  t09: { mood: 'bold',    palette: ['#0a1a0a', '#1a2e0a', '#bef264', '#fde047', '#ffffff'] },
  t10: { mood: 'warm',    palette: ['#1a0303', '#4a0a0a', '#ef4444', '#fbbf24', '#ffffff'] },
  t11: { mood: 'cool',    palette: ['#000814', '#001d3d', '#00d9ff', '#ff006e', '#ffffff'] },
  t12: { mood: 'cool',    palette: ['#021a0d', '#053d23', '#10b981', '#fde047', '#ffffff'] },
  t13: { mood: 'cool',    palette: ['#0d0a1a', '#2d1545', '#c084fc', '#fbbf24', '#ffffff'] },
  t14: { mood: 'cool',    palette: ['#050a30', '#1e1b7a', '#a78bfa', '#06d6a0', '#ffffff'] },
  t15: { mood: 'warm',    palette: ['#1a0d05', '#3d2415', '#e76f51', '#f4a261', '#fff5e6'] },
  t16: { mood: 'earthy',  palette: ['#031a0a', '#0d3320', '#65a30d', '#f59e0b', '#ffffff'] },
};

const THEME_ORDER = ['t01','t02','t03','t04','t05','t06','t07','t08','t09','t10','t11','t12','t13','t14','t15','t16'];

function getTheme(key) {
  // Backward-compat for every prior naming scheme
  const aliases = {
    brat_summer: 't01', pride_progress: 't02', trans_aurora: 't03',
    diaspora_gold: 't04', fiesta_marigold: 't05', resistance_blue: 't06',
    persimmon_sunset_v2: 't07', hot_pink_brat: 't08', solar_chartreuse: 't09',
    tomato_action: 't10', cyan_chrome: 't11', jade_garden_v2: 't12',
    plum_noir_v2: 't13', royal_velvet_v2: 't14', honest_terracotta: 't15',
    forest_cathedral_v2: 't16',
    persimmon_sunset: 't07', hot_pink_spring: 't08', solar_citrus: 't09',
    tomato_punch: 't10', cool_blue: 't11', jade_garden: 't12', plum_noir: 't13',
    royal_velvet: 't14', wasabi_earth: 't16', honest_sand: 't15',
    forest_cathedral: 't16', midnight_aurora: 't01',
  };
  const resolved = THEMES[key] ? key : (aliases[key] && THEMES[aliases[key]] ? aliases[key] : null);
  if (resolved) return THEMES[resolved];
  return THEMES.t01;
}
function getThemePalette(key) { return getTheme(key).palette; }
function getThemePaletteJson(key) { return JSON.stringify(getTheme(key).palette); }
function listThemes() {
  return THEME_ORDER.map(k => ({ key: k, ...THEMES[k] }));
}

  // 8 hours — variants rotate naturally without per-second churn
const PUBLIC_BSKY = 'https://public.api.bsky.app/xrpc';
const BSKY_SOCIAL = 'https://bsky.social/xrpc';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors, ...extra },
  });
}

function html(body, status = 200, extra = {}) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...cors, ...extra },
  });
}

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function escapeXml(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;' }[c]));
}

async function sha256hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function makeSlug(did) {
  const h = await sha256hex(did + ':skygive-v1');
  return h.slice(0, 8);
}

function validBitcoinAddress(addr) {
  if (!addr || typeof addr !== 'string') return false;
  if (/^bc1[a-z0-9]{38,87}$/i.test(addr)) return true;
  if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(addr)) return true;
  return false;
}

function validBlueskyHandle(h) {
  if (!h || typeof h !== 'string') return false;
  h = h.replace(/^@/, '').replace(/^https?:\/\/(bsky\.app\/profile\/)?/, '');
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,253}[a-zA-Z0-9]$/.test(h) && h.includes('.');
}

function normalizeHandle(h) {
  return String(h || '').trim().toLowerCase().replace(/^@/, '').replace(/^https?:\/\//, '').replace(/^bsky\.app\/profile\//, '').replace(/\/$/, '');
}

function nowUnix() { return Math.floor(Date.now() / 1000); }

function formatSats(n) {
  n = Number(n) || 0;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

async function resolveBlueskyHandle(handle) {
  const r = await fetch(`${BSKY_SOCIAL}/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`);
  if (!r.ok) throw new Error(`resolveHandle ${r.status}`);
  const d = await r.json();
  return d.did;
}

async function getBlueskyProfile(actor) {
  const r = await fetch(`${PUBLIC_BSKY}/app.bsky.actor.getProfile?actor=${encodeURIComponent(actor)}`);
  if (!r.ok) throw new Error(`getProfile ${r.status}`);
  return await r.json();
}

async function extractPaletteFromAvatar(env, avatarUrl) {
  const fallback = {
    palette: ['#1a2942', '#0a1929', '#7dd3fc', '#a78bfa', '#f1f5f9'],
    vibe: ['calm', 'professional', 'blue-toned'],
    theme: 'minimal',
  };
  if (!avatarUrl || !env.AI) return fallback;
  try {
    const imgResp = await fetch(avatarUrl);
    if (!imgResp.ok) return fallback;
    const imgBytes = await imgResp.arrayBuffer();
    const imgArr = Array.from(new Uint8Array(imgBytes));
    const result = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
      messages: [
        { role: 'system', content: 'You are a brand designer extracting visual identity. Respond ONLY with valid JSON, no prose.' },
        { role: 'user', content: 'Analyze this profile image. Respond ONLY with JSON: {"palette":["#xxxxxx","#xxxxxx","#xxxxxx","#xxxxxx","#xxxxxx"],"vibe":["word1","word2","word3"],"theme":"minimal"} where theme is one of: minimal, bold, retro, pixel, brutalist, soft, neon, earth.' },
      ],
      image: imgArr,
      max_tokens: 250,
    });
    // Workers AI can return result.response as either a string OR an already-parsed object
    let parsed;
    const r = result.response;
    if (r && typeof r === 'object' && !Array.isArray(r)) {
      parsed = r;
    } else {
      const text = typeof r === 'string' ? r : (result.description || JSON.stringify(r || ''));
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) return fallback;
      try { parsed = JSON.parse(m[0]); } catch { return fallback; }
    }
    if (!parsed || !Array.isArray(parsed.palette) || parsed.palette.length < 3) return fallback;
    parsed.palette = parsed.palette.filter(c => /^#[0-9a-f]{3,8}$/i.test(c)).map(c => {
      // Normalize 3-char hex to 6-char
      if (c.length === 4) return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
      return c.slice(0, 7);
    }).slice(0, 5);
    if (parsed.palette.length < 3) return fallback;
    while (parsed.palette.length < 5) parsed.palette.push(fallback.palette[parsed.palette.length]);
    return {
      palette: parsed.palette,
      vibe: Array.isArray(parsed.vibe) ? parsed.vibe.slice(0, 3) : fallback.vibe,
      theme: typeof parsed.theme === 'string' ? parsed.theme : fallback.theme,
    };
  } catch (e) {
    console.error('vision palette extraction error:', String(e));
    return fallback;
  }
}


// ── QR Code generator (minimal byte-mode v1-10 ECC-M) ──
const QR_GEN = (() => {
  const GF_EXP = new Uint8Array(512);
  const GF_LOG = new Uint8Array(256);
  (() => {
    let x = 1;
    for (let i = 0; i < 255; i++) { GF_EXP[i] = x; GF_LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
    for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
  })();
  function rsGenPoly(numEcc) {
    let p = [1];
    for (let i = 0; i < numEcc; i++) {
      const np = new Array(p.length + 1).fill(0);
      for (let j = 0; j < p.length; j++) {
        np[j] ^= p[j];
        np[j + 1] ^= p[j] ? GF_EXP[(GF_LOG[p[j]] + i) % 255] : 0;
      }
      p = np;
    }
    return p;
  }
  function rsEncode(data, numEcc) {
    const gen = rsGenPoly(numEcc);
    const buf = new Uint8Array(data.length + numEcc);
    buf.set(data);
    for (let i = 0; i < data.length; i++) {
      const factor = buf[i];
      buf[i] = 0;
      if (factor !== 0) {
        for (let j = 0; j < gen.length; j++) {
          buf[i + j] ^= GF_EXP[(GF_LOG[factor] + GF_LOG[gen[j]]) % 255];
        }
      }
    }
    return buf.slice(data.length);
  }
  const VERSIONS = [
    [1,26,10,16,14],[2,44,16,28,26],[3,70,26,44,42],[4,100,36,64,62],[5,134,48,86,84],
    [6,172,64,108,106],[7,196,72,124,122],[8,242,88,154,152],[9,292,110,182,180],[10,346,130,216,213]
  ];
  function pickVersion(byteLen) {
    for (const v of VERSIONS) if (byteLen <= v[4]) return v;
    return VERSIONS[VERSIONS.length - 1];
  }
  function size(version) { return 17 + 4 * version; }
  function getAlignmentPositions(version) {
    if (version === 1) return [];
    const numAlign = Math.floor(version / 7) + 2;
    const step = Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
    const positions = [6];
    for (let pos = version * 4 + 10 - (numAlign - 2) * step; positions.length < numAlign; pos += step) positions.push(pos);
    return positions;
  }
  function encodeMatrix(text) {
    const data = new TextEncoder().encode(text);
    const v = pickVersion(data.length);
    const [version, totalCw, eccCw, dataCw] = v;
    const sz = size(version);
    const matrix = Array(sz).fill().map(() => Array(sz).fill(null));
    const reserved = Array(sz).fill().map(() => Array(sz).fill(false));
    const bits = [];
    function pushBits(value, n) { for (let i = n - 1; i >= 0; i--) bits.push((value >> i) & 1); }
    pushBits(0b0100, 4);
    pushBits(data.length, version <= 9 ? 8 : 16);
    for (const b of data) pushBits(b, 8);
    const targetBits = dataCw * 8;
    for (let i = 0; i < 4 && bits.length < targetBits; i++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);
    const padBytes = [0xec, 0x11];
    let pi = 0;
    while (bits.length < targetBits) pushBits(padBytes[pi++ % 2], 8);
    const dataBytes = new Uint8Array(dataCw);
    for (let i = 0; i < dataCw; i++) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j];
      dataBytes[i] = b;
    }
    const eccBytes = rsEncode(dataBytes, eccCw);
    const allBytes = new Uint8Array(totalCw);
    allBytes.set(dataBytes);
    allBytes.set(eccBytes, dataCw);
    function place(x, y, val) { matrix[y][x] = val; reserved[y][x] = true; }
    function placeFinder(cx, cy) {
      for (let dy = -1; dy <= 7; dy++) for (let dx = -1; dx <= 7; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || x >= sz || y < 0 || y >= sz) continue;
        const onRing = (dx === 0 || dx === 6 || dy === 0 || dy === 6) && dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
        const onCore = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
        place(x, y, (onRing || onCore) ? 1 : 0);
      }
    }
    placeFinder(0, 0); placeFinder(sz - 7, 0); placeFinder(0, sz - 7);
    for (let i = 8; i < sz - 8; i++) { place(i, 6, i % 2 === 0 ? 1 : 0); place(6, i, i % 2 === 0 ? 1 : 0); }
    const alignPos = getAlignmentPositions(version);
    for (const ax of alignPos) for (const ay of alignPos) {
      if (reserved[ay][ax]) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const onRing = Math.max(Math.abs(dx), Math.abs(dy)) === 2;
        const onCenter = dx === 0 && dy === 0;
        place(ax + dx, ay + dy, (onRing || onCenter) ? 1 : 0);
      }
    }
    place(8, sz - 8, 1);
    for (let i = 0; i < 9; i++) {
      if (!reserved[8][i]) reserved[8][i] = true;
      if (!reserved[i][8]) reserved[i][8] = true;
    }
    for (let i = 0; i < 8; i++) { reserved[8][sz - 1 - i] = true; reserved[sz - 1 - i][8] = true; }
    let bitIdx = 0; let upward = true;
    for (let colRight = sz - 1; colRight >= 1; colRight -= 2) {
      if (colRight === 6) colRight = 5;
      for (let i = 0; i < sz; i++) {
        const y = upward ? sz - 1 - i : i;
        for (let c = 0; c < 2; c++) {
          const x = colRight - c;
          if (matrix[y][x] === null && !reserved[y][x]) {
            if (bitIdx < allBytes.length * 8) {
              const byte = allBytes[bitIdx >> 3];
              const bit = (byte >> (7 - (bitIdx & 7))) & 1;
              matrix[y][x] = bit;
              bitIdx++;
            } else matrix[y][x] = 0;
          }
        }
      }
      upward = !upward;
    }
    const masked = matrix.map((row, y) => row.map((cell, x) => {
      if (cell === null) return 0;
      if (!reserved[y][x] && (x + y) % 2 === 0) return cell ^ 1;
      return cell;
    }));
    const FORMAT = 0b101010000010010;
    for (let i = 0; i <= 5; i++) masked[i][8] = (FORMAT >> (14 - i)) & 1;
    masked[7][8] = (FORMAT >> 8) & 1;
    masked[8][8] = (FORMAT >> 7) & 1;
    masked[8][7] = (FORMAT >> 6) & 1;
    for (let i = 0; i <= 5; i++) masked[8][5 - i] = (FORMAT >> i) & 1;
    for (let i = 0; i < 8; i++) masked[8][sz - 1 - i] = (FORMAT >> (14 - i)) & 1;
    for (let i = 0; i < 7; i++) masked[sz - 7 + i][8] = (FORMAT >> (6 - i)) & 1;
    return masked;
  }
  function toSvgPath(matrix, modulePx) {
    const sz = matrix.length;
    let d = '';
    for (let y = 0; y < sz; y++) for (let x = 0; x < sz; x++) {
      if (matrix[y][x] === 1) d += `M${x * modulePx},${y * modulePx}h${modulePx}v${modulePx}h-${modulePx}z`;
    }
    return { path: d, size: sz * modulePx };
  }
  return { encodeMatrix, toSvgPath };
})();

function generateQrSvg(text, sizePx = 280, fg = '#000', bg = '#fff') {
  try {
    const matrix = QR_GEN.encodeMatrix(text);
    const modulePx = Math.floor(sizePx / matrix.length);
    const { path, size: pxSize } = QR_GEN.toSvgPath(matrix, modulePx);
    const padding = Math.floor((sizePx - pxSize) / 2);
    return `<rect x="0" y="0" width="${sizePx}" height="${sizePx}" fill="${bg}" rx="12"/><g transform="translate(${padding},${padding})"><path d="${path}" fill="${fg}"/></g>`;
  } catch (e) {
    return `<rect x="0" y="0" width="${sizePx}" height="${sizePx}" fill="${bg}" rx="12"/><text x="${sizePx/2}" y="${sizePx/2}" text-anchor="middle" fill="${fg}" font-size="14">QR error</text>`;
  }
}


// ═══════════════════════════════════════════════════════════════════
//  v0.9 CAMPAIGN MODEL — campaigns table + theme-based palette
//  Unifies legacy `users` and new `campaigns` into one record shape
// ═══════════════════════════════════════════════════════════════════

async function loadSlugRecord(slug, env) {
  // Try campaigns first (v0.9), fallback to users (v0.8 legacy)
  const c = await env.SKYGIVE_DB.prepare('SELECT * FROM campaigns WHERE slug=?').bind(slug).first();
  if (c) {
    // Hydrate palette from theme_key
    const palette = getThemePalette(c.theme_key);
    return {
      ...c,
      // Map campaign fields to the shape renderBadgeSvg expects
      handle: c.display_handle,
      display_name: c.campaign_name,
      palette_json: JSON.stringify(palette),
      _source: 'campaign',
    };
  }
  const u = await env.SKYGIVE_DB.prepare('SELECT * FROM users WHERE slug=?').bind(slug).first();
  if (u) return { ...u, _source: 'user' };
  return null;
}

function generateAdminToken() {
  // 32-char hex, ~128 bits — enough entropy for non-account auth
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
}

function generateCampaignSlug() {
  // 8-char base36 — readable, URL-safe, ~2.8 trillion combos
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  let n = 0;
  for (const b of arr) n = n * 256 + b;
  return n.toString(36).slice(0, 8).padStart(8, '0');
}

// ── Public: list available themes (for theme picker UI) ──
async function handleListThemes() {
  return json({ ok: true, themes: listThemes() });
}

// ── Create a campaign (zero-auth, returns admin token in response only) ──
async function handleCreateCampaign(request, env, logger) {
  let body;
  try { body = await request.json(); } catch { return json({ ok:false, error:'invalid json' }, 400); }

  const campaign_name = String(body.campaign_name || '').trim().slice(0, 80);
  const display_handle = String(body.display_handle || '').trim().slice(0, 64).replace(/^@/, '');
  const btc_address = String(body.btc_address || '').trim();
  const theme_key = String(body.theme_key || 'midnight_aurora');
  const goal_text = String(body.goal_text || '').trim().slice(0, 100);
  const goal_fiat_amount = Number(body.goal_fiat_amount) || 0;
  const goal_currency = String(body.goal_currency || 'USD').toUpperCase().slice(0, 4);
  const bluesky_did = body.bluesky_did ? String(body.bluesky_did) : null;
  const bluesky_verified = bluesky_did ? 1 : 0;

  // Validation
  if (!campaign_name) return json({ ok:false, error:'campaign_name required' }, 400);
  if (!display_handle) return json({ ok:false, error:'display_handle required' }, 400);
  if (!btc_address || !validateBtcAddress(btc_address)) return json({ ok:false, error:'valid btc_address required' }, 400);
  if (!THEMES[theme_key]) return json({ ok:false, error:'invalid theme_key' }, 400);

  // Compute goal_sats from fiat if provided
  let goal_sats = 0;
  if (goal_fiat_amount > 0) {
    try {
      const rate = await getBtcRate(env, goal_currency);
      goal_sats = Math.round((goal_fiat_amount / rate) * 100000000);
    } catch (e) {
      await logger.warn('campaign-create', `rate fetch failed: ${e.message}`);
    }
  }

  const slug = generateCampaignSlug();
  const admin_token = generateAdminToken();
  const palette_json = JSON.stringify(getThemePalette(theme_key));
  const avatar_letter = (campaign_name.charAt(0) || display_handle.charAt(0) || '?').toUpperCase();
  const now = Math.floor(Date.now() / 1000);

  try {
    await env.SKYGIVE_DB.prepare(`INSERT INTO campaigns (
      slug, campaign_name, display_handle, did, bluesky_verified, avatar_letter,
      btc_address, goal_sats, goal_currency, goal_fiat_amount, goal_text,
      theme_key, palette_json, admin_token, status, created_at, source
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      slug, campaign_name, display_handle, bluesky_did, bluesky_verified, avatar_letter,
      btc_address, goal_sats, goal_currency, goal_fiat_amount || null, goal_text || null,
      theme_key, palette_json, admin_token, 'active', now, 'v0.9_builder'
    ).run();
  } catch (e) {
    await logger.error('campaign-create', e.message, { slug });
    return json({ ok:false, error:'failed to create campaign: ' + e.message }, 500);
  }

  await logger.info('campaign-create', `created ${slug} (${theme_key})`, { slug, theme: theme_key });

  return json({
    ok: true,
    slug,
    admin_token,
    campaign_url: `https://skygive.app/v/${slug}`,
    badge_url: `https://skygive.app/badge/${slug}.png`,
    admin_url: `https://skygive.app/admin/${admin_token}`,
    theme: getTheme(theme_key),
  });
}

// ── Get campaign by admin_token (for "My Campaigns" page) ──
async function handleAdminGet(admin_token, env) {
  const c = await env.SKYGIVE_DB.prepare('SELECT * FROM campaigns WHERE admin_token=?').bind(admin_token).first();
  if (!c) return json({ ok:false, error:'not found' }, 404);
  return json({ ok:true, campaign: c, theme: getTheme(c.theme_key) });
}

// ── Update campaign (requires admin_token) ──
async function handleUpdateCampaign(request, env, logger) {
  let body;
  try { body = await request.json(); } catch { return json({ ok:false, error:'invalid json' }, 400); }
  const admin_token = String(body.admin_token || '');
  if (!admin_token) return json({ ok:false, error:'admin_token required' }, 401);

  const c = await env.SKYGIVE_DB.prepare('SELECT * FROM campaigns WHERE admin_token=?').bind(admin_token).first();
  if (!c) return json({ ok:false, error:'invalid token' }, 401);

  const updates = {};
  if (body.campaign_name) updates.campaign_name = String(body.campaign_name).trim().slice(0,80);
  if (body.goal_text !== undefined) updates.goal_text = String(body.goal_text).trim().slice(0,100);
  if (body.theme_key && THEMES[body.theme_key]) {
    updates.theme_key = body.theme_key;
    updates.palette_json = JSON.stringify(getThemePalette(body.theme_key));
  }
  if (body.status && ['active','paused','archived'].includes(body.status)) updates.status = body.status;
  if (body.goal_fiat_amount !== undefined) {
    const amt = Number(body.goal_fiat_amount) || 0;
    updates.goal_fiat_amount = amt || null;
    if (amt > 0) {
      try {
        const rate = await getBtcRate(env, c.goal_currency || 'USD');
        updates.goal_sats = Math.round((amt / rate) * 100000000);
      } catch {}
    } else {
      updates.goal_sats = 0;
    }
  }

  if (!Object.keys(updates).length) return json({ ok:false, error:'no fields to update' }, 400);

  const setClauses = Object.keys(updates).map(k => `${k}=?`).join(', ');
  const values = Object.values(updates);
  await env.SKYGIVE_DB.prepare(`UPDATE campaigns SET ${setClauses} WHERE admin_token=?`)
    .bind(...values, admin_token).run();

  // Bust badge caches when theme changes
  if (updates.theme_key) {
    for (let v = 0; v < 5; v++) {
      await env.SKYGIVE_ASSETS.delete(`badges/${c.slug}-${updates.theme_key}-v${v}.png`).catch(()=>{});
      await env.SKYGIVE_ASSETS.delete(`badges/${c.slug}-${c.theme_key}-v${v}.png`).catch(()=>{});
    }
  }

  await logger.info('campaign-update', `updated ${c.slug}`, { slug: c.slug, fields: Object.keys(updates) });
  return json({ ok:true, slug: c.slug, updated: Object.keys(updates) });
}

// ── Archive a campaign ──
async function handleArchiveCampaign(request, env, logger) {
  let body;
  try { body = await request.json(); } catch { return json({ ok:false, error:'invalid json' }, 400); }
  const admin_token = String(body.admin_token || '');
  if (!admin_token) return json({ ok:false, error:'admin_token required' }, 401);

  const c = await env.SKYGIVE_DB.prepare('SELECT slug FROM campaigns WHERE admin_token=?').bind(admin_token).first();
  if (!c) return json({ ok:false, error:'invalid token' }, 401);
  await env.SKYGIVE_DB.prepare('UPDATE campaigns SET status=? WHERE admin_token=?').bind('archived', admin_token).run();
  await logger.info('campaign-archive', `archived ${c.slug}`, { slug: c.slug });
  return json({ ok:true, slug: c.slug, status: 'archived' });
}

function validateBtcAddress(addr) {
  if (!addr || typeof addr !== 'string') return false;
  // Bech32 (bc1...) or legacy (1.../3...)
  if (/^bc1[a-z0-9]{20,87}$/i.test(addr)) return true;
  if (/^[13][a-zA-Z0-9]{25,34}$/.test(addr)) return true;
  return false;
}

// ── Badge Renderer ──
function pickVariant(slug, mins) {
  // FNV-1a-ish hash for better distribution across slugs
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const seed = (h + mins * 2654435761) >>> 0;
  const variantIdx = seed % 5;  // 0..4 — five distinct layouts
  return {
    variantIdx,
    colorOffset: (seed >>> 3) % 5,
    decor: (seed >>> 6) % 5,
    accentSide: (seed >>> 9) % 4,
    gradAngle: (seed >>> 12) % 8,
  };
}
function rotatePalette(palette, offset) {
  return [...palette.slice(offset), ...palette.slice(0, offset)];
}
function gradient(angleIdx, c1, c2) {
  const angles = ['0','45','90','135','180','225','270','315'];
  return `<defs><linearGradient id="bgGrad" gradientTransform="rotate(${angles[angleIdx]})"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs>`;
}
function renderDecor(decor, w, h, color) {
  const op = '0.08';
  if (decor === 0) { let s = ''; for (let i=0;i<30;i++) s += `<circle cx="${(i*137)%w}" cy="${(i*61)%h}" r="3" fill="${color}" opacity="${op}"/>`; return s; }
  if (decor === 1) { let s = ''; for (let i=0;i<8;i++) s += `<line x1="0" y1="${i*85+50}" x2="${w}" y2="${i*85+50}" stroke="${color}" stroke-width="1" opacity="${op}"/>`; return s; }
  if (decor === 2) return `<polygon points="${w-200},0 ${w},0 ${w},200" fill="${color}" opacity="${op}"/><polygon points="0,${h-200} 0,${h} 200,${h}" fill="${color}" opacity="${op}"/>`;
  if (decor === 3) { let s = ''; for (let i=0;i<12;i++) s += `<rect x="${(i*197)%w}" y="${(i*113)%h}" width="6" height="6" fill="${color}" opacity="${op}"/>`; return s; }
  if (decor === 5) { let s = ''; for (let i=0;i<4;i++) s += `<rect x="0" y="${(i*127)%h}" width="${w}" height="2" fill="${color}" opacity="${op}"/>`; return s; }
  return '';
}
function goalCopy(v) { return ['Raised','Tip jar','Total received','Contributions'][v]; }

async function renderBadgeSvg_v1(user, env) {
  const palette = JSON.parse(user.palette_json || '["#1a2942","#0a1929","#7dd3fc","#a78bfa","#f1f5f9"]');
  const mins = Math.floor(Date.now() / 1000 / VARIANT_BUCKET_SECONDS);
  const variant = pickVariant(user.slug, mins);
  const rotated = rotatePalette(palette, variant.colorOffset);
  const [bgDark, bgMid, accent, accent2, text] = rotated;
  const w = BADGE_WIDTH, h = BADGE_HEIGHT;
  const bip21 = `bitcoin:${user.btc_address}?label=${encodeURIComponent('SkyGive tip to @' + user.handle)}`;
  const qrSize = 240;
  const qrSvg = generateQrSvg(bip21, qrSize, '#0a0a0a', '#ffffff');
  const total = Number(user.total_received_sats) || 0;
  const goal = Number(user.goal_sats) || 0;
  const pct = goal > 0 ? Math.min(100, Math.floor((total / goal) * 100)) : null;
  const avatarLeft = variant.layout === 0;
  const avatarX = avatarLeft ? 70 : w - 220;
  const textX = avatarLeft ? 220 : 70;
  const qrX = avatarLeft ? w - qrSize - 80 : 80;
  const textBlockX = avatarLeft ? 80 : qrX + qrSize + 40;
  const goalCopyText = goalCopy(variant.copyVariant);

  let avatarDataUri = '';
  if (user.avatar_r2_key && env.SKYGIVE_ASSETS) {
    try {
      const obj = await env.SKYGIVE_ASSETS.get(user.avatar_r2_key);
      if (obj) {
        const bytes = await obj.arrayBuffer();
        const u8 = new Uint8Array(bytes);
        let bin = '';
        for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
        const b64 = btoa(bin);
        const ct = obj.httpMetadata?.contentType || 'image/jpeg';
        avatarDataUri = `data:${ct};base64,${b64}`;
      }
    } catch (e) {}
  }
  const avatarSvg = avatarDataUri
    ? `<defs><clipPath id="ava"><circle cx="${avatarX + 75}" cy="160" r="75"/></clipPath></defs><image href="${avatarDataUri}" x="${avatarX}" y="85" width="150" height="150" clip-path="url(#ava)" preserveAspectRatio="xMidYMid slice"/><circle cx="${avatarX + 75}" cy="160" r="75" fill="none" stroke="${accent}" stroke-width="3"/>`
    : `<circle cx="${avatarX + 75}" cy="160" r="75" fill="${bgMid}" stroke="${accent}" stroke-width="3"/><text x="${avatarX + 75}" y="180" text-anchor="middle" fill="${text}" font-family="Inter, sans-serif" font-size="56" font-weight="700">${escapeXml((user.display_name || user.handle || '?').charAt(0).toUpperCase())}</text>`;

  let accentBar = '';
  if (variant.accentSide === 0) accentBar = `<rect x="0" y="0" width="${w}" height="14" fill="${accent}"/>`;
  else if (variant.accentSide === 1) accentBar = `<rect x="0" y="${h-14}" width="${w}" height="14" fill="${accent}"/>`;
  else if (variant.accentSide === 2) accentBar = `<rect x="0" y="0" width="14" height="${h}" fill="${accent}"/>`;
  else accentBar = `<rect x="${w-14}" y="0" width="14" height="${h}" fill="${accent}"/>`;

  let goalBlock = '';
  if (goal > 0) {
    const barX = textBlockX;
    const barW = w - textBlockX - 350;
    const fillW = (pct / 100) * barW;
    goalBlock = `<rect x="${barX}" y="430" width="${barW}" height="16" rx="8" fill="${bgMid}" opacity="0.5"/><rect x="${barX}" y="430" width="${fillW}" height="16" rx="8" fill="${accent}"/><text x="${barX}" y="470" font-family="Inter, sans-serif" font-size="22" font-weight="500" fill="${text}">${goalCopyText}: ${formatSats(total)} sats / ${formatSats(goal)} sats (${pct}%)</text>`;
  } else if (total > 0) {
    goalBlock = `<text x="${textBlockX}" y="450" font-family="Inter, sans-serif" font-size="24" font-weight="500" fill="${text}">${goalCopyText}: ${formatSats(total)} sats</text>`;
  }

  const shortAddr = user.btc_address.length > 14 ? user.btc_address.slice(0, 9) + '…' + user.btc_address.slice(-5) : user.btc_address;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
${gradient(variant.gradAngle, bgDark, bgMid)}
<rect x="0" y="0" width="${w}" height="${h}" fill="url(#bgGrad)"/>
${renderDecor(variant.decor, w, h, accent)}
${accentBar}
${avatarSvg}
<text x="${textX}" y="130" font-family="Inter, sans-serif" font-size="42" font-weight="700" fill="${text}">${escapeXml(user.display_name || user.handle)}</text>
<text x="${textX}" y="170" font-family="Inter, sans-serif" font-size="22" font-weight="400" fill="${text}" opacity="0.7">@${escapeXml(user.handle)}</text>
${user.goal_text ? `<text x="${textX}" y="220" font-family="Inter, sans-serif" font-size="24" font-weight="500" fill="${accent2}">"${escapeXml(user.goal_text.slice(0,60))}"</text>` : ''}
<g transform="translate(${qrX}, 280)">${qrSvg}</g>
<text x="${textBlockX}" y="320" font-family="Inter, sans-serif" font-size="18" font-weight="500" fill="${text}" opacity="0.6">SCAN OR CLICK CARD TO TIP WITH BITCOIN</text>
<text x="${textBlockX}" y="370" font-family="JetBrains Mono, monospace" font-size="26" font-weight="700" fill="${accent}">${escapeXml(shortAddr)}</text>
<text x="${textBlockX}" y="400" font-family="Inter, sans-serif" font-size="16" font-weight="400" fill="${text}" opacity="0.5">▶ Click card to open donation page</text>
${goalBlock}
<text x="${w/2}" y="${h-30}" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" font-weight="500" fill="${text}" opacity="0.8">⚡ Powered by SkyGive · skygive.app</text>
</svg>`;
}

const DEMO_USER = {
  slug: 'demo', did: 'did:plc:demo',
  handle: 'indicaindependent.bsky.social',
  display_name: 'Peter McVries',
  btc_address: DEMO_BTC_ADDRESS,
  goal_sats: 500000, goal_text: 'Tip jar for OSINT work',
  palette_json: JSON.stringify(['#0a1929','#1a2942','#7dd3fc','#a78bfa','#f1f5f9']),
  total_received_sats: 234500, avatar_r2_key: null,
};


// ── HTTP Handlers ──
async function handleRegister(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'invalid JSON' }, 400); }
  const handle = normalizeHandle(body.handle);
  const btc = String(body.btc_address || '').trim();
  const goal_currency = (String(body.goal_currency || 'USD').toUpperCase());
  const validCur = ['USD','CAD','EUR','GBP'].includes(goal_currency) ? goal_currency : 'USD';
  const goal_fiat_amount = Number(body.goal_fiat_amount) || null;
  // Legacy fallback: if old client sends goal_sats directly, accept it
  let goal_sats = Number(body.goal_sats) || null;
  // If fiat provided, derive sats via current BTC price
  if (goal_fiat_amount && !goal_sats) {
    const price = await getBtcPrice(validCur, env);
    if (price) {
      goal_sats = Math.round((goal_fiat_amount / price) * 1e8);
    }
  }
  const goal_text = String(body.goal_text || '').trim().slice(0, 100) || null;
  if (!validBlueskyHandle(handle)) return json({ ok: false, error: 'invalid Bluesky handle' }, 400);
  if (!validBitcoinAddress(btc)) return json({ ok: false, error: 'invalid Bitcoin address' }, 400);

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const ipBucket = `ip:${ip}`;
  const rl = await env.SKYGIVE_DB.prepare('SELECT count, reset_at FROM rate_limits WHERE bucket=?').bind(ipBucket).first();
  const now = nowUnix();
  if (rl && rl.reset_at > now && rl.count >= 5) {
    return json({ ok: false, error: 'rate limit: max 5 registrations per IP per hour' }, 429);
  }
  await env.SKYGIVE_DB.prepare(
    'INSERT INTO rate_limits (bucket, count, reset_at) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET count = count + 1, reset_at = CASE WHEN reset_at < ? THEN ? ELSE reset_at END'
  ).bind(ipBucket, now + 3600, now, now + 3600).run();

  let did, profile;
  try {
    did = await resolveBlueskyHandle(handle);
    profile = await getBlueskyProfile(did);
  } catch (e) {
    return json({ ok: false, error: `Bluesky lookup failed: ${e.message}` }, 400);
  }

  const slug = await makeSlug(did);
  const existing = await env.SKYGIVE_DB.prepare('SELECT slug, status FROM users WHERE did=?').bind(did).first();
  if (existing) {
    return json({
      ok: true, already_registered: true, slug: existing.slug, status: existing.status,
      badge_url: `https://skygive.app/badge/${existing.slug}`,
      donation_page: `https://skygive.app/v/${existing.slug}`,
    });
  }

  let avatar_r2_key = null;
  if (profile.avatar) {
    try {
      const imgResp = await fetch(profile.avatar);
      if (imgResp.ok) {
        const ct = imgResp.headers.get('content-type') || 'image/jpeg';
        const ext = ct.includes('png') ? 'png' : 'jpg';
        avatar_r2_key = `avatars/${slug}.${ext}`;
        const bytes = await imgResp.arrayBuffer();
        await env.SKYGIVE_ASSETS.put(avatar_r2_key, bytes, { httpMetadata: { contentType: ct } });
      }
    } catch (e) {}
  }

  const visionData = await extractPaletteFromAvatar(env, profile.avatar);
  const verifyToken = (await sha256hex(slug + ':' + now)).slice(0, 12);

  await env.SKYGIVE_DB.prepare(`
    INSERT INTO users (slug, did, handle, display_name, avatar_r2_key, btc_address, goal_sats, goal_text,
      goal_currency, goal_fiat_amount,
      palette_json, vibe_descriptors, theme_key, bio_excerpt, created_at, status, verification_token)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    slug, did, handle, profile.displayName || handle, avatar_r2_key,
    btc, goal_sats, goal_text,
    validCur, goal_fiat_amount,
    JSON.stringify(visionData.palette), visionData.vibe.join(', '), visionData.theme,
    (profile.description || '').slice(0, 200),
    now, 'pending_verification', verifyToken
  ).run();

  const composeText = `Setting up Bitcoin donations via SkyGive 🛰️\nskygive.app/v/${slug}\n#SkyGive\n(verification: ${verifyToken})`;

  return json({
    ok: true, slug, status: 'pending_verification',
    badge_url: `https://skygive.app/badge/${slug}`,
    donation_page: `https://skygive.app/v/${slug}`,
    preview_image: `https://skygive.app/badge/${slug}.svg`,
    verification: {
      token: verifyToken,
      instructions: 'To activate, post the following on your Bluesky within 24 hours. We detect it within 15 minutes.',
      suggested_post: composeText,
      compose_url: `https://bsky.app/intent/compose?text=${encodeURIComponent(composeText)}`,
    },
    palette: visionData.palette, vibe: visionData.vibe,
  });
}

async function handleBadgeHtml(slug, env) {
  const user = slug === 'demo' ? DEMO_USER : await env.SKYGIVE_DB.prepare('SELECT * FROM users WHERE slug=?').bind(slug).first();
  if (!user) return html('<h1>404 — slug not found</h1>', 404);
  if (slug !== 'demo') {
    env.SKYGIVE_DB.prepare('UPDATE users SET badge_view_count = badge_view_count + 1 WHERE slug=?').bind(slug).run().catch(() => {});
  }
  const imgUrl = `https://skygive.app/badge/${slug}.png?t=${Math.floor(Date.now() / 60000)}`;
  const donUrl = `https://skygive.app/v/${slug}`;
  const title = `Tip @${user.handle} with Bitcoin · SkyGive`;
  const desc = user.goal_text ? `"${user.goal_text}" — Send a Bitcoin tip via SkyGive.` : `Send a Bitcoin tip to @${user.handle} via SkyGive.`;
  return html(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title><meta property="og:type" content="website"><meta property="og:url" content="${donUrl}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(desc)}"><meta property="og:image" content="${imgUrl}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${imgUrl}"><meta http-equiv="refresh" content="0; url=${donUrl}"></head><body><p>Redirecting to <a href="${donUrl}">${donUrl}</a>…</p></body></html>`, 200, { 'Cache-Control': 'public, max-age=300' });
}

async function handleBadgeImage(slug, ext, env) {
  const user = slug === 'demo' ? DEMO_USER : await loadSlugRecord(slug, env);
  if (!user) return new Response('404 not found', { status: 404 });
  const svg = await renderBadgeSvg(user, env);
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=60' },
  });
}

async function handleAvatar(slug, env) {
  const user = await env.SKYGIVE_DB.prepare('SELECT avatar_r2_key FROM users WHERE slug=?').bind(slug).first();
  if (!user || !user.avatar_r2_key) return new Response('not found', { status: 404 });
  const obj = await env.SKYGIVE_ASSETS.get(user.avatar_r2_key);
  if (!obj) return new Response('not found', { status: 404 });
  return new Response(obj.body, {
    headers: { 'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg', 'Cache-Control': 'public, max-age=86400' },
  });
}

async function handleProfileFetch(handle, env) {
  const normalized = normalizeHandle(handle);
  if (!validBlueskyHandle(normalized)) return json({ ok: false, error: 'invalid handle' }, 400);
  try {
    const did = await resolveBlueskyHandle(normalized);
    const profile = await getBlueskyProfile(did);
    const palette = await extractPaletteFromAvatar(env, profile.avatar);
    return json({
      ok: true, did,
      profile: {
        handle: profile.handle, display_name: profile.displayName, description: profile.description,
        avatar: profile.avatar, banner: profile.banner,
        followers_count: profile.followersCount, follows_count: profile.followsCount, posts_count: profile.postsCount,
      },
      palette_extraction: palette,
    });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 400);
  }
}

async function handleStats(slug, env) {
  const u = await env.SKYGIVE_DB.prepare(
    'SELECT slug, handle, display_name, badge_view_count, link_click_count, donation_count, total_received_sats, status, created_at, verified_at FROM users WHERE slug=?'
  ).bind(slug).first();
  if (!u) return json({ ok: false, error: 'not found' }, 404);
  return json({ ok: true, ...u });
}


async function handleDonationPage(slug, env) {
  const user = slug === 'demo' ? DEMO_USER : await loadSlugRecord(slug, env);
  if (!user) return html('<h1>404 — slug not found</h1>', 404);
  if (slug !== 'demo') {
    if (user._source === 'campaign') {
      env.SKYGIVE_DB.prepare('UPDATE campaigns SET link_click_count = link_click_count + 1 WHERE slug=?').bind(slug).run().catch(() => {});
    } else {
      env.SKYGIVE_DB.prepare('UPDATE users SET link_click_count = link_click_count + 1 WHERE slug=?').bind(slug).run().catch(() => {});
    }
  }
  const palette = JSON.parse(user.palette_json || '["#0a1929","#1a2942","#7dd3fc","#a78bfa","#f1f5f9"]');
  const [bgDark, bgMid, accent, accent2, text] = palette;
  const bip21 = `bitcoin:${user.btc_address}?label=${encodeURIComponent('SkyGive tip to @' + user.handle)}`;
  const qrSize = 280;
  const qrSvg = generateQrSvg(bip21, qrSize, '#0a0a0a', '#ffffff');
  const total = Number(user.total_received_sats) || 0;
  const goal = Number(user.goal_sats) || 0;
  const pct = goal > 0 ? Math.min(100, Math.floor((total / goal) * 100)) : 0;
  const status = user.status || 'active';

  return html(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Tip @${escapeHtml(user.handle)} · SkyGive</title>
<meta property="og:title" content="Tip @${escapeHtml(user.handle)} with Bitcoin">
<meta property="og:description" content="${escapeHtml(user.goal_text || 'Bitcoin donation page on SkyGive')}">
<meta property="og:image" content="https://skygive.app/badge/${slug}.png">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'Inter',sans-serif;background:linear-gradient(135deg,${bgDark} 0%,${bgMid} 100%);color:${text};min-height:100vh;padding:24px;display:flex;align-items:center;justify-content:center}
.card{max-width:640px;width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:40px;backdrop-filter:blur(20px);box-shadow:0 24px 80px rgba(0,0,0,0.5)}
.header{display:flex;align-items:center;gap:20px;margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.1)}
.avatar{width:80px;height:80px;border-radius:50%;background:${bgMid};border:3px solid ${accent};display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:700;flex-shrink:0;background-size:cover;background-position:center}
.ident h1{font-size:28px;margin-bottom:4px;letter-spacing:-0.5px}
.ident .h{color:${accent};font-size:14px;font-family:'JetBrains Mono',monospace}
.status{display:inline-block;font-size:10px;padding:3px 10px;border-radius:999px;letter-spacing:1px;font-weight:600;margin-top:6px}
.status.active{background:rgba(74,222,128,0.2);color:#4ade80}
.status.pending_verification{background:rgba(251,191,36,0.2);color:#fbbf24}
.goal{font-size:17px;font-style:italic;color:${accent2};margin-bottom:24px;line-height:1.5}
.progress-wrap{margin-bottom:32px}
.bar{height:14px;background:rgba(255,255,255,0.1);border-radius:999px;overflow:hidden;margin-bottom:10px}
.bar-fill{height:100%;background:linear-gradient(90deg,${accent},${accent2});transition:width 0.6s}
.stats{display:flex;justify-content:space-between;font-size:14px;color:rgba(255,255,255,0.7)}
.qr-wrap{text-align:center;background:white;border-radius:16px;padding:20px;margin-bottom:24px}
.qr-wrap svg{width:${qrSize}px;height:${qrSize}px;max-width:100%}
.qr-label{font-size:13px;color:#0a0a0a;font-weight:600;margin-top:12px;letter-spacing:0.5px}
.addr-block{background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px;margin-bottom:20px}
.addr-label{font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:1px;margin-bottom:8px;font-weight:600}
.addr{font-family:'JetBrains Mono',monospace;font-size:15px;color:${accent};word-break:break-all;line-height:1.6}
.copy-btn{display:block;width:100%;background:${accent};color:${bgDark};border:none;padding:14px;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;margin-top:12px;letter-spacing:0.5px}
.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px}
.btn-secondary{display:block;text-align:center;padding:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;color:${text};text-decoration:none;font-size:14px;font-weight:600}
.footer{text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.08);font-size:13px;color:rgba(255,255,255,0.5)}
.footer a{color:${accent};text-decoration:none}
</style></head><body><div class="card">
<div class="header">
<div class="avatar"${user.avatar_r2_key ? ` style="background-image:url('https://skygive.app/api/avatar/${slug}')"` : ''}>${user.avatar_r2_key ? '' : escapeHtml((user.display_name || user.handle).charAt(0).toUpperCase())}</div>
<div class="ident"><h1>${escapeHtml(user.display_name || user.handle)}</h1><div class="h">@${escapeHtml(user.handle)}</div><span class="status ${status}">${status.replace(/_/g,' ').toUpperCase()}</span></div>
</div>
${user.goal_text ? `<div class="goal">"${escapeHtml(user.goal_text)}"</div>` : ''}
${goal > 0 ? `<div class="progress-wrap"><div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div><div class="stats"><span><strong>${formatSats(total)} sats</strong> raised</span><span>${pct}% of ${user.goal_fiat_amount ? formatFiat(user.goal_fiat_amount, user.goal_currency||'USD') + ' goal' : formatSats(goal) + ' sats goal'}</span></div></div>` : total > 0 ? `<div class="progress-wrap"><div class="stats"><span><strong>${formatSats(total)} sats</strong> received total</span></div></div>` : ''}
<div class="qr-wrap"><svg xmlns="http://www.w3.org/2000/svg" width="${qrSize}" height="${qrSize}" viewBox="0 0 ${qrSize} ${qrSize}">${qrSvg}</svg><div class="qr-label">SCAN WITH YOUR BITCOIN WALLET</div></div>
<div class="addr-block"><div class="addr-label">BITCOIN ADDRESS</div><div class="addr" id="addr">${escapeHtml(user.btc_address)}</div><button class="copy-btn" onclick="copyAddr()">COPY ADDRESS</button></div>
<div class="actions"><a class="btn-secondary" href="${bip21}">Open in wallet</a><a class="btn-secondary" href="https://mempool.space/address/${user.btc_address}" target="_blank" rel="noopener">View on mempool</a></div>
<div class="footer"><a href="https://bsky.app/profile/${user.handle}" target="_blank" rel="noopener">View @${escapeHtml(user.handle)} on Bluesky</a><br><br>⚡ Powered by <a href="https://skygive.app">SkyGive</a><br><small style="opacity:0.7">A project of <a href="https://bsky.app/profile/indicaindependent.bsky.social" target="_blank" rel="noopener">Indica Independent Media</a></small><br><small style="opacity:0.5">Non-custodial · Zero-auth · Bitcoin tips for Bluesky</small></div>
</div>
<script>function copyAddr(){const a=document.getElementById('addr').innerText;navigator.clipboard.writeText(a).then(()=>{const b=event.target;b.innerText='COPIED ✓';setTimeout(()=>b.innerText='COPY ADDRESS',1500);})}</script>
</body></html>`, 200, { 'Cache-Control': 'public, max-age=300' });
}


function landingPage() {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>SkyGive — Bitcoin tips for Bluesky causes & creators</title>
<meta property="og:title" content="SkyGive — Bitcoin tip cards for Bluesky">
<meta property="og:description" content="Generate an AI-styled donation card for any Bluesky profile. One URL, fresh card every post. Non-custodial. Zero auth.">
<meta property="og:url" content="https://skygive.app">
<meta property="og:type" content="website">
<meta property="og:image" content="https://skygive.app/badge/demo.svg">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'Inter',sans-serif;background:linear-gradient(135deg,#0a1929 0%,#1a2942 50%,#0a1929 100%);color:#e2e8f0;min-height:100vh;padding:24px}
.wrap{max-width:680px;margin:40px auto}
header{text-align:center;margin-bottom:48px}
.logo{font-size:64px;margin-bottom:8px}
h1{font-size:54px;letter-spacing:-1.5px;margin-bottom:12px;background:linear-gradient(135deg,#7dd3fc,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.tag{font-size:20px;color:#94a3b8;margin-bottom:8px}
.sub{font-size:15px;color:#64748b}
.pill{display:inline-block;padding:5px 12px;background:rgba(125,211,252,0.15);border:1px solid rgba(125,211,252,0.3);border-radius:999px;font-size:11px;color:#7dd3fc;margin-top:16px;letter-spacing:1px;font-weight:600}
.features{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:40px}
.feat{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:18px;text-align:center}
.feat-icon{font-size:28px;margin-bottom:8px}
.feat-title{font-size:13px;font-weight:700;letter-spacing:0.5px;margin-bottom:4px}
.feat-desc{font-size:12px;color:#94a3b8;line-height:1.4}
@media(max-width:560px){.features{grid-template-columns:1fr}}
.form{background:rgba(15,30,55,0.7);border:1px solid #1e3a5f;border-radius:20px;padding:32px;backdrop-filter:blur(20px)}
.form h2{font-size:24px;margin-bottom:6px;letter-spacing:-0.5px}
.form .h2sub{font-size:14px;color:#94a3b8;margin-bottom:24px}
.field{margin-bottom:18px}
label{display:block;font-size:12px;color:#7dd3fc;margin-bottom:6px;letter-spacing:0.5px;font-weight:600}
input,textarea{width:100%;background:rgba(0,0,0,0.3);border:1px solid #1e3a5f;border-radius:10px;padding:14px;color:#e2e8f0;font-size:15px;font-family:inherit}
input:focus,textarea:focus{outline:none;border-color:#7dd3fc}
.hint{font-size:11px;color:#64748b;margin-top:5px}
.optional{color:#64748b;font-weight:400}
button{width:100%;background:linear-gradient(135deg,#7dd3fc,#a78bfa);color:#0a1929;border:none;border-radius:10px;padding:16px;font-size:16px;font-weight:700;letter-spacing:0.5px;cursor:pointer;margin-top:8px}
button:disabled{opacity:0.5;cursor:not-allowed}
#result{margin-top:24px;padding:20px;background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.3);border-radius:12px;display:none}
#result.error{background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.3)}
#result h3{color:#4ade80;margin-bottom:12px;font-size:18px}
#result.error h3{color:#ef4444}
#result code{display:block;background:rgba(0,0,0,0.4);padding:10px;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:13px;word-break:break-all;margin:6px 0;color:#7dd3fc}
#result a{color:#7dd3fc;font-weight:600}
.demo-link{text-align:center;margin-top:32px;font-size:14px;color:#94a3b8}
.demo-link a{color:#7dd3fc;text-decoration:none;font-weight:600}
footer{text-align:center;margin-top:48px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.08);font-size:13px;color:#64748b}
</style></head><body><div class="wrap">
<header><div class="logo">🛰️</div><h1>SkyGive</h1>
<div class="tag">Bitcoin tip cards for Bluesky causes & creators</div>
<div class="sub">One URL. Fresh AI-styled card every post. Non-custodial. Zero auth.</div>
<div class="pill">PHASE 1 · BETA</div></header>
<div class="features">
<div class="feat"><div class="feat-icon">🎨</div><div class="feat-title">AI-STYLED</div><div class="feat-desc">Llama Vision matches your brand colors automatically</div></div>
<div class="feat"><div class="feat-icon">🔒</div><div class="feat-title">NON-CUSTODIAL · 0% FEE</div><div class="feat-desc">Every sat goes straight to your wallet. We charge nothing, ever. A free gift to good causes.</div></div>
<div class="feat"><div class="feat-icon">⚡</div><div class="feat-title">ZERO AUTH</div><div class="feat-desc">No signup. Just a handle, an address, and a goal.</div></div>
</div>
<div class="form">
<h2>Generate your badge</h2>
<div class="h2sub">Takes ~15 seconds. We fetch your profile and extract your color palette.</div>
<form id="regForm">
<div class="field"><label>BLUESKY HANDLE</label><input type="text" name="handle" placeholder="indicaindependent.bsky.social" required autocomplete="off"><div class="hint">Just the handle — or paste the full bsky.app/profile/ URL</div></div>
<div class="field"><label>BITCOIN ADDRESS</label><input type="text" name="btc_address" placeholder="bc1q..." required autocomplete="off" spellcheck="false"><div class="hint">Donations go directly here. SegWit (bc1) or legacy (1/3) accepted.</div></div>
<div class="field"><label>GOAL TEXT <span class="optional">(optional)</span></label><input type="text" name="goal_text" placeholder="Tip jar for OSINT work" maxlength="100"><div class="hint">Shown on every badge. Max 100 chars.</div></div>
<div class="field"><label>GOAL AMOUNT IN SATS <span class="optional">(optional)</span></label><input type="number" name="goal_sats" placeholder="500000" min="1000"><div class="hint">If set, shows a progress bar as you receive donations.</div></div>
<button type="submit" id="submitBtn">GENERATE MY BADGE →</button>
</form>
<div id="result"></div>
</div>
<div class="demo-link">Curious what it looks like? <a href="/v/demo">See the demo badge →</a></div>
<footer>Built with ☕ on Cloudflare's edge<br><small>SkyGive is a free, non-custodial positivity project · 0% platform fee · we never touch your sats</small></footer>
</div>
<script>
document.getElementById('regForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  const result = document.getElementById('result');
  btn.disabled = true; btn.innerText = 'GENERATING…';
  result.style.display = 'none'; result.classList.remove('error');
  const data = Object.fromEntries(new FormData(e.target));
  if (data.goal_sats) data.goal_sats = Number(data.goal_sats);
  try {
    const resp = await fetch('/api/register', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const j = await resp.json();
    if (!j.ok) {
      result.classList.add('error');
      result.innerHTML = '<h3>❌ ' + (j.error || 'Registration failed') + '</h3>';
      result.style.display = 'block';
    } else if (j.already_registered) {
      result.innerHTML = '<h3>✓ Already registered</h3><p>Your badge URL:</p><code>' + j.badge_url + '</code><p style="margin-top:14px"><a href="' + j.donation_page + '">Open your donation page →</a></p>';
      result.style.display = 'block';
    } else {
      result.innerHTML = '<h3>✓ Badge generated</h3><p>Your badge URL (paste in any Bluesky post):</p><code>' + j.badge_url + '</code><p style="margin-top:18px"><strong>⚠️ One more step:</strong> To activate, post the verification on your Bluesky:</p><code style="background:rgba(125,211,252,0.1);border-left:3px solid #7dd3fc;padding-left:10px">' + j.verification.suggested_post.replace(/\\n/g, '<br>') + '</code><p style="margin-top:14px"><a href="' + j.verification.compose_url + '" target="_blank">▶ Open Bluesky composer with pre-filled text</a></p><p style="margin-top:18px;font-size:13px;color:#94a3b8">Once you post it, your badge auto-activates within 15 minutes. Preview: <a href="' + j.preview_image + '">' + j.preview_image + '</a></p>';
      result.style.display = 'block';
    }
  } catch (err) {
    result.classList.add('error');
    result.innerHTML = '<h3>❌ Network error</h3><p>' + String(err) + '</p>';
    result.style.display = 'block';
  } finally {
    btn.disabled = false; btn.innerText = 'GENERATE MY BADGE →';
  }
});
</script></body></html>`;
}

// ── Main Router ──
// ═══════════════════════════════════════════════════════════════════
// OBSERVABILITY LAYER (added Phase 1.1)
// Structured logging, request tracing, error capture
// ═══════════════════════════════════════════════════════════════════

const LOG_LEVELS = { debug: 10, info: 20, warn: 30, error: 40, fatal: 50 };

async function hashIp(ip) {
  if (!ip) return null;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('skygive-salt:' + ip));
  return Array.from(new Uint8Array(buf)).slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

class Logger {
  constructor(env, request, requestId) {
    this.env = env;
    this.request = request;
    this.requestId = requestId;
    this.startTime = Date.now();
    this.events = [];
    this.contextStack = [];
  }

  pushContext(label, data) {
    this.contextStack.push({ label, data, ts: Date.now() });
  }

  async _persist(level, source, message, extra = {}) {
    const ip = this.request?.headers.get('cf-connecting-ip') || null;
    const ipHash = ip ? await hashIp(ip) : null;
    const ua = this.request?.headers.get('user-agent') || '';
    const uaHash = ua ? (await hashIp(ua)).slice(0, 8) : null;
    const url = this.request ? new URL(this.request.url) : null;

    const row = {
      ts: Math.floor(Date.now() / 1000),
      level,
      source,
      request_id: this.requestId,
      path: url?.pathname || null,
      method: this.request?.method || null,
      status: extra.status || null,
      duration_ms: extra.duration_ms || (Date.now() - this.startTime),
      ip_hash: ipHash,
      user_agent_hash: uaHash,
      message: String(message).slice(0, 1000),
      stack: extra.stack ? String(extra.stack).slice(0, 2000) : null,
      context_json: JSON.stringify({ ...extra, context_stack: this.contextStack }).slice(0, 4000),
      slug: extra.slug || null,
    };

    // Console log always (visible in CF observability)
    const consoleMsg = `[${level.toUpperCase()}] ${source} req=${this.requestId} ${message}`;
    if (level === 'error' || level === 'fatal') console.error(consoleMsg, extra);
    else if (level === 'warn') console.warn(consoleMsg);
    else console.log(consoleMsg);

    // Persist to D1 for warn+ (debug/info only to console to save quota)
    if (this.env?.SKYGIVE_DB && LOG_LEVELS[level] >= LOG_LEVELS.warn) {
      try {
        await this.env.SKYGIVE_DB.prepare(`
          INSERT INTO error_log (ts, level, source, request_id, path, method, status, duration_ms,
            ip_hash, user_agent_hash, message, stack, context_json, slug)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          row.ts, row.level, row.source, row.request_id, row.path, row.method,
          row.status, row.duration_ms, row.ip_hash, row.user_agent_hash,
          row.message, row.stack, row.context_json, row.slug
        ).run();
      } catch (e) {
        // Don't let logging errors crash the request
        console.error('Logger persist failed:', String(e));
      }
    }

    this.events.push(row);
  }

  debug(source, msg, extra) { return this._persist('debug', source, msg, extra); }
  info(source, msg, extra) { return this._persist('info', source, msg, extra); }
  warn(source, msg, extra) { return this._persist('warn', source, msg, extra); }
  error(source, msg, extra) { return this._persist('error', source, msg, extra); }
  fatal(source, msg, extra) { return this._persist('fatal', source, msg, extra); }

  async logRequest(status, bytesOut) {
    if (!this.env?.SKYGIVE_DB || !this.request) return;
    const ip = this.request.headers.get('cf-connecting-ip') || null;
    const ipHash = ip ? await hashIp(ip) : null;
    const url = new URL(this.request.url);
    try {
      await this.env.SKYGIVE_DB.prepare(`
        INSERT INTO request_log (ts, request_id, method, path, status, duration_ms, ip_hash, cf_country, cf_colo, bytes_out)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        Math.floor(Date.now() / 1000),
        this.requestId,
        this.request.method,
        url.pathname,
        status,
        Date.now() - this.startTime,
        ipHash,
        this.request.cf?.country || null,
        this.request.cf?.colo || null,
        bytesOut || null
      ).run();
    } catch (e) {
      console.error('Request log persist failed:', String(e));
    }
  }
}

function genRequestId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

async function wrapHandler(request, env, ctx, handler) {
  const requestId = request.headers.get('cf-ray') || genRequestId();
  const logger = new Logger(env, request, requestId);
  let response;
  let status = 500;
  let bytesOut = 0;
  try {
    response = await handler(request, env, ctx, logger);
    status = response.status;
    // Attempt to capture content-length
    const cl = response.headers.get('content-length');
    if (cl) bytesOut = Number(cl);
    // Add request ID header
    const newHeaders = new Headers(response.headers);
    newHeaders.set('X-Request-Id', requestId);
    newHeaders.set('X-SkyGive-Version', VERSION);
    response = new Response(response.body, { status: response.status, headers: newHeaders });
  } catch (e) {
    await logger.fatal('router', `Unhandled exception: ${e.message}`, {
      stack: e.stack,
      status: 500,
    });
    response = new Response(JSON.stringify({
      ok: false,
      error: 'Internal Server Error',
      request_id: requestId,
      message: 'Our error log captured this. Visit /api/logs to view.',
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
        'X-SkyGive-Version': VERSION,
      },
    });
  } finally {
    // Fire-and-forget request log persist (don't await — using waitUntil)
    ctx.waitUntil(logger.logRequest(status, bytesOut));
  }
  return response;
}

// /api/logs viewer endpoint
async function handleLogsView(request, env, logger) {
  const url = new URL(request.url);
  const level = url.searchParams.get('level') || 'warn';
  const limit = Math.min(200, Number(url.searchParams.get('limit')) || 50);
  const minLevel = LOG_LEVELS[level] || LOG_LEVELS.warn;

  const acceptHtml = (request.headers.get('accept') || '').includes('text/html');

  const rows = await env.SKYGIVE_DB.prepare(`
    SELECT id, ts, level, source, request_id, path, method, status, duration_ms, message, slug
    FROM error_log
    WHERE CASE level
      WHEN 'debug' THEN 10 WHEN 'info' THEN 20 WHEN 'warn' THEN 30
      WHEN 'error' THEN 40 WHEN 'fatal' THEN 50 ELSE 0 END >= ?
    ORDER BY ts DESC
    LIMIT ?
  `).bind(minLevel, limit).all();

  if (acceptHtml) {
    const rowsHtml = (rows.results || []).map(r => {
      const t = new Date(r.ts * 1000).toISOString();
      const lvlColor = { debug: '#6b7280', info: '#7dd3fc', warn: '#fbbf24', error: '#ef4444', fatal: '#dc2626' }[r.level] || '#94a3b8';
      return `<tr><td>${t}</td><td><span style="color:${lvlColor};font-weight:700">${r.level.toUpperCase()}</span></td><td>${escapeHtml(r.source || '')}</td><td>${escapeHtml(r.path || '')}</td><td>${r.status || ''}</td><td>${r.duration_ms || ''}ms</td><td>${escapeHtml(String(r.message || '').slice(0, 200))}</td><td>${escapeHtml(r.request_id || '')}</td></tr>`;
    }).join('');
    return html(`<!DOCTYPE html><html><head><title>SkyGive · Logs</title><style>
      body{font-family:'JetBrains Mono',monospace;background:#0a1929;color:#e2e8f0;padding:20px;margin:0}
      h1{color:#7dd3fc;font-size:20px;margin-bottom:16px}
      .filters{margin-bottom:16px;display:flex;gap:10px}
      .filters a{padding:6px 12px;background:rgba(255,255,255,0.05);border:1px solid #1e3a5f;border-radius:6px;text-decoration:none;color:#7dd3fc;font-size:12px}
      .filters a.active{background:#7dd3fc;color:#0a1929}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{text-align:left;padding:8px;background:#0d1f3a;border-bottom:1px solid #1e3a5f;font-weight:700;color:#7dd3fc;font-size:11px}
      td{padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.05);vertical-align:top}
      tr:hover{background:rgba(125,211,252,0.05)}
      .summary{margin-bottom:16px;color:#94a3b8;font-size:13px}
    </style></head><body>
    <h1>🛰️ SkyGive · Error Log Viewer</h1>
    <div class="summary">Showing ${rows.results?.length || 0} entries at level ≥ ${level.toUpperCase()} (limit ${limit})</div>
    <div class="filters">
      <a href="?level=debug" class="${level === 'debug' ? 'active' : ''}">DEBUG+</a>
      <a href="?level=info" class="${level === 'info' ? 'active' : ''}">INFO+</a>
      <a href="?level=warn" class="${level === 'warn' ? 'active' : ''}">WARN+</a>
      <a href="?level=error" class="${level === 'error' ? 'active' : ''}">ERROR+</a>
      <a href="?level=fatal" class="${level === 'fatal' ? 'active' : ''}">FATAL</a>
      <a href="/api/logs?level=${level}&limit=${limit}" style="background:rgba(167,139,250,0.2);color:#a78bfa">JSON</a>
    </div>
    <table><thead><tr><th>Timestamp (UTC)</th><th>Level</th><th>Source</th><th>Path</th><th>Status</th><th>Duration</th><th>Message</th><th>Request ID</th></tr></thead>
    <tbody>${rowsHtml || '<tr><td colspan="8" style="text-align:center;padding:40px;color:#64748b">No logs at this level</td></tr>'}</tbody></table>
    </body></html>`);
  }
  return json({ ok: true, level, limit, count: rows.results?.length || 0, logs: rows.results });
}

// /api/smoke endpoint — runs a self-test suite
async function handleSmokeTest(request, env, logger) {
  const url = new URL(request.url);
  const skipDestructive = url.searchParams.get('safe') === 'true';
  const startTs = Date.now();
  const results = [];

  async function test(name, fn) {
    const t0 = Date.now();
    try {
      const detail = await fn();
      const ok = detail?.ok !== false;
      results.push({ name, status: ok ? 'PASS' : 'FAIL', duration_ms: Date.now() - t0, detail });
      await logger.info('smoke', `${name}: ${ok ? 'PASS' : 'FAIL'}`, { detail });
    } catch (e) {
      results.push({ name, status: 'FAIL', duration_ms: Date.now() - t0, error: e.message, stack: e.stack });
      await logger.error('smoke', `${name}: EXCEPTION: ${e.message}`, { stack: e.stack });
    }
  }

  // T1: D1 connectivity
  await test('D1: connectivity + 10 tables', async () => {
    const r = await env.SKYGIVE_DB.prepare('SELECT COUNT(*) AS n FROM sqlite_master WHERE type=?').bind('table').first();
    return { ok: r.n >= 10, table_count: r.n };
  });

  // T2: R2 read/write
  await test('R2: write + read + delete probe', async () => {
    const key = `_smoke/probe-${Date.now()}.txt`;
    const content = 'skygive-smoke-' + Date.now();
    await env.SKYGIVE_ASSETS.put(key, content);
    const obj = await env.SKYGIVE_ASSETS.get(key);
    const got = await obj.text();
    await env.SKYGIVE_ASSETS.delete(key);
    return { ok: got === content, expected: content, got };
  });

  // T3: KV read/write
  await test('KV: write + read + delete probe', async () => {
    const key = `_smoke:probe:${Date.now()}`;
    const val = 'kv-smoke-' + Date.now();
    await env.SKYGIVE_CACHE.put(key, val, { expirationTtl: 60 });
    const got = await env.SKYGIVE_CACHE.get(key);
    await env.SKYGIVE_CACHE.delete(key);
    return { ok: got === val, expected: val, got };
  });

  // T4: Workers AI binding
  await test('AI: Llama 3.1 8B text generation probe', async () => {
    if (!env.AI) return { ok: false, error: 'no AI binding' };
    const r = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', {
      messages: [{ role: 'user', content: 'Say PASS in one word only.' }],
      max_tokens: 8,
    });
    const text = (r.response || '').toString().trim();
    return { ok: /PASS/i.test(text), got: text };
  });

  // T5: Bluesky public profile fetch
  await test('Bluesky: resolveHandle + getProfile (public, no auth)', async () => {
    const did = await resolveBlueskyHandle('bsky.app');
    const prof = await getBlueskyProfile(did);
    return { ok: !!did && !!prof.handle, did, handle: prof.handle, follower_count: prof.followersCount };
  });

  // T6: Bluesky authenticated session creation (if password set)
  await test('Bluesky: authenticated session creation (skygive service account)', async () => {
    if (!env.BSKY_APP_PASSWORD || !env.BSKY_HANDLE) return { ok: false, skipped: 'no BSKY creds' };
    const r = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: env.BSKY_HANDLE, password: env.BSKY_APP_PASSWORD }),
    });
    if (!r.ok) {
      const errText = await r.text();
      return { ok: false, status: r.status, error: errText.slice(0, 200) };
    }
    const session = await r.json();
    return { ok: !!session.accessJwt, did: session.did, handle: session.handle, has_jwt: !!session.accessJwt };
  });

  // T7: QR code generation
  await test('QR: encode + render SVG (BIP21 string)', async () => {
    const svg = generateQrSvg('bitcoin:bc1qREPLACE_WITH_YOUR_DEMO_BTC_ADDRESS_HERE?label=test', 280);
    return { ok: svg.includes('<rect') && svg.length > 1000, svg_length: svg.length };
  });

  // T8: Badge SVG render
  await test('Badge: render demo SVG', async () => {
    const demoUser = {
      slug: 'smoke-demo', did: 'did:plc:smoke',
      handle: 'smoke.bsky.social', display_name: 'Smoke Test',
      btc_address: 'bc1qREPLACE_WITH_YOUR_DEMO_BTC_ADDRESS_HERE',
      goal_sats: 100000, goal_text: 'Smoke test goal',
      palette_json: JSON.stringify(['#0a1929','#1a2942','#7dd3fc','#a78bfa','#f1f5f9']),
      total_received_sats: 50000, avatar_r2_key: null,
    };
    const svg = await renderBadgeSvg(demoUser, env);
    return { ok: svg.startsWith('<?xml') && svg.includes('SkyGive') && svg.length > 2000, svg_length: svg.length };
  });

  // T9: Validation functions
  await test('Validators: BTC + handle format checks', async () => {
    const cases = [
      ['bc1qREPLACE_WITH_YOUR_DEMO_BTC_ADDRESS_HERE', true, 'bc1 valid'],
      ['1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', true, 'legacy P2PKH valid'],
      ['not-an-address', false, 'gibberish should fail'],
      ['', false, 'empty should fail'],
    ];
    const handleCases = [
      ['indicaindependent.bsky.social', true],
      ['bsky.app', true],
      ['nope', false],
      ['', false],
    ];
    const btcResults = cases.map(([a, exp, label]) => ({ label, addr: a, expected: exp, actual: validBitcoinAddress(a), pass: validBitcoinAddress(a) === exp }));
    const handleResults = handleCases.map(([h, exp]) => ({ handle: h, expected: exp, actual: validBlueskyHandle(h), pass: validBlueskyHandle(h) === exp }));
    const allPass = [...btcResults, ...handleResults].every(r => r.pass);
    return { ok: allPass, btc_results: btcResults, handle_results: handleResults };
  });

  // T10: End-to-end registration dry-run (read-only, won't write to DB)
  await test('E2E: profile fetch + palette extraction (read-only)', async () => {
    const did = await resolveBlueskyHandle('indicaindependent.bsky.social');
    const profile = await getBlueskyProfile(did);
    const palette = await extractPaletteFromAvatar(env, profile.avatar);
    return {
      ok: !!did && palette.palette.length === 5,
      did, display_name: profile.displayName,
      palette: palette.palette,
      vibe: palette.vibe,
      theme: palette.theme,
    };
  });

  // T11: Demo badge endpoint (in-process render)
  await test('Endpoint: /badge/demo.svg renders', async () => {
    const demoUser = {
      slug: 'demo', did: 'did:plc:demo',
      handle: 'indicaindependent.bsky.social', display_name: 'Peter McVries',
      btc_address: 'bc1qREPLACE_WITH_YOUR_DEMO_BTC_ADDRESS_HERE',
      goal_sats: 500000, goal_text: 'Tip jar for OSINT work',
      palette_json: JSON.stringify(['#0a1929','#1a2942','#7dd3fc','#a78bfa','#f1f5f9']),
      total_received_sats: 234500, avatar_r2_key: null,
    };
    const svg = await renderBadgeSvg(demoUser, env);
    return { ok: svg.includes('Peter McVries') && svg.includes('Powered by SkyGive'), svg_length: svg.length };
  });

  // T12: Fonts in R2
  await test('R2: fonts exist (inter-400, inter-500, inter-700, jbmono)', async () => {
    const fonts = ['inter-400', 'inter-500', 'inter-700', 'jbmono'];
    const results = {};
    for (const f of fonts) {
      const obj = await env.SKYGIVE_ASSETS.head(`fonts/${f}.ttf`);
      results[f] = obj ? obj.size : null;
    }
    return { ok: Object.values(results).every(s => s && s > 100000), sizes: results };
  });

  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = total - passed;
  const duration = Date.now() - startTs;

  // Persist run
  if (env.SKYGIVE_DB) {
    try {
      await env.SKYGIVE_DB.prepare(`
        INSERT INTO smoke_test_runs (ts, suite, total, passed, failed, duration_ms, results_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        Math.floor(Date.now() / 1000), 'full', total, passed, failed, duration,
        JSON.stringify(results)
      ).run();
    } catch (e) { /* non-fatal */ }
  }

  return json({
    ok: failed === 0,
    summary: { total, passed, failed, duration_ms: duration, all_passed: failed === 0 },
    results,
    timestamp: new Date().toISOString(),
  });
}

// Simple log clear endpoint (with secret)
async function handleLogClear(request, env, logger) {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  if (secret !== env.LOG_CLEAR_SECRET && env.LOG_CLEAR_SECRET) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }
  const beforeTs = Math.floor(Date.now() / 1000) - (7 * 86400);
  const r1 = await env.SKYGIVE_DB.prepare('DELETE FROM error_log WHERE ts < ?').bind(beforeTs).run();
  const r2 = await env.SKYGIVE_DB.prepare('DELETE FROM request_log WHERE ts < ?').bind(beforeTs).run();
  return json({ ok: true, error_log_deleted: r1.meta.changes, request_log_deleted: r2.meta.changes });
}


// ═══════════════════════════════════════════════════════════════════
// ROUTER (wrapped with observability)
// ═══════════════════════════════════════════════════════════════════

async function route(request, env, ctx, logger) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  // Landing
  if (path === '/' || path === '/index.html') {
    return html(landingPage_v3(), 200, { 'Cache-Control': 'public, max-age=300' });
  }
  // My Campaigns (local browser list)
  if (path === '/my-campaigns') {
    return html(myCampaignsPage(), 200, { 'Cache-Control': 'public, max-age=300' });
  }

  // Health
  if (path === '/health' || path === '/api/health') {
    return json({
      ok: true, service: 'skygive-api', version: VERSION, phase: 'Phase 1', domain: 'skygive.app',
      bindings: { d1: !!env.SKYGIVE_DB, r2: !!env.SKYGIVE_ASSETS, kv: !!env.SKYGIVE_CACHE, ai: !!env.AI,
        bsky_app_password: !!env.BSKY_APP_PASSWORD, bsky_handle: !!env.BSKY_HANDLE },
      timestamp: new Date().toISOString(),
      request_id: logger.requestId,
    });
  }

  // DB check
  if (path === '/api/db-check') {
    const r = await env.SKYGIVE_DB.prepare('SELECT name FROM sqlite_master WHERE type=? ORDER BY name').bind('table').all();
    const counts = {};
    for (const t of ['users','donations','events','donor_messages','error_log','request_log','smoke_test_runs']) {
      try { const c = await env.SKYGIVE_DB.prepare(`SELECT COUNT(*) as n FROM ${t}`).first(); counts[t] = c.n; }
      catch(e) { counts[t] = 'err'; }
    }
    return json({ ok: true, tables: r.results.map(t => t.name), counts });
  }

  // Observability endpoints
  if (path === '/api/logs') return await handleLogsView(request, env, logger);
  if (path === '/api/smoke') return await handleSmokeTest(request, env, logger);
  if (path === '/api/log-clear' && request.method === 'POST') return await handleLogClear(request, env, logger);

  // Profile (test endpoint)
  if (path.startsWith('/api/profile/')) {
    try { return await handleProfileFetch(decodeURIComponent(path.slice('/api/profile/'.length)), env); }
    catch (e) { await logger.error('profile-fetch', e.message, { stack: e.stack }); throw e; }
  }

  // Register
  if (path === '/api/register' && request.method === 'POST') {
    try { return await handleRegister(request, env); }
    catch (e) { await logger.error('register', e.message, { stack: e.stack }); throw e; }
  }

  // Verify (POST = active poll, GET = read-only status)
  const verifyMatch = path.match(/^\/api\/verify\/([a-z0-9]+)$/i);
  if (verifyMatch) {
    try { return await handleVerify(verifyMatch[1], request, env, logger); }
    catch (e) { await logger.error('verify', e.message, { stack: e.stack, slug: verifyMatch[1] }); throw e; }
  }

  // Admin force-verify (requires X-Admin-Token header)
  const forceVerifyMatch = path.match(/^\/api\/admin\/force-verify\/([a-z0-9]+)$/i);
  if (forceVerifyMatch && request.method === 'POST') {
    try { return await handleAdminForceVerify(forceVerifyMatch[1], request, env, logger); }
    catch (e) { await logger.error('admin-verify', e.message, { stack: e.stack }); throw e; }
  }

  // BTC price (fiat conversion)
  if (path === '/api/btc-price') {
    return await handleBtcPrice(request, env);
  }

    // Stats
  if (path.startsWith('/api/stats/')) return await handleStats(path.slice('/api/stats/'.length), env);

  // Avatar
  if (path.startsWith('/api/avatar/')) return await handleAvatar(path.slice('/api/avatar/'.length), env);

  // Badge image — SVG or PNG (PNG uses Browser Rendering for Bluesky compatibility)
  const badgeImg = path.match(/^\/badge\/([a-z0-9]+)\.(svg|png)$/i);
  if (badgeImg) {
    const ext = badgeImg[2].toLowerCase();
    if (ext === 'png') {
      try { return await handleBadgePng(badgeImg[1], env, logger, url); }
      catch (e) { await logger.error('badge-png', e.message, { stack: e.stack, slug: badgeImg[1] }); throw e; }
    }
    try { return await handleBadgeImage(badgeImg[1], 'svg', env); }
    catch (e) { await logger.error('badge-img', e.message, { stack: e.stack, slug: badgeImg[1] }); throw e; }
  }

  // ─── v0.9 Campaign endpoints ───
  if (path === '/api/themes' && request.method === 'GET') return await handleListThemes();
  if (path === '/api/campaigns/create' && request.method === 'POST') return await handleCreateCampaign(request, env, logger);
  if (path === '/api/campaigns/update' && request.method === 'POST') return await handleUpdateCampaign(request, env, logger);
  if (path === '/api/campaigns/archive' && request.method === 'POST') return await handleArchiveCampaign(request, env, logger);
  const adminGet = path.match(/^\/api\/admin\/([a-f0-9]{32})$/i);
  if (adminGet && request.method === 'GET') return await handleAdminGet(adminGet[1], env);

  // Admin cache bust
  const bustMatch = path.match(/^\/api\/admin\/bust-cache\/([a-z0-9]+)$/i);
  if (bustMatch && request.method === 'POST') {
    try { return await handleBustCache(bustMatch[1], request, env, logger); }
    catch (e) { await logger.error('bust-cache', e.message, { stack: e.stack }); throw e; }
  }

  // Badge HTML (link card wrapper)
  const badgeHtml = path.match(/^\/badge\/([a-z0-9]+)$/i);
  if (badgeHtml) return await handleBadgeHtml(badgeHtml[1], env);

  // Donation page
  const donation = path.match(/^\/v\/([a-z0-9]+)$/i);
  if (donation) return await handleDonationPage(donation[1], env);

  // Legal pages
  if (path === '/privacy' || path === '/terms') {
    return html(`<!DOCTYPE html><html><head><title>SkyGive · ${path.slice(1)}</title><style>body{font-family:sans-serif;max-width:680px;margin:40px auto;padding:24px;background:#0a1929;color:#e2e8f0}h1{color:#7dd3fc}a{color:#7dd3fc}</style></head><body><h1>SkyGive · ${path === '/privacy' ? 'Privacy Policy' : 'Terms of Service'}</h1><p><strong>SkyGive is a free, non-custodial positivity project.</strong> We exist to help good causes raise Bitcoin donations on Bluesky.</p><p><strong>0% platform fee.</strong> SkyGive charges nothing and takes no cut of any donation. Every sat a donor sends goes 100% to the creator's wallet, directly, with no SkyGive infrastructure in between.</p><p><strong>We never hold user funds.</strong> The QR code and BIP21 link on every donation page point straight at the creator's own Bitcoin address. We do not custody, route, or skim any portion of any payment, ever.</p><p><strong>What we store:</strong> Bluesky handle, public profile data, the creator's Bitcoin address (so we can render the QR), an optional goal text, and view-count analytics. No emails, no passwords, no donor identities.</p><p>By using SkyGive you confirm you own the Bluesky handle and the Bitcoin address you register. Provided as-is, no warranty. Use at your own risk.</p><p><a href="/">← Back to SkyGive</a></p></body></html>`);
  }

  // 404 — log it
  await logger.warn('router', `404: ${path}`, { status: 404 });
  return json({ ok: false, error: 'Not found', path, request_id: logger.requestId }, 404);
}

// ============================================================
// SKYGIVE — VERIFICATION HANDLER
// Added: 2026-05-19 — wires up /api/verify/:slug
// ============================================================
//
// Flow:
//   1. Client calls POST /api/verify/:slug
//   2. We pull the user row, get their DID + verification_token
//   3. We call app.bsky.feed.getAuthorFeed for that DID
//   4. We scan the most recent ~30 posts for the token string
//   5. If found: flip status to 'verified', set verified_at, log event
//   6. Return JSON with verification result
//
// Also adds:
//   - GET /api/verify/:slug — non-mutating status check
//   - POST /api/admin/force-verify/:slug — admin override (requires ADMIN_TOKEN header)
// ============================================================

async function handleVerify(slug, request, env, logger) {
  const user = await env.SKYGIVE_DB
    .prepare('SELECT slug, did, handle, verification_token, status, verified_at FROM users WHERE slug = ?')
    .bind(slug).first();

  if (!user) {
    return json({ ok: false, error: 'slug not found', slug }, 404);
  }

  // Already verified — short-circuit
  if (user.status === 'verified') {
    return json({
      ok: true,
      slug: user.slug,
      handle: user.handle,
      status: 'verified',
      verified_at: user.verified_at,
      message: 'Already verified.'
    });
  }

  if (!user.verification_token) {
    return json({ ok: false, error: 'no verification token on file — re-register', slug }, 400);
  }

  // GET = read-only check (just report current state without polling Bluesky)
  if (request.method === 'GET') {
    return json({
      ok: true,
      slug: user.slug,
      handle: user.handle,
      status: user.status,
      verification_token: user.verification_token,
      hint: 'POST to this endpoint to trigger a Bluesky check.'
    });
  }

  // POST = actively poll Bluesky for the token
  await logger.info('verify', `polling Bluesky for ${user.handle}`, { slug, token: user.verification_token });

  // Need a Bluesky session — use the service account creds
  let session;
  try {
    session = await bskyLogin(env);
  } catch (e) {
    await logger.error('verify-login', e.message, { stack: e.stack });
    return json({ ok: false, error: 'bluesky login failed', detail: e.message }, 502);
  }

  // Pull recent author feed for the user's DID
  let feed;
  try {
    const feedUrl = `https://bsky.social/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(user.did)}&limit=30`;
    const r = await fetch(feedUrl, {
      headers: { 'Authorization': `Bearer ${session.accessJwt}` }
    });
    if (!r.ok) {
      const body = await r.text();
      await logger.error('verify-feed', `HTTP ${r.status}`, { body: body.slice(0, 300) });
      return json({ ok: false, error: 'failed to fetch user feed', http: r.status }, 502);
    }
    feed = await r.json();
  } catch (e) {
    await logger.error('verify-feed', e.message, { stack: e.stack });
    return json({ ok: false, error: 'feed fetch error', detail: e.message }, 502);
  }

  // Scan posts for the verification token
  const posts = feed.feed || [];
  const token = user.verification_token;
  let matchedPost = null;

  for (const item of posts) {
    const text = item?.post?.record?.text || '';
    if (text.includes(token)) {
      matchedPost = {
        uri: item.post.uri,
        cid: item.post.cid,
        text: text.slice(0, 200),
        indexed_at: item.post.indexedAt
      };
      break;
    }
  }

  if (!matchedPost) {
    await logger.info('verify-miss', `token not found in ${posts.length} recent posts`, { slug, token });
    return json({
      ok: false,
      verified: false,
      slug: user.slug,
      handle: user.handle,
      status: 'pending_verification',
      message: `Verification token "${token}" not found in last ${posts.length} posts. Post the verification snippet on Bluesky and retry.`,
      posts_scanned: posts.length
    });
  }

  // Found it — flip to verified
  const now = Math.floor(Date.now() / 1000);
  await env.SKYGIVE_DB
    .prepare('UPDATE users SET status = ?, verified_at = ? WHERE slug = ?')
    .bind('verified', now, slug).run();

  await env.SKYGIVE_DB
    .prepare('INSERT INTO events (slug, event_type, event_data, ts) VALUES (?, ?, ?, ?)')
    .bind(slug, 'verified', JSON.stringify({ post_uri: matchedPost.uri, token }), now).run();

  await logger.info('verify-ok', `verified ${user.handle}`, { slug, post_uri: matchedPost.uri });

  return json({
    ok: true,
    verified: true,
    slug: user.slug,
    handle: user.handle,
    status: 'verified',
    verified_at: now,
    matched_post: matchedPost,
    badge_url: `https://skygive.app/badge/${slug}`,
    donation_page: `https://skygive.app/v/${slug}`,
    message: '🎉 Verified! Your tip card is now active.'
  });
}

// ============================================================
// ADMIN — force verify (operator override)
// POST /api/admin/force-verify/:slug
// Header: X-Admin-Token: <ADMIN_TOKEN secret>
// ============================================================
async function handleAdminForceVerify(slug, request, env, logger) {
  const tokenHdr = request.headers.get('x-admin-token') || '';
  if (!env.ADMIN_TOKEN || tokenHdr !== env.ADMIN_TOKEN) {
    await logger.warn('admin-auth', 'invalid admin token', { slug });
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  const user = await env.SKYGIVE_DB
    .prepare('SELECT slug, handle, status FROM users WHERE slug = ?')
    .bind(slug).first();

  if (!user) return json({ ok: false, error: 'slug not found' }, 404);

  const now = Math.floor(Date.now() / 1000);
  await env.SKYGIVE_DB
    .prepare('UPDATE users SET status = ?, verified_at = ? WHERE slug = ?')
    .bind('verified', now, slug).run();

  await env.SKYGIVE_DB
    .prepare('INSERT INTO events (slug, event_type, event_data, ts) VALUES (?, ?, ?, ?)')
    .bind(slug, 'admin_force_verify', JSON.stringify({ prior_status: user.status }), now).run();

  await logger.info('admin-verify', `force-verified ${user.handle}`, { slug });

  return json({
    ok: true,
    verified: true,
    slug,
    handle: user.handle,
    status: 'verified',
    verified_at: now,
    method: 'admin_override',
    badge_url: `https://skygive.app/badge/${slug}`,
    donation_page: `https://skygive.app/v/${slug}`
  });
}

// ============================================================
// SHARED — bluesky login helper (reused across handlers)
// ============================================================
async function bskyLogin(env) {
  if (!env.BSKY_HANDLE || !env.BSKY_APP_PASSWORD) {
    throw new Error('BSKY_HANDLE or BSKY_APP_PASSWORD not bound');
  }
  const r = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: env.BSKY_HANDLE, password: env.BSKY_APP_PASSWORD })
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`bsky login ${r.status}: ${body.slice(0, 200)}`);
  }
  return await r.json();
}


// ============================================================
// SKYGIVE — PNG RENDERING via Cloudflare Browser Rendering
// Added v0.3.0 — 2026-05-19
// ============================================================
//
// Bluesky's CardyB link-card scraper rejects SVG og:images.
// We rasterize the SVG to PNG using Cloudflare's Browser Rendering API
// and cache the result in R2 keyed by slug + palette hash.
//
// Flow:
//   1. /badge/:slug.png — check R2 cache → return if hit
//   2. Generate SVG from user palette
//   3. Wrap SVG in HTML, send to Browser Rendering /screenshot
//   4. Store PNG in R2 with cache key
//   5. Return PNG bytes with image/png content-type
//
// Donation page og:image is updated to point to .png not .svg
// ============================================================

async function renderBadgePng(slug, env, logger, opts = {}) {
  const user = slug === 'demo' ? DEMO_USER : await loadSlugRecord(slug, env);
  if (!user) return null;

  // Determine current variant (or forced for debug)
  const mins = Math.floor(Date.now() / 1000 / VARIANT_BUCKET_SECONDS);
  const naturalVariant = pickVariant(user.slug, mins);
  const variantIdx = (typeof opts.forceVariant === 'number' && opts.forceVariant >= 0 && opts.forceVariant <= 4)
    ? opts.forceVariant
    : naturalVariant.variantIdx;

  // Cache key includes variant index so each variant is independently cached
  const cacheKey = `badges/${slug}-${user.theme_key || 'default'}-v${variantIdx}.png`;

  // Try R2 cache (unless skipCache is set)
  if (!opts.skipCache) {
    try {
      const cached = await env.SKYGIVE_ASSETS.get(cacheKey);
      if (cached) {
        const buf = await cached.arrayBuffer();
        await logger.info('badge-png-cache', `cache hit ${cacheKey}`, { slug, variant: variantIdx, bytes: buf.byteLength });
        return new Uint8Array(buf);
      }
    } catch (e) {
      await logger.warn('badge-png-cache', `cache miss/error: ${e.message}`, { slug });
    }
  }

  // Generate SVG (use forced variant if specified)
  let svg;
  if (typeof opts.forceVariant === 'number') {
    // Build the forced variant directly
    const palette = JSON.parse(user.palette_json || '["#06140d","#0a2818","#4ade80","#86efac","#f0fdf4"]');
    const forced = { ...naturalVariant, variantIdx: opts.forceVariant };
    const rotated = rotatePalette(palette, forced.colorOffset);
    const renderers = [renderVariantClassic, renderVariantQRLeft, renderVariantStacked, renderVariantSpotlight, renderVariantSplit];
    svg = await renderers[opts.forceVariant](user, env, rotated, forced);
  } else {
    svg = await renderBadgeSvg(user, env);
  }

  const html = `<!DOCTYPE html><html><head><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}svg{display:block}</style></head><body>${svg}</body></html>`;

  const acct = env.CLOUDFLARE_ACCOUNT_ID || 'YOUR_CLOUDFLARE_ACCOUNT_ID';
  const renderResp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/browser-rendering/screenshot`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.CF_BROWSER_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      html,
      viewport: { width: BADGE_WIDTH, height: BADGE_HEIGHT },
      screenshotOptions: { type: 'png', omitBackground: false },
    }),
  });

  if (!renderResp.ok) {
    const body = await renderResp.text();
    await logger.error('badge-png-render', `HTTP ${renderResp.status}: ${body.slice(0,300)}`, { slug });
    throw new Error(`Browser rendering failed: ${renderResp.status}`);
  }

  const png = new Uint8Array(await renderResp.arrayBuffer());
  await logger.info('badge-png-render', `rendered ${png.byteLength} bytes`, { slug, variant: variantIdx });

  // Cache to R2 (skip if debug)
  if (!opts.skipCache) {
    try {
      await env.SKYGIVE_ASSETS.put(cacheKey, png, {
        httpMetadata: { contentType: 'image/png', cacheControl: 'public, max-age=300' },
      });
    } catch (e) {
      await logger.warn('badge-png-cache-put', e.message, { slug });
    }
  }

  return png;
}

async function handleBadgePng(slug, env, logger, url) {
  // Parse optional ?variant=0..4 for debug/preview
  const opts = {};
  if (url) {
    const v = url.searchParams.get('variant');
    if (v !== null && /^[0-4]$/.test(v)) {
      opts.forceVariant = Number(v);
      opts.skipCache = url.searchParams.get('nocache') === '1';
    }
  }
  const png = await renderBadgePng(slug, env, logger, opts);
  if (!png) return new Response('not found', { status: 404 });
  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=300',
      'X-Image-Source': 'cf-browser-rendering',
    },
  });
}

// ============================================================
// ADMIN — bust the badge cache for a slug
// POST /api/admin/bust-cache/:slug — requires X-Admin-Token
// ============================================================
async function handleBustCache(slug, request, env, logger) {
  const tokenHdr = request.headers.get('x-admin-token') || '';
  if (!env.ADMIN_TOKEN || tokenHdr !== env.ADMIN_TOKEN) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }
  const user = await env.SKYGIVE_DB.prepare('SELECT theme_key FROM users WHERE slug=?').bind(slug).first();
  if (!user) return json({ ok: false, error: 'slug not found' }, 404);

  // Delete all 5 variant caches for this slug
  const deleted = [];
  for (let v = 0; v < 5; v++) {
    const key = `badges/${slug}-${user.theme_key || 'default'}-v${v}.png`;
    await env.SKYGIVE_ASSETS.delete(key);
    deleted.push(key);
  }
  await logger.info('cache-bust', `deleted ${deleted.length} variant caches for ${slug}`, { slug });
  return json({ ok: true, slug, deleted });
}


// ============================================================
// SKYGIVE v0.4.0 — Spring 2026 design refresh + multicurrency
// ============================================================

// ---------- BTC PRICE (KV-cached, 5min TTL) ----------
async function getBtcPrice(currency, env) {
  const cur = (currency || 'USD').toUpperCase();
  if (!['USD','CAD','EUR','GBP'].includes(cur)) return null;
  const key = `btc-price:v1`;
  try {
    const cached = await env.SKYGIVE_CACHE.get(key, { type: 'json' });
    if (cached && cached.ts && (Date.now() - cached.ts) < 5 * 60 * 1000) {
      return cached.prices[cur];
    }
  } catch (e) {}

  // Try CoinGecko first
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,cad,eur,gbp', {
      headers: { 'User-Agent': 'SkyGive/0.4.0 (https://skygive.app)' },
      cf: { cacheTtl: 60 },
    });
    if (r.ok) {
      const j = await r.json();
      if (j.bitcoin && j.bitcoin.usd) {
        const prices = {
          USD: j.bitcoin.usd, CAD: j.bitcoin.cad,
          EUR: j.bitcoin.eur, GBP: j.bitcoin.gbp,
        };
        await env.SKYGIVE_CACHE.put(key, JSON.stringify({ ts: Date.now(), prices, source: 'coingecko' }), { expirationTtl: 600 });
        return prices[cur];
      }
    }
  } catch (e) {}

  // Fallback: Coinbase spot price (only USD/EUR/GBP — CAD via USD * fx fallback)
  try {
    const fetchSpot = async (c) => {
      const r = await fetch(`https://api.coinbase.com/v2/prices/BTC-${c}/spot`, {
        cf: { cacheTtl: 60 },
      });
      if (!r.ok) return null;
      const j = await r.json();
      return Number(j.data?.amount);
    };
    const [usd, cad, eur, gbp] = await Promise.all([
      fetchSpot('USD'), fetchSpot('CAD'), fetchSpot('EUR'), fetchSpot('GBP'),
    ]);
    if (usd) {
      const prices = {
        USD: usd, CAD: cad || (usd * 1.37),
        EUR: eur || (usd * 0.86), GBP: gbp || (usd * 0.75),
      };
      await env.SKYGIVE_CACHE.put(key, JSON.stringify({ ts: Date.now(), prices, source: 'coinbase' }), { expirationTtl: 600 });
      return prices[cur];
    }
  } catch (e) {}

  return null;
}

function currencySymbol(cur) {
  return { USD: '$', CAD: 'C$', EUR: '€', GBP: '£' }[cur] || '$';
}

function formatFiat(amount, cur) {
  const sym = currencySymbol(cur);
  if (amount >= 1000) return `${sym}${(amount/1000).toFixed(amount >= 10000 ? 0 : 1)}k`;
  return `${sym}${Math.round(amount)}`;
}

async function handleBtcPrice(request, env) {
  const url = new URL(request.url);
  const cur = (url.searchParams.get('currency') || 'USD').toUpperCase();
  const price = await getBtcPrice(cur, env);
  if (price == null) return json({ ok: false, error: 'price unavailable' }, 503);
  return json({ ok: true, currency: cur, btc_price: price, timestamp: Date.now() });
}

// ---------- BADGE SVG v0.4.0 (spring 2026 refresh) ----------
async function renderBadgeSvg(user, env) {
  const palette = JSON.parse(user.palette_json || '["#06140d","#0a2818","#4ade80","#86efac","#f0fdf4"]');
  const mins = Math.floor(Date.now() / 1000 / VARIANT_BUCKET_SECONDS);
  const variant = pickVariant(user.slug, mins);
  const rotated = rotatePalette(palette, variant.colorOffset);

  // Dispatch to the correct layout function
  const renderers = [
    renderVariantClassic,
    renderVariantQRLeft,
    renderVariantStacked,
    renderVariantSpotlight,
    renderVariantSplit,
  ];
  const renderer = renderers[variant.variantIdx] || renderers[0];
  return await renderer(user, env, rotated, variant);
}

// ════════════════════════════════════════════════════════════
//  SHARED HELPERS — used by all 5 variants
// ════════════════════════════════════════════════════════════
const TEXT_SHADOW = 'paint-order:stroke;stroke:#000000;stroke-width:5px;stroke-opacity:0.6;stroke-linejoin:round';
const TEXT_SHADOW_SM = 'paint-order:stroke;stroke:#000000;stroke-width:3px;stroke-opacity:0.7;stroke-linejoin:round';

async function loadAvatarDataUri(user, env) {
  if (!user.avatar_r2_key || !env.SKYGIVE_ASSETS) return '';
  try {
    const obj = await env.SKYGIVE_ASSETS.get(user.avatar_r2_key);
    if (!obj) return '';
    const bytes = await obj.arrayBuffer();
    const u8 = new Uint8Array(bytes);
    let bin = '';
    for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
    const b64 = btoa(bin);
    const ct = obj.httpMetadata?.contentType || 'image/jpeg';
    return `data:${ct};base64,${b64}`;
  } catch (e) { return ''; }
}

function avatarBlock(cx, cy, r, accent, dataUri, initial, bgMid) {
  if (dataUri) {
    return `<defs><clipPath id="ava-${cx}-${cy}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs><circle cx="${cx}" cy="${cy + 5}" r="${r + 5}" fill="#000" opacity="0.55"/><image href="${dataUri}" x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" clip-path="url(#ava-${cx}-${cy})" preserveAspectRatio="xMidYMid slice"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${accent}" stroke-width="4"/>`;
  }
  return `<circle cx="${cx}" cy="${cy + 5}" r="${r + 5}" fill="#000" opacity="0.55"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${bgMid}" stroke="${accent}" stroke-width="4"/><text x="${cx}" y="${cy + r*0.35}" text-anchor="middle" fill="#ffffff" font-family="Inter, sans-serif" font-size="${Math.round(r*0.9)}" font-weight="900">${escapeXml(initial)}</text>`;
}

function shortAddress(addr) {
  return addr.length > 18 ? addr.slice(0, 10) + '…' + addr.slice(-6) : addr;
}

function goalDisplayText(user) {
  const goalSats = Number(user.goal_sats) || 0;
  if (goalSats <= 0) return null;
  const cur = user.goal_currency || 'USD';
  const fiat = Number(user.goal_fiat_amount);
  return fiat > 0 ? `${formatFiat(fiat, cur)} goal` : `${formatSats(goalSats)} sats goal`;
}

function progressPct(user) {
  const total = Number(user.total_received_sats) || 0;
  const goalSats = Number(user.goal_sats) || 0;
  return goalSats > 0 ? Math.min(100, Math.floor((total / goalSats) * 100)) : 0;
}

function buildBg(w, h, bgDark, bgMid, accent, decorIdx, accentSide, gradAngle) {
  const angles = ['0','45','90','135','180','225','270','315'];
  const gradTransform = `rotate(${angles[gradAngle]})`;

  let accentBar = '';
  if (accentSide === 0) accentBar = `<rect x="0" y="0" width="${w}" height="6" fill="${accent}"/>`;
  else if (accentSide === 1) accentBar = `<rect x="0" y="${h-6}" width="${w}" height="6" fill="${accent}"/>`;
  else if (accentSide === 2) accentBar = `<rect x="0" y="0" width="6" height="${h}" fill="${accent}"/>`;
  else accentBar = `<rect x="${w-6}" y="0" width="6" height="${h}" fill="${accent}"/>`;

  let decor = '';
  const op = '0.10';
  if (decorIdx === 0) { for (let i=0;i<35;i++) decor += `<circle cx="${(i*137)%w}" cy="${(i*61)%h}" r="3" fill="${accent}" opacity="${op}"/>`; }
  else if (decorIdx === 1) { for (let i=0;i<8;i++) decor += `<line x1="0" y1="${i*85+50}" x2="${w}" y2="${i*85+50}" stroke="${accent}" stroke-width="1" opacity="${op}"/>`; }
  else if (decorIdx === 2) { decor = `<polygon points="${w-220},0 ${w},0 ${w},220" fill="${accent}" opacity="${op}"/><polygon points="0,${h-220} 0,${h} 220,${h}" fill="${accent}" opacity="${op}"/>`; }
  else if (decorIdx === 3) { for (let i=0;i<14;i++) decor += `<rect x="${(i*197)%w}" y="${(i*113)%h}" width="6" height="6" fill="${accent}" opacity="${op}"/>`; }
  else if (decorIdx === 4) {
    // Diagonal stripes
    for (let i = -h; i < w; i += 80) decor += `<line x1="${i}" y1="0" x2="${i+h}" y2="${h}" stroke="${accent}" stroke-width="1" opacity="${op}"/>`;
  }

  return `<defs>
    <linearGradient id="bgGrad" gradientTransform="${gradTransform}">
      <stop offset="0%" stop-color="${bgDark}"/>
      <stop offset="100%" stop-color="${bgMid}"/>
    </linearGradient>
    <radialGradient id="textShade" cx="30%" cy="50%" r="65%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="${w}" height="${h}" fill="url(#bgGrad)"/>
  ${decor}
  <rect x="0" y="0" width="${w}" height="${h}" fill="url(#textShade)"/>
  ${accentBar}`;
}

function footerBar(w, h, accent2) {
  return `<rect x="0" y="${h - 50}" width="${w}" height="50" fill="#000000" opacity="0.7"/>
<text x="${w/2}" y="${h - 18}" text-anchor="middle" font-family="Inter, sans-serif" font-size="17" font-weight="800" fill="${accent2}" letter-spacing="0.5">⚡  skygive.app  ·  A project of Indica Independent Media</text>`;
}

function bip21Uri(user) {
  return `bitcoin:${user.btc_address}?label=${encodeURIComponent('SkyGive tip to @' + user.handle)}`;
}

// ════════════════════════════════════════════════════════════
//  VARIANT 0 — CLASSIC (avatar L, text, QR R) — our v0.7 winner
// ════════════════════════════════════════════════════════════
async function renderVariantClassic(user, env, rotated, variant) {
  const [bgDark, bgMid, accent, accent2] = rotated;
  const w = BADGE_WIDTH, h = BADGE_HEIGHT;
  const qrSize = 260;
  const qrSvg = generateQrSvg(bip21Uri(user), qrSize, '#0a0a0a', '#ffffff');
  const dataUri = await loadAvatarDataUri(user, env);
  const initial = (user.display_name || user.handle || '?').charAt(0).toUpperCase();

  const padding = 70;
  const avatarR = 90;
  const avatarCx = padding + avatarR;
  const avatarCy = h / 2;
  const textX = padding + avatarR * 2 + 40;
  const qrX = w - qrSize - padding;
  const qrY = (h - qrSize) / 2;

  const pct = progressPct(user);
  const goalText = goalDisplayText(user);
  const goalBlock = goalText ? `
<rect x="${textX}" y="455" width="460" height="14" rx="7" fill="#000000" opacity="0.6"/>
<rect x="${textX}" y="455" width="${(pct/100)*460}" height="14" rx="7" fill="${accent}"/>
<text x="${textX}" y="497" font-family="Inter, sans-serif" font-size="20" font-weight="800" fill="#ffffff" style="${TEXT_SHADOW}">${pct}% of ${escapeXml(goalText)}</text>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
${buildBg(w, h, bgDark, bgMid, accent, variant.decor, variant.accentSide, variant.gradAngle)}
${avatarBlock(avatarCx, avatarCy, avatarR, accent, dataUri, initial, bgMid)}
<text x="${textX}" y="270" font-family="Inter, sans-serif" font-size="58" font-weight="900" fill="#ffffff" letter-spacing="-0.5" style="${TEXT_SHADOW}">${escapeXml(user.display_name || user.handle)}</text>
<text x="${textX}" y="310" font-family="Inter, sans-serif" font-size="24" font-weight="700" fill="#ffffff" opacity="0.95" style="${TEXT_SHADOW}">@${escapeXml(user.handle)}</text>
${user.goal_text ? `<text x="${textX}" y="370" font-family="Inter, sans-serif" font-size="24" font-style="italic" font-weight="600" fill="#ffffff" opacity="0.98" style="${TEXT_SHADOW}">"${escapeXml(user.goal_text.slice(0, 55))}"</text>` : ''}
<text x="${textX}" y="425" font-family="Inter, sans-serif" font-size="15" font-weight="900" fill="${accent}" letter-spacing="3" style="${TEXT_SHADOW_SM}">TIP WITH BITCOIN · ${escapeXml(shortAddress(user.btc_address))}</text>
${goalBlock}
<rect x="${qrX - 14}" y="${qrY - 14}" width="${qrSize + 28}" height="${qrSize + 28}" rx="18" fill="#ffffff"/>
<g transform="translate(${qrX}, ${qrY})">${qrSvg}</g>
<text x="${qrX + qrSize/2}" y="${qrY + qrSize + 38}" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="900" fill="#ffffff" letter-spacing="2" style="${TEXT_SHADOW}">SCAN TO TIP</text>
${footerBar(w, h, accent2)}
</svg>`;
}

// ════════════════════════════════════════════════════════════
//  VARIANT 1 — QR LEFT (mirror of Classic — QR L, text, avatar R)
// ════════════════════════════════════════════════════════════
async function renderVariantQRLeft(user, env, rotated, variant) {
  const [bgDark, bgMid, accent, accent2] = rotated;
  const w = BADGE_WIDTH, h = BADGE_HEIGHT;
  const qrSize = 260;
  const qrSvg = generateQrSvg(bip21Uri(user), qrSize, '#0a0a0a', '#ffffff');
  const dataUri = await loadAvatarDataUri(user, env);
  const initial = (user.display_name || user.handle || '?').charAt(0).toUpperCase();

  const padding = 70;
  const avatarR = 90;
  const qrX = padding;
  const qrY = (h - qrSize) / 2;
  const avatarCx = w - padding - avatarR;
  const avatarCy = h / 2;
  const textX = qrX + qrSize + 50;
  const textRightEdge = avatarCx - avatarR - 30;
  const textW = textRightEdge - textX;

  const pct = progressPct(user);
  const goalText = goalDisplayText(user);
  const goalBlock = goalText ? `
<rect x="${textX}" y="455" width="${Math.min(textW, 460)}" height="14" rx="7" fill="#000000" opacity="0.6"/>
<rect x="${textX}" y="455" width="${(pct/100)*Math.min(textW, 460)}" height="14" rx="7" fill="${accent}"/>
<text x="${textX}" y="497" font-family="Inter, sans-serif" font-size="20" font-weight="800" fill="#ffffff" style="${TEXT_SHADOW}">${pct}% of ${escapeXml(goalText)}</text>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
${buildBg(w, h, bgDark, bgMid, accent, variant.decor, variant.accentSide, variant.gradAngle)}
<rect x="${qrX - 14}" y="${qrY - 14}" width="${qrSize + 28}" height="${qrSize + 28}" rx="18" fill="#ffffff"/>
<g transform="translate(${qrX}, ${qrY})">${qrSvg}</g>
<text x="${qrX + qrSize/2}" y="${qrY + qrSize + 38}" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="900" fill="#ffffff" letter-spacing="2" style="${TEXT_SHADOW}">SCAN TO TIP</text>
${avatarBlock(avatarCx, avatarCy, avatarR, accent, dataUri, initial, bgMid)}
<text x="${textX}" y="270" font-family="Inter, sans-serif" font-size="54" font-weight="900" fill="#ffffff" letter-spacing="-0.5" style="${TEXT_SHADOW}">${escapeXml(user.display_name || user.handle)}</text>
<text x="${textX}" y="308" font-family="Inter, sans-serif" font-size="22" font-weight="700" fill="#ffffff" opacity="0.95" style="${TEXT_SHADOW}">@${escapeXml(user.handle)}</text>
${user.goal_text ? `<text x="${textX}" y="365" font-family="Inter, sans-serif" font-size="22" font-style="italic" font-weight="600" fill="#ffffff" opacity="0.98" style="${TEXT_SHADOW}">"${escapeXml(user.goal_text.slice(0, 50))}"</text>` : ''}
<text x="${textX}" y="420" font-family="Inter, sans-serif" font-size="14" font-weight="900" fill="${accent}" letter-spacing="3" style="${TEXT_SHADOW_SM}">TIP WITH BITCOIN · ${escapeXml(shortAddress(user.btc_address))}</text>
${goalBlock}
${footerBar(w, h, accent2)}
</svg>`;
}

// ════════════════════════════════════════════════════════════
//  VARIANT 2 — STACKED CENTER (avatar top center, text middle, QR right)
// ════════════════════════════════════════════════════════════
async function renderVariantStacked(user, env, rotated, variant) {
  const [bgDark, bgMid, accent, accent2] = rotated;
  const w = BADGE_WIDTH, h = BADGE_HEIGHT;
  const qrSize = 240;
  const qrSvg = generateQrSvg(bip21Uri(user), qrSize, '#0a0a0a', '#ffffff');
  const dataUri = await loadAvatarDataUri(user, env);
  const initial = (user.display_name || user.handle || '?').charAt(0).toUpperCase();

  const padding = 70;
  const avatarR = 75;
  // Avatar top-left, text below
  const avatarCx = padding + avatarR + 20;
  const avatarCy = 140;
  const textX = padding;
  const textY = avatarCy + avatarR + 60;  // text block under avatar
  const qrX = w - qrSize - padding;
  const qrY = (h - qrSize) / 2;

  const pct = progressPct(user);
  const goalText = goalDisplayText(user);
  const goalBlock = goalText ? `
<rect x="${textX}" y="495" width="500" height="14" rx="7" fill="#000000" opacity="0.6"/>
<rect x="${textX}" y="495" width="${(pct/100)*500}" height="14" rx="7" fill="${accent}"/>
<text x="${textX}" y="538" font-family="Inter, sans-serif" font-size="20" font-weight="800" fill="#ffffff" style="${TEXT_SHADOW}">${pct}% of ${escapeXml(goalText)}</text>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
${buildBg(w, h, bgDark, bgMid, accent, variant.decor, variant.accentSide, variant.gradAngle)}
${avatarBlock(avatarCx, avatarCy, avatarR, accent, dataUri, initial, bgMid)}
<text x="${avatarCx + avatarR + 25}" y="${avatarCy - 5}" font-family="Inter, sans-serif" font-size="50" font-weight="900" fill="#ffffff" letter-spacing="-0.5" style="${TEXT_SHADOW}">${escapeXml(user.display_name || user.handle)}</text>
<text x="${avatarCx + avatarR + 25}" y="${avatarCy + 30}" font-family="Inter, sans-serif" font-size="22" font-weight="700" fill="#ffffff" opacity="0.95" style="${TEXT_SHADOW}">@${escapeXml(user.handle)}</text>
${user.goal_text ? `<text x="${textX}" y="${textY}" font-family="Inter, sans-serif" font-size="26" font-style="italic" font-weight="600" fill="#ffffff" opacity="0.98" style="${TEXT_SHADOW}">"${escapeXml(user.goal_text.slice(0, 50))}"</text>` : ''}
<text x="${textX}" y="${textY + 75}" font-family="Inter, sans-serif" font-size="15" font-weight="900" fill="${accent}" letter-spacing="3" style="${TEXT_SHADOW_SM}">TIP WITH BITCOIN</text>
<text x="${textX}" y="${textY + 115}" font-family="JetBrains Mono, ui-monospace, monospace" font-size="26" font-weight="800" fill="#ffffff" style="${TEXT_SHADOW}">${escapeXml(shortAddress(user.btc_address))}</text>
${goalBlock}
<rect x="${qrX - 14}" y="${qrY - 14}" width="${qrSize + 28}" height="${qrSize + 28}" rx="18" fill="#ffffff"/>
<g transform="translate(${qrX}, ${qrY})">${qrSvg}</g>
<text x="${qrX + qrSize/2}" y="${qrY + qrSize + 38}" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="900" fill="#ffffff" letter-spacing="2" style="${TEXT_SHADOW}">SCAN TO TIP</text>
${footerBar(w, h, accent2)}
</svg>`;
}

// ════════════════════════════════════════════════════════════
//  VARIANT 3 — SPOTLIGHT (massive avatar L, minimal text, big QR R)
// ════════════════════════════════════════════════════════════
async function renderVariantSpotlight(user, env, rotated, variant) {
  const [bgDark, bgMid, accent, accent2] = rotated;
  const w = BADGE_WIDTH, h = BADGE_HEIGHT;
  const qrSize = 280;
  const qrSvg = generateQrSvg(bip21Uri(user), qrSize, '#0a0a0a', '#ffffff');
  const dataUri = await loadAvatarDataUri(user, env);
  const initial = (user.display_name || user.handle || '?').charAt(0).toUpperCase();

  const padding = 60;
  const avatarR = 130;  // big spotlight avatar
  const avatarCx = padding + avatarR;
  const avatarCy = (h - 50) / 2;  // accounting for footer
  const textX = padding + avatarR * 2 + 40;
  const qrX = w - qrSize - padding;
  const qrY = (h - qrSize - 50) / 2;

  const pct = progressPct(user);
  const goalText = goalDisplayText(user);
  const goalBlock = goalText ? `
<text x="${textX}" y="430" font-family="Inter, sans-serif" font-size="20" font-weight="800" fill="${accent}" letter-spacing="1.5" style="${TEXT_SHADOW_SM}">${pct}% · ${escapeXml(goalText)}</text>
<rect x="${textX}" y="445" width="380" height="12" rx="6" fill="#000000" opacity="0.6"/>
<rect x="${textX}" y="445" width="${(pct/100)*380}" height="12" rx="6" fill="${accent}"/>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
${buildBg(w, h, bgDark, bgMid, accent, variant.decor, variant.accentSide, variant.gradAngle)}
${avatarBlock(avatarCx, avatarCy, avatarR, accent, dataUri, initial, bgMid)}
<text x="${textX}" y="245" font-family="Inter, sans-serif" font-size="62" font-weight="900" fill="#ffffff" letter-spacing="-0.5" style="${TEXT_SHADOW}">${escapeXml(user.display_name || user.handle)}</text>
<text x="${textX}" y="290" font-family="Inter, sans-serif" font-size="24" font-weight="700" fill="#ffffff" opacity="0.95" style="${TEXT_SHADOW}">@${escapeXml(user.handle)}</text>
${user.goal_text ? `<text x="${textX}" y="350" font-family="Inter, sans-serif" font-size="22" font-style="italic" font-weight="600" fill="#ffffff" opacity="0.98" style="${TEXT_SHADOW}">"${escapeXml(user.goal_text.slice(0, 45))}"</text>` : ''}
<text x="${textX}" y="397" font-family="Inter, sans-serif" font-size="13" font-weight="900" fill="${accent}" letter-spacing="3" style="${TEXT_SHADOW_SM}">⚡ TIP WITH BITCOIN · ${escapeXml(shortAddress(user.btc_address))}</text>
${goalBlock}
<rect x="${qrX - 14}" y="${qrY - 14}" width="${qrSize + 28}" height="${qrSize + 28}" rx="18" fill="#ffffff"/>
<g transform="translate(${qrX}, ${qrY})">${qrSvg}</g>
${footerBar(w, h, accent2)}
</svg>`;
}

// ════════════════════════════════════════════════════════════
//  VARIANT 4 — SPLIT (full-color L panel with avatar+name, dark R panel with QR+info)
// ════════════════════════════════════════════════════════════
async function renderVariantSplit(user, env, rotated, variant) {
  const [bgDark, bgMid, accent, accent2] = rotated;
  const w = BADGE_WIDTH, h = BADGE_HEIGHT;
  const qrSize = 230;
  const qrSvg = generateQrSvg(bip21Uri(user), qrSize, '#0a0a0a', '#ffffff');
  const dataUri = await loadAvatarDataUri(user, env);
  const initial = (user.display_name || user.handle || '?').charAt(0).toUpperCase();

  const splitX = w * 0.45;  // 45/55 split
  const avatarR = 100;
  const avatarCx = splitX / 2;
  const avatarCy = h / 2 - 60;

  const rightX = splitX + 50;
  const qrX = w - qrSize - 60;
  const qrY = (h - qrSize - 50) / 2;

  const pct = progressPct(user);
  const goalText = goalDisplayText(user);
  const goalBlock = goalText ? `
<rect x="${rightX}" y="455" width="320" height="12" rx="6" fill="#000000" opacity="0.55"/>
<rect x="${rightX}" y="455" width="${(pct/100)*320}" height="12" rx="6" fill="${accent}"/>
<text x="${rightX}" y="495" font-family="Inter, sans-serif" font-size="18" font-weight="800" fill="#ffffff" style="${TEXT_SHADOW_SM}">${pct}% of ${escapeXml(goalText)}</text>` : '';

  // L panel uses accent-as-bg, R panel uses dark bg
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
  <linearGradient id="lpanel" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="${accent}"/>
    <stop offset="100%" stop-color="${bgMid}"/>
  </linearGradient>
  <linearGradient id="rpanel" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="${bgDark}"/>
    <stop offset="100%" stop-color="${bgMid}"/>
  </linearGradient>
</defs>
<rect x="0" y="0" width="${splitX}" height="${h}" fill="url(#lpanel)"/>
<rect x="${splitX}" y="0" width="${w - splitX}" height="${h}" fill="url(#rpanel)"/>
<rect x="${splitX - 3}" y="0" width="6" height="${h}" fill="${accent}"/>
${avatarBlock(avatarCx, avatarCy, avatarR, '#ffffff', dataUri, initial, bgMid)}
<text x="${avatarCx}" y="${avatarCy + avatarR + 55}" text-anchor="middle" font-family="Inter, sans-serif" font-size="38" font-weight="900" fill="#ffffff" letter-spacing="-0.5" style="${TEXT_SHADOW}">${escapeXml(user.display_name || user.handle)}</text>
<text x="${avatarCx}" y="${avatarCy + avatarR + 88}" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" font-weight="700" fill="#ffffff" opacity="0.95" style="${TEXT_SHADOW_SM}">@${escapeXml(user.handle)}</text>
<text x="${rightX}" y="170" font-family="Inter, sans-serif" font-size="22" font-weight="900" fill="${accent}" letter-spacing="3" style="${TEXT_SHADOW_SM}">⚡ TIP WITH BITCOIN</text>
${user.goal_text ? `<text x="${rightX}" y="220" font-family="Inter, sans-serif" font-size="22" font-style="italic" font-weight="600" fill="#ffffff" opacity="0.98" style="${TEXT_SHADOW}">"${escapeXml(user.goal_text.slice(0, 45))}"</text>` : ''}
<text x="${rightX}" y="280" font-family="JetBrains Mono, ui-monospace, monospace" font-size="22" font-weight="800" fill="#ffffff" style="${TEXT_SHADOW}">${escapeXml(shortAddress(user.btc_address))}</text>
<rect x="${qrX - 12}" y="${qrY - 12}" width="${qrSize + 24}" height="${qrSize + 24}" rx="16" fill="#ffffff"/>
<g transform="translate(${qrX}, ${qrY})">${qrSvg}</g>
${goalBlock}
${footerBar(w, h, accent2)}
</svg>`;
}


// ============================================================
// SKYGIVE v0.4.0 — Landing page + donation page (forest/leaf theme)
// ============================================================

function landingPage_v3() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>SkyGive · Create a Bitcoin Donation Campaign</title>
<meta name="description" content="Zero-auth Bitcoin donation campaigns for creators, journalists, and activists. Pick a theme, drop your wallet, share your link.">
<meta property="og:title" content="SkyGive · Bitcoin tip cards for everyone">
<meta property="og:description" content="Create a beautiful, non-custodial Bitcoin donation campaign in 30 seconds.">
<meta property="og:image" content="https://skygive.app/badge/demo.svg">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E⚡%3C/text%3E%3C/svg%3E">
<style>
  :root {
    --bg: #0a0e0a;
    --bg-2: #121712;
    --surface: #1a1f1a;
    --surface-2: #232a23;
    --border: #2d352d;
    --text: #f0f5f0;
    --text-dim: #9aa89a;
    --text-faint: #6a786a;
    --accent: #4ade80;
    --accent-warm: #ff6b35;
    --accent-pink: #fc7cdb;
    --shadow: 0 4px 24px rgba(0,0,0,0.4);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: linear-gradient(180deg, var(--bg) 0%, var(--bg-2) 100%);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, system-ui, sans-serif;
    line-height: 1.5;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }
  .container { max-width: 960px; margin: 0 auto; padding: 40px 20px 80px; }

  /* Hero */
  .hero { text-align: center; padding: 30px 0 50px; }
  .hero-icon { font-size: 56px; line-height: 1; margin-bottom: 12px; filter: drop-shadow(0 0 12px rgba(74,222,128,0.4)); }
  .hero h1 {
    font-size: clamp(48px, 9vw, 88px);
    font-weight: 900;
    letter-spacing: -2px;
    background: linear-gradient(135deg, #4ade80 0%, #92e1c4 50%, #fc7cdb 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 8px;
  }
  .hero-sub { font-size: 22px; color: var(--text); font-weight: 600; }
  .hero-desc { color: var(--text-dim); font-size: 16px; margin-top: 6px; max-width: 540px; margin-left: auto; margin-right: auto; }
  .phase-pill {
    display: inline-block; margin-top: 18px; padding: 6px 14px; border: 1px solid var(--accent);
    border-radius: 999px; color: var(--accent); font-size: 12px; font-weight: 800; letter-spacing: 1.5px;
  }

  /* Feature row */
  .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin: 40px 0; }
  .feature {
    background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
    padding: 20px; text-align: center;
  }
  .feature-icon { font-size: 28px; margin-bottom: 8px; }
  .feature-title { font-size: 13px; font-weight: 900; letter-spacing: 1.5px; color: var(--accent); margin-bottom: 4px; }
  .feature-desc { font-size: 13px; color: var(--text-dim); }

  /* Builder Card */
  .builder {
    background: var(--surface); border: 1px solid var(--border); border-radius: 20px;
    box-shadow: var(--shadow); overflow: hidden;
  }
  .builder-header {
    padding: 28px 32px 20px; border-bottom: 1px solid var(--border);
  }
  .builder-title { font-size: 28px; font-weight: 900; margin-bottom: 4px; }
  .builder-subtitle { color: var(--text-dim); font-size: 14px; }

  /* Stepper */
  .stepper { display: flex; gap: 12px; margin-top: 18px; }
  .step { flex: 1; height: 4px; background: var(--border); border-radius: 2px; transition: background 0.3s; }
  .step.active { background: var(--accent); }

  /* Step body */
  .step-body { padding: 28px 32px; display: none; }
  .step-body.active { display: block; }
  .step-label { font-size: 12px; font-weight: 800; letter-spacing: 2px; color: var(--accent); margin-bottom: 8px; text-transform: uppercase; }
  .step-h { font-size: 22px; font-weight: 800; margin-bottom: 20px; }

  /* Form */
  .field { margin-bottom: 18px; }
  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  @media (max-width: 600px) { .field-row { grid-template-columns: 1fr; } }
  .label {
    display: block; font-size: 11px; font-weight: 900; letter-spacing: 1.5px;
    color: var(--accent); margin-bottom: 6px; text-transform: uppercase;
  }
  .label-optional { color: var(--text-faint); font-weight: 600; }
  .input, .select {
    width: 100%; padding: 13px 14px; background: var(--bg-2); border: 1px solid var(--border);
    border-radius: 10px; color: var(--text); font-family: inherit; font-size: 15px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .input:focus, .select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(74,222,128,0.15); }
  .help { font-size: 12px; color: var(--text-faint); margin-top: 6px; }

  /* Bluesky lookup */
  .bsky-row { display: flex; gap: 8px; align-items: center; margin-top: 6px; }
  .bsky-skip { font-size: 12px; color: var(--text-faint); text-decoration: underline; cursor: pointer; background: none; border: none; }
  .bsky-skip:hover { color: var(--accent); }
  .bsky-status { font-size: 12px; padding: 4px 10px; border-radius: 6px; font-weight: 700; }
  .bsky-status.ok { background: rgba(74,222,128,0.15); color: var(--accent); }
  .bsky-status.err { background: rgba(255,107,53,0.15); color: var(--accent-warm); }
  .bsky-status.loading { background: var(--border); color: var(--text-dim); }

  /* Theme picker */
  .filter-bar { display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap; }
  .filter-chip {
    padding: 8px 14px; background: var(--bg-2); border: 1px solid var(--border); border-radius: 999px;
    cursor: pointer; font-size: 13px; font-weight: 700; color: var(--text-dim); transition: all 0.15s;
  }
  .filter-chip:hover { border-color: var(--accent); color: var(--text); }
  .filter-chip.active { background: var(--accent); color: var(--bg); border-color: var(--accent); }
  .picker-hint { color: var(--text-dim); font-size: 13px; margin-bottom: 18px; }

  .theme-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
  .theme-card {
    background: var(--bg-2); border: 2px solid var(--border); border-radius: 14px;
    overflow: hidden; cursor: pointer; transition: all 0.15s; position: relative;
  }
  .theme-card:hover { transform: translateY(-2px); border-color: var(--text-dim); }
  .theme-card.selected { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(74,222,128,0.2); }
  .theme-card.selected::after {
    content: '✓'; position: absolute; top: 10px; right: 10px;
    width: 26px; height: 26px; background: var(--accent); color: var(--bg);
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-weight: 900; font-size: 14px;
  }
  .theme-swatch-tall { height: 140px; display: flex; }
  .theme-swatch-tall div { flex: 1; transition: flex 0.2s; }
  .theme-card:hover .theme-swatch-tall div { flex: 1; }
  .theme-card:hover .theme-swatch-tall div:nth-child(3) { flex: 2.2; }

  /* Live preview */
  .preview-section { margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border); }
  .preview-label { font-size: 11px; font-weight: 900; letter-spacing: 1.5px; color: var(--text-dim); margin-bottom: 10px; text-transform: uppercase; }
  .preview-frame {
    background: var(--bg); border-radius: 12px; overflow: hidden; border: 1px solid var(--border);
    aspect-ratio: 1200 / 630; display: flex; align-items: center; justify-content: center;
    color: var(--text-faint); font-size: 13px;
  }
  .preview-frame img { width: 100%; height: 100%; object-fit: cover; }

  /* Buttons */
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    padding: 16px 28px; border: none; border-radius: 12px; font-family: inherit;
    font-size: 16px; font-weight: 900; letter-spacing: 0.5px; cursor: pointer;
    transition: all 0.15s; text-decoration: none;
  }
  .btn-primary {
    background: linear-gradient(135deg, var(--accent) 0%, #86efac 100%);
    color: var(--bg); width: 100%;
  }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(74,222,128,0.3); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .btn-secondary {
    background: var(--bg-2); color: var(--text); border: 1px solid var(--border);
  }
  .btn-secondary:hover { border-color: var(--text-dim); }
  .step-actions { display: flex; gap: 12px; margin-top: 28px; padding-top: 24px; border-top: 1px solid var(--border); }
  .step-actions .btn { flex: 1; }

  /* Success screen */
  .success { text-align: center; padding: 40px 0; }
  .success-icon { font-size: 56px; margin-bottom: 12px; }
  .success h2 { font-size: 28px; font-weight: 900; margin-bottom: 8px; }
  .success p { color: var(--text-dim); margin-bottom: 24px; }
  .url-box {
    background: var(--bg-2); border: 1px solid var(--accent); border-radius: 10px;
    padding: 14px; font-family: 'JetBrains Mono', monospace; font-size: 15px; word-break: break-all;
    margin: 12px 0; text-align: left; color: var(--accent);
  }
  .copy-btn {
    background: var(--accent); color: var(--bg); border: none; border-radius: 6px;
    padding: 4px 10px; font-weight: 800; font-size: 11px; cursor: pointer; margin-left: 8px;
    letter-spacing: 1px;
  }
  .warn {
    background: rgba(255,107,53,0.1); border: 1px solid var(--accent-warm); border-radius: 10px;
    padding: 16px; margin: 16px 0; color: var(--text); font-size: 14px; line-height: 1.6;
  }
  .warn strong { color: var(--accent-warm); }

  /* Footer */
  .footer-cta { text-align: center; margin-top: 40px; padding: 24px; color: var(--text-faint); font-size: 13px; }
  .footer-cta a { color: var(--accent); text-decoration: none; font-weight: 700; }
  .my-campaigns-link {
    display: inline-block; margin-top: 12px; color: var(--accent);
    text-decoration: none; font-weight: 700; font-size: 14px;
  }
</style>
</head>
<body>

<div class="container">

  <!-- HERO -->
  <div class="hero">
    <div class="hero-icon">⚡</div>
    <h1>SkyGive</h1>
    <div class="hero-sub">Bitcoin donation campaigns for everyone</div>
    <div class="hero-desc">Zero auth · non-custodial · beautiful by default. Pick a theme, drop your wallet, share your link.</div>
    <div class="phase-pill">PHASE 1 · v0.9 BETA</div>
    <div><a href="/my-campaigns" class="my-campaigns-link">↗ View my campaigns</a></div>
  </div>

  <!-- FEATURES -->
  <div class="features">
    <div class="feature">
      <div class="feature-icon">🎨</div>
      <div class="feature-title">12 THEMES</div>
      <div class="feature-desc">Curated palettes, WCAG-AA validated</div>
    </div>
    <div class="feature">
      <div class="feature-icon">🔒</div>
      <div class="feature-title">NON-CUSTODIAL · 0% FEE</div>
      <div class="feature-desc">Every sat goes straight to your wallet. We charge nothing, ever.</div>
    </div>
    <div class="feature">
      <div class="feature-icon">⚡</div>
      <div class="feature-title">ZERO AUTH</div>
      <div class="feature-desc">No signup, no email, no password</div>
    </div>
    <div class="feature">
      <div class="feature-icon">✨</div>
      <div class="feature-title">5 VARIANTS</div>
      <div class="feature-desc">Each post auto-rotates the look</div>
    </div>
  </div>

  <!-- BUILDER -->
  <div class="builder">
    <div class="builder-header">
      <div class="builder-title">Create a Campaign</div>
      <div class="builder-subtitle">Takes ~30 seconds. No account required.</div>
      <div class="stepper">
        <div class="step active" id="step-1"></div>
        <div class="step" id="step-2"></div>
        <div class="step" id="step-3"></div>
      </div>
    </div>

    <!-- STEP 1: Basics -->
    <div class="step-body active" id="body-1">
      <div class="step-label">Step 1 of 2</div>
      <div class="step-h">Campaign Basics</div>

      <div class="field">
        <label class="label">Campaign Name</label>
        <input class="input" id="f-name" placeholder="e.g. OSINT Investigations · Mutual Aid · My Music Drop" maxlength="80">
        <div class="help">This is the title donors see on your card.</div>
      </div>

      <div class="field">
        <label class="label">Display Handle <span class="label-optional">(@yourname or any handle)</span></label>
        <input class="input" id="f-handle" placeholder="@indicaindependent.bsky.social or just @creator">
        <div class="bsky-row">
          <span id="bsky-status" class="bsky-status loading" style="display:none;">Looking up…</span>
          <button type="button" class="bsky-skip" id="bsky-skip">Skip Bluesky lookup</button>
        </div>
        <div class="help">If it's a real Bluesky handle, we'll verify it. Otherwise just type any handle.</div>
      </div>

      <div class="field">
        <label class="label">Bitcoin Address</label>
        <input class="input" id="f-btc" placeholder="bc1q… or 1… or 3…" autocomplete="off" spellcheck="false">
        <div class="help">Donations go directly here. SegWit (bc1) or legacy (1/3) accepted.</div>
      </div>

      <div class="field">
        <label class="label">What's this for? <span class="label-optional">(optional)</span></label>
        <input class="input" id="f-goal-text" placeholder="e.g. Tip jar for OSINT work" maxlength="100">
        <div class="help">Shown on every badge. Max 100 chars.</div>
      </div>

      <div class="field-row">
        <div class="field">
          <label class="label">Currency</label>
          <select class="select" id="f-currency">
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="JPY">JPY (¥)</option>
            <option value="CAD">CAD</option>
            <option value="AUD">AUD</option>
          </select>
        </div>
        <div class="field">
          <label class="label">Goal Amount <span class="label-optional">(optional)</span></label>
          <input class="input" id="f-goal-amt" type="number" min="0" step="1" placeholder="250">
        </div>
      </div>

      <div class="step-actions">
        <button class="btn btn-primary" id="btn-next">CONTINUE TO THEME PICKER →</button>
      </div>
    </div>

    <!-- STEP 2: Theme Picker -->
    <div class="step-body" id="body-2">
      <div class="step-label">Step 2 of 2</div>
      <div class="step-h">Pick Your Look</div>

      <div class="picker-hint">Tap a palette to preview your card.</div>

      <div class="theme-grid" id="theme-grid"></div>

      <div class="preview-section">
        <div class="preview-label">Live preview</div>
        <div class="preview-frame" id="preview-frame">Pick a theme to preview your card</div>
      </div>

      <div class="step-actions">
        <button class="btn btn-secondary" id="btn-back">← BACK</button>
        <button class="btn btn-primary" id="btn-create" disabled>CREATE CAMPAIGN ⚡</button>
      </div>
    </div>

    <!-- STEP 3: Success -->
    <div class="step-body" id="body-3">
      <div class="success">
        <div class="success-icon">🎉</div>
        <h2>Your campaign is live</h2>
        <p>Share this link anywhere — Bluesky, Mastodon, email, anywhere a URL goes.</p>

        <div class="url-box" id="url-public"></div>
        <button class="copy-btn" onclick="copyText('url-public')">COPY PUBLIC URL</button>

        <div class="warn">
          <strong>⚠ Save your admin URL.</strong> This is the ONLY way to edit or delete your campaign later. We don't store emails. We can't recover it for you.
          <div class="url-box" id="url-admin"></div>
          <button class="copy-btn" onclick="copyText('url-admin')">COPY ADMIN URL</button>
        </div>

        <p style="margin-top:24px;font-size:13px;">
          Your campaign is saved to this browser's "My Campaigns" list automatically.
          <br><a href="/my-campaigns" class="my-campaigns-link">↗ View all my campaigns</a>
        </p>
      </div>
    </div>
  </div>

  <div class="footer-cta">
    ⚡ <strong>skygive.app</strong> · A project of <a href="https://bsky.app/profile/indicaindependent.bsky.social">Indica Independent Media</a>
    <br><span style="font-size:11px;opacity:0.7">A free, non-custodial positivity project · 0% platform fee · we never touch your sats</span>
  </div>
</div>

<script>
// ════════════════════════════════════════════════════════════
//  v0.9 Builder — vanilla JS, no framework
// ════════════════════════════════════════════════════════════

const state = {
  step: 1,
  themes: [],
  selectedTheme: null,
  blueskyDid: null,
  blueskyVerified: false,
  blueskyLookupTimer: null,
};

const $ = id => document.getElementById(id);

// ───── Step navigation ─────
function gotoStep(n) {
  state.step = n;
  for (let i = 1; i <= 3; i++) {
    $('step-' + i).classList.toggle('active', i <= n);
    $('body-' + i).classList.toggle('active', i === n);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ───── Bluesky live lookup (debounced) ─────
$('f-handle').addEventListener('input', e => {
  clearTimeout(state.blueskyLookupTimer);
  const v = e.target.value.trim().replace(/^@/, '');
  state.blueskyDid = null;
  state.blueskyVerified = false;
  $('bsky-status').style.display = 'none';
  if (!v || v.length < 4) return;
  // Only lookup if it looks like a bluesky handle (has a dot)
  if (!v.includes('.')) return;
  $('bsky-status').className = 'bsky-status loading';
  $('bsky-status').textContent = 'Looking up…';
  $('bsky-status').style.display = 'inline-block';
  state.blueskyLookupTimer = setTimeout(() => lookupBluesky(v), 600);
});

async function lookupBluesky(handle) {
  try {
    const r = await fetch('/api/profile/' + encodeURIComponent(handle));
    const d = await r.json();
    if (d.ok) {
      state.blueskyDid = d.did;
      state.blueskyVerified = true;
      $('bsky-status').className = 'bsky-status ok';
      $('bsky-status').textContent = '✓ Verified Bluesky user';
      // Auto-fill name if empty
      if (!$('f-name').value && d.profile.display_name) {
        $('f-name').value = d.profile.display_name + ' · Tip Jar';
      }
    } else {
      $('bsky-status').className = 'bsky-status err';
      $('bsky-status').textContent = 'Not a Bluesky handle';
    }
  } catch {
    $('bsky-status').className = 'bsky-status err';
    $('bsky-status').textContent = 'Lookup failed';
  }
}

$('bsky-skip').addEventListener('click', () => {
  state.blueskyDid = null;
  state.blueskyVerified = false;
  $('bsky-status').style.display = 'none';
  $('f-handle').focus();
});

// ───── Validation for Step 1 ─────
function validateStep1() {
  const errs = [];
  if (!$('f-name').value.trim()) errs.push('Campaign name required');
  if (!$('f-handle').value.trim()) errs.push('Display handle required');
  const btc = $('f-btc').value.trim();
  if (!btc) errs.push('Bitcoin address required');
  else if (!/^bc1[a-z0-9]{20,87}$/i.test(btc) && !/^[13][a-zA-Z0-9]{25,34}$/.test(btc)) errs.push('Invalid Bitcoin address');
  return errs;
}

$('btn-next').addEventListener('click', () => {
  const errs = validateStep1();
  if (errs.length) { alert(errs.join('\\n')); return; }
  gotoStep(2);
});

$('btn-back').addEventListener('click', () => gotoStep(1));

// ───── Load themes & render picker ─────
async function loadThemes() {
  const r = await fetch('/api/themes');
  const d = await r.json();
  state.themes = d.themes;
  renderThemes('all');
}

function renderThemes(mood) {
  const grid = $('theme-grid');
  grid.innerHTML = '';
  const themes = state.themes.filter(t => mood === 'all' || t.mood === mood);
  for (const t of themes) {
    const card = document.createElement('div');
    card.className = 'theme-card' + (state.selectedTheme === t.key ? ' selected' : '');
    card.dataset.key = t.key;
    const [bgDark, bgMid, accent, accent2, text] = t.palette;
    card.innerHTML = \`
      <div class="theme-swatch-tall">
        <div style="background:\${bgDark}"></div>
        <div style="background:\${bgMid}"></div>
        <div style="background:\${accent}"></div>
        <div style="background:\${accent2}"></div>
        <div style="background:\${text}"></div>
      </div>
    \`;
    card.addEventListener('click', () => selectTheme(t.key));
    grid.appendChild(card);
  }
}

document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    renderThemes(chip.dataset.mood);
  });
});

function selectTheme(key) {
  state.selectedTheme = key;
  document.querySelectorAll('.theme-card').forEach(c => c.classList.toggle('selected', c.dataset.key === key));
  $('btn-create').disabled = false;
  updatePreview();
}

function updatePreview() {
  if (!state.selectedTheme) return;
  const theme = state.themes.find(t => t.key === state.selectedTheme);
  const [bgDark, bgMid, accent, accent2, text] = theme.palette;
  const name = $('f-name').value || 'Your Campaign';
  const handle = $('f-handle').value.replace(/^@/, '') || 'handle';
  const btc = $('f-btc').value || 'bc1q…';
  const goalText = $('f-goal-text').value;
  const shortAddr = btc.length > 18 ? btc.slice(0,10) + '…' + btc.slice(-6) : btc;
  $('preview-frame').innerHTML = \`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" style="width:100%;height:100%">
      <defs>
        <linearGradient id="pgrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="\${bgDark}"/>
          <stop offset="100%" stop-color="\${bgMid}"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#pgrad)"/>
      <rect x="0" y="0" width="1200" height="6" fill="\${accent}"/>
      <circle cx="160" cy="315" r="90" fill="\${bgMid}" stroke="\${accent}" stroke-width="4"/>
      <text x="160" y="345" text-anchor="middle" font-family="Inter" font-size="80" font-weight="900" fill="#fff">\${(name[0]||'?').toUpperCase()}</text>
      <text x="290" y="270" font-family="Inter" font-size="54" font-weight="900" fill="#fff" style="paint-order:stroke;stroke:#000;stroke-width:5px;stroke-opacity:0.6">\${escapeHtml(name.slice(0,28))}</text>
      <text x="290" y="310" font-family="Inter" font-size="22" font-weight="700" fill="#fff" opacity="0.95">@\${escapeHtml(handle.slice(0,32))}</text>
      \${goalText ? \`<text x="290" y="365" font-family="Inter" font-size="22" font-style="italic" font-weight="600" fill="#fff" opacity="0.95">"\${escapeHtml(goalText.slice(0,50))}"</text>\` : ''}
      <text x="290" y="420" font-family="Inter" font-size="14" font-weight="900" fill="\${accent}" letter-spacing="3">TIP WITH BITCOIN · \${escapeHtml(shortAddr)}</text>
      <rect x="290" y="455" width="380" height="14" rx="7" fill="#000" opacity="0.6"/>
      <rect x="860" y="175" width="280" height="280" rx="18" fill="#fff"/>
      <rect x="0" y="580" width="1200" height="50" fill="#000" opacity="0.7"/>
      <text x="600" y="612" text-anchor="middle" font-family="Inter" font-size="17" font-weight="800" fill="\${accent2}">⚡ skygive.app · A project of Indica Independent Media</text>
    </svg>
  \`;
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// Update preview on field changes
['f-name','f-handle','f-btc','f-goal-text'].forEach(id => {
  $(id).addEventListener('input', () => state.selectedTheme && updatePreview());
});

// ───── Submit ─────
$('btn-create').addEventListener('click', async () => {
  const btn = $('btn-create');
  btn.disabled = true;
  btn.textContent = 'CREATING…';
  const payload = {
    campaign_name: $('f-name').value.trim(),
    display_handle: $('f-handle').value.trim().replace(/^@/, ''),
    btc_address: $('f-btc').value.trim(),
    theme_key: state.selectedTheme,
    goal_text: $('f-goal-text').value.trim(),
    goal_fiat_amount: Number($('f-goal-amt').value) || 0,
    goal_currency: $('f-currency').value,
    bluesky_did: state.blueskyDid,
  };
  try {
    const r = await fetch('/api/campaigns/create', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (!d.ok) throw new Error(d.error || 'creation failed');

    // Persist to localStorage for "My Campaigns"
    const stored = JSON.parse(localStorage.getItem('skygive_campaigns') || '[]');
    stored.unshift({
      slug: d.slug,
      admin_token: d.admin_token,
      name: payload.campaign_name,
      created_at: Date.now(),
    });
    localStorage.setItem('skygive_campaigns', JSON.stringify(stored.slice(0, 50)));

    // Show success
    $('url-public').textContent = d.campaign_url;
    $('url-admin').textContent = d.admin_url;
    gotoStep(3);
  } catch (e) {
    alert('Failed: ' + e.message);
    btn.disabled = false;
    btn.textContent = 'CREATE CAMPAIGN ⚡';
  }
});

function copyText(id) {
  const text = $(id).textContent;
  navigator.clipboard.writeText(text).then(() => {
    event.target.textContent = '✓ COPIED';
    setTimeout(() => event.target.textContent = event.target.textContent.replace('✓ COPIED', 'COPY'), 1500);
  });
}

// Init
loadThemes();
</script>

</body>
</html>`;
}


function myCampaignsPage() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>My Campaigns · SkyGive</title>
<style>
  body { background:#0a0e0a; color:#f0f5f0; font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif; margin:0; padding:0; line-height:1.5; }
  .container { max-width:840px; margin:0 auto; padding:40px 20px 80px; }
  h1 { font-size:36px; font-weight:900; margin-bottom:8px; background:linear-gradient(135deg,#4ade80,#92e1c4); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
  .sub { color:#9aa89a; margin-bottom:32px; }
  .empty { background:#1a1f1a; border:1px solid #2d352d; border-radius:14px; padding:48px 24px; text-align:center; }
  .empty-icon { font-size:48px; margin-bottom:12px; }
  .empty h2 { font-size:20px; font-weight:800; margin-bottom:8px; }
  .empty p { color:#9aa89a; margin-bottom:20px; }
  .btn { display:inline-flex; align-items:center; gap:8px; padding:12px 22px; background:#4ade80; color:#0a0e0a; border:none; border-radius:10px; font-weight:900; cursor:pointer; text-decoration:none; font-size:14px; letter-spacing:0.5px; }
  .btn:hover { background:#86efac; }
  .btn-secondary { background:#1a1f1a; color:#f0f5f0; border:1px solid #2d352d; }
  .btn-danger { background:#1a1f1a; color:#ff6b35; border:1px solid #ff6b35; }
  .campaign { background:#1a1f1a; border:1px solid #2d352d; border-radius:14px; padding:20px; margin-bottom:14px; display:flex; gap:16px; align-items:center; }
  .campaign-info { flex:1; }
  .campaign-name { font-size:17px; font-weight:800; margin-bottom:4px; }
  .campaign-meta { font-size:13px; color:#9aa89a; }
  .campaign-actions { display:flex; gap:8px; }
  .campaign-url { font-family:'JetBrains Mono',monospace; font-size:12px; color:#4ade80; margin-top:6px; }
  .stat { font-size:12px; color:#6a786a; }
  .nav { margin-bottom:24px; }
  .nav a { color:#4ade80; text-decoration:none; font-weight:700; }
  .warn { background:rgba(255,107,53,0.1); border:1px solid #ff6b35; border-radius:10px; padding:14px; margin-bottom:20px; font-size:13px; color:#f0f5f0; }
</style></head><body>
<div class="container">
  <div class="nav"><a href="/">← Back to home</a></div>
  <h1>My Campaigns</h1>
  <div class="sub">Stored on this browser only. No account, no email, just local.</div>
  <div class="warn">
    <strong>⚠ Local storage only:</strong> Clearing your browser data will erase this list. Save your admin URLs somewhere safe (password manager, notes app).
  </div>
  <div id="list"></div>
  <div style="text-align:center; margin-top:32px;">
    <a href="/" class="btn">+ CREATE NEW CAMPAIGN</a>
  </div>
</div>
<script>
const stored = JSON.parse(localStorage.getItem('skygive_campaigns') || '[]');
const listEl = document.getElementById('list');
if (!stored.length) {
  listEl.innerHTML = '<div class="empty"><div class="empty-icon">🌱</div><h2>No campaigns yet</h2><p>Create your first donation campaign to see it here.</p><a href="/" class="btn">CREATE A CAMPAIGN</a></div>';
} else {
  for (const c of stored) {
    fetchCampaign(c);
  }
}
async function fetchCampaign(local) {
  const div = document.createElement('div');
  div.className = 'campaign';
  div.innerHTML = '<div class="campaign-info">Loading ' + escapeHtml(local.name) + '…</div>';
  listEl.appendChild(div);
  try {
    const r = await fetch('/api/admin/' + local.admin_token);
    const d = await r.json();
    if (!d.ok) {
      div.innerHTML = '<div class="campaign-info"><div class="campaign-name">' + escapeHtml(local.name) + '</div><div class="campaign-meta">⚠ Not found on server (may be deleted)</div></div><button class="btn btn-danger" onclick="removeLocal(\\''+local.slug+'\\')">REMOVE FROM LIST</button>';
      return;
    }
    const c = d.campaign;
    const totalBtc = (c.total_received_sats || 0) / 100000000;
    div.innerHTML =
      '<div class="campaign-info">' +
        '<div class="campaign-name">' + escapeHtml(c.campaign_name) + ' <span class="stat">' + d.theme.emoji + ' ' + escapeHtml(d.theme.name) + '</span></div>' +
        '<div class="campaign-meta">@' + escapeHtml(c.display_handle) + ' · ' + escapeHtml(c.status) + ' · ' + (c.donation_count || 0) + ' tips · ' + totalBtc.toFixed(8) + ' BTC</div>' +
        '<div class="campaign-url">skygive.app/v/' + c.slug + '</div>' +
      '</div>' +
      '<div class="campaign-actions">' +
        '<a class="btn btn-secondary" href="/v/' + c.slug + '" target="_blank">VIEW</a>' +
      '</div>';
  } catch (e) {
    div.innerHTML = '<div class="campaign-info"><div class="campaign-name">' + escapeHtml(local.name) + '</div><div class="campaign-meta">⚠ ' + e.message + '</div></div>';
  }
}
function removeLocal(slug) {
  const s = JSON.parse(localStorage.getItem('skygive_campaigns') || '[]').filter(c => c.slug !== slug);
  localStorage.setItem('skygive_campaigns', JSON.stringify(s));
  location.reload();
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
</script></body></html>`;
}


function landingPage_v2() {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>SkyGive — Bitcoin tip cards for Bluesky</title>
<meta property="og:title" content="SkyGive — Bitcoin tip cards for Bluesky">
<meta property="og:description" content="Generate an AI-styled Bitcoin tip card for any Bluesky profile. One URL, fresh card every post. Non-custodial. Zero auth.">
<meta property="og:url" content="https://skygive.app">
<meta property="og:type" content="website">
<meta property="og:image" content="https://skygive.app/badge/demo.png">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.85em' font-size='90'%3E🛰️%3C/text%3E%3C/svg%3E"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg-deep:#06140d;
  --bg-mid:#0a2818;
  --bg-card:#0e2e1f;
  --border:#1a3d28;
  --accent:#4ade80;
  --accent-soft:#86efac;
  --text:#f0fdf4;
  --text-mute:#a7d4b8;
  --text-dim:#6b9482;
}
html,body{background:var(--bg-deep)}
body{font-family:'Inter',-apple-system,sans-serif;background:radial-gradient(ellipse at top, var(--bg-mid) 0%, var(--bg-deep) 60%);color:var(--text);min-height:100vh;padding:24px;-webkit-font-smoothing:antialiased}
.wrap{max-width:720px;margin:32px auto}
header{text-align:center;margin-bottom:48px}
.logo{font-size:56px;margin-bottom:4px;filter:drop-shadow(0 4px 12px rgba(74,222,128,0.3))}
h1{font-size:60px;letter-spacing:-2px;margin-bottom:14px;font-weight:800;background:linear-gradient(135deg,var(--accent) 0%, var(--accent-soft) 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.tag{font-size:21px;color:var(--text);margin-bottom:8px;font-weight:500}
.sub{font-size:15px;color:var(--text-mute);max-width:480px;margin:0 auto;line-height:1.5}
.pill{display:inline-block;padding:6px 14px;background:rgba(74,222,128,0.12);border:1px solid rgba(74,222,128,0.35);border-radius:999px;font-size:11px;color:var(--accent);margin-top:18px;letter-spacing:1.5px;font-weight:700}
.features{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:36px}
.feat{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:20px 16px;text-align:center;transition:border-color 0.2s}
.feat:hover{border-color:rgba(74,222,128,0.4)}
.feat-icon{font-size:32px;margin-bottom:10px;filter:drop-shadow(0 2px 8px rgba(74,222,128,0.2))}
.feat-title{font-size:12px;font-weight:800;letter-spacing:1px;margin-bottom:6px;color:var(--accent)}
.feat-desc{font-size:12.5px;color:var(--text-mute);line-height:1.45}
@media(max-width:560px){.features{grid-template-columns:1fr}}
.form{background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:32px;box-shadow:0 8px 32px rgba(0,0,0,0.3)}
.form h2{font-size:26px;margin-bottom:6px;letter-spacing:-0.5px;font-weight:700;color:var(--text)}
.form .h2sub{font-size:14px;color:var(--text-mute);margin-bottom:26px}
.field{margin-bottom:20px}
.field-row{display:grid;grid-template-columns:1fr 2fr;gap:12px;margin-bottom:20px}
label{display:block;font-size:11px;color:var(--accent);margin-bottom:7px;letter-spacing:1px;font-weight:700;text-transform:uppercase}
input,select,textarea{width:100%;background:rgba(0,0,0,0.35);border:1px solid var(--border);border-radius:10px;padding:14px;color:var(--text);font-size:15px;font-family:inherit;transition:border-color 0.15s, background 0.15s}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--accent);background:rgba(0,0,0,0.5)}
select{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'><path fill='%234ade80' d='M4 6l4 4 4-4'/></svg>");background-repeat:no-repeat;background-position:right 12px center;padding-right:36px}
.hint{font-size:11.5px;color:var(--text-dim);margin-top:6px;line-height:1.4}
.optional{color:var(--text-dim);font-weight:500;text-transform:none;letter-spacing:0.5px}
button{width:100%;background:linear-gradient(135deg,var(--accent) 0%, var(--accent-soft) 100%);color:#06140d;border:none;border-radius:12px;padding:18px;font-size:16px;font-weight:800;letter-spacing:0.5px;cursor:pointer;margin-top:10px;transition:transform 0.1s, box-shadow 0.2s}
button:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(74,222,128,0.25)}
button:disabled{opacity:0.5;cursor:not-allowed}
.live-conversion{font-size:13px;color:var(--text-mute);margin-top:8px;padding:10px 12px;background:rgba(74,222,128,0.05);border-radius:8px;border-left:3px solid var(--accent);display:none}
.live-conversion.show{display:block}
.live-conversion strong{color:var(--accent)}
#result{margin-top:24px;padding:20px;background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.3);border-radius:12px;display:none}
#result.error{background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.3)}
#result h3{color:var(--accent);margin-bottom:12px;font-size:18px}
#result.error h3{color:#ef4444}
#result code{display:block;background:rgba(0,0,0,0.5);padding:11px 12px;border-radius:8px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:13px;word-break:break-all;margin:8px 0;color:var(--accent-soft)}
#result a{color:var(--accent);font-weight:600;text-decoration:none;border-bottom:1px solid transparent;transition:border-color 0.15s}
#result a:hover{border-bottom-color:var(--accent)}
.demo-link{text-align:center;margin-top:32px;font-size:14px;color:var(--text-mute)}
.demo-link a{color:var(--accent);text-decoration:none;font-weight:600;border-bottom:1px solid transparent;transition:border-color 0.15s}
.demo-link a:hover{border-bottom-color:var(--accent)}
footer{text-align:center;margin-top:48px;padding-top:24px;border-top:1px solid var(--border);font-size:13px;color:var(--text-dim)}
footer .heart{color:var(--accent)}
</style></head><body><div class="wrap">
<header>
<div class="logo">🛰️</div>
<h1>SkyGive</h1>
<div class="tag">Bitcoin tip cards for Bluesky</div>
<div class="sub">One URL. Fresh AI-styled card every post. Non-custodial, zero auth, your wallet stays yours.</div>
<div class="pill">PHASE 1 · BETA</div>
</header>

<div class="features">
<div class="feat"><div class="feat-icon">🎨</div><div class="feat-title">AI-STYLED</div><div class="feat-desc">Llama Vision matches your brand colors automatically</div></div>
<div class="feat"><div class="feat-icon">🔒</div><div class="feat-title">NON-CUSTODIAL · 0% FEE</div><div class="feat-desc">Every sat goes straight to your wallet. We charge nothing, ever. A free gift to good causes.</div></div>
<div class="feat"><div class="feat-icon">⚡</div><div class="feat-title">ZERO AUTH</div><div class="feat-desc">No signup. Just a handle, an address, and a goal.</div></div>
</div>

<div class="form">
<h2>Generate your badge</h2>
<div class="h2sub">Takes ~15 seconds. We fetch your profile and extract your color palette.</div>
<form id="regForm">
<div class="field"><label>BLUESKY HANDLE</label><input type="text" name="handle" placeholder="indicaindependent.bsky.social" required autocomplete="off"><div class="hint">Just the handle — or paste the full bsky.app/profile/ URL</div></div>
<div class="field"><label>BITCOIN ADDRESS</label><input type="text" name="btc_address" placeholder="bc1q..." required autocomplete="off" spellcheck="false"><div class="hint">Donations go directly here. SegWit (bc1) or legacy (1/3) accepted.</div></div>
<div class="field"><label>GOAL TEXT <span class="optional">(optional)</span></label><input type="text" name="goal_text" placeholder="Tip jar for OSINT work" maxlength="100"><div class="hint">Shown on every badge. Max 100 chars.</div></div>
<div class="field-row">
<div><label>CURRENCY</label><select name="goal_currency" id="currencySelect"><option value="USD">USD</option><option value="CAD">CAD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select></div>
<div><label>GOAL AMOUNT <span class="optional">(optional)</span></label><input type="number" name="goal_fiat_amount" id="goalInput" placeholder="250" min="1" step="any"></div>
</div>
<div class="live-conversion" id="liveConv">≈ <strong id="convSats">—</strong> sats at current BTC price</div>
<button type="submit" id="submitBtn">GENERATE MY BADGE →</button>
</form>
<div id="result"></div>
</div>
<div class="demo-link">Curious what it looks like? <a href="/v/demo">See the demo badge →</a></div>
<footer>A project of <a href="https://bsky.app/profile/indicaindependent.bsky.social" target="_blank" style="color:var(--accent);text-decoration:none;font-weight:700">Indica Independent Media</a><br><small>SkyGive is non-custodial — we never hold your funds.</small></footer>
</div>

<script>
// Live BTC price → sats conversion as user types
let cachedPrice = null;
let cachedCurrency = null;
async function fetchPrice(cur) {
  if (cachedPrice && cachedCurrency === cur) return cachedPrice;
  try {
    const r = await fetch('/api/btc-price?currency=' + cur);
    const j = await r.json();
    if (j.ok) { cachedPrice = j.btc_price; cachedCurrency = cur; return j.btc_price; }
  } catch (e) {}
  return null;
}
function fmtSats(n) {
  if (n >= 1e8) return (n/1e8).toFixed(3) + ' BTC';
  if (n >= 1e6) return (n/1e6).toFixed(2) + 'M sats';
  if (n >= 1e3) return (n/1e3).toFixed(1) + 'k sats';
  return n + ' sats';
}
async function updateConv() {
  const amount = Number(document.getElementById('goalInput').value);
  const cur = document.getElementById('currencySelect').value;
  const conv = document.getElementById('liveConv');
  const sats = document.getElementById('convSats');
  if (!amount || amount <= 0) { conv.classList.remove('show'); return; }
  const price = await fetchPrice(cur);
  if (!price) { conv.classList.remove('show'); return; }
  const satsValue = Math.round((amount / price) * 1e8);
  sats.textContent = fmtSats(satsValue);
  conv.classList.add('show');
}
document.getElementById('goalInput').addEventListener('input', updateConv);
document.getElementById('currencySelect').addEventListener('change', updateConv);

document.getElementById('regForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  const result = document.getElementById('result');
  btn.disabled = true; btn.innerText = 'GENERATING…';
  result.style.display = 'none'; result.classList.remove('error');
  const data = Object.fromEntries(new FormData(e.target));
  if (data.goal_fiat_amount) data.goal_fiat_amount = Number(data.goal_fiat_amount);
  try {
    const resp = await fetch('/api/register', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const j = await resp.json();
    if (!j.ok) {
      result.classList.add('error');
      result.innerHTML = '<h3>❌ ' + (j.error || 'Registration failed') + '</h3>';
      result.style.display = 'block';
    } else if (j.already_registered) {
      result.innerHTML = '<h3>✓ Already registered</h3><p>Your badge URL:</p><code>' + j.badge_url + '</code><p style="margin-top:14px"><a href="' + j.donation_page + '">Open your donation page →</a></p>';
      result.style.display = 'block';
    } else {
      result.innerHTML = '<h3>✓ Badge generated</h3><p>Your badge URL (paste in any Bluesky post):</p><code>' + j.badge_url + '</code><p style="margin-top:18px"><strong>⚠️ One more step:</strong> To activate, post the verification on your Bluesky:</p><code style="border-left:3px solid var(--accent);padding-left:10px">' + j.verification.suggested_post.replace(/\\n/g, '<br>') + '</code><p style="margin-top:14px"><a href="' + j.verification.compose_url + '" target="_blank">▶ Open Bluesky composer with pre-filled text</a></p><p style="margin-top:18px;font-size:13px;color:var(--text-mute)">Once you post it, your badge auto-activates within 15 minutes.</p>';
      result.style.display = 'block';
    }
  } catch (err) {
    result.classList.add('error');
    result.innerHTML = '<h3>❌ Network error</h3><p>' + String(err) + '</p>';
    result.style.display = 'block';
  } finally {
    btn.disabled = false; btn.innerText = 'GENERATE MY BADGE →';
  }
});
</script>
</body></html>`;
}


export default {
  async fetch(request, env, ctx) {
    return await wrapHandler(request, env, ctx, route);
  },
};
