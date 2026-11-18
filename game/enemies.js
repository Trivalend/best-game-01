// Emberdrift — enemies: drifters, spitters, brutes and the boss.
// One job: enemy bodies, their movement and attack patterns, spawning
// at the arena edge, and what they drop when they die.

import { W, H, TAU, COLORS } from './consts.js';
import { angleTo, clamp } from './rng.js';
import { fireEnemyOrb } from './bullets.js';
import { spawnBurst, spawnText } from './particles.js';

export const ENEMY_TYPES = {
  drifter: { hp: 2, speed: 95, r: 14, score: 50, embers: 2, color: COLORS.drifter },
  spitter: { hp: 3, speed: 58, r: 15, score: 100, embers: 3, color: COLORS.spitter },
  brute: { hp: 11, speed: 44, r: 26, score: 200, embers: 5, color: COLORS.brute },
  boss: { hp: 200, speed: 52, r: 44, score: 1000, embers: 18, color: COLORS.boss },
};

export function makeEnemy(rng, type, x, y, hpScale) {
  const base = ENEMY_TYPES[type];
  const hp = Math.round(base.hp * (hpScale || 1));
  return {
    type,
    x,
    y,
    vx: 0,
    vy: 0,
    r: base.r,
    hp,
    maxHp: hp,
    speed: base.speed * rng.range(0.9, 1.1),
    score: base.score,
    embers: base.embers,
    color: base.color,
    t: rng.range(0, 10),
    shootTimer: rng.range(1.2, 2.4),
    burstTimer: 3,
    chargeTimer: 6,
    charging: 0,
    flash: 0,
    boss: type === 'boss',
  };
}

export function edgeSpawn(rng) {
  const side = rng.int(0, 3);
  const m = 30;
  if (side === 0) return { x: rng.range(m, W - m), y: m };
  if (side === 1) return { x: rng.range(m, W - m), y: H - m };
  if (side === 2) return { x: m, y: rng.range(m, H - m) };
  return { x: W - m, y: rng.range(m, H - m) };
}

export function updateEnemies(state, dt) {
  const p = state.player;
  for (const e of state.enemies) {
    e.t += dt;
    if (e.flash > 0) e.flash -= dt;
    const ang = angleTo(e.x, e.y, p.x, p.y);
    const d = Math.hypot(p.x - e.x, p.y - e.y);

    if (e.type === 'drifter') {
      const wob = Math.sin(e.t * 2.2) * 0.5;
      e.vx = Math.cos(ang + wob) * e.speed;
      e.vy = Math.sin(ang + wob) * e.speed;
    } else if (e.type === 'spitter') {
      // Keep a distance, strafe, and spit orbs.
      const want = 270;
      const dir = d > want + 30 ? 1 : d < want - 30 ? -1 : 0;
      const strafe = Math.sin(e.t * 1.4) * 0.8;
      e.vx = (Math.cos(ang) * dir + Math.cos(ang + Math.PI / 2) * strafe) * e.speed;
      e.vy = (Math.sin(ang) * dir + Math.sin(ang + Math.PI / 2) * strafe) * e.speed;
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && d < 560) {
        e.shootTimer = 2.3;
        fireEnemyOrb(state.bullets, e.x, e.y, ang, 170);
      }
    } else if (e.type === 'brute') {
      e.vx = Math.cos(ang) * e.speed;
      e.vy = Math.sin(ang) * e.speed;
    } else if (e.type === 'boss') {
      updateBoss(state, e, dt, ang, d);
    }

    e.x = clamp(e.x + e.vx * dt, e.r, W - e.r);
    e.y = clamp(e.y + e.vy * dt, e.r, H - e.r);
  }
}

