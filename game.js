// ===================== Canvas / DPR =====================
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d", { alpha: false });

const W = 360;
const H = 640;

function applyDPR(){
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
}
applyDPR();
window.addEventListener("resize", applyDPR);

// ===================== UI =====================
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
const goText = document.getElementById("goText");
const btnRestart = document.getElementById("btnRestart");
const btnBackToMenu = document.getElementById("btnBackToMenu");

// ===================== Helpers =====================
function clamp(x,a,b){ return Math.max(a, Math.min(b,x)); }
function lerp(a,b,k){ return a + (b-a)*k; }
function rand(a,b){ return a + Math.random()*(b-a); }

function jget(key, fallback){
  try { return JSON.parse(localStorage.getItem(key) || ""); }
  catch { return fallback; }
}
function jset(key, val){
  localStorage.setItem(key, JSON.stringify(val));
}

// ===================== Economy =====================
const ECON = {
  coins: Number(localStorage.getItem("coins") || 0),
  caseCost: 10,
  rewardEvery: 10, // каждые N очков
  rewardCoins: 5,  // даём монет
  coinPickup: 1    // монет за физическую монетку
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
  common: { name:"Обычное",    color:"#a9adb5", glow:"rgba(169,173,181,.35)" },
  elite:  { name:"Элитное",    color:"#2fd06e", glow:"rgba(47,208,110,.35)" },
  rare:   { name:"Редкое",     color:"#2b7bff", glow:"rgba(43,123,255,.35)" },
  epic:   { name:"Эпик",       color:"#b04bff", glow:"rgba(176,75,255,.35)" },
  legend: { name:"Легендарное",color:"#f2c94c", glow:"rgba(242,201,76,.35)" },
  mythic: { name:"Мифическое", color:"#ff3b3b", glow:"rgba(255,59,59,.35)" },
};

const DROP_TABLE = [
  { rarity:"common", weight: 600 },
  { rarity:"elite",  weight: 250 },
  { rarity:"rare",   weight: 110 },
  { rarity:"epic",   weight: 35  },
  { rarity:"legend", weight: 4   },
  { rarity:"mythic", weight: 1   },
];

const SKINS = [
  { id:"default", name:"Default", rarity:"common", a:"#ffffff", b:"#c8f0ff" },
  { id:"ash",     name:"Ash",     rarity:"common", a:"#e5e7eb", b:"#9ca3af" },
  { id:"mint",    name:"Mint",    rarity:"elite",  a:"#b6ffda", b:"#21d07a" },
  { id:"ocean",   name:"Ocean",   rarity:"rare",   a:"#b8d7ff", b:"#2b7bff" },
  { id:"violet",  name:"Violet",  rarity:"epic",   a:"#e3c6ff", b:"#b04bff" },
  { id:"gold",    name:"Gold",    rarity:"legend", a:"#fff1b8", b:"#f2c94c" },
  { id:"inferno", name:"Inferno", rarity:"mythic", a:"#ffb3b3", b:"#ff3b3b" },
];

function skinById(id){ return SKINS.find(s=>s.id===id) || SKINS[0]; }
function rarityLabel(r){ return (RARITY[r]?.name || r); }

let inventory = jget("inventory", ["default"]);
if (!inventory.includes("default")) inventory.unshift("default");
jset("inventory", inventory);

let activeSkinId = localStorage.getItem("active_skin") || "default";
if (!inventory.includes(activeSkinId)) activeSkinId = "default";
localStorage.setItem("active_skin", activeSkinId);

// ===================== SOUND (WebAudio) =====================
const SND = { ctx:null, bufs:{}, ready:false, unlocked:false };
let musicVol = Number(localStorage.getItem("musicVol") || 100);
let sfxVol   = Number(localStorage.getItem("sfxVol") || 100);
let isMuted  = (localStorage.getItem("muted") === "1");

