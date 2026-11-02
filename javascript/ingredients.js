/* 재료 데이터 (기획서 "재료 수치 초안" + 조정안 ②) */
(function () {
  const A = (window.Atelier = window.Atelier || {});

  A.AXES = ['wealth', 'health', 'achieve', 'love'];
  A.AXIS_LABEL = { wealth: '재물', health: '건강', achieve: '성취', love: '애정' };
  A.AXIS_ORDER_UI = ['love', 'health', 'achieve', 'wealth']; // 도감/필터 표시 순서
  A.AXIS_COLOR = { wealth: '#f2c43d', health: '#7fd66b', achieve: '#79a8ff', love: '#ff8fb7' };
  A.KINDS = ['plant', 'animal', 'mineral'];
  A.KIND_LABEL = { plant: '식물', animal: '동물', mineral: '광물' };

  A.GRADE_LABEL = { 1: '초급', 2: '일반', 3: '고급', 4: '희귀' };
  A.GRADE_PRICE = { 1: 10, 2: 20, 3: 40, 4: 80 };
  A.GRADE_UNLOCK_DAY = { 1: 1, 2: 1, 3: 2, 4: 3 };

  // [이름, 종류, 재물, 건강, 성취, 애정]
  const RAW = [
    // 식물 (ingredient_1 ~ 10)
    ['로즈마리', 'plant', 1, 1, 0, 0],
    ['사과', 'plant', 1, 1, 0, 1],
    ['민들레', 'plant', 0, 1, 1, 0],
    ['라벤더', 'plant', 0, 2, 0, 1],
    ['쑥', 'plant', 0, 2, 1, 0],
    ['월계수 잎', 'plant', 1, 0, 2, 0],
    ['네잎클로버', 'plant', 2, 0, 2, 0],
    ['검은 장미', 'plant', 0, -2, 0, 3],
    ['시든 양귀비', 'plant', 0, -2, -3, 0], // 조정안: 건강 -2 · 성취 -3
    ['만드라고라', 'plant', -2, -4, 5, -2],
    // 동물 (ingredient_11 ~ 20)
    ['꿀', 'animal', 1, 2, 0, 1],
    ['사슴 뿔 조각', 'animal', 1, 1, 1, 0],
    ['흰 비둘기 깃털', 'animal', 0, 1, 0, 2],
    ['토끼발', 'animal', 0, -1, 2, -1],
    ['까마귀 깃털', 'animal', 0, 0, 0, -3], // 조정안: 애정 -3 · 성취 0
    ['거미줄', 'animal', 0, 0, 1, 2],
    ['검은 고양이 수염', 'animal', 0, 0, 3, 2],
    ['뱀 허물', 'animal', 0, 3, 3, -1],
    ['박쥐 날개', 'animal', -2, -3, -2, 0],
    ['염소의 피', 'animal', -3, -2, 5, -4],
    // 광물 (ingredient_21 ~ 30)
    ['모래', 'mineral', -1, 0, 0, 0],
    ['자갈', 'mineral', 0, 1, 0, 0],
    ['석영', 'mineral', 0, 1, 1, 0],
    ['은 조각', 'mineral', 1, 1, 0, 1],
    ['자수정', 'mineral', 0, 2, 2, 1],
    ['월장석', 'mineral', 0, 2, 0, 3],
    ['석류석', 'mineral', 2, 2, 0, 2],
    ['흑요석', 'mineral', -2, -2, 4, -1],
    ['금', 'mineral', 5, 0, 3, 1],
    ['유황', 'mineral', -4, -5, 4, -4],
  ];

  A.INGREDIENTS = RAW.map((r, i) => {
    const stats = { wealth: r[2], health: r[3], achieve: r[4], love: r[5] };
    const maxAbs = Math.max(...A.AXES.map((a) => Math.abs(stats[a])));
    const grade = maxAbs >= 4 ? 4 : Math.max(1, maxAbs);
    return {
      id: i + 1,
      name: r[0],
      kind: r[1],
      stats: stats,
      grade: grade,
      price: A.GRADE_PRICE[grade],
      unlockDay: A.GRADE_UNLOCK_DAY[grade],
      img: 'ingredient_' + (i + 1) + '.png',
    };
  });

  A.ING_BY_ID = {};
  A.INGREDIENTS.forEach((g) => (A.ING_BY_ID[g.id] = g));
  A.ING_BY_KIND = {};
  A.KINDS.forEach((k) => (A.ING_BY_KIND[k] = A.INGREDIENTS.filter((g) => g.kind === k)));
})();
