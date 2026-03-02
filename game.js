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
function easeOutCubic(x){ return 1 - Math.pow(1-x,3); }
function easeOutQuint(x){ return 1 - Math.pow(1-x,5); }

function jget(key, fallback){
  try { return JSON.parse(localStorage.getItem(key) || ""); }
  catch { return fallback; }
}
function jset(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

// ===================== Economy =====================
const ECON = {
  coins: Number(localStorage.getItem("coins") || 0),
  caseCost: 10,
  rewardEvery: 10,
  rewardCoins: 5,
  coinPickup: 1
};

function setCoins(v){
  ECON.coins = Math.max(0, Math.floor(v));
  localStorage.setItem("coins", String(ECON.coins));
  coinsTopEl.textContent = `🪙 ${ECON.coins}`;
  coinsHudEl.textContent = `🪙 ${ECON.coins}`;
  btnOpenCase.disabled = ECON.coins < ECON.caseCost;
}
setCoins(ECON.coins);

// ===================== Skins / Rarity (разнообразные, с узорами) =====================
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

// pattern: "none" | "stripe" | "dots" | "split" | "flame"
const SKINS = [
  { id:"default", name:"Sky",     rarity:"common", a:"#ffffff", b:"#c8f0ff", accent:"#ffb23f", pattern:"none" },
  { id:"ash",     name:"Ash",     rarity:"common", a:"#eceff4", b:"#9aa3b2", accent:"#f7c948", pattern:"stripe" },
  { id:"mint",    name:"Mint",    rarity:"elite",  a:"#c6ffe6", b:"#18d17a", accent:"#0b2a1b", pattern:"dots" },
  { id:"ocean",   name:"Ocean",   rarity:"rare",   a:"#c6e2ff", b:"#1f7cff", accent:"#08264a", pattern:"split" },
  { id:"violet",  name:"Violet",  rarity:"epic",   a:"#f0d9ff", b:"#a84bff", accent:"#2a0b4a", pattern:"stripe" },
  { id:"gold",    name:"Royal",   rarity:"legend", a:"#fff3c7", b:"#f2c94c", accent:"#5b3b00", pattern:"split" },
  { id:"inferno", name:"Inferno", rarity:"mythic", a:"#ffd0d0", b:"#ff3b3b", accent:"#2a0000", pattern:"flame" },
];

function skinById(id){ return SKINS.find(s=>s.id===id) || SKINS[0]; }
function rarityLabel(r){ return (RARITY[r]?.name || r); }

let inventory = jget("inventory", ["default"]);
if (!inventory.includes("default")) inventory.unshift("default");
jset("inventory", inventory);

let activeSkinId = localStorage.getItem("active_skin") || "default";
if (!inventory.includes(activeSkinId)) activeSkinId = "default";
localStorage.setItem("active_skin", activeSkinId);

// ===================== SOUND =====================
const SND = { ctx:null, bufs:{}, ready:false, unlocked:false };
let musicVol = Number(localStorage.getItem("musicVol") || 100);
let sfxVol   = Number(localStorage.getItem("sfxVol") || 100);
let isMuted  = (localStorage.getItem("muted") === "1");

const VOL = {
  flap: 0.45,
  score: 0.52,
  coin: 0.80,
  hit: 0.78,
  gameover: 0.62,
  newbest: 0.90,  // громче, но 1 раз
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
let bestThisRunTriggered = false;
let bestAtRunStart = best;

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

// ===== Physics tuning (приятнее) =====
const G = 1020;            // gravity
const FLAP_V = -340;       // impulse
const MAX_FALL = 520;      // clamp fall speed

const PIPE_GAP = 170;
const PIPE_W = 64;
const PIPE_SPACING = 230;

const groundY = H - 86;
const worldSpeed = 175;

const bird = {
  x: 94,
  y: H * 0.40,
  r: 15,
  vy: 0,
  rot: 0,
  glow: 0
};

let pipes = []; // {x, topH, passed}
let coins = []; // {x,y,r,spin,taken,pop}
let tPrev = performance.now();
let time = 0;

// ===================== Day/Night + Parallax =====================
const sky = {
  t: Number(localStorage.getItem("daytime") || 0.15), // 0..1
  speed: 0.012
};

const stars = Array.from({length: 60}, ()=>({
  x: Math.random()*W,
  y: Math.random()*(H*0.55),
  s: Math.random()*1.2+0.4,
  a: Math.random()*0.7+0.2
}));

const clouds = Array.from({length: 7}, ()=>({
  x: Math.random()*W,
  y: 70 + Math.random()*260,
  s: Math.random()*0.8+0.7,
  v: 8 + Math.random()*14,
  a: 0.18 + Math.random()*0.22
}));

function drawSky(dt){
  // плавный цикл
  sky.t += sky.speed * dt;
  if (sky.t > 1) sky.t -= 1;
  localStorage.setItem("daytime", String(sky.t));

  // 0..1 -> день/ночь
  // dayFactor: 1 днём, 0 ночью
  const dayFactor = 0.5 + 0.5*Math.sin((sky.t * Math.PI * 2) - Math.PI/2);
  const df = clamp(dayFactor, 0, 1);

  // градиенты
  const topDay = "#58b8ff";
  const botDay = "#1c6dbd";
  const topNight = "#050a18";
  const botNight = "#0b1f3a";

  const top = mixColor(topNight, topDay, df);
  const bot = mixColor(botNight, botDay, df);

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bot);
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  // солнце/луна
  const orbX = W*0.62;
  const orbY = H*0.30 + (1-df)*30;
  const orbR = 22;

  const glow = ctx.createRadialGradient(orbX, orbY, 6, orbX, orbY, 120);
  if (df > 0.25){
    glow.addColorStop(0, "rgba(255,245,200,.85)");
    glow.addColorStop(1, "rgba(255,245,200,0)");
  }else{
    glow.addColorStop(0, "rgba(220,235,255,.55)");
    glow.addColorStop(1, "rgba(220,235,255,0)");
  }
  ctx.fillStyle = glow;
  ctx.fillRect(0,0,W,H);

  ctx.beginPath();
  ctx.arc(orbX, orbY, orbR, 0, Math.PI*2);
  ctx.fillStyle = (df > 0.25) ? "rgba(255,255,220,.92)" : "rgba(220,235,255,.78)";
  ctx.fill();

  // звёзды ночью
  const nightAlpha = clamp((0.35 - df) / 0.35, 0, 1);
  if (nightAlpha > 0.001){
    ctx.save();
    ctx.globalAlpha = nightAlpha;
    ctx.fillStyle = "#ffffff";
    for (const s of stars){
      const tw = 0.6 + 0.4*Math.sin(time*1.6 + s.x*0.07);
      ctx.globalAlpha = nightAlpha * s.a * tw;
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
    ctx.restore();
  }

  // облака днём (чуть видно ночью)
  const cloudAlpha = 0.15 + 0.35*df;
  for (const c of clouds){
    c.x -= c.v * dt;
    if (c.x < -160) c.x = W + 160;
    drawCloud(c.x, c.y, c.s, cloudAlpha*c.a);
  }
}

function drawCloud(x, y, s, a){
  ctx.save();
  ctx.globalAlpha = a;
  const fill = "rgba(255,255,255,0.95)";
  ctx.fillStyle = fill;

  blob(x, y, 42*s, 16*s);
  blob(x+36*s, y-4*s, 52*s, 20*s);
  blob(x+76*s, y, 44*s, 16*s);

  ctx.restore();

  function blob(cx, cy, w, h){
    ctx.beginPath();
    ctx.ellipse(cx, cy, w*0.55, h*0.55, 0, 0, Math.PI*2);
    ctx.closePath();
    ctx.fill();
  }
}

function mixColor(a, b, t){
  // a,b: #RRGGBB
  const ar = parseInt(a.slice(1,3),16), ag = parseInt(a.slice(3,5),16), ab = parseInt(a.slice(5,7),16);
  const br = parseInt(b.slice(1,3),16), bg = parseInt(b.slice(3,5),16), bb = parseInt(b.slice(5,7),16);
  const rr = Math.round(ar + (br-ar)*t);
  const rg = Math.round(ag + (bg-ag)*t);
  const rb = Math.round(ab + (bb-ab)*t);
  return `rgb(${rr},${rg},${rb})`;
}

// ===================== Ground + Animated Grass =====================
function drawGround(dt){
  // земля
  const g = ctx.createLinearGradient(0, groundY, 0, H);
  g.addColorStop(0, "rgba(12,34,28,0.96)");
  g.addColorStop(1, "rgba(7,18,15,1)");
  ctx.fillStyle = g;
  ctx.fillRect(0, groundY, W, H-groundY);

  // “грунт” полосы
  ctx.fillStyle = "rgba(0,0,0,.14)";
  for (let i=0;i<8;i++){
    ctx.fillRect((i*50 + (time*40)%50)-40, groundY+26, 24, 16);
  }

  // трава волной
  const grassY = groundY + 8;
  const wave = Math.sin(time*2.2)*1.6;
  ctx.save();
  ctx.translate(0, wave);
  for (let x=0; x<W; x+=6){
    const h = 10 + 3*Math.sin(time*3 + x*0.12);
    const tilt = 2*Math.sin(time*2 + x*0.08);
    ctx.beginPath();
    ctx.moveTo(x, grassY);
    ctx.quadraticCurveTo(x+tilt, grassY-h*0.7, x, grassY-h);
    ctx.strokeStyle = "rgba(110, 230, 120, .55)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.restore();

  // линия
  ctx.fillStyle = "rgba(255,255,255,.08)";
  ctx.fillRect(0, groundY, W, 2);
}

// ===================== Coins (круче, вращение/блик/поп) =====================
function spawnCoinForPipe(p){
  if (Math.random() < 0.72){
    const gapTop = p.topH;
    const gapBottom = p.topH + PIPE_GAP;
    const y = rand(gapTop + 30, gapBottom - 30);
    coins.push({
      x: p.x + PIPE_W/2 + rand(-14, 14),
      y,
      r: 11,
      spin: rand(0, Math.PI*2),
      taken:false,
      pop:0
    });
  }
}

function drawCoin(c){
  const spin = 0.55 + 0.45*Math.sin(c.spin);
  const rx = c.r * (0.55 + 0.45*spin);
  const ry = c.r;

  // body gradient
  const g = ctx.createRadialGradient(c.x - 4, c.y - 6, 2, c.x, c.y, c.r*1.35);
  g.addColorStop(0, "#fff6c7");
  g.addColorStop(0.45, "#ffd04d");
  g.addColorStop(1, "#a86a12");

  // pop anim
  const popS = c.pop > 0 ? (1 + 0.22*Math.sin(c.pop*10)) : 1;

  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(popS, popS);

  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI*2);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(0,0,0,.22)";
  ctx.stroke();

  // inner ring
  ctx.beginPath();
  ctx.ellipse(0, 0, rx*0.62, ry*0.62, 0, 0, Math.PI*2);
  ctx.strokeStyle = "rgba(255,255,255,.22)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // sparkle
  const sh = 0.45 + 0.55*Math.sin(c.spin + 1.8);
  ctx.globalAlpha = 0.35 + 0.35*sh;
  ctx.beginPath();
  ctx.ellipse(-3, -5, rx*0.28, ry*0.18, 0.2, 0, Math.PI*2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
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
      // pop effect (на всякий)
      c.pop = 0.12;
    }
  }
}

// ===================== Pipes (красивее: градиент/шапка/тени) =====================
function drawPipeBody(x, y, w, h){
  // base
  const g = ctx.createLinearGradient(x, 0, x+w, 0);
  g.addColorStop(0, "#157a35");
  g.addColorStop(0.35, "#2bd56d");
  g.addColorStop(1, "#0f5c27");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  // inner shadow
  ctx.fillStyle = "rgba(0,0,0,.14)";
  ctx.fillRect(x+3, y, 5, h);

  // highlight
  ctx.fillStyle = "rgba(255,255,255,.12)";
  ctx.fillRect(x+w-7, y+6, 3, h-12);

  // outline
  ctx.strokeStyle = "rgba(0,0,0,.25)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x+1, y+1, w-2, h-2);
}

function drawPipeCap(x, y, w, h, up){
  // cap slightly bigger
  const capH = 18;
  const capY = up ? (y + h - capH) : y;
  const capW = w + 10;
  const capX = x - 5;

  const g = ctx.createLinearGradient(capX, 0, capX+capW, 0);
  g.addColorStop(0, "#0f5c27");
  g.addColorStop(0.5, "#35ff89");
  g.addColorStop(1, "#0a3f1a");

  ctx.fillStyle = g;
  roundRect(capX, capY, capW, capH, 8);
  ctx.fill();

  ctx.strokeStyle = "rgba(0,0,0,.28)";
  ctx.lineWidth = 2;
  roundRect(capX+1, capY+1, capW-2, capH-2, 7);
  ctx.stroke();
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

function drawPipes(){
  for (const p of pipes){
    const x = p.x;
    // top
    drawPipeBody(x, 0, PIPE_W, p.topH);
    drawPipeCap(x, 0, PIPE_W, p.topH, true);

    // bottom
    const by = p.topH + PIPE_GAP;
    drawPipeBody(x, by, PIPE_W, groundY - by);
    drawPipeCap(x, by, PIPE_W, groundY - by, false);
  }
}

// ===================== Bird (красивее, свечение, поворот) =====================
function getActiveSkin(){ return skinById(activeSkinId); }

function drawBird(){
  const s = getActiveSkin();

  // glow
  const glowR = bird.r * 2.8;
  const glow = ctx.createRadialGradient(bird.x, bird.y, 2, bird.x, bird.y, glowR);
  glow.addColorStop(0, "rgba(255,255,255,.18)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(bird.x-glowR, bird.y-glowR, glowR*2, glowR*2);

  // rotate around bird
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rot);

  // body
  const body = ctx.createLinearGradient(-bird.r, -bird.r, bird.r, bird.r);
  body.addColorStop(0, s.a);
  body.addColorStop(1, s.b);

  ctx.beginPath();
  ctx.ellipse(0, 0, bird.r*1.05, bird.r*0.95, 0, 0, Math.PI*2);
  ctx.fillStyle = body;
  ctx.fill();

  // pattern
  drawSkinPattern(s);

  // wing
  const wingT = 0.5 + 0.5*Math.sin(time*10);
  ctx.beginPath();
  ctx.ellipse(-4, 2, 8, 6 + wingT*2.2, -0.25, 0, Math.PI*2);
  ctx.fillStyle = "rgba(255,255,255,.20)";
  ctx.fill();

  // eye
  ctx.beginPath();
  ctx.arc(6, -4, 3.2, 0, Math.PI*2);
  ctx.fillStyle = "rgba(0,0,0,.70)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(7, -5, 1.2, 0, Math.PI*2);
  ctx.fillStyle = "rgba(255,255,255,.65)";
  ctx.fill();

  // beak
  ctx.beginPath();
  ctx.moveTo(bird.r*0.95, 0);
  ctx.lineTo(bird.r*0.95 + 10, 3);
  ctx.lineTo(bird.r*0.95, 8);
  ctx.closePath();
  ctx.fillStyle = s.accent || "#ffb23f";
  ctx.fill();

  // outline
  ctx.strokeStyle = "rgba(0,0,0,.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, bird.r*1.05, bird.r*0.95, 0, 0, Math.PI*2);
  ctx.stroke();

  ctx.restore();

  function drawSkinPattern(skin){
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "rgba(0,0,0,.25)";

    if (skin.pattern === "stripe"){
      for (let i=-10;i<=10;i+=6){
        ctx.beginPath();
        ctx.ellipse(i, 0, 2.2, 10, 0.25, 0, Math.PI*2);
        ctx.fill();
      }
    } else if (skin.pattern === "dots"){
      for (let i=-10;i<=10;i+=6){
        for (let j=-8;j<=8;j+=6){
          ctx.beginPath();
          ctx.arc(i, j, 1.6, 0, Math.PI*2);
          ctx.fill();
        }
      }
    } else if (skin.pattern === "split"){
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.rect(-bird.r*1.05, -bird.r, bird.r*1.05, bird.r*2);
      ctx.fill();
    } else if (skin.pattern === "flame"){
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "rgba(0,0,0,.32)";
      for (let i=-10;i<=10;i+=5){
        ctx.beginPath();
        ctx.moveTo(i, 8);
        ctx.quadraticCurveTo(i+2, 0, i, -10);
        ctx.quadraticCurveTo(i-2, 0, i, 8);
        ctx.fill();
      }
    }

    ctx.restore();
  }
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

// ===================== Score / Rewards (newbest 1 раз) =====================
function addScore(n=1){
  setScore(score + n);
  sndPlay("score", VOL.score);

  if (ECON.rewardEvery > 0 && score > 0 && score % ECON.rewardEvery === 0){
    setCoins(ECON.coins + ECON.rewardCoins);
    sndPlay("coin", VOL.coin);
  }

  // новый рекорд — только 1 раз, когда впервые превысили прошлый best в этой попытке
  if (!bestThisRunTriggered && score > bestAtRunStart){
    bestThisRunTriggered = true;
    sndPlay("newbest", VOL.newbest);
  }

  if (score > best){
    setBest(score);
    window.tgSendBest?.(score, best);
  }
}

// ===================== Spawn / Reset =====================
function resetGame(){
  running = true;
  paused = false;
  gameOver = false;

  bestAtRunStart = best;
  bestThisRunTriggered = false;

  setScore(0);
  bird.y = H * 0.40;
  bird.vy = 0;
  bird.rot = 0;

  pipes = [];
  coins = [];

  let x = W + 130;
  for (let i=0;i<4;i++){
    const topH = rand(90, groundY - PIPE_GAP - 90);
    const p = { x, topH, passed:false };
    pipes.push(p);
    spawnCoinForPipe(p);
    x += PIPE_SPACING;
  }

  hud.classList.remove("hud-hidden");
}

// ===================== Controls (mouse + tap) =====================
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

  el.addEventListener("touchstart", async (e)=>{
    e.preventDefault();
    await unlockAudioIfNeeded();
    tryFlap();
  }, { passive:false });

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

// ===================== Shop: Roulette (честная) =====================
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

  await new Promise(r => requestAnimationFrame(()=>requestAnimationFrame(r)));

  const winnerEl = rouletteStrip.children[winIndex];
  const markerX = getMarkerX();

  rouletteStrip.style.transform = `translateX(0px)`;
  const winCenter = getItemCenterX(winnerEl);
  const target = (winCenter - markerX);
  const overshoot = target + rand(120, 220);

  await new Promise((resolve)=>{
    const t0 = performance.now();
    const dur1 = 2150;
    const dur2 = 950;

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

  time += dt;

  // bird physics
  bird.vy += G * dt;
  bird.vy = clamp(bird.vy, -900, MAX_FALL);
  bird.y += bird.vy * dt;

  // rotation (мягкая)
  const targetRot = clamp(bird.vy / 650, -0.55, 0.85);
  bird.rot = lerp(bird.rot, targetRot, 0.10);

  // move pipes & coins
  for (const p of pipes) p.x -= worldSpeed * dt;
  for (const c of coins){
    c.x -= worldSpeed * dt;
    c.spin += dt * 8.5;
    if (c.pop > 0) c.pop = Math.max(0, c.pop - dt);
  }

  // recycle pipes
  const first = pipes[0];
  if (first && first.x + PIPE_W < -34){
    pipes.shift();
    const lastX = pipes[pipes.length-1].x;
    const topH = rand(92, groundY - PIPE_GAP - 92);
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

  // pickup coins
  checkCoinPickup();

  // bounds
  if (bird.y - bird.r < 0){
    bird.y = bird.r;
    bird.vy = 0;
  }

  if (bird.y + bird.r >= groundY){
    bird.y = groundY - bird.r;
    doGameOver();
    return;
  }

  if (checkPipeCollision()){
    doGameOver();
    return;
  }
}

function doGameOver(){
  if (gameOver) return;
  gameOver = true;
  running = false;

  sndGameOverSeq();
  showGameOver((score > bestAtRunStart) ? "New Best!" : "Game Over", `Счёт: ${score}\nМонеты: ${ECON.coins}`);
}

function render(dt){
  drawSky(dt);
  drawPipes();
  drawCoins();
  drawGround(dt);
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

  if (running && !paused) update(dt);
  render(dt);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ===================== Init =====================
function hideAll(){
  screenMenu.classList.add("hidden");
  screenSettings.classList.add("hidden");
  screenShop.classList.add("hidden");
  screenGameOver.classList.add("hidden");
}
showMenu();
renderInventory();

// ===================== Start buttons connect (already above) =====================
btnOpenCase.disabled = ECON.coins < ECON.caseCost;
