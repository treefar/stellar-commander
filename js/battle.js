/* battle.js — 即時 2D 橫向戰鬥（企劃書 5.2 / 5.3）
   場地 560x188（約 2.2 個畫面寬），最多 7 台同場，60 秒倒數。
   太空有慣性：放開方向鍵會滑行。 */
'use strict';

/* 戰鬥層把 HP 放大 HP_SCALE 倍再打，結束時再除回去。
   理由：企劃書的 HP/傷害是「戰略層一次交火」的尺度，直接拿來跑即時戰鬥
   會在 10 秒內全滅（實測 3v3 六台全死）。放大後單挑約 9~14 秒，
   剛好塞得進 60 秒倒數，也才有「靠操作以弱擊強」的空間。
   實測：×3 時單挑平均 5.5 秒（太快），×5 時約 9~14 秒。 */
const HP_SCALE = 5;
const HUD_H = 30;
const FIELD_W = 560;   // 約 2.2 個畫面寬：夠有空間拉開距離，又不會追半天追不到
const FIELD_TOP = HUD_H + 6;
const FIELD_BOT = GH - 6;

const Battle = {
  ents: [], bullets: [], fx: [], funnels: [],
  cam: 0, timer: 0, limit: 3600, terrain: null, playerSide: 'blue',
  auto: false, over: 0, result: null, onEnd: null, paused: false,
  bg: null, skill: 0.5, shake: 0,
  combo: 0, comboT: 0,

  /**
   * cfg = { blue:[{id,hp}], red:[{id,hp}], playerSide, playerIdx, terrain, auto, seconds, skill, onEnd }
   */
  start(cfg) {
    this.ents = []; this.bullets = []; this.fx = []; this.funnels = [];
    this.cam = 0; this.over = 0; this.result = null; this.paused = false; this.shake = 0;
    this.combo = 0; this.comboT = 0;
    this.terrain = cfg.terrain || TERRAIN.space;
    this.playerSide = cfg.playerSide;
    this.auto = !!cfg.auto;
    this.skill = cfg.skill === undefined ? 0.5 : cfg.skill;
    this.limit = (cfg.seconds || 60) * 60;
    this.timer = this.limit;
    this.onEnd = cfg.onEnd;

    const mk = (list, side, baseX, dir) => {
      list.forEach((s, i) => {
        const def = UnitDB.get(s.id);
        const e = {
          ref: s, def, side,
          x: baseX + dir * i * 26 + rnd(-8, 8),
          y: FIELD_TOP + 40 + (i % 3) * 46 + rnd(-10, 10),
          vx: 0, vy: 0, face: dir > 0 ? 1 : -1,
          hp: s.hp * HP_SCALE, maxhp: def.hp * HP_SCALE,
          ammo: def.weapons.map(w => w ? w.ammo : 0),
          cd: [0, 0, 0, 0], fireT: 0, meleeT: 0, meleeHit: null,
          flash: 0, dead: false, charge: 0, chargeIdx: -1, kills: 0,
          ai: { target: null, retarget: 0, evade: 0, dirY: 1, think: 0 },
          isPlayer: false
        };
        this.ents.push(e);
      });
    };
    mk(cfg.blue, 'blue', 130, 1);
    mk(cfg.red, 'red', FIELD_W - 130, -1);

    const mine = this.ents.filter(e => e.side === cfg.playerSide);
    const p = mine[cfg.playerIdx || 0] || mine[0];
    if (p && !this.auto) p.isPlayer = true;
    this.player = p || null;
    this.cam = clamp((p ? p.x : FIELD_W / 2) - GW / 2, 0, FIELD_W - GW);
    this.bg = this.makeBg(this.terrain.id);
    Sfx.play('battle');
  },

  /* ---------- 背景（三層視差） ----------
     星雲與岩塊都先畫成低解析度像素圖再整數放大，
     不用 ctx.arc／漸層直接畫，否則會出現平滑邊緣，破壞像素風格。 */

  /** 抖色（dither）星雲團：低解析度畫好再放大 2 倍 */
  makeCloud(hue, r) {
    const S = Math.max(10, Math.round(r));
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const c = cv.getContext('2d');
    const img = c.createImageData(S, S);
    const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
    const cx = S / 2, cy = S / 2;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const d = Math.hypot(x - cx, y - cy) / (S / 2);
      const a = Math.max(0, 1 - d) ** 1.7;
      const lv = Math.floor(a * 4 + (BAYER[y & 3][x & 3] / 16 - 0.5) * 0.9);
      if (lv <= 0) continue;
      const [rr, gg, bb] = hsl2rgb(hue, 0.52, 0.20 + lv * 0.07);
      const i = (y * S + x) * 4;
      img.data[i] = rr; img.data[i + 1] = gg; img.data[i + 2] = bb;
      img.data[i + 3] = Math.min(255, lv * 46);
    }
    c.putImageData(img, 0, 0);
    return cv;
  },

  /** 像素岩塊：不規則輪廓 + 左上受光 + 1px 描邊 */
  makeRock(r) {
    const S = r * 2 + 4, cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const c = cv.getContext('2d');
    const img = c.createImageData(S, S);
    const jitter = [];
    for (let i = 0; i < 12; i++) jitter.push(0.78 + Math.random() * 0.28);
    const cx = S / 2, cy = S / 2;
    const put = (x, y, col, a) => {
      const i = ((y | 0) * S + (x | 0)) * 4;
      img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = a;
    };
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = x - cx, dy = y - cy;
      const d = Math.hypot(dx, dy);
      const ang = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2) * 12;
      const j = jitter[Math.floor(ang) % 12];
      const edge = r * j;
      if (d > edge) continue;
      const lit = (-dx - dy) / (r * 2) + 0.5;            // 左上亮、右下暗
      const col = d > edge - 1 ? [22, 20, 30]
        : lit > 0.66 ? [110, 102, 128] : lit > 0.42 ? [78, 70, 94] : [50, 44, 64];
      put(x, y, col, 255);
    }
    c.putImageData(img, 0, 0);
    return cv;
  },

  makeBg(kind) {
    const far = [], mid = [], near = [], rocks = [], clouds = [];
    // Node 跑模擬對戰時沒有 document，也用不到背景
    if (typeof document === 'undefined') return { far, mid, near, rocks, clouds };
    for (let i = 0; i < 130; i++) far.push({ x: Math.random() * 512, y: FIELD_TOP + Math.random() * (FIELD_BOT - FIELD_TOP), c: pick(['#3a4468', '#4c5680', '#606a94']) });
    for (let i = 0; i < 70; i++) mid.push({ x: Math.random() * 512, y: FIELD_TOP + Math.random() * (FIELD_BOT - FIELD_TOP), c: pick(['#8892c0', '#aab4dc']) });
    for (let i = 0; i < 26; i++) near.push({ x: Math.random() * 512, y: FIELD_TOP + Math.random() * (FIELD_BOT - FIELD_TOP), c: '#ffffff' });
    const cn = kind === 'nebula' ? 8 : 4;
    for (let i = 0; i < cn; i++) {
      const r = irnd(22, 40);
      clouds.push({
        x: Math.random() * 512, y: FIELD_TOP + Math.random() * (FIELD_BOT - FIELD_TOP - 40),
        img: this.makeCloud(kind === 'nebula' ? irnd(255, 320) : irnd(225, 295), r), s: r * 2
      });
    }
    if (kind === 'debris') {
      for (let i = 0; i < 14; i++) {
        const r = irnd(4, 11);
        rocks.push({ x: Math.random() * 512, y: FIELD_TOP + Math.random() * (FIELD_BOT - FIELD_TOP), img: this.makeRock(r), s: r * 2 + 4 });
      }
    }
    return { far, mid, near, rocks, clouds };
  },

  drawBg(ctx) {
    ctx.fillStyle = '#05050c';
    ctx.fillRect(0, HUD_H, GW, GH - HUD_H);
    const B = this.bg;
    for (const c of B.clouds) {
      const x = ((c.x - this.cam * 0.12) % 512 + 512) % 512 - 128;
      if (x < -c.s || x > GW + c.s) continue;
      ctx.drawImage(c.img, x | 0, (c.y - c.s / 2) | 0, c.s, c.s);
    }
    const layer = (arr, f, s) => {
      for (const p of arr) {
        const x = ((p.x - this.cam * f) % 512 + 512) % 512;
        if (x > GW) continue;
        ctx.fillStyle = p.c;
        ctx.fillRect(x | 0, p.y | 0, s, s);
      }
    };
    layer(B.far, 0.18, 1);
    layer(B.mid, 0.42, 1);
    layer(B.near, 0.78, 2);
    for (const r of B.rocks) {
      const x = ((r.x - this.cam * 0.62) % 512 + 512) % 512;
      if (x < -r.s || x > GW + r.s) continue;
      ctx.drawImage(r.img, (x - r.s / 2) | 0, (r.y - r.s / 2) | 0);
    }
    // 高速推進時的像素速度線，讓慣性與衝刺方向更清楚。
    if (this.player && this.player.thrust && Math.abs(this.player.vx) > 1.2) {
      const dir = this.player.vx > 0 ? -1 : 1;
      ctx.fillStyle = 'rgba(170,210,255,.42)';
      for (let i = 0; i < 7; i++) {
        const x = ((Core.frame * 5 * dir + i * 43) % (GW + 50) + GW + 50) % (GW + 50) - 25;
        const y = FIELD_TOP + 12 + (i * 29 % (FIELD_BOT - FIELD_TOP - 20));
        ctx.fillRect(x | 0, y | 0, 8 + (i % 3) * 4, 1);
      }
    }
  },

  /* ---------- 更新 ---------- */
  update() {
    if (Input.p('start') && !this.over) { this.paused = !this.paused; Sfx.cursor(); }
    if (this.paused) return;
    if (this.comboT > 0) this.comboT--;
    else this.combo = 0;

    if (!this.over) {
      this.timer--;
      for (const e of this.ents) if (!e.dead) this.updateEnt(e);
      this.updateFunnels();
      this.updateBullets();
      this.checkEnd();
    } else {
      this.over--;
      if (this.over <= 0) { this.finish(); return; }
    }
    this.updateFx();

    // 攝影機
    const foc = this.player && !this.player.dead ? this.player
      : (this.ents.find(e => !e.dead && e.side === this.playerSide) || this.ents.find(e => !e.dead));
    if (foc) this.cam = clamp(lerp(this.cam, foc.x - GW / 2, 0.12), 0, FIELD_W - GW);
    if (this.shake > 0) this.shake--;
  },

  updateEnt(e) {
    for (let i = 0; i < 4; i++) if (e.cd[i] > 0) e.cd[i]--;
    if (e.fireT > 0) e.fireT--;
    if (e.meleeT > 0) { e.meleeT--; this.meleeCheck(e); }
    if (e.flash > 0) e.flash--;

    if (e.isPlayer) this.controlPlayer(e); else this.controlAI(e);

    // 慣性
    const max = e.def.spd * 1.35;
    e.vx = clamp(e.vx, -max, max);
    e.vy = clamp(e.vy, -max, max);
    e.vx *= 0.945; e.vy *= 0.945;
    e.x += e.vx; e.y += e.vy;
    if (e.x < 14) { e.x = 14; e.vx *= -0.3; }
    if (e.x > FIELD_W - 14) { e.x = FIELD_W - 14; e.vx *= -0.3; }
    if (e.y < FIELD_TOP + 12) { e.y = FIELD_TOP + 12; e.vy *= -0.3; }
    if (e.y > FIELD_BOT - 12) { e.y = FIELD_BOT - 12; e.vy *= -0.3; }
  },

  controlPlayer(e) {
    const a = e.def.acc;
    let th = false;
    if (Input.d('left')) { e.vx -= a; e.face = -1; th = true; }
    if (Input.d('right')) { e.vx += a; e.face = 1; th = true; }
    if (Input.d('up')) { e.vy -= a; th = true; }
    if (Input.d('down')) { e.vy += a; th = true; }
    e.thrust = th;

    const aimY = Input.d('up') ? -1 : Input.d('down') ? 1 : 0;
    const keys = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 4; i++) {
      const w = e.def.weapons[i];
      if (!w) continue;
      if (w.t === 'charge') {
        if (Input.d(keys[i]) && e.cd[i] <= 0) { e.charge = Math.min(w.chg, e.charge + 1); e.chargeIdx = i; }
        else if (e.charge > 0 && e.chargeIdx === i) {
          this.fire(e, i, aimY, e.charge >= w.chg);
          e.charge = 0; e.chargeIdx = -1;
        }
      } else if (Input.d(keys[i])) {
        this.fire(e, i, aimY, false);
      }
    }
  },

  controlAI(e) {
    const ai = e.ai;
    const S = this.skill;                    // 0=笨 1=強
    if (ai.retarget-- <= 0) {
      ai.retarget = 30;
      let best = null, bd = 1e9;
      for (const o of this.ents) {
        if (o.dead || o.side === e.side) continue;
        const d = dist(e.x, e.y, o.x, o.y);
        if (d < bd) { bd = d; best = o; }
      }
      // 換目標才有反應延遲；沒換目標就不該卡住射速
      if (best !== ai.target) ai.hesitate = Math.round((1 - S) * 26);
      ai.target = best;
    }
    const t = ai.target;
    if (!t || t.dead) { e.thrust = false; return; }

    const dx = t.x - e.x, dy = t.y - e.y;
    const d = Math.hypot(dx, dy);
    e.face = dx >= 0 ? 1 : -1;
    const a = e.def.acc;

    // 迴避：附近有敵彈朝自己來
    if (ai.evade > 0) {
      ai.evade--;
      e.vy += a * ai.dirY;
      e.thrust = true;
    } else {
      for (const b of this.bullets) {
        if (b.side === e.side) continue;
        if (Math.abs(b.y - e.y) < 12 && Math.abs(b.x - e.x) < 60 && (b.x - e.x) * b.vx < 0) {
          if (Math.random() < 0.25 + S * 0.35) { ai.evade = 22; ai.dirY = Math.random() < 0.5 ? -1 : 1; }
          break;
        }
      }
      // 接近／保持距離
      const pref = this.prefRange(e);
      if (d > pref + 12) { e.vx += Math.sign(dx) * a; e.thrust = true; }
      else if (d < pref - 26) {
        // 後退時會撞牆的話改成垂直閃避，否則整隊會被推到牆角疊成一直排
        const back = -Math.sign(dx);
        const intoWall = (back < 0 && e.x < 80) || (back > 0 && e.x > FIELD_W - 80);
        if (intoWall) e.vy += (e.y < (FIELD_TOP + FIELD_BOT) / 2 ? 1 : -1) * a * 0.9;
        else e.vx += back * a * 0.8;
        e.thrust = true;
      } else e.thrust = false;
      if (Math.abs(dy) > 8) { e.vy += Math.sign(dy) * a * 0.75; e.thrust = true; }
    }

    // 隊友互斥：不然同隊會完全重疊，看起來只剩一台
    for (const o of this.ents) {
      if (o === e || o.dead || o.side !== e.side) continue;
      const sx = e.x - o.x, sy = e.y - o.y;
      const sd = Math.hypot(sx, sy);
      if (sd < 26 && sd > 0.01) { e.vx += (sx / sd) * a * 0.55; e.vy += (sy / sd) * a * 0.55; }
    }

    // 開火（只在畫面內，給玩家喘息空間）
    const onScreen = t.x > this.cam - 20 && t.x < this.cam + GW + 20;
    if (!onScreen && e.side !== this.playerSide) return;
    if (ai.hesitate > 0) { ai.hesitate--; return; }
    // 命中率：技術越低越容易放槍（射速本身由武器冷卻決定，不再另外節流）
    if (Math.random() > 0.55 + S * 0.4) return;

    const aimY = Math.abs(dy) < 10 ? 0 : Math.sign(dy);
    const alignedH = Math.abs(dy) < 16 || aimY !== 0;
    if (d < 24) { this.tryFire(e, 1, 0); return; }
    if (!alignedH) return;
    const order = [0, 2, 3];
    for (const i of order) {
      const w = e.def.weapons[i];
      if (!w) continue;
      // 蓄力砲：電腦也要付出蓄力時間，不能無成本連發
      if (w.t === 'charge') {
        if (d > 70 && e.cd[i] <= 0) { this.fire(e, i, aimY, true); e.cd[i] += w.chg; }
        continue;
      }
      if (this.tryFire(e, i, aimY)) return;
    }
  },

  prefRange(e) {
    const w = e.def.weapons[0];
    if (!w) return 40;
    if (w.t === 'melee') return 22;
    return 70 + (e.def.spd > 1.8 ? 20 : 0);
  },

  tryFire(e, i, aimY) {
    const w = e.def.weapons[i];
    if (!w || e.cd[i] > 0) return false;
    if (w.ammo >= 0 && e.ammo[i] <= 0) return false;
    this.fire(e, i, aimY, false);
    return true;
  },

  fire(e, i, aimY, full) {
    const w = e.def.weapons[i];
    if (!w || e.cd[i] > 0) return;
    if (w.ammo >= 0 && e.ammo[i] <= 0) return;
    e.cd[i] = w.cd;
    if (w.ammo >= 0) e.ammo[i]--;
    const mx = e.x + e.face * 14, my = e.y - 1;
    const vy0 = aimY * 1.5;

    if (w.t === 'melee') {
      e.meleeT = 14; e.meleeHit = new Set(); Sfx.saber();
      return;
    }
    e.fireT = 8;
    const base = { side: e.side, dmg: w.dmg, owner: e, life: 90, r: 3 };
    if (w.t === 'rapid') {
      this.bullets.push({ ...base, x: mx, y: my + rnd(-2, 2), vx: e.face * w.bs, vy: vy0 * 0.6 + rnd(-.3, .3), type: 'small', life: 45 });
      w.n === 'VULCAN' ? Sfx.vulcan() : Sfx.mg();
    } else if (w.t === 'beam') {
      this.bullets.push({ ...base, x: mx, y: my, vx: e.face * w.bs, vy: vy0, type: 'beam', r: 4 });
      Sfx.beam();
    } else if (w.t === 'shell') {
      this.bullets.push({ ...base, x: mx, y: my, vx: e.face * w.bs, vy: vy0 * 0.8, type: 'shell', r: 5, rad: w.rad, life: 130 });
      Sfx.shell();
    } else if (w.t === 'missile') {
      let tgt = null, bd = 1e9;
      for (const o of this.ents) {
        if (o.dead || o.side === e.side) continue;
        const d = dist(e.x, e.y, o.x, o.y);
        if (d < bd) { bd = d; tgt = o; }
      }
      this.bullets.push({ ...base, x: mx, y: my, vx: e.face * w.bs, vy: vy0, type: 'missile', tgt, life: 150, r: 4 });
      Sfx.shell();
    } else if (w.t === 'spread') {
      for (let k = 0; k < w.count; k++) {
        const sp = (k - (w.count - 1) / 2) * 0.55;
        this.bullets.push({ ...base, x: mx, y: my, vx: e.face * w.bs, vy: vy0 + sp, type: 'small', life: 50 });
      }
      Sfx.mg();
    } else if (w.t === 'charge') {
      const p = full ? 1 : 0.45;
      // 大威力武器消耗自身 HP（原作 GX 的設計，讓它不能亂放）
      e.hp = Math.max(1, e.hp - (w.hpCost || 0) * HP_SCALE * (full ? 1 : 0));
      const n = full ? (w.count || 3) : 1;
      for (let k = 0; k < n; k++) {
        this.bullets.push({ ...base, x: mx, y: my, vx: e.face * w.bs, vy: vy0 + (k - (n - 1) / 2) * 0.7, type: 'big', dmg: Math.round(w.dmg * p), r: 7, life: 100 });
      }
      Sfx.beam(); Sfx.shell();
    } else if (w.t === 'funnel') {
      for (let k = 0; k < w.count; k++) {
        this.funnels.push({ owner: e, side: e.side, x: e.x, y: e.y, ang: k / w.count * 6.28, life: w.life, cd: 20 + k * 12, dmg: w.dmg, bs: w.bs });
      }
      Sfx.beam();
    }
  },

  meleeCheck(e) {
    const w = e.def.weapons[1];
    if (!w) return;
    const reach = w.reach || 17;
    for (const o of this.ents) {
      if (o.dead || o.side === e.side || e.meleeHit.has(o)) continue;
      const dx = (o.x - e.x) * e.face, dy = Math.abs(o.y - e.y);
      if (dx > -6 && dx < reach && dy < 15) {
        e.meleeHit.add(o);
        this.hurt(o, w.dmg, e);
        this.fx.push({ t: 'slash', x: o.x, y: o.y, life: 8 });
        this.shake = 5;
      }
    }
  },

  updateFunnels() {
    for (const f of this.funnels) {
      f.life--;
      f.ang += 0.045;
      if (f.owner.dead) { f.life = 0; continue; }
      const tx = f.owner.x + Math.cos(f.ang) * 34, ty = f.owner.y + Math.sin(f.ang) * 22;
      f.x = lerp(f.x, tx, 0.09); f.y = lerp(f.y, ty, 0.09);
      if (f.cd-- <= 0) {
        let tgt = null, bd = 1e9;
        for (const o of this.ents) {
          if (o.dead || o.side === f.side) continue;
          const d = dist(f.x, f.y, o.x, o.y);
          if (d < bd) { bd = d; tgt = o; }
        }
        if (tgt && bd < 190) {
          f.cd = 60;
          const a = Math.atan2(tgt.y - f.y, tgt.x - f.x);
          this.bullets.push({ side: f.side, dmg: f.dmg, owner: f.owner, x: f.x, y: f.y, vx: Math.cos(a) * f.bs, vy: Math.sin(a) * f.bs, type: 'beam', r: 3, life: 70 });
          Sfx.beam();
        } else f.cd = 20;
      }
    }
    this.funnels = this.funnels.filter(f => f.life > 0);
  },

  updateBullets() {
    for (const b of this.bullets) {
      if (b.type === 'missile' && b.tgt && !b.tgt.dead) {
        const a = Math.atan2(b.tgt.y - b.y, b.tgt.x - b.x);
        b.vx = lerp(b.vx, Math.cos(a) * 3.2, 0.07);
        b.vy = lerp(b.vy, Math.sin(a) * 3.2, 0.07);
        if (Core.frame % 3 === 0) this.fx.push({ t: 'smoke', x: b.x, y: b.y, life: 12 });
      }
      b.x += b.vx; b.y += b.vy;
      b.life--;
      if (b.x < 0 || b.x > FIELD_W || b.y < FIELD_TOP - 4 || b.y > FIELD_BOT + 4) b.life = 0;
      for (const o of this.ents) {
        if (o.dead || o.side === b.side) continue;
        if (dist(b.x, b.y, o.x, o.y) < 10 + b.r) {
          if (b.rad) this.splash(b, o); else this.hurt(o, b.dmg, b.owner);
          this.fx.push({ t: 'hit', x: b.x, y: b.y, life: 9, big: b.type === 'big' || !!b.rad });
          b.life = 0;
          break;
        }
      }
    }
    this.bullets = this.bullets.filter(b => b.life > 0);
  },

  splash(b, first) {
    for (const o of this.ents) {
      if (o.dead || o.side === b.side) continue;
      const d = dist(b.x, b.y, o.x, o.y);
      if (d < b.rad + 10) this.hurt(o, Math.round(b.dmg * (o === first ? 1 : 0.6)), b.owner);
    }
    this.shake = 7;
  },

  hurt(o, base, from) {
    const atkAdapt = from ? terrainAdapt(from.def, this.terrain) : 1;
    const veteran = from ? veteranRank(from.ref.xp).dmg : 1;
    const dmg = damage(base * veteran, atkAdapt, o.def.def);
    o.hp -= dmg;
    o.flash = 6;
    this.fx.push({ t: 'dmg', x: o.x, y: o.y - 16, life: 24, value: dmg, side: from ? from.side : null });
    if (from && from.isPlayer) { this.combo++; this.comboT = 90; }
    Sfx.hit();
    if (o.hp <= 0) {
      o.hp = 0; o.dead = true;
      if (from) from.kills++;
      this.fx.push({ t: 'boom', x: o.x, y: o.y, life: 34 });
      this.shake = 12;
      Sfx.boom();
    }
  },

  updateFx() {
    for (const f of this.fx) f.life--;
    this.fx = this.fx.filter(f => f.life > 0);
  },

  checkEnd() {
    const b = this.ents.some(e => e.side === 'blue' && !e.dead);
    const r = this.ents.some(e => e.side === 'red' && !e.dead);
    if (!b || !r) {
      this.result = !b && !r ? 'draw' : (b ? 'blue' : 'red');
      this.over = 100;
    } else if (this.timer <= 0) {
      this.result = 'time';
      this.over = 100;
    }
  },

  finish() {
    Sfx.stop();
    const out = this.ents.map(e => ({
      ref: e.ref, dead: e.dead, side: e.side,
      hp: e.dead ? 0 : Math.max(1, Math.round(e.hp / HP_SCALE)),    // 除回戰略層尺度
      kills: e.kills || 0
    }));
    if (this.onEnd) this.onEnd({ result: this.result, units: out });
  },

  /* ---------- 繪製 ---------- */
  draw(ctx) {
    const sh = this.shake > 0 ? irnd(-2, 2) : 0;
    ctx.save();
    ctx.translate(sh, this.shake > 0 ? irnd(-1, 1) : 0);
    this.drawBg(ctx);

    // 浮游砲
    for (const f of this.funnels) {
      const x = (f.x - this.cam) | 0, y = f.y | 0;
      ctx.fillStyle = '#f4d848'; ctx.fillRect(x - 2, y - 3, 4, 6);
      ctx.fillStyle = '#ff8060'; ctx.fillRect(x - 1, y - 1, 2, 2);
    }

    for (const e of this.ents) {
      if (e.dead) continue;
      this.drawEnt(ctx, e);
    }
    this.drawOffscreenPointers(ctx);
    this.drawBullets(ctx);
    this.drawFx(ctx);
    ctx.restore();

    this.drawHud(ctx);
    if (this.paused) this.drawPause(ctx);
    if (this.over > 0) this.drawOver(ctx);
  },

  drawEnt(ctx, e) {
    const set = UnitDB.spr(e.def.id);
    const pose = e.meleeT > 0 ? 'melee' : (e.fireT > 0 ? 'fire' : 'idle');
    const img = e.face > 0 ? set[pose].r : set[pose].l;
    const x = (e.x - this.cam - 16) | 0, y = (e.y - 16) | 0;

    // 推進火焰
    if (e.thrust && Core.frame % 6 < 4) {
      const fx = x + (e.face > 0 ? 4 : 22), fy = y + 20;
      ctx.fillStyle = '#ff9a30'; ctx.fillRect(fx, fy, 6, 3);
      ctx.fillStyle = '#ffe070'; ctx.fillRect(fx + (e.face > 0 ? 2 : 0), fy + 1, 4, 1);
    }
    ctx.drawImage(img, x, y);
    // 中彈：疊半透明白，比整台換成白色剪影好辨認
    if (e.flash > 0 && Core.frame % 4 < 2) {
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.drawImage(e.face > 0 ? set.flash.r : set.flash.l, x, y);
      ctx.restore();
    }

    // 蓄力光暈
    if (e.charge > 0) {
      const w = e.def.weapons[e.chargeIdx];
      const p = e.charge / (w.chg || 45);
      ctx.fillStyle = p >= 1 ? '#fff' : '#8ce4ff';
      const r = 2 + p * 4;
      ctx.fillRect(x + 16 + e.face * 15 - r / 2, y + 18 - r / 2, r, r);
    }

    // 頭頂 HP 條
    const bw = 20, hp = clamp(e.hp / e.maxhp, 0, 1);
    ctx.fillStyle = '#000'; ctx.fillRect(x + 6, y - 4, bw, 3);
    ctx.fillStyle = e.side === 'blue' ? '#5aa8ff' : '#ff6a5a';
    ctx.fillRect(x + 6, y - 4, Math.round(bw * hp), 3);
    if (e.isPlayer) {
      ctx.fillStyle = '#f5d020';
      ctx.fillRect(x + 14, y - 9, 4, 2); ctx.fillRect(x + 15, y - 7, 2, 2);
    }
    const rank = veteranRank(e.ref.xp);
    if (rank.id > 0) {
      ctx.fillStyle = rank.id >= 3 ? '#ffe060' : '#d8e8ff';
      for (let i = 0; i < rank.id; i++) ctx.fillRect(x + 6 + i * 4, y - 8, 3, 1);
    }
  },

  drawOffscreenPointers(ctx) {
    for (const e of this.ents) {
      if (e.dead || e.side === this.playerSide) continue;
      const sx = e.x - this.cam;
      if (sx >= 4 && sx <= GW - 4) continue;
      const x = sx < 0 ? 3 : GW - 5;
      const y = clamp(e.y | 0, FIELD_TOP + 4, FIELD_BOT - 4);
      ctx.fillStyle = '#ff6a5a';
      ctx.fillRect(x, y - 2, 2, 5);
      ctx.fillRect(x + (sx < 0 ? 2 : -2), y - 1, 2, 3);
    }
  },

  drawBullets(ctx) {
    for (const b of this.bullets) {
      const x = (b.x - this.cam) | 0, y = b.y | 0;
      if (x < -12 || x > GW + 12) continue;
      if (b.type === 'beam') {
        ctx.fillStyle = b.side === 'blue' ? '#9ef0ff' : '#ffd050';
        ctx.fillRect(x - 6, y - 1, 12, 2);
        ctx.fillStyle = '#fff'; ctx.fillRect(x - 2, y - 1, 5, 2);
      } else if (b.type === 'small') {
        ctx.fillStyle = b.side === 'blue' ? '#ffe27a' : '#ff9a4a';
        ctx.fillRect(x - 1, y - 1, 3, 2);
      } else if (b.type === 'shell') {
        ctx.fillStyle = '#e8e0d0'; ctx.fillRect(x - 3, y - 2, 6, 4);
        ctx.fillStyle = '#ff7a30'; ctx.fillRect(x - (b.vx > 0 ? 5 : -3), y - 1, 3, 2);
      } else if (b.type === 'missile') {
        ctx.fillStyle = '#dcdce8'; ctx.fillRect(x - 3, y - 1, 6, 3);
        ctx.fillStyle = '#ff9020'; ctx.fillRect(x - (b.vx > 0 ? 5 : -3), y, 3, 1);
      } else if (b.type === 'big') {
        // 大型光束彈：橫向梭形，逐列收窄才不會變成一個方塊
        const W = 11, H = 5;
        for (let i = -W; i <= W; i++) {
          const t = 1 - Math.abs(i) / W;
          const hh = Math.max(1, Math.round(H * t));
          ctx.fillStyle = t > 0.7 ? '#ffffff' : t > 0.35 ? '#9ef0ff' : 'rgba(120,200,255,.6)';
          ctx.fillRect(x + i, y - hh, 1, hh * 2);
        }
      }
    }
  },

  drawFx(ctx) {
    for (const f of this.fx) {
      const x = (f.x - this.cam) | 0, y = f.y | 0;
      if (f.t === 'hit') {
        const r = (f.big ? 10 : 5) * (1 - f.life / 9) + 2;
        ctx.fillStyle = f.life > 5 ? '#fff' : '#ffd070';
        ctx.fillRect(x - r, y - 1, r * 2, 2);
        ctx.fillRect(x - 1, y - r, 2, r * 2);
      } else if (f.t === 'slash') {
        ctx.fillStyle = f.life > 4 ? '#fff' : '#9ef0ff';
        for (let i = 0; i < 7; i++) ctx.fillRect(x - 8 + i * 2, y - 8 + i * 2, 3, 2);
      } else if (f.t === 'smoke') {
        ctx.fillStyle = `rgba(180,180,200,${f.life / 20})`;
        ctx.fillRect(x - 1, y - 1, 2, 2);
      } else if (f.t === 'boom') {
        const p = 1 - f.life / 34;
        if (p < 0.55) {
          const r = 4 + p * 40;
          for (let i = 0; i < 12; i++) {
            const a = i / 12 * 6.283 + p * 2;
            const rr = r * (0.55 + (i % 3) * 0.22);
            ctx.fillStyle = i % 2 ? '#ff8020' : '#ffd050';
            ctx.fillRect((x + Math.cos(a) * rr) | 0, (y + Math.sin(a) * rr) | 0, 3, 3);
          }
          ctx.fillStyle = '#fff';
          ctx.fillRect(x - (12 - p * 18), y - 2, 24 - p * 36, 4);
        } else {
          const q = (p - 0.55) / 0.45, L = 30 * (1 - q);
          ctx.fillStyle = `rgba(255,255,255,${1 - q})`;
          ctx.fillRect(x - L, y - 1, L * 2, 3);
          ctx.fillRect(x - 1, y - L, 3, L * 2);
        }
      } else if (f.t === 'dmg') {
        const yy = y - ((24 - f.life) >> 2);
        const s = String(f.value);
        ptext(ctx, x - ptextW(s, 1) / 2, yy, s, f.side === 'blue' ? '#9ef0ff' : '#ffd070', 1, '#000');
      }
    }
  },

  drawHud(ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, GW, HUD_H);
    ctx.fillStyle = '#2a3050';
    ctx.fillRect(0, HUD_H - 1, GW, 1);

    const p = this.player && !this.player.dead ? this.player
      : this.ents.find(e => e.side === this.playerSide && !e.dead);
    // 左：我方機體
    if (p) {
      ptext(ctx, 4, 3, p.def.code, '#8cc8ff', 1, '#001028');
      const rank = veteranRank(p.ref.xp);
      if (rank.id > 0) ptext(ctx, 47, 3, rank.code, rank.id >= 3 ? '#ffe060' : '#b8c8e8', 1);
      const hp = clamp(p.hp / p.maxhp, 0, 1);
      ctx.fillStyle = '#16203c'; ctx.fillRect(4, 12, 78, 6);
      ctx.fillStyle = hp > 0.35 ? '#5ad0ff' : '#ff5a4a';
      ctx.fillRect(4, 12, Math.round(78 * hp), 6);
      ctx.fillStyle = '#0a1428'; ctx.fillRect(4, 12, 78, 1);
      // 彈數方塊
      let bx = 4;
      for (let i = 0; i < 4; i++) {
        const w = p.def.weapons[i];
        if (!w) continue;
        const inf = w.ammo < 0;
        const rate = inf ? 1 : clamp(p.ammo[i] / w.ammo, 0, 1);
        ctx.fillStyle = '#1c2440'; ctx.fillRect(bx, 21, 16, 5);
        ctx.fillStyle = inf ? '#4c6a9c' : (rate > 0.25 ? '#7ce0b0' : '#ff7a4a');
        ctx.fillRect(bx, 21, Math.round(16 * rate), 5);
        bx += 18;
      }
    }
    // 中：倒數
    const sec = Math.max(0, Math.ceil(this.timer / 60));
    ptext(ctx, 108, 3, 'TIME', '#6ce07a', 1, '#002810');
    const s = String(sec);
    const w2 = ptextW(s, 2);
    ptext(ctx, 118 - w2 / 2 + 5, 11, s, sec <= 10 ? '#ff5a4a' : '#ffa030', 2, '#3a1000');

    // 右：敵機
    const foes = this.ents.filter(e => e.side !== this.playerSide);
    ptext(ctx, 252 - ptextW('RED', 1), 3, 'RED', '#ff8a7a', 1, '#280000');
    foes.forEach((e, i) => {
      const x = 160 + i * 15, y = 13;
      const set = UnitDB.spr(e.def.id);
      ctx.save();
      ctx.globalAlpha = e.dead ? 0.28 : 1;
      ctx.drawImage(set.mini.l, 2, 1, 12, 14, x, y, 12, 14);
      ctx.restore();
      if (e.dead) {
        ctx.fillStyle = '#ff3020';
        for (let k = 0; k < 7; k++) { ctx.fillRect(x + 2 + k, y + 3 + k, 2, 2); ctx.fillRect(x + 8 - k, y + 3 + k, 2, 2); }
      } else {
        const hp = clamp(e.hp / e.maxhp, 0, 1);
        ctx.fillStyle = '#301018'; ctx.fillRect(x, y + 15, 12, 2);
        ctx.fillStyle = '#ff6a5a'; ctx.fillRect(x, y + 15, Math.round(12 * hp), 2);
      }
    });
    if (this.combo >= 2 && this.comboT > 0) {
      ptext(ctx, 86, 21, `${this.combo}HIT`, this.combo >= 10 ? '#ffe060' : '#9ef0ff', 1, '#001020');
    }
  },

  drawPause(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(0, HUD_H, GW, GH - HUD_H);
    const t = 'PAUSE';
    ptext(ctx, GW / 2 - ptextW(t, 2) / 2, 100, t, '#f5d020', 2, '#000');
    Core.text(GW / 2, 124, '按 Enter 繼續', { size: 9, align: 'center', color: '#c8d4f0' });
  },

  drawOver(ctx) {
    let t = '', col = '#fff';
    if (this.result === 'time') { t = 'TIME UP'; col = '#ffd040'; }
    else if (this.result === 'draw') { t = 'DRAW'; col = '#c0c0d0'; }
    else if (this.result === this.playerSide) { t = 'CLEAR'; col = '#6ce07a'; }
    else { t = 'LOST'; col = '#ff5a4a'; }
    const a = clamp((100 - this.over) / 20, 0, 1);
    ctx.fillStyle = `rgba(0,0,0,${a * 0.55})`;
    ctx.fillRect(0, HUD_H, GW, GH - HUD_H);
    ptext(ctx, GW / 2 - ptextW(t, 3) / 2, 96, t, col, 3, '#000');
  }
};
