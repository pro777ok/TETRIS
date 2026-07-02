/* =========================================================================
 * ALL-SPIN TETRIS BOT for the custom `decide(state)` API
 * ------------------------------------------------------------------------
 * Features
 *  - Full SRS shape + kick tables for all 7 pieces
 *  - True BFS over (row, col, rotation) game-states (move L/R, soft-drop,
 *    rotate CW/CCW w/ kicks) to find every physically reachable resting
 *    placement, including slots that require a spin to reach.
 *  - Spin classification:
 *      T-piece  -> proper 3-corner rule (full T-spin vs T-spin mini)
 *      S/Z/L/J/I-> "wasKicked" rule (last move was a rotation that
 *                  needed a non-zero kick offset to land) -> counts as
 *                  S-spin / Z-spin / L-spin / J-spin / I-spin
 *  - Terrain shaping: rewards building/maintaining a single clean
 *    overhang "spin pocket" (esp. one that matches the upcoming piece),
 *    while keeping the rest of the board flat and hole-free.
 *  - Hold logic, 2-ply lookahead (current piece + next piece), combo/
 *    back-to-back awareness, and a "survival mode" that forces a line
 *    clear when the stack gets dangerously tall.
 * ========================================================================= */

// ---------------------------------------------------------------------
// 1. SRS shapes: for each piece, 4 rotation states (0=spawn,1=R,2=180,3=L)
//    given as [row,col] offsets inside a bounding box (3x3, 4x4 for I/O).
// ---------------------------------------------------------------------
const SHAPES = {
  T: [
    [[0,1],[1,0],[1,1],[1,2]],
    [[0,1],[1,1],[1,2],[2,1]],
    [[1,0],[1,1],[1,2],[2,1]],
    [[0,1],[1,0],[1,1],[2,1]],
  ],
  S: [
    [[0,1],[0,2],[1,0],[1,1]],
    [[0,1],[1,1],[1,2],[2,2]],
    [[1,1],[1,2],[2,0],[2,1]],
    [[0,0],[1,0],[1,1],[2,1]],
  ],
  Z: [
    [[0,0],[0,1],[1,1],[1,2]],
    [[0,2],[1,1],[1,2],[2,1]],
    [[1,0],[1,1],[2,1],[2,2]],
    [[0,1],[1,0],[1,1],[2,0]],
  ],
  J: [
    [[0,0],[1,0],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[2,1]],
    [[1,0],[1,1],[1,2],[2,2]],
    [[0,1],[1,1],[2,0],[2,1]],
  ],
  L: [
    [[0,2],[1,0],[1,1],[1,2]],
    [[0,1],[1,1],[2,1],[2,2]],
    [[1,0],[1,1],[1,2],[2,0]],
    [[0,0],[0,1],[1,1],[2,1]],
  ],
  I: [
    [[1,0],[1,1],[1,2],[1,3]],
    [[0,2],[1,2],[2,2],[3,2]],
    [[2,0],[2,1],[2,2],[2,3]],
    [[0,1],[1,1],[2,1],[3,1]],
  ],
  O: [
    [[0,1],[0,2],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[1,2]],
  ],
};

