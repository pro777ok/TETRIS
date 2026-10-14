// ── Cold Clear 2 bot 評価 weights の動的パッチ ──────────────────────
//
// Cold Clear 2 の TBP プロトコルには weights を渡す手段が無い
// （rules/start/suggest/play のみ。config 等の未知タグは無視される）。
// そのため、wasm のデータセクションに include_str! で埋め込まれた
// BotConfig の default.json を**同一バイト長**で書き換えて bot 毎に
// 評価関数を変える。
//
// ⚠ Rust 側で JSON の合計バイト数がハードコードされているため、
//   パッチ後の JSON は元と必ず同じバイト数にすること。
//   短い場合は末尾の `}` の直前に空白を詰めて合わせる。
const fs = require('fs');
const path = require('path');

// roomSettings で受け付ける CC2 weights 倍率キー（0〜5、既定1.0）
const ROOM_SETTING_KEYS = ['cc2B2b', 'cc2Combo', 'cc2Tspin', 'cc2Attack'];

// ── glue / wasm の取得 ─────────────────────────────────────────────
const GLUE = (() => {
  try {
    const html = fs.readFileSync(path.join(__dirname, '..', 'coldclear2-standalone.html'), 'utf8');
    const m = html.match(/<script type="text\/plain" id="botWorkerSrc">([\s\S]*?)<\/script>/);
    return m ? m[1].replace(/^\n/, '') : null;
  } catch (e) {
    console.warn('[CC2] glue read failed:', e.message);
    return null;
  }
})();

// wasm の読み込み呼び出しを「パッチ注入可能」な形に書き換えた glue。
const GLUE_PATCHED = (() => {
  if (!GLUE) return null;
  const site = 'wasm_bindgen(wasmBytes())';
  if (GLUE.indexOf(site) < 0) {
    console.warn('[CC2] wasm_bindgen() call site not found; weights patch disabled');
    return null;
  }
  return GLUE.replace(site, 'wasm_bindgen(__cc2PatchWasm(wasmBytes()))');
})();

const BASE_BYTES = (() => {
  if (!GLUE) return null;
  const m = GLUE.match(/atob\("([A-Za-z0-9+/=]+)"\)/);
  if (!m) {
    console.warn('[CC2] wasm base64 not found; weights patch disabled');
    return null;
  }
  return Buffer.from(m[1], 'base64');
})();

// ── 埋め込み default.json の範囲探索 ───────────────────────────────
function matchJsonEnd(buf, start) {
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < buf.length; i++) {
    const c = buf[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === 0x5c) esc = true;
      else if (c === 0x22) inStr = false;
      continue;
    }
    if (c === 0x22) { inStr = true; continue; }
    if (c === 0x7b || c === 0x5b) depth++;
    else if (c === 0x7d || c === 0x5d) { if (--depth === 0) return i + 1; }
  }
  return -1;
}

const CONFIG_SPANS = (() => {
  const spans = [];
  if (!BASE_BYTES) return spans;
  const marker = Buffer.from('"freestyle_weights"');
  let from = 0, mi;
  while ((mi = BASE_BYTES.indexOf(marker, from)) >= 0) {
    from = mi + 1;
    for (let s = BASE_BYTES.lastIndexOf('{', mi); s >= 0 && mi - s < 8192; s = BASE_BYTES.lastIndexOf('{', s - 1)) {
      const e = matchJsonEnd(BASE_BYTES, s);
      if (e > mi) {
        try {
          const cfg = JSON.parse(BASE_BYTES.toString('utf8', s, e));
          if (cfg && cfg.freestyle_weights && typeof cfg.freestyle_weights === 'object') {
            if (!spans.some(p => p.start === s && p.end === e)) spans.push({ start: s, end: e });
            break;
          }
        } catch (err) { /* 候補違い */ }
      }
      if (s === 0) break;
    }
  }
  if (!spans.length) console.warn('[CC2] embedded default.json not found; weights patch disabled');
  else console.log('[CC2] weights JSON: ' + spans.map(p => `${p.start}-${p.end} (${p.end - p.start}B)`).join(', '));
  return spans;
})();

