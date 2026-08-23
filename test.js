const TetrisPCFinder = require('./tetris-pc-finder.js');

// 1. 空の盤面（幅10, 高さ4）を作成（0: 空き、1: 埋まり）
const emptyBoard = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

// 2. パラメータの設定
const input = {
  board: emptyBoard,
  queue: ["O", "J", "L", "S", "I", "Z", "T", "T", "O", "L", "I", "Z", "J", "S"],
  hold: null,
  width: 10,
  timeLimitMs: 10000 // 10秒の上限を設定
};

// 3. PC探索の実行
const result = TetrisPCFinder.findPerfectClear(input);

// 4. 結果の表示
if (result.success) {
  console.log("パーフェクトクリアの手順が見つかりました！");
  console.log(`探索ノード数: ${result.nodesUsed}`);
  console.log("--- 手順一覧 ---");
  result.solution.forEach((step, index) => {
    console.log(`Step ${index + 1}: ミノ=${step.piece} | ホールド使用=${step.usedHold} | 回転=${step.rotation}`);
    console.log(`        座標: ${JSON.stringify(step.cells)}`);
  });
} else {
  console.log("パフェの手順が見つかりませんでした:", result.reason);
}