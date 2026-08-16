/* artpack.js — 正式 ImageGen 像素 atlas 載入器。
   同一份 PNG + manifest 也是 Unity 匯入器的輸入；載入失敗才交回舊程序圖。 */
'use strict';

function artFrameIndex(row, tick, progress) {
  const frames = Math.max(1, row && row.frames | 0);
  if (Number.isFinite(progress)) {
    if (progress >= 1) return frames - 1;
    return Math.min(frames - 1, Math.floor(Math.max(0, progress) * frames));
  }
  const fps = Math.max(1, Number(row && row.fps) || 1);
  const raw = Math.floor(Math.max(0, Number(tick) || 0) * fps / 60);
  return row && row.loop === false ? Math.min(frames - 1, raw) : raw % frames;
}

const ArtPack = (() => {
  const packs = {};
  const scenery = {};
  const failures = [];

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`無法載入 atlas：${url}`));
      img.src = url;
    });
  }

  function cut(img, rect, flip, white, size) {
    const s = size || 32;
    const cv = document.createElement('canvas');
    cv.width = s; cv.height = s;
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    if (flip) { c.translate(s, 0); c.scale(-1, 1); }
    c.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, s, s);
    if (white) {
      c.globalCompositeOperation = 'source-in';
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, s, s);
    }
    return cv;
  }

  async function loadUnit(entry, root) {
    const base = entry.path ? `${root}/${entry.path}` : root;
    const manifestUrl = entry.manifest ? `${root}/${entry.manifest}` : `${base}/manifest.json`;
    const manifest = await fetch(manifestUrl, { cache: 'no-cache' }).then(r => {
      if (!r.ok) throw new Error(`manifest HTTP ${r.status}`);
      return r.json();
    });
    if (manifest.characterId !== (entry.variantOf || entry.id)) throw new Error(`${entry.id} manifest 身分不符`);
    if (manifest.animation.cellWidth !== 32 || manifest.animation.cellHeight !== 32) {
      throw new Error(`${entry.id} 必須是 32x32 cell`);
    }
    const sheetUrl = entry.sheet ? `${root}/${entry.sheet}` : `${base}/${manifest.sprite_sheet_alpha}`;
    const img = await loadImage(sheetUrl);
    const states = {};
    for (const [fullName, row] of Object.entries(manifest.animation.rows)) {
      const state = fullName.replace(/^side_/, '');
      const rects = manifest.frame_layout.rows[fullName];
      states[state] = {
        spec: row,
        frames: rects.map(rect => ({
          r: cut(img, rect, false, false, 32),
          l: cut(img, rect, true, false, 32),
          flashR: cut(img, rect, false, true, 32),
          flashL: cut(img, rect, true, true, 32),
          miniR: cut(img, rect, false, false, 16),
          miniL: cut(img, rect, true, false, 16)
        }))
      };
    }
    packs[entry.id] = { manifest, states, source: sheetUrl, variantOf: entry.variantOf || null };
  }

  async function loadScenery(entry, root) {
    scenery[entry.id] = await loadImage(`${root}/${entry.src}`);
  }

  async function init(indexUrl) {
    const url = indexUrl || 'assets/artpack/runtime/artpack.json';
    try {
      const index = await fetch(url, { cache: 'no-cache' }).then(r => {
        if (!r.ok) throw new Error(`artpack HTTP ${r.status}`);
        return r.json();
      });
      const root = url.slice(0, url.lastIndexOf('/'));
      const unitJobs = index.units.map(u => ({ label: u.id, job: loadUnit(u, root) }));
      const sceneryJobs = (index.scenery || []).map(s => ({ label: `scenery:${s.id}`, job: loadScenery(s, root) }));
      const jobs = unitJobs.concat(sceneryJobs);
      const results = await Promise.allSettled(jobs.map(x => x.job));
      results.forEach((r, i) => {
        if (r.status === 'rejected') failures.push(`${jobs[i].label}: ${r.reason.message}`);
      });
    } catch (err) {
      failures.push(err.message);
    }
    if (failures.length) console.warn('[ArtPack] 正式素材部分載入失敗，使用程序圖備援', failures);
    return { loaded: Object.keys(packs), failures: failures.slice() };
  }

  function pickFrame(id, state, tick, progress) {
    const pack = packs[id];
    if (!pack) return null;
    const anim = pack.states[state] || pack.states.idle;
    if (!anim) return null;
    return anim.frames[artFrameIndex(anim.spec, tick, progress)] || anim.frames[0];
  }

  function frame(id, state, face, tick, progress, flash) {
    const f = pickFrame(id, state, tick, progress);
    if (!f) return null;
    if (flash) return face < 0 ? f.flashL : f.flashR;
    return face < 0 ? f.l : f.r;
  }

  function mini(id, state, face, tick, progress) {
    const f = pickFrame(id, state, tick, progress);
    if (!f) return null;
    return face < 0 ? f.miniL : f.miniR;
  }

  function drawBackground(ctx, tick, speed) {
    const img = scenery['space-v1'];
    if (!img) return false;
    const period = img.width * 2;
    const offset = Math.floor(Math.max(0, tick || 0) * (speed || 0.04)) % period;
    const first = Math.floor(offset / img.width) - 1;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let n = 0; n < 4; n++) {
      const tile = first + n;
      const x = tile * img.width - offset;
      if (tile & 1) {
        ctx.save(); ctx.translate(x + img.width, 0); ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0); ctx.restore();
      } else ctx.drawImage(img, x, 0);
    }
    ctx.restore();
    return true;
  }

  return { init, frame, mini, drawBackground, frameIndex: artFrameIndex, packs, scenery, failures };
})();

if (typeof module !== 'undefined') module.exports = { artFrameIndex };
