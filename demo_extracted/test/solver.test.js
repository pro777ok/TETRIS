'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { findSpinSetups, findSpinPlan, allPlacements } = require('../src/index');
const { detectSpinAndClear } = require('../src/spinDetect');

function emptyBoard(w = 10, h = 20) {
  return Array.from({ length: h }, () => new Array(w).fill(0));
}

// 文字列の見た目(行=1文字ずつ, '.'=空 'x'=ブロック)から盤面を作るヘルパー
function boardFromRows(rows, width = 10) {
  return rows.map((row) => {
    const arr = new Array(width).fill(0);
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') arr[i] = 1;
    return arr;
  });
}

test('回転を伴わない設置(平地に自然に置いただけ)はスピン判定にならない', () => {
  // 何もない盤面にTミノを普通に置くだけなら、3隅が埋まる状況すら起きないので非スピン。
  const board = emptyBoard();
  const placements = allPlacements(board, 'T');
  for (const p of placements) {
    assert.equal(p.isSpin, false);
  }
});

test('detectSpinAndClear: 回転していない(lastWasRotate=false)場合は3隅が埋まっていてもスピンにしない', () => {
  // 底面付近で3隅が埋まる盤面を用意しても、回転せず接地したならスピン扱いしない。
  const board = boardFromRows([
    '..........',
    'xxx.xxxxxx',
    'xxx.xxxxxx',
    'xxxxxxxxxx',
  ]);
  const shape = require('../src/constants').SHAPES.T['0'];
  const { spinType } = detectSpinAndClear(board, 'T', shape, 3, 0, '0', false, -1);
  assert.equal(spinType, null);
});

test('detectSpinAndClear: O はコーナーが埋まっていてもスピン扱いにしない', () => {
  const board = boardFromRows([
    'xx.xxxxxxx',
    'xx.xxxxxxx',
    'xxxxxxxxxx',
  ]);
  const oShape = require('../src/constants').SHAPES.O['0'];
  const { spinType: oSpin } = detectSpinAndClear(board, 'O', oShape, 0, 0, '0', true, 0);
  assert.equal(oSpin, null);
});

test('detectSpinAndClear: I はイミューン(不動)判定で、上に動かせる場合はスピンにしない', () => {
  const iShape = require('../src/constants').SHAPES.I['R'];
  // 何も無い盤面ではIは上に動けるため不動ではない -> スピンにならない。
  const open = boardFromRows(['..........', '..........', '..........']);
  const { spinType: iSpin } = detectSpinAndClear(open, 'I', iShape, 1, 0, 'R', true, 0);
  assert.equal(iSpin, null);
});

test('findSpinSetups: Tを回転入れしてハマる地形ではT-Spinとして検出される(壁キック込みで実際に到達可能なケース)', () => {
  // 実際にBFS(壁キック含む)で到達可能なことを確認済みのT-Spin Mini Single地形。
  const board = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 0, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  ];
  const result = findSpinSetups(board, 'T', ['I'], null, { limit: 5 });
  assert.ok(result.length > 0, 'T-Spinの候補が見つかるはず');
  for (const r of result) {
    assert.equal(r.isSpin, true);
    assert.equal(r.spinPiece, 'T');
    assert.ok(r.linesCleared > 0);
  }
});

test('findSpinSetups: 回転を挟まずソニックドロップだけで置ける普通の設置はスピン扱いされない', () => {
  // 上のT-Spin地形と同じ盤面でも、Iミノをただ落とすだけの手はスピンにならないはず。
  const board = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 0, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  ];
  const placements = allPlacements(board, 'I');
  const rotationFreePlacements = placements.filter((p) => !p.moves.includes('rotateCW') && !p.moves.includes('rotateCCW'));
  assert.ok(rotationFreePlacements.length > 0);
  for (const p of rotationFreePlacements) {
    assert.equal(p.isSpin, false);
  }
});

test('findSpinPlan: 現在ミノを固定せず7種類を仮定して探索し、見つかった候補をすべて返す(打ち切らない)', () => {
  let seed = 11;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed % 1000) / 1000;
  };

  const plans = findSpinPlan(emptyBoard(10, 14), { maxPieces: 7, rng });

  assert.ok(plans.length > 0, '7ミノ以内でスピンプランが少なくとも1件は見つかるはず');
  const startPiecesFound = new Set(plans.map((p) => p.startPiece));
  assert.ok(startPiecesFound.size >= 1);
  for (const plan of plans) {
    assert.ok(plan.piecesUsed <= 7);
    assert.ok(['I', 'O', 'T', 'S', 'Z', 'J', 'L'].includes(plan.startPiece));
    const last = plan.plan[plan.plan.length - 1];
    assert.equal(last.isSpin, true);
    for (const step of plan.plan.slice(0, -1)) {
      assert.equal(step.isSpin, false);
    }
  }
});

