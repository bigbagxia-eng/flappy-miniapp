// ===================== Canvas / DPR =====================
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d", { alpha: false });

const W = 360;
const H = 640;

function applyDPR() {
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
}
applyDPR();
window.addEventListener("resize", applyDPR);

// ===================== UI Elements =====================
const hud = document.getElementById("hud");
const btnPause = document.getElementById("btnPause");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const coinsTopEl = document.getElementById("coinsTop");
const coinsHudEl = document.getElementById("coinsHud");

const screenMenu = document.getElementById("screenMenu");
const screenSettings = document.getElementById("screenSettings");
const screenShop = document.getElementById("screenShop");
const screenGameOver = document.getElementById("screenGameOver");

const btnMenuPlay = document.getElementById("btnMenuPlay");
const btnMenuSettings = document.getElementById("btnMenuSettings");
const btnMenuShop = document.getElementById("btnMenuShop");

const btnBackFromSettings = document.getElementById("btnBackFromSettings");
const btnBackFromShop = document.getElementById("btnBackFromShop");

const musicSlider = document.getElementById("musicSlider");
const sfxSlider = document.getElementById("sfxSlider");
const musicVal = document.getElementById("musicVal");
const sfxVal = document.getElementById("sfxVal");
const btnMute = document.getElementById("btnMute");

const btnOpenCase = document.getElementById("btnOpenCase");
const rouletteWrap = document.getElementById("rouletteWrap");
const rouletteStrip = document.getElementById("rouletteStrip");
const dropResult = document.getElementById("dropResult");
const btnEquipSkin = document.getElementById("btnEquipSkin");
const inventoryEl = document.getElementById("inventory");

const goTitle = document.getElementById("goTitle");
const goText  = document.getElementById("goText");
const btnRestart = document.getElementById("btnRestart");
const btnBackToMenu = document.getElementById("btnBackToMenu");

