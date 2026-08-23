/**
 * tetris-pc-finder.js
 * ------------------------------------------------------------
 * 現在の地形 + Hold + Next(7ミノ等)を入力として、パーフェクトクリア
 * (盤面を完全に空にする)を1手順分だけ探索して返す軽量ライブラリ。
 *
 * - 外部依存なし、単一ファイル (UMD: Node / ブラウザ / bundler どれでも動作)
 * - SRS準拠のミノ形状・キックテーブル
 * - ビットボード + 行マスクによる高速衝突判定
 * - 見つけ次第即座に返す(全解探索はしない = "1つだけ"に最適化)
 * - ノード数上限 / 時間制限をどちらも指定可能(Botのフレーム予算に合わせやすい)
 *
 * 使い方は末尾のコメント、または README 相当の説明を参照。
 * ------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.TetrisPCFinder = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ============================================================
  // 定数・ミノ形状定義 (SRS準拠。座標は (col,row)、rowは下方向が正)
  // ============================================================

  var PIECE_NAMES = ["I", "O", "T", "S", "Z", "J", "L"];
  var ROTATION_ORDER = ["0", "R", "2", "L"];
  var NEXT_CW = { "0": "R", "R": "2", "2": "L", "L": "0" };
  var NEXT_CCW = { "0": "L", "L": "2", "2": "R", "R": "0" };

  var RAW_ROTATIONS = {
    I: {
      "0": [[0, 1], [1, 1], [2, 1], [3, 1]],
      R: [[2, 0], [2, 1], [2, 2], [2, 3]],
      "2": [[0, 2], [1, 2], [2, 2], [3, 2]],
      L: [[1, 0], [1, 1], [1, 2], [1, 3]]
    },
    O: {
      "0": [[1, 0], [2, 0], [1, 1], [2, 1]],
      R: [[1, 0], [2, 0], [1, 1], [2, 1]],
      "2": [[1, 0], [2, 0], [1, 1], [2, 1]],
      L: [[1, 0], [2, 0], [1, 1], [2, 1]]
    },
    T: {
      "0": [[1, 0], [0, 1], [1, 1], [2, 1]],
      R: [[1, 0], [1, 1], [2, 1], [1, 2]],
      "2": [[0, 1], [1, 1], [2, 1], [1, 2]],
      L: [[1, 0], [0, 1], [1, 1], [1, 2]]
    },
    S: {
      "0": [[1, 0], [2, 0], [0, 1], [1, 1]],
      R: [[1, 0], [1, 1], [2, 1], [2, 2]],
      "2": [[1, 1], [2, 1], [0, 2], [1, 2]],
      L: [[0, 0], [0, 1], [1, 1], [1, 2]]
    },
    Z: {
      "0": [[0, 0], [1, 0], [1, 1], [2, 1]],
      R: [[2, 0], [1, 1], [2, 1], [1, 2]],
      "2": [[0, 1], [1, 1], [1, 2], [2, 2]],
      L: [[1, 0], [0, 1], [1, 1], [0, 2]]
    },
    J: {
      "0": [[0, 0], [0, 1], [1, 1], [2, 1]],
      R: [[1, 0], [2, 0], [1, 1], [1, 2]],
      "2": [[0, 1], [1, 1], [2, 1], [2, 2]],
      L: [[1, 0], [1, 1], [0, 2], [1, 2]]
    },
    L: {
      "0": [[2, 0], [0, 1], [1, 1], [2, 1]],
      R: [[1, 0], [1, 1], [1, 2], [2, 2]],
      "2": [[0, 1], [1, 1], [2, 1], [0, 2]],
      L: [[0, 0], [1, 0], [1, 1], [1, 2]]
    }
  };

  // SRSキックテーブル (y-down: 下方向が正)
  var KICKS_JLSTZ = {
    "0>R": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    "R>0": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    "R>2": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    "2>R": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    "2>L": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    "L>2": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    "L>0": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    "0>L": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]]
  };

  var KICKS_I = {
    "0>R": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    "R>0": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    "R>2": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
    "2>R": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    "2>L": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    "L>2": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    "L>0": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    "0>L": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]]
  };

  function kickTable(piece) {
    return piece === "I" ? KICKS_I : KICKS_JLSTZ;
  }

  // 行ごとにまとめたビットマスク表現に変換: [(dy,dxMin,dxMax,mask), ...] (dy昇順)
  function rowGroupsOf(cells) {
    var byRow = {};
    for (var i = 0; i < cells.length; i++) {
      var dx = cells[i][0], dy = cells[i][1];
      if (!byRow[dy]) byRow[dy] = [];
      byRow[dy].push(dx);
    }
    var dys = Object.keys(byRow).map(Number).sort(function (a, b) { return a - b; });
    var groups = [];
    for (var j = 0; j < dys.length; j++) {
      var dy2 = dys[j];
      var dxs = byRow[dy2];
      var mask = 0;
      for (var k = 0; k < dxs.length; k++) mask |= (1 << dxs[k]);
      groups.push([dy2, Math.min.apply(null, dxs), Math.max.apply(null, dxs), mask]);
    }
    return groups;
  }

  var PIECE_ROTATIONS = {};
  var PIECE_ROW_GROUPS = {};
  PIECE_NAMES.forEach(function (p) {
    PIECE_ROTATIONS[p] = {};
    PIECE_ROW_GROUPS[p] = {};
    ROTATION_ORDER.forEach(function (s) {
      var cells = RAW_ROTATIONS[p][s];
      PIECE_ROTATIONS[p][s] = cells;
      PIECE_ROW_GROUPS[p][s] = rowGroupsOf(cells);
    });
  });

  // ============================================================
  // 盤面ロジック (bitboard: 各行を1つの整数で表現。bit=1が「埋まっている」)
  // ============================================================

  function fullRowMask(width) {
    return (1 << width) - 1;
  }

  function isEmptyBoard(board) {
    for (var i = 0; i < board.length; i++) if (board[i] !== 0) return false;
    return true;
  }

  function popcount(n) {
    var c = 0;
    while (n) { n &= n - 1; c++; }
    return c;
  }

  function emptyCellCount(board, width) {
    var total = board.length * width;
    var filled = 0;
    for (var i = 0; i < board.length; i++) filled += popcount(board[i]);
    return total - filled;
  }

  // グリッド(0/1 or bool の2次元配列, row0=一番上)からビットボードへ変換
  function boardFromGrid(grid) {
    return grid.map(function (row) {
      var m = 0;
      for (var c = 0; c < row.length; c++) if (row[c]) m |= (1 << c);
      return m;
    });
  }

  function cellsAt(piece, state, x, y) {
    var rot = PIECE_ROTATIONS[piece][state];
    var out = new Array(4);
    for (var i = 0; i < 4; i++) out[i] = [x + rot[i][0], y + rot[i][1]];
    return out;
  }

  // row-group(ビットマスク)を使った高速衝突判定
  function collidesFast(board, rowGroups, x, y, width, height) {
    for (var i = 0; i < rowGroups.length; i++) {
      var g = rowGroups[i];
      var dy = g[0], dxMin = g[1], dxMax = g[2], mask = g[3];
      var cxMin = x + dxMin, cxMax = x + dxMax;
      if (cxMin < 0 || cxMax >= width) return true;
      var cy = y + dy;
      if (cy >= height) return true;
      if (cy >= 0) {
        var shifted = x >= 0 ? (mask << x) : (mask >> (-x));
        if (board[cy] & shifted) return true;
      }
    }
    return false;
  }

  function applyAndClear(board, cells, height, width) {
    var newRows = board.slice();
    for (var i = 0; i < cells.length; i++) {
      var x = cells[i][0], y = cells[i][1];
      newRows[y] |= (1 << x);
    }
    var full = fullRowMask(width);
    var remaining = [];
    for (var r = 0; r < newRows.length; r++) if (newRows[r] !== full) remaining.push(newRows[r]);
    var cleared = height - remaining.length;
    var out = new Array(cleared).fill(0).concat(remaining);
    return out;
  }

  // ラインが何本消えるかの概算スコア(手の並び替え用ヒューリスティック。
  // 消去数が多い置き方を優先すると、解に早くたどり着きやすい)
  function clearScore(board, cells, height, width) {
    var rowsTouched = {};
    for (var i = 0; i < cells.length; i++) {
      var x = cells[i][0], y = cells[i][1];
      if (y >= 0 && y < height) rowsTouched[y] = (rowsTouched[y] || 0) | (1 << x);
    }
    var full = fullRowMask(width);
    var cleared = 0;
    for (var y in rowsTouched) {
      if ((board[y] | rowsTouched[y]) === full) cleared++;
    }
    return cleared;
  }

  // 1ピースについて、SRSの移動・回転・キックで到達可能な「設置可能な最終形」を
  // すべて列挙する(BFS)。戻り値: cells(4点の[x,y]配列)のリスト。
  function allPlacements(board, piece, width, height) {
    var rotatable = piece !== "O";
    var kicks = kickTable(piece);
    var pieceW = 0;
    var spawnCells0 = PIECE_ROTATIONS[piece]["0"];
    for (var i = 0; i < spawnCells0.length; i++) pieceW = Math.max(pieceW, spawnCells0[i][0]);
    pieceW += 1;
    var spawnX = Math.floor((width - pieceW) / 2);
    var spawnY = -3;
    var spawnState = 0; // index into ROTATION_ORDER

    var rowGroupsByState = ROTATION_ORDER.map(function (s) { return PIECE_ROW_GROUPS[piece][s]; });

    if (collidesFast(board, rowGroupsByState[spawnState], spawnX, spawnY, width, height)) {
      return [];
    }

    var visited = new Set();
    var stack = [[spawnState, spawnX, spawnY]];
    visited.add(spawnState + "," + spawnX + "," + spawnY);

    var locked = new Map(); // key: sorted cell string -> cells array

    while (stack.length) {
      var top = stack.pop();
      var state = top[0], x = top[1], y = top[2];
      var rowGroups = rowGroupsByState[state];

      // ソフトドロップ
      if (collidesFast(board, rowGroups, x, y + 1, width, height)) {
        if (y + rowGroups[0][0] >= 0) {
          var cells = cellsAt(piece, ROTATION_ORDER[state], x, y);
          cells.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
          var key = cells.map(function (c) { return c[0] + "_" + c[1]; }).join("|");
          if (!locked.has(key)) locked.set(key, cells);
        }
      } else {
        var k1 = state + "," + x + "," + (y + 1);
        if (!visited.has(k1)) { visited.add(k1); stack.push([state, x, y + 1]); }
      }

      // 左移動
      if (!collidesFast(board, rowGroups, x - 1, y, width, height)) {
        var k2 = state + "," + (x - 1) + "," + y;
        if (!visited.has(k2)) { visited.add(k2); stack.push([state, x - 1, y]); }
      }

      // 右移動
      if (!collidesFast(board, rowGroups, x + 1, y, width, height)) {
        var k3 = state + "," + (x + 1) + "," + y;
        if (!visited.has(k3)) { visited.add(k3); stack.push([state, x + 1, y]); }
      }

      // 回転 (CW / CCW、SRSキック。最初に成功したキックだけ採用)
      if (rotatable) {
        for (var dir = 0; dir < 2; dir++) {
          var curLabel = ROTATION_ORDER[state];
          var nextLabel = dir === 0 ? NEXT_CW[curLabel] : NEXT_CCW[curLabel];
          var nextState = ROTATION_ORDER.indexOf(nextLabel);
          var nextRowGroups = rowGroupsByState[nextState];
          var kickList = kicks[curLabel + ">" + nextLabel];
          for (var ki = 0; ki < kickList.length; ki++) {
            var kdx = kickList[ki][0], kdy = kickList[ki][1];
            var nx = x + kdx, ny = y + kdy;
            if (!collidesFast(board, nextRowGroups, nx, ny, width, height)) {
              var k4 = nextState + "," + nx + "," + ny;
              if (!visited.has(k4)) { visited.add(k4); stack.push([nextState, nx, ny]); }
              break;
            }
          }
        }
      }
    }

    return Array.from(locked.values());
  }

  function shuffleInPlace(arr, rng) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function getPlacementsCached(board, piece, width, height, cache, rng) {
    var key = board.join(",") + "|" + piece;
    var hit = cache.get(key);
    if (hit) return hit;
    var placements = allPlacements(board, piece, width, height);
    // 同点(消去ライン数が同じ)の置き方はシャッフルしてから並び替える。
    // 決定的な生成順のままだと、特定の盤面で探索が極端に不運な順序を
    // たどり続けてしまうケースがあるため、タイブレークを毎回変えることで
    // 実運用(Botからの繰り返し呼び出し)での「詰まり」を避けやすくする。
    if (rng) shuffleInPlace(placements, rng);
    placements.sort(function (a, b) {
      return clearScore(board, b, height, width) - clearScore(board, a, height, width);
    });
    cache.set(key, placements);
    return placements;
  }

  // ============================================================
  // 探索 (バックトラッキング + ホールド + 失敗メモ化)
  // 「1つ見つかった時点で即返す」= 最速で単一パターンを得ることに最適化
  // ============================================================

  function SearchLimitError(reason) {
    this.reason = reason;
  }
  SearchLimitError.prototype = Object.create(Error.prototype);

  function searchPC(board, q, hold, remaining, height, width, caches, stats, path) {
    stats.nodesUsed++;
    if (stats.nodesUsed > stats.nodeBudget) throw new SearchLimitError("node_budget");
    if (stats.deadline !== null && (stats.nodesUsed & 63) === 0 && Date.now() > stats.deadline) {
      throw new SearchLimitError("time_limit");
    }

    if (remaining === 0) return null;

    var key = board.join(",") + "|" + q.join("") + "|" + (hold || "-") + "|" + remaining;
    if (caches.failMemo.has(key)) return null;

    // 次に置けるピースの候補: [piece, newQueue, newHold]
    var branches = [];
    if (q.length) branches.push([q[0], q.slice(1), hold]);
    if (hold) {
      if (q.length) branches.push([hold, q.slice(1), q[0]]);
      else branches.push([hold, q, null]);
    }
    if (!hold && q.length >= 2) branches.push([q[1], q.slice(2), q[0]]);

    for (var bi = 0; bi < branches.length; bi++) {
      var piece = branches[bi][0], newQ = branches[bi][1], newHold = branches[bi][2];
      var placements = getPlacementsCached(board, piece, width, height, caches.placements, caches.rng);
      for (var pi = 0; pi < placements.length; pi++) {
        var cells = placements[pi];
        var newBoard = applyAndClear(board, cells, height, width);
        var newPath = path.concat([{ piece: piece, cells: cells }]);
        if (isEmptyBoard(newBoard)) return newPath;
        if (remaining - 1 === 0) continue;
        var result = searchPC(newBoard, newQ, newHold, remaining - 1, height, width, caches, stats, newPath);
        if (result !== null) return result;
      }
    }

    caches.failMemo.set(key, false);
    return null;
  }

  // ============================================================
  // 公開API
  // ============================================================

  /**
   * findPerfectClear(input) -> result
   *
   * input:
   *   board      : 必須。2つの形式のどちらか
   *                  - 2次元配列 [[0,1,0,...], ...] (0/1 または true/false, row0=一番上)
   *                  - 行ビットマスクの配列 [0b0000000001, ...] (数値, bit0=左端列)
   *   queue      : 必須。今後出現するミノの配列。例: ["S","Z","L","J","T","I","O"]
   *                queue[0] が次に出現するミノ。
   *   hold       : 省略可(省略 or null = ホールド無し)。現在ホールドしているミノ。
   *   width      : 省略可。盤面の幅(既定 10)。
   *   nodeBudget : 省略可。探索ノード数の上限(既定 300000)。
   *   timeLimitMs: 省略可。探索の時間上限(ミリ秒)。指定するとこちらが優先的に効く。
   *   randomize  : 省略可(既定 true)。同点(消去ライン数が同じ)の置き方の
   *                探索順をシャッフルする。false にすると常に同じ決定的な順序になるが、
   *                特定の盤面で探索が極端に不運な順序をたどり続け、遅くなることがある。
   *   seed       : 省略可。randomize=true のときの乱数シード(数値)。
   *                同じ入力+同じseedなら毎回同じ結果を再現できる(デバッグ・テスト用)。
   *
   * 戻り値:
   *   成功時: {
   *     success: true,
   *     solution: [
   *       { piece: "T", usedHold: false, rotation: "0", cells: [[x,y],[x,y],[x,y],[x,y]] },
   *       ...
   *     ],
   *     nodesUsed: number
   *   }
   *   失敗時: { success: false, reason: "no_solution" | "search_limit" | "cell_count_not_multiple_of_4" | "not_enough_pieces", nodesUsed?: number }
   */
  function findPerfectClear(input) {
    input = input || {};
    var rawBoard = input.board;
    if (!rawBoard || !rawBoard.length) throw new Error("board is required");

    var width = input.width || 10;
    var board = typeof rawBoard[0] === "number" ? rawBoard.slice() : boardFromGrid(rawBoard);
    var height = board.length;

    var queueIn = (input.queue || []).map(function (p) { return String(p).toUpperCase(); });
    var hold = input.hold ? String(input.hold).toUpperCase() : null;

    queueIn.forEach(function (p) {
      if (PIECE_NAMES.indexOf(p) === -1) throw new Error("Unknown piece in queue: " + p);
    });
    if (hold && PIECE_NAMES.indexOf(hold) === -1) throw new Error("Unknown piece in hold: " + hold);

    var emptyCells = emptyCellCount(board, width);
    if (emptyCells % 4 !== 0) {
      return { success: false, reason: "cell_count_not_multiple_of_4" };
    }
    var k = emptyCells / 4;
    if (k === 0) {
      return { success: true, solution: [], nodesUsed: 0 };
    }

    var available = queueIn.length + (hold ? 1 : 0);
    if (available < k) {
      return { success: false, reason: "not_enough_pieces", needed: k, available: available };
    }

    // 理論上、成功パスが必要とする手持ちの先読み数は最大 k+1 個(ホールドの
    // 初回使用で最大1個分の余分な先読みが必要になるケースがあるため)。
    // それ以上は探索に使われないので切り詰めてメモ化キーを短くする。
    var q = queueIn.slice(0, Math.min(queueIn.length, k + 1));

  // 軽量な seed 可能PRNG (mulberry32)。再現テストや「毎回同じ結果が欲しい」用途向け。
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var caches = { placements: new Map(), failMemo: new Map() };
    var rng = null;
    if (input.randomize !== false) {
      rng = typeof input.seed === "number" ? mulberry32(input.seed) : Math.random;
    }
    caches.rng = rng;
    var stats = {
      nodeBudget: input.nodeBudget || 300000,
      nodesUsed: 0,
      deadline: typeof input.timeLimitMs === "number" ? Date.now() + input.timeLimitMs : null
    };

    var result;
    try {
      result = searchPC(board, q, hold, k, height, width, caches, stats, []);
    } catch (e) {
      if (e instanceof SearchLimitError) {
        return { success: false, reason: "search_limit", nodesUsed: stats.nodesUsed };
      }
      throw e;
    }

    if (result === null) {
      return { success: false, reason: "no_solution", nodesUsed: stats.nodesUsed };
    }

    // usedHold / rotation を付与して読みやすい形式に整形
    var curHold = hold;
    var curQ = q.slice();
    var solution = result.map(function (step) {
      var usedHold = false;
      if (curQ.length && curQ[0] === step.piece) {
        curQ = curQ.slice(1);
      } else if (curHold === step.piece) {
        usedHold = true;
        curHold = curQ.length ? curQ[0] : null;
        curQ = curQ.length ? curQ.slice(1) : curQ;
      } else {
        // 初手ホールドスワップ(hold未使用から2枚先読みして消費するケース)
        usedHold = false;
        curHold = curQ[0];
        curQ = curQ.slice(2);
      }
      var rotation = rotationOfCells(step.piece, step.cells);
      return { piece: step.piece, usedHold: usedHold, rotation: rotation, cells: step.cells };
    });

    return { success: true, solution: solution, nodesUsed: stats.nodesUsed };
  }

  // 最終セル配置から、どの回転状態(0/R/2/L)だったかを逆引きする(表示用)
  function rotationOfCells(piece, cells) {
    var sorted = cells.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var minX = Math.min.apply(null, sorted.map(function (c) { return c[0]; }));
    var minY = Math.min.apply(null, sorted.map(function (c) { return c[1]; }));
    var norm = sorted.map(function (c) { return (c[0] - minX) + "_" + (c[1] - minY); }).sort().join(",");
    for (var i = 0; i < ROTATION_ORDER.length; i++) {
      var s = ROTATION_ORDER[i];
      var ref = PIECE_ROTATIONS[piece][s].slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
      var rminX = Math.min.apply(null, ref.map(function (c) { return c[0]; }));
      var rminY = Math.min.apply(null, ref.map(function (c) { return c[1]; }));
      var rnorm = ref.map(function (c) { return (c[0] - rminX) + "_" + (c[1] - rminY); }).sort().join(",");
      if (rnorm === norm) return s;
    }
    return "0";
  }

  return {
    findPerfectClear: findPerfectClear,
    // 低レベルAPI(高度な用途向けに公開)
    allPlacements: allPlacements,
    collidesFast: collidesFast,
    applyAndClear: applyAndClear,
    boardFromGrid: boardFromGrid,
    isEmptyBoard: isEmptyBoard,
    emptyCellCount: emptyCellCount,
    PIECE_NAMES: PIECE_NAMES,
    PIECE_ROTATIONS: PIECE_ROTATIONS
  };
});