/* 튜토리얼: 처음 단 한 번만, 배경을 어둡게 하고 대상을 외곽 글로우로 강조한 뒤
   고양이 얼굴이 달린 말풍선(고양이 말투)으로 설명합니다. */
(function () {
  const A = (window.Atelier = window.Atelier || {});
  const KEY = 'occultist_tutorial_v1';

  /* targets: 강조할 요소의 선택자 (여러 개면 합쳐진 영역을 강조) */
  A.TUTORIAL_STEPS = {
    greet: {
      targets: ['#bubble'],
      text: '어서 오라냥! 손님이 찾아왔다냥.<br>말풍선을 클릭하면 손님의 이야기를 들을 수 있다냥.',
    },
    request: {
      targets: ['#crystal', '#crystal-gauge', '#crystal-count'],
      text: '손님은 속마음을 다 말하지 않는다냥.<br><b>수정구</b>를 눌러 손님이 진짜로 필요한 수치를 알아내 보라냥! 하루에 쓸 수 있는 횟수는 아래 게이지에 나온다냥.',
    },
    choices: {
      targets: ['#choices'],
      text: '이야기를 들었으면 의뢰를 <b>수락</b>할지 <b>거절</b>할지 정하라냥.<br>거절하면 그 손님의 평점은 0점이니 조심하라냥!',
    },
    'wb-slots': {
      targets: ['#craft-panel'],
      text: '여기가 작업대다냥. <b>식물 · 동물 · 광물</b> 칸에는 재료를 하나씩 꼭 넣어야 한다냥.<br>맨 아래 자유 칸은 비워도 된다냥.',
    },
    'wb-inv': {
      targets: ['#inv'],
      text: '재료는 이 목록에서 슬롯으로 <b>끌어다 놓으면</b> 된다냥.<br>마우스를 올리면 수치가 보이고, 슬롯에서 <b>우클릭</b>하면 다시 뺄 수 있다냥.<br>어둡게 변한 재료는 <b>클릭하면 바로 살 수</b> 있다냥!',
    },
    'wb-chat': {
      targets: ['#w-chat'],
      text: '손님의 의뢰가 헷갈리면 이 버튼으로 이야기와 알아낸 수치를 다시 볼 수 있다냥.',
    },
    'wb-make': {
      targets: ['#btn-make'],
      text: '수치를 잘 더했으면 <b>만들기</b>를 눌러라냥!<br>손님이 원하는 수치가 4 이상이고, 다른 수치가 -2 아래로 떨어지지 않으면 대성공이다냥.',
    },
    result: {
      targets: ['#btn-discard', '#btn-finish'],
      text: '완성품이 나왔다냥! <b>완성</b>을 누르면 손님에게 전달하고, 마음에 안 들면 <b>버리기</b>를 누르면 된다냥.<br>버리면 재료는 돌려받을 수 없으니 신중하라냥.',
    },
    outcome: {
      targets: ['.hud-rep', '.hud-gold'],
      text: '판정에 따라 <b>골드</b>가 들어오고 손님의 <b>평점</b>이 쌓인다냥.<br>가게의 평판은 왼쪽 위 별로 볼 수 있다냥.',
    },
    settle: {
      targets: ['#paper-report'],
      text: '하루가 끝났다냥! 평점이 낮으면 수입에서 <b>자릿세</b>를 떼이니 조심하라냥.',
    },
    shopbtn: {
      targets: ['#btn-shop'],
      text: '상점에서는 가게를 넓히고 장식과 시설을 강화할 수 있다냥.',
    },
  };

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}');
    } catch (e) {
      return {};
    }
  }
  function save(d) {
    try {
      localStorage.setItem(KEY, JSON.stringify(d));
    } catch (e) {}
  }

  let resolver = null;
  const T = (A.Tutorial = {
    active: false,

    /* 안 본 단계만 순서대로 보여줍니다. (각 단계는 평생 한 번) */
    async run(ids) {
      const data = load();
      if (data.skipAll) return;
      const todo = ids.filter((id) => !(data.seen || {})[id] && A.TUTORIAL_STEPS[id]);
      if (!todo.length) return;
      T.active = true;
      const layer = A.$('#tutorial');
      layer.classList.add('show');
      A.$('#tut-box').style.visibility = 'hidden';
      A.$('#tut-spot').style.opacity = 0;
      await A.sleep(250);
      for (let i = 0; i < todo.length && T.active; i++) {
        const d = load();
        d.seen = d.seen || {};
        d.seen[todo[i]] = true;
        save(d);
        await showStep(A.TUTORIAL_STEPS[todo[i]], i + 1, todo.length);
      }
      T.close();
    },

    next() {
      if (resolver) {
        const r = resolver;
        resolver = null;
        r();
      }
    },
    skipAll() {
      const d = load();
      d.skipAll = true;
      save(d);
      T.close();
      T.next();
    },
    close() {
      T.active = false;
      A.$('#tutorial').classList.remove('show');
    },
    /* 설정 > 튜토리얼 다시 보기 */
    reset() {
      try {
        localStorage.removeItem(KEY);
      } catch (e) {}
    },
  });

  function targetRect(selectors) {
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    selectors.forEach((sel) => {
      const el = A.$(sel);
      if (!el) return;
      const rc = el.getBoundingClientRect();
      if (!rc.width || !rc.height) return;
      const p1 = A.toStage(rc.left, rc.top);
      const p2 = A.toStage(rc.right, rc.bottom);
      l = Math.min(l, p1.x); t = Math.min(t, p1.y); r = Math.max(r, p2.x); b = Math.max(b, p2.y);
    });
    return l === Infinity ? null : { l: l, t: t, r: r, b: b };
  }

  const W = 1920, H = 1080, MARGIN = 24, GAP = 40;

  function place(box, rc) {
    const bw = box.offsetWidth, bh = box.offsetHeight;
    const cx = (rc.l + rc.r) / 2, cy = (rc.t + rc.b) / 2;
    // 아래 → 위 → 오른쪽 → 왼쪽 순으로 시도 (기본은 대상 아래)
    const cands = [
      { x: cx - bw / 2, y: rc.b + GAP },
      { x: cx - bw / 2, y: rc.t - GAP - bh },
      { x: rc.r + GAP, y: cy - bh / 2 },
      { x: rc.l - GAP - bw, y: cy - bh / 2 },
    ];
    const over = (c) =>
      Math.max(0, MARGIN - c.x) + Math.max(0, c.x + bw - (W - MARGIN)) + Math.max(0, MARGIN - c.y) + Math.max(0, c.y + bh - (H - MARGIN));
    let best = cands[0];
    for (const c of cands) {
      if (over(c) === 0) { best = c; break; }
      if (over(c) < over(best)) best = c;
    }
    box.style.left = A.clamp(best.x, MARGIN, W - MARGIN - bw) + 'px';
    box.style.top = A.clamp(best.y, MARGIN, H - MARGIN - bh) + 'px';
  }

  async function showStep(step, i, n) {
    const rc = targetRect(step.targets);
    const box = A.$('#tut-box');
    const spot = A.$('#tut-spot');
    A.$('#tut-text').innerHTML = step.text;
    A.$('#tut-step').textContent = n > 1 ? i + ' / ' + n : '';
    box.style.visibility = 'hidden';
    if (!rc) return; // 대상이 화면에 없으면 건너뜀
    const pad = 14;
    spot.style.left = rc.l - pad + 'px';
    spot.style.top = rc.t - pad + 'px';
    spot.style.width = rc.r - rc.l + pad * 2 + 'px';
    spot.style.height = rc.b - rc.t + pad * 2 + 'px';
    spot.style.opacity = 1;
    place(box, rc);
    box.style.visibility = 'visible';
    box.classList.remove('pop');
    void box.offsetWidth;
    box.classList.add('pop');
    A.Audio.sfx('bubble');
    await new Promise((res) => (resolver = res));
  }

  A.$('#tutorial').addEventListener('click', () => T.next());
  A.$('#tut-skip').addEventListener('click', (e) => {
    e.stopPropagation();
    T.skipAll();
  });
})();