// ===================== Storage helpers =====================
function jget(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || ""); } catch { return fallback; }
}
function jset(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

function clamp(x,a,b){ return Math.max(a, Math.min(b,x)); }
function lerp(a,b,k){ return a + (b-a)*k; }
function rand(a,b){ return a + Math.random()*(b-a); }
function rgba(r,g,b,a){ return `rgba(${r|0},${g|0},${b|0},${a})`; }

// ===================== Economy =====================
const ECON = {
  coins: Number(localStorage.getItem("coins") || 0),
  caseCost: 10,
  rewardEvery: 10,    // колонн
  rewardCoins: 5
};

function setCoins(v){
  ECON.coins = Math.max(0, Math.floor(v));
  localStorage.setItem("coins", String(ECON.coins));
  coinsTopEl.textContent = `🪙 ${ECON.coins}`;
  coinsHudEl.textContent = `🪙 ${ECON.coins}`;
  btnOpenCase.disabled = ECON.coins < ECON.caseCost;
}
setCoins(ECON.coins);

// ===================== Skins / Rarity =====================
const RARITY = {
  common:   { name:"Обычное",   color:"#a9adb5", glow:"rgba(169,173,181,.35)" },
  elite:    { name:"Элитное",   color:"#2fd06e", glow:"rgba(47,208,110,.35)" },
  rare:     { name:"Редкое",    color:"#2b7bff", glow:"rgba(43,123,255,.35)" },
  epic:     { name:"Эпик",      color:"#b04bff", glow:"rgba(176,75,255,.35)" },
  legend:   { name:"Легендар",  color:"#f2c94c", glow:"rgba(242,201,76,.35)" },
  mythic:   { name:"Мифическ",  color:"#ff3b3b", glow:"rgba(255,59,59,.35)" },
};

// веса выпадения
const DROP_TABLE = [
  { rarity:"common",  weight: 600 },
  { rarity:"elite",   weight: 250 },
  { rarity:"rare",    weight: 110 },
  { rarity:"epic",    weight: 35  },
  { rarity:"legend",  weight: 4   },
  { rarity:"mythic",  weight: 1   },
];

// набор скинов (можешь потом расширять)
const SKINS = [
  { id:"default", name:"Default", rarity:"common",  a:"#ffffff", b:"#c8f0ff" },

  { id:"ash",     name:"Ash",     rarity:"common",  a:"#e5e7eb", b:"#9ca3af" },
  { id:"mint",    name:"Mint",    rarity:"elite",   a:"#b6ffda", b:"#21d07a" },
  { id:"ocean",   name:"Ocean",   rarity:"rare",    a:"#b8d7ff", b:"#2b7bff" },
  { id:"violet",  name:"Violet",  rarity:"epic",    a:"#e3c6ff", b:"#b04bff" },
  { id:"gold",    name:"Gold",    rarity:"legend",  a:"#fff1b8", b:"#f2c94c" },
  { id:"inferno", name:"Inferno", rarity:"mythic",  a:"#ffb3b3", b:"#ff3b3b" },
];

function skinById(id){ return SKINS.find(s=>s.id===id) || SKINS[0]; }

let inventory = jget("inventory", ["default"]);
if (!inventory.includes("default")) inventory.unshift("default");
jset("inventory", inventory);

let activeSkinId = localStorage.getItem("active_skin") || "default";
if (!inventory.includes(activeSkinId)) activeSkinId = "default";
localStorage.setItem("active_skin", activeSkinId);

// ===================== SOUND (vol in settings) =====================
const SND = { ctx:null, bufs:{}, ready:false, unlocked:false, muted:false, bgmSrc:null, bgmGain:null };
let musicVol = Number(localStorage.getItem("musicVol") || 100);
let sfxVol   = Number(localStorage.getItem("sfxVol") || 100);
let isMuted  = (localStorage.getItem("muted") === "1");

function refreshSettingsUI(){
  musicVol = clamp(musicVol,0,100);
  sfxVol   = clamp(sfxVol,0,100);
  musicSlider.value = String(musicVol);
  sfxSlider.value = String(sfxVol);
  musicVal.textContent = `${musicVol}%`;
  sfxVal.textContent = `${sfxVol}%`;
  btnMute.textContent = isMuted ? "🔇 Звук: ВЫКЛ" : "🔊 Звук: ВКЛ";
}
refreshSettingsUI();

const VOL = {
  flap: 0.45,
  score: 0.52,
  coin: 0.55,
  hit: 0.75,
  gameover: 0.62,
  newbest: 0.70,
};

async function sndInit(){
  if (SND.ready) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  SND.ctx = new AC();

  const files = {
    flap: "sounds/flap.mp3",
    bgm: "sounds/bgm.mp3",
    score: "sounds/score.mp3",
    newbest: "sounds/newbest.mp3",
    coin: "sounds/coin.mp3",
    hit: "sounds/hit.mp3",
    gameover: "sounds/gameover.mp3",
  };

  for (const [k,url] of Object.entries(files)){
    try{
      const r = await fetch(url);
      const a = await r.arrayBuffer();
      SND.bufs[k] = await SND.ctx.decodeAudioData(a);
    }catch(e){
      console.warn("sound fail", k);
    }
  }
  SND.ready = true;
}

function sndUnlock(){
  if (SND.ctx?.state === "suspended") SND.ctx.resume();
  SND.unlocked = true;
}

function sfxMult(){ return (isMuted ? 0 : (sfxVol/100)); }
function musicMult(){ return (isMuted ? 0 : (musicVol/100)); }

function sndPlay(name, baseVol){
  if (!SND.ready || !SND.unlocked) return;
  const buf = SND.bufs[name];
  if (!buf) return;

  const vol = baseVol * sfxMult();
  if (vol <= 0.0001) return;

  const src = SND.ctx.createBufferSource();
  const gain= SND.ctx.createGain();
  gain.gain.value = vol;
  src.buffer = buf;
  src.connect(gain);
  gain.connect(SND.ctx.destination);
  src.start(0);
}

function sndStartBgm(){
  if (!SND.ready || !SND.unlocked) return;
  if (SND.bgmSrc) return;
  const buf = SND.bufs.bgm;
  if (!buf) return;

  const src = SND.ctx.createBufferSource();
  const gain= SND.ctx.createGain();
  gain.gain.value = 0.22 * musicMult();

  src.buffer = buf;
  src.loop = true;
  src.connect(gain);
  gain.connect(SND.ctx.destination);
  src.start(0);

  SND.bgmSrc = src;
  SND.bgmGain = gain;
}

function sndUpdateBgmVol(){
  if (!SND.bgmGain) return;
  SND.bgmGain.gain.value = 0.22 * musicMult();
}

function sndStopBgm(){
  try{ SND.bgmSrc?.stop(); }catch{}
  SND.bgmSrc = null;
  SND.bgmGain = null;
}

function sndGameOverSeq(){
  sndPlay("hit", VOL.hit);
  setTimeout(()=> sndPlay("gameover", VOL.gameover), 220);
}

// ===================== Screens =====================
function hideAllScreens(){
  screenMenu.classList.add("hidden");
  screenSettings.classList.add("hidden");
  screenShop.classList.add("hidden");
  screenGameOver.classList.add("hidden");
}

function showMenu(){
  hideAllScreens();
  screenMenu.classList.remove("hidden");
  hud.classList.add("hud-hidden");
}

function showSettings(){
  hideAllScreens();
  screenSettings.classList.remove("hidden");
  hud.classList.add("hud-hidden");
}

function showShop(){
  hideAllScreens();
  screenShop.classList.remove("hidden");
  hud.classList.add("hud-hidden");
  renderInventory();
  btnOpenCase.disabled = ECON.coins < ECON.caseCost;
}

function showGameOver(title, text){
  hideAllScreens();
  screenGameOver.classList.remove("hidden");
  hud.classList.add("hud-hidden");
  goTitle.textContent = title;
  goText.textContent = text;
}

// ===================== Case / Roulette =====================
let spinning = false;
let lastDrop = null;

function weightedPickRarity(){
  const total = DROP_TABLE.reduce((s,x)=>s+x.weight,0);
  let r = Math.random()*total;
  for (const it of DROP_TABLE){
    r -= it.weight;
    if (r <= 0) return it.rarity;
  }
  return "common";
}

function pickSkin(){
  const rar = weightedPickRarity();
  const pool = SKINS.filter(s => s.rarity === rar && s.id !== "default");
  if (pool.length === 0) return SKINS[1];
  return pool[Math.floor(Math.random()*pool.length)];
}

function rarityLabel(r){
  return RARITY[r]?.name || r;
}

function buildRouletteItems(winnerSkin){
  // 45 items, winner at index 35
  const items = [];
  for (let i=0;i<45;i++){
    items.push(pickSkin());
  }
  const winIndex = 35;
  items[winIndex] = winnerSkin;
  return { items, winIndex };
}

function renderStrip(items){
  rouletteStrip.innerHTML = "";
  for (const s of items){
    const rar = RARITY[s.rarity];
    const el = document.createElement("div");
    el.className = "ritem";
    el.style.borderColor = rar.color;
    el.style.boxShadow = `0 0 18px ${rar.glow}`;
    el.innerHTML = `
      <div class="n">${s.name}</div>
      <div class="r" style="color:${rar.color}">${rarityLabel(s.rarity)}</div>
    `;
    rouletteStrip.appendChild(el);
  }
}

async function spinCase(){
  if (spinning) return;
  if (ECON.coins < ECON.caseCost) return;

  spinning = true;
  setCoins(ECON.coins - ECON.caseCost);

  rouletteWrap.classList.remove("hidden");
  dropResult.classList.add("hidden");
  btnEquipSkin.classList.add("hidden");

  // winner
  const winner = pickSkin();
  lastDrop = winner;

  // build strip
  const { items, winIndex } = buildRouletteItems(winner);
  renderStrip(items);

  // compute positions
  const itemW = 120;
  const gap = 10;
  const pad = 12;
  const centerX = 360/2; // marker at 50%
  const itemCenter = (idx) => pad + idx*(itemW+gap) + itemW/2;

  const startX = 0;
  const target = itemCenter(winIndex) - centerX; // translateX(-target)
  const overshoot = target + rand(120, 220);

  // animate
  rouletteStrip.style.transform = `translateX(${-startX}px)`;

  const t0 = performance.now();
  const dur1 = 2200;
  const dur2 = 900;

  function easeOutCubic(x){ return 1 - Math.pow(1-x,3); }
  function easeOutQuint(x){ return 1 - Math.pow(1-x,5); }

  await new Promise((resolve)=>{
    function step(now){
      const t = (now - t0);
      if (t < dur1){
        const k = easeOutCubic(t/dur1);
        const x = lerp(startX, overshoot, k);
        rouletteStrip.style.transform = `translateX(${-x}px)`;
        requestAnimationFrame(step);
        return;
      }
      const t1 = now;
      function step2(n2){
        const tt = (n2 - t1);
        if (tt < dur2){
          const k2 = easeOutQuint(tt/dur2);
          const x2 = lerp(overshoot, target, k2);
          rouletteStrip.style.transform = `translateX(${-x2}px)`;
          requestAnimationFrame(step2);
          return;
        }
        rouletteStrip.style.transform = `translateX(${-target}px)`;
        resolve();
      }
      requestAnimationFrame(step2);
    }
    requestAnimationFrame(step);
  });

  // add to inventory if new
  if (!inventory.includes(winner.id)){
    inventory.push(winner.id);
    jset("inventory", inventory);
  }

  // show result
  const rar = RARITY[winner.rarity];
  dropResult.classList.remove("hidden");
  dropResult.style.borderColor = rar.color;
  dropResult.style.boxShadow = `0 0 18px ${rar.glow}`;
  dropResult.innerHTML = `Выпало: <span style="color:${rar.color}">${winner.name}</span> — ${rarityLabel(winner.rarity)}`;

  btnEquipSkin.classList.remove("hidden");
  btnEquipSkin.textContent = `Надеть: ${winner.name}`;

  renderInventory();
  spinning = false;
}

function renderInventory(){
  inventoryEl.innerHTML = "";
  const ownedSkins = inventory.map(id => skinById(id)).filter(Boolean);

  for (const s of ownedSkins){
    const rar = RARITY[s.rarity];
    const el = document.createElement("div");
    el.className = "inv" + (s.id === activeSkinId ? " active" : "");
    el.style.borderColor = rar.color;
    el.style.boxShadow = `0 0 14px ${rar.glow}`;
    el.innerHTML = `
      <div class="name">${s.name}</div>
      <div class="tag" style="color:${rar.color}">${rarityLabel(s.rarity)}</div>
    `;
    el.onclick = () => {
      activeSkinId = s.id;
      localStorage.setItem("active_skin", activeSkinId);
      renderInventory();
    };
    inventoryEl.appendChild(el);
  }
}

// ===================== Game (Flappy) =====================
let running = false;
let paused = false;
let gameOver = false;

let score = 0;
let bestLocal = Number(localStorage.getItem("best_flappy") || 0);
bestEl.textContent = `BEST ${bestLocal}`;
scoreEl.textContent = "0";

const cfg = {
  g: 1750,
  flapV: -520,
  maxFall: 900,

  speed: 210,

  pipeW: 68,
  gap: 175,
  spawnEvery: 1.35,

  floorH: 86,
  ceilingPad: 18,

  grace: 0.85,

  dayNightPeriod: 34,
};

const bird = { x:108, y:H*0.48, v:0, r:14, flapPhase:0, rot:0 };
let pipes=[];
let spawnTimer=0;
let graceTimer=cfg.grace;

let particles=[];
let globalTime=0;

// background layers
const stars = makeStars(110);
const clouds = makeClouds(8);

function makeStars(n){
  const a=[];
  for(let i=0;i<n;i++) a.push({ x:Math.random()*W, y:Math.random()*(H*0.62), r:rand(0.6,1.8), tw:rand(0,10) });
  return a;
}
function makeClouds(n){
  const a=[];
  for(let i=0;i<n;i++) a.push({ x:Math.random()*W, y:rand(50,H*0.52), s:rand(0.6,1.35), sp:rand(8,18), a:rand(0.10,0.20) });
  return a;
}
function dayNightK(t){
  const p = (t % cfg.dayNightPeriod)/cfg.dayNightPeriod;
  return 0.5 - 0.5*Math.cos(p*Math.PI*2);
}
function roundRect(x,y,w,h,r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}
function circleRectHit(cx,cy,cr, rx,ry,rw,rh){
  const nx = Math.max(rx, Math.min(cx, rx+rw));
  const ny = Math.max(ry, Math.min(cy, ry+rh));
  const dx = cx-nx, dy=cy-ny;
  return dx*dx + dy*dy <= cr*cr;
}

function spawnPipe(){
  const topMin = cfg.ceilingPad + 40;
  const topMax = H - cfg.floorH - cfg.gap - 40;
  pipes.push({ x: W+40, topH: Math.floor(rand(topMin, topMax)), passed:false, wobble: rand(0,Math.PI*2) });
}

function startGame(){
  running=true; paused=false; gameOver=false;

  hud.classList.remove("hud-hidden");
  hideAllScreens();
  // menu screens hidden, but keep topbar visible (it is always)
  // (topbar stays)

  score=0; scoreEl.textContent="0";
  pipes=[]; particles=[]; spawnTimer=0; graceTimer=cfg.grace;

  bird.y=H*0.48; bird.v=0; bird.flapPhase=0; bird.rot=0;

  sndStartBgm();

  bird.v = cfg.flapV * 0.9;
  sndPlay("flap", VOL.flap);
}

function endGame(reason=""){
  if (gameOver) return;
  gameOver=true; running=false;

  hud.classList.add("hud-hidden");

  sndStopBgm();
  sndGameOverSeq();

  let isNewBest=false;
  if (score > bestLocal){
    bestLocal = score;
    localStorage.setItem("best_flappy", String(bestLocal));
    bestEl.textContent = `BEST ${bestLocal}`;
    isNewBest=true;
  }

  if (isNewBest){
    sndPlay("newbest", VOL.newbest);
    if (typeof tgSendBest === "function") tgSendBest(score, bestLocal);
    showGameOver("Новый рекорд! 🏆", `Счёт: ${score}\nРекорд отправлен в ТОП ✅`);
  } else {
    showGameOver("Game Over", `Счёт: ${score}\nЛучший: ${bestLocal}${reason ? "\n"+reason : ""}`);
  }
}

function flap(){
  if (!running || paused || gameOver) return;
  bird.v = cfg.flapV;
  bird.flapPhase = 0;
  sndPlay("flap", VOL.flap);

  for(let i=0;i<10;i++){
    particles.push({
      x: bird.x-12, y: bird.y + rand(-6,6),
      vx: rand(-90,-260), vy: rand(-70,70),
      life: rand(0.22,0.40), s: rand(1.5,2.8),
    });
  }
}

function update(dt){
  // animate background always (nice in menu)
  globalTime += dt * (running && !paused ? 1 : 0.35);

  // update bgm volume if sliders changed
  sndUpdateBgmVol();

  // menu-only updates: particles fade etc.
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.life -= dt;
    if (p.life<=0) particles.splice(i,1);
  }

  if (!running || paused || gameOver) return;

  if (graceTimer > 0) graceTimer -= dt;

  if (graceTimer <= 0){
    spawnTimer += dt;
    if (spawnTimer >= cfg.spawnEvery){
      spawnTimer = 0;
      spawnPipe();
    }
  }

  bird.v += cfg.g*dt;
  bird.v = Math.min(bird.v, cfg.maxFall);
  bird.y += bird.v*dt;

  const floorY = H - cfg.floorH;

  if (graceTimer <= 0 && bird.y + bird.r >= floorY){
    bird.y = floorY - bird.r;
    endGame("Упал на землю");
    return;
  }
  if (bird.y - bird.r <= cfg.ceilingPad){
    bird.y = cfg.ceilingPad + bird.r;
    bird.v = 0;
  }

  for(const p of pipes){
    p.x -= cfg.speed*dt;

    const wob = Math.sin(globalTime*1.3 + p.wobble)*1.8;
    const topH = p.topH + wob;

    if (!p.passed && p.x + cfg.pipeW < bird.x){
      p.passed = true;
      score += 1;
      scoreEl.textContent = String(score);

      sndPlay("score", VOL.score);

      // монеты за каждые 10 колонн
      if (score % ECON.rewardEvery === 0){
        setCoins(ECON.coins + ECON.rewardCoins);
        // (звук монеты включим позже, ты говорил)
        // sndPlay("coin", VOL.coin);
      }
    }

    if (graceTimer <= 0){
      if (circleRectHit(bird.x,bird.y,bird.r, p.x,0,cfg.pipeW,topH)){
        endGame("Врезался в трубу");
        return;
      }
      const by = topH + cfg.gap;
      const bh = (H - cfg.floorH) - by;
      if (circleRectHit(bird.x,bird.y,bird.r, p.x,by,cfg.pipeW,bh)){
        endGame("Врезался в трубу");
        return;
      }
    }
  }

  pipes = pipes.filter(p => p.x + cfg.pipeW > -40);

  // particles update
  for(const p of particles){
    p.x += p.vx*dt;
    p.y += p.vy*dt;
    p.vx *= (1-0.9*dt);
    p.vy *= (1-0.9*dt);
  }
}

