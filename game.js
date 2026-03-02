const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

const overlay = document.getElementById("overlay");
const ovTitle = document.getElementById("ovTitle");
const ovText  = document.getElementById("ovText");
const btnPlay = document.getElementById("btnPlay");
const btnReset= document.getElementById("btnReset");
const btnPause= document.getElementById("btnPause");

const scoreEl = document.getElementById("score");
const bestEl  = document.getElementById("best");

const W = canvas.width, H = canvas.height;

// ----- state -----
let running = false;
let paused = false;
let gameOver = false;

let score = 0;
let bestLocal = Number(localStorage.getItem("best_flappy") || 0);
bestEl.textContent = `BEST ${bestLocal}`;

// ----- gameplay tuning (feel) -----
const cfg = {
  // physics (dt-based)
  g: 1750,              // gravity px/s^2
  flapV: -520,          // flap impulse px/s
  maxFall: 900,         // terminal vel
  // scrolling
  speed: 210,           // px/s
  // pipes
  pipeW: 68,
  gap: 175,
  spawnEvery: 1.35,     // seconds
  // world
  floorH: 86,
  ceilingPad: 18,
  // day-night
  dayNightPeriod: 34,   // seconds for full cycle
};

const bird = {
  x: 108,
  y: H * 0.48,
  v: 0,
  r: 14,
  // animation
  flapPhase: 0,
  rot: 0,
};

let pipes = [];
let spawnTimer = 0;

// particles for flap / impact
let particles = [];

// background layers
const stars = makeStars(110);
const clouds = makeClouds(8);

// ----- ui helpers -----
function showOverlay(title, text) {
  ovTitle.textContent = title;
  ovText.textContent = text;
  overlay.classList.remove("hidden");
}
function hideOverlay() { overlay.classList.add("hidden"); }

function reset() {
  running = false;
  paused = false;
  gameOver = false;

  score = 0;
  scoreEl.textContent = "0";

  bird.y = H * 0.48;
  bird.v = 0;
  bird.flapPhase = 0;
  bird.rot = 0;

  pipes = [];
  particles = [];
  spawnTimer = 0;

  showOverlay("Flappy Mini", `Лучший (локально): ${bestLocal}\nНажми “Играть” или тапни по экрану.`);
  btnPause.textContent = "⏸";
}

function start() {
  if (gameOver) reset();
  running = true;
  paused = false;
  gameOver = false;
  hideOverlay();
}

function togglePause() {
  if (!running || gameOver) return;
  paused = !paused;
  btnPause.textContent = paused ? "▶" : "⏸";
  if (!paused) lastT = performance.now();
}

function flap() {
  if (!running) start();
  if (paused || gameOver) return;

  bird.v = cfg.flapV;
  bird.flapPhase = 0;

  // particles
  for (let i=0;i<10;i++) {
    particles.push({
      x: bird.x - 12,
      y: bird.y + rand(-6, 6),
      vx: rand(-90, -260),
      vy: rand(-70, 70),
      a: 1,
      s: rand(1.5, 2.8),
      life: rand(0.25, 0.45),
    });
  }
}

function end(reason="") {
  gameOver = true;
  running = false;

  let isNewBest = false;
  if (score > bestLocal) {
    bestLocal = score;
    localStorage.setItem("best_flappy", String(bestLocal));
    bestEl.textContent = `BEST ${bestLocal}`;
    isNewBest = true;
  }

  if (isNewBest) {
    const res = (typeof tgSendBest === "function") ? tgSendBest(score, bestLocal) : { ok: false };
    if (res.ok) {
      showOverlay("Новый рекорд! 🏆", `Счёт: ${score}\nРекорд автоматически отправлен в ТОП ✅`);
      return;
    }
  }

  const extra = reason ? `\n${reason}` : "";
  showOverlay("Game Over", `Счёт: ${score}\nЛучший (локально): ${bestLocal}${extra}`);
}

// ----- pipe helpers -----
function spawnPipe() {
  const minTop = cfg.ceilingPad + 40;
  const maxTop = H - cfg.floorH - cfg.gap - 40;
  const topH = Math.floor(rand(minTop, maxTop));

  pipes.push({
    x: W + 40,
    topH,
    passed: false,
    wobble: rand(0, Math.PI * 2),
  });
}

function circleRectHit(cx, cy, cr, rx, ry, rw, rh) {
  const nx = Math.max(rx, Math.min(cx, rx + rw));
  const ny = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nx;
  const dy = cy - ny;
  return (dx*dx + dy*dy) <= cr*cr;
}

