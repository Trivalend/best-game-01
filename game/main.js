// Emberdrift — boot, game loop and orchestration.
// One job: own the state, wire input to the game, run the update and
// render passes, and decide the mode transitions (title → playing →
// upgrade → game over / victory). The world is drawn, then a darkness
// overlay is punched with light holes, then the HUD and screens.

import { W, H, TAU, COLORS, TUNE } from './consts.js';
import { makeRng, clamp, dist2 } from './rng.js';
import { createFx, updateFx, drawFx, spawnBurst, spawnText } from './particles.js';
import { AudioSys } from './audio.js';
import { createBullets, updateBullets, drawBullets } from './bullets.js';
import { createPlayer, updatePlayer, drawPlayer, damagePlayer, lightRadius } from './player.js';
import { makeEnemy, edgeSpawn, updateEnemies, drawEnemies, killEnemy } from './enemies.js';
import { buildWave, waveHpScale, rollUpgrades, applyUpgrade, fireNova } from './waves.js';
import { drawHUD, drawTitle, drawUpgrade, drawPaused, drawGameOver, drawVictory } from './ui.js';
import { setupShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const darkCanvas = document.createElement('canvas');
darkCanvas.width = W;
darkCanvas.height = H;
const dctx = darkCanvas.getContext('2d');

function loadBest() {
  try {
    return Number(window.localStorage.getItem('emberdrift-best') || 0) || 0;
  } catch (e) {
    return 0;
  }
}

function saveBest(state) {
  if (state.score > state.best) {
    state.best = state.score;
    try {
      window.localStorage.setItem('emberdrift-best', String(state.best));
    } catch (e) {
      /* best score is cosmetic */
    }
  }
}

function createState() {
  const rng = makeRng((Math.random() * 1e9) | 0);
  const titleEmbers = [];
  for (let i = 0; i < 80; i++) {
    titleEmbers.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 1 + Math.random() * 2.4,
      color: ['#ffb347', '#ffd166', '#ff8c42', '#c77dff'][i % 4],
      vy: 6 + Math.random() * 16,
    });
  }
  return {
    mode: 'title',
    time: 0,
    score: 0,
    kills: 0,
    wave: 0,
    best: loadBest(),
    player: createPlayer(),
    enemies: [],
    bullets: createBullets(),
    embers: [],
    fx: createFx(),
    spawnQueue: [],
    spawnTimer: 0,
    boss: null,
    upgrades: [],
    uiCards: [],
    banner: null,
    shake: 0,
    rng,
    audio: new AudioSys(),
    input: { keys: {}, mouseX: W / 2, mouseY: H / 2 - 120, mouseDown: false },
    titleEmbers,
    shot: null,
  };
}

const state = createState();
window.__emberdrift = state;

// ---------- flow ----------

function startRun() {
  const fresh = createState();
  fresh.audio = state.audio; // keep the audio context across runs
  fresh.best = state.best;
  Object.keys(fresh).forEach((k) => {
    state[k] = fresh[k];
  });
  state.audio.init();
  state.audio.startMusic();
  state.mode = 'playing';
  startWave(1);
}

function startWave(n) {
  state.wave = n;
  state.spawnQueue = buildWave(state.rng, n);
  state.spawnTimer = 1.2;
  const bossWave = n % 5 === 0;
  state.banner = {
    text: bossWave ? 'WAVE ' + n + ' — THE EMBERLORD' : 'WAVE ' + n,
    sub: bossWave ? 'Something huge stirs in the dark' : n === 1 ? 'Survive. Collect embers. Grow your light.' : 'The dark thickens',
    t: 2.4,
  };
  if (bossWave) state.audio.bossRoar();
  else state.audio.waveStart();
}

function waveClear() {
  const bonus = TUNE.waveClearBonus * state.wave;
  state.score += bonus;
  spawnText(state.fx, W / 2, H / 2 - 60, 'WAVE BONUS +' + bonus, COLORS.gold, 20);
  if (state.wave >= 10) {
    state.mode = 'victory';
    state.audio.victory();
    saveBest(state);
    return;
  }
  state.mode = 'upgrade';
  state.upgrades = rollUpgrades(state.rng, 3);
}

function gameOver() {
  state.mode = 'gameover';
  state.audio.gameOver();
  saveBest(state);
}

function continueEndless() {
  state.mode = 'playing';
  startWave(state.wave + 1);
}

// ---------- input ----------

function canvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * W,
    y: ((e.clientY - rect.top) / rect.height) * H,
  };
}

