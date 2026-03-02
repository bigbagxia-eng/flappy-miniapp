const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

const overlay = document.getElementById("overlay");
const ovTitle = document.getElementById("ovTitle");
const ovText  = document.getElementById("ovText");
const btnPlay = document.getElementById("btnPlay");
const btnReset= document.getElementById("btnReset");
const btnPause= document.getElementById("btnPause");
const btnMute = document.getElementById("btnMute");

const scoreEl = document.getElementById("score");
const bestEl  = document.getElementById("best");

const W = canvas.width, H = canvas.height;

// ===== helpers UI =====
function showOverlay(title, text){
  ovTitle.textContent = title;
  ovText.textContent = text;
  overlay.classList.remove("hidden");
}
function hideOverlay(){
  overlay.classList.add("hidden");
}

// ===== SOUND (7 files) =====
const SND = { ctx:null, bufs:{}, ready:false, unlocked:false, muted:false, bgmSrc:null };

const VOL = {
  bgm: 0.24,
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
      console.warn("sound fail", k, e);
    }
  }
  SND.ready = true;
}

function sndUnlock(){
  if (SND.ctx?.state === "suspended") SND.ctx.resume();
  SND.unlocked = true;
}
function sndPlay(name, vol){
  if (!SND.ready || !SND.unlocked || SND.muted) return;
  const b = SND.bufs[name];
  if (!b) return;
  const src = SND.ctx.createBufferSource();
  const gain= SND.ctx.createGain();
  gain.gain.value = vol;
  src.buffer = b;
  src.connect(gain);
  gain.connect(SND.ctx.destination);
  src.start(0);
}

function sndStartBgm(){
  if (!SND.ready || !SND.unlocked || SND.muted) return;
  if (SND.bgmSrc) return;
  const b = SND.bufs.bgm;
  if (!b) return;

  const src = SND.ctx.createBufferSource();
  const gain= SND.ctx.createGain();
  gain.gain.value = VOL.bgm;

  src.buffer = b;
  src.loop = true;
  src.connect(gain);
  gain.connect(SND.ctx.destination);
  src.start(0);

  SND.bgmSrc = src;
}
function sndStopBgm(){
  try{ SND.bgmSrc?.stop(); }catch{}
  SND.bgmSrc = null;
}
function sndGameOverSeq(){
  sndPlay("hit", VOL.hit);
  setTimeout(()=> sndPlay("gameover", VOL.gameover), 220);
}
function sndToggleMute(){
  SND.muted = !SND.muted;
  btnMute.textContent = SND.muted ? "🔇" : "🔊";
  if (SND.muted) sndStopBgm();
  else sndStartBgm();
}

// ===== GAME =====
let running=false, paused=false, gameOver=false;

let score=0;
let bestLocal = Number(localStorage.getItem("best_flappy") || 0);
bestEl.textContent = `BEST ${bestLocal}`;

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
  grace: 0.85,        // <= фикс “моментально проигрываю”
  dayNightPeriod: 34,
};

const bird = { x:108, y:H*0.48, v:0, r:14, flapPhase:0, rot:0 };
let pipes=[];
let spawnTimer=0;
let graceTimer=cfg.grace;

let particles=[];

// bg layers
const stars = makeStars(110);
const clouds = makeClouds(8);
let globalTime = 0;

function reset(){
  running=false; paused=false; gameOver=false;
  score=0; scoreEl.textContent="0";
  bird.y=H*0.48; bird.v=0; bird.flapPhase=0; bird.rot=0;
  pipes=[]; particles=[]; spawnTimer=0; graceTimer=cfg.grace;
  btnPause.textContent="⏸";
  showOverlay("Flappy Mini", `Лучший (локально): ${bestLocal}\nНажми “Играть” или тапни по экрану.`);
}

function start(){
  running=true; paused=false; gameOver=false;

  // чистый старт
  score=0; scoreEl.textContent="0";
  bird.y=H*0.48; bird.v=0;
  pipes=[]; particles=[];
  spawnTimer=0; graceTimer=cfg.grace;

  hideOverlay();

  // музыка + стартовый импульс
  sndStartBgm();
  bird.v = cfg.flapV * 0.9;
  sndPlay("flap", VOL.flap);
}

function flap(){
  if (!running) start();
  if (paused || gameOver) return;
  bird.v = cfg.flapV;
  bird.flapPhase = 0;
  sndPlay("flap", VOL.flap);

  for(let i=0;i<10;i++){
    particles.push({
      x: bird.x-12, y: bird.y + rand(-6,6),
      vx: rand(-90,-260), vy: rand(-70,70),
      life: rand(0.22,0.40), s: rand(1.5,2.8)
    });
  }
}

