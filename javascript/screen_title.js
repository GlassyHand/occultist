/* 타이틀 화면 */
(function () {
  const A = (window.Atelier = window.Atelier || {});
  A.screens = A.screens || {};

  /* 불러온 세이브로 게임 진입 */
  A.enterGame = function () {
    const s = A.Game.state;
    if (s.phase === 'settlement' && s.settlement) A.go('settlement', { resume: true });
    else if (s.introSeen === false) A.go('intro'); // 새 게임: 1일차 시작 전 인트로 (한 번만)
    else A.go('counter', { newDay: true });
  };

  A.screens.title = {
    enter() {
      A.$('#btn-continue').classList.toggle('disabled', !A.Save.hasAny());
    },
  };

  A.$('#btn-new').addEventListener('click', async () => {
    const slot = await A.Modal.pickSlot('new');
    if (!slot) return;
    const name = await A.Modal.askName();
    if (!name) return;
    A.Game.newGame(slot, name);
    A.enterGame();
  });

  A.$('#btn-continue').addEventListener('click', async () => {
    if (!A.Save.hasAny()) {
      await A.Modal.confirm({ text: '저장된 게임이 없습니다.', yes: '확인', no: '' });
      return;
    }
    const slot = await A.Modal.pickSlot('load');
    if (!slot) return;
    A.Game.loadGame(slot);
    A.enterGame();
  });

  A.$('#btn-settings').addEventListener('click', () => A.Modal.settings());
  A.$('#btn-quit').addEventListener('click', () => A.quitGame());
})();