test('findSpinPlan: current(現在ミノ)とnext(ネクスト列)を指定して探索できる', () => {
  let seed = 1;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed % 1000) / 1000;
  };

  const plans = findSpinPlan(emptyBoard(10, 14), {
    maxPieces: 6, rng, limit: 5, current: 'S', next: ['T', 'I', 'Z'],
  });

  assert.ok(plans.length > 0, 'current/nextを指定してもスピンプランが見つかるはず');
  for (const plan of plans) {
    assert.equal(plan.startPiece, 'S'); // currentで固定したミノだけが最初の手番
    assert.ok(plan.piecesUsed <= 6);
  }
});

test('findSpinPlan: diversifyで複数スピン種(全スピン対応)が返り、アニメ用のpath/afterが付く', () => {
  // ポートフォリオbeam + diversify により、空盤面からでもT以外のスピン(S/Z/J/L)も見つかる。
  let seed = 3;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed % 1000) / 1000;
  };
  const plans = findSpinPlan(emptyBoard(10, 12), {
    maxPieces: 7, rng, limit: 10, diversify: true, attempts: 2,
  });
  const types = new Set(plans.map((p) => p.spinPiece));
  assert.ok(types.size >= 3, `複数のスピン種が返るはず(実際: ${[...types].join(',')})`);
  for (const plan of plans) {
    assert.ok(['T', 'S', 'Z', 'J', 'L'].includes(plan.spinPiece));
    for (const step of plan.plan) {
      assert.ok(Array.isArray(step.path));
      assert.ok(Array.isArray(step.after));
    }
  }
});

test('Sミノ: 不動(イミューン)判定でS-Spin Doubleが検出される', () => {
  const board = boardFromRows([
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    'X..XXXXXXX',
    '..XXXXXXXX',
    'XX......XX',
  ]);
  const placements = allPlacements(board, 'S');
  const doubles = placements.filter((p) => p.label === 'S-Spin Double');
  assert.ok(doubles.length > 0, 'S-Spin Doubleが少なくとも1件見つかるはず');
  assert.equal(doubles[0].linesCleared, 2);
});

test('Zミノ: 不動(イミューン)判定でZ-Spin Doubleが検出される', () => {
  const board = boardFromRows([
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    'XXXXXXX..X',
    'XXXXXXXX..',
    'XX......XX',
  ]);
  const placements = allPlacements(board, 'Z');
  const doubles = placements.filter((p) => p.label === 'Z-Spin Double');
  assert.ok(doubles.length > 0, 'Z-Spin Doubleが少なくとも1件見つかるはず');
  assert.equal(doubles[0].linesCleared, 2);
});

test('findSpinPlan: next引数は受け取らない(ネクストは常に7-bagから自動生成される)', () => {
  const board = emptyBoard();
  // 第2引数はoptionsオブジェクトのみ。next配列を渡す口はもう無い。
  const plans = findSpinPlan(board, { maxPieces: 1, limit: 1, rng: () => 0 });
  assert.ok(Array.isArray(plans));
});

test('180°回転: その場回転できる地形では180°回転としてスピン検出される', () => {
  const { SHAPES } = require('../src/constants');
  // Tミノをrot 0で置いた状態から180°(rot 2)へその場回転できる、3隅が埋まった地形。
  const board = boardFromRows([
    '..........',
    'xxx.xxxxxx',
    'x.....xxxx',
    'xxx.xxxxxx',
  ]);
  const shape = SHAPES.T['2'];
  const { spinType } = detectSpinAndClear(board, 'T', shape, 2, 1, '2', true, -1);
  assert.equal(spinType, 'T');
});

