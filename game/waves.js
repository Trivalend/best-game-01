// Emberdrift — waves and upgrades.
// One job: what each wave throws at the player, and the pool of
// between-wave upgrades the player chooses from.

import { TUNE } from './consts.js';

// Build the spawn queue for wave n: an array of enemy type names.
// Boss waves are every 5th wave. HP scales gently with the wave.
export function buildWave(rng, n) {
  const queue = [];
  if (n % 5 === 0) {
    queue.push('boss');
    const adds = 2 + n;
    for (let i = 0; i < adds; i++) queue.push('drifter');
    if (n >= 10) for (let i = 0; i < 2; i++) queue.push('spitter');
    return rng.shuffle(queue);
  }
  const drifters = 5 + n * 2;
  const spitters = n >= 2 ? 1 + Math.floor(n / 2) : 0;
  const brutes = n >= 3 ? Math.floor((n - 1) / 2) : 0;
  for (let i = 0; i < drifters; i++) queue.push('drifter');
  for (let i = 0; i < spitters; i++) queue.push('spitter');
  for (let i = 0; i < brutes; i++) queue.push('brute');
  return rng.shuffle(queue);
}

export function waveHpScale(n) {
  return 1 + (n - 1) * 0.12;
}

export const UPGRADES = [
  {
    id: 'spread',
    name: 'Twin Flame',
    desc: '+1 projectile per shot. More embers in the air at once.',
    icon: '✦✦',
    apply(state) {
      state.player.projectiles += 1;
    },
  },
  {
    id: 'rapid',
    name: 'Rapid Burn',
    desc: 'Fire rate +25%. Your wisp spits embers faster.',
    icon: '≫',
    apply(state) {
      state.player.fireRate *= 1.25;
    },
  },
  {
    id: 'pierce',
    name: 'Piercing Light',
    desc: 'Shots pierce +1 enemy. Lines of drifters fall to one shot.',
    icon: '➶',
    apply(state) {
      state.player.pierce += 1;
    },
  },
  {
    id: 'heart',
    name: 'Kindled Heart',
    desc: '+1 max heart and heal 1 heart right now.',
    icon: '♥',
    apply(state) {
      state.player.maxHearts += 1;
      state.player.hearts = Math.min(state.player.maxHearts, state.player.hearts + 1);
    },
  },
  {
    id: 'nova',
    name: 'Nova Bomb',
    desc: 'Press SPACE for a nova blast: heavy damage all around you. 7s cooldown.',
    icon: '☀',
    apply(state) {
      state.player.hasNova = true;
      state.player.novaCd = 0;
    },
  },
  {
    id: 'magnet',
    name: 'Ember Magnet',
    desc: 'Ember pickup radius ×2. Your light gathers itself to you.',
    icon: '🧲',
    apply(state) {
      state.player.magnet *= 2;
    },
  },
  {
    id: 'light',
    name: 'Brighter Flame',
    desc: '+14 light at once. See further into the dark.',
    icon: '◉',
    apply(state) {
      state.player.light += 14;
    },
  },
  {
    id: 'speed',
    name: 'Swift Drift',
    desc: 'Move speed +15%. Outrun the dark.',
    icon: '»',
    apply(state) {
      state.player.speed *= 1.15;
    },
  },
];

export function rollUpgrades(rng, count) {
  const pool = rng.shuffle(UPGRADES);
  return pool.slice(0, count);
}

export function applyUpgrade(state, id) {
  const u = UPGRADES.find((x) => x.id === id);
  if (u) u.apply(state);
}

// Nova blast: damages every enemy in radius, clears enemy orbs.
// Returns the enemies it killed so the caller can score them.
export function fireNova(state) {
  const p = state.player;
  if (!p.hasNova || p.novaCd > 0) return [];
  p.novaCd = TUNE.novaCooldown;
  state.audio.nova();
  state.shake = 10;
  const R = TUNE.novaRadius;
  const killed = [];
  for (const e of state.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < R + e.r) {
      e.hp -= TUNE.novaDamage;
      e.flash = 0.2;
      if (e.hp <= 0) killed.push(e);
    }
  }
  for (const e of killed) {
    const idx = state.enemies.indexOf(e);
    if (idx >= 0) state.enemies.splice(idx, 1);
  }
  state.bullets.enemy.length = 0;
  return killed;
}
