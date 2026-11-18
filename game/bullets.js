// Emberdrift — bullets: the player's ember shots and enemy orbs.
// One job: create, move, draw and cull projectiles. Collision with
// enemies and the player lives in main.js.

import { W, H, COLORS } from './consts.js';

export function createBullets() {
  return { friendly: [], enemy: [] };
}

export function fireBullet(bullets, x, y, angle, speed, damage, pierce) {
  bullets.friendly.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: 5,
    damage,
    pierce,
    life: 1.1,
  });
}

export function fireEnemyOrb(bullets, x, y, angle, speed) {
  bullets.enemy.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: 7,
    life: 6,
  });
}

export function updateBullets(bullets, dt) {
  for (const arr of [bullets.friendly, bullets.enemy]) {
    for (let i = arr.length - 1; i >= 0; i--) {
      const b = arr[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
        arr.splice(i, 1);
      }
    }
  }
}

export function clearEnemyBullets(bullets) {
  bullets.enemy.length = 0;
}

export function drawBullets(ctx, bullets) {
  ctx.save();
  ctx.shadowBlur = 14;
  for (const b of bullets.friendly) {
    ctx.shadowColor = COLORS.ember;
    ctx.fillStyle = COLORS.bullet;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.emberCore;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const b of bullets.enemy) {
    ctx.shadowColor = COLORS.ebullet;
    ctx.fillStyle = COLORS.ebullet;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd7de';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