function drawBackground(dt){
  const kDay = dayNightK(globalTime);

  const top = { r: lerp(10,70,kDay), g: lerp(16,160,kDay), b: lerp(40,255,kDay) };
  const bot = { r: lerp(8,110,kDay), g: lerp(12,200,kDay), b: lerp(24,255,kDay) };

  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0, `rgb(${top.r|0},${top.g|0},${top.b|0})`);
  g.addColorStop(1, `rgb(${bot.r|0},${bot.g|0},${bot.b|0})`);
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);

  const p = (globalTime % cfg.dayNightPeriod)/cfg.dayNightPeriod;
  const ang = (p*Math.PI*2) - Math.PI/2;
  const cx = W/2 + Math.cos(ang)*(W*0.33);
  const cy = H*0.33 + Math.sin(ang)*(H*0.22);

  const sunA = clamp((kDay-0.15)/0.85,0,1);
  if (sunA>0){
    const gg = ctx.createRadialGradient(cx,cy,10,cx,cy,120);
    gg.addColorStop(0, rgba(255,235,170,0.55*sunA));
    gg.addColorStop(1, rgba(255,235,170,0));
    ctx.fillStyle=gg; ctx.fillRect(0,0,W,H);

    ctx.beginPath(); ctx.fillStyle=rgba(255,244,210,0.9*sunA);
    ctx.arc(cx,cy,18,0,Math.PI*2); ctx.fill();
  }

  const moonA = clamp((0.85-kDay)/0.85,0,1);
  if (moonA>0){
    const gg = ctx.createRadialGradient(cx,cy,8,cx,cy,110);
    gg.addColorStop(0, rgba(180,200,255,0.30*moonA));
    gg.addColorStop(1, rgba(180,200,255,0));
    ctx.fillStyle=gg; ctx.fillRect(0,0,W,H);

    ctx.beginPath(); ctx.fillStyle=rgba(210,225,255,0.85*moonA);
    ctx.arc(cx,cy,14,0,Math.PI*2); ctx.fill();

    ctx.globalCompositeOperation="destination-out";
    ctx.beginPath(); ctx.arc(cx+6,cy-2,14,0,Math.PI*2); ctx.fill();
    ctx.globalCompositeOperation="source-over";
  }

  const starA = clamp((0.7-kDay)/0.7,0,1);
  if (starA>0){
    for(const s of stars){
      s.tw += dt*rand(0.6,1.2);
      const tw = 0.55 + 0.45*Math.sin(s.tw);
      ctx.fillStyle = rgba(230,240,255, starA*0.85*tw);
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
    }
  }

  ctx.fillStyle = rgba(255,255,255, lerp(0.06,0.12,kDay));
  ctx.fillRect(0, H*0.55, W, H*0.45);

  for(const c of clouds){
    c.x -= c.sp*dt;
    if (c.x < -160*c.s){ c.x = W + rand(40,200); c.y = rand(40,H*0.52); }
    drawCloud(c.x,c.y,c.s, c.a*lerp(0.9,1.2,kDay));
  }

  drawGround(kDay);
}

