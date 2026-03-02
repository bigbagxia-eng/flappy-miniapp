const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

const overlay = document.getElementById("overlay");
const ovTitle = document.getElementById("ovTitle");
const ovText = document.getElementById("ovText");
const btnPlay = document.getElementById("btnPlay");
const btnReset = document.getElementById("btnReset");
const btnPause = document.getElementById("btnPause");
const scoreEl = document.getElementById("score");

const W = canvas.width, H = canvas.height;

let running = false;
let paused = false;
let gameOver = false;

let score = 0;
let bestLocal = Number(localStorage.getItem("best_flappy") || 0);

const bird = {
  x: 90,
  y: H * 0.5,
  vy: 0,
  r: 14,
};

const world = {
  t: 0,
  gravity: 0.52,
  flap: -9.2,
  speed: 2.6,
  pipeGap: 165,
  pipeW: 62,
  spawnEvery: 92,
  pipes: [],
};

function reset() {
  running = false;
  paused = false;
  gameOver = false;

  score = 0;
  scoreEl.textContent = "0";
  bird.x = 90;
  bird.y = H * 0.5;
  bird.vy = 0;

  world.t = 0;
  world.pipes = [];

  showOverlay("Flappy Mini", `Лучший (локально): ${bestLocal}\nНажми "Играть" или тапни по экрану.`);
}

function showOverlay(title, text) {
  ovTitle.textContent = title;
  ovText.textContent = text;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function start() {
  if (gameOver) reset();
  running = true;
  paused = false;
  gameOver = false;
  hideOverlay();
}

function end() {
  gameOver = true;
  running = false;

  let isNewBest = false;
  if (score > bestLocal) {
    bestLocal = score;
    localStorage.setItem("best_flappy", String(bestLocal));
    isNewBest = true;
  }

  // Авто-отправка ТОЛЬКО если новый рекорд (и только 1 раз на этот best)
  if (isNewBest) {
    const res = (typeof tgSendBest === "function") ? tgSendBest(score, bestLocal) : { ok: false };
    if (res.ok) {
      showOverlay("Новый рекорд! 🏆", `Счёт: ${score}\nРекорд автоматически отправлен в ТОП ✅`);
      return;
    }
  }

  showOverlay("Game Over", `Счёт: ${score}\nЛучший (локально): ${bestLocal}`);
}

function flap() {
  if (!running) start();
  if (paused || gameOver) return;
  bird.vy = world.flap;
}

function togglePause() {
  if (!running || gameOver) return;
  paused = !paused;
  btnPause.textContent = paused ? "▶" : "⏸";
  if (!paused) lastTime = performance.now();
}

function spawnPipe() {
  const margin = 50;
  const gap = world.pipeGap;
  const topH = Math.floor(margin + Math.random() * (H - gap - margin * 2));
  world.pipes.push({ x: W + 10, topH, passed: false });
}

function rectCircleCollide(rx, ry, rw, rh, cx, cy, cr) {
  const nx = Math.max(rx, Math.min(cx, rx + rw));
  const ny = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nx;
  const dy = cy - ny;
  return (dx * dx + dy * dy) <= cr * cr;
}

function update() {
  if (!running || paused || gameOver) return;

  world.t += 1;

  if (world.t % world.spawnEvery === 0) spawnPipe();

  bird.vy += world.gravity;
  bird.y += bird.vy;

  if (bird.y + bird.r >= H - 10) {
    bird.y = H - 10 - bird.r;
    end();
    return;
  }
  if (bird.y - bird.r <= 10) {
    bird.y = 10 + bird.r;
    bird.vy = 0;
  }

  for (const p of world.pipes) {
    p.x -= world.speed;

    const gapY = p.topH;
    const gapH = world.pipeGap;

    if (rectCircleCollide(p.x, 0, world.pipeW, gapY, bird.x, bird.y, bird.r)) { end(); return; }
    if (rectCircleCollide(p.x, gapY + gapH, world.pipeW, H - (gapY + gapH), bird.x, bird.y, bird.r)) { end(); return; }

    if (!p.passed && p.x + world.pipeW < bird.x) {
      p.passed = true;
      score += 1;
      scoreEl.textContent = String(score);
    }
  }

  world.pipes = world.pipes.filter(p => p.x + world.pipeW > -10);
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#122a57");
  g.addColorStop(1, "#0b1220");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(0, H - 10, W, 10);

  for (const p of world.pipes) {
    const gapY = p.topH;
    const gapH = world.pipeGap;

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(p.x, 0, world.pipeW, gapY);
    ctx.fillRect(p.x, gapY + gapH, world.pipeW, H - (gapY + gapH));

    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(p.x, gapY - 10, world.pipeW, 10);
    ctx.fillRect(p.x, gapY + gapH, world.pipeW, 10);
  }

  ctx.beginPath();
  ctx.fillStyle = "white";
  ctx.arc(bird.x, bird.y, bird.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.arc(bird.x + 6, bird.y - 4, 3, 0, Math.PI * 2);
  ctx.fill();

  if (!running && !gameOver) {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "700 16px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Тап / Space — взмах", W / 2, H * 0.45);
  }
}

let lastTime = performance.now();
function loop(now) {
  const dt = now - lastTime;
  if (dt >= 16) {
    update();
    draw();
    lastTime = now;
  }
  requestAnimationFrame(loop);
}

function onTap() {
  flap();
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") { e.preventDefault(); flap(); }
  if (e.code === "KeyP") togglePause();
});

canvas.addEventListener("pointerdown", onTap);
btnPlay.addEventListener("click", () => start());
btnReset.addEventListener("click", () => { reset(); start(); });
btnPause.addEventListener("click", togglePause);

reset();
requestAnimationFrame(loop);
