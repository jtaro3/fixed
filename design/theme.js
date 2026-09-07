// Canvas内で使う見た目のデータ。画像素材に差し替える場合も、この対応表を入口にします。
window.CORE_DEFENSE_THEME = Object.freeze({
  assets: Object.freeze({
    core: 'design/assets/core.svg',
    enemies: Object.freeze({
      1: 'design/assets/enemy-hp1.svg',
      2: 'design/assets/enemy-hp2.svg',
      3: 'design/assets/enemy-hp3.svg',
      4: 'design/assets/enemy-hp4.svg',
      5: 'design/assets/enemy-hp5.svg',
    }),
  }),
  canvas: Object.freeze({
    core: Object.freeze({
      outerRing: 'rgba(110, 231, 209, .16)',
      innerRing: 'rgba(110, 231, 209, .16)',
      gradient: Object.freeze(['#f4ffff', '#93f3e1', '#29a99a']),
      glow: '#6ee7d1',
      center: '#103c42',
    }),
    enemies: Object.freeze({
      1: '#54a6ff',
      2: '#62d98b',
      3: '#ffd85b',
      4: '#ff6678',
      5: '#abb5c6',
    }),
  }),
});
