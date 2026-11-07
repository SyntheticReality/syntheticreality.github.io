/** Code-native lunar mission schematic. All copy and controls belong in HTML. */
export function startMissionMap(canvas) {
  const context = canvas?.getContext?.('2d', { alpha: false });
  if (!context) return { setStage() {}, destroy() {} };

  const palette = {
    ink: '#08080a', purple: '#be95ff', silver: '#b5bcc4', navy: '#1b2636',
  };
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cache = document.createElement('canvas');
  const ground = cache.getContext('2d', { alpha: false });
  const routes = [
    [[.18, .73], [.28, .73], [.28, .61], [.42, .61], [.42, .46], [.54, .46], [.54, .29]],
    [[.54, .29], [.67, .29], [.67, .42], [.79, .42], [.79, .54], [.90, .54]],
  ];
  const branches = [
    [[.28, .61], [.15, .61], [.15, .44], [.06, .44]],
    [[.42, .46], [.29, .46], [.29, .29], [.20, .29]],
    [[.54, .46], [.54, .66], [.65, .66], [.65, .83]],
    [[.67, .42], [.67, .57], [.79, .57], [.79, .75]],
    [[.67, .29], [.67, .15], [.80, .15]],
  ];
  const nodes = [routes[0][0], routes[0].at(-1), routes[1].at(-1)];
  const allPaths = [...routes, ...branches];
  const stageWeights = [1, 0, 0];
  let selectedStage = 0;
  let reducedMotion = motionQuery.matches;
  let width = 1;
  let height = 1;
  let dpr = 1;
  let unit = 1;
  let centerX = 0;
  let centerY = 0;
  let request = 0;
  let lastPaint = 0;
  let lastStep = 0;
  let animationTime = 0;
  let inView = true;
  let disposed = false;

  function hash(x, y) {
    const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return value - Math.floor(value);
  }

  function segmentDistance(x, y, a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
  }

  function elevation(x, y) {
    const peak = (px, py, spread, strength) => Math.exp(-((x - px) ** 2 + (y - py) ** 2) / spread) * strength;
    const ridge = peak(.21, .21, .065, .77) + peak(.82, .78, .048, .69)
      + peak(.42, .87, .03, .42) + peak(.83, .19, .022, .47);
    let distance = 1;
    for (const path of allPaths) {
      for (let i = 1; i < path.length; i++) {
        distance = Math.min(distance, segmentDistance(x, y, path[i - 1], path[i]));
      }
    }
    const channel = Math.min(1, distance / .043);
    return Math.round((.065 + ridge * channel) * 14) / 14;
  }

  function project(point, floor = false) {
    const [x, y] = point;
    const z = floor ? .046 : elevation(x, y);
    return [
      Math.round(centerX + (x - y) * unit * .65),
      Math.round(centerY + (x + y - 1) * unit * .305 - z * unit * .20),
    ];
  }

  function polygon(ctx, points, fill, stroke) {
    ctx.beginPath();
    points.forEach((point, index) => index ? ctx.lineTo(...point) : ctx.moveTo(...point));
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = .65; ctx.stroke(); }
  }

  function pathPoints(path) {
    return path.map(point => project(point, true));
  }

  function line(ctx, points, color, lineWidth, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'butt';
    ctx.beginPath();
    points.forEach((point, index) => index ? ctx.lineTo(...point) : ctx.moveTo(...point));
    ctx.stroke();
    ctx.restore();
  }

  function corner(ctx, x, y, xDirection, yDirection, alpha = .25) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = palette.silver;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + xDirection * 12, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + yDirection * 12);
    ctx.stroke();
    ctx.restore();
  }

  function buildTerrain() {
    ground.setTransform(dpr, 0, 0, dpr, 0, 0);
    ground.fillStyle = palette.ink;
    ground.fillRect(0, 0, width, height);

    // A sparse registration grid stays quiet beneath the raised terrain.
    for (let x = 21; x < width; x += 28) {
      for (let y = 21; y < height; y += 28) {
        ground.fillStyle = 'rgba(181,188,196,.065)';
        ground.fillRect(x, y, 1, 1);
      }
    }
    const footprint = [[0, 0], [1, 0], [1, 1], [0, 1]].map(point => project(point, true));
    polygon(ground, footprint.map(([x, y]) => [x, y + unit * .045]), '#0c1017', '#202530');
    polygon(ground, [footprint[1], footprint[2],
      [footprint[2][0], footprint[2][1] + unit * .045],
      [footprint[1][0], footprint[1][1] + unit * .045]], '#0b0e14', '#202530');
    polygon(ground, [footprint[2], footprint[3],
      [footprint[3][0], footprint[3][1] + unit * .045],
      [footprint[2][0], footprint[2][1] + unit * .045]], '#10131b', '#202530');

    const resolution = 31;
    for (let diagonal = 0; diagonal < resolution * 2; diagonal++) {
      for (let x = 0; x < resolution; x++) {
        const y = diagonal - x;
        if (y < 0 || y >= resolution) continue;
        const a = [x / resolution, y / resolution];
        const b = [(x + 1) / resolution, y / resolution];
        const c = [(x + 1) / resolution, (y + 1) / resolution];
        const d = [x / resolution, (y + 1) / resolution];
        const level = elevation((x + .5) / resolution, (y + .5) / resolution);
        const shade = Math.round(15 + level * 12 + hash(x, y) * 3);
        const fill = `rgb(${shade},${shade + 3},${shade + 9})`;
        const outline = level > .22 ? 'rgba(114,132,153,.17)' : 'rgba(81,102,125,.10)';
        polygon(ground, [a, b, c, d].map(point => project(point)), fill, outline);

        // Quantized contour edges give the hills their stepped, pixel-cut profile.
        if (level > .14 && Math.abs(level - elevation((x + 1.5) / resolution, (y + .5) / resolution)) > .04) {
          line(ground, [project(b), project(c)], '#8b97a8', .75, .14 + level * .12);
        }
        if (level > .14 && Math.abs(level - elevation((x + .5) / resolution, (y + 1.5) / resolution)) > .04) {
          line(ground, [project(c), project(d)], '#8b97a8', .75, .10 + level * .10);
        }
        if (hash(x + 30, y) > .969 && level > .16) {
          const point = project([(x + .5) / resolution, (y + .5) / resolution]);
          ground.fillStyle = 'rgba(181,188,196,.16)';
          ground.fillRect(point[0], point[1], 2, 1);
        }
      }
    }

    // The dark cut and parallel walls read as excavated, branching tunnels.
    for (const path of allPaths) {
      const points = pathPoints(path);
      line(ground, points, '#394151', Math.max(5, unit * .012), .60);
      line(ground, points, palette.ink, Math.max(3, unit * .008), 1);
    }
    for (const path of branches) {
      const points = pathPoints(path);
      line(ground, points, '#727b8d', .8, .28);
      const end = points.at(-1);
      ground.fillStyle = '#536074';
      ground.fillRect(end[0] - 1, end[1] - 1, 2, 2);
    }
    for (const path of routes) line(ground, pathPoints(path), palette.silver, 1, .20);

    // Small square edge marks, never fabricated data or coordinates.
    for (const fraction of [.2, .4, .6, .8]) {
      const a = project([fraction, 1], true);
      const b = project([1, fraction], true);
      line(ground, [[a[0], a[1] + 5], [a[0] - 4, a[1] + 7]], '#7e8795', 1, .29);
      line(ground, [[b[0], b[1] + 5], [b[0] + 4, b[1] + 7]], '#7e8795', 1, .29);
    }
    const inset = Math.max(14, Math.round(Math.min(width, height) * .05));
    corner(ground, inset, inset, 1, 1);
    corner(ground, width - inset, inset, -1, 1);
    corner(ground, inset, height - inset, 1, -1);
    corner(ground, width - inset, height - inset, -1, -1);
  }

  function sampleRoute(points, progress) {
    const lengths = points.slice(1).map((point, i) => Math.hypot(point[0] - points[i][0], point[1] - points[i][1]));
    let distance = progress * lengths.reduce((total, length) => total + length, 0);
    for (let i = 0; i < lengths.length; i++) {
      if (distance <= lengths[i] || i === lengths.length - 1) {
        const fraction = lengths[i] ? distance / lengths[i] : 0;
        return [points[i][0] + (points[i + 1][0] - points[i][0]) * fraction,
          points[i][1] + (points[i + 1][1] - points[i][1]) * fraction];
      }
      distance -= lengths[i];
    }
    return points[0];
  }

  function drawNode(index, time) {
    const [x, y] = project(nodes[index], true);
    const active = stageWeights[index];
    const scale = Math.max(.75, Math.min(1.2, unit / 530));
    const pulse = reducedMotion ? .5 : .5 + Math.sin(time * 1.7) * .5;
    context.save();
    context.translate(x, y);
    context.scale(scale, scale);
    context.fillStyle = palette.ink;
    context.fillRect(-12, -12, 24, 24);
    context.strokeStyle = palette.silver;
    context.globalAlpha = .32 + active * .25;
    context.lineWidth = 1;
    context.strokeRect(-10.5, -10.5, 21, 21);
    context.globalAlpha = .2 + active * (.45 + pulse * .18);
    context.strokeStyle = palette.purple;
    context.strokeRect(-15.5, -15.5, 31, 31);
    context.globalAlpha = .72 + active * .28;
    context.fillStyle = active > .1 ? palette.purple : palette.silver;

    if (index === 0) {
      // Station: a low, rectilinear landing structure.
      context.fillRect(-7, -4, 14, 8);
      context.fillStyle = palette.ink;
      context.fillRect(-4, -2, 8, 4);
      context.fillStyle = palette.silver;
      context.fillRect(-2, -7, 4, 2);
      context.fillRect(-2, 5, 4, 2);
    } else if (index === 1) {
      // Hive: a jagged aperture, deliberately free of rounded sci-fi rings.
      context.beginPath();
      context.moveTo(-6, -7); context.lineTo(3, -7); context.lineTo(7, -3);
      context.lineTo(7, 5); context.lineTo(1, 8); context.lineTo(-7, 3);
      context.closePath(); context.fill();
      context.fillStyle = palette.ink;
      context.fillRect(-3, -3, 6, 6);
    } else {
      // Extraction: an open landing bracket and directional chevron.
      context.fillRect(-7, -7, 2, 14); context.fillRect(5, -7, 2, 14);
      line(context, [[-3, 3], [0, -2], [3, 3]], palette.purple, 1.5, 1);
    }
    context.restore();
  }

  function paint() {
    if (disposed) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.drawImage(cache, 0, 0, width, height);
    const time = animationTime / 1000;

    routes.forEach((route, index) => {
      const points = pathPoints(route);
      const active = stageWeights[index + 1];
      const completed = index === 0 ? stageWeights[2] : 0;
      line(context, points, palette.purple, 4, active * .065);
      line(context, points, palette.purple, 1.25, .16 + active * .65 + completed * .22);
      if (active < .005) return;
      for (let marker = 0; marker < 3; marker++) {
        const progress = reducedMotion ? .42 - marker * .045 : (time * .065 - marker * .045 + 1) % 1;
        const point = sampleRoute(points, progress);
        context.globalAlpha = active * (1 - marker * .25);
        context.fillStyle = marker === 0 ? '#dfccff' : palette.purple;
        context.fillRect(Math.round(point[0]) - 1, Math.round(point[1]) - 1, marker === 0 ? 3 : 2, 2);
      }
      context.globalAlpha = 1;
    });

    // Prepared squad pips sit beside the station until deployment is selected.
    const station = project(nodes[0], true);
    context.fillStyle = palette.purple;
    context.globalAlpha = stageWeights[0] * .65;
    for (let i = 0; i < 3; i++) context.fillRect(station[0] - 6 + i * 5, station[1] + 23, 2, 2);
    context.globalAlpha = 1;
    nodes.forEach((_, index) => drawNode(index, time));
  }

  function mayAnimate() {
    return !disposed && inView && !document.hidden && !reducedMotion && width > 1 && height > 1;
  }

  function tick(timestamp) {
    request = 0;
    if (!mayAnimate()) return;
    if (!lastPaint || timestamp - lastPaint >= 1000 / 24) {
      const elapsed = lastStep ? Math.min(timestamp - lastStep, 100) : 1000 / 24;
      lastStep = timestamp;
      lastPaint = timestamp;
      animationTime += elapsed;
      const easing = 1 - Math.exp(-elapsed / 220);
      stageWeights.forEach((weight, index) => {
        const target = selectedStage === index ? 1 : 0;
        const next = weight + (target - weight) * easing;
        stageWeights[index] = Math.abs(next - target) < .001 ? target : next;
      });
      paint();
    }
    request = window.requestAnimationFrame(tick);
  }

  function updateAnimation() {
    if (request) window.cancelAnimationFrame(request);
    request = 0;
    lastPaint = 0;
    lastStep = 0;
    if (mayAnimate()) request = window.requestAnimationFrame(tick);
  }

  function resize() {
    if (disposed) return;
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(bounds.width));
    height = Math.max(1, Math.round(bounds.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = cache.width = Math.round(width * dpr);
    canvas.height = cache.height = Math.round(height * dpr);
    unit = Math.min(width * .68, height * 1.11);
    centerX = width * .5;
    centerY = height * .54;
    buildTerrain();
    paint();
    updateAnimation();
  }

  function onMotionChange(event) {
    reducedMotion = event.matches;
    if (reducedMotion) stageWeights.forEach((_, index) => { stageWeights[index] = selectedStage === index ? 1 : 0; });
    paint();
    updateAnimation();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const intersectionObserver = new IntersectionObserver(entries => {
    inView = entries.some(entry => entry.isIntersecting);
    updateAnimation();
  }, { threshold: 0 });
  intersectionObserver.observe(canvas);
  document.addEventListener('visibilitychange', updateAnimation);
  motionQuery.addEventListener('change', onMotionChange);
  resize();

  return {
    setStage(index) {
      if (disposed || !Number.isFinite(index)) return;
      selectedStage = Math.max(0, Math.min(2, Math.round(index)));
      if (reducedMotion) {
        stageWeights.forEach((_, i) => { stageWeights[i] = selectedStage === i ? 1 : 0; });
        paint();
      }
      updateAnimation();
    },
    destroy() {
      disposed = true;
      if (request) window.cancelAnimationFrame(request);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', updateAnimation);
      motionQuery.removeEventListener('change', onMotionChange);
    },
  };
}
