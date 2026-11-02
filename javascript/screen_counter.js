/* 카운터 화면: 손님 입장 → 대화 → 점술(수정구) → 수락/거절 → (제작) → 판정 반응 */
(function () {
  const A = (window.Atelier = window.Atelier || {});
  A.screens = A.screens || {};
  const G = () => A.Game;

  let phase = 'idle'; // idle | greet | request | react | busy

  /* ---------- 공용 UI 갱신 ---------- */
  A.renderStars = function (el, rep) {
    el.innerHTML = '☆☆☆☆☆<span class="fill">★★★★★</span>';
    const fill = A.$('.fill', el);
    fill.style.width = (rep ? (rep / 5) * 100 : 0) + '%';
  };

  function renderHud() {
    const s = G().state;
    A.$('#c-day').textContent = s.day + '일차';
    const rep = G().reputation();
    A.renderStars(A.$('#c-stars'), rep);
    A.$('#c-rep-num').textContent = rep === null ? '--' : rep.toFixed(2);
    A.$('#c-gold').textContent = A.fmt(s.gold) + ' G';
    const dl = A.$('#decor-layer');
    dl.innerHTML = '';
    s.decor.forEach((id) => {
      const d = A.DECOR.find((x) => x.id === id);
      const img = A.el('img');
      img.src = A.IMG(d.img);
      img.dataset.decor = id;
      dl.appendChild(img);
    });
    renderCrystal();
  }

  function renderCrystal() {
    const d = G().day;
    const max = G().crystalMax();
    A.$('#crystal-gauge i').style.width = (d.crystalLeft / max) * 100 + '%';
    A.$('#crystal-count').textContent = `수정구 ${d.crystalLeft} / ${max}`;
    A.$('#crystal').classList.toggle('off', !G().canUseCrystal() || phase !== 'request');
  }

  function setGold(animateFrom) {
    A.$('#c-gold').textContent = A.fmt(G().state.gold) + ' G';
  }

  /* ---------- 말풍선 ---------- */
  function showBubble(opts) {
    const b = A.$('#bubble');
    b.classList.toggle('single', !!opts.single);
    b.classList.add('show');
    A.$('#bubble-text').innerHTML = opts.html;
    A.$('#bubble-need').textContent = opts.need || '';
    A.$('#bubble-next').style.display = opts.next ? '' : 'none';
    const tag = A.$('#bubble-tag');
    tag.textContent = opts.tag || '';
    tag.classList.toggle('show', !!opts.tag);
    b.style.cursor = opts.next ? 'pointer' : 'default';
    A.Audio.sfx('bubble');
  }
  function hideBubble() {
    A.$('#bubble').classList.remove('show');
    A.$('#choices').classList.remove('show');
  }

  /* ---------- 손님 진행 ---------- */
  async function introCustomer() {
    phase = 'busy';
    const c = G().customer();
    const img = A.$('#customer');
    img.src = A.IMG(c.portrait);
    img.className = 'customer';
    void img.offsetWidth;
    img.classList.add('in');
    A.$('#counter-item').classList.remove('show');
    hideBubble();
    renderCrystal();
    A.Audio.sfx('door');
    await A.sleep(700);
    phase = 'greet';
    showBubble({ html: c.greeting, next: true, single: true });
    A.Tutorial.run(['greet']);
  }

  function showRequest() {
    const c = G().customer();
    phase = 'request';
    showBubble({
      html: `${c.lines[0]}<br>${c.lines[1]}<br><b>${c.lines[2]}</b>`,
      tag: '의뢰 품목: ' + A.ITEMS[c.item].label,
      need: needLine(),
    });
    A.$('#choices').classList.add('show');
    renderCrystal();
    A.Tutorial.run(['request', 'choices']);
  }

  function needLine() {
    const words = G().revealedWords();
    if (!words.length) return '';
    return '필요 수치: ' + words.join(', ') + (G().allRevealed() ? '' : ' ...');
  }

  async function useCrystal() {
    if (phase !== 'request') return;
    const g = G();
    if (g.allRevealed()) {
      A.$('#bubble-need').textContent = '더 이상 알아낼 정보는 없는 것 같다.';
      return;
    }
    if (g.day.crystalLeft <= 0) {
      A.$('#bubble-need').textContent = '오늘은 수정구의 힘이 다한 것 같다...';
      return;
    }
    const ok = await A.Modal.confirm({ text: '수정구를 쓸까요?', sub: `(잔여 수량: ${g.day.crystalLeft}회)`, yes: '예', no: '아니요' });
    if (!ok) return;
    g.useCrystal();
    A.Audio.sfx('crystal');
    const cr = A.$('#crystal');
    cr.classList.remove('use');
    void cr.offsetWidth;
    cr.classList.add('use');
    A.$('#bubble-need').textContent = needLine();
    renderCrystal();
  }

  async function accept() {
    if (phase !== 'request') return;
    phase = 'busy';
    G().day.cur.accepted = true;
    hideBubble();
    A.go('workbench', { fromCounter: true });
  }

  function reject() {
    if (phase !== 'request') return;
    giveUp();
  }
  function giveUp() {
    phase = 'busy';
    const out = G().reject();
    afterOutcome(out);
  }
  A.giveUpRequest = function () {
    // 작업대에서 포기한 경우: 카운터로 돌아와 거절과 동일하게 처리
    G().clearSlots();
    A.go('counter', { gaveUp: true });
  };

  /* 판정 결과 연출 (납품 후 / 거절 후 공통) */
  function afterOutcome(out) {
    phase = 'react';
    hideBubble();
    renderHud();
    showBubble({ html: out.text, next: true, single: true });
    A.Audio.sfx(out.grade === 'reject' ? 'bad' : out.grade);
    const gain = A.$('#gain');
    gain.classList.remove('show');
    if (out.pay > 0) {
      A.$('span', gain).textContent = '+' + A.fmt(out.pay) + 'G';
      void gain.offsetWidth;
      gain.classList.add('show');
      A.Audio.sfx('coin');
    }
    if (out.crafted) {
      const it = A.$('#counter-item');
      it.src = A.IMG(A.ITEMS[out.crafted.itemId].img);
      it.classList.add('show');
    }
  }

  async function advance() {
    if (phase === 'greet') showRequest();
    else if (phase === 'react') await leaveCustomer();
  }

  async function leaveCustomer() {
    phase = 'busy';
    hideBubble();
    A.$('#gain').classList.remove('show');
    A.$('#counter-item').classList.remove('show');
    const img = A.$('#customer');
    img.classList.remove('in');
    img.classList.add('out');
    await A.sleep(550);
    if (G().hasNextCustomer()) {
      G().nextCustomer();
      renderHud();
      await introCustomer();
    } else {
      G().finishDay();
      A.go('settlement', { fromDay: true });
    }
  }

  /* ---------- 화면 훅 ---------- */
  A.screens.counter = {
    enter(args) {
      args = args || {};
      const g = G();
      if (args.newDay) {
        g.startDay();
        phase = 'busy';
        A.$('#customer').className = 'customer';
        hideBubble();
        A.$('#counter-item').classList.remove('show');
        A.$('#gain').classList.remove('show');
      }
      renderHud();
      if (args.delivered || args.gaveUp) {
        const img = A.$('#customer');
        img.className = 'customer';
        img.style.opacity = 1;
      } else {
        A.$('#customer').style.opacity = '';
      }
    },
    async afterEnter(args) {
      args = args || {};
      if (args.newDay) {
        const s = G().state;
        await A.showDayCard(s.day + '일차', '20:00 ~ 02:00');
        await introCustomer();
      } else if (args.delivered) {
        afterOutcome(G().day.cur.outcome);
        A.Tutorial.run(['outcome']);
      } else if (args.gaveUp) {
        giveUp();
      }
    },
    onAction(action) {
      if (action === 'confirm') advance();
    },
  };

  /* ---------- 이벤트 ---------- */
  A.$('#bubble').addEventListener('click', advance);
  A.$('#btn-accept').addEventListener('click', accept);
  A.$('#btn-reject').addEventListener('click', reject);
  A.$('#crystal').addEventListener('click', useCrystal);
  A.$('#c-menu').addEventListener('click', (e) => {
    e.stopPropagation();
    A.togglePause();
  });
})();