function updateBoss(state, e, dt, ang, d) {
  const p = state.player;
  // Radial burst every ~3.2 s.
  e.burstTimer -= dt;
  if (e.burstTimer <= 0) {
    e.burstTimer = 3.2;
    for (let i = 0; i < 10; i++) {
      fireEnemyOrb(state.bullets, e.x, e.y, (i / 10) * TAU + e.t, 150);
    }
    state.audio.bossRoar();
  }
  // Charge at the player every ~6.5 s.
  e.chargeTimer -= dt;
  if (e.charging > 0) {
    e.charging -= dt;
    e.vx = Math.cos(e.chargeAngle) * 340;
    e.vy = Math.sin(e.chargeAngle) * 340;
  } else if (e.chargeTimer <= 0) {
    e.chargeTimer = 6.5;
    e.charging = 0.55;
    e.chargeAngle = ang;
    state.audio.bossRoar();
  } else {
    e.vx = Math.cos(ang) * e.speed;
    e.vy = Math.sin(ang) * e.speed;
  }
  // Occasionally spit a aimed orb.
  e.shootTimer -= dt;
  if (e.shootTimer <= 0) {
    e.shootTimer = 1.6;
    fireEnemyOrb(state.bullets, e.x, e.y, ang, 210);
  }
  void p;
  void d;
}

export function killEnemy(state, e) {
  state.kills += 1;
  state.score += e.score;
  spawnBurst(state.fx, e.x, e.y, e.color, e.boss ? 46 : 18, e.boss ? 320 : 220, e.boss ? 6 : 4, 0.7);
  spawnBurst(state.fx, e.x, e.y, COLORS.emberHot, 10, 160, 4, 0.5);
  spawnText(state.fx, e.x, e.y - e.r, '+' + e.score, COLORS.emberHot, e.boss ? 22 : 15);
  // Drop embers that scatter and drift.
  for (let i = 0; i < e.embers; i++) {
    const a = Math.random() * TAU;
    const s = 60 + Math.random() * 120;
    state.embers.push({
      x: e.x,
      y: e.y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      value: 1,
      life: 14,
    });
  }
  state.audio.enemyDie();
  if (e.boss) {
    state.shake = 22;
    state.boss = null;
  }
}

export function drawEnemies(ctx, state) {
  for (const e of state.enemies) {
    ctx.save();
    ctx.shadowBlur = 16;
    ctx.shadowColor = e.color;
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : e.color;
    if (e.type === 'drifter') {
      // Wisp with a wobbling tail.
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(e.x - e.r * 0.7, e.y);
      ctx.quadraticCurveTo(e.x - e.r * 2, e.y + Math.sin(e.t * 6) * 8, e.x - e.r * 2.6, e.y + Math.sin(e.t * 6) * 12);
      ctx.lineTo(e.x - e.r * 2.6, e.y - Math.sin(e.t * 6) * 4);
      ctx.quadraticCurveTo(e.x - e.r * 1.6, e.y, e.x - e.r * 0.7, e.y);
      ctx.fill();
    } else if (e.type === 'spitter') {
      // Diamond with a mouth.
      ctx.beginPath();
      ctx.moveTo(e.x, e.y - e.r);
      ctx.lineTo(e.x + e.r, e.y);
      ctx.lineTo(e.x, e.y + e.r);
      ctx.lineTo(e.x - e.r, e.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0b2e22';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * 0.35, 0, TAU);
      ctx.fill();
    } else if (e.type === 'brute') {
      // Hexagon slab.
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + e.t * 0.3;
        const px = e.x + Math.cos(a) * e.r;
        const py = e.y + Math.sin(a) * e.r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2a0610';
      ctx.beginPath();
      ctx.arc(e.x - 7, e.y - 4, 3, 0, TAU);
      ctx.arc(e.x + 7, e.y - 4, 3, 0, TAU);
      ctx.fill();
    } else {
      // Boss: big spiked crown orb.
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + e.t * 0.2;
        const rr = i % 2 === 0 ? e.r + 12 : e.r;
        const px = e.x + Math.cos(a) * rr;
        const py = e.y + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2a0210';
      ctx.beginPath();
      ctx.arc(e.x - 12, e.y - 8, 5, 0, TAU);
      ctx.arc(e.x + 12, e.y - 8, 5, 0, TAU);
      ctx.fill();
    }
    // Health pips for tough enemies.
    if (e.maxHp > 3 && !e.boss) {
      const w = e.r * 2;
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(e.x - w / 2, e.y - e.r - 10, w, 4);
      ctx.fillStyle = e.color;
      ctx.fillRect(e.x - w / 2, e.y - e.r - 10, w * Math.max(0, e.hp / e.maxHp), 4);
    }
    ctx.restore();
  }
}