// ----- background generation -----
function makeStars(n){
  const arr=[];
  for(let i=0;i<n;i++){
    arr.push({
      x: Math.random()*W,
      y: Math.random()*(H*0.62),
      r: rand(0.6, 1.8),
      tw: rand(0, 10),
    });
  }
  return arr;
}
function makeClouds(n){
  const arr=[];
  for(let i=0;i<n;i++){
    arr.push({
      x: Math.random()*W,
      y: rand(50, H*0.52),
      s: rand(0.6, 1.35),
      sp: rand(8, 18),
      a: rand(0.10, 0.20),
    });
  }
  return arr;
}

// ----- render helpers (day/night) -----
let globalTime = 0;

function dayNightK(t){
  // 0..1 (0 = night, 1 = day) smooth cycle
  const p = (t % cfg.dayNightPeriod) / cfg.dayNightPeriod; // 0..1
  // cosine: day at p=0.25, night at p=0.75
  return 0.5 - 0.5 * Math.cos(p * Math.PI * 2);
}

function lerp(a,b,k){ return a + (b-a)*k; }
function clamp(x,a,b){ return Math.max(a, Math.min(b,x)); }
function rgba(r,g,b,a){ return `rgba(${r|0},${g|0},${b|0},${a})`; }

function drawBackground(dt){
  const kDay = dayNightK(globalTime); // 0..1
  // sky gradient
  const top = {
    r: lerp(10, 70, kDay),
    g: lerp(16, 160, kDay),
    b: lerp(40, 255, kDay),
  };
  const bot = {
    r: lerp(8, 110, kDay),
    g: lerp(12, 200, kDay),
    b: lerp(24, 255, kDay),
  };

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `rgb(${top.r|0},${top.g|0},${top.b|0})`);
  g.addColorStop(1, `rgb(${bot.r|0},${bot.g|0},${bot.b|0})`);
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  // sun/moon path
  const p = (globalTime % cfg.dayNightPeriod) / cfg.dayNightPeriod; // 0..1
  const angle = (p * Math.PI * 2) - Math.PI/2;
  const cx = W/2 + Math.cos(angle) * (W*0.33);
  const cy = H*0.33 + Math.sin(angle) * (H*0.22);

  // sun glow
  const sunA = clamp((kDay - 0.15) / 0.85, 0, 1);
  if (sunA > 0){
    const gg = ctx.createRadialGradient(cx, cy, 10, cx, cy, 120);
    gg.addColorStop(0, rgba(255, 235, 170, 0.55*sunA));
    gg.addColorStop(1, rgba(255, 235, 170, 0));
    ctx.fillStyle = gg;
    ctx.fillRect(0,0,W,H);

    ctx.beginPath();
    ctx.fillStyle = rgba(255, 244, 210, 0.9*sunA);
    ctx.arc(cx, cy, 18, 0, Math.PI*2);
    ctx.fill();
  }

  // moon
  const moonA = clamp((0.85 - kDay) / 0.85, 0, 1);
  if (moonA > 0){
    const gg = ctx.createRadialGradient(cx, cy, 8, cx, cy, 110);
    gg.addColorStop(0, rgba(180, 200, 255, 0.30*moonA));
    gg.addColorStop(1, rgba(180, 200, 255, 0));
    ctx.fillStyle = gg;
    ctx.fillRect(0,0,W,H);

    ctx.beginPath();
    ctx.fillStyle = rgba(210, 225, 255, 0.85*moonA);
    ctx.arc(cx, cy, 14, 0, Math.PI*2);
    ctx.fill();

    // crescent cut
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(cx+6, cy-2, 14, 0, Math.PI*2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }

  // stars (more visible at night)
  const starA = clamp((0.7 - kDay)/0.7, 0, 1);
  if (starA > 0){
    for(const s of stars){
      s.tw += dt * rand(0.6, 1.2);
      const tw = 0.55 + 0.45*Math.sin(s.tw);
      ctx.fillStyle = rgba(230, 240, 255, starA * 0.85 * tw);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fill();
    }
  }

  // distant haze
  ctx.fillStyle = rgba(255,255,255, lerp(0.06, 0.12, kDay));
  ctx.fillRect(0, H*0.55, W, H*0.45);

  // clouds (slower than pipes)
  for(const c of clouds){
    c.x -= c.sp * dt;
    if (c.x < -160*c.s) { c.x = W + rand(40, 200); c.y = rand(40, H*0.52); }
    drawCloud(c.x, c.y, c.s, c.a * lerp(0.9, 1.2, kDay));
  }

  // ground
  drawGround(kDay);
}

