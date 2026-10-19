// One shared tooth module, conjugate phases, and a quiet pixel-sampled machine.
const canvas = document.querySelector('[data-training-art]');
if (canvas?.getContext('2d')) startMachine(canvas);

function startMachine(canvas) {
  const ctx = canvas.getContext('2d');
  const hero = canvas.closest('.training-hero');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const TAU = Math.PI * 2, MODULE = .1, PRESSURE = Math.PI / 9;
  const FRONT = .16, BACK = -.05;
  let width = 1, height = 1, scale = 1, gears = [], originX = 0, originY = 0;
  let frame = 0, last = 0, time = 0, visible = true;
  let tilt = 0, targetTilt = 0;
  const clamp = (x, low = 0, high = 1) => Math.max(low, Math.min(high, x));
  const involute = angle => Math.tan(angle) - angle;

  function makeGear(x, y, teeth, direction, phase = 0) {
    const radius = teeth * MODULE / 2;
    const root = radius - MODULE * 1.25, tip = radius + MODULE;
    const base = radius * Math.cos(PRESSURE), toothPitch = TAU / teeth;
    // Shared physical backlash keeps the tooth flanks legible as the gears mesh.
    const halfPitch = Math.PI / (2 * teeth) - .012 / (2 * radius);
    const invPitch = involute(PRESSURE);
    const halfAt = r => halfPitch + invPitch - involute(Math.acos(base / Math.max(base, r)));
    const halfBase = halfAt(base), halfTip = halfAt(tip);
    const outline = [], points = [];
    const add = (angle, r) => outline.push([Math.cos(angle) * r, Math.sin(angle) * r]);
    for (let tooth = 0; tooth < teeth; tooth++) {
      const centre = tooth * toothPitch;
      add(centre - toothPitch / 2, root);
      add(centre - halfBase, root);
      add(centre - halfBase, base);
      for (let i = 1; i <= 7; i++) {
        const r = base + (tip - base) * i / 7;
        add(centre - halfAt(r), r);
      }
      for (let i = 1; i <= 3; i++) add(centre - halfTip + 2 * halfTip * i / 3, tip);
      for (let i = 6; i >= 0; i--) {
        const r = base + (tip - base) * i / 7;
        add(centre + halfAt(r), r);
      }
      add(centre + halfBase, root);
      add(centre + toothPitch / 2, root);
    }
    // Cache the polar boundary once; frame drawing only rotates these samples.
    const boundary = [];
    for (let i = 0; i < 2048; i++) {
      const angle = Math.abs(((i / 2048 * TAU + toothPitch / 2) % toothPitch) - toothPitch / 2);
      let r = root;
      if (angle <= halfTip) r = tip;
      else if (angle < halfBase) {
        let low = base, high = tip;
        for (let j = 0; j < 12; j++) {
          const mid = (low + high) / 2;
          if (halfAt(mid) > angle) low = mid; else high = mid;
        }
        r = (low + high) / 2;
      }
      boundary.push(r);
    }
    const step = width < 700 ? .041 : .032;
    for (let py = -tip; py <= tip; py += step) for (let px = -tip; px <= tip; px += step) {
      const r = Math.hypot(px, py), a = Math.atan2(py, px);
      const edge = boundary[Math.floor(((a + TAU) % TAU) / TAU * 2048) % 2048];
      if (r > edge || r < radius * .12) continue;
      const spoke = Math.abs(Math.sin(a * 3)) < .19;
      if (r > radius * .3 && r < radius * .7 && !spoke) continue;
      const rim = r > root - .065 || Math.abs(r - radius * .27) < .024 || r < radius * .16;
      const seed = Math.sin(px * 127.1 + py * 311.7) * 43758.5453;
      points.push({ x: px, y: py, rim, seed: seed - Math.floor(seed) });
    }
    return { x, y, radius, teeth, direction, phase, points, outline };
  }

  function view(x, y, z = 0) {
    const yaw = -.24 + tilt;
    const rx = x * Math.cos(yaw) + z * Math.sin(yaw);
    const rz = -x * Math.sin(yaw) + z * Math.cos(yaw);
    return { x: rx, y: y * .88 - rz * .29 };
  }
  function project(x, y, z = 0) {
    const p = view(x, y, z);
    return { x: originX + p.x * scale, y: originY + p.y * scale };
  }
  function pixel(p, size = 2, alpha = .7, hot = false) {
    if (p.x < -8 || p.x > width + 8 || p.y < 0 || p.y > height * .75 || alpha < .015) return;
    const fade = 1 - clamp((p.y / height - .56) / .17);
    ctx.globalAlpha = clamp(alpha * fade);
    ctx.fillStyle = hot ? '#e2c7ff' : '#a569eb';
    const snap = width < 700 ? 1 : 1.5;
    ctx.fillRect(Math.round(p.x / snap) * snap, Math.round(p.y / snap) * snap, size, size);
  }
  function line(a, b, alpha = .45, size = 2, hot = false) {
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    const count = Math.max(1, Math.ceil(distance / (width < 700 ? 3.1 : 3.6)));
    for (let i = 0; i <= count; i++) {
      const f = i / count;
      pixel({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }, size, alpha, hot);
    }
  }
  const worldLine = (a, b, alpha = .45, size = 2, hot = false) => line(project(...a), project(...b), alpha, size, hot);
  function circle(x, y, radius, z, alpha, hot = false) {
    let previous;
    for (let i = 0; i <= 72; i++) {
      const a = i / 72 * TAU, p = project(x + Math.cos(a) * radius, y + Math.sin(a) * radius, z);
      if (previous) line(previous, p, alpha, width < 700 ? 1.5 : 1.9, hot);
      previous = p;
    }
  }
  function transform(gear, angle, p, depth) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return project(gear.x + p[0] * c - p[1] * s, gear.y + p[0] * s + p[1] * c, depth);
  }

  function drawDepth(gear, angle) {
    // Only exposed sidewalls: no ghost rings or complete rear outlines.
    const offset = project(0, 0, BACK), front = project(0, 0, FRONT);
    const dx = offset.x - front.x, dy = offset.y - front.y;
    for (let i = 0; i < gear.outline.length; i++) {
      const a = transform(gear, angle, gear.outline[i], FRONT);
      const b = transform(gear, angle, gear.outline[(i + 1) % gear.outline.length], FRONT);
      if ((b.y - a.y) * dx - (b.x - a.x) * dy <= 0) continue;
      line({ x: a.x + dx, y: a.y + dy }, { x: b.x + dx, y: b.y + dy }, .22, 1.45);
      if (i % 3 === 0) line(a, { x: a.x + dx, y: a.y + dy }, .28, 1.4);
    }
  }
  function drawGear(gear, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    for (const p of gear.points) {
      const x = gear.x + p.x * c - p.y * s, y = gear.y + p.x * s + p.y * c;
      const light = .05 * Math.sin(time * .65 + x * .75);
      const alpha = p.rim ? .76 + light : .37 + p.seed * .14 + light;
      pixel(project(x, y, FRONT), width < 700 ? 1.65 : 2.4, alpha, p.rim);
    }
    for (let i = 0; i < gear.outline.length; i++) {
      line(transform(gear, angle, gear.outline[i], FRONT), transform(gear, angle, gear.outline[(i + 1) % gear.outline.length], FRONT), .9, width < 700 ? 1.6 : 2, true);
    }
    circle(gear.x, gear.y, gear.radius * .12, FRONT + .025, .82, true);
    circle(gear.x, gear.y, gear.radius * .27, FRONT + .01, .48);
    const axis = project(gear.x, gear.y, FRONT + .04);
    const mark = width < 700 ? 3 : 4;
    line({ x: axis.x - mark, y: axis.y }, { x: axis.x + mark, y: axis.y }, .5, 1.35, true);
    line({ x: axis.x, y: axis.y - mark }, { x: axis.x, y: axis.y + mark }, .5, 1.35, true);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    // Sparse mounting points locate the mechanism without a competing rear cage.
    for (const g of gears) {
      circle(g.x, g.y, g.radius * .19, BACK - .04, .18);
      for (const dx of [-.23, .23]) for (const dy of [-.23, .23]) pixel(project(g.x + dx, g.y + dy, BACK - .06), 1.3, .13);
    }
    const drive = time * .145;
    const angleFor = gear => drive * gear.direction * 28 / gear.teeth + gear.phase;
    // All rear walls are drawn first, then the common front plane.
    for (const gear of gears) drawDepth(gear, angleFor(gear));
    for (const gear of gears) drawGear(gear, angleFor(gear));
    if (width >= 700) {
      const g = gears[2], angle = angleFor(g), crankRadius = .48;
      const pin = [g.x + Math.cos(angle) * crankRadius, g.y + Math.sin(angle) * crankRadius, FRONT + .08];
      const railY = g.y, rodLength = 1.65;
      const sliderX = pin[0] + Math.sqrt(rodLength ** 2 - (pin[1] - railY) ** 2);
      const railStart = g.x + 1.1, railEnd = g.x + 2.47;
      worldLine([railStart, railY - .23, BACK], [railEnd, railY - .23, BACK], .25, 1.6);
      worldLine([railStart, railY + .23, BACK], [railEnd, railY + .23, BACK], .25, 1.6);
      worldLine(pin, [sliderX, railY, FRONT + .08], .8, width < 1000 ? 2 : 2.6, true);
      circle(pin[0], pin[1], .055, FRONT + .1, .92, true);
      circle(sliderX, railY, .05, FRONT + .1, .85, true);
      const slider = [[sliderX - .14, railY - .16], [sliderX + .14, railY - .16], [sliderX + .14, railY + .16], [sliderX - .14, railY + .16]];
      for (let i = 0; i < 4; i++) worldLine([...slider[i], FRONT + .08], [...slider[(i + 1) % 4], FRONT + .08], .76, 2, true);
    }
    ctx.globalAlpha = 1;
  }

  function tick(stamp) {
    frame = 0;
    if (!visible || document.hidden || reduced.matches) { last = 0; return; }
    if (!last || stamp - last >= 1000 / 30) {
      const delta = last ? Math.min((stamp - last) / 1000, .1) : 0;
      last = stamp; time += delta;
      tilt += (targetTilt - tilt) * .06;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; last = 0;
    if (reduced.matches) draw();
    else if (visible && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function resize() {
    const box = canvas.getBoundingClientRect();
    width = Math.max(1, box.width); height = Math.max(1, box.height);
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false;
    const mobile = width < 700, central = makeGear(0, 0, 28, 1);
    const angles = mobile ? [Math.PI + .84, .84] : [Math.PI - .14, .28];
    const children = angles.map(angle => {
      const distance = MODULE * (28 + 20) / 2;
      // At the contact line one gear's tooth faces the other gear's gap.
      const phase = ((28 + 20) * angle + 20 * Math.PI - Math.PI) / 20;
      return makeGear(Math.cos(angle) * distance, Math.sin(angle) * distance, 20, -1, phase);
    });
    gears = [children[0], central, children[1]];
    const bounds = [];
    for (const g of gears) for (let i = 0; i < 48; i++) {
      const a = i / 48 * TAU, r = g.radius + MODULE + .12;
      bounds.push(view(g.x + Math.cos(a) * r, g.y + Math.sin(a) * r));
    }
    if (!mobile) bounds.push(view(gears[2].x + 2.47, gears[2].y + .35));
    const minX = Math.min(...bounds.map(p => p.x)), maxX = Math.max(...bounds.map(p => p.x));
    const minY = Math.min(...bounds.map(p => p.y)), maxY = Math.max(...bounds.map(p => p.y));
    scale = Math.min(width * .86 / (maxX - minX), height * .61 / (maxY - minY));
    originX = width * .5 - (minX + maxX) / 2 * scale;
    originY = height * .335 - (minY + maxY) / 2 * scale;
    draw(); sync();
  }
  hero.addEventListener('pointermove', event => {
    if (reduced.matches || event.pointerType === 'touch') return;
    const box = hero.getBoundingClientRect();
    targetTilt = clamp((event.clientX - box.left) / box.width * 2 - 1, -1, 1) * .055;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { targetTilt = 0; }, { passive: true });
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(hero);
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => { if (frame) cancelAnimationFrame(frame); });
  window.addEventListener('pageshow', sync);
  resize();
}
