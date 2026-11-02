/* 작업대 화면: 재료 드래그 앤 드롭 · 재고 목록 · 도감 */
(function () {
  const A = (window.Atelier = window.Atelier || {});
  A.screens = A.screens || {};
  const G = () => A.Game;

  let tab = 'all';
  const filters = new Set();
  let drag = null;

  const sign = (n) => (n > 0 ? '+' + n : String(n));
  function signedSpans(g) {
    return A.AXES.filter((a) => g.stats[a] !== 0)
      .map((a) => `<span style="color:${g.stats[a] > 0 ? '#1b7a45' : '#b3202a'}">${A.AXIS_LABEL[a]}${sign(g.stats[a])}</span>`)
      .join(' ');
  }
  // 영업 중에는 오늘 해금된 재료(또는 이미 보유한 재료)만 정체를 알 수 있다
  const revealed = (g) => g.unlockDay <= G().state.day || G().stock(g.id) > 0;

  function statSpans(g, small) {
    return A.AXES.filter((a) => g.stats[a] !== 0)
      .map((a) => `<span style="color:${A.AXIS_COLOR[a]}">${A.AXIS_LABEL[a]} ${sign(g.stats[a])}</span>`)
      .join(small ? ' ' : '<br>');
  }

  /* ---------- 상단: 아이템 선택 ---------- */
  function renderItems() {
    const wrap = A.$('#w-items');
    const cur = G().day.item;
    const order = A.ITEM_ORDER;
    const i = order.indexOf(cur);
    const left = order[(i + order.length - 1) % order.length];
    const right = order[(i + 1) % order.length];
    wrap.innerHTML = '';
    const mk = (id, cls) => {
      const b = A.el('div', 'it ' + cls + (G().itemUnlocked(id) ? '' : ' locked'), A.ITEMS[id].label);
      if (cls !== 'cur') b.addEventListener('click', () => selectItem(id));
      return b;
    };
    const aL = A.el('div', 'arrow', '‹'), aR = A.el('div', 'arrow', '›');
    aL.addEventListener('click', () => stepItem(-1));
    aR.addEventListener('click', () => stepItem(1));
    wrap.append(mk(left, 'side'), aL, mk(cur, 'cur'), aR, mk(right, 'side'));
  }
  function selectItem(id) {
    if (!G().itemUnlocked(id)) return flashHint(`${A.ITEMS[id].label}은(는) ${A.ITEMS[id].unlockDay}일차에 해금됩니다.`);
    G().day.item = id;
    A.Audio.sfx('click');
    renderItems();
  }
  function stepItem(dir) {
    const order = A.ITEM_ORDER;
    let i = order.indexOf(G().day.item);
    for (let k = 0; k < order.length; k++) {
      i = (i + dir + order.length) % order.length;
      if (G().itemUnlocked(order[i])) return selectItem(order[i]);
    }
  }

  /* ---------- 슬롯 ---------- */
  function renderSlots() {
    const d = G().day;
    A.$$('.slot').forEach((el) => {
      const i = +el.dataset.slot;
      const def = A.SLOT_DEFS[i];
      const id = d.slots[i];
      el.classList.toggle('filled', !!id);
      el.classList.remove('over');
      if (id) {
        const g = A.ING_BY_ID[id];
        el.innerHTML = `<img src="${A.IMG(g.img)}" alt=""><div class="plate">${g.name}<div class="st">${statSpans(g, true)}</div></div>`;
      } else {
        el.innerHTML = `<span class="slot-label">${def.label}</span>`;
      }
    });
    const ready = G().canCraft();
    A.$('#btn-make').classList.toggle('ready', ready);
  }

  /* ---------- 재고 패널 ---------- */
  function renderChips() {
    const wrap = A.$('#inv-chips');
    wrap.innerHTML = '';
    A.AXIS_ORDER_UI.forEach((a) => {
      const c = A.el('button', 'chip' + (filters.has(a) ? ' active' : ''), A.AXIS_LABEL[a]);
      c.addEventListener('click', () => {
        filters.has(a) ? filters.delete(a) : filters.add(a);
        renderChips();
        renderInventory();
      });
      wrap.appendChild(c);
    });
  }

  function renderInventory() {
    const box = A.$('#inv-scroll');
    const top = box.scrollTop;
    box.innerHTML = '';
    const kinds = tab === 'all' ? A.KINDS : [tab];
    kinds.forEach((kind) => {
      const list = A.ING_BY_KIND[kind].filter((g) => [...filters].every((a) => g.stats[a] !== 0));
      box.appendChild(A.el('h3', '', A.KIND_LABEL[kind]));
      if (!list.length) return box.appendChild(A.el('div', 'inv-empty', '조건에 맞는 재료가 없습니다.'));
      const grid = A.el('div', 'inv-grid');
      list.forEach((g) => {
        const n = G().stock(g.id);
        const avail = revealed(g);
        const buyable = n <= 0 && avail; // 어둡게 표시된 재료: 클릭하면 바로 구매
        const cell = A.el('div', 'ing' + (n <= 0 ? ' empty' : '') + (buyable ? ' buyable' : '') + (!avail ? ' locked' : ''));
        cell.dataset.id = g.id;
        cell.innerHTML = `<img src="${A.IMG(g.img)}" alt=""><span class="cnt">${buyable ? g.price + 'G' : n}</span>`;
        grid.appendChild(cell);
      });
      box.appendChild(grid);
    });
    box.scrollTop = top;
    A.$$('#inv-tabs .tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
    A.$('#w-gold').textContent = A.fmt(G().state.gold) + ' G';
  }

  function refresh() {
    renderSlots();
    renderInventory();
  }

  function setTab(t) {
    tab = t;
    renderInventory();
  }

  let hintTimer = null;
  function flashHint(text) {
    const h = A.$('#w-hint');
    h.textContent = text;
    h.style.color = '#ffd24d';
    clearTimeout(hintTimer);
    hintTimer = setTimeout(defaultHint, 2800);
  }
  function defaultHint() {
    const h = A.$('#w-hint');
    h.style.color = '';
    h.textContent = '재료를 드래그해서 슬롯에 넣으세요 · 우클릭: 빼기 · 마우스 오버: 수치 보기';
  }

  /* ---------- 툴팁 ---------- */
  function ingTip(g, ev) {
    const n = G().stock(g.id);
    const avail = revealed(g);
    let html;
    if (!avail) html = `<b>???</b><div class="tt-sub">${g.unlockDay}일차에 해금</div>`;
    else {
      html = `<b>${g.name}</b><div class="tt-sub">${A.KIND_LABEL[g.kind]} · ${A.GRADE_LABEL[g.grade]} · 보유 ${n}</div>`;
      if (n <= 0) html += `<div class="tt-sub" style="color:#ffd24d">클릭하면 ${g.price}G에 구매</div>`;
      A.AXES.forEach((a) => {
        const v = g.stats[a];
        html += `<div class="tt-row"><span>${A.AXIS_LABEL[a]}</span><span style="color:${v === 0 ? '#888' : A.AXIS_COLOR[a]}">${v === 0 ? '0' : sign(v)}</span></div>`;
      });
    }
    A.showTip(html, ev.clientX, ev.clientY);
  }

  /* ---------- 재료 바로 구매 (재고가 0인 재료를 클릭) ---------- */
  function buyIngredient(g) {
    if (!G().canAfford(g.price)) {
      A.Audio.sfx('bad');
      return flashHint(`골드가 부족합니다. (${g.name} ${g.price}G)`);
    }
    if (G().buyIngredient(g.id, 1)) {
      A.Audio.sfx('coin');
      flashHint(`${g.name}을(를) ${g.price}G에 구매했습니다.`);
      A.hideTip();
      renderInventory();
    }
  }

  /* ---------- 드래그 앤 드롭 (포인터 이벤트) ---------- */
  function slotAt(x, y) {
    const e = document.elementFromPoint(x, y);
    return e ? e.closest('.slot') : null;
  }
  function validFor(slotEl, g) {
    const i = +slotEl.dataset.slot;
    const def = A.SLOT_DEFS[i];
    return !G().day.slots[i] && (def.kind === 'free' || def.kind === g.kind);
  }
  function onMove(e) {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) {
      drag.moved = true;
      const gh = A.$('#drag-ghost');
      gh.innerHTML = `<img src="${A.IMG(A.ING_BY_ID[drag.id].img)}" alt="">`;
      gh.style.display = 'block';
      A.hideTip();
    }
    if (drag.moved) {
      const p = A.toStage(e.clientX, e.clientY);
      const gh = A.$('#drag-ghost');
      gh.style.left = p.x - 60 + 'px';
      gh.style.top = p.y - 60 + 'px';
      const g = A.ING_BY_ID[drag.id];
      A.$$('.slot').forEach((s) => s.classList.remove('over'));
      const s = slotAt(e.clientX, e.clientY);
      if (s && validFor(s, g)) s.classList.add('over');
    }
  }
  function onUp(e) {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    if (!drag) return;
    const d = drag;
    drag = null;
    A.$('#drag-ghost').style.display = 'none';
    A.$$('.slot').forEach((s) => s.classList.remove('over'));
    const g = A.ING_BY_ID[d.id];
    if (!d.moved) {
      // 클릭: 알맞은 빈 슬롯에 자동 배치
      const i = G().autoPlace(d.id);
      if (i < 0) flashHint('넣을 수 있는 빈 슬롯이 없습니다.');
      else A.Audio.sfx('drop');
      return refresh();
    }
    const s = slotAt(e.clientX, e.clientY);
    if (!s) return;
    if (validFor(s, g) && G().placeIngredient(+s.dataset.slot, d.id)) {
      A.Audio.sfx('drop');
      refresh();
    } else {
      s.classList.add('deny');
      setTimeout(() => s.classList.remove('deny'), 320);
      const def = A.SLOT_DEFS[+s.dataset.slot];
      flashHint(G().day.slots[+s.dataset.slot] ? '이미 재료가 들어 있습니다. (우클릭으로 빼기)' : `이 슬롯에는 ${def.label} 재료만 넣을 수 있습니다.`);
      A.Audio.sfx('bad');
    }
  }

  /* ---------- 제작 ---------- */
  async function make() {
    if (!G().canCraft()) return flashHint('식물 · 동물 · 광물을 한 칸씩 채워주세요. (자유 칸은 선택)');
    const ids = G().day.slots.filter(Boolean);
    const res = G().craft();
    A.go('cauldron', { result: res, ids: ids });
  }
  function clearAll() {
    if (!G().day.slots.some(Boolean)) return;
    G().clearSlots();
    A.Audio.sfx('drop');
    refresh();
  }

  /* ---------- 도감 ---------- */
  let bookSort = null;
  let bookSel = null;
  function openBook() {
    const layer = A.$('#book-layer');
    layer.classList.add('show');
    layer.innerHTML = '';
    const book = A.el('div', 'book');
    book.innerHTML =
      '<div class="ribbon">✦</div><button class="book-close">×</button><div class="page-l"><div class="chips"></div><div class="blist"></div></div><div class="page-r"></div>';
    layer.appendChild(book);
    A.$('.book-close', book).addEventListener('click', closeBook);
    layer.onclick = (e) => e.target === layer && closeBook();
    renderBook();
  }
  function closeBook() {
    A.$('#book-layer').classList.remove('show');
  }
  function renderBook() {
    const book = A.$('#book-layer .book');
    const chips = A.$('.chips', book);
    chips.innerHTML = '';
    A.AXIS_ORDER_UI.forEach((a) => {
      const c = A.el('button', 'chip' + (bookSort === a ? ' active' : ''), A.AXIS_LABEL[a]);
      c.addEventListener('click', () => {
        bookSort = bookSort === a ? null : a;
        renderBook();
      });
      chips.appendChild(c);
    });
    let list = A.INGREDIENTS.slice();
    if (bookSort) list.sort((x, y) => y.stats[bookSort] - x.stats[bookSort] || x.id - y.id);
    const bl = A.$('.blist', book);
    const scroll = bl.scrollTop;
    bl.innerHTML = '';
    list.forEach((g) => {
      const open = revealed(g);
      const row = A.el('div', 'brow' + (bookSel === g.id ? ' sel' : '') + (open ? '' : ' locked'));
      row.innerHTML = `<img src="${A.IMG(g.img)}" alt="" style="${open ? '' : 'filter:brightness(0)'}"><span class="nm">${open ? g.name : '???'}</span><span class="vals">${open ? signedSpans(g) : ''}</span>`;
      row.addEventListener('click', () => {
        bookSel = g.id;
        A.Audio.sfx('click');
        renderBook();
      });
      bl.appendChild(row);
    });
    bl.scrollTop = scroll;
    const r = A.$('.page-r', book);
    if (!bookSel) r.innerHTML = '<div class="hint">재료를 선택하면<br>자세한 수치를 볼 수 있어요.</div>';
    else {
      const g = A.ING_BY_ID[bookSel];
      if (!revealed(g)) r.innerHTML = `<div class="detail"><h4>???</h4><div class="kind">${g.unlockDay}일차에 해금</div></div>`;
      else {
        let st = '';
        A.AXES.forEach((a) => {
          const v = g.stats[a];
          st += `<div class="st"><span>${A.AXIS_LABEL[a]}</span><span style="color:${v === 0 ? '#8a7a60' : v > 0 ? '#1b8a4b' : '#c4232a'}">${v === 0 ? '0' : sign(v)}</span></div>`;
        });
        r.innerHTML = `<div class="detail"><img src="${A.IMG(g.img)}" alt=""><h4>${g.name}</h4><div class="kind">${A.KIND_LABEL[g.kind]} · ${A.GRADE_LABEL[g.grade]}</div>${st}<div class="price">구매가 ${g.price}G · 보유 ${G().stock(g.id)}개</div></div>`;
      }
    }
  }

  /* ---------- 화면 훅 ---------- */
  A.screens.workbench = {
    enter() {
      renderItems();
      renderChips();
      refresh();
      defaultHint();
      A.hideTip();
      A.$('#book-layer').classList.remove('show');
    },
    afterEnter() {
      A.Tutorial.run(['wb-slots', 'wb-inv', 'wb-chat', 'wb-make']);
    },
    onAction(action) {
      if (action === 'tab1') setTab('all');
      else if (action === 'tab2') setTab('plant');
      else if (action === 'tab3') setTab('animal');
      else if (action === 'tab4') setTab('mineral');
      else if (action === 'itemPrev') stepItem(-1);
      else if (action === 'itemNext') stepItem(1);
      else if (action === 'make') make();
      else if (action === 'discard') clearAll();
    },
  };

  /* ---------- 이벤트 바인딩 ---------- */
  const inv = A.$('#inv-scroll');
  inv.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const cell = e.target.closest('.ing');
    if (!cell || cell.classList.contains('locked')) return;
    if (cell.classList.contains('empty')) return buyIngredient(A.ING_BY_ID[+cell.dataset.id]);
    drag = { id: +cell.dataset.id, x: e.clientX, y: e.clientY, moved: false };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });
  inv.addEventListener('pointermove', (e) => {
    if (drag && drag.moved) return;
    const cell = e.target.closest('.ing');
    if (cell) ingTip(A.ING_BY_ID[+cell.dataset.id], e);
    else A.hideTip();
  });
  inv.addEventListener('pointerleave', A.hideTip);

  const panel = A.$('#craft-panel');
  panel.addEventListener('pointermove', (e) => {
    const s = e.target.closest('.slot.filled');
    if (s) ingTip(A.ING_BY_ID[G().day.slots[+s.dataset.slot]], e);
    else A.hideTip();
  });
  panel.addEventListener('pointerleave', A.hideTip);
  panel.addEventListener('contextmenu', (e) => {
    const s = e.target.closest('.slot.filled');
    if (!s) return;
    G().removeIngredient(+s.dataset.slot);
    A.Audio.sfx('drop');
    A.hideTip();
    refresh();
  });
  panel.addEventListener('click', (e) => {
    // 슬롯을 클릭하면 비어있을 때 안내
    const s = e.target.closest('.slot:not(.filled)');
    if (s) flashHint(`${A.SLOT_DEFS[+s.dataset.slot].label} 재료를 오른쪽 목록에서 끌어다 놓으세요.`);
  });

  A.$('#btn-make').addEventListener('click', make);
  A.$('#btn-clear').addEventListener('click', clearAll);
  A.$('#btn-book').addEventListener('click', () => {
    A.Audio.sfx('click');
    openBook();
  });
  A.$('#w-chat').addEventListener('click', () => {
    A.Audio.sfx('click');
    A.Modal.request(() => A.giveUpRequest());
  });
  A.$('#w-menu').addEventListener('click', (e) => {
    e.stopPropagation();
    A.togglePause();
  });
  A.$$('#inv-tabs .tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
})();
