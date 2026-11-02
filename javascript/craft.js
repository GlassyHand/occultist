/* 제작 로직: 수치 합산, 판정, 이름 생성, 달성 가능성 검사 */
(function () {
  const A = (window.Atelier = window.Atelier || {});

  /* 작업대 슬롯 (식물 · 동물 · 광물 각 1칸 필수 + 자유 1칸) */
  A.SLOT_DEFS = [
    { kind: 'plant', label: '식물', required: true },
    { kind: 'animal', label: '동물', required: true },
    { kind: 'mineral', label: '광물', required: true },
    { kind: 'free', label: '자유', required: false },
  ];

  A.ITEMS = {
    doll: { id: 'doll', label: '인형', base: 200, unlockDay: 3, img: 'item_doll.png', nouns: ['인형', '허수아비', '봉제 인형'] },
    potion: { id: 'potion', label: '물약', base: 100, unlockDay: 1, img: 'item_potion.png', nouns: ['물약', '앙금', '영약'] },
    charm: { id: 'charm', label: '부적', base: 150, unlockDay: 2, img: 'item_charm.png', nouns: ['부적', '인장', '호부'] },
  };
  A.ITEM_ORDER = ['doll', 'potion', 'charm']; // 화면 표시 순서 (인형 < 물약 > 부적)

  A.GREAT_MIN = 4; // Great 목표치
  A.NORMAL_MIN = 2; // Normal 목표치
  A.SIDE_EFFECT_LIMIT = -2; // 요청 외 축이 이 값보다 낮으면 부작용

  A.sumStats = function (ids) {
    const v = { wealth: 0, health: 0, achieve: 0, love: 0 };
    ids.forEach((id) => {
      if (!id) return;
      const g = A.ING_BY_ID[id];
      A.AXES.forEach((a) => (v[a] += g.stats[a]));
    });
    return v;
  };

  /* needs: [{axis, dir}]  →  'great' | 'normal' | 'bad' */
  A.judge = function (vec, needs) {
    const req = {};
    needs.forEach((n) => (req[n.axis] = n.dir));
    let minReq = Infinity;
    needs.forEach((n) => (minReq = Math.min(minReq, vec[n.axis] * n.dir)));
    let sideEffect = false;
    A.AXES.forEach((a) => {
      if (!(a in req) && vec[a] < A.SIDE_EFFECT_LIMIT) sideEffect = true;
    });
    let grade = 'bad';
    if (minReq >= A.GREAT_MIN && !sideEffect) grade = 'great';
    else if (minReq >= A.NORMAL_MIN) grade = 'normal';
    return { grade: grade, minReq: minReq, sideEffect: sideEffect };
  };

  /* 결과물 이름: 가장 두드러진 수치로 수식어 결정 */
  const ADJ = {
    'wealth+': '황금빛',
    'wealth-': '녹슨 눈물의',
    'health+': '푸른 생명의',
    'health-': '시든 숨결의',
    'achieve+': '빛나는 영광의',
    'achieve-': '꺾인 의지의',
    'love+': '붉은 온기의',
    'love-': '차가운 증오의',
  };
  A.itemName = function (itemId, vec) {
    let best = null;
    A.AXES.forEach((a) => {
      const m = Math.abs(vec[a]);
      if (m > 0 && (!best || m > best.m)) best = { a: a, m: m, s: vec[a] > 0 ? '+' : '-' };
    });
    const sum = A.AXES.reduce((s, a) => s + Math.abs(vec[a]) * (a === 'wealth' ? 3 : a === 'health' ? 5 : a === 'achieve' ? 7 : 11), 0);
    const nouns = A.ITEMS[itemId].nouns;
    const noun = nouns[sum % nouns.length];
    const adj = best ? ADJ[best.a + best.s] : '평범한';
    return adj + ' ' + noun;
  };

  /* ---------- 달성 가능성 (손님 생성 시 "Great 불가" 의뢰를 걸러내기 위함) ---------- */
  const comboCache = {};
  function combosFor(maxGrade) {
    if (comboCache[maxGrade]) return comboCache[maxGrade];
    const ok = (g) => g.grade <= maxGrade;
    const P = A.ING_BY_KIND.plant.filter(ok);
    const N = A.ING_BY_KIND.animal.filter(ok);
    const M = A.ING_BY_KIND.mineral.filter(ok);
    const F = [null].concat(A.INGREDIENTS.filter(ok));
    const list = [];
    P.forEach((p) =>
      N.forEach((n) =>
        M.forEach((m) =>
          F.forEach((f) => {
            const v = { wealth: 0, health: 0, achieve: 0, love: 0 };
            [p, n, m, f].forEach((g) => {
              if (g) A.AXES.forEach((a) => (v[a] += g.stats[a]));
            });
            list.push(v);
          })
        )
      )
    );
    comboCache[maxGrade] = list;
    return list;
  }

  A.canGreat = function (needs, maxGrade) {
    const list = combosFor(maxGrade);
    for (let i = 0; i < list.length; i++) {
      if (A.judge(list[i], needs).grade === 'great') return true;
    }
    return false;
  };
})();
