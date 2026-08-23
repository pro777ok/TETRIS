'use strict';

const { searchPlacements, evaluatePlacement } = require('./solver');
const { generateBagQueue } = require('./bag');
const { scoreBoard, analyzeBoard } = require('./heuristics');
const { PIECE_TYPES, SHAPES, getKicks, getKicks180, cwOf, ccwOf, oppositeOf, spawnX } = require('./constants');
const { canPlace } = require('./board');

/**
 * 現在の手番(idx)における「置けるミノ」の選択肢を返す。
 * ホールドを使わない場合と使う場合(空/交換)を列挙する。
 */
function stepOptions(fullQueue, idx, hold) {
  const options = [];
  const piece0 = fullQueue[idx];
  if (!piece0) return options;

  options.push({ usedHold: false, piece: piece0, newIdx: idx + 1, newHold: hold });

  if (hold === null) {
    const drawn = fullQueue[idx + 1];
    if (drawn) {
      options.push({ usedHold: true, piece: drawn, newIdx: idx + 2, newHold: piece0 });
    }
  } else {
    options.push({ usedHold: true, piece: hold, newIdx: idx + 1, newHold: piece0 });
  }
  return options;
}

/**
 * ミノを1手ずつ動かした軌跡 [{x,y,rot}...] を再現する (プレビューアニメーション用)。
 * moves は 'hold' を含まない(= 実際に盤上を動かす操作のみ)。末尾の 'hardDrop' は
 * 落下して接地する操作なので、軌跡には含めない(接地位置は最後の要素)。
 */
function replayTrajectory(board, pieceType, moves) {
  const width = board[0].length;
  let x = spawnX(pieceType, width);
  let y = 0;
  let rot = '0';
  const path = [];

  const applySoftDrop = () => {
    const shape = SHAPES[pieceType][rot];
    while (canPlace(board, shape, x, y + 1)) y++;
  };

  for (const m of moves) {
    if (m === 'hold') continue;
    if (m === 'moveLeft') x--;
    else if (m === 'moveRight') x++;
    else if (m === 'softDrop') applySoftDrop();
    else if (m === 'hardDrop') { applySoftDrop(); continue; }
    else if (m === 'rotateCW' || m === 'rotateCCW' || m === 'rotate180') {
      const toRot = m === 'rotateCW' ? cwOf(rot) : m === 'rotateCCW' ? ccwOf(rot) : oppositeOf(rot);
      const kicks = m === 'rotate180' ? getKicks180(pieceType, rot) : getKicks(pieceType, rot, toRot);
      for (const [dx, dy] of kicks) {
        if (canPlace(board, SHAPES[pieceType][toRot], x + dx, y + dy)) {
          x += dx; y += dy; rot = toRot;
          break;
        }
      }
    }
    path.push({ x, y, rot });
  }
  return path;
}

/**
 * 特定の1ミノを「最初の手番」に固定した状態から、最大maxPieces個のミノ(積み込み用の
 * 非スピン設置を含む)を使ってスピン成立+ライン消去まで持っていく手順をビームサーチで探す。
 * targetSpins(既定1)を2にすると、1回目のスピン成立後も探索を続け、2回目のスピンまで
 * 成立させるプラン(連続2スピン)も返す。
 * ミノ列(queue)は呼び出し元で用意する。実プレイのネクストがある場合はそれを先頭に詰め、
 * 足りない分は7-bagのランダム生成で補って渡す。
 */
