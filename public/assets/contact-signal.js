/** Contact's signal exchange: two pixel wave sources and a shared transmission path. */
export function startContactSignal(canvas) {
  const ctx = canvas?.getContext('2d', { alpha: false });
  if (!ctx) return () => {};
  const surface = canvas.parentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const removers = [];
  const palette = ['#765299', '#a875df', '#be86ff', '#e4cfff'];
  let width = 1, height = 1, dpr = 1, step = 6, unit = 1;
  let points = [], sources = [], pulses = [];
  let time = 0, frame = 0, last = null, visible = true, dead = false;
  let resizeObserver, intersectionObserver;
  const pointer = { x: 0, y: 0, strength: 0, target: 0 };
  const clamp = n => Math.max(0, Math.min(1, n));
  function listen(target, event, fn) {
    target.addEventListener(event, fn, { passive: true });
    removers.push(() => target.removeEventListener(event, fn));
  }
  function pixel(x, y, size, alpha, color = 2) {
    if (alpha < .012) return;
    ctx.globalAlpha = clamp(alpha);
    ctx.fillStyle = palette[color];
    const side = Math.max(1, Math.round(size * dpr)) / dpr;
    ctx.fillRect(Math.round(x * dpr) / dpr, Math.round(y * dpr) / dpr, side, side);
  }
  function rebuild() {
    points = [];
    pulses = [];
    const centerY = height * (width < 700 ? .29 : .35);
    sources = [{ x: width * .28, y: centerY + width * .025 }, { x: width * .72, y: centerY - width * .025 }];
    unit = Math.max(90, Math.min(width * .31, height * .68));
    step = Math.max(4, Math.min(8, Math.sqrt(width * height / 15000)));
    for (let row = 0, y = 0; y < height; row++, y += step) {
      for (let col = 0, x = 0; x < width; col++, x += step) {
        const d1 = Math.hypot(x - sources[0].x, (y - sources[0].y) * 1.42) / unit;
        const d2 = Math.hypot(x - sources[1].x, (y - sources[1].y) * 1.42) / unit;
        const falloff = 1 - clamp((y / height - .5) / .45);
        points.push({ x, y, d1, d2, fade: falloff * falloff, sparse: (row * 7 + col * 11) % 9 === 0 });
      }
    }
  }
  function waves() {
    const phase = time * .75;
    for (const p of points) {
      if (p.fade < .01) continue;
      const wave1 = Math.pow(Math.max(0, Math.cos(p.d1 * 19 - phase)), 24);
      const wave2 = Math.pow(Math.max(0, Math.cos(p.d2 * 19 + phase * .82 + .8)), 24);
      const envelope = 1 / (1 + Math.min(p.d1, p.d2) * .52);
      const overlap = Math.min(wave1, wave2);
      let alpha = (Math.max(wave1, wave2) * .5 + overlap * .35) * envelope;
      let hot = overlap > .36;
      for (const pulse of pulses) {
        const distance = Math.hypot(p.x - pulse.x, (p.y - pulse.y) * 1.42) / unit;
        const age = time - pulse.start;
        const ring = Math.max(0, 1 - Math.abs(distance - age * .52) / .075);
        alpha += ring * clamp(1 - age / 3.4) * .7;
        hot ||= ring > .6;
      }
      const focus = pointer.strength * Math.max(0, 1 - Math.hypot(p.x - pointer.x, p.y - pointer.y) / (unit * .42));
      alpha = alpha * (1 + focus * .5) + focus * .045;
      if (alpha > .055) pixel(p.x, p.y, step * (hot ? .55 : .34), alpha * p.fade, hot ? 3 : 2);
      else if (p.sparse) pixel(p.x, p.y, step * .22, .065 * p.fade, 0);
    }
  }
  function exchange() {
    const [a, b] = sources;
    const samples = Math.max(20, Math.round((b.x - a.x) / (step * .72)));
    for (let lane = -1; lane <= 1; lane++) {
      for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const arch = Math.sin(t * Math.PI);
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t + arch * unit * lane * .2 + Math.sin(t * Math.PI * 4 - time * .6) * arch * unit * .023;
        const direction = lane === 0 ? -1 : 1;
        const position = ((t * 2 - time * .14 * direction + lane * .29) % 1 + 1) % 1;
        const packet = Math.pow(Math.max(0, 1 - position / .16), 2);
        pixel(x, y, step * (.3 + packet * .32), .19 + packet * .7, packet > .5 ? 3 : 1);
      }
    }
    for (let n = 0; n < sources.length; n++) {
      const source = sources[n];
      const breath = .7 + Math.sin(time * .75 + n * Math.PI) * .14;
      const size = Math.max(2, step * .6);
      // A small open diamond marks each origin, drawn on the same pixel lattice.
      for (let row = -4; row <= 4; row++) {
        const col = 4 - Math.abs(row);
        pixel(source.x - col * size, source.y + row * size, size * .8, breath, 3);
        if (col) pixel(source.x + col * size, source.y + row * size, size * .8, breath, 3);
      }
      pixel(source.x - size / 2, source.y - size / 2, size * 1.4, .9, 3);
    }
  }
  function draw() {
    if (dead) return;
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#08080a';
    ctx.fillRect(0, 0, width, height);
    waves();
    exchange();
    ctx.globalAlpha = 1;
    surface.classList.add('contact-signal-ready');
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
      time += last === null ? 0 : Math.min(.1, (timestamp - last) / 1000);
      last = timestamp;
      pointer.strength += (pointer.target - pointer.strength) * .12;
      pulses = pulses.filter(pulse => time - pulse.start < 3.4);
      draw();
    }
    schedule();
  }
  function resize() {
    if (dead) return;
    const bounds = canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, bounds.width), nextHeight = Math.max(1, bounds.height);
    const nextDpr = Math.max(1, Math.min(1.5, window.devicePixelRatio || 1));
    if (points.length && width === nextWidth && height === nextHeight && dpr === nextDpr) return;
    width = nextWidth; height = nextHeight; dpr = nextDpr;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    stop(); rebuild(); draw(); schedule();
  }
  function move(event) {
    if (reduced.matches || event.pointerType === 'touch') return;
    const bounds = canvas.getBoundingClientRect();
    pointer.x = event.clientX - bounds.left;
    pointer.y = event.clientY - bounds.top;
    pointer.target = 1;
  }
  function leave() { pointer.target = 0; }
  function send(event) {
    if (reduced.matches || event.target?.closest?.('a,button,input,textarea')) return;
    const bounds = canvas.getBoundingClientRect();
    pulses.push({ x: event.clientX - bounds.left, y: event.clientY - bounds.top, start: time });
    if (pulses.length > 3) pulses.shift();
  }
  function visibility() { stop(); if (visible && !document.hidden) { draw(); schedule(); } }
  function motionChange() {
    stop(); pulses = []; pointer.strength = pointer.target = 0;
    if (reduced.matches) time = 0;
    draw(); schedule();
  }
  function cleanup() {
    if (dead) return;
    dead = true; stop();
    resizeObserver?.disconnect(); intersectionObserver?.disconnect();
    removers.forEach(remove => remove());
    points = []; pulses = [];
  }
  listen(surface, 'pointermove', move);
  listen(surface, 'pointerleave', leave);
  listen(surface, 'pointercancel', leave);
  listen(surface, 'click', send);
  listen(document, 'visibilitychange', visibility);
  // Keep the renderer intact for back/forward cache restoration.
  listen(window, 'pagehide', event => { if (event.persisted) stop(); else cleanup(); });
  listen(window, 'pageshow', visibility);
  if (reduced.addEventListener) listen(reduced, 'change', motionChange);
  else {
    reduced.addListener(motionChange);
    removers.push(() => reduced.removeListener(motionChange));
  }
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas);
  } else listen(window, 'resize', resize);
  if (typeof IntersectionObserver !== 'undefined') {
    intersectionObserver = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? false; visibility();
    }, { threshold: .01 });
    intersectionObserver.observe(canvas);
  }
  resize();
  return cleanup;
}

const contactCanvas = document.querySelector('[data-contact-signal]');
if (contactCanvas) startContactSignal(contactCanvas);
