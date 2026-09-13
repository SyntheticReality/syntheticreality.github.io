const clamp = (v, low, high) => Math.max(low, Math.min(high, v));
const GLYPHS = '.:-=+*#%@';
const smoothstep = (a, b, v) => { const t = clamp((v-a)/(b-a), 0, 1); return t*t*(3-2*t); };
const noise = (x, y) => { let n = Math.imul(x+1, 374761393) ^ Math.imul(y+1, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
export const PORTRAIT_VARIANTS = {
  soft: { start: .68, end: 1, power: 1.1 },
  airy: { start: .62, end: .98, power: 1.55 },
  shoulders: { start: .68, end: 1, power: 1.3, shoulderFade: .10 },
  floating: { start: .64, end: .94, power: 1.8 }
};

export function portraitPresence(cell, columns, rows, variant = 'soft') {
  const config = PORTRAIT_VARIANTS[variant] || PORTRAIT_VARIANTS.soft;
  const x = (cell.x+.5)/columns, y = (cell.y+.5)/rows;
  const start = Math.max(.60, config.start - (config.shoulderFade || 0) * Math.abs(2*x-1));
  const fade = 1-smoothstep(start, config.end, y);
  const side = 1-(1-smoothstep(0,.09,Math.min(x,1-x)))*smoothstep(.62,.80,y);
  const density = fade**config.power * side * (1-smoothstep(.96,1,y));
  return noise(cell.x, cell.y) < density ? Math.sqrt(fade)*side : 0;
}

// Build the visor and straps on the same grid as the original photograph.
export function buildHeadset(columns, rows) {
  const cells = [], mask = new Set();
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    const nx = (x+.5)/columns, ny = (y+.5)/rows;
    const dx = Math.abs(nx-.507)-.224, dy = Math.abs(ny-.347)-.057;
    const distance = Math.hypot(Math.max(dx,0),Math.max(dy,0))+Math.min(Math.max(dx,dy),0)-.027;
    const nose = ny>.405 && Math.abs(nx-.507)<.024+(ny-.405)*.5;
    const visor = distance<0 && !nose;
    const sideStrap = ny>.318 && ny<.355 && nx>.237 && nx<.771;
    const topStrap = ny>.11 && ny<.28 && Math.abs(nx-(.499+(ny-.11)*.035))<.017;
    if (!visor && !sideStrap && !topStrap) continue;
    let tone=.34, glyph='=';
    if (visor) {
      const edge=distance>-.012;
      const sensor=[.348,.507,.666].some(center=>((nx-center)/.012)**2+((ny-.345)/.023)**2<1);
      tone=sensor?.06:edge?.92:.52+(.40-ny)*.65;
      glyph=sensor?':':edge?'#':(x+y)%3===0?'+':'=';
    } else if(topStrap) { tone=.36; glyph=':'; }
    cells.push({x,y,tone,glyph}); mask.add(y*columns+x);
  }
  return {cells,mask};
}

// Sample the supplied photograph. Flood-fill only the connected pastel backdrop.
export function samplePortrait({ data, width, height }) {
  const count = width * height, background = new Uint8Array(count), candidates = new Uint8Array(count);
  const references = [0, width - 1, Math.floor(height * .3) * width, Math.floor(height * .3) * width + width - 1]
    .map(i => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]);
  for (let i = 0; i < count; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    candidates[i] = (r + g + b) / 3 > 185 && references.some(c => (r-c[0])**2 + (g-c[1])**2 + (b-c[2])**2 < 70**2) ? 1 : 0;
  }
  const queue = [];
  const add = i => { if (candidates[i] && !background[i]) { background[i] = 1; queue.push(i); } };
  for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q], x = i % width, y = Math.floor(i / width);
    if (x) add(i - 1); if (x < width - 1) add(i + 1);
    if (y) add(i - width); if (y < height - 1) add(i + width);
  }
  const luminance = i => (.2126 * data[i*4] + .7152 * data[i*4+1] + .0722 * data[i*4+2]) / 255;
  const cells = [];
  for (let i = 0; i < count; i++) {
    if (background[i] || data[i * 4 + 3] < 20) continue;
    const x = i % width, y = Math.floor(i / width), light = luminance(i);
    const edge = Math.abs(light - luminance(Math.min(count - 1, i + 1))) + Math.abs(light - luminance(Math.min(count - 1, i + width)));
    const tone = clamp((light - .04) / .78, 0, 1);
    const cell = { x, y, tone, edge, glyph: GLYPHS[Math.min(GLYPHS.length - 1, Math.floor(tone * GLYPHS.length))] };
    cell.presence = Object.fromEntries(Object.keys(PORTRAIT_VARIANTS).map(key => [key, portraitPresence(cell, width, height, key)]));
    cells.push(cell);
  }
  return { cells, columns: width, rows: height, headset: buildHeadset(width,height) };
}