const VOL = {
  flap: 0.45,
  score: 0.52,
  coin: 0.75,
  hit: 0.75,
  gameover: 0.62,
  newbest: 0.75,
  bgm: 0.18
};

let bgmSrc = null;
let bgmGain = null;

function refreshSettingsUI(){
  musicVol = clamp(musicVol,0,100);
  sfxVol   = clamp(sfxVol,0,100);
  musicSlider.value = String(musicVol);
  sfxSlider.value   = String(sfxVol);
  musicVal.textContent = `${musicVol}%`;
  sfxVal.textContent   = `${sfxVol}%`;
  btnMute.textContent  = isMuted ? "Звук: ВЫКЛ" : "Звук: ВКЛ";
}
refreshSettingsUI();

function sfxMult(){ return isMuted ? 0 : (sfxVol/100); }
function musicMult(){ return isMuted ? 0 : (musicVol/100); }

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
    }catch{}
  }
  SND.ready = true;
}

function sndUnlock(){
  if (SND.ctx?.state === "suspended") SND.ctx.resume();
  SND.unlocked = true;
}

function sndPlay(name, baseVol){
  if (!SND.ready || !SND.unlocked) return;
  const buf = SND.bufs[name];
  if (!buf) return;

  const vol = baseVol * sfxMult();
  if (vol <= 0.0001) return;

  const src = SND.ctx.createBufferSource();
  const gain = SND.ctx.createGain();
  gain.gain.value = vol;
  src.buffer = buf;
  src.connect(gain);
  gain.connect(SND.ctx.destination);
  src.start(0);
}

