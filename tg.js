const TG = window.Telegram?.WebApp;

function tgInit() {
  if (!TG) return;
  TG.ready();
  TG.expand();
  document.body.style.background = TG.themeParams?.bg_color || "#0b1220";
}

// Отправляем только если best > last_sent_best
function tgSendBest(score, best) {
  if (!TG) return { ok: false, reason: "no_tg" };

  const lastSent = Number(localStorage.getItem("last_sent_best") || 0);
  if (best <= lastSent) return { ok: false, reason: "already_sent" };

  const payload = { score, best, ts: Date.now() };
  TG.sendData(JSON.stringify(payload));

  localStorage.setItem("last_sent_best", String(best));
  return { ok: true };
}

tgInit();
