# tetris-spin-solver

テトリスの盤面を入力与え、**スピン(T-Spin / All-Spin)でライン消去できる最短手順**を探索する Node.js ライブラリです。

- **1手探索** (`findSpinSetups`) — 現在のミノ(＋ホールド)で今すぐスピンできる手順を BFS 全探索
- **複数手探索** (`findSpinPlan`) — 積み込みを挟んで最大7〜12ミノでスピン成立まで持っていく手順をビームサーチ
- SRS 準拠の 90° ウォールキック、180° 回転に対応
- Tミノは「3コーナールール＋壁押し地面ルール」で T-Spin / T-Spin Mini を判定
- T以外のミノ(S/Z/J/L)は「イミューン(不動)判定」によるオールスピン判定
- ホールド / ネクスト / 7-bag ランダム生成に対応

---

## インストール

```bash
npm install
```

外部依存ゼロ (Node.js 標準機能のみ)。

## テスト

```bash
npm test
```

`node:test` ベース。追加の依存なし。

## Webデモ

```bash
npm run demo
# → http://localhost:3131 をブラウザで開く
```

盤面をクリックで編集 → 現在ミノ・ホールド・ネクストを選択 → 探索ボタンで結果を Canvas でプレビュー。
**実践モード** (ユーザー vs Bot) も同居しています。

---

## モジュール構成

```
src/
├── index.js        パブリック API エントリポイント
├── constants.js    ミノの形状・回転・SRS キックテーブル
├── board.js        盤面のクローン・衝突判定・配置・ライン消去
├── spinDetect.js   スピン判定エンジン (T-Spin 3コーナー / All-Spin イミューン)
├── solver.js       BFS 探索 + 評価
├── planner.js      ビームサーチによる複数手スピン計画
├── bag.js          7-bag ランダム生成器
└── heuristics.js   盤面評価・スコアリング
```

---

## パブリック API

```js
const {
  findSpinSetups,
  findSpinPlan,
  replayTrajectory,
  allPlacements,
  generateBagQueue,
  PIECE_TYPES,
} = require('./src/index');
```

### `findSpinSetups(board, current, next, hold, options?)`

**1手でスピンできる手順**を全探索します。ホールドを使う/使わない両方のパターンを試します。

**引数:**

| 引数 | 型 | 必須 | 説明 |
|---|---|---|---|
| `board` | `number[][]` | ○ | 盤面 (0=空、1以上=ブロック)。`board[0]` が最上段 |
| `current` | `string` | ○ | 現在のミノ `'I'\|'O'\|'T'\|'S'\|'Z'\|'J'\|'L'` |
| `next` | `string[]` | ○ | ネクスト列 (`next[0]` のみ使用。空配列可) |
| `hold` | `string\|null` | ○ | ホールド中のミノ、無ければ `null` |
| `options.limit` | `number` | - | 返す候補数の上限 (既定 20) |

**戻り値:** `moves.length` 昇順ソートされた候補配列。各要素:

```js
{
  piece: 'T',                  // 使用したミノ
  x: 3, y: 17, rot: 'R',      // 設置座標・回転状態
  moves: ['rotateCW', 'hardDrop'], // 操作列
  linesCleared: 2,             // 消去行数
  isSpin: true,                // スピンかどうか
  spinPiece: 'T',              // スピン判定に使ったミノ (T/S/Z/J/L または null)
  mini: false,                 // T-Spin Mini かどうか
  label: 'T-Spin Double',      // 表示用ラベル
  resultBoard: [...],          // 消去後の盤面
  usedHold: false,             // ホールドを使ったかどうか
  path: [{x, y, rot}, ...],   // 移動軌跡 (プレビューアニメ用)
  after: [...]                 // resultBoard と同じ
}
```

**操作列 (`moves`) の語彙:**

| 値 | 意味 |
|---|---|
| `'hold'` | ホールド入力 (current と swap) |
| `'moveLeft'` | 左移動 (1マス) |
| `'moveRight'` | 右移動 (1マス) |
| `'rotateCW'` | 右回転 (90°) |
| `'rotateCCW'` | 左回転 (90°) |
| `'rotate180'` | 180° 回転 |
| `'softDrop'` | ソニックドロップ (接地するまで一気に落下) |
| `'hardDrop'` | ハードドロップ (設置・ロック) |

