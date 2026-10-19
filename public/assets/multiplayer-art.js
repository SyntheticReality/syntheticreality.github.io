/* A living shared world: independent players, conversations, co-op cargo and a ball game. */
const canvas = document.querySelector('[data-multiplayer-art]');
if (canvas) {
  canvas.__multiplayerArtCleanup?.();
  canvas.__multiplayerArtCleanup = startMultiplayerTown(canvas);
}

function startMultiplayerTown(canvas) {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return () => {};
  const hero = canvas.closest('.multiplayer-hero') || canvas.parentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const palette = ['#765299', '#a569eb', '#be86ff', '#e2c7ff'];
  const TAU = Math.PI * 2;
  const clamp = n => Math.max(0, Math.min(1, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const listeners = [];
  const roads = [
    [[-4.35, -2.25], [3.9, -2.25], [3.9, 2.25], [-4.35, 2.25]],
    [[-3.2, -1.05], [2.75, -1.05], [2.75, 1.05], [-3.2, 1.05]],
    [[-4.35, 0], [0, 0], [0, -2.25], [3.9, -2.25], [3.9, 0], [0, 0], [0, 2.25], [-4.35, 2.25]]
  ];
  const chats = [{ u: -2.55, v: -.32, phase: 0 }, { u: 1.05, v: -2.1, phase: 2.4 }, { u: -.6, v: 2.15, phase: 4.8 }];
  let width = 1, height = 1, dpr = 1, scale = 1, cx = 0, cy = 0, sprite = 2;
  let frame = 0, last = null, time = 1.8, visible = true, dead = false, narrow = false;
  let resizeObserver, intersectionObserver, tilt = 0, targetTilt = 0;
  function listen(target, event, callback) {
    target.addEventListener(event, callback, { passive: true });
    listeners.push(() => target.removeEventListener(event, callback));
  }
  function project(u, v, z = 0) {
    const angle = tilt * .045, a = u * Math.cos(angle) - v * Math.sin(angle), b = u * Math.sin(angle) + v * Math.cos(angle);
    return { x: cx + (a - b) * scale * .82, y: cy + (a + b) * scale * .31 - z * scale * .72 };
  }
  function pixel(x, y, size = 1.8, alpha = .7, color = 2) {
    if (!Number.isFinite(x + y + size + alpha) || alpha < .015 || x < -5 || x > width + 5 || y < -5 || y > height * .71) return;
    const fade = 1 - clamp((y / height - .49) / .2);
    ctx.globalAlpha = clamp(alpha * fade * fade * clamp(Math.min(x + 10, width + 10 - x) / 35));
    ctx.fillStyle = palette[color];
    const side = Math.max(1, Math.round(size * dpr)) / dpr;
    ctx.fillRect(Math.round((x - side / 2) * dpr) / dpr, Math.round((y - side / 2) * dpr) / dpr, side, side);
  }
  function dot(u, v, z = 0, alpha = .5, size = 1.7, color = 2) {
    const p = project(u, v, z); pixel(p.x, p.y, size, alpha, color);
  }
  function line(a, b, alpha = .5, color = 2, step = 4.6, size = 1.7) {
    const start = project(...a), end = project(...b), count = Math.max(1, Math.ceil(Math.hypot(end.x - start.x, end.y - start.y) / step));
    for (let n = 0; n <= count; n++) pixel(mix(start.x, end.x, n / count), mix(start.y, end.y, n / count), size, alpha, color);
  }
  function ring(u, v, radius, alpha = .35, color = 1) {
    for (let n = 0; n < 50; n++) { const a = n / 50 * TAU; dot(u + Math.cos(a) * radius, v + Math.sin(a) * radius, .01, alpha, 1.5, color); }
  }
  function ground() {
    // Light tile corners and interrupted lane edges leave the players in the foreground.
    for (let u = -5; u <= 5; u += .42) for (let v = -3.2; v <= 3.2; v += .42) {
      if ((u / 5) ** 2 + (v / 3.2) ** 2 > 1.1) continue;
      const noise = Math.abs(Math.sin(u * 61.4 + v * 93.7));
      dot(u, v, -.015, .075 + noise * .045, narrow ? 1 : 1.3, 0);
    }
    for (const road of roads.slice(0, 2)) for (let n = 0; n < road.length; n++) {
      const a = road[n], b = road[(n + 1) % road.length];
      line([...a, 0], [...b, 0], .2, 1, 7, 1.5);
    }
    line([-4.4, 0, 0], [4.15, 0, 0], .15, 1, 9, 1.4);
    line([0, -2.55, 0], [0, 2.55, 0], .15, 1, 9, 1.4);
    ring(0, 0, .88, .28, 1);
    ring(0, 0, .97, .14, 0);
    // A tiny fountain: a fixed location around which the game continues.
    for (let n = 0; n < 32; n++) { const a = n / 32 * TAU; dot(Math.cos(a) * .32, Math.sin(a) * .32, .08, .53, 1.7, 2); }
    for (let n = 0; n < 8; n++) {
      const t = (n / 8 + time * .17) % 1;
      dot(Math.sin(t * Math.PI) * .17, 0, .12 + Math.sin(t * Math.PI) * .48, .65, 1.8, 3);
    }
  }
  function building(u, v, widthU, widthV, tall) {
    const base = [[u, v, 0], [u + widthU, v, 0], [u + widthU, v + widthV, 0], [u, v + widthV, 0]];
    const top = base.map(p => [p[0], p[1], tall]);
    for (let n = 0; n < 4; n++) { line(top[n], top[(n + 1) % 4], .53, 2); line(base[n], top[n], .36, 1); }
    line(base[2], base[3], .35, 1); line(base[1], base[2], .3, 1);
    for (let x = .18; x < widthU; x += .22) for (let z = .18; z < tall - .1; z += .2) dot(u + x, v + widthV, z, .14, 1.4, 1);
    // Three lit windows and an open doorway read as buildings, not data blocks.
    for (let n = 0; n < 3; n++) {
      const left = u + .14 + n * (widthU - .2) / 3;
      line([left, v + widthV + .01, tall * .55], [left + .12, v + widthV + .01, tall * .55], .68, 3, 3, 1.7);
      line([left, v + widthV + .01, tall * .55], [left, v + widthV + .01, tall * .55 + .15], .49, 2, 3, 1.5);
    }
    const doorU = u + widthU * .47;
    line([doorU, v + widthV + .02, .02], [doorU, v + widthV + .02, .38], .72, 3);
    line([doorU + .22, v + widthV + .02, .02], [doorU + .22, v + widthV + .02, .38], .72, 3);
    line([doorU, v + widthV + .02, .38], [doorU + .22, v + widthV + .02, .38], .72, 3);
  }
  function tree(u, v, size = 1) {
    line([u, v, 0], [u, v, .62 * size], .4, 1, 3.8, 1.7);
    for (let layer = 0; layer < 4; layer++) {
      const z = (.44 + layer * .16) * size, radius = (.39 - layer * .065) * size;
      for (let n = 0; n < 14; n++) {
        const a = n / 14 * TAU; dot(u + Math.cos(a) * radius, v + Math.sin(a) * radius, z, .27 + layer * .055, 1.9, layer === 3 ? 2 : 1);
      }
    }
  }
  function portal(u, v) {
    const p = project(u, v), unit = sprite * 1.35, breath = .63 + Math.sin(time * 1.1) * .12;
    for (let row = 0; row < 15; row++) for (const side of [-1, 1]) {
      const x = row < 3 ? 4 + row : 6;
      pixel(p.x + side * x * unit, p.y - (15 - row) * unit, unit * .72, breath, 2);
    }
    for (let col = -3; col <= 3; col++) pixel(p.x + col * unit, p.y - 16 * unit, unit * .72, .7, 3);
    ring(u, v, .48, .5, 2);
    for (let n = 0; n < 5; n++) {
      const f = (time * .35 + n / 5) % 1;
      pixel(p.x + Math.sin(n * 2.7) * unit * 3, p.y - f * unit * 14, unit * .65, Math.sin(f * Math.PI) * .45, 3);
    }
  }
  function speech(p, phase, flip = 1) {
    const activity = (time + phase) % 5.4;
    if (activity > 3.7) return;
    const unit = sprite * .85, left = p.x + flip * sprite * 3 - 4 * unit, top = p.y - sprite * 18 - Math.sin(activity * Math.PI / 3.7) * 2;
    for (let col = 0; col < 10; col++) { pixel(left + col * unit, top, unit * .7, .75, 3); pixel(left + col * unit, top + 5 * unit, unit * .7, .75, 3); }
    for (let row = 1; row < 5; row++) { pixel(left, top + row * unit, unit * .7, .6, 2); pixel(left + 9 * unit, top + row * unit, unit * .7, .6, 2); }
    for (let n = 0; n < 3; n++) pixel(left + (3 + n * 2) * unit, top + 2.5 * unit, unit * .8, .35 + .4 * Math.max(0, Math.sin(time * 4 - n)), 3);
    pixel(left + 3 * unit, top + 6 * unit, unit * .7, .65, 2);
  }
  function person(actor) {
    const p = project(actor.u, actor.v), unit = sprite * (actor.scale || 1);
    const walk = actor.walk ? Math.sin(time * 7.5 + actor.phase) : 0;
    const bob = actor.walk ? Math.abs(walk) * unit * .6 : Math.sin(time * 1.3 + actor.phase) * unit * .16;
    const color = actor.color ?? 2;
    // Deliberate silhouettes: a head, jacket, two separated arms and stepping legs.
    const cell = (x, y, alpha = .82, ink = color) => pixel(p.x + x * unit, p.y + y * unit - bob, unit * .88, alpha, ink);
    for (let y = -12; y <= -10; y++) for (let x = -1; x <= 1; x++) cell(x, y, y === -12 ? .9 : .82, y === -12 ? color : 3);
    cell(actor.face || 1, -10, .8, 1);
    for (let y = -8; y <= -5; y++) for (let x = -1; x <= 1; x++) cell(x, y, .72 + (x === 0 ? .16 : 0));
    cell(0, -9, .7, 3);
    const arm = actor.carry ? -7.7 : -6.1;
    cell(-2, arm + walk * .7); cell(2, arm - walk * .7);
    cell(-2.2, arm + (actor.carry ? -.8 : 1.3) + walk * .8, .85, 3);
    cell(2.2, arm + (actor.carry ? -.8 : 1.3) - walk * .8, .85, 3);
    for (let n = 0; n < 3; n++) {
      cell(-.8 - walk * .3, -3.5 + n + Math.max(0, walk) * .8, .72, 1);
      cell(.8 + walk * .3, -3.5 + n + Math.max(0, -walk) * .8, .82, 2);
    }
    cell(-1 - walk * .7, -.25, .72, 3); cell(1 + walk * .7, -.25, .72, 3);
    if (actor.chat) speech(p, actor.phase, actor.face || 1);
    // Small player markers occur on a minority of characters, keeping it game-like.
    if (actor.marker) { cell(0, -14.8, .65, 3); cell(-.7, -15.5, .35, 2); cell(.7, -15.5, .35, 2); }
  }
  function routePosition(route, progress) {
    const lengths = route.map((p, i) => Math.hypot(route[(i + 1) % route.length][0] - p[0], route[(i + 1) % route.length][1] - p[1]));
    const total = lengths.reduce((a, b) => a + b, 0);
    let distance = ((progress % 1 + 1) % 1) * total;
    for (let n = 0; n < route.length; n++) {
      if (distance <= lengths[n]) {
        const a = route[n], b = route[(n + 1) % route.length], f = distance / lengths[n];
        return { u: mix(a[0], b[0], f), v: mix(a[1], b[1], f), face: b[0] - a[0] - (b[1] - a[1]) < 0 ? -1 : 1 };
      }
      distance -= lengths[n];
    }
    return { u: route[0][0], v: route[0][1], face: 1 };
  }
  function cargo(u, v) {
    const a = [u - .46, v - .25, .3], b = [u + .46, v - .25, .3], c = [u + .46, v + .25, .3], d = [u - .46, v + .25, .3];
    for (const pair of [[a, b], [b, c], [c, d], [d, a]]) line(...pair, .8, 3, 3, 1.8);
    for (let x = -.35; x <= .4; x += .15) line([u + x, v - .25, .3], [u + x, v + .25, .3], .38, 2, 4, 1.6);
    for (const p of [a, b, c, d]) line(p, [p[0], p[1], .12], .48, 2, 3, 1.6);
  }
  function sceneActors() {
    const items = [];
    const add = (u, v, draw) => items.push({ depth: u + v, draw });
    const walkers = narrow ? 10 : 18;
    for (let n = 0; n < walkers; n++) {
      const route = roads[n % roads.length], speed = .011 + (n % 4) * .002;
      // Each player has deterministic short stops, offset so the first frame is alive.
      const cycle = (time + n * 2.37) % 13, pause = cycle > 10.8;
      const activeTime = Math.floor((time + n * 2.37) / 13) * 10.8 + Math.min(cycle, 10.8);
      const position = routePosition(route, n * .173 + activeTime * speed * (n % 2 ? -1 : 1));
      const actor = { ...position, walk: !pause, phase: n * 1.8, color: n % 4 === 0 ? 3 : n % 3 === 0 ? 1 : 2, marker: n % 5 === 0, scale: .95 + (n % 3) * .06 };
      add(actor.u, actor.v, () => person(actor));
    }
    const chatCount = narrow ? 2 : 3;
    for (let n = 0; n < chatCount; n++) {
      const group = chats[n];
      for (const side of [-1, 1]) {
        const actor = { u: group.u + side * .27, v: group.v - side * .1, walk: false, chat: true, face: -side, phase: group.phase + (side > 0 ? 2.7 : 0), color: side > 0 ? 1 : 2 };
        add(actor.u, actor.v, () => person(actor));
      }
    }
    // Four teammates carry one shared object. They start midway through their delivery.
    const cargoCycle = (time * .052 + .23) % 1, forwards = cargoCycle < .5;
    const travel = forwards ? cargoCycle * 2 : 2 - cargoCycle * 2;
    const cargoU = mix(-2.7, 2.25, clamp((travel - .08) / .84)), cargoV = 1.15;
    for (let n = 0; n < 4; n++) {
      const actor = { u: cargoU + (n % 2 ? .51 : -.51), v: cargoV + (n < 2 ? -.36 : .36), carry: true, walk: travel > .08 && travel < .92, phase: n * Math.PI, face: forwards ? 1 : -1, color: n % 2 ? 2 : 3, scale: .94 };
      add(actor.u, actor.v, () => person(actor));
    }
    add(cargoU, cargoV, () => cargo(cargoU, cargoV));
    // Three players orbit a playful ball, with different chase distances and strides.
    const ballPhase = time * .46;
    for (let n = 0; n < 3; n++) {
      const a = ballPhase - .5 - n * 1.9, actor = { u: 2.3 + Math.cos(a) * .73, v: -.25 + Math.sin(a) * .58, walk: true, phase: n * 2, face: Math.sin(a) > 0 ? 1 : -1, color: n === 0 ? 3 : 2, scale: .9 };
      add(actor.u, actor.v, () => person(actor));
    }
    const ballU = 2.3 + Math.cos(ballPhase) * .88, ballV = -.25 + Math.sin(ballPhase) * .64;
    add(ballU, ballV, () => {
      const p = project(ballU, ballV, .06 + Math.abs(Math.sin(time * 3.8)) * .09);
      pixel(p.x, p.y, sprite * 1.3, .95, 3); pixel(p.x - sprite, p.y, sprite * .7, .8, 2); pixel(p.x, p.y - sprite, sprite * .7, .8, 2);
    });
    add(-3.7, -2.7, () => building(-4.7, -3.2, 1.35, .88, .94));
    add(2.1, -2.65, () => building(1.5, -3.1, 1.3, .75, .72));
    add(-1.15, -3.05, () => portal(-1.15, -3.05));
    for (const p of [[-4.45, .7, .95], [-3.8, 2.75, .8], [3.6, 2.7, .94], [4.5, -.75, .86], [.2, 3.05, .7]]) add(p[0], p[1], () => tree(...p));
    return items.sort((a, b) => a.depth - b.depth);
  }
  function draw() {
    if (dead) return;
    ctx.clearRect(0, 0, width, height); ground(); sceneActors().forEach(item => item.draw()); ctx.globalAlpha = 1;
  }
  function stop() { if (frame) cancelAnimationFrame(frame); frame = 0; last = null; }
  function canRun() { return !dead && visible && !document.hidden && !motion.matches; }
  function schedule() { if (canRun() && !frame) frame = requestAnimationFrame(tick); }
  function tick(stamp) {
    frame = 0; if (!canRun()) { last = null; return; }
    if (last === null || stamp - last >= 1000 / 30) {
      time += last === null ? 0 : Math.min((stamp - last) / 1000, .1); last = stamp; tilt += (targetTilt - tilt) * .07; draw();
    }
    schedule();
  }
  function resize() {
    if (dead) return;
    const box = canvas.getBoundingClientRect(); width = Math.max(1, box.width); height = Math.max(1, box.height); narrow = width < 700;
    dpr = Math.max(1, Math.min(devicePixelRatio || 1, 1.5));
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false;
    scale = Math.min(width / 12.8, height * .102); sprite = narrow ? 1.45 : Math.min(2.25, Math.max(1.8, width / 600));
    cx = width * .5; cy = height * (narrow ? .34 : .355); stop(); draw(); schedule();
  }
  function sync() { stop(); draw(); schedule(); }
  function motionChange() { stop(); tilt = targetTilt = 0; if (motion.matches) time = 1.8; draw(); schedule(); }
  function move(event) {
    if (motion.matches || event.pointerType === 'touch') return;
    const box = canvas.getBoundingClientRect(); targetTilt = clamp((event.clientX - box.left) / width) * 2 - 1;
  }
  function leave() { targetTilt = 0; }
  function cleanup() { if (dead) return; dead = true; stop(); resizeObserver?.disconnect(); intersectionObserver?.disconnect(); listeners.forEach(remove => remove()); }
  if ('ResizeObserver' in window) { resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas); } else listen(window, 'resize', resize);
  if ('IntersectionObserver' in window) { intersectionObserver = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }); intersectionObserver.observe(canvas); }
  listen(document, 'visibilitychange', sync); listen(motion, 'change', motionChange); listen(hero, 'pointermove', move); listen(hero, 'pointerleave', leave);
  listen(window, 'pagehide', event => { if (!event.persisted) cleanup(); }); resize(); return cleanup;
}
