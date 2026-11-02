/* 모달 시스템: 확인창 · 이름 입력 · 저장 슬롯 · 설정 · 의뢰 확인 */
(function () {
  const A = (window.Atelier = window.Atelier || {});
  const layer = () => A.$('#modal-layer');
  const stack = [];
  A.captureKey = null; // 키 설정 중일 때 키 입력을 가로채는 콜백

  function refreshLayer() {
    layer().classList.toggle('show', stack.length > 0);
  }

  const M = (A.Modal = {
    isOpen: () => stack.length > 0,

    open(box, opts) {
      opts = opts || {};
      const h = { box: box, cancelable: opts.cancelable !== false, onClose: opts.onClose, onConfirm: opts.onConfirm };
      stack.push(h);
      layer().appendChild(box);
      // 아래 모달은 숨김
      stack.forEach((s, i) => (s.box.style.display = i === stack.length - 1 ? '' : 'none'));
      refreshLayer();
      return h;
    },
    close(h) {
      const i = h ? stack.indexOf(h) : stack.length - 1;
      if (i < 0) return;
      const [x] = stack.splice(i, 1);
      x.box.remove();
      if (stack.length) stack[stack.length - 1].box.style.display = '';
      refreshLayer();
      if (x.onClose) x.onClose();
    },
    closeAll() {
      while (stack.length) this.close();
    },
    /* ESC / 배경 클릭 */
    cancelTop() {
      if (!stack.length) return false;
      const top = stack[stack.length - 1];
      if (top.cancelable) this.close(top);
      return true;
    },
    /* Space / Enter */
    confirmTop() {
      if (!stack.length) return false;
      const top = stack[stack.length - 1];
      if (top.onConfirm) top.onConfirm();
      return true;
    },

    /* ---------- 확인창 ---------- */
    confirm(o) {
      return new Promise((resolve) => {
        const box = A.el('div', 'modal');
        box.innerHTML =
          (o.title ? `<h3>${o.title}</h3>` : '') +
          `<p>${o.text}</p>` +
          (o.sub ? `<p class="sub">${o.sub}</p>` : '') +
          `<div class="actions"><button class="${o.yesRed ? 'red' : ''}" data-r="1">${o.yes || '예'}</button>` +
          (o.no === '' ? '' : `<button class="${o.noRed ? 'red' : ''}" data-r="0">${o.no || '아니요'}</button>`) +
          '</div>';
        let done = false;
        const finish = (v) => {
          if (done) return;
          done = true;
          M.close(h);
          resolve(v);
        };
        const h = M.open(box, {
          cancelable: true,
          onClose: () => {
            if (!done) {
              done = true;
              resolve(false);
            }
          },
        });
        h.onConfirm = () => finish(true);
        A.$$('button', box).forEach((b) =>
          b.addEventListener('click', () => {
            A.Audio.sfx('click');
            finish(b.dataset.r === '1');
          })
        );
      });
    },

    alert(text, sub) {
      return this.confirm({ text: text, sub: sub, yes: '확인', no: '' }).then(() => {});
    },

    /* ---------- 이름 입력 (온보딩) ---------- */
    askName() {
      return new Promise((resolve) => {
        const box = A.el('div', 'modal');
        box.innerHTML =
          '<h3>아틀리에의 주인</h3><p>이름을 알려주세요.</p>' +
          '<input type="text" id="name-input" maxlength="8" placeholder="이름 (최대 8자)" autocomplete="off">' +
          '<div class="actions"><button data-r="1">시작하기</button><button data-r="0">취소</button></div>';
        let done = false;
        const finish = (v) => {
          if (done) return;
          done = true;
          M.close(h);
          resolve(v);
        };
        const h = M.open(box, { onClose: () => !done && ((done = true), resolve(null)) });
        const input = A.$('#name-input', box);
        setTimeout(() => input.focus(), 50);
        const ok = () => finish((input.value.trim() || '주인').slice(0, 8));
        h.onConfirm = ok;
        input.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Enter') ok();
          if (e.key === 'Escape') finish(null);
        });
        A.$$('button', box).forEach((b) =>
          b.addEventListener('click', () => {
            A.Audio.sfx('click');
            b.dataset.r === '1' ? ok() : finish(null);
          })
        );
      });
    },

    /* ---------- 저장 슬롯 선택 ---------- */
    pickSlot(mode) {
      // mode: 'new' | 'load'
      return new Promise((resolve) => {
        const box = A.el('div', 'modal');
        box.innerHTML = `<h3>${mode === 'new' ? '새로운 게임 — 저장 슬롯 선택' : '이어하기 — 저장 슬롯 선택'}</h3><div class="slots"></div><button class="modal-x">×</button>`;
        const wrap = A.$('.slots', box);
        let done = false;
        const finish = (v) => {
          if (done) return;
          done = true;
          M.close(h);
          resolve(v);
        };
        const h = M.open(box, { onClose: () => !done && ((done = true), resolve(null)) });
        A.$('.modal-x', box).addEventListener('click', () => finish(null));

        const render = () => {
          wrap.innerHTML = '';
          for (let i = 1; i <= A.SLOT_COUNT; i++) {
            const s = A.Save.read(i);
            const row = A.el('div', 'slot-row' + (s ? '' : ' empty') + (!s && mode === 'load' ? ' disabled' : ''));
            if (s) {
              const phase = s.phase === 'settlement' ? '정산 완료' : '영업 전';
              row.innerHTML = `<div class="no">${i}</div><div class="meta">${s.name} · ${s.day}일차 (${phase})<small>${A.fmt(s.gold)} G · 상점 LV ${s.shopLv} · ${new Date(s.savedAt).toLocaleString('ko-KR')}</small></div><button class="del">삭제</button>`;
            } else {
              row.innerHTML = `<div class="no">${i}</div><div class="meta">비어 있음</div>`;
            }
            row.addEventListener('click', async (e) => {
              if (e.target.classList.contains('del')) {
                e.stopPropagation();
                const ok = await M.confirm({ text: `슬롯 ${i}의 저장 데이터를 삭제할까요?`, yes: '삭제', yesRed: true, no: '취소' });
                if (ok) {
                  A.Save.remove(i);
                  render();
                }
                return;
              }
              A.Audio.sfx('click');
              if (mode === 'load') {
                if (s) finish(i);
              } else if (s) {
                const ok = await M.confirm({ text: `슬롯 ${i}에 저장된 데이터가 있습니다.`, sub: '새로 시작하면 덮어씁니다.', yes: '덮어쓰기', yesRed: true, no: '취소' });
                if (ok) finish(i);
              } else finish(i);
            });
            wrap.appendChild(row);
          }
        };
        render();
      });
    },

    /* ---------- 설정 (소리 · 조작) ---------- */
    settings() {
      const box = A.el('div', 'modal');
      box.style.minWidth = '1100px';
      box.innerHTML =
        '<h3>설정</h3><button class="modal-x">×</button>' +
        '<div class="set-row"><label>배경음악</label><input type="range" id="set-bgm" min="0" max="100"><output id="o-bgm"></output></div>' +
        '<div class="set-row"><label>효과음</label><input type="range" id="set-sfx" min="0" max="100"><output id="o-sfx"></output></div>' +
        '<div class="set-row"><label>화면</label><button class="btn small" id="set-full" style="height:60px">전체 화면 전환</button></div>' +
        '<div class="set-row"><label>튜토리얼</label><button class="btn small" id="set-tut" style="height:60px">다시 보기</button></div>' +
        '<div class="set-section">조작 (클릭 후 변경할 키를 누르세요)</div>' +
        '<div class="keys-grid" id="keys-grid"></div>' +
        '<div class="actions" style="margin-top:30px"><button id="set-reset">기본값 복원</button><button id="set-ok">닫기</button></div>';
      const h = M.open(box, { onClose: () => ((A.captureKey = null), A.saveSettings()) });
      h.onConfirm = () => M.close(h);
      const bgm = A.$('#set-bgm', box), sfx = A.$('#set-sfx', box);
      bgm.value = Math.round(A.settings.bgm * 100);
      sfx.value = Math.round(A.settings.sfx * 100);
      const sync = () => {
        A.$('#o-bgm', box).textContent = bgm.value;
        A.$('#o-sfx', box).textContent = sfx.value;
      };
      sync();
      bgm.addEventListener('input', () => {
        A.settings.bgm = bgm.value / 100;
        A.Audio.applyVolume();
        sync();
      });
      sfx.addEventListener('input', () => {
        A.settings.sfx = sfx.value / 100;
        sync();
      });
      sfx.addEventListener('change', () => A.Audio.sfx('click'));
      A.$('#set-full', box).addEventListener('click', () => A.toggleFullscreen());
      A.$('#set-tut', box).addEventListener('click', (e) => {
        A.Tutorial.reset();
        e.target.textContent = '다음 플레이부터 다시 표시됩니다';
      });

      const grid = A.$('#keys-grid', box);
      const renderKeys = () => {
        grid.innerHTML = '';
        A.KEY_ACTIONS.forEach((a) => {
          const row = A.el('div', 'key-row');
          row.innerHTML = `<span>${a.label}</span>`;
          const b = A.el('button', 'key-btn', A.keyLabel(A.settings.keys[a.id]));
          b.addEventListener('click', () => {
            b.textContent = '키 입력...';
            b.classList.add('listening');
            A.captureKey = (e) => {
              e.preventDefault();
              if (e.code !== 'Escape' || a.id === 'pause') {
                // 중복 키는 서로 교체
                const dup = Object.keys(A.settings.keys).find((k) => A.settings.keys[k] === e.code && k !== a.id);
                if (dup) A.settings.keys[dup] = A.settings.keys[a.id];
                A.settings.keys[a.id] = e.code;
              }
              A.captureKey = null;
              renderKeys();
            };
          });
          row.appendChild(b);
          grid.appendChild(row);
        });
      };
      renderKeys();
      A.$('#set-reset', box).addEventListener('click', () => {
        A.resetKeys();
        renderKeys();
      });
      A.$('#set-ok', box).addEventListener('click', () => M.close(h));
      A.$('.modal-x', box).addEventListener('click', () => M.close(h));
      return h;
    },

    /* ---------- 의뢰 확인 팝업 (작업대의 말풍선 아이콘) ---------- */
    request(onGiveUp) {
      const G = A.Game;
      const c = G.customer();
      const box = A.el('div', 'modal req-modal');
      const words = G.revealedWords();
      const hidden = c.needs.length - words.length;
      box.innerHTML =
        '<h3>손님의 의뢰</h3>' +
        `<div class="line">${c.lines[0]}</div><div class="line">${c.lines[1]}</div><div class="line bold">${c.lines[2]}</div>` +
        `<div class="meta">의뢰 품목: <span>${A.ITEMS[c.item].label}</span></div>` +
        `<div class="meta">필요 수치: <span>${words.length ? words.join(', ') : '???'}${hidden > 0 && words.length ? ' ...' : ''}</span></div>` +
        '<div class="actions" style="justify-content:space-between;margin-top:36px"><button class="red" id="req-giveup">의뢰 포기 (평점 0점)</button><button id="req-ok">닫기</button></div>';
      const h = M.open(box, {});
      h.onConfirm = () => M.close(h);
      A.$('#req-ok', box).addEventListener('click', () => M.close(h));
      A.$('#req-giveup', box).addEventListener('click', async () => {
        const ok = await M.confirm({ text: '의뢰를 포기할까요?', sub: '손님 평점 0점으로 처리되고 사용한 재료는 돌려받습니다.', yes: '포기', yesRed: true, no: '계속하기' });
        if (ok) {
          M.close(h);
          onGiveUp && onGiveUp();
        }
      });
    },
  });
})();
