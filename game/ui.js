// Emberdrift — HUD and screens.
// One job: everything drawn on top of the game world: the HUD, the
// title screen, upgrade cards, pause, game-over and victory screens.
// Clickable card rects are recorded on state.uiCards for main.js.

import { W, H, COLORS } from './consts.js';
import { lightRadius } from './player.js';

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return m + ':' + String(ss).padStart(2, '0');
}

function panel(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius || 12);
  ctx.fill();
}

export function drawHUD(ctx, state) {
  const p = state.player;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Top-left: score + wave.
  ctx.fillStyle = 'rgba(8, 6, 22, 0.55)';
  panel(ctx, 14, 12, 250, 64, 10);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 24px monospace';
  ctx.fillText('SCORE ' + state.score, 26, 40);
  ctx.font = 'bold 15px monospace';
  ctx.fillStyle = COLORS.dim;
  ctx.fillText('WAVE ' + state.wave + '   KILLS ' + state.kills, 26, 62);

  // Top-right: hearts + light.
  ctx.textAlign = 'right';
  let hearts = '';
  for (let i = 0; i < p.maxHearts; i++) hearts += i < p.hearts ? '♥ ' : '♡ ';
  ctx.font = '24px monospace';
  ctx.fillStyle = COLORS.heart;
  ctx.fillText(hearts, W - 26, 40);
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = COLORS.emberHot;
  ctx.fillText('LIGHT ' + Math.round(lightRadius(p)) + '  ✦ ' + p.light, W - 26, 62);
  ctx.textAlign = 'left';

  // Boss bar.
  if (state.boss) {
    const b = state.boss;
    const bw = 420;
    const bx = (W - bw) / 2;
    ctx.fillStyle = 'rgba(8, 6, 22, 0.6)';
    panel(ctx, bx - 10, 14, bw + 20, 34, 8);
    ctx.fillStyle = '#3d0a1e';
    ctx.fillRect(bx, 24, bw, 12);
    ctx.fillStyle = COLORS.boss;
    ctx.fillRect(bx, 24, bw * Math.max(0, b.hp / b.maxHp), 12);
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.fillText('EMBERLORD', W / 2, 46);
    ctx.textAlign = 'left';
  }

  // Nova cooldown, bottom-left.
  if (p.hasNova) {
    const ready = p.novaCd <= 0;
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = ready ? COLORS.emberHot : COLORS.dim;
    ctx.fillText(ready ? 'SPACE: NOVA READY' : 'NOVA ' + p.novaCd.toFixed(1) + 's', 20, H - 18);
  }

  // Wave banner.
  if (state.banner && state.banner.t > 0) {
    const a = Math.min(1, state.banner.t * 2);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.font = 'bold 44px Verdana, sans-serif';
    ctx.fillStyle = COLORS.emberHot;
    ctx.shadowColor = COLORS.ember;
    ctx.shadowBlur = 24;
    ctx.fillText(state.banner.text, W / 2, 150);
    ctx.shadowBlur = 0;
    ctx.font = '16px monospace';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(state.banner.sub || '', W / 2, 178);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}

export function drawTitle(ctx, state) {
  // Animated ember field behind the title.
  drawEmberField(ctx, state);
  ctx.textAlign = 'center';

  ctx.font = 'bold 84px Verdana, sans-serif';
  ctx.shadowColor = COLORS.ember;
  ctx.shadowBlur = 40;
  ctx.fillStyle = COLORS.emberHot;
  ctx.fillText('EMBERDRIFT', W / 2, 220);
  ctx.shadowBlur = 0;

  ctx.font = '20px monospace';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('A lone wisp. A hungry dark. Light is your weapon.', W / 2, 262);

  // Pulsing start prompt.
  const pulse = 0.65 + 0.35 * Math.sin(state.time * 3);
  ctx.globalAlpha = pulse;
  ctx.font = 'bold 26px Verdana, sans-serif';
  ctx.fillStyle = COLORS.emberCore;
  ctx.fillText('— CLICK TO START —', W / 2, 350);
  ctx.globalAlpha = 1;

  ctx.font = '16px monospace';
  ctx.fillStyle = COLORS.dim;
  ctx.fillText('WASD / ARROWS — move      MOUSE — aim      HOLD CLICK — shoot', W / 2, 420);
  ctx.fillText('SPACE — nova blast (after upgrade)      P — pause      M — mute', W / 2, 448);
  ctx.fillText('Collect embers to grow your light. Survive 10 waves. Slay the Emberlord.', W / 2, 476);

  if (state.best > 0) {
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = COLORS.gold;
    ctx.fillText('BEST SCORE  ' + state.best, W / 2, 530);
  }
  ctx.textAlign = 'left';
}

export function drawEmberField(ctx, state) {
  for (const e of state.titleEmbers) {
    const a = 0.25 + 0.55 * (e.y / H);
    ctx.globalAlpha = a;
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawUpgrade(ctx, state) {
  ctx.fillStyle = 'rgba(5, 3, 16, 0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = 'bold 40px Verdana, sans-serif';
  ctx.fillStyle = COLORS.emberHot;
  ctx.shadowColor = COLORS.ember;
  ctx.shadowBlur = 20;
  ctx.fillText('WAVE ' + state.wave + ' CLEARED', W / 2, 110);
  ctx.shadowBlur = 0;
  ctx.font = '18px monospace';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('Choose one upgrade — click a card or press 1, 2 or 3', W / 2, 146);

  const cw = 300;
  const ch = 260;
  const gap = 36;
  const total = cw * 3 + gap * 2;
  const x0 = (W - total) / 2;
  const y0 = 200;
  state.uiCards = [];
  state.upgrades.forEach((u, i) => {
    const x = x0 + i * (cw + gap);
    ctx.fillStyle = COLORS.cardBg;
    panel(ctx, x, y0, cw, ch, 14);
    ctx.strokeStyle = COLORS.cardBorder;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y0, cw, ch, 14);
    ctx.stroke();
    ctx.fillStyle = COLORS.emberHot;
    ctx.font = '44px Verdana, sans-serif';
    ctx.fillText(u.icon, x + cw / 2, y0 + 70);
    ctx.font = 'bold 22px Verdana, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(u.name, x + cw / 2, y0 + 118);
    ctx.font = '15px monospace';
    ctx.fillStyle = COLORS.dim;
    wrapText(ctx, u.desc, x + cw / 2, y0 + 150, cw - 36, 22);
    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = COLORS.cardBorder;
    ctx.fillText('[' + (i + 1) + ']', x + cw / 2, y0 + ch - 22);
    state.uiCards.push({ x, y: y0, w: cw, h: ch, id: u.id });
  });
  ctx.textAlign = 'left';
}

function wrapText(ctx, text, cx, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, yy);
      line = w;
      yy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, cx, yy);
}

