'use strict';

const WIDTH = 10;
const HEIGHT = 20;
const PIECES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

let board = Array.from({ length: HEIGHT }, () => new Array(WIDTH).fill(0));
let current = 'T';
let hold = null;
let nextPiece = 'I';
let candidates = [];
let activeIndex = -1;
let resultsMode = 'single'; // 'single' | 'plan'
let spins = 1;

const boardCanvas = document.getElementById('boardCanvas');
const previewCanvas = document.getElementById('previewCanvas');
const bctx = boardCanvas.getContext('2d');
const pctx = previewCanvas.getContext('2d');

function cellSize(canvas) {
  return canvas.width / WIDTH;
}

function drawBoard(ctx, canvas, boardData, overlayCells, overlayColor) {
  const cs = cellSize(canvas);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      ctx.fillStyle = boardData[y][x] ? '#4a5170' : '#1c2038';
      ctx.fillRect(x * cs, y * cs, cs - 1, cs - 1);
    }
  }
  if (overlayCells) {
    ctx.fillStyle = overlayColor || '#7c8cff';
    for (const [x, y] of overlayCells) {
      if (y < 0) continue;
      ctx.fillRect(x * cs, y * cs, cs - 1, cs - 1);
    }
  }
  // グリッド線
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  for (let x = 0; x <= WIDTH; x++) {
    ctx.beginPath(); ctx.moveTo(x * cs, 0); ctx.lineTo(x * cs, canvas.height); ctx.stroke();
  }
  for (let y = 0; y <= HEIGHT; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * cs); ctx.lineTo(canvas.width, y * cs); ctx.stroke();
  }
}

function renderBoard() {
  drawBoard(bctx, boardCanvas, board);
}

boardCanvas.addEventListener('click', (e) => {
  const rect = boardCanvas.getBoundingClientRect();
  const cs = cellSize(boardCanvas);
  const scaleX = boardCanvas.width / rect.width;
  const scaleY = boardCanvas.height / rect.height;
  const x = Math.floor(((e.clientX - rect.left) * scaleX) / cs);
  const y = Math.floor(((e.clientY - rect.top) * scaleY) / cs);
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
  board[y][x] = board[y][x] ? 0 : 1;
  renderBoard();
});

document.getElementById('clearBtn').addEventListener('click', () => {
  board = Array.from({ length: HEIGHT }, () => new Array(WIDTH).fill(0));
  renderBoard();
});

document.getElementById('presetTsd').addEventListener('click', () => {
  // 実際に単発探索でT-Spin Mini Doubleに到達できる形状 (cols3-4 の2x2ウェル)。
  board = Array.from({ length: HEIGHT }, () => new Array(WIDTH).fill(0));
  const baseY = HEIGHT - 3;
  const rows = ['1110011111', '1110011111', '1110111111'];
  rows.forEach((r, i) => {
    r.split('').forEach((c, x) => { board[baseY + i][x] = c === '1' ? 1 : 0; });
  });
  renderBoard();
});

document.getElementById('presetFlat').addEventListener('click', () => {
  board = Array.from({ length: HEIGHT }, () => new Array(WIDTH).fill(0));
  for (let x = 0; x < WIDTH; x++) {
    if (x === 9) continue;
    board[HEIGHT - 1][x] = 1;
    board[HEIGHT - 2][x] = 1;
  }
  renderBoard();
});

function buildPicker(containerId, includeNone, selected, onSelect) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  if (includeNone) {
    const btn = document.createElement('button');
    btn.className = 'piece-btn none' + (selected === null ? ' selected' : '');
    btn.textContent = 'なし';
    btn.addEventListener('click', () => onSelect(null));
    el.appendChild(btn);
  }
  for (const p of PIECES) {
    const btn = document.createElement('button');
    btn.className = `piece-btn piece-${p}` + (selected === p ? ' selected' : '');
    btn.textContent = p;
    btn.addEventListener('click', () => onSelect(p));
    el.appendChild(btn);
  }
}

function refreshPickers() {
  buildPicker('currentPicker', false, current, (p) => { current = p; refreshPickers(); });
  buildPicker('holdPicker', true, hold, (p) => { hold = p; refreshPickers(); });
  buildPicker('nextPicker', false, nextPiece, (p) => { nextPiece = p; refreshPickers(); });
}

// 'single'(今すぐ置けるスピン)と'plan'(積み込みで下地を作る)のモード切替。
// プラン探索ではネクスト列はサーバー側で7-bagから自動補完されるため、
// demo上では current / next のピッカーを非表示にする。
function setMode(mode) {
  resultsMode = mode;
  const isPlan = mode === 'plan';
  document.getElementById('currentPicker').parentElement.style.display = isPlan ? 'none' : '';
  document.getElementById('nextPicker').parentElement.style.display = isPlan ? 'none' : '';
  document.getElementById('spinsSelect').parentElement.style.display = isPlan ? '' : 'none';
  document.getElementById('solveBtn').classList.toggle('active', !isPlan);
  document.getElementById('planBtn').classList.toggle('active', isPlan);
}

