export const experiments = [
  { name: 'Magnetic weave', description: 'A tensioned grid bends around you.', hint: 'Move to pull the mesh. Click or tap to send a wave.' },
  { name: 'Orbital array', description: 'Square satellites follow intersecting orbits.', hint: 'Move to tilt the orbits. Click or tap to launch a pulse.' },
  { name: 'Voxel chamber', description: 'Explore the interior of a rotating pixel volume.', hint: 'Move to open a cavity. Click or tap to reveal the layers.' },
  { name: 'Growing city', description: 'A procedural skyline responds to your position.', hint: 'Move to raise a district. Click or tap to regenerate the city.' },
  { name: 'Signal circuit', description: 'Send light through an angular network.', hint: 'Move to illuminate routes. Click or tap to inject a signal.' },
  { name: 'Kinetic folds', description: 'A tiled surface opens along moving creases.', hint: 'Move to lift the folds. Click or tap to reverse their direction.' },
  { name: 'Assembly swarm', description: 'A cloud of pixels resolves into different structures.', hint: 'Move to part the swarm. Click or tap to change its structure.' },
  { name: 'Nested thresholds', description: 'Travel through a corridor of luminous frames.', hint: 'Move to steer the corridor. Click or tap for a traveling pulse.' },
  { name: 'Pixel topography', description: 'Contours ripple through a living height field.', hint: 'Move to reshape the contours. Click or tap to create a crater.' },
  { name: 'Recursive windows', description: 'A composition of nested squares divides around you.', hint: 'Move to subdivide the nearest region. Click or tap for a new arrangement.' }
];

const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const noise = (a, b = 0) => { const value = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return value - Math.floor(value); };

