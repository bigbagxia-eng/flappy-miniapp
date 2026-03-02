const TG = window.Telegram?.WebApp;

function tgInit() {
  if (!TG) return;
  TG.ready();
  TG.expand();
  // Можно подстроить цвета под тему Telegram:
  document.body.style.background = TG.themeParams?.bg_color || "#0b1220";
}

function tgSendScore(score) {
  if (!TG) return false;
  const payload = { score, ts: Date.now() };
  TG.sendData(JSON.stringify(payload));
  return true;
}

tgInit();