function sndStartBgm(){
  if (!SND.ready || !SND.unlocked) return;
  if (bgmSrc) return;
  const buf = SND.bufs.bgm;
  if (!buf) return;

  const src = SND.ctx.createBufferSource();
  const gain = SND.ctx.createGain();
  gain.gain.value = VOL.bgm * musicMult();

  src.buffer = buf;
  src.loop = true;
  src.connect(gain);
  gain.connect(SND.ctx.destination);
  src.start(0);

  bgmSrc = src;
  bgmGain = gain;
}
function sndUpdateBgmVol(){
  if (!bgmGain) return;
  bgmGain.gain.value = VOL.bgm * musicMult();
}
function sndStopBgm(){
  try{ bgmSrc?.stop(); }catch{}
  bgmSrc = null;
  bgmGain = null;
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
  rouletteWrap.classList.add("hidden");
  dropResult.classList.add("hidden");
  btnEquipSkin.classList.add("hidden");
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

// ===================== Game State =====================
let running = false;
let paused = false;
let gameOver = false;

let score = 0;
let best = Number(localStorage.getItem("best") || 0);

function setScore(v){
  score = v;
  scoreEl.textContent = String(score);
}
function setBest(v){
  best = v;
  bestEl.textContent = `BEST ${best}`;
  localStorage.setItem("best", String(best));
}
setScore(0);
setBest(best);

// Physics / world
const G = 980;
const FLAP_V = -320;

const PIPE_GAP = 165;
const PIPE_W = 62;
const PIPE_SPACING = 220;

const groundY = H - 78;

const bird = {
  x: 94,
  y: H * 0.40,
  r: 15,
  vy: 0
};

let pipes = []; // {x, topH, passed}
let coins = []; // {x,y,r,taken}
let tPrev = performance.now();

// ===================== Visuals (sky, clouds, sun, ground) =====================
const clouds = [
  {x: 40, y: 120, s: 1.0, v: 10},
  {x: 220, y: 160, s: 1.2, v: 7},
  {x: 140, y: 230, s: 0.9, v: 8},
];

function drawBackground(dt){
  // sky gradient
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#59b6ff");
  g.addColorStop(1, "#1d6fbf");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  // sun
  const sg = ctx.createRadialGradient(W/2, H*0.55, 10, W/2, H*0.55, 110);
  sg.addColorStop(0, "rgba(255,255,200,.9)");
  sg.addColorStop(1, "rgba(255,255,200,0)");
  ctx.fillStyle = sg;
  ctx.fillRect(0,0,W,H);

  // clouds (simple)
  for (const c of clouds){
    c.x -= c.v * dt;
    if (c.x < -120) c.x = W + 120;

    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#ffffff";
    const x = c.x, y = c.y, s = c.s;
    roundCloud(x, y, 42*s, 18*s);
    roundCloud(x+36*s, y+6*s, 54*s, 22*s);
    roundCloud(x+78*s, y, 44*s, 18*s);
    ctx.restore();
  }

  // ground (НЕ серый блок, а аккуратная полоска)
  const gg = ctx.createLinearGradient(0, groundY, 0, H);
  gg.addColorStop(0, "#15344a");
  gg.addColorStop(1, "#0b1220");
  ctx.fillStyle = gg;
  ctx.fillRect(0, groundY, W, H-groundY);

  // little shine
  ctx.fillStyle = "rgba(255,255,255,.08)";
  ctx.fillRect(0, groundY, W, 2);
}

function roundCloud(x, y, w, h){
  ctx.beginPath();
  ctx.ellipse(x, y, w*0.55, h*0.55, 0, 0, Math.PI*2);
  ctx.ellipse(x+w*0.35, y-h*0.20, w*0.55, h*0.65, 0, 0, Math.PI*2);
  ctx.ellipse(x+w*0.75, y, w*0.52, h*0.52, 0, 0, Math.PI*2);
  ctx.closePath();
  ctx.fill();
}

// ===================== Coins (LOOK LIKE COINS) =====================
function spawnCoinForPipe(p){
  // coin in the gap
  const gapTop = p.topH;
  const gapBottom = p.topH + PIPE_GAP;
  const y = rand(gapTop + 28, gapBottom - 28);

  // шанс, чтобы не было “ковра”
  if (Math.random() < 0.75){
    coins.push({ x: p.x + PIPE_W/2 + rand(-10, 10), y, r: 10, taken:false });
  }
}

function drawCoin(c){
  const g = ctx.createRadialGradient(c.x - 3, c.y - 4, 2, c.x, c.y, c.r);
  g.addColorStop(0, "#fff2b8");
  g.addColorStop(0.45, "#f2c94c");
  g.addColorStop(1, "#b87918");

  ctx.beginPath();
  ctx.arc(c.x, c.y, c.r, 0, Math.PI*2);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(0,0,0,.25)";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(c.x, c.y, c.r*0.62, 0, Math.PI*2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,.25)";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(c.x - 4, c.y - 5, c.r*0.28, 0, Math.PI*2);
  ctx.fillStyle = "rgba(255,255,255,.55)";
  ctx.fill();
}

function drawCoins(){
  for (const c of coins){
    if (!c.taken) drawCoin(c);
  }
}

function checkCoinPickup(){
  for (const c of coins){
    if (c.taken) continue;
    const dx = c.x - bird.x;
    const dy = c.y - bird.y;
    const rr = c.r + bird.r;
    if (dx*dx + dy*dy <= rr*rr){
      c.taken = true;
      setCoins(ECON.coins + ECON.coinPickup);
      sndPlay("coin", VOL.coin);
    }
  }
}

// ===================== Pipes / Bird Draw =====================
function drawPipes(){
  for (const p of pipes){
    const x = p.x;

    // top
    ctx.fillStyle = "#1c7f3a";
    ctx.fillRect(x, 0, PIPE_W, p.topH);
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.fillRect(x, 0, 6, p.topH);

    // bottom
    const by = p.topH + PIPE_GAP;
    ctx.fillStyle = "#1c7f3a";
    ctx.fillRect(x, by, PIPE_W, groundY - by);
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.fillRect(x, by, 6, groundY - by);
  }
}

function getActiveSkin(){
  return skinById(activeSkinId);
}

function drawBird(){
  const skin = getActiveSkin();
  const grd = ctx.createLinearGradient(bird.x - bird.r, bird.y - bird.r, bird.x + bird.r, bird.y + bird.r);
  grd.addColorStop(0, skin.a);
  grd.addColorStop(1, skin.b);

  ctx.beginPath();
  ctx.arc(bird.x, bird.y, bird.r, 0, Math.PI*2);
  ctx.fillStyle = grd;
  ctx.fill();

  // eye
  ctx.beginPath();
  ctx.arc(bird.x + 5, bird.y - 4, 3, 0, Math.PI*2);
  ctx.fillStyle = "rgba(0,0,0,.75)";
  ctx.fill();

  // beak
  ctx.beginPath();
  ctx.moveTo(bird.x + bird.r, bird.y);
  ctx.lineTo(bird.x + bird.r + 10, bird.y + 4);
  ctx.lineTo(bird.x + bird.r, bird.y + 8);
  ctx.closePath();
  ctx.fillStyle = "#ffb23f";
  ctx.fill();
}

// ===================== Collision =====================
function hitRectCircle(rx, ry, rw, rh, cx, cy, cr){
  const nx = clamp(cx, rx, rx+rw);
  const ny = clamp(cy, ry, ry+rh);
  const dx = cx - nx;
  const dy = cy - ny;
  return (dx*dx + dy*dy) <= cr*cr;
}

function checkPipeCollision(){
  for (const p of pipes){
    if (hitRectCircle(p.x, 0, PIPE_W, p.topH, bird.x, bird.y, bird.r)) return true;
    const by = p.topH + PIPE_GAP;
    if (hitRectCircle(p.x, by, PIPE_W, groundY - by, bird.x, bird.y, bird.r)) return true;
  }
  return false;
}

// ===================== Score / Rewards =====================
function addScore(n=1){
  setScore(score + n);
  sndPlay("score", VOL.score);

  // каждые 10 очков -> +5 монет
  if (ECON.rewardEvery > 0 && score > 0 && score % ECON.rewardEvery === 0){
    setCoins(ECON.coins + ECON.rewardCoins);
    sndPlay("coin", VOL.coin);
  }

  if (score > best){
    setBest(score);
    sndPlay("newbest", VOL.newbest);
    window.tgSendBest?.(score, best);
  }
}

// ===================== Spawn / Reset =====================
function resetGame(){
  running = true;
  paused = false;
  gameOver = false;

  setScore(0);
  bird.y = H * 0.40;
  bird.vy = 0;

  pipes = [];
  coins = [];

  let x = W + 120;
  for (let i=0;i<4;i++){
    const topH = rand(84, groundY - PIPE_GAP - 84);
    const p = { x, topH, passed:false };
    pipes.push(p);
    spawnCoinForPipe(p);
    x += PIPE_SPACING;
  }

  hud.classList.remove("hud-hidden");
}

// ===================== Controls (FIX: mouse + tap) =====================
async function unlockAudioIfNeeded(){
  await sndInit().catch(()=>{});
  sndUnlock();
  sndStartBgm();
  sndUpdateBgmVol();
}

function flap(){
  bird.vy = FLAP_V;
  sndPlay("flap", VOL.flap);
}

function tryFlap(){
  if (!running || paused || gameOver) return;
  flap();
}

function bindInput(el){
  el.addEventListener("pointerdown", async (e)=>{
    e.preventDefault();
    await unlockAudioIfNeeded();
    tryFlap();
  }, { passive:false });

  // запасной вариант для некоторых WebView
  el.addEventListener("touchstart", async (e)=>{
    e.preventDefault();
    await unlockAudioIfNeeded();
    tryFlap();
  }, { passive:false });

  // запасной для десктопа
  el.addEventListener("mousedown", async (e)=>{
    e.preventDefault();
    await unlockAudioIfNeeded();
    tryFlap();
  }, { passive:false });
}
bindInput(canvas);

window.addEventListener("keydown", async (e)=>{
  if (e.code === "Space"){
    e.preventDefault();
    await unlockAudioIfNeeded();
    tryFlap();
  }
  if (e.code === "KeyP") togglePause();
});

function togglePause(){
  if (!running || gameOver) return;
  paused = !paused;
  btnPause.textContent = paused ? "▶" : "⏸";
}
btnPause.addEventListener("click", togglePause);

// ===================== Buttons / Navigation =====================
btnMenuPlay.addEventListener("click", async ()=>{
  await unlockAudioIfNeeded();
  hideAllScreens();
  resetGame();
});

btnMenuSettings.addEventListener("click", ()=> showSettings());
btnMenuShop.addEventListener("click", ()=> showShop());
btnBackFromSettings.addEventListener("click", ()=> showMenu());
btnBackFromShop.addEventListener("click", ()=> showMenu());

btnRestart.addEventListener("click", async ()=>{
  await unlockAudioIfNeeded();
  hideAllScreens();
  resetGame();
});
btnBackToMenu.addEventListener("click", ()=> showMenu());

// ===================== Settings =====================
musicSlider.addEventListener("input", ()=>{
  musicVol = Number(musicSlider.value || 0);
  localStorage.setItem("musicVol", String(musicVol));
  refreshSettingsUI();
  sndUpdateBgmVol();
});
sfxSlider.addEventListener("input", ()=>{
  sfxVol = Number(sfxSlider.value || 0);
  localStorage.setItem("sfxVol", String(sfxVol));
  refreshSettingsUI();
});
btnMute.addEventListener("click", ()=>{
  isMuted = !isMuted;
  localStorage.setItem("muted", isMuted ? "1":"0");
  refreshSettingsUI();
  sndUpdateBgmVol();
});

// ===================== Shop: Roulette (FIX: shown == awarded) =====================
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

function buildRouletteItems(winnerSkin){
  const items = [];
  for (let i=0;i<45;i++) items.push(pickSkin());
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
    el.style.boxShadow = `0 0 16px ${rar.glow}`;
    el.innerHTML = `<div class="n">${s.name}</div><div class="r">${rarityLabel(s.rarity)}</div>`;
    rouletteStrip.appendChild(el);
  }
}

