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
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function lerp(a, b, k) { return a + (b - a) * k; }
function rand(a, b) { return a + Math.random() * (b - a); }
function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
function easeOutQuint(x) { return 1 - Math.pow(1 - x, 5); }

function jget(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || ""); }
  catch { return fallback; }
}
function jset(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

// ===================== Economy =====================
const ECON = {
  coins: Number(localStorage.getItem("coins") || 0),
  caseCost: 10,
  rewardEvery: 10,
  rewardCoins: 5,
  coinPickup: 1,
};

function setCoins(v) {
  ECON.coins = Math.max(0, Math.floor(v));
  localStorage.setItem("coins", String(ECON.coins));
  coinsTopEl.textContent = `🪙 ${ECON.coins}`;
  coinsHudEl.textContent = `🪙 ${ECON.coins}`;
  btnOpenCase.disabled = ECON.coins < ECON.caseCost;
}
setCoins(ECON.coins);

// ===================== Skins / Rarity =====================
const RARITY = {
  common: { name: "Обычное", color: "#a9adb5", glow: "rgba(169,173,181,.35)" },
  elite:  { name: "Элитное", color: "#2fd06e", glow: "rgba(47,208,110,.35)" },
  rare:   { name: "Редкое", color: "#2b7bff", glow: "rgba(43,123,255,.35)" },
  epic:   { name: "Эпик", color: "#b04bff", glow: "rgba(176,75,255,.35)" },
  legend: { name: "Легендарное", color: "#f2c94c", glow: "rgba(242,201,76,.35)" },
  mythic: { name: "Мифическое", color: "#ff3b3b", glow: "rgba(255,59,59,.35)" },
};

const DROP_TABLE = [
  { rarity: "common", weight: 600 },
  { rarity: "elite",  weight: 250 },
  { rarity: "rare",   weight: 110 },
  { rarity: "epic",   weight: 35 },
  { rarity: "legend", weight: 4 },
  { rarity: "mythic", weight: 1 },
];

// pattern: none | stripe | dots | split | flame
const SKINS = [
  { id: "default", name: "Sky",     rarity: "common", a: "#f8fbff", b: "#8fd5ff", accent: "#ffb23f", pattern: "none" },
  { id: "ash",     name: "Ash",     rarity: "common", a: "#eceff4", b: "#9aa3b2", accent: "#f7c948", pattern: "stripe" },
  { id: "mint",    name: "Mint",    rarity: "elite",  a: "#c6ffe6", b: "#18d17a", accent: "#0b2a1b", pattern: "dots" },
  { id: "ocean",   name: "Ocean",   rarity: "rare",   a: "#c6e2ff", b: "#1f7cff", accent: "#08264a", pattern: "split" },
  { id: "violet",  name: "Violet",  rarity: "epic",   a: "#f0d9ff", b: "#a84bff", accent: "#2a0b4a", pattern: "stripe" },
  { id: "royal",   name: "Royal",   rarity: "legend", a: "#fff3c7", b: "#f2c94c", accent: "#5b3b00", pattern: "split" },
  { id: "inferno", name: "Inferno", rarity: "mythic", a: "#ffd0d0", b: "#ff3b3b", accent: "#2a0000", pattern: "flame" },
];

function skinById(id) { return SKINS.find(s => s.id === id) || SKINS[0]; }
function rarityLabel(r) { return (RARITY[r]?.name || r); }

let inventory = jget("inventory", ["default"]);
if (!inventory.includes("default")) inventory.unshift("default");
jset("inventory", inventory);

let activeSkinId = localStorage.getItem("active_skin") || "default";
if (!inventory.includes(activeSkinId)) activeSkinId = "default";
localStorage.setItem("active_skin", activeSkinId);

// ===================== SOUND (WebAudio) =====================
const SND = { ctx: null, bufs: {}, ready: false, unlocked: false };
let musicVol = Number(localStorage.getItem("musicVol") || 100);
let sfxVol = Number(localStorage.getItem("sfxVol") || 100);
let isMuted = (localStorage.getItem("muted") === "1");

const VOL = {
  flap: 0.45,
  score: 0.52,
  coin: 0.80,
  hit: 0.78,
  gameover: 0.62,
  newbest: 0.90, // 1 раз
  bgm: 0.18,
};

let bgmSrc = null;
let bgmGain = null;

function refreshSettingsUI() {
  musicVol = clamp(musicVol, 0, 100);
  sfxVol = clamp(sfxVol, 0, 100);
  musicSlider.value = String(musicVol);
  sfxSlider.value = String(sfxVol);
  musicVal.textContent = `${musicVol}%`;
  sfxVal.textContent = `${sfxVol}%`;
  btnMute.textContent = isMuted ? "Звук: ВЫКЛ" : "Звук: ВКЛ";
}
refreshSettingsUI();

function sfxMult() { return isMuted ? 0 : (sfxVol / 100); }
function musicMult() { return isMuted ? 0 : (musicVol / 100); }

async function sndInit() {
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

  for (const [k, url] of Object.entries(files)) {
    try {
      const r = await fetch(url);
      const a = await r.arrayBuffer();
      SND.bufs[k] = await SND.ctx.decodeAudioData(a);
    } catch { /* ignore */ }
  }
  SND.ready = true;
}

function sndUnlock() {
  if (SND.ctx?.state === "suspended") SND.ctx.resume();
  SND.unlocked = true;
}

function sndPlay(name, baseVol) {
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

function sndStartBgm() {
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
function sndUpdateBgmVol() {
  if (!bgmGain) return;
  bgmGain.gain.value = VOL.bgm * musicMult();
}
function sndGameOverSeq() {
  sndPlay("hit", VOL.hit);
  setTimeout(() => sndPlay("gameover", VOL.gameover), 220);
}

// ===================== Screens =====================
function hideAllScreens() {
  screenMenu.classList.add("hidden");
  screenSettings.classList.add("hidden");
  screenShop.classList.add("hidden");
  screenGameOver.classList.add("hidden");
}
function showMenu() {
  hideAllScreens();
  screenMenu.classList.remove("hidden");
  hud.classList.add("hud-hidden");
}
function showSettings() {
  hideAllScreens();
  screenSettings.classList.remove("hidden");
  hud.classList.add("hud-hidden");
}
function showShop() {
  hideAllScreens();
  screenShop.classList.remove("hidden");
  hud.classList.add("hud-hidden");
  rouletteWrap.classList.add("hidden");
  dropResult.classList.add("hidden");
  btnEquipSkin.classList.add("hidden");
  renderInventory();
  btnOpenCase.disabled = ECON.coins < ECON.caseCost;
}
function showGameOver(title, text) {
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

// best-sound only once per run:
let bestAtRunStart = best;
let bestThisRunTriggered = false;

function setScore(v) {
  score = v;
  scoreEl.textContent = String(score);
}
function setBest(v) {
  best = v;
  bestEl.textContent = `BEST ${best}`;
  localStorage.setItem("best", String(best));
}
setScore(0);
setBest(best);

// ===================== Physics tuning =====================
const G = 1040;
const FLAP_V = -350;
const MAX_FALL = 540;

const PIPE_GAP = 170;
const PIPE_W = 64;
const PIPE_SPACING = 232;

const groundY = H - 86;
const worldSpeed = 178;

const bird = {
  x: 94,
  y: H * 0.40,
  r: 15,
  vy: 0,
  rot: 0,
};

let pipes = []; // {x, topH, passed}
let coins = []; // {x,y,r,spin,taken,pop}
let tPrev = performance.now();
let time = 0;

// ===================== PRO BACKGROUND (day/night + layers) =====================
const sky = {
  t: Number(localStorage.getItem("daytime") || 0.18), // 0..1
  speed: 0.010,
};

function hexToRgb(h) {
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return { r, g, b };
}
function mixColor(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const r = Math.round(A.r + (B.r - A.r) * t);
  const g = Math.round(A.g + (B.g - A.g) * t);
  const bb = Math.round(A.b + (B.b - A.b) * t);
  return `rgb(${r},${g},${bb})`;
}
function smoothstep(x) {
  x = clamp(x, 0, 1);
  return x * x * (3 - 2 * x);
}

// subtle “noise” stripes
function drawSkyNoise(alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let y = 0; y < H; y += 3) {
    const a = 0.02 + 0.02 * Math.sin(y * 0.18 + time * 0.7);
    ctx.globalAlpha = alpha * a;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, y, W, 1);
  }
  ctx.restore();
}

const stars = Array.from({ length: 85 }, () => ({
  x: Math.random() * W,
  y: Math.random() * (H * 0.55),
  s: Math.random() * 1.4 + 0.4,
  a: Math.random() * 0.7 + 0.15,
  p: Math.random() * 6.28,
}));

function makeCloud() {
  const c = {
    x: Math.random() * W,
    y: 55 + Math.random() * 270,
    s: 0.65 + Math.random() * 1.15,
    v: 10 + Math.random() * 18,
    a: 0.10 + Math.random() * 0.22,
  };
  c.puffs = Array.from({ length: 4 + Math.floor(Math.random() * 4) }, (_, i) => ({
    ox: (i * 18) + rand(-10, 10),
    oy: rand(-8, 8),
    rx: rand(18, 34),
    ry: rand(10, 20),
  }));
  return c;
}
const clouds = Array.from({ length: 10 }, () => makeCloud());

function drawCloudFancy(c, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;

  // shadow
  ctx.beginPath();
  for (const p of c.puffs) {
    ctx.ellipse(c.x + p.ox * c.s, c.y + (p.oy + 6) * c.s, p.rx * c.s, p.ry * c.s, 0, 0, Math.PI * 2);
  }
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fill();

  // cloud
  ctx.beginPath();
  for (const p of c.puffs) {
    ctx.ellipse(c.x + p.ox * c.s, c.y + p.oy * c.s, p.rx * c.s, p.ry * c.s, 0, 0, Math.PI * 2);
  }
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fill();

  // highlight
  ctx.globalAlpha = alpha * 0.65;
  ctx.beginPath();
  for (const p of c.puffs) {
    ctx.ellipse(c.x + p.ox * c.s - 4, c.y + p.oy * c.s - 4, p.rx * c.s * 0.86, p.ry * c.s * 0.78, 0, 0, Math.PI * 2);
  }
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fill();

  ctx.restore();
}

function drawDistantHills(dayFactor) {
  const baseY = H * 0.62;
  ctx.save();
  ctx.globalAlpha = 0.18 + 0.22 * dayFactor;
  ctx.fillStyle = "rgba(0,0,0,0.35)";

  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, baseY);
  for (let x = 0; x <= W; x += 18) {
    const y = baseY + 12 * Math.sin(x * 0.045 + time * 0.06) + 8 * Math.sin(x * 0.11 + 1.4);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();

  // fog band
  const fog = ctx.createLinearGradient(0, baseY - 40, 0, baseY + 50);
  fog.addColorStop(0, `rgba(255,255,255,${0.18 * dayFactor})`);
  fog.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = fog;
  ctx.fillRect(0, baseY - 60, W, 120);

  ctx.restore();
}

function drawSunMoon(dayFactor) {
  const ang = sky.t * Math.PI * 2;
  const x = W * 0.5 + Math.cos(ang - Math.PI / 2) * (W * 0.42);
  const y = H * 0.62 + Math.sin(ang - Math.PI / 2) * (H * 0.32);

  if (dayFactor > 0.10) {
    // Sun
    const glow = ctx.createRadialGradient(x, y, 8, x, y, 140);
    glow.addColorStop(0, `rgba(255,245,200,${0.55 + 0.35 * dayFactor})`);
    glow.addColorStop(1, "rgba(255,245,200,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,220,0.95)";
    ctx.fill();
  } else {
    // Moon opposite
    const mx = W * 0.5 - Math.cos(ang - Math.PI / 2) * (W * 0.42);
    const my = H * 0.62 - Math.sin(ang - Math.PI / 2) * (H * 0.32);

    const glow = ctx.createRadialGradient(mx, my, 6, mx, my, 120);
    glow.addColorStop(0, "rgba(220,235,255,0.35)");
    glow.addColorStop(1, "rgba(220,235,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.beginPath();
    ctx.arc(mx, my, 18, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(220,235,255,0.75)";
    ctx.fill();

    // crescent cut
    ctx.beginPath();
    ctx.arc(mx + 6, my - 2, 16, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(10,20,45,0.55)";
    ctx.fill();
  }
}

function drawSky(dt) {
  sky.t += sky.speed * dt;
  if (sky.t > 1) sky.t -= 1;
  localStorage.setItem("daytime", String(sky.t));

  const raw = 0.5 + 0.5 * Math.sin((sky.t * 6.28318) - 1.5708);
  const dayFactor = smoothstep(raw);

  const top = mixColor("#06102a", "#64c2ff", dayFactor);
  const mid = mixColor("#0b1f3a", "#2f89d9", dayFactor);
  const bot = mixColor("#071a33", "#1c6bb8", dayFactor);

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(0.55, mid);
  g.addColorStop(1, bot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // haze
  const haze = ctx.createRadialGradient(W * 0.55, H * 0.45, 10, W * 0.55, H * 0.45, 230);
  haze.addColorStop(0, `rgba(255,255,255,${0.10 + 0.10 * dayFactor})`);
  haze.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, W, H);

  drawSkyNoise(0.35);

  // stars at night
  const nightAlpha = clamp((0.30 - dayFactor) / 0.30, 0, 1);
  if (nightAlpha > 0.001) {
    ctx.save();
    ctx.fillStyle = "#fff";
    for (const s of stars) {
      const tw = 0.55 + 0.45 * Math.sin(time * 1.6 + s.p);
      ctx.globalAlpha = nightAlpha * s.a * tw;
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
    ctx.restore();
  }

  drawSunMoon(dayFactor);
  drawDistantHills(dayFactor);

  // clouds
  const cloudAlpha = 0.12 + 0.46 * dayFactor;
  for (const c of clouds) {
    c.x -= c.v * dt;
    if (c.x < -220) {
      const nc = makeCloud();
      c.x = W + 220;
      c.y = nc.y;
      c.s = nc.s;
      c.v = nc.v;
      c.a = nc.a;
      c.puffs = nc.puffs;
    }
    drawCloudFancy(c, cloudAlpha * c.a);
  }
}

// ===================== Ground (dirt + real grass edge) =====================
function drawGround(dt) {
  // dirt
  const d = ctx.createLinearGradient(0, groundY, 0, H);
  d.addColorStop(0, "rgba(18,48,36,0.95)");
  d.addColorStop(1, "rgba(7,18,15,1)");
  ctx.fillStyle = d;
  ctx.fillRect(0, groundY, W, H - groundY);

  // dirt spots
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  for (let i = 0; i < 22; i++) {
    const x = (i * 23 + (time * 45) % 23) - 30;
    const y = groundY + 22 + (i % 3) * 14;
    ctx.beginPath();
    ctx.ellipse(x, y, 14, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // grass strip
  const grassH = 18;
  const grassGrad = ctx.createLinearGradient(0, groundY - grassH, 0, groundY + 10);
  grassGrad.addColorStop(0, "rgba(120,255,150,0.72)");
  grassGrad.addColorStop(1, "rgba(30,120,60,0.75)");
  ctx.fillStyle = grassGrad;
  ctx.fillRect(0, groundY - grassH, W, grassH + 6);

  // animated grass edge (wave line)
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = "rgba(200,255,210,0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 6) {
    const w = 3.5 * Math.sin(time * 2.6 + x * 0.10) + 2.2 * Math.sin(time * 1.7 + x * 0.06);
    const y = groundY - 10 + w;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();

  // top line
  ctx.fillStyle = "rgba(255,255,255,.08)";
  ctx.fillRect(0, groundY, W, 2);
}

// ===================== Coins (nice) =====================
function spawnCoinForPipe(p) {
  if (Math.random() < 0.72) {
    const gapTop = p.topH;
    const gapBottom = p.topH + PIPE_GAP;
    const y = rand(gapTop + 30, gapBottom - 30);
    coins.push({
      x: p.x + PIPE_W / 2 + rand(-14, 14),
      y,
      r: 11,
      spin: rand(0, Math.PI * 2),
      taken: false,
      pop: 0,
    });
  }
}

function drawCoin(c) {
  const spin = 0.55 + 0.45 * Math.sin(c.spin);
  const rx = c.r * (0.55 + 0.45 * spin);
  const ry = c.r;

  const g = ctx.createRadialGradient(c.x - 4, c.y - 6, 2, c.x, c.y, c.r * 1.35);
  g.addColorStop(0, "#fff6c7");
  g.addColorStop(0.45, "#ffd04d");
  g.addColorStop(1, "#a86a12");

  const popS = c.pop > 0 ? (1 + 0.22 * Math.sin(c.pop * 10)) : 1;

  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(popS, popS);

  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(0,0,0,.22)";
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.62, ry * 0.62, 0, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,.22)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const sh = 0.45 + 0.55 * Math.sin(c.spin + 1.8);
  ctx.globalAlpha = 0.35 + 0.35 * sh;
  ctx.beginPath();
  ctx.ellipse(-3, -5, rx * 0.28, ry * 0.18, 0.2, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.restore();
}

function drawCoins() {
  for (const c of coins) {
    if (!c.taken) drawCoin(c);
  }
}

function checkCoinPickup() {
  for (const c of coins) {
    if (c.taken) continue;
    const dx = c.x - bird.x;
    const dy = c.y - bird.y;
    const rr = c.r + bird.r;
    if (dx * dx + dy * dy <= rr * rr) {
      c.taken = true;
      setCoins(ECON.coins + ECON.coinPickup);
      sndPlay("coin", VOL.coin);
      c.pop = 0.12;
    }
  }
}

// ===================== Pipes (nice) =====================
function roundRect(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawPipeBody(x, y, w, h) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, "#157a35");
  g.addColorStop(0.35, "#2bd56d");
  g.addColorStop(1, "#0f5c27");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = "rgba(0,0,0,.14)";
  ctx.fillRect(x + 3, y, 5, h);

  ctx.fillStyle = "rgba(255,255,255,.12)";
  ctx.fillRect(x + w - 7, y + 6, 3, h - 12);

  ctx.strokeStyle = "rgba(0,0,0,.25)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

function drawPipeCap(x, y, w, h, up) {
  const capH = 18;
  const capY = up ? (y + h - capH) : y;
  const capW = w + 10;
  const capX = x - 5;

  const g = ctx.createLinearGradient(capX, 0, capX + capW, 0);
  g.addColorStop(0, "#0f5c27");
  g.addColorStop(0.5, "#35ff89");
  g.addColorStop(1, "#0a3f1a");

  ctx.fillStyle = g;
  roundRect(capX, capY, capW, capH, 8);
  ctx.fill();

  ctx.strokeStyle = "rgba(0,0,0,.28)";
  ctx.lineWidth = 2;
  roundRect(capX + 1, capY + 1, capW - 2, capH - 2, 7);
  ctx.stroke();
}

function drawPipes() {
  for (const p of pipes) {
    const x = p.x;
    drawPipeBody(x, 0, PIPE_W, p.topH);
    drawPipeCap(x, 0, PIPE_W, p.topH, true);

    const by = p.topH + PIPE_GAP;
    drawPipeBody(x, by, PIPE_W, groundY - by);
    drawPipeCap(x, by, PIPE_W, groundY - by, false);
  }
}

// ===================== Bird (PRO) =====================
function getActiveSkin() { return skinById(activeSkinId); }

function drawBirdPattern(s) {
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "rgba(0,0,0,.30)";

  if (s.pattern === "stripe") {
    for (let i = -12; i <= 12; i += 6) {
      ctx.beginPath();
      ctx.ellipse(i, 0, 2.2, 11, 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (s.pattern === "dots") {
    for (let i = -12; i <= 12; i += 6) {
      for (let j = -9; j <= 9; j += 6) {
        ctx.beginPath();
        ctx.arc(i, j, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (s.pattern === "split") {
    ctx.globalAlpha = 0.16;
    ctx.beginPath();
    ctx.rect(-bird.r * 1.2, -bird.r, bird.r * 1.2, bird.r * 2);
    ctx.fill();
  } else if (s.pattern === "flame") {
    ctx.globalAlpha = 0.20;
    for (let i = -12; i <= 12; i += 5) {
      ctx.beginPath();
      ctx.moveTo(i, 10);
      ctx.quadraticCurveTo(i + 2, 0, i, -12);
      ctx.quadraticCurveTo(i - 2, 0, i, 10);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawBird() {
  const s = getActiveSkin();

  // subtle glow
  const glowR = bird.r * 3.2;
  const glow = ctx.createRadialGradient(bird.x, bird.y, 2, bird.x, bird.y, glowR);
  glow.addColorStop(0, "rgba(255,255,255,.16)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(bird.x - glowR, bird.y - glowR, glowR * 2, glowR * 2);

  const bob = Math.sin(time * 8) * 0.8;
  const wing = 0.5 + 0.5 * Math.sin(time * 18);
  const blink = (Math.sin(time * 1.6) > 0.98) ? 0.2 : 1;

  ctx.save();
  ctx.translate(bird.x, bird.y + bob);
  ctx.rotate(bird.rot);

  const body = ctx.createLinearGradient(-bird.r, -bird.r, bird.r, bird.r);
  body.addColorStop(0, s.a);
  body.addColorStop(1, s.b);

  // body
  ctx.beginPath();
  ctx.ellipse(0, 0, bird.r * 1.15, bird.r * 0.92, -0.05, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();

  // belly highlight
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.ellipse(-3, 3, bird.r * 0.65, bird.r * 0.45, 0.2, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.globalAlpha = 1;

  drawBirdPattern(s);

  // wing
  ctx.save();
  ctx.translate(-5, 2);
  ctx.rotate(-0.35 + wing * 0.55);
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 7 + wing * 3.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,.22)";
  ctx.fill();
  ctx.restore();

  // eye (blink)
  ctx.save();
  ctx.translate(7, -4);
  ctx.scale(1, blink);
  ctx.beginPath();
  ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(10,10,10,.72)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(1, -1, 1.2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,.70)";
  ctx.fill();
  ctx.restore();

  // beak
  ctx.beginPath();
  ctx.moveTo(bird.r * 1.05, 0);
  ctx.lineTo(bird.r * 1.05 + 11, 2);
  ctx.lineTo(bird.r * 1.05, 9);
  ctx.closePath();
  ctx.fillStyle = s.accent || "#ffb23f";
  ctx.fill();

  // outline
  ctx.strokeStyle = "rgba(0,0,0,.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, bird.r * 1.15, bird.r * 0.92, -0.05, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

// ===================== Collision =====================
function hitRectCircle(rx, ry, rw, rh, cx, cy, cr) {
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);
  const dx = cx - nx;
  const dy = cy - ny;
  return (dx * dx + dy * dy) <= cr * cr;
}
function checkPipeCollision() {
  for (const p of pipes) {
    if (hitRectCircle(p.x, 0, PIPE_W, p.topH, bird.x, bird.y, bird.r)) return true;
    const by = p.topH + PIPE_GAP;
    if (hitRectCircle(p.x, by, PIPE_W, groundY - by, bird.x, bird.y, bird.r)) return true;
  }
  return false;
}

// ===================== Score / Rewards (newbest 1 time) =====================
function addScore(n = 1) {
  setScore(score + n);
  sndPlay("score", VOL.score);

  if (ECON.rewardEvery > 0 && score > 0 && score % ECON.rewardEvery === 0) {
    setCoins(ECON.coins + ECON.rewardCoins);
    sndPlay("coin", VOL.coin);
  }

  // new best sound ONCE per run (when you first beat bestAtRunStart)
  if (!bestThisRunTriggered && score > bestAtRunStart) {
    bestThisRunTriggered = true;
    sndPlay("newbest", VOL.newbest);
  }

  if (score > best) {
    setBest(score);
    window.tgSendBest?.(score, best);
  }
}

// ===================== Spawn / Reset =====================
function resetGame() {
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
  for (let i = 0; i < 4; i++) {
    const topH = rand(92, groundY - PIPE_GAP - 92);
    const p = { x, topH, passed: false };
    pipes.push(p);
    spawnCoinForPipe(p);
    x += PIPE_SPACING;
  }

  hud.classList.remove("hud-hidden");
}

// ===================== Controls (mouse + tap) =====================
async function unlockAudioIfNeeded() {
  await sndInit().catch(() => {});
  sndUnlock();
  sndStartBgm();
  sndUpdateBgmVol();
}
function flap() {
  bird.vy = FLAP_V;
  sndPlay("flap", VOL.flap);
}
function tryFlap() {
  if (!running || paused || gameOver) return;
  flap();
}
function bindInput(el) {
  el.addEventListener("pointerdown", async (e) => {
    e.preventDefault();
    await unlockAudioIfNeeded();
    tryFlap();
  }, { passive: false });

  el.addEventListener("touchstart", async (e) => {
    e.preventDefault();
    await unlockAudioIfNeeded();
    tryFlap();
  }, { passive: false });

  el.addEventListener("mousedown", async (e) => {
    e.preventDefault();
    await unlockAudioIfNeeded();
    tryFlap();
  }, { passive: false });
}
bindInput(canvas);

window.addEventListener("keydown", async (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    await unlockAudioIfNeeded();
    tryFlap();
  }
  if (e.code === "KeyP") togglePause();
});

function togglePause() {
  if (!running || gameOver) return;
  paused = !paused;
  btnPause.textContent = paused ? "▶" : "⏸";
}
btnPause.addEventListener("click", togglePause);

// ===================== Buttons / Navigation =====================
btnMenuPlay.addEventListener("click", async () => {
  await unlockAudioIfNeeded();
  hideAllScreens();
  resetGame();
});
btnMenuSettings.addEventListener("click", () => showSettings());
btnMenuShop.addEventListener("click", () => showShop());
btnBackFromSettings.addEventListener("click", () => showMenu());
btnBackFromShop.addEventListener("click", () => showMenu());

btnRestart.addEventListener("click", async () => {
  await unlockAudioIfNeeded();
  hideAllScreens();
  resetGame();
});
btnBackToMenu.addEventListener("click", () => showMenu());

// ===================== Settings =====================
musicSlider.addEventListener("input", () => {
  musicVol = Number(musicSlider.value || 0);
  localStorage.setItem("musicVol", String(musicVol));
  refreshSettingsUI();
  sndUpdateBgmVol();
});
sfxSlider.addEventListener("input", () => {
  sfxVol = Number(sfxSlider.value || 0);
  localStorage.setItem("sfxVol", String(sfxVol));
  refreshSettingsUI();
});
btnMute.addEventListener("click", () => {
  isMuted = !isMuted;
  localStorage.setItem("muted", isMuted ? "1" : "0");
  refreshSettingsUI();
  sndUpdateBgmVol();
});

// ===================== Shop: Roulette (honest) =====================
let spinning = false;
let lastDrop = null;

function weightedPickRarity() {
  const total = DROP_TABLE.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const it of DROP_TABLE) {
    r -= it.weight;
    if (r <= 0) return it.rarity;
  }
  return "common";
}
function pickSkin() {
  const rar = weightedPickRarity();
  const pool = SKINS.filter(s => s.rarity === rar && s.id !== "default");
  if (pool.length === 0) return SKINS[1];
  return pool[Math.floor(Math.random() * pool.length)];
}
function buildRouletteItems(winnerSkin) {
  const items = [];
  for (let i = 0; i < 45; i++) items.push(pickSkin());
  const winIndex = 35;
  items[winIndex] = winnerSkin;
  return { items, winIndex };
}
function renderStrip(items) {
  rouletteStrip.innerHTML = "";
  for (const s of items) {
    const rar = RARITY[s.rarity];
    const el = document.createElement("div");
    el.className = "ritem";
    el.style.borderColor = rar.color;
    el.style.boxShadow = `0 0 16px ${rar.glow}`;
    el.innerHTML = `<div class="n">${s.name}</div><div class="r">${rarityLabel(s.rarity)}</div>`;
    rouletteStrip.appendChild(el);
  }
}
function getMarkerX() {
  const roulette = rouletteWrap.querySelector(".roulette");
  const r = roulette.getBoundingClientRect();
  return r.left + r.width / 2;
}
function getItemCenterX(el) {
  const r = el.getBoundingClientRect();
  return r.left + r.width / 2;
}

async function spinCase() {
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

  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  const winnerEl = rouletteStrip.children[winIndex];
  const markerX = getMarkerX();

  rouletteStrip.style.transform = `translateX(0px)`;
  const winCenter = getItemCenterX(winnerEl);
  const target = (winCenter - markerX);
  const overshoot = target + rand(120, 220);

  await new Promise((resolve) => {
    const t0 = performance.now();
    const dur1 = 2150;
    const dur2 = 950;

    function step(now) {
      const t = now - t0;
      if (t < dur1) {
        const k = easeOutCubic(t / dur1);
        const x = lerp(0, overshoot, k);
        rouletteStrip.style.transform = `translateX(${-x}px)`;
        requestAnimationFrame(step);
        return;
      }
      const t1 = performance.now();
      function step2(n2) {
        const tt = n2 - t1;
        if (tt < dur2) {
          const k2 = easeOutQuint(tt / dur2);
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

  if (!inventory.includes(winner.id)) {
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

function renderInventory() {
  inventoryEl.innerHTML = "";
  const owned = inventory.map(id => skinById(id)).filter(Boolean);

  for (const s of owned) {
    const rar = RARITY[s.rarity];
    const el = document.createElement("div");
    el.className = "inv" + (s.id === activeSkinId ? " active" : "");
    el.style.borderColor = rar.color;
    el.style.boxShadow = `0 0 14px ${rar.glow}`;
    el.innerHTML = `<div class="name">${s.name}</div><div class="tag">${rarityLabel(s.rarity)}</div>`;
    el.addEventListener("click", () => {
      activeSkinId = s.id;
      localStorage.setItem("active_skin", activeSkinId);
      renderInventory();
    });
    inventoryEl.appendChild(el);
  }
}

btnOpenCase.addEventListener("click", spinCase);
btnEquipSkin.addEventListener("click", () => {
  if (!lastDrop) return;
  activeSkinId = lastDrop.id;
  localStorage.setItem("active_skin", activeSkinId);
  renderInventory();
});

// ===================== Update / Render =====================
function update(dt) {
  if (!running || paused || gameOver) return;

  time += dt;

  // bird physics
  bird.vy += G * dt;
  bird.vy = clamp(bird.vy, -900, MAX_FALL);
  bird.y += bird.vy * dt;

  // rotation smooth
  const targetRot = clamp(bird.vy / 650, -0.55, 0.85);
  bird.rot = lerp(bird.rot, targetRot, 0.10);

  // move pipes & coins
  for (const p of pipes) p.x -= worldSpeed * dt;
  for (const c of coins) {
    c.x -= worldSpeed * dt;
    c.spin += dt * 8.5;
    if (c.pop > 0) c.pop = Math.max(0, c.pop - dt);
  }

  // recycle pipes
  const first = pipes[0];
  if (first && first.x + PIPE_W < -34) {
    pipes.shift();
    const lastX = pipes[pipes.length - 1].x;
    const topH = rand(92, groundY - PIPE_GAP - 92);
    const np = { x: lastX + PIPE_SPACING, topH, passed: false };
    pipes.push(np);
    spawnCoinForPipe(np);
  }

  // scoring
  for (const p of pipes) {
    if (!p.passed && (p.x + PIPE_W) < bird.x) {
      p.passed = true;
      addScore(1);
    }
  }

  checkCoinPickup();

  // bounds
  if (bird.y - bird.r < 0) {
    bird.y = bird.r;
    bird.vy = 0;
  }

  if (bird.y + bird.r >= groundY) {
    bird.y = groundY - bird.r;
    doGameOver();
    return;
  }

  if (checkPipeCollision()) {
    doGameOver();
    return;
  }
}

function doGameOver() {
  if (gameOver) return;
  gameOver = true;
  running = false;
  sndGameOverSeq();
  showGameOver(bestThisRunTriggered ? "New Best!" : "Game Over", `Счёт: ${score}\nМонеты: ${ECON.coins}`);
}

function render(dt) {
  drawSky(dt);
  drawPipes();
  drawCoins();
  drawGround(dt);
  drawBird();

  if (paused && running) {
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.font = "900 22px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", W / 2, H / 2);
  }
}

function loop(now) {
  const dt = clamp((now - tPrev) / 1000, 0, 0.033);
  tPrev = now;

  if (running && !paused) update(dt);
  render(dt);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ===================== Init =====================
showMenu();
renderInventory();
btnOpenCase.disabled = ECON.coins < ECON.caseCost;
setCoins(ECON.coins);

// ===================== UI control helpers =====================
function hideAllScreens() {
  screenMenu.classList.add("hidden");
  screenSettings.classList.add("hidden");
  screenShop.classList.add("hidden");
  screenGameOver.classList.add("hidden");
}
