/* 가마솥 컷신 + 완성품 확인 (버리기 / 완성) */
(function () {
  const A = (window.Atelier = window.Atelier || {});
  A.screens = A.screens || {};
  const G = () => A.Game;

  let skip = false;
  let cutsceneRunning = false;
  let pending = null;

  /* ---------- 가마솥 컷신 ---------- */
  A.screens.cauldron = {
    enter(args) {
      pending = args;
      skip = false;
      const wrap = A.$('#cauldron-wrap');
      wrap.classList.remove('shake');
      const b = A.$('#cauldron-bubbles');
      b.innerHTML = '';
      for (let i = 0; i < 7; i++) {
        const dot = A.el('i');
        dot.style.left = 20 + i * 50 + 'px';
        dot.style.animationDelay = i * 0.2 + 's';
        b.appendChild(dot);
      }
      A.$('#cauldron-ings').innerHTML = '';
      A.$('#cauldron-text').textContent = '재료를 넣는 중...';
    },
    async afterEnter() {
      cutsceneRunning = true;
      const wrap = A.$('#cauldron-wrap');
      const layer = A.$('#cauldron-ings');
      const ids = (pending.ids || []).slice();
      // 재료가 하나씩 솥으로 떨어짐
      for (let i = 0; i < ids.length && !skip; i++) {
        const img = A.el('img');
        img.src = A.IMG(A.ING_BY_ID[ids[i]].img);
        img.style.setProperty('--dx', (i % 2 ? 40 : -40) + 'px');
        layer.appendChild(img);
        void img.offsetWidth;
        img.classList.add('fall');
        A.Audio.sfx('drop');
        await A.sleep(520);
      }
      if (!skip) {
        wrap.classList.add('shake');
        A.$('#cauldron-text').textContent = '보글보글...';
        A.Audio.sfx('cauldron');
        await A.sleep(1700);
      }
      const flash = A.$('#cauldron-flash');
      flash.classList.remove('go');
      void flash.offsetWidth;
      flash.classList.add('go');
      A.$('#cauldron-text').textContent = '완성!';
      await A.sleep(450);
      cutsceneRunning = false;
      A.go('result', pending, { fade: false });
    },
    onAction(action) {
      if (action === 'confirm') skip = true;
    },
  };
  A.$('#screen-cauldron').addEventListener('click', () => {
    if (cutsceneRunning) skip = true;
  });

  /* ---------- 완성품 확인 ---------- */
  async function discard() {
    const ok = await A.Modal.confirm({ text: '완성품을 버릴까요?', sub: '사용한 재료는 돌려받을 수 없습니다.', yes: '버리기', yesRed: true, no: '취소' });
    if (!ok) return;
    G().discardCrafted();
    A.go('workbench');
  }
  function finish() {
    A.Audio.sfx('click');
    G().deliver();
    A.go('counter', { delivered: true });
  }

  A.screens.result = {
    enter(args) {
      const res = args.result;
      A.$('#result-item').src = A.IMG(A.ITEMS[res.itemId].img);
      A.$('#result-name').textContent = res.name;
    },
    afterEnter() {
      A.Tutorial.run(['result']);
    },
    onAction(action) {
      if (action === 'make') finish();
      else if (action === 'discard') discard();
    },
  };
  A.$('#btn-discard').addEventListener('click', discard);
  A.$('#btn-finish').addEventListener('click', finish);
})();
