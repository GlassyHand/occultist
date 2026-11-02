/* 진입점: 화면 전환 · 스케일링 · 입력 · 일시정지 메뉴 */
(function () {
  const A = (window.Atelier = window.Atelier || {});
  A.screens = A.screens || {};
  A.currentScreen = null;
  let busy = false;

  const BGM_OF = { title: 'title', intro: 'title', counter: 'counter', workbench: 'workbench', cauldron: 'workbench', result: 'workbench', settlement: 'settlement' };
  const IN_GAME = ['counter', 'workbench', 'cauldron', 'result', 'settlement'];

  /* ---------- 스케일링 (16:9 고정, 나머지는 레터박스) ---------- */
  function resize() {
    let s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    if (s >= 2) s = Math.floor(s); // 도트 그래픽은 정수 배율로 (가능한 경우)
    A.stageScale = s;
    A.$('#stage').style.transform = `translate(${-960 * s}px, ${-540 * s}px) scale(${s})`;
  }
  window.addEventListener('resize', resize);

  A.toggleFullscreen = function () {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen && document.exitFullscreen();
  };

  /* ---------- 화면 전환 (페이드) ---------- */
  A.fade = async function (on) {
    const f = A.$('#fade');
    f.classList.toggle('on', on);
    await A.sleep(360);
  };

  A.go = async function (name, args, opts) {
    opts = opts || {};
    if (busy) return;
    busy = true;
    A.hidePause();
    const next = A.screens[name];
    try {
      if (opts.fade !== false) await A.fade(true);
      const prev = A.screens[A.currentScreen];
      if (prev && prev.leave) prev.leave();
      A.$$('.screen').forEach((s) => s.classList.remove('active'));
      A.$('#screen-' + name).classList.add('active');
      A.currentScreen = name;
      A.Audio.playBgm(BGM_OF[name]);
      if (next && next.enter) await next.enter(args);
      if (opts.fade !== false) await A.fade(false);
    } catch (err) {
      console.error(err);
      A.$('#fade').classList.remove('on');
    }
    busy = false;
    if (next && next.afterEnter) next.afterEnter(args);
  };

  /* 일차 시작 카드 */
  A.showDayCard = async function (title, sub) {
    const c = A.$('#daycard');
    c.innerHTML = `${title}<small>${sub || ''}</small>`;
    c.classList.add('show');
    await A.sleep(1700);
    c.classList.remove('show');
  };

  /* ---------- 일시정지 메뉴 ---------- */
  A.hidePause = () => A.$('#pause-menu').classList.remove('show');
  A.togglePause = function () {
    const m = A.$('#pause-menu');
    if (m.classList.contains('show')) return A.hidePause();
    m.innerHTML = '';
    const mk = (label, fn) => {
      const b = A.el('button', 'btn', label);
      b.addEventListener('click', () => {
        A.hidePause();
        fn();
      });
      m.appendChild(b);
    };
    mk('메인 화면', A.exitToTitle);
    mk('설정', () => A.Modal.settings());
    mk('게임 종료', A.quitGame);
    m.classList.toggle('right', A.currentScreen === 'counter');
    m.classList.add('show');
  };

  A.exitToTitle = async function () {
    const saved = A.currentScreen === 'settlement';
    const ok = await A.Modal.confirm({
      text: saved ? '메인 화면으로 나가시겠습니까?' : '지금 나가실 경우 플레이한 내용은 저장되지 않습니다.',
      sub: saved ? '정산 결과는 이미 자동 저장되었습니다.' : '이어하기를 하면 이 날의 처음부터 다시 시작합니다.',
      yes: '나가기',
      yesRed: true,
      no: '계속하기',
    });
    if (ok) A.go('title');
  };

  A.quitGame = async function () {
    const ok = await A.Modal.confirm({
      text: '게임을 종료할까요?',
      sub: A.currentScreen === 'settlement' || A.currentScreen === 'title' ? '' : '지금 나가실 경우 플레이한 내용은 저장되지 않습니다.',
      yes: '종료',
      yesRed: true,
      no: '취소',
    });
    if (!ok) return;
    A.Audio.playBgm('title');
    await A.fade(true);
    window.close();
    A.$$('.screen').forEach((s) => s.classList.remove('active'));
    A.currentScreen = null;
    const msg = A.el('div', 'daycard', '게임을 종료했습니다<small>브라우저 탭을 닫아주세요. (새로고침하면 다시 시작합니다)</small>');
    msg.classList.add('show');
    msg.style.zIndex = 300;
    A.$('#stage').appendChild(msg);
  };

  /* ---------- 툴팁 ---------- */
  A.showTip = function (html, clientX, clientY) {
    const t = A.$('#tooltip');
    t.innerHTML = html;
    t.style.display = 'block';
    const p = A.toStage(clientX, clientY);
    let x = p.x + 28, y = p.y + 28;
    const w = t.offsetWidth, h = t.offsetHeight;
    if (x + w > 1900) x = p.x - w - 28;
    if (y + h > 1060) y = p.y - h - 28;
    t.style.left = x + 'px';
    t.style.top = y + 'px';
  };
  A.hideTip = () => (A.$('#tooltip').style.display = 'none');

  /* ---------- 입력 ---------- */
  window.addEventListener('pointerdown', () => A.Audio.unlock(), { capture: true });
  window.addEventListener('keydown', (e) => {
    A.Audio.unlock();
    if (A.captureKey) return A.captureKey(e);
    if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'text') return;
    if (e.repeat && e.code !== 'Space') return;
    const action = A.actionFromEvent(e);
    if (!action) return;
    if (['Space', 'Escape', 'Enter'].includes(e.code) || action) e.preventDefault();

    // 튜토리얼 중에는 Space/Enter로만 다음 설명으로 넘어간다
    if (A.Tutorial.active) {
      if (action === 'confirm') A.Tutorial.next();
      return;
    }

    if (A.Modal.isOpen()) {
      if (action === 'pause') A.Modal.cancelTop();
      else if (action === 'confirm') A.Modal.confirmTop();
      return;
    }
    if (busy) return;
    if (action === 'pause') {
      if (A.$('#book-layer').classList.contains('show')) return A.$('#book-layer').classList.remove('show');
      if (IN_GAME.includes(A.currentScreen)) A.togglePause();
      return;
    }
    const scr = A.screens[A.currentScreen];
    if (scr && scr.onAction) scr.onAction(action);
  });
  document.addEventListener('pointerdown', (e) => {
    const m = A.$('#pause-menu');
    if (m.classList.contains('show') && !m.contains(e.target) && !e.target.closest('.btn-menu')) A.hidePause();
  });
  document.addEventListener('contextmenu', (e) => e.preventDefault()); // 우클릭은 재료 빼기에 사용
  document.addEventListener('click', (e) => {
    if (e.target.id === 'modal-layer') A.Modal.cancelTop();
    if (e.target.closest('.btn') || e.target.closest('.shop-tab') || e.target.closest('.tab')) A.Audio.sfx('click');
  });

  /* ---------- 시작 ---------- */
  window.addEventListener('DOMContentLoaded', () => {
    resize();
    A.$$('.screen').forEach((s) => s.classList.remove('active'));
    A.$('#fade').classList.add('on');
    A.currentScreen = null;
    A.go('title', null, { fade: false }).then(() => A.fade(false));
  });
})();