// ── multipliers の適用 ─────────────────────────────────────────────
// 各グループは freestyle.rs の evaluate() が読む重み。
function applyMultipliers(cfg, ov) {
  const w = cfg && cfg.freestyle_weights;
  if (!w) return false;
  const num = (v, k) => (typeof v === 'number' && isFinite(v) ? Math.round(v * k * 1e6) / 1e6 : v);
  const mulAll = (v, k) => (Array.isArray(v) ? v.map(x => num(x, k)) : num(v, k));
  const g = (k) => (Number.isFinite(ov[k]) ? Math.max(0, Math.min(5, ov[k])) : 1);
  const b2b = g('b2b'), combo = g('combo'), tspin = g('tspin'), attack = g('attack');
  if (b2b !== 1) {                      // B2B の維持と B2B 消去ボーナス
    w.has_back_to_back = num(w.has_back_to_back, b2b);
    w.back_to_back_clear = num(w.back_to_back_clear, b2b);
    w.tetris_well_depth = num(w.tetris_well_depth, b2b);
  }
  if (combo !== 1) w.combo_attack = num(w.combo_attack, combo);
  if (tspin !== 1) {                    // T スピン評価（T槽・ミニ/フルスピン）
    w.tslot = mulAll(w.tslot, tspin);
    w.mini_spin_clears = mulAll(w.mini_spin_clears, tspin);
    w.spin_clears = mulAll(w.spin_clears, tspin);
  }
  if (attack !== 1) {                   // ライン消去の火力
    w.normal_clears = mulAll(w.normal_clears, attack);
    w.perfect_clear = num(w.perfect_clear, attack);
  }
  return true;
}

// multipliers → 元と同一バイト数の JSON Buffer（恒等変換/失敗時は null）
function normalizeMultipliers(ov) {
  const g = (k) => {
    const v = ov && parseFloat(ov[k]);
    return Number.isFinite(v) ? Math.max(0, Math.min(5, v)) : 1;
  };
  return { b2b: g('b2b'), combo: g('combo'), tspin: g('tspin'), attack: g('attack') };
}

function buildPatch(ov) {
  if (!CONFIG_SPANS.length || !BASE_BYTES) return null;
  const m = normalizeMultipliers(ov);
  if (m.b2b === 1 && m.combo === 1 && m.tspin === 1 && m.attack === 1) return null;
  const span = CONFIG_SPANS[0];
  const origLen = span.end - span.start;
  const origText = BASE_BYTES.toString('utf8', span.start, span.end);
  let cfg;
  try { cfg = JSON.parse(origText); } catch (e) { return null; }
  if (!applyMultipliers(cfg, m)) return null;
  let text = JSON.stringify(cfg, null, 2);
  if (Buffer.byteLength(text, 'utf8') > origLen) text = JSON.stringify(cfg);
  let pad = origLen - Buffer.byteLength(text, 'utf8');
  if (pad < 0) {
    console.warn(`[CC2] weights patch too long (${Buffer.byteLength(text, 'utf8')} > ${origLen}); using defaults`);
    return null;
  }
  text = text.slice(0, -1) + ' '.repeat(pad) + text.slice(-1);
  const buf = Buffer.from(text, 'utf8');
  if (buf.length !== origLen) return null;
  if (buf.toString('utf8') === origText) return null; // 全倍率1.0相当
  try { JSON.parse(buf.toString('utf8')); } catch (e) { return null; }
  return buf;
}

// wasm バイト列にパッチを書き込む（同一長スペーンのみ）。
// 引数・戻り値とも Uint8Array。入力は書き換えない。
function applyWeightsPatch(u8, patchBuf) {
  if (!patchBuf || !u8 || !BASE_BYTES) return u8;
  if (u8.length !== BASE_BYTES.length) return u8;
  const out = new Uint8Array(u8);
  const buf = Buffer.from(out.buffer, out.byteOffset, out.byteLength);
  for (const span of CONFIG_SPANS) {
    if (span.end - span.start === patchBuf.length) patchBuf.copy(buf, span.start);
  }
  return out;
}

// roomSettings → CC2Engine 用の設定（sig は weights 変更検知に使う）
function roomConfig(rs) {
  const raw = (k) => { const v = parseFloat(rs && rs[k]); return Number.isFinite(v) ? v : 1; };
  const ov = normalizeMultipliers({
    b2b: raw('cc2B2b'), combo: raw('cc2Combo'), tspin: raw('cc2Tspin'), attack: raw('cc2Attack'),
  });
  const allOne = ov.b2b === 1 && ov.combo === 1 && ov.tspin === 1 && ov.attack === 1;
  const patchBuf = allOne ? null : buildPatch(ov);
  return { ov, patchBuf, sig: patchBuf ? `${ov.b2b},${ov.combo},${ov.tspin},${ov.attack}` : '' };
}

module.exports = {
  ROOM_SETTING_KEYS, GLUE, GLUE_PATCHED, BASE_BYTES, CONFIG_SPANS,
  buildPatch, applyWeightsPatch, roomConfig,
};
