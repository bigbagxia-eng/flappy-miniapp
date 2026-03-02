const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

const overlay = document.getElementById("overlay");
const btnPlay = document.getElementById("btnPlay");
const btnReset = document.getElementById("btnReset");
const btnPause = document.getElementById("btnPause");
const btnMute = document.getElementById("btnMute");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");

const W = canvas.width, H = canvas.height;

// ================= SOUND ENGINE =================
const SND = {
  ctx: null,
  bufs: {},
  ready: false,
  unlocked: false,
  muted: false,
  bgmSrc: null,
};

const VOL = {
  bgm: 0.25,
  flap: 0.45,
  score: 0.5,
  coin: 0.55,
  hit: 0.7,
  gameover: 0.6,
  newbest: 0.65,
};

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
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      SND.bufs[k] = await SND.ctx.decodeAudioData(arr);
    } catch (e) {
      console.warn("Sound load failed:", k, e);
    }
  }

  SND.ready = true;
}

function sndUnlock() {
  if (SND.ctx?.state === "suspended") SND.ctx.resume();
  SND.unlocked = true;
}

function sndPlay(name, vol) {
  if (!SND.ready || !SND.unlocked || SND.muted) return;
  const buf = SND.bufs[name];
  if (!buf) return;

  const src = SND.ctx.createBufferSource();
  const gain = SND.ctx.createGain();
  gain.gain.value = vol;
  src.buffer = buf;
  src.connect(gain);
  gain.connect(SND.ctx.destination);
  src.start(0);
}

function sndStartBgm() {
  if (!SND.ready || !SND.unlocked || SND.muted) return;
  if (SND.bgmSrc) return;
  const buf = SND.bufs.bgm;
  if (!buf) return;

  const src = SND.ctx.createBufferSource();
  const gain = SND.ctx.createGain();
  gain.gain.value = VOL.bgm;
  src.buffer = buf;
  src.loop = true;
  src.connect(gain);
  gain.connect(SND.ctx.destination);
  src.start(0);
  SND.bgmSrc = src;
}

function sndStopBgm() {
  try { SND.bgmSrc?.stop(); } catch {}
  SND.bgmSrc = null;
}

function sndGameOver() {
  sndPlay("hit", VOL.hit);
  setTimeout(() => sndPlay("gameover", VOL.gameover), 220);
}

function sndToggleMute() {
  SND.muted = !SND.muted;
  btnMute.textContent = SND.muted ? "🔇" : "🔊";
  if (SND.muted) sndStopBgm();
  else sndStartBgm();
}

// ================= GAME =================
let running = false;
let paused = false;
let gameOver = false;

let score = 0;
let bestLocal = Number(localStorage.getItem("best_flappy") || 0);
bestEl.textContent = `BEST ${bestLocal}`;

const cfg = {
  g: 1700,
  flap: -520,
  speed: 210,
  gap: 170,
  pipeW: 68,
  spawn: 1.35,     // сек
  floor: 80,
  grace: 0.8,      // сек “иммунитета” после старта/рестарта
};

const bird = { x: 90, y: H / 2, v: 0, r: 14 };

let pipes = [];
let spawnTimer = 0;
let graceTimer = 0;

function reset() {
  running = false;
  paused = false;
  gameOver = false;

  score = 0;
  scoreEl.textContent = "0";

  bird.y = H / 2;
  bird.v = 0;

  pipes = [];
  spawnTimer = 0;
  graceTimer = cfg.grace;

  overlay.style.display = "grid";
  btnPause.textContent = "⏸";
}

function start() {
  // старт всегда “чистый”
  running = true;
  paused = false;
  gameOver = false;

  // сброс позиции, чтобы не было “сразу упал”
  bird.y = H / 2;
  bird.v = 0;

  // grace время — пока нельзя умереть и не спавнятся трубы
  graceTimer = cfg.grace;
  spawnTimer = 0;
  pipes = [];

  overlay.style.display = "none";
  sndStartBgm();

  // авто-взмах, чтобы старт был приятным
  bird.v = cfg.flap * 0.9;
  sndPlay("flap", VOL.flap);
}