const MOVE_LABEL = {
  hold: 'ホールド',
  moveLeft: '←',
  moveRight: '→',
  rotateCW: '⟳CW',
  rotateCCW: '⟲CCW',
  rotate180: '⟳180',
  softDrop: 'ソニックドロップ',
  hardDrop: 'ハードドロップ',
};

function renderResults() {
  const el = document.getElementById('results');
  el.innerHTML = '';
  document.getElementById('resultCount').textContent = candidates.length
    ? `(${candidates.length}件)` : '';

  if (!candidates.length) {
    el.innerHTML = '<div class="status">条件を満たす手順は見つかりませんでした。</div>';
    clearPreview();
    return;
  }

  candidates.forEach((c, i) => {
    const div = document.createElement('div');
    div.className = 'result-item' + (i === activeIndex ? ' active' : '');

    if (resultsMode === 'plan') {
      const stepsHtml = c.plan.map((step, si) => {
        const holdText = step.usedHold ? '(hold)' : '';
        const tag = step.isSpin ? ` — ${step.label}` : '';
        return `${si + 1}. ${step.piece}${holdText}: ${step.moves.map((m) => MOVE_LABEL[m] || m).join(' → ')}${tag}`;
      }).join('<br/>');
      div.innerHTML = `
        <div class="label"><span class="rank">#${c.rank != null ? c.rank : i + 1}</span> ${c.label} <span style="color:var(--muted);font-weight:400">— ${c.piecesUsed}ミノ / ${c.totalMoves}手${c.spinCount > 1 ? ` / ${c.spinCount}スピン` : ''}</span>${c.fallback ? '<br/><small style="color:#fbbf24">※ 連続2回スピンの手順が見つからず、1回スピンを表示しています</small>' : ''}</div>
        <div class="moves">${stepsHtml}</div>
      `;
    } else {
      const holdText = c.usedHold ? '(ホールド使用) ' : '';
      div.innerHTML = `
        <div class="label">${c.label} <span style="color:var(--muted);font-weight:400">— ${c.piece}ミノ</span></div>
        <div class="sub">${holdText}手数: ${c.moves.length}手</div>
        <div class="moves">${c.moves.map((m) => MOVE_LABEL[m] || m).join(' → ')}</div>
      `;
    }

    div.addEventListener('click', () => { activeIndex = i; renderResults(); showPreview(c); });
    el.appendChild(div);
  });

  if (activeIndex === -1) {
    activeIndex = 0;
    showPreview(candidates[0]);
  }
}

function clearPreview() {
  drawBoard(pctx, previewCanvas, board);
  document.getElementById('previewInfo').textContent = '';
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let animToken = 0;

// プレビュー描画専用の簡易物理: サーバーから受け取った軌跡(path)と設置後盤面(after)を
// そのまま再生するだけなので、キックテーブル等の重複実装は不要。
function spawnXClient(piece) {
  const shape = SHAPES[piece]['0'];
  return Math.floor((WIDTH - shape[0].length) / 2);
}

function pieceCells(piece, rot, x, y) {
  const shape = SHAPES[piece][rot];
  const cells = [];
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) cells.push([x + c, y + r]);
    }
  }
  return cells;
}

