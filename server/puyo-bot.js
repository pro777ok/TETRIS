// ─────────────────────────────────────────────────────────────────
// PUYO BOT (server-side) ────────────────────────────────────────
// ぷよぷよ盤面 (6列 x 13行 / row0=隠し行, rows1-12=表示) を自前で持ち、
// チェーンを最大化する配置AIで自動プレイするサーバーサイドボット。
//
// クライアント PuyoGame (public/game.js) と
//   ・同じフィールド仕様 (PUYO_COLS/PUYO_ROWS/色1-4/おじゃま=6)
//   ・同じロック処理 (各セルを自列の(dropRow)まで落とす)
//   ・同じ連鎖解決 (重力→グループ探索→4以上/非 ojama を消除)
//   ・同じ攻撃式 (base=floor(消した数/2*rate) + 2^(chain-1))
//   ・同じ wire 形式 (opponent_puyo_update) で相手へ送る
//
// サーバーから bot.socket は無いので emit は io 経由、攻撃送信は
// 人間が puyo_attack を送った時と完全に同じ処理 (puyoSendAttack) を使う。
// ─────────────────────────────────────────────────────────────────

const PUYO_COLS = 6;
const PUYO_ROWS = 13;                 // row0=hidden, rows1-12 visible
const PUYO_COLOR_COUNT = 4;           // クライアント PUYO_COLOR_COUNT と同値
const PUYO_OJAMA = 6;                 // おじゃま色
const PUYO_SAT = [[-1, 0], [0, 1], [1, 0], [0, -1]]; // rotation: sub above/right/below/left
const PUYO_GARBAGE_RATE = 1.0;        // クライアント garbageRate と同値
const PUYO_EMIT_MS = 120;             // 相手へ盤面を送る間隔(ms)
const PUYO_OJAMA_READY_MS = 1000;     // 这么久待在ったおじゃまは次の着手で乗る
const PUYO_LOOKAHEAD_TOP = 5;         // 2手先まで評価する1手目の候補数

// ── AI 評価重み ────────────────────────────────────────────────
// 色数→連鎖価値テーブル（0..54個）。4個そろえると消えるので色数が
// 増えるほど価値が跳ね上がる = 連鎖組みのポテンシャル。
const CHAIN_VAL = [
  0, 0, 1, 1, 2, 4, 6, 9, 12, 16, 20, 26, 32, 40, 48, 58, 68, 80, 92, 106,
  120, 136, 152, 170, 188, 208, 228, 250, 272, 296, 320, 346, 372, 400, 428,
  458, 488, 520, 552, 586, 620, 656, 692, 730, 768, 808, 848, 890, 932, 976,
  1020, 1066, 1112, 1160
];
const W_GROUP2 = 1.2;    // 2個並び（もう1つ置けば消える）
const W_GROUP3 = 3.0;    // 3個並び（あと1つで発火）
const W_ADJ = 0.8;       // 縦に同じ色が隣り合っている（ペア積み）
const W_H2 = 0.28;       // 高さ^2（well を低く保つ）
const W_H3 = 30;         // 12行を超えた分（死に直結）
const W_H4 = 40;         // 高さ11以降の加速ペナルティ
const W_ROW0 = 70;       // 隠し行(r=0)に乗せるのは致命的
const W_ROW1_SPAWN = 40; // スポーン位置 (1,2) はゲームオーバー条件
const W_OJAMA = 0.6;     // 盤上のおじゃま
const POP_BASE = 40;     // 消せるなら消す（列鎖重み）
const POP_CHAIN_W = 8;   // chain^2
const POP_ATTACK_W = 4;  // 攻撃量
const W_CHAIN_POT = 130;  // 連鎖のポテンシャル：消えたら落ちて消える形のBuilt
const W_OJAMA_CLEARED = 9; // 連鎖で消えたおじゃま1個あたり（防御の主軸）
const POP_MISS = 55;     // 消せるのに消さなかったときのペナルティ（連鎖組みのための余地を奪わない程度に）
const CHAIN_POT_MAX = 14;// ポテンシャル計算で評価する最大連鎖長
const PUYO_OJAMA_PER_LOCK = 12; // 1ロックで降らすおじゃまの上限（溜まったゴミを一気に落とさない）

let HOST = null; // {io, rooms, puyoSendAttack, checkGameEnd} を bind で注入

function bind(host) { HOST = host; }