function flap() {
  if (!running) start();
  if (paused || gameOver) return;
  bird.v = cfg.flap;
  sndPlay("flap", VOL.flap);
}

function end() {
  if (gameOver) return;
  gameOver = true;
  running = false;

  sndStopBgm();
  sndGameOver();

  if (score > bestLocal) {
    bestLocal = score;
    localStorage.setItem("best_flappy", String(bestLocal));
    bestEl.textContent = `BEST ${bestLocal}`;

    sndPlay("newbest", VOL.newbest);
    if (typeof tgSendBest === "function") tgSendBest(score, bestLocal);
  }

  overlay.style.display = "grid";
}

function spawnPipe() {
  const min = 40;
  const max = H - cfg.floor - cfg.gap - 40;
  const top = Math.random() * (max - min) + min;
  pipes.push({ x: W + 40, top, passed: false });
}

function update(dt) {
  if (!running || paused || gameOver) return;

  // grace time
  if (graceTimer > 0) graceTimer -= dt;

  // спавн труб только после grace
  if (graceTimer <= 0) {
    spawnTimer += dt;
    if (spawnTimer >= cfg.spawn) {
      spawnTimer = 0;
      spawnPipe();
    }
  }

  // физика птицы
  bird.v += cfg.g * dt;
  bird.y += bird.v * dt;

  const floorY = H - cfg.floor;

  // падение на землю — только после grace
  if (graceTimer <= 0 && bird.y + bird.r >= floorY) {
    end();
    return;
  }

  // трубы
  for (const p of pipes) {
    p.x -= cfg.speed * dt;

    // счёт
    if (!p.passed && p.x + cfg.pipeW < bird.x) {
      p.passed = true;
      score++;
      scoreEl.textContent = String(score);
      sndPlay("score", VOL.score);
    }

    // столкновения — только после grace
    if (graceTimer <= 0) {
      const inX =
        bird.x + bird.r > p.x &&
        bird.x - bird.r < p.x + cfg.pipeW;

      if (inX) {
        const hitTop = bird.y - bird.r < p.top;
        const hitBottom = bird.y + bird.r > p.top + cfg.gap;
        if (hitTop || hitBottom) {
          end();
          return;
        }
      }
    }
  }

  pipes = pipes.filter(p => p.x + cfg.pipeW > -40);
}

function draw() {
  ctx.fillStyle = "#0e1b33";
  ctx.fillRect(0, 0, W, H);

  // pipes
  ctx.fillStyle = "rgba(255,255,255,.2)";
  for (const p of pipes) {
    ctx.fillRect(p.x, 0, cfg.pipeW, p.top);
    ctx.fillRect(
      p.x,
      p.top + cfg.gap,
      cfg.pipeW,
      H - (p.top + cfg.gap) - cfg.floor
    );
  }

  // bird
  ctx.beginPath();
  ctx.fillStyle = "white";
  ctx.arc(bird.x, bird.y, bird.r, 0, Math.PI * 2);
  ctx.fill();

  // floor
  ctx.fillStyle = "#000";
  ctx.fillRect(0, H - cfg.floor, W, cfg.floor);

  // маленькая подсказка grace (необязательно, но приятно)
  if (running && graceTimer > 0) {
    ctx.fillStyle = "rgba(255,255,255,.6)";
    ctx.font = "700 14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("GO!", W / 2, 110);
  }
}

// ================= LOOP =================
let last = performance.now();
function loop(now) {
  let dt = (now - last) / 1000;
  last = now;
  dt = Math.min(dt, 0.033);

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

// ================= INPUT =================
canvas.addEventListener("pointerdown", async () => {
  if (!SND.ready) await sndInit().catch(() => {});
  sndUnlock();
  flap();
});

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    flap();
  }
  if (e.code === "KeyP") {
    paused = !paused;
    btnPause.textContent = paused ? "▶" : "⏸";
  }
});

btnPlay.onclick = () => start();
btnReset.onclick = () => start(); // сразу заново стартуем
btnPause.onclick = () => {
  if (!running) return;
  paused = !paused;
  btnPause.textContent = paused ? "▶" : "⏸";
};
btnMute.onclick = sndToggleMute;

// старт
sndInit().catch(() => {});
reset();
requestAnimationFrame(loop);