function drawCloud(x,y,s,a){
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(s,s);
  ctx.fillStyle = rgba(255,255,255,a);
  ctx.beginPath();
  ctx.ellipse(0,0,44,22,0,0,Math.PI*2);
  ctx.ellipse(-28,2,26,16,0,0,Math.PI*2);
  ctx.ellipse(24,4,30,18,0,0,Math.PI*2);
  ctx.ellipse(-4,-12,28,18,0,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawGround(kDay){
  const y = H - cfg.floorH;
  const gg = ctx.createLinearGradient(0,y,0,H);
  gg.addColorStop(0, rgba(8,12,20,0.55));
  gg.addColorStop(1, rgba(0,0,0,0.75));
  ctx.fillStyle=gg;
  roundRect(0,y,W,cfg.floorH,18); ctx.fill();

  ctx.fillStyle = rgba(170,255,220, lerp(0.08,0.22,kDay));
  ctx.fillRect(0,y+2,W,2);

  const t = globalTime*(cfg.speed*0.35);
  ctx.fillStyle = rgba(255,255,255,0.06);
  for(let i=0;i<14;i++){
    const x = (i*60 - (t%60))|0;
    ctx.fillRect(x, y+18, 30, 6);
  }
}

function drawPipes(){
  const kDay = dayNightK(globalTime);

  for(const p of pipes){
    const x = p.x;
    const wob = Math.sin(globalTime*1.3 + p.wobble)*1.8;
    const topH = p.topH + wob;

    const body = ctx.createLinearGradient(x,0,x+cfg.pipeW,0);
    body.addColorStop(0, rgba(30,255,200, lerp(0.16,0.28,kDay)));
    body.addColorStop(0.5, rgba(255,255,255, lerp(0.10,0.18,kDay)));
    body.addColorStop(1, rgba(30,255,200, lerp(0.10,0.20,kDay)));

    const cap = rgba(255,255,255, lerp(0.14,0.22,kDay));
    const outline = rgba(255,255,255, 0.14);

    ctx.fillStyle=body;
    roundRect(x,0,cfg.pipeW,topH,14); ctx.fill();
    ctx.strokeStyle=outline; ctx.lineWidth=1; ctx.stroke();

    ctx.fillStyle=cap;
    roundRect(x-3, topH-16, cfg.pipeW+6, 18, 12); ctx.fill();

    const by = topH + cfg.gap;
    const bh = (H - cfg.floorH) - by;

    ctx.fillStyle=body;
    roundRect(x,by,cfg.pipeW,bh,14); ctx.fill();
    ctx.strokeStyle=outline; ctx.lineWidth=1; ctx.stroke();

    ctx.fillStyle=cap;
    roundRect(x-3, by, cfg.pipeW+6, 18, 12); ctx.fill();
  }
}

function drawBird(dt){
  bird.flapPhase += dt*10;
  const targetRot = clamp(bird.v/900, -0.45, 0.9);
  bird.rot = lerp(bird.rot, targetRot, 0.12);

  const skin = skinById(activeSkinId);
  const kDay = dayNightK(globalTime);

  ctx.save();
  ctx.translate(bird.x,bird.y);
  ctx.rotate(bird.rot);

  const glow = ctx.createRadialGradient(0,0,6,0,0,40);
  glow.addColorStop(0, rgba(255,255,255,0.22));
  glow.addColorStop(1, rgba(255,255,255,0));
  ctx.fillStyle=glow;
  ctx.beginPath(); ctx.arc(0,0,38,0,Math.PI*2); ctx.fill();

  const body = ctx.createLinearGradient(-20,-10,20,18);
  body.addColorStop(0, skin.a);
  body.addColorStop(1, skin.b);
  ctx.fillStyle=body;

  ctx.beginPath(); ctx.ellipse(0,0,18,14,0,0,Math.PI*2); ctx.fill();

  const wingT = 0.5 + 0.5*Math.sin(bird.flapPhase);
  ctx.fillStyle = rgba(0,0,0,0.12);
  ctx.beginPath();
  ctx.ellipse(-3,3, lerp(10,14,wingT), lerp(6,10,wingT), -0.2, 0, Math.PI*2);
  ctx.fill();

  ctx.fillStyle = rgba(255,210,120,0.95);
  ctx.beginPath();
  ctx.moveTo(14,-1); ctx.lineTo(26,3); ctx.lineTo(14,7);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = rgba(0,0,0,0.45);
  ctx.beginPath(); ctx.arc(6,-4,3.1,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = rgba(255,255,255,0.55);
  ctx.beginPath(); ctx.arc(7,-5,1.2,0,Math.PI*2); ctx.fill();

  ctx.restore();
}

function drawParticles(dt){
  for(const p of particles){
    const a = clamp(p.life/0.45,0,1);
    ctx.fillStyle = rgba(255,255,255, 0.35*a);
    ctx.beginPath(); ctx.arc(p.x,p.y,p.s,0,Math.PI*2); ctx.fill();
  }
}

function draw(dt){
  drawBackground(dt);
  drawPipes();
  drawParticles(dt);
  drawBird(dt);

  const v = ctx.createRadialGradient(W/2,H/2, 80, W/2,H/2, 420);
  v.addColorStop(0, rgba(0,0,0,0));
  v.addColorStop(1, rgba(0,0,0,0.28));
  ctx.fillStyle=v;
  ctx.fillRect(0,0,W,H);

  if (running && graceTimer > 0){
    ctx.fillStyle = rgba(255,255,255,0.55);
    ctx.font = "900 16px system-ui";
    ctx.textAlign="center";
    ctx.fillText("GO!", W/2, 110);
  }
}

// ===================== Main Loop =====================
let lastT = performance.now();
function loop(now){
  let dt = (now - lastT)/1000;
  lastT = now;
  dt = Math.min(dt, 0.033);

  update(dt);
  draw(dt);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ===================== Controls =====================
async function unlockAudioIfNeeded(){
  if (!SND.ready) await sndInit().catch(()=>{});
  sndUnlock();
  sndUpdateBgmVol();
}

canvas.addEventListener("pointerdown", async ()=>{
  await unlockAudioIfNeeded();
  if (!running) return; // в меню клики по игре не запускают
  flap();
});

window.addEventListener("keydown", async (e)=>{
  if (e.code === "Space"){
    e.preventDefault();
    await unlockAudioIfNeeded();
    if (running) flap();
  }
  if (e.code === "KeyP") togglePause();
});

function togglePause(){
  if (!running || gameOver) return;
  paused = !paused;
  btnPause.textContent = paused ? "▶" : "⏸";
}

btnPause.addEventListener("click", togglePause);

// ===================== Menu Buttons =====================
btnMenuPlay.onclick = async () => {
  await unlockAudioIfNeeded();
  startGame();
};

btnMenuSettings.onclick = () => showSettings();
btnMenuShop.onclick = () => showShop();

btnBackFromSettings.onclick = () => showMenu();
btnBackFromShop.onclick = () => showMenu();

btnRestart.onclick = async () => {
  await unlockAudioIfNeeded();
  startGame();
};
btnBackToMenu.onclick = () => showMenu();

// ===================== Settings UI =====================
musicSlider.oninput = () => {
  musicVol = Number(musicSlider.value);
  localStorage.setItem("musicVol", String(musicVol));
  refreshSettingsUI();
  sndUpdateBgmVol();
};
sfxSlider.oninput = () => {
  sfxVol = Number(sfxSlider.value);
  localStorage.setItem("sfxVol", String(sfxVol));
  refreshSettingsUI();
};

btnMute.onclick = () => {
  isMuted = !isMuted;
  localStorage.setItem("muted", isMuted ? "1" : "0");
  refreshSettingsUI();
  sndUpdateBgmVol();
};

// ===================== Shop Buttons =====================
btnOpenCase.onclick = async () => {
  await unlockAudioIfNeeded();
  await spinCase();
};

btnEquipSkin.onclick = () => {
  if (!lastDrop) return;
  activeSkinId = lastDrop.id;
  localStorage.setItem("active_skin", activeSkinId);
  renderInventory();
};

// ===================== Boot =====================
renderInventory();
showMenu();
sndInit().catch(()=>{});
