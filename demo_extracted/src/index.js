'use strict';

const { PIECE_TYPES } = require('./constants');
const { searchPlacements, evaluatePlacement } = require('./solver');
const { findSpinPlan, replayTrajectory } = require('./planner');
const { generateBagQueue } = require('./bag');

/**
 * 盤面・現在ミノ・ネクスト・ホールドから、
 * スピン(Tスピン/オールスピン)を絡めた設置手順の候補を全探索して返す。
 *
 * @param {number[][]} board  2次元配列 (0=空,1=ブロック)。board[0]が一番上の行。
 * @param {string} current    現在operableなミノ ('I','O','T','S','Z','J','L')
 * @param {string[]} next     ネクスト列 (必須。空配列は可。使うのは next[0] のみ)
 * @param {string|null} hold  ホールド中のミノ (無ければ null)
 * @param {object} [options]
 * @param {number} [options.limit=20] 返す候補の最大数
 * @returns {object[]} 見つかったスピン設置候補 (moves数の昇順)
 */
function findSpinSetups(board, current, next, hold, options = {}) {
  const { limit = 20 } = options;
  if (!PIECE_TYPES.includes(current)) {
    throw new Error(`不正な現在ミノ: ${current}`);
  }
  if (!Array.isArray(next)) {
    throw new Error('next は必須です(配列で指定してください。空配列は可)');
  }
  const nextPiece = next.length ? next[0] : null;

  const candidates = [];

  // パターン1: ホールドを使わずに現在ミノをそのまま置く
  collectCandidates(board, current, false, candidates);

  // パターン2: ホールドを使う (現在ミノをホールドへ、ホールド中 or ネクスト先頭を場に出す)
  const pieceAfterHold = hold || nextPiece;
  if (pieceAfterHold && pieceAfterHold !== current) {
    collectCandidates(board, pieceAfterHold, true, candidates);
  } else if (pieceAfterHold && pieceAfterHold === current && hold) {
    // ホールドに入っているミノが現在ミノと同じ場合でも swap 自体は可能
    collectCandidates(board, pieceAfterHold, true, candidates);
  }

  const spinCandidates = candidates.filter((c) => c.isSpin && c.linesCleared > 0);
  spinCandidates.sort((a, b) => a.moves.length - b.moves.length);
  return spinCandidates.slice(0, limit);
}

function collectCandidates(board, pieceType, usedHold, out) {
  const placements = searchPlacements(board, pieceType);
  for (const state of placements) {
    const evaluated = evaluatePlacement(board, pieceType, state);
    if (usedHold) evaluated.moves = ['hold', ...evaluated.moves];
    evaluated.usedHold = usedHold;
    // プレビューアニメーション用の軌跡(最後のhardDropは含めない)と設置後の盤面
    evaluated.path = replayTrajectory(board, pieceType, state.moves);
    evaluated.after = evaluated.resultBoard;
    out.push(evaluated);
  }
}

/**
 * 特定ミノを指定した盤面上で置ける全パターン(スピンでなくても)を返す。
 * デバッグ・可視化用途。
 */
function allPlacements(board, pieceType) {
  const placements = searchPlacements(board, pieceType);
  return placements.map((state) => evaluatePlacement(board, pieceType, state));
}

module.exports = {
  findSpinSetups,
  findSpinPlan,
  replayTrajectory,
  allPlacements,
  generateBagQueue,
  PIECE_TYPES,
};