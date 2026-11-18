// Emberdrift — particles and floating score text.
// One job: spawn, update and draw short-lived visual feedback
// (explosions, hit sparks, ember glints, floating numbers).

export function createFx() {
  return { particles: [], texts: [] };
}

export function spawnBurst(fx, x, y, color, count, speed, size, life) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.3 + Math.random() * 0.7);
    fx.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: life * (0.6 + Math.random() * 0.4),
      maxLife: life,
      size: size * (0.6 + Math.random() * 0.8),
      color,
      drag: 0.9,
    });
  }
}

export function spawnRing(fx, x, y, color, count, speed, size) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    fx.particles.push({
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: 0.55,
      maxLife: 0.55,
      size,
      color,
      drag: 0.92,
    });
  }
}

export function spawnText(fx, x, y, text, color, size) {
  fx.texts.push({ x, y, vy: -46, life: 0.9, maxLife: 0.9, text, color, size: size || 15 });
}

export function updateFx(fx, dt) {
  for (let i = fx.particles.length - 1; i >= 0; i--) {
    const p = fx.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      fx.particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= p.drag;
    p.vy *= p.drag;
  }
  for (let i = fx.texts.length - 1; i >= 0; i--) {
    const t = fx.texts[i];
    t.life -= dt;
    if (t.life <= 0) {
      fx.texts.splice(i, 1);
      continue;
    }
    t.y += t.vy * dt;
  }
  if (fx.particles.length > 420) fx.particles.splice(0, fx.particles.length - 420);
}

export function drawFx(ctx, fx) {
  for (const p of fx.particles) {
    const a = p.life / p.maxLife;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const t of fx.texts) {
    const a = Math.min(1, (t.life / t.maxLife) * 1.6);
    ctx.globalAlpha = a;
    ctx.font = 'bold ' + t.size + 'px monospace';
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}
