/* 공용 유틸리티 */
(function () {
  const A = (window.Atelier = window.Atelier || {});

  A.IMG = (name) => '../image/' + name;
  A.MUSIC = (name) => '../music/' + name;

  A.$ = (sel, root) => (root || document).querySelector(sel);
  A.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  A.el = function (tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  };

  A.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  A.fmt = (n) => Number(n).toLocaleString('ko-KR');
  A.clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* 시드 기반 난수 (mulberry32) — 같은 일차 재시도 시 같은 손님이 나오도록 */
  A.makeRng = function (seed) {
    let a = seed >>> 0;
    const rng = function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    rng.int = (n) => Math.floor(rng() * n);
    rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
    rng.shuffle = (arr) => {
      const r = arr.slice();
      for (let i = r.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [r[i], r[j]] = [r[j], r[i]];
      }
      return r;
    };
    return rng;
  };

  /* 스테이지 좌표 변환 (CSS scale 보정) */
  A.stageScale = 1;
  A.toStage = function (clientX, clientY) {
    const r = document.getElementById('stage').getBoundingClientRect();
    return { x: (clientX - r.left) / A.stageScale, y: (clientY - r.top) / A.stageScale };
  };
})();