// 実際にブロックを積んでいく様子をアニメーションで再生する。
// アニメーション中にエラーが起きても必ず最終盤面と情報表示に到達させる(try/finally)。
async function playPreview(candidate) {
  const token = ++animToken;
  const infoEl = document.getElementById('previewInfo');
  const drawPiece = (b, piece, pt, color) => {
    drawBoard(pctx, previewCanvas, b, pieceCells(piece, pt.rot, pt.x, pt.y), color);
  };
  const spawnOf = (piece) => ({ x: spawnXClient(piece), y: 0, rot: '0' });
  const isPlan = resultsMode === 'plan';
  const finalText = () => isPlan
    ? `${candidate.label}\n使用ミノ数: ${candidate.piecesUsed} / 合計手数: ${candidate.totalMoves}${candidate.spinCount > 1 ? ` / ${candidate.spinCount}スピン` : ''}`
    : `${candidate.label}\n消去ライン数: ${candidate.linesCleared}\n手順: ${candidate.moves.join(' → ')}`;

  try {
    let b = board.map((row) => row.slice());

    if (isPlan) {
      for (const step of candidate.plan) {
        if (token !== animToken) return;
        if (step.usedHold) {
          drawBoard(pctx, previewCanvas, b);
          infoEl.textContent = `${step.piece} をホールド → スワップ`;
          await sleep(300);
        }
        const pts = [spawnOf(step.piece), ...step.path];
        for (const pt of pts) {
          if (token !== animToken) return;
          drawPiece(b, step.piece, pt, '#7c8cffcc');
          infoEl.textContent = `${step.piece}: ${step.moves.join(' → ')}`;
          await sleep(120);
        }
        if (token !== animToken) return;
        b = step.after;
        drawBoard(pctx, previewCanvas, b);
        infoEl.textContent = `${step.piece} ${step.label || '(積み込み)'}`;
        await sleep(330);
      }
    } else {
      if (candidate.usedHold) {
        drawBoard(pctx, previewCanvas, b);
        infoEl.textContent = `ホールド → ${candidate.piece}`;
        await sleep(300);
      }
      const pts = [spawnOf(candidate.piece), ...(candidate.path || [])];
      for (const pt of pts) {
        if (token !== animToken) return;
        drawPiece(b, candidate.piece, pt, '#7c8cffcc');
        infoEl.textContent = candidate.moves.join(' → ');
        await sleep(110);
      }
      if (token !== animToken) return;
      b = candidate.after || b;
    }

    if (token !== animToken) return;
    drawBoard(pctx, previewCanvas, b);
    infoEl.textContent = finalText();
  } catch (err) {
    // アニメーションが途中で失敗しても、最後に盤面と情報を描画して「何も表示されない」を防ぐ。
    if (token !== animToken) return;
    drawBoard(pctx, previewCanvas, board);
    infoEl.textContent = `プレビュー描画エラー: ${err.message}`;
  }
}

function showPreview(candidate) {
  playPreview(candidate);
}

// サーバー側の形状定義と同じものをここでも簡易的に持つ (プレビュー描画専用)
const SHAPES = {
  I: { 0: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], R: [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]], 2: [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]], L: [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]] },
  O: { 0: [[0,1,1],[0,1,1],[0,0,0]], R: [[0,1,1],[0,1,1],[0,0,0]], 2: [[0,1,1],[0,1,1],[0,0,0]], L: [[0,1,1],[0,1,1],[0,0,0]] },
  T: { 0: [[0,1,0],[1,1,1],[0,0,0]], R: [[0,1,0],[0,1,1],[0,1,0]], 2: [[0,0,0],[1,1,1],[0,1,0]], L: [[0,1,0],[1,1,0],[0,1,0]] },
  S: { 0: [[0,1,1],[1,1,0],[0,0,0]], R: [[0,1,0],[0,1,1],[0,0,1]], 2: [[0,0,0],[0,1,1],[1,1,0]], L: [[1,0,0],[1,1,0],[0,1,0]] },
  Z: { 0: [[1,1,0],[0,1,1],[0,0,0]], R: [[0,0,1],[0,1,1],[0,1,0]], 2: [[0,0,0],[1,1,0],[0,1,1]], L: [[0,1,0],[1,1,0],[1,0,0]] },
  J: { 0: [[1,0,0],[1,1,1],[0,0,0]], R: [[0,1,1],[0,1,0],[0,1,0]], 2: [[0,0,0],[1,1,1],[0,0,1]], L: [[0,1,0],[0,1,0],[1,1,0]] },
  L: { 0: [[0,0,1],[1,1,1],[0,0,0]], R: [[0,1,0],[0,1,0],[0,1,1]], 2: [[0,0,0],[1,1,1],[1,0,0]], L: [[1,1,0],[0,1,0],[0,1,0]] },
};

async function solve() {
  const statusEl = document.getElementById('status');
  statusEl.textContent = '探索中...';
  activeIndex = -1;
  spins = parseInt(document.getElementById('spinsSelect').value, 10) || 1;
  try {
    const res = await fetch('/api/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        board,
        // プランモードでは current / next のピッカーを非表示にしているため、
        // 開始ミノを固定せず7種すべてからスピン地形を探す(API利用者は明示的にcurrentを渡せる)。
        current: resultsMode === 'single' ? current : null,
        next: resultsMode === 'single' ? [nextPiece] : [],
        hold,
        mode: resultsMode,
        options: { spins },
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    candidates = resultsMode === 'plan' ? (data.plans || []) : (data.candidates || []);
    statusEl.textContent = `完了: ${candidates.length}件の候補が見つかりました`;
    renderResults();
  } catch (err) {
    statusEl.textContent = 'エラー: ' + err.message;
    candidates = [];
    renderResults();
  }
}

document.getElementById('solveBtn').addEventListener('click', () => { setMode('single'); solve(); });
document.getElementById('planBtn').addEventListener('click', () => { setMode('plan'); solve(); });

refreshPickers();
setMode('single');
renderBoard();
clearPreview();