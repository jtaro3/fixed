const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const arena = document.querySelector('#arena');
const startButton = document.querySelector('#startButton');
const retryButton = document.querySelector('#retryButton');
const startOverlay = document.querySelector('#startOverlay');
const gameOverOverlay = document.querySelector('#gameOverOverlay');
const timeDisplay = document.querySelector('#timeDisplay');
const scoreDisplay = document.querySelector('#scoreDisplay');
const threatDisplay = document.querySelector('#threatDisplay');
const finalScore = document.querySelector('#finalScore');
const difficultyButtons = [...document.querySelectorAll('.difficulty')];
const viewportMeta = document.querySelector('meta[name="viewport"]');
const THEME = window.CORE_DEFENSE_THEME;
const SPRITES = loadSprites(THEME.assets);

// ここを変えるだけで、難易度ごとの最大数や出現間隔を調整できます。
const DIFFICULTIES = {
  easy: { label: 'EASY', maxEnemies: 3, spawnEvery: 2000, speed: 22 },
  normal: { label: 'NORMAL', maxEnemies: 5, spawnEvery: 2000, speed: 34 },
  hard: { label: 'HARD', maxEnemies: 7, spawnEvery: 2000, speed: 49 },
};

const state = {
  difficulty: 'normal',
  enemies: [],
  playing: false,
  paused: false,
  score: 0,
  elapsed: 0,
  spawnElapsed: 0,
  lastFrameAt: 0,
  width: 0,
  height: 0,
  pixelRatio: 1,
};

let lastCanvasTapAt = 0;

function loadImage(source) {
  const image = new Image();
  image.src = source;
  return image;
}

function loadSprites(assetPaths) {
  return {
    core: loadImage(assetPaths.core),
    enemies: Object.fromEntries(Object.entries(assetPaths.enemies).map(([health, source]) => [health, loadImage(source)])),
  };
}

function isReady(image) {
  return image.complete && image.naturalWidth > 0;
}

function settings() { return DIFFICULTIES[state.difficulty]; }

function setGameZoomLock(locked) {
  // プレイ中だけ拡大を止め、終了後は通常のブラウザ操作へ戻す。
  viewportMeta.setAttribute('content', locked
    ? 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
    : 'width=device-width, initial-scale=1.0');
  document.body.classList.toggle('game-active', locked);
}

function resizeCanvas() {
  const rect = arena.getBoundingClientRect();
  state.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  state.width = rect.width;
  state.height = rect.height;
  canvas.width = Math.round(rect.width * state.pixelRatio);
  canvas.height = Math.round(rect.height * state.pixelRatio);
  ctx.setTransform(state.pixelRatio, 0, 0, state.pixelRatio, 0, 0);
  draw();
}

function core() {
  return { x: state.width / 2, y: state.height / 2, radius: Math.max(27, Math.min(state.width, state.height) * .055) };
}

function spawnEnemy() {
  if (!state.playing || state.enemies.length >= settings().maxEnemies) return;

  const c = core();
  const enemyRadius = Math.max(16, Math.min(state.width, state.height) * .034);
  // コアと重ならない「安全距離」。敵の大きさも考慮して余白を確保する。
  const minDistance = c.radius + enemyRadius + Math.max(78, Math.min(state.width, state.height) * .15);
  const maxDistance = Math.max(minDistance + 10, Math.min(state.width, state.height) * .46);
  let candidate;

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = minDistance + Math.random() * (maxDistance - minDistance);
    const x = c.x + Math.cos(angle) * distance;
    const y = c.y + Math.sin(angle) * distance;
    const insideArena = x > enemyRadius + 28 && x < state.width - enemyRadius - 28 && y > enemyRadius + 28 && y < state.height - enemyRadius - 28;
    const apartFromOthers = state.enemies.every((enemy) => Math.hypot(enemy.x - x, enemy.y - y) > enemy.radius + enemyRadius + 28);
    if (insideArena && apartFromOthers) { candidate = { x, y }; break; }
  }

  if (!candidate) return;
  state.enemies.push({
    ...candidate,
    radius: enemyRadius,
    health: Math.floor(Math.random() * 5) + 1,
    pulse: Math.random() * Math.PI * 2,
  });
  updateHud();
}

function updateHud() {
  scoreDisplay.textContent = String(state.score).padStart(3, '0');
  threatDisplay.textContent = `${state.enemies.length} / ${settings().maxEnemies}`;
}

function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function drawCore(c, now) {
  const image = SPRITES.core;
  if (isReady(image)) {
    const size = (c.radius + 42) * 2;
    ctx.drawImage(image, c.x - size / 2, c.y - size / 2, size, size);
    return;
  }

  drawCoreFallback(c, now);
}