// ---------------------------------------------------------------------
// 2. SRS kick tables. Values are [x,y] with y positive = "up" (official
//    guideline convention). We convert to board coords with
//    newCol = col + x ; newRow = row - y.
// ---------------------------------------------------------------------
const JLSTZ_KICKS = {
  "0-1": [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  "1-0": [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  "1-2": [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  "2-1": [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  "2-3": [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  "3-2": [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  "3-0": [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  "0-3": [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
};
const I_KICKS = {
  "0-1": [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
  "1-0": [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
  "1-2": [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
  "2-1": [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
  "2-3": [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
  "3-2": [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
  "3-0": [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
  "0-3": [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
};
const O_KICKS = {
  "0-1": [[0,0]], "1-0": [[0,0]], "1-2": [[0,0]], "2-1": [[0,0]],
  "2-3": [[0,0]], "3-2": [[0,0]], "3-0": [[0,0]], "0-3": [[0,0]],
};
function kicksFor(type) {
  if (type === "I") return I_KICKS;
  if (type === "O") return O_KICKS;
  return JLSTZ_KICKS;
}

// ---------------------------------------------------------------------
// 3. Basic board helpers
// ---------------------------------------------------------------------
function cellsAt(type, rot, row, col) {
  return SHAPES[type][rot].map(([r, c]) => [row + r, col + c]);
}
function collides(board, cells, rows, cols) {
  for (const [r, c] of cells) {
    if (c < 0 || c >= cols || r >= rows) return true;
    if (r < 0) continue; // above the visible board = open space
    if (board[r][c] !== 0) return true;
  }
  return false;
}
function cloneBoard(board) {
  return board.map((row) => row.slice());
}
function lockAndClear(board, type, cells, rows, cols) {
  const nb = cloneBoard(board);
  for (const [r, c] of cells) {
    if (r >= 0 && r < rows) nb[r][c] = type;
  }
  let cleared = 0;
  const kept = nb.filter((row) => {
    const full = row.every((v) => v !== 0);
    if (full) cleared++;
    return !full;
  });
  while (kept.length < rows) kept.unshift(new Array(cols).fill(0));
  return { board: kept, cleared };
}

// ---------------------------------------------------------------------
// 4. BFS over reachable (row,col,rot) states for one piece, tracking
//    whether the *last* successful move was a rotation and whether it
//    needed a non-zero kick offset (-> wasKicked).
// ---------------------------------------------------------------------
function bfsPlacements(board, type, spawn, rows, cols) {
  const key = (r, c, rot) => `${r},${c},${rot}`;
  const start = { r: spawn.row, c: spawn.col, rot: spawn.rot, lastRotKicked: false, lastWasRotate: false };
  if (collides(board, cellsAt(type, start.rot, start.r, start.c), rows, cols)) {
    return []; // spawn already blocked
  }
  const seen = new Map();
  seen.set(key(start.r, start.c, start.rot), start);
  const queue = [start];
  const results = new Map(); // locked placements, keyed by r,c,rot

  while (queue.length) {
    const cur = queue.shift();
    const { r, c, rot } = cur;

    // can it move down?
    const downCells = cellsAt(type, rot, r + 1, c);
    const downBlocked = collides(board, downCells, rows, cols);
    if (downBlocked) {
      // this is a resting/locked position candidate
      const leftBlocked = collides(board, cellsAt(type, rot, r, c - 1), rows, cols);
      const rightBlocked = collides(board, cellsAt(type, rot, r, c + 1), rows, cols);
      const immobile = leftBlocked && rightBlocked;
      const spinFlag = cur.lastWasRotate && (type === "T" ? true : cur.lastRotKicked);
      const rk = key(r, c, rot);
      const prev = results.get(rk);
      if (!prev || (spinFlag && !prev.spinFlag)) {
        results.set(rk, { row: r, col: c, rot, spinFlag, immobile, cells: cellsAt(type, rot, r, c) });
      }
    } else {
      const nr = r + 1;
      const k = key(nr, c, rot);
      if (!seen.has(k)) {
        const st = { r: nr, c, rot, lastRotKicked: false, lastWasRotate: false };
        seen.set(k, st);
        queue.push(st);
      }
    }

    // move left / right
    for (const dc of [-1, 1]) {
      const nc = c + dc;
      if (!collides(board, cellsAt(type, rot, r, nc), rows, cols)) {
        const k = key(r, nc, rot);
        if (!seen.has(k)) {
          const st = { r, c: nc, rot, lastRotKicked: false, lastWasRotate: false };
          seen.set(k, st);
          queue.push(st);
        }
      }
    }

    // rotate CW / CCW with kicks
    for (const dir of [1, -1]) {
      const nrot = (rot + dir + 4) % 4;
      const table = kicksFor(type);
      const tests = table[`${rot}-${nrot}`] || [[0, 0]];
      for (let i = 0; i < tests.length; i++) {
        const [dx, dy] = tests[i];
        const nc = c + dx;
        const nr = r - dy;
        if (!collides(board, cellsAt(type, nrot, nr, nc), rows, cols)) {
          const k = key(nr, nc, nrot);
          const kicked = i > 0;
          const existing = seen.get(k);
          if (!existing) {
            const st = { r: nr, c: nc, rot: nrot, lastRotKicked: kicked, lastWasRotate: true };
            seen.set(k, st);
            queue.push(st);
          }
          break; // first valid kick test wins (matches SRS behaviour)
        }
      }
    }
  }
  return Array.from(results.values());
}

// T-spin proper 3-corner rule (overrides generic spin flag for T)
function classifyTSpin(board, rot, row, col, rows, cols) {
  // corners of the 3x3 box around the T piece's center cell
  const centerR = row + 1, centerC = col + 1;
  const corners = [
    [centerR - 1, centerC - 1], [centerR - 1, centerC + 1],
    [centerR + 1, centerC - 1], [centerR + 1, centerC + 1],
  ];
  const filled = corners.map(([r, c]) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return true; // wall/floor counts as filled
    return board[r][c] !== 0;
  });
  const filledCount = filled.filter(Boolean).length;
  if (filledCount < 3) return "none";
  // "front" corners depend on rotation (the two corners on the pointed side)
  const frontPairs = { 0: [0, 1], 1: [1, 3], 2: [2, 3], 3: [0, 2] };
  const [f1, f2] = frontPairs[rot];
  const frontFilled = (filled[f1] ? 1 : 0) + (filled[f2] ? 1 : 0);
  return frontFilled === 2 ? "full" : "mini";
}

// ---------------------------------------------------------------------
// 5. Board evaluation heuristics
// ---------------------------------------------------------------------
function columnHeights(board, rows, cols) {
  const h = new Array(cols).fill(0);
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (board[r][c] !== 0) { h[c] = rows - r; break; }
    }
  }
  return h;
}
function countHoles(board, rows, cols) {
  let holes = 0;
  for (let c = 0; c < cols; c++) {
    let seenBlock = false;
    for (let r = 0; r < rows; r++) {
      if (board[r][c] !== 0) seenBlock = true;
      else if (seenBlock) holes++;
    }
  }
  return holes;
}
// detect a clean 1-wide overhang "spin pocket": empty column flanked by
// walls/columns at least 2 higher on both sides, at the very top of the gap.
function spinPocketBonus(board, rows, cols, wantType) {
  const h = columnHeights(board, rows, cols);
  let bonus = 0;
  for (let c = 0; c < cols; c++) {
    const leftH = c === 0 ? rows : h[c - 1];
    const rightH = c === cols - 1 ? rows : h[c + 1];
    const overhangL = leftH - h[c];
    const overhangR = rightH - h[c];
    if (overhangL >= 2 && overhangR >= 2) {
      bonus += 40;
      if (wantType === "T" || wantType === "S" || wantType === "Z" ||
          wantType === "J" || wantType === "L" || wantType === "I") {
        bonus += 25; // matches an upcoming spin-capable piece
      }
    }
  }
  return bonus;
}
function bumpiness(h) {
  let b = 0;
  for (let i = 0; i < h.length - 1; i++) b += Math.abs(h[i] - h[i + 1]);
  return b;
}

function evaluate(board, rows, cols, cleared, spinKind, comboState, b2b, nextType) {
  const h = columnHeights(board, rows, cols);
  const maxH = Math.max(...h);
  const holes = countHoles(board, rows, cols);
  const bump = bumpiness(h);
  const aggH = h.reduce((a, b2) => a + b2, 0);

  let score = 0;
  score -= aggH * 0.9;
  score -= holes * 42;
  score -= bump * 2.2;
  score -= maxH * maxH * 0.35; // quadratic danger near the top

  // line-clear rewards
  if (cleared > 0) {
    const isSpin = spinKind !== "none";
    const spinMult = spinKind === "full" ? 1.0 : spinKind === "mini" ? 0.55 : 1.0;
    const base = { 1: 100, 2: 260, 3: 550, 4: 1100 }[cleared] || 0;
    score += base;
    if (isSpin) score += (900 + cleared * 900) * spinMult; // big all-spin bonus
    if (cleared === 4) score += 400; // tetris bonus (keeps b2b)
    if (b2b && (cleared === 4 || isSpin)) score += 500; // extends b2b
    if (comboState > 0) score += 60 * Math.min(comboState, 12);
    if (!isSpin && cleared < 4 && b2b) score -= 250; // breaks b2b, penalize unless survival forces it
  } else {
    score += spinPocketBonus(board, rows, cols, nextType);
  }
  return score;
}

// ---------------------------------------------------------------------
// 6. Generate scored candidate placements for a given piece on a board
// ---------------------------------------------------------------------
function candidatesFor(board, type, spawn, rows, cols, comboState, b2b, nextType) {
  const placements = bfsPlacements(board, type, spawn, rows, cols);
  const out = [];
  for (const p of placements) {
    const { board: nb, cleared } = lockAndClear(board, type, p.cells, rows, cols);
    let spinKind = "none";
    if (p.spinFlag) {
      if (type === "T") spinKind = classifyTSpin(board, p.rot, p.row, p.col, rows, cols);
      else spinKind = p.immobile ? "full" : "mini";
    }
    const score = evaluate(nb, rows, cols, cleared, cleared > 0 ? spinKind : "none", comboState, b2b, nextType);
    out.push({ x: p.col, rotation: p.rot, cleared, spinKind, score, board: nb });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

// default spawn guess if state.currentPiece doesn't give one directly
function defaultSpawn(type, cols) {
  const box = type === "I" || type === "O" ? 4 : 3;
  const col = Math.floor((cols - box) / 2);
  return { row: 0, col, rot: 0 };
}

// ---------------------------------------------------------------------
// 7. Main decision function
// ---------------------------------------------------------------------
function decide(state) {
  try {
    const board = state.board;
    const rows = board.length;
    const cols = state.cols || board[0].length;
    const combo = state.combo || 0;
    const ren = state.ren || 0;
    const b2b = !!state.b2b;
    const comboState = Math.max(combo, ren);

    const curType = state.currentPiece.type;
    const holdType = state.holdPiece ? state.holdPiece.type : null;
    const queue = state.nextQueue || [];
    const nextAfterNoHold = queue[0] ? queue[0].type : null;
    const nextAfterHold = holdType ? (queue[0] ? queue[0].type : null) : (queue[1] ? queue[1].type : null);

    const curSpawn = {
      row: (state.currentPiece.y != null ? state.currentPiece.y : 0),
      col: (state.currentPiece.x != null ? state.currentPiece.x : defaultSpawn(curType, cols).col),
      rot: state.currentPiece.rotation || 0,
    };

    // survival check: is the stack near the top?
    const h = columnHeights(board, rows, cols);
    const maxH = Math.max(...h);
    const danger = maxH >= rows - 4;

    function bestFor(type, spawn, nType) {
      const list = candidatesFor(board, type, spawn, rows, cols, comboState, b2b, nType);
      if (!list.length) return null;
      if (danger) {
        const clearing = list.filter((c) => c.cleared > 0);
        if (clearing.length) return clearing[0];
      }
      return list[0];
    }

    // --- Option A: play current piece, no hold ---
    const noHoldTop = candidatesFor(board, curType, curSpawn, rows, cols, comboState, b2b, nextAfterNoHold);
    let bestA = null, bestAScore = -Infinity;
    const BEAM = 6;
    for (const cand of noHoldTop.slice(0, BEAM)) {
      let total = cand.score;
      if (nextAfterNoHold) {
        const follow = bestFor(nextAfterNoHold, defaultSpawn(nextAfterNoHold, cols), null);
        if (follow) total += follow.score * 0.5;
      }
      if (total > bestAScore) { bestAScore = total; bestA = cand; }
    }
    if (!bestA && noHoldTop.length) bestA = noHoldTop[0], bestAScore = bestA.score;

    // --- Option B: use hold ---
    let bestB = null, bestBScore = -Infinity;
    const pieceIfHold = holdType || nextAfterNoHold;
    if (pieceIfHold) {
      const spawnB = defaultSpawn(pieceIfHold, cols);
      const holdTop = candidatesFor(board, pieceIfHold, spawnB, rows, cols, comboState, b2b, nextAfterHold);
      for (const cand of holdTop.slice(0, BEAM)) {
        let total = cand.score;
        if (nextAfterHold) {
          const follow = bestFor(nextAfterHold, defaultSpawn(nextAfterHold, cols), null);
          if (follow) total += follow.score * 0.5;
        }
        if (total > bestBScore) { bestBScore = total; bestB = cand; }
      }
    }

    // small bias toward not holding needlessly (avoid hold-thrash)
    if (bestB && bestBScore > bestAScore + 15) {
      return { x: bestB.x, rotation: bestB.rotation, useHold: true };
    }
    if (bestA) {
      return { x: bestA.x, rotation: bestA.rotation, useHold: false };
    }
    // total fallback
    return { x: curSpawn.col, rotation: 0, useHold: false };
  } catch (e) {
    // never crash the bot loop
    return { x: state.currentPiece.x || 0, rotation: 0, useHold: false };
  }
}