export function startHeroExperiment(canvas, initialMode = 1) {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return { setMode() {}, destroy() {} };
  const surface = canvas.parentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: 0, y: 0, strength: 0 };
  const target = { x: 0, y: 0, strength: 0 };
  let mode = clamp(Math.round(Number(initialMode) || 1), 1, 10);
  let width = 1, height = 1, unit = 1, time = 0, last = 0, frame = 0;
  let action = 0, actionTime = -100, foldPhase = 0, inView = true, touchTimer, pointerStart;
  const signalOrigin = { x: 0, y: 0 };
  let swarm = [], resizeObserver, intersectionObserver;
  const listeners = [];
  const listen = (element, name, callback) => { element.addEventListener(name, callback, { passive: true }); listeners.push(() => element.removeEventListener(name, callback)); };

  function sprite(color, solid) {
    const result = document.createElement('canvas'); result.width = result.height = 48;
    const paint = result.getContext('2d');
    const glow = paint.createRadialGradient(24, 24, 1, 24, 24, 24);
    glow.addColorStop(0, color + '66'); glow.addColorStop(1, color + '00');
    paint.fillStyle = glow; paint.fillRect(0, 0, 48, 48);
    paint.strokeStyle = color; paint.lineWidth = 1.6; paint.strokeRect(17, 17, 14, 14);
    if (solid) { paint.fillStyle = color; paint.fillRect(19, 19, 10, 10); }
    return result;
  }
  const stamps = [sprite('#b274ff', false), sprite('#dfbeff', false), sprite('#f4e5ff', true)];

  function dot(x, y, size = 3, alpha = .7, hot = false) {
    if (!Number.isFinite(x + y + size) || size <= 0 || x < -50 || x > width + 50 || y < -50 || y > height + 50) return;
    ctx.globalAlpha = clamp(alpha, 0, 1);
    const diameter = size * 3;
    ctx.drawImage(stamps[hot ? 2 : alpha > .8 ? 1 : 0], x - diameter / 2, y - diameter / 2, diameter, diameter);
  }
  function line(points, alpha = .25, thickness = 1, closed = false) {
    if (points.length < 2) return;
    ctx.globalAlpha = clamp(alpha, 0, 1); ctx.strokeStyle = '#c493ff'; ctx.lineWidth = thickness;
    ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    if (closed) ctx.closePath(); ctx.stroke();
  }
  function project(x, y, z, yaw = .25, pitch = .3) {
    const rx = x * Math.cos(yaw) - z * Math.sin(yaw);
    const rz = x * Math.sin(yaw) + z * Math.cos(yaw);
    const ry = y * Math.cos(pitch) - rz * Math.sin(pitch);
    const depth = y * Math.sin(pitch) + rz * Math.cos(pitch);
    const scale = 4.8 / (5.4 + depth);
    return { x: width * .5 + rx * unit * scale, y: height * .36 + ry * unit * scale, scale };
  }
  function proximity(x, y, radius = .18) {
    const dx = (x - (pointer.x + 1) * width / 2) / width;
    const dy = (y - (pointer.y + 1) * height / 2) / width;
    return Math.exp(-(dx * dx + dy * dy) / (radius * radius)) * pointer.strength;
  }
  function pulse(distance = 0) {
    const age = time - actionTime;
    return age < 8 ? Math.exp(-age * .55) * Math.sin(distance * 6 - age * 4) : 0;
  }

  function weave() {
    const columns = width < 700 ? 36 : 60, rows = 33;
    for (let r = 0; r < rows; r++) {
      const trail = [];
      for (let c = 0; c < columns; c++) {
        const x = (c / (columns - 1) - .5) * 5, z = (r / (rows - 1) - .5) * 3.7;
        const distance = Math.hypot(x - pointer.x * 2.3, z - pointer.y * 1.8);
        const tug = Math.exp(-distance * distance * 1.4) * pointer.strength;
        const y = Math.sin(x * 1.7 + time * .35) * .13 + Math.sin(z * 2 - time * .3) * .17 - tug * .8 + pulse(distance) * .12;
        const p = project(x, y, z, -.1, .75);
        trail.push(p); dot(p.x, p.y, 2.2 * p.scale, .4 + tug * .5 + r / rows * .25, tug > .7);
      }
      line(trail, r % 4 === 0 ? .35 : .1);
    }
  }

  function orbits() {
    for (let band = 0; band < 7; band++) {
      const trail = [], tilt = band * .4 + .2;
      for (let i = 0; i < 120; i++) {
        const a = i / 120 * TAU + time * (.05 + band * .014);
        const radius = 1.45 + band * .09;
        const p = project(Math.cos(a) * radius, Math.sin(a) * radius * Math.cos(tilt), Math.sin(a) * radius * Math.sin(tilt), time * .06 + pointer.x * .6, pointer.y * .4);
        trail.push(p);
        const packet = Math.pow((Math.sin(a * 2 - time * 1.2 - band + pulse(band) * 2) + 1) / 2, 18);
        dot(p.x, p.y, (2.2 + packet * 2.6) * p.scale, .35 + packet * .65, packet > .6);
      }
      line(trail, .13, 1, true);
    }
  }

  function voxels() {
    const count = width < 700 ? 9 : 12;
    for (let z = 0; z < count; z++) for (let y = 0; y < count; y++) for (let x = 0; x < count; x++) {
      const px = (x / (count - 1) - .5) * 2.7, py = (y / (count - 1) - .5) * 2.7, pz = (z / (count - 1) - .5) * 2.7;
      const p = project(px, py, pz, .6 + time * .09 + pointer.x * .35, -.2 + pointer.y * .2);
      const near = proximity(p.x, p.y, .12);
      const shell = x === 0 || x === count - 1 || y === 0 || y === count - 1 || z === 0 || z === count - 1;
      const reveal = Math.max(0, pulse(pz));
      const alpha = (shell ? .68 : .28 + reveal * .65) * (1 - near * .92);
      dot(p.x + near * (p.x - width / 2) * .08, p.y, 3.1 * p.scale, alpha, reveal > .7);
    }
  }

  function city() {
    const count = width < 700 ? 12 : 17;
    for (let depth = 0; depth < count * 2 - 1; depth++) for (let x = 0; x < count; x++) {
      const z = depth - x; if (z < 0 || z >= count) continue;
      const gx = (x - count / 2) * .24, gz = (z - count / 2) * .24;
      const base = project(gx, .55, gz, .78, .64);
      const heightValue = noise(x + action * 3, z) * .85 + .08 + proximity(base.x, base.y, .2) * .7;
      const growth = .82 + Math.sin(time * .4 + x * .5 + z * .3) * .18;
      const top = .55 - heightValue * growth;
      const corners = [[gx, gz], [gx + .17, gz], [gx + .17, gz + .17], [gx, gz + .17]];
      const upper = corners.map(([cx, cz]) => project(cx, top, cz, .78, .64));
      const lower = corners.map(([cx, cz]) => project(cx, .55, cz, .78, .64));
      ctx.globalAlpha = .42; ctx.fillStyle = '#160b26'; ctx.beginPath();
      ctx.moveTo(upper[0].x, upper[0].y); for (const p of upper.slice(1)) ctx.lineTo(p.x, p.y); ctx.closePath(); ctx.fill();
      line(upper, .65, 1, true);
      for (let i = 0; i < 4; i++) line([upper[i], lower[i]], .27);
      if (heightValue > .75) dot(upper[0].x, upper[0].y, 2.2, .85, true);
    }
  }

  function circuits() {
    const step = width < 700 ? 28 : 38, columns = Math.ceil(width / step), rows = Math.ceil(height * .7 / step);
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const x = col * step + step / 2, y = row * step + step / 2;
      const choice = noise(col, row), near = proximity(x, y, .2);
      const originX = Math.floor((signalOrigin.x + 1) * width / 2 / step) * step + step / 2;
      const originY = Math.floor((signalOrigin.y + 1) * height / 2 / step) * step + step / 2;
      const age = time - actionTime;
      const distance = (Math.abs(x - originX) + Math.abs(y - originY)) / step;
      const injection = age >= 0 && age < 8 ? Math.exp(-(((distance - age * 7) / 1.5) ** 2)) * Math.exp(-age * .2) : 0;
      const end = choice > .5 ? { x: x + step, y } : { x, y: y + step };
      line([{ x, y }, end], .12 + near * .35 + injection * .6);
      dot(x, y, 2 + injection * 2, .3 + near * .4 + injection * .6, injection > .3);
      const phase = (time * .38 + noise(row, col)) % 1;
      if (choice > .68 || near > .3 || injection > .3) dot(x + (end.x - x) * phase, y + (end.y - y) * phase, 3, .95, true);
    }
  }

  function folds() {
    const rows = 18, columns = width < 700 ? 24 : 36;
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const x = (col / columns - .5) * 5.3, z = (row / rows - .5) * 3.5;
      const hinge = Math.sin(row * .62 + foldPhase + pointer.x * 1.3);
      const y = Math.abs(hinge) * .58 - .25 + pointer.y * .18;
      const tilt = Math.cos(row * .62 + foldPhase) * .14;
      const points = [[x, y, z], [x + .105, y, z], [x + .105, y + tilt, z + .125], [x, y + tilt, z + .125]].map(p => project(...p, -.2, .85));
      line(points, .4 + Math.abs(hinge) * .42, 1, true);
      if (col % 9 === 0) dot(points[0].x, points[0].y, 2, .8);
    }
  }

  function assemble() {
    const count = swarm.length;
    for (let i = 0; i < count; i++) {
      const point = swarm[i], u = (i + .5) / count, theta = i * 2.399963;
      let x, y, z;
      if (action % 3 === 0) {
        y = (u * 2 - 1) * 1.7; const r = Math.sqrt(Math.max(0, 1 - (y / 1.7) ** 2)) * 1.7;
        x = Math.cos(theta) * r; z = Math.sin(theta) * r;
      } else if (action % 3 === 1) {
        const side = i % 6, a = noise(i, 1) * 2.8 - 1.4, b = noise(i, 2) * 2.8 - 1.4;
        [x, y, z] = side < 2 ? [side ? 1.4 : -1.4, a, b] : side < 4 ? [a, side === 3 ? 1.4 : -1.4, b] : [a, b, side === 5 ? 1.4 : -1.4];
      } else { const a = u * TAU * 5; x = Math.cos(a) * 1.3; z = Math.sin(a) * 1.3; y = (u - .5) * 3.4; }
      const rate = reduced.matches ? 1 : .055;
      point.x += (x - point.x) * rate; point.y += (y - point.y) * rate; point.z += (z - point.z) * rate;
      const p = project(point.x, point.y, point.z, time * .12 + pointer.x * .15, .15);
      const near = proximity(p.x, p.y, .15), dx = p.x - (pointer.x + 1) * width / 2, dy = p.y - (pointer.y + 1) * height / 2;
      dot(p.x + dx * near * .65, p.y + dy * near * .65, 2.4 * p.scale, .35 + p.scale * .3, near > .7);
    }
  }

  function thresholds() {
    const center = { x: width * (.5 + pointer.x * .13), y: height * (.32 + pointer.y * .1) };
    for (let i = 42; i >= 0; i--) {
      const phase = ((i / 43 + time * .045) % 1), depth = .1 + phase * 2.8;
      const size = unit * .52 / depth * (1 + pulse(depth) * .07);
      const angle = depth * .18 + Math.sin(time * .12) * .12;
      const points = [];
      for (let corner = 0; corner < 4; corner++) {
        const a = Math.PI / 4 + corner * Math.PI / 2 + angle;
        points.push({ x: center.x + Math.cos(a) * size * 1.8, y: center.y + Math.sin(a) * size });
      }
      line(points, clamp(1 - phase, .12, .8), 1.3, true);
      for (const p of points) dot(p.x, p.y, 2 + (1 - phase) * 3, .9);
    }
  }

  function contours() {
    const step = width < 700 ? 11 : 12;
    const level = (x, y) => {
      const nx = x / width * 5, ny = y / height * 5;
      const distance = Math.hypot(nx - (pointer.x + 1) * 2.5, ny - (pointer.y + 1) * 2.5);
      return Math.sin(nx * 1.8 + time * .16) + Math.cos(ny * 2.1 - time * .1) + Math.sin(nx + ny * 1.4) * .7 - Math.exp(-distance * distance) * pointer.strength * 1.8 + pulse(distance) * .45;
    };
    for (let y = 0; y < height * .76; y += step) for (let x = 0; x < width; x += step) {
      const value = level(x, y), terrace = Math.floor(value * 4);
      if (terrace !== Math.floor(level(x + step, y) * 4) || terrace !== Math.floor(level(x, y + step) * 4)) {
        dot(x, y, 2.4 + (terrace % 3 === 0 ? .7 : 0), .45 + (Math.sin(value) + 1) * .2, Math.abs(value) < .16);
      }
    }
  }

  function windows() {
    const margin = width < 700 ? 20 : 45, top = 22;
    const activeX = (pointer.x + 1) * width / 2, activeY = (pointer.y + 1) * height / 2;
    function branch(x, y, w, h, depth, seed) {
      const inside = pointer.strength > .1 && activeX > x && activeX < x + w && activeY > y && activeY < y + h;
      const split = depth < 2 || (depth < 5 && w > 30 && h > 25 && (inside || noise(seed + action, depth) > .53));
      const inset = 4 + Math.sin(time * .35 + seed) * 1.4;
      line([{ x: x + inset, y: y + inset }, { x: x + w - inset, y: y + inset }, { x: x + w - inset, y: y + h - inset }, { x: x + inset, y: y + h - inset }], inside ? .9 : .22 + depth * .1, inside ? 1.5 : 1, true);
      if (split) {
        const ratio = .4 + noise(seed, depth) * .2;
        if (w / h > 1.35) { branch(x, y, w * ratio, h, depth + 1, seed * 2 + 1); branch(x + w * ratio, y, w * (1 - ratio), h, depth + 1, seed * 2 + 2); }
        else { branch(x, y, w, h * ratio, depth + 1, seed * 2 + 1); branch(x, y + h * ratio, w, h * (1 - ratio), depth + 1, seed * 2 + 2); }
      } else if (inside || noise(seed) > .65) dot(x + w / 2, y + h / 2, 3, .85, true);
    }
    branch(margin, top, width - margin * 2, height * .67, 0, 1);
  }

  const renderers = [weave, orbits, voxels, city, circuits, folds, assemble, thresholds, contours, windows];
  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
    renderers[mode - 1]();
    ctx.globalAlpha = 1;
    surface.classList.add('field-ready');
  }
  function tick(timestamp) {
    frame = 0;
    if (!inView || document.hidden || reduced.matches) return;
    if (!last || timestamp - last >= 1000 / 30) {
      const delta = last ? Math.min(.07, (timestamp - last) / 1000) : 0;
      time += delta;
      foldPhase += delta * .45 * (action % 2 ? -1 : 1);
      last = timestamp;
      pointer.x += (target.x - pointer.x) * .08; pointer.y += (target.y - pointer.y) * .08;
      pointer.strength += (target.strength - pointer.strength) * .08;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    if (reduced.matches) { pointer.strength = 0; draw(); }
    else if (inView && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function reset() {
    action = 0; actionTime = -100; time = 0; foldPhase = 0;
    swarm = Array.from({ length: width < 700 ? 650 : 1000 }, (_, i) => ({ x: (noise(i, 1) - .5) * 4, y: (noise(i, 2) - .5) * 3, z: (noise(i, 3) - .5) * 4 }));
  }
  function resize() {
    const bounds = surface.getBoundingClientRect(); width = Math.max(1, bounds.width); height = Math.max(1, bounds.height);
    unit = Math.min(width * .26, height * .36);
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (!swarm.length) reset();
    draw(); sync();
  }
  function point(event) {
    const bounds = surface.getBoundingClientRect();
    target.x = clamp((event.clientX - bounds.left) / width * 2 - 1, -1, 1);
    target.y = clamp((event.clientY - bounds.top) / height * 2 - 1, -1, 1);
    target.strength = 1;
  }
  listen(surface, 'pointermove', event => { if (!reduced.matches) point(event); });
  listen(surface, 'pointerleave', () => { target.strength = 0; pointerStart = null; });
  listen(surface, 'pointerdown', event => {
    if (event.target.closest?.('a,button')) return;
    pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  });
  listen(surface, 'pointercancel', () => { pointerStart = null; target.strength = 0; });
  listen(surface, 'pointerup', event => {
    const start = pointerStart; pointerStart = null;
    if (!start || start.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10 || event.target.closest?.('a,button')) return;
    point(event); pointer.x = target.x; pointer.y = target.y; pointer.strength = 1;
    signalOrigin.x = target.x; signalOrigin.y = target.y;
    action++; actionTime = time; draw();
    if (event.pointerType === 'touch') { clearTimeout(touchTimer); touchTimer = setTimeout(() => { target.strength = 0; }, 1800); }
  });
  listen(document, 'visibilitychange', sync); listen(reduced, 'change', sync);
  resizeObserver = new ResizeObserver(resize); resizeObserver.observe(surface);
  intersectionObserver = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; sync(); }); intersectionObserver.observe(surface);
  resize();
  return {
    setMode(value) { mode = clamp(Math.round(Number(value) || 1), 1, 10); reset(); draw(); sync(); },
    destroy() { cancelAnimationFrame(frame); clearTimeout(touchTimer); resizeObserver.disconnect(); intersectionObserver.disconnect(); listeners.forEach(remove => remove()); }
  };
}