function getMarkerX(){
  const roulette = rouletteWrap.querySelector(".roulette");
  const r = roulette.getBoundingClientRect();
  return r.left + r.width/2;
}
function getItemCenterX(el){
  const r = el.getBoundingClientRect();
  return r.left + r.width/2;
}

async function spinCase(){
  if (spinning) return;
  if (ECON.coins < ECON.caseCost) return;

  spinning = true;
  setCoins(ECON.coins - ECON.caseCost);

  rouletteWrap.classList.remove("hidden");
  dropResult.classList.add("hidden");
  btnEquipSkin.classList.add("hidden");

  const winner = pickSkin();
  lastDrop = winner;

  const { items, winIndex } = buildRouletteItems(winner);
  renderStrip(items);

  // Ждём, чтобы DOM посчитал размеры (важно для точного попадания)
  await new Promise(r => requestAnimationFrame(()=>requestAnimationFrame(r)));

  const winnerEl = rouletteStrip.children[winIndex];
  const markerX = getMarkerX();
  rouletteStrip.style.transform = `translateX(0px)`;

  const winCenter = getItemCenterX(winnerEl);
  const target = (winCenter - markerX); // сколько нужно "увести" влево

  const overshoot = target + rand(120, 220);

  function easeOutCubic(x){ return 1 - Math.pow(1-x,3); }
  function easeOutQuint(x){ return 1 - Math.pow(1-x,5); }

  await new Promise((resolve)=>{
    const t0 = performance.now();
    const dur1 = 2100;
    const dur2 = 900;

    function step(now){
      const t = now - t0;
      if (t < dur1){
        const k = easeOutCubic(t/dur1);
        const x = lerp(0, overshoot, k);
        rouletteStrip.style.transform = `translateX(${-x}px)`;
        requestAnimationFrame(step);
        return;
      }
      const t1 = performance.now();
      function step2(n2){
        const tt = n2 - t1;
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

  // выдаём ровно winner (теперь это совпадает с визуалом)
  if (!inventory.includes(winner.id)){
    inventory.push(winner.id);
    jset("inventory", inventory);
  }

  const rar = RARITY[winner.rarity];
  dropResult.classList.remove("hidden");
  dropResult.style.borderColor = rar.color;
  dropResult.style.boxShadow = `0 0 16px ${rar.glow}`;
  dropResult.textContent = `Выпало: ${winner.name} — ${rarityLabel(winner.rarity)}`;

  btnEquipSkin.classList.remove("hidden");
  btnEquipSkin.textContent = `Надеть: ${winner.name}`;

  renderInventory();
  spinning = false;
}

function renderInventory(){
  inventoryEl.innerHTML = "";
  const owned = inventory.map(id => skinById(id)).filter(Boolean);

  for (const s of owned){
    const rar = RARITY[s.rarity];
    const el = document.createElement("div");
    el.className = "inv" + (s.id === activeSkinId ? " active" : "");
    el.style.borderColor = rar.color;
    el.style.boxShadow = `0 0 14px ${rar.glow}`;
    el.innerHTML = `<div class="name">${s.name}</div><div class="tag">${rarityLabel(s.rarity)}</div>`;
    el.addEventListener("click", ()=>{
      activeSkinId = s.id;
      localStorage.setItem("active_skin", activeSkinId);
      renderInventory();
    });
    inventoryEl.appendChild(el);
  }
}

btnOpenCase.addEventListener("click", spinCase);
btnEquipSkin.addEventListener("click", ()=>{
  if (!lastDrop) return;
  activeSkinId = lastDrop.id;
  localStorage.setItem("active_skin", activeSkinId);
  renderInventory();
});

// ===================== Update / Render =====================
function update(dt){
  if (!running || paused || gameOver) return;

  // bird
  bird.vy += G * dt;
  bird.y += bird.vy * dt;

  // move pipes & coins
  const speed = 170;
  for (const p of pipes) p.x -= speed * dt;
  for (const c of coins) c.x -= speed * dt;

  // recycle pipes
  const first = pipes[0];
  if (first && first.x + PIPE_W < -30){
    pipes.shift();

    const lastX = pipes[pipes.length-1].x;
    const topH = rand(84, groundY - PIPE_GAP - 84);
    const np = { x: lastX + PIPE_SPACING, topH, passed:false };
    pipes.push(np);
    spawnCoinForPipe(np);
  }

  // scoring
  for (const p of pipes){
    if (!p.passed && (p.x + PIPE_W) < bird.x){
      p.passed = true;
      addScore(1);
    }
  }

  // coin pickup
  checkCoinPickup();

  // boundaries
  if (bird.y - bird.r < 0) bird.y = bird.r;

  // ground
  if (bird.y + bird.r >= groundY){
    bird.y = groundY - bird.r;
    doGameOver(false);
    return;
  }

  // pipes collision
  if (checkPipeCollision()){
    doGameOver(false);
    return;
  }
}

function doGameOver(){
  if (gameOver) return;
  gameOver = true;
  running = false;

  sndGameOverSeq();

  const isNewBest = (score >= best);
  showGameOver(isNewBest ? "New Best!" : "Game Over", `Счёт: ${score}\nМонеты: ${ECON.coins}`);
}

function render(dt){
  drawBackground(dt);
  drawPipes();
  drawCoins();
  drawBird();

  if (paused && running){
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.font = "900 22px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", W/2, H/2);
  }
}

function loop(now){
  const dt = clamp((now - tPrev)/1000, 0, 0.033);
  tPrev = now;

  update(dt);
  render(dt);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ===================== Init =====================
showMenu();
renderInventory();
