/* 정산 + 상점 */
(function () {
  const A = (window.Atelier = window.Atelier || {});
  A.screens = A.screens || {};
  const G = () => A.Game;

  let shopTab = 'land';
  let inShop = false;

  /* ---------- 정산 보고서 ---------- */
  function renderReport() {
    const st = G().state;
    const r = st.settlement;
    const body = A.$('#rp-body');
    const cls = (n) => (n >= 0 ? 'pos' : 'neg');
    body.innerHTML =
      '<div class="cols"><div class="col-l">' +
      '<div>20:00 ~ 02:00</div><div class="gap"></div>' +
      `<div>${r.day}일차</div>` +
      `<div>가게 평점: ${r.rating}/5 <span class="note">(평균 ${r.avg.toFixed(2)})</span></div>` +
      `<div>성공한 의뢰: ${r.success}/${r.total}</div><div class="gap"></div>` +
      `<div>Great ${r.great}명, Normal ${r.normal}명, Bad ${r.bad}명을 달성했어요.${r.reject ? ` (거절 ${r.reject}명)` : ''}</div><div class="gap"></div>` +
      `<div>평점 페널티(${r.rating}점): 하루 수입의 ${Math.round(r.feeRate * 100)}% '자릿세'로 내기</div>` +
      '</div><div class="col-r">' +
      `<div class="row"><span>오늘 수입</span><span>${A.fmt(r.income)} G</span></div>` +
      `<div class="row"><span>자릿세</span><span class="neg">- ${A.fmt(r.fee)} G</span></div>` +
      `<div class="row total"><span>순이익</span><span class="${cls(r.net)}">${r.net >= 0 ? '+' : ''}${A.fmt(r.net)} G</span></div>` +
      `<div class="row"><span>보유금</span><span>${A.fmt(st.gold)} G</span></div>` +
      '<div class="note" style="margin-top:18px">자동 저장되었습니다.</div>' +
      '</div></div>' +
      (r.firstClear ? '<div class="ending">🎉 10일간의 영업을 무사히 마쳤어요! 아틀리에는 계속 영업할 수 있어요. (이후에도 10일차 난이도로 이어집니다)</div>' : '');
  }

  /* ---------- 상점 ---------- */
  function showShop(on) {
    inShop = on;
    A.$('#paper-report').style.display = on ? 'none' : '';
    A.$('#shop').classList.toggle('show', on);
    A.$('#btn-shop').textContent = on ? '정산' : '상점';
    if (on) renderShop();
  }

  function renderShop() {
    A.$('#shop-gold').textContent = A.fmt(G().state.gold) + 'G';
    A.$$('#shop-tabs .shop-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === shopTab));
    const body = A.$('#shop-body');
    const scroll = body.scrollTop;
    body.innerHTML = '';
    ({ land: renderLand, decor: renderDecor, facility: renderFacility })[shopTab](body);
    body.scrollTop = scroll;
  }

  function renderLand(body) {
    const s = G().state;
    const cur = A.SHOP_LEVELS[s.shopLv];
    const nextLv = Math.min(s.shopLv + 1, A.MAX_SHOP_LV);
    const next = A.SHOP_LEVELS[nextLv];
    const max = s.shopLv >= A.MAX_SHOP_LV;
    const show = max ? cur : next;
    const can = !max && G().canAfford(next.cost);
    body.innerHTML =
      `<div class="shop-cur">현재: LV ${s.shopLv} - ${cur.name}</div>` +
      `<div class="shop-next">${max ? 'LV ' + s.shopLv + ' - ' + cur.name + '<br>(최고 단계)' : 'LV ' + nextLv + ' - ' + next.name.replace(' ', '<br>')}</div>` +
      `<div class="shop-desc">${show.desc}</div>` +
      (max ? '' : `<button class="btn shop-buy ${can ? '' : 'no'}" id="buy-land">이사 갈까? (<span class="cost">${A.fmt(next.cost)} GOLD</span>)</button>`) +
      `<img class="shop-img" src="${A.IMG(show.img)}" alt="">`;
    const b = A.$('#buy-land', body);
    if (b)
      b.addEventListener('click', async () => {
        if (!can) return A.Modal.confirm({ text: '골드가 부족합니다.', yes: '확인', no: '' });
        const ok = await A.Modal.confirm({ text: `${next.name}(으)로 이사할까요?`, sub: `${A.fmt(next.cost)} G가 필요합니다.`, yes: '이사', no: '취소' });
        if (ok && G().upgradeShop()) {
          A.Audio.sfx('coin');
          G().save();
          renderShop();
        }
      });
  }

  function card(img, name, sub, btnText, enabled, onClick, done) {
    const c = A.el('div', 'shop-card' + (done ? ' done' : ''));
    c.innerHTML = `<img src="${A.IMG(img)}" alt=""><div class="info">${name}<small>${sub}</small></div>`;
    const b = A.el('button', 'btn' + (enabled ? '' : ' disabled'), btnText);
    if (done) b.disabled = true;
    b.addEventListener('click', () => enabled && onClick());
    c.appendChild(b);
    return c;
  }

  function renderDecor(body) {
    const s = G().state;
    const list = A.el('div', 'shop-list');
    A.DECOR.forEach((d) => {
      const owned = s.decor.includes(d.id);
      list.appendChild(
        card(d.img, d.name, '카운터에 놓을 수 있는 장식', owned ? '구매 완료' : A.fmt(d.cost) + ' G', !owned && G().canAfford(d.cost), () => {
          if (G().buyDecor(d.id)) {
            A.Audio.sfx('coin');
            G().save();
            renderShop();
          }
        }, owned)
      );
    });
    body.appendChild(list);
  }

  function renderFacility(body) {
    const s = G().state;
    const list = A.el('div', 'shop-list');
    Object.keys(A.FACILITIES).forEach((key) => {
      const f = A.FACILITIES[key];
      const lv = s.facility[key];
      const maxed = lv >= f.costs.length;
      list.appendChild(
        card('crystal_ball.png', `${f.name} (${lv}/${f.costs.length})`, f.desc, maxed ? '최대 단계' : A.fmt(f.costs[lv]) + ' G', !maxed && G().canAfford(f.costs[lv]), () => {
          if (G().upgradeFacility(key)) {
            A.Audio.sfx('coin');
            G().save();
            renderShop();
          }
        }, maxed)
      );
    });
    body.appendChild(list);
  }

  /* ---------- 화면 훅 ---------- */
  A.screens.settlement = {
    enter() {
      showShop(false);
      renderReport();
      A.$('#btn-mute').classList.toggle('off', A.Audio.isMuted());
    },
    afterEnter() {
      A.Tutorial.run(['settle', 'shopbtn']);
    },
    onAction(action) {
      if (action === 'confirm' && !inShop) nextDay();
    },
  };

  async function nextDay() {
    const ok = await A.Modal.confirm({ text: '다음 날로 넘어갈까요?', sub: '상점에서 하고 싶은 일을 모두 마쳤는지 확인하세요.', yes: '다음 날', no: '더 둘러보기' });
    if (!ok) return;
    G().startNextDay();
    A.go('counter', { newDay: true });
  }

  A.$('#btn-shop').addEventListener('click', () => showShop(!inShop));
  A.$('#btn-nextday').addEventListener('click', nextDay);
  A.$$('#shop-tabs .shop-tab').forEach((t) =>
    t.addEventListener('click', () => {
      shopTab = t.dataset.tab;
      renderShop();
    })
  );
  A.$('#btn-mute').addEventListener('click', () => A.$('#btn-mute').classList.toggle('off', A.Audio.toggleMute()));
  A.$('#btn-full').addEventListener('click', () => A.toggleFullscreen());
})();
