/** One small isometric world, from spatial wireframe to a finished interaction. */
const instances = new WeakMap();
const STAGES = [
  { id: 'design', label: 'Design', description: 'Interaction design · UI/UX · Spatial prototypes' },
  { id: 'develop', label: 'Develop', description: 'Gameplay · Simulation rules · Multiplayer systems' },
  { id: 'deliver', label: 'Deliver', description: 'Visual polish · Performance · Platform builds' },
];
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const noise = (a, b) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
const ROUTE = [[-2.5, 1.95], [.8, 1.95], [2.3, .45], [2.3, -1.35], [.5, -1.35], [-.8, -.1], [-2.5, -.1]];
const BUILDINGS = [
  { x: -3.3, y: -2.65, w: 1.6, d: 1.2, h: 1.45 },
  { x: -1.65, y: -2.65, w: 1.0, d: 1.2, h: 2.4 },
  { x: -3.3, y: -.9, w: .65, d: 1.6, h: .6 },
  { x: .05, y: -.5, w: 1.05, d: 1.05, h: .55 },
  { x: 3.0, y: 1.55, w: .65, d: 1.15, h: .95 },
];

function routePoint(progress) {
  const phase = ((progress % 1) + 1) % 1 * ROUTE.length;
  const index = Math.floor(phase), t = smooth(phase - index);
  const a = ROUTE[index], b = ROUTE[(index + 1) % ROUTE.length];
  return [mix(a[0], b[0], t), mix(a[1], b[1], t)];
}

