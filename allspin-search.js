'use strict';

// ── constants ─────────────────────────────────────────────────────
const ROTATIONS = ['0', 'R', '2', 'L'];
function cwOf(rot) { return ROTATIONS[(ROTATIONS.indexOf(rot) + 1) % 4]; }
function ccwOf(rot) { return ROTATIONS[(ROTATIONS.indexOf(rot) + 3) % 4]; }
function oppositeOf(rot) { return ROTATIONS[(ROTATIONS.indexOf(rot) + 2) % 4]; }

const SHAPES = {
  I: { 0:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], R:[[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]], 2:[[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]], L:[[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]] },
  O: { 0:[[0,1,1],[0,1,1],[0,0,0]], R:[[0,1,1],[0,1,1],[0,0,0]], 2:[[0,1,1],[0,1,1],[0,0,0]], L:[[0,1,1],[0,1,1],[0,0,0]] },
  T: { 0:[[0,1,0],[1,1,1],[0,0,0]], R:[[0,1,0],[0,1,1],[0,1,0]], 2:[[0,0,0],[1,1,1],[0,1,0]], L:[[0,1,0],[1,1,0],[0,1,0]] },
  S: { 0:[[0,1,1],[1,1,0],[0,0,0]], R:[[0,1,0],[0,1,1],[0,0,1]], 2:[[0,0,0],[0,1,1],[1,1,0]], L:[[1,0,0],[1,1,0],[0,1,0]] },
  Z: { 0:[[1,1,0],[0,1,1],[0,0,0]], R:[[0,0,1],[0,1,1],[0,1,0]], 2:[[0,0,0],[1,1,0],[0,1,1]], L:[[0,1,0],[1,1,0],[1,0,0]] },
  J: { 0:[[1,0,0],[1,1,1],[0,0,0]], R:[[0,1,1],[0,1,0],[0,1,0]], 2:[[0,0,0],[1,1,1],[0,0,1]], L:[[0,1,0],[0,1,0],[1,1,0]] },
  L: { 0:[[0,0,1],[1,1,1],[0,0,0]], R:[[0,1,0],[0,1,0],[0,1,1]], 2:[[0,0,0],[1,1,1],[1,0,0]], L:[[1,1,0],[0,1,0],[0,1,0]] },
};