function end(reason=""){
  if (gameOver) return;
  gameOver=true; running=false;

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
    showOverlay("Новый рекорд! 🏆", `Счёт: ${score}\nРекорд отправлен в ТОП ✅`);
  } else {
    showOverlay("Game Over", `Счёт: ${score}\nЛучший (локально): ${bestLocal}${reason ? "\n"+reason : ""}`);
  }
}

function togglePause(){
  if (!running || gameOver) return;
  paused=!paused;
  btnPause.textContent = paused ? "▶" : "⏸";
  if (!paused) lastT = performance.now();
}

function spawnPipe(){
  const margin=50;
  const topMin = cfg.ceilingPad + 40;
  const topMax = H - cfg.floorH - cfg.gap - 40;
  const topH = Math.floor(rand(topMin, topMax));
  pipes.push({ x: W+40, topH, passed:false, wobble: rand(0,Math.PI*2) });
}

function circleRectHit(cx,cy,cr, rx,ry,rw,rh){
  const nx = Math.max(rx, Math.min(cx, rx+rw));
  const ny = Math.max(ry, Math.min(cy, ry+rh));
  const dx = cx-nx, dy=cy-ny;
  return dx*dx + dy*dy <= cr*cr;
}

// ===== background gen =====
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
  const p = (t % cfg.dayNightPeriod) / cfg.dayNightPeriod;
  return 0.5 - 0.5*Math.cos(p*Math.PI*2);
}
function lerp(a,b,k){ return a+(b-a)*k; }
function clamp(x,a,b){ return Math.max(a, Math.min(b,x)); }
function rgba(r,g,b,a){ return `rgba(${r|0},${g|0},${b|0},${a})`; }

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

function drawPipes(dt){
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

  ctx.save();
  ctx.translate(bird.x,bird.y);
  ctx.rotate(bird.rot);

  const glow = ctx.createRadialGradient(0,0,6,0,0,40);
  glow.addColorStop(0, rgba(255,255,255,0.22));
  glow.addColorStop(1, rgba(255,255,255,0));
  ctx.fillStyle=glow;
  ctx.beginPath(); ctx.arc(0,0,38,0,Math.PI*2); ctx.fill();

  const kDay = dayNightK(globalTime);
  const body = ctx.createLinearGradient(-20,-10,20,18);
  body.addColorStop(0, rgba(255,255,255,0.95));
  body.addColorStop(1, rgba(200,240,255, lerp(0.75,0.92,kDay)));
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
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.life -= dt;
    p.x += p.vx*dt;
    p.y += p.vy*dt;
    p.vx *= (1-0.9*dt);
    p.vy *= (1-0.9*dt);

    const a = clamp(p.life/0.45,0,1);
    ctx.fillStyle = rgba(255,255,255, 0.35*a);
    ctx.beginPath(); ctx.arc(p.x,p.y,p.s,0,Math.PI*2); ctx.fill();

    if (p.life<=0) particles.splice(i,1);
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

// ===== update/draw loop =====
function update(dt){
  if (!running || paused || gameOver) return;

  globalTime += dt;

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
    end("Упал на землю");
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
    }

    if (graceTimer <= 0){
      const x=p.x, w=cfg.pipeW;
      const gapY=topH, gapH=cfg.gap;

      if (circleRectHit(bird.x,bird.y,bird.r, x,0,w,gapY)){ end("Врезался в трубу"); return; }
      const by = gapY + gapH;
      const bh = (H - cfg.floorH) - by;
      if (circleRectHit(bird.x,bird.y,bird.r, x,by,w,bh)){ end("Врезался в трубу"); return; }
    }
  }

  pipes = pipes.filter(p => p.x + cfg.pipeW > -40);
}

function draw(dt){
  if (!paused) globalTime += dt*(running ? 0 : 0.35);

  drawBackground(dt);
  drawPipes(dt);
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

function rand(a,b){ return a + Math.random()*(b-a); }

// ===== input =====
canvas.addEventListener("pointerdown", async ()=>{
  if (!SND.ready) await sndInit().catch(()=>{});
  sndUnlock();
  flap();
});

window.addEventListener("keydown", (e)=>{
  if (e.code === "Space"){
    e.preventDefault();
    flap();
  }
  if (e.code === "KeyP"){
    togglePause();
  }
});

btnPlay.addEventListener("click", async ()=>{
  if (!SND.ready) await sndInit().catch(()=>{});
  sndUnlock();
  start();
});
btnReset.addEventListener("click", async ()=>{
  if (!SND.ready) await sndInit().catch(()=>{});
  sndUnlock();
  start();
});
btnPause.addEventListener("click", togglePause);
btnMute.addEventListener("click", sndToggleMute);

// ===== loop =====
let lastT = performance.now();
function loop(now){
  let dt = (now - lastT)/1000;
  lastT = now;
  dt = Math.min(dt, 0.033);

  update(dt);
  draw(dt);

  requestAnimationFrame(loop);
}

sndInit().catch(()=>{});
reset();
requestAnimationFrame(loop);