function searchFromQueue(board, queue, hold, maxPieces, beamWidth, targetSpins = 1) {
  let frontier = [{ board, hold, idx: 0, path: [], spinCount: 0 }];
  const results = [];

  for (let ply = 1; ply <= maxPieces && frontier.length; ply++) {
    const nextFrontier = [];

    for (const node of frontier) {
      const stepOpts = stepOptions(queue, node.idx, node.hold);
      for (const opt of stepOpts) {
        const placements = searchPlacements(node.board, opt.piece);
        for (const state of placements) {
          const evaluated = evaluatePlacement(node.board, opt.piece, state);
          const moves = opt.usedHold ? ['hold', ...evaluated.moves] : evaluated.moves;
          const record = {
            piece: opt.piece,
            usedHold: opt.usedHold,
            moves,
            x: evaluated.x,
            y: evaluated.y,
            rot: evaluated.rot,
            label: evaluated.label,
            linesCleared: evaluated.linesCleared,
            isSpin: evaluated.isSpin,
            spinPiece: evaluated.spinPiece,
            path: replayTrajectory(node.board, opt.piece, evaluated.moves),
            after: evaluated.resultBoard,
          };
          const newPath = node.path.concat(record);
          const newSpinCount = node.spinCount + (record.isSpin && record.linesCleared > 0 ? 1 : 0);

          if (record.isSpin && record.linesCleared > 0) {
            if (newSpinCount >= targetSpins) {
              // 目標スピン数に達したのでプランとして確定。連続スピン(2回目以降)の場合は
              // 各スピンのラベルを「→」で連結し、消去ライン数を合計する。
              const spins = newPath.filter((r) => r.isSpin && r.linesCleared > 0);
              const label = spins.length > 1
                ? spins.map((r) => r.label).join(' → ')
                : evaluated.label;
              results.push({
                piecesUsed: newPath.length,
                totalMoves: newPath.reduce((s, r) => s + r.moves.length, 0),
                plan: newPath,
                finalBoard: evaluated.resultBoard,
                label,
                linesCleared: spins.reduce((s, r) => s + r.linesCleared, 0),
                spinPiece: spins[0].spinPiece,
                spinCount: newSpinCount,
              });
            } else {
              // まだ目標スピン数に足りない(1回目のスピン)ので、続けて探索する
              nextFrontier.push({
                board: evaluated.resultBoard,
                hold: opt.newHold,
                idx: opt.newIdx,
                path: newPath,
                spinCount: newSpinCount,
              });
            }
          } else {
            nextFrontier.push({
              board: evaluated.resultBoard,
              hold: opt.newHold,
              idx: opt.newIdx,
              path: newPath,
              spinCount: newSpinCount,
            });
          }
        }
      }
    }

    // 手数が浅い順にスピンを見つけても途中で打ち切らない。
    // (打ち切ると「一番楽なT-Spin Mini Single」ばかりで、S/Z/J/Lスピンや
    //  Double/Tripleまで到達できないため、maxPiecesまで探索を続けて全種を集める。
    //  優先順位付けは findSpinPlan 側のソート(linesCleared降順→手数昇順)で行う。)

    // ビームサーチの枝刈り。スコア計算は盤面ごとに1回だけ行い、それをキャッシュして並べ替える。
    // スピン地形の種類は複数ある(T用の1列ポケット / S・Z・J・L用の2列ポケット+オーバーハング)ため、
    // 単一スコアの上位だけで枝刈りすると「一番作りやすいT-Spin Mini地形」の系統ばかりが残ってしまう。
    // そこで「通常スコア上位」「1列ポケット上位」「2列ポケット上位」の3系統から各beam/3件ずつ残す
    // ポートフォリオ式にすることで、T以外のスピン地形に繋がる系統も枝刈りで消えないようにする。
    const scored = nextFrontier.map((node) => {
      const { heights } = analyzeBoard(node.board);
      return {
        node,
        base: scoreBoard(node.board),
        oneWide: (() => {
          let s = 0;
          for (let x = 0; x < heights.length; x++) {
            const left = x > 0 ? heights[x - 1] : heights[x];
            const right = x < heights.length - 1 ? heights[x + 1] : heights[x];
            const depth = Math.min(left, right) - heights[x];
            if (depth >= 1 && depth <= 3) s += 1;
          }
          return s;
        })(),
        twoWide: (() => {
          let s = 0;
          for (let x = 0; x < heights.length - 1; x++) {
            const wallL = x > 0 ? heights[x - 1] : heights[x];
            const wallR = x < heights.length - 2 ? heights[x + 2] : heights[x + 1];
            const floor = Math.max(heights[x], heights[x + 1]);
            const depth = Math.min(wallL, wallR) - floor;
            if (depth >= 2 && depth <= 4) s += 1.5;
          }
          return s;
        })(),
      };
    });

    const third = Math.max(1, Math.floor(beamWidth / 3));
    const pool = new Map();
    const pick = (key, count) => {
      for (const s of key) {
        if (pool.size >= beamWidth) break;
        if (!pool.has(s.node)) {
          pool.set(s.node, true);
          count--;
          if (count <= 0) break;
        }
      }
    };
    // targetSpins>=2のとき、スピン成立後のノード(spinCount>0)は2回目のスピンに到達できる
    // 唯一の経路なので、通常スコアの順に優先して枝刈りから保護する。残りはポートフォリオ式で埋める。
    const byScore = (a, b) => b.base - a.base;
    const postSpin = scored.filter((s) => s.node.spinCount > 0).sort(byScore);
    const others = scored.filter((s) => s.node.spinCount === 0);
    pick(postSpin, beamWidth);
    pick(others.slice().sort(byScore), third);
    pick(others.slice().sort((a, b) => b.oneWide - a.oneWide), third);
    pick(others.slice().sort((a, b) => b.twoWide - a.twoWide), third);
    frontier = [...pool.keys()].slice(0, beamWidth);
  }

  return results;
}

