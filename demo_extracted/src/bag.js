'use strict';

const { PIECE_TYPES } = require('./constants');

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 7-bag方式でミノ列を生成する。
 * 1バッグ(I,O,T,S,Z,J,Lが1個ずつ)をシャッフルして繋げていく標準的なランダマイザ。
 * 既存のnext配列に何も手がかりが無い場合の「先の展開を適当に補う」用途で使う。
 *
 * @param {number} count 生成する個数
 * @param {() => number} [rng=Math.random] 乱数生成関数 (テスト用に差し替え可能)
 */
function generateBagQueue(count, rng = Math.random) {
  const out = [];
  while (out.length < count) {
    out.push(...shuffle(PIECE_TYPES, rng));
  }
  return out.slice(0, count);
}

/**
 * next配列が不足している場合に、7-bagで生成したミノで必要な長さまで補う。
 */
function extendQueueWithBag(next, minLength, rng = Math.random) {
  const queue = (next || []).slice();
  if (queue.length >= minLength) return queue;
  const extra = generateBagQueue(minLength - queue.length + 7, rng); // 少し多めに作る
  return queue.concat(extra).slice(0, Math.max(minLength, queue.length));
}

module.exports = { generateBagQueue, extendQueueWithBag };