'use strict';

// 各列の一番高いブロックの高さ、穴の数、凹凸(隣接列の高低差合計)を計算する。
function analyzeBoard(board) {
  const height = board.length;
  const width = board[0].length;
  const heights = new Array(width).fill(0);
  let holes = 0;

  for (let x = 0; x < width; x++) {
    let topFound = false;
    for (let y = 0; y < height; y++) {
      const filled = !!board[y][x];
      if (filled && !topFound) {
        heights[x] = height - y;
        topFound = true;
      } else if (!filled && topFound) {
        holes++;
      }
    }
  }

  let bumpiness = 0;
  for (let x = 0; x < width - 1; x++) {
    bumpiness += Math.abs(heights[x] - heights[x + 1]);
  }

  const aggregateHeight = heights.reduce((a, b) => a + b, 0);
  const maxHeight = Math.max(...heights);

  return { heights, holes, bumpiness, aggregateHeight, maxHeight };
}

// 上にブロックがあり、その真下が空いているセル(オーバーハング)の数。
// スピンの土台(オーバーハングの下に置いたミノが刺さる)になりうる形を数える。
function countOverhangs(board) {
  const height = board.length;
  const width = board[0].length;
  let count = 0;
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height - 1; y++) {
      if (board[y][x] && !board[y + 1][x]) count++;
    }
  }
  return count;
}

// 隣接列より低い(=T/S/Z/J/Lスピンの受け皿になりやすい)地形を数える。
// 1列のくぼみ(Tスピン用)に加え、2列のくぼみ(S/Z/J/Lスピン用)・オーバーハングも評価する。
// 深くなりすぎた穴は評価しない(単なる深掘りとスピン向けのくぼみを区別するため)。
function spinPotentialScore(board) {
  const { heights } = analyzeBoard(board);
  const width = heights.length;
  let bonus = 0;
  // 1列のくぼみ (Tスピンの受け皿)
  for (let x = 0; x < width; x++) {
    const left = x > 0 ? heights[x - 1] : heights[x];
    const right = x < width - 1 ? heights[x + 1] : heights[x];
    const depth = Math.min(left, right) - heights[x];
    if (depth >= 1 && depth <= 3) bonus += 1;
  }
  // 2列のくぼみ (S/Z/J/Lスピンの受け皿: 左右の壁が高い2マス幅の溝)
  for (let x = 0; x < width - 1; x++) {
    const wallL = x > 0 ? heights[x - 1] : heights[x];
    const wallR = x < width - 2 ? heights[x + 2] : heights[x + 1];
    const floor = Math.max(heights[x], heights[x + 1]);
    const depth = Math.min(wallL, wallR) - floor;
    if (depth >= 2 && depth <= 4) bonus += 1.5;
  }
  return Math.min(bonus, 8) + Math.min(countOverhangs(board), 4) * 0.5;
}

// 高いほど「積み上げの土台として良い」盤面。ビームサーチの枝刈りに使う。
// 穴を最も重く減点し、次いで凹凸・積み上げ高さを減点する。
function scoreBoard(board) {
  const { holes, bumpiness, aggregateHeight, maxHeight } = analyzeBoard(board);
  // holesの重みを強くしすぎると「スピンの下地となるオーバーハング(意図的な穴)」を
  // 作る手を全部枝刈りしてしまうため、ある程度は許容する重みにしている。
  return -(holes * 2.5 + bumpiness * 1.2 + aggregateHeight * 0.4 + maxHeight * 0.2);
}

// findSpinPlan(積み込みでスピン地形を作る探索)専用のスコア。
// 並び順の主軸はあくまで通常のscoreBoard(荒れすぎた盤面で探索が破綻しないように大きく重み付け)。
// その上でスピンの受け皿になりそうな地形(小さなくぼみ・オーバーハング)にごく小さな
// ボーナスを足すことで、スコアがほぼ同着の盤面同士の中からスピン向けの形を優先的に残す
// (タイブレーク的に働かせることで、探索の安定性を壊さずに「意図的にスピン地形を作る」方向へ誘導する)。
function scoreBoardForSpinBuilding(board) {
  return scoreBoard(board) * 10 + spinPotentialScore(board);
}

module.exports = {
  analyzeBoard, scoreBoard, countOverhangs, spinPotentialScore, scoreBoardForSpinBuilding,
};