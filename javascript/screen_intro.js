/* 인트로 컷씬: 새 게임에서 1일차를 시작하기 전 단 한 번만 재생 (클릭으로 넘김) */
(function () {
  const A = (window.Atelier = window.Atelier || {});
  A.screens = A.screens || {};

  A.INTRO_SCENES = [
    { img: 'cutscene_1.png', text: '"스무 살이나 먹고 뭐 하는 거니! 이제부턴 네 힘으로 살아라!"' },
    { img: 'cutscene_2.png', text: '그 말과 함께, 당신은 당신의 고양이 사역마와 함께 집 밖으로 쫓겨났습니다.' },
    { img: 'cutscene_3.png', text: '"한숨만 쉬고 있을 거냥? 네 마법의 힘을 살려보는 건 어떻겠냥?"' },
    { img: 'cutscene_4.png', text: '"이 골목을 오가는 많은 이들이 네 신비한 마법 아이템들을 원할 거라냥."' },
    { img: 'cutscene_5.png', text: '그렇게 당신은 고양이와 함께 골목에 당신의 오컬트 가게를 만들었습니다...' },
    { img: 'cutscene_6.png', text: '이 가게를 성공적으로 운영할 지, 그것은 당신의 몫에 달렸습니다.' },
  ];

  let idx = 0;
  let locked = false;

  function show(i, animate) {
    const sc = A.INTRO_SCENES[i];
    const img = A.$('#intro-img');
    const txt = A.$('#intro-text');
    const apply = () => {
      img.src = A.IMG(sc.img);
      txt.textContent = sc.text;
      img.classList.remove('hide');
      txt.classList.remove('hide');
    };
    if (!animate) return apply();
    img.classList.add('hide');
    txt.classList.add('hide');
    setTimeout(apply, 350);
  }

  async function next() {
    if (locked) return;
    locked = true;
    A.Audio.sfx('click');
    if (idx < A.INTRO_SCENES.length - 1) {
      idx++;
      show(idx, true);
      setTimeout(() => (locked = false), 500);
      return;
    }
    // 마지막 컷 이후: 인트로를 다시 보지 않도록 기록하고 1일차 시작
    const s = A.Game.state;
    s.introSeen = true;
    A.Game.save();
    await A.go('counter', { newDay: true });
    locked = false;
  }

  A.screens.intro = {
    enter() {
      idx = 0;
      locked = false;
      A.INTRO_SCENES.forEach((sc) => (new Image().src = A.IMG(sc.img))); // 미리 불러오기
      show(0, false);
    },
    onAction(action) {
      if (action === 'confirm') next();
    },
  };

  A.$('#screen-intro').addEventListener('click', next);
})();
