// A real-time field of square light cells. No video, image loop, or library.
export function fieldPoint(column, row, time, width, height, pointer) {
  const depth = row;
  const perspective = 0.3 + depth * 1.5;
  const wave = Math.sin(column * 3.1 + depth * 5.8 - time * 0.24) * 0.14
    + Math.cos(column * 4.3 - depth * 3.2 + time * 0.17) * 0.065;
  let x = width * 0.51 + column * width * 0.66 * perspective;
  let y = height * (-0.035 + depth * 0.7 + wave * perspective * 0.64);
  let wake = 0;
  if (pointer.strength > 0) {
    const dx = (x - pointer.x) / width;
    const dy = (y - pointer.y) / width;
    const distance = Math.hypot(dx, dy);
    const envelope = Math.exp(-distance * distance * 48) * pointer.strength;
    wake = Math.sin(distance * 33 - time * 1.35) * envelope;
    y += wake * height * 0.027;
    x += dx * envelope * width * 0.035;
  }
  const current = Math.pow(0.5 + 0.5 * Math.sin(column * 5.5 + depth * 8 - time * 0.32), 5);
  return { x, y, depth, current, wake };
}

export function startPixelField(canvas) {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return; // The original artwork remains a no-canvas fallback.
  const hero = canvas.closest('.hero');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const pointer = { x: 0, y: 0, strength: 0 };
  const target = { x: 0, y: 0, strength: 0 };
  let width = 0, height = 0, columns = 0, rows = 0;
  let frame = 0, previous = 0, time = 0, visible = true;
  let cells = [];

  function makeCell(color, filled) {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const brush = sprite.getContext('2d');
    const glow = brush.createRadialGradient(32, 32, 2, 32, 32, 30);
    glow.addColorStop(0, color + '70');
    glow.addColorStop(0.35, color + '28');
    glow.addColorStop(1, color + '00');
    brush.fillStyle = glow;
    brush.fillRect(0, 0, 64, 64);
    brush.strokeStyle = color;
    brush.lineWidth = 2.5;
    brush.strokeRect(22, 22, 20, 20);
    if (filled) {
      brush.fillStyle = color;
      brush.fillRect(25, 25, 14, 14);
    }
    return sprite;
  }

  const sprites = [makeCell('#af73ff', false), makeCell('#dab8ff', false), makeCell('#eddbff', true)];

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';
    for (const cell of cells) {
      const point = fieldPoint(cell.column, cell.row, time, width, height, pointer);
      if (point.x < -30 || point.x > width + 30 || point.y < -30 || point.y > height + 30) continue;
      const energy = point.current + Math.abs(point.wake) * 0.5;
      const lit = energy > 0.65;
      const sprite = sprites[lit && cell.seed > 0.77 ? 2 : lit ? 1 : 0];
      const size = (9 + point.depth * 15) * Math.min(1.2, Math.max(0.8, width / 1280));
      ctx.globalAlpha = Math.min(1, 0.38 + point.depth * 0.22 + energy * 0.38 + cell.seed * 0.08);
      ctx.drawImage(sprite, point.x - size / 2, point.y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function tick(timestamp) {
    frame = 0;
    if (reduced.matches || !visible || document.hidden) return;
    // Cap at 30 fps and discard time spent in a background tab.
    if (!previous || timestamp - previous >= 1000 / 30) {
      const elapsed = previous ? Math.min(0.07, (timestamp - previous) / 1000) : 0;
      previous = timestamp;
      time += elapsed;
      pointer.x += (target.x - pointer.x) * 0.09;
      pointer.y += (target.y - pointer.y) * 0.09;
      pointer.strength += (target.strength - pointer.strength) * 0.07;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }

  function synchronize() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    if (reduced.matches) {
      time = 0;
      pointer.strength = target.strength = 0;
      draw();
    } else if (visible && !document.hidden) frame = requestAnimationFrame(tick);
  }

  function resize() {
    const bounds = hero.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    columns = width < 700 ? 50 : 94;
    rows = width < 700 ? 48 : 66;
    cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        const noise = Math.sin(c * 127.1 + r * 311.7) * 43758.5453;
        cells.push({ column: c / (columns - 1) * 2 - 1, row: r / (rows - 1), seed: noise - Math.floor(noise) });
      }
    }
    pointer.x = target.x = width / 2;
    pointer.y = target.y = height / 3;
    draw();
    hero.classList.add('field-ready');
    synchronize();
  }

  hero.addEventListener('pointermove', event => {
    if (!finePointer.matches || reduced.matches) return;
    const bounds = hero.getBoundingClientRect();
    target.x = event.clientX - bounds.left;
    target.y = event.clientY - bounds.top;
    target.strength = 1;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { target.strength = 0; });
  document.addEventListener('visibilitychange', synchronize);
  reduced.addEventListener('change', synchronize);
  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    synchronize();
  }, { threshold: 0 }).observe(hero);
  resize();
}
