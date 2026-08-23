'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { findSpinSetups, findSpinPlan, replayTrajectory, PIECE_TYPES } = require('../src/index');
const { searchPlacements, evaluatePlacement } = require('../src/solver');
const { analyzeBoard } = require('../src/heuristics');
const PORT = process.env.PORT || 3131;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function serveStatic(req, res) {
  let reqPath = req.url === '/' ? '/index.html' : req.url;
  reqPath = decodeURIComponent(reqPath.split('?')[0]);
  const filePath = path.join(PUBLIC_DIR, reqPath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function handleSolve(req, res) {
  try {
    const bodyStr = await readBody(req);
    const { board, current, next, hold, options, mode } = JSON.parse(bodyStr || '{}');

    if (!Array.isArray(board) || !Array.isArray(next)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'board / next が不正です(next は必須・配列)' }));
      return;
    }
    // planモードは開始ミノを固定しない(current: null)ことがある。singleモードはcurrent必須。
    if (mode !== 'plan' && (current == null || !PIECE_TYPES.includes(current))) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'current が不正です(singleモードでは必須)' }));
      return;
    }

    if (mode === 'plan') {
      // findSpinPlan は現在ミノ(current)を固定せず7種類すべてを仮定して探索し、
      // ネクスト列(next)は実物があればその順番で使用し、足りない分は7-bagで自動補完する。
      // demo(planモード)では current/next ピッカーを非表示にしているため渡されない。
      const planOptions = Object.assign({ hold: hold || null }, options || {});
      // 積み込みスピン検索は「優先順(Triple>Double>Single)＋手数が少ない順」の上位10件を返す。
      // ただし T-Spin Mini Single に上位が占領されると S/Z/J/L スピンが表示されないため、
      // 各スピン種のベスト1を必ず含める(diversify)。
      if (planOptions.limit == null) planOptions.limit = 10;
      if (planOptions.diversify == null) planOptions.diversify = true;
      // 実ネクストを渡していない場合、1回の7-bagで特定種しか出ないことがあるため
      // 2バッグ分を探索して統合する。
      if (planOptions.attempts == null) planOptions.attempts = 2;
      // 連続2スピン(spins=2)を要求された場合は、2回目のスピンまでの積み込みに
      // より多くのミノが必要になるため、既定の探索深度を広げる。
      if (planOptions.spins != null && planOptions.spins >= 2 && planOptions.maxPieces == null) {
        planOptions.maxPieces = 12;
      }
      if (current) planOptions.current = current;
      const hasRealNext = Array.isArray(next) && next.length;
      if (hasRealNext) planOptions.next = next;

      // 積み込みは盤面下側で行われるため、スタック+数行の空きだけを含むウィンドウに切り詰めて
      // 探索する(空盤面は下12行)。高速化のために最上部は探索対象から外す。
      const SEARCH_ROWS = 12;
      const stackTop = board.findIndex((row) => row.some(Boolean));
      const top = stackTop === -1
        ? Math.max(0, board.length - SEARCH_ROWS)
        : Math.max(0, Math.min(stackTop - 3, board.length - SEARCH_ROWS));
      const offset = top;
      const searchBoard = board.slice(offset);
      const padTop = (rows) => Array.from({ length: offset }, () => new Array(board[0].length).fill(0)).concat(rows);

      let plans = findSpinPlan(searchBoard, planOptions);
      // 実ネクストを渡していない(demo等)場合は、7-bagの引きが悪く0件になることがあるため
      // 別のbagで数回リトライする。実ネクストを指定したAPI利用時はbagが固定なのでリトライしない。
      if (!hasRealNext && plans.length === 0) {
        for (let i = 0; i < 2 && plans.length === 0; i++) {
          plans = findSpinPlan(searchBoard, planOptions);
        }
      }

      // 連続2回スピン(spins=2)を要求したのに2回スピンする手順が見つからない場合は、
      // 1回スピンの手順で代用し、その旨をfallbackフラグで伝える。
      const requestedSpins = planOptions.spins;
      if (planOptions.spins >= 2 && plans.length === 0) {
        planOptions.spins = 1;
        plans = findSpinPlan(searchBoard, planOptions);
        for (const p of plans) p.fallback = true;
      }
      planOptions.spins = requestedSpins;

      // 切り詰めた座標を元の20行盤面に戻す。
      // 探索はスタック+余裕のウィンドウで行ったため、軌跡(path)のy座標をoffset加算すると
      // 「スポーン位置(上端y=0)から最初のパス点までが飛んでしまう」不自然なアニメーションになる。
      // そこで軌跡はフル盤面で再計算する(探索はウィンドウでも、その上の行は全て空なので
      // 同じ手順がそのまま成立し、スポーンから連続した正しい軌跡になる)。
      for (const p of plans) {
        for (const step of p.plan) {
          step.path = replayTrajectory(board, step.piece, step.moves);
          step.after = padTop(step.after);
        }
        p.finalBoard = padTop(p.finalBoard);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ plans }));
      return;
    }

    const result = findSpinSetups(board, current, next, hold || null, options || {});
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ candidates: result }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err && err.message || err) }));
  }
}

