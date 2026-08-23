'use strict';

const { isCellFilled, canPlace } = require('./board');

const LINE_NAMES = { 1: 'Single', 2: 'Double', 3: 'Triple', 4: 'Tetris' };

// 3x3形状におけるpivot(中心マス)からみた4隅のオフセット
const CORNERS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];

// rotごとの「前面」2隅のオフセット。前面 = ミノの出っ張り(先端)が向いている側。
// T以外のミノ(S,Z,J,L)も同じ3x3配置・pivot位置になっているため同じ表を流用できるが、
// Mini判定自体はガイドライン通りTスピンにのみ適用する。
const FRONT_CORNERS = {
  0: [[-1, -1], [1, -1]], // 上向き(尖りが上) -> 前面は上2隅
  R: [[1, -1], [1, 1]],   // 右向き -> 前面は右2隅
  2: [[-1, 1], [1, 1]],   // 下向き -> 前面は下2隅
  L: [[-1, -1], [-1, 1]], // 左向き -> 前面は左2隅
};

/**
 * 設置したミノがスピン(T-Spin / All-Spin)かどうかを判定する。
 *
 * スピンと認定する条件 (ガイドライン準拠):
 *   1. 直前の操作が「回転」であること。左右移動やソフト/ハードドロップだけで接地した
 *      場合は、たとえ盤面の形がスピンっぽく見えてもスピン扱いにしない。
 *   2. Tミノは「3コーナールール」: ピボット(3x3形状の中心マス = ローカル座標(1,1))の
 *      周囲4隅のうち、3つ以上が壁・床・既存ブロックで埋まっていること。
 *   3. T以外(S/Z/J/L/I)は「イミューン(不動)判定」: 回転後に設置したミノが上に1マス
 *      動かせない(オーバーハングに突き刺さっている)こと。
 *      (3コーナールールはT専用。S/Z/J/L/Iに使うと検出漏れが出るため、ガイドライン通り
 *      不動判定を採用している。)
 *   4. O ミノはどの判定も当てはまらないため対象外とする。
 *
 * Mini判定 (Tスピンのみ):
 *   - 前面2隅が両方とも埋まっていれば Regular (通常)
 *   - 前面2隅のうち片方しか埋まっていない(=背面2隅が両方埋まっている)ならMini
 *   - ただし直前の回転で使用したキックがSRSの5番目(0始まりでindex 4、いわゆる
 *     "ズレ" キック)だった場合は、Mini条件を満たしていてもRegularに昇格する
 *     (TSTなどでおなじみの特例ルール)
 * T以外(S,Z,J,L)はガイドライン上Miniの概念が無いため常にmini=falseとする。
 */
function detectSpinAndClear(board, pieceType, shape, x, y, rot, lastWasRotate, kickIndex) {
  if (!lastWasRotate) return { spinType: null, mini: false };
  if (pieceType === 'O') return { spinType: null, mini: false };

  // T のみ 3コーナールール。S/Z/J/L/I は3x3コーナールールが当てはまらないため
  // (S/Zは自ミノが3x3箱の1隅を占める等) 対象にしない。
  if (pieceType === 'T') {
    // T, S, Z, J, L は全て3x3形状で、pivotはローカル座標(1,1)に固定されている前提。
    const pivotX = x + 1;
    const pivotY = y + 1;

    let filledCount = 0;
    for (const [dx, dy] of CORNERS) {
      if (isCellFilled(board, pivotX + dx, pivotY + dy)) filledCount++;
    }
    if (filledCount < 3) return { spinType: null, mini: false };

    let mini = false;
    const front = FRONT_CORNERS[rot];
    const frontFilled = front.filter(([dx, dy]) => isCellFilled(board, pivotX + dx, pivotY + dy)).length;
    mini = frontFilled < 2;
    if (mini && kickIndex === 4) mini = false; // 5番目のキック使用時はRegularに昇格

    // 壁押しT-Spin Miniの実地検証:
    // Tのセルが左右の壁に接し、かつ壁(盤面外)を3コーナールールの「埋まった隅」として
    // 数えている場合、Tが壁に押し当たって接地するにはバーの真下に地面が3ブロック必要。
    // 地面が3ブロック未満だとTが入り込めず押し当てられないため、スピンとして認めない。
    if (mini) {
      const width = board[0].length;
      const touchesWall = shape.some((row, r) =>
        row.some((c, cc) => c && (x + cc === 0 || x + cc === width - 1))
      );
      const usesWallCorner = CORNERS.some(([dx, dy]) => {
        const cx = pivotX + dx;
        const cy = pivotY + dy;
        return cx < 0 || cx >= width || cy >= board.length;
      });
      if (touchesWall && usesWallCorner) {
        const bottomRow = shape.reduce(
          (acc, row, r) => (row.some(Boolean) ? Math.max(acc, y + r) : acc), -1
        );
        let ground = 0;
        for (let c = 0; c < shape[bottomRow - y].length; c++) {
          if (isCellFilled(board, x + c, bottomRow + 1)) ground++;
        }
        if (ground < 3) return { spinType: null, mini: false };
      }
    }

    return { spinType: 'T', mini };
  }

  // イミューン(不動)判定: 上に1マス動かせない = オーバーハングの下に突き刺さっている。
  // 接地している(=下には動かせない)状態を前提に、上方向の動きだけを調べる。
  if (canPlace(board, shape, x, y - 1)) {
    return { spinType: null, mini: false };
  }

  return { spinType: pieceType, mini: false };
}

module.exports = { detectSpinAndClear, LINE_NAMES };
