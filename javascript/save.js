/* 저장 · 이어하기 — 슬롯 5개, 하루 정산 후 자동 저장 */
(function () {
  const A = (window.Atelier = window.Atelier || {});
  A.SLOT_COUNT = 5;
  const key = (slot) => 'occultist_save_v1_slot' + slot;

  A.Save = {
    read(slot) {
      try {
        const raw = localStorage.getItem(key(slot));
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    write(slot, state) {
      try {
        state.savedAt = Date.now();
        localStorage.setItem(key(slot), JSON.stringify(state));
        return true;
      } catch (e) {
        return false;
      }
    },
    remove(slot) {
      try {
        localStorage.removeItem(key(slot));
      } catch (e) {}
    },
    hasAny() {
      for (let i = 1; i <= A.SLOT_COUNT; i++) if (this.read(i)) return true;
      return false;
    },
  };
})();