/**
 * 「現在ミノ」を特定せず、7種のミノそれぞれを最初の手番だと仮定した場合に、
 * 最大maxPieces個のミノでスピンを作れるかを全種類調べ、見つかった候補をすべて返す。
 *
 * @param {number[][]} board
 * @param {object} [options]
 * @param {number} [options.maxPieces=7] 使用する最大ミノ数(積み込み+スピン成立の1手を含む)
 * @param {number} [options.beamWidth=30] ビームサーチの幅
 * @param {string|null} [options.hold=null] 開始時点のホールド
 * @param {number|null} [options.limit=null] 返す候補の最大数(nullなら全件返す)
 * @param {() => number} [options.rng=Math.random] 7-bag補完用の乱数関数
 * @param {string|null} [options.current=null] 現在のミノを固定する場合に指定。
 *        指定すると最初の手番はそのミノだけを仮定する。nullなら7種すべてを試す。
 * @param {string[]|null} [options.next=null] 実際のネクスト列。先頭から順に積み込みで使用する。
 *        足りない分は7-bagで自動補完する。null/空なら全ネクストを7-bagで補う(demo用)。
 * @param {boolean} [options.diversify=false] trueにすると「手数が少ない順」だけでなく、
 *        見つかった各スピン種(T/S/Z/J/L)のベストを必ず1件ずつ含めて最大limit件返す。
 *        片方のスピン種(例: T-Spin Mini Single)に上位が占領されて他種が見えなくなるのを防ぐ。
 * @param {number} [options.attempts=1] 実ネクストを渡していない(demo等)場合に、
 *        7-bagを複数回引き直して探索し、結果を統合する回数。バッグの偏りで特定のスピン種だけ
 *        しか出ないのを防ぐ。実ネクストを指定した場合は常に1回(バッグは固定)。
 * @param {number} [options.spins=1] 1プランに含めるスピン数。1=スピン1回で終了、
 *        2=連続で2回スピンするプランも探索する。2回目以降のスピンはより多くのミノを
 *        必要とするため、必要に応じてmaxPiecesを多めに指定すること。
 * @returns {object[]} 見つかったスピンプラン。各要素にどのミノを最初の手番と仮定したか(startPiece)を含む。
 */
function findSpinPlan(board, options = {}) {
  const {
    maxPieces = 7,
    beamWidth = 30,
    hold = null,
    limit = null,
    rng = Math.random,
    current = null,
    next = null,
    diversify = false,
    attempts = 1,
    spins = 1,
  } = options;

  const targetSpins = Math.max(1, Math.floor(spins));
  const startPieces = current && PIECE_TYPES.includes(current) ? [current] : PIECE_TYPES;
  const realNext = Array.isArray(next) && next.length;
  const bagCount = realNext ? 1 : Math.max(1, Math.floor(attempts));

  const allResults = [];
  for (let attempt = 0; attempt < bagCount; attempt++) {
    for (const startPiece of startPieces) {
      // 実ネクストがあればそれを先頭に詰め、足りない分は7-bagでランダム補完する。
      const queue = [startPiece];
      if (realNext) queue.push(...next);
      queue.push(...generateBagQueue(maxPieces * 2 + 7, rng));

      for (const r of searchFromQueue(board, queue, hold, maxPieces, beamWidth, targetSpins)) {
        r.startPiece = startPiece;
        allResults.push(r);
      }
    }
  }

  // ランキング: 高い順位になりやすいのは
  //   1. 消去ラインが多い (Triple > Double > Single)
  //   2. スピン後の盤面が汚れていない (「1マスだけ空いて周りが囲まれる」ような
  //      孤立した穴・凹凸・高さの凸凹が少ない)
  //   3. 手数が少ない
  const rankPlan = (p) => {
    const { holes, bumpiness, aggregateHeight, maxHeight } = analyzeBoard(p.finalBoard);
    return p.linesCleared * 1000
      - holes * 50          // 囲まれた1マス穴を最重視で減点
      - bumpiness * 5       // 隣接列の高低差
      - maxHeight * 2       // 過度な積み上げ高さ
      - aggregateHeight * 0.2
      - p.totalMoves;       // タイブレーク: 手数が少ない方
  };
  allResults.sort((a, b) => rankPlan(b) - rankPlan(a));
  allResults.forEach((r, i) => { r.rank = i + 1; });

  if (limit == null) return allResults;

  if (diversify) {
    // 各スピン種(T/S/Z/J/L)のベスト1をまず確保し、残りはランキング順で埋める。
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

module.exports = { searchFromQueue, findSpinPlan, replayTrajectory };