function drawCoreFallback(c, now) {
  const coreTheme = THEME.canvas.core;
  const glow = 12 + Math.sin(now / 500) * 4;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.strokeStyle = coreTheme.outerRing;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, c.radius + 34 + Math.sin(now / 850) * 3, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = coreTheme.innerRing;
  ctx.beginPath(); ctx.arc(0, 0, c.radius + 15, 0, Math.PI * 2); ctx.stroke();
  const gradient = ctx.createRadialGradient(0, 0, 1, 0, 0, c.radius + 2);
  gradient.addColorStop(0, coreTheme.gradient[0]); gradient.addColorStop(.25, coreTheme.gradient[1]); gradient.addColorStop(1, coreTheme.gradient[2]);
  ctx.shadowBlur = glow; ctx.shadowColor = coreTheme.glow; ctx.fillStyle = gradient;
  ctx.beginPath(); ctx.arc(0, 0, c.radius, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = coreTheme.center; ctx.beginPath(); ctx.arc(0, 0, c.radius * .38, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawEnemy(enemy, now) {
  const image = SPRITES.enemies[enemy.health];
  const pulse = 1 + Math.sin(now / 170 + enemy.pulse) * .04;
  if (isReady(image)) {
    const size = enemy.radius * 3 * pulse;
    ctx.drawImage(image, enemy.x - size / 2, enemy.y - size / 2, size, size);
    return;
  }

  drawEnemyFallback(enemy, now);
}

function drawEnemyFallback(enemy, now) {
  const size = enemy.radius * (1 + Math.sin(now / 170 + enemy.pulse) * .04);
  const color = THEME.canvas.enemies[enemy.health];
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(Math.PI / 4);
  ctx.shadowBlur = 17; ctx.shadowColor = color;
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(3, size * .22); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-size, 0); ctx.lineTo(size, 0); ctx.moveTo(0, -size); ctx.lineTo(0, size); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();

}

function draw(now = performance.now()) {
  ctx.clearRect(0, 0, state.width, state.height);
  const c = core();
  state.enemies.forEach((enemy) => drawEnemy(enemy, now));
  drawCore(c, now);
}

function endGame() {
  state.playing = false;
  state.paused = false;
  setGameZoomLock(false);
  finalScore.textContent = state.score;
  gameOverOverlay.classList.remove('hidden');
  startButton.textContent = 'ゲームを開始 →';
}

function update(now) {
  const elapsed = now - state.lastFrameAt;
  state.lastFrameAt = now;
  if (state.playing && !state.paused) {
    state.elapsed += elapsed;
    state.spawnElapsed += elapsed;
    const c = core();
    const distanceStep = settings().speed * (elapsed / 1000);
    state.enemies.forEach((enemy) => {
      const dx = c.x - enemy.x;
      const dy = c.y - enemy.y;
      const distance = Math.hypot(dx, dy);
      enemy.x += (dx / distance) * distanceStep;
      enemy.y += (dy / distance) * distanceStep;
    });
    if (state.enemies.some((enemy) => Math.hypot(enemy.x - c.x, enemy.y - c.y) <= enemy.radius + c.radius)) endGame();
    if (state.spawnElapsed >= settings().spawnEvery) {
      spawnEnemy();
      state.spawnElapsed = 0;
    }
    timeDisplay.textContent = formatTime(state.elapsed);
  }
  updateHud();
  draw(now);
  requestAnimationFrame(update);
}

function startGame() {
  state.enemies = [];
  state.score = 0;
  state.playing = true;
  state.paused = false;
  state.elapsed = 0;
  state.spawnElapsed = 0;
  setGameZoomLock(true);
  spawnEnemy();
  startOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  startButton.textContent = '一時停止';
  if (window.matchMedia('(max-width: 760px)').matches) {
    arena.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  updateHud();
}

function togglePause() {
  if (!state.playing) {
    startGame();
    return;
  }
  state.paused = !state.paused;
  startButton.textContent = state.paused ? 'ゲームを再開' : '一時停止';
}

function tapEnemy(event) {
  if (!state.playing) return;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const hitIndex = state.enemies.findIndex((enemy) => Math.hypot(enemy.x - x, enemy.y - y) <= enemy.radius * 1.45);
  if (hitIndex >= 0) {
    const enemy = state.enemies[hitIndex];
    enemy.health -= 1;
    if (enemy.health <= 0) {
      state.enemies.splice(hitIndex, 1);
      state.score += 1;
    }
    updateHud();
  }
}

// iOS系ブラウザを含め、ゲーム中の連続タップ／ピンチによる画面ズームを止める。
function preventGameGesture(event) {
  if (!state.playing) return;
  if (event.type === 'dblclick' || event.type.startsWith('gesture') || event.touches?.length > 1) {
    event.preventDefault();
  }
}

function preventDoubleTapZoom(event) {
  if (!state.playing) return;
  const now = performance.now();
  if (now - lastCanvasTapAt < 350) event.preventDefault();
  lastCanvasTapAt = now;
}

difficultyButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (state.playing) return;
    state.difficulty = button.dataset.difficulty;
    difficultyButtons.forEach((item) => {
      const selected = item === button;
      item.classList.toggle('selected', selected);
      item.setAttribute('aria-checked', String(selected));
    });
    updateHud();
  });
});

startButton.addEventListener('click', togglePause);
retryButton.addEventListener('click', startGame);
canvas.addEventListener('pointerdown', tapEnemy);
canvas.addEventListener('touchend', preventDoubleTapZoom, { passive: false });
document.addEventListener('dblclick', preventGameGesture, { passive: false });
document.addEventListener('touchmove', preventGameGesture, { passive: false });
document.addEventListener('gesturestart', preventGameGesture, { passive: false });
document.addEventListener('gesturechange', preventGameGesture, { passive: false });
document.addEventListener('gestureend', preventGameGesture, { passive: false });
new ResizeObserver(resizeCanvas).observe(arena);
resizeCanvas();
requestAnimationFrame((now) => { state.lastFrameAt = now; requestAnimationFrame(update); });
