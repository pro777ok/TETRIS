// ─────────────────────────────────────────────────────────────────
// PUYO AI WORKER POOL (server-side) ─────────────────────────────
// puyo-ai2.js の探索を worker_threads 上で実行する簡易プール。
// 同期的に呼ぶとメインスレッドが数百 ms 固まるため、
// 「盤面 → 着手」の計算だけを別スレッドへ投げる。
// ワーカーが使えない環境では呼び出し側の syncFallback に落ちる。
// ─────────────────────────────────────────────────────────────────
'use strict';
const path = require('path');
const os = require('os');

let Worker = null;
try { Worker = require('worker_threads').Worker; } catch (e) { Worker = null; }

const WORKER_FILE = path.join(__dirname, 'puyo-ai-worker.js');
const REQUEST_TIMEOUT_MS = 10000;   // 固まったワーカーを捨てるまでの猶予
const MAX_WORKERS = 4;

class PuyoAIPool {
  constructor(size) {
    this.closed = false;
    this.seq = 0;
    this.failed = !Worker || !size;
    this.workers = [];   // { worker, task }
    this.queue = [];     // { msg, resolve }
    if (!this.failed) {
      for (let i = 0; i < size; i++) this._spawn();
    }
  }

  _spawn() {
    if (this.closed || !Worker) return;
    let w;
    try { w = new Worker(WORKER_FILE); } catch (e) { this.failed = true; return; }
    const rec = { worker: w, task: null, killed: false };
    const fail = () => {
      const task = rec.task; rec.task = null;
      if (task) { clearTimeout(task.timer); task.resolve(null); }
      const idx = this.workers.indexOf(rec);
      if (idx >= 0) this.workers.splice(idx, 1);
      if (!rec.killed && !this.closed) this._spawn();
      this._drain();
    };
    w.on('message', (msg) => {
      const task = rec.task; rec.task = null;
      if (task) { clearTimeout(task.timer); task.resolve(msg ? msg.move : null); }
      this._drain();
    });
    w.on('error', fail);
    w.on('exit', fail);
    // サーバー本体の終了を妨げないようにする
    if (w.unref) w.unref();
    this.workers.push(rec);
  }

  _kill(rec) {
    if (rec.killed) return;
    rec.killed = true;
    const idx = this.workers.indexOf(rec);
    if (idx >= 0) this.workers.splice(idx, 1);
    try { rec.worker.terminate(); } catch (e) {}
    if (!this.closed) this._spawn();
    this._drain();
  }

  _drain() {
    while (this.queue.length && this.workers.length) {
      const rec = this.workers.find(r => !r.task);
      if (!rec) return;
      const task = this.queue.shift();
      rec.task = task;
      task.timer = setTimeout(() => {
        if (rec.task !== task) return;
        rec.task = null;
        task.resolve(null);
        this._kill(rec);   // 固まったワーカーは捨てて作り直す
      }, REQUEST_TIMEOUT_MS);
      try {
        rec.worker.postMessage(task.msg);
      } catch (e) {
        clearTimeout(task.timer); rec.task = null; task.resolve(null);
      }
      this._drain();
    }
  }

  // msg: { cells, beans, nexts, lookahead, beam }
  // syncFallback: ワーカーが使えない/死んだときに同期で計算する関数
  choose(msg, syncFallback) {
    return new Promise((resolve) => {
      if (this.failed || !this.workers.length) {
        let out = null;
        try { out = syncFallback ? syncFallback() : null; } catch (e) { out = null; }
        resolve(out);
        return;
      }
      msg.id = ++this.seq;
      this.queue.push({ msg, resolve });
      this._drain();
    });
  }

  close() {
    this.closed = true;
    for (const rec of this.workers) { try { rec.worker.terminate(); } catch (e) {} }
    this.workers = [];
    for (const t of this.queue) t.resolve(null);
    this.queue = [];
  }
}

let shared = null;
function getPool() {
  if (!shared) {
    const cpus = (os.availableParallelism ? os.availableParallelism() : os.cpus().length) || 4;
    const size = Math.max(1, Math.min(MAX_WORKERS, cpus - 1));
    shared = new PuyoAIPool(size);
  }
  return shared;
}

module.exports = { getPool, PuyoAIPool };
