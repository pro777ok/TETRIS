'use strict';

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

function isCellFilled(board, x, y) {
  if (x < 0 || x >= board[0].length) return true; // 壁
  if (y >= board.length) return true; // 床
  if (y < 0) return false; // 盤面上部の見えない領域は空とみなす
  return !!board[y][x];
}

// shape(2次元配列) を board 上の (x,y) [左上基準] に置けるか
function canPlace(board, shape, x, y) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const bx = x + c;
      const by = y + r;
      if (isCellFilled(board, bx, by)) return false;
    }
  }
  return true;
}

// 実際にミノを置いた新しい盤面を返す
function placeShape(board, shape, x, y) {
  const b = cloneBoard(board);
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const by = y + r;
      const bx = x + c;
      if (by < 0 || by >= b.length) continue;
      b[by][bx] = 1;
    }
  }
  return b;
}

// 揃った行を消してクリア数を返す
function clearLines(board) {
  const width = board[0].length;
  const remaining = board.filter((row) => row.some((cell) => !cell));
  const cleared = board.length - remaining.length;
  const newRows = [];
  for (let i = 0; i < cleared; i++) newRows.push(new Array(width).fill(0));
  return { board: newRows.concat(remaining), cleared };
}

module.exports = { cloneBoard, isCellFilled, canPlace, placeShape, clearLines };