const JLSTZ_KICKS = {
  '0>R':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]], 'R>0':[[0,0],[1,0],[1,-1],[0,2],[1,2]],
  'R>2':[[0,0],[1,0],[1,-1],[0,2],[1,2]], '2>R':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '2>L':[[0,0],[1,0],[1,1],[0,-2],[1,-2]], 'L>2':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  'L>0':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]], '0>L':[[0,0],[1,0],[1,1],[0,-2],[1,-2]],
};
const I_KICKS = {
  '0>R':[[0,0],[-2,0],[1,0],[-2,-1],[1,2]], 'R>0':[[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  'R>2':[[0,0],[-1,0],[2,0],[-1,2],[2,-1]], '2>R':[[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '2>L':[[0,0],[2,0],[-1,0],[2,1],[-1,-2]], 'L>2':[[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  'L>0':[[0,0],[1,0],[-2,0],[1,-2],[-2,1]], '0>L':[[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
};
const O_KICKS = { '0>R':[[0,0]],'R>0':[[0,0]],'R>2':[[0,0]],'2>R':[[0,0]],'2>L':[[0,0]],'L>2':[[0,0]],'L>0':[[0,0]],'0>L':[[0,0]] };
const KICKLESS180 = [[0,0]];
function getKicks180() { return KICKLESS180; }
function getKicks(pieceType, fromRot, toRot) {
  const key = `${fromRot}>${toRot}`;
  if (pieceType === 'I') return I_KICKS[key];
  if (pieceType === 'O') return O_KICKS[key];
  return JLSTZ_KICKS[key];
}
function spawnX(pieceType, boardWidth) {
  const w = SHAPES[pieceType]['0'][0].length;
  return Math.floor((boardWidth - w) / 2);
}
const PIECE_TYPES = Object.keys(SHAPES);

// ── board ─────────────────────────────────────────────────────────
function cloneBoard(board) { return board.map(r => r.slice()); }
function isCellFilled(board, x, y) {
  if (x < 0 || x >= board[0].length) return true;
  if (y >= board.length) return true;
  if (y < 0) return false;
  return !!board[y][x];
}
function canPlace(board, shape, x, y) {
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      if (isCellFilled(board, x + c, y + r)) return false;
    }
  return true;
}
function placeShape(board, shape, x, y) {
  const b = cloneBoard(board);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const by = y + r, bx = x + c;
      if (by >= 0 && by < b.length) b[by][bx] = 1;
    }
  return b;
}
function clearLines(board) {
  const width = board[0].length;
  const remaining = board.filter(row => row.some(c => !c));
  const cleared = board.length - remaining.length;
  const newRows = Array.from({ length: cleared }, () => new Array(width).fill(0));
  return { board: newRows.concat(remaining), cleared };
}

// ── spinDetect ────────────────────────────────────────────────────
const CORNERS = [[-1,-1],[1,-1],[-1,1],[1,1]];
const FRONT_CORNERS = { 0:[[-1,-1],[1,-1]], R:[[1,-1],[1,1]], 2:[[-1,1],[1,1]], L:[[-1,-1],[-1,1]] };
function detectSpinAndClear(board, pieceType, shape, x, y, rot, lastWasRotate, kickIndex) {
  if (!lastWasRotate) return { spinType: null, mini: false };
  if (pieceType === 'O') return { spinType: null, mini: false };
  if (pieceType === 'T') {
    const pivotX = x + 1, pivotY = y + 1;
    let filledCount = 0;
    for (const [dx, dy] of CORNERS)
      if (isCellFilled(board, pivotX + dx, pivotY + dy)) filledCount++;
    if (filledCount < 3) return { spinType: null, mini: false };
    let mini = false;
    const front = FRONT_CORNERS[rot];
    const frontFilled = front.filter(([dx, dy]) => isCellFilled(board, pivotX + dx, pivotY + dy)).length;
    mini = frontFilled < 2;
    if (mini && kickIndex === 4) mini = false;
    if (mini) {
      const width = board[0].length;
      const touchesWall = shape.some((row, r) => row.some((c, cc) => c && (x + cc === 0 || x + cc === width - 1)));
      const usesWallCorner = CORNERS.some(([dx, dy]) => {
        const cx = pivotX + dx, cy = pivotY + dy;
        return cx < 0 || cx >= width || cy >= board.length;
      });
      if (touchesWall && usesWallCorner) {
        const bottomRow = shape.reduce((acc, row, r) => (row.some(Boolean) ? Math.max(acc, y + r) : acc), -1);
        let ground = 0;
        for (let c = 0; c < shape[bottomRow - y].length; c++)
          if (isCellFilled(board, x + c, bottomRow + 1)) ground++;
        if (ground < 3) return { spinType: null, mini: false };
      }
    }
    return { spinType: 'T', mini };
  }
  if (canPlace(board, shape, x, y - 1)) return { spinType: null, mini: false };
  return { spinType: pieceType, mini: false };
}

// ── solver ────────────────────────────────────────────────────────
function searchPlacements(board, pieceType) {
  const width = board[0].length;
  const startX = spawnX(pieceType, width);
  const startKey = `${startX},0,0,0`;
  const visited = new Map();
  visited.set(startKey, { x: startX, y: 0, rot: '0', lastWasRotate: false, kickIndex: -1, moves: [] });
  const queue = [startKey];
  while (queue.length) {
    const key = queue.shift();
    const state = visited.get(key);
    const { x, y, rot, moves } = state;
    const shape = SHAPES[pieceType][rot];
    const tryAdd = (nx, ny, nrot, lastWasRotate, kickIndex, moveName) => {
      if (ny < 0) return;
      const nKey = `${nx},${ny},${nrot},${lastWasRotate ? 1 : 0}`;
      if (visited.has(nKey)) return;
      if (!canPlace(board, SHAPES[pieceType][nrot], nx, ny)) return;
      visited.set(nKey, { x: nx, y: ny, rot: nrot, lastWasRotate, kickIndex, moves: moves.concat(moveName) });
      queue.push(nKey);
    };
    tryAdd(x - 1, y, rot, false, -1, 'moveLeft');
    tryAdd(x + 1, y, rot, false, -1, 'moveRight');
    { let ny = y; while (canPlace(board, shape, x, ny + 1)) ny++;
      if (ny !== y) tryAdd(x, ny, rot, state.lastWasRotate, state.kickIndex, 'softDrop'); }
    const tryRotate = (toRot, moveName) => {
      const kicks = getKicks(pieceType, rot, toRot);
      for (let i = 0; i < kicks.length; i++) {
        const [dx, dy] = kicks[i];
        if (canPlace(board, SHAPES[pieceType][toRot], x + dx, y + dy)) {
          tryAdd(x + dx, y + dy, toRot, true, i, moveName);
          return;
        }
      }
    };
    tryRotate(cwOf(rot), 'rotateCW');
    tryRotate(ccwOf(rot), 'rotateCCW');
    { const toRot = oppositeOf(rot);
      const kicks = getKicks180(pieceType, rot);
      for (let i = 0; i < kicks.length; i++) {
        const [dx, dy] = kicks[i];
        if (canPlace(board, SHAPES[pieceType][toRot], x + dx, y + dy)) {
          tryAdd(x + dx, y + dy, toRot, true, -1, 'rotate180');
          break;
        }
      }
    }
  }
  const results = [];
  for (const state of visited.values()) {
    const shape = SHAPES[pieceType][state.rot];
    if (!canPlace(board, shape, state.x, state.y + 1)) results.push(state);
  }
  return results;
}

function evaluatePlacement(board, pieceType, state) {
  const shape = SHAPES[pieceType][state.rot];
  const { spinType, mini } = detectSpinAndClear(board, pieceType, shape, state.x, state.y, state.rot, state.lastWasRotate, state.kickIndex);
  const placed = placeShape(board, shape, state.x, state.y);
  const { board: clearedBoard, cleared } = clearLines(placed);
  let label = null;
  if (spinType && cleared > 0) {
    const spinName = spinType === 'T' ? 'T-Spin' : `${spinType}-Spin`;
    label = `${spinName}${mini ? ' Mini' : ''} ${['','Single','Double','Triple','Tetris'][cleared] || ''}`;
  }
  return { piece: pieceType, x: state.x, y: state.y, rot: state.rot,
    moves: state.moves.concat('hardDrop'), linesCleared: cleared,
    isSpin: !!spinType, spinPiece: spinType, mini: !!mini, label, resultBoard: clearedBoard };
}

// ── heuristics ────────────────────────────────────────────────────
function analyzeBoard(board) {
  const height = board.length, width = board[0].length;
  const heights = new Array(width).fill(0);
  let holes = 0;
  for (let x = 0; x < width; x++) {
    let topFound = false;
    for (let y = 0; y < height; y++) {
      const filled = !!board[y][x];
      if (filled && !topFound) { heights[x] = height - y; topFound = true; }
      else if (!filled && topFound) holes++;
    }
  }
  let bumpiness = 0;
  for (let x = 0; x < width - 1; x++) bumpiness += Math.abs(heights[x] - heights[x + 1]);
  return { heights, holes, bumpiness, aggregateHeight: heights.reduce((a, b) => a + b, 0), maxHeight: Math.max(...heights) };
}
function scoreBoard(board) {
  const { holes, bumpiness, aggregateHeight, maxHeight } = analyzeBoard(board);
  return -(holes * 2.5 + bumpiness * 1.2 + aggregateHeight * 0.4 + maxHeight * 0.2);
}

// ── bag ───────────────────────────────────────────────────────────
function generateBagQueue(count, rng = Math.random) {
  const out = [];
  while (out.length < count) {
    const a = [...PIECE_TYPES];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    out.push(...a);
  }
  return out.slice(0, count);
}

// ── planner (searchFromQueue + findSpinPlan) ──────────────────────
function stepOptions(fullQueue, idx, hold) {
  const options = [];
  const piece0 = fullQueue[idx];
  if (!piece0) return options;
  options.push({ usedHold: false, piece: piece0, newIdx: idx + 1, newHold: hold });
  if (hold === null) {
    const drawn = fullQueue[idx + 1];
    if (drawn) options.push({ usedHold: true, piece: drawn, newIdx: idx + 2, newHold: piece0 });
  } else {
    options.push({ usedHold: true, piece: hold, newIdx: idx + 1, newHold: piece0 });
  }
  return options;
}

function searchFromQueue(board, queue, hold, maxPieces, beamWidth, targetSpins, deadline) {
  let frontier = [{ board, hold, idx: 0, path: [], spinCount: 0 }];
  const results = [];
  for (let ply = 1; ply <= maxPieces && frontier.length; ply++) {
    if (deadline && Date.now() > deadline) break;
    const nextFrontier = [];
    for (const node of frontier) {
      const stepOpts = stepOptions(queue, node.idx, node.hold);
      for (const opt of stepOpts) {
        const placements = searchPlacements(node.board, opt.piece);
        for (const state of placements) {
          const evaluated = evaluatePlacement(node.board, opt.piece, state);
          const moves = opt.usedHold ? ['hold', ...evaluated.moves] : evaluated.moves;
          const record = { piece: opt.piece, usedHold: opt.usedHold, moves, x: evaluated.x, y: evaluated.y, rot: evaluated.rot,
            label: evaluated.label, linesCleared: evaluated.linesCleared, isSpin: evaluated.isSpin, spinPiece: evaluated.spinPiece, after: evaluated.resultBoard };
          const newPath = node.path.concat(record);
          const newSpinCount = node.spinCount + (record.isSpin && record.linesCleared > 0 ? 1 : 0);
          if (record.isSpin && record.linesCleared > 0) {
            if (newSpinCount >= targetSpins) {
              const spins = newPath.filter(r => r.isSpin && r.linesCleared > 0);
              results.push({ piecesUsed: newPath.length, totalMoves: newPath.reduce((s, r) => s + r.moves.length, 0),
                plan: newPath, finalBoard: evaluated.resultBoard,
                label: spins.length > 1 ? spins.map(r => r.label).join(' → ') : evaluated.label,
                linesCleared: spins.reduce((s, r) => s + r.linesCleared, 0), spinPiece: spins[0].spinPiece, spinCount: newSpinCount });
            } else {
              nextFrontier.push({ board: evaluated.resultBoard, hold: opt.newHold, idx: opt.newIdx, path: newPath, spinCount: newSpinCount });
            }
          } else {
            nextFrontier.push({ board: evaluated.resultBoard, hold: opt.newHold, idx: opt.newIdx, path: newPath, spinCount: newSpinCount });
          }
        }
      }
    }
    const scored = nextFrontier.map(node => ({
      node, base: scoreBoard(node.board),
      oneWide: (() => { const { heights } = analyzeBoard(node.board); let s = 0;
        for (let x = 0; x < heights.length; x++) { const l = x > 0 ? heights[x-1] : heights[x]; const r = x < heights.length-1 ? heights[x+1] : heights[x];
          const d = Math.min(l, r) - heights[x]; if (d >= 1 && d <= 3) s++; } return s; })(),
      twoWide: (() => { const { heights } = analyzeBoard(node.board); let s = 0;
        for (let x = 0; x < heights.length-1; x++) { const wL = x > 0 ? heights[x-1] : heights[x]; const wR = x < heights.length-2 ? heights[x+2] : heights[x+1];
          const fl = Math.max(heights[x], heights[x+1]); const d = Math.min(wL, wR) - fl; if (d >= 2 && d <= 4) s += 1.5; } return s; })(),
    }));
    const third = Math.max(1, Math.floor(beamWidth / 3));
    const pool = new Map();
    const pick = (arr, count) => { for (const s of arr) { if (pool.size >= beamWidth) break; if (!pool.has(s.node)) { pool.set(s.node, true); count--; if (count <= 0) break; } } };
    const byScore = (a, b) => b.base - a.base;
    pick(scored.filter(s => s.node.spinCount > 0).sort(byScore), beamWidth);
    pick(scored.filter(s => s.node.spinCount === 0).slice().sort(byScore), third);
    pick(scored.filter(s => s.node.spinCount === 0).slice().sort((a, b) => b.oneWide - a.oneWide), third);
    pick(scored.filter(s => s.node.spinCount === 0).slice().sort((a, b) => b.twoWide - a.twoWide), third);
    frontier = [...pool.keys()].slice(0, beamWidth);
  }
  return results;
}

function findSpinPlan(board, options = {}) {
  const { maxPieces = 7, beamWidth = 30, hold = null, limit = null, rng = Math.random,
    current = null, next = null, spins = 1, diversify = false, attempts = 1, timeLimitMs = null } = options;
  const targetSpins = Math.max(1, Math.floor(spins));
  const startPieces = current && PIECE_TYPES.includes(current) ? [current] : PIECE_TYPES;
  const realNext = Array.isArray(next) && next.length;
  const bagCount = realNext ? 1 : Math.max(1, Math.floor(attempts));
  const deadline = timeLimitMs ? Date.now() + timeLimitMs : null;

  const allResults = [];
  for (let attempt = 0; attempt < bagCount; attempt++) {
    if (deadline && Date.now() > deadline) break;
    for (const startPiece of startPieces) {
      if (deadline && Date.now() > deadline) break;
      const queue = [startPiece];
      if (realNext) queue.push(...next);
      queue.push(...generateBagQueue(maxPieces * 2 + 7, rng));
      for (const r of searchFromQueue(board, queue, hold, maxPieces, beamWidth, targetSpins, deadline)) {
        r.startPiece = startPiece;
        allResults.push(r);
      }
    }
  }
  // 順位付け: スピンによる消去を強く評価し、普通の(非スピン)ライン消去を含む手順は
  // より低い順位にする。クリア枚数・盤面評価に加え、非スピン消去枚数×500 を差し引く。
  allResults.sort((a, b) => {
    const rA = analyzeBoard(a.finalBoard), rB = analyzeBoard(b.finalBoard);
    const normalA = a.plan.reduce((s, r) => s + (r.isSpin ? 0 : r.linesCleared), 0);
    const normalB = b.plan.reduce((s, r) => s + (r.isSpin ? 0 : r.linesCleared), 0);
    const rankA = a.linesCleared * 1000 - normalA * 500 - rA.holes * 50 - rA.bumpiness * 5 - rA.maxHeight * 2 - a.totalMoves;
    const rankB = b.linesCleared * 1000 - normalB * 500 - rB.holes * 50 - rB.bumpiness * 5 - rB.maxHeight * 2 - b.totalMoves;
    return rankB - rankA;
  });
  allResults.forEach((r, i) => { r.rank = i + 1; });

  if (limit == null) return allResults;
  if (diversify) {
    const picked = [];
    const seen = new Set();
    for (const r of allResults) {
      if (!seen.has(r.spinPiece)) {
        seen.add(r.spinPiece);
        picked.push(r);
      }
      if (picked.length >= limit) break;
    }
    if (picked.length < limit) {
      for (const r of allResults) {
        if (picked.length >= limit) break;
        if (!picked.includes(r)) picked.push(r);
      }
    }
    return picked;
  }
  return allResults.slice(0, limit);
}

module.exports = { findSpinPlan, searchPlacements, evaluatePlacement, SHAPES, PIECE_TYPES };
