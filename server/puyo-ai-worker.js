// ─────────────────────────────────────────────────────────────────
// PUYO AI WORKER (server-side) ──────────────────────────────────
// puyo-ai2.js の探索は 1手あたり数十〜数百 ms かかり、そのまま呼ぶと
// Node のイベントループを塞いでしまう。ここでは盤面と次のペアを
// 受け取り、puyo-ai2.js で着手 [pos, rot] を決めて返すだけの
// worker_threads ワーカー。実際のぷよ盤・連鎖解決・攻撃送信は
// メインスレッド側 (puyo-bot.js) が持つ。
// ─────────────────────────────────────────────────────────────────
'use strict';
const { parentPort } = require('worker_threads');
const PuyoAI = require('../puyo-ai2.js');

parentPort.on('message', (msg) => {
  let move = null;
  try {
    const board = new PuyoAI.Board(msg.cells);
    const ai = PuyoAI.createAI({ lookahead: msg.lookahead, beam: msg.beam });
    move = ai.getMove(board, msg.beans, msg.nexts);
  } catch (e) {
    move = null;
  }
  parentPort.postMessage({ id: msg.id, move });
});
