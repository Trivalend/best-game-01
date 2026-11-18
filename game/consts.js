// Emberdrift — shared constants: arena size, palette, tuning knobs.
// One job: the numbers every other module agrees on.

export const W = 1280;
export const H = 720;
export const TAU = Math.PI * 2;

export const COLORS = {
  bg0: '#070512',
  bg1: '#120a2e',
  arenaLine: 'rgba(150, 120, 255, 0.10)',
  ember: '#ffb347',
  emberHot: '#ffd166',
  emberCore: '#fff3c4',
  gold: '#f5a623',
  player: '#ffcf5c',
  drifter: '#b06cff',
  spitter: '#4dd8a0',
  brute: '#ff5d73',
  boss: '#ff2e63',
  bullet: '#ffe9a8',
  ebullet: '#ff6b81',
  text: '#f5f0ff',
  dim: '#9d94c9',
  heart: '#ff4d6d',
  cardBg: 'rgba(24, 16, 54, 0.92)',
  cardBorder: '#6b4fd8',
};

export const TUNE = {
  playerSpeed: 270,
  playerRadius: 14,
  playerFireRate: 4.4,
  bulletSpeed: 580,
  bulletDamage: 1,
  bulletLife: 1.1,
  baseLight: 135,
  lightPerEmber: 3.2,
  lightMax: 340,
  emberScore: 10,
  invulnTime: 1.5,
  novaCooldown: 7,
  novaRadius: 280,
  novaDamage: 6,
  waveClearBonus: 100,
};