function drawCloud(x,y,s,a){
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(s,s);
  ctx.fillStyle = rgba(255,255,255, a);
  roundedBlob(0,0);
  ctx.restore();

  function roundedBlob(px,py){
    ctx.beginPath();
    ctx.ellipse(px, py, 44, 22, 0, 0, Math.PI*2);
    ctx.ellipse(px-28, py+2, 26, 16, 0, 0, Math.PI*2);
    ctx.ellipse(px+24, py+4, 30, 18, 0, 0, Math.PI*2);
    ctx.ellipse(px-4, py-12, 28, 18, 0, 0, Math.PI*2);
    ctx.fill();
  }
}

function drawGround(kDay){
  const y = H - cfg.floorH;

  // base
  const gg = ctx.createLinearGradient(0, y, 0, H);
  gg.addColorStop(0, rgba(8, 12, 20, 0.55));
  gg.addColorStop(1, rgba(0, 0, 0, 0.75));
  ctx.fillStyle = gg;
  roundRect(0, y, W, cfg.floorH, 18);
  ctx.fill();

  // neon grass line
  ctx.fillStyle = rgba(170, 255, 220, lerp(0.08, 0.22, kDay));
  ctx.fillRect(0, y+2, W, 2);

  // moving floor stripes
  const t = globalTime * (cfg.speed*0.35);
  ctx.fillStyle = rgba(255,255,255, 0.06);
  for(let i=0;i<14;i++){
    const x = ((i*60 - (t%60))|0);
    ctx.fillRect(x, y+18, 30, 6);
  }
}

// ----- drawing: pipes, bird, particles -----
function drawPipes(dt){
  const kDay = dayNightK(globalTime);

  for(const p of pipes){
    const x = p.x;
    const wob = Math.sin(globalTime*1.3 + p.wobble) * 1.8;
    const topH = p.topH + wob;

    // pipe style
    const body = ctx.createLinearGradient(x, 0, x+cfg.pipeW, 0);
    body.addColorStop(0, rgba(30, 255, 200, lerp(0.16, 0.28, kDay)));
    body.addColorStop(0.5, rgba(255,255,255, lerp(0.10, 0.18, kDay)));
    body.addColorStop(1, rgba(30, 255, 200, lerp(0.10, 0.20, kDay)));

    const cap = rgba(255,255,255, lerp(0.14, 0.22, kDay));
    const outline = rgba(255,255,255, 0.14);

    // top pipe
    ctx.fillStyle = body;
    roundRect(x, 0, cfg.pipeW, topH, 14);
    ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = cap;
    roundRect(x-3, topH-16, cfg.pipeW+6, 18, 12);
    ctx.fill();

    // bottom pipe
    const by = topH + cfg.gap;
    const bh = (H - cfg.floorH) - by;

    ctx.fillStyle = body;
    roundRect(x, by, cfg.pipeW, bh, 14);
    ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = cap;
    roundRect(x-3, by, cfg.pipeW+6, 18, 12);
    ctx.fill();
  }
}

function drawBird(dt){
  // wing flap animation
  bird.flapPhase += dt * 10;

  // rotation based on velocity
  const targetRot = clamp(bird.v / 900, -0.45, 0.9);
  bird.rot = lerp(bird.rot, targetRot, 0.12);

  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rot);

  // glow
  const glow = ctx.createRadialGradient(0,0,6, 0,0,40);
  glow.addColorStop(0, rgba(255,255,255,0.22));
  glow.addColorStop(1, rgba(255,255,255,0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0,0,38,0,Math.PI*2);
  ctx.fill();

  // body gradient
  const kDay = dayNightK(globalTime);
  const body = ctx.createLinearGradient(-20,-10, 20, 18);
  body.addColorStop(0, rgba(255, 255, 255, 0.95));
  body.addColorStop(1, rgba(200, 240, 255, lerp(0.75, 0.92, kDay)));
  ctx.fillStyle = body;

  // body
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 14, 0, 0, Math.PI*2);
  ctx.fill();

  // wing
  const wingT = 0.5 + 0.5*Math.sin(bird.flapPhase);
  ctx.fillStyle = rgba(0,0,0, 0.12);
  ctx.beginPath();
  ctx.ellipse(-3, 3, lerp(10, 14, wingT), lerp(6, 10, wingT), -0.2, 0, Math.PI*2);
  ctx.fill();

  // beak
  ctx.fillStyle = rgba(255, 210, 120, 0.95);
  ctx.beginPath();
  ctx.moveTo(14, -1);
  ctx.lineTo(26, 3);
  ctx.lineTo(14, 7);
  ctx.closePath();
  ctx.fill();

  // eye
  ctx.fillStyle = rgba(0,0,0,0.45);
  ctx.beginPath();
  ctx.arc(6, -4, 3.1, 0, Math.PI*2);
  ctx.fill();

  // highlight
  ctx.fillStyle = rgba(255,255,255,0.55);
  ctx.beginPath();
  ctx.arc(7, -5, 1.2, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}

