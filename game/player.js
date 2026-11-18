// Emberdrift — the player: a lone ember-wisp.
// One job: the player's body, movement, aiming, firing, light level
// and damage handling. Rendering draws the wisp with its glow and
// flame trail.

import { W, H, TAU, COLORS, TUNE } from './consts.js';
import { clamp } from './rng.js';
import { fireBullet } from './bullets.js';

export function createPlayer() {
  return {
    x: W / 2,
    y: H / 2,
    vx: 0,
    vy: 0,
    r: TUNE.playerRadius,
    speed: TUNE.playerSpeed,
    hearts: 3,
    maxHearts: 3,
    invuln: 0,
    fireTimer: 0,
    fireRate: TUNE.playerFireRate,
    projectiles: 1,
    pierce: 0,
    bulletSpeed: TUNE.bulletSpeed,
    damage: TUNE.bulletDamage,
    magnet: 90,
    light: 0, // embers collected: grows the light radius
    novaCd: 0,
    hasNova: false,
    angle: -Math.PI / 2,
    trail: [],
  };
}

export function lightRadius(p) {
  return Math.min(TUNE.lightMax, TUNE.baseLight + p.light * TUNE.lightPerEmber);
}

export function updatePlayer(state, dt) {
  const p = state.player;
  const input = state.input;

  // Aim at the mouse (canvas coordinates).
  p.angle = Math.atan2(input.mouseY - p.y, input.mouseX - p.x);

  // WASD / arrows.
  let mx = 0;
  let my = 0;
  if (input.keys['KeyA'] || input.keys['ArrowLeft']) mx -= 1;
  if (input.keys['KeyD'] || input.keys['ArrowRight']) mx += 1;
  if (input.keys['KeyW'] || input.keys['ArrowUp']) my -= 1;
  if (input.keys['KeyS'] || input.keys['ArrowDown']) my += 1;
  if (mx !== 0 && my !== 0) {
    mx *= Math.SQRT1_2;
    my *= Math.SQRT1_2;
  }
  p.vx = mx * p.speed;
  p.vy = my * p.speed;
  p.x = clamp(p.x + p.vx * dt, p.r + 8, W - p.r - 8);
  p.y = clamp(p.y + p.vy * dt, p.r + 8, H - p.r - 8);

  // Flame trail.
  p.trail.push({ x: p.x, y: p.y, life: 0.35 });
  if (p.trail.length > 22) p.trail.shift();
  for (const t of p.trail) t.life -= dt;
  while (p.trail.length && p.trail[0].life <= 0) p.trail.shift();

  if (p.invuln > 0) p.invuln -= dt;
  if (p.novaCd > 0) p.novaCd -= dt;

  // Hold the mouse to fire toward the aim (Space is the nova blast).
  p.fireTimer -= dt;
  const firing = input.mouseDown;
  if (firing && p.fireTimer <= 0) {
    p.fireTimer = 1 / p.fireRate;
    const n = p.projectiles;
    const spread = 0.14;
    for (let i = 0; i < n; i++) {
      const off = n === 1 ? 0 : (i - (n - 1) / 2) * spread;
      fireBullet(state.bullets, p.x + Math.cos(p.angle) * (p.r + 6), p.y + Math.sin(p.angle) * (p.r + 6), p.angle + off, p.bulletSpeed, p.damage, p.pierce);
    }
    state.audio.shoot();
  }
}

export function damagePlayer(state, amount) {
  const p = state.player;
  if (p.invuln > 0 || state.mode !== 'playing') return false;
  p.hearts -= amount;
  p.invuln = TUNE.invulnTime;
  state.shake = 14;
  state.audio.hurt();
  return true;
}

export function drawPlayer(ctx, state) {
  const p = state.player;
  if (p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0) return; // blink while invulnerable

  // Flame trail.
  for (const t of p.trail) {
    const a = Math.max(0, t.life / 0.35) * 0.5;
    ctx.globalAlpha = a;
    ctx.fillStyle = COLORS.ember;
    ctx.beginPath();
    ctx.arc(t.x, t.y, p.r * 0.55 * (t.life / 0.35 + 0.4), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Glow + body.
  ctx.save();
  ctx.shadowBlur = 30;
  ctx.shadowColor = COLORS.ember;
  const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r + 10);
  g.addColorStop(0, COLORS.emberCore);
  g.addColorStop(0.45, COLORS.emberHot);
  g.addColorStop(1, 'rgba(255, 140, 40, 0.25)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r + 6, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Face: two bright eyes toward the aim.
  const ex = Math.cos(p.angle);
  const ey = Math.sin(p.angle);
  ctx.fillStyle = '#241505';
  ctx.beginPath();
  ctx.arc(p.x + ex * 5 - ey * 4, p.y + ey * 5 + ex * 4, 2.6, 0, TAU);
  ctx.arc(p.x + ex * 5 + ey * 4, p.y + ey * 5 - ex * 4, 2.6, 0, TAU);
  ctx.fill();
}
