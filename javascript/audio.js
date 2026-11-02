/* 오디오 (BGM / 효과음) — music 폴더의 파일을 교체하면 그대로 반영됩니다 */
(function () {
  const A = (window.Atelier = window.Atelier || {});

  A.BGM_FILES = {
    title: 'bgm_title.wav',
    counter: 'bgm_counter.wav',
    workbench: 'bgm_workbench.wav',
    settlement: 'bgm_settlement.wav',
  };
  A.SFX_FILES = {
    click: 'sfx_click.wav',
    drop: 'sfx_drop.wav',
    bubble: 'sfx_bubble.wav',
    coin: 'sfx_coin.wav',
    crystal: 'sfx_crystal.wav',
    cauldron: 'sfx_cauldron.wav',
    great: 'sfx_great.wav',
    normal: 'sfx_normal.wav',
    bad: 'sfx_bad.wav',
    door: 'sfx_door.wav',
  };

  const bgmCache = {};
  const sfxCache = {};
  let current = null;
  let currentName = null;
  let unlocked = false;
  let muted = false;

  function bgmAudio(name) {
    if (!bgmCache[name]) {
      const a = new Audio(A.MUSIC(A.BGM_FILES[name]));
      a.loop = true;
      a.preload = 'auto';
      bgmCache[name] = a;
    }
    return bgmCache[name];
  }

  A.Audio = {
    /* 브라우저 자동재생 정책: 첫 입력 이후부터 재생 */
    unlock() {
      if (unlocked) return;
      unlocked = true;
      if (currentName) this.playBgm(currentName, true);
    },
    playBgm(name, force) {
      if (!force && currentName === name && current && !current.paused) return;
      currentName = name;
      if (current && current !== bgmAudio(name)) {
        const old = current;
        this._fadeOut(old);
      }
      if (!unlocked) return;
      const a = bgmAudio(name);
      current = a;
      a.volume = muted ? 0 : A.settings.bgm;
      a.play().catch(() => {});
    },
    _fadeOut(a) {
      const t = setInterval(() => {
        if (a === current) return clearInterval(t); // 다시 재생 대상이 된 경우 중단
        a.volume = Math.max(0, a.volume - 0.08);
        if (a.volume <= 0.01) {
          clearInterval(t);
          a.pause();
          a.currentTime = 0;
        }
      }, 40);
    },
    sfx(name) {
      if (!unlocked || muted) return;
      const file = A.SFX_FILES[name];
      if (!file) return;
      if (!sfxCache[name]) sfxCache[name] = new Audio(A.MUSIC(file));
      const a = sfxCache[name].cloneNode();
      a.volume = A.settings.sfx;
      a.play().catch(() => {});
    },
    applyVolume() {
      if (current) current.volume = muted ? 0 : A.settings.bgm;
    },
    toggleMute() {
      muted = !muted;
      this.applyVolume();
      return muted;
    },
    isMuted: () => muted,
  };
})();
