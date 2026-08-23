'use strict';

const { SHAPES, getKicks, getKicks180, cwOf, ccwOf, oppositeOf, spawnX } = require('./constants');
const { canPlace, placeShape, clearLines } = require('./board');
const { detectSpinAndClear, LINE_NAMES } = require('./spinDetect');

/**
 * 指定したミノについて、その盤面上で到達可能な全ての (x,y,rot) を
 * 最短手数(BFS)で探索し、接地している全状態を「設置候補」として返す。
 */
function searchPlacements(board, pieceType) {
  const width = board[0].length;
  const startX = spawnX(pieceType, width);
  const startY = 0;
  const startShape = SHAPES[pieceType]['0'];

  if (!canPlace(board, startShape, startX, startY)) {
    return []; // 出現不可 (ゲームオーバー相当)
  }

  const startKey = `${startX},${startY},0,0`;
  const visited = new Map();
  visited.set(startKey, { x: startX, y: startY, rot: '0', lastWasRotate: false, kickIndex: -1, moves: [] });
  const queue = [startKey];

  while (queue.length) {
    const key = queue.shift();
    const state = visited.get(key);
    const { x, y, rot, moves } = state;
    const shape = SHAPES[pieceType][rot];

    const tryAdd = (nx, ny, nrot, lastWasRotate, kickIndex, moveName) => {
      if (ny < 0) return; // 盤面の上端より上には出ない(天井)。無ければ180°キック等で無限に上昇できてしまう。
      const nKey = `${nx},${ny},${nrot},${lastWasRotate ? 1 : 0}`;
      if (visited.has(nKey)) return;
      const nShape = SHAPES[pieceType][nrot];
      if (!canPlace(board, nShape, nx, ny)) return;
      visited.set(nKey, {
        x: nx, y: ny, rot: nrot, lastWasRotate, kickIndex,
        moves: moves.concat(moveName),
      });
      queue.push(nKey);
    };

    // 左右移動
    tryAdd(x - 1, y, rot, false, -1, 'moveLeft');
    tryAdd(x + 1, y, rot, false, -1, 'moveRight');

    // ソニックドロップ (床 or 障害物にぶつかるまで一気に落とす。1入力扱い)
    // 落下は重力であり「左右操作」ではないため、回転フラグは引き継ぐ。
    // (回転してから落ちて接地してもスピンとみなす。逆に回転後に左右へ動かすと
    //  フラグがクリアされ、スピンではなくなる。)
    {
      let ny = y;
      while (canPlace(board, shape, x, ny + 1)) ny++;
      if (ny !== y) tryAdd(x, ny, rot, state.lastWasRotate, state.kickIndex, 'softDrop');
    }

    // 回転 (CW / CCW)。SRSキックを順に試し、最初に成功したものを採用。
    const tryRotate = (toRot, moveName) => {
      const kicks = getKicks(pieceType, rot, toRot);
      for (let i = 0; i < kicks.length; i++) {
        const [dx, dy] = kicks[i];
        const nx = x + dx;
        const ny = y + dy;
        const nShape = SHAPES[pieceType][toRot];
        if (canPlace(board, nShape, nx, ny)) {
          tryAdd(nx, ny, toRot, true, i, moveName);
          return; // 最初に成立したキックのみ採用
        }
      }
    };
    tryRotate(cwOf(rot), 'rotateCW');
    tryRotate(ccwOf(rot), 'rotateCCW');

    // 180°回転。TETR.IO式のキックを順に試し、最初に成立したものを採用。
    // kickIndex は90°回転のMini昇格判定(kickIndex === 4)にのみ使うため、
    // 180°回転では -1 を渡してMini昇格を無効にする。
    {
      const toRot = oppositeOf(rot);
      const kicks = getKicks180(pieceType, rot);
      for (let i = 0; i < kicks.length; i++) {
        const [dx, dy] = kicks[i];
        const nx = x + dx;
        const ny = y + dy;
        const nShape = SHAPES[pieceType][toRot];
        if (canPlace(board, nShape, nx, ny)) {
          tryAdd(nx, ny, toRot, true, -1, 'rotate180');
          break; // 最初に成立したキックのみ採用
        }
      }
    }
  }

  // 接地している状態のみを設置候補として抽出
  const results = [];
  for (const state of visited.values()) {
    const shape = SHAPES[pieceType][state.rot];
    const grounded = !canPlace(board, shape, state.x, state.y + 1);
    if (grounded) results.push(state);
  }
  return results;
}

/**
 * 1つの設置候補を実際に盤面へ置き、ライン消去・スピン判定を行う。
 */
function evaluatePlacement(board, pieceType, state) {
  const shape = SHAPES[pieceType][state.rot];
  const { spinType, mini } = detectSpinAndClear(
    board, pieceType, shape, state.x, state.y, state.rot,
    state.lastWasRotate, state.kickIndex
  );
  const placed = placeShape(board, shape, state.x, state.y);
  const { board: clearedBoard, cleared } = clearLines(placed);

  let label = null;
  if (spinType && cleared > 0) {
    const spinName = spinType === 'T' ? 'T-Spin' : `${spinType}-Spin`;
    const miniSuffix = mini ? ' Mini' : '';
    label = `${spinName}${miniSuffix} ${LINE_NAMES[cleared]}`;
  }

  return {
    piece: pieceType,
    x: state.x,
    y: state.y,
    rot: state.rot,
    moves: state.moves.concat('hardDrop'),
    linesCleared: cleared,
    isSpin: !!spinType,
    spinPiece: spinType,
    mini: !!mini,
    label,
    resultBoard: clearedBoard,
  };
}

module.exports = { searchPlacements, evaluatePlacement };
