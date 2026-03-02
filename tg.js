const TG = window.Telegram?.WebApp;

function tgInit() {
  if (!TG) return;
  TG.ready();
  TG.expand();
}

function tgSendBest(score, best) {
  if (!TG) return;
  const lastSent = Number(localStorage.getItem("last_sent_best") || 0);
  if (best <= lastSent) return;

  TG.sendData(JSON.stringify({ score, best, ts: Date.now() }));
  localStorage.setItem("last_sent_best", String(best));
}

tgInit();