canvas.addEventListener('mousemove', (e) => {
  const p = canvasPos(e);
  state.input.mouseX = p.x;
  state.input.mouseY = p.y;
});

canvas.addEventListener('mousedown', (e) => {
  const p = canvasPos(e);
  state.input.mouseX = p.x;
  state.input.mouseY = p.y;
  state.input.mouseDown = true;
  state.audio.init();
  if (state.mode === 'title' || state.mode === 'gameover' || state.mode === 'victory') {
    startRun();
    return;
  }
  if (state.mode === 'upgrade') {
    for (const c of state.uiCards) {
      if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) {
        pickUpgrade(c.id);
        return;
      }
    }
  }
});

window.addEventListener('mouseup', () => {
  state.input.mouseDown = false;
});

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  state.input.keys[e.code] = true;
  if (e.code === 'KeyM') {
    state.audio.setMuted(!state.audio.muted);
    return;
  }
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (state.mode === 'playing') state.mode = 'paused';
    else if (state.mode === 'paused') state.mode = 'playing';
    return;
  }
  if (e.code === 'KeyR') {
    if (state.mode === 'gameover' || state.mode === 'victory' || state.mode === 'paused') startRun();
    return;
  }
  if (e.code === 'KeyC' && state.mode === 'victory') {
    continueEndless();
    return;
  }
  if (e.code === 'Space' && state.mode === 'playing' && state.player.hasNova) {
    const killed = fireNova(state);
    for (const en of killed) killEnemy(state, en);
    return;
  }
  if (state.mode === 'upgrade' && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
    const idx = Number(e.code.slice(-1)) - 1;
    if (state.upgrades[idx]) pickUpgrade(state.upgrades[idx].id);
  }
});

window.addEventListener('keyup', (e) => {
  state.input.keys[e.code] = false;
});

function pickUpgrade(id) {
  applyUpgrade(state, id);
  state.audio.upgradePick();
  state.upgrades = [];
  state.uiCards = [];
  state.mode = 'playing';
  startWave(state.wave + 1);
}

// ---------- update ----------

function update(dt) {
  state.time += dt;
  if (state.banner && state.banner.t > 0) state.banner.t -= dt;
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 34);

  // Title embers always drift upward.
  for (const e of state.titleEmbers) {
    e.y -= e.vy * dt;
    if (e.y < -6) {
      e.y = H + 6;
      e.x = Math.random() * W;
    }
  }

  if (state.mode !== 'playing') {
    updateFx(state.fx, dt);
    return;
  }

  updatePlayer(state, dt);

  // Spawn the wave's queue, one enemy at a time from the edge.
  if (state.spawnQueue.length > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      state.spawnTimer = 0.7;
      const type = state.spawnQueue.shift();
      const s = edgeSpawn(state.rng);
      const e = makeEnemy(state.rng, type, s.x, s.y, waveHpScale(state.wave));
      state.enemies.push(e);
      if (e.boss) state.boss = e;
    }
  }

  updateEnemies(state, dt);
  updateBullets(state.bullets, dt);
  updateEmbers(state, dt);
  collide(state);
  updateFx(state.fx, dt);

  if (state.spawnQueue.length === 0 && state.enemies.length === 0) waveClear();
}

function updateEmbers(state, dt) {
  const p = state.player;
  for (let i = state.embers.length - 1; i >= 0; i--) {
    const m = state.embers[i];
    m.life -= dt;
    const d2 = dist2(m.x, m.y, p.x, p.y);
    if (d2 < p.magnet * p.magnet) {
      const d = Math.sqrt(d2) || 1;
      m.vx += ((p.x - m.x) / d) * 950 * dt;
      m.vy += ((p.y - m.y) / d) * 950 * dt;
    }
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.vx *= 0.92;
    m.vy *= 0.92;
    m.x = clamp(m.x, 10, W - 10);
    m.y = clamp(m.y, 10, H - 10);
    if (d2 < (p.r + 14) * (p.r + 14)) {
      state.embers.splice(i, 1);
      p.light += 1;
      state.score += TUNE.emberScore;
      state.audio.pickup();
      spawnBurst(state.fx, m.x, m.y, COLORS.emberHot, 4, 120, 3, 0.3);
      continue;
    }
    if (m.life <= 0) state.embers.splice(i, 1);
  }
}