/**
 * 盤面が半分まで埋まっている(=枠の上半分までブロックが積まれている)か。
 * この状態になったら bot はスピン連鎖(b2b)を解除してゴミブロックを削る動作に切り替える。
 */
function isHalfFull(board) {
  const stackTop = board.findIndex((row) => row.some(Boolean));
  return stackTop !== -1 && stackTop <= board.length * 0.5;
}

/**
 * 現在ミノを「クリーンに積む」または「掘る(ゴミ削り)」最良の設置位置を返す。
 * mode='stack': 平坦・低く・穴を作らない通常の積み。
 * mode='dig'  : ライン消去を最優先にし、盤面を削る(ゴミブロック処理)。
 */
function bestPlacement(board, piece, mode) {
  const placements = searchPlacements(board, piece);
  let best = null;
  let bestScore = -Infinity;
  for (const state of placements) {
    const e = evaluatePlacement(board, piece, state);
    const { holes, bumpiness, aggregateHeight, maxHeight } = analyzeBoard(e.resultBoard);
    let score;
    if (mode === 'dig') {
      score = e.linesCleared * 1000 - holes * 50 - aggregateHeight * 0.5 - maxHeight * 2 - bumpiness * 5 - state.moves.length * 0.1;
    } else {
      score = -holes * 76 - aggregateHeight * 0.51 - bumpiness * 0.18 - maxHeight * 1.2 - state.moves.length * 0.01;
    }
    if (score > bestScore) {
      bestScore = score;
      best = {
        piece,
        usedHold: false,
        x: e.x, y: e.y, rot: e.rot,
        moves: e.moves,
        label: e.label,
        linesCleared: e.linesCleared,
      };
    }
  }
  return best;
}

/**
 * bot の1手番の意思決定を返す。
 *   - 盤面が半分埋まっている → { type:'dig', ... } (b2b解除+ゴミ削り)
 *   - 実ネクストで2回(または1回)スピンに到達できる → { type:'spin', steps:[...] }
 *   - どちらも無理 → { type:'stack', ... } (クリーン積み)
 * spinsの探索は「実ネクスト+実ホールド」だけで行うため、バッグの偏りで
 * 0件になることは稀だが、0件なら1スピン→クリーン積みへ順にフォールバックする。
 */
async function handleBot(req, res) {
  try {
    const body = JSON.parse((await readBody(req)) || '{}');
    const { board, current, next, hold } = body;
    if (!Array.isArray(board) || !current || !PIECE_TYPES.includes(current) || !Array.isArray(next)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'board / current / next が不正です' }));
      return;
    }

    if (isHalfFull(board)) {
      const p = bestPlacement(board, current, 'dig');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(p ? { type: 'dig', ...p } : { type: 'dig', error: '置ける場所なし' }));
      return;
    }

    // 2回スピン→ダメなら1回スピン→ダメならクリーン積み
    for (const spins of [2, 1]) {
      const planOptions = {
        current,
        next,
        hold: hold || null,
        spins,
        maxPieces: 12,
        limit: 3,
        attempts: 1,
        diversify: true,
      };
      const plans = findSpinPlan(board, planOptions);
      if (plans.length) {
        const best = plans[0];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          type: 'spin',
          spinCount: best.spinCount,
          label: best.label,
          steps: best.plan.map((step) => ({
            piece: step.piece,
            usedHold: !!step.usedHold,
            x: step.x, y: step.y, rot: step.rot,
            moves: step.moves,
            isSpin: !!step.isSpin,
            label: step.label,
            linesCleared: step.linesCleared,
          })),
        }));
        return;
      }
    }

    const p = bestPlacement(board, current, 'stack');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(p ? { type: 'stack', ...p } : { type: 'stack', error: '置ける場所なし' }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err && err.message || err) }));
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/solve') {
    handleSolve(req, res);
    return;
  }
  if (req.method === 'POST' && req.url === '/api/bot') {
    handleBot(req, res);
    return;
  }
  if (req.method === 'GET' && req.url === '/api/pieces') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ pieces: PIECE_TYPES }));
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Tetris Spin Solver デモを起動しました: http://localhost:${PORT}`);
});