export const topographyStudies = [
  { name: 'Quiet summit', level: 'Minimal', description: 'One broad hill, a few open contours, and generous negative space.', hint: 'Move to gently displace the summit. Click or tap for one elevation pulse.', spacing: 14, bands: 8, size: 2.2, glow: false },
  { name: 'Twin peaks', level: 'Minimal', description: 'Two hills meet at a saddle. Their contours join and separate.', hint: 'Move to draw the nearest peak toward you. Click or tap to exchange their heights.', spacing: 13, bands: 10, size: 2.3, glow: false },
  { name: 'Pixel caldera', level: 'Graphic', description: 'A warped ring of ridges surrounds a deep, dark center.', hint: 'Move to carve the rim. Click or tap to send a ripple across the basin.', spacing: 12, bands: 11, size: 2.6, glow: true },
  { name: 'Ribbon ridge', level: 'Graphic', description: 'A long mountain spine folds into slowly migrating bends.', hint: 'Move to bend the ridge. Click or tap to reverse its travel.', spacing: 11, bands: 12, size: 2.4, glow: false },
  { name: 'Branching highlands', level: 'Structured', description: 'A main ridge branches into connected peaks and narrow valleys.', hint: 'Move to raise the terrain. Click or tap to emphasize another branch.', spacing: 11, bands: 13, size: 2.5, glow: true },
  { name: 'Island field', level: 'Structured', description: 'Separate contour islands emerge as a shared sea level slowly changes.', hint: 'Move to lift an island. Click or tap to create a temporary mound.', spacing: 10, bands: 14, size: 2.5, glow: true },
  { name: 'Fault shift', level: 'Intricate', description: 'Two terrain regions slide at different rates across a diagonal fault.', hint: 'Move to bend the fault. Click or tap to advance one side.', spacing: 10, bands: 16, size: 2.4, glow: false },
  { name: 'Eroded basin', level: 'Intricate', description: 'Winding valleys and secondary peaks carve into a continuous landscape.', hint: 'Move to carve a shallow valley. Click or tap to open an expanding crater.', spacing: 9, bands: 19, size: 2.3, glow: true },
  { name: 'Survey lens', level: 'Detailed', description: 'A sparse map reveals finer contour levels inside a moving survey window.', hint: 'Move the detail window. Click or tap to pin it; tap again to release.', spacing: 8, bands: 24, size: 2.2, glow: false },
  { name: 'Living atlas', level: 'Complex', description: 'Broad landforms, secondary hills, and fine ridges evolve at different speeds.', hint: 'Move to reshape neighboring contours. Click or tap to transition into new terrain.', spacing: 8, bands: 24, size: 2.3, glow: true }
];

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const modeNumber = value => clamp(Math.round(Number(value) || 1), 1, topographyStudies.length);
const gaussian = (u, v, x, y, sx, sy = sx) => Math.exp(-(((u - x) / sx) ** 2 + ((v - y) / sy) ** 2));
const islands = [[.18,.29,.13,.21],[.4,.2,.12,.19],[.64,.35,.17,.24],[.84,.58,.12,.21],[.48,.73,.17,.2],[.2,.69,.1,.15]];
function segmentDistanceSquared(u, v, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = clamp(((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy), 0, 1);
  return (u - ax - t * dx) ** 2 + (v - ay - t * dy) ** 2;
}

export function startTopography(canvas, initialMode = 1) {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return { setMode() {}, destroy() {} };
  const surface = canvas.parentElement, reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { u: .55, v: .42, strength: 0 }, target = { ...pointer };
  const lens = { u: .61, v: .4, pinned: false };
  let mode = modeNumber(initialMode), width = 1, height = 1, artHeight = 1;
  let columns = 1, rows = 1, stepX = 1, stepY = 1, samples = new Float32Array(4), opacity = new Float32Array(1);
  let time = 0, travel = 0, morph = 0, action = 0, last = 0, frame = 0, inView = true, touchTimer, press;
  let firstDraw = true, pulses = [];
  const removers = [];
  const listen = (element, name, handler) => {
    element.addEventListener(name, handler, { passive: true });
    removers.push(() => element.removeEventListener(name, handler));
  };

  function makeStamp(color) {
    const sprite = document.createElement('canvas'); sprite.width = sprite.height = 48;
    const paint = sprite.getContext('2d'), gradient = paint.createRadialGradient(24, 24, 1, 24, 24, 24);
    gradient.addColorStop(0, color + '70'); gradient.addColorStop(1, color + '00');
    paint.fillStyle = gradient; paint.fillRect(0, 0, 48, 48);
    paint.strokeStyle = color; paint.lineWidth = 1.9; paint.strokeRect(17, 17, 14, 14);
    return sprite;
  }
  const stamps = [makeStamp('#b87eff'), makeStamp('#e1c5ff')];

  function landscape(u, v, detail = false) {
    const drift = time * .012, phase = mode === 10 ? morph * .12 : 0;
    const x = u * 6.2 + Math.sin(v * 7 + drift) * .24 + phase;
    const y = v * 5.8 + Math.sin(u * 6 - drift) * .28 - phase * .4;
    let result = .5 + Math.sin(x + drift) * .17 + Math.cos(y * 1.3 - x * .55) * .14 + Math.sin(x * 1.6 + y * .85) * .11;
    const channel = Math.sin(x * 1.3 + Math.cos(y * 1.1));
    result -= Math.exp(-channel * channel * 20) * .13;
    if (detail) result += Math.sin(x * 3.1 + y * 1.7 + drift * 2) * .055 + Math.cos(y * 4.1 - x * 2.4 - drift * 1.5) * .038;
    return result;
  }

  function sample(u, v) {
    const t = time, pu = pointer.u, pv = pointer.v, strength = pointer.strength;
    const influence = gaussian(u, v, pu, pv, mode < 7 ? .16 : .21) * strength;
    let value = 0;
    switch (mode) {
      case 1: {
        const cx = .53 + (pu - .5) * strength * .12, cy = .43 + (pv - .45) * strength * .1;
        value = gaussian(u, v, cx, cy, .29, .4) * (.88 + Math.sin(t * .2) * .045);
        break;
      }
      case 2: {
        const swap = (1 - Math.cos(morph * Math.PI)) / 2;
        const nearA = (pu - .35) ** 2 + (pv - .4) ** 2 < (pu - .67) ** 2 + (pv - .51) ** 2;
        const pullA = nearA ? strength * .09 : 0, pullB = nearA ? 0 : strength * .09;
        const a = gaussian(u, v, .35 + (pu - .35) * pullA, .4 + (pv - .4) * pullA, .21, .33);
        const b = gaussian(u, v, .67 + (pu - .67) * pullB, .51 + (pv - .51) * pullB, .22, .3);
        value = a * (.68 + swap * .22) + b * (.9 - swap * .22) + Math.sin(t * .15) * (a - b) * .08;
        break;
      }
      case 3: {
        const dx = (u - .54) * 1.1, dy = (v - .45) * .85;
        const angle = Math.atan2(dy, dx), radius = Math.hypot(dx, dy);
        const rim = .255 + Math.sin(angle * 4 + t * .12) * .02 + Math.sin(angle * 7 - t * .08) * .006;
        value = Math.exp(-(((radius - rim) / .082) ** 2)) * .9 - influence * .27;
        break;
      }
      case 4: {
        const ridge = .43 + Math.sin(u * 7 + travel * .24) * .17 + (u - .5) * .16;
        const bend = Math.exp(-(((u - pu) / .2) ** 2)) * (pv - .45) * strength * .2;
        value = Math.exp(-(((v - ridge - bend) / .15) ** 2)) * (.82 + Math.sin(u * 5 - t * .12) * .09);
        break;
      }
      case 5: {
        const swing = Math.sin(t * .13) * .018;
        const main = Math.exp(-segmentDistanceSquared(u, v, .23, .76, .53, .26) / .0075);
        const upper = Math.exp(-segmentDistanceSquared(u, v, .4, .48, .79, .2 + swing) / .006);
        const lower = Math.exp(-segmentDistanceSquared(u, v, .36, .55, .78, .7 - swing) / .006);
        const emphasized = action % 3 === 0 ? main : action % 3 === 1 ? upper : lower;
        value = Math.max(main * .8, upper * .73, lower * .68) + Math.min(main + upper + lower, 1) * .1 + emphasized * .075 + influence * .13;
        break;
      }
      case 6: {
        for (let i = 0; i < islands.length; i++) {
          const [x, y, sx, sy] = islands[i];
          value += gaussian(u, v, x, y, sx, sy) * (.73 + Math.sin(t * .12 + i) * .07);
        }
        value += influence * .3 - .1 - Math.sin(t * .13) * .035;
        break;
      }
      case 7: {
        const bend = Math.exp(-(((v - pv) / .24) ** 2)) * (pu - .5) * strength * .2;
        const fault = .65 - v * .3 + bend + Math.sin(v * 5 + t * .08) * .018;
        const right = u > fault;
        const x = u + (right ? morph * .06 + t * .003 : -t * .002);
        value = .46 + Math.sin(x * 7 + v * 3) * .22 + Math.cos(v * 8 - x * 2) * .18 + (right ? .07 : -.04);
        break;
      }
      case 8: value = landscape(u, v) - influence * .19; break;
      case 9: value = landscape(u, v, true); break;
      case 10: value = landscape(u, v, true) + Math.sin(u * 18 - v * 13 + t * .05) * .025 + influence * .2; break;
    }
    if (mode !== 9) {
      for (const pulse of pulses) {
        const age = time - pulse.born, distance = Math.hypot((u - pulse.u) * 1.1, v - pulse.v);
        const decay = Math.exp(-age * .6);
        if (mode === 6) value += Math.exp(-distance * distance / .01) * decay * .55;
        else value += Math.exp(-(((distance - age * .075) / .075) ** 2)) * decay * (mode === 8 ? -.2 : .16);
      }
    }
    return value;
  }

  function draw() {
    const study = topographyStudies[mode - 1], stride = columns + 1;
    for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) samples[row * stride + col] = sample(col / columns, row / rows);
    ctx.clearRect(0, 0, width, height);
    const ease = firstDraw || reduced.matches ? 1 : .24;
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const index = row * stride + col, cell = row * columns + col;
      const h = samples[index], band = Math.floor(h * study.bands);
      const rightBand = Math.floor(samples[index + 1] * study.bands), downBand = Math.floor(samples[index + stride] * study.bands);
      const edge = h > .04 && (band !== rightBand || band !== downBand);
      const major = ((band % 4) + 4) % 4 === 0;
      let intensity = edge ? (major ? .93 : .6) : 0;
      if (mode === 9 && !major) {
        const du = Math.abs(col / columns - lens.u) / .18, dv = Math.abs(row / rows - lens.v) / .24;
        intensity *= clamp((1 - Math.max(du, dv)) * 9, 0, 1);
      }
      opacity[cell] += (intensity - opacity[cell]) * ease;
      if (opacity[cell] < .035) continue;
      const x = col * stepX, y = row * stepY, size = study.size * (major ? 1.22 : 1) * Math.min(1.35, Math.max(.9, width / 1000));
      ctx.globalAlpha = opacity[cell];
      if (study.glow) {
        const diameter = size * 3.3;
        ctx.drawImage(stamps[major ? 1 : 0], x - diameter / 2, y - diameter / 2, diameter, diameter);
      } else {
        ctx.strokeStyle = major ? '#ddbcff' : '#b780f5'; ctx.lineWidth = major ? 1.2 : .85;
        ctx.strokeRect(x - size / 2, y - size / 2, size, size);
      }
    }
    ctx.globalAlpha = 1; firstDraw = false; surface.classList.add('field-ready');
  }

  function allocate() {
    const spacing = topographyStudies[mode - 1].spacing;
    columns = Math.max(28, Math.ceil(Math.min(width, 1400) / spacing));
    rows = Math.max(28, Math.ceil(columns * artHeight / width));
    // Tall phone layouts retain a bounded sample budget.
    rows = Math.min(rows, 110);
    stepX = width / columns; stepY = artHeight / rows;
    samples = new Float32Array((columns + 1) * (rows + 1)); opacity = new Float32Array(columns * rows); firstDraw = true;
  }
  function tick(timestamp) {
    frame = 0;
    if (!inView || document.hidden || reduced.matches) return;
    if (!last || timestamp - last >= 1000 / 30) {
      const delta = last ? Math.min(.07, (timestamp - last) / 1000) : 0;
      last = timestamp; time += delta; travel += delta * (action % 2 ? -1 : 1);
      morph += (action - morph) * .06;
      pointer.u += (target.u - pointer.u) * .1; pointer.v += (target.v - pointer.v) * .1; pointer.strength += (target.strength - pointer.strength) * .08;
      if (!lens.pinned) { lens.u += (pointer.u - lens.u) * .14; lens.v += (pointer.v - lens.v) * .14; }
      pulses = pulses.filter(pulse => time - pulse.born < 7);
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    if (reduced.matches) { firstDraw = true; draw(); }
    else if (inView && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function resize() {
    const bounds = surface.getBoundingClientRect(); width = Math.max(1, bounds.width); height = Math.max(1, bounds.height); artHeight = height * .8;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    allocate(); draw(); sync();
  }
  function point(event) {
    const bounds = surface.getBoundingClientRect(); target.u = clamp((event.clientX - bounds.left) / width, 0, 1); target.v = clamp((event.clientY - bounds.top) / artHeight, 0, 1); target.strength = 1;
  }
  listen(surface, 'pointermove', event => {
    if (!reduced.matches) point(event);
    if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) press.moved = true;
  });
  listen(surface, 'pointerdown', event => {
    if (event.target.closest?.('a,button,select')) return;
    press = { x: event.clientX, y: event.clientY, id: event.pointerId, moved: false };
  });
  listen(surface, 'pointerup', event => {
    const start = press; press = null;
    if (!start || start.moved || start.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10 || event.target.closest?.('a,button,select')) return;
    point(event); pointer.u = target.u; pointer.v = target.v; pointer.strength = 1; action++;
    if (mode === 9) { lens.pinned = !lens.pinned; lens.u = pointer.u; lens.v = pointer.v; }
    else if (![2, 4, 5, 7, 10].includes(mode)) { pulses.push({ u: pointer.u, v: pointer.v, born: time }); pulses = pulses.slice(-4); }
    if (reduced.matches) morph = action;
    firstDraw = reduced.matches; draw();
    if (event.pointerType === 'touch') { clearTimeout(touchTimer); touchTimer = setTimeout(() => { target.strength = 0; }, 1800); }
  });
  listen(surface, 'pointerleave', () => { target.strength = 0; press = null; });
  listen(surface, 'pointercancel', () => { target.strength = 0; press = null; });
  listen(document, 'visibilitychange', sync); listen(reduced, 'change', sync);
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(surface);
  const observer = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; sync(); }); observer.observe(surface);
  resize();
  return {
    setMode(value) {
      mode = modeNumber(value); time = travel = morph = action = 0; pulses = []; press = null; clearTimeout(touchTimer);
      pointer.u = target.u = .55; pointer.v = target.v = .42; pointer.strength = target.strength = 0;
      lens.pinned = false; lens.u = .61; lens.v = .4;
      allocate(); draw(); sync();
    },
    destroy() { cancelAnimationFrame(frame); clearTimeout(touchTimer); resizeObserver.disconnect(); observer.disconnect(); removers.forEach(remove => remove()); }
  };
}