export function drawPortrait(ctx, portrait, width, height, time = 0, pointer = null, variant = 'soft', headsetOn = false) {
  ctx.clearRect(0, 0, width, height);
  const cw = width / portrait.columns, ch = height / portrait.rows;
  ctx.font = `${cw * 1.32}px OsyrysMono, monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const scan = (time * .055) % 1;
  for (const cell of portrait.cells) {
    if (headsetOn && portrait.headset?.mask.has(cell.y*portrait.columns+cell.x)) continue;
    const presence = cell.presence?.[variant] ?? portraitPresence(cell, portrait.columns, portrait.rows, variant);
    if (!presence) continue;
    const x = (cell.x + .5) * cw, y = (cell.y + .5) * ch;
    const band = time ? Math.max(0, 1 - Math.abs(y / height - scan) / .035) * .12 : 0;
    const hover = pointer ? Math.max(0, 1 - Math.hypot(x-pointer.x, y-pointer.y) / 75) * .2 : 0;
    const alpha = clamp(.16 + cell.tone * .75 + cell.edge * .13 + band + hover, .15, 1) * presence;
    ctx.fillStyle = `rgba(${Math.round(168 + cell.tone * 54)},${Math.round(115 + cell.tone * 69)},255,${alpha})`;
    ctx.fillText(cell.glyph, x, y);
  }
  if (headsetOn && portrait.headset) for (const cell of portrait.headset.cells) {
    const x=(cell.x+.5)*cw, y=(cell.y+.5)*ch;
    const highlight=pointer?Math.max(0,1-Math.hypot(x-pointer.x,y-pointer.y)/75)*.14:0;
    ctx.fillStyle=`rgba(${Math.round(168+cell.tone*54)},${Math.round(115+cell.tone*69)},255,${clamp(.22+cell.tone*.76+highlight,0,1)})`;
    ctx.fillText(cell.glyph,x,y);
  }
}

export function startPortraitArt(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { destroy() {}, setVariant() {} };
  let variant = canvas.dataset.portraitVariant || 'soft';
  const toggle=canvas.closest?.('.portrait-toggle');
  let headsetOn=false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const source = new Image(), sample = document.createElement('canvas');
  const sampleContext = sample.getContext('2d', { willReadFrequently: true });
  let portrait = null, width = 1, height = 1, visible = true, frame = 0, previous = 0, time = 0, pointer = null, destroyed = false;
  const removers = [];
  const listen = (target, event, fn) => { target.addEventListener(event, fn, { passive: true }); removers.push(() => target.removeEventListener(event, fn)); };
  const render = () => { if (portrait) drawPortrait(ctx, portrait, width, height, reduced.matches ? 0 : time, pointer, variant, headsetOn); };
  function tick(timestamp) {
    frame = 0;
    if (destroyed || reduced.matches || document.hidden || !visible || !portrait) return;
    if (!previous || timestamp - previous >= 1000 / 20) {
      time += previous ? Math.min(.1, (timestamp - previous) / 1000) : 0;
      previous = timestamp; render();
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; previous = 0;
    render();
    if (!destroyed && portrait && visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(tick);
  }
  function resize() {
    if (destroyed || !source.naturalWidth || !sampleContext) return;
    const bounds = canvas.parentElement.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = Math.max(1, bounds.width); height = Math.max(1, bounds.height);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sample.width = clamp(Math.round(width / 5.2), 52, 96);
    sample.height = Math.round(height / (width / sample.width * 1.38));
    const target = width / height, sourceRatio = source.naturalWidth / source.naturalHeight;
    const sw = sourceRatio > target ? source.naturalHeight * target : source.naturalWidth;
    const sh = sourceRatio > target ? source.naturalHeight : source.naturalWidth / target;
    sampleContext.drawImage(source, (source.naturalWidth - sw) / 2, (source.naturalHeight - sh) / 2, sw, sh, 0, 0, sample.width, sample.height);
    portrait = samplePortrait(sampleContext.getImageData(0, 0, sample.width, sample.height));
    canvas.parentElement.dataset.portraitState = 'ready'; sync();
  }
  const resizeObserver = new ResizeObserver(resize);
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); });
  resizeObserver.observe(canvas.parentElement); observer.observe(canvas);
  listen(source, 'load', resize);
  listen(canvas, 'pointermove', event => {
    const rect = canvas.getBoundingClientRect(); pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    if (reduced.matches) render();
  });
  listen(canvas, 'pointerleave', () => { pointer = null; render(); });
  if (toggle) listen(toggle,'click',()=>{
    headsetOn=!headsetOn;
    toggle.setAttribute('aria-pressed',String(headsetOn));
    toggle.setAttribute('aria-label',headsetOn?'Remove VR headset from Alexis’s portrait':'Add VR headset to Alexis’s portrait');
    canvas.setAttribute('aria-label',`Alexis Salinas Mark${headsetOn?' wearing a VR headset':''}, rendered as purple text dissolving from the shoulders`);
    render();
  });
  listen(document, 'visibilitychange', sync); listen(reduced, 'change', sync);
  source.decoding = 'async'; source.src = canvas.dataset.portraitSource;
  return {
    setVariant(next) { if (destroyed) return; variant = PORTRAIT_VARIANTS[next] ? next : 'soft'; canvas.dataset.portraitVariant = variant; resize(); },
    destroy() { destroyed = true; cancelAnimationFrame(frame); resizeObserver.disconnect(); observer.disconnect(); removers.forEach(fn => fn()); }
  };
}