export function drawPaused(ctx, state) {
  ctx.fillStyle = 'rgba(5, 3, 16, 0.66)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = 'bold 56px Verdana, sans-serif';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('PAUSED', W / 2, H / 2 - 10);
  ctx.font = '18px monospace';
  ctx.fillStyle = COLORS.dim;
  ctx.fillText('Press P or ESC to resume', W / 2, H / 2 + 30);
  ctx.textAlign = 'left';
  void state;
}

export function drawGameOver(ctx, state) {
  ctx.fillStyle = 'rgba(10, 2, 8, 0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = 'bold 58px Verdana, sans-serif';
  ctx.fillStyle = COLORS.brute;
  ctx.shadowColor = COLORS.brute;
  ctx.shadowBlur = 26;
  ctx.fillText('THE LIGHT FADES', W / 2, 190);
  ctx.shadowBlur = 0;

  ctx.font = 'bold 30px monospace';
  ctx.fillStyle = COLORS.emberHot;
  ctx.fillText('SCORE  ' + state.score, W / 2, 260);
  ctx.font = '19px monospace';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('WAVE REACHED   ' + state.wave, W / 2, 310);
  ctx.fillText('ENEMIES SLAIN  ' + state.kills, W / 2, 340);
  ctx.fillText('TIME SURVIVED  ' + fmtTime(state.time), W / 2, 370);
  ctx.fillText('EMBERS GATHERED  ' + state.player.light, W / 2, 400);
  if (state.score >= state.best && state.score > 0) {
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 20px monospace';
    ctx.fillText('★ NEW BEST SCORE ★', W / 2, 440);
  } else {
    ctx.fillStyle = COLORS.dim;
    ctx.font = '17px monospace';
    ctx.fillText('BEST  ' + state.best, W / 2, 440);
  }

  const pulse = 0.65 + 0.35 * Math.sin(state.time * 3);
  ctx.globalAlpha = pulse;
  ctx.font = 'bold 24px Verdana, sans-serif';
  ctx.fillStyle = COLORS.emberCore;
  ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', W / 2, 510);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

export function drawVictory(ctx, state) {
  ctx.fillStyle = 'rgba(4, 10, 6, 0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = 'bold 56px Verdana, sans-serif';
  ctx.fillStyle = COLORS.emberHot;
  ctx.shadowColor = COLORS.ember;
  ctx.shadowBlur = 30;
  ctx.fillText('THE DARK RETREATS', W / 2, 180);
  ctx.shadowBlur = 0;
  ctx.font = '22px monospace';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('You slew the Emberlord on wave 10. Dawn breaks over the arena.', W / 2, 224);

  ctx.font = 'bold 30px monospace';
  ctx.fillStyle = COLORS.emberHot;
  ctx.fillText('SCORE  ' + state.score, W / 2, 290);
  ctx.font = '19px monospace';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('ENEMIES SLAIN  ' + state.kills + '    TIME  ' + fmtTime(state.time), W / 2, 332);
  ctx.fillText('EMBERS GATHERED  ' + state.player.light, W / 2, 362);

  const pulse = 0.65 + 0.35 * Math.sin(state.time * 3);
  ctx.globalAlpha = pulse;
  ctx.font = 'bold 22px Verdana, sans-serif';
  ctx.fillStyle = COLORS.emberCore;
  ctx.fillText('C — CONTINUE ENDLESS      R — PLAY AGAIN', W / 2, 440);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}
