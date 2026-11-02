/* 설정 (볼륨 · 키 설정) — localStorage 저장 */
(function () {
  const A = (window.Atelier = window.Atelier || {});
  const KEY = 'occultist_settings_v1';

  A.KEY_ACTIONS = [
    { id: 'confirm', label: '대사 넘기기 · 선택' },
    { id: 'tab1', label: '재고 탭: 전체' },
    { id: 'tab2', label: '재고 탭: 식물' },
    { id: 'tab3', label: '재고 탭: 동물' },
    { id: 'tab4', label: '재고 탭: 광물' },
    { id: 'itemPrev', label: '아이템 전환 ‹' },
    { id: 'itemNext', label: '아이템 전환 ›' },
    { id: 'make', label: '만들기 · 완성' },
    { id: 'discard', label: '버리기 · 비우기' },
    { id: 'pause', label: '메뉴 · 일시정지' },
  ];

  const DEFAULTS = {
    bgm: 0.6,
    sfx: 0.8,
    keys: {
      confirm: 'Space',
      tab1: 'Digit1',
      tab2: 'Digit2',
      tab3: 'Digit3',
      tab4: 'Digit4',
      itemPrev: 'KeyQ',
      itemNext: 'KeyE',
      make: 'KeyF',
      discard: 'KeyX',
      pause: 'Escape',
    },
  };

  A.settings = JSON.parse(JSON.stringify(DEFAULTS));
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved) {
      A.settings.bgm = saved.bgm ?? DEFAULTS.bgm;
      A.settings.sfx = saved.sfx ?? DEFAULTS.sfx;
      Object.assign(A.settings.keys, saved.keys || {});
    }
  } catch (e) {}

  A.saveSettings = function () {
    try {
      localStorage.setItem(KEY, JSON.stringify(A.settings));
    } catch (e) {}
  };
  A.resetKeys = function () {
    A.settings.keys = Object.assign({}, DEFAULTS.keys);
    A.saveSettings();
  };

  A.keyLabel = function (code) {
    if (!code) return '-';
    return code.replace('Key', '').replace('Digit', '').replace('Escape', 'ESC').replace('Space', 'Space').replace('Arrow', '↔ ');
  };

  /* KeyboardEvent → 액션 id (Enter는 항상 confirm 보조키) */
  A.actionFromEvent = function (e) {
    const keys = A.settings.keys;
    for (const id in keys) if (keys[id] === e.code) return id;
    if (e.code === 'Enter' || e.code === 'NumpadEnter') return 'confirm';
    return null;
  };
})();
