/* 게임 상태 · 규칙 (UI와 분리된 로직) */
(function () {
  const A = (window.Atelier = window.Atelier || {});

  /* ---------- 밸런스 상수 ---------- */
  A.START_GOLD = 340;
  A.CRYSTAL_BASE_USES = 5;
  A.SHOP_LEVELS = {
    1: { name: '허름한 천막', img: 'shop_1.png', cost: 0, desc: '시작 단계 · 기본 재료와 작업 공간 · 소수의 레시피' },
    2: { name: '그저 그런 상점', img: 'shop_2.png', cost: 500, desc: '레시피 확장 · 다양한 손님 유형 (중년~노년 손님 방문) · 보관 슬롯 +10' },
    3: { name: '아틀리에', img: 'shop_3.png', cost: 1400, desc: '더 높은 단가의 의뢰 (단가 ×1.4) · 보관 슬롯 +10' },
  };
  A.MAX_SHOP_LV = 3;
  // 평점 페널티(자릿세): 하루 평점 → 수입 대비 비율
  A.FEE_RATE = { 1: 0.5, 2: 0.3, 3: 0.15, 4: 0.05, 5: 0 };
  A.DECOR = [
    { id: 1, name: '별빛 샹들리에', cost: 200, img: 'decor_1.png' },
    { id: 2, name: '푸른 달 태피스트리', cost: 400, img: 'decor_2.png' },
    { id: 3, name: '마법 화분', cost: 700, img: 'decor_3.png' },
  ];
  A.FACILITIES = {
    crystal: { name: '수정구 연마', desc: '하루 점술(수정구) 사용 횟수 +1', costs: [300, 800] },
    storage: { name: '재료 보관함 확장', desc: '재료별 보관 한도 +10', costs: [200, 500] },
  };

  const starterInventory = () => {
    const inv = {};
    A.INGREDIENTS.forEach((g) => (inv[g.id] = g.grade === 1 ? 6 : g.grade === 2 ? 4 : 0));
    return inv;
  };

  const G = (A.Game = {
    state: null,
    day: null, // 하루 영업 런타임 (저장되지 않음 — 영업 중 저장 없음)

    /* ---------- 새 게임 / 불러오기 ---------- */
    newGame(slot, name) {
      this.state = {
        version: 1,
        slot: slot,
        name: name || '주인',
        day: 1,
        gold: A.START_GOLD,
        ratingSum: 0,
        ratingCount: 0,
        shopLv: 1,
        charPool: [],
        introSeen: false,
        decor: [],
        facility: { crystal: 0, storage: 0 },
        inventory: starterInventory(),
        phase: 'day',
        seed: Math.floor(Math.random() * 1e9),
        settlement: null,
        cleared: false,
      };
      this.fillCharPool();
      A.Save.write(slot, this.state);
      return this.state;
    },
    loadGame(slot) {
      const s = A.Save.read(slot);
      if (!s) return null;
      this.state = s;
      this.fillCharPool(); // 예전 세이브 호환
      return s;
    },
    /* 집 단계 × 3명이 될 때까지, 아직 등장하지 않은 캐릭터를 랜덤으로 추가 */
    fillCharPool() {
      const s = this.state;
      if (!Array.isArray(s.charPool)) s.charPool = [];
      const want = Math.min(A.CHAR_COUNT, A.CHARS_PER_SHOP_LV * s.shopLv);
      const rest = [];
      for (let i = 1; i <= A.CHAR_COUNT; i++) if (!s.charPool.includes(i)) rest.push(i);
      while (s.charPool.length < want && rest.length) {
        s.charPool.push(rest.splice(Math.floor(Math.random() * rest.length), 1)[0]);
      }
    },
    save() {
      if (this.state) A.Save.write(this.state.slot, this.state);
    },

    /* ---------- 파생 값 ---------- */
    storageCap() {
      const s = this.state;
      return 20 + 10 * (s.shopLv - 1) + 10 * s.facility.storage;
    },
    crystalMax() {
      return A.CRYSTAL_BASE_USES + this.state.facility.crystal;
    },
    reputation() {
      const s = this.state;
      if (!s.ratingCount) return null;
      return Math.floor((s.ratingSum / s.ratingCount) * 100) / 100; // 0.01 단위, 반올림 X
    },
    isUnlocked(item) {
      return item.unlockDay <= this.state.day;
    },
    itemUnlocked(itemId) {
      return A.ITEMS[itemId].unlockDay <= this.state.day;
    },

    /* ---------- 하루 영업 ---------- */
    startDay() {
      const s = this.state;
      s.phase = 'day';
      this.day = {
        customers: A.generateDay(s.day, s.shopLv, s.seed, s.charPool),
        idx: 0,
        crystalLeft: this.crystalMax(),
        results: [],
        income: 0,
        item: 'potion',
        slots: [null, null, null, null],
        cur: null,
        gold0: s.gold,
        rating0: [s.ratingSum, s.ratingCount],
      };
      this.beginCustomer();
      return this.day;
    },
    beginCustomer() {
      const d = this.day;
      d.cur = { revealed: 0, exhausted: false, accepted: false, crafted: null, outcome: null };
      d.item = this.itemUnlocked(d.customers[d.idx].item) ? d.customers[d.idx].item : 'potion';
      d.slots = [null, null, null, null];
    },
    customer() {
      return this.day.customers[this.day.idx];
    },
    hasNextCustomer() {
      return this.day.idx + 1 < this.day.customers.length;
    },
    nextCustomer() {
      this.day.idx++;
      this.beginCustomer();
    },

    /* 수정구: 한 번 쓸 때마다 실제 욕구 수치를 하나씩 공개.
       모두 공개된 뒤에도 한 번 더 쓰면(횟수 차감) "더 이상 알아낼 정보가 없다"는 안내가 뜨고,
       그 이후에는 이 손님에게 더 이상 쓸 수 없다. */
    canUseCrystal() {
      const d = this.day;
      return d.crystalLeft > 0 && !d.cur.exhausted;
    },
    allRevealed() {
      return this.day.cur.revealed >= this.customer().needs.length;
    },
    useCrystal() {
      const d = this.day;
      if (!this.canUseCrystal()) return null;
      d.crystalLeft--;
      if (d.cur.revealed >= this.customer().needs.length) {
        d.cur.exhausted = true;
        return 'exhausted';
      }
      d.cur.revealed++;
      return d.cur.revealed;
    },
    revealedWords() {
      const c = this.customer();
      return c.needs.slice(0, this.day.cur.revealed).map((n) => A.NEED_WORD[A.needKey(n)]);
    },

    /* 거절: 해당 손님 평점 0점 */
    reject() {
      return this.record('reject', 0, null);
    },

    /* ---------- 재료 슬롯 조작 ---------- */
    stock(id) {
      return this.state.inventory[id] || 0;
    },
    placeIngredient(slotIdx, id) {
      const d = this.day;
      const g = A.ING_BY_ID[id];
      const def = A.SLOT_DEFS[slotIdx];
      if (!g || d.slots[slotIdx]) return false;
      if (def.kind !== 'free' && def.kind !== g.kind) return false;
      if (this.stock(id) <= 0) return false;
      this.state.inventory[id]--;
      d.slots[slotIdx] = id;
      return true;
    },
    autoPlace(id) {
      const g = A.ING_BY_ID[id];
      const order = [A.SLOT_DEFS.findIndex((s) => s.kind === g.kind), 3];
      for (const i of order) if (i >= 0 && !this.day.slots[i] && this.placeIngredient(i, id)) return i;
      return -1;
    },
    removeIngredient(slotIdx) {
      const d = this.day;
      const id = d.slots[slotIdx];
      if (!id) return false;
      this.state.inventory[id]++;
      d.slots[slotIdx] = null;
      return true;
    },
    clearSlots() {
      for (let i = 0; i < 4; i++) this.removeIngredient(i);
    },
    canCraft() {
      const d = this.day;
      return A.SLOT_DEFS.every((def, i) => !def.required || d.slots[i]);
    },

    /* ---------- 제작 ---------- */
    craft() {
      const d = this.day;
      if (!this.canCraft()) return null;
      const ids = d.slots.slice();
      const vec = A.sumStats(ids);
      const result = { itemId: d.item, ids: ids, vec: vec, name: A.itemName(d.item, vec) };
      d.slots = [null, null, null, null]; // 재료는 소모됨
      d.cur.crafted = result;
      return result;
    },
    discardCrafted() {
      this.day.cur.crafted = null;
    },

    /* 완성품 전달 → 판정 · 보상 */
    deliver() {
      const d = this.day;
      const c = this.customer();
      const crafted = d.cur.crafted;
      let grade;
      if (crafted.itemId !== c.item) grade = 'bad'; // 원하지 않은 종류의 아이템
      else grade = A.judge(crafted.vec, c.needs).grade;
      const base = A.ITEMS[c.item].base;
      let pay = base * A.GRADE_MULT[grade] * A.SHOP_LV_MULT[this.state.shopLv];
      if (c.negative) pay *= A.NEG_PRICE_MULT;
      pay = Math.round(pay);
      d.cur.crafted = null;
      return this.record(grade, pay, crafted);
    },

    record(grade, pay, crafted) {
      const d = this.day;
      const s = this.state;
      const rating = A.GRADE_RATING[grade];
      s.ratingSum += rating;
      s.ratingCount += 1;
      s.gold += pay;
      d.income += pay;
      const reactions = A.REACTIONS[grade];
      const outcome = {
        grade: grade,
        pay: pay,
        rating: rating,
        crafted: crafted,
        text: reactions[Math.floor(Math.random() * reactions.length)],
      };
      d.cur.outcome = outcome;
      d.results.push(outcome);
      return outcome;
    },

    /* ---------- 하루 정산 ---------- */
    finishDay() {
      const d = this.day;
      const s = this.state;
      const n = d.results.length;
      const cnt = { great: 0, normal: 0, bad: 0, reject: 0 };
      d.results.forEach((r) => cnt[r.grade]++);
      const avg = n ? d.results.reduce((a, r) => a + r.rating, 0) / n : 0;
      const rating = A.clamp(Math.round(avg), 1, 5);
      const fee = Math.floor(d.income * A.FEE_RATE[rating]);
      s.gold -= fee;
      const wasCleared = s.cleared;
      if (s.day >= A.MAX_TABLE_DAY) s.cleared = true;
      s.settlement = {
        day: s.day,
        total: n,
        success: cnt.great + cnt.normal,
        great: cnt.great,
        normal: cnt.normal,
        bad: cnt.bad,
        reject: cnt.reject,
        avg: avg,
        rating: rating,
        feeRate: A.FEE_RATE[rating],
        income: d.income,
        fee: fee,
        net: d.income - fee,
        firstClear: s.cleared && !wasCleared,
      };
      s.phase = 'settlement';
      this.save(); // 하루 정산이 끝나면 자동 저장
      return s.settlement;
    },
    startNextDay() {
      const s = this.state;
      s.day++;
      s.seed = Math.floor(Math.random() * 1e9);
      s.phase = 'day';
      s.settlement = null;
      this.ensureMinimumStock();
      this.save();
    },
    /* 재료가 바닥나 영업이 불가능해지는 상황 방지 (고양이 조수의 구호 물품) */
    ensureMinimumStock() {
      const s = this.state;
      let given = false;
      A.KINDS.forEach((kind) => {
        const list = A.ING_BY_KIND[kind].filter((g) => g.grade <= 2);
        if (!list.some((g) => this.stock(g.id) > 0)) {
          s.inventory[list[0].id] = this.stock(list[0].id) + 3;
          given = true;
        }
      });
      return given;
    },

    /* ---------- 상점 ---------- */
    canAfford(cost) {
      return this.state.gold >= cost;
    },
    buyIngredient(id, qty) {
      const s = this.state;
      const g = A.ING_BY_ID[id];
      const room = this.storageCap() - this.stock(id);
      qty = Math.min(qty, room, Math.floor(s.gold / g.price));
      if (qty <= 0) return 0;
      s.gold -= g.price * qty;
      s.inventory[id] = this.stock(id) + qty;
      return qty;
    },
    ingredientAvailable(g) {
      return g.unlockDay <= this.state.day + 1; // 다음 날 영업 준비를 위해 하루 앞서 구매 가능
    },
    upgradeShop() {
      const s = this.state;
      if (s.shopLv >= A.MAX_SHOP_LV) return false;
      const cost = A.SHOP_LEVELS[s.shopLv + 1].cost;
      if (s.gold < cost) return false;
      s.gold -= cost;
      s.shopLv++;
      this.fillCharPool();
      return true;
    },
    buyDecor(id) {
      const s = this.state;
      const d = A.DECOR.find((x) => x.id === id);
      if (!d || s.decor.includes(id) || s.gold < d.cost) return false;
      s.gold -= d.cost;
      s.decor.push(id);
      return true;
    },
    upgradeFacility(key) {
      const s = this.state;
      const f = A.FACILITIES[key];
      const lv = s.facility[key];
      if (lv >= f.costs.length || s.gold < f.costs[lv]) return false;
      s.gold -= f.costs[lv];
      s.facility[key]++;
      return true;
    },
  });
})();
