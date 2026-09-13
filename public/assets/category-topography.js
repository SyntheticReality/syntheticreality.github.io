/** Full-bleed purple pixel scenes for category headers. No DOM text or external assets. */
let activeCleanup = null;
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));

export function startCategoryTopography(canvas, kind = 'enterprise') {
  if (activeCleanup) activeCleanup();
  const ctx = canvas?.getContext('2d', { alpha: false });
  if (!ctx) return () => {};
  const about = kind === 'about';
  const enterprise = kind !== 'entertainment' && !about;
  const surface = canvas.parentElement || canvas;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = [];
  let width = 1, height = 1, dpr = 1, step = 6, scale = 1, cx = 0, cy = 0;
  let cols = 0, rows = 0, samples = [], values = new Float32Array(0), rainColumns = [];
  let frame = 0, last = null, time = 0, visible = true, dead = false;
  const pointer = { x: 0, y: 0, strength: 0 };
  const target = { x: 0, y: 0, strength: 0 };
  let resizeObserver, intersectionObserver;
  function listen(element, event, callback) {
    element.addEventListener(event, callback, { passive: true });
    listeners.push(() => element.removeEventListener(event, callback));
  }
  function project(u, v, z = 0) {
    return { x: cx + (u - v) * scale * .86, y: cy + (u + v) * scale * .36 - z * scale * .55 };
  }
  function square(x, y, size, alpha, hot = false) {
    if (alpha < .012 || !Number.isFinite(x + y + size)) return;
    if (x < -size - 8 || x > width + size + 8 || y < -size - 8 || y > height + size + 8) return;
    const focus = pointer.strength * Math.exp(-((x - pointer.x) ** 2 + (y - pointer.y) ** 2) / (scale * scale * 1.25));
    // Each sample stays a square; the pointer only displaces it by a few pixels.
    x += (x - pointer.x) / Math.max(scale, 1) * focus * 1.8;
    y += (y - pointer.y) / Math.max(scale, 1) * focus * 1.8;
    const pixel = Math.max(1, Math.round(size * dpr));
    ctx.globalAlpha = clamp(alpha + focus * alpha * .15);
    ctx.fillStyle = hot ? '#e9d7ff' : '#b477ff';
    ctx.fillRect(Math.round((x - size / 2) * dpr) / dpr, Math.round((y - size / 2) * dpr) / dpr, pixel / dpr, pixel / dpr);
  }
  function pixelLine(a, b, alpha = .55, hot = false, dash = 0) {
    const spacing = Math.max(2.5, step * .58);
    const count = Math.ceil(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) / spacing);
    for (let i = 0; i <= count; i++) {
      if (dash && i % dash === dash - 1) continue;
      const t = count ? i / count : 0;
      const x = Math.round((a.x + (b.x - a.x) * t) / spacing) * spacing;
      const y = Math.round((a.y + (b.y - a.y) * t) / spacing) * spacing;
      square(x, y, spacing * .7, alpha, hot);
    }
  }
  function field(u, v) {
    if (enterprise) {
      // Repeat engineered terraces beyond the viewport so every edge contains art.
      const localU = ((u + 2.9) % 5.8 + 5.8) % 5.8 - 2.9;
      const localV = ((v + .42) % .84 + .84) % .84 - .42;
      const distance = Math.max(Math.abs(localU) / 2.9, Math.abs(localV) / .42);
      const h = .18 + (1 - distance) * 1.55 + Math.sin(u * .8 + v * .35) * .07;
      return { h, fade: 1 };
    }
    const ridge = Math.sin(u * 1.6 + .3) * .31 + Math.cos(v * 1.9 - .5) * .29 + Math.sin(u * .85 + v * 1.5) * .2;
    const hill = Math.exp(-((u - .7) ** 2 / 5.2 + (v + .25) ** 2 / 2.7)) * 1.35;
    const basin = Math.exp(-((u + 1.3) ** 2 + (v - .8) ** 2) * .6) * .6;
    return { h: ridge + hill - basin, fade: 1 };
  }
  function rebuild() {
    samples = [];
    rainColumns = [];
    if (about) {
      const spacing = width < 700 ? 15 : 19;
      for (let column = -1; column <= Math.ceil(width / spacing); column++) {
        const seed = column + 2;
        rainColumns.push({ x: column * spacing + 5, seed, phase: (seed * .61803398875) % 1,
          speed: 13 + seed * 17 % 19, length: 8 + seed * 11 % 15 });
      }
      values = new Float32Array(0);
      return;
    }
    cols = Math.ceil(width / step) + 1;
    rows = Math.ceil(height / step) + 1;
    values = new Float32Array(cols * rows);
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const x = col * step, y = row * step;
      const a = (x - cx) / (scale * .86), b = (y - cy) / (scale * .36);
      const u = (a + b) / 2, v = (b - a) / 2;
      const result = field(u, v);
      values[row * cols + col] = result.h;
      if (result.fade > .01 && col < cols - 1 && row < rows - 1) samples.push({ x, y, u, v, index: row * cols + col, fade: result.fade });
    }
  }
  function landscape() {
    const drift = reduced.matches ? 0 : Math.sin(time * .19) * .052;
    const scan = ((time * .105 + .34) % 1.4) * 7.4 - 3.7;
    for (const p of samples) {
      const value = values[p.index] + drift;
      const terrace = Math.floor(value * (enterprise ? 15 : 9));
      const right = Math.floor((values[p.index + 1] + drift) * (enterprise ? 15 : 9));
      const below = Math.floor((values[p.index + cols] + drift) * (enterprise ? 15 : 9));
      const boundary = terrace !== right || terrace !== below;
      const scanLight = Math.exp(-(((p.u - scan) / .28) ** 2));
      if (boundary) {
        const major = Math.abs(terrace) % 4 === 0;
        square(p.x, p.y, step * (major ? .46 : .31), p.fade * (.31 + (major ? .28 : .08) + scanLight * .28), scanLight > .72 || (major && value > 1));
      } else if (enterprise && terrace > 7 && (Math.round(p.x / step) + Math.round(p.y / step)) % 5 === 0) {
        square(p.x, p.y, step * .23, p.fade * (.1 + scanLight * .2));
      } else if (!enterprise && p.index % 17 === 0) {
        square(p.x, p.y, step * .22, p.fade * .12);
      }
    }
  }
  function factory() {
    // Rails and repeated crossmembers make the nested contours read as engineered bays.
    const extent = Math.ceil(width / (scale * 1.72) + height / (scale * .72)) + 2;
    for (let block = -Math.ceil(extent / 5.8); block <= Math.ceil(extent / 5.8); block++) {
      const origin = block * 5.8;
      for (const end of [-2.83, 2.83]) pixelLine(project(origin + end, -extent), project(origin + end, extent), .28, false, 6);
      for (let bay = -Math.ceil(extent / .84); bay <= Math.ceil(extent / .84); bay++) {
        const v = bay * .84;
        for (const end of [-2.45, 2.45]) {
          pixelLine(project(origin + end, v - .18), project(origin + end, v + .18), .62);
        }
        const packet = (((time * .09 + bay * .135) % 1 + 1) % 1) * 4.45 - 2.22;
        const marker = project(origin + (reduced.matches ? .8 - (Math.abs(bay) % 6) * .31 : packet), v);
        square(marker.x, marker.y, step * .65, .76, true);
        square(marker.x, marker.y, step * 2.2, .04, true);
      }
    }
  }
  const platforms = [
    { u: -.9, v: 1.7, z: -.6, radius: .43 },
    { u: .15, v: .8, z: .15, radius: .39 },
    { u: 1.2, v: .05, z: .9, radius: .4 },
    { u: 2.2, v: -.95, z: 1.65, radius: .53 }
  ];
  function platform(p) {
    const { u, v, z, radius: r } = p;
    const corners = [project(u - r, v - r, z), project(u + r, v - r, z), project(u + r, v + r, z), project(u - r, v + r, z)];
    const depth = Math.max(7, scale * .11);
    for (let edge = 0; edge < 4; edge++) pixelLine(corners[edge], corners[(edge + 1) % 4], edge < 2 ? .83 : .62);
    for (let edge = 1; edge < 4; edge++) {
      pixelLine(corners[edge], { x: corners[edge].x, y: corners[edge].y + depth }, .34);
      if (edge < 3) pixelLine({ x: corners[edge].x, y: corners[edge].y + depth }, { x: corners[edge + 1].x, y: corners[edge + 1].y + depth }, .3);
    }
    for (let a = -.7; a <= .7; a += .35) for (let b = -.7; b <= .7; b += .35) {
      const point = project(u + a * r, v + b * r, z);
      square(point.x, point.y, step * .31, .25);
    }
  }
  function game() {
    // An ascending path links four small islands. Its bends follow the terrain axes.
    for (let i = 0; i < platforms.length - 1; i++) {
      const a = platforms[i], b = platforms[i + 1];
      const start = project(a.u, a.v, a.z), end = project(b.u, b.v, b.z);
      const elbow = { x: start.x + (end.x - start.x) * .48, y: start.y };
      const elbow2 = { x: elbow.x, y: end.y };
      pixelLine(start, elbow, .42, false, 3);
      pixelLine(elbow, elbow2, .42, false, 3);
      pixelLine(elbow2, end, .42, false, 3);
    }
    for (const p of platforms) platform(p);
    const player = project(platforms[1].u, platforms[1].v, platforms[1].z);
    const px = Math.max(2, Math.min(3.6, scale * .025));
    const sprite = ['0110', '1111', '0110', '1110', '0110', '1010'];
    for (let row = 0; row < sprite.length; row++) for (let col = 0; col < 4; col++) if (sprite[row][col] === '1') {
      square(player.x + (col - 1.5) * px, player.y - (6 - row) * px - 2, px * .92, .94, true);
    }
    const gate = project(platforms[3].u, platforms[3].v, platforms[3].z);
    const gatePixel = Math.max(2.4, Math.min(4.7, scale * .036));
    const pulse = reduced.matches ? .7 : .7 + Math.sin(time * .9) * .12;
    for (let row = 0; row < 18; row++) for (let col = 0; col < 13; col++) {
      const side = row < 2 ? 3 - row : row > 15 ? row - 14 : 1;
      const outer = (col === side || col === 12 - side) || ((row === 0 || row === 17) && col > side && col < 12 - side);
      const inner = row > 3 && row < 15 && (col === 3 || col === 9);
      if (outer || inner) square(gate.x + (col - 6) * gatePixel, gate.y - (18 - row) * gatePixel, gatePixel * .81, outer ? .92 : pulse * .28, outer && (row < 3 || row > 15));
      else if (row > 3 && row < 15 && col > 3 && col < 9 && (row + col) % 4 === 0) {
        square(gate.x + (col - 6) * gatePixel, gate.y - (18 - row) * gatePixel, gatePixel * .45, pulse * .28);
      }
    }
    // One slow pulse on the route, visually distinct from a screen or status indicator.
    const phase = reduced.matches ? .36 : (time * .035 + .36) % 1;
    const point = project(.15 + phase * 1.05, .8 - phase * .75, .15 + phase * .75);
    square(point.x, point.y, step * .52, .75, true);
  }
  // Small abstract technical glyphs; bitmap strokes keep the rain crisp and asset-free.
  const glyphs = [
    ['111', '101', '101', '101', '111'], ['010', '110', '010', '010', '111'],
    ['111', '001', '111', '100', '111'], ['101', '101', '111', '001', '001'],
    ['111', '100', '111', '001', '111'], ['010', '111', '010', '101', '010'],
    ['100', '111', '101', '111', '001'], ['111', '010', '111', '010', '010'],
    ['101', '111', '001', '011', '100'], ['001', '111', '100', '111', '010'],
    ['110', '010', '111', '010', '011'], ['010', '101', '000', '101', '010'],
    ['100', '010', '001', '010', '100'], ['001', '010', '100', '010', '001'],
    ['111', '000', '010', '000', '111'], ['101', '010', '111', '010', '101']
  ];
  function codeRain() {
    const pixel = width < 700 ? 1.65 : 1.9;
    const cellHeight = width < 700 ? 18 : 20;
    const count = Math.ceil(height / cellHeight) + 2;
    const clock = reduced.matches ? 0 : time;
    for (const column of rainColumns) {
      const travel = column.phase * count + clock * column.speed / cellHeight;
      const head = Math.floor(travel) % count;
      const offset = (travel % 1) * cellHeight;
      for (let row = -1; row < count; row++) {
        const lag = ((head - row) % count + count) % count;
        const noise = ((column.seed * 73 + (row + count) * 37) % 101) / 101;
        const trail = Math.max(0, 1 - lag / column.length);
        const alpha = .07 + noise * .055 + trail * trail * .48;
        const index = (column.seed * 7 + (row + count) * 11 + Math.floor(clock * .65 + column.phase * 9)) % glyphs.length;
        const glyph = glyphs[index];
        const x = column.x, y = row * cellHeight + offset;
        for (let line = 0; line < 5; line++) for (let bit = 0; bit < 3; bit++) {
          if (glyph[line][bit] === '1') square(x + bit * pixel * 1.25, y + line * pixel * 1.25, pixel, lag === 0 ? .83 : alpha, lag < 2);
        }
        // Sparse missing/shifted pixels suggest signal interference without a text overlay.
        if ((row + column.seed * 3) % 13 === 0) {
          const shift = Math.sin(clock * .8 + column.seed) * 3;
          square(x + 8 + shift, y + 5, pixel * .75, .19 + trail * .17);
          square(x + 10 + shift, y + 5, pixel * .75, .11 + trail * .12);
        }
      }
    }
  }
  function draw() {
    if (dead) return;
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#08080a';
    ctx.fillRect(0, 0, width, height);
    if (about) codeRain();
    else {
      landscape();
      if (enterprise) factory(); else game();
    }
    ctx.globalAlpha = 1;
  }
  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    last = null;
  }
  function canRun() { return !dead && visible && !document.hidden && !reduced.matches; }
  function schedule() { if (canRun() && !frame) frame = requestAnimationFrame(tick); }
  function tick(timestamp) {
    frame = 0;
    if (!canRun()) { last = null; return; }
    if (last === null || timestamp - last >= 1000 / 30) {
      const delta = last === null ? 0 : Math.min(.1, (timestamp - last) / 1000);
      time += delta;
      last = timestamp;
      pointer.x += (target.x - pointer.x) * .12;
      pointer.y += (target.y - pointer.y) * .12;
      pointer.strength += (target.strength - pointer.strength) * .1;
      draw();
    }
    schedule();
  }
  function resize() {
    if (dead) return;
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    dpr = clamp(window.devicePixelRatio || 1, 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    step = Math.max(4, Math.min(9, Math.sqrt(width * height / 11500)));
    scale = Math.max(1, Math.min(width * .145, height * .25));
    cx = width * .5;
    cy = height * .55;
    pointer.x = target.x = cx;
    pointer.y = target.y = cy;
    pointer.strength = target.strength = 0;
    stop();
    rebuild();
    draw();
    schedule();
  }
  function move(event) {
    if (reduced.matches || event.pointerType === 'touch') return;
    const bounds = canvas.getBoundingClientRect();
    target.x = event.clientX - bounds.left;
    target.y = event.clientY - bounds.top;
    target.strength = 1;
  }
  function leave() { target.strength = 0; }
  function visibility() { stop(); if (!document.hidden && visible) { draw(); schedule(); } }
  function motionChange() {
    stop();
    pointer.strength = target.strength = 0;
    draw();
    schedule();
  }
  function cleanup() {
    if (dead) return;
    dead = true;
    stop();
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    for (const remove of listeners) remove();
    samples = [];
    rainColumns = [];
    values = new Float32Array(0);
    if (activeCleanup === cleanup) activeCleanup = null;
  }
  activeCleanup = cleanup;
  listen(surface, 'pointermove', move);
  listen(surface, 'pointerleave', leave);
  listen(surface, 'pointercancel', leave);
  listen(document, 'visibilitychange', visibility);
  if (reduced.addEventListener) listen(reduced, 'change', motionChange);
  else if (reduced.addListener) {
    reduced.addListener(motionChange);
    listeners.push(() => reduced.removeListener(motionChange));
  }
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
  } else listen(window, 'resize', resize);
  if (typeof IntersectionObserver !== 'undefined') {
    intersectionObserver = new IntersectionObserver(entries => {
      if (dead) return;
      visible = entries[0]?.isIntersecting ?? false;
      visibility();
    }, { threshold: .01 });
    intersectionObserver.observe(canvas);
  }
  resize();
  return cleanup;
}

