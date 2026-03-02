:root{
  --bg:#0b1220;
  --card: rgba(255,255,255,.08);
  --stroke: rgba(255,255,255,.14);
  --shadow: rgba(0,0,0,.45);
  --text: rgba(255,255,255,.92);
  --muted: rgba(255,255,255,.72);
}

html, body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  height: 100%;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;
  color: var(--text);
}

#wrap{
  height:100%;
  display:grid;
  place-items:center;
  padding: 14px;
}

#frame{
  width: min(100vw, 460px);
  position: relative;
}

canvas{
  width: 100%;
  height: auto;
  border-radius: 18px;
  background: #0e1b33;
  box-shadow: 0 16px 60px var(--shadow);
  border: 1px solid rgba(255,255,255,.10);
  touch-action: manipulation;
}

/* HUD */
#hud{
  position:absolute;
  top: 12px;
  left: 0;
  right: 0;
  padding: 0 12px;
  display:flex;
  justify-content: space-between;
  align-items:flex-start;
  pointer-events:none;
}
.hud-hidden{ display:none; }

#scoreBox{
  pointer-events:none;
  display:flex;
  flex-direction:column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(0,0,0,.22);
  border: 1px solid rgba(255,255,255,.10);
  backdrop-filter: blur(10px);
}

#score{
  font-size: 32px;
  font-weight: 900;
  line-height: 1;
}

.subrow{
  display:flex;
  gap: 10px;
  align-items:center;
}
#best, #coinsHud{
  font-size: 12px;
  font-weight: 800;
  color: rgba(255,255,255,.75);
  letter-spacing: .6px;
}

#hudBtns{ pointer-events:auto; display:flex; gap:10px; }

.btn{
  border: 0;
  border-radius: 14px;
  padding: 12px 14px;
  font-weight: 900;
  background: rgba(255,255,255,.92);
  color: #0b1220;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(0,0,0,.25);
}
.btn.small{ padding: 10px 12px; border-radius: 14px; }
.btn.ghost{
  background: rgba(255,255,255,.12);
  color: rgba(255,255,255,.92);
  box-shadow: none;
  border: 1px solid rgba(255,255,255,.16);
}

#ui{
  position:absolute;
  inset:0;
  display:block;
}

#topbar{
  position:absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  display:flex;
  justify-content: space-between;
  align-items:center;
  pointer-events:none;
}
#brand{
  font-weight: 950;
  letter-spacing: .4px;
  opacity: .85;
  background: rgba(0,0,0,.20);
  border: 1px solid rgba(255,255,255,.10);
  padding: 8px 10px;
  border-radius: 14px;
  backdrop-filter: blur(10px);
}
#coinsTop{
  font-weight: 900;
  opacity: .9;
  background: rgba(0,0,0,.20);
  border: 1px solid rgba(255,255,255,.10);
  padding: 8px 10px;
  border-radius: 14px;
  backdrop-filter: blur(10px);
}

.screen{
  position:absolute;
  inset:0;
  display:grid;
  place-items:center;
  background: radial-gradient(ellipse at center, rgba(0,0,0,.15), rgba(0,0,0,.55));
  padding: 18px;
}
.hidden{ display:none; }

.card{
  width: min(92vw, 380px);
  background: var(--card);
  border: 1px solid var(--stroke);
  border-radius: 20px;
  padding: 16px;
  backdrop-filter: blur(10px);
}
.card.big{ padding: 18px; }

.title{ font-size: 22px; font-weight: 950; margin-bottom: 8px; }
.text{ color: var(--text); margin-bottom: 14px; line-height: 1.25; white-space: pre-line; }
.muted{ color: var(--muted); }

.row{ display:flex; gap: 10px; margin-top: 10px; }
.row .btn{ flex:1; }

.setting{ margin-top: 12px; }
.labelrow{
  display:flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-weight: 850;
}
input[type="range"]{
  width:100%;
}

.shopRow{
  display:flex;
  gap: 12px;
  align-items:center;
  justify-content: space-between;
  flex-wrap: wrap;
}
.caseBox{
  display:flex;
  gap: 12px;
  align-items:center;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.18);
}
.caseIcon{ font-size: 28px; }
.caseTitle{ font-weight: 950; }

#rouletteWrap{ margin-top: 14px; }

.roulette{
  position: relative;
  height: 92px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(0,0,0,.20);
  overflow: hidden;
}
.marker{
  position:absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 0;
  transform: translateX(-50%);
  border-left: 2px solid rgba(255,255,255,.85);
  box-shadow: 0 0 18px rgba(255,255,255,.35);
  pointer-events:none;
}
.strip{
  position:absolute;
  left:0;
  top:0;
  height:100%;
  display:flex;
  gap: 10px;
  align-items:center;
  padding: 0 12px;
  will-change: transform;
}
.ritem{
  width: 120px;
  height: 70px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  display:flex;
  flex-direction:column;
  justify-content:center;
  padding: 10px;
}
.ritem .n{ font-weight: 950; }
.ritem .r{ font-size: 12px; opacity: .85; margin-top: 3px; }

.dropResult{
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.18);
  font-weight: 900;
}

.invTitle{
  margin-top: 14px;
  font-weight: 950;
  opacity: .95;
}
.inventory{
  margin-top: 8px;
  display:grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.inv{
  padding: 10px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.18);
  cursor:pointer;
}
.inv .name{ font-weight: 950; }
.inv .tag{ font-size: 12px; opacity: .85; margin-top: 3px; }
.inv.active{
  outline: 2px solid rgba(255,255,255,.65);
}
