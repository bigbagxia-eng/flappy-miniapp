const TG = window.Telegram?.WebApp;

function tgInit() {
  if (!TG) return;
  TG.ready();
  TG.expand();
  document.body.style.background = TG.themeParams?.bg_color || "#0b1220";
}

// отправляем только если best > last_sent_best
function tgSendBest(score, best) {
  if (!TG) return { ok: false, reason: "no_tg" };

  const lastSent = Number(localStorage.getItem("last_sent_best") || 0);
  if (best <= lastSent) return { ok: false, reason: "already_sent" };

  TG.sendData(JSON.stringify({ score, best, ts: Date.now() }));
  localStorage.setItem("last_sent_best", String(best));
  return { ok: true };
}

tgInit();