// ── 便利関数 ────────────────────────────────────────────────────
// クライアント public/game.js の seededRng と同一アルゴリズム・同一初期化。
// seed=0 でも再現性が変わらないよう ||1 を付けない。
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
}
function hashStr(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function newBoard() { return Array.from({ length: PUYO_ROWS }, () => new Array(PUYO_COLS).fill(0)); }
function cloneBoard(b) { const out = new Array(PUYO_ROWS); for (let r = 0; r < PUYO_ROWS; r++) out[r] = b[r].slice(); return out; }

// 重力（クライアント _gravity と同じ：列ごとに下から詰める）
// moves を渡すと、落ちたセルを {fromR,toR,c,color} で記録する（相手の落下アニメ用）
function applyGravity(b, moves) {
  for (let c = 0; c < PUYO_COLS; c++) {
    let w = PUYO_ROWS - 1;
    for (let r = PUYO_ROWS - 1; r >= 0; r--) {
      if (b[r][c] !== 0) {
        if (w !== r) {
          if (moves) moves.push({ fromR: r, toR: w, c, color: b[r][c] });
          b[w][c] = b[r][c]; b[r][c] = 0;
        }
        w--;
      }
    }
  }
}

// 連結グループ（クライアント _findGroups と同じ：上下左右・同色）
function findGroups(b) {
  const vis = new Array(PUYO_ROWS);
  for (let r = 0; r < PUYO_ROWS; r++) vis[r] = new Array(PUYO_COLS).fill(false);
  const groups = [];
  for (let r = 0; r < PUYO_ROWS; r++) {
    for (let c = 0; c < PUYO_COLS; c++) {
      const color = b[r][c];
      if (!color || vis[r][c]) continue;
      const cells = [];
      const q = [[r, c]]; vis[r][c] = true;
      let qi = 0;
      while (qi < q.length) {
        const cr = q[qi][0], cc = q[qi][1]; qi++;
        cells.push(cr * PUYO_COLS + cc);
        if (cr > 0 && !vis[cr - 1][cc] && b[cr - 1][cc] === color) { vis[cr - 1][cc] = true; q.push([cr - 1, cc]); }
        if (cr < PUYO_ROWS - 1 && !vis[cr + 1][cc] && b[cr + 1][cc] === color) { vis[cr + 1][cc] = true; q.push([cr + 1, cc]); }
        if (cc > 0 && !vis[cr][cc - 1] && b[cr][cc - 1] === color) { vis[cr][cc - 1] = true; q.push([cr, cc - 1]); }
        if (cc < PUYO_COLS - 1 && !vis[cr][cc + 1] && b[cr][cc + 1] === color) { vis[cr][cc + 1] = true; q.push([cr, cc + 1]); }
      }
      groups.push({ color, size: cells.length, cells });
    }
  }
  return groups;
}

// 連鎖1ステップ分の得点（ぷよぷよキャンプ準拠）— クライアント _puyoChainScore と同じ式
//   連鎖ボーナス: 1連鎖0 / 2〜5連鎖 2^(n+1) / 6連鎖以上 32×(n-3)
//   連結ボーナス(1色あたり): 4個0 / 5〜10個 m-3 / 11個以上 10
//   色数ボーナス: 1色0 / 2色3 / 3色6 / 4色12 / 5色24
// 例外: 1連鎖で4個消しのみ（ボーナス合計0）はボーナス合計を1として計算する（得点40）
function puyoChainScore(chain, popSizes, clearedPuyos) {
  let chainBonus = 0;
  if (chain >= 2) chainBonus = (chain <= 5) ? Math.pow(2, chain + 1) : 32 * (chain - 3);
  let connectBonus = 0;
  for (const m of popSizes) connectBonus += (m <= 4) ? 0 : (m <= 10 ? m - 3 : 10);
  const colorBonus = [0, 0, 3, 6, 12, 24][Math.min(popSizes.length, 5)] || 0;
  let bonusTotal = chainBonus + connectBonus + colorBonus;
  if (chain === 1 && clearedPuyos === 4 && bonusTotal === 0) bonusTotal = 1;
  return 10 * clearedPuyos * bonusTotal;
}

// 連鎖解決（クライアント _resolveChain と同じ計算・同じ順序）
// → 盤面を破壊的に更新し {chain, attack, popped} を返す
function resolveChain(b, moves) {
  let chain = 0, attack = 0, popped = 0, ojamaCleared = 0;
  for (;;) {
    applyGravity(b, moves);
    const groups = findGroups(b);
    let normal = 0, popping = null;
    const popSizes = [];
    for (const g of groups) {
      if (g.color === PUYO_OJAMA || g.size < 4) continue;
      normal += g.size;
      popSizes.push(g.size);
      if (!popping) popping = new Set();
      for (const k of g.cells) popping.add(k);
    }
    if (!popping) break;
    chain++;
    // 消えるぷよに直接隣接するおじゃまも一緒に消える。
    // 参照するのは「消える通常ぷよ」のセルだけ。おじゃま同士で繋がっていても
    // 連鎖的に広げると 1つの消えで塊ごと消えてくなるので、ここは 1ホップで止める。
    const normalCells = [...popping];
    for (const k of normalCells) {
      const r = (k / PUYO_COLS) | 0, c = k % PUYO_COLS;
      if (r > 0 && b[r - 1][c] === PUYO_OJAMA) popping.add((r - 1) * PUYO_COLS + c);
      if (r < PUYO_ROWS - 1 && b[r + 1][c] === PUYO_OJAMA) popping.add((r + 1) * PUYO_COLS + c);
      if (c > 0 && b[r][c - 1] === PUYO_OJAMA) popping.add(r * PUYO_COLS + c - 1);
      if (c < PUYO_COLS - 1 && b[r][c + 1] === PUYO_OJAMA) popping.add(r * PUYO_COLS + c + 1);
    }
    // 得点に使うのは今回この連鎖で消えた「通常ぷよ」のみ（クライアントと同じ）。
    // 消えたおじゃまぷよは火力に換算しない。累計を掛けるとずれる。
    let ojamaThisStep = 0;
    for (const k of popping) if (b[(k / PUYO_COLS) | 0][k % PUYO_COLS] === PUYO_OJAMA) ojamaThisStep++;
    const clearedPuyos = normal;
    const stepScore = puyoChainScore(chain, popSizes, clearedPuyos);
    const baseGarbage = Math.floor(stepScore * PUYO_GARBAGE_RATE / 70);
    attack += baseGarbage;
    ojamaCleared += ojamaThisStep;
    for (const k of popping) b[(k / PUYO_COLS) | 0][k % PUYO_COLS] = 0;
    popped += popping.size;
  }
  return { chain, attack, popped, ojamaCleared };
}

// ── 連鎖ポテンシャル ────────────────────────────────────────────
// 「ここで消えたら、ここが落ちて、ここが消える」を盤面上で実際に再現して測る。
// 開始色4通りを走査し、重力をクライアントどおりに適用しながら連鎖が何手まで伸びるかを実測する。
// 同じ色は1手ですべて消えるので、連鎖の次手は「消えた色とは異なる色」になる。
function _popColor(b, color) {
  let removed = 0;
  for (;;) {
    const gs = findGroups(b);
    let hit = false;
    for (const g of gs) {
      if (g.color !== color || g.size < 4) continue;
      for (const k of g.cells) {
        const r = (k / PUYO_COLS) | 0, c = k % PUYO_COLS;
        if (b[r][c] === color) { b[r][c] = 0; removed++; }
      }
      hit = true;
    }
    if (!hit) break;
  }
  return removed;
}

function chainPotential(b) {
  let best = 0;
  for (let start = 1; start <= PUYO_COLOR_COUNT; start++) {
    const nb = cloneBoard(b);
    let cur = start, len = 0;
    while (len < CHAIN_POT_MAX) {
      if (_popColor(nb, cur) === 0) break;
      len++;
      applyGravity(nb);
      // 次に消える色は「消せるグループが最大の色」（同色は1手で消えるので除く）
      let nc = 0, ns = 0;
      for (const g of findGroups(nb)) {
        if (g.color === cur || g.size < 4) continue;
        if (g.size > ns) { ns = g.size; nc = g.color; }
      }
      if (!nc) break;
      cur = nc;
    }
    if (len > best) best = len;
  }
  return best;
}

// ペアの落とし込み（クライアント _lock と同じ：各セルを自列の dropRow まで落とす）
// 成功したら true（盤は破壊的に更新される）
function placePair(b, colors, rot, pivotC) {
  const dr = PUYO_SAT[rot][0], dc = PUYO_SAT[rot][1];
  const sc = pivotC + dc;
  if (pivotC < 0 || pivotC >= PUYO_COLS || sc < 0 || sc >= PUYO_COLS) return false;
  const pivotR = 1;                       // スポーン行
  const sr = pivotR + dr;                 // サテライト行
  const dropRow = (startR, c) => { let r = startR < 0 ? 0 : startR; while (r + 1 < PUYO_ROWS && b[r + 1][c] === 0) r++; return r; };
  const set = (r, c, col) => {
    if (r < 0 || r >= PUYO_ROWS || c < 0 || c >= PUYO_COLS) return false;
    if (b[r][c] !== 0) return false;
    b[r][c] = col; return true;
  };
  const vertical = pivotC === sc;
  // 縦向きは下にある方を先に置く（クライアントと同じ順序）
  const lowerFirst = vertical ? (pivotR >= sr) : true;
  const [rA, cA, vA] = lowerFirst ? [dropRow(pivotR, pivotC), pivotC, colors[0]] : [dropRow(sr, sc), sc, colors[1]];
  if (!set(rA, cA, vA)) return false;
  const [rB, cB, vB] = lowerFirst ? [dropRow(sr, sc), sc, colors[1]] : [dropRow(pivotR, pivotC), pivotC, colors[0]];
  if (!set(rB, cB, vB)) { b[rA][cA] = 0; return false; } // 2個目が置けなければ 1個目も戻す
  return true;
}

// ── 盤面評価（高点数ほど良い） ──────────────────────────────────
function evaluate(b) {
  const cnt = [0, 0, 0, 0, 0, 0, 0];
  let ojama = 0;
  for (let r = 0; r < PUYO_ROWS; r++) {
    const row = b[r];
    for (let c = 0; c < PUYO_COLS; c++) {
      const v = row[c];
      if (v === 0) continue;
      if (v === PUYO_OJAMA) ojama++;
      else cnt[v]++;
    }
  }
  // 1) 連鎖ポテンシャル（色ごとに「その色の連鎖で何個消せそうか」を足す）
  let score = 0;
  const chainMax = CHAIN_VAL.length - 1;
  for (let color = 1; color <= PUYO_COLOR_COUNT; color++) {
    score += CHAIN_VAL[Math.min(cnt[color], chainMax)];
  }
// 2) 2個/3個並び（あと1〜2個で発火するグループ）を個別に評価
  for (const g of findGroups(b)) {
    if (g.color === PUYO_OJAMA) continue;
    if (g.size === 2) score += W_GROUP2;
    else if (g.size === 3) score += W_GROUP3;
  }
  // 3) 縦に同じ色が隣り合っている（ペア積みの下敷き）
  for (let r = 0; r < PUYO_ROWS - 1; r++) {
    for (let c = 0; c < PUYO_COLS; c++) {
      const v = b[r][c];
      if (v && v !== PUYO_OJAMA && b[r + 1][c] === v) score += W_ADJ;
    }
  }
    // 4) 列高さ（well を低く保つ。上に積もるほど重く）
  for (let c = 0; c < PUYO_COLS; c++) {
    let h = 0;
    for (let r = 0; r < PUYO_ROWS; r++) if (b[r][c] !== 0) { h = PUYO_ROWS - r; break; }
    score -= W_H2 * h * h;
    if (h > 12) score -= W_H3 * (h - 12);
    if (h > 11) score -= W_H4 * (h - 11);
  }
  // 5) 隠し行(r=0) とスポーン位置(1,2) に乗せるのは致命的
  for (let c = 0; c < PUYO_COLS; c++) if (b[0][c] !== 0) score -= W_ROW0;
  if (b[1][2] !== 0) score -= W_ROW1_SPAWN;
  // 6) 盤上のおじゃま
  score -= W_OJAMA * ojama;
  return score;
}

class PuyoBot {
  constructor(id, name, level, roomId, bag, customCode, botType, botPps) {
    this.id = id; this.name = name; this.level = level; this.roomId = roomId;
    this.isBot = true; this.botLevel = level;
    this.botType = 'puyo';
    const room = HOST ? HOST.rooms[roomId] : null;
    this.botPps = (typeof botPps === 'number' && botPps > 0) ? botPps
      : (room && room.roomSettings && room.roomSettings.botPps) || 2.5;
    // テトリスボットと同じインタフェース（一覧表示・checkGameEnd 等）
    this.board = null;          // ぷよ盤面 so this.puyoBoard を使う
    this.cols = PUYO_COLS;
    this.score = 0; this.lines = 0; this.lvl = 1;
    this.combo = -1; this.b2b = false; this.ren = 0; this.locking = false;
    this.holdPiece = null; this.holdUsed = false; this.garbageQueue = [];
    this.currentPiece = null;
    this.customCode = customCode || null; this._customFn = null;
    this.thinkTimer = null; this.emitTimer = null;
    this.alive = true;

    // ぷよ盤面
    this.puyoBoard = newBoard();
    // 人間と同じ next 順にするため、room の bagSeed をそのまま使う。
    // （Tetris の bot も new Bag(room.bagSeed) で「人間と同じミノ順を共有」している）
    // ここに id ハッシュを XOR すると bot だけ別の列になり、next が一致しない。
    const seed = (room && typeof room.bagSeed === 'number') ? (room.bagSeed >>> 0) : 1;
    this.rng = lcg(seed);
    // おじゃま配置など「ピース列に影響しない」乱数。this.rng はピース色専用にする。
    // ゴミの配置で消費すると、受け取ったゴミの量・タイミングが違うだけで
    // 乱数列がずれて、人間と next の順番が合わなくなる。
    this.grng = Math.random;
    this.nextQueue = [this._makePair(), this._makePair(), this._makePair()];
    this.current = null;
    this.chain = 0; this.comboCount = 0; this.lastPlacementCleared = false;
    this.garbageRate = PUYO_GARBAGE_RATE;
    this.ojamaQueue = [];
    // 1ロックで降らすおじゃまの上限。コンボ速度に比例させて少し多めに流す。
    this.ojamaPerLock = Math.max(6, Math.round(this.botPps * PUYO_OJAMA_PER_LOCK / 2.5));
    this._chainAttack = 0;

    // 統計
    this.startTime = Date.now(); this.pieceCount = 0;
    this.totalAttackSent = 0; this.totalGarbageSent = 0;
    this.totalGarbageCleared = 0; this.totalGarbageReceived = 0;
    this.pps = 0; this.apm = 0; this.vs = 0;

    this._spawnPair();
  }

  _room() { return (HOST && HOST.rooms) ? HOST.rooms[this.roomId] : null; }

  // PPS制御（BotPlayer と同じ 1000/botPps）
  get thinkDelay() { return (this.botPps && this.botPps > 0) ? 1000 / this.botPps : 400; }

  _randColor() { return Math.floor(this.rng() * PUYO_COLOR_COUNT) + 1; }
  _makePair() { return [this._randColor(), this._randColor()]; }

  _checkTopOut() { return this.puyoBoard[0][2] !== 0 || this.puyoBoard[1][2] !== 0; }

  _spawnPair() {
    const pair = this.nextQueue.shift();
    this.nextQueue.push(this._makePair());
    if (this._checkTopOut()) { this._topOut('spawn-blocked'); return; }
    this.current = { pivotR: 1, pivotC: 2, rotation: 0, colors: pair };
  }

  _updateCombo(cleared) {
    if (cleared && this.lastPlacementCleared) this.comboCount++;
    else if (cleared) this.comboCount = 1;
    else this.comboCount = 0;
    this.lastPlacementCleared = cleared;
  }

// 受信おじゃまの追加（サーバーから receive_puyo_ojama 経由で呼ばれる）
  queueOjama(ojama) {
    const n = Math.floor(ojama) || 0;
    if (n <= 0 || !this.alive) return;
    this.ojamaQueue.push({ amount: n, time: Date.now() });
    this.totalGarbageReceived += n;
    this._emitBoard();
  }

// クライアント _applyOjama と同じ：1秒以上待った分から row0 から埋める
  // ただし bot は「連鎖中だけおじゃまを降らさない」ため、キューが際限なく溜まる。
  // 溜まった全量を1手で降らすと盤面が一気に埋まって即死するため、
  // 1ロックあたりの適用量に上限（ojamaPerLock）を設けて少しずつ流す。
  _applyOjama(limit) {
    if (!this.ojamaQueue.length) return;
    const cap = (limit === undefined || limit === null) ? this.ojamaPerLock : limit;
    const now = Date.now();
    let total = 0;
    const waiting = [];
    for (const v of this.ojamaQueue) {
      if (now - (v.time || 0) >= PUYO_OJAMA_READY_MS) total += v.amount;
      else waiting.push(v);
    }
    if (total <= 0) { this.ojamaQueue = waiting; return; }
    // 上限を超えた分は「すでに到達済み」のままキューへ残し、次手からゆっくり流す
    if (cap > 0 && total > cap) {
      waiting.push({ amount: total - cap, time: now - PUYO_OJAMA_READY_MS });
      total = cap;
    }
    this.ojamaQueue = waiting;
    for (let r = 0; r < PUYO_ROWS && total > 0; r++) {
      const cols = [0, 1, 2, 3, 4, 5];
      for (let i = cols.length - 1; i > 0; i--) { const j = Math.floor(this.grng() * (i + 1)); const t = cols[i]; cols[i] = cols[j]; cols[j] = t; }
      for (const c of cols) {
        if (total <= 0) break;
        if (this.puyoBoard[r][c] !== 0) continue;
        this.puyoBoard[r][c] = PUYO_OJAMA;
        total--;
      }
    }
    if (total > 0) this.ojamaQueue.push({ amount: total, time: Date.now() });
  }

  // チェーン攻撃で受け取り予定のおじゃまを相殺（クライアントと同じ）
  _cancelOjama(amount) {
    let remaining = amount;
    const keep = [];
    for (const v of this.ojamaQueue) {
      if (remaining <= 0) { keep.push(v); continue; }
      const take = Math.min(v.amount, remaining);
      if (v.amount - take > 0) keep.push({ amount: v.amount - take, time: v.time });
      remaining -= take;
    }
    this.ojamaQueue = keep;
    return remaining;
  }

  _sendAttack(ojama) {
    const room = this._room();
    if (!room || !HOST || typeof HOST.puyoSendAttack !== 'function') return;
    HOST.puyoSendAttack(room, this.id, Math.floor(ojama));
  }

  // ── 盤面送信（クライアント puyo_board_update と同じ形） ──────
  _emitBoard() {
    if (!HOST || !HOST.io) return;
    const sat = this.current ? [this.current.pivotR + PUYO_SAT[this.current.rotation][0], this.current.pivotC + PUYO_SAT[this.current.rotation][1]] : null;
    HOST.io.to(this.roomId).emit('opponent_puyo_update', {
      id: this.id,
      board: this.puyoBoard.map(r => r.slice()),
      current: this.current ? {
        pivotR: this.current.pivotR, pivotC: this.current.pivotC,
        rotation: this.current.rotation, colors: this.current.colors,
        satR: sat ? sat[0] : null, satC: sat ? sat[1] : null
      } : null,
      nextQueue: this.nextQueue.slice(0, 3).map(p => [p[0], p[1]]),
      ojamaQueue: this.ojamaQueue.reduce((s, v) => s + v.amount, 0),
      score: this.score, chain: this.chain, comboCount: this.comboCount, alive: this.alive
    });
  }

  // 落ちたセルを相手へ送る（クライアント _onOpFall と同じ形式）
  _emitFall(moves) {
    if (!HOST || !HOST.io || !moves || !moves.length) return;
    HOST.io.to(this.roomId).emit('opponent_puyo_fall', { id: this.id, moves });
  }

  _ensureEmitTimer() {
    if (this.emitTimer) return;
    this.emitTimer = setInterval(() => {
      if (!this.alive) { this._clearEmitTimer(); return; }
      const room = this._room();
      if (!room || !room.started) return;
      this._emitBoard();
    }, PUYO_EMIT_MS);
    if (this.emitTimer.unref) this.emitTimer.unref();
  }
  _clearEmitTimer() { if (this.emitTimer) { clearInterval(this.emitTimer); this.emitTimer = null; } }

  // ── 1手+2手先探索 ────────────────────────────────────────────
  _choosePlacement() {
    const board = this.puyoBoard;
    if (!this.current) return null;
    const colors = this.current.colors;
    // 1手目: 全回転 x 全列をシミュレートして連鎖解決
    const cands = [];
    for (let rot = 0; rot < 4; rot++) {
      for (let pc = 0; pc < PUYO_COLS; pc++) {
        const nb = cloneBoard(board);
        if (!placePair(nb, colors, rot, pc)) continue;
        const res = resolveChain(nb);
        cands.push({
          rot, pivotC: pc, nb, chain: res.chain, attack: res.attack, ojamaCleared: res.ojamaCleared,
          base: evaluate(nb),
          // 連鎖を「組む」形にする：消えたら落ちて消える潜在連鎖長を実測する
          pot: chainPotential(nb)
        });
      }
    }
    if (!cands.length) return null;
    // 防御の本体は「積み上がったおじゃまを消す量」なので、消えたゴミ数を直接評価する。
    // これがないと毎回「最も小さい連鎖を即消す」戦略に固定され、1手あたり2ぷよしか
    // 消せず、強い攻撃には原理的に勝てない（実測: 消去数/手 = 2.00 で完全な頭打ち）。
    const rawScore = c => (c.chain > 0 ? POP_BASE + c.chain * c.chain * POP_CHAIN_W + c.attack * POP_ATTACK_W : 0)
                       + c.ojamaCleared * W_OJAMA_CLEARED
                       + c.pot * W_CHAIN_POT + c.base;
    // 「消せる手は必ず消す」硬いフィルタは廃止する。連鎖を組むには
    // 「今は消さずに下敷きを作る」手を選ぶ必要があるため。
    // ただし消せるのに消さない手には軽いペナルティを掛ける（連鎖組みの余地を奪わない程度に）。
    const anyPop = cands.some(c => c.chain > 0);
    const top = cands.map(c => ({ c, s: rawScore(c) + (!anyPop || c.chain > 0 ? 0 : POP_MISS) }))
                    .sort((a, b) => b.s - a.s)
                    .slice(0, PUYO_LOOKAHEAD_TOP);
    // 2手目: 次に来るペアを全探索して最大評価を取る
    const nextPair = this.nextQueue[0];
    let best = null;
    for (const { c, s: s1 } of top) {
      let child = null;
      if (nextPair) {
        for (let rot = 0; rot < 4; rot++) {
          for (let pc = 0; pc < PUYO_COLS; pc++) {
            const nb2 = cloneBoard(c.nb);
            if (!placePair(nb2, nextPair, rot, pc)) continue;
            const r2 = resolveChain(nb2);
            const s = (r2.chain > 0 ? POP_BASE * 0.5 + r2.chain * r2.chain * POP_CHAIN_W * 0.5 + r2.attack * POP_ATTACK_W * 0.5 : 0)
                       + evaluate(nb2);
            if (!child || s > child.score) child = { score: s, rot, pivotC: pc };
          }
        }
      }
      const score = s1 + (child ? child.score : 0);
      if (!best || score > best.score) best = { score, rot: c.rot, pivotC: c.pivotC, second: child };
    }
    return best;
  }

  // 1ペア処理（place → 連鎖解決 → 攻撃送信 or 次のペア）
  think() {
    if (!this.alive || !this.current) return;
    const room = this._room();
    if (room && room.shogiMode) return;
    this.chain = 0;
    this.pieceCount++;
    const now = Date.now();
    const elapsedSec = (now - this.startTime) / 1000;
    if (elapsedSec > 1) {
      this.pps = this.pieceCount / elapsedSec;
      this.apm = (this.totalAttackSent / elapsedSec) * 60;
    }
    // ロック（ペア設置 → 連鎖解決 → 消えなかったときだけおじゃまを乗せる）
    // おじゃまの適用は下の else 節で行う。ここでは探索盤面と実際の設置盤面を一致させる
    // ため、まだおじゃまは乗せない。
    // 設置するのは「いま持つペア」。nextQueue[0] は次のペアなので使わない
    const colors = this.current.colors;
    const move = this._choosePlacement();
    if (!move) { this._topOut('no-placement'); return; }
    this.current = null;
    if (!placePair(this.puyoBoard, colors, move.rot, move.pivotC)) { this._topOut('place-failed'); return; }
    // 連鎖解決で実際に落ちたセルを採取して、相手の盤面に落下アニメを出す
    const fallMoves = [];
    const res = resolveChain(this.puyoBoard, fallMoves);
    if (res.chain > 0) {
      this.chain = res.chain;
      this._updateCombo(true);
      this.totalGarbageCleared += res.popped;
      this.score += res.attack * 100;
      // 相殺できた分を除いた余りをチェーン攻撃として蓄積（クライアント _resolveChain と同じ）
      this._chainAttack += this._cancelOjama(res.attack);
    } else {
      this._updateCombo(false);
      if (this.comboCount >= 2) this._chainAttack += this.comboCount - 1;
      // 「ぷよが消えている最中はおじゃまを振らない」。
      // ぷよを消している間にゴミを降らすと自分の連鎖が潰れるため、
      // 連鎖が終わって盤が静止している（= 消せなかった）ときだけゴミを降ろす。
      this._applyOjama();
      // _applyOjama は row0（盤頂の隠し行）から書き込む。クライアントは _lock 内で
      // place/_resolveChain より前に適用し、直後の重力で底へ落としてバランスを取っている。
      // bot は「消えなかった着手の後」という順番を要求されているため適用後に重力をかける。
      // これをしないとゴミが盤頂の隠し行に残り _checkTopOut() が即成立して、
      // ゴミを1個受け取った瞬間にゲームオーバーになる。
      applyGravity(this.puyoBoard, fallMoves);
    }
    if (fallMoves.length) this._emitFall(fallMoves);
    // 連鎖倍率ブースト → 攻撃送信（クライアントは連鎖終端で毎回実施する）
    if (this._chainAttack > 0) {
      const rs = (room && room.roomSettings) || {};
      // 通常ルームのみ。QP では人間側と同様に火力倍率を適用しない。
      // ?? を使う: 開始時間0 / 増加量0 の指定を || が潰さないようにする
      const delaySec = (rs.multiplierDelayMin ?? 1.6) * 60;
      const interval = rs.multiplierIntervalSec ?? 1;
      const rate = rs.multiplierRate ?? 0.03;
      if (room && !room.quickPlayMode && elapsedSec > delaySec && interval > 0) {
        const steps = Math.floor((elapsedSec - delaySec) / interval);
        this._chainAttack = Math.floor(this._chainAttack * (1 + steps * rate));
      }
      const send = this._chainAttack;
      this._chainAttack = 0;
      this.totalAttackSent += send;
      this._sendAttack(send);
    }
    this._chainAttack = 0;
    this._emitBoard();
    if (this._checkTopOut()) { this._topOut('after-lock'); return; }
    this._spawnPair();
    this._emitBoard();
  }

  startAutonomous(extraDelay = 0) {
    if (this.thinkTimer) return;
    this._ensureEmitTimer();
    const targetInterval = this.thinkDelay;
    const tick = () => {
      if (!this.alive) return;
      const room = this._room();
      if (!room || room.shogiMode) return;
      if (!room.started && !(room.quickPlayMode && room._qpStandby)) return;
      this.thinkTimer = setTimeout(() => {
        const t0 = Date.now();
        // Botの例外でサーバー全体が落ちないようガードする
        try {
          this.think();
        } catch (e) {
          console.error(`[PUYO BOT] ${this.name} think() error:`, e && e.stack || e);
        }
        const elapsed = Date.now() - t0;
        this.thinkTimer = setTimeout(tick, Math.max(30, targetInterval - elapsed));
      }, 0);
    };
    this.thinkTimer = setTimeout(tick, extraDelay + targetInterval);
  }

  stop() {
    if (this.thinkTimer) { clearTimeout(this.thinkTimer); this.thinkTimer = null; }
    this._clearEmitTimer();
    this.alive = false;
  }

  _topOut(reason) {
    if (!this.alive) return;
    {
      let onBoard = 0;
      for (let r = 0; r < PUYO_ROWS; r++) for (let c = 0; c < PUYO_COLS; c++) if (this.puyoBoard[r][c] === PUYO_OJAMA) onBoard++;
      const pend = this.ojamaQueue.reduce((s, v) => s + v.amount, 0);
      console.log(`[PUYO BOT] ${this.name} TOPOUT reason=${reason || '?'} pieces=${this.pieceCount} chain=${this.chain} boardOjama=${onBoard} pendingOjama=${pend} recv=${this.totalGarbageReceived} cleared=${this.totalGarbageCleared} sent=${this.totalAttackSent}`);
    }
    this.alive = false;
    this.current = null;
    this.chain = 0;
    this._emitBoard();
    this.stop();
    if (HOST && HOST.io) HOST.io.to(this.roomId).emit('player_dead', { id: this.id, name: this.name });
    if (HOST && typeof HOST.checkGameEnd === 'function') HOST.checkGameEnd(this.roomId);
  }
}

module.exports = { PuyoBot, bind };
