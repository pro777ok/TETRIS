'use strict';

// ============================================================
// 実践モード: ユーザー vs Bot
// サーバー側(src/*.js)の物理・スピン判定・探索をクライアントに移植して、
// リアルタイム対戦を動かす。Bot の意思決定は /api/bot に問い合わせる。
// ============================================================

(function () {
  const G_PIECES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  const G_ROT = ['0', 'R', '2', 'L'];
  const cwOf = (r) => G_ROT[(G_ROT.indexOf(r) + 1) % 4];
  const ccwOf = (r) => G_ROT[(G_ROT.indexOf(r) + 3) % 4];
  const oppOf = (r) => G_ROT[(G_ROT.indexOf(r) + 2) % 4];
  const LINE_NAME = ['', 'Single', 'Double', 'Triple', 'Tetris'];

  const G_SHAPES = {
    I: { 0: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], R: [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]], 2: [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]], L: [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]] },
    O: { 0: [[0,1,1],[0,1,1],[0,0,0]], R: [[0,1,1],[0,1,1],[0,0,0]], 2: [[0,1,1],[0,1,1],[0,0,0]], L: [[0,1,1],[0,1,1],[0,0,0]] },
    T: { 0: [[0,1,0],[1,1,1],[0,0,0]], R: [[0,1,0],[0,1,1],[0,1,0]], 2: [[0,0,0],[1,1,1],[0,1,0]], L: [[0,1,0],[1,1,0],[0,1,0]] },
    S: { 0: [[0,1,1],[1,1,0],[0,0,0]], R: [[0,1,0],[0,1,1],[0,0,1]], 2: [[0,0,0],[0,1,1],[1,1,0]], L: [[1,0,0],[1,1,0],[0,1,0]] },
    Z: { 0: [[1,1,0],[0,1,1],[0,0,0]], R: [[0,0,1],[0,1,1],[0,1,0]], 2: [[0,0,0],[1,1,0],[0,1,1]], L: [[0,1,0],[1,1,0],[1,0,0]] },
    J: { 0: [[1,0,0],[1,1,1],[0,0,0]], R: [[0,1,1],[0,1,0],[0,1,0]], 2: [[0,0,0],[1,1,1],[0,0,1]], L: [[0,1,0],[0,1,0],[1,1,0]] },
    L: { 0: [[0,0,1],[1,1,1],[0,0,0]], R: [[0,1,0],[0,1,0],[0,1,1]], 2: [[0,0,0],[1,1,1],[1,0,0]], L: [[1,1,0],[0,1,0],[0,1,0]] },
  };

  const JLSTZ_KICKS = {
    '0>R': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    'R>0': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    'R>2': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    '2>R': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '2>L': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    'L>2': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    'L>0': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '0>L': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  };
  const I_KICKS = {
    '0>R': [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
    'R>0': [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
    'R>2': [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
    '2>R': [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
    '2>L': [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
    'L>2': [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
    'L>0': [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
    '0>L': [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
  };
  const O_KICKS = {
    '0>R': [[0,0]], 'R>0': [[0,0]], 'R>2': [[0,0]], '2>R': [[0,0]],
    '2>L': [[0,0]], 'L>2': [[0,0]], 'L>0': [[0,0]], '0>L': [[0,0]],
  };
  const getKicks = (p, from, to) => {
    if (p === 'I') return I_KICKS[`${from}>${to}`];
    if (p === 'O') return O_KICKS[`${from}>${to}`];
    return JLSTZ_KICKS[`${from}>${to}`];
  };
  const spawnXOf = (p) => Math.floor((10 - G_SHAPES[p]['0'][0].length) / 2);

  // ---- board / スピン判定の移植 ----
  const EMPTY_CELL = 0;
  const isCellFilled = (b, x, y) => {
    if (x < 0 || x >= 10) return true;
    if (y >= 20) return true;
    if (y < 0) return false;
    return !!b[y][x];
  };
  const canPlace = (b, shape, x, y) => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        if (isCellFilled(b, x + c, y + r)) return false;
      }
    }
    return true;
  };
  const placeShape = (b, shape, x, y, pieceType) => {
    const nb = b.map((row) => row.slice());
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) nb[y + r][x + c] = pieceType;
      }
    }
    return nb;
  };
  const clearLines = (b) => {
    const kept = b.filter((row) => row.some((c) => !c));
    const cleared = b.length - kept.length;
    const nb = Array.from({ length: cleared }, () => new Array(10).fill(EMPTY_CELL)).concat(kept);
    return { board: nb, cleared };
  };
  const CORNERS = [[-1,-1],[1,-1],[-1,1],[1,1]];
  const FRONT = { 0: [[-1,-1],[1,-1]], R: [[1,-1],[1,1]], 2: [[-1,1],[1,1]], L: [[-1,-1],[-1,1]] };
  function detectSpin(b, piece, shape, x, y, rot, lastWasRotate, kickIndex) {
    if (!lastWasRotate) return { spinType: null, mini: false };
    if (piece === 'O') return { spinType: null, mini: false };
    if (piece === 'T') {
      const px = x + 1, py = y + 1;
      let filled = 0;
      for (const [dx, dy] of CORNERS) if (isCellFilled(b, px + dx, py + dy)) filled++;
      if (filled < 3) return { spinType: null, mini: false };
      const ff = FRONT[rot].filter(([dx, dy]) => isCellFilled(b, px + dx, py + dy)).length;
      let mini = ff < 2;
      if (mini && kickIndex === 4) mini = false;
      // 壁押しT-Spin Mini: 壁に押し当てて接地するにはバーの真下に地面が3ブロック必要
      if (mini) {
        const touchesWall = shape.some((row, r) => row.some((c, cc) => c && (x + cc === 0 || x + cc === 9)));
        const usesWallCorner = CORNERS.some(([dx, dy]) => {
          const cx = px + dx, cy = py + dy;
          return cx < 0 || cx >= 10 || cy >= 20;
        });
        if (touchesWall && usesWallCorner) {
          const bottomRow = shape.reduce((acc, row, r) => (row.some(Boolean) ? Math.max(acc, y + r) : acc), -1);
          let ground = 0;
          for (let c = 0; c < shape[bottomRow - y].length; c++) {
            if (isCellFilled(b, x + c, bottomRow + 1)) ground++;
          }
          if (ground < 3) return { spinType: null, mini: false };
        }
      }
      return { spinType: 'T', mini };
    }
    if (canPlace(b, shape, x, y - 1)) return { spinType: null, mini: false };
    return { spinType: piece, mini: false };
  }

  // ---- Player ----
  class Player {
    constructor(name, isUser) {
      this.name = name;
      this.isUser = isUser;
      this.reset();
    }
    reset() {
      this.board = Array.from({ length: 20 }, () => new Array(10).fill(EMPTY_CELL));
      this.bag = [];
      this.current = null;
      this.hold = null;
      this.canHold = true;
      this.lastWasRotate = false;
      this.kickIndex = -1;
      this.garbage = 0;
      this.surge = 0;
      this.b2b = false;
      this.lines = 0;
      this.spins = 0;
      this.minis = 0;
      this.over = false;
      this.lockAcc = 0;
    }
    refillBag() {
      const bag = G_PIECES.slice();
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      this.bag.push(...bag);
    }
    peekNext(n) {
      while (this.bag.length < n) this.refillBag();
      return this.bag.slice(0, n);
    }
    spawn() {
      while (!this.bag.length) this.refillBag();
      const type = this.bag.shift();
      const x = spawnXOf(type);
      if (!canPlace(this.board, G_SHAPES[type]['0'], x, 0)) {
        this.over = true;
        this.current = null;
        return false;
      }
      this.current = { type, x, y: 0, rot: '0' };
      this.canHold = true;
      this.lastWasRotate = false;
      this.kickIndex = -1;
      this.lockAcc = 0;
      return true;
    }
    move(dx) {
      if (!this.current || this.over) return false;
      const c = this.current;
      if (canPlace(this.board, G_SHAPES[c.type][c.rot], c.x + dx, c.y)) {
        c.x += dx;
        this.lastWasRotate = false;
        this.lockAcc = 0;
        return true;
      }
      return false;
    }
    moveDown1() {
      if (!this.current || this.over) return false;
      const c = this.current;
      if (canPlace(this.board, G_SHAPES[c.type][c.rot], c.x, c.y + 1)) {
        c.y++;
        this.lockAcc = 0;
        return true;
      }
      return false;
    }
    isGrounded() {
      if (!this.current) return false;
      const c = this.current;
      return !canPlace(this.board, G_SHAPES[c.type][c.rot], c.x, c.y + 1);
    }
    rotate(dir) {
      if (!this.current || this.over) return false;
      const c = this.current;
      const to = dir === 'cw' ? cwOf(c.rot) : dir === 'ccw' ? ccwOf(c.rot) : oppOf(c.rot);
      const kicks = dir === '180' ? [[0, 0]] : getKicks(c.type, c.rot, to);
      const nShape = G_SHAPES[c.type][to];
      for (let i = 0; i < kicks.length; i++) {
        const [dx, dy] = kicks[i];
        if (canPlace(this.board, nShape, c.x + dx, c.y + dy)) {
          c.x += dx;
          c.y += dy;
          c.rot = to;
          this.lastWasRotate = true;
          this.kickIndex = dir === '180' ? -1 : i;
          this.lockAcc = 0;
          return true;
        }
      }
      return false;
    }
    softDropToGround() {
      if (!this.current) return 0;
      let n = 0;
      while (this.moveDown1()) n++;
      return n;
    }
    hardDrop() {
      if (!this.current || this.over) return null;
      this.softDropToGround();
      return this.lock();
    }
    swapHold() {
      if (!this.current || !this.canHold || this.over) return false;
      const cur = this.current.type;
      if (this.hold === null) {
        this.hold = cur;
        this.current = null;
      } else {
        const out = this.hold;
        this.hold = cur;
        const x = spawnXOf(out);
        if (!canPlace(this.board, G_SHAPES[out]['0'], x, 0)) {
          this.over = true;
          this.current = null;
          return false;
        }
        this.current = { type: out, x, y: 0, rot: '0' };
      }
      this.canHold = false;
      this.lastWasRotate = false;
      this.lockAcc = 0;
      return true;
    }
    // 設置: スピン判定・ライン消去・b2b/サージ・ゴミ注入
    lock() {
      const c = this.current;
      const shape = G_SHAPES[c.type][c.rot];
      const placed = placeShape(this.board, shape, c.x, c.y, c.type);
      const { spinType, mini } = detectSpin(this.board, c.type, shape, c.x, c.y, c.rot, this.lastWasRotate, this.kickIndex);
      const { board: cleared, cleared: lines } = clearLines(placed);
      this.board = cleared;
      this.lines += lines;

      const result = { spinType, mini, lines, label: null, garbageSent: 0 };
      if (spinType && lines > 0) {
        if (spinType === 'T') {
          // Tスピン(通常+ミニ) = フルスピン → B2Bサージ+1
          this.spins++;
          this.surge++;
          this.b2b = true;
          result.label = (mini ? 'T-Spin Mini ' : 'T-Spin ') + LINE_NAME[lines];
        } else {
          // T以外のスピン = Spin Mini扱い: B2Bは維持するがサージは増えない
          this.minis++;
          this.b2b = true;
          result.label = `${spinType}-Spin Mini ${LINE_NAME[lines]}`;
        }
      } else if (lines > 0) {
        // 非スピン消し → B2B解除。溜まっていたサージ(4以上)を相手へ送る
        result.label = LINE_NAME[lines];
        if (this.surge >= 4) result.garbageSent = this.surge;
        this.surge = 0;
        this.b2b = false;
      }

      // 相手からのゴミを下段に注入 (最上段が詰まっていたらゲームオーバー)
      while (this.garbage > 0) {
        this.garbage--;
        if (this.board[0].some(Boolean)) { this.over = true; break; }
        this.board.shift();
        const hole = Math.floor(Math.random() * 10);
        const row = new Array(10).fill('G');
        row[hole] = EMPTY_CELL;
        this.board.push(row);
      }
      this.current = null;
      return result;
    }
  }

  // ---- Bot の状態 ----
  const botAI = {
    mode: 'SPIN',     // 'SPIN' | 'STACK' | 'DIG'
    plan: null,       // { steps, idx }
    stackCount: 0,
    busy: false,
  };

  function isHalfFull(board) {
    const top = board.findIndex((row) => row.some(Boolean));
    return top !== -1 && top <= 10; // 20行のうち上半分まで埋まったら
  }

  async function fetchBot(body) {
    const res = await fetch('/api/bot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Bot: 現在ミノを置く位置を決定する (plan step または stack/dig)
  async function botDecide(nextType) {
    if (botAI.plan && botAI.plan.idx < botAI.plan.steps.length) {
      const step = botAI.plan.steps[botAI.plan.idx];
      if (step.piece === nextType) return { kind: 'plan', step, plan: botAI.plan };
      botAI.plan = null;
    }
    // 半分明埋まり → dig モードへ
    if (isHalfFull(bot.board)) {
      botAI.mode = 'DIG';
      botAI.plan = null;
      const d = await fetchBot({ board: bot.board, current: nextType, next: bot.peekNext(14), hold: bot.hold });
      if (d.type === 'dig') return { kind: 'dig', d };
      if (d.type === 'spin') return adoptSpinPlan(d, nextType);
      return { kind: 'stack', d };
    }
    // スピン探索 (2回→1回はサーバー側でフォールバック)
    const d = await fetchBot({ board: bot.board, current: nextType, next: bot.peekNext(14), hold: bot.hold });
    if (d.type === 'spin') {
      const r = adoptSpinPlan(d, nextType);
      if (r) { botAI.mode = 'SPIN'; return r; }
    }
    if (d.type === 'stack') {
      botAI.mode = 'STACK';
      return { kind: 'stack', d };
    }
    if (d.type === 'dig') {
      botAI.mode = 'DIG';
      return { kind: 'dig', d };
    }
    // 想定外 → クリーン積み
    botAI.mode = 'STACK';
    return { kind: 'stack', d: null };
  }

  function adoptSpinPlan(d, nextType) {
    if (!d.steps || !d.steps.length) return null;
    const plan = { steps: d.steps, idx: 0 };
    const step = plan.steps[0];
    // 先頭ステップは current(=nextType)をそのまま置くか、holdで別ミノを出すか。
    // hold使用時は nextType ではなく別ミノが先頭に来る。
    if (step.piece === nextType || step.usedHold) {
      botAI.plan = plan;
      return { kind: 'plan', step, plan };
    }
    return null;
  }

  // Bot: 1手を実行
  async function botStep() {
    if (botAI.busy || !gameRunning) return;
    botAI.busy = true;
    try {
      await botStepInner();
    } catch (err) {
      console.error('botStep error:', err);
    } finally {
      botAI.busy = false;
    }
  }

  async function botStepInner() {
    try {
      if (bot.over) return;
      if (!bot.current) {
        const nextType = bot.peekNext(1)[0];
        let decision = await botDecide(nextType);
        if (!decision) decision = { kind: 'stack', d: null };
        if (!bot.spawn()) return;

        let placed = false;
        if (decision.kind === 'plan') {
          const step = decision.step;
          if (step.usedHold) {
            bot.swapHold();
            if (!bot.current) bot.spawn();
          }
          if (bot.current && bot.current.type === step.piece) {
            const c = bot.current;
            const shape = G_SHAPES[c.type][step.rot];
            if (canPlace(bot.board, shape, step.x, step.y)) {
              c.x = step.x; c.y = step.y; c.rot = step.rot;
              bot.lastWasRotate = !!step.isSpin;
              bot.kickIndex = -1;
              const res = bot.lock();
              applyLockResult(bot, res);
              decision.plan.idx++;
              if (decision.plan.idx >= decision.plan.steps.length) botAI.plan = null;
              placed = true;
            } else {
              console.warn('bot plan step canPlace failed', step);
              botAI.plan = null;
            }
          } else {
            botAI.plan = null;
          }
        }

        if (!placed) {
          const cur = bot.current ? bot.current.type : null;
          if (!cur) {
            bot.over = true;
          } else {
            let d = decision.d;
            if (!d || d.x == null || d.piece !== cur) {
              d = await fetchBot({ board: bot.board, current: cur, next: bot.peekNext(14), hold: bot.hold });
            }
            if (d && d.x != null) teleportLock(d);
            else bot.over = true;
          }
        }
        if (botAI.mode === 'STACK') {
          botAI.stackCount++;
          if (botAI.stackCount >= 7) { botAI.mode = 'SPIN'; botAI.stackCount = 0; }
        }
        await sleep(180);
      }
    } finally {
      botAI.busy = false;
    }
  }

  function teleportLock(d) {
    const c = bot.current;
    if (!c) return;
    const shape = G_SHAPES[c.type][d.rot];
    if (canPlace(bot.board, shape, d.x, d.y)) {
      c.x = d.x; c.y = d.y; c.rot = d.rot;
      bot.lastWasRotate = false;
      const res = bot.lock();
      applyLockResult(bot, res);
    } else {
      bot.over = true;
    }
  }

  function applyLockResult(player, res) {
    // 相手へゴミ送信
    if (res.garbageSent > 0) {
      const opp = player === user ? bot : user;
      opp.garbage += res.garbageSent;
      const st = player === user ? botStatusEl : userStatusEl;
      st.textContent = `相手からゴミ ${res.garbageSent} 行受信`;
    }
    // ログ表示
    const stEl = player === user ? userStatusEl : botStatusEl;
    if (res.label) {
      if (res.spinType && res.spinType === 'T') stEl.textContent = `${player.name}: ${res.label} (サージ ${player.surge})`;
      else if (res.spinType) stEl.textContent = `${player.name}: ${res.label} (Spin Mini)`;
      else if (res.lines > 0) stEl.textContent = `${player.name}: ${res.label} (B2B解除)`;
    } else {
      stEl.textContent = `${player.name}: 設置`;
    }
  }

  // ---- ユーザー入力 ----
  const keys = { left: false, right: false, down: false };
  const das = { active: false, dir: 0, t: 0, repeatT: 0 };

  function bindInput() {
    document.addEventListener('keydown', (e) => {
      if (!practiceVisible || !user) return;
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      switch (e.code) {
        case 'Space': e.preventDefault(); if (!e.repeat && user.current && !user.over) { user.hardDrop(); afterUserLock(); } break;
        case 'ShiftLeft': case 'ShiftRight': e.preventDefault(); if (!e.repeat) { user.swapHold(); if (!user.current) user.spawn(); } break;
        case 'KeyZ': e.preventDefault(); if (!e.repeat) user.rotate('ccw'); break;
        case 'KeyA': e.preventDefault(); if (!e.repeat) user.rotate('180'); break;
        case 'ArrowUp': e.preventDefault(); if (!e.repeat) user.rotate('cw'); break;
        case 'ArrowLeft': e.preventDefault(); if (!e.repeat) { keys.left = true; keys.right = false; das.active = false; } break;
        case 'ArrowRight': e.preventDefault(); if (!e.repeat) { keys.right = true; keys.left = false; das.active = false; } break;
        case 'ArrowDown': e.preventDefault(); if (!e.repeat) keys.down = true; break;
      }
    });
    document.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowLeft') keys.left = false;
      else if (e.code === 'ArrowRight') keys.right = false;
      else if (e.code === 'ArrowDown') keys.down = false;
    });
  }

  function afterUserLock() {
    // ロック後の処理: ゴミ送信は applyLockResult 内で処理済み
    user.lockAcc = 0;
    if (!user.over) user.spawn();
  }

  // Cookie utilities for settings persistence
  function setCookie(name, value, days = 365) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
  }
  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }
  function loadSettingsFromCookie() {
    const saved = getCookie('tetrisPracticeSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.assign(settings, parsed);
      } catch (e) {}
    }
    // Apply to input fields
    document.getElementById('dasInput').value = settings.das;
    document.getElementById('arrInput').value = settings.arr;
    document.getElementById('softInput').value = settings.soft;
  }
  function saveSettingsToCookie() {
    setCookie('tetrisPracticeSettings', JSON.stringify(settings));
  }

  const settings = { das: 140, arr: 20, soft: 15, gravity: 550, lockDelay: 500 };

  let userGravityAcc = 0;
  let userSoftAcc = 0;

  function userTick(dt) {
    if (!user.current || user.over) return;
    // DAS / ARR
    const dirHeld = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
    if (dirHeld !== 0) {
      if (!das.active || das.dir !== dirHeld) {
        das.active = true; das.dir = dirHeld; das.t = 0; das.repeatT = 0;
      } else {
        das.t += dt;
        if (das.t >= settings.das) {
          if (settings.arr === 0) {
            // 一瞬で端まで移動
            while (user.move(dirHeld)) {}
          } else {
            das.repeatT += dt;
            if (das.repeatT >= settings.arr) {
              user.move(dirHeld);
              das.repeatT = 0;
            }
          }
        }
      }
    } else {
      das.active = false;
    }
    // ソフトドロップ
    if (keys.down) {
      if (settings.soft === 0) {
        user.softDropToGround();
      } else {
        userSoftAcc += dt;
        const interval = 1000 / settings.soft;
        while (userSoftAcc >= interval) {
          userSoftAcc -= interval;
          if (!user.moveDown1()) break;
        }
      }
    } else {
      userSoftAcc = 0;
    }
    // 重力
    userGravityAcc += dt;
    while (userGravityAcc >= settings.gravity) {
      userGravityAcc -= settings.gravity;
      if (!user.moveDown1()) break;
    }
    // ロックディレイ (接地後に一定時間でロック)
    if (user.isGrounded()) {
      user.lockAcc += dt;
      if (user.lockAcc >= settings.lockDelay) {
        const res = user.lock();
        applyLockResult(user, res);
        afterUserLock();
      }
    } else {
      user.lockAcc = 0;
    }
  }

  // ---- 描画 ----
  const userCanvas = document.getElementById('userCanvas');
  const botCanvas = document.getElementById('botCanvas');
  const uctx = userCanvas.getContext('2d');
  const bctx = botCanvas.getContext('2d');
  const userStatusEl = document.getElementById('userStatus');
  const botStatusEl = document.getElementById('botStatus');
  const userSurgeEl = document.getElementById('userSurge');
  const botSurgeEl = document.getElementById('botSurge');
  const userNextEl = document.getElementById('userNext');
  const botNextEl = document.getElementById('botNext');
  const userHoldEl = document.getElementById('userHold');
  const botHoldEl = document.getElementById('botHold');
  const userGarbageEl = document.getElementById('userGarbage');
  const botGarbageEl = document.getElementById('botGarbage');
  const userLinesEl = document.getElementById('userLines');
  const botLinesEl = document.getElementById('botLines');

  const PIECE_COLORS = { I: '#3ec6e0', O: '#f5d547', T: '#b15ae0', S: '#52d273', Z: '#e05555', J: '#4a7df0', L: '#f0943e', G: '#6b7280' };

  function drawPlayer(ctx, canvas, player) {
    const cs = canvas.width / 10;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Board with piece colors
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 10; x++) {
        const cell = player.board[y][x];
        ctx.fillStyle = cell ? (PIECE_COLORS[cell] || '#4a5170') : '#1c2038';
        ctx.fillRect(x * cs, y * cs, cs - 1, cs - 1);
      }
    }
    // Ghost
    if (player.current) {
      const c = player.current;
      const shape = G_SHAPES[c.type][c.rot];
      let gy = c.y;
      while (canPlace(player.board, shape, c.x, gy + 1)) gy++;
      ctx.fillStyle = 'rgba(124,140,255,0.28)';
      for (let r = 0; r < shape.length; r++) {
        for (let cc = 0; cc < shape[r].length; cc++) {
          if (shape[r][cc]) ctx.fillRect((c.x + cc) * cs, (gy + r) * cs, cs - 1, cs - 1);
        }
      }
    }
    // Current piece
    if (player.current) {
      const c = player.current;
      const shape = G_SHAPES[c.type][c.rot];
      ctx.fillStyle = PIECE_COLORS[c.type] || '#fff';
      for (let r = 0; r < shape.length; r++) {
        for (let cc = 0; cc < shape[r].length; cc++) {
          if (shape[r][cc] && c.y + r >= 0) ctx.fillRect((c.x + cc) * cs, (c.y + r) * cs, cs - 1, cs - 1);
        }
      }
    }
    // Midline
    ctx.strokeStyle = 'rgba(255,90,90,0.25)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, 10 * cs); ctx.lineTo(canvas.width, 10 * cs); ctx.stroke();
    ctx.setLineDash([]);
    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    for (let x = 0; x <= 10; x++) { ctx.beginPath(); ctx.moveTo(x * cs, 0); ctx.lineTo(x * cs, canvas.height); ctx.stroke(); }
    for (let y = 0; y <= 20; y++) { ctx.beginPath(); ctx.moveTo(0, y * cs); ctx.lineTo(canvas.width, y * cs); ctx.stroke(); }
  }

  function renderPractice() {
    drawPlayer(uctx, userCanvas, user);
    drawPlayer(bctx, botCanvas, bot);

    // Helper to draw a piece shape on a canvas element
    function drawPieceShape(canvasEl, type, cellSize) {
      const ctx = canvasEl.getContext('2d');
      const shape = G_SHAPES[type]['0'];
      ctx.fillStyle = PIECE_COLORS[type] || '#fff';
      ctx.clearRect(0, 0, shape[0].length * cellSize, shape.length * cellSize);
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) ctx.fillRect(c * cellSize + 1, r * cellSize + 1, cellSize - 2, cellSize - 2);
        }
      }
    }

    const cs = 14; // smaller cell size for next/hold

    // User next: hold on left, next 3 on right
    const userNextPieces = user.peekNext(3);
    let userNextHTML = '';
    // Hold on left
    if (user.hold) {
      userNextHTML += '<canvas class="piece-canvas" data-piece="' + user.hold + '" width="' + (G_SHAPES[user.hold]['0'][0].length * cs) + '" height="' + (G_SHAPES[user.hold]['0'].length * cs) + '" style="float:left; margin:1px"></canvas>';
    } else {
      userNextHTML += '<span class="piece-none" style="float:left; margin:1px; font-size:10px; color:var(--muted);">Hold: なし</span>';
    }
    // Next on right
    userNextPieces.forEach((type) => {
      const shape = G_SHAPES[type]['0'];
      userNextHTML += '<canvas class="piece-canvas" data-piece="' + type + '" width="' + (shape[0].length * cs) + '" height="' + (shape.length * cs) + '" style="float:left; margin:1px"></canvas>';
    });
    userNextEl.innerHTML = userNextHTML || 'なし';
    // Draw on the canvases
    userNextEl.querySelectorAll('.piece-canvas').forEach((canvasEl) => {
      const type = canvasEl.dataset.piece;
      if (type) drawPieceShape(canvasEl, type, cs);
    });

    // Bot next: hold on left, next 3 on right
    const botNextPieces = bot.peekNext(3);
    let botNextHTML = '';
    if (bot.hold) {
      botNextHTML += '<canvas class="piece-canvas" data-piece="' + bot.hold + '" width="' + (G_SHAPES[bot.hold]['0'][0].length * cs) + '" height="' + (G_SHAPES[bot.hold]['0'].length * cs) + '" style="float:left; margin:1px"></canvas>';
    } else {
      botNextHTML += '<span class="piece-none" style="float:left; margin:1px; font-size:10px; color:var(--muted);">Hold: なし</span>';
    }
    botNextPieces.forEach((type) => {
      const shape = G_SHAPES[type]['0'];
      botNextHTML += '<canvas class="piece-canvas" data-piece="' + type + '" width="' + (shape[0].length * cs) + '" height="' + (shape.length * cs) + '" style="float:left; margin:1px"></canvas>';
    });
    botNextEl.innerHTML = botNextHTML || 'なし';
    botNextEl.querySelectorAll('.piece-canvas').forEach((canvasEl) => {
      const type = canvasEl.dataset.piece;
      if (type) drawPieceShape(canvasEl, type, cs);
    });

    // User hold (separate display)
    if (user.hold) {
      const shape = G_SHAPES[user.hold]['0'];
      userHoldEl.innerHTML = '<canvas class="piece-canvas" data-piece="' + user.hold + '" width="' + (shape[0].length * cs) + '" height="' + (shape.length * cs) + '" style="float:left; margin:1px"></canvas>';
      userHoldEl.querySelectorAll('.piece-canvas').forEach((canvasEl) => drawPieceShape(canvasEl, user.hold, cs));
    } else {
      userHoldEl.innerHTML = 'なし';
    }

    // Bot hold
    if (bot.hold) {
      const shape = G_SHAPES[bot.hold]['0'];
      botHoldEl.innerHTML = '<canvas class="piece-canvas" data-piece="' + bot.hold + '" width="' + (shape[0].length * cs) + '" height="' + (shape.length * cs) + '" style="float:left; margin:1px"></canvas>';
      botHoldEl.querySelectorAll('.piece-canvas').forEach((canvasEl) => drawPieceShape(canvasEl, bot.hold, cs));
    } else {
      botHoldEl.innerHTML = 'なし';
    }

    userGarbageEl.textContent = user.garbage;
    botGarbageEl.textContent = bot.garbage;
    userLinesEl.textContent = user.lines;
    botLinesEl.textContent = bot.lines;
    userSurgeEl.textContent = user.surge >= 4 ? `B2B SURGE ${user.surge}` : '';
    botSurgeEl.textContent = bot.surge >= 4 ? `B2B SURGE ${bot.surge}` : '';
    if (user.over) userStatusEl.textContent = 'GAME OVER';
    if (bot.over) botStatusEl.textContent = 'BOT GAME OVER';
  }

  // ---- ゲーム管理 ----
  let user = null;
  let bot = null;
  let gameRunning = false;
  let loopTimer = null;
  let practiceVisible = false;

  function startGame() {
    stopGame();
    settings.das = Math.max(0, parseInt(document.getElementById('dasInput').value, 10) || 0);
    settings.arr = Math.max(0, parseInt(document.getElementById('arrInput').value, 10) || 0);
    settings.soft = Math.max(0, parseInt(document.getElementById('softInput').value, 10) || 0);
    saveSettingsToCookie();
    user = new Player('あなた', true);
    bot = new Player('Bot', false);
    botAI.mode = 'SPIN'; botAI.plan = null; botAI.stackCount = 0;
    user.peekNext(7); bot.peekNext(7);
    user.spawn(); bot.spawn();
    gameRunning = true;
    userGravityAcc = 0; userSoftAcc = 0;
    renderPractice();
    loopTimer = setInterval(tick, 16);
    document.getElementById('userStatus').textContent = 'スタート!';
    document.getElementById('botStatus').textContent = '';
  }

  function stopGame() {
    gameRunning = false;
    if (loopTimer) { clearInterval(loopTimer); loopTimer = null; }
  }

  function tick() {
    if (!gameRunning) return;
    if (user && !user.over) userTick(16);
    if (bot && !bot.over) {
      botStep();
    }
    renderPractice();
    // 終了判定
    if (user && user.over && bot && bot.over) {
      stopGame();
      userStatusEl.textContent = '両者GAME OVER';
    } else if (user && user.over) {
      // ユーザーのみ死亡 → bot勝利。ゲーム継続可(観戦)
      userStatusEl.textContent = 'あなた GAME OVER';
    } else if (bot && bot.over) {
      botStatusEl.textContent = 'Bot GAME OVER';
    }
  }

  // ---- モードタブ ----
  function setTab(tab) {
    const search = document.getElementById('searchMode');
    const practice = document.getElementById('practiceMode');
    const ts = document.getElementById('tabSearch');
    const tp = document.getElementById('tabPractice');
    if (tab === 'practice') {
      practice.style.display = '';
      search.style.display = 'none';
      tp.classList.add('active');
      ts.classList.remove('active');
      practiceVisible = true;
    } else {
      search.style.display = '';
      practice.style.display = 'none';
      ts.classList.add('active');
      tp.classList.remove('active');
      practiceVisible = false;
      stopGame();
    }
  }

  document.getElementById('tabSearch').addEventListener('click', () => setTab('search'));
  document.getElementById('tabPractice').addEventListener('click', () => setTab('practice'));
  document.getElementById('startGameBtn').addEventListener('click', startGame);
  document.getElementById('stopGameBtn').addEventListener('click', stopGame);

  // Load settings from cookie on init
  loadSettingsFromCookie();

  bindInput();
})();