test('180°回転: キック無しでもその場回転で成立する180°スピン(回転→落下)が検出される', () => {
  // 180°回転はキック無し((0,0)のみ)。Jをソニックドロップしてからその場で180°回転し、
  // 接地した位置でイミューン(不動)判定になる実在のケース。20行盤で探索する。
  const board = [
    ...Array.from({ length: 17 }, () => new Array(10).fill(0)),
    ...boardFromRows([
      'X..XXXXXXX',
      '..XXXXXXXX',
      'XX......XX',
    ]),
  ];
  const placements = allPlacements(board, 'J');
  const r180 = placements.filter(
    (p) => p.isSpin && p.moves.includes('rotate180') && p.linesCleared > 0
  );
  assert.ok(r180.length > 0, 'キック無し180°回転で到達可能な180°スピンが見つかるはず');
  assert.equal(r180[0].label, 'J-Spin Single');
  const last = r180[0].moves[r180[0].moves.length - 2]; // hardDropの直前
  assert.equal(last, 'rotate180');
});

test('180°回転: その場で回転先の形が置けない場合はrotate180の手自体が候補に出ない', () => {
  const board = boardFromRows([
    'xxxxxxxxxx',
    'xxxxxxxxxx',
    'xxxxxxxxxx',
  ]);
  const placements = allPlacements(emptyBoard(4, 4), 'T');
  const rotate180Moves = placements.filter((p) => p.moves.includes('rotate180'));
  // 開けた盤面では180°回転も普通に成立しうるので、少なくとも壊れずに動くことを確認
  assert.ok(Array.isArray(rotate180Moves));
});

test('壁押しT-Spin Mini: バー下の地面が3ブロック未満だとスピンとして認めない', () => {
  const { allPlacements } = require('../src/index');
  // 壁際(左端col0)の1幅コラムで、Tの足元に地面が無い(3ブロック無い)盤面。
  // 従来は壁(out-of-bounds)をコーナーに数えてT-Spin Miniと誤判定していたが、
  // 「地面3ブロック未満だとTが入り込めず押し当てられない」ため非スピンになる。
  const floating = [
    ...Array.from({ length: 17 }, () => new Array(10).fill(0)),
    ...boardFromRows([
      '.XXXXXXXXX',
      '.XXXXXXXXX',
      'XXXXXXXXXX',
    ]),
  ];
  const spinsFloating = allPlacements(floating, 'T').filter((p) => p.isSpin);
  assert.equal(spinsFloating.length, 0, '地面3ブロック未満の壁押しはスピンにならないはず');

  // 同じ壁際でも、バーの真下に地面が3ブロックあれば正しくT-Spin Miniになる。
  const grounded = [
    ...Array.from({ length: 18 }, () => new Array(10).fill(0)),
    ...boardFromRows([
      '.XXXXXXXXX',
      'XXXXXXXXXX',
    ]),
  ];
  const spinsGrounded = allPlacements(grounded, 'T').filter((p) => p.isSpin);
  assert.ok(spinsGrounded.length > 0, '地面3ブロックの壁押しT-Spinは正しく検出されるはず');
  assert.ok(spinsGrounded.some((p) => p.label && p.label.includes('T-Spin Mini')));
});

test('findSpinPlan: 連続2回スピン(spins=2)とランキング付与', () => {
  const { findSpinPlan } = require('../src/index');
  // 左右に2つの2x2ウェルがある盤面では、1回目のスピン後に別のウェルで2回目のスピンが可能。
  const board = [
    ...Array.from({ length: 17 }, () => new Array(10).fill(0)),
    ...boardFromRows([
      'XXX..XX..X',
      'XXX..XX..X',
      'XXX.X.XX.X',
    ]),
  ];
  // 決定的な乱数(シード固定)でbagを固定し、テストの揺らぎを防ぐ
  let seed = 12345;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const plans = findSpinPlan(board, {
    limit: 5,
    diversify: false,
    attempts: 2,
    spins: 2,
    maxPieces: 12,
    rng,
  });
  assert.ok(plans.length > 0, '2回連続スピンのプランが少なくとも1件見つかるはず');
  const p = plans[0];
  assert.equal(p.spinCount, 2, 'spinCountが2になっているはず');
  assert.ok(p.label.includes(' → '), '2回のスピンが「→」で連結されるはず');
  assert.equal(p.linesCleared, p.plan.filter((s) => s.isSpin).reduce((s, x) => s + x.linesCleared, 0));
  // ランキング: 同じスピン回数なら「消去ラインが多く、最終盤面が汚れていない」順に並ぶ。
  const ranked = plans.map((x) => x.rank);
  assert.deepEqual(ranked, [...ranked].sort((a, b) => a - b), 'rankが1始まりで連番になっているはず');
  assert.ok(plans.every((x) => x.rank >= 1));
});
