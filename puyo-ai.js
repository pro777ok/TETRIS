/*!
 * puyo-ai.js — Puyo Puyo board simulator + lookahead AI (no dependencies).
 * JavaScript port of the SimpleComboAI from Puyo-AI (see LICENSE of the original project).
 *
 * Usage (browser):  <script src="puyo-ai.js"></script>
 * Usage (Node/ESM bundlers):  const PuyoAI = require('./puyo-ai.js');
 *
 *   const board = new PuyoAI.Board();                 // 6 wide x 12 tall, board.c[x][y], y=0 is the bottom
 *   const ai = PuyoAI.createAI({ lookahead: 2 });     // how many NEXT pairs to look ahead
 *   const [pos, rot] = ai.getMove(board, ['r','g'], [['b','b'], ['y','r']]);
 *   const result = board.makeMove(['r','g'], pos, rot);  // {score, n, length(chain count), over}
 *
 * Pairs are [top, bottom] with colors 'r','g','b','y','p' ('k' = nuisance, never in a pair).
 * A move is [position, rotation]: rotation 0..3 = clockwise turns; position is the leftmost
 * column (0-5 for vertical rotations 0/2, 0-4 for horizontal rotations 1/3).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PuyoAI = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var COLORS = ['r', 'g', 'b', 'y', 'p'];
  var CHAIN_POWER = [0, 8, 16, 32, 64, 128, 256, 512, 999];
  var COLOR_BONUS = [0, 0, 3, 6, 12, 24];
  var GROUP_BONUS = [0, 0, 0, 0, 0, 2, 3, 4, 5, 6, 7, 10];
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function chainScore(i, n, colors, bonus) {
    var mult = CHAIN_POWER[Math.min(i, 8)] + COLOR_BONUS[colors] + bonus;
    return 10 * n * Math.max(1, Math.min(999, mult));
  }

  function Board(cells) {
    this.c = cells ? cells.map(function (col) { return col.slice(); })
                   : Array.from({ length: 6 }, function () { return Array(12).fill(' '); });
  }
  Board.prototype.copy = function () { return new Board(this.c); };
  // Drop one bean into column x; returns the row it landed in (-1 if the column is full).
  Board.prototype.drop = function (x, col) {
    for (var y = 0; y < 12; y++) if (this.c[x][y] === ' ') { this.c[x][y] = col; return y; }
    return -1;
  };
  Board.prototype.connected = function (x, y) {
    var col = this.c[x][y];
    if (col === ' ' || col === 'k') return [];
    var seen = {}, st = [[x, y]], out = [];
    seen[x * 12 + y] = 1;
    while (st.length) {
      var p = st.pop(); out.push(p);
      for (var d = 0; d < 4; d++) {
        var nx = p[0] + DIRS[d][0], ny = p[1] + DIRS[d][1];
        if (nx < 0 || nx > 5 || ny < 0 || ny > 11 || seen[nx * 12 + ny] || this.c[nx][ny] !== col) continue;
        seen[nx * 12 + ny] = 1; st.push([nx, ny]);
      }
    }
    return out;
  };
  // Clears every group of 4+ (and adjacent nuisance). Returns {n, colors, bonus, cells}.
  Board.prototype.eliminate = function () {
    var n = 0, bonus = 0, cols = {}, nCols = 0, cells = [];
    for (var x = 0; x < 6; x++) for (var y = 0; y < 12; y++) {
      var col = this.c[x][y];
      if (col === ' ' || col === 'k') continue;
      var g = this.connected(x, y);
      if (g.length < 4) continue;
      if (!cols[col]) { cols[col] = 1; nCols++; }
      bonus += GROUP_BONUS[Math.min(g.length, 11)];
      for (var i = 0; i < g.length; i++) {
        var a = g[i][0], b = g[i][1];
        for (var d = 0; d < 4; d++) {
          var nx = a + DIRS[d][0], ny = b + DIRS[d][1];
          if (nx >= 0 && nx < 6 && ny >= 0 && ny < 12 && this.c[nx][ny] === 'k') this.c[nx][ny] = ' ';
        }
        this.c[a][b] = ' '; n++; cells.push([a, b]);
      }
    }
    return { n: n, colors: nCols, bonus: bonus, cells: cells };
  };
  Board.prototype.gravity = function () {
    for (var x = 0; x < 6; x++) {
      var f = 0;
      for (var y = 0; y < 12; y++) if (this.c[x][y] !== ' ') {
        var t = this.c[x][f]; this.c[x][f] = this.c[x][y]; this.c[x][y] = t; f++;
      }
    }
  };
  // Drops beans and resolves all chains. Returns {score, n, length (chain count), over:false}.
  Board.prototype.dropBeans = function (xs, cols) {
    for (var k = 0; k < xs.length; k++) this.drop(xs[k], cols[k]);
    var score = 0, n = 0, i = 0;
    for (;; i++) {
      var e = this.eliminate();
      if (!e.n) break;
      this.gravity();
      score += chainScore(i, e.n, e.colors, e.bonus); n += e.n;
    }
    return { score: score, n: n, length: i, over: false };
  };
  Board.prototype.canMove = function (pos, rot) {
    if (pos === 2 && rot === 0) return true;
    var lo = pos >= 2 ? 2 : pos, hi = pos >= 2 ? pos + (rot % 2) : 2;
    for (var i = Math.min(lo, hi); i <= Math.max(lo, hi); i++) if (this.c[i][11] !== ' ') return false;
    if (rot !== 0 && this.c[1][11] !== ' ' && this.c[3][11] !== ' ') return false;
    return true;
  };
  Board.prototype.moves = function () {
    var m = [];
    for (var r = 0; r < 4; r++) for (var p = 0; p < (r % 2 ? 5 : 6); p++) if (this.canMove(p, r)) m.push([p, r]);
    return m;
  };
  // The [column, color] drops (in order) that a move produces. Useful for animation.
  Board.prototype.placement = function (beans, pos, rot) {
    var b = beans;
    if (rot > 1) rot -= 2; else b = [beans[1], beans[0]];
    return rot === 0 ? [[pos, b[0]], [pos, b[1]]] : [[pos, b[0]], [pos + 1, b[1]]];
  };
  // Applies a move. Returns null if illegal, else {score, n, length, over}.
  Board.prototype.makeMove = function (beans, pos, rot) {
    if (!this.canMove(pos, rot)) return null;
    if (pos === 2 && rot === 0 && this.c[2][11] !== ' ') return { score: 0, n: 0, length: 0, over: true };
    var pl = this.placement(beans, pos, rot);
    return this.dropBeans(pl.map(function (p) { return p[0]; }), pl.map(function (p) { return p[1]; }));
  };

  // Heuristic value of making `move` now (mutates `board`, so pass a copy).
  function scoreMove(board, beans, pos, rot) {
    var combo = board.makeMove(beans, pos, rot), v = 0, x, y;
    for (var ci = 0; ci < COLORS.length; ci++) for (x = 0; x < 6; x++) {
      var t = board.copy().dropBeans([x], [COLORS[ci]]);
      if (t.length >= 2) v += t.score;
    }
    if (combo.length < 1) v -= combo.score; else if (combo.length > 1) v += 2 * combo.score;
    var filled = 0;
    for (x = 0; x < 6; x++) for (y = 0; y < 12; y++) {
      v += board.connected(x, y).length;
      if (board.c[x][y] !== ' ') filled++;
    }
    if (filled > 36 || board.c[2][9] !== ' ') v += 4 * combo.score;
    if (board.c[2][11] !== ' ') v = -Infinity;
    return v;
  }

  /**
   * createAI(options)
   *   lookahead  number of NEXT pairs to search ahead (default 2; 0 = greedy, no lookahead).
   *              Capped by how many pairs you pass to getMove().
   *   beam       candidates kept per search level: a number, or an array per level
   *              (default [6, 3, 2]; the last value repeats). Smaller = faster.
   *   discount   weight of each later move's score relative to the previous (default 0.7)
   *   random     RNG returning [0,1) used to break ties (default Math.random)
   * Returns { getMove(board, beans, nexts), options }.
   */
  function createAI(options) {
    var o = options || {};
    var lookahead = o.lookahead == null ? 2 : Math.max(0, Math.floor(o.lookahead));
    var beam = o.beam == null ? [6, 3, 2] : o.beam;
    var discount = o.discount == null ? 0.7 : o.discount;
    var rnd = o.random || Math.random;
    function beamAt(level) {
      if (typeof beam === 'number') return beam;
      return beam[Math.min(level, beam.length - 1)];
    }
    function search(board, beans, rest, level) {
      var ms = board.moves();
      for (var i = ms.length - 1; i > 0; i--) {
        var j = Math.floor(rnd() * (i + 1)), t = ms[i]; ms[i] = ms[j]; ms[j] = t;
      }
      var sc = ms.map(function (m) { return { m: m, v: scoreMove(board.copy(), beans, m[0], m[1]) }; });
      sc.sort(function (a, b) { return b.v - a.v; });
      if (!rest.length || sc[0].v === -Infinity) return sc[0];
      var best = { m: sc[0].m, v: -Infinity }, top = sc.slice(0, beamAt(level));
      for (var k = 0; k < top.length; k++) {
        var c = top[k];
        if (c.v === -Infinity) break;
        var b = board.copy(); b.makeMove(beans, c.m[0], c.m[1]);
        var total = c.v + discount * search(b, rest[0], rest.slice(1), level + 1).v;
        if (total > best.v) best = { m: c.m, v: total };
      }
      return best;
    }
    return {
      options: { lookahead: lookahead, beam: beam, discount: discount },
      getMove: function (board, beans, nexts) {
        var rest = (nexts || []).slice(0, lookahead);
        return search(board, beans, rest, 0).m;
      }
    };
  }

  return {
    Board: Board, createAI: createAI, scoreMove: scoreMove, chainScore: chainScore,
    COLORS: COLORS, CHAIN_POWER: CHAIN_POWER, COLOR_BONUS: COLOR_BONUS, GROUP_BONUS: GROUP_BONUS
  };
});