> **注意:** `softDrop` は1入力で盤面の底まで落ちるソニックドロップです。段階的な落下ではありません。
> スピン判定は「直前の操作が回転」かどうかで決まるため、`rotate → softDrop → hardDrop` はスピンになりますが、
> `rotate → moveLeft → hardDrop` はスピンになりません (`lastWasRotate` が水平移動でリセットされるため)。

---

### `findSpinPlan(board, options?)`

**空の盤面(またはスピン地形の無い盤面)から、積み込みを挟んでスピン成立まで持っていく手順**をビームサーチで探索します。

**引数:**

| 引数 | 型 | 既定値 | 説明 |
|---|---|---|---|
| `board` | `number[][]` | - | 探索開始時の盤面 |
| `options.maxPieces` | `number` | `7` | 積み込み+スピンの最大ミノ数 |
| `options.beamWidth` | `number` | `30` | ビームサーチの幅 |
| `options.hold` | `string\|null` | `null` | 開始時のホールド |
| `options.limit` | `number\|null` | `null` | 返す件数上限 (null=全件) |
| `options.rng` | `function` | `Math.random` | 7-bag 補完用乱数 (テスト時は差し替え可) |
| `options.current` | `string\|null` | `null` | 最初のミノを固定 (null=7種すべて試す) |
| `options.next` | `string[]\|null` | `null` | 実際のネクスト列 (null=7-bag 自動生成) |
| `options.diversify` | `boolean` | `false` | 各スピンタイプから1件ずつ最良を返す |
| `options.spins` | `number` | `1` | 連続スピン数 (1 または 2) |
| `options.attempts` | `number` | `1` | ネクスト未指定時に bag を再生成する回数 |
| `options.maxSpinPieces` | `number` | `12` | スピン清 KeyValue-based spin attempt cutoff |

**戻り値:** ランク付き候補配列。各要素:

```js
{
  startPiece: 'L',            // 最初の1手として仮定したミノ
  piecesUsed: 4,              // 使用ミノ数 (積み込み+スピン)
  totalMoves: 9,              // 全操作数
  plan: [Step, ...],          // 手順配列 (下記参照)
  finalBoard: [...],          // 最終盤面
  label: 'T-Spin Double',     // スピンラベル (2連続時は "→" で結合)
  linesCleared: 2,            // 消去行数合計
  spinPiece: 'T',             // スピンミノ
  spinCount: 1,               // スピン回数
  rank: 1                     // 順位 (1起算)
}
```

**各 `Step` の構造:**

```js
{
  piece: 'T',                 // この手で置くミノ
  usedHold: false,            // ホールドを使ったか
  moves: ['rotateCW', 'hardDrop'],
  x: 3, y: 17, rot: 'R',     // 設置座標・回転
  isSpin: true,               // この手がスピンかどうか
  spinPiece: 'T',
  label: 'T-Spin Double',     // null (積み込み) or スピンラベル
  linesCleared: 2,
  path: [{x, y, rot}, ...],  // 移動軌跡
  after: [...]                // この手後の盤面
}
```

**例:**