function drawParticles(dt){
  for (let i=particles.length-1;i>=0;i--){
    const p = particles[i];
    p.life -= dt;
    p.a = clamp(p.life / 0.45, 0, 1);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= (1 - 0.9*dt);
    p.vy *= (1 - 0.9*dt);

    ctx.fillStyle = rgba(255,255,255, 0.35 * p.a);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.s, 0, Math.PI*2);
    ctx.fill();

    if (p.life <= 0) particles.splice(i,1);
  }
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

// ----- update loop -----
function update(dt){
  if (!running || paused || gameOver) return;

  globalTime += dt;

  // spawn pipes
  spawnTimer += dt;
  if (spawnTimer >= cfg.spawnEvery){
    spawnTimer = 0;
    spawnPipe();
  }

  // bird physics
  bird.v += cfg.g * dt;
  bird.v = Math.min(bird.v, cfg.maxFall);
  bird.y += bird.v * dt;

  // bounds
  const floorY = H - cfg.floorH;
  if (bird.y + bird.r >= floorY){
    bird.y = floorY - bird.r;
    end("Упал на землю");
    return;
  }
  if (bird.y - bird.r <= cfg.ceilingPad){
    bird.y = cfg.ceilingPad + bird.r;
    bird.v = 0;
  }

  // pipes movement + collision + scoring
  for (const p of pipes){
    p.x -= cfg.speed * dt;

    const wob = Math.sin(globalTime*1.3 + p.wobble) * 1.8;
    const topH = p.topH + wob;

    // collision
    const x = p.x, w = cfg.pipeW;
    const gapY = topH;
    const gapH = cfg.gap;

    if (circleRectHit(bird.x, bird.y, bird.r, x, 0, w, gapY)) { end("Врезался в трубу"); return; }
    const by = gapY + gapH;
    const bh = (H - cfg.floorH) - by;
    if (circleRectHit(bird.x, bird.y, bird.r, x, by, w, bh)) { end("Врезался в трубу"); return; }

    // scoring
    if (!p.passed && x + w < bird.x){
      p.passed = true;
      score += 1;
      scoreEl.textContent = String(score);
    }
  }

  // clean pipes
  pipes = pipes.filter(p => p.x + cfg.pipeW > -40);

  // particles (also update when running)
  for (let i=particles.length-1;i>=0;i--){
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) particles.splice(i,1);
  }
}

function draw(dt){
  // if stopped, still animate day/night + clouds a bit
  if (!paused) globalTime += dt * (running ? 0 : 0.35);

  drawBackground(dt);
  drawPipes(dt);
  drawParticles(dt);
  drawBird(dt);

  // subtle vignette
  const v = ctx.createRadialGradient(W/2,H/2, 80, W/2,H/2, 420);
  v.addColorStop(0, rgba(0,0,0,0));
  v.addColorStop(1, rgba(0,0,0,0.28));
  ctx.fillStyle = v;
  ctx.fillRect(0,0,W,H);
}

function rand(a,b){ return a + Math.random()*(b-a); }

// ----- input -----
canvas.addEventListener("pointerdown", () => flap());
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") { e.preventDefault(); flap(); }
  if (e.code === "KeyP") togglePause();
});

btnPlay.addEventListener("click", () => start());
btnReset.addEventListener("click", () => { reset(); start(); });
btnPause.addEventListener("click", togglePause);

// ----- main loop -----
let lastT = performance.now();
function loop(now){
  let dt = (now - lastT) / 1000;
  lastT = now;

  // clamp dt to avoid crazy jumps if tab was inactive
  dt = Math.min(dt, 0.033);

  if (!paused) update(dt);
  draw(dt);

  requestAnimationFrame(loop);
}

reset();
requestAnimationFrame(loop);
