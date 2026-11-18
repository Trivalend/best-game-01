// Emberdrift — deterministic screenshot scenes.
// One job: build a fixed, reproducible game state for each ?shot=
// scene (title | play | upgrade | gameover) using a seeded RNG and
// fixed positions, so screenshots are identical on every run.
// Normal play never calls this file.

import { W, H, COLORS } from './consts.js';
import { makeRng } from './rng.js';
import { makeEnemy } from './enemies.js';
import { rollUpgrades } from './waves.js';

const SHOT_SEED = 20261118;

function seedTitleEmbers(state, rng) {
  state.titleEmbers = [];
  for (let i = 0; i < 80; i++) {
    state.titleEmbers.push({
      x: rng.range(0, W),
      y: rng.range(0, H),
      r: rng.range(1, 3.4),
      color: rng.pick([COLORS.ember, COLORS.emberHot, '#ff8c42', '#c77dff']),
      vy: rng.range(6, 22),
    });
  }
}

export function setupShot(state, scene) {
  const rng = makeRng(SHOT_SEED);
  state.rng = rng;
  state.shot = scene;
  seedTitleEmbers(state, rng);

  if (scene === 'title') {
    state.mode = 'title';
    state.time = 0.52; // pulse at its brightest for the screenshot
    state.best = 2340;
    return;
  }

  if (scene === 'play') {
    state.mode = 'playing';
    state.time = 96.4;
    state.wave = 3;
    state.score = 1250;
    state.kills = 23;
    state.best = 2340;
    const p = state.player;
    p.x = W / 2;
    p.y = H / 2 + 40;
    p.hearts = 2;
    p.maxHearts = 3;
    p.light = 42;
    p.projectiles = 2;
    p.angle = -0.5;
    p.trail = [];
    for (let i = 0; i < 10; i++) {
      p.trail.push({ x: p.x - i * 9, y: p.y + i * 5, life: 0.35 - i * 0.03 });
    }
    // Enemies closing in from the dark.
    const spots = [
      ['drifter', 830, 280],
      ['drifter', 470, 260],
      ['drifter', 900, 480],
      ['drifter', 760, 520],
      ['spitter', 380, 500],
      ['spitter', 950, 600],
      ['brute', 640, 200],
    ];
    for (const [type, x, y] of spots) {
      const e = makeEnemy(rng, type, x, y, 1);
      e.hp = type === 'brute' ? 7 : e.hp;
      state.enemies.push(e);
    }
    // Bullets mid-flight toward the aim.
    for (let i = 0; i < 4; i++) {
      const a = -0.5 + (i - 1.5) * 0.08;
      state.bullets.friendly.push({
        x: p.x + 60 + i * 70,
        y: p.y - 30 - i * 28,
        vx: Math.cos(a) * 580,
        vy: Math.sin(a) * 580,
        r: 5,
        damage: 1,
        pierce: 0,
        life: 1.0,
      });
    }
    state.bullets.enemy.push({
      x: 560, y: 340, vx: 120, vy: 90, r: 7, life: 5,
    });
    // Scattered embers and a few sparks.
    for (let i = 0; i < 12; i++) {
      state.embers.push({
        x: rng.range(500, 900),
        y: rng.range(300, 560),
        vx: 0,
        vy: 0,
        value: 1,
        life: 14,
      });
    }
    for (let i = 0; i < 14; i++) {
      state.fx.particles.push({
        x: rng.range(700, 900),
        y: rng.range(180, 300),
        vx: rng.range(-40, 40),
        vy: rng.range(-40, 40),
        life: 0.4,
        maxLife: 0.7,
        size: 3.5,
        color: COLORS.emberHot,
        drag: 0.9,
      });
    }
    state.fx.texts.push({ x: 820, y: 210, vy: -46, life: 0.7, maxLife: 0.9, text: '+50', color: COLORS.emberHot, size: 16 });
    state.banner = { text: 'WAVE 3', sub: 'The dark thickens', t: 1 };
    return;
  }

  if (scene === 'upgrade') {
    state.mode = 'upgrade';
    state.time = 74.2;
    state.wave = 2;
    state.score = 480;
    state.kills = 14;
    state.best = 2340;
    state.player.light = 12;
    state.player.hearts = 3;
    state.upgrades = rollUpgrades(rng, 3);
    return;
  }

  if (scene === 'gameover') {
    state.mode = 'gameover';
    state.time = 245.52; // restart prompt at its brightest
    state.wave = 6;
    state.score = 2340;
    state.kills = 41;
    state.best = 2340;
    state.player.light = 38;
    state.player.hearts = 0;
    state.enemies.push(makeEnemy(rng, 'drifter', 900, 300, 1));
    state.enemies.push(makeEnemy(rng, 'brute', 360, 480, 1));
    return;
  }

  // Unknown scene: fall back to the title.
  state.mode = 'title';
  state.time = 12.0;
}