export function startEngineeringProcess(container) {
  if (!container) return () => {};
  instances.get(container)?.();
  const canvas = container.querySelector('[data-engineering-canvas]');
  const ctx = canvas?.getContext('2d');
  const viewport = canvas?.parentElement;
  const buttons = [...container.querySelectorAll('[data-engineering-stage]')];
  const label = container.querySelector('[data-engineering-label]');
  const description = container.querySelector('[data-engineering-description]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const removers = [];
  let width = 1, height = 1, dpr = 1, unit = 1;
  let frame = 0, last = null, elapsed = 0, time = 0, stage = 0;
  let visible = !('IntersectionObserver' in window), dead = false, suspended = false;
  let manual = false, transitionAge = 1.2;
  let weights = [1, 0, 0], fromWeights = [...weights];
  let resizeObserver, intersectionObserver;

  function listen(target, event, callback) {
    target.addEventListener(event, callback);
    removers.push(() => target.removeEventListener(event, callback));
  }

  function updateText() {
    const selected = STAGES[stage];
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.engineeringStage === selected.id)));
    if (label) label.textContent = selected.label;
    if (description) description.textContent = selected.description;
    container.dataset.engineeringActive = selected.id;
  }

  function selectStage(index, userSelected = false) {
    stage = index;
    if (userSelected) manual = true;
    fromWeights = [...weights];
    transitionAge = reduced.matches || !ctx ? 1.2 : 0;
    elapsed = 0;
    updateText();
    if (transitionAge === 1.2) weights = STAGES.map((_, i) => Number(i === stage));
    draw();
    sync();
  }

  function project(x, y, z = 0) {
    return [width * .5 + (x - y) * unit, height * .51 + (x + y) * unit * .47 - z * unit * .98];
  }

  function pixel(x, y, size, opacity, color = '#be95ff') {
    if (opacity < .012) return;
    ctx.globalAlpha = clamp(opacity);
    ctx.fillStyle = color;
    const side = Math.max(1 / dpr, Math.round(size * dpr) / dpr);
    ctx.fillRect(Math.round((x - side / 2) * dpr) / dpr, Math.round((y - side / 2) * dpr) / dpr, side, side);
  }

  function line(a, b, opacity, color = '#be95ff', spacing = .15, size = .075) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1], (b[2] || 0) - (a[2] || 0));
    const count = Math.max(1, Math.ceil(length / spacing));
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const p = project(mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2] || 0, b[2] || 0, t));
      pixel(p[0], p[1], Math.max(1.1, unit * size), opacity, color);
    }
  }

  function loop(points, opacity, color, spacing, size) {
    points.forEach((point, i) => line(point, points[(i + 1) % points.length], opacity, color, spacing, size));
  }

  function polygon(points, color, opacity) {
    if (opacity < .01) return;
    ctx.globalAlpha = clamp(opacity);
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach((point, index) => {
      const p = project(...point);
      if (!index) ctx.moveTo(...p); else ctx.lineTo(...p);
    });
    ctx.closePath();
    ctx.fill();
  }

  // Sample faces on a fixed spatial lattice: every stage keeps the same geometry.
  function face(origin, axisA, axisB, intensity, material, seed, ground = false) {
    const aLength = Math.hypot(...axisA), bLength = Math.hypot(...axisB);
    const rows = Math.ceil(aLength / .20), columns = Math.ceil(bLength / .20);
    const color = intensity > .65 ? '#d0a7ff' : '#a56ce5';
    for (let row = 0; row <= rows; row++) {
      for (let column = 0; column <= columns; column++) {
        const u = row / rows, v = column / columns;
        const x = origin[0] + axisA[0] * u + axisB[0] * v;
        const y = origin[1] + axisA[1] * u + axisB[1] * v;
        const z = origin[2] + axisA[2] * u + axisB[2] * v;
        const n = noise(row + seed, column - seed);
        if (n < (ground ? .20 : .08)) continue;
        const light = ground ? Math.exp(-((x - .6) ** 2 + (y + .1) ** 2) / 7) * weights[2] * .4 : 0;
        const p = project(x, y, z);
        const opacity = material * intensity * (.42 + n * .5) + light;
        pixel(p[0], p[1], Math.max(1.1, unit * (ground ? .065 : .086)), opacity, color);
      }
    }
  }

  function box(x, y, w, d, h, z = 0, bright = 0) {
    const design = weights[0], develop = weights[1], deliver = weights[2];
    const material = develop * .44 + deliver * .88;
    const top = [[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]];
    const right = [[x + w, y, z], [x + w, y + d, z], top[2], top[1]];
    const left = [[x, y + d, z], [x + w, y + d, z], top[2], top[3]];
    const solid = (develop * .65 + deliver) * .97;
    polygon(left, '#21142e', solid);
    face([x, y + d, z], [w, 0, 0], [0, 0, h], .45 + bright, material, 13);
    polygon(right, '#160f23', solid);
    face([x + w, y, z], [0, d, 0], [0, 0, h], .3 + bright, material, 29);
    polygon(top, '#302040', solid);
    face(top[0], [w, 0, 0], [0, d, 0], .85 + bright, material, 7);
    const edge = design * .67 + develop * .46 + deliver * .63;
    loop(top, edge + bright * .2, '#d1adff');
    for (const i of [1, 2, 3]) line([top[i][0], top[i][1], z], top[i], edge * .76);
    line([x, y + d, z], [x + w, y + d, z], edge * .45);
    line([x + w, y, z], [x + w, y + d, z], edge * .45);
    if (design > .01) {
      line([x, y, z], top[0], design * .22);
      line([x, y, z], [x + w, y, z], design * .2);
      line([x, y, z], [x, y + d, z], design * .2);
    }
  }

  function pad(x, y, intensity, active) {
    const outer = .42 + active * .08;
    loop([[x - outer, y - outer, .025], [x + outer, y - outer, .025], [x + outer, y + outer, .025], [x - outer, y + outer, .025]], intensity, '#d9bdff', .11, .065);
    const p = project(x, y, .03);
    pixel(...p, unit * .1, intensity, '#eadbff');
  }

  function player(point, phase, active) {
    const [x, y] = point;
    const bob = active * Math.sin(phase) * .035;
    const p = project(x, y, .045);
    pixel(...p, unit * .32, active * .16);
    box(x - .14, y - .14, .28, .28, .32, .04 + bob, .48);
    box(x - .1, y - .1, .20, .20, .18, .42 + bob, .85);
    const head = project(x, y, .60 + bob);
    pixel(...head, unit * .105, .7 + active * .3, '#f0e4ff');
  }

  function draw() {
    if (!ctx || dead || width < 2 || height < 2) return;
    const design = weights[0], develop = weights[1], deliver = weights[2];
    const active = develop + deliver;
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = 1;
    const halo = ctx.createRadialGradient(width * .51, height * .52, 0, width * .51, height * .52, unit * 6);
    halo.addColorStop(0, `rgba(125, 60, 189, ${.03 + deliver * .08})`);
    halo.addColorStop(1, 'rgba(125, 60, 189, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, width, height);

    // Ground slab and spatial grid remain in place throughout the progression.
    box(-4.3, -3.35, 8.6, 6.7, .27, -.30);
    face([-4.3, -3.35, -.025], [8.6, 0, 0], [0, 6.7, 0], .27, .15 + develop * .16 + deliver * .5, 41, true);
    for (let x = -4; x <= 4; x++) line([x, -3.35, -.01], [x, 3.35, -.01], .15 * design + .07 * develop + .04 * deliver, '#ad79e7', .22, .04);
    for (let y = -3; y <= 3; y++) line([-4.3, y, -.01], [4.3, y, -.01], .15 * design + .07 * develop + .04 * deliver, '#ad79e7', .22, .04);

    // The movement loop is laid out in Design and becomes a working interaction.
    for (let i = 0; i < ROUTE.length; i++) {
      const a = [...ROUTE[i], .02], b = [...ROUTE[(i + 1) % ROUTE.length], .02];
      line(a, b, design * .24 + develop * .36 + deliver * .12, '#c696ff', .20, .05);
    }
    const a = routePoint(.09 + time * .035);
    const b = routePoint(.58 - time * .026);
    const trigger = active * Math.exp(-((a[0] - 2.3) ** 2 + (a[1] + 1.35) ** 2) * 1.9);
    pad(-2.5, 1.95, .3 + active * .32, 0);
    pad(2.3, -1.35, .35 + trigger * .6, trigger);

    if (develop > .01) {
      // Two route trails make motion legible without synthetic data or HUD labels.
      for (let i = 1; i <= 10; i++) {
        const p = project(...routePoint(.09 + (time - i * .14) * .035), .035);
        pixel(...p, Math.max(1.2, unit * .065), develop * (1 - i / 12) * .58, '#e4cdff');
      }
    }

    const objects = BUILDINGS.map(building => ({ depth: building.x + building.y + (building.w + building.d) * .5, render: () => box(building.x, building.y, building.w, building.d, building.h) }));
    // An open gateway responds to the signal that reaches its floor pad.
    objects.push({ depth: 0, render: () => {
      box(1.5, -2.65, .35, .5, 1.9);
      box(3.0, -2.65, .35, .5, 1.9);
      box(1.5, -2.65, 1.85, .5, .30, 1.9, .18);
      const gateOpacity = active * (.28 + deliver * .27) * (1 - trigger * .82);
      for (let x = 1.94; x < 2.96; x += .16) {
        line([x, -2.39, .15 + trigger * 1.5], [x, -2.39, 1.80], gateOpacity, '#c79cff', .19, .045);
      }
      line([1.65, -2.12, 2.22], [3.2, -2.12, 2.22], .25 + deliver * .65 + trigger * .1, '#ecd9ff', .13, .085);
    }});
    for (const [point, phase] of [[a, time * 2], [b, time * 2 + Math.PI]]) objects.push({ depth: point[0] + point[1], render: () => player(point, phase, active) });
    objects.sort((left, right) => left.depth - right.depth).forEach(object => object.render());

    // Finishing light is attached to the architecture, never a free particle cloud.
    if (deliver > .01) {
      line([-3.3, -1.43, 1.46], [-1.7, -1.43, 1.46], deliver * .8, '#e5ceff', .14, .095);
      line([-.1, .65, .56], [1.23, .65, .56], deliver * .7, '#e2c6ff', .15, .07);
      for (let i = 0; i < 6; i++) {
        const p = project(-3.85 + i * 1.55, 3.35, -.02);
        pixel(...p, unit * .12, deliver * .7, '#dbbaff');
      }
    }

    // Small construction marks ground the first stage in authored spatial work.
    if (design > .01) {
      for (const [x, y] of [[-4.65, -3.65], [4.65, -3.65], [-4.65, 3.65], [4.65, 3.65]]) {
        line([x - .18, y, 0], [x + .18, y, 0], design * .55, '#d6b9ff');
        line([x, y - .18, 0], [x, y + .18, 0], design * .55, '#d6b9ff');
      }
    }
    ctx.globalAlpha = 1;
  }

  function resize() {
    if (!ctx || !viewport || dead) return;
    const rect = viewport.getBoundingClientRect();
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    unit = Math.min(width / 18.7, height / 10.7);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function canAnimate() {
    return ctx && !dead && visible && !suspended && !document.hidden && !reduced.matches && (!manual || transitionAge < 1.2);
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; last = null;
  }

  function sync() {
    if (!canAnimate()) stop();
    else if (!frame) frame = requestAnimationFrame(tick);
  }

  function tick(now) {
    frame = 0;
    if (!container.isConnected) { cleanup(); return; }
    if (!canAnimate()) { last = null; return; }
    if (last === null) last = now;
    const delta = now - last;
    // A modest frame rate keeps this supporting illustration inexpensive.
    if (delta >= 1000 / 30) {
      const dt = Math.min(delta / 1000, .08);
      last = now;
      if (!manual) { time += dt * (weights[1] + weights[2]); elapsed += dt; }
      if (!manual && elapsed >= 8) selectStage((stage + 1) % STAGES.length);
      transitionAge = Math.min(1.2, transitionAge + dt);
      const blend = smooth(transitionAge / 1.2);
      weights = fromWeights.map((weight, i) => mix(weight, Number(i === stage), blend));
      draw();
    }
    sync();
  }

  function onMotionChange() {
    if (reduced.matches) {
      transitionAge = 1.2;
      weights = STAGES.map((_, i) => Number(i === stage));
      draw();
    }
    sync();
  }

  function cleanup() {
    if (dead) return;
    dead = true;
    stop();
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    removers.forEach(remove => remove());
    instances.delete(container);
  }

  buttons.forEach(button => {
    const index = STAGES.findIndex(item => item.id === button.dataset.engineeringStage);
    if (index >= 0) listen(button, 'click', () => selectStage(index, true));
  });
  listen(reduced, 'change', onMotionChange);
  listen(document, 'visibilitychange', sync);
  listen(window, 'pagehide', event => { if (event.persisted) { suspended = true; stop(); } else cleanup(); });
  listen(window, 'pageshow', () => { suspended = false; resize(); sync(); });
  if (ctx) {
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(viewport);
    } else listen(window, 'resize', resize);
    if ('IntersectionObserver' in window) {
      intersectionObserver = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); });
      intersectionObserver.observe(container);
    }
  }
  instances.set(container, cleanup);
  updateText();
  resize();
  sync();
  return cleanup;
}