function collide(state) {
  const p = state.player;

  // Friendly bullets vs enemies.
  for (let bi = state.bullets.friendly.length - 1; bi >= 0; bi--) {
    const b = state.bullets.friendly[bi];
    let consumed = false;
    for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
      const e = state.enemies[ei];
      const rr = b.r + e.r;
      if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
        e.hp -= b.damage;
        e.flash = 0.15;
        spawnBurst(state.fx, b.x, b.y, COLORS.emberHot, 5, 140, 3, 0.3);
        state.audio.hit();
        if (e.hp <= 0) {
          state.enemies.splice(ei, 1);
          killEnemy(state, e);
        }
        if (b.pierce > 0) b.pierce -= 1;
        else consumed = true;
        break;
      }
    }
    if (consumed) state.bullets.friendly.splice(bi, 1);
  }

  // Enemy orbs vs the player.
  for (let i = state.bullets.enemy.length - 1; i >= 0; i--) {
    const b = state.bullets.enemy[i];
    const rr = b.r + p.r - 2;
    if (dist2(b.x, b.y, p.x, p.y) < rr * rr) {
      state.bullets.enemy.splice(i, 1);
      if (damagePlayer(state, 1) && p.hearts <= 0) gameOver();
    }
  }

  // Enemies touching the player.
  for (const e of state.enemies) {
    const rr = e.r + p.r - 4;
    if (dist2(e.x, e.y, p.x, p.y) < rr * rr) {
      if (damagePlayer(state, 1)) {
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        p.x = clamp(p.x + Math.cos(a) * 26, p.r + 8, W - p.r - 8);
        p.y = clamp(p.y + Math.sin(a) * 26, p.r + 8, H - p.r - 8);
        if (p.hearts <= 0) gameOver();
      }
    }
  }
}

// ---------- render ----------

function punch(x, y, r) {
  const g = dctx.createRadialGradient(x, y, r * 0.15, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.85)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  dctx.fillStyle = g;
  dctx.beginPath();
  dctx.arc(x, y, r, 0, TAU);
  dctx.fill();
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, COLORS.bg1);
  g.addColorStop(1, COLORS.bg0);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = COLORS.arenaLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 64; x < W; x += 64) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
  }
  for (let y = 64; y < H; y += 64) {
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(150, 120, 255, 0.28)';
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, W - 12, H - 12);
}

function drawEmbers() {
  ctx.save();
  ctx.shadowBlur = 12;
  ctx.shadowColor = COLORS.ember;
  for (const m of state.embers) {
    ctx.fillStyle = COLORS.ember;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 4.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = COLORS.emberCore;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 2, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawDarkness() {
  dctx.clearRect(0, 0, W, H);
  dctx.globalCompositeOperation = 'source-over';
  dctx.fillStyle = 'rgba(4, 6, 18, 0.90)';
  dctx.fillRect(0, 0, W, H);
  dctx.globalCompositeOperation = 'destination-out';
  const p = state.player;
  punch(p.x, p.y, lightRadius(p));
  for (const m of state.embers) punch(m.x, m.y, 24);
  for (const b of state.bullets.enemy) punch(b.x, b.y, 20);
  for (const b of state.bullets.friendly) punch(b.x, b.y, 14);
  // Enemies betray themselves with a faint glow in the dark.
  for (const e of state.enemies) punch(e.x, e.y, e.r + 16);
  if (state.boss) punch(state.boss.x, state.boss.y, 82);
  ctx.drawImage(darkCanvas, 0, 0);
  // Warm glow spilling from the player's light.
  const g = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, lightRadius(p));
  g.addColorStop(0, 'rgba(255, 170, 60, 0.10)');
  g.addColorStop(1, 'rgba(255, 170, 60, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function render() {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawBackground();
  if (state.mode === 'title') {
    drawTitle(ctx, state);
  } else {
    drawEmbers();
    drawEnemies(ctx, state);
    drawBullets(ctx, state.bullets);
    drawPlayer(ctx, state);
    drawDarkness();
    drawFx(ctx, state.fx);
    drawHUD(ctx, state);
    if (state.mode === 'upgrade') drawUpgrade(ctx, state);
    else if (state.mode === 'paused') drawPaused(ctx, state);
    else if (state.mode === 'gameover') drawGameOver(ctx, state);
    else if (state.mode === 'victory') drawVictory(ctx, state);
  }
  ctx.restore();
}

// ---------- boot ----------

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  setupShot(state, shot);
  render();
  window.__shotReady = true;
} else {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, Math.max(0.001, (now - last) / 1000));
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