```js
const { findSpinPlan } = require('./src/index');

const empty = Array.from({ length: 20 }, () => new Array(10).fill(0));
const plans = findSpinPlan(empty, {
  maxPieces: 7,
  beamWidth: 30,
  diversify: true,
  limit: 5,
});

plans.forEach((p, i) => {
  console.log(`#${i+1} [${p.startPiece}] ${p.label} (${p.piecesUsed}m ${p.totalMoves}move)`);
});
```

**2連続スピン:**

```js
const plans = findSpinPlan(empty, { spins: 2, maxPieces: 12 });
// label: "T-Spin Mini Single → S-Spin Double"
```

---

### `replayTrajectory(board, pieceType, moves)`

操作列から各中間位置を再現します。プレビューアニメーション用です。

```js
const path = replayTrajectory(board, 'T', ['rotateCW', 'hardDrop']);
// [{x: 3, y: 0, rot: '0'}, {x: 3, y: 1, rot: 'R'}, {x: 3, y: 17, rot: 'R'}]
```

`hold` と最終 `hardDrop` はスキップされます。

---

### `allPlacements(board, pieceType)`

スピンに限らず、そのミノを置ける**全設置パターン**を返すデバッグ用関数です。

```js
const all = allPlacements(board, 'T');
// [{ piece: 'T', x, y, rot, moves, linesCleared, isSpin, label, resultBoard }, ...]
```

---

### `generateBagQueue(count, rng?)`

7-bag 方式で `count` 個のミノ列を生成します。

```js
const queue = generateBagQueue(14);
// ['S', 'I', 'Z', 'L', 'T', 'O', 'J', 'T', 'S', 'I', 'Z', 'L', 'O', 'J']
```

`rng` に関数を渡すと差し替え可能 (デフォルトは `Math.random`)。

---

### `PIECE_TYPES`

```js
// ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
```

---

## スピン判定ルール

### T-Spin / T-Spin Mini (3コーナールール)

Tミノ設置時に**ピボット (T字の中心)** の4対角のうち **3つ以上がブロック(または壁)で埋まっている** 場合、スピンと判定します。

**Mini 判定:** T字の前面2コーナーのうち片方のみ埋まっている場合、Mini と判定します。
ただし SRS キック番号4 (最後のキック) でスピン成立した場合は Mini が Regular に昇格します。

**壁押し地面ルール (Wall-Push Ground Rule):**
Tが壁に押し付けられてスピンを成立させる場合、盤面外のコーナーを「埋まった」とカウントすると
実際の盤面状態と乖離してしまうため、以下の追加条件があります:

1. Tの4コーナーのうち盤面外のコーナーを使用している
2. その盤面外コーナーを除いた有効コーナー数が **2以下** である
3. その場合、Tミノの **最下行の直下3マス** がすべてブロックで埋まっている必要がある
4. 地面が3未満の場合 → **スピン不成立** (非スピン)

```
壁際設置:          地面判定 (最下行下3マス):
■ □ ■             □ → ブロック
■ T ■             ■ □ ■
□ □ □             □ □ □
                  ↑ 下3マス (左・中央・右)
```

### All-Spin (S/Z/J/L イミューン判定)

T以外のミノで、**最終回転後にミノを1マス上に動かすことができない(盤面上に固定されている)** 場合、
スピンと判定します。「オーバーハングの下に挟まって動けない」状態です。

Mini は常に `false` です。

### 180° 回転

180° 回転にも対応していますが、**キックはなし** (`[[0,0]]` のみ) です。
180° 回転でスピンが成立するケースは、すでに3コーナー/イミューン状態で回転できる場所に
配置している場合のみです。

---

## ヘューリスティクス (`heuristics.js`)

ビームサーチの評価で使用される盤面分析関数群です。

### `analyzeBoard(board)`

```js
{
  heights: [0, 0, 5, 5, 4, ...],  // 列ごとの高さ (上から)
  holes: 3,                        // ブロックの下に空きがある数
  bumpiness: 12,                   // 隣接列の高さ差の合計
  aggregateHeight: 45,             // 全列の高さ合計
  maxHeight: 8                     // 最高列の高さ
}
```

### `scoreBoard(board)`

穴・凹凸・高さから盤面の清潔さをスコアリング (負の値、大きいほど良い)。

```
-(holes × 2.5 + bumpiness × 1.2 + aggregateHeight × 0.4 + maxHeight × 0.2)
```

### `spinPotentialScore(board)`

スピンの受け皿になりそうな地形にボーナス:
- 1列幅のくぼみ (+1/個、深さ1〜3)
- 2列幅のくぼみ (+1.5/個、深さ2〜4)
- オーバーハング (+0.5/個、最大4)

合計は最大10。

### `scoreBoardForSpinBuilding(board)`

`scoreBoard() × 10 + spinPotentialScore()` — プランナー用の総合スコア。

---

## サーバー API

`npm run demo` で起動 (port 3131)。

### `POST /api/solve`

スピン探索 (single / plan モード)。

**single モード (1手探索):**

```json
// Request
{
  "board": [[0,1,...], ...],
  "current": "T",
  "next": ["I", "S"],
  "hold": "Z",
  "options": { "limit": 20 },
  "mode": "single"
}

// Response
{
  "candidates": [
    {
      "piece": "T", "x": 3, "y": 17, "rot": "R",
      "moves": ["rotateCW", "hardDrop"],
      "linesCleared": 2,
      "isSpin": true, "spinPiece": "T", "mini": false,
      "label": "T-Spin Double",
      "usedHold": false,
      "path": [...],
      "after": [...]
    }
  ]
}
```

**plan モード (複数手探索):**

```json
// Request
{
  "board": [[0,0,...], ...],
  "next": [],
  "hold": null,
  "mode": "plan",
  "options": {
    "maxPieces": 7,
    "beamWidth": 30,
    "spins": 1,
    "diversify": true,
    "attempts": 2,
    "limit": 10
  }
}

