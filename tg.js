const TG = window.Telegram?.WebApp;

(function(){
  try{
    if (!TG) return;
    TG.ready();
    TG.expand();
    TG.disableVerticalSwipes?.();
  }catch{}
})();

window.tgSendBest = function(score, best){
  try{
    if (!TG) return;
    const lastSent = Number(localStorage.getItem("last_sent_best") || 0);
    if (best <= lastSent) return;
    TG.sendData(JSON.stringify({ score, best, ts: Date.now() }));
    localStorage.setItem("last_sent_best", String(best));
  }catch{}
};
