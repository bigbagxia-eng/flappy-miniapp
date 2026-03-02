// Telegram Mini App helpers
window.TG = window.Telegram?.WebApp;

(function initTG(){
  try{
    if (!TG) return;
    TG.ready();
    TG.expand();
    TG.disableVerticalSwipes?.();
    TG.setHeaderColor?.("#0b1220");
    TG.setBackgroundColor?.("#0b1220");
  }catch{}
})();

window.tgSendBest = function(best, score){
  try{
    if (!TG) return;
    const last = Number(localStorage.getItem("last_sent_best") || 0);
    if (best <= last) return;
    localStorage.setItem("last_sent_best", String(best));
    TG.sendData(JSON.stringify({ best, score, ts: Date.now() }));
  }catch{}
};