// Response
{
  "plans": [
    {
      "startPiece": "L",
      "piecesUsed": 4,
      "totalMoves": 9,
      "plan": [ { "piece": "L", "moves": [...], "isSpin": false, ... }, ... ],
      "finalBoard": [...],
      "label": "T-Spin Mini Single",
      "linesCleared": 1,
      "spinPiece": "T",
      "spinCount": 1,
      "rank": 1
    }
  ]
}
```

### `POST /api/bot`

実践モードの Bot AI 用エンドポイント。

```json
// Request
{
  "board": [[0,1,...], ...],
  "current": "T",
  "next": ["I","S","Z","J","L","O","T"],
  "hold": "J"
}

// Response (spin)
{
  "type": "spin",
  "spinCount": 2,
  "label": "T-Spin Mini Single → S-Spin Double",
  "steps": [
    { "piece": "T", "usedHold": false, "x": 3, "y": 17, "rot": "R",
      "moves": ["rotateCW", "hardDrop"], "isSpin": true,
      "label": "T-Spin Mini Single", "linesCleared": 1 },
    { "piece": "S", "usedHold": true, ... }
  ]
}

// Response (stack / dig)
{
  "type": "stack",
  "piece": "T",
  "usedHold": false,
  "x": 3, "y": 17, "rot": "R",
  "moves": ["hardDrop"],
  "label": "Single",
  "linesCleared": 1
}
```

**Bot 判定ロジック:**
1. 盤面の占有率が高い (stackTop ≤ 10) → **dig** (消去優先)
2. 2連続スピンを試行 → 1スピンを試行 → **stack** (清潔な積み込み)

### `GET /api/pieces`

```json
{ "pieces": ["I", "O", "T", "S", "Z", "J", "L"] }
```

---

## プログラムでの使い方例

```js
const { findSpinSetups, findSpinPlan, replayTrajectory, allPlacements, generateBagQueue, PIECE_TYPES } = require('./src/index');

// ─── 1手探索: Tミノで今すぐスピンできるか ───
const board = [
  [0,0,0,0,0,0,0,0,0,0],
  // ... (省略)
  [1,1,1,1,0,1,1,1,1,1],
  [1,1,1,0,0,0,1,1,1,1],
  [1,1,1,1,0,1,1,1,1,1],
];

const results = findSpinSetups(board, 'T', ['I', 'S'], null);
// results[0].label === 'T-Spin Double'

// ─── 複数手探索: 積み込みからスピンまで ───
const empty = Array.from({ length: 20 }, () => new Array(10).fill(0));
const plans = findSpinPlan(empty, {
  maxPieces: 7,
  beamWidth: 30,
  diversify: true,
});
// plans[0].label === 'T-Spin Double', plans[0].startPiece === 'L' etc.

// ─── 2連続スピン ───
const doublePlans = findSpinPlan(empty, {
  spins: 2,
  maxPieces: 12,
});
// doublePlans[0].label === 'T-Spin Mini Single → S-Spin Double'

// ─── プレビュー用に軌跡を取得 ───
const path = replayTrajectory(board, 'T', results[0].moves);

// ─── デバッグ: 全配置パターン ───
const all = allPlacements(board, 'T');

// ─── 7-bag でミノ列を生成 ───
const queue = generateBagQueue(14);
```

---

## 実装上の注意・制限

- **ボード幅は任意**ですが、SRS キックテーブルは公式ガイドライン準拠の JLSTZ/I 用テーブルを使用しています。
- **180° 回転のキックはなし** (`[[0,0]]` のみ)。TETR.IO (SRS+) のキックテーブルは意図的に未採用です。
- `softDrop` はソニックドロップ (接地まで一気に落下) です。段階的な落下ではありません。
- `findSpinSetups` は**1手先のみ**を対象とします。2手先以降は `findSpinPlan` を使用してください。
- `findSpinPlan` のネクスト列は、`next` 引数未指定時は常に 7-bag のランダム生成で補完されます。
- Bot AI (`/api/bot`) の実行速度はサーバー負荷に依存します。クライアントは `await sleep()` で間隔を空けてください。
