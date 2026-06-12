// ===== TETRIX ONLINE =====

// ---- Settings ----
let mobileControlsEnabled = false; // Mobile controls toggle
let settings={ghostOpacity:40,quality:'ultra',particles:'high',shake:'on',sfxVolume:70,tilt:'on',softDropInterval:50,dasDelay:133,arrInterval:20,dcdDelay:0,swipeThreshold:10,maxFPS:144,
  overlayOpacity:33,
  uiLayout:{boardOffsetY:0,boardScale:100,sideUiOffsetY:0,sideUiFontScale:100},
  dpad:{cross:{x:2,y:55,size:160,opacity:80},shift:{x:2,y:80,size:80,opacity:80},harddrop:{x:20,y:80,size:80,opacity:80},z:{x:38,y:80,size:80,opacity:80},swapCenterDown:false}};
function loadSettings(){
  try{
    const s=document.cookie.split(';').find(c=>c.trim().startsWith('tetrix_settings='));
    if(s){
      const saved=JSON.parse(decodeURIComponent(s.split('=')[1]));
      const savedDpad=saved.dpad;
      const savedUiLayout=saved.uiLayout;
      settings={...settings,...saved};
      if(savedDpad&&savedDpad.cross&&savedDpad.shift&&savedDpad.z){
        settings.dpad={
          cross:{...settings.dpad.cross,...savedDpad.cross},
          shift:{...settings.dpad.shift,...savedDpad.shift},
          z:{...settings.dpad.z,...savedDpad.z},
          harddrop:savedDpad.harddrop?{...settings.dpad.harddrop,...savedDpad.harddrop}:{x:20,y:80,size:80,opacity:80},
          swapCenterDown:savedDpad.swapCenterDown??false
        };
      } else {
        // 古い形式または不正 → デフォルトを維持
        settings.dpad={cross:{x:2,y:55,size:160,opacity:80},shift:{x:2,y:80,size:80,opacity:80},harddrop:{x:20,y:80,size:80,opacity:80},z:{x:38,y:80,size:80,opacity:80},swapCenterDown:false};
      }
      if(savedUiLayout){settings.uiLayout={...settings.uiLayout,...savedUiLayout};}
    }
  }catch(e){}
}
function saveSettings(){document.cookie='tetrix_settings='+encodeURIComponent(JSON.stringify(settings))+'; max-age=31536000; path=/';}
function updateSetting(key,val){
  if(key==='ghost'){settings.ghostOpacity=parseInt(val);document.getElementById('ghost-val').textContent=val+'%';}
  else if(key==='overlayOpacity'){settings.overlayOpacity=parseInt(val);document.getElementById('overlay-opacity-val').textContent=val+'%';}
  else if(key==='quality'){settings.quality=val;document.getElementById('quality-val').textContent=val==='minimum'?'MINIMUM':val==='ultra'?'ULTRA':val.toUpperCase();}
  else if(key==='particles')settings.particles=val;
  else if(key==='shake')settings.shake=val;
  else if(key==='sfx'){settings.sfxVolume=parseInt(val);document.getElementById('sfx-val').textContent=val+'%';sfxVol=parseInt(val)/100;}
  else if(key==='tilt')settings.tilt=val;
  else if(key==='softDropInterval'){settings.softDropInterval=parseInt(val);document.getElementById('soft-drop-val').textContent=val==='0'?'INSTANT':val+'ms';}
  else if(key==='dasDelay'){settings.dasDelay=parseInt(val);document.getElementById('das-delay-val').textContent=val+'ms';}
  else if(key==='arrInterval'){settings.arrInterval=parseInt(val);document.getElementById('arr-interval-val').textContent=val+'ms';}
  else if(key==='dcdDelay'){settings.dcdDelay=parseInt(val);document.getElementById('dcd-delay-val').textContent=val+'ms';}
  else if(key==='swipeThreshold'){settings.swipeThreshold=parseInt(val);document.getElementById('swipe-threshold-val').textContent=val+'px';}
  else if(key==='maxFPS'){settings.maxFPS=parseInt(val);document.getElementById('maxfps-val').textContent=val+'fps';if(gameApp&&gameApp.ticker)gameApp.ticker.maxFPS=parseInt(val);PIXI.Ticker.shared.maxFPS=parseInt(val);}
  else if(key==='dpad'){if(val.part){settings.dpad[val.part]={...settings.dpad[val.part],...val.data};}else{settings.dpad={...settings.dpad,...val};}applyDpadLayout();}
  else if(key==='uiLayout'){settings.uiLayout={...settings.uiLayout,...val};applyUiLayout();}
  saveSettings();
}
function toggleSettings(){document.getElementById('settings-modal').classList.toggle('open');}
function toggleHostSettings(){const b=document.getElementById('host-settings-body');if(!b)return;const h=b.previousElementSibling;b.style.display=b.style.display==='none'?'':'none';if(h)h.textContent=b.style.display==='none'?'▶ ⚙ GAME SETTINGS':'▼ ⚙ GAME SETTINGS';}

// ★ 背景画像機能
let _bgImageUrl = null;
let _bgOpacity = 0.30;

function setBgImage(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    const dataUrl = e.target.result;
    try { localStorage.setItem('tetrix_bg_data', dataUrl); } catch(e) { console.warn('背景画像の保存に失敗しました（サイズ制限）', e); }
    if (_bgImageUrl) URL.revokeObjectURL(_bgImageUrl);
    _bgImageUrl = dataUrl;
    _applyBgImage();
    const nameEl = document.getElementById('bg-image-name');
    if (nameEl) nameEl.textContent = file.name;
  };
  reader.readAsDataURL(file);
}

function clearBgImage() {
  localStorage.removeItem('tetrix_bg_data');
  if (_bgImageUrl) { URL.revokeObjectURL(_bgImageUrl); _bgImageUrl = null; }
  _bgImageUrl = null;
  _applyBgImage();
  const nameEl = document.getElementById('bg-image-name');
  if (nameEl) nameEl.textContent = '未設定';
}

function updateBgOpacity(val) {
  _bgOpacity = parseInt(val) / 100;
  localStorage.setItem('tetrix_bg_opacity', _bgOpacity);
  document.getElementById('bg-opacity-val').textContent = val + '%';
  _applyBgImage();
}

function _applyBgImage() {
  const gameScreen = document.getElementById('game');
  const pixiContainer = document.getElementById('pixi-container');
  if (!_bgImageUrl) {
    const saved = localStorage.getItem('tetrix_bg_data');
    if (saved) _bgImageUrl = saved;
    const savedOpacity = localStorage.getItem('tetrix_bg_opacity');
    if (savedOpacity !== null) {
      _bgOpacity = parseFloat(savedOpacity);
      const valEl = document.getElementById('bg-opacity-val');
      const inputEl = document.getElementById('bg-opacity-input');
      if (valEl) valEl.textContent = Math.round(_bgOpacity * 100) + '%';
      if (inputEl) inputEl.value = Math.round(_bgOpacity * 100);
      }
    // PIXIのcanvasを半透明にして背景を透過
    const canvas = document.querySelector('#pixi-container canvas');
    if (canvas) {
      canvas.style.background = 'transparent';
      canvas.style.mixBlendMode = 'normal';
    }
    // pixiContainerの背景を暗いオーバーレイで調整
    if (pixiContainer) {
      pixiContainer.style.background = `rgba(3,7,18,${1 - _bgOpacity})`;
    }
    // PIXIアプリのbackgroundを透明に
    if (gameApp && gameApp.renderer) {
      try {
        gameApp.renderer.backgroundColor = 0x000000;
        gameApp.renderer.backgroundAlpha = 0;
        if (gameApp.view) gameApp.view.style.background = 'transparent';
      } catch(e) {}
    }
  } else {
    if (gameScreen) {
      gameScreen.style.backgroundImage = '';
      gameScreen.style.background = '';
    }
    if (pixiContainer) pixiContainer.style.background = '';
    const canvas = document.querySelector('#pixi-container canvas');
    if (canvas) { canvas.style.background = ''; canvas.style.mixBlendMode = ''; }
    // PIXIアプリのbackgroundを元に戻す
    if (gameApp && gameApp.renderer) {
      try {
        gameApp.renderer.backgroundColor = 0x030712;
        gameApp.renderer.backgroundAlpha = 1;
        if (gameApp.view) gameApp.view.style.background = '';
      } catch(e) {}
    }
  }
}
function resetAllSettings(){
  if(!confirm('全ての設定・名前・レイアウトをリセットしますか？')) return;
  document.cookie.split(';').forEach(c=>{
    const key=c.trim().split('=')[0];
    document.cookie=key+'=; max-age=0; path=/';
  });
  location.reload();
}
loadSettings();
// マイグレーション: 古いcookieにharddropがない場合はデフォルト値を補完
if (!settings.dpad.harddrop) {
  settings.dpad.harddrop = {x:20,y:80,size:80,opacity:80};
  saveSettings();
}
// マイグレーション: 古い位置(x>=68)のshift/harddrop/zを新しい左側配置にリセット
if (settings.dpad.shift.x >= 60 || settings.dpad.z.x >= 60) {
  settings.dpad.shift    = {x:2,  y:80, size:settings.dpad.shift.size||80, opacity:settings.dpad.shift.opacity||80};
  settings.dpad.harddrop = {x:20, y:80, size:settings.dpad.harddrop.size||80, opacity:settings.dpad.harddrop.opacity||80};
  settings.dpad.z        = {x:38, y:80, size:settings.dpad.z.size||80, opacity:settings.dpad.z.opacity||80};
  saveSettings();
}
// マイグレーション: harddropがzと同じy:80で重なっている場合は上にずらす
if (settings.dpad.harddrop.y === 80 && settings.dpad.harddrop.x >= 75 && settings.dpad.harddrop.x <= 85) {
  settings.dpad.harddrop.y = 68;
  saveSettings();
}

// ---- Socket ----
const socket=io({
  reconnection:true,
  reconnectionAttempts:Infinity,
  reconnectionDelay:1000,
  reconnectionDelayMax:5000,
});
let myId=null,roomId=null,myName='',isHost=false,roomPlayers=[];
let _reconnecting=false;
let shogiMode=false;
let isSoloGame=false;
let isOfflineSolo=false; // true when playing offline (no server)
let allspinMode=false;
let fortyLineMode=false;
let fortyLineTimer=null; // タイマーのsetInterval ID
let fortyLineStartTime=0;
let blitzMode=false;
let blitzTimer=null;
let blitzStartTime=0;
let cheeseMode=false;
let cheeseHandCount=0;
let cheeseTimer=null;
let cheeseStartTime=0;
let fourWideMode=false; // 4Wideモード（ボード幅4列）
let puyotetMode=false; // ぷよテトモード
let isSpectator=false; // 観戦モードフラグ
let myGameMode='tetris'; // 'tetris' or 'puyo' - this player's chosen mode
let playerModes={}; // map of playerId -> 'tetris'|'puyo'
// Offline solo: wrap socket.emit to be a no-op when offline
const _origSocketEmit = socket.emit.bind(socket);
socket.emit = function(...args){
  if(isOfflineSolo) return;
  return _origSocketEmit(...args);
};

socket.on('connect',()=>{
  myId=socket.id;
  if(_reconnecting){
    _reconnecting=false;
    const banner=document.getElementById('reconnect-banner');
    if(banner)banner.remove();
    // 切断前のルームへ再接続
    if(_lastUsedRoomId&&myName){
      socket.emit('rejoin_room',{roomId:_lastUsedRoomId,name:myName});
    } else if(myName){
      showGameLobby(_lastUsedRoomId);
    } else {
      document.getElementById('name-modal').classList.remove('hidden');
    }
  }
});
socket.on('disconnect',()=>{
  _reconnecting=true;
  // 再接続バナーを表示
  let banner=document.getElementById('reconnect-banner');
  if(!banner){
    banner=document.createElement('div');
    banner.id='reconnect-banner';
    banner.style.cssText='position:fixed;top:0;left:0;right:0;z-index:9999;background:rgba(255,0,110,0.85);color:#fff;font-family:Orbitron,sans-serif;font-size:0.8rem;text-align:center;padding:0.5rem;letter-spacing:0.1em;';
    banner.textContent='⚠ CONNECTION LOST — RECONNECTING...';
    document.body.appendChild(banner);
  }
});
socket.on('reconnect',()=>{
  const banner=document.getElementById('reconnect-banner');
  if(banner){banner.textContent='✓ RECONNECTED';setTimeout(()=>banner.remove(),1500);}
});

// ---- Screen ----
function applyUiLayout(){
  // ゲーム中なら boardWrap のY座標だけリアルタイム更新（スケール・その他は次ゲームで反映）
  if(typeof renderer!=='undefined'&&renderer&&renderer.boardWrap&&typeof renderer.mainBY==='number'){
    const ui=settings.uiLayout||{};
    const sc=renderer._uiScale||1;
    // BOARD_H=560, BOARD_W=280 (定数はグローバルスコープにある)
    const bh=(typeof BOARD_H!=='undefined'?BOARD_H:560)*sc;
    renderer.boardWrap.y=renderer.mainBY+bh/2+(renderer.boardOffsetY||0);
  }
}
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  // 設定ボタンはゲーム画面・ロビー・待機室でも表示
  const inGame=(id==='game');
  const showSettingsBtn=(id==='game'||id==='game-lobby'||id==='waiting');
  document.getElementById('settings-btn').style.display=showSettingsBtn?'block':'none';
  const sdBtn=document.getElementById('mobile-softdrop-btn');
  const lBtns=document.getElementById('mobile-left-btns');
  if(sdBtn)sdBtn.style.display='none';
  if(lBtns)lBtns.style.display='none';
  showDpad(inGame);
  const dpadBtnWrap=document.getElementById('dpad-layout-btn-wrap');
  if(dpadBtnWrap)dpadBtnWrap.style.display=(mobileControlsEnabled&&id==='game-lobby')?'block':'none';
}

// ---- Name Modal (initial screen) ----
function getSavedName(){
  try{const m=document.cookie.split(';').find(c=>c.trim().startsWith('tetrix_name='));return m?decodeURIComponent(m.split('=')[1].trim()):''}catch(e){return '';}
}
function saveName(name){
  document.cookie='tetrix_name='+encodeURIComponent(name)+'; max-age=31536000; path=/';
}
function submitNameModal(){
  const inp=document.getElementById('name-modal-input');
  const name=inp.value.trim();
  if(!name){inp.style.borderColor='#ff006e';setTimeout(()=>inp.style.borderColor='',800);return;}
  myName=name;
  saveName(name);
  document.getElementById('name-modal').classList.add('hidden');
  socket.emit('set_name',{name});
  showGameLobby(null);
}

// ─── Offline Solo Mode ──────────────────────────────────────
function startSoloOffline(){
  const inp=document.getElementById('name-modal-input');
  const name=inp.value.trim()||'PLAYER';
  myName=name;
  saveName(name);
  isOfflineSolo=true;
  isSoloGame=true;
  fourWideMode=false; puyotetMode=false;
  allspinMode=false;
  fortyLineMode=false;
  blitzMode=false;

  document.getElementById('name-modal').classList.add('hidden');
  showScreen('game');
  showDpad(true);
  setupDpadButtons();

  // Use a random seed
  const bagSeed=Math.floor(Math.random()*1000000);
  roomPlayers=[{id:'offline',name,isBot:false}];
  roomSettings={gravityBase:1000,gravityDec:80,gravityMin:50,lockDelay:500,multiplierDelayMin:1.6,multiplierIntervalSec:1,multiplierRate:0.03};

  showCountdown(bagSeed,()=>{
    if(myGameMode==='puyo') initPuyoGame(roomPlayers,bagSeed);
    else initGame(roomPlayers,bagSeed);
  });
}

// Override backToLobby for offline mode
const _origBackToLobby=backToLobby;

// ── ゲームオーバー後に観戦モードへ移行 ──────────────────────────
function _enterSpectateOnDeath(){
  if(isOfflineSolo||isSoloGame)return; // ソロなら不要
  // 2秒後（game over演出が終わった後）に観戦者へ
  setTimeout(()=>{
    if(gameState&&gameState.alive)return;
    if(puyoGameState&&puyoGameState.alive)return;
    // result-overlay が既に開いていれば観戦しない（game_end受信済み）
    if(document.getElementById('result-overlay').classList.contains('open'))return;
    // ── 全プレイヤーの盤面を一斉表示するSpectatorRendererに切り替え ──
    const alivePlayers=roomPlayers.filter(p=>p.id!==myId);
    if(alivePlayers.length>0){
      isSpectator=true;
      addChatSystem('👁 You are now spectating. Watching remaining players...');
      // 操作を無効化
      removeInput();
      stopDAS();stopSoftDrop();
      if(!gameApp)return;

      // 既存レンダラーを破棄して新しいSpectatorRendererを構築
      const oldRenderer=renderer;
      // 既存ボードデータを引き継ぐ
      const boardSnapshot={};
      if(oldRenderer&&oldRenderer.opBoardData){
        for(const pid in oldRenderer.opBoardData){
          const od=oldRenderer.opBoardData[pid];
          boardSnapshot[pid]={board:od.board,currentPiece:od.currentPiece,score:od.score,pps:od.pps,apm:od.apm,vs:od.vs,garbageQueue:od.garbageQueue};
        }
      }
      // PixiJSステージをクリアして新Rendererを生成
      gameApp.stage.removeChildren();
      const specPlayers=alivePlayers;
      renderer=new SpectatorRenderer(gameApp,specPlayers);
      // データ引き継ぎ
      specPlayers.forEach(p=>{
        const d=renderer.opBoardData[p.id];
        const snap=boardSnapshot[p.id];
        if(d&&snap){
          d.board=snap.board;
          d.currentPiece=snap.currentPiece;
          d.score=snap.score||0;
          d.pps=snap.pps||0;
          d.apm=snap.apm||0;
          d.vs=snap.vs||0;
          d.garbageQueue=snap.garbageQueue||[];
        }
      });
      renderer.drawAll();
      let _specLast2=performance.now();
      gameApp.ticker.add(()=>{const _now2=performance.now();const _dt2=Math.min(_now2-_specLast2,50);_specLast2=_now2;renderer.update(_dt2);});
      // スペクテーターバナーを表示
      const existing=document.getElementById('spectate-banner');
      if(!existing){
        const banner=document.createElement('div');
        banner.id='spectate-banner';
        banner.style.cssText='position:fixed;top:10px;left:50%;transform:translateX(-50%);background:rgba(255,190,11,0.15);border:1px solid rgba(255,190,11,0.5);color:#ffbe0b;padding:0.4rem 1.2rem;border-radius:20px;font-family:Orbitron,sans-serif;font-size:0.75rem;letter-spacing:0.1em;z-index:5000;text-align:center;pointer-events:none;';
        banner.innerHTML='👁 SPECTATING';
        document.body.appendChild(banner);
      }
    }
  },2000);
}

function _offlineSoloGameOverAutoReturn(){
  if(!isOfflineSolo)return;
  // すぐにタイトルへ戻す
  setTimeout(()=>backToLobby(),1000);
}

function backToLobby(){
  if(isOfflineSolo){
    isOfflineSolo=false;
    isSoloGame=false;
    if(gameApp){try{gameApp.destroy(true);}catch(e){}gameApp=null;}
    document.getElementById('name-modal').classList.remove('hidden');
    showDpad(false);
    return;
  }
  _origBackToLobby();
}

// ---- Mutation Mode ----
let mutationMode=false;
let mutationSeed=0;
let roomSettings={mutationRate:60,gravityBase:1000,gravityDec:80,gravityMin:50,lockDelay:1000,garbageMultiplier:2,multiplierDelayMin:1.6,multiplierIntervalSec:1,multiplierRate:0.03};

function toggleMutation(enabled){
  if(!isHost)return;
  mutationMode=enabled;
  socket.emit('set_mutation',{enabled,seed:mutationMode?Math.floor(Math.random()*1000000):0});
}

socket.on('mutation_update',({enabled,seed})=>{
  mutationMode=enabled;
  mutationSeed=seed;
  const row=document.getElementById('mutation-row-wrap');
  if(row){
    const cb=document.getElementById('mutation-toggle');
    if(cb)cb.checked=enabled;
  }
  addChatSystem(enabled?'⚡ MUTATION MODE: ON':'⚡ MUTATION MODE: OFF');
});

// ---- Seeded RNG for mutation (deterministic per piece index) ----
function mutationRng(seed){
  let s=seed>>>0;
  return function(){s=(Math.imul(s,1664525)+1013904223)>>>0;return s/0x100000000;};
}

// Global piece counter for deterministic mutation seed
let _pieceCounter=0;

// Apply mutation to a piece shape (returns new shape matrix or null if no mutation)
function applyMutation(type, shapeMatrix){
  if(!mutationMode) return null;
  // Each piece gets a deterministic mutation based on global piece index + mutationSeed
  const rng = mutationRng(mutationSeed ^ (_pieceCounter * 6364136223846793005 + 1442695040888963407 | 0));
  _pieceCounter++;

  // Use roomSettings.mutationRate (0-100) as the threshold
  const threshold = (roomSettings.mutationRate !== undefined ? roomSettings.mutationRate : 60) / 100;
  if(rng() > threshold) return null;

  // Deep copy the shape
  const shape = shapeMatrix.map(r=>[...r]);
  // Collect all filled cells and empty cells
  const filled=[];
  const empty=[];
  for(let r=0;r<shape.length;r++)for(let c=0;c<shape[r].length;c++){
    if(shape[r][c])filled.push([r,c]);
    else empty.push([r,c]);
  }
  if(filled.length===0) return null;

  // Pick mutation type by weighted random
  // 10% stack (double vertical), 20% remove1, 20% remove2, 20% add1, 10% remove3, 20% move1
  const roll=rng();
  // stack:0-0.10, remove1:0.10-0.30, remove2:0.30-0.50, add1:0.50-0.70, remove3:0.70-0.80, move1:0.80-1.0
  if(roll<0.10){
    // STACK: type-dependent direction
    // S, Z → stack vertically (縦につなげる)
    // L, J → stack horizontally (横につなげる)
    // Others → vertical (default)
    const stackHoriz = (type==='L'||type==='J');
    const newShape=shape.map(r=>[...r]);
    if(stackHoriz){
      // Horizontal stack: find rightmost col, attach same shape to the right
      const maxC=Math.max(...filled.map(([,c])=>c));
      const shift=maxC+1;
      for(const[r,c]of filled){
        const nc=c+shift;
        while(newShape[r].length<=nc)newShape[r].push(0);
        newShape[r][nc]=1;
      }
      // Ensure all rows same length
      const ml=Math.max(...newShape.map(r=>r.length));
      for(const r2 of newShape)while(r2.length<ml)r2.push(0);
    } else {
      // Vertical stack (S, Z, and all others): stack below
      const maxR=Math.max(...filled.map(([r])=>r));
      for(const[r,c]of filled){
        const nr=r+maxR+1;
        while(newShape.length<=nr)newShape.push(Array(shape[0].length).fill(0));
        newShape[nr][c]=1;
      }
    }
    return newShape;
  } else if(roll<0.30){
    // REMOVE 1 block
    if(filled.length<=1)return null;
    const idx=Math.floor(rng()*filled.length);
    const[r,c]=filled[idx];
    shape[r][c]=0;
    return shape;
  } else if(roll<0.50){
    // REMOVE 2 blocks
    if(filled.length<=2)return null;
    const idxA=Math.floor(rng()*filled.length);
    let idxB=Math.floor(rng()*(filled.length-1));
    if(idxB>=idxA)idxB++;
    shape[filled[idxA][0]][filled[idxA][1]]=0;
    shape[filled[idxB][0]][filled[idxB][1]]=0;
    return shape;
  } else if(roll<0.70){
    // ADD 1 block (I-piece: make lowercase "i" by moving far-end block 2 cells ahead)
    if(type==='I'){
      const minC=Math.min(...filled.map(([,c])=>c));
      const maxC=Math.max(...filled.map(([,c])=>c));
      const minR=Math.min(...filled.map(([r])=>r));
      const maxR=Math.max(...filled.map(([r])=>r));
      const isHoriz=(maxC-minC)>(maxR-minR);
      const newShape=shape.map(r=>[...r]);
      if(isHoriz){
        // Horizontal I: remove rightmost block, place it 2 further right -> [x][x][x][ ][x]
        const row=filled.find(([,c])=>c===maxC)[0];
        newShape[row][maxC]=0;
        const destC=maxC+2;
        while(newShape[row].length<=destC)newShape[row].push(0);
        newShape[row][destC]=1;
        const ml=Math.max(...newShape.map(r=>r.length));
        for(const r2 of newShape)while(r2.length<ml)r2.push(0);
      } else {
        // Vertical I: remove bottom block, place it 2 further down
        const col=filled.find(([r])=>r===maxR)[1];
        newShape[maxR][col]=0;
        const destR=maxR+2;
        while(newShape.length<=destR)newShape.push(Array(newShape[0].length).fill(0));
        newShape[destR][col]=1;
      }
      return newShape;
    } else {
      // Add 1 block adjacent to a random filled cell
      if(empty.length===0)return null;
      // Find empty cells adjacent to filled cells
      const adjEmpty=[];
      for(const[r,c]of filled){
        for(const[dr,dc]of[[-1,0],[1,0],[0,-1],[0,1]]){
          const nr=r+dr,nc=c+dc;
          if(nr>=0&&nr<shape.length&&nc>=0&&nc<shape[0].length&&!shape[nr][nc]){
            adjEmpty.push([nr,nc]);
          }
        }
      }
      if(adjEmpty.length===0)return null;
      const pick=adjEmpty[Math.floor(rng()*adjEmpty.length)];
      shape[pick[0]][pick[1]]=1;
      return shape;
    }
  } else if(roll<0.80){
    // REMOVE 3 blocks
    if(filled.length<=3)return null;
    const toRemove=[];
    const tmp=[...filled];
    for(let i=0;i<3;i++){
      const idx=Math.floor(rng()*tmp.length);
      toRemove.push(tmp.splice(idx,1)[0]);
    }
    for(const[r,c]of toRemove)shape[r][c]=0;
    return shape;
  } else {
    // MOVE 1 block to an adjacent empty cell
    if(filled.length<=1)return null;
    const idx=Math.floor(rng()*filled.length);
    const[r,c]=filled[idx];
    const dirs=[[-1,0],[1,0],[0,-1],[0,1]];
    const validMoves=dirs.filter(([dr,dc])=>{
      const nr=r+dr,nc=c+dc;
      return nr>=0&&nr<shape.length&&nc>=0&&nc<shape[0].length&&!shape[nr][nc];
    });
    if(validMoves.length===0)return null;
    const[dr,dc]=validMoves[Math.floor(rng()*validMoves.length)];
    shape[r][c]=0;
    shape[r+dr][c+dc]=1;
    return shape;
  }
}

// ---- Lobby ----
let _lastUsedRoomId=null; // ロビー戻り時に両フィールドへ復元するために保持

function createRoom(){
  const name=document.getElementById('player-name').value.trim();
  if(!name){showError('Enter your name');return;}
  const rid=document.getElementById('room-id-input').value.trim().toUpperCase();
  myName=name;
  // RoomIDが入力されていればそのコードで部屋を作る
  if(rid){socket.emit('create_room',{name,roomId:rid});}
  else{socket.emit('create_room',{name});}
}
function joinRoom(){const name=document.getElementById('player-name').value.trim();const rid=document.getElementById('room-id-input').value.trim().toUpperCase();if(!name){showError('Enter your name');return;}if(!rid){showError('Enter room ID');return;}myName=name;socket.emit('join_room',{roomId:rid,name});}
function showError(msg){const el=document.getElementById('lobby-error');if(el)el.textContent=msg;}
function leaveRoom(){
  socket.emit('leave_room');
  roomId=null;roomPlayers=[];
  document.getElementById('start-btn').style.display='none';
  if(myName){showGameLobby(null);}
  else{showScreen('lobby');}
}
function startGame(){socket.emit('start_game');}

function returnToRoom(){
  if(_autoReturnTimer){clearTimeout(_autoReturnTimer);_autoReturnTimer=null;}
  // ホストがルームに戻るとき全員に通知
  if(isHost && roomId) socket.emit('host_return_to_room');
  document.getElementById('result-overlay').classList.remove('open');
  const sb=document.getElementById('spectate-banner');if(sb)sb.remove();
  const fb=document.getElementById('force-end-btn');if(fb)fb.remove();
  stopDAS();stopSoftDrop();removeInput();removePuyoInput&&removePuyoInput();
  puyoGameState=null;
  // AllSpinオーバーレイを閉じる
  const ao=document.getElementById('allspin-overlay');if(ao)ao.classList.remove('active');
  asState=null; allspinMode=false;
  _stopFortyLineUI(); fortyLineMode=false;
  _stopBlitzUI(); blitzMode=false;
  _stopCheeseUI(); cheeseMode=false;
  renderer=null;isSpectator=false;
  if(gameApp){try{gameApp.destroy(true);}catch(e){}gameApp=null;}
  const prevRoomId = roomId || _lastUsedRoomId;
  roomId=null;roomPlayers=[];
  document.getElementById('start-btn').style.display='none';
  if(myName&&prevRoomId){
    // 前のルームへ再参加を試みる
    _lastUsedRoomId=prevRoomId;
    socket.emit('rejoin_room',{roomId:prevRoomId,name:myName});
  } else if(myName){
    showGameLobby(null);
  } else {
    showScreen('lobby');
  }
  showError('');
}

function backToLobby(){
  if(_autoReturnTimer){clearTimeout(_autoReturnTimer);_autoReturnTimer=null;}
  document.getElementById('result-overlay').classList.remove('open');
  const sb=document.getElementById('spectate-banner');if(sb)sb.remove();
  const fb=document.getElementById('force-end-btn');if(fb)fb.remove();
  stopDAS();stopSoftDrop();removeInput();removePuyoInput&&removePuyoInput();
  puyoGameState=null;
  // AllSpinオーバーレイを閉じる
  const ao=document.getElementById('allspin-overlay');if(ao)ao.classList.remove('active');
  asState=null; allspinMode=false;
  _stopFortyLineUI(); fortyLineMode=false;
  _stopBlitzUI(); blitzMode=false;
  _stopCheeseUI(); cheeseMode=false;
  if(gameApp){try{gameApp.destroy(true);}catch(e){}gameApp=null;}
  renderer=null;
  const prevRoomId=roomId||_lastUsedRoomId;
  // ルームから正しく退出
  if(roomId){socket.emit('leave_room');}
  roomId=null;roomPlayers=[];
  document.getElementById('start-btn').style.display='none';
  if(myName){
    showGameLobby(prevRoomId);
  } else {
    showScreen('lobby');
  }
  showError('');
}

// ---- Game Lobby ----
function showGameLobby(prevRoomId){
  document.getElementById('gl-player-name').textContent=myName.toUpperCase();
  document.getElementById('gl-error').textContent='';
  // Reset mode selection
  myGameMode='tetris';
  selectMyMode('tetris');
  const banner=document.getElementById('prev-room-banner');
  if(prevRoomId){
    document.getElementById('prev-room-id-display').textContent=prevRoomId;
    banner.style.display='flex';
    _lastUsedRoomId=prevRoomId;
  } else {
    banner.style.display='none';
  }
  showScreen('game-lobby');
  socket.emit('set_name',{name:myName});
  refreshRooms();
  socket.emit('get_online_players');
}

// ロビーからリプレイファイルを開く
function openReplayFromLobby(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.events) throw new Error('Invalid replay file');
      window._lastReplayData = data;
      showScreen('game');
      showDpad(false);
      openReplayViewer(data);
    } catch(err) {
      alert('リプレイファイルの読み込みに失敗しました: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function refreshRooms(){
  socket.emit('get_rooms');
}

socket.on('rooms_list',(list)=>{
  const el=document.getElementById('rooms-list');
  if(!el)return;
  if(!list||list.length===0){
    el.innerHTML='<div class="no-rooms">No open rooms</div>';return;
  }
  el.innerHTML=list.map(r=>`
    <div class="room-item" onclick="glJoinById('${r.id}')">
      <div>
        <div class="room-item-id">${r.id}</div>
        <div class="room-item-players">${r.players.join(', ')}</div>
      </div>
      <div class="room-item-join">${r.count}/3 JOIN ▶</div>
    </div>`).join('');
});

socket.on('online_players',(list)=>{
  const el=document.getElementById('online-players-list');
  const countEl=document.getElementById('online-count');
  if(!el)return;
  if(!list||list.length===0){
    el.innerHTML='<span class="no-players">None</span>';
    if(countEl)countEl.textContent='0';
    return;
  }
  el.innerHTML=list.map(n=>`<span class="online-player-tag">${n}</span>`).join('');
  if(countEl)countEl.textContent=list.length;
});

function glCreateRoom(){
  const rid=document.getElementById('gl-room-id-input').value.trim().toUpperCase();
  document.getElementById('gl-error').textContent='';
  if(rid)socket.emit('create_room',{name:myName,roomId:rid});
  else socket.emit('create_room',{name:myName});
}

function glJoinRoom(){
  const rid=document.getElementById('gl-join-id-input').value.trim().toUpperCase();
  if(!rid){document.getElementById('gl-error').textContent='Enter a Room ID';return;}
  glJoinById(rid);
}

function glJoinById(rid){
  document.getElementById('gl-error').textContent='';
  socket.emit('rejoin_room',{roomId:rid,name:myName});
}

function rejoinPrevRoom(){
  if(!_lastUsedRoomId)return;
  document.getElementById('gl-error').textContent='';
  socket.emit('rejoin_room',{roomId:_lastUsedRoomId,name:myName});
}

function selectMyMode(mode) {
  myGameMode = mode;
  if(!playerModes) playerModes={};
  playerModes[socket.id] = mode;
  socket.emit('set_player_mode', {mode});
  updatePlayerList(roomPlayers);
  const tBtn = document.getElementById('mode-tetris-btn');
  const pBtn = document.getElementById('mode-puyo-btn');
  const status = document.getElementById('mode-select-status');
  if (mode === 'tetris') {
    if(tBtn){tBtn.style.background='rgba(0,245,255,0.2)';tBtn.style.borderColor='var(--neon-cyan)';tBtn.style.color='var(--neon-cyan)';}
    if(pBtn){pBtn.style.background='rgba(10,15,30,0.5)';pBtn.style.borderColor='rgba(255,154,206,0.3)';pBtn.style.color='rgba(255,154,206,0.5)';}
    if(status) status.textContent='Tetris selected';
  } else {
    if(pBtn){pBtn.style.background='rgba(255,154,206,0.2)';pBtn.style.borderColor='rgba(255,154,206,0.9)';pBtn.style.color='#ff9ace';}
    if(tBtn){tBtn.style.background='rgba(10,15,30,0.5)';tBtn.style.borderColor='rgba(0,245,255,0.3)';tBtn.style.color='rgba(0,245,255,0.5)';}
    if(status) status.textContent='Puyo Puyo selected';
  }
}

function glBackToTitle(){
  myName='';roomId=null;_lastUsedRoomId=null;
  // Show name modal again instead of old lobby
  document.getElementById('name-modal').classList.remove('hidden');
  document.getElementById('screens').querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
}

// game-lobbyのerrorはgl-errorに表示
const _origShowError=showError;
socket.on('error',({msg})=>{
  const glErr=document.getElementById('gl-error');
  if(document.getElementById('game-lobby').classList.contains('active')&&glErr){
    glErr.textContent=msg;
  } else {
    showError(msg);
  }
});

socket.on('bot_code_status',({active})=>{
  _hasCustomBotCode=!!active;
  const el=document.getElementById('bot-code-status');
  if(el)el.textContent=active?'✅ Custom bot code active':'';
  // Update bot list badges
  const bl=document.getElementById('bot-list');
  if(bl)updateBotList(roomPlayers);
});

socket.on('bot_code_error',({type,botName,message})=>{
  const el=document.getElementById('bot-code-status');
  if(!el)return;
  const label=type==='parse'?'⚠ 構文エラー':'⚠ 実行時エラー';
  el.innerHTML=`<span style="color:#ff4d4d">${label} [${esc(botName)}]: ${esc(message)}</span>`;
  el.title=message;
});

socket.on('rejoin_result',({success,roomId:rid,players,host,mutationMode:mu,mutationSeed:ms,roomSettings:rs})=>{
  if(!success){
    if(myName)showGameLobby(null);
    else document.getElementById('name-modal').classList.remove('hidden');
    return;
  }
  roomId=rid;roomPlayers=players;
  isHost=(socket.id===host);
  if(mu!==undefined){mutationMode=mu;mutationSeed=ms||0;}
  if(rs){roomSettings={...roomSettings,...rs};}
  document.getElementById('room-id-display').textContent=rid;
  updatePlayerList(players);
  document.getElementById('start-btn').style.display=isHost&&(players.length>=2||(rs&&(rs.soloMode||rs.allspinMode||rs.fortyLineMode||rs.cheeseMode)&&players.length>=1))?'block':'none';
  document.getElementById('wait-status').textContent=players.length<2?'Waiting for players... (min 2)':`${players.length} players ready`;
  const mrow=document.getElementById('mutation-row-wrap');
  if(mrow)mrow.style.display=isHost?'flex':'none';
  const cb=document.getElementById('mutation-toggle');if(cb)cb.checked=!!mu;
  if(rs)updateRoomSettingsUI(rs);
  const hostControls=document.getElementById('host-settings-wrap');
  const viewOnly=document.getElementById('settings-view-wrap');
  if(hostControls)hostControls.style.display=isHost?'block':'none';
  if(viewOnly)viewOnly.style.display=!isHost&&rs?'block':'none';
  showScreen('waiting');
});

socket.on('room_created',({roomId:rid,players})=>{
  roomId=rid;_lastUsedRoomId=rid;roomPlayers=players;isHost=true;
  // 保存済み設定があれば復元
  try{const saved=localStorage.getItem('tetris_roomSettings');if(saved){const p=JSON.parse(saved);Object.assign(roomSettings,p);}}catch(e){}
  document.getElementById('room-id-display').textContent=rid;
  showScreen('waiting');updatePlayerList(players);
  resetRoomInactivityTimer();
  document.getElementById('mutation-row-wrap').style.display='flex';
  document.getElementById('host-settings-wrap').style.display='block';
  document.getElementById('settings-view-wrap').style.display='none';
  updateRoomSettingsUI(roomSettings);
  // Push initial settings to server
  socket.emit('set_room_settings', roomSettings);
});
socket.on('room_joined',({roomId:rid,players})=>{
  roomId=rid;_lastUsedRoomId=rid;roomPlayers=players;isHost=false;
  document.getElementById('room-id-display').textContent=rid;
  showScreen('waiting');updatePlayerList(players);
  document.getElementById('mutation-row-wrap').style.display='none';
  document.getElementById('host-settings-wrap').style.display='none';
});
socket.on('player_modes_update',({playerModes:pm})=>{
  playerModes=pm||{};
  // Update player list display to show modes
  roomPlayers.forEach(p=>{
    const mode=pm[p.id];
    if(mode){p._gameMode=mode;}
  });
  updatePlayerList(roomPlayers);
});

socket.on('room_update',({players,host,started,mutationMode:mu,mutationSeed:ms,roomSettings:rs,hasCustomCode:hcc,playerModes:pm})=>{
  roomPlayers=players;isHost=(socket.id===host);
  if(pm) playerModes=pm;
  updatePlayerList(players);
  _hasCustomBotCode=!!hcc;
  if(!started)resetRoomInactivityTimer();
  else{if(_roomInactivityTimer)clearTimeout(_roomInactivityTimer);_removeInactivityBtn();}
  const total=players.length;
  const isSoloAllowed=rs&&(rs.soloMode||rs.allspinMode||rs.fortyLineMode||rs.cheeseMode);
  const canStart=isHost&&!started&&(total>=2||(isSoloAllowed&&total>=1));
  document.getElementById('start-btn').style.display=canStart?'block':'none';
  const feb=document.getElementById('force-end-waiting-btn');
  if(feb)feb.style.display=(isHost&&started)?'block':'none';
  document.getElementById('wait-status').textContent=started?'⚔ Match in progress...':(total<2?(isSoloAllowed?`${total} player — solo mode ON`:'Waiting for players... (add a BOT or friend)'):`${total} players ready`);
  if(mu!==undefined){mutationMode=mu;mutationSeed=ms||0;const cb=document.getElementById('mutation-toggle');if(cb)cb.checked=mu;}
  if(rs){roomSettings={...roomSettings,...rs};updateRoomSettingsUI(rs);}
  const hostControls=document.getElementById('host-settings-wrap');
  const viewOnlySettings=document.getElementById('settings-view-wrap');
  if(hostControls)hostControls.style.display=isHost?'block':'none';
  if(viewOnlySettings)viewOnlySettings.style.display=!isHost?'block':'none';
  const mrow=document.getElementById('mutation-row-wrap');
  if(mrow)mrow.style.display=isHost?'flex':'none';
});
socket.on('player_left',()=>addChatSystem('Player left'));

// 観戦モード: 試合中に入室した場合
socket.on('spectate_joined',({roomId:rid,players,host})=>{
  roomId=rid;_lastUsedRoomId=rid;roomPlayers=players;
  isHost=(socket.id===host);
  isSpectator=true;
  addChatSystem('👁 Spectating match in progress...');
  showScreen('game');
  showDpad(false);
  const container=document.getElementById('pixi-container');
  container.innerHTML='';
  const W=container.clientWidth||window.innerWidth,H=container.clientHeight||window.innerHeight;
  const res=settings.quality==='minimum'||settings.quality==='low'?1:settings.quality==='medium'?1.5:settings.quality==='ultra'?2.5:2;
  gameApp=new PIXI.Application({width:W,height:H,backgroundColor:0x030712,backgroundAlpha:1,transparent:true,antialias:settings.quality!=='minimum'&&settings.quality!=='low',resolution:res,autoDensity:true});
  gameApp.ticker.maxFPS = settings.maxFPS||144;
  container.appendChild(gameApp.view);
  _applyBgImage();
  gameState=null;
  // 観戦専用レンダラー: 全プレイヤーのボードを均等に並べて表示
  renderer=new SpectatorRenderer(gameApp,players);
  // 既存ボードデータを反映
  players.forEach(p=>{
    const d=renderer.opBoardData[p.id];
    if(d&&p.board)d.board=p.board;
  });
  renderer.drawAll();
  let _specLast=performance.now();
  gameApp.ticker.add(()=>{const _now=performance.now();const _dt=Math.min(_now-_specLast,50);_specLast=_now;renderer.update(_dt);});
  // 観戦中バナー
  const banner=document.createElement('div');
  banner.id='spectate-banner';
  banner.style.cssText='position:fixed;top:10px;left:50%;transform:translateX(-50%);background:rgba(255,190,11,0.15);border:1px solid rgba(255,190,11,0.5);color:#ffbe0b;padding:0.4rem 1.2rem;border-radius:20px;font-family:Orbitron,sans-serif;font-size:0.75rem;letter-spacing:0.1em;z-index:100;pointer-events:none;';
  banner.textContent='👁 SPECTATING';
  document.body.appendChild(banner);
  // ホストなら強制終了ボタンを表示
  if(isHost){
    const fbtn=document.createElement('button');
    fbtn.id='force-end-btn';
    fbtn.textContent='⏹ FORCE END';
    fbtn.style.cssText='position:fixed;top:10px;right:12px;background:rgba(255,0,110,0.2);border:1px solid rgba(255,0,110,0.6);color:#ff006e;padding:0.4rem 1rem;border-radius:8px;font-family:Orbitron,sans-serif;font-size:0.7rem;cursor:pointer;z-index:100;letter-spacing:0.05em;';
    fbtn.onclick=forceEndGame;
    document.body.appendChild(fbtn);
  }
});

function forceEndGame(){
  if(!confirm('試合を強制終了しますか？')) return;
  socket.emit('force_end_game');
}

function updateRoomSettingsUI(rs){
  const mr=document.getElementById('mutation-rate-input');if(mr){mr.value=rs.mutationRate??60;document.getElementById('mutation-rate-val').textContent=(rs.mutationRate??60)+'%';}
  const gb=document.getElementById('gravity-base-input');if(gb){gb.value=rs.gravityBase??1000;document.getElementById('gravity-base-val').textContent=(rs.gravityBase??1000)+'ms';}
  const gd=document.getElementById('gravity-dec-input');if(gd){gd.value=rs.gravityDec??80;document.getElementById('gravity-dec-val').textContent=(rs.gravityDec??80)+'ms';}
  const gm=document.getElementById('gravity-min-input');if(gm){gm.value=rs.gravityMin??50;document.getElementById('gravity-min-val').textContent=(rs.gravityMin??50)+'ms';}
  const ld=document.getElementById('lock-delay-input');if(ld){ld.value=rs.lockDelay??1000;document.getElementById('lock-delay-val').textContent=(rs.lockDelay??1000)+'ms';}
  const bl=document.getElementById('bot-level-input');if(bl){bl.value=rs.botLevel??3;document.getElementById('bot-level-val').textContent=getBotLevelLabel(rs.botLevel??3);}
  const sg=document.getElementById('shogi-toggle');if(sg)sg.checked=!!(rs.shogiMode);
  const soloTog=document.getElementById('solo-toggle');if(soloTog)soloTog.checked=!!(rs.soloMode);
  const asTog=document.getElementById('allspin-toggle');if(asTog)asTog.checked=!!(rs.allspinMode);
  const flTog=document.getElementById('fortyline-toggle');if(flTog)flTog.checked=!!(rs.fortyLineMode);
  const chTog=document.getElementById('cheese-toggle');if(chTog)chTog.checked=!!(rs.cheeseMode);
  const blTog=document.getElementById('blitz-toggle');if(blTog)blTog.checked=!!(rs.blitzMode);
  const fwTog=document.getElementById('fourwide-toggle');if(fwTog)fwTog.checked=!!(rs.fourWideMode);
  const ptTog=document.getElementById('puyotet-toggle');if(ptTog)ptTog.checked=!!(rs.puyotetMode);
  const recTog=document.getElementById('record-training-toggle');if(recTog)recTog.checked=!!(rs.recordTraining);
  const brInput=document.getElementById('board-rows-input');
  const brVal=document.getElementById('board-rows-val');
  if(brInput){brInput.value=rs.boardRows??20;if(brVal)brVal.textContent=rs.boardRows??20;}
  const gmInput=document.getElementById('garbage-mult-input');
  const gmVal=document.getElementById('garbage-mult-val');
  if(gmInput){gmInput.value=rs.garbageMultiplier??2;if(gmVal)gmVal.textContent=rs.garbageMultiplier??2;}
  const mdInput=document.getElementById('mult-delay-input');
  const mdVal=document.getElementById('mult-delay-val');
  if(mdInput){mdInput.value=rs.multiplierDelayMin??1.6;if(mdVal)mdVal.textContent=(rs.multiplierDelayMin??1.6).toFixed(1);}
  const miInput=document.getElementById('mult-interval-input');
  const miVal=document.getElementById('mult-interval-val');
  if(miInput){miInput.value=rs.multiplierIntervalSec??1;if(miVal)miVal.textContent=(rs.multiplierIntervalSec??1).toFixed(1);}
  const mrInput=document.getElementById('mult-rate-input');
  const mrVal=document.getElementById('mult-rate-val');
  if(mrInput){mrInput.value=rs.multiplierRate??0.03;if(mrVal)mrVal.textContent=(rs.multiplierRate??0.03).toFixed(3);}
  // Bot不可設定のときはAdd Botを無効化
  const addBtn=document.getElementById('add-bot-btn');
  const customCodeSection=document.querySelector('#host-settings-wrap .hs-panel>div:last-child');
  const rows=rs.boardRows||20;
  if(addBtn){
    if(rows!==20){
      addBtn.disabled=true;addBtn.style.opacity='0.3';addBtn.style.cursor='not-allowed';
      addBtn.title='Board Heightが20以外のときはBotを追加できません';
      if(customCodeSection)customCodeSection.style.display='none';
    }else{
      addBtn.disabled=false;addBtn.style.opacity='';addBtn.style.cursor='';
      addBtn.title='';
      if(customCodeSection)customCodeSection.style.display='';
    }
  }
  const vo=document.getElementById('settings-view-content');
  if(vo&&rs){
    const modeStr=mutationMode?`ON (${rs.mutationRate??60}%)`:'OFF';
    const spd=rs.gravityBase??1000;
    const spdLabel=spd>=1500?'SLOW':spd>=900?'NORMAL':spd>=500?'FAST':'VERY FAST';
    const bots=roomPlayers.filter(p=>p.isBot);
    const botStr=bots.length>0?bots.map(b=>`${b.name} ${b.botLevel===6?'CC':'Lv.'+b.botLevel}`).join(', '):'None';
    const gmLabel=rs.puyotetMode?`×${rs.garbageMultiplier??2}`:'—';
    const md=(rs.multiplierDelayMin??1.6).toFixed(1)+'min';const mi=(rs.multiplierIntervalSec??1).toFixed(1)+'s';const mr=(rs.multiplierRate??0.03).toFixed(3);
vo.innerHTML=`<div class="settings-view-row"><span>⚡ Mutation</span><span style="color:var(--neon-cyan)">${modeStr}</span></div><div class="settings-view-row"><span>⏩ Speed</span><span style="color:var(--neon-yellow)">${spdLabel}</span></div><div class="settings-view-row"><span>🔒 Lock Delay</span><span style="color:var(--neon-yellow)">${rs.lockDelay??1000}ms</span></div><div class="settings-view-row"><span>🤖 BOT(s)</span><span style="color:var(--neon-cyan)">${botStr}</span></div><div class="settings-view-row"><span>📏 Board Height</span><span style="color:var(--neon-cyan)">${rows}</span></div><div class="settings-view-row"><span>🔄 Garbage Rate</span><span style="color:var(--neon-yellow)">${gmLabel}</span></div><div class="settings-view-row"><span>⏱ Mult</span><span style="color:rgba(255,200,100,0.8)">${md}/${mi}/${mr}</span></div>${rs.shogiMode?'<div class="settings-view-row"><span>♟ Shogi</span><span style="color:var(--neon-yellow)">ON</span></div>':''}${rs.soloMode?'<div class="settings-view-row"><span>🎮 Solo</span><span style="color:var(--neon-cyan)">ON</span></div>':''}${rs.cheeseMode?'<div class="settings-view-row"><span>🧀 Cheese</span><span style="color:var(--neon-yellow)">ON</span></div>':''}${rs.puyotetMode?'<div class="settings-view-row"><span>🍬 PuyoTet</span><span style="color:var(--neon-pink)">ON</span></div>':''}${rs.recordTraining?'<div class="settings-view-row"><span>🔴 Recording</span><span style="color:#ff006e">ON</span></div>':''}`;
  }
}
function getBotLevelLabel(lvl){
  return ['','BEGINNER','EASY','STRONG','EXPERT','GOD','COLD CLEAR'][lvl]||'STRONG';
}
function _saveRoomSettings(){
  try{localStorage.setItem('tetris_roomSettings',JSON.stringify(roomSettings));}catch(e){}
}
function updateRoomSetting(key,val){
  const boolKeys=['shogiMode','soloMode','recordTraining','allspinMode','fortyLineMode','cheeseMode','blitzMode','fourWideMode','puyotetMode'];
  const floatKeys=['multiplierDelayMin','multiplierIntervalSec','multiplierRate'];
  let parsed;
  if(boolKeys.includes(key)) parsed=!!val;
  else if(floatKeys.includes(key)) parsed=parseFloat(val)||0;
  else parsed=parseInt(val)||0;
  roomSettings[key]=parsed;
  socket.emit('set_room_settings',{[key]:parsed});
  updateRoomSettingsUI(roomSettings);
  _saveRoomSettings();
}

function addBot(){
  const lvl=parseInt(document.getElementById('bot-level-input')?.value)||roomSettings.botLevel||3;
  const fi=document.getElementById('bot-code-input');
  const file=fi&&fi.files[0]?fi.files[0]:null;
  const fname=file?file.name.replace(/\.[^.]+$/, ''):null;
  if(file){
    // ファイルが選択されている場合、コードをadd_botと同時に送信する（競合状態を回避）
    const reader=new FileReader();
    reader.onload=(e)=>{
      const code=e.target.result;
      document.getElementById('bot-code-status').textContent='✅ Uploaded: '+file.name;
      _hasCustomBotCode=true;
      if(typeof updateBotList==='function')updateBotList(roomPlayers);
      socket.emit('add_bot',{botLevel:lvl,botFileName:fname,botCode:code});
    };
    reader.readAsText(file);
  } else {
    socket.emit('add_bot',{botLevel:lvl,botFileName:fname});
  }
}

let _hasCustomBotCode=false;

function uploadBotCode(){
  const input=document.getElementById('bot-code-input');
  const file=input&&input.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=(e)=>{
    socket.emit('upload_bot_code',{code:e.target.result,filename:file.name.replace(/\.[^.]+$/,'')});
    document.getElementById('bot-code-status').textContent='✅ Uploaded: '+file.name;
    _hasCustomBotCode=true;
    if(typeof updateBotList==='function')updateBotList(roomPlayers);
  };
  reader.readAsText(file);
}

function clearBotCode(){
  document.getElementById('bot-code-input').value='';
  document.getElementById('bot-code-status').textContent='🗑 Cleared';
  _hasCustomBotCode=false;
  socket.emit('clear_bot_code');
}

function kickBot(botId){
  socket.emit('kick_bot',{botId});
}

function updateBotList(players){
  const bots=players.filter(p=>p.isBot);
  const el=document.getElementById('bot-list');
  if(!el)return;
  el.innerHTML=bots.map(b=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:0.3rem 0;border-bottom:1px solid rgba(255,255,255,0.05)"><span style="color:rgba(255,255,255,0.7);font-size:0.75rem">${esc(b.name)} <span style="color:var(--neon-yellow)">${b.botLevel===6?'CC':'Lv.'+b.botLevel}</span>${_hasCustomBotCode?'<span style="color:#00f5ff;font-size:0.6rem;margin-left:0.3rem">[CUSTOM]</span>':''}</span><button onclick="kickBot('${b.id}')" style="background:rgba(255,0,110,0.2);border:1px solid rgba(255,0,110,0.4);color:#ff006e;border-radius:4px;padding:0.15rem 0.5rem;cursor:pointer;font-size:0.7rem">KICK</button></div>`).join('');
}

function updatePlayerList(players){
  document.getElementById('player-list').innerHTML=players.map((p,i)=>{
    const mode = (playerModes[p.id] || 'tetris').toUpperCase();
    const modeColor = mode==='TETRIS'?'var(--neon-cyan)':'var(--neon-pink)';
    return `<div class="player-item">
      <div class="player-avatar" style="${p.isBot?'background:rgba(255,190,11,0.2);border-color:rgba(255,190,11,0.5);color:#ffbe0b':''}">${p.name[0].toUpperCase()}</div>
      <div style="display:flex;flex-direction:column;margin-left:0.5rem">
        <span style="font-weight:700">${p.name}${p.isBot?` <span style="color:var(--neon-yellow);font-size:0.7rem">${p.botLevel===6?'CC':'Lv.'+p.botLevel}</span>`:''}</span>
        <span style="font-size:0.6rem;color:${modeColor};letter-spacing:0.1em">${mode}</span>
      </div>
      ${i===0&&!p.isBot?'<span class="host-badge">HOST</span>':''}
    </div>`;
  }).join('');
  if(isHost)updateBotList(players);
}

// ---- Countdown then start ----
socket.on('game_start',({players,bagSeed,mutationMode:mu,mutationSeed:ms,roomSettings:rs,shogiMode:sm,isSolo:solo,allspinMode:asm,fortyLineMode:flm,cheeseMode:chm,blitzMode:blm,fourWideMode:fwm,puyotetMode:ptm,boardRows:br,playerModes:pm})=>{
  // ゲーム開始時は非アクティブタイマーをクリア
  if(_roomInactivityTimer)clearTimeout(_roomInactivityTimer);
  _removeInactivityBtn();
  // 観戦モードをリセット（前の試合で観戦モードになっていた場合）
  isSpectator=false;
  const sb=document.getElementById('spectate-banner');if(sb)sb.remove();
  roomPlayers=players;
  mutationMode=!!mu;
  mutationSeed=ms||0;
  shogiMode=!!sm;
  isSoloGame=!!solo;
  allspinMode=!!asm;
  fortyLineMode=!!flm;
  blitzMode=!!blm;
  cheeseMode=!!chm;
  fourWideMode=!!fwm;
  puyotetMode=!!ptm;
  if(pm) playerModes=pm;
  if(rs)roomSettings={...roomSettings,...rs};
  ROWS=Math.max(20,Math.min(100,parseInt(br)||20));
  _pieceCounter=0;
  // 通常マルチプレイ: リプレイ記録開始
  if(!fortyLineMode&&!cheeseMode&&!blitzMode){
    ReplayRecorder.start({
      players, bagSeed, myId, playerName: myName,
      roomPlayers: [...roomPlayers],
      mode: roomSettings.puyotetMode?'puyotet':'multi',
    });
  }
  showScreen('game');
  showDpad(true);
  setupDpadButtons();
  if(allspinMode){
    showCountdown(bagSeed,()=>initAllSpinGame(players,bagSeed));
  } else if(fortyLineMode){
    showCountdown(bagSeed,()=>initFortyLineGame(players,bagSeed));
  } else if(cheeseMode){
    showCountdown(bagSeed,()=>initCheeseGame(players,bagSeed));
  } else if(blitzMode){
    showCountdown(bagSeed,()=>initBlitzGame(players,bagSeed));
  } else if(myGameMode==='puyo'){
    showCountdown(bagSeed,()=>initPuyoGame(players,bagSeed));
  } else {
    showCountdown(bagSeed,()=>initGame(players,bagSeed));
  }
  if(sm)addChatSystem('♟ SHOGI MODE: BOT responds to each of your moves!');
  if(solo)addChatSystem('🎮 SOLO MODE — survive as long as possible!');
  if(asm)addChatSystem('🌀 ALLSPIN MODE — スピンをマスターせよ！');
  if(flm)addChatSystem('📦 40 LINE MODE — 40ラインをできるだけ速くクリア！');
  if(chm)addChatSystem('🧀 CHEESE MODE — せり上がりゴミに耐えて40ラインクリア！');
  if(blm)addChatSystem('⚡ BLITZ MODE — 2分間でスコアを稼げ！');
  if(fwm)addChatSystem('◼ 4WIDE MODE — 横4列でプレイ！');
  if(ptm)addChatSystem('🍬 PUYOTET MODE — 足し算REN・即時ゴミ！');
  if(rs&&rs.recordTraining)addChatSystem('🔴 Recording training data...');
  if(_hasCustomBotCode)addChatSystem('🤖 Bots are running CUSTOM AI code!');
});

const ANIM_SPEED = 1.0;

// PixiJS tickerのFPS上限を上げる（デフォルト60→120）
PIXI.Ticker.shared.maxFPS = settings.maxFPS||144; // 設定可能fps上限

// ---- Seeded RNG ----
function seededRng(seed){
  let s=seed>>>0;
  return function(){
    s=(Math.imul(s,1664525)+1013904223)>>>0;
    return s/0x100000000;
  };
}

function showCountdown(bagSeed,cb){
  _recalcBoardSize(); // 4wideモードに応じてBOARD_W/Hを更新
  const container=document.getElementById('pixi-container');
  container.innerHTML='';
  const W=container.clientWidth||window.innerWidth,H=container.clientHeight||window.innerHeight;
  const res=settings.quality==='minimum'||settings.quality==='low'?1:settings.quality==='medium'?1.5:settings.quality==='ultra'?2.5:2;
  gameApp=new PIXI.Application({width:W,height:H,backgroundColor:0x030712,backgroundAlpha:1,transparent:true,antialias:settings.quality!=='minimum'&&settings.quality!=='low',resolution:res,autoDensity:true});
  gameApp.ticker.maxFPS = settings.maxFPS||144;
  container.appendChild(gameApp.view);
  _applyBgImage();
  gameState=new TetrisGame(bagSeed);
  renderer=new GameRenderer(gameApp,roomPlayers,gameState);
  renderer.drawBoard();renderer.drawGhost();renderer.drawCurrent();
  renderer.drawNextPieces();renderer.drawHold();renderer.updateScoreUI();

  const wrap=document.createElement('div');
  wrap.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:10;pointer-events:none;';
  const num=document.createElement('div');
  num.style.cssText='font-family:Orbitron,sans-serif;font-size:10rem;font-weight:900;color:#00f5ff;text-shadow:0 0 60px #00f5ff;';
  wrap.appendChild(num);container.appendChild(wrap);
  const colors=['#ff006e','#ffbe0b','#00f5ff'];
  let n=3;
  const tick=()=>{
    num.textContent=n;
    num.style.color=colors[n-1]||'#00f5ff';
    num.style.transition='none';num.style.transform='scale(2.5)';num.style.opacity='0';num.style.filter='blur(6px)';
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      num.style.transition='transform 0.45s cubic-bezier(0.17,0.67,0.35,1.25),opacity 0.3s,filter 0.35s';
      num.style.transform='scale(1)';num.style.opacity='1';num.style.filter='blur(0)';
    }));
    SFX.countdownBeep(n);
    setTimeout(()=>{num.style.transition='all 0.3s ease-in';num.style.opacity='0';num.style.filter='blur(4px)';},650);
    n--;
    if(n>0)setTimeout(tick,1000);
    else setTimeout(()=>{
      num.textContent='GO!';num.style.color='#ffbe0b';
      num.style.transition='none';num.style.transform='scale(2.5)';num.style.opacity='0';num.style.filter='blur(6px)';
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        num.style.transition='all 0.4s cubic-bezier(0.17,0.67,0.35,1.3)';
        num.style.transform='scale(1)';num.style.opacity='1';num.style.filter='blur(0)';
      }));
      SFX.countdownGo();
      setTimeout(()=>{wrap.remove();cb();},700);
    },1000);
  };
  tick();
}

// ---- Audio ----
let sfxVol=settings.sfxVolume/100;
const AudioCtx=window.AudioContext||window.webkitAudioContext;
let audioCtx=null;
function getAudio(){if(!audioCtx)audioCtx=new AudioCtx();return audioCtx;}
function playTone(freq,type,dur,vol=1,detuneCents=0){
  try{
    const ctx=getAudio(),osc=ctx.createOscillator(),g=ctx.createGain();
    osc.connect(g);g.connect(ctx.destination);
    osc.type=type;
    osc.frequency.setValueAtTime(freq,ctx.currentTime);
    if(detuneCents)osc.detune.setValueAtTime(detuneCents,ctx.currentTime);
    g.gain.setValueAtTime(vol*sfxVol,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur);
    osc.start();osc.stop(ctx.currentTime+dur);
  }catch(e){}
}
function playNoise(dur,vol=0.3,bandFreq=800){
  try{const ctx=getAudio(),buf=ctx.createBuffer(1,ctx.sampleRate*dur,ctx.sampleRate),data=buf.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;const src=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=bandFreq;src.buffer=buf;src.connect(f);f.connect(g);g.connect(ctx.destination);g.gain.setValueAtTime(vol*sfxVol,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur);src.start();src.stop(ctx.currentTime+dur);}catch(e){}
}

// REN音程: ゲーム開始時にリセット、1RENごとに半音(2^(1/12)倍)上がる
let renSemitone=0;
const REN_BASE_FREQ=280; // 基準周波数

const SFX={
  move:()=>playTone(200,'square',0.04,0.25),
  rotate:()=>playTone(440,'square',0.07,0.35),
  lock:()=>{playNoise(0.1,0.45);playTone(100,'sawtooth',0.12,0.25);},
  spinLock:()=>{
    playNoise(0.04,0.9,1500);playTone(900,'square',0.03,0.7);
    setTimeout(()=>{playNoise(0.03,0.5,600);playTone(400,'sawtooth',0.05,0.3);},35);
  },
  clear1:()=>{playTone(523,'square',0.1,0.5);setTimeout(()=>playTone(659,'square',0.1,0.4),60);},
  clear2:()=>{[523,659,784].forEach((f,i)=>setTimeout(()=>playTone(f,'square',0.1,0.5),i*50));},
  clear3:()=>{[523,659,784,1047].forEach((f,i)=>setTimeout(()=>playTone(f,'square',0.1,0.55),i*45));},
  tetris:()=>{[523,659,784,1047,1319].forEach((f,i)=>setTimeout(()=>playTone(f,'square',0.13,0.65),i*45));setTimeout(()=>playNoise(0.25,0.3),200);},
  tspin:()=>{[700,550,400,700].forEach((f,i)=>setTimeout(()=>playTone(f,'sawtooth',0.09,0.55),i*55));},
  hardDrop:()=>{playTone(130,'sawtooth',0.09,0.5);playNoise(0.07,0.4);},
  hold:()=>playTone(320,'triangle',0.09,0.4),
  garbage:()=>{playTone(90,'sawtooth',0.18,0.5);playNoise(0.12,0.35,400);},
  garbageReceive:()=>{
    playTone(55,'sawtooth',0.35,0.65);playNoise(0.25,0.55,180);
    setTimeout(()=>playTone(75,'square',0.2,0.45),90);
    setTimeout(()=>playTone(60,'sawtooth',0.28,0.4),200);
  },
  gameover:()=>{[440,415,392,370,349,330].forEach((f,i)=>setTimeout(()=>playTone(f,'sawtooth',0.28,0.5),i*130));},
  // REN: ren数を直接受け取って半音計算 — グローバル変数不要で確実
  ren:(renCount)=>{
    // renCount=2から: 全音(2半音)ずつ上がる
    const semitone=(renCount-1)*2;
    const freq=REN_BASE_FREQ*Math.pow(2,semitone/12);
    playTone(freq,'square',0.15,0.6);
    if(renCount>=4)setTimeout(()=>playTone(freq*2,'square',0.08,0.3),45);
  },
  renReset:()=>{},
  b2b:()=>{playTone(880,'square',0.12,0.5);setTimeout(()=>playTone(1100,'square',0.09,0.35),80);},
  allClear:()=>{[523,659,784,1047,1319,1047,784,1319].forEach((f,i)=>setTimeout(()=>playTone(f,'square',0.12,0.75),i*55));},
  countdownBeep:(n)=>playTone(n===1?880:440,'square',0.14,0.55),
  countdownGo:()=>{[440,660,880,1100].forEach((f,i)=>setTimeout(()=>playTone(f,'square',0.12,0.7),i*70));},
  attack:()=>{playTone(220,'sawtooth',0.08,0.45);setTimeout(()=>playTone(330,'square',0.06,0.3),60);},
};

// ---- Constants ----
const COLS=10,HIDDEN=7;let ROWS=20;
const COLS_4WIDE=4;
// ゲーム中の実効列数（4wideモードで切り替わる）
function getGameCols(){return fourWideMode?COLS_4WIDE:COLS;}
// Sミノを黄緑(0x8BC34A)に変更
const PIECE_COLORS={I:0x00f5ff,O:0xffbe0b,T:0xcc00ff,S:0x8BC34A,Z:0xff006e,J:0x4361ee,L:0xff8500,G:0x445566};
const PIECE_SHAPES={
  I:[[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],[[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],[[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],[[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]],
  O:[[[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],[[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],[[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],[[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]]],
  T:[[[0,1,0],[1,1,1],[0,0,0]],[[0,1,0],[0,1,1],[0,1,0]],[[0,0,0],[1,1,1],[0,1,0]],[[0,1,0],[1,1,0],[0,1,0]]],
  S:[[[0,1,1],[1,1,0],[0,0,0]],[[0,1,0],[0,1,1],[0,0,1]],[[0,0,0],[0,1,1],[1,1,0]],[[1,0,0],[1,1,0],[0,1,0]]],
  Z:[[[1,1,0],[0,1,1],[0,0,0]],[[0,0,1],[0,1,1],[0,1,0]],[[0,0,0],[1,1,0],[0,1,1]],[[0,1,0],[1,1,0],[1,0,0]]],
  J:[[[1,0,0],[1,1,1],[0,0,0]],[[0,1,1],[0,1,0],[0,1,0]],[[0,0,0],[1,1,1],[0,0,1]],[[0,1,0],[0,1,0],[1,1,0]]],
  L:[[[0,0,1],[1,1,1],[0,0,0]],[[0,1,0],[0,1,0],[0,1,1]],[[0,0,0],[1,1,1],[1,0,0]],[[1,1,0],[0,1,0],[0,1,0]]]
};
const KICK_JLSTZ={'0->1':[[-1,0],[-1,1],[0,-2],[-1,-2]],'1->0':[[1,0],[1,-1],[0,2],[1,2]],'1->2':[[1,0],[1,-1],[0,2],[1,2]],'2->1':[[-1,0],[-1,1],[0,-2],[-1,-2]],'2->3':[[1,0],[1,1],[0,-2],[1,-2]],'3->2':[[-1,0],[-1,-1],[0,2],[-1,2]],'3->0':[[-1,0],[-1,-1],[0,2],[-1,2]],'0->3':[[1,0],[1,1],[0,-2],[1,-2]]};
const KICK_I={'0->1':[[-2,0],[1,0],[-2,-1],[1,2]],'1->0':[[2,0],[-1,0],[2,1],[-1,-2]],'1->2':[[-1,0],[2,0],[-1,2],[2,-1]],'2->1':[[1,0],[-2,0],[1,-2],[-2,1]],'2->3':[[2,0],[-1,0],[2,1],[-1,-2]],'3->2':[[-2,0],[1,0],[-2,-1],[1,2]],'3->0':[[1,0],[-2,0],[1,-2],[-2,1]],'0->3':[[-1,0],[2,0],[-1,2],[2,-1]]};
const PIECE_TYPES=['I','O','T','S','Z','J','L'];

// ---- Seeded Bag ----
class Bag{
  constructor(seed){
    this.rng=seededRng(seed||Math.floor(Math.random()*1000000));
    this.bag=[];
  }
  fill(){
    const arr=[...PIECE_TYPES];
    for(let i=arr.length-1;i>0;i--){
      const j=Math.floor(this.rng()*(i+1));
      [arr[i],arr[j]]=[arr[j],arr[i]];
    }
    this.bag=arr;
  }
  next(){if(!this.bag.length)this.fill();return this.bag.pop();}
}

// ---- Matrix rotation helper (for mutated piece shapes) ----
function rotateMatrix(matrix, dir) {
  // dir: +1 = clockwise, -1 = counter-clockwise
  const rows = matrix.length;
  const cols = Math.max(...matrix.map(r => r.length));
  // Pad all rows to same length
  const padded = matrix.map(r => { const a = [...r]; while(a.length < cols) a.push(0); return a; });
  if (dir > 0) {
    // CW: transpose then reverse each row
    const T = Array.from({length: cols}, (_,c) => Array.from({length: rows}, (_,r) => padded[r][c]));
    return T.map(r => r.reverse());
  } else {
    // CCW: reverse each row then transpose
    const rev = padded.map(r => [...r].reverse());
    return Array.from({length: cols}, (_,c) => Array.from({length: rows}, (_,r) => rev[r][c]));
  }
}

// ---- Game State ----
let gameState=null,gameApp=null,renderer=null;

// ミノのスポーン位置: 枠上部より1マス上にスポーン
const SPAWN_Y = HIDDEN - 2; // board[HIDDEN-2] = 枠上部の2マス上

class TetrisGame{
  constructor(bagSeed){
    this.board=Array.from({length:ROWS+HIDDEN},()=>Array(getGameCols()).fill(0));
    this.bag=new Bag(bagSeed);this.nextQueue=[];
    // Fill nextQueue with pre-computed {type, customShape} entries
    for(let i=0;i<6;i++)this.nextQueue.push(this._makeNextEntry(this.bag.next()));
    this.holdPiece=null;this.holdCustomShape=null;this.holdUsed=false;
    this.score=0;this.lines=0;this.level=1;
    this.combo=-1;this.b2b=false;this.b2bCount=0;this.ren=0;
    this.alive=true;this.locking=false;
    this.lockTimer=null;this.lockDelay=roomSettings.lockDelay||1000;
    this.lastSpin=null;this.lastSpinType=null;
    this._wasRotated=false;this._wasKicked=false;this._b2bBreakHoles3=false;
    this.garbageQueue=[];
    this._deferredGarbage=[];
    this._lastGarbageHoleCol=-1;
    this.gravityMs=0;
    renSemitone=0;

    // Stats tracking
    this.startTime = performance.now();
    this.pieceCount = 0;
    this.totalAttackSent = 0;
    this.totalGarbageCleared = 0;
    this.totalGarbageReceived = 0;
    this.pps = 0;
    this.apm = 0;
    this.vs = 0;
    this._garbagePushY = 0;
    this._lockHalf = false;

    this.spawnPiece();
  }

  // Pre-compute a next queue entry with its customShape
  _makeNextEntry(type){
    const baseShape=PIECE_SHAPES[type][0];
    const mutated=applyMutation(type,baseShape);
    return {type, customShape: mutated||null};
  }

  spawnPiece(){
    this.pieceCount++;
    this._updateStats();
    const entry=this.nextQueue.shift();
    this.nextQueue.push(this._makeNextEntry(this.bag.next()));
    const {type, customShape}=entry;
    const _spX=Math.floor((getGameCols()-4)/2);
    let _spawnY;
    if(puyotetMode){
      if((this._clutchSpawnBoost||0)>0){
        // クラッチ時: 盤面の最も高いブロックの2行上にスポーンして生存圏を確保
        let topRow=0;
        for(let r=0;r<this.board.length;r++){
          if(this.board[r].some(c=>c!==0))topRow=r+1;
        }
        _spawnY=SPAWN_Y-Math.min(Math.max(topRow-2,0),10);
      }else{
        // 通常: 標準位置にスポーン、重なったらゲームオーバー
        _spawnY=SPAWN_Y;
      }
    }else{
      // ゴミが即座に来る場合は、そのライン数分だけスポーンYを上にずらす
      const _nowMs=performance.now();
      const _immGarb=this.garbageQueue
        .filter(g=>g.readyAt<=_nowMs+200)
        .reduce((s,g)=>s+g.lines,0);
      _spawnY=SPAWN_Y - Math.min(_immGarb, 8) - (this._clutchSpawnBoost||0);
    }
    this._garbagePushY=0;
    this.current={type,rotation:0,x:_spX,y:_spawnY,customShape};
    this.holdUsed=false;this.lastSpin=null;this.lastSpinType=null;this._wasRotated=false;this._wasKicked=false;this.locking=false;
    if(renderer)renderer._wallBumpActive=false;
    // ゲームオーバー判定: スポーン位置が既存ブロックと重なったら
    // すぐには終わらず、一度設置させてから判定する
    if(!this.isValid(this.current)){
      this._pendingGameOver=true;
    }
  }

  _updateStats(){
    const now = performance.now();
    const elapsedSec = (now - this.startTime) / 1000;
    if (elapsedSec > 1.0) { // Calculate after 1 second to avoid initial spikes
      this.pps = this.pieceCount / elapsedSec;
      this.apm = (this.totalAttackSent / elapsedSec) * 60;
      // TETR.IO VS Score = (Attack + Garbage Cleared) / Time(s) * 60
      this.vs = ((this.totalAttackSent + this.totalGarbageCleared) / elapsedSec) * 60;
    }
  }

  getShape(type,rot,customShape){
    // If customShape provided, use it (mutation mode — rotation not applied to mutated shapes)
    if(customShape)return customShape;
    return PIECE_SHAPES[type][((rot%4)+4)%4];
  }

  _getShapeForPiece(piece){
    return this.getShape(piece.type,piece.rotation,piece.customShape||null);
  }

  isValid(piece,dx=0,dy=0){
    const shape=this._getShapeForPiece(piece);
    for(let r=0;r<shape.length;r++)for(let c=0;c<shape[r].length;c++){
      if(!shape[r][c])continue;
      const nx=piece.x+c+dx,ny=piece.y+r+dy;
      if(nx<0||nx>=getGameCols())return false;
      if(ny>=ROWS+HIDDEN)return false;
      if(ny>=0&&this.board[ny][nx])return false;
    }
    return true;
  }

  rotate(dir){
    const oldRot=this.current.rotation;
    const newRot=((oldRot+(dir>0?1:3))%4+4)%4;
    // スピン前の状態を保存（残像用）
    const prePiece={...this.current};
    const preShape=this._getShapeForPiece(this.current).map(r=>[...r]);
    // For custom-shaped pieces, rotate the shape matrix itself
    if(this.current.customShape){
      const rotated=rotateMatrix(this.current.customShape,dir>0?1:-1);
      const base={...this.current,rotation:newRot,customShape:rotated};
      if(this.isValid(base)){
        this.current=base;this._wasRotated=true;this.checkSpin(0,0,false);this._updateLockAfterMove();SFX.rotate();
        if(this.lastSpin){renderer&&renderer.onSpinTilt(dir);renderer&&renderer.triggerAfterimage(prePiece,preShape,this.lastSpinType);renderer&&renderer.onSpinRotateSparkle(this.current,this.lastSpinType);}
        return true;
      }
      // Try simple kicks for custom pieces
      for(const[kx,ky]of [[-1,0],[1,0],[0,-1],[0,1],[-2,0],[2,0]]){
        const t={...base,x:base.x+kx,y:base.y-ky};
        if(this.isValid(t)){
          this.current=t;this._wasRotated=true;this._wasKicked=true;this.checkSpin(kx,ky,true);this._updateLockAfterMove();SFX.rotate();
          if(this.lastSpin){renderer&&renderer.onSpinTilt(dir);renderer&&renderer.triggerAfterimage(prePiece,preShape,this.lastSpinType);renderer&&renderer.onSpinRotateSparkle(this.current,this.lastSpinType);}
          return true;
        }
      }
      return false;
    }
    const key=`${oldRot}->${newRot}`;
    const kicks=this.current.type==='I'?KICK_I[key]:KICK_JLSTZ[key];
    const base={...this.current,rotation:newRot};
    if(this.isValid(base)){
      this.current=base;this._wasRotated=true;this.checkSpin(0,0,false);this._updateLockAfterMove();SFX.rotate();
      if(this.lastSpin){renderer&&renderer.onSpinTilt(dir);renderer&&renderer.triggerAfterimage(prePiece,preShape,this.lastSpinType);renderer&&renderer.onSpinRotateSparkle(this.current,this.lastSpinType);}
      return true;
    }
    if(kicks)for(const[kx,ky]of kicks){
      const t={...base,x:base.x+kx,y:base.y-ky};
      if(this.isValid(t)){
        this.current=t;this._wasRotated=true;this._wasKicked=true;this.checkSpin(kx,ky,true);this._updateLockAfterMove();SFX.rotate();
        if(this.lastSpin){renderer&&renderer.onSpinTilt(dir);renderer&&renderer.triggerAfterimage(prePiece,preShape,this.lastSpinType);renderer&&renderer.onSpinRotateSparkle(this.current,this.lastSpinType);}
        return true;
      }
    }
    return false;
  }

  checkSpin(kx,ky,kicked){
    this.lastSpin=null;this.lastSpinType=null;
    if(this.current.customShape)return; // skip spin detection for mutated pieces
    const type=this.current.type,x=this.current.x,y=this.current.y,rot=this.current.rotation;
    if(type==='T'){
      const corners=[[0,0],[2,0],[0,2],[2,2]];
      const filled=corners.filter(([cx,cy])=>{const nx=x+cx,ny=y+cy;return(nx<0||nx>=getGameCols()||ny<0||ny>=ROWS+HIDDEN)||(ny>=0&&!!this.board[ny]?.[nx]);});
      if(filled.length>=3){
        const front={0:[[0,0],[2,0]],1:[[2,0],[2,2]],2:[[0,2],[2,2]],3:[[0,0],[0,2]]}[rot];
        const ff=front.filter(([cx,cy])=>{const nx=x+cx,ny=y+cy;return(nx<0||nx>=getGameCols()||ny<0||ny>=ROWS+HIDDEN)||(ny>=0&&!!this.board[ny]?.[nx]);});
        this.lastSpin='T';this.lastSpinType=ff.length>=2?'TSPIN':'MINI_TSPIN';
      }
    }
    if(['S','Z','L','J'].includes(type)){
      // S/Z/L/J spins require a wall kick to have been used
      if(!kicked)return;
      const shape=this.getShape(type,rot,null);let bb=false;
      outer:for(let r=0;r<shape.length;r++)for(let c=0;c<shape[r].length;c++){
        if(!shape[r][c])continue;const ny=y+r+1;
        if(ny>=ROWS+HIDDEN||(ny>=0&&this.board[ny]?.[x+c])){bb=true;break outer;}
      }
      if(bb){this.lastSpin=type;this.lastSpinType=type+'SPIN';}
    }
    if(type==='I'){
      // I-spin: キックあり＋着地で検出
      if(!kicked)return;
      const iShape=this.getShape(type,rot,null);
      let atBottom=false;
      outer:for(let r=0;r<iShape.length;r++)for(let c=0;c<iShape[r].length;c++){
        if(!iShape[r][c])continue;
        const ny=this.current.y+r+1;
        if(ny>=ROWS+HIDDEN||(ny>=0&&this.board[ny]?.[this.current.x+c])){atBottom=true;break outer;}
      }
      if(atBottom){this.lastSpin='I';this.lastSpinType='ISPIN';}
    }
  }

  // 180°回転（Aキー）: kick付きで試行、スピン判定はlockPiece時に行う
  rotate180(){
    if(!this.current)return false;
    const prePiece={...this.current};
    const preShape=this._getShapeForPiece(this.current).map(r=>[...r]);
    const oldRot=this.current.rotation;
    const newRot=(oldRot+2)%4;

    // カスタム形状はrotateMatrix 2回
    if(this.current.customShape){
      const r1=rotateMatrix(this.current.customShape,1);
      const r2=rotateMatrix(r1,1);
      const base={...this.current,rotation:newRot,customShape:r2};
      const kicks180=[[0,0],[-1,0],[1,0],[0,1],[-1,1],[1,1]];
      for(const[kx,ky]of kicks180){
        const t={...base,x:base.x+kx,y:base.y+ky};
        if(this.isValid(t)){this.current=t;this.lastSpin='180';this.lastSpinType='SPIN180';this._wasRotated=true;this._wasKicked=true;this._updateLockAfterMove();SFX.rotate();
          renderer&&renderer.triggerAfterimage(prePiece,preShape,this.lastSpinType);renderer&&renderer.onSpinRotateSparkle(this.current,this.lastSpinType);
          return true;}
      }
      return false;
    }

    // 通常ピース: SRS 180°kick テーブル (Tetrax準拠)
    const kicks180={
      'O':[[0,0]],
      'I':[[0,0],[1,0],[-1,0],[2,0],[-2,0],[0,-1],[0,1]],
    }[this.current.type]||[[0,0],[1,0],[-1,0],[0,1],[1,1],[-1,1]];
    const base={...this.current,rotation:newRot};
    for(const[kx,ky]of kicks180){
      const t={...base,x:base.x+kx,y:base.y+ky};
      if(this.isValid(t)){
        this.current=t;this.lastSpin='180';this.lastSpinType='SPIN180';this._wasRotated=true;this._wasKicked=true;
        this._updateLockAfterMove();SFX.rotate();
        renderer&&renderer.triggerAfterimage(prePiece,preShape,this.lastSpinType);
        renderer&&renderer.onSpinRotateSparkle(this.current,this.lastSpinType);
        return true;
      }
    }
    return false;
  }

  // Cancel lock timer if piece leaves surface; reset if still on surface
  _updateLockAfterMove(){
    if(!this.isValid(this.current,0,1)){
      this.tryResetLock();
    } else {
      this.cancelLock();
    }
  }

  move(dx){
    if(this.isValid(this.current,dx,0)){
      this.current.x+=dx;this.lastSpin=null;this._updateLockAfterMove();SFX.move();
      return true;
    } else {
      renderer&&renderer.onWallBump(dx);
      return false;
    }
  }

  tryResetLock(){
    if(this.lockTimer){
      clearTimeout(this.lockTimer);this.lockTimer=null;this._lockHalf=false;this.startLockTimer();
    }
  }

  softDrop(){
    if(this.isValid(this.current,0,1)){this.current.y++;this.score+=1;return true;}
    else{this._lockHalf=true;this.startLockTimer();return false;}
  }

  hardDrop(){
    let d=0;while(this.isValid(this.current,0,1)){this.current.y++;d++;}
    this.score+=d*2;SFX.hardDrop();
    renderer&&renderer.onHardDrop(d);
    ReplayRecorder.record('hard_drop',{dropped:d,pieceType:this.current.type,pieceX:this.current.x,startY:this.current.y-d});
    this.lockPiece();
  }

  ghostY(){let gy=this.current.y;while(this.isValid({...this.current,y:gy+1}))gy++;return gy;}

  startLockTimer(){if(this.lockTimer)return;this.lockStartTime=performance.now();const delay=this._lockHalf?this.lockDelay*0.75:this.lockDelay;this.lockTimer=setTimeout(()=>{if(!this.isValid(this.current,0,1))this.lockPiece();},delay);}
  cancelLock(){if(this.lockTimer){clearTimeout(this.lockTimer);this.lockTimer=null;this.lockStartTime=null;}}

  lockPiece(){
    if(this.locking)return;
    this.locking=true;this.cancelLock();
    // B2B値を保存（clearLines内でリセットされる前に）
    this._b2bCancelRemain = this.b2bCount || 0;
    // Re-evaluate spin at lock time (at current position)
    if(this._wasRotated){
      const _prev180=this.lastSpin==='180';
      // 水平移動でスピンがクリアされた場合のみ再評価
      if(!this.lastSpin)this.checkSpin(0,0,this._wasKicked||false);
      // Preserve SPIN180 if 3-corner / other spin didn't trigger
      if(_prev180&&!this.lastSpin){this.lastSpin='180';this.lastSpinType='SPIN180';}
    } else {
      this.lastSpin=null;this.lastSpinType=null;
    }
    renderer&&renderer._endBadge();
    const shape=this._getShapeForPiece(this.current);
    const wasSpin=!!this.lastSpin,spinType=this.lastSpinType;
    this._lockX=this.current.x;this._lockY=this.current.y;this._lockType=this.current.type;
    this._lockRot=this.current.rotation||0;
    // T-spin afterimage: スピン回転時に既にトリガー済みのため、ここでは不要
    // Snapshot board state BEFORE placement for training data
    this._boardBefore=roomSettings.recordTraining?this.board.map(r=>r.map(c=>c||0)):null;
    // ロック前にゲームオーバーライン(HIDDEN行)を超えているか記録
    // ただし打つ行為自体は許可する（clearLines後にspawnで判定）
    let lockedInDanger=false;
    for(let r=0;r<shape.length;r++)for(let c=0;c<shape[r].length;c++){
      if(!shape[r][c])continue;
      const ny=this.current.y+r;
      if(ny<HIDDEN)lockedInDanger=true;
    }
    this._lockedInDanger=lockedInDanger;
    // 盤面より上(ny<0)のブロックがある場合、盤面全体を下方シフトして対応
    const cols=getGameCols();
    let minNY=Infinity;
    for(let r=0;r<shape.length;r++)for(let c=0;c<shape[r].length;c++){
      if(!shape[r][c])continue;
      const ny=this.current.y+r;
      if(ny<minNY)minNY=ny;
    }
    if(minNY<0){
      const shift=-minNY;
      for(let i=0;i<shift;i++)this.board.unshift(Array(cols).fill(0));
      this.current.y+=shift;
    }
    for(let r=0;r<shape.length;r++)for(let c=0;c<shape[r].length;c++){
      if(!shape[r][c])continue;
      const ny=this.current.y+r,nx=this.current.x+c;
      if(ny>=0&&ny<ROWS+HIDDEN&&nx>=0&&nx<cols)this.board[ny][nx]=this.current.type;
    }
    if(wasSpin){
      SFX.spinLock();
      playNoise(0.025,0.5,2500); // カチッというクリック音
      socket.emit('spin_effect',{spinType});ReplayRecorder.record('spin_effect',{spinType});renderer&&renderer.onSpinSparkle(this._lockX,this._lockY,this._lockType,spinType);
    }
    else SFX.lock();
    this.clearLines();

    // 相殺後に残ったゴミを適用（コンボ中はclearLines内の相殺でキャンセルされる）
    if (this.alive) this._applyReadyGarbage();

    // ── チーズモード: ハンドカウント ─────────────────────────
    if (cheeseMode && this.alive) {
      cheeseHandCount++;
    }
  }

  clearLines(){
    const hadPendingGO=this._pendingGameOver;
    this._pendingGameOver=false;
    const cleared=[];
    let garbageCountInClear = 0;
    for(let r=this.board.length-1;r>=0;r--){
      if(this.board[r].every(c=>c!==0)){
        cleared.push(r);
        if(this.board[r].some(c=>c==='G')) garbageCountInClear++;
      }
    }
    const count=cleared.length;
    this.totalGarbageCleared += garbageCountInClear;
    this._lastLinesCleared=count; // for training data
    const is180Spin=this.lastSpin==='180';
    // 180°スピンはライン消去があった場合のみスピン扱い（確定はcount>0後に上書き）
    const rawIsSpin=!!this.lastSpin;
    let spinType=this.lastSpinType,isSpin=rawIsSpin&&!is180Spin,isMini=spinType&&spinType.startsWith('MINI'),isTSpin=this.lastSpin==='T';

    let allClear=false;
    if(count>0){
      const testBoard=this.board.map(r=>[...r]);
      const desc=[...cleared].sort((a,b)=>b-a);
      for(const idx of desc)testBoard.splice(idx,1);
      allClear=testBoard.every(row=>row.every(c=>c===0));
    }

    if(count>0){
      // *** FIX: Remove cleared lines FIRST before adding garbage ***
      // This prevents index shifting bugs when garbage is added simultaneously
      const desc=[...cleared].sort((a,b)=>b-a);
      for(const idx of desc)this.board.splice(idx,1);
      for(let i=0;i<count;i++)this.board.unshift(Array(getGameCols()).fill(0));

      // 空行のみトリム、ロック済みセルは保持
      while(this.board.length>ROWS+HIDDEN&&this.board[0].every(c=>c===0))this.board.shift();

      // 180°スピン: ライン消去が1枚以上あった場合のみスピン有効（傾きなし）
      if(is180Spin&&count>=1){isSpin=true;}
      this.combo++;this.ren++;
      if(this.ren>1)SFX.ren(this.ren);

      // ── Attack Calculation (TETR.IO Standard) ───────────────────
      const isPenta=count===5;
      const isB2Bable = count===4 || isPenta || (isSpin) || allClear;
      const wasB2B = this.b2b;
      const isB2B = wasB2B && isB2Bable;
      
      let attack=0;
      if(isPenta){
        attack=6; // Penta
      }
      else{
        if(isTSpin && !isMini) attack={1:2,2:3,3:5}[count]||0;
        else if(isMini) attack={1:0,2:1}[count]||0; // TSM-S:0, TSM-D:1 (TETR.IO)
        else attack={1:0,2:1,3:2,4:3}[count]||0;
      }

      // B2B (PuyoTet: fixed +1, no chain/break)
      if(puyotetMode){
        if(isB2B && attack > 0) attack += 1;
      } else {
        // B2B Chain Scaling (TETR.IO like)
        if(isB2B && attack > 0) {
          let b2bBonus = 1;
          if (this.b2bCount >= 24) b2bBonus = 4;
          else if (this.b2bCount >= 8) b2bBonus = 3;
          else if (this.b2bCount >= 3) b2bBonus = 2;
          attack += b2bBonus;
        }
        // B2B Break: accumulated b2bCount sent as lines (with 3 holes)
        if (wasB2B && !isB2Bable && count > 0 && this.b2bCount >= 4) {
          attack += this.b2bCount;
          this._b2bBreakHoles3 = true;
        } else {
          this._b2bBreakHoles3 = false;
        }
      }

      // ── Ren bonus (ren count directly added as attack) ────────
      attack = attack + this.ren;

      // ── PC bonus ──────────────────────────────────────────────
      if (allClear) {
        if (puyotetMode) {
          attack = 10; // puyotet: fixed 10
        } else {
          attack += 5; // 5段 + tetris firepower stacks
        }
      }

      // ── Time-based firepower multiplier ────────────────────────
      const elapsedSec = (performance.now() - this.startTime) / 1000;
      const delaySec = (roomSettings.multiplierDelayMin || 1.6) * 60;
      const interval = roomSettings.multiplierIntervalSec || 1;
      const rate = roomSettings.multiplierRate || 0.03;
      if (elapsedSec > delaySec) {
        const steps = Math.floor((elapsedSec - delaySec) / interval);
        attack = Math.floor(attack * (1 + steps * rate));
      }

      // ── Garbage Cancellation ────────────────────────────────────
      // 相殺: Pendingのゴミ（queue全体）を対象にする
      let cancelPower = attack;
      // 到着が近い順（readyAtが小さい順）に相殺
      this.garbageQueue.sort((a,b)=>a.readyAt-b.readyAt);
      for(let i=0;i<this.garbageQueue.length&&cancelPower>0;i++){
        const canCancel=Math.min(this.garbageQueue[i].lines,cancelPower);
        this.garbageQueue[i].lines-=canCancel;
        cancelPower-=canCancel;
      }
      this.garbageQueue=this.garbageQueue.filter(g=>g.lines>0);
      // 送信される攻撃は相殺後の残り
      attack=cancelPower;

      // ゴミはロック時に適用（遅延適用）
      // キューに残して次のlockPieceでまとめて適用

      // Update B2B state
      const prevB2bCount=this.b2bCount;
      if(isB2Bable){
        if(this.b2b){this.b2bCount++;}
        else {this.b2bCount=1;}
        this.b2b=true;
        if(this.b2bCount>1) SFX.b2b();
      }
      else{
        this.b2bCount=0;this.b2b=false;
        if(wasB2B && renderer) renderer.onB2BBreak(prevB2bCount);
      }

      const pts=this.calcScore(count,isTSpin,isMini,isB2B,this.combo);
      this.score+=pts;this.lines+=count;this.level=Math.floor(this.lines/10)+1;

      if(attack>0||fortyLineMode||cheeseMode){
        this.totalAttackSent += attack;
        socket.emit('lines_cleared',{attack,allClear,spinType,clearRows:cleared,totalLines:this.lines,holes3:this._b2bBreakHoles3||undefined,handCount:cheeseMode?cheeseHandCount:undefined});
      }
      // 相手に視覚エフェクトを送信
      const lcEv={count,spinType,isB2B:isB2B||false,b2bCount:this.b2bCount,ren:this.ren,allClear,attack};
      socket.emit('line_clear_effect',lcEv);
      ReplayRecorder.record('line_clear_effect',lcEv);

      if(count===1)SFX.clear1();
      else if(count===2)SFX.clear2();
      else if(count===3)SFX.clear3();
      else if(count===5){SFX.tetris();SFX.b2b();} // penta clear special SFX
      else SFX.tetris();
      if(isSpin&&isTSpin)SFX.tspin();
      if(allClear)SFX.allClear();

      renderer&&renderer.onLineClear(cleared,count,spinType,isB2B,this.combo,this.ren,allClear,attack,this.b2bCount);
    } else {
      if(this.ren>0){SFX.renReset();}
      this.combo=-1;this.ren=0;
      renderer&&renderer.endComboLabel();
      // 相手にRENリセットを通知
      socket.emit('line_clear_effect',{count:0,spinType:null,isB2B:false,ren:0,allClear:false});
      // ゴミは次のlockPieceまで遅延
    }

    // ── チーズモード: 消したガベージ行数分ゴミをせり上げる ──
    if (cheeseMode && garbageCountInClear > 0) {
      const cols = getGameCols();
      for (let i = 0; i < garbageCountInClear; i++) {
        const hole = Math.floor(Math.random() * cols);
        const garbageRow = Array(cols).fill('G');
        garbageRow[hole] = 0;
        this.board.shift();
        this.board.push(garbageRow);
      }
    }

    this.lastSpin=null;this.lastSpinType=null;
    // ── Training data: emit piece_placed ────────────────────────
    if(roomSettings.recordTraining&&this._boardBefore){
      try{
        socket.emit('piece_placed',{
          boardBefore: this._boardBefore,
          placedPiece: {type:this._lockType, rotation:this._lockRot, x:this._lockX, y:this._lockY},
          nextPieces: this.nextQueue.slice(0,5).map(p=>(typeof p==='string'?p:(p&&p.type)||p||'')),
          holdPiece: this.holdPiece||null,
          linesCleared: this._lastLinesCleared||0,
          boardAfter: this.board.map(r=>r.map(c=>c||0))
        });
      }catch(err){console.warn('[record] piece_placed error',err);}
    }
    const wasInDanger=this._lockedInDanger;
    this._lockedInDanger=false;
    const _linesCleared=this._lastLinesCleared||0;
    // CLUTCH: 上部ギリギリでラインを消して初めてクラッチ
    this._clutchSpawnBoost=(wasInDanger&&_linesCleared>0)?10:0;
    this.spawnPiece();
    this._clutchSpawnBoost=0;
    if(wasInDanger&&_linesCleared>0&&this.alive&&!this._pendingGameOver){
      renderer&&renderer.onClutch();
    }
    this._emitBoardUpdate();
    // Shogi mode: notify server that human placed a piece
    if(shogiMode)socket.emit('shogi_human_placed');
    // ゲームオーバー判定: pendingGameOverまたはスポーン失敗
    if(!this.alive||this._pendingGameOver||hadPendingGO){
      this.alive=false;this._pendingGameOver=false;
      if(!isOfflineSolo){socket.emit('game_over',{totalAttackSent:this.totalAttackSent,totalGarbageReceived:this.totalGarbageReceived});_enterSpectateOnDeath();}renderer&&renderer.onGameOver();_offlineSoloGameOverAutoReturn();
    }
  }

  _applyGarbageCap(armed, cap){
    let linesToAdd = 0;
    const now = performance.now();
    const remainingToBoard = [];
    const backToQueue = [];
    
    for (const g of armed) {
      if (linesToAdd >= cap) {
        backToQueue.push({...g, readyAt: now + 500});
      } else {
        const canAdd = Math.min(g.lines, cap - linesToAdd);
        if (canAdd > 0) remainingToBoard.push({...g, lines: canAdd});
        if (canAdd < g.lines) {
          backToQueue.push({lines: g.lines - canAdd, fromId: g.fromId, readyAt: now + 500, holeCol: g.holeCol});
        }
        linesToAdd += canAdd;
      }
    }
    
    if (linesToAdd > 0) {
      this._applyGarbageAnimated(remainingToBoard, linesToAdd);
    }
    for (const g of backToQueue) this.garbageQueue.unshift(g);
  }

  // おじゃまミノ: 同じ穴のものをセットで、0.1秒ごとにグループを追加 + 振動
  _applyGarbageAnimated(armed,total){
    // 穴位置でグループ化
    const groups=[];
    for(const chunk of armed){
      const col=chunk.holeCol!==undefined?chunk.holeCol:Math.floor(Math.random()*getGameCols());
      let merged=false;
      for(const g of groups){
        if(g.col===col){g.count+=chunk.lines;merged=true;break;}
      }
      if(!merged)groups.push({col,count:chunk.lines});
    }
    // 各グループの行データを作成
    const groupRows=groups.map(g=>{
      const rows=[];
      for(let i=0;i<g.count;i++){
        const cols=getGameCols();
        // 30%で上の穴と同じ列に（直列）、それ以外はグループの既定列
        let holeCol;
        if(this._lastGarbageHoleCol>=0&&Math.random()<0.3){
          holeCol=this._lastGarbageHoleCol;
        }else{
          holeCol=g.col;
        }
        const row=Array(cols).fill('G');
        row[holeCol]=0;
        rows.push(row);
        this._lastGarbageHoleCol=holeCol;
      }
      return rows;
    });
    let idx=0;
    const applyGroup=()=>{
      if(idx>=groupRows.length)return;
      const rows=groupRows[idx];
      for(const row of rows){this.board.push(row);this.board.shift();this.totalGarbageReceived++;if(this.current){this.current.y=Math.max(-HIDDEN,this.current.y-1);this._garbagePushY++;}}
      idx++;
      if(renderer){
        renderer.onGarbageRowAdded(rows.length); // まとめて振動
      }
      if(idx<groupRows.length)setTimeout(applyGroup,100);
    };
    SFX.garbageReceive();
    renderer&&renderer.onGarbageApplied(total);
    applyGroup();
  }

  _emitBoardUpdate(){
    const data = {
      board:this.board.map(row=>row.map(c=>c||0)),
      score:this.score,lines:this.lines,level:this.level,
      currentPiece:{...this.current},nextPieces:this.nextQueue.slice(0,5),holdPiece:this.holdPiece,
      // Stats
      pps: this.pps,
      apm: this.apm,
      vs: this.vs,
      garbageQueue: this.garbageQueue,
      cheeseHandCount: cheeseMode ? cheeseHandCount : undefined,
      tiltAngle: renderer ? (renderer.tiltAngle||0) : 0,
      shakePower: renderer ? (renderer.shakePower||0) : 0,
      boardOffsetY: renderer ? (renderer.boardOffsetY||0) : 0,
    };
    socket.emit('board_update', data);
    ReplayRecorder.record('board_update', data);
  }

  // ロック時に準備済みゴミを一括適用
  _applyReadyGarbage(){
    const now=performance.now();
    const armed=this.garbageQueue.filter(g=>g.readyAt<=now);
    if(armed.length===0)return;
    // コンボ中はゴミを適用しない（次のロックまで待つ）
    if(this.ren>=1&&!puyotetMode)return;
    this.garbageQueue=this.garbageQueue.filter(g=>g.readyAt>now);
    const cap=puyotetMode?8:10;
    let linesToAdd=0;
    const backToQueue=[];
    for(const g of armed){
      if(linesToAdd>=cap){backToQueue.push({...g,readyAt:now+500});continue;}
      const canAdd=Math.min(g.lines,cap-linesToAdd);
      if(canAdd>0){
        const cols=getGameCols();
        for(let i=0;i<canAdd;i++){
          // 30%で上の穴と同じ列に（直列）、それ以外はランダム
          let holeCol;
          if(this._lastGarbageHoleCol>=0&&Math.random()<0.3){
            holeCol=this._lastGarbageHoleCol;
          }else{
            holeCol=g.holeCol!==undefined?g.holeCol:Math.floor(Math.random()*cols);
          }
          const row=Array(cols).fill('G');
          row[holeCol]=0;
          if(g.holes3){
            const holes=[holeCol];
            while(holes.length<3){
              const h=Math.floor(Math.random()*cols);
              if(!holes.includes(h))holes.push(h);
            }
            for(const h of holes)row[h]=0;
          }
          this.board.push(row);this.board.shift();
          this.totalGarbageReceived++;
          if(this.current){this.current.y=Math.max(-HIDDEN,this.current.y-1);this._garbagePushY++;}
          linesToAdd++;
          this._lastGarbageHoleCol=holeCol;
        }
      }
      if(canAdd<g.lines)backToQueue.push({lines:g.lines-canAdd,fromId:g.fromId,readyAt:now+500,holeCol:g.holeCol,holes3:g.holes3});
    }
    for(const g of backToQueue)this.garbageQueue.unshift(g);
    if(linesToAdd>0){
      this.cancelLock();
      SFX.garbage();
      renderer&&renderer.onGarbageApplied(linesToAdd);
      renderer&&renderer.onGarbageRowAdded(linesToAdd);
    }
  }

  // 現在ミノ位置のみ軽量送信（毎フレーム近い頻度で呼ばれる）
  _emitCurrentPiece(){
    if(!this.current)return;
    socket.emit('piece_update',{currentPiece:{...this.current}});
    ReplayRecorder.record('piece_update',{currentPiece:{...this.current}});
  }

  queueGarbage(lines,fromId,holes3){
    const readyAt=performance.now()+(puyotetMode?0:1000);
    if(!puyotetMode&&lines>10){
      while(lines>0){const chunk=Math.min(lines,10);const holeCol=Math.floor(Math.random()*getGameCols());this.garbageQueue.push({lines:chunk,fromId,readyAt,holeCol,holes3:!!holes3});lines-=chunk;}
    }else{const holeCol=Math.floor(Math.random()*getGameCols());this.garbageQueue.push({lines,fromId,readyAt,holeCol,holes3:!!holes3});}
    renderer&&renderer.onGarbageIncoming(lines,fromId);
    // ゴミはreadyAtに従って自然に適用される（ゲージが溢れても強制出現しない）
  }

  calcScore(count,isTSpin,isMini,isB2B,combo){
    const base={1:100,2:300,3:500,4:800};
    const ts={0:400,1:800,2:1200,3:1600};
    const mini={1:200,2:400};
    let pts=isTSpin&&!isMini?(ts[count]||0):isMini?(mini[count]||100):(base[count]||0);
    if(isB2B)pts=Math.floor(pts*1.5);
    pts*=this.level;
    if(combo>0)pts+=50*combo*this.level;
    return pts;
  }

  hold(){
    if(this.holdUsed)return;
    this.holdUsed=true;
    const type=this.current.type;
    const customShape=this.current.customShape||null;
    if(this.holdPiece!==null){
      const nextType=this.holdPiece;
      const nextCustomShape=this.holdCustomShape||null;
      this.holdPiece=type;
      this.holdCustomShape=customShape;
      const _spX2=Math.floor((getGameCols()-4)/2);
      this.current={type:nextType,rotation:0,x:_spX2,y:SPAWN_Y,customShape:nextCustomShape};
      this.lastSpin=null;this.lastSpinType=null;this._wasRotated=false;this._wasKicked=false;this.locking=false;
      if(renderer)renderer._wallBumpActive=false;
      // スポーン位置が埋まっている場合、10マス上まで探す
      if(!this.isValid(this.current)){
        let found=false;
        for(let yOff=-1;yOff>=-10;yOff--){
          const t={...this.current,y:SPAWN_Y+yOff};
          if(this.isValid(t)){this.current.y=SPAWN_Y+yOff;found=true;break;}
        }
        if(!found){
          this.alive=false;if(!isOfflineSolo){socket.emit("game_over",{totalAttackSent:this.totalAttackSent,totalGarbageReceived:this.totalGarbageReceived});_enterSpectateOnDeath();}renderer&&renderer.onGameOver();_offlineSoloGameOverAutoReturn();
        }
      }
    }else{
      this.holdPiece=type;
      this.holdCustomShape=customShape;
      this.spawnPiece();
      if(!this.alive||this._pendingGameOver){
        this.alive=false;this._pendingGameOver=false;
        if(!isOfflineSolo){socket.emit('game_over',{totalAttackSent:this.totalAttackSent,totalGarbageReceived:this.totalGarbageReceived});_enterSpectateOnDeath();}renderer&&renderer.onGameOver();_offlineSoloGameOverAutoReturn();
      }
    }
    this.cancelLock();SFX.hold();
  }

  updateGravity(dt){
    if(!this.alive)return;
    const base=roomSettings.gravityBase||1000;
    const dec=roomSettings.gravityDec||80;
    const min=roomSettings.gravityMin||50;
    const msPerDrop=Math.max(min,base-(this.level-1)*dec);
    this.gravityMs+=dt;
    if(this.gravityMs>=msPerDrop){
      this.gravityMs=0;
      if(this.isValid(this.current,0,1))this.current.y++;
      else{this._lockHalf=false;this.startLockTimer();}
    }
  }
}

function groupByBatch(items){
  const groups=[];
  for(const item of items){
    let found=false;
    for(const g of groups){if(Math.abs(g[0].readyAt-item.readyAt)<200){g.push(item);found=true;break;}}
    if(!found)groups.push([item]);
  }
  return groups;
}

// ---- PixiJS Renderer ----
const CELL=28;
// BOARD_W/Hはゲーム開始時に動的に計算（4wideモード対応）
let BOARD_W=COLS*CELL,BOARD_H=ROWS*CELL;
function _recalcBoardSize(){BOARD_W=getGameCols()*CELL;BOARD_H=ROWS*CELL;}
const ABOVE_BOARD=CELL*2; // 枠は可視エリア上2マス分

function initGame(players,bagSeed){
  puyoGameState = null; // reset puyo state
  setupInput();
  let lastTime=performance.now();
  let lastEmit=0;
  const EMIT_INTERVAL=50; // 50ms = 20fps で現在ミノ位置を送信
  gameApp.ticker.add(()=>{
    const now=performance.now();
    const rawDt=Math.min(now-lastTime,100);
    lastTime=now;
    if(gameState&&gameState.alive){
      gameState.updateGravity(rawDt);
      // 現在ミノ位置を定期的にリアルタイム送信
      if(now-lastEmit>=EMIT_INTERVAL){
        lastEmit=now;
        gameState._emitCurrentPiece();
      }
    }
    renderer&&renderer.update(rawDt*ANIM_SPEED);
  });
}

// ==========================================
// ===== ALLSPIN MODE =======================
// ==========================================

// 10種類のスピンチャレンジ定義
const ALLSPIN_CHALLENGES = [
  {
    id:'tspin_double', label:'T-SPIN DOUBLE', targetSpin:'TSPIN', targetLines:2,
    color:'#cc00ff', hint:'Tミノを使って2ライン消去のTスピンを決めろ！',
    piece:'T'
  },
  {
    id:'tspin_triple', label:'T-SPIN TRIPLE', targetSpin:'TSPIN', targetLines:3,
    color:'#ff00cc', hint:'T-Spin Tripleを決めよう。縦穴を作れ！',
    piece:'T'
  },
  {
    id:'tspin_single', label:'T-SPIN SINGLE', targetSpin:'TSPIN', targetLines:1,
    color:'#dd44ff', hint:'1ライン消去のTスピン。準備の盤面を活かせ！',
    piece:'T'
  },
  {
    id:'mini_tspin', label:'MINI T-SPIN', targetSpin:'MINI_TSPIN', targetLines:1,
    color:'#aa66ff', hint:'ミニTスピンでも十分！回転で滑り込め',
    piece:'T'
  },
  {
    id:'ispin', label:'I-SPIN', targetSpin:'ISPIN', targetLines:1,
    color:'#00f5ff', hint:'Iミノをキックで回転させながらはめ込め！',
    piece:'I'
  },
  {
    id:'sspin', label:'S-SPIN', targetSpin:'SSPIN', targetLines:1,
    color:'#8BC34A', hint:'Sミノを着地後に回転させて消去！',
    piece:'S'
  },
  {
    id:'zspin', label:'Z-SPIN', targetSpin:'ZSPIN', targetLines:1,
    color:'#ff006e', hint:'Zミノを着地後に回転させて消去！',
    piece:'Z'
  },
  {
    id:'lspin', label:'L-SPIN', targetSpin:'LSPIN', targetLines:1,
    color:'#ff8500', hint:'Lミノを底に沿わせてスピン。タイミングが鍵！',
    piece:'L'
  },
  {
    id:'jspin', label:'J-SPIN', targetSpin:'JSPIN', targetLines:1,
    color:'#4361ee', hint:'Jミノのスピンを決めよう！',
    piece:'J'
  },
  {
    id:'spin180', label:'180° SPIN', targetSpin:'SPIN180', targetLines:1,
    color:'#ffffff', hint:'Aキーで180°回転させながらラインを消去！',
    piece:null // any
  },
];

// ============================================================
// AllSpin 盤面パターン定義
//
// 設計規則:
//   - rows配列: 各要素が盤面1行（HIDDEN行目〜ROWS+HIDDEN-1行目 = board[HIDDEN..ROWS+HIDDEN-1]）
//     インデックス0=rows[0]が最上段(board[HIDDEN]=board[3])
//     インデックス19=最下段(board[22])
//   - 0=空セル、1=ブロック（後でランダム色で着色）
//   - 10列固定
//   - spinCount: NEXTに詰めるミノ数（連続スピン回数）
//   - piece: 使うミノ種
//   - hint: 操作ガイド
//
// 各スピンのSRS/着地条件:
//   T-spin: Tピース回転後に「前面コーナー2つが埋まっている」
//   S-spin: Sピースが着地状態で回転（回転後に下にブロック/床）
//   Z-spin: Zピースが着地状態で回転
//   L-spin: Lピースが着地状態で回転
//   J-spin: Jピースが着地状態で回転
//   I-spin: Iピースがkickを使って回転
//   180-spin: 180°回転（Aキー）でkickして滑り込む
// ============================================================

// 盤面をboard配列（ROWS+HIDDEN行×COLS列）に変換する
// rows: 20行分（上→下）、0=空 1=ブロック
function makeBoardFromRows(rows, rng) {
  const colors = ['I','L','J','S','Z','T','O'];
  const b = Array.from({length:ROWS+HIDDEN}, ()=>Array(getGameCols()).fill(0));
  for(let i=0;i<rows.length&&i<ROWS;i++){
    const boardRow = HIDDEN + i;
    for(let c=0;c<getGameCols();c++){
      if(rows[i][c]) b[boardRow][c] = colors[Math.floor(rng()*colors.length)];
    }
  }
  return b;
}

// ============================================================
// 各チャレンジのパターンリスト
// patterns配列: 複数バリエーションをランダム選択
// ============================================================
const ALLSPIN_PATTERNS = {

  // ─────────────────────────────────────────────────
  // T-SPIN DOUBLE: T字穴を横4〜5箇所連続
  // Tミノ rot=2 (▽)で下から滑り込む。
  // 穴: 上2行で[1,0,1]、下1行で[0,0,0] → T字
  // 穴の横には必ずブロックで支持
  // ─────────────────────────────────────────────────
  tspin_double: [
    {
      // 右寄りT字穴×5列（交互TSD連続）
      // 各穴: 行A=[..1,0,1..] 行B=[..0,0,0..] の2行ペア
      // 穴位置(中心x): 1,3,5,7 の4箇所
      rows: [
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [1,0,1,1,1,0,1,1,1,1],  // 穴A: x=1 (left slot)
        [0,0,0,1,0,0,0,1,1,1],  // 穴B: x=1
        [1,0,1,1,1,0,1,1,1,1],  // 穴A: x=5 (right slot) / x=1 continuation
        [0,0,0,1,0,0,0,1,1,1],
        [1,0,1,1,1,0,1,1,1,1],
        [0,0,0,1,0,0,0,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
      ],
      spinCount: 6,
    },
    {
      // 左半分: T字穴×3、右壁塞ぎ
      // rot=1 (▷) で右から入るTSD
      rows: [
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [1,1,0,1,1,1,0,1,1,1],
        [1,0,0,0,1,0,0,0,1,1],
        [1,1,0,1,1,1,0,1,1,1],
        [1,0,0,0,1,0,0,0,1,1],
        [1,1,0,1,1,1,0,1,1,1],
        [1,0,0,0,1,0,0,0,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
      ],
      spinCount: 6,
    },
  ],

  // ─────────────────────────────────────────────────
  // T-SPIN TRIPLE: 深い縦穴（3行使う）
  // rot=0 (△) で上からキックで入る、あるいは
  // rot=2 (▽) で底のキックで3行全消し
  // 穴形状: 上1行[1,0,1] 中1行[0,0,0] 下1行[1,0,1]
  // 実際には "overhang + TSD" 的な形
  // ─────────────────────────────────────────────────
  tspin_triple: [
    {
      // T-spin Triple用: タワー穴×3
      // 各穴: 3行深で1本の縦穴+overhang
      // 穴位置: c=1, c=5 の2箇所
      rows: [
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [1,0,1,1,1,0,1,1,1,1],
        [0,0,0,1,0,0,0,1,1,1],
        [0,0,1,1,0,0,1,1,1,1],
        [1,0,1,1,1,0,1,1,1,1],
        [0,0,0,1,0,0,0,1,1,1],
        [0,0,1,1,0,0,1,1,1,1],
        [1,0,1,1,1,0,1,1,1,1],
        [0,0,0,1,0,0,0,1,1,1],
        [0,0,1,1,0,0,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
      ],
      spinCount: 6,
    },
  ],

  // ─────────────────────────────────────────────────
  // T-SPIN SINGLE: 1ライン消去のTスピン
  // rot=3 (◁) or rot=1 (▷) で横から挟む
  // 穴: [1,0,0,0] の1行（Tが横向きで入る）
  // ─────────────────────────────────────────────────
  tspin_single: [
    {
      // 左壁からのTSS: rot=1 (▷向き) で左から差し込む
      // 穴: c=0〜2 に [0,0,0]、c=3に壁
      // 2行でペア: 上[1,0,1,1,...] 下[0,0,0,1,...]
      rows: [
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [1,0,1,1,1,0,1,1,1,1],
        [0,0,0,1,0,0,0,1,1,1],
        [1,0,1,1,1,0,1,1,1,1],
        [0,0,0,1,0,0,0,1,1,1],
        [1,0,1,1,1,0,1,1,1,1],
        [0,0,0,1,0,0,0,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
      ],
      spinCount: 6,
    },
  ],

  // ─────────────────────────────────────────────────
  // MINI T-SPIN: kick1つ（0→R or 0→L）で滑り込む
  // 穴形状: [0,0,1] + [0,1,1] → Tが引っかかる形
  // ─────────────────────────────────────────────────
  mini_tspin: [
    {
      // ミニTSS: 左コーナー引っかかりパターン
      // Tをrot=0で落として、左回転(→rot=3)でL字に滑り込む
      rows: [
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,1,0,0,1,0,0,1,0],
        [0,1,1,0,1,1,0,1,1,0],
        [1,1,1,1,1,1,1,1,1,1],
        [0,0,1,0,0,1,0,0,1,0],
        [0,1,1,0,1,1,0,1,1,0],
        [1,1,1,1,1,1,1,1,1,1],
        [0,0,1,0,0,1,0,0,1,0],
        [0,1,1,0,1,1,0,1,1,0],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
      ],
      spinCount: 6,
    },
  ],

  // ─────────────────────────────────────────────────
  // I-SPIN: IミノをSRSキックで縦穴に入れる
  // KICK_I '0->1' or '2->3' の第3・4キックで
  // 縦向きIが横穴に滑り込む
  //
  // 最も代表的: 横向きI(rot=0)を右回転(→rot=1)するとき
  // kick3: [-2,-1]（左2、上1）で狭い縦穴に入る
  //
  // 盤面: 縦3マスの穴を横に4〜5個並べる
  // 穴の上はoverhang（天井）で1マス塞ぐ
  // ─────────────────────────────────────────────────
  ispin: [
    {
      // I-spin: 縦穴4連 (overhang付き)
      // 穴: c=1〜3（幅1、深さ4） overhangがc=1上端を塞ぐ
      // Iをrot=0で上に置き、右回転(kick3)で縦穴へ
      rows: [
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [1,0,1,0,1,0,1,0,1,1],  // overhang: 偶数列に天井
        [0,0,0,0,0,0,0,0,0,1],
        [0,0,0,0,0,0,0,0,0,1],
        [0,0,0,0,0,0,0,0,0,1],
        [1,0,1,0,1,0,1,0,1,1],
        [0,0,0,0,0,0,0,0,0,1],
        [0,0,0,0,0,0,0,0,0,1],
        [0,0,0,0,0,0,0,0,0,1],
        [1,0,1,0,1,0,1,0,1,1],
        [0,0,0,0,0,0,0,0,0,1],
        [0,0,0,0,0,0,0,0,0,1],
        [0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
      ],
      spinCount: 6,
    },
    {
      // I-spin variant: 横向きに狭い穴を横から差し込む
      // rot=1(縦)のIを左回転(→rot=0)で幅1の隙間に水平に入れる
      // 穴: 1行だけ空いた行を4〜6個並べる
      rows: [
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [1,0,0,0,0,1,1,1,1,1],  // 左端から横向きIを差し込む穴
        [1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
      ],
      spinCount: 6,
    },
  ],

  // ─────────────────────────────────────────────────
  // S-SPIN: Sミノ着地後に回転してライン消去
  // SRSなし（着地状態での回転判定）
  //
  // Sミノ rot=0:
  //   [0,1,1]
  //   [1,1,0]
  // Sミノ rot=1 (右回転後):
  //   [0,1,0]
  //   [0,1,1]
  //   [0,0,1]
  //
  // 実用的なS-spin:
  // 段差構造で rot=0 Sを着地→右回転(rot=1)でライン消去
  // 穴: 2行で [1,1,0,0,1,1,1,1,1,1] と [1,0,0,1,1,1,1,1,1,1]
  // ─────────────────────────────────────────────────
  sspin: [
    {
      // S-spin: 段差穴を左から右へ5連続
      // 各穴は2行使用、左ずつシフト
      // Sをrot=1(縦向き)で着地後、左回転(→rot=0)で横ラインに
      rows: [
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [1,0,0,1,0,0,1,0,0,1],
        [0,0,1,0,0,1,0,0,1,1],
        [1,0,0,1,0,0,1,0,0,1],
        [0,0,1,0,0,1,0,0,1,1],
        [1,0,0,1,0,0,1,0,0,1],
        [0,0,1,0,0,1,0,0,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
      ],
      spinCount: 6,
    },
  ],

  // ─────────────────────────────────────────────────
  // Z-SPIN: Zミノ着地後に回転
  // Zミノ rot=0:
  //   [1,1,0]
  //   [0,1,1]
  // Zミノ rot=1 (右回転後):
  //   [0,0,1]
  //   [0,1,1]
  //   [0,1,0]
  //
  // S-spinの鏡像パターン
  // ─────────────────────────────────────────────────
  zspin: [
    {
      // Z-spin: 段差穴（Sの逆）
      rows: [
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [1,0,0,1,0,0,1,0,0,1],
        [0,0,1,0,0,1,0,0,1,1],
        [1,0,0,1,0,0,1,0,0,1],
        [0,0,1,0,0,1,0,0,1,1],
        [1,0,0,1,0,0,1,0,0,1],
        [0,0,1,0,0,1,0,0,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
      ],
      spinCount: 6,
    },
  ],

  // ─────────────────────────────────────────────────
  // L-SPIN: Lミノ着地後に回転
  // Lミノ rot=2:
  //   [0,0,0]
  //   [1,1,1]
  //   [1,0,0]
  // 右回転(→rot=3):
  //   [1,1,0]
  //   [0,1,0]
  //   [0,1,0]
  //
  // 使いやすいL-spin:
  // Lをrot=1(縦右)で着地、右回転(→rot=2)で横ラインへ
  // rot=1:
  //   [0,1,0]
  //   [0,1,0]
  //   [0,1,1]
  // ─────────────────────────────────────────────────
  lspin: [
    {
      // L-spin: コーナー引っかかり×6
      // rot=1(縦)で着地→右回転(rot=2)でライン消去
      // 穴の形: 右コーナーがあるL字穴
      rows: [
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,1,0,0,1,0,0,1,1],
        [0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,0,1,1],
        [0,0,1,0,0,1,0,0,1,1],
        [0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,0,1,1],
        [0,0,1,0,0,1,0,0,1,1],
        [0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
      ],
      spinCount: 6,
    },
  ],

  // ─────────────────────────────────────────────────
  // J-SPIN: Jミノ着地後に回転（Lの鏡像）
  // Jミノ rot=3(縦左)で着地→左回転(rot=2)でライン消去
  // rot=3:
  //   [1,1,0]
  //   [0,1,0]
  //   [0,1,0]
  // ─────────────────────────────────────────────────
  jspin: [
    {
      // J-spin: 左コーナー引っかかり×6
      rows: [
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [1,0,0,1,0,0,1,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,1,1,1,1,1],
        [1,0,0,1,0,0,1,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,1,1,1,1,1],
        [1,0,0,1,0,0,1,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
      ],
      spinCount: 6,
    },
  ],

  // ─────────────────────────────────────────────────
  // 180° SPIN: Tミノ180°（Aキー）で天井裏に滑り込む
  // rot=0(△)→rot=2(▽)で天井のある穴に入る
  // kick180テーブル: [[0,0],[1,0],[-1,0],[0,1],[1,1],[-1,1]]
  // 穴形状: 上overhang + 下3マス空き（T字型、上が塞がれた形）
  // ─────────────────────────────────────────────────
  spin180: [
    {
      // 180 T-spin: overhang穴×5
      // Tをrot=0で穴の上に置き、Aで180回転してoverhangの下に入る
      rows: [
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [1,0,1,1,1,0,1,1,1,1],  // overhang (天井)
        [0,0,0,1,0,0,0,1,1,1],  // 穴（T字の下）
        [1,1,1,1,1,0,1,1,1,1],  // 仕切り
        [1,0,1,1,1,0,1,1,1,1],
        [0,0,0,1,0,0,0,1,1,1],
        [1,1,1,1,1,0,1,1,1,1],
        [1,0,1,1,1,0,1,1,1,1],
        [0,0,0,1,0,0,0,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
      ],
      spinCount: 6,
    },
    {
      // 180 J-spin: Jミノ180°でoverhangの下へ
      rows: [
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [1,0,0,1,1,0,0,1,1,1],  // overhang
        [0,0,0,0,0,0,0,0,1,1],
        [1,1,0,1,1,1,0,1,1,1],
        [1,0,0,1,1,0,0,1,1,1],
        [0,0,0,0,0,0,0,0,1,1],
        [1,1,0,1,1,1,0,1,1,1],
        [1,0,0,1,1,0,0,1,1,1],
        [0,0,0,0,0,0,0,0,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
      ],
      spinCount: 6,
    },
  ],
};

// =====================================================
// ===== 40 LINE MODE ==================================
// テトリスの「40ライン」モード:
//   - 40ライン消去タイムアタック
//   - ゴミなし・ソロプレイ
//   - 残りライン数と経過タイムをリアルタイム表示
//   - 達成時にタイムを表示してゲーム終了
// =====================================================

function initFortyLineGame(players, bagSeed) {
  setupInput();

  fortyLineStartTime = performance.now();
  fortyLineMode = true;

  // リプレイ記録開始
  ReplayRecorder.start({
    players,
    bagSeed,
    myId,
    playerName: myName,
    roomPlayers: [...roomPlayers],
    mode: 'fortyline'
  });

  // タイマーUIを作成
  _createFortyLineUI();
  // ボード背後オーバーレイを有効化
  if (renderer && renderer._modeOverlayText) {
    renderer._modeOverlayText.text = '40';
    renderer._modeOverlayText.style.fill = '#ffffff33';
    renderer._modeOverlayText.visible = true;
    if (renderer._modeOverlaySubText) { renderer._modeOverlaySubText.text = '00:00.0'; renderer._modeOverlaySubText.visible = true; }
  }

  // タイマー更新ループ
  fortyLineTimer = setInterval(() => {
    if (!fortyLineMode || !gameState || !gameState.alive) return;
    _updateFortyLineUI();
  }, 16);

  // ゲームループ
  let lastTime = performance.now();
  let lastEmit = 0;
  const EMIT_INTERVAL = 50;
  gameApp.ticker.add(() => {
    const now = performance.now();
    const rawDt = Math.min(now - lastTime, 100);
    lastTime = now;
    if (gameState && gameState.alive) {
      gameState.updateGravity(rawDt);
      if (now - lastEmit >= EMIT_INTERVAL) {
        lastEmit = now;
        gameState._emitCurrentPiece();
      }
    }
    renderer && renderer.update(rawDt * ANIM_SPEED);
  });
}

function _createFortyLineUI() {
  // 上部の小さなオーバーレイは廃止。ボード後ろに大きく薄く表示
  const old = document.getElementById('fortyliner-overlay');
  if (old) old.remove();
  // PIXIのGraphics/Textはrendererが持つので、ここではDOMではなくrenderer経由で作る
  _updateFortyLineUI();
}

function _getOverlayAlpha(hex2) {
  // settings.overlayOpacityを0-100として16進2桁に変換
  const pct = (settings.overlayOpacity !== undefined ? settings.overlayOpacity : 33) / 100;
  const v = Math.round(pct * 255).toString(16).padStart(2,'0');
  return v;
}

function _updateFortyLineUI() {
  const remaining = Math.max(0, 40 - (gameState ? gameState.lines : 0));
  const elapsed = performance.now() - fortyLineStartTime;
  const mins = Math.floor(elapsed / 60000);
  const secs = Math.floor((elapsed % 60000) / 1000);
  const tenths = Math.floor((elapsed % 1000) / 100);
  if (renderer && renderer._modeOverlayText) {
    renderer._modeOverlayText.text = String(remaining).padStart(2, '0');
    const a = _getOverlayAlpha();
    const aHi = Math.min(255, Math.round(parseInt(a,16)*1.5)).toString(16).padStart(2,'0');
    const fillCol = remaining <= 10 ? `#ff006e${aHi}` : remaining <= 20 ? `#ffffff${aHi}` : `#ffffff${a}`;
    renderer._modeOverlayText.style = new PIXI.TextStyle({
      fontFamily: 'Orbitron, sans-serif',
      fontSize: Math.round(BOARD_W * 0.55),
      fill: fillCol,
      fontWeight: '900',
      align: 'center',
    });
    renderer._modeOverlayText.anchor.set(0.5);
    if (renderer._modeOverlaySubText) {
      renderer._modeOverlaySubText.text = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}.${tenths}`;
    }
  }
  // クライアント側で即座にタイマー停止（サーバー応答待ちなしで遅延ゼロ）
  if (remaining <= 0 && fortyLineTimer) {
    clearInterval(fortyLineTimer);
    fortyLineTimer = null;
  }
}

function _stopFortyLineUI() {
  if (fortyLineTimer) { clearInterval(fortyLineTimer); fortyLineTimer = null; }
  if (renderer && renderer._modeOverlayText) {
    try { renderer._modeOverlayText.visible = false; } catch(e) {}
  }
}

// サーバーから40ライン達成通知を受信
socket.on('forty_line_clear', ({ playerName, elapsedMs }) => {
  _stopFortyLineUI();
  fortyLineMode = false;

  // リプレイ記録を停止
  ReplayRecorder.stop(elapsedMs);

  // 達成タイムを表示してからリプレイUIを開く
  const mins = Math.floor(elapsedMs / 60000);
  const secs = Math.floor((elapsedMs % 60000) / 1000);
  const ms = Math.floor((elapsedMs % 1000) / 10);
  const timeStr = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}.${String(ms).padStart(2,'0')}`;

  // 達成フラッシュ演出
  const flash = document.createElement('div');
  flash.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.85);z-index:10000;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    font-family:monospace;color:#fff;pointer-events:none;
  `;
  flash.innerHTML = `
    <div style="font-size:48px;font-weight:bold;color:#00f5ff;letter-spacing:4px;">40 LINES!</div>
    <div style="font-size:28px;color:#ffd700;margin-top:16px;">${timeStr}</div>
    <div style="font-size:16px;color:#aaa;margin-top:8px;">${playerName}</div>
  `;
  document.body.appendChild(flash);
  setTimeout(() => {
    flash.remove();
    // リプレイUIを表示
    showReplayUI(ReplayRecorder.export(), elapsedMs, playerName);
  }, 3000);
});

// =====================================================
// ===== CHEESE MODE ====================================
// 40ラインクリアを目指すモード。開始時に10ラインの
// ゴミがせり上がり、ライン消去後に消した行数分だけ
// 下から1マス穴のゴミがせり上がる。
// =====================================================

function initCheeseGame(players, bagSeed) {
  setupInput();

  cheeseStartTime = performance.now();
  cheeseMode = true;
  cheeseHandCount = 0;

  // リプレイ記録開始
  ReplayRecorder.start({
    players, bagSeed, myId, playerName: myName,
    roomPlayers: [...roomPlayers],
    mode: 'cheese'
  });

  // 初期10ラインのゴミをせり上げ
  if (gameState) {
    const cols = getGameCols();
    for (let i = 0; i < 10; i++) {
      const hole = Math.floor(Math.random() * cols);
      const garbageRow = Array(cols).fill('G');
      garbageRow[hole] = 0;
      gameState.board.shift();
      gameState.board.push(garbageRow);
    }
    // 上部の空行をトリム
    while (gameState.board.length > ROWS + HIDDEN && gameState.board[0].every(c => c === 0)) {
      gameState.board.shift();
    }
  }

  _createCheeseUI();

  // ボード背後オーバーレイを有効化
  if (renderer && renderer._modeOverlayText) {
    renderer._modeOverlayText.text = '40';
    renderer._modeOverlayText.style.fill = '#ffffff33';
    renderer._modeOverlayText.visible = true;
    if (renderer._modeOverlaySubText) { renderer._modeOverlaySubText.text = 'HANDS: 0'; renderer._modeOverlaySubText.visible = true; }
  }

  // タイマー更新ループ
  cheeseTimer = setInterval(() => {
    if (!cheeseMode || !gameState || !gameState.alive) return;
    _updateCheeseUI();
  }, 16);

  let lastTime = performance.now();
  let lastEmit = 0;
  const EMIT_INTERVAL = 50;
  gameApp.ticker.add(() => {
    const now = performance.now();
    const rawDt = Math.min(now - lastTime, 100);
    lastTime = now;
    if (gameState && gameState.alive) {
      gameState.updateGravity(rawDt);
      if (now - lastEmit >= EMIT_INTERVAL) {
        lastEmit = now;
        gameState._emitCurrentPiece();
      }
    }
    renderer && renderer.update(rawDt * ANIM_SPEED);
  });
}

function _createCheeseUI() {
  const old = document.getElementById('cheese-overlay');
  if (old) old.remove();
  _updateCheeseUI();
}

function _updateCheeseUI() {
  const remaining = Math.max(0, 40 - (gameState ? gameState.lines : 0));
  const elapsed = performance.now() - cheeseStartTime;
  const mins = Math.floor(elapsed / 60000);
  const secs = Math.floor((elapsed % 60000) / 1000);
  const tenths = Math.floor((elapsed % 1000) / 100);
  if (renderer && renderer._modeOverlayText) {
    renderer._modeOverlayText.text = String(remaining).padStart(2, '0');
    const a = _getOverlayAlpha();
    const aHi = Math.min(255, Math.round(parseInt(a,16)*1.5)).toString(16).padStart(2,'0');
    const fillCol = remaining <= 10 ? `#ff006e${aHi}` : remaining <= 20 ? `#ffffff${aHi}` : `#ffffff${a}`;
    renderer._modeOverlayText.style = new PIXI.TextStyle({
      fontFamily: 'Orbitron, sans-serif',
      fontSize: Math.round(BOARD_W * 0.55),
      fill: fillCol,
      fontWeight: '900',
      align: 'center',
    });
    renderer._modeOverlayText.anchor.set(0.5);
    if (renderer._modeOverlaySubText) {
      renderer._modeOverlaySubText.text = `HANDS: ${cheeseHandCount}  ${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}.${tenths}`;
    }
  }
  if (remaining <= 0 && cheeseTimer) {
    clearInterval(cheeseTimer);
    cheeseTimer = null;
  }
}

function _stopCheeseUI() {
  if (cheeseTimer) { clearInterval(cheeseTimer); cheeseTimer = null; }
  if (renderer && renderer._modeOverlayText) {
    try { renderer._modeOverlayText.visible = false; } catch(e) {}
  }
}

// サーバーからチーズモード達成通知を受信
socket.on('cheese_clear', ({ playerName, elapsedMs, handCount }) => {
  _stopCheeseUI();
  cheeseMode = false;
  cheeseHandCount = handCount || 0;

  ReplayRecorder.stop(elapsedMs, undefined, handCount || 0);

  const mins = Math.floor(elapsedMs / 60000);
  const secs = Math.floor((elapsedMs % 60000) / 1000);
  const ms = Math.floor((elapsedMs % 1000) / 10);
  const timeStr = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}.${String(ms).padStart(2,'0')}`;

  const flash = document.createElement('div');
  flash.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.85);z-index:10000;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    font-family:monospace;color:#fff;pointer-events:none;
  `;
  flash.innerHTML = `
    <div style="font-size:44px;font-weight:bold;color:#ffbe0b;letter-spacing:4px;">🧀 CHEESE MODE CLEAR!</div>
    <div style="font-size:28px;color:#ffd700;margin-top:16px;">${timeStr}</div>
    <div style="font-size:18px;color:#aaa;margin-top:8px;">HANDS: ${handCount}</div>
    <div style="font-size:16px;color:#aaa;margin-top:4px;">${playerName}</div>
  `;
  document.body.appendChild(flash);
  setTimeout(() => {
    flash.remove();
    showReplayUI(ReplayRecorder.export(), elapsedMs, playerName);
  }, 3000);
});

// =====================================================
// ===== BLITZ MODE ====================================
// 2分間でスコアを競うタイムアタックモード
// =====================================================

function initBlitzGame(players, bagSeed) {
  setupInput();
  blitzStartTime = performance.now();
  blitzMode = true;

  // リプレイ記録開始
  ReplayRecorder.start({
    players, bagSeed, myId, playerName: myName,
    roomPlayers: [...roomPlayers],
    mode: 'blitz'
  });

  _createBlitzUI();
  // ボード背後オーバーレイを有効化
  if (renderer && renderer._modeOverlayText) {
    renderer._modeOverlayText.text = '2:00';
    renderer._modeOverlayText.style.fill = '#ffffff2a';
    renderer._modeOverlayText.visible = true;
    if (renderer._modeOverlaySubText) { renderer._modeOverlaySubText.text = '0'; renderer._modeOverlaySubText.visible = true; }
  }
  const _blitzClientTimeout = setTimeout(() => {
    if (!blitzMode) return;
    const finalScore = gameState ? gameState.score : 0;
    blitzMode = false;
    _stopBlitzUI();
    ReplayRecorder.stop(120000);
    showBlitzReplayUI(ReplayRecorder.export(), finalScore, myName);
  }, 120500); // 120.5秒（サーバーより少し遅らせる）
  // タイムアウトIDをグローバルに保持してblitz_endで解除できるように
  window._blitzClientTimeout = _blitzClientTimeout;
  blitzTimer = setInterval(() => {
    if (!blitzMode || !gameState || !gameState.alive) return;
    _updateBlitzUI();
  }, 16);

  let lastTime = performance.now();
  let lastEmit = 0;
  const EMIT_INTERVAL = 50;
  gameApp.ticker.add(() => {
    const now = performance.now();
    const rawDt = Math.min(now - lastTime, 100);
    lastTime = now;
    if (gameState && gameState.alive) {
      gameState.updateGravity(rawDt);
      if (now - lastEmit >= EMIT_INTERVAL) {
        lastEmit = now;
        gameState._emitCurrentPiece();
      }
    }
    renderer && renderer.update(rawDt * ANIM_SPEED);
  });
}

function _createBlitzUI() {
  // 上部オーバーレイは廃止。ボード後ろに大きく薄く表示
  const old = document.getElementById('blitz-overlay');
  if (old) old.remove();
  _updateBlitzUI();
}

function _updateBlitzUI() {
  const elapsed = performance.now() - blitzStartTime;
  const remaining = Math.max(0, 120000 - elapsed);
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  if (renderer && renderer._modeOverlayText) {
    renderer._modeOverlayText.text = `${mins}:${String(secs).padStart(2,'0')}`;
    const a = _getOverlayAlpha();
    const aHi = Math.min(255, Math.round(parseInt(a,16)*1.5)).toString(16).padStart(2,'0');
    const fillCol = remaining < 10000 ? `#ff006e${aHi}` : remaining < 30000 ? `#ffffff${aHi}` : `#ffffff${a}`;
    renderer._modeOverlayText.style = new PIXI.TextStyle({
      fontFamily: 'Orbitron, sans-serif',
      fontSize: Math.round(BOARD_W * 0.42),
      fill: fillCol,
      fontWeight: '900',
      align: 'center',
    });
    renderer._modeOverlayText.anchor.set(0.5);
    if (renderer._modeOverlaySubText) {
      renderer._modeOverlaySubText.text = gameState ? gameState.score.toLocaleString() : '0';
    }
  }
  // クライアント側で即座にタイマー停止（遅延ゼロ）
  if (remaining <= 0 && blitzTimer) {
    clearInterval(blitzTimer);
    blitzTimer = null;
  }
}

function _stopBlitzUI() {
  if (blitzTimer) { clearInterval(blitzTimer); blitzTimer = null; }
  // PIXIテキストはrenderer破棄時に消える（DOM要素なし）
  if (renderer && renderer._modeOverlayText) {
    try { renderer._modeOverlayText.visible = false; } catch(e) {}
  }
}

// サーバーからBlitz終了通知を受信
socket.on('blitz_end', ({ winner, winnerName, scores, elapsedMs }) => {
  if (window._blitzClientTimeout) { clearTimeout(window._blitzClientTimeout); window._blitzClientTimeout = null; }
  _stopBlitzUI();
  blitzMode = false;

  const finalScore = gameState ? gameState.score : 0;
  ReplayRecorder.stop(120000, finalScore);

  // フラッシュ演出
  const flash = document.createElement('div');
  flash.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.88);z-index:10000;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    font-family:Orbitron,sans-serif;color:#fff;pointer-events:none;
  `;
  const sortedScores = [...scores].sort((a,b)=>b.score-a.score);
  const scoreRows = sortedScores.map(s => `<div style="color:${s.id===myId?'#00f5ff':'#aaa'};font-size:14px;margin:4px 0">${s.name}: ${s.score.toLocaleString()}</div>`).join('');
  flash.innerHTML = `
    <div style="font-size:42px;font-weight:bold;color:#ff006e;letter-spacing:4px;">⚡ BLITZ END!</div>
    <div style="font-size:22px;color:#ffd700;margin-top:12px;">${winnerName}</div>
    <div style="margin-top:16px;">${scoreRows}</div>
  `;
  document.body.appendChild(flash);
  setTimeout(() => {
    flash.remove();
    showBlitzReplayUI(ReplayRecorder.export(), finalScore, myName);
  }, 3000);
});

function showBlitzReplayUI(replayData, finalScore, playerName) {
  const o = document.getElementById('result-overlay');
  const rc = o.querySelector('.result-card');

  rc.innerHTML = `
    <div class="result-title" style="color:#ff006e">⚡ BLITZ RESULT</div>
    <div class="result-winner" style="color:#ffd700;font-size:1.6rem;margin:0.5rem 0">${finalScore.toLocaleString()} pts</div>
    <div style="color:#aaa;font-size:0.8rem;margin-bottom:1rem">${playerName}</div>

    <div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap;margin-bottom:1rem">
      <button class="btn btn-secondary" onclick="BlitzReplayUI.watchReplay()" style="font-size:0.75rem;padding:0.5rem 1rem">▶ リプレイを見る</button>
      <button class="btn btn-secondary" onclick="BlitzReplayUI.saveReplay()" style="font-size:0.75rem;padding:0.5rem 1rem">💾 保存</button>
      <label class="btn btn-secondary" style="font-size:0.75rem;padding:0.5rem 1rem;cursor:pointer">
        📂 読み込む
        <input type="file" accept=".tetreplay,.json" style="display:none" onchange="BlitzReplayUI.loadFromFile(this)">
      </label>
    </div>

    <div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="returnToRoom()" style="font-size:0.75rem">RETURN TO ROOM</button>
      <button class="btn btn-secondary" onclick="backToLobby()" style="font-size:0.75rem">BACK TO LOBBY</button>
    </div>
  `;
  o.classList.add('open');
  window._lastReplayData = replayData;
}

const BlitzReplayUI = {
  watchReplay() {
    const data = window._lastReplayData;
    if (!data || !data.events || data.events.length === 0) { alert('リプレイデータがありません'); return; }
    document.getElementById('result-overlay').classList.remove('open');
    openBlitzReplayViewer(data);
  },
  saveReplay() {
    const data = window._lastReplayData;
    if (!data) return;
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const score = data.meta && data.meta.finalScore ? data.meta.finalScore : 0;
    a.href = url; a.download = `tetrix_blitz_${score}.tetreplay`;
    a.click(); URL.revokeObjectURL(url);
  },
  loadFromFile(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.events) throw new Error('Invalid replay file');
        window._lastReplayData = data;
        document.getElementById('result-overlay').classList.remove('open');
        openBlitzReplayViewer(data);
      } catch(err) {
        alert('リプレイファイルの読み込みに失敗しました: ' + err.message);
      }
    };
    reader.readAsText(file);
  }
};

function openBlitzReplayViewer(replayData) {
  // 40ラインのビューワーを再利用（blitz用ラベルを追加）
  openReplayViewer(replayData, 'blitz');
}

// =====================================================
// ===== REPLAY SYSTEM =================================
// 40ラインモード専用リプレイシステム
// - ゲーム中の全イベントをタイムスタンプ付きで記録
// - 記録終了後にファイル保存 / 読み込み / 再生が可能
// - 再生中はPixiJSレンダラーを使いリアルタイム速度で描画
// =====================================================

const ReplayRecorder = (() => {
  let _events = [];
  let _startTime = 0;
  let _recording = false;
  let _meta = {};

  function start(meta) {
    _events = [];
    _startTime = performance.now();
    _recording = true;
    _meta = { ...meta, recordedAt: Date.now() };
  }

  function record(type, data) {
    if (!_recording) return;
    _events.push({ t: performance.now() - _startTime, type, data });
  }

  function stop(elapsedMs, finalScore, handCount) {
    _recording = false;
    _meta.elapsedMs = elapsedMs;
    if (finalScore !== undefined) _meta.finalScore = finalScore;
    else if (gameState) _meta.finalScore = gameState.score;
    if (handCount !== undefined) _meta.handCount = handCount;
  }

  function export_() {
    return { meta: { ..._meta }, events: _events.map(e => ({ ...e, data: JSON.parse(JSON.stringify(e.data)) })) };
  }

  function isRecording() { return _recording; }

  return { start, record, stop, export: export_, isRecording };
})();

// リプレイプレイヤー
const ReplayPlayer = (() => {
  let _replay = null;
  let _paused = false;
  let _speed = 1.0;
  let _currentIdx = 0;
  let _startWallTime = 0;
  let _startReplayTime = 0;
  let _timer = null;
  let _onEventCb = null;
  let _onDoneCb = null;
  let _onProgressCb = null;

  function load(replayData) {
    _replay = replayData;
    _currentIdx = 0;
    _paused = true;
  }

  function play(onEvent, onDone, onProgress) {
    if (!_replay) return;
    _onEventCb = onEvent;
    _onDoneCb = onDone;
    _onProgressCb = onProgress;
    _currentIdx = 0;
    _paused = false;
    _startWallTime = performance.now();
    _startReplayTime = 0;
    _tick();
  }

  function pause() {
    if (!_paused) {
      // 現在のreplayT位置を保存してからpause
      const wallElapsed = performance.now() - _startWallTime;
      _startReplayTime = _startReplayTime + wallElapsed * _speed;
      _startWallTime = performance.now();
    }
    _paused = true;
    if (_timer) { cancelAnimationFrame(_timer); _timer = null; }
  }
  function resume() {
    if (_paused) {
      _paused = false;
      // replayT = _startReplayTime + wallElapsed * _speed
      // wallElapsed = (replayT - _startReplayTime) / _speed
      // When resuming, replayT stays at _startReplayTime (current position)
      // so wallElapsed = 0, meaning _startWallTime = now
      _startWallTime = performance.now();
      // _startReplayTime already holds current replay position
      _tick();
    }
  }
  function setSpeed(s) {
    if (!_paused) {
      // Adjust _startReplayTime to current position before changing speed
      const wallElapsed = performance.now() - _startWallTime;
      _startReplayTime = _startReplayTime + wallElapsed * _speed;
      _startWallTime = performance.now();
    }
    _speed = s;
  }
  function stop() { _paused = true; if (_timer) { cancelAnimationFrame(_timer); _timer = null; } _currentIdx = 0; _replay = null; }

  function seekTo(pct) {
    if (!_replay) return;
    const targetT = (_replay.meta.elapsedMs || 0) * pct;
    const wasPlaying = !_paused;
    // Stop current tick
    if (_timer) { cancelAnimationFrame(_timer); _timer = null; }
    _paused = true;
    // Reset to beginning and apply all events up to targetT
    _currentIdx = 0;
    // Apply events up to target time
    // First reset game state by re-applying from start
    while (_currentIdx < _replay.events.length && _replay.events[_currentIdx].t <= targetT) {
      _onEventCb && _onEventCb(_replay.events[_currentIdx]);
      _currentIdx++;
    }
    _startReplayTime = targetT;
    _startWallTime = performance.now();
    if (wasPlaying) {
      _paused = false;
      _tick();
    }
  }

  function _tick() {
    if (_paused || !_replay) return;
    const wallElapsed = performance.now() - _startWallTime;
    const replayT = _startReplayTime + wallElapsed * _speed;

    while (_currentIdx < _replay.events.length && _replay.events[_currentIdx].t <= replayT) {
      _onEventCb && _onEventCb(_replay.events[_currentIdx]);
      _currentIdx++;
    }

    const totalMs = _replay.meta.elapsedMs || 1;
    _onProgressCb && _onProgressCb(Math.min(replayT / totalMs, 1), replayT);

    if (_currentIdx >= _replay.events.length && replayT >= totalMs) {
      _paused = true;
      _onDoneCb && _onDoneCb();
      return;
    }

    _timer = requestAnimationFrame(_tick);
  }

  function _getCurT() {
    if (_paused) return _startReplayTime;
    const wallElapsed = performance.now() - _startWallTime;
    return _startReplayTime + wallElapsed * _speed;
  }

  return { load, play, pause, resume, setSpeed, stop, seekTo, get paused() { return _paused; }, _getCurT };
})();

// リプレイUIを表示
function showReplayUI(replayData, elapsedMs, playerName) {
  const isCheese = replayData && replayData.meta && replayData.meta.mode === 'cheese';
  const handCount = replayData && replayData.meta && replayData.meta.handCount || 0;

  const o = document.getElementById('result-overlay');
  const rc = o.querySelector('.result-card');

  const mins = Math.floor(elapsedMs / 60000);
  const secs = Math.floor((elapsedMs % 60000) / 1000);
  const ms = Math.floor((elapsedMs % 1000) / 10);
  const timeStr = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}.${String(ms).padStart(2,'0')}`;

  rc.innerHTML = isCheese ? `
    <div class="result-title" style="color:#ffbe0b">🧀 CHEESE MODE CLEAR</div>
    <div class="result-winner" style="color:#ffd700;font-size:1.8rem;margin:0.5rem 0">${timeStr}</div>
    <div style="font-size:1.1rem;color:#ffbe0b;margin-bottom:0.5rem">HANDS: ${handCount}</div>
    <div style="color:#aaa;font-size:0.8rem;margin-bottom:1rem">${playerName}</div>

    <div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap;margin-bottom:1rem">
      <button class="btn btn-secondary" onclick="ReplayUI.watchReplay()" style="font-size:0.75rem;padding:0.5rem 1rem">▶ リプレイを見る</button>
      <button class="btn btn-secondary" onclick="ReplayUI.saveReplay()" style="font-size:0.75rem;padding:0.5rem 1rem">💾 保存</button>
      <label class="btn btn-secondary" style="font-size:0.75rem;padding:0.5rem 1rem;cursor:pointer">
        📂 読み込む
        <input type="file" accept=".tetreplay,.json" style="display:none" onchange="ReplayUI.loadFromFile(this)">
      </label>
    </div>

    <div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="returnToRoom()" style="font-size:0.75rem">RETURN TO ROOM</button>
      <button class="btn btn-secondary" onclick="backToLobby()" style="font-size:0.75rem">BACK TO LOBBY</button>
    </div>
  ` : `
    <div class="result-title" style="color:#00f5ff">🏁 40 LINE CLEAR</div>
    <div class="result-winner" style="color:#ffd700;font-size:1.8rem;margin:0.5rem 0">${timeStr}</div>
    <div style="color:#aaa;font-size:0.8rem;margin-bottom:1rem">${playerName}</div>

    <div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap;margin-bottom:1rem">
      <button class="btn btn-secondary" onclick="ReplayUI.watchReplay()" style="font-size:0.75rem;padding:0.5rem 1rem">▶ リプレイを見る</button>
      <button class="btn btn-secondary" onclick="ReplayUI.saveReplay()" style="font-size:0.75rem;padding:0.5rem 1rem">💾 保存</button>
      <label class="btn btn-secondary" style="font-size:0.75rem;padding:0.5rem 1rem;cursor:pointer">
        📂 読み込む
        <input type="file" accept=".tetreplay,.json" style="display:none" onchange="ReplayUI.loadFromFile(this)">
      </label>
    </div>

    <div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="returnToRoom()" style="font-size:0.75rem">RETURN TO ROOM</button>
      <button class="btn btn-secondary" onclick="backToLobby()" style="font-size:0.75rem">BACK TO LOBBY</button>
    </div>
  `;
  o.classList.add('open');

  window._lastReplayData = replayData;
}

// リプレイUI操作オブジェクト
const ReplayUI = {
  watchReplay() {
    const data = window._lastReplayData;
    if (!data || !data.events || data.events.length === 0) { alert('リプレイデータがありません'); return; }
    document.getElementById('result-overlay').classList.remove('open');
    openReplayViewer(data);
  },

  saveReplay() {
    const data = window._lastReplayData;
    if (!data) return;
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const meta = data.meta || {};
    const elMs = meta.elapsedMs || 0;
    const mins = String(Math.floor(elMs/60000)).padStart(2,'0');
    const secs = String(Math.floor((elMs%60000)/1000)).padStart(2,'0');
    const ms = String(Math.floor((elMs%1000)/10)).padStart(2,'0');
    const modeLabel = meta.mode === 'blitz' ? 'blitz' : meta.mode === 'fortyline' ? '40line' : meta.mode === 'cheese' ? 'cheese' : 'multi';
    a.href = url; a.download = `tetrix_${modeLabel}_${mins}${secs}${ms}.tetreplay`;
    a.click(); URL.revokeObjectURL(url);
  },

  loadFromFile(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.events) throw new Error('Invalid replay file');
        window._lastReplayData = data;
        document.getElementById('result-overlay').classList.remove('open');
        openReplayViewer(data);
      } catch(err) {
        alert('リプレイファイルの読み込みに失敗しました: ' + err.message);
      }
    };
    reader.readAsText(file);
  }
};

// リプレイビューワーを開く（PixiJSで再生）
function openReplayViewer(replayData, mode) {
  // 既存のPixiAppがあれば破棄
  if (gameApp) { try { gameApp.destroy(true); } catch(e) {} gameApp = null; }
  renderer = null;

  // リプレイ状態（エフェクト追跡用）
  const replayState = {
    _b2bCount: 0,
    _lastWasB2B: false,
    _ren: 0,
  };

  const meta = replayData.meta || {};
  const players = meta.players || [{ id: meta.myId || 'p1', name: meta.playerName || 'Player' }];
  const bagSeed = meta.bagSeed || 0;

  // PixiJS初期化（通常ゲームと同様）
  const container = document.getElementById('pixi-container');
  container.innerHTML = '';
  const W = container.clientWidth || window.innerWidth;
  const H = container.clientHeight || window.innerHeight;
  const res = settings.quality === 'minimum' || settings.quality === 'low' ? 1 :
              settings.quality === 'medium' ? 1.5 : settings.quality === 'ultra' ? 2.5 : 2;
  gameApp = new PIXI.Application({ width: W, height: H, backgroundColor: 0x030712, backgroundAlpha: 1, transparent: true, antialias: true, resolution: res, autoDensity: true });
  gameApp.ticker.maxFPS = settings.maxFPS||144;
  container.appendChild(gameApp.view);
  _applyBgImage();

  // ダミーのゲーム状態（レンダラー用）
  gameState = new TetrisGame(bagSeed);
  gameState.alive = false; // 重力など無効化
  renderer = new GameRenderer(gameApp, players, gameState);
  renderer.drawBoard(); renderer.drawGhost(); renderer.drawCurrent();
  renderer.drawNextPieces(); renderer.drawHold(); renderer.updateScoreUI();

  showScreen('game');

  // モード判定（applyEventクロージャで参照）
  const isBlitzReplay = mode === 'blitz' || (meta && meta.mode === 'blitz');
  const isFortyLineReplay = !isBlitzReplay && (mode === 'fortyline' || (meta && meta.mode === 'fortyline'));
  const isCheeseReplay = !isBlitzReplay && !isFortyLineReplay && (mode === 'cheese' || (meta && meta.mode === 'cheese'));

  // モード別ボード背後オーバーレイ
  if (renderer && renderer._modeOverlayText) {
    if (isFortyLineReplay) {
      renderer._modeOverlayText.text = '40';
      renderer._modeOverlayText.style = new PIXI.TextStyle({ fontFamily: 'Orbitron, sans-serif', fontSize: Math.round(BOARD_W * 0.55), fill: '#ffffff33', fontWeight: '900', align: 'center' });
      renderer._modeOverlayText.anchor.set(0.5);
      renderer._modeOverlayText.visible = true;
      if (renderer._modeOverlaySubText) renderer._modeOverlaySubText.visible = false;
    } else if (isBlitzReplay) {
      renderer._modeOverlayText.text = '2:00';
      renderer._modeOverlayText.style = new PIXI.TextStyle({ fontFamily: 'Orbitron, sans-serif', fontSize: Math.round(BOARD_W * 0.42), fill: '#ffffff2a', fontWeight: '900', align: 'center' });
      renderer._modeOverlayText.anchor.set(0.5);
      renderer._modeOverlayText.visible = true;
      if (renderer._modeOverlaySubText) { renderer._modeOverlaySubText.visible = true; }
    } else if (isCheeseReplay) {
      renderer._modeOverlayText.text = '40';
      renderer._modeOverlayText.style = new PIXI.TextStyle({ fontFamily: 'Orbitron, sans-serif', fontSize: Math.round(BOARD_W * 0.55), fill: '#ffffff33', fontWeight: '900', align: 'center' });
      renderer._modeOverlayText.anchor.set(0.5);
      renderer._modeOverlayText.visible = true;
      if (renderer._modeOverlaySubText) { renderer._modeOverlaySubText.text = 'HANDS: 0'; renderer._modeOverlaySubText.visible = true; }
    }
  }
  let _replayLastTime = performance.now();
  gameApp.ticker.add(() => {
    const now = performance.now();
    const dt = Math.min(now - _replayLastTime, 50);
    _replayLastTime = now;
    if (renderer) renderer.update(dt * ANIM_SPEED);
  });

  // リプレイUI（コントロールパネル）を作成
  const ctrl = _createReplayControlPanel(replayData.meta, mode);
  document.body.appendChild(ctrl);

  // イベントハンドラ（リプレイイベントをゲームUIに反映）
  function applyEvent(ev) {
    const { type, data } = ev;
    if (!renderer) return;

    switch (type) {
      case 'board_update': {
        // 自分のボード更新
        if (gameState) {
          gameState.board = data.board.map(r => [...r]);
          if (data.currentPiece) gameState.current = { ...data.currentPiece };
          if (data.nextPieces) gameState.nextQueue = data.nextPieces;
          if (data.holdPiece !== undefined) gameState.holdPiece = data.holdPiece;
          gameState.score = data.score || 0;
          gameState.lines = data.lines || 0;
          gameState.level = data.level || 1;
          if (data.garbageQueue) gameState.garbageQueue = data.garbageQueue.map(g=>({...g}));
        }
        renderer.drawBoard(); renderer.drawGhost(); renderer.drawCurrent();
        renderer.drawNextPieces(); renderer.drawHold(); renderer.updateScoreUI();
        // 傾き・シェイク再現（tickerで更新されるのでtargetだけ設定）
        if (data.tiltAngle !== undefined && settings.tilt === 'on') {
          renderer.tiltAngle = data.tiltAngle;
          renderer.tiltTarget = data.tiltAngle;
        }
        if (data.shakePower !== undefined) renderer.shakePower = Math.max(renderer.shakePower, data.shakePower);
        if (data.boardOffsetY !== undefined) renderer.boardOffsetY = Math.max(renderer.boardOffsetY, data.boardOffsetY);
        // カウンター更新
        _updateReplayFortyLineCounter(data.lines || 0, isBlitzReplay ? 'blitz' : isCheeseReplay ? 'cheese' : 'fortyline');
        // チーズモード: ハンド数表示
        if (isCheeseReplay && data.cheeseHandCount !== undefined) {
          if (renderer && renderer._modeOverlaySubText) {
            renderer._modeOverlaySubText.text = `HANDS: ${data.cheeseHandCount}`;
          }
          const handsEl = document.getElementById('replay-cheese-hands');
          if (handsEl) handsEl.textContent = `HANDS: ${data.cheeseHandCount}`;
        }
        // Blitzスコア・タイム更新
        const blitzScoreEl = document.getElementById('replay-blitz-score');
        if (blitzScoreEl) blitzScoreEl.textContent = (data.score || 0).toLocaleString();
        // Blitzリプレイ: 残り時間をオーバーレイに表示
        if (isBlitzReplay && renderer && renderer._modeOverlayText) {
          // 現在のリプレイ時刻はReplayPlayer経由で取得
          const curT = (typeof ReplayPlayer._getCurT === 'function') ? ReplayPlayer._getCurT() : 0;
          const remaining = Math.max(0, 120000 - curT);
          const rm = Math.floor(remaining / 60000);
          const rs2 = Math.floor((remaining % 60000) / 1000);
          renderer._modeOverlayText.text = `${rm}:${String(rs2).padStart(2,'0')}`;
          if (renderer._modeOverlaySubText) renderer._modeOverlaySubText.text = (data.score || 0).toLocaleString();
        }
        break;
      }
      case 'piece_update': {
        if (gameState && data.currentPiece) {
          gameState.current = { ...data.currentPiece };
          renderer.drawCurrent(); renderer.drawGhost();
        }
        break;
      }
      case 'hard_drop': {
        // ハードドロップ軌跡パーティクルをリプレイで再現
        if (renderer && renderer.onHardDrop && gameState && gameState.current) {
          renderer.onHardDrop(data.dropped || 0);
        }
        SFX.hardDrop && SFX.hardDrop();
        break;
      }
      case 'spin_effect': {
        if (gameState && gameState.current) {
          renderer.onSpinSparkle(gameState.current.x, gameState.current.y, gameState.current.type, data.spinType);
        }
        break;
      }
      case 'line_clear_effect': {
        // ライン消去エフェクト（リプレイ：完全版エフェクト）
        const { count, spinType, isB2B, ren, allClear, attack } = data;

        // B2B切れ検出（前回B2Bがあって今回ない場合）
        const wasB2B = replayState._lastWasB2B || false;
        const prevB2bCount = replayState._b2bCount || 0;
        if (wasB2B && !isB2B && count > 0) {
          // B2B切れ「脱力」エフェクト
          _replayB2bBreak(renderer, prevB2bCount);
        }

        if (count > 0) {
          // SFX
          if (count === 1) SFX.clear1();
          else if (count === 2) SFX.clear2();
          else if (count === 3) SFX.clear3();
          else if (count >= 4) SFX.tetris();
          if (spinType && spinType.includes('TSPIN')) SFX.tspin();
          if (isB2B) SFX.b2b();
          if (ren >= 2) SFX.ren(ren);
          if (allClear) SFX.allClear();

          // B2B更新
          if (isB2B) {
            replayState._b2bCount = (replayState._b2bCount || 0) + 1;
          } else {
            replayState._b2bCount = 0;
          }
          replayState._lastWasB2B = isB2B;

          // フルエフェクト（renderer.onLineClearを直接呼ぶ）
          if (renderer.onLineClear) {
            renderer._b2bCount = replayState._b2bCount;
            renderer.onLineClear([], count, spinType, isB2B, 0, ren, allClear, attack||0);
          }
        } else {
          // ライン消去なし → RENリセット
          replayState._lastWasB2B = false;
          // B2Bカウントはリセットしない（clearがないだけ）
        }
        break;
      }
      case 'lines_cleared': {
        // 攻撃送信エフェクト（プロジェクタイル等は相手がいる場合のみ）
        break;
      }
      case 'attack_sent': {
        const { fromId, toId, attack, clearRows } = data;
        if (fromId === meta.myId) {
          const launchY = renderer._getClearRowsCenterY && renderer._getClearRowsCenterY(clearRows);
          renderer.onAttackProjectile && renderer.onAttackProjectile(toId, attack, launchY);
        }
        break;
      }
      case 'opponent_update': {
        const d = renderer.opBoardData && renderer.opBoardData[data.id];
        if (d) {
          d.board = data.board;
          if (data.currentPiece) d.currentPiece = data.currentPiece;
          if (data.nextPieces) d.nextPieces = data.nextPieces;
          if (data.holdPiece !== undefined) d.holdPiece = data.holdPiece;
          if (data.score !== undefined) d.score = data.score;
          renderer.updateVisibleOpponents && renderer.updateVisibleOpponents();
        }
        break;
      }
      case 'bot_update': {
        const d = renderer.opBoardData && renderer.opBoardData[data.id];
        if (d) {
          d.board = data.board;
          if (data.nextPieces) d.nextPieces = data.nextPieces;
          if (data.holdPiece !== undefined) d.holdPiece = data.holdPiece;
          if (data.score !== undefined) d.score = data.score;
          renderer.updateVisibleOpponents && renderer.updateVisibleOpponents();
        }
        break;
      }
      case 'opponent_spin': {
        renderer.triggerOpponentSpin && renderer.triggerOpponentSpin(data.id, data.spinType);
        break;
      }
      case 'opponent_line_clear': {
        renderer.triggerOpponentLineClear && renderer.triggerOpponentLineClear(data.id, data.count, data.spinType, data.isB2B, data.ren, data.allClear);
        break;
      }
      case 'receive_garbage': {
        renderer.onGarbageIncoming && renderer.onGarbageIncoming(data.lines, data.fromId);
        break;
      }
      case 'player_dead': {
        renderer.opponentGameOver && renderer.opponentGameOver(data.id);
        break;
      }
    }
  }

  ReplayPlayer.load(replayData);

  function _startReplayPlayback() {
    ReplayPlayer.load(replayData);
    ReplayPlayer.play(
      applyEvent,
      () => {
        // 再生終了 → 最初から繰り返す
        const endEl = document.getElementById('replay-ctrl-status');
        if (endEl) endEl.textContent = 'リピート中...';
        const playBtn = document.getElementById('replay-play-btn');
        if (playBtn) { playBtn.textContent = '⏸'; playBtn.dataset.state = 'playing'; }
        setTimeout(() => { _startReplayPlayback(); }, 800);
      },
      (pct, replayT) => {
        // プログレス更新
        const bar = document.getElementById('replay-progress-bar');
        if (bar) bar.style.width = (pct * 100) + '%';
        const timeEl = document.getElementById('replay-time-display');
        if (timeEl) {
          const ms = Math.floor(replayT);
          const m = Math.floor(ms/60000);
          const s = Math.floor((ms%60000)/1000);
          const t = Math.floor((ms%1000)/100);
          timeEl.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${t}`;
        }
      }
    );
  }

  _startReplayPlayback();
}

// B2B切れ「脱力」エフェクト: ボードがぐったり落下してから戻る
function _replayB2bBreak(rend, b2bCount) {
  if (!rend || settings.quality === 'minimum') return;
  // 「脱力」: ボードが一瞬下にドロップしてゆっくり戻る
  // + 白い放電ライン
  if (rend._breakB2bLightning) rend._breakB2bLightning();

  // ボード全体を下に「落とす」視覚効果
  if (rend.boardWrap) {
    const origY = rend.boardWrap.y;
    const dropAmt = 18 + Math.min(b2bCount * 3, 30);
    const duration = 600;
    let elapsed = 0;
    const droop = () => {
      elapsed += 16;
      const t = elapsed / duration;
      if (t < 0.25) {
        // 0→1: 急降下
        const p = t / 0.25;
        rend.boardWrap.y = origY + dropAmt * p;
      } else if (t < 0.55) {
        // 1→0: ぐったりゆっくり戻る（ダンピング）
        const p = (t - 0.25) / 0.30;
        rend.boardWrap.y = origY + dropAmt * (1 - p * p);
      } else if (t < 0.8) {
        // 小さいバウンス
        const p = (t - 0.55) / 0.25;
        rend.boardWrap.y = origY - Math.sin(p * Math.PI) * dropAmt * 0.12;
      } else {
        rend.boardWrap.y = origY;
        return;
      }
      requestAnimationFrame(droop);
    };
    requestAnimationFrame(droop);
  }

  // 「ため息」パーティクル: 上向きにフワっと出る灰色粒子
  if (rend.effectsLayer && settings.particles !== 'off') {
    const cx = rend.mainBX + BOARD_W / 2;
    const cy = rend.mainBY + BOARD_H * 0.3;
    const n = settings.particles === 'high' ? 20 : 10;
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        if (!rend.effectsLayer) return;
        const g = new PIXI.Graphics();
        const sz = Math.random() * 5 + 3;
        const alpha = 0.5 + Math.random() * 0.3;
        g.beginFill(0xaaaaaa, alpha);
        g.drawCircle(0, 0, sz);
        g.endFill();
        g.x = cx + (Math.random() - 0.5) * BOARD_W * 0.7;
        g.y = cy + (Math.random() - 0.5) * BOARD_H * 0.3;
        rend.effectsLayer.addChild(g);
        // ゆっくり上昇してフェード
        const vx = (Math.random() - 0.5) * 0.8;
        const vy = -(0.5 + Math.random() * 1.2);
        rend.particles.push({ gfx: g, vx, vy, life: 1, decay: 0.012 + Math.random() * 0.008 });
      }, i * 40);
    }
  }

  // SFX: 力が抜けるような低い音
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc.connect(g2); g2.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.6);
    g2.gain.setValueAtTime(0.35 * sfxVol, ctx.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(); osc.stop(ctx.currentTime + 0.6);
  } catch(e) {}
}

function _updateReplayFortyLineCounter(lines, mode) {
  const isCheese = mode === 'cheese';
  const isBlitz = mode === 'blitz';
  // コントロールパネルのDOM要素（40ラインモード）
  const el = document.getElementById('replay-fortyliner-remaining');
  if (el) {
    const rem = Math.max(0, 40 - lines);
    el.textContent = rem;
    el.style.color = rem <= 10 ? '#ff006e' : rem <= 20 ? '#ffd700' : '#00f5ff';
  }
  // ボード後ろのオーバーレイテキスト
  if (renderer && renderer._modeOverlayText && renderer._modeOverlayText.visible) {
    if (!isBlitz && !isCheese) {
      const rem = Math.max(0, 40 - lines);
      renderer._modeOverlayText.text = String(rem).padStart(2,'0');
    } else if (isCheese) {
      const rem = Math.max(0, 40 - lines);
      renderer._modeOverlayText.text = String(rem).padStart(2,'0');
    }
  }
}

function _createReplayControlPanel(meta, mode) {
  // 既存のパネルを削除
  const old = document.getElementById('replay-ctrl-panel');
  if (old) old.remove();

  const elMs = meta && meta.elapsedMs ? meta.elapsedMs : 0;
  const isBlitz = mode === 'blitz' || (meta && meta.mode === 'blitz');
  const isCheese = mode === 'cheese' || (meta && meta.mode === 'cheese');
  const mins = String(Math.floor(elMs/60000)).padStart(2,'0');
  const secs = String(Math.floor((elMs%60000)/1000)).padStart(2,'0');
  const ms = String(Math.floor((elMs%1000)/10)).padStart(2,'0');
  const timeStr = `${mins}:${secs}.${ms}`;
  const totalLabel = isBlitz ? '2:00 BLITZ' : `/ ${timeStr}`;
  const barColor = isBlitz ? '#ff006e' : isCheese ? '#ffbe0b' : '#00f5ff';

  // モード別情報表示
  let modeInfo;
  if (isBlitz) {
    modeInfo = `<div style="display:flex;align-items:center;gap:4px"><span style="color:#ff006e;font-size:11px">⚡ BLITZ</span><span id="replay-blitz-score" style="color:#ffd700;font-weight:bold;font-size:14px">0</span></div>`;
  } else if (isCheese) {
    modeInfo = `<div style="display:flex;align-items:center;gap:4px"><span style="color:#ffbe0b;font-size:11px">🧀 CHEESE</span><span id="replay-fortyliner-remaining" style="color:#00f5ff;font-weight:bold;font-size:16px">40</span><span style="color:#aaa;font-size:11px">ライン</span></div>`;
  } else {
    modeInfo = `<div style="display:flex;align-items:center;gap:4px"><span style="color:#aaa;font-size:11px">残り</span><span id="replay-fortyliner-remaining" style="color:#00f5ff;font-weight:bold;font-size:16px">40</span><span style="color:#aaa;font-size:11px">ライン</span></div>`;
  }

  const panel = document.createElement('div');
  panel.id = 'replay-ctrl-panel';
  panel.style.cssText = `
    position:fixed;bottom:0;left:0;right:0;z-index:5000;
    background:rgba(3,7,18,0.95);border-top:1px solid ${barColor}44;
    padding:8px 16px;display:flex;flex-direction:column;gap:6px;
    font-family:monospace;
  `;

  panel.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px">
      <div id="replay-progress-track" style="flex:1;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;cursor:pointer;position:relative" onclick="ReplayUI.onSeek(event)">
        <div id="replay-progress-bar" style="height:100%;width:0%;background:${barColor};border-radius:3px;pointer-events:none;transition:width 0.1s"></div>
      </div>
      <div id="replay-time-display" style="color:#ffd700;font-size:12px;min-width:56px;text-align:right">00:00.0</div>
      <div style="color:#aaa;font-size:11px">${totalLabel}</div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <button id="replay-play-btn" data-state="playing" onclick="ReplayUI.togglePlay()" style="background:rgba(0,245,255,0.15);border:1px solid ${barColor};color:${barColor};padding:4px 14px;border-radius:6px;font-size:14px;cursor:pointer">⏸</button>
      ${isCheese?'<span id="replay-cheese-hands" style="color:#ffbe0b;font-size:12px;margin-left:4px"></span>':''}
      <select id="replay-speed-sel" onchange="ReplayUI.setSpeed(this.value)" style="background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:3px 6px;border-radius:6px;font-size:12px">
        <option value="0.25">×0.25</option>
        <option value="0.5">×0.5</option>
        <option value="1" selected>×1.0</option>
        <option value="2">×2.0</option>
        <option value="4">×4.0</option>
        <option value="6">×6.0</option>
        <option value="10">×10</option>
      </select>
      <span id="replay-ctrl-status" style="color:#aaa;font-size:11px;flex:1">再生中</span>
      ${modeInfo}
      <button onclick="ReplayUI.saveReplayFromViewer()" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer">💾 保存</button>
      <label style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer">
        📂 読込
        <input type="file" accept=".tetreplay,.json" style="display:none" onchange="ReplayUI.loadFromFile(this)">
      </label>
      <button onclick="ReplayUI.exitViewer()" style="background:rgba(255,0,110,0.15);border:1px solid #ff006e;color:#ff006e;padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer">✕ 終了</button>
    </div>
  `;

  return panel;
}

// ReplayUIに追加メソッド
Object.assign(ReplayUI, {
  onSeek(e) {
    const track = document.getElementById('replay-progress-track');
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    ReplayPlayer.seekTo(pct);
  },
  togglePlay() {
    const btn = document.getElementById('replay-play-btn');
    if (ReplayPlayer.paused) {
      ReplayPlayer.resume();
      if (btn) btn.textContent = '⏸';
      const st = document.getElementById('replay-ctrl-status');
      if (st) st.textContent = '再生中';
    } else {
      ReplayPlayer.pause();
      if (btn) btn.textContent = '▶';
      const st = document.getElementById('replay-ctrl-status');
      if (st) st.textContent = '一時停止中';
    }
  },
  setSpeed(v) { ReplayPlayer.setSpeed(parseFloat(v)); },
  saveReplayFromViewer() { this.saveReplay(); },
  exitViewer() {
    ReplayPlayer.stop();
    const p = document.getElementById('replay-ctrl-panel');
    if (p) p.remove();
    const fl = document.getElementById('fortyliner-overlay');
    if (fl) fl.style.display = 'none';
    returnToRoom();
  }
});




// ぷよテト「ビッグバンモード」と同じ仕様:
//   - 普通のテトリスとして対戦できる
//   - ラインを消すにはスピンが必須（スピンなしでは消えない）
//   - スピンに成功したラインだけ消える
//   - 相手からの攻撃も飛んでくる（通常対戦と同じ）
// =====================================================

// AllSpinゲームの状態
let asState = null;

function initAllSpinGame(players, bagSeed) {
  setupInput();

  asState = {
    totalSpins: 0,
    spinStreakCurrent: 0,
    spinStreakBest: 0,
    lastSpinType: null,
  };

  // オーバーレイを表示
  const overlay = document.getElementById('allspin-overlay');
  if(overlay) overlay.classList.add('active');

  updateAllSpinUI();

  // ゲームループ: 通常ゲームと同じ
  let lastTime = performance.now();
  let lastEmit = 0;
  const EMIT_INTERVAL = 50;
  gameApp.ticker.add(()=>{
    const now = performance.now();
    const rawDt = Math.min(now-lastTime, 100);
    lastTime = now;
    if(gameState && gameState.alive) {
      gameState.updateGravity(rawDt);
      if(now-lastEmit >= EMIT_INTERVAL) {
        lastEmit = now;
        gameState._emitCurrentPiece();
      }
    }
    renderer && renderer.update(rawDt*ANIM_SPEED);
  });
}

function updateAllSpinUI() {
  if(!asState) return;

  const spinEl = document.getElementById('allspin-spin-target');
  if(spinEl) {
    spinEl.textContent = 'BIG BANG MODE';
    spinEl.style.color = '#ff006e';
  }

  const hintEl = document.getElementById('allspin-hint');
  if(hintEl) hintEl.textContent = 'スピンしないとラインが消えない！回転で攻めろ！';

  const progEl = document.getElementById('allspin-progress');
  if(progEl) progEl.textContent = `スピン ${asState.totalSpins}`;

  const solvedEl = document.getElementById('allspin-solved-count');
  if(solvedEl) solvedEl.textContent = asState.totalSpins;

  const streakEl = document.getElementById('allspin-streak');
  if(streakEl) streakEl.textContent = `🔥 ${asState.spinStreakCurrent} streak`;
}

// BigBang: スピン消去を記録してUI更新
function onBigBangSpinClear(spinType, linesCleared) {
  if(!asState) return;
  asState.totalSpins++;
  asState.spinStreakCurrent++;
  if(asState.spinStreakCurrent > asState.spinStreakBest) {
    asState.spinStreakBest = asState.spinStreakCurrent;
  }
  asState.lastSpinType = spinType;

  // フラッシュ演出
  const flash = document.getElementById('allspin-cleared-flash');
  const text = document.getElementById('allspin-flash-text');
  if(flash && text) {
    const spinColors = {TSPIN:'#cc00ff',MINI_TSPIN:'#aa66ff',ISPIN:'#00f5ff',SSPIN:'#8BC34A',ZSPIN:'#ff006e',LSPIN:'#ff8500',JSPIN:'#4361ee',SPIN180:'#ffffff'};
    const msgs = {TSPIN:'T-SPIN!',MINI_TSPIN:'MINI T-SPIN!',ISPIN:'I-SPIN!',SSPIN:'S-SPIN!',ZSPIN:'Z-SPIN!',LSPIN:'L-SPIN!',JSPIN:'J-SPIN!',SPIN180:'180° SPIN!'};
    text.textContent = msgs[spinType] || 'SPIN!';
    text.style.color = spinColors[spinType] || '#ffffff';
    flash.classList.add('show');
    clearTimeout(asState._flashTimer);
    asState._flashTimer = setTimeout(()=>flash.classList.remove('show'), 900);
  }

  updateAllSpinUI();
}

// AllSpinモード(BigBang): clearLinesをオーバーライド
// スピンなしでの消去をブロックする
const _origClearLines = TetrisGame.prototype.clearLines;
TetrisGame.prototype.clearLines = function() {
  if(!allspinMode) {
    _origClearLines.call(this);
    return;
  }

  // BigBangモード: スピンがなければラインを消去しない
  const spinType = this.lastSpinType;

  if(!spinType) {
    // スピンなし: ラインは消えない。ゴミ適用等はする
    const allspinPendingGO=this._pendingGameOver;
    this._pendingGameOver=false;
    const wouldClear = [];
    for(let r = Math.min(this.board.length-1, ROWS+HIDDEN-1); r >= 0; r--) {
      if(this.board[r].every(c=>c!==0)) wouldClear.push(r);
    }

    if(wouldClear.length > 0) {
      // ラインは消えないが、コンボリセット
      if(this.ren > 0) { SFX.renReset(); }
      this.combo = -1;
      this.ren = 0;
      renderer && renderer.endComboLabel();
      socket.emit('line_clear_effect',{count:0,spinType:null,isB2B:false,ren:0,allClear:false});

      // ゴミキューの処理
      const now = performance.now();
      const armed = this.garbageQueue.filter(g=>g.readyAt<=now);
      this.garbageQueue = this.garbageQueue.filter(g=>g.readyAt>now);
      if(armed.length && this.combo < 1) {
        const total = armed.reduce((a,b)=>a+b.lines,0);
        if(total > 0) this._applyGarbageAnimated(armed, total);
      }

      this.lastSpin = null; this.lastSpinType = null;
      this._lastLinesCleared = 0;
      this.spawnPiece();
    this._emitBoardUpdate();
    // 空行のみトリム、ロック済みセルは保持
    while(this.board.length>ROWS+HIDDEN&&this.board[0].every(c=>c===0))this.board.shift();
      if(shogiMode) socket.emit('shogi_human_placed');
      if(!this.alive || this._pendingGameOver || allspinPendingGO) {
        this.alive = false; this._pendingGameOver = false;
        if(!isOfflineSolo)socket.emit('game_over',{totalAttackSent:this.totalAttackSent,totalGarbageReceived:this.totalGarbageReceived});_enterSpectateOnDeath();renderer && renderer.onGameOver();_offlineSoloGameOverAutoReturn();
      }
      return;
    }

    // 消去候補なし: 通常処理
    _origClearLines.call(this);
    return;
  }

  // スピンあり: 通常通り消去
  _origClearLines.call(this);

  // スピン消去UIを更新
  const cleared = this._lastLinesCleared || 0;
  if(cleared > 0) {
    onBigBangSpinClear(spinType, cleared);
  }
};

// NOTE: allspinModeでもゲームオーバーは普通に処理（ビッグバンは通常対戦ルール）
// clearLines末尾でgame_overが送られるのでoverrideは不要


// ---- Floating Label ----
class FloatLabel{
  constructor(app,x,y,text,color,persistent=false){
    this.app=app;this.alive=true;this.persistent=persistent;
    this._ended=false;this.baseX=x;this.baseY=y;
    this._timer=0;this._fadeDur=600;
    const sz=persistent?20:17;
    const st=new PIXI.TextStyle({fontFamily:'Orbitron',fontSize:sz,fill:color,fontWeight:'400',letterSpacing:2,
      dropShadow:true,dropShadowColor:0x000000,dropShadowDistance:3,dropShadowBlur:4});
    this.txt=new PIXI.Text(text,st);
    this.txt.anchor.set(0,0.5);this.txt.x=x;this.txt.y=y;this.txt.alpha=0;this.txt.scale.set(1.5);
    app.stage.addChild(this.txt);
    this._popT=0;this._popping=true;
  }
  update(dt){
    if(!this.alive)return;
    if(this._popping){
      this._popT+=dt;const p=Math.min(1,this._popT/200);const ease=1-(1-p)*(1-p);
      this.txt.scale.set(1.5-0.5*ease);this.txt.alpha=ease;
      if(p>=1){this._popping=false;this.txt.scale.set(1);this.txt.alpha=1;this._timer=0;}
      return;
    }
    if(this.persistent&&!this._ended)return;
    this._timer+=dt;
    const a=Math.max(0,1-this._timer/this._fadeDur);
    this.txt.alpha=a;
    this.txt.scale.set(Math.max(0.1,1+this._timer*0.002),1);
    this.txt.x=this.baseX+(this._timer*0.08);
    if(a<=0){this.alive=false;try{this.txt.destroy();}catch(e){}}
  }
  updateText(t){
    if(!this.txt||!this.alive)return;
    const old=this.txt.text;this.txt.text=t;
    if(old!==t){this._popping=true;this._popT=0;this.txt.scale.set(1.4);}
  }
  end(){this._ended=true;this._timer=0;}
  destroy(){this.alive=false;try{this.txt.destroy();}catch(e){}}
}

class GameRenderer{
  constructor(app,players,gs){
    this.app=app;this.players=players;this.gs=gs;
    this.W=app.screen.width;this.H=app.screen.height;
    this.myPlayer=players.find(p=>p.id===myId);
    this.opponentPlayers=players.filter(p=>p.id!==myId);
    this.boardOffsetY=0;this.boardOffsetX=0;
    this.tiltAngle=0;this.tiltTarget=0;this.shakePower=0;
    // 壁バウンス: 押し込み中は繰り返さない
    this.wallBumpX=0;this._wallBumpActive=false;this._wallPressX=0;
    this.particles=[];this.projectiles=[];this.floatLabels=[];this._customLabels=[];
    this.comboLabel=null;this.attackLabel=null;this._attackAccum=0;
    this.opBoardData={};this._flashAlpha=0;
    this._gameOverTick=null;
    // B2B 雷エフェクト
    this._b2bCount=0;this._lightningBolts=[];this._lightningTimer=0;
    // B2Bバッジ初期化 (buildSideUI後に呼ばれるので存在チェック)
    if(this.b2bBadgeCont)this.b2bBadgeCont.visible=false;
    // 煙エフェクト（危機状態）
    this._smokeParticles=[];this._smokeTick=0;
    this.root=new PIXI.Container();app.stage.addChild(this.root);
    this.buildLayout();this.createBg();
    this.buildOpponentBoards();this.buildMainBoard();this.buildSideUI();
    this.effectsLayer=new PIXI.Container();app.stage.addChild(this.effectsLayer);
    this.projLayer=new PIXI.Container();app.stage.addChild(this.projLayer);
  }

  buildLayout(){
    const ui=settings.uiLayout||{};
    const offY=ui.boardOffsetY||0;
    const userScale=(ui.boardScale||100)/100;
    this._is1v1=this.opponentPlayers&&this.opponentPlayers.length===1;
    // Auto-scale: shrink if board would overflow screen
    const margin=60;
    const vertFit=(this.H-margin)/BOARD_H;
    const hozFit=this._is1v1
      ?(this.W-margin)/(BOARD_W*2+120)
      :(this.W-margin)/BOARD_W;
    this._uiScale=Math.min(userScale,vertFit,hozFit);
    const sc=this._uiScale;
    if(this._is1v1){
      const gap=120*sc;
      const totalW=BOARD_W*sc*2+gap;
      this.mainBX=(this.W-totalW)/2;
    }else{
      this.mainBX=this.W/2-BOARD_W*sc/2-30;
    }
    this.mainBY=(this.H-BOARD_H*sc)/2+offY;
  }

  createBg(){
    this.bgLayer=new PIXI.Container();this.root.addChild(this.bgLayer);
    if(settings.quality!=='low'&&settings.quality!=='minimum'){
      const g=new PIXI.Graphics();g.lineStyle(0.5,0x001133,0.18);
      for(let x=0;x<this.W;x+=40){g.moveTo(x,0);g.lineTo(x,this.H);}
      this.bgLayer.addChild(g);
    }
    // ULTRA: animated scan-line + ambient glow background
    if(settings.quality==='ultra'){
      this._bgScanline=new PIXI.Graphics();this.bgLayer.addChild(this._bgScanline);
      this._bgScanlineY=0;
      // subtle vignette
      const vg=new PIXI.Graphics();
      const cx=this.W/2,cy=this.H/2;
      for(let i=5;i>0;i--){
        vg.beginFill(0x000000,(i/5)*0.35);
        vg.drawEllipse(cx,cy,cx*(1+i*0.25),cy*(1+i*0.25));
        vg.endFill();
      }
      this.bgLayer.addChild(vg);
    }
  }

  buildOpponentBoards(){
    const sc=this._uiScale||1;
    let oCell,oBW,oBH,RX,LX,by;
    let showAbove=2;
    if(this.opponentPlayers.length===1){
      oCell=CELL;oBW=BOARD_W;oBH=BOARD_H;
      showAbove=0;
      const gap=120*sc;
      const totalW=BOARD_W*sc*2+gap;
      const leftEdge=(this.W-totalW)/2;
      RX=leftEdge+BOARD_W*sc+gap;
      LX=RX;
      by=this.mainBY;
    }else{
      oCell=12;oBW=getGameCols()*oCell;oBH=(ROWS+showAbove)*oCell;
      RX=this.mainBX+BOARD_W*sc+90;
      LX=this.mainBX-oBW-90;
      by=this.H/2-oBH/2;
    }
    // 1v1: scale the opponent container so both boards match visually
    const contScale=this.opponentPlayers.length===1?sc:1;
    this.opponentPlayers.forEach((p)=>{
      const cont=new PIXI.Container();cont.scale.set(contScale);cont.x=RX;cont.y=by;cont.visible=false;this.root.addChild(cont);
      const isBot=!!p.isBot;
      const borderCol=isBot?0xffbe0b:0x00f5ff;
      const bg=new PIXI.Graphics();
      bg.beginFill(0x000010,0.9);bg.drawRect(0,0,oBW,oBH);bg.endFill();
      bg.lineStyle(1,borderCol,isBot?0.45:0.2);bg.drawRect(0,0,oBW,oBH);
      cont.addChild(bg);      const nameCol=isBot?0xffbe0b:0x00f5ff;
      const fSz=this.opponentPlayers.length===1?Math.round(12*sc):10;
      const nst=new PIXI.TextStyle({fontFamily:'Share Tech Mono',fontSize:fSz,fill:nameCol,letterSpacing:2});
      const nameLabel=isBot?`${p.name.toUpperCase()} ${p.botLevel===6?'CC':'Lv.'+(p.botLevel||'?')}`:p.name.toUpperCase();
      const ntxt=new PIXI.Text(nameLabel,nst);ntxt.x=0;ntxt.y=-fSz-6;cont.addChild(ntxt);
      const boardGfx=new PIXI.Graphics();cont.addChild(boardGfx);
      const nextGfx=[];
      const nxtOff=this.opponentPlayers.length===1?oBW+8:oBW+4;
      for(let j=0;j<3;j++){const ng=new PIXI.Graphics();ng.x=nxtOff;ng.y=j*Math.round(oCell*1.1);cont.addChild(ng);nextGfx.push(ng);}
      const holdLbl=new PIXI.Text('HOLD',new PIXI.TextStyle({fontFamily:'Share Tech Mono',fontSize:Math.round(fSz*0.8),fill:0x888888,letterSpacing:2}));
      holdLbl.x=this.opponentPlayers.length===1?-oCell-4:-30;holdLbl.y=0;cont.addChild(holdLbl);
      const holdGfx=new PIXI.Graphics();holdGfx.x=this.opponentPlayers.length===1?-oCell-4:-30;holdGfx.y=oCell;cont.addChild(holdGfx);
      const sst=new PIXI.TextStyle({fontFamily:'Share Tech Mono',fontSize:Math.round(fSz*0.9),fill:0x666666});
      const stxt=new PIXI.Text('0000000',sst);stxt.x=0;stxt.y=oBH+4;cont.addChild(stxt);
      const ppsSz=Math.round(fSz*0.8);
      const ppsTxt=new PIXI.Text('0.00 PPS',new PIXI.TextStyle({fontFamily:'Share Tech Mono',fontSize:ppsSz,fill:0x00f5ff}));ppsTxt.x=0;ppsTxt.y=oBH+ppsSz;cont.addChild(ppsTxt);
      const apmTxt=new PIXI.Text('0 APM',new PIXI.TextStyle({fontFamily:'Share Tech Mono',fontSize:ppsSz,fill:0xff8500}));apmTxt.x=0;apmTxt.y=oBH+ppsSz*2;cont.addChild(apmTxt);
      const vsTxt=new PIXI.Text('0 VS',new PIXI.TextStyle({fontFamily:'Share Tech Mono',fontSize:ppsSz,fill:0xcc44ff}));vsTxt.x=0;vsTxt.y=oBH+ppsSz*3;cont.addChild(vsTxt);
      const renTxt=new PIXI.Text('',new PIXI.TextStyle({fontFamily:'Share Tech Mono',fontSize:ppsSz,fill:0xffbe0b}));renTxt.x=0;renTxt.y=oBH+ppsSz*4;cont.addChild(renTxt);

      const flashGfx=new PIXI.Graphics();flashGfx.alpha=0;cont.addChild(flashGfx);
      const renGfx=new PIXI.Graphics();renGfx.alpha=0;cont.addChild(renGfx);
      // Lightning effect layer for opponent B2B
      const lightGfx=new PIXI.Graphics();lightGfx.alpha=0;cont.addChild(lightGfx);
      // 煙レイヤー（cont の外に出るため root に追加）
      const opSmokeLayer=new PIXI.Container();this.root.addChild(opSmokeLayer);
      // ゴミゲージ (ボード左側に縦棒)
      const gMeterGfx=new PIXI.Graphics();gMeterGfx.x=-8;gMeterGfx.y=0;cont.addChild(gMeterGfx);
      this.opBoardData[p.id]={
        cont,boardGfx,scoreTxt:stxt,ppsTxt,apmTxt,nextGfx,holdGfx,cell:oCell,origX:RX,origY:by,
        board:null,currentPiece:null,nextPieces:null,holdPiece:null,
        shakeX:0,shakeY:0,tilt:0,tiltTarget:0,dead:false,
        boardW:oBW,boardH:oBH,showAbove,isBot,
        gameOverTick:null,origXcenter:RX+oBW/2,origYcenter:by+oBH/2,
        score:0,pps:0,apm:0,garbageLines:0,gMeterGfx,
        garbageQueue:[],
        flashGfx,flashAlpha:0,
        renGfx,lightGfx,b2bCount:0,lightTimer:0,
        ren:0,renColor:0x00f5ff,renTxt,
        smokeLayer:opSmokeLayer,smokeParticles:[],smokeTick:0,
        sinkOffset:0, // ハードドロップ時の沈み込みオフセット
      };
    });
    // スロット位置を保存
    this._opSlotRX=RX;this._opSlotLX=LX;this._opSlotY=by;this._opBW=oBW;
    this.updateVisibleOpponents();
  }

  // 自分のスコアに近い2人を左右に表示する
  updateVisibleOpponents(){
    const myScore=gameState?gameState.score:0;
    const alive=this.opponentPlayers.filter(p=>{
      const d=this.opBoardData[p.id];return d&&!d.dead;
    });
    // スコア差でソート
    const sorted=[...alive].sort((a,b)=>{
      const da=Math.abs((this.opBoardData[a.id].score||0)-myScore);
      const db=Math.abs((this.opBoardData[b.id].score||0)-myScore);
      return da-db;
    });
    // 近い順に最大2人選択（右・左）
    const picks=sorted.slice(0,2);
    // 全員非表示にしてから選んだ2人を表示
    this.opponentPlayers.forEach(p=>{
      const d=this.opBoardData[p.id];if(!d)return;
      d.cont.visible=false;
    });
    picks.forEach((p,i)=>{
      const d=this.opBoardData[p.id];if(!d)return;
      const bx=i===0?this._opSlotRX:this._opSlotLX;
      d.cont.pivot.set(0,0);d.cont.rotation=0;
      d.cont.x=bx;d.cont.y=this._opSlotY;
      d.origX=bx;d.origXcenter=bx+this._opBW/2;
      d.cont.visible=true;
    });
  }

  buildMainBoard(){
    const sc=this._uiScale||1;
    this.boardWrap=new PIXI.Container();
    this.boardWrap.x=this.mainBX+BOARD_W*sc/2;
    this.boardWrap.y=this.mainBY+BOARD_H*sc/2;
    this.boardWrap.scale.set(sc);
    this.root.addChild(this.boardWrap);
    this.boardCont=new PIXI.Container();
    this.boardCont.pivot.set(BOARD_W/2,BOARD_H/2);
    this.boardWrap.addChild(this.boardCont);
    const aboveBg=new PIXI.Graphics();
    // 上部エリアは枠外なので背景・グリッドなし
    this.boardCont.addChild(aboveBg);
    const bg=new PIXI.Graphics();
    bg.beginFill(0x000010,0.95);bg.drawRect(0,0,BOARD_W,BOARD_H);bg.endFill();
    this.boardCont.addChild(bg);
    this.boardBorder=new PIXI.Graphics();
    this.boardBorder.lineStyle(2,0x00f5ff,0.8);
    this.boardBorder.drawRect(-2,0,BOARD_W+4,BOARD_H+4);
    this.boardBorder.lineStyle(0);
    this.boardCont.addChild(this.boardBorder);
    this.boardGfx=new PIXI.Graphics();this.boardCont.addChild(this.boardGfx);
    this.ghostGfx=new PIXI.Graphics();this.boardCont.addChild(this.ghostGfx);
    this.currentGfx=new PIXI.Graphics();this.boardCont.addChild(this.currentGfx);
    // Afterimage layer for T-spin residue (rendered above current piece)
    this.afterimageGfx=new PIXI.Graphics();this.afterimageGfx.alpha=0;this.boardCont.addChild(this.afterimageGfx);
    this._afterimageAlpha=0;
    this._afterimageData=null; // {shape, x, y, type}
    this.flashGfx=new PIXI.Graphics();this.flashGfx.alpha=0;this.boardCont.addChild(this.flashGfx);
    // 雷エフェクト: root直下に追加して枠の外側に表示（boardContの外なのでピクセル座標で描画）
    this.lightningGfx=new PIXI.Graphics();this.lightningGfx.alpha=0;this.root.addChild(this.lightningGfx);
    // 煙エフェクトレイヤー（boardCont の外 = 枠の外に出る）
    this.smokeLayer=new PIXI.Container();this.root.addChild(this.smokeLayer);
    this.gMeterCont=new PIXI.Container();
    this.gMeterCont.x=-BOARD_W/2-16;this.gMeterCont.y=-BOARD_H/2;
    this.boardWrap.addChild(this.gMeterCont);
    this.gMeterGfx=new PIXI.Graphics();this.gMeterCont.addChild(this.gMeterGfx);
    this.gMeterTxt=new PIXI.Text('',new PIXI.TextStyle({
      fontFamily:'Share Tech Mono',fontSize:Math.round(10),fill:0xffffff,fontWeight:'700'
    }));
    this.gMeterTxt.anchor.set(0.5,0);
    this.gMeterTxt.x=5;
    this.gMeterCont.addChild(this.gMeterTxt);
  }

  buildSideUI(){
    const sc=this._uiScale||1;
    const ui=settings.uiLayout||{};
    const sOffY=ui.sideUiOffsetY||0;
    const fsc=(ui.sideUiFontScale||100)/100;
    const px=this.mainBX+BOARD_W*sc+12,py=this.mainBY+sOffY;
    this.uiCont=new PIXI.Container();this.uiCont.x=px;this.uiCont.y=py;this.root.addChild(this.uiCont);
    const lbl=(t,x,y,col=0x888888)=>Object.assign(new PIXI.Text(t,new PIXI.TextStyle({fontFamily:'Share Tech Mono',fontSize:Math.round(11*fsc),fill:col,letterSpacing:3})),{x,y});
    this.uiCont.addChild(lbl('SCORE',0,0));
    // スコア文字色: 白
    this.scoreTxt=Object.assign(new PIXI.Text('0000000',new PIXI.TextStyle({fontFamily:'Orbitron',fontSize:Math.round(19*fsc),fill:0xffffff,fontWeight:'700'})),{x:0,y:14*fsc});
    this.uiCont.addChild(this.scoreTxt);
    this.uiCont.addChild(lbl('LINES',0,48*fsc));
    this.linesTxt=Object.assign(new PIXI.Text('0',new PIXI.TextStyle({fontFamily:'Orbitron',fontSize:Math.round(14*fsc),fill:0xffbe0b})),{x:0,y:62*fsc});this.uiCont.addChild(this.linesTxt);
    this.uiCont.addChild(lbl('LEVEL',0,90*fsc));
    this.levelTxt=Object.assign(new PIXI.Text('1',new PIXI.TextStyle({fontFamily:'Orbitron',fontSize:Math.round(14*fsc),fill:0xffbe0b})),{x:0,y:104*fsc});this.uiCont.addChild(this.levelTxt);
    
    // PPS / APM / VS stats
    this.uiCont.addChild(lbl('PPS',0,135*fsc));
    this.ppsTxt=Object.assign(new PIXI.Text('0.00',new PIXI.TextStyle({fontFamily:'Orbitron',fontSize:Math.round(13*fsc),fill:0x00f5ff})),{x:0,y:148*fsc});
    this.uiCont.addChild(this.ppsTxt);
    
    this.uiCont.addChild(lbl('APM',0,175*fsc));
    this.apmTxt=Object.assign(new PIXI.Text('0.0',new PIXI.TextStyle({fontFamily:'Orbitron',fontSize:Math.round(13*fsc),fill:0xff8500})),{x:0,y:188*fsc});
    this.uiCont.addChild(this.apmTxt);

    this.uiCont.addChild(lbl('VS',0,215*fsc));
    this.vsTxt=Object.assign(new PIXI.Text('0.0',new PIXI.TextStyle({fontFamily:'Orbitron',fontSize:Math.round(13*fsc),fill:0xcc44ff})),{x:0,y:228*fsc});
    this.uiCont.addChild(this.vsTxt);

    // NEXT
    this.nextCont=new PIXI.Container();this.nextCont.x=px;this.nextCont.y=py+265*fsc;this.root.addChild(this.nextCont);
    this.nextCont.addChild(lbl('NEXT',0,0));
    this.nextGfx=[];for(let i=0;i<5;i++){const g=new PIXI.Graphics();g.y=18+i*50;this.nextCont.addChild(g);this.nextGfx.push(g);}
    // HOLD
    this.holdCont=new PIXI.Container();this.holdCont.x=this.mainBX-90;this.holdCont.y=this.mainBY+sOffY;this.root.addChild(this.holdCont);    this.holdCont.addChild(lbl('HOLD',0,0));
    this.holdGfx=new PIXI.Graphics();this.holdGfx.y=18;this.holdCont.addChild(this.holdGfx);
    // B2Bバッジ (holdの下)
    this.b2bBadgeCont=new PIXI.Container();
    this.b2bBadgeCont.x=this.mainBX-90;
    this.b2bBadgeCont.y=this.mainBY+sOffY+90;
    this.root.addChild(this.b2bBadgeCont);
    this.b2bBadgeBg=new PIXI.Graphics();this.b2bBadgeCont.addChild(this.b2bBadgeBg);
    this.b2bBadgeLbl=new PIXI.Text('B2B',new PIXI.TextStyle({fontFamily:'Share Tech Mono',fontSize:7,fill:0x888888,letterSpacing:2}));
    this.b2bBadgeLbl.anchor.set(0.5);this.b2bBadgeLbl.x=28;this.b2bBadgeLbl.y=13;
    this.b2bBadgeCont.addChild(this.b2bBadgeLbl);
    this.b2bBadgeNum=new PIXI.Text('',new PIXI.TextStyle({fontFamily:'Orbitron',fontSize:16,fill:0xffbe0b,fontWeight:'700'}));
    this.b2bBadgeNum.anchor.set(0.5);this.b2bBadgeNum.x=28;this.b2bBadgeNum.y=30;
    this.b2bBadgeCont.addChild(this.b2bBadgeNum);
    // グリッチノイズ用PixiCanvasテクスチャ
    this._b2bGlitchCtx=null;this._b2bGlitchTex=null;this._b2bGlitchSpr=null;
    try{
      this._b2bGlitchCanvas=document.createElement('canvas');
      this._b2bGlitchCanvas.width=60;this._b2bGlitchCanvas.height=60;
      this._b2bGlitchCtx=this._b2bGlitchCanvas.getContext('2d');
      const base=new PIXI.BaseTexture(this._b2bGlitchCanvas);
      this._b2bGlitchTex=new PIXI.Texture(base);
      this._b2bGlitchSpr=new PIXI.Sprite(this._b2bGlitchTex);
      this._b2bGlitchSpr.alpha=0;
      try{this._b2bGlitchSpr.blendMode=PIXI.BLEND_MODES.ADD;}catch(e2){}
      this.b2bBadgeCont.addChild(this._b2bGlitchSpr);
    }catch(e){console.warn('[b2b glitch] canvas init failed:',e);this._b2bGlitchSpr=null;this._b2bGlitchTex=null;this._b2bGlitchCtx=null;}
    this._b2bPunching=false;this._b2bPunchTime=0;this._b2bGlitchTime=0;this._b2bBadgeColor=0xffbe0b;
    this._b2bNoiseTimer=0;
    this.b2bBadgeCont.visible=false;
    const n=Object.assign(new PIXI.Text((this.myPlayer?this.myPlayer.name:'').toUpperCase(),new PIXI.TextStyle({fontFamily:'Share Tech Mono',fontSize:Math.round(12*fsc),fill:0x00f5ff,letterSpacing:3})),{x:this.mainBX,y:this.mainBY-22});
    this.root.addChild(n);
    this.elapsedText=Object.assign(new PIXI.Text('0:00',new PIXI.TextStyle({fontFamily:'Share Tech Mono',fontSize:Math.round(11*fsc),fill:0x888888,letterSpacing:2})),{x:this.mainBX+BOARD_W*sc+4,y:this.mainBY-22});
    this.root.addChild(this.elapsedText);

    // ★ モード別背景オーバーレイテキスト（40ライン残り数 / Blitz残り時間）
    // ボードの boardCont に乗せるので常に正面に出るが、alpha低くして目立たなくする
    const overlayFontSize = Math.round(BOARD_W * 0.55);
    this._modeOverlayText = new PIXI.Text('', new PIXI.TextStyle({
      fontFamily: 'Orbitron, sans-serif',
      fontSize: overlayFontSize,
      fill: '#ffffff44',
      fontWeight: '900',
      align: 'center',
    }));
    this._modeOverlayText.anchor.set(0.5);
    this._modeOverlayText.x = BOARD_W / 2;
    this._modeOverlayText.y = BOARD_H / 2;
    this._modeOverlayText.alpha = 1.0;
    this._modeOverlayText.visible = false;
    // boardGfxより手前、currentGfxより後ろに挿入（背景の次）
    this.boardCont.addChildAt(this._modeOverlayText, 2);

    this._modeOverlaySubText = new PIXI.Text('', new PIXI.TextStyle({
      fontFamily: 'Share Tech Mono, monospace',
      fontSize: Math.round(18 * sc),
      fill: '#ffffff33',
      align: 'center',
    }));
    this._modeOverlaySubText.anchor.set(0.5);
    this._modeOverlaySubText.x = BOARD_W / 2;
    this._modeOverlaySubText.y = BOARD_H / 2 + Math.round(BOARD_W * 0.55 * 0.6);
    this._modeOverlaySubText.visible = false;
    this.boardCont.addChildAt(this._modeOverlaySubText, 3);
  }

  drawCell(gfx,x,y,size,type,alpha=1,lockFlash=0){
    const color=PIECE_COLORS[type]||0x334455,s=size-1;
    gfx.beginFill(color,alpha);gfx.drawRect(x+1,y+1,s-1,s-1);gfx.endFill();
    gfx.beginFill(0xffffff,alpha*0.35);gfx.drawRect(x+1,y+1,s-1,3);gfx.drawRect(x+1,y+1,3,s-1);gfx.endFill();
    gfx.beginFill(0x000000,alpha*0.4);gfx.drawRect(x+1,y+s-2,s-1,2);gfx.drawRect(x+s-2,y+1,2,s-1);gfx.endFill();
    if(settings.quality!=='low'&&settings.quality!=='minimum'){gfx.lineStyle(1,color,alpha*0.45);gfx.drawRect(x+1,y+1,s-1,s-1);gfx.lineStyle(0);}
    if(lockFlash>0){gfx.beginFill(0xffffff,alpha*lockFlash*0.55);gfx.drawRect(x+1,y+1,s-1,s-1);gfx.endFill();}
  }

  drawBoard(){
    const g=this.boardGfx;g.clear();
    for(let r=0;r<ROWS+HIDDEN;r++)for(let c=0;c<getGameCols();c++){
      const v=this.gs.board[r][c];if(!v)continue;
      const dy=(r-HIDDEN)*CELL;
      this.drawCell(g,c*CELL,dy,CELL,v,r<HIDDEN?0.55:1);
    }
    
    // Danger Warning: 10ライン以上でおじゃまが迫っている場合
    const totalLines = (this.gs.garbageQueue || []).reduce((s, g2) => s + g2.lines, 0);
    if(totalLines >= 10){
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.01);
      this.boardBorder.clear();
      this.boardBorder.lineStyle(3, 0xff006e, 0.4 + 0.6 * pulse);
      this.boardBorder.drawRect(-2, 0, BOARD_W+4, BOARD_H+4);
    } else {
      this.boardBorder.clear();
      this.boardBorder.lineStyle(2, 0x00f5ff, 0.8);
      this.boardBorder.drawRect(-2, 0, BOARD_W+4, BOARD_H+4);
    }
    // 危険時: 次のミノのスポーン位置に赤バツ
    if(totalLines>=10&&this.gs.nextQueue&&this.gs.nextQueue.length>0){
      const _ne=this.gs.nextQueue[0];const _nt=_ne.type||_ne;
      const _ns=PIECE_SHAPES[_nt]&&PIECE_SHAPES[_nt][0];
      if(_ns){
        const _sx=Math.floor((getGameCols()-_ns[0].length)/2);
        const _now2=performance.now();
        const _ig=(this.gs.garbageQueue||[]).filter(q=>q.readyAt<=_now2+200).reduce((s,q)=>s+q.lines,0);
        const _sy=SPAWN_Y-Math.min(_ig,8);
        const _pulse2=0.5+0.5*Math.sin(performance.now()*0.015);
        this.boardBorder.lineStyle(1.5,0xff006e,0.5+0.4*_pulse2);
        for(let _r=0;_r<_ns.length;_r++)for(let _c=0;_c<_ns[_r].length;_c++){
          if(!_ns[_r][_c])continue;
          const _dr=_sy+_r-HIDDEN;if(_dr<0)continue;
          const _px=(_sx+_c)*CELL+4,_py=_dr*CELL+4,_m=CELL-8;
          this.boardBorder.moveTo(_px,_py);this.boardBorder.lineTo(_px+_m,_py+_m);
          this.boardBorder.moveTo(_px+_m,_py);this.boardBorder.lineTo(_px,_py+_m);
        }
        this.boardBorder.lineStyle(0);
      }
    }
  }

  drawGhost(){
    const g=this.ghostGfx;g.clear();const gs=this.gs;if(!gs.current)return;
    const gy=gs.ghostY();
    if(gy===gs.current.y)return;
    const shape=gs._getShapeForPiece(gs.current);
    let maxDr=-Infinity;
    for(let r=0;r<shape.length;r++)for(let c=0;c<shape[r].length;c++){
      if(!shape[r][c])continue;
      const dr=gy+r-HIDDEN;
      if(dr>maxDr)maxDr=dr;
    }
    const yOff=maxDr<0?-maxDr*CELL:0;
    const pieceColor=PIECE_COLORS[gs.current.type]||0xffffff;
    const fillAlpha=0.22;
    const lineAlpha=0.90;
    const lineWidth=2.5;
    for(let r=0;r<shape.length;r++)for(let c=0;c<shape[r].length;c++){
      if(!shape[r][c])continue;
      const dr=gy+r-HIDDEN;
      const cx=(gs.current.x+c)*CELL,cy=dr*CELL+yOff,s=CELL-1;
      // Fill with piece color (semi-transparent)
      g.lineStyle(0);
      g.beginFill(pieceColor,fillAlpha);
      g.drawRect(cx+1,cy+1,s-1,s-1);
      g.endFill();
      // Bright outline with piece color
      g.lineStyle(lineWidth,pieceColor,lineAlpha);
      g.drawRect(cx+1,cy+1,s-1,s-1);
      g.lineStyle(0);
      // Inner highlight line (top + left) for 3D feel
      g.lineStyle(1,0xffffff,0.45);
      g.moveTo(cx+2,cy+s);g.lineTo(cx+2,cy+2);g.lineTo(cx+s,cy+2);
      g.lineStyle(0);
    }
  }

  drawCurrent(){
    const g=this.currentGfx;g.clear();const gs=this.gs;if(!gs.current)return;
    let lockFlash=0;
    if(gs.lockTimer&&gs.lockStartTime!=null){
      const elapsed=performance.now()-gs.lockStartTime;
      lockFlash=Math.max(0,1-(elapsed/gs.lockDelay));
    }
    const shape=gs._getShapeForPiece(gs.current);
    let maxDr=-Infinity;
    for(let r=0;r<shape.length;r++)for(let c=0;c<shape[r].length;c++){
      if(!shape[r][c])continue;
      const dr=gs.current.y+r-HIDDEN;
      if(dr>maxDr)maxDr=dr;
    }
    const yOff=maxDr<0?-maxDr*CELL:0;
    for(let r=0;r<shape.length;r++)for(let c=0;c<shape[r].length;c++){
      if(!shape[r][c])continue;const dr=gs.current.y+r-HIDDEN;
      this.drawCell(g,(gs.current.x+c)*CELL,dr*CELL+yOff,CELL,gs.current.type,dr<0?0.75:1,lockFlash);
    }
  }

  drawNextPieces(){
    const mc=14;
    this.nextGfx.forEach((gfx,i)=>{
      gfx.clear();
      const entry=this.gs.nextQueue[i];if(!entry)return;
      const type=entry.type||entry; // support old string format
      const customShape=entry.customShape||null;
      const shape=customShape||PIECE_SHAPES[type][0];
      const a=i===0?1:Math.max(0.3,0.85-i*0.15);
      for(let r=0;r<shape.length;r++)for(let c=0;c<shape[r].length;c++)if(shape[r][c])this.drawCell(gfx,c*mc,r*mc,mc,type,a);
    });
  }

  drawHold(){
    const g=this.holdGfx;g.clear();
    const type=this.gs.holdPiece;if(!type)return;
    const customShape=this.gs.holdCustomShape||null;
    const mc=14,shape=customShape||PIECE_SHAPES[type][0],a=this.gs.holdUsed?0.3:1;
    for(let r=0;r<shape.length;r++)for(let c=0;c<shape[r].length;c++)if(shape[r][c])this.drawCell(g,c*mc,r*mc,mc,type,a);
  }

  drawOpponentBoard(pid){
    const d=this.opBoardData[pid];if(!d||d.dead)return;
    const g=d.boardGfx;g.clear();const cell=d.cell;
    const {boardW:oBW,boardH:oBH,showAbove}=d;
    
    // Stats update
    if(d.ppsTxt) d.ppsTxt.text = `${(d.pps||0).toFixed(2)} PPS`;
    if(d.apmTxt) d.apmTxt.text = `${Math.round(d.apm||0)} APM`;
    if(d.vsTxt) d.vsTxt.text = `${Math.round(d.vs||0)} VS`;

    // Opponent Garbage Meter & Danger Warning (handled by drawOpponentGarbageMeter)
    const opTotalLines = d.garbageLines || 0;

    if(!d.board){g.beginFill(0x000010,0.5);g.drawRect(0,0,oBW,oBH);g.endFill();}
    else if(d._isPuyo && d._puyoBoard){
      // Puyo opponent: render as circles on the tetris opponent slot
      const pulse=0.4+0.6*(0.5+0.5*Math.sin(performance.now()*0.004));
      const borderCol=0xcc44ff;
      g.lineStyle(2,borderCol,0.3+0.4*pulse); g.drawRect(0,0,oBW,oBH); g.lineStyle(0);
      // Puyo label
      g.beginFill(0xcc44ff,0.15); g.drawRoundedRect(0,0,oBW,Math.floor(oBH*0.08),2); g.endFill();
      const pBoard=d._puyoBoard;
      // Scale puyo 6 cols into tetris oBW (fill width)
      const pCell=Math.min(oBW/6, oBH/12);
      const pOffX=(oBW-6*pCell)/2;
      const pOffY=(oBH-12*pCell)/2;
      for(let r=1;r<13;r++){
        const row=pBoard[r]; if(!row)continue;
        for(let c=0;c<6;c++){
          const v=row[c]; if(!v)continue;
          const px=pOffX+c*pCell+pCell/2;
          const py=pOffY+(r-1)*pCell+pCell/2;
          const col=PUYO_COLOR_HEX[v]||0x888888;
          const rad=pCell*0.42;
          // shadow
          g.beginFill(0x000000,0.18); g.drawCircle(px+1,py+1,rad); g.endFill();
          // body
          g.beginFill(col,0.95); g.drawCircle(px,py,rad); g.endFill();
          // dark bottom
          g.beginFill(PUYO_COLOR_DARK[v]||0x444444,0.45); g.drawCircle(px,py+rad*0.18,rad*0.85); g.endFill();
          // highlight
          g.beginFill(0xffffff,0.5); g.drawCircle(px-rad*0.3,py-rad*0.32,rad*0.36); g.endFill();
          g.lineStyle(1,0xffffff,0.5); g.drawCircle(px,py,rad); g.lineStyle(0);
        }
      }
      // カレントペア表示
      if(d._puyoCurrent){
        const cur=d._puyoCurrent;
        const[dr2,dc2]=PUYO_SAT[cur.rotation??0];
        const sr2=cur.pivotR+dr2, sc2=cur.pivotC+dc2;
        const drawCur=(r,c,col)=>{
          if(r<1||r>12)return;
          const px=pOffX+c*pCell+pCell/2, py=pOffY+(r-1)*pCell+pCell/2;
          const rad=pCell*0.42;
          g.beginFill(PUYO_COLOR_HEX[col]||0x888888,0.8); g.drawCircle(px,py,rad); g.endFill();
          g.beginFill(0xffffff,0.4); g.drawCircle(px-rad*0.3,py-rad*0.32,rad*0.35); g.endFill();
        };
        drawCur(cur.pivotR,cur.pivotC,cur.colors?.[0]??1);
        drawCur(sr2,sc2,cur.colors?.[1]??2);
      }
      // Puyo 連鎖・コンボ表示（boardGfxに描画）
      let puyoInfo='';
      if(d._puyoChain!==undefined&&d._puyoChain>=2) puyoInfo+=`${d._puyoChain}連鎖`;
      if(d._puyoCombo!==undefined&&d._puyoCombo>=2) puyoInfo+=(puyoInfo?' ':'')+`${d._puyoCombo}COMBO`;
      if(puyoInfo){
        g.lineStyle(0);
        g.beginFill(0x000000,0.6);
        g.drawRoundedRect(oBW/2-60,-2,120,18,4);
        g.endFill();
        const tCanvas=document.createElement('canvas');
        tCanvas.width=120; tCanvas.height=18;
        const tCtx=tCanvas.getContext('2d');
        tCtx.font='bold 14px Orbitron,sans-serif';
        tCtx.strokeStyle='#000'; tCtx.lineWidth=3; tCtx.textAlign='center'; tCtx.textBaseline='middle';
        tCtx.strokeText(puyoInfo,60,9);
        tCtx.fillStyle='#ff0';
        tCtx.fillText(puyoInfo,60,9);
        const tex=PIXI.Texture.from(tCanvas);
        if(!d._puyoInfoSpr){ d._puyoInfoSpr=new PIXI.Sprite(tex); d._puyoInfoSpr.anchor.set(0.5,0); d.cont.addChild(d._puyoInfoSpr); }
        else d._puyoInfoSpr.texture=tex;
        d._puyoInfoSpr.visible=true;
        d._puyoInfoSpr.x=oBW/2; d._puyoInfoSpr.y=-2;
        // アニメーション: 値が変わったら拡大開始
        if(puyoInfo!==d._prevPuyoInfo){
          d._prevPuyoInfo=puyoInfo;
          d._puyoInfoTimer=0;
          d._puyoInfoSpr.scale.set(0.3);
          d._puyoInfoSpr.alpha=1;
        }
        // スケールアニメーション
        if(d._puyoInfoTimer!==undefined){
          d._puyoInfoTimer++;
          const t=d._puyoInfoTimer;
          if(t<10) d._puyoInfoSpr.scale.set(0.3+t/10*0.8);
          else if(t<35) d._puyoInfoSpr.scale.set(1+Math.sin((t-10)/25*Math.PI)*0.15);
          else if(t<65) d._puyoInfoSpr.alpha=1-(t-35)/30;
          else{ d._puyoInfoSpr.alpha=1; d._puyoInfoSpr.scale.set(1); delete d._puyoInfoTimer; }
        }
      }else if(d._puyoInfoSpr){
        d._puyoInfoSpr.visible=false;
        d._prevPuyoInfo='';
        if(d._puyoInfoTimer!==undefined) delete d._puyoInfoTimer;
      }
      // お邪魔ゲージ（相手が受け取る予定のお邪魔）
      if(opTotalLines>0){
        const gaugeW=Math.floor(oBH*0.04);
        const gaugeH=Math.min(opTotalLines/20,1)*(oBH-Math.floor(oBH*0.08));
        const gx=oBW-gaugeW-2;
        const gy=oBH-gaugeH;
        g.beginFill(0x111122,0.7); g.drawRect(gx,Math.floor(oBH*0.08),gaugeW,oBH-Math.floor(oBH*0.08)); g.endFill();
        const gCol=opTotalLines>=10?0xff006e:(opTotalLines>=5?0xffbe0b:0xcccccc);
        g.beginFill(gCol,0.85); g.drawRect(gx,gy,gaugeW,gaugeH); g.endFill();
        if(opTotalLines>=10){
          const gp=0.4+0.6*(0.5+0.5*Math.sin(performance.now()*0.008));
          g.lineStyle(1,0xff006e,gp); g.drawRect(gx,gy,gaugeW,gaugeH); g.lineStyle(0);
        }
      }
    }
    else{
      const offset=d.board.length>ROWS?HIDDEN:0;
      // Border
      const isBot=!!d.isBot;
      const borderCol=opTotalLines >= 10 ? 0xff006e : (isBot?0xffbe0b:0x00f5ff);
      const borderAlpha=opTotalLines >= 10 ? (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(performance.now() * 0.01))) : (isBot?0.45:0.2);
      g.lineStyle(1.5, borderCol, borderAlpha);
      g.drawRect(0,0,oBW,oBH);
      g.lineStyle(0);

      for(let r=-showAbove;r<ROWS;r++){
        const row=d.board[r+offset];if(!row)continue;
        for(let c=0;c<getGameCols();c++){
          const v=row[c];if(!v)continue;
          const dy=(r+showAbove)*cell;
          this.drawCell(g,c*cell,dy,cell,v,r<0?0.4:1);
        }
      }
      // 相手のゴースト（ハードドロップ予測位置）
      if(d.currentPiece){
        const cp=d.currentPiece;
        const gShape=cp.customShape||PIECE_SHAPES[cp.type]?.[((cp.rotation%4)+4)%4];
        if(gShape){
          let gy=cp.y;
          const totalRows=d.board.length;
          const cols=getGameCols();
          ghostLoop:
          while(true){
            for(let r=0;r<gShape.length;r++)for(let c=0;c<gShape[r].length;c++){
              if(!gShape[r][c])continue;
              const ny=gy+r+1;
              const nx=cp.x+c;
              if(nx<0||nx>=cols||ny>=totalRows)break ghostLoop;
              if(ny>=0&&d.board[ny]&&d.board[ny][nx])break ghostLoop;
            }
            gy++;
          }
          if(gy!==cp.y){
            const ghostColor=PIECE_COLORS[cp.type]||0xffffff;
            for(let r=0;r<gShape.length;r++)for(let c=0;c<gShape[r].length;c++){
              if(!gShape[r][c])continue;
              const dr=gy+r-HIDDEN;
              const dy=(dr+showAbove)*cell;
              if(dy<-(cell*2)||dy>=oBH)continue;
              const cx=(cp.x+c)*cell,cy=dy,s=cell-1;
              g.lineStyle(0);
              g.beginFill(ghostColor,0.22);
              g.drawRect(cx+1,cy+1,s-1,s-1);
              g.endFill();
              const lw=Math.max(1,cell*0.08);
              g.lineStyle(lw,ghostColor,0.90);
              g.drawRect(cx+1,cy+1,s-1,s-1);
              g.lineStyle(0);
              g.lineStyle(1,0xffffff,0.45);
              g.moveTo(cx+2,cy+s);g.lineTo(cx+2,cy+2);g.lineTo(cx+s,cy+2);
              g.lineStyle(0);
            }
          }
        }
      }
      // 相手の現在操作中のミノ
      if(d.currentPiece){
        const cp=d.currentPiece;
        const shape=cp.customShape||PIECE_SHAPES[cp.type]?.[((cp.rotation%4)+4)%4];
        if(shape){
          for(let r=0;r<shape.length;r++)for(let c=0;c<shape[r].length;c++){
            if(!shape[r][c])continue;
            const dr=cp.y+r-HIDDEN;
            const dy=(dr+showAbove)*cell;
            if(dy<-(cell*2)||dy>=oBH)continue;
            this.drawCell(g,(cp.x+c)*cell,dy,cell,cp.type,dr<0?0.5:1);
          }
        }
      }
    }
    // 相手NEXT
    if(d.nextPieces&&d.nextGfx){
      const mc=8;
      d.nextGfx.forEach((ng,i)=>{
        ng.clear();
        const entry=d.nextPieces[i];if(!entry)return;
        const type=entry.type||entry;
        const customShape=entry.customShape||null;
        const shape=customShape||PIECE_SHAPES[type][0];
        const a=i===0?0.9:0.5;
        for(let r=0;r<shape.length;r++)for(let c=0;c<shape[r].length;c++)if(shape[r][c])this.drawCell(ng,c*mc,r*mc,mc,type,a);
      });
    }
    // 相手HOLD
    if(d.holdGfx){
      d.holdGfx.clear();
      if(d.holdPiece){
        const mc=8;
        const shape=PIECE_SHAPES[d.holdPiece]?.[0];
        if(shape){for(let r=0;r<shape.length;r++)for(let c=0;c<shape[r].length;c++)if(shape[r][c])this.drawCell(d.holdGfx,c*mc,r*mc,mc,d.holdPiece,0.8);}
      }
    }
    // 相手ボードのフラッシュエフェクト
    if(d.flashGfx&&d.flashAlpha>0){
      d.flashAlpha-=0.06;d.flashGfx.alpha=Math.max(0,d.flashAlpha);
    }
    // 相手ボードのREN表示
    if(d.renGfx&&d.ren>=2&&settings.quality!=='minimum'){
      // Animated border glow based on REN level
      const renColors=[0x00f5ff,0x06d6a0,0xffbe0b,0xff8c00,0xff3366,0xff00ff,0xcc44ff,0xffffff,0x00f5ff];
      const rc=renColors[Math.min(d.ren-2,renColors.length-1)];
      const pulse=0.4+0.3*Math.abs(Math.sin(performance.now()*0.006));
      const g2=d.boardGfx.parent;
      // Just tint the border using cont's child graphics already drawn (bg)
      // Draw glowing border on renGfx
      d.renGfx.clear();
      const lw=1+Math.min(d.ren*0.4,3);
      d.renGfx.lineStyle(lw,rc,pulse*Math.min(1,0.3+(d.ren-2)*0.1));
      d.renGfx.drawRect(0,0,d.boardW,d.boardH);
      d.renGfx.alpha=1;
    } else if(d.renGfx&&d.ren<2){
      d.renGfx.clear();d.renGfx.alpha=0;
    }
    // 相手B2B雷エフェクト更新
    if(d.lightGfx&&d.lightTimer>0&&settings.quality!=='low'&&settings.quality!=='minimum'){
      d.lightTimer-=16;
      const b2b=d.b2bCount||1;
      const lCol=b2b>=8?0x0088ff:b2b>=3?0x00ff88:0xffbe0b;
      d.lightGfx.clear();
      d.lightGfx.alpha=(0.5+0.4*Math.random())*Math.min(1,(d.lightTimer/40));
      const segs=4+Math.floor(b2b*1.2),amp=2+b2b*0.8,lw2=0.8+Math.min(b2b*0.3,1.8);
      d.lightGfx.lineStyle(lw2,lCol,0.9);
      this._drawZigzag(d.lightGfx,0,0,d.boardW,0,segs,amp,'h');
      this._drawZigzag(d.lightGfx,0,d.boardH,d.boardW,d.boardH,segs,amp,'h');
      this._drawZigzag(d.lightGfx,0,0,0,d.boardH,segs,amp,'v');
      this._drawZigzag(d.lightGfx,d.boardW,0,d.boardW,d.boardH,segs,amp,'v');
      if(d.lightTimer<=0){d.lightGfx.clear();d.lightGfx.alpha=0;}
    }
    if(d.shakeX!==0||d.shakeY!==0){
      d._shakeT=(d._shakeT||0)+0.9;
      const sx=Math.sin(d._shakeT*3.8)*Math.abs(d.shakeX)*Math.sign(d.shakeX||1);
      d.shakeX*=0.85;
      if(Math.abs(d.shakeX)<0.15){d.shakeX=0;d._shakeT=0;}
      if(!d.gameOverTick){
        if(d.tilt===undefined)d.tilt=0;
        if(d.tiltTarget===undefined)d.tiltTarget=0;
        const csx=d.cont.scale.x||1,csy=d.cont.scale.y||1;
         d.tilt+=(d.tiltTarget-d.tilt)*0.025;
         d.cont.rotation=d.tilt;
        d.cont.pivot.set(oBW/2,oBH/2);
        d.cont.x=d.origX+(oBW/2)*csx+sx+(d.bounceX||0);
        if(d.sinkOffset===undefined)d.sinkOffset=0;
        d.sinkOffset*=0.92; if(d.sinkOffset<0.3)d.sinkOffset=0;
        d.cont.y=d.origY+(oBH/2)*csy+d.shakeY+d.sinkOffset+(d.bounceY||0);
        if(d.bounceX!==undefined){d.bounceX*=0.92;if(Math.abs(d.bounceX)<0.05)d.bounceX=0;}
        if(d.bounceY!==undefined){d.bounceY*=0.92;if(Math.abs(d.bounceY)<0.05)d.bounceY=0;}
      }
    } else if(!d.gameOverTick){
      if(d.tilt===undefined)d.tilt=0;
      if(d.tiltTarget===undefined)d.tiltTarget=0;
      d.tilt+=(d.tiltTarget-d.tilt)*0.025;
      const csx=d.cont.scale.x||1,csy=d.cont.scale.y||1;
      d.cont.pivot.set(oBW/2,oBH/2);
      d.cont.x=d.origX+(oBW/2)*csx+(d.bounceX||0);
      d.cont.y=d.origY+(oBH/2)*csy+(d.bounceY||0);
      if(d.bounceX!==undefined){d.bounceX*=0.92;if(Math.abs(d.bounceX)<0.05)d.bounceX=0;}
      if(d.bounceY!==undefined){d.bounceY*=0.92;if(Math.abs(d.bounceY)<0.05)d.bounceY=0;}
      if(Math.abs(d.tilt)<0.0005&&Math.abs(d.tiltTarget)<0.0005){
        d.tilt=0;d.cont.rotation=0;d.cont.pivot.set(0,0);
        d.cont.x=d.origX;d.cont.y=d.origY;
        d.bounceX=0;d.bounceY=0;
      }
    }
  }

  _drawDangerWarning(){
    // ゲームオーバーになりうるゴミが来ている場合に警告を表示
    if(!this.gs||!this.gs.garbageQueue)return;
    const now=performance.now();
    // 積み上がりの最高行
    let topRow=this.gs.board.length;
    for(let r=0;r<this.gs.board.length;r++){
      if(this.gs.board[r].some(c=>c)){topRow=r;break;}
    }
    const stackHeight=this.gs.board.length-topRow;
    const available=this.gs.board.length-stackHeight; // 空き行数（概算）
    // 発動条件: readyになっているゴミの合計が空き行を超える
    const readyGarbage=this.gs.garbageQueue
      .filter(g=>g.readyAt<=now+500)
      .reduce((a,b)=>a+b.lines,0);
    // visible rowsより多い => 確実に死ぬ
    const visibleRows=20; // ROWS
    const willKill=readyGarbage>0&&(stackHeight+readyGarbage>=visibleRows);
    if(!this._warnEl){
      this._warnEl=document.createElement('div');
      this._warnEl.style.cssText='position:absolute;pointer-events:none;z-index:500;display:none;';
      // 三角の！マーク
      this._warnEl.innerHTML='<svg width="28" height="26" viewBox="0 0 28 26"><polygon points="14,2 26,24 2,24" fill="rgba(255,60,0,0.85)" stroke="#ff3300" stroke-width="1.5"/><text x="14" y="21" text-anchor="middle" font-size="14" font-weight="900" fill="white" font-family="sans-serif">!</text></svg>';
      // B2BバッジコンテナのDOMを探してその下に配置
      // PixiJSのcanvas containerに追加
      const pc=document.getElementById('pixi-container');
      if(pc)pc.style.position='relative';
      if(pc)pc.appendChild(this._warnEl);
    }
    if(willKill){
      // b2bBadgeCont の位置を参照して配置
      const sc=this._uiScale||1;
      const wx=this.mainBX-90;
      // b2bBadgeCont.y に相当する位置 (holdの下、b2bの下あたり)
      const wy=this.mainBY+(settings.uiLayout?.sideUiOffsetY||0)+130;
      const canvas=this.app.view;
      const rect=canvas.getBoundingClientRect();
      const ratioX=rect.width/this.app.screen.width;
      const ratioY=rect.height/this.app.screen.height;
      const pc=document.getElementById('pixi-container');
      const pcRect=pc?pc.getBoundingClientRect():{left:0,top:0};
      const sx=rect.left-pcRect.left+wx*ratioX;
      const sy=rect.top-pcRect.top+wy*ratioY;
      this._warnEl.style.left=Math.round(sx)+'px';
      this._warnEl.style.top=Math.round(sy)+'px';
      this._warnEl.style.display='block';
      // 点滅
      const pulse=0.5+0.5*Math.abs(Math.sin(performance.now()*0.006));
      this._warnEl.style.opacity=String(0.6+0.4*pulse);
    } else {
      this._warnEl.style.display='none';
    }
  }

  drawGarbageMeter(){
    const g=this.gMeterGfx;g.clear();
    const queue=this.gs.garbageQueue;if(!queue.length){this._prevReadyCount=0;return;}
    const now=performance.now();
    g.beginFill(0x111122,0.5);g.drawRect(0,0,10,BOARD_H);g.endFill();
    let y=BOARD_H;
    let readyCount=0;
    let readyLines=0;
    for(const item of queue){
      const h=Math.min(item.lines*(CELL*0.85),y);y-=h;
      const pct=Math.max(0,(item.readyAt-now)/1000);
      const col=0xff006e;
      g.beginFill(col,0.85);g.drawRect(0,y,10,h);g.endFill();
      if(pct<=0){
        const pulse=0.5+0.5*Math.abs(Math.sin(now*0.008));
        g.lineStyle(2,0xff006e,pulse);g.drawRect(0,y,10,h);g.lineStyle(0);
        readyCount++;readyLines+=item.lines;
      }
    }
    // readyCountが増えた瞬間だけワンショット揺れ
    if(readyCount>(this._prevReadyCount||0)&&settings.shake==='on'){
      const amp=Math.min(6+readyLines*0.7,14);
      this.wallBumpX=amp*(Math.random()>0.5?1:-1);
      setTimeout(()=>{this.wallBumpX*=-0.6;},60);
    }
    this._prevReadyCount=readyCount;
  }

  // 相手・BotのゴミゲージをボードLeftに描画
  drawOpponentGarbageMeter(pid){
    const d=this.opBoardData[pid];
    if(!d||!d.gMeterGfx)return;
    const g=d.gMeterGfx;g.clear();
    const lines=d.garbageLines||0;
    const bh=d.boardH;
    if(lines<=0)return;
    // 背景
    g.beginFill(0x111122,0.5);g.drawRect(0,0,6,bh);g.endFill();
    // ゲージ高さ (最大20行分でbh全体)
    const h=Math.min(lines/20,1)*bh;
    const y=bh-h;
    // 固定色（グラデーションなし）
    const col=0xff006e;
    g.beginFill(col,0.85);g.drawRect(0,y,6,h);g.endFill();
    // 点滅枠
    const pulse=0.4+0.6*Math.abs(Math.sin(performance.now()*0.006));
    g.lineStyle(1,col,pulse);g.drawRect(0,y,6,h);g.lineStyle(0);
  }

  drawGarbageMeter(){
    if(!this.gMeterGfx)return;
    this.gMeterGfx.clear();
    const queue = this.gs.garbageQueue || [];
    
    const now = performance.now();
    let totalLines = 0;
    const MAX_VISIBLE = 20;
    for(const g of queue) totalLines += g.lines;
    
    if(!queue.length){
      if(this.gMeterTxt) this.gMeterTxt.text='';
      return;
    }
    
    // 下から積み上げるように描画
    let currentY = BOARD_H;
    let drawnLines = 0;
    for (const g of queue) {
      const lines = g.lines;
      const h = lines * CELL;
      
      // 色の決定
      let col = 0xcccccc; // default: gray
      const timeLeft = g.readyAt - now;
      if (timeLeft <= 200) col = 0xff006e; // red
      else if (timeLeft <= 600) col = 0xffbe0b; // yellow
      
      this.gMeterGfx.beginFill(col, 0.85);
      this.gMeterGfx.drawRect(0, currentY - h, 6, h);
      this.gMeterGfx.endFill();
      
      // 枠線
      this.gMeterGfx.lineStyle(1, 0xffffff, 0.3);
      this.gMeterGfx.drawRect(0, currentY - h, 6, h);
      this.gMeterGfx.lineStyle(0);
      
      currentY -= h;
      drawnLines += lines;
      if (drawnLines >= MAX_VISIBLE) break;
    }
    
    // ゲージのライン数表示
    if(this.gMeterTxt) this.gMeterTxt.text=totalLines.toString();
  }

  updateScoreUI(){
    this.scoreTxt.text=this.gs.score.toString().padStart(7,'0');
    this.linesTxt.text=this.gs.lines.toString();
    this.levelTxt.text=this.gs.level.toString();
    if(this.ppsTxt) this.ppsTxt.text = this.gs.pps.toFixed(2);
    if(this.apmTxt) this.apmTxt.text = this.gs.apm.toFixed(1);
    if(this.vsTxt) this.vsTxt.text = this.gs.vs.toFixed(1);
    this.updateVisibleOpponents();
    this.drawGarbageMeter();
  }

  updateB2bBadge(){
    if(!this.b2bBadgeCont)return;
    const cnt=this._b2bCount||0;
    if(cnt<1){
      this.b2bBadgeCont.visible=false;
      return;
    }
    this.b2bBadgeCont.visible=true;
    const col=cnt>=8?0x0088ff:cnt>=5?0x00ccff:cnt>=3?0x00ff88:0xffbe0b;
    this.b2bBadgeNum.style.fill=col;
    this.b2bBadgeNum.text='x'+cnt;
    // B2Bが高いほどバッジも大きく
    const badgeScale=1+Math.min(cnt*0.06,0.5);
    this.b2bBadgeCont.scale.set(badgeScale);
    this._b2bBadgeColor=col;
    this._drawB2bBadgeBg(col,0);
    this.b2bBadgeLbl.style.fill=cnt>=8?0x88ccff:cnt>=5?0x88eeff:cnt>=3?0x88ffcc:0xffdd88;
  }

  _drawB2bBadgeBg(col,glitchAmt){
    const bg=this.b2bBadgeBg;bg.clear();
    const R=28; // 半径
    // メイン丸
    bg.beginFill(0x000011,0.82);bg.lineStyle(2,col,0.85);
    bg.drawCircle(R,R,R);bg.endFill();
    // 内側リング
    bg.lineStyle(1,col,0.35);bg.drawCircle(R,R,R*0.75);
    // グリッチスキャンライン
    if(glitchAmt>0){
      const numLines=Math.floor(glitchAmt*4);
      for(let i=0;i<numLines;i++){
        const gy=Math.random()*R*2;
        const gw=(Math.random()*0.7+0.1)*R*2;
        const gx=(Math.random()-0.5)*(R*2-gw);
        bg.lineStyle(0);
        bg.beginFill(col,Math.random()*0.35);
        bg.drawRect(R-R+gx,gy,gw,1.5);
        bg.endFill();
      }
      // オフセットコピー（RGBずらし）
      bg.lineStyle(1,0xff0000,glitchAmt*0.4);
      bg.drawCircle(R+glitchAmt*2,R,R);
      bg.lineStyle(1,0x0000ff,glitchAmt*0.4);
      bg.drawCircle(R-glitchAmt*2,R,R);
    }
  }

  // B2Bカウント更新パンチエフェクト (数字がスケールアップして戻る)
  _punchB2bBadge(){
    if(!this.b2bBadgeNum)return;
    this._b2bPunchTime=0;
    this._b2bPunching=true;
    this._b2bGlitchTime=180; // 180ms グリッチ持続
  }

  // B2Bカウンター常時グリッチノイズ更新
  _updateB2bGlitchNoise(b2bCount){
    if(!this._b2bGlitchCtx||!this._b2bGlitchTex)return;
    const ctx=this._b2bGlitchCtx;
    const W=60,H=60;
    ctx.clearRect(0,0,W,H);
    if(b2bCount<1)return;
    const intensity=Math.min(1,0.1+b2bCount*0.07);
    // スキャンライン
    const numLines=Math.floor(intensity*8)+2;
    for(let i=0;i<numLines;i++){
      const y=Math.random()*H;
      const h=Math.random()*3+1;
      const col=b2bCount>=8?'rgba(0,140,255,':b2bCount>=3?'rgba(0,255,140,':'rgba(255,200,0,';
      ctx.fillStyle=col+(Math.random()*0.5*intensity)+')';
      const xoff=(Math.random()-0.5)*12*intensity;
      ctx.fillRect(xoff,y,W,h);
    }
    // RGBずれブロック
    if(b2bCount>=3){
      const nb=Math.floor(intensity*4)+1;
      for(let i=0;i<nb;i++){
        const bx=Math.random()*W,by=Math.random()*H,bw=Math.random()*20+4,bh=Math.random()*4+1;
        ctx.fillStyle='rgba(255,0,0,'+(Math.random()*0.25*intensity)+')';ctx.fillRect(bx-2,by,bw,bh);
        ctx.fillStyle='rgba(0,0,255,'+(Math.random()*0.25*intensity)+')';ctx.fillRect(bx+2,by,bw,bh);
      }
    }
    // テクスチャ更新
    if(this._b2bGlitchTex&&this._b2bGlitchTex.baseTexture)this._b2bGlitchTex.baseTexture.update();
    if(this._b2bGlitchSpr)this._b2bGlitchSpr.alpha=Math.min(0.7,0.15+b2bCount*0.06);
  }

  // B2B途切れ白稲妻
  _breakB2bLightning(){
    if(settings.quality==='low'||settings.quality==='minimum')return;
    const bx=this.mainBX,by=this.mainBY;
    const bw=BOARD_W*(this._uiScale||1),bh=BOARD_H*(this._uiScale||1);
    const numBolts=8;
    for(let i=0;i<numBolts;i++){
      const side=Math.floor(Math.random()*4);
      let sx,sy,angle;
      if(side===0){sx=bx+Math.random()*bw;sy=by;angle=-Math.PI/2+(Math.random()-0.5)*1.2;}
      else if(side===1){sx=bx+Math.random()*bw;sy=by+bh;angle=Math.PI/2+(Math.random()-0.5)*1.2;}
      else if(side===2){sx=bx;sy=by+Math.random()*bh;angle=Math.PI+(Math.random()-0.5)*1.2;}
      else{sx=bx+bw;sy=by+Math.random()*bh;angle=(Math.random()-0.5)*1.2;}
      this._spawnLightningBolt(sx,sy,angle,0xffffff,1.5,3);
    }
    // 枠を一瞬白く光らせる
    if(this.lightningGfx){
      this._lightningTimer=25;
      this._b2bIntensity=1.2;
      this._lightningBreakFlash=true;
      setTimeout(()=>{this._lightningBreakFlash=false;},300);
    }
  }

  // B2B切れ「脱力」エフェクト
  // B2Bが長く続いた後に途切れると、ボードがぐったり落下→戻る＋ため息パーティクル
  _triggerDatsuroku(b2bCount){
    if(settings.quality==='minimum') return;

    // ボードを下にドロップしてゆっくり戻す「ぐったり」アニメ
    if(this.boardWrap){
      const dropAmt=Math.min(14+b2bCount*2, 32);
      const duration=700;
      const startT=performance.now();
      const origY=this.boardWrap.y; // 現在のY座標を基準にする
      this._datsurokuActive=true;
      const animate=()=>{
        const elapsed=performance.now()-startT;
        const t=elapsed/duration;
        if(t>=1){
          this._datsurokuActive=false;
          return;
        }
        if(t<0.2){
          // 急降下 (0→dropAmt)
          const p=t/0.2;
          this.boardWrap.y=origY+dropAmt*p;
        } else if(t<0.65){
          // ぐったりゆっくり戻る（over-damped）
          const p=(t-0.2)/0.45;
          const ease=1-Math.pow(1-p,2.5);
          this.boardWrap.y=origY+dropAmt*(1-ease);
        } else if(t<0.85){
          // 小さいバウンス
          const p=(t-0.65)/0.2;
          this.boardWrap.y=origY-Math.sin(p*Math.PI)*dropAmt*0.08;
        } else {
          this.boardWrap.y=origY;
        }
        requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }

    // 枠から白色粒子が上に飛び出る
    if(settings.particles!=='off'&&this.effectsLayer){
      const bx=this.mainBX,by=this.mainBY;
      const bw=BOARD_W*(this._uiScale||1),bh=BOARD_H*(this._uiScale||1);
      const n=12+Math.floor(Math.random()*8);
      for(let i=0;i<n;i++){
        setTimeout(()=>{
          if(!this.effectsLayer)return;
          const g=new PIXI.Graphics();
          const sz=Math.random()*3+2;
          const grayVal=0xe0+Math.floor(Math.random()*0x20);
          const col=(grayVal<<16)|(grayVal<<8)|grayVal;
          g.beginFill(col,0.7+Math.random()*0.3);
          g.drawRect(-sz/2,-sz/2,sz,sz);
          g.endFill();
          const side=Math.floor(Math.random()*4);
          if(side===0){g.x=bx+Math.random()*bw;g.y=by;}
          else if(side===1){g.x=bx+Math.random()*bw;g.y=by+bh;}
          else if(side===2){g.x=bx;g.y=by+Math.random()*bh;}
          else{g.x=bx+bw;g.y=by+Math.random()*bh;}
          g.rotation=Math.random()*Math.PI*2;
          this.effectsLayer.addChild(g);
          const angle=-Math.PI/2+(Math.random()-0.5)*1.2;
          const spd=1.0+Math.random()*2.5;
          this.particles.push({
            gfx:g,vx:Math.cos(angle)*spd,vy:Math.sin(angle)*spd,
            life:0.8+Math.random()*0.4,decay:0.018+Math.random()*0.012,
            rot:(Math.random()-0.5)*0.1
          });
        },i*15+Math.random()*20);
      }
    }

    // ラベル「B2B BREAK」をボード右に表示
    if(b2bCount>=2){
      const lx=this.mainBX+BOARD_W+18;
      const ly=this.mainBY+BOARD_H*0.5;
      const breakLabel=new FloatLabel(this.app,lx,ly,`B2B ×${b2bCount} BREAK`,0xaaaaaa,false);
      breakLabel._fadeDelay=1200;
      this.floatLabels.push(breakLabel);
    }

    // SFX: 力が抜けるような低い音
    try{
      const ctx=getAudio();
      const osc=ctx.createOscillator();
      const gn=ctx.createGain();
      osc.connect(gn);gn.connect(ctx.destination);
      osc.type='sawtooth';
      osc.frequency.setValueAtTime(200,ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50,ctx.currentTime+0.55);
      gn.gain.setValueAtTime(0.3*sfxVol,ctx.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.55);
      osc.start();osc.stop(ctx.currentTime+0.55);
      // 短いシュっという音
      setTimeout(()=>{playNoise(0.18,0.18,300);},80);
    }catch(e){}
  }

  // スピン確定時: 回転方向に傾き＋少しバウンス
  onSpinTilt(dir){
    if(settings.tilt!=='on')return;
    // 回転方向に傾く（dir>0=右回転=右傾き, dir<0=左回転=左傾き）
    this.tiltTarget=dir>0?0.065:-0.065;
    // 回転方向の斜め下に少し枠ごと動いて戻るバウンス
    const bounceX=dir>0?-3.5:3.5;
    const bounceY=2.5;
    this._spinBounceX=bounceX;
    this._spinBounceY=bounceY;
    this._spinBounceTime=0;
    setTimeout(()=>{this.tiltTarget=0;},292);
  }

  // 回転した瞬間のスピンキラキラ（小さめ・控えめ）
  onSpinRotateSparkle(piece,spinType){
    if(settings.particles==='off'||settings.quality==='minimum')return;
    const color=PIECE_COLORS[piece.type]||0xffffff;
    // Tスピンは紫系アクセント、他は自色
    const sparkColor=piece.type==='T'?0xee88ff:color;
    const shape=this.gs.getShape(piece.type,piece.rotation);
    const n=settings.particles==='high'?4:2;
    const isMini=spinType&&spinType.startsWith('MINI');
    // miniは更に少なく
    const count=isMini?Math.max(1,n-1):n;
    for(let r=0;r<shape.length;r++)for(let c=0;c<shape[r].length;c++){
      if(!shape[r][c])continue;
      const dr=piece.y+r-HIDDEN;
      const px=this.mainBX+(piece.x+c)*CELL+CELL/2;
      const py=this.mainBY+dr*CELL+CELL/2;
      for(let i=0;i<count;i++){
        const g=new PIXI.Graphics();
        // 星形と小円を混ぜる
        const sz=Math.random()*1.8+0.6;
        if(i%2===0){
          // 小さいひし形（星っぽく）
          g.beginFill(sparkColor,0.9);
          g.moveTo(0,-sz*2);g.lineTo(sz*0.6,0);g.lineTo(0,sz*2);g.lineTo(-sz*0.6,0);
          g.closePath();g.endFill();
        } else {
          g.beginFill(sparkColor,0.85);g.drawCircle(0,0,sz);g.endFill();
        }
        g.x=px+(Math.random()-0.5)*CELL*0.9;
        g.y=py+(Math.random()-0.5)*CELL*0.9;
        this.effectsLayer.addChild(g);
        const angle=Math.random()*Math.PI*2;
        const speed=Math.random()*2.2+0.8;
        this.particles.push({
          gfx:g,
          vx:Math.cos(angle)*speed,
          vy:Math.sin(angle)*speed-1.2,
          life:0.85,
          decay:0.045+Math.random()*0.025
        });
      }
    }
  }

  // 壁バウンス: 押している間は沈み込み、単発タップだけ短いバウンス
  onWallBump(dx){
    const isHeld=dx>0?keyState['ArrowRight']:keyState['ArrowLeft'];
    if(isHeld){
      // 押しっぱなし: バウンスせず wallPressX に任せる
      return;
    }
    if(this._wallBumpActive)return;
    this._wallBumpActive=true;
    const bumpAmt=dx>0?6:-6;
    this.wallBumpX=bumpAmt;
    setTimeout(()=>{this.wallBumpX=0;setTimeout(()=>{this._wallBumpActive=false;},50);},130);
  }

  onHardDrop(dropped){
    const depth=Math.min(10,Math.floor(dropped*0.22)+3);
    this.boardOffsetY=Math.max(this.boardOffsetY,depth);
    if(settings.particles!=='off'){
      const gs=this.gs;const gy=gs.ghostY();
      const shape=gs._getShapeForPiece(gs.current);
      const col=PIECE_COLORS[gs.current.type]||0xffffff;
      const startY=gs.current.y; // ドロップ前のY

      // ★ ハードドロップ: 着地点にアステロイド粒子（白〜薄灰の正方形、3〜5個）
      if(settings.particles!=='off'&&settings.quality!=='minimum'){
        // 着地したミノの各マスから3〜5個のアステロイドを散らす
        const asteroidCells=[];
        for(let r=0;r<shape.length;r++)for(let c=0;c<shape[r].length;c++){
          if(!shape[r][c])continue;
          const dr=gy+r-HIDDEN;if(dr<0)continue;
          asteroidCells.push({px:this.mainBX+(gs.current.x+c)*CELL,py:this.mainBY+dr*CELL});
        }
        // 全マス合わせて3〜5個のみ（まびき）
        const totalAst=3+Math.floor(Math.random()*3);
        for(let i=0;i<totalAst;i++){
          const cell2=asteroidCells[Math.floor(Math.random()*asteroidCells.length)];
          if(!cell2)continue;
          const g=new PIXI.Graphics();
          const sz=Math.random()*3+2.5;
          const grayVal=Math.floor(0xcc+Math.random()*0x33);
          const color=(grayVal<<16)|(grayVal<<8)|grayVal;
          const alpha=0.55+Math.random()*0.35;
          const pts2=16;
          g.beginFill(color,alpha);
          g.moveTo(sz,0);
          for(let k=1;k<=pts2;k++){const t=(k/pts2)*Math.PI*2;g.lineTo(sz*Math.pow(Math.cos(t),3),sz*Math.pow(Math.sin(t),3));}
          g.closePath();g.endFill();
          g.x=cell2.px+Math.random()*CELL;
          g.y=cell2.py+Math.random()*CELL;
          g.rotation=Math.random()*Math.PI*2;
          this.effectsLayer.addChild(g);
          const angle=Math.random()*Math.PI*2;
          const speed=1.5+Math.random()*3.5;
          this.particles.push({gfx:g,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-1.5,life:0.9+Math.random()*0.3,decay:0.04+Math.random()*0.025,rot:(Math.random()-0.5)*0.18});
        }

        // ★ ハードドロップ時: 盤面内ランダム位置から上へ消えていく白い粒子 3〜5個
        if(dropped>=2){
          const risingCount=3+Math.floor(Math.random()*3);
          for(let i=0;i<risingCount;i++){
            const g=new PIXI.Graphics();
            const sz=Math.random()*2+1.5;
            const grayVal2=Math.floor(0xcc+Math.random()*0x33);
            const col2=(grayVal2<<16)|(grayVal2<<8)|grayVal2;
            g.beginFill(col2,0.45+Math.random()*0.35);
            g.drawRect(-sz/2,-sz/2,sz,sz);
            g.endFill();
            // ボード内のランダムなX・着地ミノ付近のY
            const landingY=this.mainBY+(gy-HIDDEN)*CELL;
            g.x=this.mainBX+Math.random()*BOARD_W;
            g.y=landingY-Math.random()*CELL*3;
            g.rotation=Math.random()*Math.PI*2;
            this.effectsLayer.addChild(g);
            this.particles.push({gfx:g,vx:(Math.random()-0.5)*0.6,vy:-(0.8+Math.random()*1.8),life:0.7+Math.random()*0.5,decay:0.028+Math.random()*0.018,rot:(Math.random()-0.5)*0.08});
          }
        }
      }
      // 着地ミノがライン消去を起こすか判定
      const willClear=(()=>{
        for(let r=0;r<shape.length;r++){
          const rowY=gy+r;
          if(rowY<HIDDEN||rowY>=ROWS+HIDDEN)continue;
          let full=true;
          for(let c=0;c<getGameCols();c++){
            const hasBoard=gs.board[rowY][c]!==0;
            const pc=c-gs.current.x;
            const hasPiece=pc>=0&&pc<shape[r].length&&!!shape[r][pc];
            if(!hasBoard&&!hasPiece){full=false;break;}
          }
          if(full)return true;
        }
        return false;
      })();
      // ライン消去時はグラスグリント非表示
      if(!willClear&&settings.quality!=='minimum'){
        this._spawnGlassGlint(gs.current,shape,gy,col);
      }
    }
  }

  // ガラスのキラっ光: 固定マスクでセル内にクリップしながらスライド
  _spawnGlassGlint(piece,shape,ghostY,col){
    const S=CELL;
    for(let r=0;r<shape.length;r++)for(let c=0;c<shape[r].length;c++){
      if(!shape[r][c])continue;
      const dr=ghostY+r-HIDDEN;if(dr<0)continue;
      const px=this.mainBX+(piece.x+c)*CELL;
      const py=this.mainBY+dr*CELL;
      const cont=new PIXI.Container();
      cont.x=px;cont.y=py;
      const streak=new PIXI.Graphics();
      const numStripes=settings.particles==='high'?3:2;
      for(let i=0;i<numStripes;i++){
        const t=(i+0.5)/numStripes;
        const xCenter=S*t;
        const halfW=S*0.12;
        const skew=S*0.55;
        const alpha=i===Math.floor(numStripes/2)?0.65:0.35;
        streak.beginFill(0xffffff,alpha);
        streak.moveTo(xCenter-skew/2-halfW,0);
        streak.lineTo(xCenter-skew/2+halfW,0);
        streak.lineTo(xCenter+skew/2+halfW,S);
        streak.lineTo(xCenter+skew/2-halfW,S);
        streak.closePath();streak.endFill();
      }
      streak.beginFill(col,0.35);
      streak.moveTo(2,2);streak.lineTo(S*0.4,2);streak.lineTo(2,S*0.4);
      streak.closePath();streak.endFill();
      cont.addChild(streak);
      // マスクはセル位置に固定（cont移動しても動かない）
      const mask=new PIXI.Graphics();
      mask.beginFill(0xffffff,1);
      mask.drawRect(px+1,py+1,S-2,S-2);
      mask.endFill();
      this.effectsLayer.addChild(mask);
      cont.mask=mask;
      this.effectsLayer.addChild(cont);
      const vx=0.7+Math.random()*0.5;
      const vy=0.5+Math.random()*0.4;
      this.particles.push({gfx:cont,vx,vy,life:1.0,decay:0.09+Math.random()*0.03,_mask:mask});
    }
  }

  // spin確定時: 白いキラキラを表示 (T-spinは白)
  triggerAfterimage(piece, shape, spinType){
    if(settings.particles==='off') return;
    if(spinType==='SPIN180') return;
    this._afterimageData = {
      shape: shape.map(r=>[...r]),
      x: piece.x,
      y: piece.y,
      type: piece.type,
      spinType: spinType||null
    };
    this._afterimageAlpha = 0.78;
    this._afterimageLife = 350;
    this.afterimageGfx.alpha = this._afterimageAlpha;
    this._drawAfterimage();
  }

  _drawAfterimage(){
    const g = this.afterimageGfx;
    g.clear();
    const d = this._afterimageData;
    if(!d || this._afterimageAlpha <= 0.01) return;
    const shape = d.shape;
    for(let r=0;r<shape.length;r++) for(let c=0;c<shape[r].length;c++){
      if(!shape[r][c]) continue;
      const dr = d.y + r - HIDDEN;
      if(dr < 0) continue;
      const px = d.x*CELL + c*CELL;
      const py = dr*CELL;
      const baseColor = PIECE_COLORS[d.type] || 0xffffff;
      const spinColors={'TSPIN':0xcc44ff,'MINI_TSPIN':0xcc88ff,'ISPIN':0x00f5ff,'SSPIN':0x00e000,'ZSPIN':0xff3300,'LSPIN':0xff8800,'JSPIN':0x0088ff,'SPIN180':0xffffff,'JSPIN':0x0055ff};
      const color = d.spinType ? (spinColors[d.spinType]||baseColor) : baseColor;
      g.beginFill(color, 0.22);
      g.lineStyle(2, color, 0.95);
      g.drawRect(px+1, py+1, CELL-2, CELL-2);
      g.endFill();
      // 内側の白グロー
      g.beginFill(0xffffff, 0.12);
      g.lineStyle(0);
      g.drawRect(px+2, py+2, CELL-4, CELL-4);
      g.endFill();
      g.lineStyle(0);
    }
  }

  onSpinSparkle(lockX,lockY,pieceType,spinType){
    if(settings.particles==='off')return;
    const color=PIECE_COLORS[pieceType]||0xffffff;
    // ロック時の形状取得（回転考慮）
    const rot=(this.gs._lockRot||0);
    const shape=(PIECE_SHAPES[pieceType])?.[((rot%4)+4)%4]||PIECE_SHAPES[pieceType]?.[0]||[];
    const n=settings.particles==='high'?3:2;
    for(let r=0;r<shape.length;r++)for(let c=0;c<shape[r].length;c++){
      if(!shape[r][c])continue;
      const dr=lockY+r-HIDDEN;if(dr<0)continue;
      const px=this.mainBX+(lockX+c)*CELL+CELL/2;
      const py=this.mainBY+dr*CELL+CELL/2;
      for(let i=0;i<n;i++){
        const g=new PIXI.Graphics();
        // アステロイド曲線 (4尖頭の外サイクロイド): x=a*cos³t, y=a*sin³t
        const sz=Math.random()*5+3;
        const pts=20;
        // 白グロー
        g.beginFill(0xffffff,0.5);
        g.moveTo(sz,0);
        for(let k=1;k<=pts;k++){const t=(k/pts)*Math.PI*2;g.lineTo(sz*Math.pow(Math.cos(t),3),sz*Math.pow(Math.sin(t),3));}
        g.closePath();g.endFill();
        // ミノ色
        const sz2=sz*0.78;
        g.beginFill(color,0.9);
        g.moveTo(sz2,0);
        for(let k=1;k<=pts;k++){const t=(k/pts)*Math.PI*2;g.lineTo(sz2*Math.pow(Math.cos(t),3),sz2*Math.pow(Math.sin(t),3));}
        g.closePath();g.endFill();
        g.x=px+(Math.random()-0.5)*CELL*0.6;
        g.y=py+(Math.random()-0.5)*CELL*0.6;
        g.rotation=Math.random()*Math.PI*2;
        this.effectsLayer.addChild(g);
        const angle=Math.random()*Math.PI*2;
        const speed=Math.random()*3.5+1.5;
        this.particles.push({gfx:g,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-2.5,life:1,decay:0.022+Math.random()*0.018,rot:(Math.random()-0.5)*0.2});
      }
    }
  }

  endComboLabel(){if(this.comboLabel){this.comboLabel.end();this.comboLabel=null;}}

  // CLUTCHエフェクト: 画面上部に横に伸びながら消えるテキスト
  onClutch(){
    if(this._clutchEl)try{this._clutchEl.remove();}catch(e){}
    const el=document.createElement('div');
    el.textContent='CLUTCH';
    el.style.cssText=`
      position:fixed;top:${Math.round(this.H*0.08)}px;left:50%;
      transform:translateX(-50%) scaleX(1);
      font-family:Orbitron,sans-serif;font-size:clamp(0.7rem,1.8vw,1.4rem);
      font-weight:300;color:#ffffff;
      text-shadow:0 0 8px rgba(255,255,255,0.4);
      letter-spacing:0.25em;
      pointer-events:none;z-index:9999;
      white-space:nowrap;
      transition:none;
      opacity:0.75;
    `;
    document.body.appendChild(el);
    this._clutchEl=el;
    SFX.allClear&&SFX.allClear();
    // アニメーション: 0.2秒で通常サイズ → 1秒間キープ → 0.4秒で横伸び＋消滅
    requestAnimationFrame(()=>{
      el.style.transition='transform 0.18s cubic-bezier(0.17,0.67,0.35,1.4), opacity 0.18s';
      el.style.transform='translateX(-50%) scaleX(1.05) scaleY(1.08)';
      el.style.opacity='1';
      setTimeout(()=>{
        el.style.transition='transform 0.7s cubic-bezier(0.4,0,1,1), opacity 0.5s ease-in 0.2s';
        el.style.transform='translateX(-50%) scaleX(4) scaleY(0.3)';
        el.style.opacity='0';
        setTimeout(()=>{try{el.remove();}catch(e){}if(this._clutchEl===el)this._clutchEl=null;},900);
      },900);
    });
    // シェイクもかける
    if(settings.shake==='on')this.shakePower=Math.max(this.shakePower,20);
  }

  // B2B解除時のボーナス攻撃エフェクト: 白い塊が分裂して相手に飛ぶ
  onB2bBreakAttack(bonusAtk,b2bCount){
    if(settings.particles==='off')return;
    // 発射元: ボードの中央上
    const sx=this.mainBX+BOARD_W/2;
    const sy=this.mainBY+BOARD_H*0.2;
    // 相手のガベージメーターに向かって飛ぶ
    const targets=this._getOpponentTargets();
    for(const {tx,ty} of targets){
      for(let i=0;i<bonusAtk;i++){
        setTimeout(()=>{
          this._spawnB2bBreakBolt(sx,sy,tx,ty,i,bonusAtk);
        },i*80);
      }
    }
    // 自分のボード上に白い爆発
    for(let i=0;i<16;i++){
      const g=new PIXI.Graphics();
      const sz=Math.random()*8+4;
      g.beginFill(0xffffff,0.9);g.drawCircle(0,0,sz);g.endFill();
      g.x=sx+(Math.random()-0.5)*BOARD_W*0.6;
      g.y=sy+(Math.random()-0.5)*BOARD_H*0.3;
      this.effectsLayer.addChild(g);
      const a=Math.random()*Math.PI*2;
      const sp=Math.random()*8+3;
      this.particles.push({gfx:g,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-4,life:1,decay:0.018+Math.random()*0.012,rot:(Math.random()-0.5)*0.15});
    }
    // フラッシュ
    this._flashAlpha=0.6;
    this.flashGfx.clear();
    this.flashGfx.beginFill(0xffffff,0.6);
    this.flashGfx.drawRect(0,0,BOARD_W,BOARD_H);
    this.flashGfx.endFill();
  }

  _getOpponentTargets(){
    const targets=[];
    for(const pid of Object.keys(this.opBoardData)){
      const d=this.opBoardData[pid];
      if(d&&d.cont&&d.cont.visible){
        // ガベージメーターの位置（ボードの左端 + 上部）
        targets.push({tx:d.cont.x+(d.bw||0)*0.5,ty:d.cont.y+(d.bh||0)*0.3});
      }
    }
    // ターゲットがなければ画面右端
    if(!targets.length)targets.push({tx:this.W*0.85,ty:this.H*0.3});
    return targets;
  }

  _spawnB2bBreakBolt(sx,sy,tx,ty,idx,total){
    const cont=new PIXI.Container();
    cont.x=sx;cont.y=sy;
    this.projLayer.addChild(cont);
    // 白い球
    const g=new PIXI.Graphics();
    const r=10+Math.random()*6;
    g.beginFill(0xffffff,1);g.drawCircle(0,0,r);g.endFill();
    g.beginFill(0xaaddff,0.7);g.drawCircle(0,0,r*0.6);g.endFill();
    cont.addChild(g);
    // カーブ軌道: 中間点をランダムに曲げる
    const mx=(sx+tx)/2+(Math.random()-0.5)*200;
    const my=(sy+ty)/2+(Math.random()-0.5)*200-100;
    const frames=40+Math.floor(Math.random()*20);
    let f=0;
    const trail=[];
    const ticker=()=>{
      f++;
      const t=f/frames;
      // ベジエ曲線 (二次)
      const bx=(1-t)*(1-t)*sx+2*(1-t)*t*mx+t*t*tx;
      const by=(1-t)*(1-t)*sy+2*(1-t)*t*my+t*t*ty;
      cont.x=bx;cont.y=by;
      cont.rotation+=0.25;
      // トレイル
      if(f%2===0&&settings.particles!=='off'){
        const tg=new PIXI.Graphics();
        tg.beginFill(0xffffff,0.4*(1-t));tg.drawCircle(0,0,r*0.5*(1-t*0.5));tg.endFill();
        tg.x=bx;tg.y=by;
        this.effectsLayer.addChild(tg);
        this.particles.push({gfx:tg,vx:0,vy:0,life:0.4*(1-t),decay:0.06});
      }
      if(f>=frames){
        // 着弾爆発
        for(let i=0;i<10;i++){
          const eg=new PIXI.Graphics();
          eg.beginFill(0xffffff,0.9);eg.drawCircle(0,0,Math.random()*5+2);eg.endFill();
          eg.x=tx;eg.y=ty;
          this.effectsLayer.addChild(eg);
          const ea=Math.random()*Math.PI*2;
          const esp=Math.random()*6+2;
          this.particles.push({gfx:eg,vx:Math.cos(ea)*esp,vy:Math.sin(ea)*esp-2,life:0.8,decay:0.04+Math.random()*0.03});
        }
        try{cont.destroy({children:true});}catch(e){}
        this.app.ticker.remove(ticker);
        return;
      }
    };
    this.app.ticker.add(ticker);
  }

  _getClearRowsCenterY(cleared){
    if(!cleared||!cleared.length)return this.mainBY+BOARD_H*0.5;
    const avgRow=cleared.reduce((a,b)=>a+b,0)/cleared.length;
    return this.mainBY+(avgRow-HIDDEN)*CELL+CELL/2;
  }


  // 危険時: 次スポーンのミノが既存ブロックと重なるマスに赤×を描画
  _drawSpawnDangerX(danger){
    if(!this.gs||!this.gs.nextQueue||danger<=0){
      if(this._spawnXGfx){this._spawnXGfx.clear();}
      return;
    }
    if(!this._spawnXGfx){
      this._spawnXGfx=new PIXI.Graphics();
      this.boardCont.addChild(this._spawnXGfx);
    }
    const g=this._spawnXGfx;
    g.clear();

    const nextType=this.gs.nextQueue[0];
    if(!nextType)return;

    // 次のピースの形状（rot=0）
    const SHAPES_DEF={
      I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
      O:[[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
      T:[[0,1,0],[1,1,1],[0,0,0]],
      S:[[0,1,1],[1,1,0],[0,0,0]],
      Z:[[1,1,0],[0,1,1],[0,0,0]],
      J:[[1,0,0],[1,1,1],[0,0,0]],
      L:[[0,0,1],[1,1,1],[0,0,0]]
    };
    const sh=SHAPES_DEF[nextType];
    if(!sh)return;

    const cols=getGameCols();
    const spX=Math.floor((cols-4)/2);
    const spY=SPAWN_Y; // board row index

    // 枠が赤くなる度合いに応じて透明度を変える
    const alpha=Math.min(0.9,danger*1.1)*0.8;
    const pulse=0.5+0.5*Math.abs(Math.sin(performance.now()*0.005));

    for(let dr=0;dr<sh.length;dr++){
      for(let dc=0;dc<sh[dr].length;dc++){
        if(!sh[dr][dc])continue;
        const br=spY+dr; // board row
        const bc=spX+dc; // board col
        // Check if this cell overlaps existing blocks (in visible board area)
        if(br>=0&&br<this.gs.board.length&&bc>=0&&bc<cols&&this.gs.board[br][bc]){
          // Draw red X on this cell
          const px=bc*CELL;
          const py=(br-HIDDEN)*CELL;
          if(py<0||py>=BOARD_H)continue;
          const m=CELL*0.15;
          const x1=px+m, y1=py+m, x2=px+CELL-m, y2=py+CELL-m;
          g.lineStyle(2.5,0xff2020,alpha*pulse);
          g.moveTo(x1,y1); g.lineTo(x2,y2);
          g.moveTo(x2,y1); g.lineTo(x1,y2);
          // Dim fill
          g.lineStyle(0);
          g.beginFill(0xff0000,alpha*0.18*pulse);
          g.drawRect(px+m,py+m,CELL-m*2,CELL-m*2);
          g.endFill();
        }
      }
    }
  }

  onLineClear(cleared,count,spinType,isB2B,combo,ren,allClear,attack,currentB2bCount){
    this.flashGfx.clear();this._flashAlpha=1;
    const isTDouble=spinType==='TSPIN'&&count===2;
    const isTTriple=spinType==='TSPIN'&&count===3;
    const isAnySpin=!!spinType&&count>=1;
    // スピン色: ミノの色に合わせる
    const spinPieceMap={'TSPIN':'T','MINI_TSPIN':'T','ISPIN':'I','SSPIN':'S','ZSPIN':'Z','LSPIN':'L','JSPIN':'J','SPIN180':null};
    const spinPiece=spinType?spinPieceMap[spinType]:null;
    const spinChunkColor=spinPiece?PIECE_COLORS[spinPiece]:0xffffff;
    const flashColor=isAnySpin?spinChunkColor:allClear?0xffff00:0xffffff;
    if(settings.shake==='on')this.shakePower=Math.min(16,count*3+(spinType?5:0)+(allClear?12:0));
    const renScale=Math.min(ren||0,10)/10;
    if(count===1||count===2||count===3){
      if(spinType)this.boardOffsetY=Math.max(this.boardOffsetY,18+renScale*6);
      else this.boardOffsetY=Math.max(this.boardOffsetY,10+renScale*14);
    }
    if(count>=4||allClear)this.boardOffsetY=Math.max(this.boardOffsetY,24);
    if(settings.tilt==='on'&&spinType){
      this.tiltTarget=spinType==='TSPIN'?0.07:-0.055;
      setTimeout(()=>{this.tiltTarget=0;},292);
    }
    if(settings.particles!=='off'&&settings.quality!=='minimum'){
      cleared.forEach(r=>{
        const dr=r-HIDDEN;if(dr<0)return;
        const n=count>=4?8:settings.particles==='high'?5:3;
        for(let c=0;c<getGameCols();c++){
          for(let i=0;i<n;i++){
            const g=new PIXI.Graphics();
            const sz=Math.random()*3+2;
            const grayVal=Math.floor(0xbb+Math.random()*0x44);
            const color=(grayVal<<16)|(grayVal<<8)|grayVal;
            const alpha=0.5+Math.random()*0.3;
            g.beginFill(color,alpha);
            g.drawRect(-sz/2,-sz/2,sz,sz);
            g.endFill();
            g.x=this.mainBX+c*CELL+Math.random()*CELL;
            g.y=this.mainBY+dr*CELL+Math.random()*CELL;
            g.rotation=Math.random()*Math.PI*2;
            this.effectsLayer.addChild(g);
            const angle=Math.random()*Math.PI*2;
            const speed=0.5+Math.random()*2.5;
            this.particles.push({gfx:g,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-2.5,life:0.7+Math.random()*0.3,decay:0.022+Math.random()*0.014,rot:(Math.random()-0.5)*0.15});
          }
        }
      });
      // 消すきっかけのミノの位置から破片ポリゴンを放物線で飛ばす
      const gs=this.gs;
      const lockPieceCells=[];
      if(gs._lockX!=null&&gs._lockY!=null){
        const pRot=((gs._lockRot||0)%4+4)%4;
        const pShape=PIECE_SHAPES[gs._lockType]?.[pRot];
        if(pShape){
          for(let r=0;r<pShape.length;r++)for(let c=0;c<pShape[r].length;c++){
            if(!pShape[r][c])continue;
            const dr=gs._lockY+r-HIDDEN;
            if(dr<0)continue;
            lockPieceCells.push({px:this.mainBX+(gs._lockX+c)*CELL+CELL/2,py:this.mainBY+dr*CELL+CELL/2});
          }
        }
      }
      if(lockPieceCells.length>0){
        const pieceCol=PIECE_COLORS[gs._lockType]||0xffffff;
        const polyCount=count>=4?18:10;
        for(let i=0;i<polyCount;i++){
          const g=new PIXI.Graphics();
          const sz=Math.random()*(count>=4?8:5)+3;
          const grayVal=Math.floor(0xaa+Math.random()*0x55);
          const col=(grayVal<<16)|(grayVal<<8)|grayVal;
          const alpha=0.25+Math.random()*0.2;
          g.beginFill(col,alpha);
          // ランダム多角形（三角形か四角形）
          const nVerts=Math.random()<0.5?3:4;
          const verts=[];
          for(let j=0;j<nVerts;j++){
            const a2=(j/nVerts)*Math.PI*2+(Math.random()-0.5)*1.0;
            const r2=sz*(0.3+Math.random()*0.7);
            verts.push({x:Math.cos(a2)*r2,y:Math.sin(a2)*r2});
          }
          g.moveTo(verts[0].x,verts[0].y);
          for(let j=1;j<verts.length;j++)g.lineTo(verts[j].x,verts[j].y);
          g.closePath();g.endFill();
          const cell=lockPieceCells[Math.floor(Math.random()*lockPieceCells.length)];
          g.x=cell.x+(Math.random()-0.5)*CELL*0.6;
          g.y=cell.y+(Math.random()-0.5)*CELL*0.6;
          g.rotation=Math.random()*Math.PI*2;
          this.effectsLayer.addChild(g);
          const a3=-Math.PI/2+(Math.random()-0.5)*Math.PI*0.6;
          const spd=1.0+Math.random()*3.0;
          this.particles.push({gfx:g,vx:Math.cos(a3)*spd,vy:Math.sin(a3)*spd,life:0.8+Math.random()*0.4,decay:0.016+Math.random()*0.012,rot:(Math.random()-0.5)*0.12});
        }
      }
      // スピン系: チャンクエフェクト（T以外も含む）
      if(isAnySpin&&settings.particles!=='off'){
        const chunkCount=isTTriple?3:isTDouble||count>=2?2:1;
        this._spawnTSpinChunks(cleared,chunkCount,spinChunkColor);
      }
    }

    // B2B 雷エフェクト
    let _b2bBreakCount=0;
    if(isB2B){
      this._b2bCount = currentB2bCount || (this._b2bCount||0)+1;
      this._triggerLightning(this._b2bCount);
      this._punchB2bBadge(); // カウント更新エフェクト
    } else {
      if(this._b2bCount>=1) {
        _b2bBreakCount=this._b2bCount;
        this._breakB2bLightning(); // B2B途切れ白稲妻
        this._triggerDatsuroku(this._b2bCount); // B2B切れ「脱力」エフェクト
      }
      this._b2bCount=0;
    }
    this.updateB2bBadge();

    // === REN エスカレーティング・エフェクト ===
    if(ren>=2&&settings.quality!=='minimum'){
      this._triggerRenEffect(ren,cleared);
    }

    const lx=this.mainBX+BOARD_W+18;let ly=this.mainBY+BOARD_H*0.25;
    let lbl='';
    if(spinType){
      if(spinType==='TSPIN')lbl={0:'T-SPIN',1:'T-SPIN SINGLE',2:'T-SPIN DOUBLE',3:'T-SPIN TRIPLE'}[count]||'T-SPIN';
      else if(spinType==='MINI_TSPIN')lbl='MINI T-SPIN';
      else lbl=spinType.replace('SPIN',' SPIN');
    }
    if(count===4&&!spinType)lbl='QUAD';
    if(count===1&&!spinType)lbl='Single';
    if(count===2&&!spinType)lbl='Double';
    if(count===3&&!spinType)lbl='Triple';
    if(allClear)lbl='★ ALL CLEAR ★';
    
    const b2bStr = (isB2B && this._b2bCount > 1) ? `B2B x${this._b2bCount} ` : (isB2B ? 'B2B ' : '');
    if(lbl) lbl = b2bStr + lbl;

    if(ren>1)lbl+=(lbl?' │ ':'')+`REN ${ren-1}`;
    if(lbl){
      const col=allClear?0xffff44:0xffffff;
      this.floatLabels.push(new FloatLabel(this.app,lx,ly,lbl,col,false));ly+=38;
    }
    if(combo>0){
      if(!this.comboLabel||!this.comboLabel.alive){
        this.comboLabel=new FloatLabel(this.app,lx,ly,`COMBO ×${combo}`,0x06d6a0,true);
        this.floatLabels.push(this.comboLabel);
      } else {
        this.comboLabel.updateText(`COMBO ×${combo}`);
        this.comboLabel.baseY=ly;this.comboLabel.txt.y=ly;
      }
      ly+=38;
    } else {this.endComboLabel();}
    if(attack>0&&count>1){
      this._attackAccum+=attack;
      let atkTxt=`⚔ +${this._attackAccum}`;
      if(ren>1)atkTxt+=`  REN x${ren-1}`;
      if(_b2bBreakCount>0)atkTxt+=`  💔 B2B x${_b2bBreakCount}`;
      const atkSz=Math.min(20+Math.floor(this._attackAccum*4),64);
      const sc=this._uiScale||1;
      if(!this._atkText||!this._atkText.alive){
        this._attackAccum=attack;
        atkTxt=`⚔ +${attack}`;
        const st=new PIXI.TextStyle({fontFamily:'Orbitron',fontSize:atkSz,fill:0xff6060,fontWeight:'700',letterSpacing:2,dropShadow:true,dropShadowColor:0x000000,dropShadowDistance:3,dropShadowBlur:4});
        this._atkText=new PIXI.Text(atkTxt,st);
        this._atkText.anchor.set(0,0.5);
        this._atkText.x=lx;this._atkText.y=this.mainBY+BOARD_H*0.6;
        this._atkText.alpha=0;this._atkText.scale.set(1.5);
        this._atkText._popT=0;
        this._atkText.alive=true;
        this.effectsLayer.addChild(this._atkText);
        if(!this._customLabels)this._customLabels=[];
        this._customLabels.push(this._atkText);
      } else {
        this._atkText.style.fontSize=atkSz;
        this._atkText.text=atkTxt;
        this._atkText._popT=0;
        this._atkText.scale.set(1.5);this._atkText.alpha=0;
      }
      clearTimeout(this._attackAccumTimer);
      this._attackAccumTimer=setTimeout(()=>{this._attackAccum=0;if(this._atkText){this._atkText.alive=false;this._atkText._fadeT=0;this._atkText._fading=true;}},3500);
    }
    if(attack>0){
      const launchY=this._getClearRowsCenterY(cleared);
      this.opponentPlayers.forEach(op=>{
        if(this.opBoardData[op.id]&&!this.opBoardData[op.id].dead){
          this.onAttackProjectile(op.id,attack,launchY);
          if(attack>=4)this.showOpponentAttackNumber(op.id,attack);
        }
      });
      // attack>=4: 枠バッジ表示
      if(attack>=4)this.showAttackBadge(attack,'attack');
    }
    // ALL CLEAR spinning text (self-view)
    if(allClear&&this.effectsLayer){
      const sc=this._uiScale||1;
      const txt=new PIXI.Text('ALL CLEAR!',new PIXI.TextStyle({
        fontFamily:'Orbitron,sans-serif',fontSize:Math.floor(72*sc),fill:0xffff88,
        stroke:0x000000,strokeThickness:8,fontWeight:'900',
        dropShadow:true,dropShadowColor:0xffaa00,dropShadowBlur:20
      }));
      txt.anchor.set(0.5);
      txt.x=this.mainBX+BOARD_W*sc/2;
      txt.y=this.mainBY+BOARD_H*sc*0.28;
      txt.scale.set(0.3);
      const bg=new PIXI.Graphics();
      bg.beginFill(0x000000,0.6);
      bg.drawRoundedRect(-txt.width/2-20,-txt.height/2-12,txt.width+40,txt.height+24,12);
      bg.endFill();
      bg.scale.set(0.3);
      this.effectsLayer.addChild(bg);
      this.effectsLayer.addChild(txt);
      if(!this._allClearTexts)this._allClearTexts=[];
      this._allClearTexts.push({gfx:txt,timer:0,bg});
    }
  }

  // ===== REN エスカレーティング・エフェクト =====
  // RENが続くほどよりかっこよくなる
  _triggerRenEffect(ren, cleared){
    if(ren>=2)this.showAttackBadge(ren,'ren');
    if(settings.particles==='off') return;
    const cx=this.mainBX+BOARD_W/2;
    const cy=this._getClearRowsCenterY(cleared);

    // RENレベルに応じた色テーブル
    const renColors=[
      0x00f5ff, // 2: cyan
      0x06d6a0, // 3: green
      0xffbe0b, // 4: yellow
      0xff8c00, // 5: orange
      0xff3366, // 6: pink-red
      0xff00ff, // 7: magenta
      0xcc44ff, // 8: purple
      0xffffff, // 9: white flash
      0x00f5ff, // 10: back to cyan but intense
    ];
    const colorIdx=Math.min(ren-2, renColors.length-1);
    const renColor=renColors[colorIdx];
    const intensity=Math.min(1, 0.3+(ren-2)*0.1); // 0.3 ~ 1.0

    // Tier 1 (REN 2-3): 軽いリングバースト
    if(ren>=2){
      if(settings.quality!=='low'&&settings.quality!=='minimum'){
        const ring=new PIXI.Graphics();
        ring.lineStyle(2+ren*0.3,renColor,0.9);
        ring.drawCircle(0,0,8);
        ring.x=cx;ring.y=cy;
        this.effectsLayer.addChild(ring);
        let rr=8,ra=0.9;
        const expandRing=()=>{
          rr+=8+ren*0.8;ra-=0.055+ren*0.005;
          ring.clear();ring.lineStyle(2+ren*0.3,renColor,Math.max(0,ra));
          ring.drawCircle(0,0,rr);
          if(ra>0)requestAnimationFrame(expandRing);else try{ring.destroy();}catch(e){}
        };
        requestAnimationFrame(expandRing);
      }
    }

    // Tier 2 (REN 4+): 四方に光の柱
    if(ren>=4&&settings.particles==='high'){
      const dirs=[[0,-1],[0,1],[-1,0],[1,0]];
      const n=Math.min(ren, 8);
      dirs.forEach(([dx,dy])=>{
        for(let i=0;i<n;i++){
          const g=new PIXI.Graphics();
          const sz=3+Math.random()*3;
          g.beginFill(renColor, 0.9);
          g.moveTo(0,-sz*2);g.lineTo(sz*0.5,0);g.lineTo(0,sz*2);g.lineTo(-sz*0.5,0);
          g.closePath();g.endFill();
          g.x=cx+(Math.random()-0.5)*BOARD_W*0.5;
          g.y=cy+(Math.random()-0.5)*CELL*4;
          this.effectsLayer.addChild(g);
          const speed=4+Math.random()*ren*0.7;
          this.particles.push({gfx:g,vx:dx*speed+(Math.random()-0.5)*2,vy:dy*speed+(Math.random()-0.5)*2-2,life:0.9,decay:0.03+Math.random()*0.02});
        }
      });
    }

    // Tier 3 (REN 6+): ボード全体フラッシュ + 螺旋
    if(ren>=6&&settings.quality!=='low'&&settings.quality!=='minimum'){
      // Board edge glow flash
      if(this.boardBorder){
        this.boardBorder.clear();
        this.boardBorder.lineStyle(3,renColor,0.95);
        this.boardBorder.drawRect(-2,0,BOARD_W+4,BOARD_H+4);
        this._borderNormal=false;
        setTimeout(()=>{if(this.boardBorder){this._borderNormal=false;}},150);
      }
      // Screen flash overlay
      this._flashAlpha=Math.min(1.5, this._flashAlpha+0.4*intensity);
      this.flashGfx.beginFill(renColor, 0.25*intensity);
      this.flashGfx.drawRect(-BOARD_W*0.1, -BOARD_H*0.1, BOARD_W*1.2, BOARD_H*1.2);
      this.flashGfx.endFill();
      // 螺旋パーティクル
      if(settings.particles==='high'){
        const spiralN=Math.floor(8+ren*1.5);
        for(let i=0;i<spiralN;i++){
          const angle=(i/spiralN)*Math.PI*2;
          const r2=30+ren*5;
          const g=new PIXI.Graphics();
          const sz=2+Math.random()*3;
          g.beginFill(renColor,0.95);g.drawCircle(0,0,sz);g.endFill();
          g.x=cx+Math.cos(angle)*r2;g.y=cy+Math.sin(angle)*r2;
          this.effectsLayer.addChild(g);
          const speed=3+ren*0.5+Math.random()*2;
          const outDir=angle+Math.PI*0.5; // tangential
          this.particles.push({gfx:g,vx:Math.cos(outDir)*speed+(Math.random()-0.5)*2,vy:Math.sin(outDir)*speed-3,life:1,decay:0.02+Math.random()*0.02});
        }
      }
    }

    // Tier 4 (REN 9+): ULTRA フルスクリーン雷 + 爆発
    if(ren>=9&&settings.quality==='ultra'){
      // Extra lightning bolts from board edges
      this._triggerLightning(10);
      this._b2bCount=Math.max(this._b2bCount||0, 5); // force intense lightning color
      // Massive burst from center
      if(settings.particles==='high'){
        const n=40;
        for(let i=0;i<n;i++){
          const g=new PIXI.Graphics();
          const sz=Math.random()*7+2;
          g.beginFill(i%3===0?0xffffff:renColor, 0.95);
          if(i%2===0){g.drawCircle(0,0,sz);}
          else{g.moveTo(0,-sz*2.5);g.lineTo(sz*0.5,0);g.lineTo(0,sz*2.5);g.lineTo(-sz*0.5,0);g.closePath();}
          g.endFill();
          g.x=cx+(Math.random()-0.5)*BOARD_W;
          g.y=cy+(Math.random()-0.5)*BOARD_H*0.6;
          this.effectsLayer.addChild(g);
          const angle=Math.random()*Math.PI*2;
          const speed=4+Math.random()*8;
          this.particles.push({gfx:g,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-4,life:1,decay:0.018+Math.random()*0.018});
        }
        // Shockwave rings
        for(let k=0;k<3;k++){
          setTimeout(()=>{
            const sw=new PIXI.Graphics();sw.lineStyle(3+k,renColor,0.9);sw.drawCircle(0,0,6);
            sw.x=cx;sw.y=cy;this.effectsLayer.addChild(sw);
            let sr=6,sa=0.9;
            const swT=()=>{sr+=10+k*4;sa-=0.055;sw.clear();sw.lineStyle(3+k,renColor,Math.max(0,sa));sw.drawCircle(0,0,sr);
              if(sa>0)requestAnimationFrame(swT);else try{sw.destroy();}catch(e){}};
            requestAnimationFrame(swT);
          }, k*80);
        }
      }
    }

    // REN表示をかっこよく更新（ren数に応じてサイズ・色変化）
    this._showRenDisplay(ren, renColor, intensity);
  }

  // REN数をかっこよく画面左側に大きく表示
  _showRenDisplay(ren, color, intensity){
    if(settings.quality==='minimum') return;
    // 既存のRENラベルを削除
    if(this._renDisplayGfx){try{this._renDisplayGfx.destroy();}catch(e){}this._renDisplayGfx=null;}
    if(this._renLabelText){try{this._renLabelText.destroy();}catch(e){}this._renLabelText=null;}
    if(this._renNumText){try{this._renNumText.destroy();}catch(e){}this._renNumText=null;}

    const fontSize=Math.min(20+ren*4, 72); // 続くほど大きく
    const lx=this.mainBX-130;
    const ly=this.mainBY+BOARD_H*0.4;

    // 背景グロー
    if(settings.quality!=='low'){
      const bg=new PIXI.Graphics();
      const glowR=fontSize*1.5*intensity;
      bg.beginFill(color,0.12*intensity);bg.drawCircle(0,0,glowR);bg.endFill();
      bg.beginFill(color,0.06*intensity);bg.drawCircle(0,0,glowR*1.8);bg.endFill();
      bg.x=lx;bg.y=ly;
      this.effectsLayer.addChild(bg);
      this._renDisplayGfx=bg;
    }

    const numStyle=new PIXI.TextStyle({fontFamily:'Orbitron',fontSize,fill:color,fontWeight:'900',
      dropShadow:true,dropShadowColor:color,dropShadowDistance:0,dropShadowBlur:Math.min(30,8+ren*2),
      letterSpacing:2});
    const renNum=new PIXI.Text(ren.toString(),numStyle);
    renNum.anchor.set(0.5);renNum.x=lx;renNum.y=ly;
    renNum.alpha=0;renNum.scale.set(2);
    this.app.stage.addChild(renNum);
    this._renNumText=renNum;

    const lblStyle=new PIXI.TextStyle({fontFamily:'Orbitron',fontSize:Math.min(11+ren,18),fill:color,fontWeight:'700',letterSpacing:4,
      dropShadow:true,dropShadowColor:color,dropShadowDistance:0,dropShadowBlur:6});
    const renLbl=new PIXI.Text('REN',lblStyle);
    renLbl.anchor.set(0.5);renLbl.x=lx;renLbl.y=ly-fontSize*0.9;
    renLbl.alpha=0;
    this.app.stage.addChild(renLbl);
    this._renLabelText=renLbl;

    // ポップインアニメ
    let t=0;
    const pop=()=>{
      t+=16;const p=Math.min(1,t/200);const ease=1-(1-p)*(1-p);
      renNum.scale.set(2-ease);renNum.alpha=ease;
      renLbl.alpha=ease;
      if(p<1)requestAnimationFrame(pop);
    };
    requestAnimationFrame(pop);

    // 自動フェードアウト
    setTimeout(()=>{
      let ft=0;
      const fade=()=>{
        ft+=16;const p=Math.min(1,ft/600);
        renNum.alpha=1-p;renLbl.alpha=1-p;
        if(this._renDisplayGfx)this._renDisplayGfx.alpha=(1-p)*0.12*intensity;
        if(p<1)requestAnimationFrame(fade);
        else{
          try{renNum.destroy();}catch(e){}try{renLbl.destroy();}catch(e){}
          if(this._renDisplayGfx){try{this._renDisplayGfx.destroy();}catch(e){}this._renDisplayGfx=null;}
          this._renNumText=null;this._renLabelText=null;
        }
      };
      requestAnimationFrame(fade);
    }, 1200);
  }

  // T-SPIN DOUBLE/TRIPLE 専用塊エフェクト
  _spawnTSpinChunks(cleared,chunkCount,color){
    const centerY=this._getClearRowsCenterY(cleared);
    const cx=this.mainBX+BOARD_W/2;
    for(let k=0;k<chunkCount;k++){
      // 各塊：角度を均等に分散
      const angle=(k/chunkCount)*Math.PI*2 - Math.PI/2;
      const g=new PIXI.Graphics();
      const sz=10+Math.random()*6;
      g.beginFill(color,0.95);
      g.drawRoundedRect(-sz/2,-sz/2,sz,sz,3);
      g.endFill();
      g.beginFill(0xffffff,0.5);
      g.drawRect(-sz/2,-sz/2,sz,4);
      g.endFill();
      // ラインアウトライン
      g.lineStyle(1.5,0xffffff,0.8);
      g.drawRoundedRect(-sz/2,-sz/2,sz,sz,3);
      g.lineStyle(0);
      g.x=cx;g.y=centerY;
      this.effectsLayer.addChild(g);
      const speed=6+Math.random()*4;
      this._lightningBolts.push({
        gfx:g,
        vx:Math.cos(angle)*speed,
        vy:Math.sin(angle)*speed-2,
        life:1,
        decay:0.025+Math.random()*0.015,
        rot:Math.random()*0.3-0.15,
        isChunk:true
      });
    }
  }

  // テトリス消し: 枠の4辺から「くの字」の棒が重力で落下する演出
  _spawnBorderBreakEffect(lineCount){
    if(settings.quality==='minimum'||settings.quality==='low')return;
    const sc2=this._uiScale||1;
    const bx=this.mainBX, by=this.mainBY;
    const bw=BOARD_W*sc2, bh2=BOARD_H*sc2;
    const numRods=settings.particles==='high'?14:8;
    // 枠の4辺からランダムにスポーン
    for(let i=0;i<numRods;i++){
      const side=Math.floor(Math.random()*4);
      let px,py;
      if(side===0){px=bx+Math.random()*bw;py=by;} // 上辺
      else if(side===1){px=bx+Math.random()*bw;py=by+bh2;} // 下辺
      else if(side===2){px=bx;py=by+Math.random()*bh2;} // 左辺
      else{px=bx+bw;py=by+Math.random()*bh2;} // 右辺
      // くの字の棒を描画（2本のセグメントを中心で折り曲げ）
      const g=new PIXI.Graphics();
      const len=CELL*(0.5+Math.random()*0.6)*sc2;
      const bendAngle=(Math.random()-0.5)*1.2; // 折れ曲がり角度
      const col=0x00f5ff;
      const col2=0xffffff;
      g.lineStyle(2,col,0.95);
      // 第1セグメント (中心から)
      const seg1X=Math.cos(bendAngle)*len*0.5;
      const seg1Y=-Math.sin(bendAngle)*len*0.5;
      g.moveTo(0,0);g.lineTo(seg1X,seg1Y);
      // 第2セグメント (折れ曲がって)
      const seg2Angle=bendAngle+(Math.random()-0.5)*1.5;
      const seg2X=seg1X+Math.cos(seg2Angle)*len*0.5;
      const seg2Y=seg1Y-Math.sin(seg2Angle)*len*0.5;
      g.lineTo(seg2X,seg2Y);
      // 端点に小さい丸
      g.lineStyle(0);
      g.beginFill(col2,0.9);g.drawCircle(0,0,2);g.endFill();
      g.beginFill(col,0.8);g.drawCircle(seg2X,seg2Y,1.5);g.endFill();
      g.x=px;g.y=py;
      this.effectsLayer.addChild(g);
      // 初速: ランダム方向、重力で下に落ちる
      const vx=(Math.random()-0.5)*4+((side===2)?-1:(side===3)?1:0);
      const vy=(Math.random()-0.5)*2+((side===0)?-2:0.5); // 上辺からは上方向に
      const rot=(Math.random()-0.5)*0.18;
      this._lightningBolts.push({
        gfx:g,vx,vy,life:1,decay:0.016+Math.random()*0.01,
        rot,isChunk:true
      });
    }
  }

  // 稲妻ボルトを1本生成: 枠の辺上の点から分岐しながら広がる
  _spawnLightningBolt(startX,startY,dirAngle,color,intensity,branches){
    if(settings.particles==='off')return;
    const maxLen=CELL*(2.5+Math.random()*3)*intensity;
    const numSegs=5+Math.floor(Math.random()*5);
    // 再帰的にジグザグ線を生成してGraphicsに描画
    const drawBolt=(g,x,y,angle,len,depth)=>{
      if(depth<=0||len<4)return;
      const segLen=len/numSegs;
      let cx=x,cy=y;
      for(let i=0;i<numSegs;i++){
        const jitter=(Math.random()-0.5)*len*0.7;
        const nx=cx+Math.cos(angle)*segLen+(Math.random()-0.5)*jitter*0.5;
        const ny=cy+Math.sin(angle)*segLen+jitter;
        g.lineTo(nx,ny);
        // 分岐
        if(depth>1&&Math.random()<0.4){
          const branchAngle=angle+(Math.random()-0.5)*1.4;
          const bg2=new PIXI.Graphics();
          bg2.lineStyle(Math.max(0.5,(g._lineStyle?.width||1)*0.55),color,0.7);
          bg2.moveTo(cx,cy);
          drawBolt(bg2,cx,cy,branchAngle,len*0.45,depth-1);
          bg2.x=0;bg2.y=0;
          this.effectsLayer.addChild(bg2);
          this._lightningBolts.push({gfx:bg2,vx:0,vy:0,life:1,decay:0.04+Math.random()*0.03,rot:0,isChunk:false,isBolt:true});
        }
        cx=nx;cy=ny;
      }
    };
    const sc2=this._uiScale||1;
    const lw=1.2+intensity*1.2;
    const g=new PIXI.Graphics();
    g.lineStyle(lw,color,0.95);
    g.moveTo(startX,startY);
    drawBolt(g,startX,startY,dirAngle,maxLen,branches);
    // グロー (白い細線を重ねる)
    const glow=new PIXI.Graphics();
    glow.lineStyle(lw*0.4,0xffffff,0.5);
    glow.moveTo(startX,startY);
    drawBolt(glow,startX,startY,dirAngle,maxLen*0.9,branches-1);
    this.effectsLayer.addChild(g);
    this.effectsLayer.addChild(glow);
    this._lightningBolts.push({gfx:g,vx:0,vy:0,life:1,decay:0.055+Math.random()*0.03,rot:0,isChunk:false,isBolt:true});
    this._lightningBolts.push({gfx:glow,vx:0,vy:0,life:0.7,decay:0.08,rot:0,isChunk:false,isBolt:true});
  }

  // B2B 雷エフェクト: 枠の周囲をジグザグの雷が走る + 稲妻ボルトを発射
  _triggerLightning(b2bCount){
    if(settings.quality==='low'||settings.quality==='minimum')return;
    if(b2bCount<1)return; // B2B1以上から発動（以前は3から）
    this._lightningTimer=Math.min(120,30+b2bCount*12);
    this._b2bIntensity=Math.min(1.2,0.3+b2bCount*0.12);
    // 稲妻ボルトを枠の各辺からスポーン
    const sc2=this._uiScale||1;
    const bx=this.mainBX,by=this.mainBY;
    const bw=BOARD_W*sc2,bh=BOARD_H*sc2;
    const color=b2bCount>=8?0x0088ff:b2bCount>=5?0x00ccff:b2bCount>=3?0x00ff88:0xffbe0b;
    const intensity=Math.min(1.8,0.5+b2bCount*0.15);
    const numBolts=b2bCount>=8?8:b2bCount>=5?6:b2bCount>=3?4:2;
    const branches=b2bCount>=8?4:b2bCount>=5?3:2;
    for(let i=0;i<numBolts;i++){
      const side=Math.floor(Math.random()*4);
      let sx,sy,angle;
      if(side===0){sx=bx+Math.random()*bw;sy=by;angle=-Math.PI/2+(Math.random()-0.5)*0.8;}
      else if(side===1){sx=bx+Math.random()*bw;sy=by+bh;angle=Math.PI/2+(Math.random()-0.5)*0.8;}
      else if(side===2){sx=bx;sy=by+Math.random()*bh;angle=Math.PI+(Math.random()-0.5)*0.8;}
      else{sx=bx+bw;sy=by+Math.random()*bh;angle=0+(Math.random()-0.5)*0.8;}
      this._spawnLightningBolt(sx,sy,angle,color,intensity,branches);
    }
    // B2B5以上: 追加で対角線ボルト
    if(b2bCount>=5){
      const corners=[[bx,by,Math.PI*1.25],[bx+bw,by,Math.PI*1.75],[bx,by+bh,Math.PI*0.75],[bx+bw,by+bh,Math.PI*0.25]];
      const n=b2bCount>=8?4:2;
      for(let i=0;i<n;i++){
        const [cx,cy,ca]=corners[i%4];
        this._spawnLightningBolt(cx,cy,ca+(Math.random()-0.5)*0.5,color,intensity*0.8,branches-1);
      }
    }
  }

  _drawLightning(dt){
    if(!this.lightningGfx)return;
    if(this._lightningTimer>0){
      this._lightningTimer-=dt;
      const g=this.lightningGfx;g.clear();
      const intensity=this._b2bIntensity||0.7;
      const b2b=this._b2bCount||1;
      // B2B3以上=緑, B2B8以上=青, breakFlash=白
      const lCol=this._lightningBreakFlash?0xffffff:b2b>=8?0x0088ff:b2b>=5?0x44ddff:b2b>=3?0x00ff88:0xffbe0b;
      g.alpha=intensity*(0.6+0.4*Math.random());
      // 枠の外側ワールド座標で描画
      const sc=this._uiScale||1;
      const ox=this.mainBX-2,oy=this.mainBY;
      const bw=BOARD_W*sc+4,bh=BOARD_H*sc+4;
      const segs=6+Math.floor(b2b*1.5);
      // B2Bが高いほど振れ幅大きく
      const amp=Math.min(3+b2b*1.5, 20);
      const lw=1.5+Math.min(b2b*0.5,4);
      // 外側枠ライン (枠border外3px)
      const pad=3+Math.min(b2b*0.5,6);
      g.lineStyle(lw,lCol,0.9);
      this._drawZigzag(g,ox-pad,oy-pad,ox+bw+pad,oy-pad,segs,amp,'h');
      this._drawZigzag(g,ox-pad,oy+bh+pad,ox+bw+pad,oy+bh+pad,segs,amp,'h');
      this._drawZigzag(g,ox-pad,oy-pad,ox-pad,oy+bh+pad,segs,amp,'v');
      this._drawZigzag(g,ox+bw+pad,oy-pad,ox+bw+pad,oy+bh+pad,segs,amp,'v');
      // B2B3以上: 内側にも薄い追加ライン
      if(b2b>=3){
        g.lineStyle(lw*0.6,lCol,0.4*Math.random());
        this._drawZigzag(g,ox,oy,ox+bw,oy,segs,amp*0.5,'h');
        this._drawZigzag(g,ox,oy+bh,ox+bw,oy+bh,segs,amp*0.5,'h');
        this._drawZigzag(g,ox,oy,ox,oy+bh,segs,amp*0.5,'v');
        this._drawZigzag(g,ox+bw,oy,ox+bw,oy+bh,segs,amp*0.5,'v');
      }
      // B2B5以上: コーナーグロー
      if(b2b>=5){
        const glowCol=b2b>=8?0x88eeff:0x44ffcc;
        g.lineStyle(lw*1.2,glowCol,0.55*Math.random());
        const cr=16+b2b*2;
        // 4コーナーにアーク
        for(const [cx,cy,sa] of [[ox-pad,oy-pad,-Math.PI/2],[ox+bw+pad,oy-pad,0],[ox+bw+pad,oy+bh+pad,Math.PI/2],[ox-pad,oy+bh+pad,Math.PI]]){
          g.arc(cx,cy,cr,sa,sa+Math.PI/2);
        }
      }
      // B2B8以上: 追加の外側ラインと放電エフェクト
      if(b2b>=8){
        g.lineStyle(lw*0.8,0x44bbff,0.45*Math.random());
        const pad2=pad+8;
        this._drawZigzag(g,ox-pad2,oy-pad2,ox+bw+pad2,oy-pad2,segs+4,amp*1.4,'h');
        this._drawZigzag(g,ox-pad2,oy+bh+pad2,ox+bw+pad2,oy+bh+pad2,segs+4,amp*1.4,'h');
        this._drawZigzag(g,ox-pad2,oy-pad2,ox-pad2,oy+bh+pad2,segs+4,amp*1.4,'v');
        this._drawZigzag(g,ox+bw+pad2,oy-pad2,ox+bw+pad2,oy+bh+pad2,segs+4,amp*1.4,'v');
      }
    } else {
      if(this.lightningGfx.alpha>0){
        this.lightningGfx.alpha*=0.75;
        if(this.lightningGfx.alpha<0.03)this.lightningGfx.clear();
      }
    }
  }

  _drawZigzag(g,x1,y1,x2,y2,segs,amp,dir){
    g.moveTo(x1,y1);
    for(let i=1;i<=segs;i++){
      const t=i/segs;
      const offset=(Math.random()-0.5)*2*amp;
      const px=x1+(x2-x1)*t + (dir==='h'?0:offset);
      const py=y1+(y2-y1)*t + (dir==='v'?0:offset);
      g.lineTo(px,py);
    }
    g.lineTo(x2,y2);
  }

  // おじゃまグループ追加時のシェイク（行数に応じた振動）
  onGarbageRowAdded(count=1){
    if(settings.shake==='on'){
      const power=Math.min(12,4.5+count*2.25); // 1.5倍強度
      this.shakePower=Math.max(this.shakePower,power);
      clearTimeout(this._garbageShakePulse);
      this._garbageShakePulse=setTimeout(()=>{
        this.shakePower=Math.max(this.shakePower,power*0.7);
      },40); // 1.5倍速（60ms→40ms）
    }
    // ガベージフラッシュ: 枠を赤く再描画
    if(this.boardBorder){
      this.boardBorder.clear();
      this.boardBorder.lineStyle(3,0xff3333,1.0);
      this.boardBorder.drawRect(-2,0,BOARD_W+4,BOARD_H+4);
    }
    this._garbageFlashing=true;
    this._borderNormal=false;
    setTimeout(()=>{if(this.boardBorder){
      this._garbageFlashing=false;
      this._borderNormal=false; // force redraw next frame
    }},133);
  }

  onGarbageIncoming(lines,fromId){
    const d=this.opBoardData[fromId];if(!d)return;
    const sx=d.origX+(getGameCols()*d.cell)/2,sy=d.origY+(d.boardH||ROWS*d.cell)/2;
    const tx=this.mainBX-8,ty=this.mainBY+BOARD_H*0.5;
    const isBig=lines>=4;
    const color=isBig?0x00f5ff:0xff3333;
    const visualPower=isBig?lines+4:lines;
    this.spawnProjectile(sx,sy,tx,ty,color,visualPower);
  }

  onAttackProjectile(targetId,attack,launchY){
    const d=this.opBoardData[targetId];if(!d)return;
    const sx=this.mainBX+BOARD_W/2;
    const sy=launchY!==undefined?launchY:this.mainBY+BOARD_H*0.5;
    // ターゲット: 相手ボードのゲージメーター位置（ボード左端）
    const tx=d.origX-12;
    const ty=d.origY+d.boardH*0.5;
    this.spawnProjectile(sx,sy,tx,ty,0x00f5ff,attack);
    SFX.attack();
  }

  onGarbageApplied(lines){
    // シェイクはonGarbageRowAddedで行う
  }

  // 4ライン以上送った時、相手の盤面近くに赤い数字を表示
  showOpponentAttackNumber(pid, attack){
    const d=this.opBoardData[pid];
    if(!d||d.dead)return;
    const sc=this._uiScale||1;
    const sz=Math.min(20+attack*3,52);
    const col=attack>=6?0xff0044:0xff3333;
    const st=new PIXI.TextStyle({
      fontFamily:"'Arial Black','Impact',sans-serif",fontSize:sz,
      fill:col,stroke:0x000000,strokeThickness:3,fontWeight:'900',
      dropShadow:true,dropShadowColor:0x000000,dropShadowBlur:8
    });
    const txt=new PIXI.Text(`+${attack}`,st);
    txt.anchor.set(0.5,0.5);
    txt.x=d.origX+d.boardW/2;
    txt.y=d.origY-10;
    txt.alpha=0;txt.scale.set(1.8);
    this.effectsLayer.addChild(txt);
    if(!this._customLabels)this._customLabels=[];
    const anim={txt,targetX:txt.x,targetY:txt.y-40,alive:true,popT:0,fadeDelay:1200,fadeT:0,fading:false};
    this._customLabels.push(anim);
    const update=()=>{
      if(!anim.alive)return;
      if(anim.popT<1){
        anim.popT=Math.min(1,(anim.popT||0)+0.06);
        const e=1-(1-anim.popT)*(1-anim.popT);
        anim.txt.scale.set(1.8-0.8*e);anim.txt.alpha=e;
        if(anim.popT>=1){anim.txt.scale.set(1);anim.txt.alpha=1;anim.fadeDelay=performance.now()+1200;}
        requestAnimationFrame(update);
        return;
      }
      if(!anim.fading&&performance.now()<anim.fadeDelay){requestAnimationFrame(update);return;}
      if(!anim.fading){anim.fading=true;anim.fadeT=0;}
      anim.fadeT+=0.03;
      anim.txt.y=anim.targetY-(anim.fadeT*20);
      anim.txt.alpha=Math.max(0,1-anim.fadeT);
      if(anim.txt.alpha<=0){anim.alive=false;try{anim.txt.destroy();}catch(e){}this._customLabels=this._customLabels.filter(l=>l!==anim);return;}
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  // B2B break: 枠からスパークルが上に上がりながらフェードアウト
  onB2BBreak(b2bCount){
    this.showAttackBadge(b2bCount,'b2b_break');
    if(settings.quality==='low'||settings.quality==='minimum')return;
    const sc=this._uiScale||1;
    const bx=this.mainBX,by=this.mainBY;
    const bw=BOARD_W*sc,bh=BOARD_H*sc;
    const count=Math.min(12+b2bCount*4,40);
    const colors=[0xffbe0b,0xff8c00,0xffffff,0xffdd44];
    for(let i=0;i<count;i++){
      const g=new PIXI.Graphics();
      const side=Math.floor(Math.random()*4);
      let sx,sy,vx,vy;
      if(side===0){sx=bx+Math.random()*bw;sy=by;vx=(Math.random()-0.5)*2;vy=-(1+Math.random()*3);}
      else if(side===1){sx=bx+Math.random()*bw;sy=by+bh;vx=(Math.random()-0.5)*2;vy=-(2+Math.random()*4);}
      else if(side===2){sx=bx;sy=by+Math.random()*bh;vx=Math.random()*2;vy=-(1+Math.random()*3);}
      else{sx=bx+bw;sy=by+Math.random()*bh;vx=-Math.random()*2;vy=-(1+Math.random()*3);}
      const color=colors[Math.floor(Math.random()*colors.length)];
      const size=1.5+Math.random()*3;
      g.beginFill(color,1);
      if(Math.random()>0.5){
        g.drawCircle(0,0,size);
      } else {
        g.drawRect(-size/2,-size/2,size,size);
      }
      g.endFill();
      g.x=sx;g.y=sy;
      this.effectsLayer.addChild(g);
      const life=0.6+Math.random()*0.8;
      this.particles.push({gfx:g,vx:vx+(Math.random()-0.5)*1.5,vy:vy-1,life:life,decay:0.025+Math.random()*0.025,rot:(Math.random()-0.5)*0.12});
    }
  }

  // ── 攻撃バッジ（枠上の数字表示） ──────────────────────────────
  // attack>=4, B2B break, REN 時に盤面近くに大きな数字
  // 背景無し、3D押し出しテキスト、次の手まで持続
  showAttackBadge(value, type){
    this._badgeValue=value;
    this._badgeDisplayValue=0;
    this._badgeCountUpSpeed=Math.max(0.02,value/120);
    this._badgeType=type;
    this._badgePosIdx=(this._badgePosIdx||0)+1;
    this._badgeFlashCount=0;
    this._badgeActive=true;
    this._badgeFading=false;
    // 位置は毎回更新（4隅巡回）
    const sc=this._uiScale||1;
    const bx=this.mainBX,by=this.mainBY;
    const bw=BOARD_W*sc,bh=BOARD_H*sc;
    const pos=[
      {x:bx+bw/2,y:by-8},
      {x:bx+6,y:by+bh/2-8},
      {x:bx+bw-6,y:by+bh/2-8},
      {x:bx+bw/2,y:by+bh-8},
    ];
    const p=pos[this._badgePosIdx%4];
    if(this._badgeCont){
      this._badgeCont.x=p.x;this._badgeCont.y=p.y;
      this._updateBadgeText(value);
      return;
    }
    const cont=new PIXI.Container();
    this.effectsLayer.addChild(cont);
    this._badgeCont=cont;
    cont.x=p.x;cont.y=p.y;
    // 前面テキストのみ（塗りつぶし+黒枠線、分身なし）
    this._badgeLayers=[];
    const fontSize=Math.min(36+Math.floor(value*1.2),80);
    const fontFamily="'Arial Black','Impact',sans-serif";
    const faceSt=new PIXI.TextStyle({
      fontFamily,fontSize,fill:0xdddddd,stroke:0x000000,strokeThickness:2.5,fontWeight:'900',letterSpacing:0
    });
    const face=new PIXI.Text(`+${value}`,faceSt);
    face.anchor.set(0.5,0.5);
    cont.addChild(face);
    this._badgeLayers.push(face);
    this._badgeNumTxt=face;
    cont.alpha=0;cont.scale.set(1.4);
    this._badgePopT=0;
    this._badgeFlashTimer=0;
  }

  _updateBadgeText(value){
    const txt=`+${value}`;
    for(const t of this._badgeLayers){
      if(t&&!t.destroyed)t.text=txt;
    }
    this._badgeValue=value;
  }

  // 次のロックでバッジを終了（onLineClear冒頭で呼ぶ）
  _endBadge(){
    this._badgeActive=false;
  }

  // バッジ更新（updateParticlesEtcから呼ばれる）
  _updateBadge(dt){
    const c=this._badgeCont;
    if(!c)return;
    if(!c.visible&&!this._badgeActive)return;
    // ポップイン
    if(!c.visible){
      c.visible=true;
      this._badgePopT=0;
      c.alpha=0;c.scale.set(1.4);
    }
    if(this._badgePopT!==undefined&&this._badgePopT<1){
      this._badgePopT=Math.min(1,(this._badgePopT||0)+dt/160);
      const e=1-(1-this._badgePopT)*(1-this._badgePopT);
      c.scale.set(1.4-0.4*e);c.alpha=e;
      if(this._badgePopT>=1){c.scale.set(1);c.alpha=1;this._badgePopT=1;}
    }
    // Counting animation: display value counts up
    if(this._badgeActive&&this._badgePopT>=1&&this._badgeDisplayValue<this._badgeValue){
      this._badgeDisplayValue=Math.min(this._badgeValue,this._badgeDisplayValue+Math.ceil(this._badgeCountUpSpeed*dt));
      const txt=this._badgeNumTxt;
      if(txt&&!txt.destroyed){
        txt.text=`+${Math.round(this._badgeDisplayValue)}`;
        // Size grows with counting
        const sc=1+0.15*(this._badgeDisplayValue/this._badgeValue);
        c.scale.set(sc);
      }
      if(this._badgeDisplayValue>=this._badgeValue){
        this._badgeDisplayValue=this._badgeValue;
        if(txt&&!txt.destroyed)txt.text=`+${this._badgeValue}`;
        c.scale.set(1);
      }
    }
    // 初回フラッシュ: 一瞬で白点滅（フレームベース）
    if(this._badgeFlashCount<2){
      this._badgeFlashCount++;
      if(this._badgeLayers&&this._badgeLayers.length>=1){
        const t=this._badgeLayers[0];
        if(!t||t.destroyed){}else if(this._badgeFlashCount===1){
          t.style.fill=0xffffff;
        } else {
          t.style.fill=0xdddddd;
          t.style.stroke=0x000000;
        }
      }
    }
    // REN: ゆっくりフェードではなく一瞬でチカチカ
    if(this._badgeType==='ren'&&this._badgeNumTxt&&this._badgeFlashCount>=2){
      this._badgeNumTxt.alpha=Math.floor(performance.now()/400)%2?0.3:1;
    }
    // フェードアウト（次のロックで更新なし→消える）
    if(!this._badgeActive&&!this._badgeFading&&this._badgeFlashCount>=2){
      this._badgeFading=true;
      this._badgeFadeT=0;
    }
    if(this._badgeFading){
      this._badgeFadeT=(this._badgeFadeT||0)+dt;
      const a=Math.max(0,1-this._badgeFadeT/500);
      c.alpha=a;
      if(a<=0){
        try{c.destroy({children:true});}catch(e){}
        this._badgeCont=null;
        this._badgeLayers=null;
        this._badgeNumTxt=null;
      }
    }
  }

  // 自分のゲームオーバー: ミノ単位でバラバラに落下 + 枠も斜めに落下
  onGameOver(){
    SFX.gameover();
    // ── Phase 1: 横揺れ 300ms ──
    const wrap=this.boardWrap;
    const shakeStartTime=performance.now();
    const shakeDuration=300;
    const origWrapX=wrap.x;
    const shakeAmp=9;
    this._gameOverShaking=true;
    const doShake=()=>{
      if(!this._gameOverShaking)return;
      const elapsed=performance.now()-shakeStartTime;
      if(elapsed<shakeDuration){
        wrap.x=origWrapX+Math.sin(elapsed*0.08*Math.PI*2)*shakeAmp*(1-elapsed/shakeDuration*0.5);
        requestAnimationFrame(doShake);
      } else {
        wrap.x=origWrapX;
        this._gameOverShaking=false;
        this._startGameOverCollapse();
      }
    };
    requestAnimationFrame(doShake);
  }

  _startGameOverCollapse(){
    this._b2bCount=0;this.updateB2bBadge();
    const wrap=this.boardWrap;
    wrap.visible=false;
    // 枠を独立したContainerとして斜め落下させる
    const sc2=this._uiScale||1;
    const frameGfx=new PIXI.Graphics();
    frameGfx.lineStyle(3,0x00f5ff,0.9);
    frameGfx.drawRect(-2,0,BOARD_W*sc2+4,BOARD_H*sc2+4);
    frameGfx.x=this.mainBX;
    frameGfx.y=this.mainBY;
    this.effectsLayer.addChild(frameGfx);
    // ランダムに傾いて落下
    const frameVX=(Math.random()>0.5?1:-1)*(1.5+Math.random()*2);
    const frameVY=0;
    const frameRot=0;
    const frameRotSpeed=(Math.random()-0.5)*0.04;
    this._fallingFrame={gfx:frameGfx,vx:frameVX,vy:frameVY,vy0:0,rot:frameRotSpeed,alpha:1,pivotX:this.mainBX+BOARD_W*sc2/2,pivotY:this.mainBY+BOARD_H*sc2/2};

    const gs=this.gs;
    const originX=this.mainBX;
    const originY=this.mainBY;

    // Group connected cells of same type using flood-fill (BFS)
    // to approximate "mino pieces" without needing original placement data
    const board=gs.board;
    const visited=Array.from({length:ROWS+HIDDEN},()=>Array(getGameCols()).fill(false));
    const groups=[];

    for(let r=0;r<ROWS+HIDDEN;r++){
      for(let c=0;c<getGameCols();c++){
        const v=board[r][c];
        if(!v||v===0||visited[r][c])continue;
        // BFS to find connected cells of same type (max 4 cells = one piece)
        const cells=[];
        const queue=[[r,c]];
        visited[r][c]=true;
        while(queue.length&&cells.length<4){
          const[cr,cc]=queue.shift();
          cells.push([cr,cc]);
          for(const[dr,dc]of[[-1,0],[1,0],[0,-1],[0,1]]){
            const nr=cr+dr,nc=cc+dc;
            if(nr>=0&&nr<ROWS+HIDDEN&&nc>=0&&nc<getGameCols()&&
               !visited[nr][nc]&&board[nr][nc]===v){
              visited[nr][nc]=true;
              queue.push([nr,nc]);
            }
          }
        }
        groups.push({type:v,cells});
      }
    }

    // Build a PIXI container per group
    const minoParticles=[];
    for(const grp of groups){
      const color=PIECE_COLORS[grp.type]||0x445566;
      // Compute centroid in screen space
      let cx=0,cy=0;
      for(const[r,c]of grp.cells){
        cx+=originX+c*CELL+CELL/2;
        cy+=originY+(r-HIDDEN)*CELL+CELL/2;
      }
      cx/=grp.cells.length;
      cy/=grp.cells.length;
      if(cy<originY-CELL*3)continue; // skip groups completely above visible area

      const cont=new PIXI.Container();
      cont.x=cx;cont.y=cy;
      this.effectsLayer.addChild(cont);

      for(const[r,c]of grp.cells){
        const px=originX+c*CELL+CELL/2-cx;
        const py=originY+(r-HIDDEN)*CELL+CELL/2-cy;
        const g=new PIXI.Graphics();
        const s=CELL-2;
        g.beginFill(color,1);g.drawRect(-s/2,-s/2,s,s);g.endFill();
        g.beginFill(0xffffff,0.35);g.drawRect(-s/2,-s/2,s,3);g.drawRect(-s/2,-s/2,3,s);g.endFill();
        g.beginFill(0x000000,0.4);g.drawRect(-s/2,s/2-2,s,2);g.drawRect(s/2-2,-s/2,2,s);g.endFill();
        g.x=px;g.y=py;
        cont.addChild(g);
      }

      // Each mino gets a gentle random velocity (no big upward kick)
      const angle=Math.random()*Math.PI*2;
      const speed=Math.random()*1.8+0.4;
      const vx=Math.cos(angle)*speed;
      const vy=Math.sin(angle)*speed*0.5-0.8; // slight upward bias
      const rotSpeed=(Math.random()-0.5)*0.06;
      minoParticles.push({cont,vx,vy,rotSpeed,alpha:1});
    }

    let t=0;
    this._gameOverTick=(dt)=>{
      t+=dt;
      for(const p of minoParticles){
        if(p.alpha<=0)continue;
        p.vy+=0.12; // gentle gravity
        p.vx*=0.992;
        p.cont.x+=p.vx;
        p.cont.y+=p.vy;
        p.cont.rotation+=p.rotSpeed;
        // Fade out once well below the board
        const distBelow=p.cont.y-(originY+BOARD_H+60);
        if(distBelow>0){
          p.alpha=Math.max(0,1-distBelow/400);
          p.cont.alpha=p.alpha;
        }
      }
      // 枠の落下アニメ
      if(this._fallingFrame&&this._fallingFrame.alpha>0){
        const ff=this._fallingFrame;
        ff.vy0+=0.4;
        ff.gfx.x+=ff.vx;
        ff.gfx.y+=ff.vy0;
        ff.gfx.rotation+=ff.rot;
        // ピボット中心で回転するようにtransformOriginを調整
        const distB2=ff.gfx.y-(originY+BOARD_H+200);
        if(distB2>0){
          ff.alpha=Math.max(0,1-distB2/500);
          ff.gfx.alpha=ff.alpha;
        }
        if(ff.alpha<=0){try{ff.gfx.destroy();}catch(e){}this._fallingFrame=null;}
      }
    };
  }

  // 相手のゲームオーバー: 横揺れ→斜め落下
  opponentGameOver(pid){
    const d=this.opBoardData[pid];if(!d||d.dead)return;
    d.dead=true;
    if(d.smokeParticles){d.smokeParticles.forEach(p=>{try{p.gfx.destroy();}catch(e){}});d.smokeParticles=[];}
    if(d.smokeLayer){try{d.smokeLayer.destroy({children:true});}catch(e){}d.smokeLayer=null;}
    const is1v1=this._is1v1||this.opponentPlayers.length===1;
    if(!is1v1)this.updateVisibleOpponents();
    const oBW=d.boardW,oBH=d.boardH;
    const scX=d.cont.scale.x||1,scY=d.cont.scale.y||1;
    const origX=d.origX+(oBW*scX)/2,origY=d.origY+(oBH*scY)/2;
    d.cont.pivot.set(oBW/2,oBH/2);
    d.cont.x=origX;
    d.cont.y=origY;
    // 1v1: 枠の落下用別グラフィック
    let frameGfx=null;
    if(is1v1){
      frameGfx=new PIXI.Graphics();
      frameGfx.lineStyle(3,0x00f5ff,0.9);
      frameGfx.drawRect(-2,0,oBW*scX+4,oBH*scY+4);
      frameGfx.x=origX-oBW*scX/2;
      frameGfx.y=origY-oBH*scY/2;
      this.effectsLayer.addChild(frameGfx);
      this._fallingOppFrames=this._fallingOppFrames||[];
      this._fallingOppFrames.push(frameGfx);
    }
    let phase='shake',t=0;
    const shakeDur=600,shakeAmp=14;
    const fallVX=(Math.random()>0.5?1:-1)*2.5;
    let vx=fallVX,vy=0,curX=origX,curY=origY,frameVY=0;
    d.gameOverTick=(dt)=>{
      t+=dt/ANIM_SPEED;
      if(phase==='shake'){
        const prog=t/shakeDur,decay=1-prog;
        d.cont.x=origX+Math.sin(prog*Math.PI*8)*shakeAmp*decay;
        d.cont.y=origY+Math.sin(prog*Math.PI*10)*shakeAmp*0.3*decay;
        if(frameGfx){
          frameGfx.x=origX-oBW*scX/2+Math.sin(prog*Math.PI*8)*shakeAmp*decay;
          frameGfx.y=origY-oBH*scY/2+Math.sin(prog*Math.PI*10)*shakeAmp*0.3*decay;
        }
        if(t>=shakeDur){phase='fall';t=0;vx=fallVX;vy=0;curX=d.cont.x;curY=d.cont.y;}
      } else {
        vx*=0.995;vy+=0.6;curX+=vx;curY+=vy;
        d.cont.x=curX;d.cont.y=curY;
        d.cont.rotation+=0.02;
        d.cont.alpha=Math.max(0,1-(curY-origY)/500);
        if(frameGfx){
          frameVY+=0.4;
          frameGfx.x+=vx;
          frameGfx.y+=frameVY;
          frameGfx.rotation+=0.015;
          const dist=frameGfx.y-(origY+oBH*scY+100);
          if(dist>0)frameGfx.alpha=Math.max(0,1-dist/400);
          if(frameGfx.alpha<=0){try{frameGfx.destroy();}catch(e){}frameGfx=null;if(this._fallingOppFrames)this._fallingOppFrames=this._fallingOppFrames.filter(f=>f!==null&&f!==frameGfx);}
        }
        if(d.cont.alpha<=0&&is1v1){
          d.cont.visible=false;
          this.updateVisibleOpponents();
        }
      }
    };
    // ELIMINATED overlay (1v1は大きめ)
    const elimSz=is1v1?Math.round(22*this._uiScale):11;
    const elim=new PIXI.Text('ELIMINATED',new PIXI.TextStyle({fontFamily:'Orbitron',fontSize:elimSz,fill:0xff006e,fontWeight:'900',letterSpacing:2}));
    elim.anchor.set(0.5);
    elim.x=origX;elim.y=origY;
    elim.alpha=0;
    this.root.addChild(elim);
    let elimAlpha=0;
    const elimTick=()=>{
      elimAlpha=Math.min(1,elimAlpha+0.03);
      elim.alpha=elimAlpha;
      elim.y=origY-10*elimAlpha;
      if(elimAlpha<1)requestAnimationFrame(elimTick);
    };
    setTimeout(elimTick,300);
  }

  triggerOpponentSpin(pid,spinType){
    const d=this.opBoardData[pid];if(!d||d.dead)return;
    const isTSpin=spinType&&spinType.startsWith('T');
    if(!isTSpin&&!spinType)return;
    if(spinType==='LOCK'){
      d.shakeX=(Math.random()-0.5)*3;
    }else{
      d.tiltTarget=isTSpin?0.065:-0.065;
      // 自分のonSpinTiltと同じ跳ね返り
      d.bounceX=(Math.random()>0.5?1:-1)*3.5;
      d.bounceY=2.5;
      setTimeout(()=>{if(d)d.tiltTarget=0;},500);
    }
  }

  triggerOpponentLineClear(pid,count,spinType,isB2B,ren,allClear){
    const d=this.opBoardData[pid];if(!d||d.dead)return;
    if(settings.quality==='minimum')return;

    // フラッシュはテトリス(4ライン)のときのみ
    const isTDouble=spinType==='TSPIN'&&count===2;
    const isTTriple=spinType==='TSPIN'&&count===3;
    const flashColor=isTTriple?0xff00ff:isTDouble?0xcc44ff:allClear?0xffff00:0xffffff;
    if(d.flashGfx && count>=4){
      d.flashGfx.clear();
      const oCell=d.cell,oBW=d.boardW,oBH=d.boardH;
      d.flashGfx.beginFill(flashColor,0.7);d.flashGfx.drawRect(0,0,oBW,oBH);d.flashGfx.endFill();
      d.flashAlpha=0.7;
    }

    // シェイク（自分と同じ計算式）
    if(settings.shake==='on'){
      const power=Math.min(16,count*3+(spinType?5:0)+(allClear?12:0));
      d.shakeX=power;
    }

    // REN更新
    d.ren=ren||0;
    const renColors=[0x00f5ff,0x06d6a0,0xffbe0b,0xff8c00,0xff3366,0xff00ff,0xcc44ff,0xffffff,0x00f5ff];
    d.renColor=renColors[Math.min(Math.max(0,ren-2),renColors.length-1)];
    if(d.renTxt){
      d.renTxt.text=d.ren>=1?`REN ${d.ren}`:'';
      d.renTxt.style=new PIXI.TextStyle({fontFamily:'Share Tech Mono',fontSize:Math.round(12),fill:d.renColor});
    }

    // B2B雷
    if(isB2B&&settings.quality!=='low'){
      d.b2bCount=(d.b2bCount||0)+1;
      d.lightTimer=Math.min(80,40+d.b2bCount*8);
    }

    // テトリス/スピン: 傾き（自分と同じ値に）
    if(count>=4||allClear||(spinType&&spinType!=='MINI_TSPIN')){
      d.tiltTarget=(spinType&&spinType.startsWith('T'))?0.07:-0.055;
      setTimeout(()=>{if(d)d.tiltTarget=0;},292);
    }

    // ライン消去時の沈み込み（自分と同じ計算式）
    const renScale=Math.min((ren||0),10)/10;
    const prevSink=d.sinkOffset||0;
    if(count>=4||allClear){
      d.sinkOffset=Math.max(prevSink,24);
    } else if(count===1||count===2||count===3){
      if(spinType)d.sinkOffset=Math.max(prevSink,18+renScale*6);
      else d.sinkOffset=Math.max(prevSink,10+renScale*14);
    }

    // パーティクル: 相手ボードの中心から噴出
    if(settings.particles!=='off'&&settings.quality!=='low'){
      const oBW=d.boardW,oBH=d.boardH;
      const pcx=d.origX+oBW/2;
      const pcy=d.origY+oBH*0.4;
      const color=allClear?0xffff44:isTTriple?0xff00ff:isTDouble?0xcc44ff:spinType?0xff44ff:0x00f5ff;
      const n=settings.particles==='high'?Math.min(12+count*3,24):6;
      for(let i=0;i<n;i++){
        const g=new PIXI.Graphics();
        const sz=Math.random()*3+1;
        g.beginFill(color,0.9);g.drawCircle(0,0,sz);g.endFill();
        g.x=pcx+(Math.random()-0.5)*oBW*0.6;
        g.y=pcy+(Math.random()-0.5)*oBH*0.3;
        this.effectsLayer.addChild(g);
        const angle=Math.random()*Math.PI*2;
        const speed=2+Math.random()*4;
        this.particles.push({gfx:g,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-3,life:0.9,decay:0.04+Math.random()*0.03});
      }
      // REN2+: リングエフェクト
      if(ren>=2&&settings.quality!=='low'&&settings.quality!=='minimum'){
        const rc=d.renColor;
        const ring=new PIXI.Graphics();
        ring.lineStyle(1.5+ren*0.2,rc,0.85);ring.drawCircle(0,0,5);
        ring.x=pcx;ring.y=pcy;
        this.effectsLayer.addChild(ring);
        let rr=5,ra=0.85;
        const expandRing=()=>{
          rr+=5+ren*0.5;ra-=0.07;
          ring.clear();ring.lineStyle(1.5+ren*0.2,rc,Math.max(0,ra));ring.drawCircle(0,0,rr);
          if(ra>0)requestAnimationFrame(expandRing);else try{ring.destroy();}catch(e){}
        };
        requestAnimationFrame(expandRing);
      }
    }
    if(allClear){
      const sc=this._uiScale||1;
      const txt=new PIXI.Text('ALL CLEAR!',new PIXI.TextStyle({
        fontFamily:'Orbitron,sans-serif',fontSize:Math.floor(72*sc),fill:0xffff88,
        stroke:0x000000,strokeThickness:8,fontWeight:'900',
        dropShadow:true,dropShadowColor:0xffaa00,dropShadowBlur:20
      }));
      txt.anchor.set(0.5);
      txt.x=this.mainBX+BOARD_W*sc/2;
      txt.y=this.mainBY+BOARD_H*sc*0.28;
      txt.scale.set(0.3);
      const bg=new PIXI.Graphics();
      bg.beginFill(0x000000,0.6);
      bg.drawRoundedRect(-txt.width/2-20,-txt.height/2-12,txt.width+40,txt.height+24,12);
      bg.endFill();
      bg.scale.set(0.3);
      this.effectsLayer.addChild(bg);
      this.effectsLayer.addChild(txt);
      if(!this._allClearTexts)this._allClearTexts=[];
      this._allClearTexts.push({gfx:txt,timer:0,bg});
    }
  }
  updateBoardAnim(dt){
    if(this.boardOffsetY>0){this.boardOffsetY*=0.95;if(this.boardOffsetY<0.3)this.boardOffsetY=0;}
    // T-spin afterimage fade
    if(this._afterimageAlpha>0.01){
      if(this._afterimageLife!==undefined&&this._afterimageLife>0){
        this._afterimageLife-=dt;
        // Hold at full alpha for 300ms, then fade
        if(this._afterimageLife>0){
          this.afterimageGfx.alpha=this._afterimageAlpha;
        } else {
          this._afterimageAlpha*=0.78;
          this.afterimageGfx.alpha=Math.max(0,this._afterimageAlpha);
        }
      } else {
        this._afterimageAlpha*=0.78;
        this.afterimageGfx.alpha=Math.max(0,this._afterimageAlpha);
      }
      this._drawAfterimage();
      if(this._afterimageAlpha<=0.01){this._afterimageAlpha=0;this.afterimageGfx.clear();this.afterimageGfx.alpha=0;}
    }
    this.tiltAngle+=(this.tiltTarget-this.tiltAngle)*0.045;
    if(Math.abs(this.tiltAngle)<0.0005&&Math.abs(this.tiltTarget)<0.0005)this.tiltAngle=0;
    if(settings.tilt==='on')this.boardCont.rotation=this.tiltAngle;else this.boardCont.rotation=0;
    if(this.shakePower>0){
      this._shakeT=(this._shakeT||0)+0.9;
      this.boardOffsetX=Math.sin(this._shakeT*3.8)*this.shakePower;
      this.shakePower*=0.52;
      if(this.shakePower<0.15){this.shakePower=0;this.boardOffsetX=0;this._shakeT=0;}
    }
    this.wallBumpX*=0.55;
    if(Math.abs(this.wallBumpX)<0.2)this.wallBumpX=0;
    this.boardOffsetY*=0.95;if(this.boardOffsetY<0.3)this.boardOffsetY=0;
    // 壁押し込み: 右キーを押しながら壁に触れているときに枠が沈む
    if(this.gs&&this.gs.current){
      const isRightHeld=keyState['ArrowRight'];
      const isLeftHeld=keyState['ArrowLeft'];
      const atRightWall=!this.gs.isValid(this.gs.current,1,0);
      const atLeftWall=!this.gs.isValid(this.gs.current,-1,0);
      if(isRightHeld&&atRightWall){
        this._wallPressX=Math.min(this._wallPressX+dt*0.04,4);
      } else if(isLeftHeld&&atLeftWall){
        this._wallPressX=Math.max(this._wallPressX-dt*0.04,-4);
      } else {
        this._wallPressX*=0.85;
        if(Math.abs(this._wallPressX)<0.3)this._wallPressX=0;
      }
    } else {
      this._wallPressX*=0.85;
      if(Math.abs(this._wallPressX)<0.3)this._wallPressX=0;
    }
    // スピンバウンス更新
    if(this._spinBounceX!==undefined&&Math.abs(this._spinBounceX)>0.05){
      this._spinBounceTime=(this._spinBounceTime||0)+dt;
      const t=Math.min(this._spinBounceTime/220,1);
      this._spinBounceX*=0.85;
      if(t>=1){this._spinBounceX=0;this._spinBounceTime=0;}
    }

    if(this._gameOverTick){
      this._gameOverTick(dt);
    } else {
      const sc=this._uiScale||1;
      const spinBounce=this._spinBounceX||0;
      this.boardWrap.x=this.mainBX+BOARD_W*sc/2+this.boardOffsetX+this.wallBumpX+spinBounce+(this._wallPressX||0);
      const spinBounceY=this._spinBounceY||0;
      this.boardWrap.y=this.mainBY+BOARD_H*sc/2+this.boardOffsetY+spinBounceY;
    }
    for(const pid of Object.keys(this.opBoardData)){
      const d=this.opBoardData[pid];
      if(d.gameOverTick)d.gameOverTick(dt);
    }
    if(this._flashAlpha>0){this._flashAlpha-=0.06;this.flashGfx.alpha=Math.max(0,this._flashAlpha);}

    // B2Bバッジ パンチ＆グリッチアニメーション
    if(this.b2bBadgeCont&&this.b2bBadgeCont.visible){
      // パンチ: 数字がスケールアップ→戻る
      if(this._b2bPunching){
        this._b2bPunchTime=(this._b2bPunchTime||0)+dt;
        const t=Math.min(this._b2bPunchTime/120,1);
        // ease-out: 1→1.6→1
        const scale= t<0.4 ? 1+1.5*t : 1+1.5*(1-t)*0.67;
        this.b2bBadgeNum.scale.set(Math.max(1,scale));
        if(t>=1){this._b2bPunching=false;this.b2bBadgeNum.scale.set(1);}
      }
      // グリッチ (パンチ時)
      if(this._b2bGlitchTime>0){
        this._b2bGlitchTime-=dt;
        const intensity=Math.min(1,this._b2bGlitchTime/180);
        const jx=(Math.random()-0.5)*4*intensity;
        this.b2bBadgeNum.x=28+jx;
        if(Math.random()<0.4) this._drawB2bBadgeBg(this._b2bBadgeColor||0xffbe0b,intensity);
        if(this._b2bGlitchTime<=0){
          this.b2bBadgeNum.x=28;
          this._drawB2bBadgeBg(this._b2bBadgeColor||0xffbe0b,0);
        }
      }
      // 常時グリッチノイズ (B2Bが高いほど強く)
      if(this._b2bGlitchTex&&this._b2bNoiseTimer!==undefined){
        this._b2bNoiseTimer+=dt;
        const noiseInterval=Math.max(30,120-this._b2bCount*10);
        if(this._b2bNoiseTimer>=noiseInterval){
          this._b2bNoiseTimer=0;
          this._updateB2bGlitchNoise(this._b2bCount||0);
        }
      }
    } else if(this._b2bGlitchSpr){
      this._b2bGlitchSpr.alpha=0;
    }
    // B2B 雷エフェクト更新
    this._drawLightning(dt);

    // 塊チャンク（_lightningBolts にまとめて格納）
    this._lightningBolts=this._lightningBolts.filter(p=>{
      if(p.isBolt){p.life-=p.decay;p.gfx.alpha=Math.max(0,p.life);if(p.life<=0){try{p.gfx.destroy();}catch(e){}return false;}return true;}
      if(!p.isChunk)return false;
      p.life-=p.decay;p.gfx.alpha=p.life;
      p.gfx.x+=p.vx;p.gfx.y+=p.vy;p.vy+=0.35;p.gfx.rotation+=p.rot;
      if(p.life<=0){try{p.gfx.destroy();}catch(e){}return false;}
      return true;
    });

    // 危機煙エフェクト
    this._updateSmoke(dt);
  }

  // 危機状態の煙エフェクト（リアル煙）
  _updateSmoke(dt){
    if(!this.gs||settings.particles==='off'||settings.quality==='minimum')return;

    // 積み上がりの最高行を計算（board配列上のインデックス）
    let topRow=ROWS+HIDDEN; // 何も積まれていない = 最大値
    for(let r=0;r<ROWS+HIDDEN;r++){
      for(let c=0;c<getGameCols();c++){
        if(this.gs.board[r][c]){topRow=r;break;}
      }
      if(topRow<ROWS+HIDDEN)break;
    }

    // 上から6行目（visible top = HIDDEN行目）まで積まれたら危機
    const dangerStart=HIDDEN+6;
    const danger=Math.max(0,Math.min(1,(dangerStart-topRow)/4)); // 0~1

    // 枠の色を danger に応じてシアン→赤に変化
    if(this.boardBorder&&!this._garbageFlashing){
      if(danger>0){
        const pulse=0.6+0.4*Math.abs(Math.sin(performance.now()*0.004));
        const r2=Math.min(255,Math.floor(0xff*danger));
        const g2=Math.min(255,Math.floor(0xf5*(1-danger)));
        const b2=Math.min(255,Math.floor(0xff*(1-danger*0.8)));
        const borderCol=(r2<<16)|(g2<<8)|b2;
        this.boardBorder.clear();
        this.boardBorder.lineStyle(2+danger*2,borderCol,0.6+0.4*pulse);
        this.boardBorder.drawRect(-2,0,BOARD_W+4,BOARD_H+4);
        this.boardBorder.alpha=1;
      } else {
        if(!this._borderNormal){
          this._borderNormal=true;
          this.boardBorder.clear();
          this.boardBorder.lineStyle(2,0x00f5ff,0.8);
          this.boardBorder.drawRect(-2,0,BOARD_W+4,BOARD_H+4);
        }
        this.boardBorder.alpha=1;
      }
    }
    if(danger>0)this._borderNormal=false;

    // ── 危険時: 次スポーンのミノが埋まるマスに赤いバツ ─────────────
    this._drawSpawnDangerX(danger);

    if(danger<=0){
      // 煙パーティクルをフェードアウト
      this._smokeParticles=this._smokeParticles.filter(p=>{
        p.life-=0.025;
        p.gfx.alpha=Math.max(0,p.life*p.maxAlpha);
        p.gfx.x+=p.vx;p.gfx.y+=p.vy;
        p.vx+=(Math.random()-0.5)*0.04; // 乱流
        p.gfx.scale.x*=p.expandX;p.gfx.scale.y*=p.expandY;
        p.gfx.rotation+=p.rot;
        if(p.life<=0){try{p.gfx.destroy();}catch(e){}return false;}return true;
      });
      return;
    }

    // 煙の生成: 危機度に応じて増加
    this._smokeTick=(this._smokeTick||0)+dt;
    const rate=Math.max(200,600-danger*400);
    if(this._smokeTick>=rate){
      this._smokeTick=0;
      const sc2=this._uiScale||1;
      const bx=this.mainBX, by=this.mainBY, bw=BOARD_W*sc2, bh2=BOARD_H*sc2;
      const corners=[
        {x:bx,      y:by,     dx:-0.6, dy:-0.6},
        {x:bx+bw,   y:by,     dx:0.6,  dy:-0.6},
        {x:bx,      y:by+bh2, dx:-0.6, dy:0.6},
        {x:bx+bw,   y:by+bh2, dx:0.6,  dy:0.6},
      ];
      for(let j=0;j<2;j++){
        const corner=corners[Math.floor(Math.random()*4)];
        this._spawnNoiseSmokePuff(corner.x,corner.y,corner.dx,corner.dy,danger,this.smokeLayer,this._smokeParticles);
      }
    }

    // 1秒ごとに枠のランダムな場所から火花をランダム方向へ
    this._sparkTick=(this._sparkTick||0)+dt;
    if(this._sparkTick>=1000){
      this._sparkTick=0;
      const sc2=this._uiScale||1;
      const bx=this.mainBX, by=this.mainBY, bw=BOARD_W*sc2, bh2=BOARD_H*sc2;
      for(let i=0;i<8;i++){
        // 枠の4辺のいずれかを選択
        const edge=Math.floor(Math.random()*4);
        let x,y;
        if(edge===0){x=bx+Math.random()*bw; y=by;}                               // 上辺
        else if(edge===1){x=bx+Math.random()*bw; y=by+bh2;}                      // 下辺
        else if(edge===2){x=bx; y=by+Math.random()*bh2;}                         // 左辺
        else {x=bx+bw; y=by+Math.random()*bh2;}                                  // 右辺
        const angle=Math.random()*Math.PI*2;
        const speed=0.5+Math.random()*1.5;
        const g=new PIXI.Graphics();
        g.lineStyle(1,0xffaa00,0.9);
        g.moveTo(0,0);
        g.lineTo(-12,0);
        g.beginFill(0xffdd44,1);
        g.drawRect(-1.5,-1.5,3,3);
        g.endFill();
        g.x=x; g.y=y;
        this.effectsLayer.addChild(g);
        this.particles.push({
          gfx:g,
          vx:Math.cos(angle)*speed,
          vy:Math.sin(angle)*speed,
          life:0.7+Math.random()*0.4,
          decay:0.03+Math.random()*0.02,
          _trackRot:Math.PI,
        });
      }
    }
    // 既存煙を更新
    this._smokeParticles=this._smokeParticles.filter(p=>{
      p.life-=p.decay;
      // フェーズ別アルファ: 立ち上がり→最大→フェードアウト
      const lifeRatio=p.life/p.maxLife;
      let alpha;
      if(lifeRatio>0.8){alpha=p.maxAlpha*(1-lifeRatio)*5;}
      else if(lifeRatio>0.3){alpha=p.maxAlpha;}
      else{alpha=p.maxAlpha*(lifeRatio/0.3);}
      p.gfx.alpha=Math.max(0,alpha);
      // ノイズベースの乱流（sin波を複数重ねてPerlin風に近似）
      if(p.noisePhase!==undefined){
        p.noisePhase+=p.noiseFreq;
        const turbX=Math.sin(p.noisePhase)*p.noiseAmp + Math.sin(p.noisePhase*2.3+1.2)*p.noiseAmp*0.5;
        p.vx+=turbX;
      } else {
        p.vx+=(Math.random()-0.5)*0.06;
      }
      p.vx*=0.97;
      p.gfx.x+=p.vx;p.gfx.y+=p.vy;
      // 上昇は徐々に遅くなる
      p.vy*=0.988;
      // 拡大（膨張）
      p.gfx.scale.x*=p.expandX;p.gfx.scale.y*=p.expandY;
      p.gfx.rotation+=p.rot;
      if(p.life<=0){try{p.gfx.destroy();}catch(e){}return false;}return true;
    });
  }

  // リアルな煙パフを1つスポーン
  _spawnRealisticSmokePuff(sx, sy, dx, dy, danger, layer, list){
    this._spawnNoiseSmokePuff(sx, sy, dx||0, dy||0, danger, layer, list);
  }

  // ノイズベースの煙パフ（辺から外向きに噴き出す）
  _spawnNoiseSmokePuff(sx, sy, dx, dy, danger, layer, list){
    // 1パフ = 2レイヤー（軽量）
    const numLayers = settings.particles==='high' ? 2 : 1;
    const blowAngle = Math.atan2(dy, dx) + (Math.random()-0.5)*0.5;
    const blowStrength = 0.8+Math.random()*1.2+danger*0.8;
    const maxLife = 0.7+Math.random()*0.5;

    for(let L=0;L<numLayers;L++){
      const g=new PIXI.Graphics();
      const baseR=(5+Math.random()*7)*(0.5+danger*0.6); // 小さく

      let col, alpha;
      const t=Math.random();
      if(danger>0.75){
        col=t<0.5?0xcc3300:(t<0.8?0xff6600:0xff9900);
        alpha=0.4+danger*0.2;
      } else if(danger>0.45){
        col=t<0.5?0x666666:(t<0.8?0x999999:0xdd6600);
        alpha=0.3+danger*0.15;
      } else {
        col=t<0.5?0x999999:(t<0.8?0xbbbbbb:0xdddddd);
        alpha=0.22+danger*0.1;
      }

      // 2〜3個の楕円ブロブでもこもこ感
      const numBlobs=2+Math.floor(Math.random()*2);
      for(let b=0;b<numBlobs;b++){
        g.beginFill(col, alpha*(0.5+Math.random()*0.5));
        const ox=(Math.random()-0.5)*baseR*1.2;
        const oy=(Math.random()-0.5)*baseR*0.8;
        const rx=baseR*(0.4+Math.random()*0.7);
        const ry=rx*(0.4+Math.random()*0.5);
        g.drawEllipse(ox,oy,rx,ry);
        g.endFill();
      }
      // 薄い芯
      g.beginFill(0xffffff, alpha*0.15);
      g.drawEllipse(0,0,baseR*0.3,baseR*0.2);
      g.endFill();

      g.x=sx+(Math.random()-0.5)*6;
      g.y=sy+(Math.random()-0.5)*6;
      g.alpha=0;
      g.rotation=Math.random()*Math.PI*2;
      layer.addChild(g);

      list.push({
        gfx:g,
        vx:Math.cos(blowAngle)*blowStrength+(Math.random()-0.5)*0.4,
        vy:Math.sin(blowAngle)*blowStrength-(0.3+Math.random()*0.5),
        noisePhase:Math.random()*Math.PI*2,
        noiseFreq:0.05+Math.random()*0.03,
        noiseAmp:0.06+Math.random()*0.04,
        life:maxLife,
        maxLife,
        decay:0.010+Math.random()*0.008,
        maxAlpha:alpha,
        expandX:1.010+Math.random()*0.008,
        expandY:1.008+Math.random()*0.006,
        rot:(Math.random()-0.5)*0.016,
      });
    }
  }

  spawnParticle(x,y,color,downward=false,burst=false){
    const g=new PIXI.Graphics();
    const sz=burst?(Math.random()*3+1.5):(Math.random()*5+2);
    g.beginFill(color,1);
    if(burst)g.drawCircle(0,0,sz);else g.drawRect(-sz/2,-sz/2,sz,sz);
    g.endFill();
    g.x=x+(Math.random()-0.5)*CELL;g.y=y+(Math.random()-0.5)*CELL;
    this.effectsLayer.addChild(g);
    const a=downward?(Math.PI*0.8+Math.random()*Math.PI*0.4):(Math.random()*Math.PI*2);
    const sp=burst?(Math.random()*10+3):(Math.random()*8+2);
    this.particles.push({gfx:g,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-(downward?0:3),life:1,decay:0.022+Math.random()*0.028});
  }

  spawnProjectile(sx,sy,tx,ty,color,power){
    const cont=new PIXI.Container();cont.x=sx;cont.y=sy;this.projLayer.addChild(cont);
    const r=7+Math.min(power*1.4,20); // larger base size

    // 外側の鋭いリング（攻撃的）
    const spike=new PIXI.Graphics();
    const spikes=6;
    for(let i=0;i<spikes;i++){
      const a=i/spikes*Math.PI*2;
      const a2=(i+0.5)/spikes*Math.PI*2;
      spike.beginFill(color,0.8);
      spike.moveTo(Math.cos(a)*r*0.6,Math.sin(a)*r*0.6);
      spike.lineTo(Math.cos(a2)*r*2.2,Math.sin(a2)*r*2.2);
      spike.lineTo(Math.cos(a+Math.PI*2/spikes)*r*0.6,Math.sin(a+Math.PI*2/spikes)*r*0.6);
      spike.endFill();
    }
    cont.addChild(spike);

    // コア
    const core=new PIXI.Graphics();
    core.beginFill(0xffffff,1);core.drawCircle(0,0,r*0.6);core.endFill();
    core.beginFill(color,0.9);core.drawCircle(0,0,r*0.42);core.endFill();
    cont.addChild(core);

    // パワー数字
    if(power>=2){
      const pt=new PIXI.Text(power.toString(),new PIXI.TextStyle({fontFamily:'Orbitron',fontSize:Math.min(10+power,16),fill:0xffffff,fontWeight:'900'}));
      pt.anchor.set(0.5);cont.addChild(pt);
    }

    // 直線距離・方向
    const dx=tx-sx,dy=ty-sy;
    const dist=Math.sqrt(dx*dx+dy*dy);
    // 速度: 速めに一定 (35~50フレーム)
    const frames=Math.round(35+Math.min(dist/30,15));
    this.projectiles.push({cont,spike,core,sx,sy,tx,ty,color,frames,f:0,power,r,dist,dx,dy});
  }

  updateParticlesEtc(dt){
    this.particles=this.particles.filter(p=>{
      p.gfx.x+=p.vx;p.gfx.y+=p.vy;p.vy+=0.28;p.life-=p.decay;p.gfx.alpha=p.life;
      if(p._trackRot)p.gfx.rotation=Math.atan2(p.vy,p.vx)+p._trackRot;
      else if(p.rot)p.gfx.rotation+=p.rot;
      if(p.life<=0){if(p._mask)try{p._mask.destroy();}catch(e){}try{p.gfx.destroy();}catch(e){}return false;}return true;
    });
    this.floatLabels=this.floatLabels.filter(fl=>{fl.update(dt);return fl.alive;});
    // Custom labels (attack text with dynamic size)
    if(this._customLabels){
      this._customLabels=this._customLabels.filter(l=>{
        if(!l.alive&&!l._fading)return false;
        if(l._fading){
          l._fadeT=(l._fadeT||0)+dt;
          l.alpha=Math.max(0,1-l._fadeT/800);
          l.y-=0.12;
          if(l.alpha<=0){try{l.destroy();}catch(e){}return false;}
          return true;
        }
        if(l._popT!==undefined&&l._popT<1){
          l._popT=Math.min(1,(l._popT||0)+dt/150);
          const e=1-(1-l._popT)*(1-l._popT);
          l.scale.set(1.5-0.5*e);l.alpha=e;
          if(l._popT>=1){l.scale.set(1);l.alpha=1;}
        }
        return true;
      });
    }
    // ALL CLEAR spinning text update
    if(this._allClearTexts){
      this._allClearTexts=this._allClearTexts.filter(a=>{
        a.timer++;
        const t=a.timer;
        a.gfx.rotation+=0.06;
        if(t<20) a.gfx.scale.set(0.3+t/20*0.7);
        else a.gfx.scale.set(1-Math.min(1,(t-20)/60)*0.3);
        a.gfx.alpha=t<20?1:Math.max(0,1-(t-20)/60);
        if(a.bg){
          a.bg.scale.x=a.gfx.scale.x;
          a.bg.scale.y=a.gfx.scale.y;
          a.bg.alpha=a.gfx.alpha;
        }
        if(t>=80){try{this.effectsLayer.removeChild(a.gfx);a.gfx.destroy();if(a.bg){try{this.effectsLayer.removeChild(a.bg);a.bg.destroy();}catch(e){}}}catch(e){}return false;}
        return true;
      });
    }
    this._updateBadge(dt);
    this.projectiles=this.projectiles.filter(p=>{
      p.f++;
      const t=p.f/p.frames;
      // ease-in（最初ゆっくり→急加速）で攻撃的に
      const te=t*t*t;
      const cx=p.sx+p.dx*te;
      const cy=p.sy+p.dy*te;
      p.cont.x=cx;p.cont.y=cy;
      // スパイクを高速回転
      p.spike.rotation+=0.28;
      // 突撃時にスケール震動
      const sc=1+0.22*Math.sin(p.f*0.7);
      p.cont.scale.set(sc);
      // 尾を引くトレイル（直線方向に伸びる）
      if(p.f%1===0&&settings.particles!=='off'){
        const tg=new PIXI.Graphics();
        const trailAlpha=0.55*(1-t);
        tg.beginFill(p.color,trailAlpha);
        // 楕円を進行方向に引き伸ばした軌跡
        const trailLen=p.r*1.8*(1-t*0.4);
        tg.drawCircle(0,0,p.r*0.35);
        tg.endFill();
        tg.x=cx-(p.dx/p.frames)*2;tg.y=cy-(p.dy/p.frames)*2;
        this.effectsLayer.addChild(tg);
        this.particles.push({gfx:tg,vx:0,vy:0,life:trailAlpha,decay:0.12});
      }
      if(p.f>=p.frames){
        // 着弾: 爆発的なバースト
        const n=settings.particles==='high'?32:14;
        for(let i=0;i<n;i++){
          const g=new PIXI.Graphics();g.beginFill(p.color,1);
          const sz=Math.random()*5+1.5;
          if(i%4===0)g.drawCircle(0,0,sz);else g.drawRect(-sz/2,-sz/2,sz,sz);
          g.endFill();g.x=p.tx+(Math.random()-0.5)*12;g.y=p.ty+(Math.random()-0.5)*12;
          this.effectsLayer.addChild(g);
          // 進行方向前方への集中バースト
          const baseAngle=Math.atan2(p.dy,p.dx);
          const spread=i<n*0.4?(Math.random()-0.5)*1.2:(Math.random()-0.5)*Math.PI*2;
          const a=baseAngle+spread;
          const sp=Math.random()*12+5;
          this.particles.push({gfx:g,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,decay:0.042+Math.random()*0.04});
        }
        // 衝撃波リング
        if(settings.quality!=='low'&&settings.quality!=='minimum'){
          const sw=new PIXI.Graphics();sw.lineStyle(3,p.color,0.9);sw.drawCircle(0,0,6);
          sw.x=p.tx;sw.y=p.ty;this.effectsLayer.addChild(sw);
          let sr=6,sa=0.9;
          const swT=()=>{sr+=7;sa-=0.065;sw.clear();sw.lineStyle(3,p.color,sa);sw.drawCircle(0,0,sr);
            if(sa>0)requestAnimationFrame(swT);else try{sw.destroy();}catch(e){}};
          requestAnimationFrame(swT);
        }
        try{p.cont.destroy({children:true});}catch(e){}return false;
      }
      return true;
    });
  }

  update(dt){
    this.drawBoard();this.drawGhost();this.drawCurrent();
    this.drawNextPieces();this.drawHold();
    this.updateScoreUI();
    this.updateBoardAnim(dt);
    this.opponentPlayers.forEach(p=>{this.drawOpponentBoard(p.id);this._updateOpponentSmoke(p.id,dt);this.drawOpponentGarbageMeter(p.id);});
    this.drawGarbageMeter();
    this._drawDangerWarning();
    this.updateParticlesEtc(dt);
    // ── Elapsed time ──
    if(this.elapsedText){
      const gs=this.gs||gameState||puyoGameState;
      if(gs&&gs.startTime){
        const sec=Math.floor((performance.now()-gs.startTime)/1000);
        const m=Math.floor(sec/60);const s=sec%60;
        this.elapsedText.text=m+':'+(s<10?'0':'')+s;
      }
    }
    // ULTRA: animated scanline
    if(settings.quality==='ultra'&&this._bgScanline){
      this._bgScanlineY=(this._bgScanlineY||0)+(dt*0.4);
      if(this._bgScanlineY>this.H)this._bgScanlineY=0;
      this._bgScanline.clear();
      this._bgScanline.beginFill(0x00f5ff,0.025);
      this._bgScanline.drawRect(0,this._bgScanlineY,this.W,2);
      this._bgScanline.endFill();
    }
  }

  // 敵ボードの煙エフェクト更新
  _updateOpponentSmoke(pid, dt){
    const d=this.opBoardData[pid];
    if(!d||d.dead||!d.smokeLayer||settings.particles==='off'||settings.quality==='minimum')return;
    if(!d.cont.visible)return;
    if(!d.board){return;}
    // 積み上がり計算
    const boardArr=d.board;
    const offset=boardArr.length>ROWS?HIDDEN:0;
    let topRow=ROWS+HIDDEN;
    for(let r=0;r<boardArr.length;r++){
      if(boardArr[r]&&boardArr[r].some(v=>v)){topRow=r;break;}
    }
    // 敵は小さいボード（showAbove行付き）。可視上部6行以内で危機
    const dangerStart=offset+6;
    const danger=Math.max(0,Math.min(1,(dangerStart-topRow)/4));

    if(danger<=0){
      d.smokeParticles=d.smokeParticles.filter(p=>{
        p.life-=0.025;p.gfx.alpha=Math.max(0,p.life*p.maxAlpha);
        p.gfx.x+=p.vx;p.gfx.y+=p.vy;p.vx+=(Math.random()-0.5)*0.03;
        p.gfx.scale.x*=p.expandX;p.gfx.scale.y*=p.expandY;p.gfx.rotation+=p.rot;
        if(p.life<=0){try{p.gfx.destroy();}catch(e){}return false;}return true;
      });
      return;
    }

    // 煙レイヤー位置を cont に追従させる
    d.smokeLayer.x=d.cont.x;d.smokeLayer.y=d.cont.y;

    d.smokeTick=(d.smokeTick||0)+dt;
    const rate=Math.max(200,380-danger*180);
    if(d.smokeTick>=rate){
      d.smokeTick=0;
      const bw=d.boardW,bh=d.boardH;
      const sides=[
        {x:bw/2,y:0,   dx:0, dy:-1},
        {x:bw/2,y:bh,  dx:0, dy:1},
        {x:0,   y:bh/2,dx:-1,dy:0},
        {x:bw,  y:bh/2,dx:1, dy:0},
      ];
      const side=sides[Math.floor(Math.random()*4)];
      this._spawnNoiseSmokePuff(side.x,side.y,side.dx,side.dy,danger,d.smokeLayer,d.smokeParticles);
    }
    d.smokeParticles=d.smokeParticles.filter(p=>{
      p.life-=p.decay;
      const lifeRatio=p.life/p.maxLife;
      let alpha;
      if(lifeRatio>0.8){alpha=p.maxAlpha*(1-lifeRatio)*5;}
      else if(lifeRatio>0.3){alpha=p.maxAlpha;}
      else{alpha=p.maxAlpha*(lifeRatio/0.3);}
      p.gfx.alpha=Math.max(0,alpha);
      p.gfx.x+=p.vx;p.gfx.y+=p.vy;
      if(p.noisePhase!==undefined){p.noisePhase+=p.noiseFreq;p.vx+=Math.sin(p.noisePhase)*p.noiseAmp;}
      else{p.vx+=(Math.random()-0.5)*0.04;}
      p.vx*=0.97;p.vy*=0.990;
      p.gfx.scale.x*=p.expandX;p.gfx.scale.y*=p.expandY;p.gfx.rotation+=p.rot;
      if(p.life<=0){try{p.gfx.destroy();}catch(e){}return false;}return true;
    });
  }
} // end class GameRenderer

// ---- Input ----
// ---- SpectatorRenderer ----
// 観戦モード専用レンダラー: 全プレイヤーのボードを画面に均等配置
class SpectatorRenderer{
  constructor(app,players){
    this.app=app;this.players=players;
    this.W=app.screen.width;this.H=app.screen.height;
    this.opBoardData={};
    this.root=new PIXI.Container();app.stage.addChild(this.root);
    this._buildBoards();
  }
  _buildBoards(){
    const n=this.players.length;
    if(n===0)return;
    // セルサイズをプレイヤー数と画面幅から自動計算
    const maxCell=Math.floor(Math.min(this.W/(n*getGameCols()+n+1), this.H/(ROWS+4)));
    const cell=Math.max(8,Math.min(22,maxCell));
    const bw=getGameCols()*cell,bh=ROWS*cell;
    const totalW=n*bw+(n+1)*Math.floor(cell*0.8);
    const startX=(this.W-totalW)/2;
    const startY=(this.H-bh)/2;
    this._startY=startY; // update()で使用
    this.players.forEach((p,i)=>{
      const x=startX+i*(bw+Math.floor(cell*0.8));
      const pivotX=bw/2,pivotY=bh/2;
      const boardWrap=new PIXI.Container();boardWrap.x=x+pivotX;boardWrap.y=startY+pivotY;this.root.addChild(boardWrap);
      const cont=new PIXI.Container();cont.pivot.set(pivotX,pivotY);boardWrap.addChild(cont);
      const isBot=!!p.isBot;
      const borderCol=isBot?0xffbe0b:0x00f5ff;
      const bg=new PIXI.Graphics();
      bg.beginFill(0x000010,0.9);bg.drawRect(0,0,bw,bh);bg.endFill();
      bg.lineStyle(1,borderCol,0.5);bg.drawRect(0,0,bw,bh);
      // グリッド
      bg.lineStyle(0.3,0x0a2a4a,0.6);
      for(let c=1;c<getGameCols();c++){bg.moveTo(c*cell,0);bg.lineTo(c*cell,bh);}
      for(let r=1;r<ROWS;r++){bg.moveTo(0,r*cell);bg.lineTo(bw,r*cell);}
      cont.addChild(bg);
      const nameCol=isBot?0xffbe0b:0x00f5ff;
      const ntxt=new PIXI.Text(p.name.toUpperCase(),new PIXI.TextStyle({fontFamily:'Share Tech Mono',fontSize:Math.max(8,cell*0.55),fill:nameCol,letterSpacing:1}));
      ntxt.x=0;ntxt.y=-cell*1.2;cont.addChild(ntxt);
      const boardGfx=new PIXI.Graphics();cont.addChild(boardGfx);
      const sst=new PIXI.TextStyle({fontFamily:'Share Tech Mono',fontSize:Math.max(7,cell*0.5),fill:0x888888});
      const stxt=new PIXI.Text('0000000',sst);stxt.x=0;stxt.y=bh+4;cont.addChild(stxt);

      const ppsTxt=new PIXI.Text('0.00 PPS',new PIXI.TextStyle({fontFamily:'Share Tech Mono',fontSize:Math.max(6,cell*0.45),fill:0x00f5ff}));ppsTxt.x=0;ppsTxt.y=bh+cell*1.2;cont.addChild(ppsTxt);
      const apmTxt=new PIXI.Text('0 APM',new PIXI.TextStyle({fontFamily:'Share Tech Mono',fontSize:Math.max(6,cell*0.45),fill:0xff8500}));apmTxt.x=0;apmTxt.y=bh+cell*1.2+10;cont.addChild(apmTxt);
      const vsTxt=new PIXI.Text('0 VS',new PIXI.TextStyle({fontFamily:'Share Tech Mono',fontSize:Math.max(6,cell*0.45),fill:0xcc44ff}));vsTxt.x=0;vsTxt.y=bh+cell*1.2+20;cont.addChild(vsTxt);
      const gMeterGfx=new PIXI.Graphics();gMeterGfx.x=-4;gMeterGfx.y=0;cont.addChild(gMeterGfx);

      // 死亡オーバーレイ
      const deadOverlay=new PIXI.Graphics();
      deadOverlay.beginFill(0x000000,0.55);deadOverlay.drawRect(0,0,bw,bh);deadOverlay.endFill();
      deadOverlay.visible=false;cont.addChild(deadOverlay);
      const deadTxt=new PIXI.Text('💀',new PIXI.TextStyle({fontSize:cell*1.8}));
      deadTxt.anchor.set(0.5);deadTxt.x=bw/2;deadTxt.y=bh/2;deadTxt.visible=false;cont.addChild(deadTxt);
      const effectsLayer=new PIXI.Container();cont.addChild(effectsLayer);
      this.opBoardData[p.id]={boardWrap,cont,boardGfx,scoreTxt:stxt,ppsTxt,apmTxt,vsTxt,gMeterGfx,effectsLayer,cell,bw,bh,board:null,currentPiece:null,dead:false,deadOverlay,deadTxt,score:0,pps:0,apm:0,vs:0,garbageQueue:[],sinkOffset:0,tilt:0,tiltTarget:0,particles:[]};

    });
  }
  drawAll(){
    this.players.forEach(p=>this._drawBoard(p.id));
  }
  _drawBoard(pid){
    const d=this.opBoardData[pid];if(!d)return;
    const g=d.boardGfx;g.clear();
    const {cell,bh}=d;
    
    // Stats update
    if(d.ppsTxt) d.ppsTxt.text = `${(d.pps||0).toFixed(2)} PPS`;
    if(d.apmTxt) d.apmTxt.text = `${Math.round(d.apm||0)} APM`;
    if(d.vsTxt) d.vsTxt.text = `${Math.round(d.vs||0)} VS`;

    // Garbage Meter
    if(d.gMeterGfx){
      d.gMeterGfx.clear();
      if(d.garbageQueue && d.garbageQueue.length > 0){
        const now = performance.now();
        let totalLines = 0;
        let currentY = bh;
        const gutterPerLine = bh / ROWS;
        for (const queueItem of d.garbageQueue) {
          const lines = queueItem.lines;
          const h = lines * gutterPerLine;
          let col = 0xcccccc;
          const timeLeft = queueItem.readyAt - now;
          if (timeLeft <= 200) col = 0xff006e;
          else if (timeLeft <= 600) col = 0xffbe0b;
          d.gMeterGfx.beginFill(col, 0.85);
          d.gMeterGfx.drawRect(0, currentY - h, 2, h);
          d.gMeterGfx.endFill();
          currentY -= h;
          totalLines += lines;
          if (totalLines >= 20) break;
        }
      }
    }

    const HIDDEN_ROWS=3;
    if(!d.board){g.beginFill(0x000010,0.3);g.drawRect(0,0,d.bw,bh);g.endFill();return;}
    
    // Danger Border
    const totalQ = (d.garbageQueue||[]).reduce((s,g2)=>s+g2.lines,0);
    const bg = d.cont.children[0];
    if (bg && bg.clear) {
      bg.clear();
      bg.beginFill(0x000010, 0.9); bg.drawRect(0,0,d.bw,bh); bg.endFill();
      const bCol = totalQ >= 10 ? 0xff006e : (!!d.isBot ? 0xffbe0b : 0x00f5ff);
      bg.lineStyle(1, bCol, totalQ >= 10 ? 0.9 : 0.5); bg.drawRect(0,0,d.bw,bh);
      bg.lineStyle(0.3, 0x0a2a4a, 0.6);
      for(let c=1;c<getGameCols();c++){bg.moveTo(c*cell,0);bg.lineTo(c*cell,bh);}
      for(let r=1;r<ROWS;r++){bg.moveTo(0,r*cell);bg.lineTo(d.bw,r*cell);}
    }

    for(let r=HIDDEN_ROWS;r<ROWS+HIDDEN_ROWS;r++){
      for(let c=0;c<getGameCols();c++){
        const v=d.board[r]&&d.board[r][c];if(!v)continue;
        const color=PIECE_COLORS[v]||0x334455;
        const dy=(r-HIDDEN_ROWS)*cell,dx=c*cell,s=cell-1;
        g.beginFill(color,1);g.drawRect(dx+1,dy+1,s-1,s-1);g.endFill();
        g.beginFill(0xffffff,0.3);g.drawRect(dx+1,dy+1,s-1,2);g.drawRect(dx+1,dy+1,2,s-1);g.endFill();
      }
    }
    // ゴースト（ハードドロップ予測位置）
    if(d.currentPiece&&!d.dead&&d.board){
      const {type,rotation,x,y}=d.currentPiece;
      const gShape=PIECE_SHAPES[type]&&PIECE_SHAPES[type][((rotation%4)+4)%4];
      if(gShape){
        let gy=y;
        const totalRows=d.board.length;
        const cols=getGameCols();
        ghostLoop:
        while(true){
          for(let r=0;r<gShape.length;r++)for(let c=0;c<gShape[r].length;c++){
            if(!gShape[r][c])continue;
            const ny=gy+r+1;
            const nx=x+c;
            if(nx<0||nx>=cols||ny>=totalRows)break ghostLoop;
            if(ny>=0&&d.board[ny]&&d.board[ny][nx])break ghostLoop;
          }
          gy++;
        }
        if(gy!==y){
          const ghostColor=PIECE_COLORS[type]||0xffffff;
          for(let r=0;r<gShape.length;r++)for(let c=0;c<gShape[r].length;c++){
            if(!gShape[r][c])continue;
            const dr=gy+r-HIDDEN_ROWS;if(dr<0)continue;
            const dx=(x+c)*cell,dy=dr*cell,s=cell-1;
            g.lineStyle(0);
            g.beginFill(ghostColor,0.22);
            g.drawRect(dx+1,dy+1,s-1,s-1);
            g.endFill();
            const lw=Math.max(1,cell*0.08);
            g.lineStyle(lw,ghostColor,0.90);
            g.drawRect(dx+1,dy+1,s-1,s-1);
            g.lineStyle(0);
          }
        }
      }
    }
    // 現在ミノ
    if(d.currentPiece&&!d.dead){
      const {type,rotation,x,y}=d.currentPiece;
      const shape=PIECE_SHAPES[type]&&PIECE_SHAPES[type][((rotation%4)+4)%4];
      if(shape){
        const color=PIECE_COLORS[type]||0xffffff;
        for(let r=0;r<shape.length;r++)for(let c=0;c<shape[r].length;c++){
          if(!shape[r][c])continue;
          const dr=y+r-HIDDEN_ROWS;if(dr<0)continue;
          const dx=(x+c)*cell,dy=dr*cell,s=cell-1;
          g.beginFill(color,0.9);g.drawRect(dx+1,dy+1,s-1,s-1);g.endFill();
          g.beginFill(0xffffff,0.35);g.drawRect(dx+1,dy+1,s-1,2);g.drawRect(dx+1,dy+1,2,s-1);g.endFill();
        }
      }
    }
  }
  update(dt){
    this.players.forEach(p=>{
      this._drawBoard(p.id);
      const d=this.opBoardData[p.id];if(!d)return;
      // 傾き
      d.tilt+=(d.tiltTarget-d.tilt)*0.025;
      if(Math.abs(d.tilt)<0.0005&&Math.abs(d.tiltTarget)<0.0005)d.tilt=0;
      if(d.boardWrap)d.boardWrap.rotation=d.tilt;
      // sinkOffsetアニメ（ライン消去・ハードドロップ時に盤面が沈み込む）
      if(d.sinkOffset){
        d.sinkOffset*=0.92;
        if(d.sinkOffset<0.3){d.sinkOffset=0; d.cont.y=0;}
        else d.cont.y=d.sinkOffset;
      }
      // パーティクル
      if(d.particles&&d.particles.length){
        d.particles=d.particles.filter(q=>{
          q.gfx.x+=q.vx;q.gfx.y+=q.vy;q.vy+=0.28;q.life-=q.decay;q.gfx.alpha=q.life;
          if(q.rot)q.gfx.rotation+=q.rot;
          if(q.life<=0){try{q.gfx.destroy();}catch(e){}return false;}return true;
        });
      }
    });
  }
  markDead(pid){
    const d=this.opBoardData[pid];if(!d)return;
    d.dead=true;
    d.deadOverlay.visible=true;d.deadTxt.visible=true;
  }

  triggerOpponentSpin(pid,spinType){
    const d=this.opBoardData[pid];if(!d||d.dead)return;
    const isTSpin=spinType&&spinType.startsWith('T');
    if(!isTSpin&&!spinType)return;
    d.tiltTarget=isTSpin?0.065:-0.065;
    setTimeout(()=>{if(d)d.tiltTarget=0;},500);
  }

  triggerOpponentLineClear(pid,count,spinType,isB2B,ren,allClear){
    const d=this.opBoardData[pid];if(!d||d.dead)return;
    // 傾き
    const isTDouble=spinType==='TSPIN'&&count===2;
    const isTTriple=spinType==='TSPIN'&&count===3;
    if(count>=4||allClear||(spinType&&spinType!=='MINI_TSPIN')){
      d.tiltTarget=(spinType&&spinType.startsWith('T'))?0.07:-0.055;
      setTimeout(()=>{if(d)d.tiltTarget=0;},500);
    }
    // ライン消去時の沈み込み
    const renScale=Math.min((ren||0),10)/10;
    const prevSink=d.sinkOffset||0;
    if(count>=4||allClear){
      d.sinkOffset=Math.max(prevSink,24);
    } else if(count===1||count===2||count===3){
      if(spinType)d.sinkOffset=Math.max(prevSink,18+renScale*6);
      else d.sinkOffset=Math.max(prevSink,10+renScale*14);
    }
    // ALL CLEAR spinning text
    if(allClear&&this.effectsLayer){
      const sc=this._uiScale||1;
      const txt=new PIXI.Text('ALL CLEAR!',new PIXI.TextStyle({
        fontFamily:'Orbitron,sans-serif',fontSize:Math.floor(72*sc),fill:0xffff88,
        stroke:0x000000,strokeThickness:8,fontWeight:'900',
        dropShadow:true,dropShadowColor:0xffaa00,dropShadowBlur:20
      }));
      txt.anchor.set(0.5);
      txt.x=this.mainBX+BOARD_W*sc/2;
      txt.y=this.mainBY+BOARD_H*sc*0.28;
      txt.scale.set(0.3);
      const bg=new PIXI.Graphics();
      bg.beginFill(0x000000,0.6);
      bg.drawRoundedRect(-txt.width/2-20,-txt.height/2-12,txt.width+40,txt.height+24,12);
      bg.endFill();
      bg.scale.set(0.3);
      this.effectsLayer.addChild(bg);
      this.effectsLayer.addChild(txt);
      if(!this._allClearTexts)this._allClearTexts=[];
      this._allClearTexts.push({gfx:txt,timer:0,bg});
    }
  }
}

let das=null,dasDcd=null,arr=null,softDropTimer=null,keyState={},dasActive=false;
function setupInput(){
  document.addEventListener('keydown',handleKeyDown);
  document.addEventListener('keyup',handleKeyUp);
  document.addEventListener('visibilitychange',_onBlurReset);
  window.addEventListener('blur',_onBlurReset);
}
function removeInput(){
  document.removeEventListener('keydown',handleKeyDown);
  document.removeEventListener('keyup',handleKeyUp);
  document.removeEventListener('visibilitychange',_onBlurReset);
  window.removeEventListener('blur',_onBlurReset);
}
function _onBlurReset(){
  keyState={};dasActive=false;stopDAS();stopSoftDrop();
  if(puyoGameState)Object.values(_puyoDasTimers).forEach(t=>{clearTimeout(t.das);clearInterval(t.arr);});
  _puyoDasTimers={};
}
function handleKeyDown(e){
  if(!gameState||!gameState.alive)return;
  // チャット・入力欄にフォーカスがある時はゲーム操作を全てブロック
  const ae=document.activeElement;
  if(ae&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.isContentEditable))return;
  if(keyState[e.code])return;
  keyState[e.code]=true;
  // ゲーム用キーはブラウザのデフォルト動作を抑制
  if(e.code.startsWith('Arrow')||['Space','KeyX','KeyZ','KeyA','KeyC','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();
  switch(e.code){
    case 'ArrowLeft':gameState.move(-1);_dasStartedAt=performance.now();startDAS(-1);break;
    case 'ArrowRight':gameState.move(1);_dasStartedAt=performance.now();startDAS(1);break;
    case 'ArrowUp':case 'KeyX':gameState.rotate(1);break;
    case 'KeyZ':gameState.rotate(-1);break;
    case 'KeyA':gameState.rotate180();break;
    case 'ArrowDown':startSoftDrop();break;
    case 'Space':gameState.hardDrop();break;
    case 'ShiftLeft':case 'ShiftRight':case 'KeyC':gameState.hold();break;
  }
}
function handleKeyUp(e){
  keyState[e.code]=false;
  if(e.code==='ArrowLeft'||e.code==='ArrowRight'){
    stopDAS();
    if(renderer)renderer._wallBumpActive=false;
  }
  if(e.code==='ArrowDown')stopSoftDrop();
}
function startDAS(dir){
  stopDAS();
  dasActive=true;
  das=setTimeout(()=>{
    if(!dasActive)return;
    // DCD (DAS Cut Delay): スポーン直後のDAS誤爆防止
    const dcdMs=settings.dcdDelay||0;
    let dcdStart=_dasStartedAt||0;
    const elapsed=performance.now()-dcdStart;
    const dcdWait=Math.max(0,dcdMs-elapsed);
    const onArr=()=>{
      if(!dasActive){stopDAS();return;}
      if(!gameState||!gameState.alive){stopDAS();return;}
      const iv=settings.arrInterval??20;
      if(iv===0){while(gameState&&gameState.alive&&gameState.move(dir));stopDAS();return;}
      arr=setInterval(()=>{
        if(!gameState||!gameState.alive){stopDAS();return;}
        if(!dasActive)return;
        gameState.move(dir);
      },iv);
    };
    if(dcdWait>0)dasDcd=setTimeout(onArr,dcdWait);
    else onArr();
  },settings.dasDelay??133);
}
let _dasStartedAt=0;
function stopDAS(){dasActive=false;if(das){clearTimeout(das);das=null;}if(dasDcd){clearTimeout(dasDcd);dasDcd=null;}if(arr){clearInterval(arr);arr=null;}}
function startSoftDrop(){stopSoftDrop();if(!gameState||!gameState.alive)return;const interval=settings.softDropInterval??50;if(interval===0){while(gameState.alive&&gameState.softDrop());return;}gameState.softDrop();softDropTimer=setInterval(()=>{if(!gameState||!gameState.alive){stopSoftDrop();return;}gameState.softDrop();},interval);}
function stopSoftDrop(){if(softDropTimer){clearInterval(softDropTimer);softDropTimer=null;}}

// ---- Multiplayer ----
socket.on('opponent_update',(data)=>{
  const{id,board,score,lines,level,currentPiece,nextPieces,holdPiece,garbageLines,pps,apm,vs,garbageQueue}=data;
  if(renderer&&renderer.onOpponentUpdate) renderer.onOpponentUpdate(id, data);
  if(!renderer||!renderer.opBoardData)return;
  ReplayRecorder.record('opponent_update',{id,board,score,lines,level,currentPiece,nextPieces,holdPiece,garbageLines,pps,apm,vs,garbageQueue});
  if(!renderer)return;
  const d=renderer.opBoardData[id];if(!d)return;
  // ハードドロップ検出: 前のcurrentPieceより新しいcurrentPieceのYが大幅に減少（スポーン）かつ前のboardが変化
  const prevPiece=d.currentPiece;
  const isHardDrop=prevPiece&&currentPiece&&
    currentPiece.y<prevPiece.y-2&& // 新ミノがスポーン位置（大幅に上）
    currentPiece.type!==prevPiece.type; // 種類が変わった
  if(isHardDrop){d.sinkOffset=Math.min(d.sinkOffset+7,12);}
  d.board=board;
  d.currentPiece=currentPiece;
  if(nextPieces)d.nextPieces=nextPieces;
  if(holdPiece!==undefined)d.holdPiece=holdPiece;
  if(score!==undefined)d.score=score;
  if(garbageLines!==undefined)d.garbageLines=garbageLines;
  if(pps!==undefined) d.pps=pps;
  if(apm!==undefined) d.apm=apm;
  if(vs!==undefined) d.vs=vs;
  if(garbageQueue!==undefined) d.garbageQueue=garbageQueue;

  if(d.scoreTxt)d.scoreTxt.text=(score||0).toString().padStart(7,'0');
  
  if(isSpectator){
    // 観戦モード: SpectatorRendererのdrawBoard呼び出し
    renderer.drawAll&&renderer.drawAll();
    return;
  }
  const p=renderer.players.find(pl=>pl.id===id);
  if(p){p.score=score;p.lines=lines;p.level=level;}
  renderer.updateVisibleOpponents&&renderer.updateVisibleOpponents();
  renderer.drawOpponentBoard(id);
});

// BOT board update (same structure as opponent_update)
socket.on('bot_update',(data)=>{
  const{id,board,score,lines,level,nextPieces,holdPiece,garbageLines,pps,apm,vs,garbageQueue}=data;
  if(renderer&&renderer.onOpponentUpdate) renderer.onOpponentUpdate(id, data);
  if(!renderer||!renderer.opBoardData)return;
  ReplayRecorder.record('bot_update',{id,board,score,lines,level,nextPieces,holdPiece,garbageLines,pps,apm,vs,garbageQueue});
  if(!renderer)return;
  const d=renderer.opBoardData[id];if(!d)return;
  d.board=board;
  if(nextPieces)d.nextPieces=nextPieces;
  if(holdPiece!==undefined)d.holdPiece=holdPiece;
  if(score!==undefined)d.score=score;
  if(garbageLines!==undefined)d.garbageLines=garbageLines;
  if(pps!==undefined) d.pps=pps;
  if(apm!==undefined) d.apm=apm;
  if(vs!==undefined) d.vs=vs;
  if(garbageQueue!==undefined) d.garbageQueue=garbageQueue;

  if(d.scoreTxt)d.scoreTxt.text=(score||0).toString().padStart(7,'0');
  
  if(isSpectator)return;
  renderer.updateVisibleOpponents&&renderer.updateVisibleOpponents();
  renderer.drawOpponentBoard(id);
});

// BOT piece motion update
socket.on('bot_piece_update',({id,currentPiece})=>{
  if(!renderer)return;
  // PuyoRenderer: update opPuyoData
  if(renderer.opPuyoData&&renderer.opPuyoData[id]){renderer.opPuyoData[id].currentPiece=currentPiece;return;}
  const d=renderer.opBoardData[id];if(!d)return;
  d.currentPiece=currentPiece;
});

// 現在ミノのリアルタイム位置更新
socket.on('opponent_piece_update',({id,currentPiece})=>{
  if(!renderer)return;
  if(renderer.opPuyoData&&renderer.opPuyoData[id]){renderer.opPuyoData[id].currentPiece=currentPiece;return;}
  if(!renderer.opBoardData)return;
  const d=renderer.opBoardData[id];if(!d)return;
  d.currentPiece=currentPiece;
});

socket.on('receive_garbage',({lines,fromId,holes3})=>{
  console.log(`[RCV GARBAGE] lines=${lines} fromId=${fromId} holes3=${!!holes3} hasPuyo=${!!puyoGameState} puyoAlive=${puyoGameState?.alive} hasTetris=${!!gameState}`);
  ReplayRecorder.record('receive_garbage',{lines,fromId,holes3:!!holes3});
  if(puyoGameState&&puyoGameState.alive){
    const mult=roomSettings.garbageMultiplier||2;
    console.log(`[RCV GARBAGE] -> puyo convert: ${lines}*${mult}=${lines*mult} ojama`);
    puyoGameState.queueOjama(lines * mult);
    return;
  }
  if(!gameState){console.log('[RCV GARBAGE] -> no gameState, drop');return;}
  console.log(`[RCV GARBAGE] -> queueGarbage(${lines}) holes3=${!!holes3}`);
  gameState.queueGarbage(lines,fromId,!!holes3);
});

socket.on('player_dead',({id,name})=>{
  ReplayRecorder.record('player_dead',{id,name});
  addChatSystem(`💀 ${name} eliminated!`);
  if(isSpectator&&renderer){renderer.markDead&&renderer.markDead(id);return;}
  if(renderer)renderer.opponentGameOver(id);
});

socket.on('opponent_spin',({id,spinType})=>{
  ReplayRecorder.record('opponent_spin',{id,spinType});
  if(renderer&&renderer.triggerOpponentSpin)renderer.triggerOpponentSpin(id,spinType);
});

socket.on('opponent_line_clear',({id,count,spinType,isB2B,ren,allClear})=>{
  ReplayRecorder.record('opponent_line_clear',{id,count,spinType,isB2B,ren,allClear});
  if(renderer&&renderer.triggerOpponentLineClear)renderer.triggerOpponentLineClear(id,count,spinType,isB2B,ren,allClear);
});

socket.on('attack_sent',({fromId,toId,attack,clearRows})=>{
  ReplayRecorder.record('attack_sent',{fromId,toId,attack,clearRows});
  if(!renderer)return;
  if(fromId===myId){
    // My attack going to opponent — update gauge immediately
    const opData=renderer.opPuyoData?.[toId]||renderer.opBoardData?.[toId];
    if(opData) opData.ojamaQueue=(opData.ojamaQueue||0)+(attack&~1);
    const launchY=renderer._getClearRowsCenterY?.(clearRows)??(renderer._myBY+renderer._bH/2);
    renderer.onAttackProjectile(toId,attack,launchY);
  } else if(toId===myId){
    // Opponent/bot attack incoming
    if(!renderer.opBoardData) return;
    const d=renderer.opBoardData[fromId];
    if(d){
      const sx=d.origX+d.boardW/2;
      const sy=d.origY+d.boardH/2;
      const isBig=attack>=4;
      const color=isBig?0x00f5ff:0xff8500;
      const visualPower=isBig?attack+4:attack; // inflate size only for big
      renderer.spawnProjectile(sx,sy,renderer.mainBX-8,renderer.mainBY+BOARD_H*0.5,color,visualPower);
    }
  }
});

socket.on('game_end',({winner,winnerName,scores,forceEnded,hostId,cheeseClear,handCount})=>{
  stopDAS();stopSoftDrop();
  if(gameState)gameState.alive=false;
  if(puyoGameState){ puyoGameState.alive=false; puyoGameState.dropping=false; }
  // リプレイ記録停止（チーズモードは既にcheese_clearで停止済み）
  const hadReplay = ReplayRecorder.isRecording();
  if(hadReplay){
    const elapsed = gameState ? performance.now() - gameState.startTime : 0;
    ReplayRecorder.stop(elapsed);
    window._lastReplayData = ReplayRecorder.export();
  }
  if(isSpectator){
    // 観戦者はゲーム終了後にwaitingルームへ戻る
    isSpectator=false;
    if(gameApp){try{gameApp.destroy(true);}catch(e){}gameApp=null;}
    gameState=null;renderer=null;
    setTimeout(()=>{
      // 試合終了後は通常参加者として部屋へ自動復帰
      socket.emit('rejoin_room',{roomId:roomId,name:myName});
    },2000);
    addChatSystem(forceEnded?'⚠ Game force-ended by host.':'🏁 Game ended. Returning to room...');
    return;
  }
  if(!cheeseClear) {
    setTimeout(()=>{
      showResult(winner,winnerName,scores);
      if(hadReplay && window._lastReplayData){
        const rb = document.getElementById('result-replay-btns');
        if(rb) rb.style.display = '';
      }
      // 非ホストはホストが戻るのを待つメッセージ表示
      if(!isHost){
        addChatSystem('⏳ ホストがルームに戻るまでお待ちください...');
      }
    },2000);
  }
});

// ホストがルームに戻ったら全員自動でルームへ戻る
socket.on('host_returned_to_room',({roomId:hRid})=>{
  // result-overlayが開いていたら閉じてルームへ戻る
  const o=document.getElementById('result-overlay');
  if(o.classList.contains('open')||document.getElementById('game').classList.contains('active')){
    returnToRoom();
  }
});

let _autoReturnTimer=null;

// ルームの非アクティブ警告
let _roomInactivityTimer=null;
let _roomInactivityWarningTimer=null;
let _inactivityExtendBtn=null;

function resetRoomInactivityTimer(){
  if(!roomId)return;
  if(!isHost)return; // ホストのみ
  // 待機室画面のみ動作
  if(document.getElementById('waiting').classList.contains('active')){
    _startInactivityTimer();
  }
}

function _startInactivityTimer(){
  if(_roomInactivityTimer)clearTimeout(_roomInactivityTimer);
  if(_roomInactivityWarningTimer)clearTimeout(_roomInactivityWarningTimer);
  _removeInactivityBtn();
  // 1分後に警告
  _roomInactivityTimer=setTimeout(()=>{
    _showInactivityWarning();
  },60000);
}

function _showInactivityWarning(){
  if(!roomId||!isHost)return;
  // 警告ボタン表示
  _removeInactivityBtn();
  const btn=document.createElement('div');
  btn.id='inactivity-warning-btn';
  btn.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9000;background:rgba(255,0,110,0.92);border:2px solid #ff006e;border-radius:12px;padding:1rem 2rem;font-family:Orbitron,sans-serif;color:#fff;text-align:center;cursor:pointer;box-shadow:0 0 30px rgba(255,0,110,0.5);animation:pulse-warn 0.8s ease-in-out infinite alternate;';
  btn.innerHTML='<div style="font-size:0.9rem;letter-spacing:0.1em;margin-bottom:0.4rem;">⚠ ルームが非アクティブです</div><div style="font-size:0.75rem;opacity:0.8;margin-bottom:0.6rem;">10秒以内に押さないとルームが削除されます</div><button style="background:rgba(255,255,255,0.2);border:1px solid #fff;color:#fff;font-family:Orbitron;font-size:0.75rem;padding:0.4rem 1.2rem;border-radius:6px;cursor:pointer;letter-spacing:0.05em;">延長する (+1分)</button>';
  _inactivityExtendBtn=btn;
  document.body.appendChild(btn);
  btn.querySelector('button').addEventListener('click',_extendRoomTime);
  // 10秒のカウントダウン
  let remaining=10;
  const countEl=document.createElement('div');
  countEl.style.cssText='font-size:2rem;font-weight:900;margin-top:0.3rem;color:#ffbe0b;';
  countEl.textContent=remaining;
  btn.appendChild(countEl);
  _roomInactivityWarningTimer=setInterval(()=>{
    remaining--;
    if(countEl)countEl.textContent=remaining;
    if(remaining<=0){
      clearInterval(_roomInactivityWarningTimer);
      _deleteRoomDueToInactivity();
    }
  },1000);
  // スタイル追加
  if(!document.getElementById('inactivity-style')){
    const st=document.createElement('style');
    st.id='inactivity-style';
    st.textContent='@keyframes pulse-warn{from{box-shadow:0 0 20px rgba(255,0,110,0.4);}to{box-shadow:0 0 40px rgba(255,0,110,0.9);}}';
    document.head.appendChild(st);
  }
}

function _extendRoomTime(){
  _removeInactivityBtn();
  _startInactivityTimer();
}

function _removeInactivityBtn(){
  if(_inactivityExtendBtn){_inactivityExtendBtn.remove();_inactivityExtendBtn=null;}
  if(_roomInactivityWarningTimer){clearInterval(_roomInactivityWarningTimer);_roomInactivityWarningTimer=null;}
  const b=document.getElementById('inactivity-warning-btn');
  if(b)b.remove();
}

function _deleteRoomDueToInactivity(){
  _removeInactivityBtn();
  if(roomId){
    socket.emit('leave_room');
    addChatSystem('⚠ ルームが非アクティブのため削除されました。');
  }
  roomId=null;roomPlayers=[];
  if(myName)showGameLobby(null);
  else showScreen('lobby');
}



function showResult(winner,winnerName,scores){
  const o=document.getElementById('result-overlay');
  document.getElementById('result-title').textContent=winner===myId?'🏆 VICTORY!':'GAME OVER';
  document.getElementById('result-title').style.color=winner===myId?'#ffbe0b':'#ff006e';
  document.getElementById('result-winner').textContent=`Winner: ${winnerName}`;
  document.getElementById('result-scores').innerHTML=scores.sort((a,b)=>b.score-a.score).map(s=>
    `<div class="result-score-row"><span>${s.name}${s.id===myId?' (YOU)':''}</span><span style="color:var(--neon-cyan)">${s.score.toString().padStart(7,'0')}</span></div><div style="display:flex;justify-content:space-between;font-size:0.7rem;color:rgba(255,255,255,0.45);padding:0.15rem 0.3rem 0.5rem 0.3rem;border-bottom:1px solid rgba(255,255,255,0.06)"><span>⚔ ${s.attackSent||0} sent</span><span>🗑 ${s.garbageReceived||0} received</span></div>`).join('');
  // ホストのみ「ルームに戻る」ボタンを表示
  const retBtn = document.getElementById('result-return-btn');
  if(retBtn) retBtn.style.display = isHost ? '' : 'none';
  o.classList.add('open');
  if(winner===myId)SFX.allClear();else SFX.gameover();
}

// ---- Chat ----
function addChatMessage(msg){
  const el=document.getElementById('chat-messages');
  const d=document.createElement('div');d.className='chat-msg';
  d.innerHTML=`<span class="chat-name">${esc(msg.name)}</span>: ${esc(msg.message)}`;
  el.appendChild(d);
  // 最大30件
  while(el.children.length>30)el.removeChild(el.firstChild);
  el.scrollTop=el.scrollHeight;
}
function addChatSystem(text){
  const el=document.getElementById('chat-messages');
  const d=document.createElement('div');d.className='chat-msg system';d.textContent=text;
  el.appendChild(d);
  while(el.children.length>30)el.removeChild(el.firstChild);
  el.scrollTop=el.scrollHeight;
}
function sendChat(){
  const i=document.getElementById('chat-input');const m=i.value.trim();if(!m)return;
  const name=myName||(document.getElementById('player-name').value.trim())||'Anonymous';
  socket.emit('chat_message',{message:m,name});i.value='';
}
socket.on('chat_message',addChatMessage);
function esc(t){return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// ---- Mobile Controls ----

function toggleMobileControls() {
  mobileControlsEnabled = !mobileControlsEnabled;
  const btn = document.getElementById('mobile-toggle-btn');
  if (mobileControlsEnabled) {
    btn.innerHTML = '📱 MOBILE<br>ON';
    btn.classList.add('on');
    setupMobileControls();
  } else {
    btn.innerHTML = '📱 MOBILE<br>OFF';
    btn.classList.remove('on');
    removeMobileControls();
  }
  document.cookie='tetrix_mobile='+(mobileControlsEnabled?'1':'0')+'; max-age=31536000; path=/';
  const inGame = document.getElementById('game').classList.contains('active');
  const inLobby = document.getElementById('game-lobby').classList.contains('active');
  showDpad(inGame);
  const dpadBtnWrap=document.getElementById('dpad-layout-btn-wrap');
  if(dpadBtnWrap)dpadBtnWrap.style.display=(mobileControlsEnabled&&inLobby)?'block':'none';
  if(!mobileControlsEnabled)closeDpadEditor();
}

// ---- Display Keyboard (D-Pad) ----
let _dpadDasTimers = {}; // key -> {das, arr}

function applyDpadLayout() {
  const parts = ['cross','shift','z','harddrop'];
  parts.forEach(part => {
    const el = document.getElementById('dpad-' + part);
    if (!el) { console.warn('[dpad] element not found: dpad-'+part); return; }
    const d = settings.dpad[part];
    if (!d) { console.warn('[dpad] no settings for part: '+part); return; }
    el.style.left    = d.x + '%';
    el.style.top     = d.y + '%';
    el.style.opacity = d.opacity / 100;
    if (part === 'cross') {
      el.style.setProperty('--dpad-scale', d.size / 160);
      el.style.width  = d.size + 'px';
      el.style.height = d.size + 'px';
    } else {
      el.style.setProperty('--dpad-scale', d.size / 80);
      el.style.width  = d.size + 'px';
      el.style.height = Math.round(d.size * 0.72) + 'px';
    }
    console.log('[dpad]', part, 'display='+el.style.display, 'w='+el.style.width, 'x='+d.x, 'y='+d.y);
  });
  // swapCenterDown: センターと下ボタンのラベル更新
  const swap = settings.dpad.swapCenterDown;
  const centerEl = document.getElementById('dpad-btn-center');
  const downEl   = document.getElementById('dpad-btn-down');
  if (centerEl) centerEl.innerHTML = swap
    ? '▼'
    : '▲<br><span style="font-size:0.35em;letter-spacing:.03em">HARD</span>';
  if (downEl) downEl.innerHTML = swap
    ? '▲<br><span style="font-size:0.35em;letter-spacing:.03em">HARD</span>'
    : '▼';
}

function showDpad(visible) {
  ['cross','shift','z','harddrop'].forEach(part => {
    const el = document.getElementById('dpad-' + part);
    if (!el) return;
    el.style.display = (mobileControlsEnabled && visible) ? 'block' : 'none';
  });
  if (mobileControlsEnabled && visible) applyDpadLayout();
}

// Called on pointer-down for DAS keys (left/right/down)
function _dpadStartDAS(key, action, repeatMs) {
  _dpadStopKey(key);
  action(); // immediate first fire
  _dpadDasTimers[key] = {};
  _dpadDasTimers[key].das = setTimeout(() => {
    _dpadDasTimers[key].arr = setInterval(() => {
      if (!gameState || !gameState.alive) { _dpadStopKey(key); return; }
      action();
    }, repeatMs);
  }, settings.dasDelay??133);
}

function _dpadStopKey(key) {
  const t = _dpadDasTimers[key];
  if (!t) return;
  if (t.das) clearTimeout(t.das);
  if (t.arr) clearInterval(t.arr);
  delete _dpadDasTimers[key];
}

function _dpadStopAll() {
  Object.keys(_dpadDasTimers).forEach(_dpadStopKey);
  stopSoftDrop();
}

let _dpadButtonsBound = false; // 2重登録防止フラグ

function setupDpadButtons() {
  applyDpadLayout();
  if (_dpadButtonsBound) return; // 既にバインド済みならスキップ
  _dpadButtonsBound = true;

  function bind(id, onDown, onUp) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      // ゲーム中のみ動作（エディター中・非ゲーム画面では何もしない）
      const inGame = document.getElementById('game').classList.contains('active');
      const inEditor = !!document.getElementById('dpad-editor-overlay');
      if (!inGame || inEditor) return;
      el.classList.add('dpad-active');
      if (gameState && gameState.alive) onDown();
    });
    const release = (e) => {
      e.preventDefault();
      el.classList.remove('dpad-active');
      if (onUp) onUp();
    };
    el.addEventListener('pointerup',     release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('pointerleave',  release);
  }

  bind('dpad-btn-left',
    () => _dpadStartDAS('left',  () => gameState && gameState.move(-1), settings.arrInterval??20),
    () => { _dpadStopKey('left');  if(renderer) renderer._wallBumpActive=false; }
  );
  bind('dpad-btn-right',
    () => _dpadStartDAS('right', () => gameState && gameState.move(1),  settings.arrInterval??20),
    () => { _dpadStopKey('right'); if(renderer) renderer._wallBumpActive=false; }  );
  bind('dpad-btn-up',
    () => { if(gameState && gameState.alive) gameState.rotate(1); }, null
  );
  bind('dpad-btn-center',
    () => {
      if (!(gameState && gameState.alive)) return;
      if (settings.dpad.swapCenterDown) startSoftDrop();
      else gameState.hardDrop();
    },
    () => { if (settings.dpad.swapCenterDown) stopSoftDrop(); }
  );
  bind('dpad-btn-down',
    () => {
      if (settings.dpad.swapCenterDown) { if(gameState && gameState.alive) gameState.hardDrop(); }
      else startSoftDrop();
    },
    () => { if (!settings.dpad.swapCenterDown) stopSoftDrop(); }
  );
  bind('dpad-btn-harddrop',
    () => { if(gameState && gameState.alive) gameState.hardDrop(); }, null
  );
  bind('dpad-btn-shift',
    () => { if(gameState && gameState.alive) gameState.hold(); }, null
  );
  bind('dpad-btn-z',
    () => { if(gameState && gameState.alive) gameState.rotate(-1); }, null
  );
}

// ---- D-Pad Layout Editor ----
// openDpadEditor(): ロビーから呼ぶ。dpadを画面に表示してドラッグ・スライダーで設定
function openDpadEditor() {
  if (document.getElementById('dpad-editor-overlay')) return; // already open

  // dpadパーツを表示（ロビー上に浮かせる）
  ['cross','shift','z','harddrop'].forEach(part => {
    const el = document.getElementById('dpad-' + part);
    if (!el) return;
    el.style.display = 'block';
    el.style.zIndex  = '9100';
    el.style.cursor  = 'grab';
  });
  applyDpadLayout();
  applyDpadLayout();

  const overlay = document.createElement('div');
  overlay.id = 'dpad-editor-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9000;touch-action:none;background:rgba(0,0,0,0.45);';
  document.body.appendChild(overlay);

  const dpadSz  = settings.dpad.cross.size;
  const btnSz   = settings.dpad.shift.size;
  const opacity = settings.dpad.cross.opacity;

  const panel = document.createElement('div');
  panel.id = 'dpad-editor-panel';
  panel.style.cssText = [
    'position:fixed;top:0;left:0;right:0;z-index:9200;',
    'background:rgba(3,7,18,0.96);border-bottom:1px solid rgba(0,245,255,.3);',
    'padding:12px 16px 10px;font-family:Orbitron,sans-serif;',
    'display:flex;flex-direction:column;gap:8px;'
  ].join('');

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;">
      <div style="color:#00f5ff;font-size:.9rem;letter-spacing:.2em;">🎮 ボタン配置</div>
      <button id="dpad-editor-done" style="font-family:Orbitron,sans-serif;font-size:.7rem;letter-spacing:.12em;padding:.4rem 1.2rem;background:transparent;border:2px solid #00f5ff;color:#00f5ff;border-radius:5px;cursor:pointer;box-shadow:0 0 10px rgba(0,245,255,.3);">✓ 完了</button>
    </div>
    <div style="color:rgba(255,255,255,.45);font-size:.6rem;letter-spacing:.08em;margin-bottom:2px;">各パーツをドラッグして移動できます</div>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
      <div style="flex:1;min-width:110px;">
        <label style="color:rgba(255,255,255,.55);font-size:.62rem;letter-spacing:.08em;display:block;margin-bottom:3px;">十字キーサイズ <span id="ed-cross-sz-val" style="color:#ffbe0b;">${dpadSz}px</span></label>
        <input type="range" id="ed-cross-sz" min="100" max="280" value="${dpadSz}" style="width:100%;accent-color:#00f5ff;">
      </div>
      <div style="flex:1;min-width:110px;">
        <label style="color:rgba(255,255,255,.55);font-size:.62rem;letter-spacing:.08em;display:block;margin-bottom:3px;">ボタンサイズ <span id="ed-btn-sz-val" style="color:#ffbe0b;">${btnSz}px</span></label>
        <input type="range" id="ed-btn-sz" min="50" max="280" value="${btnSz}" style="width:100%;accent-color:#00f5ff;">
      </div>
      <div style="flex:1;min-width:110px;">
        <label style="color:rgba(255,255,255,.55);font-size:.62rem;letter-spacing:.08em;display:block;margin-bottom:3px;">透明度 <span id="ed-opacity-val" style="color:#ffbe0b;">${opacity}%</span></label>
        <input type="range" id="ed-opacity" min="10" max="100" value="${opacity}" style="width:100%;accent-color:#00f5ff;">
      </div>
    </div>
    <div style="margin-top:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <label style="color:rgba(255,255,255,.6);font-size:.65rem;letter-spacing:.08em;display:flex;align-items:center;gap:8px;cursor:pointer;">
        <input type="checkbox" id="ed-swap-center-down" ${settings.dpad.swapCenterDown?'checked':''} style="width:16px;height:16px;accent-color:#ffbe0b;">
        <span>十字キー中央↔下を入れ替え<br><span style="color:rgba(255,255,255,.4);font-size:.58rem;">中央=ソフトドロップ / 下=ハードドロップ</span></span>
      </label>
    </div>
  `;
  document.body.appendChild(panel);

  // Sliders
  document.getElementById('ed-cross-sz').addEventListener('input', function() {
    const v = parseInt(this.value);
    document.getElementById('ed-cross-sz-val').textContent = v + 'px';
    settings.dpad.cross.size = v;
    applyDpadLayout(); saveSettings();
  });
  document.getElementById('ed-btn-sz').addEventListener('input', function() {
    const v = parseInt(this.value);
    document.getElementById('ed-btn-sz-val').textContent = v + 'px';
    settings.dpad.shift.size = v;
    settings.dpad.z.size = v;
    settings.dpad.harddrop.size = v;
    applyDpadLayout(); saveSettings();
  });
  document.getElementById('ed-opacity').addEventListener('input', function() {
    const v = parseInt(this.value);
    document.getElementById('ed-opacity-val').textContent = v + '%';
    settings.dpad.cross.opacity = v;
    settings.dpad.shift.opacity = v;
    settings.dpad.z.opacity = v;
    settings.dpad.harddrop.opacity = v;
    applyDpadLayout(); saveSettings();
  });
  document.getElementById('ed-swap-center-down').addEventListener('change', function() {
    settings.dpad.swapCenterDown = this.checked;
    applyDpadLayout(); saveSettings();
  });

  // Draggable parts — エディター開いている間だけドラッグ可。累積登録防止のため一度削除してから追加
  ['cross','shift','z','harddrop'].forEach(partName => {
    const el = document.getElementById('dpad-' + partName);
    if (!el) return;
    // 既存のドラッグハンドラを削除
    if (el._dpadDragHandler) {
      el.removeEventListener('pointerdown', el._dpadDragHandler);
    }
    const dragHandler = (e) => {
      // エディターが開いていない場合はドラッグ無効（試合中など）
      if (!document.getElementById('dpad-editor-overlay')) return;
      e.preventDefault(); e.stopPropagation();
      const rect = el.getBoundingClientRect();
      const offX = e.clientX - rect.left;
      const offY = e.clientY - rect.top;
      el.setPointerCapture(e.pointerId);
      el.style.outline = '2px dashed #ffbe0b';

      const onMove = (ev) => {
        const vw = window.innerWidth, vh = window.innerHeight;
        settings.dpad[partName].x = Math.max(0, Math.min(95, ((ev.clientX - offX) / vw) * 100));
        settings.dpad[partName].y = Math.max(0, Math.min(95, ((ev.clientY - offY) / vh) * 100));
        applyDpadLayout(); saveSettings();
      };
      const onUp = () => {
        el.style.outline = '';
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
      };
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
    };
    el._dpadDragHandler = dragHandler;
    el.addEventListener('pointerdown', dragHandler);
  });

  document.getElementById('dpad-editor-done').addEventListener('click', closeDpadEditor);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDpadEditor(); });
}

function closeDpadEditor() {
  const ov = document.getElementById('dpad-editor-overlay');
  const pn = document.getElementById('dpad-editor-panel');
  if (ov) ov.remove();
  if (pn) pn.remove();
  // ゲーム画面以外ではdpadを非表示に戻す
  const inGame = document.getElementById('game').classList.contains('active');
  showDpad(inGame);
  ['cross','shift','z','harddrop'].forEach(part => {
    const el = document.getElementById('dpad-' + part);
    if (!el) return;
    el.style.zIndex = '';
    el.style.cursor = '';
  });
}

// ---- Mobile touch state ----
let _mobileTouchData = {};

// ── Mobile touch thresholds ───────────────────────────────────────
const M_SWIPE_DOWN  = 50;   // px total down → hard drop
const M_SWIPE_UP    = 35;   // px total up   → rotate
const M_TAP_MS      = 220;  // max ms for tap
const M_FLICK_PX    = 18;   // px total horizontal to count as a flick
const M_FLICK_MS    = 220;  // ms window: flick must finish within this time
const M_SWIPE_X     = 28;   // px per step for slow drag
const M_DAS_MS      = 150;  // ms before DAS kicks in during drag
const M_ARR_MS      = 45;   // ms per repeat during DAS drag

// Returns true when chat input has focus (game should not process touch/keys)
function _chatHasFocus() {
  const ci = document.getElementById('chat-input');
  return ci && ci === document.activeElement;
}

function setupMobileControls() {
  const gameEl = document.getElementById('game');
  gameEl.addEventListener('touchstart',  onMobileTouchStart,  { passive: false });
  gameEl.addEventListener('touchmove',   onMobileTouchMove,   { passive: false });
  gameEl.addEventListener('touchend',    onMobileTouchEnd,    { passive: false });
  gameEl.addEventListener('touchcancel', onMobileTouchCancel, { passive: false });

  // Soft drop button
  const sdBtn = document.getElementById('mobile-softdrop-btn');
  if(sdBtn){
    sdBtn.addEventListener('touchstart', onSoftDropStart, { passive: false });
    sdBtn.addEventListener('touchend',   onSoftDropEnd,   { passive: false });
    sdBtn.addEventListener('touchcancel',onSoftDropEnd,   { passive: false });
  }

  // Hold button
  const holdBtn = document.getElementById('mobile-hold-btn');
  if(holdBtn){
    holdBtn.addEventListener('touchstart', (e)=>{ e.preventDefault(); e.stopPropagation();
      holdBtn.classList.add('active-press');
      if(gameState&&gameState.alive) gameState.hold();
    }, { passive: false });
    holdBtn.addEventListener('touchend',   (e)=>{ e.preventDefault(); holdBtn.classList.remove('active-press'); }, { passive: false });
    holdBtn.addEventListener('touchcancel',(e)=>{ holdBtn.classList.remove('active-press'); }, { passive: false });
  }

  // Rotate left button
  const rotLBtn = document.getElementById('mobile-rotleft-btn');
  if(rotLBtn){
    rotLBtn.addEventListener('touchstart', (e)=>{ e.preventDefault(); e.stopPropagation();
      rotLBtn.classList.add('active-press');
      if(gameState&&gameState.alive) gameState.rotate(-1);
    }, { passive: false });
    rotLBtn.addEventListener('touchend',   (e)=>{ e.preventDefault(); rotLBtn.classList.remove('active-press'); }, { passive: false });
    rotLBtn.addEventListener('touchcancel',(e)=>{ rotLBtn.classList.remove('active-press'); }, { passive: false });
  }
}

function removeMobileControls() {
  const gameEl = document.getElementById('game');
  gameEl.removeEventListener('touchstart',  onMobileTouchStart);
  gameEl.removeEventListener('touchmove',   onMobileTouchMove);
  gameEl.removeEventListener('touchend',    onMobileTouchEnd);
  gameEl.removeEventListener('touchcancel', onMobileTouchCancel);
  Object.values(_mobileTouchData).forEach(d => _mobileClean(d));
  _mobileTouchData = {};
}

function _mobileClean(d) {
  if (!d) return;
  if (d.dasTimer) { clearTimeout(d.dasTimer);  d.dasTimer = null; }
  if (d.dasArr)   { clearInterval(d.dasArr);   d.dasArr   = null; }
}

// ---- Soft Drop Button ----
let _sdBtnTimer = null;
function onSoftDropStart(e) {
  e.preventDefault(); e.stopPropagation();
  if (!gameState || !gameState.alive) return;
  document.getElementById('mobile-softdrop-btn').classList.add('active-press');
  gameState.softDrop();
  _sdBtnTimer = setInterval(() => {
    if (!gameState || !gameState.alive) { clearInterval(_sdBtnTimer); _sdBtnTimer = null; return; }
    gameState.softDrop();
  }, 80);
}
function onSoftDropEnd(e) {
  e.preventDefault();
  document.getElementById('mobile-softdrop-btn').classList.remove('active-press');
  if (_sdBtnTimer) { clearInterval(_sdBtnTimer); _sdBtnTimer = null; }
}

// Returns whether a touch point is over the hold display area in the canvas
function _isTouchOverHold(clientX, clientY) {
  if (!renderer) return false;
  const canvas = document.querySelector('#pixi-container canvas');
  if (!canvas) return false;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const cx = (clientX - rect.left) * scaleX;
  const cy = (clientY - rect.top)  * scaleY;
  const hx1 = renderer.mainBX - 95, hx2 = renderer.mainBX - 5;
  const hy1 = renderer.mainBY - 5,  hy2 = renderer.mainBY + 90;
  return cx >= hx1 && cx <= hx2 && cy >= hy1 && cy <= hy2;
}

function onMobileTouchStart(e) {
  e.preventDefault();
  if (!mobileControlsEnabled) return;
  // チャット入力中はゲーム操作を無視
  if (_chatHasFocus()) return;

  for (const t of e.changedTouches) {
    // アクションボタン上のタッチは除外
    const target = document.elementFromPoint(t.clientX, t.clientY);
    if (target && (target.closest('#mobile-softdrop-btn') ||
                   target.closest('#mobile-left-btns') ||
                   target.closest('#chat-input-row') ||
                   target.closest('#chat-panel'))) continue;

    _mobileTouchData[t.identifier] = {
      id:           t.identifier,
      startX:       t.clientX,
      startY:       t.clientY,
      startTime:    performance.now(),
      lastX:        t.clientX,
      lastTime:     performance.now(),
      velocityX:    0,          // px/ms — rolling velocity for flick detection
      swipeHandled: false,
      flickDone:    false,      // horizontal flick already fired this touch
      dasDir:       0,
      dasTimer:     null,
      dasArr:       null,
      swipeAccX:    0,
      dragDir:      0,          // direction of drag (set during move, used on touchend)
    };
  }
}

function onMobileTouchMove(e) {
  e.preventDefault();
  if (!mobileControlsEnabled) return;
  if (_chatHasFocus()) return;

  for (const t of e.changedTouches) {
    const d = _mobileTouchData[t.identifier];
    if (!d || d.swipeHandled) continue;

    const now       = performance.now();
    const totalDX   = t.clientX - d.startX;
    const totalDY   = t.clientY - d.startY;
    const absDX     = Math.abs(totalDX);
    const absDY     = Math.abs(totalDY);
    const dt        = Math.max(1, now - d.lastTime);

    // Rolling velocity (px/ms) — used for flick detection on touchend
    const incX = t.clientX - d.lastX;
    d.velocityX = incX / dt;   // last-frame velocity
    d.lastX     = t.clientX;
    d.lastTime  = now;

    // ── DOWN swipe → hard drop
    if (totalDY > M_SWIPE_DOWN && absDY > absDX * 1.2) {
      d.swipeHandled = true;
      _mobileClean(d);
      if (gameState && gameState.alive) gameState.hardDrop();
      continue;
    }

    // ── UP swipe → rotate right
    if (totalDY < -M_SWIPE_UP && absDY > absDX * 1.2) {
      d.swipeHandled = true;
      _mobileClean(d);
      if (gameState && gameState.alive) gameState.rotate(1);
      continue;
    }

    // ── Horizontal drag: record direction for flick detection on touchend only
    // (No continuous DAS movement during drag — 1 flick = 1 cell, triggered on touchend)
    if (absDX > 8 && absDX > absDY * 1.5) {
      d.dragDir = totalDX > 0 ? 1 : -1;
    }
  }
}

function onMobileTouchEnd(e) {
  e.preventDefault();
  if (!mobileControlsEnabled) return;
  if (_chatHasFocus()) {
    // タッチがチャット外で終わったらフォーカスを外す
    for (const t of e.changedTouches) {
      const target = document.elementFromPoint(t.clientX, t.clientY);
      if (!target || !target.closest('#chat-panel')) {
        document.getElementById('chat-input')?.blur();
      }
    }
    return;
  }

  for (const t of e.changedTouches) {
    const d = _mobileTouchData[t.identifier];
    if (!d) continue;
    _mobileClean(d);

    const now     = performance.now();
    const elapsed = now - d.startTime;
    const totalDX = t.clientX - d.startX;
    const totalDY = t.clientY - d.startY;
    const absDX   = Math.abs(totalDX);
    const absDY   = Math.abs(totalDY);

    // ── フリック判定: 素早く短く横に動かしたら1マス移動（指が離れた時に実行）
    // swipeHandledでない、かつ横方向優勢、かつ距離足りる（時間制限なし）
    if (!d.swipeHandled &&
        absDX >= M_FLICK_PX &&
        absDX > absDY * 0.8) {
      const dir = totalDX > 0 ? 1 : -1;
      if (gameState && gameState.alive) gameState.move(dir);
      delete _mobileTouchData[t.identifier];
      continue;
    }

    // ── タップ判定（小さな動き・短時間）
    const tapPx = settings.swipeThreshold || 20;
    const isQuickTap = elapsed < M_TAP_MS && absDX < tapPx && absDY < tapPx && !d.swipeHandled;
    if (isQuickTap && gameState && gameState.alive) {
      if (_isTouchOverHold(t.clientX, t.clientY)) {
        gameState.hold();
      } else {
        gameState.rotate(1);
      }
    }

    delete _mobileTouchData[t.identifier];
  }
}

function onMobileTouchCancel(e) {
  for (const t of e.changedTouches) {
    const d = _mobileTouchData[t.identifier];
    if (d) { _mobileClean(d); delete _mobileTouchData[t.identifier]; }
  }
}


// ===========================
// ===== PUYO PUYO ENGINE =====
// ===========================

const PUYO_COLS = 6;
const PUYO_ROWS = 13; // row0=hidden, rows 1-12 visible
const PUYO_CELL = 46; // cell size in pixels (base, scaled by renderer)
const PUYO_COLOR_COUNT = 4; // 4 colors for fairness
// color index: 0=empty, 1=red, 2=green, 3=blue, 4=yellow, 5=purple(unused by default), 6=ojama
const PUYO_COLOR_HEX  = [0x000000, 0xe63535, 0x35c93a, 0x3587e6, 0xf0d020, 0xc535e6, 0x888888];
const PUYO_COLOR_DARK = [0x000000, 0x991111, 0x118811, 0x114499, 0x998800, 0x881188, 0x444444];
// Satellite offset per rotation: [dRow, dCol]
// rotation 0=sub above(pivot=bottom), 1=sub right, 2=sub below, 3=sub left
const PUYO_SAT = [[-1,0],[0,1],[1,0],[0,-1]];

let puyoGameState = null;

// ─── seeded lcg (reuse seededRng from tetris) ───
function _puyoSeededRng(seed){
  let s = seed|0;
  return ()=>{ s=(1664525*s+1013904223)&0xffffffff; return (s>>>0)/0xffffffff; };
}

class PuyoGame {
  constructor(seed){
    this.board = Array.from({length:PUYO_ROWS},()=>Array(PUYO_COLS).fill(0));
    this.rng = typeof seededRng==='function' ? seededRng(seed||0) : _puyoSeededRng(seed||0);
    this.nextQueue = [this._makePair(), this._makePair(), this._makePair()];
    this.current = null;  // {pivotR, pivotC, rotation, colors:[pivot,sat]}
    this.alive = true;
    this.dropping = false;   // true during chain animation
    this.gravityMs = 0;
    this.gravitySpeed = 750; // ms per cell (slows with level)
    this.lockTimer = null;
    this.lockStartTime = 0;
    this.chain = 0;
    this._inChain = false;
    this.score = 0;
    this.startTime = performance.now();
    this.totalAttackSent = 0;
    this.ojamaQueue = [];    // array of numbers (amounts)
    this._pendingOjamaCancel = 0; // attack to cancel incoming
    this._chainAttack = 0;   // accumulated during chain
    this.comboCount = 0;     // 連続消し（参考コード準拠）
    this._chainSpawned = false;
    this.lastPlacementCleared = false; // 前回の設置で消えたか
    this.garbageRate = 1.0;  // おじゃまレート（参考コード準拠）
    this._spawnPair();
  }

  _randColor(){ return (Math.floor(this.rng() * PUYO_COLOR_COUNT) + 1); }
  _makePair(){ return [this._randColor(), this._randColor()]; }

  _satPos(){
    if(!this.current) return [0,0];
    const[dr,dc]=PUYO_SAT[this.current.rotation];
    return[this.current.pivotR+dr, this.current.pivotC+dc];
  }

  _isValid(pr, pc, rot){
    const[dr,dc]=PUYO_SAT[rot];
    const sr=pr+dr, sc=pc+dc;
    const ok=(r,c)=>r>=0&&r<PUYO_ROWS&&c>=0&&c<PUYO_COLS&&this.board[r][c]===0;
    return ok(pr,pc)&&ok(sr,sc);
  }

  move(dx){
    if(!this.alive||!this.current)return false; // dropping中も移動可能
    const np=this.current.pivotC+dx;
    if(this._isValid(this.current.pivotR, np, this.current.rotation)){
      this.current.pivotC=np;
      return true;
    }
    return false;
  }

  rotate(dir){
    // dir: +1=CW, -1=CCW
    if(!this.alive||!this.current)return; // dropping中も回転可能
    const newRot=((this.current.rotation+(dir>0?1:3))%4+4)%4;
    const pr=this.current.pivotR, pc=this.current.pivotC;

    // 180 rotate check: if both lateral neighbors are blocked
    const rotL=(this.current.rotation+3)%4, rotR=(this.current.rotation+1)%4;
    const[,dcL]=PUYO_SAT[rotL], [,dcR]=PUYO_SAT[rotR];
    const lBlk=!this._isValid(pr,pc+dcL,this.current.rotation);
    const rBlk=!this._isValid(pr,pc+dcR,this.current.rotation);
    if(lBlk&&rBlk){
      const rot2=(this.current.rotation+2)%4;
      if(this._isValid(pr,pc,rot2)){
        this.current.rotation=rot2;
        this.current.colors=[this.current.colors[1],this.current.colors[0]];
        return;
      }
    }

    if(this._isValid(pr,pc,newRot)){
      this.current.rotation=newRot;
      if(typeof _puyoOnRotate==='function') _puyoOnRotate(dir);
    } else {
      for(const kc of[1,-1,2,-2]){
        if(this._isValid(pr,pc+kc,newRot)){
          this.current.pivotC+=kc;
          this.current.rotation=newRot;
          if(typeof _puyoOnRotate==='function') _puyoOnRotate(dir);
          break;
        }
      }
    }
  }

  softDrop(){
    if(!this.alive||this.dropping||!this.current)return;
    this._moveDown();
  }

  hardDrop(){
    if(!this.alive||this.dropping||!this.current)return;
    // 連鎖中はポジションだけ落としてロックしない
    if(this._inChain){
      while(this._moveDown()){}
      return;
    }
    while(this._moveDown()){}
    this._lock();
  }

  _moveDown(){
    if(!this._isValid(this.current.pivotR+1,this.current.pivotC,this.current.rotation))return false;
    this.current.pivotR++;
    return true;
  }

  update(dt){
    if(!this.alive||!this.current)return;
    // dropping or _inChain の場合は重力停止
    if(this.dropping||this._inChain) return;
    this.gravityMs+=dt;
    if(this.gravityMs>=this.gravitySpeed){
      this.gravityMs=0;
      if(!this._moveDown()){
        if(!this.lockTimer) this._startLock();
      }
    }
  }

  _startLock(){
    this.lockStartTime=performance.now();
    if(typeof _puyoOnLockTimer==='function') _puyoOnLockTimer(true);
    this.lockTimer=setTimeout(()=>{
      this.lockTimer=null;
      if(typeof _puyoOnLockTimer==='function') _puyoOnLockTimer(false);
      if(this._inChain) return; // 連鎖中はロックしない
      if(this.current&&!this._isValid(this.current.pivotR+1,this.current.pivotC,this.current.rotation)){
        this._lock();
      }
    },500);
  }

  _cancelLock(){
    if(this.lockTimer){clearTimeout(this.lockTimer);this.lockTimer=null;this.lockStartTime=0;if(typeof _puyoOnLockTimer==='function') _puyoOnLockTimer(false);}
  }

  _lock(){
    if(!this.current)return;
    this._cancelLock();

    // おじゃまぷよは次の着手時に降らせる（準備中のものだけ）
    if(!this._inChain) this._applyOjama();

    // Ojamaは連鎖解決後に適用（連鎖中の割り込み防止）
    const{pivotR,pivotC,rotation,colors}=this.current;
    const[sr,sc]=this._satPos();

    // 落下先を求める
    const dropRow=(startR,c)=>{
      let r=Math.max(startR,0);
      while(r+1<PUYO_ROWS&&this.board[r+1][c]===0) r++;
      return r;
    };
    const set=(r,c,col)=>{ if(r>=0&&r<PUYO_ROWS&&this.board[r][c]===0) this.board[r][c]=col; };

    if(pivotC===sc){
      // 縦向き: 下にある方を先に置く（上の方の落下先に影響させるため）
      if(pivotR>=sr){
        set(dropRow(pivotR,pivotC),pivotC,colors[0]);
        set(dropRow(sr,sc),sc,colors[1]);
      } else {
        set(dropRow(sr,sc),sc,colors[1]);
        set(dropRow(pivotR,pivotC),pivotC,colors[0]);
      }
    } else {
      // 横向き: 順序不問
      set(dropRow(pivotR,pivotC),pivotC,colors[0]);
      set(dropRow(sr,sc),sc,colors[1]);
    }

    this.current=null;
    this.dropping=true;
    this._inChain=true;
    this.chain=0;
    this._chainAttack=0;

    // Emit lock flash for renderer
    const lockPositions=[];
    if(pivotR>=1) lockPositions.push([pivotR,pivotC]);
    if(sr>=1) lockPositions.push([sr,sc]);
    if(typeof _puyoOnLock==='function') _puyoOnLock(lockPositions);

    this._resolveChain();
  }

  _updateCombo(cleared){
    if(cleared && this.lastPlacementCleared){ this.comboCount++; }
    else if(cleared){ this.comboCount=1; }
    else { this.comboCount=0; }
    this.lastPlacementCleared=cleared;
  }

  _applyOjama(){
    if(!this.ojamaQueue.length)return;
    const now=performance.now();
    // Only apply ojama that have been in queue for 3+ seconds
    const ready=[];
    const waiting=[];
    for(const v of this.ojamaQueue){
      if(now-(v.time||0)>=1000) ready.push(v.amount);
      else waiting.push(v);
    }
    this.ojamaQueue=waiting;
    let total=ready.reduce((s,v)=>s+v,0);
    if(total<=0)return;
    // 全準備完了分を一度に配置（row0から下へ全行を埋める）
    for(let r=0; r<PUYO_ROWS && total>0; r++){
      const cols=[0,1,2,3,4,5].sort(()=>this.rng()-0.5);
      for(const c of cols){
        if(total<=0) break;
        if(this.board[r][c]!==0) continue;
        this.board[r][c]=6;
        total--;
      }
    }
    // 盤面に入りきらなかった分は次回へ
    if(total>0) this.ojamaQueue.push({amount:total, time:performance.now()});
  }


  _resolveChain(){
    this._gravity();
    const groups=this._findGroups();
    const pops=groups.filter(g=>g.color!==6&&g.cells.length>=4);

    if(!pops.length){
      // 連鎖終了
      this._inChain=false;
      this.dropping=false;
      // 連鎖が発生しなかった場合のみコンボリセット
      if(this.chain===0) this._updateCombo(false);
      // コンボボーナスを加算 (連続設置で消した回数-1)
      if(this.comboCount>=2) this._chainAttack+=this.comboCount-1;
      if(this._chainAttack>0){
        const elapsed = (performance.now() - this.startTime) / 1000;
        const delaySec = (roomSettings.multiplierDelayMin || 1.6) * 60;
        const interval = roomSettings.multiplierIntervalSec || 1;
        const rate = roomSettings.multiplierRate || 0.03;
        if (elapsed > delaySec) {
          const steps = Math.floor((elapsed - delaySec) / interval);
          this._chainAttack = Math.floor(this._chainAttack * (1 + steps * rate));
        }
      }
      if(this._chainAttack>0&&!isOfflineSolo){
        this.totalAttackSent+=this._chainAttack;
        console.log(`[PUYO ATK SEND] chainAttack=${this._chainAttack} isOfflineSolo=${isOfflineSolo}`);
        socket.emit('puyo_attack',{ojama:this._chainAttack});
      } else {
        console.log(`[PUYO ATK SEND] SKIP: chainAttack=${this._chainAttack} isOfflineSolo=${isOfflineSolo}`);
      }
      this._chainAttack=0;
      this._emitBoard();
      if(!this._chainSpawned) this._spawnPair();
      this._chainSpawned=false;
      return;
    }

    this.chain++;
    if(this.chain===1){
      this._updateCombo(true);
      // 連鎖開始時に次のぷよを即座にスポーン（操作可能に）
      this.dropping=false;
      this._spawnPair();
      this._chainSpawned=true; // flag: enqueueしたのでchain=0ではspawnしない
      this.chain=1; // chain counter preserved
      this.dropping=false;
    }

    // おじゃまぷよ計算
    //   baseGarbage = floor(消したノーマルぷよ数 / 2 * garbageRate)
    //   chainBonus  = 連鎖ステップボーナス (2^(chain-1): 1段目0, 2段目2, 3段目4, 4段目8…)
    const normalPuyos=pops.reduce((s,g)=>s+g.cells.length,0);
    const baseGarbage=Math.floor((normalPuyos/2)*this.garbageRate);
    const chainBonus=this.chain>=2?Math.pow(2,this.chain-1):0;
    const stepAttack=baseGarbage+chainBonus;

    if(stepAttack>0){
      // 相殺処理: 受け取り予定のおじゃまをキャンセル
      let remaining=stepAttack;
      const newQueue=[];
      for (const v of this.ojamaQueue) {
        if(remaining<=0){newQueue.push(v);continue;}
        const take=Math.min(v.amount,remaining);
        if(v.amount-take>0)newQueue.push({amount:v.amount-take,time:v.time});
        remaining-=take;
        if(typeof _puyoOnCancel==='function') _puyoOnCancel(take);
      }
      this.ojamaQueue=newQueue;
      this._chainAttack+=remaining;
    }

    // Find all cells to pop (including adjacent ojama)
    const popping=new Set();
    for(const g of pops){
      for(const[r,c]of g.cells){
        popping.add(`${r},${c}`);
        for(const[dr,dc]of[[-1,0],[1,0],[0,-1],[0,1]]){
          const nr=r+dr,nc=c+dc;
          if(nr>=0&&nr<PUYO_ROWS&&nc>=0&&nc<PUYO_COLS&&this.board[nr][nc]===6)
            popping.add(`${nr},${nc}`);
        }
      }
    }

    // Pop cells
    const poppingCells=[...popping].map(k=>k.split(',').map(Number));
    for(const[r,c]of poppingCells) this.board[r][c]=0;

    // Emit pop event for renderer effects
    if(typeof _puyoOnPop==='function') _puyoOnPop(poppingCells, this.chain, this.comboCount||0);

    this._emitBoard();
    setTimeout(()=>this._resolveChain(), 400);
  }

  _gravity(){
    // Track what moved for fall animation
    const moved=[];
    for(let c=0;c<PUYO_COLS;c++){
      let w=PUYO_ROWS-1;
      for(let r=PUYO_ROWS-1;r>=0;r--){
        if(this.board[r][c]!==0){
          if(w!==r) moved.push({fromR:r,toR:w,c,color:this.board[r][c],isOjama:this.board[r][c]===6});
          this.board[w][c]=this.board[r][c];
          if(w!==r)this.board[r][c]=0;
          w--;
        }
      }
    }
    if(moved.length>0&&typeof _puyoOnFall==='function') _puyoOnFall(moved);
  }

  _findGroups(){
    const vis=Array.from({length:PUYO_ROWS},()=>Array(PUYO_COLS).fill(false));
    const groups=[];
    for(let r=0;r<PUYO_ROWS;r++){
      for(let c=0;c<PUYO_COLS;c++){
        if(this.board[r][c]&&!vis[r][c]){
          const color=this.board[r][c];
          const cells=[],q=[[r,c]];vis[r][c]=true;let qi=0;
          while(qi<q.length){
            const[cr,cc]=q[qi++];cells.push([cr,cc]);
            for(const[dr,dc]of[[-1,0],[1,0],[0,-1],[0,1]]){
              const nr=cr+dr,nc=cc+dc;
              if(nr>=0&&nr<PUYO_ROWS&&nc>=0&&nc<PUYO_COLS&&!vis[nr][nc]&&this.board[nr][nc]===color){
                vis[nr][nc]=true;q.push([nr,nc]);
              }
            }
          }
          groups.push({color,cells});
        }
      }
    }
    return groups;
  }

  queueOjama(ojama){
    this.ojamaQueue.push({amount:ojama, time:performance.now()});
    this._emitBoard();
  }

  _emitBoard(){
    const sat=this.current?this._satPos():null;
    socket.emit('puyo_board_update',{
      board:this.board.map(r=>[...r]),
      current:this.current?{
        pivotR:this.current.pivotR, pivotC:this.current.pivotC,
        rotation:this.current.rotation, colors:this.current.colors,
        satR:sat?sat[0]:null, satC:sat?sat[1]:null
      }:null,
      nextQueue:this.nextQueue.slice(0,3),
      ojamaQueue:this.ojamaQueue.reduce((s,v)=>s+v.amount,0),
      score:this.score, chain:this.chain, comboCount:this.comboCount, alive:this.alive
    });
  }

  _spawnPair(){
    const pair=this.nextQueue.shift();
    this.nextQueue.push(this._makePair());
    // ゲームオーバー判定: スポーン位置(rows 0-1, col2)が埋まっている場合
    if(this.board[0][2]!==0||this.board[1][2]!==0){
      this.alive=false;
      if(typeof _puyoOnGameOver==='function') _puyoOnGameOver(this.board);
      if(!isOfflineSolo){socket.emit('game_over',{totalAttackSent:this.totalAttackSent,totalGarbageReceived:0});_enterSpectateOnDeath();}
      return;
    }
    this.current={pivotR:1,pivotC:2,rotation:0,colors:pair};
    this.gravityMs=0;this.dropping=false;
    // スポーンアニメーション用にコールバック発火
    if(typeof _puyoOnSpawn==='function') _puyoOnSpawn(this.current);
    this._emitBoard();
  }

  // ゲームオーバー処理
  _triggerGameOver(){
    if(!this.alive) return;
    this.alive=false;
    this.current=null;
    this.dropping=false;
    if(typeof _puyoOnGameOver==='function') _puyoOnGameOver(this.board);
    if(!isOfflineSolo){socket.emit('game_over',{totalAttackSent:this.totalAttackSent,totalGarbageReceived:0});_enterSpectateOnDeath();}
  }

  // Ghost: lowest valid pivot row
  getGhostRow(){
    if(!this.current||this.dropping)return this.current?this.current.pivotR:0;
    let gr=this.current.pivotR;
    while(this._isValid(gr+1,this.current.pivotC,this.current.rotation)) gr++;
    return gr;
  }
}

// ─── Pop/Fall callback hooks (set by renderer) ───
let _puyoOnPop = null;
let _puyoOnFall = null;
let _puyoOnLock = null;
let _puyoOnSpawn = null;
let _puyoOnGameOver = null;
let _puyoOnHardDrop = null;
let _puyoOnLockTimer = null;

// ===========================
// ===== PUYO RENDERER (PIXI) =====
// ===========================
// 設計方針: スプライトをフレームごとに生成しない。
//   - _makePuyoGfx() で Graphics を1度だけ描画してRenderTextureにベイク
//   - テクスチャをキャッシュ (_texCache) して再利用
//   - PIXI.Sprite (軽量) でセルを配置し、表示/非表示を切り替え

class PuyoRenderer {
  constructor(app, players, game){
    this.app=app; this.game=game; this.players=players;
    this.W=app.renderer.width/(app.renderer.resolution||1);
    this.H=app.renderer.height/(app.renderer.resolution||1);
    this.isMobile=this.W<600;

    this.opPuyoData={};
    for(const p of players){
      if(p.id!==myId) {
        // playerModes または p._gameMode または Bot判定
        const mode = (playerModes && playerModes[p.id]) || p._gameMode || (p.isBot ? 'tetris' : 'puyo');
        console.log(`[PuyoRenderer] Player ${p.name} (${p.id}) mode: ${mode}`);
        this.opPuyoData[p.id]={
          board:null,current:null,nextQueue:[],ojamaQueue:0,name:p.name,chain:0,
          _isTetrisBoard: (mode==='tetris')
        };
      }
    }

    this.root=new PIXI.Container();
    app.stage.addChild(this.root);

    this._is1v1=Object.keys(this.opPuyoData).length===1;
    // 両盤面(自+相手)が収まるスケールを計算
    const targetW=this._is1v1?PUYO_COLS*PUYO_CELL*2+80:PUYO_COLS*PUYO_CELL*2+80;
    const scByW=this.W/(targetW+40);
    const scByH=this.H/(12*PUYO_CELL+60);
    const sc=Math.min(scByW,scByH,this.isMobile?1.2:1.4)*0.8;
    this._sc=sc;
    const cell=Math.floor(PUYO_CELL*sc);
    this._cell=cell;
    const bW=PUYO_COLS*cell, bH=12*cell;
    this._bW=bW; this._bH=bH;

    if(this._is1v1){
      // 1v1: 両盤面を均等配置、より大きく
      const gap=Math.floor(80*sc);
      this._myBX=Math.floor((this.W-bW*2-gap)/2);
      this._opBX=this._myBX+bW+gap;
    } else {
      this._myBX=Math.floor(this.W*0.25-bW/2);
      this._opBX=this._myBX+bW+Math.floor(20*sc);
    }
    this._myBY=Math.floor((this.H-bH)/2);
    this._opBY=this._myBY;

    // ─── テクスチャキャッシュ: color(0-6) × size → PIXI.Texture ───
    this._texCache=new Map();

    this._buildBg();
    this._buildMyBoardSprites();
    this._buildOpBoardSprites();
    this._buildParticleLayer();

    this._particles=[];
    this._fallAnims=[];
    this._shakePower=0;
    this._rotAnim=null; // 回転アニメ {angle, targetAngle, progress}
    this._hdTrails=[]; // ハードドロップ残像
    this._squashAnims=[]; // 着地スクワッシュ
    this._gameOverAnims=[]; // ゲームオーバーアニメ
    this._comboTxt=null; // コンボテキスト
    this._comboTimer=0;
    this._lockGlowActive=false;
    this._lockGlowStart=0;
    this._sinkOffset=0;

    _puyoOnPop=(cells,chain,comboCount)=>this._onPop(cells,chain,comboCount);
    _puyoOnFall=(moves)=>this._onFall(moves);
    _puyoOnLock=(positions)=>this._onLock(positions);
    _puyoOnSpawn=(cur)=>this._onSpawn(cur);
    _puyoOnGameOver=(board)=>this._onGameOver(board);
    _puyoOnHardDrop=(pc,fr,tr,col,rot)=>this._onHardDrop(pc,fr,tr,col,rot);
    _puyoOnLockTimer=(active)=>{
      this._lockGlowActive=active;
      if(active) this._lockGlowStart=performance.now();
    };
  }

  // ─── テクスチャキャッシュ ───
  _getPuyoTex(color, size){
    const key=`${color}_${size}`;
    if(this._texCache.has(key)) return this._texCache.get(key);

    const g=new PIXI.Graphics();
    const r=size*0.42;
    // Shadow
    g.beginFill(0x000000,0.2); g.drawCircle(size*0.07,size*0.07,r); g.endFill();
    // Body
    g.beginFill(PUYO_COLOR_HEX[color]||0x888888); g.drawCircle(0,0,r); g.endFill();
    // Dark hemisphere
    g.beginFill(PUYO_COLOR_DARK[color]||0x444444,0.5); g.drawCircle(0,r*0.18,r*0.88); g.endFill();
    // Highlight
    g.beginFill(0xffffff,0.5); g.drawCircle(-r*0.3,-r*0.32,r*0.36); g.endFill();
    g.beginFill(0xffffff,0.22); g.drawCircle(r*0.2,-r*0.36,r*0.17); g.endFill();
    g.lineStyle(1.5,0xffffff,0.6); g.drawCircle(0,0,r); g.lineStyle(0);
    const tex=this.app.renderer.generateTexture(g, PIXI.SCALE_MODES.LINEAR, 1,
      new PIXI.Rectangle(-size/2,-size/2,size,size));
    g.destroy();
    this._texCache.set(key, tex);
    return tex;
  }

  _buildBg(){
    const bg=new PIXI.Graphics();
    bg.beginFill(0x030712,0.97); bg.drawRect(0,0,this.W,this.H); bg.endFill();
    this.root.addChild(bg);
  }

  // ─── 自盤面: Sprite配列を事前確保、毎フレームは texture/visible のみ更新 ───
  _buildMyBoardSprites(){
    const{_myBX:bx,_myBY:by,_cell:cell,_bW:bW,_bH:bH,_sc:sc}=this;
    this._myBoardCont=new PIXI.Container();
    this._myBoardCont.x=bx; this._myBoardCont.y=by;
    this.root.addChild(this._myBoardCont);

    // Board bg
    const bg=new PIXI.Graphics();
    bg.beginFill(0x030912,0.97); bg.drawRect(0,0,bW,bH); bg.endFill();
    bg.lineStyle(1,0x00f5ff,0.12);
    for(let r=1;r<12;r++){bg.moveTo(0,r*cell);bg.lineTo(bW,r*cell);}
    for(let c=1;c<PUYO_COLS;c++){bg.moveTo(c*cell,0);bg.lineTo(c*cell,bH);}
    bg.lineStyle(2,0x00f5ff,0.5); bg.drawRect(0,0,bW,bH);
    this._myBoardCont.addChild(bg);

    // ─ セルスプライト: 12行×6列 ─
    this._cellSp=[];
    for(let r=0;r<12;r++){
      this._cellSp[r]=[];
      for(let c=0;c<PUYO_COLS;c++){
        const sp=new PIXI.Sprite(PIXI.Texture.EMPTY);
        sp.anchor.set(0.5);
        sp.x=c*cell+cell/2; sp.y=r*cell+cell/2;
        sp.visible=false;
        this._myBoardCont.addChild(sp);
        this._cellSp[r][c]=sp;
      }
    }

    // ─ Ghost (Graphics, clear毎フレーム) ─
    this._ghostGfx=new PIXI.Graphics();
    this._myBoardCont.addChild(this._ghostGfx);

    // ─ カレントペア: Sprite×2 ─
    this._curSp=[new PIXI.Sprite(PIXI.Texture.EMPTY), new PIXI.Sprite(PIXI.Texture.EMPTY)];
    this._curSp.forEach(sp=>{sp.anchor.set(0.5);sp.visible=false;this._myBoardCont.addChild(sp);});

    // ─ ネクスト: Sprite×6 (3ペア×2) ─
    this._nextSp=[];
    const nqX=bW+8*sc;
    for(let i=0;i<3;i++){
      const nCell=Math.floor(cell*(i===0?0.7:0.52));
      const ox=nqX+nCell/2;
      const oy=i*(nCell*2.2+5*sc);
      for(let j=0;j<2;j++){
        const sp=new PIXI.Sprite(PIXI.Texture.EMPTY);
        sp.anchor.set(0.5);
        sp.x=ox; sp.y=oy+nCell*(j===0?0.6:1.55);
        sp.alpha=i===0?1:0.6;
        sp.visible=false;
        this._myBoardCont.addChild(sp);
        this._nextSp.push({sp,nCell,i,j});
      }
    }

    // ─ おじゃまGfx ─
    this._ojamaGfx=new PIXI.Graphics();
    this._ojamaGfx.y=-cell*0.55;
    this._myBoardCont.addChild(this._ojamaGfx);

    // ─ 連鎖テキスト ─
    this._chainTxt=new PIXI.Text('',new PIXI.TextStyle({
      fontFamily:'Orbitron,sans-serif',fontSize:Math.floor(22*sc),fill:0xffff00,
      stroke:0x000000,strokeThickness:4,dropShadow:true,dropShadowColor:0xff8800,dropShadowBlur:6
    }));
    this._chainTxt.anchor.set(0.5); this._chainTxt.x=bW/2; this._chainTxt.y=bH/2; this._chainTxt.alpha=0;
    this._myBoardCont.addChild(this._chainTxt);
    this._chainTxtShow=false; this._chainTxtTimer=0;

    // ─ おじゃまカウントテキスト ─
    this._ojamaCountTxt=new PIXI.Text('',new PIXI.TextStyle({
      fontFamily:'Orbitron,sans-serif',fontSize:Math.floor(11*sc),fill:0xff6b6b,fontStyle:'bold'
    }));
    this._ojamaCountTxt.anchor.set(0.5); this._ojamaCountTxt.x=bW/2; this._ojamaCountTxt.y=-Math.floor(14*sc);
    this._myBoardCont.addChild(this._ojamaCountTxt);

    // ─ ゴミゲージ用Gfx ─
    this._myGarbageGfx = new PIXI.Graphics();
    this._myGarbageGfx.x = bW + Math.floor(2 * sc);
    this._myBoardCont.addChild(this._myGarbageGfx);

    // ─ ピンチ炎演出用Gfx ─
    this._fireGfx = new PIXI.Graphics();
    this._myBoardCont.addChild(this._fireGfx);

    // ─ 火花レイヤー ─
    this._sparkLayer = new PIXI.Container();
    this._myBoardCont.addChild(this._sparkLayer);
    this._sparks = [];

    // ─ YOUラベル ─
    const youTxt=new PIXI.Text('YOU',new PIXI.TextStyle({
      fontFamily:'Orbitron,sans-serif',fontSize:Math.floor(11*sc),fill:0x00f5ff,letterSpacing:2
    }));
    youTxt.y=-Math.floor(26*sc);
    this._myBoardCont.addChild(youTxt);

    // ─ コンボテキスト ─
    this._comboTxt=new PIXI.Text('',new PIXI.TextStyle({
      fontFamily:'Orbitron,sans-serif',fontSize:Math.floor(28*sc),fill:0xff9900,
      stroke:0x000000,strokeThickness:5,dropShadow:true,dropShadowColor:0xff4400,dropShadowBlur:8,fontWeight:'900'
    }));
    this._comboTxt.anchor.set(0.5); this._comboTxt.x=bW/2; this._comboTxt.y=bH*0.3; this._comboTxt.alpha=0;
    this._myBoardCont.addChild(this._comboTxt);

    // ─ スコアテキスト ─
    this._scoreTxt=new PIXI.Text('0',new PIXI.TextStyle({
      fontFamily:'Orbitron,sans-serif',fontSize:Math.floor(16*sc),fill:0xffffff,
      stroke:0x000000,strokeThickness:3
    }));
    this._scoreTxt.anchor.set(0.5,0);
    this._scoreTxt.x=bW/2; this._scoreTxt.y=bH+Math.floor(6*sc);
    this._myBoardCont.addChild(this._scoreTxt);

    // ─ 経過時間 ─
    this._elapsedTxt=new PIXI.Text('0:00',new PIXI.TextStyle({
      fontFamily:'Share Tech Mono',fontSize:Math.floor(11*sc),fill:0x888888,letterSpacing:2
    }));
    this._elapsedTxt.x=bW+4; this._elapsedTxt.y=-Math.floor(26*sc);
    this._myBoardCont.addChild(this._elapsedTxt);

    // ─ ゴミゲージ (テトリスと同じ) ─
    this._myGarbageGfx=new PIXI.Graphics();
    this._myGarbageGfx.x=bW+Math.floor(4*sc);
    this._myBoardCont.addChild(this._myGarbageGfx);

    // ─ ゲームオーバーライン表示(row1,col2に×マーク) ─
    const goMark=new PIXI.Graphics();
    const goX=2*cell+cell/2, goY=0*cell+cell/2; // row1(index0表示)のcol2
    goMark.lineStyle(2,0xff0000,0.7);
    const mm=cell*0.3;
    goMark.moveTo(goX-mm,goY-mm);goMark.lineTo(goX+mm,goY+mm);
    goMark.moveTo(goX+mm,goY-mm);goMark.lineTo(goX-mm,goY+mm);
    goMark.lineStyle(1.5,0xff0000,0.3); goMark.drawCircle(goX,goY,cell*0.38);
    this._myBoardCont.addChild(goMark);
  }

  // ─── 相手盤面: Spriteプール ───
  _buildOpBoardSprites(){
    const{_sc:sc,_cell:cell}=this;
    const baseCell=Math.floor(cell*(this._is1v1?1:0.48));
    let ox=this._opBX;

    for(const pid in this.opPuyoData){
      const d=this.opPuyoData[pid];
      // Tetris board (10 cols) gets smaller cells to fit same slot width as Puyo (6 cols)
      const opCell=d._isTetrisBoard?Math.floor(6*baseCell/10):baseCell;
      const cont=new PIXI.Container(); cont.x=ox; cont.y=this._opBY;
      this.root.addChild(cont);

      // 背景
      const bg=new PIXI.Graphics();
      const actualCols = d._isTetrisBoard ? 10 : PUYO_COLS;
      const opBW_actual = actualCols * opCell;
      const opBH = 12 * opCell;

      bg.beginFill(0x030912,0.95); bg.drawRect(0,0,opBW_actual,opBH); bg.endFill();
      bg.lineStyle(this._is1v1?2:1,0x00f5ff,this._is1v1?0.5:0.3);
      bg.drawRect(0,0,opBW_actual,opBH);
      if(this._is1v1){
        bg.lineStyle(0.5,0x00f5ff,0.1);
        for(let r2=1;r2<12;r2++){bg.moveTo(0,r2*opCell);bg.lineTo(opBW_actual,r2*opCell);}
        for(let c2=1;c2<actualCols;c2++){bg.moveTo(c2*opCell,0);bg.lineTo(c2*opCell,opBH);}
      }
      cont.addChild(bg);

      // セルスプライトプール
      const cellRows=d._isTetrisBoard?20:12;
      const cellSp=[];
      for(let r=0;r<cellRows;r++){
        cellSp[r]=[];
        for(let c=0;c<actualCols;c++){
          const sp=new PIXI.Sprite(PIXI.Texture.EMPTY);
          sp.anchor.set(0.5); sp.visible=false;
          sp.x=c*opCell+opCell/2; sp.y=r*opCell+opCell/2;
          cont.addChild(sp);
          cellSp[r][c]=sp;
        }
      }
      // テトリス描画用Graphics (テトリス相手のみ)
      let tetrisGfx=null;
      if(d._isTetrisBoard){
        tetrisGfx=new PIXI.Graphics();
        cont.addChild(tetrisGfx);
      }

      // カレントペアスプライト×2
      const curSp=[new PIXI.Sprite(PIXI.Texture.EMPTY),new PIXI.Sprite(PIXI.Texture.EMPTY)];
      curSp.forEach(sp=>{sp.anchor.set(0.5);sp.visible=false;cont.addChild(sp);});

      // 名前テキスト
      const nameTxt=new PIXI.Text((d.name||'').toUpperCase().substring(0,8),new PIXI.TextStyle({
        fontFamily:'Orbitron,sans-serif',fontSize:Math.floor(10*sc*(this._is1v1?1:0.75)),fill:0x00f5ff
      }));
      nameTxt.anchor.set(0.5); nameTxt.x=opBW_actual/2; nameTxt.y=-Math.floor(14*sc);
      cont.addChild(nameTxt);

      // 連鎖テキスト
      const chainTxt=new PIXI.Text('',new PIXI.TextStyle({
        fontFamily:'Orbitron,sans-serif',fontSize:Math.floor(16*sc*(this._is1v1?1:0.6)),fill:0xffff00,
        stroke:0x000000,strokeThickness:3
      }));
    chainTxt.anchor.set(0.5); chainTxt.x=opBW_actual/2; chainTxt.y=opBH/2+Math.floor(4*sc); chainTxt.alpha=0;
      cont.addChild(chainTxt);

      // コンボテキスト
      const comboTxt=new PIXI.Text('',new PIXI.TextStyle({
        fontFamily:'Orbitron,sans-serif',fontSize:Math.floor(14*sc*(this._is1v1?1:0.6)),fill:0xff8800,
        stroke:0x000000,strokeThickness:3
      }));
      comboTxt.anchor.set(0.5); comboTxt.x=opBW_actual/2; comboTxt.y=opBH/2-Math.floor(6*sc); comboTxt.alpha=0;
      cont.addChild(comboTxt);

      // おじゃまゲージ (Graphics)
      const gaugeGfx=new PIXI.Graphics(); gaugeGfx.x=-Math.floor(8*sc);
      cont.addChild(gaugeGfx);

      d._cont=cont; d._cellSp=cellSp; d._curSp=curSp;
      d._tetrisGfx=tetrisGfx; d._chainTxt=chainTxt; d._comboTxt=comboTxt; d._gaugeGfx=gaugeGfx;
      d._cell=opCell; d._bW=opBW_actual; d._bH=opBH;
      ox+=opBW_actual+Math.floor(this._is1v1?0:10*sc);
    }
  }

  _buildParticleLayer(){
    this._particleLayer=new PIXI.Container();
    this.root.addChild(this._particleLayer);
    this._opFallAnims=[];
  }

  // ─── 毎フレーム描画: テクスチャ差し替えのみ、生成なし ───
  drawAll(){
    this._drawMyBoard();
    this._drawOpBoards();
  }

  _drawMyBoard(){
    const{_cell:cell}=this;
    const game=this.game; if(!game)return;

    // ─ ピンチ炎演出 (noise-based: 枠外から勢いよく噴射) ─
    this._fireGfx.clear();
    let highest=PUYO_ROWS;
    for(let r=0;r<PUYO_ROWS;r++){
      if(game.board[r].some(c=>c!==0)){ highest=r; break; }
    }
    if(highest<=4){
      const now=performance.now();
      const p=this._sc;
      const bW=this._bW, bH=this._bH;
      const intensity=Math.max(0,1-(highest/4));
      const edgePoints=[
        {x:0,y:0,dx:1,dy:1},{x:bW,y:0,dx:-1,dy:1},
        {x:0,y:bH,dx:1,dy:-1},{x:bW,y:bH,dx:-1,dy:-1}
      ];
      // 四隅からの噴射 (large, shooting outward)
      for(const ep of edgePoints){
        for(let i=0;i<8;i++){
          const noise=Math.sin(now*0.009+i*1.9+ep.x)*0.4+Math.sin(now*0.015+i*2.7+ep.y)*0.3;
          const spread=30+noise*35;
          const outward=20+spread*0.5*intensity;
          const ox=ep.dx*outward+(Math.random()-0.5)*16*p;
          const oy=ep.dy*outward+(Math.random()-0.5)*16*p;
          const sz=(10+Math.sin(now*0.018+i*3.7)*6+noise*10)*p*Math.min(1,intensity+0.3);
          const alpha=0.3+noise*0.25+intensity*0.3;
          // Outer glow (large)
          this._fireGfx.beginFill(0xff3300,alpha*0.35);
          this._fireGfx.drawCircle(ep.x+ox,ep.y+oy,sz*2.0);
          this._fireGfx.endFill();
          // Mid flame
          this._fireGfx.beginFill(0xff6600,alpha*0.55);
          this._fireGfx.drawCircle(ep.x+ox*0.8,ep.y+oy*0.8,sz*1.2);
          this._fireGfx.endFill();
          // Core flame
          this._fireGfx.beginFill(0xffaa00,alpha*0.8);
          this._fireGfx.drawCircle(ep.x+ox*0.5,ep.y+oy*0.5,sz*0.6);
          this._fireGfx.endFill();
          // Hot inner core
          this._fireGfx.beginFill(0xffee66,alpha*0.6);
          this._fireGfx.drawCircle(ep.x+ox*0.25,ep.y+oy*0.25,sz*0.25);
          this._fireGfx.endFill();
        }
      }
      // 側面からの炎 (left/right)
      for(let side=0;side<2;side++){
        const sx=side===0?-10:bW+10;
        for(let i=0;i<6;i++){
          const t=now*0.014+i*2.3;
          const sy=bH*(0.15+Math.sin(t)*0.35+Math.sin(t*1.9)*0.2);
          const noise=Math.sin(t+i*0.7)*0.5+0.5;
          const sz=(8+noise*14)*p*intensity;
          const dx=(side===0?-1:1)*(8+noise*25)*p*intensity;
          const dy=(Math.random()-0.5)*14*p;
          this._fireGfx.beginFill(0xff4400,0.3*intensity);
          this._fireGfx.drawCircle(sx+dx,sy+dy,sz*1.6);
          this._fireGfx.beginFill(0xff8800,0.4*intensity);
          this._fireGfx.drawCircle(sx+dx,sy+dy,sz*0.9);
          this._fireGfx.beginFill(0xffcc44,0.25*intensity);
          this._fireGfx.drawCircle(sx+dx,sy+dy,sz*0.4);
          this._fireGfx.endFill();
        }
      }
    }

    // ─ セルスプライト更新 ─
    for(let r=0;r<12;r++){
      for(let c=0;c<PUYO_COLS;c++){
        const color=game.board[r+1]?.[c]??0;
        const sp=this._cellSp[r][c];
        if(color===0||(this._ojamaAnimCells&&this._ojamaAnimCells.has(`${r+1},${c}`))){
          sp.visible=false;
        } else {
          sp.texture=this._getPuyoTex(color,cell);
          sp.visible=true;
          sp.scale.set(1);
        }
      }
    }

    // ─ ゴースト ─
    this._ghostGfx.clear();
    if(game.current&&!game.dropping){
      const ghostR=game.getGhostRow();
      if(ghostR>game.current.pivotR){
        const[drs,dcs]=PUYO_SAT[game.current.rotation];
        const gsr=ghostR+drs, gsc=game.current.pivotC+dcs;
        const c0=PUYO_COLOR_HEX[game.current.colors[0]];
        const c1=PUYO_COLOR_HEX[game.current.colors[1]];
        this._ghostGfx.lineStyle(2.5,c0,0.7);
        this._ghostGfx.beginFill(c0,0.25);
        this._ghostGfx.drawCircle(game.current.pivotC*cell+cell/2,(ghostR-1)*cell+cell/2,cell*0.4);
        this._ghostGfx.endFill();
        if(gsr>=1){
          this._ghostGfx.lineStyle(2.5,c1,0.7);
          this._ghostGfx.beginFill(c1,0.25);
          this._ghostGfx.drawCircle(gsc*cell+cell/2,(gsr-1)*cell+cell/2,cell*0.4);
          this._ghostGfx.endFill();
        }
        this._ghostGfx.lineStyle(0);
      }
    }

    // ─ カレントペア ─
    if(game.current&&!game.dropping){
      const cur=game.current;
      const[sr,sc2]=game._satPos();
      const s0=this._curSp[0];
      const s1=this._curSp[1];

      // 回転アニメーション計算
      let rotDeg = cur.rotation * 90;
      if(this._rotAnim){
        this._rotAnim.progress = Math.min(this._rotAnim.progress + 0.2, 1);
        rotDeg = this._rotAnim.start + (this._rotAnim.target - this._rotAnim.start) * (1 - Math.pow(1-this._rotAnim.progress, 3));
        if(this._rotAnim.progress >= 1) this._rotAnim = null;
      }
      const rad = rotDeg * Math.PI / 180;

      if(cur.pivotR>=1){
        s0.texture=this._getPuyoTex(cur.colors[0],cell);
        s0.x=cur.pivotC*cell+cell/2; s0.y=(cur.pivotR-1)*cell+cell/2;
        s0.visible=true; s0.scale.set(1);
      } else { s0.visible=false; }

      if(sr>=1){
        s1.texture=this._getPuyoTex(cur.colors[1],cell);
        // Pivot中心の相対座標で回転を表現
        const dist = cell;
        s1.x = s0.x + Math.sin(rad) * dist;
        s1.y = s0.y - Math.cos(rad) * dist;
        s1.visible=true; s1.scale.set(1);
      } else { s1.visible=false; }
    } else {
      this._curSp.forEach(s=>s.visible=false);
    }

    // ─ ロックタイマー発光: 単にぷよの色を明るく ─
    if(this._lockGlowActive&&game.current&&!game.dropping){
      const now=performance.now();
      const elapsed=now-(this._lockGlowStart||now);
      const progress=Math.min(elapsed/500,1);
      this._curSp.forEach(sp=>{
        if(sp.visible){ sp.scale.set(1); sp.alpha=0.6+0.4*(1-progress); }
      });
    }

    // ─ ネキスト ─
    if(game.nextQueue){
      let idx=0;
      for(let i=0;i<3;i++){
        const pair=game.nextQueue[i];
        for(let j=0;j<2;j++){
          const{sp,nCell}=this._nextSp[idx++];
          if(pair){
            sp.texture=this._getPuyoTex(pair[1-j],nCell);
            sp.visible=true;
          } else { sp.visible=false; }
        }
      }
    }

    // ─ おじゃまインジケーター ─
    this._ojamaGfx.clear();
    const now2=performance.now();
    let oWaiting=0, oReady=0;
    for(const v of game.ojamaQueue){
      if(now2-(v.time||0)>=1000) oReady+=v.amount;
      else oWaiting+=v.amount;
    }
    const oTotal=oWaiting+oReady;
    this._ojamaCountTxt.text=oTotal>0?`▼${oTotal}`:'';
    if(oTotal>0){
      const oCell=cell*0.38;
      for(let i=0;i<Math.min(oTotal,PUYO_COLS*2);i++){
        const ox3=(i%PUYO_COLS)*cell+cell/2;
        const oy3=Math.floor(i/PUYO_COLS)*(-oCell*1.15)-oCell/2;
        this._ojamaGfx.beginFill(0x888888,0.85);
        this._ojamaGfx.drawCircle(ox3,oy3,oCell/2);
        this._ojamaGfx.endFill();
      }
    }

    // ─ ゴミゲージ（上から溜まり、1秒で黄色→赤）─
    if(this._myGarbageGfx){
      this._myGarbageGfx.clear();
      const gW=Math.floor(6*this._sc);
      const gH=this._bH;
      // ゲージ背景
      this._myGarbageGfx.lineStyle(1,0x444444,0.4);
      this._myGarbageGfx.drawRect(0,0,gW,gH);
      this._myGarbageGfx.lineStyle(0);
      if(oTotal>0){
        const ratio=Math.min(oTotal/30,1);
        const gh=gH*ratio;
        // Total gauge bar from top (y=0) downward
        this._myGarbageGfx.beginFill(0x444466,0.4);
        this._myGarbageGfx.drawRect(0,0,gW,gh);
        this._myGarbageGfx.endFill();
        // Waiting portion (yellow, top part)
        if(oWaiting>0){
          const wH=gH*Math.min(oWaiting/30,1);
          const blink2=oWaiting>=10?(0.5+0.5*Math.sin(now2*0.015)):1;
          this._myGarbageGfx.beginFill(0xffbe0b,0.85*blink2);
          this._myGarbageGfx.drawRect(0,0,gW,wH);
          this._myGarbageGfx.endFill();
        }
        // Ready portion (red, bottom part)
        if(oReady>0){
          const rH=gH*Math.min(oReady/30,1);
          this._myGarbageGfx.beginFill(0xff006e,0.9);
          this._myGarbageGfx.drawRect(0,gh-rH,gW,rH);
          this._myGarbageGfx.endFill();
        }
      }
    }
  }

  _drawOpBoards(){
    for(const pid in this.opPuyoData){
      const d=this.opPuyoData[pid];
      if(!d._cellSp)continue;
      const cell=d._cell;
      const board=d.board;

      if(d._isTetrisBoard){
        if(d.dead){ d._tetrisGfx&&d._tetrisGfx.clear(); continue; }
        // テトリス盤面の描画 (全可視行 20行、10列)
        const displayRows=20;
        for(let r2=0;r2<displayRows;r2++)for(let c2=0;c2<10;c2++){const sp2=d._cellSp[r2]&&d._cellSp[r2][c2];if(sp2)sp2.visible=false;}
        d._curSp.forEach(s=>s.visible=false);
        if(d._tetrisGfx){
          d._tetrisGfx.clear();
          const totalRows=board?board.length:0;
          // Show visible rows (skip hidden rows = 3)
          const HIDDEN_R=3;
          const boardStart=totalRows>HIDDEN_R?HIDDEN_R:0;
          // ブロック描画
          for(let r=0;r<displayRows&&boardStart+r<totalRows;r++){
            for(let c=0;c<10;c++){
              const tetR=boardStart+r;
              const block=(board&&board[tetR])?board[tetR][c]:0;
              if(!block)continue;
              const x=c*cell, y=r*cell, s=cell-1;
              const color=block==='G'?0x445566:(PIECE_COLORS[block]||0x334455);
              d._tetrisGfx.beginFill(color,1);
              d._tetrisGfx.drawRect(x+1,y+1,s-1,s-1);
              d._tetrisGfx.endFill();
              d._tetrisGfx.beginFill(0xffffff,0.35);
              d._tetrisGfx.drawRect(x+1,y+1,s-1,3);
              d._tetrisGfx.drawRect(x+1,y+1,3,s-1);
              d._tetrisGfx.endFill();
              d._tetrisGfx.beginFill(0x000000,0.4);
              d._tetrisGfx.drawRect(x+1,y+s-2,s-1,2);
              d._tetrisGfx.drawRect(x+s-2,y+1,2,s-1);
              d._tetrisGfx.endFill();
            }
          }
          // ゴースト + 現在ミノ
          const cp=d.currentPiece;
          if(cp&&cp.type&&PIECE_SHAPES[cp.type]){
            const shape=PIECE_SHAPES[cp.type][((cp.rotation%4)+4)%4];
            if(shape){
              // ゴースト
              let gy=cp.y;
              ghostLoop:
              while(true){
                for(let gr=0;gr<shape.length;gr++)for(let gc=0;gc<shape[gr].length;gc++){
                  if(!shape[gr][gc])continue;
                  const ny=gy+gr+1, nx=cp.x+gc;
                  if(nx<0||nx>=10||ny>=totalRows)break ghostLoop;
                  if(ny>=0&&board&&board[ny]&&board[ny][nx])break ghostLoop;
                }
                gy++;
              }
              if(gy!==cp.y){
                const gColor=PIECE_COLORS[cp.type]||0xffffff;
                for(let gr=0;gr<shape.length;gr++)for(let gc=0;gc<shape[gr].length;gc++){
                  if(!shape[gr][gc])continue;
                  const visR=gy+gr-boardStart;
                  if(visR<0||visR>=displayRows)continue;
                  const gx=(cp.x+gc)*cell, gy2=visR*cell, s2=cell-1;
                  d._tetrisGfx.lineStyle(0);
                  d._tetrisGfx.beginFill(gColor,0.22);
                  d._tetrisGfx.drawRect(gx+1,gy2+1,s2-1,s2-1);
                  d._tetrisGfx.endFill();
                  d._tetrisGfx.lineStyle(Math.max(1,cell*0.08),gColor,0.90);
                  d._tetrisGfx.drawRect(gx+1,gy2+1,s2-1,s2-1);
                  d._tetrisGfx.lineStyle(0);
                }
              }
              // 現在ミノ
              const color=PIECE_COLORS[cp.type]||0x334455;
              for(let gr=0;gr<shape.length;gr++)for(let gc=0;gc<shape[gr].length;gc++){
                if(!shape[gr][gc])continue;
                const visR=cp.y+gr-boardStart;
                if(visR<0||visR>=displayRows)continue;
                const px=(cp.x+gc)*cell, py=visR*cell, s=cell-1;
                const alpha=(cp.y+gr)<0?0.5:1;
                d._tetrisGfx.beginFill(color,alpha);
                d._tetrisGfx.drawRect(px+1,py+1,s-1,s-1);
                d._tetrisGfx.endFill();
                d._tetrisGfx.beginFill(0xffffff,alpha*0.35);
                d._tetrisGfx.drawRect(px+1,py+1,s-1,3);
                d._tetrisGfx.drawRect(px+1,py+1,3,s-1);
                d._tetrisGfx.endFill();
                d._tetrisGfx.beginFill(0x000000,alpha*0.4);
                d._tetrisGfx.drawRect(px+1,py+s-2,s-1,2);
                d._tetrisGfx.drawRect(px+s-2,py+1,2,s-1);
                d._tetrisGfx.endFill();
              }
            }
          }
        }
        // Puyo opponent chain/combo display
      if(d._isPuyo){
        if(!d._puyoInfoTxt){
          d._puyoInfoTxt=new PIXI.Text('',{fontFamily:'Orbitron,sans-serif',fontSize:Math.floor(11*cell),fill:0xffff00,stroke:0x000000,strokeThickness:3,fontWeight:'900'});
          d._puyoInfoTxt.anchor.set(0.5,1);
          d._puyoInfoTxt.x=d._bW/2; d._puyoInfoTxt.y=-Math.floor(6*cell);
          d.cont.addChild(d._puyoInfoTxt);
        }
        let info='';
        if(d._puyoChain&&d._puyoChain>=2) info+=`${d._puyoChain}連鎖`;
        if(d._puyoCombo&&d._puyoCombo>=1) info+=(info?' ':'')+`${d._puyoCombo}COMBO`;
        d._puyoInfoTxt.text=info;
      }
      // テトリス対戦相手のゴミゲージ
      if(d._gaugeGfx){
        d._gaugeGfx.clear();
        const oq=d.ojamaQueue||0;
        const gW=Math.floor(6*this._sc);
        const gH=d._bH;
        d._gaugeGfx.lineStyle(1,0x444444,0.3);
        d._gaugeGfx.drawRect(0,0,gW,gH);
        d._gaugeGfx.lineStyle(0);
        if(oq>0){
          const ratio=Math.min(oq/30,1);
          const gh=gH*ratio;
          d._gaugeGfx.beginFill(0x444466,0.4);
          d._gaugeGfx.drawRect(0,0,gW,gh);
          d._gaugeGfx.endFill();
          const col=oq>=20?0xff006e:(oq>=10?0xffbe0b:0xff6b6b);
          d._gaugeGfx.beginFill(col,0.8);
          d._gaugeGfx.drawRect(0,0,gW,gh);
          d._gaugeGfx.endFill();
        }
      }
    } else {
      // ぷよぷよ盤面の描画
        for(let r=0;r<12;r++){
          for(let c=0;c<PUYO_COLS;c++){
            const color=board?board[r+1]?.[c]??0:0;
            const sp=d._cellSp[r][c];
            if(color===0){ sp.visible=false; }
            else { sp.texture=this._getPuyoTex(color,cell); sp.visible=true; sp.scale.set(1); }
          }
        }
        // カレントペア
        const cur=d.current;
        const cs=d._curSp;
        if(cur){
          if(cur.pivotR>=1){
            cs[0].texture=this._getPuyoTex(cur.colors[0],cell);
            cs[0].x=cur.pivotC*cell+cell/2; cs[0].y=(cur.pivotR-1)*cell+cell/2;
            cs[0].visible=true;
          } else cs[0].visible=false;
          if(cur.satR>=1){
            cs[1].texture=this._getPuyoTex(cur.colors[1],cell);
            cs[1].x=cur.satC*cell+cell/2; cs[1].y=(cur.satR-1)*cell+cell/2;
            cs[1].visible=true;
          } else cs[1].visible=false;
        } else { cs.forEach(s=>s.visible=false); }
      }

      // おじゃまゲージ (上から降りる)
      if(d._gaugeGfx){
        d._gaugeGfx.clear();
        const oq=d.ojamaQueue||0;
        const gW=Math.floor(6*this._sc);
        const gH=d._bH;
        d._gaugeGfx.lineStyle(1,0x444444,0.3);
        d._gaugeGfx.drawRect(0,0,gW,gH);
        d._gaugeGfx.lineStyle(0);
        if(oq>0){
          const ratio=Math.min(oq/30,1);
          const gh=gH*ratio;
          d._gaugeGfx.beginFill(0x444466,0.4);
          d._gaugeGfx.drawRect(0,0,gW,gh);
          d._gaugeGfx.endFill();
          const col=oq>=20?0xff006e:(oq>=10?0xffbe0b:0xff6b6b);
          d._gaugeGfx.beginFill(col,0.8);
          d._gaugeGfx.drawRect(0,0,gW,gh);
          d._gaugeGfx.endFill();
        }
      }
      // 連鎖テキストフェード
      if(d._chainTxt&&d._chainTxt.alpha>0) d._chainTxt.alpha*=0.93;
      // コンボテキストフェード
      if(d._comboTxt&&d._comboTxt.alpha>0) d._comboTxt.alpha*=0.93;
    }
  }

  onOpponentPuyoUpdate(id, data){
    if(!this.opPuyoData[id]) this.opPuyoData[id]={board:null,current:null,nextQueue:[],ojamaQueue:0,name:id,_chainAnim:null};
    const d=this.opPuyoData[id];
    d._isTetrisBoard = false;
    d.board=data.board;
    d.current=data.current;
    if(data.ojamaQueue!==undefined) d.ojamaQueue=data.ojamaQueue;
    if(data.chain>1) this._onOpPop(id, [], data.chain);
  }

  onOpponentUpdate(id, data){
    if(!this.opPuyoData[id]) this.opPuyoData[id]={board:null,current:null,nextQueue:[],ojamaQueue:0,name:id,_chainAnim:null};
    const d=this.opPuyoData[id];
    d._isTetrisBoard = true;
    d.board=data.board;
    d.currentPiece=data.currentPiece;
    if(data.garbageLines!==undefined) d.ojamaQueue=data.garbageLines;
  }

  // ─── エフェクト ───
  _onHardDrop(pivotC, fromR, toR, colors, rotation){
    const{_myBX:bx,_myBY:by,_cell:cell}=this;
    const[dr,dc]=PUYO_SAT[rotation??0];
    // 残像を3つ生成
    for(let i=1;i<=3;i++){
      const trailR=toR-i*1.5;
      if(trailR<fromR) break;
      const alpha=0.25-i*0.07;
      const sc=1-i*0.06;
      const t0=new PIXI.Sprite(this._getPuyoTex(colors[0],cell));
      t0.anchor.set(0.5); t0.alpha=alpha; t0.scale.set(sc);
      t0.x=bx+pivotC*cell+cell/2; t0.y=by+Math.max(0,trailR-1)*cell+cell/2;
      this._particleLayer.addChild(t0);
      this._particles.push({gfx:t0,vx:0,vy:0,life:12,maxLife:12,isTrail:true});
      const satR=trailR+dr, satC=pivotC+dc;
      if(satR>=1&&satC>=0&&satC<PUYO_COLS){
        const t1=new PIXI.Sprite(this._getPuyoTex(colors[1],cell));
        t1.anchor.set(0.5); t1.alpha=alpha; t1.scale.set(sc);
        t1.x=bx+satC*cell+cell/2; t1.y=by+Math.max(0,satR-1)*cell+cell/2;
        this._particleLayer.addChild(t1);
        this._particles.push({gfx:t1,vx:0,vy:0,life:12,maxLife:12,isTrail:true});
      }
    }
  }

  _onSpawn(cur){
    // スポーンアニメーションは無し（即座に表示）
  }

  _onFall(moves){
    const{_myBX:bx,_myBY:by,_cell:cell}=this;
    const hasOjama=moves.some(m=>m.isOjama||m.color===6);
    if(hasOjama){
      this._sinkOffset=Math.max(this._sinkOffset||0,6*this._sc);
      if(!this._ojamaAnimCells) this._ojamaAnimCells=new Set();
    }
    for(const{fromR,toR,c,color,isOjama}of moves){
      if(toR<1)continue;
      const toY=by+(toR-1)*cell+cell/2;
      const x=bx+c*cell+cell/2;
      if(isOjama||color===6){
        this._ojamaAnimCells.add(`${toR},${c}`);
        const fromY=-cell;
        if(fromY>=toY)continue;
        const tex=this._getPuyoTex(color,cell);
        const sp=new PIXI.Sprite(tex);
        sp.anchor.set(0.5); sp.x=x; sp.y=fromY;
        const shadow=new PIXI.Graphics();
        shadow.beginFill(0x000000,0.25);
        shadow.drawEllipse(0,0,cell*0.3,cell*0.1);
        shadow.endFill();
        shadow.x=x; shadow.y=fromY;
        this._particleLayer.addChild(shadow);
        this._particleLayer.addChild(sp);
        this._fallAnims.push({
          sp,fromY,toY,progress:0,
          isOjama:true,shadow,
          startDelay:Math.random()*0.15,
          animCell:`${toR},${c}`
        });
      } else {
        const fromY=by-cell*2;
        if(fromY>=toY)continue;
        const tex=this._getPuyoTex(color,cell);
        const sp=new PIXI.Sprite(tex);
        sp.anchor.set(0.5); sp.x=x; sp.y=fromY;
        this._particleLayer.addChild(sp);
        this._fallAnims.push({sp,fromY,toY,progress:0,isOjama:false});
      }
    }
  }

  _onGameOver(board){
    const{_myBX:bx,_myBY:by,_cell:cell}=this;
    // 盤面のぷよをバラバラに飛ばす
    for(let r=1;r<PUYO_ROWS;r++){
      for(let c=0;c<PUYO_COLS;c++){
        const color=board[r]?.[c]; if(!color)continue;
        const px=bx+c*cell+cell/2, py=by+(r-1)*cell+cell/2;
        const sp=new PIXI.Sprite(this._getPuyoTex(color,cell));
        sp.anchor.set(0.5); sp.x=px; sp.y=py;
        const angle=Math.random()*Math.PI*2;
        const speed=2+Math.random()*5;
        this._particleLayer.addChild(sp);
        const delay=Math.floor(Math.random()*20);
        this._gameOverAnims.push({
          sp, vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed-3,
          life:90, maxLife:90, delay,
          rot:(Math.random()-0.5)*0.25
        });
      }
    }
    // 枠のシェイク→崩壊
    this._shakePower=15;
    // ボードを崩落させる
    this._gameOverAnims.push({
      gfx:this._myBoardCont,isBoardFall:true,
      origY:this._myBoardCont.y,
      vy:0,life:120
    });
    // ゲームオーバーテキスト
    const goTxt=new PIXI.Text('GAME OVER',new PIXI.TextStyle({
      fontFamily:'Orbitron,sans-serif',fontSize:Math.floor(28*this._sc),fill:0xff006e,
      stroke:0x000000,strokeThickness:6,dropShadow:true,dropShadowColor:0xff0000,dropShadowBlur:12,fontWeight:'900'
    }));
    goTxt.anchor.set(0.5);
    goTxt.x=this.W/2; goTxt.y=this.H/2;
    goTxt.alpha=0; goTxt.scale.set(0.2);
    this._particleLayer.addChild(goTxt);
    this._gameOverAnims.push({gfx:goTxt,isText:true,timer:0,maxTimer:80});
  }

  // 相手盤面のfall animation
  _onOpFall(pid, moves){
    const d=this.opPuyoData[pid]; if(!d||!d._cont)return;
    const cell=d._cell;
    for(const{fromR,toR,c,color}of moves){
      if(toR<1)continue;
      const fromY=(Math.max(fromR,1)-1)*cell+cell/2;
      const toY=(toR-1)*cell+cell/2;
      const x=c*cell+cell/2;
      if(fromY>=toY)continue;
      const tex=this._getPuyoTex(color,cell);
      const sp=new PIXI.Sprite(tex);
      sp.anchor.set(0.5); sp.x=x; sp.y=fromY;
      d._cont.addChild(sp);
      this._opFallAnims.push({sp,fromY,toY,progress:0,cont:d._cont});
    }
  }

  // 相手盤面のpop animation
  _onOpPop(pid, cells, chain){
    const d=this.opPuyoData[pid]; if(!d||!d._cont)return;
    const cell=d._cell;
    for(const[r,c]of cells){
      if(r<1)continue;
      const px=c*cell+cell/2, py=(r-1)*cell+cell/2;
      const color=d.board?.[r]?.[c];
      const col=PUYO_COLOR_HEX[color??0]??0xffffff;
      for(let i=0;i<5;i++){
        const angle=(i/5)*Math.PI*2;
        const speed=18+Math.random()*10;
        const g=new PIXI.Graphics();
        g.beginFill(col,0.8); g.drawCircle(0,0,3+Math.random()*2); g.endFill();
        g.x=px; g.y=py;
        d._cont.addChild(g);
        this._particles.push({gfx:g,vx:Math.cos(angle)*speed/60,vy:Math.sin(angle)*speed/60,life:30,maxLife:30,cont:d._cont});
      }
    }
    if(chain>=2&&d._chainTxt){
      d._chainTxt.text=`${chain}連鎖!`; d._chainTxt.alpha=1;
      d._chainTxt.scale.set(0.5);
      if(!d._chainAnim) d._chainAnim={timer:0,show:true};
      else { d._chainAnim.timer=0; d._chainAnim.show=true; }
    }
  }

  _onLock(positions){
    const{_cell:cell}=this;
    // 設置時に盤面を少し沈める
    this._sinkOffset=Math.max(this._sinkOffset||0,4*this._sc);
    // 着地した行の列をスクワッシュアニメに登録
    for(const[r,c]of positions){
      if(r<1)continue;
      // セルスプライトにスクワッシュを適用
      const sp=this._cellSp[r-1]?.[c];
      if(sp) this._squashAnims.push({sp,timer:0,maxTime:20,col:c,row:r-1});
      // 白フラッシュ
      const flash=new PIXI.Graphics();
      const{_myBX:bx,_myBY:by}=this;
      flash.beginFill(0xffffff,0.6); flash.drawCircle(0,0,cell*0.46); flash.endFill();
      flash.x=bx+c*cell+cell/2; flash.y=by+(r-1)*cell+cell/2;
      this._particleLayer.addChild(flash);
      this._particles.push({gfx:flash,vx:0,vy:0,life:10,maxLife:10});
    }
  }

  _onPop(cells, chain, comboCount){
    const{_myBX:bx,_myBY:by,_cell:cell}=this;
    // Store cleared cells for attack projectile launch positions
    this._lastPopCells = cells.filter(([r])=>r>=1).map(([r,c])=>[r,c]);
    // ─ パーティクル: 膨らんで消えるぷよ ─
    for(const[r,c]of cells){
      if(r<1)continue;
      const px=bx+c*cell+cell/2, py=by+(r-1)*cell+cell/2;
      const color=PUYO_COLOR_HEX[this.game?.board?.[r]?.[c]??0]??0xffffff;
      const darkColor=PUYO_COLOR_DARK[this.game?.board?.[r]?.[c]??0]??0x444444;
      // メインぷよ(膨らんで消える)
      const puyoGfx=new PIXI.Graphics();
      puyoGfx.beginFill(color,0.9); puyoGfx.drawCircle(0,0,cell*0.42); puyoGfx.endFill();
      puyoGfx.beginFill(0xffffff,0.5); puyoGfx.drawCircle(-cell*0.13,-cell*0.13,cell*0.18); puyoGfx.endFill();
      puyoGfx.x=px; puyoGfx.y=py;
      this._particleLayer.addChild(puyoGfx);
      this._particles.push({gfx:puyoGfx,vx:0,vy:0,life:16,maxLife:16,isPuyoPop:true,popPhase:0});
      // 飛び散る小粒
      for(let i=0;i<8;i++){
        const angle=(i/8)*Math.PI*2+Math.random()*0.4;
        const speed=20+Math.random()*22;
        const g=new PIXI.Graphics();
        g.beginFill(color,0.9); g.drawCircle(0,0,3+Math.random()*3); g.endFill();
        g.x=px; g.y=py;
        this._particleLayer.addChild(g);
        this._particles.push({gfx:g,vx:Math.cos(angle)*speed/60,vy:Math.sin(angle)*speed/60-0.8,life:45,maxLife:45,isShard:true});
      }
      // リング
      const ring=new PIXI.Graphics();
      ring.lineStyle(2,0xffffff,0.8); ring.drawCircle(0,0,4);
      ring.x=px; ring.y=py;
      this._particleLayer.addChild(ring);
      this._particles.push({gfx:ring,vx:0,vy:0,life:22,maxLife:22,isRing:true});
    }
    // ─ 連鎖テキスト (2連鎖目から) ─
    if(chain>=2){
      this._chainTxt.text=`${chain} 連鎖!!`;
      this._chainTxt.alpha=1; this._chainTxt.scale.set(0.4); this._chainTxtTimer=0; this._chainTxtShow=true;
    }
    // ─ コンボテキスト（連続消去回数）─
    if(this._comboTxt&&comboCount>=2){
      this._comboTxt.text=`${comboCount} COMBO!`;
      this._comboTxt.alpha=1; this._comboTxt.scale.set(0.3);
      this._comboTimer=0;
    }
    // ─ 画面揺れ ─
    this._shakePower=Math.min(chain*1.5,10)*this._sc;
  }

  onOpponentPuyoUpdate(id, data){
    if(!this.opPuyoData[id]){
      this.opPuyoData[id]={board:null,current:null,nextQueue:[],ojamaQueue:0,name:id,_chainAnim:null,_isTetrisBoard:false};
    }
    const d=this.opPuyoData[id];
    // Fix wrong initialization — rebuild as Puyo if needed
    if(d._isTetrisBoard){
      d._isTetrisBoard=false;
      if(d._cont){ try{this.root.removeChild(d._cont); d._cont.destroy({children:true});}catch(e){} }
      delete d._cont; delete d._cellSp; delete d._curSp; delete d._tetrisGfx; delete d._chainTxt; delete d._gaugeGfx;
      this._buildSingleOpBoard(id, d);
    }
    const prevBoard=d.board;
    if(data.board!==undefined) d.board=data.board;
    if(data.current!==undefined) d.current=data.current;
    if(data.nextQueue!==undefined) d.nextQueue=data.nextQueue;
    if(data.ojamaQueue!==undefined) d.ojamaQueue=data.ojamaQueue;
    // 相手のfall animation (ボード変化から推定)
    if(prevBoard&&data.board&&d._cont){
      const cell=d._cell;
      for(let c=0;c<6;c++){
        // 列ごとに上から下にスキャンしてfallを検出
        for(let r=1;r<12;r++){
          if(prevBoard[r]&&prevBoard[r][c]!==0&&data.board[r]&&data.board[r][c]===0){
            // 消えた: pop effect
            const px=c*cell+cell/2, py=(r-1)*cell+cell/2;
            const col=PUYO_COLOR_HEX[prevBoard[r][c]]??0xffffff;
            const g=new PIXI.Graphics();
            g.beginFill(col,0.9); g.drawCircle(0,0,cell*0.35); g.endFill();
            g.x=px; g.y=py;
            d._cont.addChild(g);
            this._particles.push({gfx:g,vx:0,vy:0,life:12,maxLife:12,isRing:true,cont:d._cont});
          }
        }
      }
    }
    if(data.chain!==undefined&&data.chain>1&&d._chainTxt){
      d._chainTxt.text=`${data.chain}連鎖!`; d._chainTxt.alpha=1;
      d._chainTxt.scale.set(0.5);
      if(!d._chainAnim) d._chainAnim={timer:0,show:true};
      else { d._chainAnim.timer=0; d._chainAnim.show=true; }
    }
    if(data.comboCount!==undefined&&data.comboCount>=2&&d._comboTxt){
      d._comboTxt.text=`${data.comboCount}COMBO`; d._comboTxt.alpha=1;
      d._comboTxt.scale.set(0.5);
      if(!d._comboAnim) d._comboAnim={timer:0,show:true};
      else { d._comboAnim.timer=0; d._comboAnim.show=true; }
    }
  }

  update(dt){
    // 自分の落下アニメーション (ojama: linear fast fall, normal: cubic)
    const _cell=this._cell;
    const _layer=this._particleLayer;
    this._fallAnims=this._fallAnims.filter(a=>{
      if(a.isOjama&&a.startDelay!==undefined){
        a.startDelay-=1/60;
        if(a.startDelay>0)return true;
      }
      if(a.isOjama){
        a.progress=Math.min(a.progress+0.028,1);
        const t=a.progress;
        // Linear fall — speed constant, immediately visible
        a.sp.y=a.fromY+(a.toY-a.fromY)*t;
        if(a.shadow){
          const shadowDist=(a.toY-a.sp.y)/(a.toY-a.fromY);
          const shadowAlpha=Math.max(0,(1-shadowDist)*0.3);
          a.shadow.alpha=shadowAlpha;
          a.shadow.scale.set(0.5+(1-shadowDist)*0.8);
          a.shadow.y=a.sp.y+_cell*0.5;
        }
        if(t>0.93){
          const sq=(t-0.93)/0.07;
          a.sp.scale.x=1+sq*0.35;
          a.sp.scale.y=1-sq*0.28;
        }
        if(t>=1){
          try{a.shadow&&_layer.removeChild(a.shadow)&&a.shadow.destroy();}catch(e){}
          try{_layer.removeChild(a.sp); a.sp.destroy({texture:false});}catch(e){}
          if(a.animCell&&this._ojamaAnimCells)this._ojamaAnimCells.delete(a.animCell);
          return false;
        }
      } else {
        const speed=a.isSpawn?0.10:0.14;
        a.progress=Math.min(a.progress+speed,1);
        const t=a.progress;
        const eased=1-Math.pow(1-t,3);
        a.sp.y=a.fromY+(a.toY-a.fromY)*eased;
        if(!a.isSpawn&&t>0.88){
          const sq=(t-0.88)/0.12;
          a.sp.scale.x=1+sq*0.25;
          a.sp.scale.y=1-sq*0.2;
        }
        if(t>=1){
          try{_layer.removeChild(a.sp); a.sp.destroy({texture:false});}catch(e){}
          return false;
        }
      }
      return true;
    });

    // 相手の落下アニメーション
    this._opFallAnims=this._opFallAnims.filter(a=>{
      a.progress=Math.min(a.progress+0.12,1);
      const t=a.progress;
      const eased=1-Math.pow(1-t,3);
      a.sp.y=a.fromY+(a.toY-a.fromY)*eased;
      if(t>0.88){
        const sq=(t-0.88)/0.12;
        a.sp.scale.x=1+sq*0.22;
        a.sp.scale.y=1-sq*0.18;
      }
      if(t>=1){
        try{a.cont.removeChild(a.sp); a.sp.destroy({texture:false});}catch(e){}
        return false;
      }
      return true;
    });

    // パーティクル
    this._particles=this._particles.filter(p=>{
      p.life--;
      const ratio=p.life/p.maxLife;
      if(p.isRing){
        p.gfx.scale.set(1+(1-ratio)*4.5);
        p.gfx.alpha=ratio*0.8;
      } else if(p.isPuyoPop){
        // ぷよが膨らんで消える
        const sc=1+Math.sin((1-ratio)*Math.PI)*0.5;
        p.gfx.scale.set(sc);
        p.gfx.alpha=ratio*ratio;
      } else if(p.isShard){
        p.gfx.x+=p.vx; p.gfx.y+=p.vy; p.vy+=0.22;
        p.gfx.alpha=ratio*0.9;
        p.gfx.rotation+=0.15;
        p.gfx.scale.set(0.4+ratio*0.6);
      } else if(p.isTrail){
        p.gfx.alpha*=0.82;
      } else {
        p.gfx.x+=p.vx; p.gfx.y+=p.vy; p.vy+=0.28;
        p.gfx.alpha=ratio*0.85;
        p.gfx.scale.set(0.3+ratio*0.7);
      }
      if(p.life<=0||p.gfx.alpha<0.01){
        const cont=p.cont||this._particleLayer;
        try{cont.removeChild(p.gfx); p.gfx.destroy();}catch(e){}
        return false;
      }
      return true;
    });

    // 自分の連鎖テキストアニメ
    if(this._chainTxtShow){
      this._chainTxtTimer++;
      const t=this._chainTxtTimer;
      if(t<8)       this._chainTxt.scale.set(0.5+t*0.09);
      else if(t<25) this._chainTxt.scale.set(Math.max(1,1.3-t*0.012));
      else if(t<55) this._chainTxt.alpha=1-(t-25)/30;
      else          { this._chainTxt.alpha=0; this._chainTxtShow=false; }
    }

    // スクワッシュアニメ（着地後のぷよっとした変形）
    this._squashAnims=this._squashAnims.filter(a=>{
      a.timer++;
      const t=a.timer/a.maxTime;
      if(t<0.45){
        // 潰れ: 横に広がり縦に縮む
        const sq=Math.sin(t/0.45*Math.PI)*0.45;
        a.sp.scale.x=1+sq; a.sp.scale.y=1-sq*0.6;
      } else {
        // 戻り (overdamped spring)
        const r=(t-0.45)/0.55;
        const os=Math.sin(r*Math.PI)*0.12*(1-r);
        a.sp.scale.x=1+os; a.sp.scale.y=1-os*0.5;
      }
      if(a.timer>=a.maxTime){ a.sp.scale.set(1); return false; }
      return true;
    });

    // ゲームオーバーアニメ
    this._gameOverAnims=this._gameOverAnims.filter(a=>{
      if(a.isText){
        a.timer++;
        const t=a.timer;
        if(t<15){ a.gfx.scale.set(0.2+t/15*0.8); a.gfx.alpha=t/15; }
        else if(t<50){ a.gfx.scale.set(1+Math.sin((t-15)/35*Math.PI)*0.1); a.gfx.alpha=1; }
        else { a.gfx.alpha=1-(t-50)/30; }
        return a.timer<a.maxTimer;
      }
      if(a.isTetrisBoard){
        a.gfx.rotation=a.tilt;
        a.vy+=0.1;
        a.gfx.y+=a.vy;
        a.gfx.alpha=Math.max(0,1-a.life/120);
        return --a.life>0;
      }
      if(a.isBoardFall){
        a.vy+=0.08;
        a.gfx.y=a.origY+a.vy;
        a.gfx.alpha=Math.max(0,1-a.life/120);
        return --a.life>0;
      }
      if(a.isAllClear){
        a.timer++;
        const t=a.timer;
        // Spin
        a.gfx.rotation+=0.06;
        // Scale: grow then shrink
        if(t<20) a.gfx.scale.set(0.3+t/20*0.7);
        else a.gfx.scale.set(1-Math.min(1,(t-20)/60)*0.3);
        // Fade out
        a.gfx.alpha=t<20?1:Math.max(0,1-(t-20)/60);
        if(a.bg){
          a.bg.scale.x=a.gfx.scale.x;
          a.bg.scale.y=a.gfx.scale.y;
          a.bg.alpha=a.gfx.alpha;
        }
        if(t>=80){
          try{this._particleLayer.removeChild(a.gfx);a.gfx.destroy();if(a.bg){try{this._particleLayer.removeChild(a.bg);a.bg.destroy();}catch(e){}}}catch(e){}
          return false;
        }
        return true;
      }
      if(a.delay>0){ a.delay--; return true; }
      a.life--;
      const ratio=a.life/a.maxLife;
      a.sp.x+=a.vx; a.sp.y+=a.vy; a.vy+=0.25;
      a.sp.rotation+=a.rot;
      a.sp.alpha=ratio*0.9;
      a.sp.scale.set(0.3+ratio*0.7);
      if(a.life<=0){
        try{this._particleLayer.removeChild(a.sp); a.sp.destroy({texture:false});}catch(e){}
        return false;
      }
      return true;
    });

    // Tetris相手のSink + Piece補間
    for(const pid in this.opPuyoData){
      const d=this.opPuyoData[pid];
      if(!d._isTetrisBoard||!d._cont||d.dead)continue;
      if(d.sinkOffset){
        d.sinkOffset*=0.92;
        if(d.sinkOffset<0.3)d.sinkOffset=0;
        d._cont.y=(this._opBY||0)+d.sinkOffset;
      }
      // Piece Y position smooth interpolation
      if(d.currentPiece&&d._pieceLerpTargetY!==undefined){
        d._pieceLerpY+=(d._pieceLerpTargetY-d._pieceLerpY)*0.25;
        if(Math.abs(d._pieceLerpTargetY-d._pieceLerpY)<0.1)d._pieceLerpY=d._pieceLerpTargetY;
        d.currentPiece.y=Math.round(d._pieceLerpY);
      }
    }

    // コンボテキストアニメ
    if(this._comboTxt&&this._comboTxt.alpha>0){
      this._comboTimer++;
      const t=this._comboTimer;
      if(t<10)      { this._comboTxt.scale.set(0.3+t/10*0.8); this._comboTxt.y=this._bH*0.3-t*1.5; }
      else if(t<35) { this._comboTxt.scale.set(1+Math.sin((t-10)/25*Math.PI)*0.15); }
      else if(t<65) { this._comboTxt.alpha=1-(t-35)/30; }
      else          { this._comboTxt.alpha=0; }
    }
    // スコア更新
    if(this._scoreTxt&&this.game) this._scoreTxt.text=this.game.score.toLocaleString();
    // 経過時間
    if(this._elapsedTxt&&this.game){
      const sec=Math.floor((performance.now()-this.game.startTime)/1000);
      const m=Math.floor(sec/60);const s=sec%60;
      this._elapsedTxt.text=m+':'+(s<10?'0':'')+s;
    }
    // コンボ表示（chain=0時に_comboTxtが消えていたらgameから再表示）
    if(this._comboTxt&&this.game&&this.game.comboCount>=2&&this._comboTxt.alpha===0){
      this._comboTxt.text=`${this.game.comboCount} COMBO!`;
      this._comboTxt.alpha=1;
      this._comboTxt.scale.set(0.3);
      this._comboTxt.y=this._bH*0.3;
      this._comboTimer=0;
    }

    // 相手の連鎖テキストアニメ
    for(const pid in this.opPuyoData){
      const d=this.opPuyoData[pid];
      if(d._chainAnim&&d._chainAnim.show&&d._chainTxt){
        d._chainAnim.timer++;
        const t=d._chainAnim.timer;
        if(t<8)       d._chainTxt.scale.set(0.5+t*0.09);
        else if(t<25) d._chainTxt.scale.set(Math.max(1,1.3-t*0.012));
        else if(t<55) d._chainTxt.alpha=1-(t-25)/30;
        else          { d._chainTxt.alpha=0; d._chainAnim.show=false; }
      }
      if(d._comboAnim&&d._comboAnim.show&&d._comboTxt){
        d._comboAnim.timer++;
        const t=d._comboAnim.timer;
        if(t<8)       d._comboTxt.scale.set(0.5+t*0.09);
        else if(t<25) d._comboTxt.scale.set(Math.max(1,1.3-t*0.012));
        else if(t<55) d._comboTxt.alpha=1-(t-25)/30;
        else          { d._comboTxt.alpha=0; d._comboAnim.show=false; }
      }
    }

    // プロジェクタイルアニメ
    if(this._projectiles){
      this._projectiles=this._projectiles.filter(p=>{
        p.f++;
        const t=p.f/p.frames;
        const te=t*t*t;
        const cx=p.sx+p.dx*te;
        const cy=p.sy+p.dy*te;
        p.cont.x=cx;p.cont.y=cy;
        // Puyo wobble + fade in-out
        const wobble=1+0.08*Math.sin(p.f*0.5);
        p.cont.scale.set(wobble);
        p.puyoGfx.alpha=0.4+0.3*Math.sin(p.f*0.08);
        p.aura.alpha=0.2+0.3*(1-t);
        p.aura.scale.set(1+(1-t)*0.5);
        // Trail particles
        if(p.f%3===0){
          const tg=new PIXI.Graphics();
          const trailAlpha=0.3*(1-t);
          tg.beginFill(p.puyoColor,trailAlpha);
          tg.drawCircle(0,0,p.pSize*0.25);
          tg.endFill();
          tg.x=cx;tg.y=cy;
          this._particleLayer.addChild(tg);
          this._particles.push({gfx:tg,vx:0,vy:0,life:trailAlpha*10,decay:0.15});
        }
        if(p.f>=p.frames){
          const n=10;
          for(let i=0;i<n;i++){
            const g=new PIXI.Graphics();g.beginFill(p.puyoColor,1);
            const sz=Math.random()*4+1;
            g.drawCircle(0,0,sz);
            g.endFill();
            g.x=cx;g.y=cy;this._particleLayer.addChild(g);
            const a=Math.random()*Math.PI*2;
            const spd=2+Math.random()*5;
            this._particles.push({gfx:g,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-2,life:0.5+Math.random()*0.3,decay:0.025+Math.random()*0.015});
          }
          try{p.cont.destroy({children:true});}catch(e){}
          return false;
        }
        return true;
      });
    }

    // 盤面沈み込み (設置/おじゃま落下時)
    if(this._sinkOffset>0.3){
      this._sinkOffset*=0.88;
      this._myBoardCont.y=(this._myBY||0)+this._sinkOffset;
    } else if(this._sinkOffset>0){
      this._sinkOffset=0;
      this._myBoardCont.y=this._myBY||0;
    }

    // 画面揺れ
    if(this._shakePower>0.1){
      this._shakePower*=0.82;
      const angle=Math.random()*Math.PI*2;
      this.root.x=Math.cos(angle)*this._shakePower;
      this.root.y=Math.sin(angle)*this._shakePower;
    } else {
      this.root.x=0; this.root.y=0; this._shakePower=0;
    }

    this.drawAll();
  }

  onGameOver(){}

  // ─── Tetris opponent updates (cross-mode: Tetris player viewed in Puyo mode) ───
  _buildSingleOpBoard(pid, d){
    const{_sc:sc,_cell:cell}=this;
    // Tetris board (10 cols) gets smaller cells to fit same slot width as Puyo (6 cols)
    const baseCell=Math.floor(cell*(this._is1v1?1:0.48));
    const opCell=d._isTetrisBoard?Math.floor(6*baseCell/10):baseCell;
    // Find next x position
    let ox=this._opBX;
    for(const pid2 in this.opPuyoData){
      const d2=this.opPuyoData[pid2];
      if(d2._cont) ox+=d2._bW+Math.floor(this._is1v1?0:10*sc);
    }
    const cont=new PIXI.Container(); cont.x=ox; cont.y=this._opBY;
    this.root.addChild(cont);
    const actualCols = d._isTetrisBoard ? 10 : PUYO_COLS;
    // Tetris board: show all 20 visible rows by using smaller cells to fit the same height as 12 Puyo rows
    const tetrisDisplayRows = d._isTetrisBoard ? 20 : 12;
    const opBW_actual = actualCols * opCell;
    const opBH = tetrisDisplayRows * opCell;
    // 背景
    const bg=new PIXI.Graphics();
    bg.beginFill(0x030912,0.95); bg.drawRect(0,0,opBW_actual,opBH); bg.endFill();
    bg.lineStyle(this._is1v1?2:1,0x00f5ff,this._is1v1?0.5:0.3);
    bg.drawRect(0,0,opBW_actual,opBH);
    if(this._is1v1){
      bg.lineStyle(0.5,0x00f5ff,0.1);
      for(let r2=1;r2<12;r2++){bg.moveTo(0,r2*opCell);bg.lineTo(opBW_actual,r2*opCell);}
      for(let c2=1;c2<actualCols;c2++){bg.moveTo(c2*opCell,0);bg.lineTo(c2*opCell,opBH);}
    }
    cont.addChild(bg);
    // セルスプライト
    const cellSp=[];
    for(let r=0;r<12;r++){
      cellSp[r]=[];
      for(let c=0;c<actualCols;c++){
        const sp=new PIXI.Sprite(PIXI.Texture.EMPTY);
        sp.anchor.set(0.5); sp.visible=false;
        sp.x=c*opCell+opCell/2; sp.y=r*opCell+opCell/2;
        cont.addChild(sp);
        cellSp[r][c]=sp;
      }
    }
    let tetrisGfx=null;
    if(d._isTetrisBoard){
      tetrisGfx=new PIXI.Graphics();
      cont.addChild(tetrisGfx);
    }
    const curSp=[new PIXI.Sprite(PIXI.Texture.EMPTY),new PIXI.Sprite(PIXI.Texture.EMPTY)];
    curSp.forEach(sp=>{sp.anchor.set(0.5);sp.visible=false;cont.addChild(sp);});
    const nameTxt=new PIXI.Text((d.name||'').toUpperCase().substring(0,8),new PIXI.TextStyle({
      fontFamily:'Orbitron,sans-serif',fontSize:Math.floor(10*sc*(this._is1v1?1:0.75)),fill:0x00f5ff
    }));
    nameTxt.anchor.set(0.5); nameTxt.x=opBW_actual/2; nameTxt.y=-Math.floor(16*sc);
    cont.addChild(nameTxt);
    const chainTxt=new PIXI.Text('',new PIXI.TextStyle({
      fontFamily:'Orbitron,sans-serif',fontSize:Math.floor(16*sc*(this._is1v1?1:0.6)),fill:0xffff00,
      stroke:0x000000,strokeThickness:3
    }));
    chainTxt.anchor.set(0.5); chainTxt.x=opBW_actual/2; chainTxt.y=opBH/2; chainTxt.alpha=0;
    cont.addChild(chainTxt);
    const gaugeGfx=new PIXI.Graphics(); gaugeGfx.x=-Math.floor(8*sc);
    cont.addChild(gaugeGfx);
    d._cont=cont; d._cellSp=cellSp; d._curSp=curSp;
    d._tetrisGfx=tetrisGfx; d._chainTxt=chainTxt; d._gaugeGfx=gaugeGfx;
    d._cell=opCell; d._bW=opBW_actual; d._bH=opBH;
  }

  onOpponentUpdate(id, data){
    let d=this.opPuyoData[id];
    if(!d){
      // New opponent: create as Tetris
      this.opPuyoData[id]={
        board:null,current:null,currentPiece:null,nextQueue:[],ojamaQueue:0,name:id,chain:0,
        _isTetrisBoard:true
      };
      d=this.opPuyoData[id];
      this._buildSingleOpBoard(id, d);
    } else if(!d._isTetrisBoard){
      // Was wrongly initialized as Puyo — rebuild as Tetris
      d._isTetrisBoard=true;
      // Destroy old container
      if(d._cont){ try{this.root.removeChild(d._cont); d._cont.destroy({children:true});}catch(e){} }
      delete d._cont; delete d._cellSp; delete d._curSp; delete d._tetrisGfx; delete d._chainTxt; delete d._gaugeGfx;
      this._buildSingleOpBoard(id, d);
    }
    if(data.board!==undefined) d.board=data.board;
    if(data.currentPiece!==undefined){
      if(!d._pieceLerpY)d._pieceLerpY=data.currentPiece.y;
      else d._pieceLerpTargetY=data.currentPiece.y;
      d.currentPiece=data.currentPiece;
    }
    if(data.garbageLines!==undefined){
      d.garbageLines=data.garbageLines;
      d.ojamaQueue=data.garbageLines*2; // テトリスライン→おじゃま個数換算
    }
    if(data.garbageQueue!==undefined){
      d.garbageQueue=data.garbageQueue;
      const totalLines=data.garbageQueue.reduce((s,item)=>s+item.lines,0);
      d.ojamaQueue=totalLines*2;
    }
    // Sink animation on line clear or hard drop
    if(d._isTetrisBoard&&!d.dead){
      const prevPiece=d.currentPiece;
      if(prevPiece&&data.currentPiece&&
         data.currentPiece.y<prevPiece.y-2&&
         data.currentPiece.type!==prevPiece.type){
        if(!d.sinkOffset)d.sinkOffset=0;
        d.sinkOffset=Math.min(d.sinkOffset+7,12);
      }
      if(data.garbageLines&&data.garbageLines>0){
        if(!d.sinkOffset)d.sinkOffset=0;
        d.sinkOffset=Math.max(d.sinkOffset,8);
      }
      if(d.sinkOffset){
        d.sinkOffset*=0.92;
        if(d.sinkOffset<0.3)d.sinkOffset=0;
      }
      if(d._cont) d._cont.y=(this._opBY||0)+(d.sinkOffset||0);
    }
  }

  _getClearRowsCenterY(cleared){
    return this._myBY+this._bH/2;
  }

  // ─── Attack projectile (puyo flying to opponent on chain clear) ───
  onAttackProjectile(toId, attack, launchY){
    const d=this.opPuyoData[toId];
    if(!d||!d._cont)return;
    const tx=d._cont.x+d._bW/2;
    const ty=d._cont.y+d._bH/2;
    const{_myBX:bx,_myBY:by,_cell:cell}=this;
    // Fire from cleared puyo positions if available, else from board center
    const cells=this._lastPopCells||[];
    if(cells.length>0){
      // Fire multiple small projectiles from each cell
      const perCell=Math.ceil(attack/cells.length);
      for(const[r,c]of cells.slice(0,Math.min(cells.length,attack*2))){
        const sx=bx+c*cell+cell/2;
        const sy=by+(r-1)*cell+cell/2;
        this._spawnPuyoProjectile(sx,sy,tx,ty,0x00f5ff,Math.max(1,perCell));
      }
    } else {
      const sx=bx+this._bW/2;
      const sy=launchY!==undefined?launchY:by+this._bH/2;
      this._spawnPuyoProjectile(sx,sy,tx,ty,0x00f5ff,attack);
    }
    try{SFX.attack();}catch(e){}
  }

  _spawnPuyoProjectile(sx,sy,tx,ty,color,power){
    if(!this._projLayer){this._projLayer=new PIXI.Container();this.root.addChild(this._projLayer);}
    const cont=new PIXI.Container();cont.x=sx;cont.y=sy;this._projLayer.addChild(cont);
    // Semi-transparent puyo as the projectile
    const puyoColor=power>3?0xff006e:(power>1?0xff8800:0x00f5ff);
    const pSize=8+Math.min(power*2,14);
    const puyoGfx=new PIXI.Graphics();
    puyoGfx.beginFill(puyoColor,0.6);
    puyoGfx.drawCircle(0,0,pSize);
    puyoGfx.endFill();
    puyoGfx.beginFill(0xffffff,0.25);
    puyoGfx.drawCircle(-pSize*0.2,-pSize*0.2,pSize*0.4);
    puyoGfx.endFill();
    puyoGfx.alpha=0.7;
    cont.addChild(puyoGfx);
    // Glow aura
    const aura=new PIXI.Graphics();
    aura.beginFill(puyoColor,0.12);
    aura.drawCircle(0,0,pSize*1.8);
    aura.endFill();
    aura.alpha=0.5;
    cont.addChild(aura);
    const dx=tx-sx,dy=ty-sy;
    const dist=Math.sqrt(dx*dx+dy*dy);
    const frames=Math.round(35+Math.min(dist/30,15));
    if(!this._projectiles)this._projectiles=[];
    this._projectiles.push({cont,puyoGfx,aura,sx,sy,tx,ty,puyoColor,frames,f:0,power,pSize,dist,dx,dy});
  }

  // ─── Tetris opponent effects (cross-mode) ───
  triggerOpponentLineClear(id, count, spinType, isB2B, ren, allClear){
    const d=this.opPuyoData[id];
    if(!d||!d._cont||!d._isTetrisBoard)return;
    if(!d.sinkOffset)d.sinkOffset=0;
    const renScale=Math.min(ren||0,10)/10;
    if(count===1||count===2||count===3){
      d.sinkOffset=Math.max(d.sinkOffset,spinType?12+renScale*4:8+renScale*10);
    }
    if(count>=4||allClear)d.sinkOffset=Math.max(d.sinkOffset,18);
    if(allClear){
      const sc=this._sc||1;
      const txt=new PIXI.Text('ALL CLEAR!',new PIXI.TextStyle({
        fontFamily:'Orbitron,sans-serif',fontSize:Math.floor(64*sc),fill:0xffff88,
        stroke:0x000000,strokeThickness:8,fontWeight:'900',
        dropShadow:true,dropShadowColor:0xffaa00,dropShadowBlur:20
      }));
      txt.anchor.set(0.5);
      txt.x=d._cont.x+d._bW/2;
      txt.y=d._cont.y+d._bH*0.28;
      txt.scale.set(0.3);
      const bg=new PIXI.Graphics();
      bg.beginFill(0x000000,0.6);
      bg.drawRoundedRect(-txt.width/2-20,-txt.height/2-12,txt.width+40,txt.height+24,12);
      bg.endFill();
      bg.scale.set(0.3);
      this._particleLayer.addChild(bg);
      this._particleLayer.addChild(txt);
      this._gameOverAnims.push({gfx:txt,isAllClear:true,timer:0,life:80,bg});
    }
  }

  triggerOpponentSpin(id, spinType){
    // No tilt in Puyo view
  }

  opponentGameOver(id){
    const d=this.opPuyoData[id];
    if(!d||!d._cont)return;
    d.dead=true;

    const goTxt=new PIXI.Text('GAME OVER',new PIXI.TextStyle({
      fontFamily:'Orbitron,sans-serif',fontSize:Math.floor(14*this._sc),fill:0xff006e,
      stroke:0x000000,strokeThickness:4,fontWeight:'900'
    }));
    goTxt.anchor.set(0.5);
    goTxt.x=d._bW/2; goTxt.y=d._bH/2;
    goTxt.alpha=0;
    d._cont.addChild(goTxt);
    if(!this._gameOverAnims)this._gameOverAnims=[];
    this._gameOverAnims.push({gfx:goTxt,isText:true,timer:0,maxTimer:60});

    if(d._isTetrisBoard){
      // Tetris board: tilt slightly and fall straight down
      this._gameOverAnims.push({
        gfx:d._cont,isTetrisBoard:true,
        origX:d._cont.x,origY:d._cont.y,
        tilt:0.08*(Math.random()>0.5?1:-1),
        vy:0,life:120
      });
    } else {
      // Puyo board: scatter effect
      const cell=d._cell;
      const overlay=new PIXI.Graphics();
      overlay.beginFill(0x000000,0.7);
      overlay.drawRect(0,0,d._bW,d._bH);
      overlay.endFill();
      d._cont.addChild(overlay);
      d._cont.addChild(goTxt);
      if(d.board){
        for(let r=1;r<12;r++){
          for(let c=0;c<6;c++){
            const color=d.board[r]?.[c];if(!color)continue;
            const px=c*cell+cell/2, py=(r-1)*cell+cell/2;
            const sp=new PIXI.Sprite(this._getPuyoTex(color,cell));
            sp.anchor.set(0.5); sp.x=px; sp.y=py;
            const angle=Math.random()*Math.PI*2;
            const speed=2+Math.random()*5;
            d._cont.addChild(sp);
            const delay=Math.floor(Math.random()*20);
            this._gameOverAnims.push({
              sp,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-3,
              life:90,maxLife:90,delay,
              rot:(Math.random()-0.5)*0.25
            });
          }
        }
        setTimeout(()=>{ if(d._cont) d._cont.alpha=0; },500);
      }
    }
  }

  destroy(){
    // テクスチャキャッシュ解放
    for(const tex of this._texCache.values()) tex.destroy(true);
    this._texCache.clear();
    _puyoOnPop=null; _puyoOnFall=null; _puyoOnLock=null; _puyoOnSpawn=null; _puyoOnGameOver=null; _puyoOnHardDrop=null; _puyoOnLockTimer=null;
    try{this.app.stage.removeChild(this.root); this.root.destroy({children:true});}catch(e){}
  }
}

// ─── Socket handlers for puyo ───
socket.on('opponent_puyo_update',(data)=>{
  const{id,...rest}=data;
  // Puyo renderer
  if(renderer&&renderer.onOpponentPuyoUpdate) renderer.onOpponentPuyoUpdate(id, rest);

  // Tetris renderer: show puyo board in opponent slot
  if(renderer&&renderer.opBoardData&&renderer.opBoardData[id]){
    const d=renderer.opBoardData[id];
    d._isPuyo=true;
    if(rest.board){
      // Convert puyo board (row 0 hidden, rows 1-12) to tetris format
      const puyoVisible=rest.board.slice(1); // 12 rows
      const padRows=Math.max(0,ROWS-12);
      d.board=[
        ...Array.from({length:padRows},()=>Array(PUYO_COLS).fill(0)),
        ...puyoVisible.map(row=>row.map(c=>c===0?0:c===6?'G':['I','O','T','S','Z','J'][c-1]||'I'))
      ];
      d._puyoBoard=rest.board;
    }
    if(rest.current!==undefined){
      d.currentPiece=null; // hide tetris ghost for puyo opponent
      d._puyoCurrent=rest.current; // store puyo current pair for display
    }
    if(rest.ojamaQueue!==undefined){
      const totalOjama=rest.ojamaQueue;
      const lines=Math.ceil(totalOjama/6);
      d.garbageLines=lines;
      d.garbageQueue=[{lines,readyAt:performance.now()+1000}];
    }
    // Store chain/combo for display
    if(rest.chain!==undefined) d._puyoChain=rest.chain;
    if(rest.comboCount!==undefined) d._puyoCombo=rest.comboCount;
  }
});

socket.on('receive_puyo_ojama',({ojama})=>{
  if(puyoGameState&&puyoGameState.alive) puyoGameState.queueOjama(ojama);
});

// ─── initPuyoGame ───
function initPuyoGame(players, bagSeed){
  // Clear stale callbacks from previous renderer to avoid null renderer access
  _puyoOnPop=null; _puyoOnFall=null; _puyoOnLock=null; _puyoOnSpawn=null; _puyoOnGameOver=null; _puyoOnHardDrop=null; _puyoOnLockTimer=null;
  puyoGameState=new PuyoGame(bagSeed);
  const puyoRenderer=new PuyoRenderer(gameApp, players, puyoGameState);
  renderer=puyoRenderer;
  showDpad(false); // Puyo uses swipe, hide dpad
  setupPuyoInput();
  // モバイルON/OFFに関係なくタッチ操作を有効化
  _setupPuyoMobileOnContainer();

  let lastTime=performance.now();
  let lastEmit=0;
  gameApp.ticker.add(()=>{
    const now=performance.now();
    const dt=Math.min(now-lastTime,100); lastTime=now;
    if(puyoGameState&&puyoGameState.alive&&!puyoGameState.dropping) puyoGameState.update(dt);
    if(now-lastEmit>=80){ lastEmit=now; if(puyoGameState) puyoGameState._emitBoard(); }
    puyoRenderer.update(dt);
  });
}

// ─── Puyo mobile touch controls (Swipe based) ───
const _puyoTouchState = {
  active: false,
  startX: 0, startY: 0,
  lastX: 0, lastY: 0,
  moved: false, swipeHandled: false
};

function _setupPuyoMobileOnContainer(){
  const el=document.getElementById('pixi-container');
  if(!el)return;
  el.addEventListener('touchstart',_onPuyoTS,{passive:false});
  el.addEventListener('touchmove',_onPuyoTM,{passive:false});
  el.addEventListener('touchend',_onPuyoTE,{passive:false});
  el.addEventListener('touchcancel',_onPuyoTE,{passive:false});
}

function _onPuyoTS(e){
  if(!puyoGameState || !puyoGameState.alive) return;
  e.preventDefault();
  const t = e.touches[0];
  _puyoTouchState.active = true;
  _puyoTouchState.startX = t.clientX;
  _puyoTouchState.startY = t.clientY;
  _puyoTouchState.lastX = t.clientX;
  _puyoTouchState.lastY = t.clientY;
  _puyoTouchState.moved = false;
  _puyoTouchState.horizHandled = false;
  _puyoTouchState.vertHandled = false;
}

function _onPuyoTM(e){
  if(!_puyoTouchState.active || !puyoGameState || !puyoGameState.alive) return;
  e.preventDefault();
  const t = e.touches[0];
  const totalDX = t.clientX - _puyoTouchState.startX;
  const totalDY = t.clientY - _puyoTouchState.startY;
  const threshold = settings.swipeThreshold || 20;

  // 斜め入力を防ぐため、移動量の大きい軸のみ処理する
  if(Math.abs(totalDX) > Math.abs(totalDY)){
    // 左右スワイプ: 1ジェスチャーにつき1マスだけ
    if(Math.abs(totalDX) > threshold && !_puyoTouchState.horizHandled){
      const dir = totalDX > 0 ? 1 : -1;
      if(puyoGameState.move(dir)){
        _puyoTouchState.horizHandled = true;
        _puyoTouchState.moved = true;
      }
    }
  } else {
    // 下スワイプ (ハードドロップ)
    if(totalDY > threshold * 1.5 && !_puyoTouchState.vertHandled){
      _puyoTouchState.vertHandled = true;
      puyoGameState.hardDrop();
      _puyoTouchState.moved = true;
    }
    // 上スワイプ (回転)
    if(totalDY < -threshold * 1.5 && !_puyoTouchState.vertHandled){
      _puyoTouchState.vertHandled = true;
      puyoGameState.rotate(1);
      _puyoTouchState.moved = true;
    }
  }
}

function _onPuyoTE(e){
  if(!_puyoTouchState.active) return;
  if(!_puyoTouchState.moved && puyoGameState && puyoGameState.alive){
    puyoGameState.rotate(1);
  }
  _puyoTouchState.active = false;
}


function setupPuyoInput(){
  document.addEventListener('keydown',_puyoKey);
  document.addEventListener('keyup',_puyoKeyUp);
  document.addEventListener('visibilitychange',_onBlurReset);
  window.addEventListener('blur',_onBlurReset);
  _puyoDasTimers={};
}
function removePuyoInput(){
  document.removeEventListener('keydown',_puyoKey);
  document.removeEventListener('keyup',_puyoKeyUp);
  document.removeEventListener('visibilitychange',_onBlurReset);
  window.removeEventListener('blur',_onBlurReset);
  Object.values(_puyoDasTimers).forEach(t=>{clearTimeout(t.das);clearInterval(t.arr);});
  _puyoDasTimers={};
}
let _puyoDasTimers={};
function _puyoStartDas(key,action,interval){
  if(_puyoDasTimers[key]){_puyoDasTimers[key].active=false;clearTimeout(_puyoDasTimers[key].das);clearInterval(_puyoDasTimers[key].arr);}
  const dasDelay=settings.dasDelay??170;
  const arrInterval=interval??settings.arrInterval??50;
  // DCD: 直前のDASからの経過時間が短ければ待つ
  const dcdMs=settings.dcdDelay||0;
  const elapsed=performance.now()-(_puyoDasStartAt||0);
  const dcdWait=Math.max(0,dcdMs-elapsed);
  action();
  const entry={active:true,das:null,arr:null};
  entry.das=setTimeout(()=>{
    if(!entry.active)return;
    if(arrInterval===0){while(entry.active&&action());entry.active=false;clearInterval(entry.arr);clearTimeout(entry.das);return;}
    entry.arr=setInterval(()=>{
      if(!entry.active)return;
      action();
    },arrInterval);
  },dasDelay+dcdWait);
  _puyoDasTimers[key]=entry;
  _puyoDasStartAt=performance.now();
}
let _puyoDasStartAt=0;
function _puyoStopDas(key){
  const t=_puyoDasTimers[key];
  if(t){t.active=false;clearTimeout(t.das);clearInterval(t.arr);delete _puyoDasTimers[key];}
}
function _puyoKeyUp(e){
  switch(e.code){
    case'ArrowLeft':case'ArrowRight':_puyoStopDas(e.code);break;
    case'ArrowUp':case'KeyX':_puyoStopDas('rot');break;
  }
}
function _puyoKey(e){
  if(!puyoGameState||!puyoGameState.alive)return;
  if(e.repeat)return;
  if(e.code.startsWith('Arrow')||['Space','KeyX','KeyZ','KeyA','KeyC','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();
  switch(e.code){
    case'ArrowLeft':_puyoStartDas(e.code,()=>puyoGameState.move(-1));break;
    case'ArrowRight':_puyoStartDas(e.code,()=>puyoGameState.move(1));break;
    case'ArrowDown':puyoGameState.hardDrop();break;
    case'Space':puyoGameState.hardDrop();break;
    case'ArrowUp':case'KeyX':_puyoStartDas('rot',()=>puyoGameState.rotate(1));break;
    case'KeyZ':puyoGameState.rotate(-1);break;
  }
}


// ===== ズーム全対策 =====
(function(){
  let lastTap = 0;
  document.addEventListener('touchstart', function(e){
    const now = Date.now();
    if (now - lastTap < 300) e.preventDefault();
    lastTap = now;
  }, { passive: false });

  // ② ピンチズーム防止（2本指touchmove）
  document.addEventListener('touchmove', function(e){
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  // ③ Safari gestureイベント防止
  document.addEventListener('gesturestart',  function(e){ e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturechange', function(e){ e.preventDefault(); }, { passive: false });
  document.addEventListener('gestureend',    function(e){ e.preventDefault(); }, { passive: false });
})();

document.addEventListener('DOMContentLoaded',()=>{
  loadSettings();
  document.getElementById('ghost-opacity').value=settings.ghostOpacity;
  document.getElementById('ghost-val').textContent=settings.ghostOpacity+'%';
  const ooEl=document.getElementById('overlay-opacity');
  const ooValEl=document.getElementById('overlay-opacity-val');
  if(ooEl)ooEl.value=settings.overlayOpacity!==undefined?settings.overlayOpacity:33;
  if(ooValEl)ooValEl.textContent=(settings.overlayOpacity!==undefined?settings.overlayOpacity:33)+'%';
  document.getElementById('quality-select').value=settings.quality;
  document.getElementById('quality-val').textContent=settings.quality==='minimum'?'MINIMUM':settings.quality==='ultra'?'ULTRA':settings.quality.toUpperCase();
  document.getElementById('particles-select').value=settings.particles;
  document.getElementById('shake-select').value=settings.shake;
  document.getElementById('sfx-volume').value=settings.sfxVolume;
  document.getElementById('sfx-val').textContent=settings.sfxVolume+'%';
  document.getElementById('tilt-select').value=settings.tilt;
  // ソフトドロップ速度
  const sdi=document.getElementById('soft-drop-interval');
  const sdv=document.getElementById('soft-drop-val');
  if(sdi)sdi.value=settings.softDropInterval??50;
  if(sdv)sdv.textContent=settings.softDropInterval===0?'INSTANT':(settings.softDropInterval??50)+'ms';
  // DAS / ARR
  const dasDel=document.getElementById('das-delay-input');
  const dasDelV=document.getElementById('das-delay-val');
  if(dasDel)dasDel.value=settings.dasDelay??133;
  if(dasDelV)dasDelV.textContent=(settings.dasDelay??133)+'ms';
  const arrInt=document.getElementById('arr-interval-input');
  const arrIntV=document.getElementById('arr-interval-val');
  if(arrInt)arrInt.value=settings.arrInterval??20;
  if(arrIntV)arrIntV.textContent=(settings.arrInterval??20)+'ms';
  const dcdDel=document.getElementById('dcd-delay-input');
  const dcdDelV=document.getElementById('dcd-delay-val');
  if(dcdDel)dcdDel.value=settings.dcdDelay||0;
  if(dcdDelV)dcdDelV.textContent=(settings.dcdDelay||0)+'ms';
  sfxVol=settings.sfxVolume/100;
  document.getElementById('chat-input').addEventListener('keydown',e=>{if(e.key==='Enter')sendChat();});
  document.getElementById('gl-join-id-input').addEventListener('keydown',e=>{if(e.key==='Enter')glJoinRoom();});
  document.getElementById('gl-room-id-input').addEventListener('keydown',e=>{if(e.key==='Enter')glCreateRoom();});

  const saved=getSavedName();
  const inp=document.getElementById('name-modal-input');
  if(saved)inp.value=saved;
  inp.focus();
  inp.addEventListener('keydown',e=>{if(e.key==='Enter')submitNameModal();});

  // Restore mobile controls preference
  try{
    const mc=document.cookie.split(';').find(c=>c.trim().startsWith('tetrix_mobile='));
    if(mc&&mc.split('=')[1].trim()==='1'){
      mobileControlsEnabled=true;
      const btn=document.getElementById('mobile-toggle-btn');
      btn.innerHTML='📱 MOBILE<br>ON';btn.classList.add('on');
      setupMobileControls();
    }
  }catch(e){}
  // Apply saved dpad layout
  applyDpadLayout();
  // UIレイアウト設定の初期化
  const ul=settings.uiLayout||{};
  const bOffY=document.getElementById('board-offset-y');
  const bOffYv=document.getElementById('board-offset-y-val');
  const bSc=document.getElementById('board-scale');
  const bScv=document.getElementById('board-scale-val');
  const sOffY=document.getElementById('side-ui-offset-y');
  const sOffYv=document.getElementById('side-ui-offset-y-val');
  const sFsc=document.getElementById('side-ui-font-scale');
  const sFscv=document.getElementById('side-ui-font-scale-val');
  if(bOffY)bOffY.value=ul.boardOffsetY||0;
  if(bOffYv)bOffYv.textContent=(ul.boardOffsetY||0)+'px';
  if(bSc)bSc.value=ul.boardScale||100;
  if(bScv)bScv.textContent=(ul.boardScale||100)+'%';
  if(sOffY)sOffY.value=ul.sideUiOffsetY||0;
  if(sOffYv)sOffYv.textContent=(ul.sideUiOffsetY||0)+'px';
  if(sFsc)sFsc.value=ul.sideUiFontScale||100;
  if(sFscv)sFscv.textContent=(ul.sideUiFontScale||100)+'%';

  // ダブルタップ拡大・ピンチ拡大を完全ブロック
  let _lastTap = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - _lastTap < 300) e.preventDefault();
    _lastTap = now;
  }, { passive: false });
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });
  document.addEventListener('gesturestart',  (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gestureend',    (e) => e.preventDefault(), { passive: false });
});