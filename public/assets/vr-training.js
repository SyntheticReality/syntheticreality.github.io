// Exposed mechanical assembly, sampled into square pixels from procedural geometry.
const canvas = document.querySelector('[data-training-art]');
if (canvas?.getContext('2d')) startMachine(canvas);

function startMachine(canvas) {
  const ctx = canvas.getContext('2d');
  const hero = canvas.closest('.training-hero');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const TAU = Math.PI * 2;
  let width = 1, height = 1, scale = 1, dpr = 1, gears = [];
  let frame = 0, last = 0, time = 0, visible = true;
  let tilt = 0, targetTilt = 0;
  const clamp = (x, low = 0, high = 1) => Math.max(low, Math.min(high, x));

  function makeGear(x, y, radius, teeth, direction, phase = 0) {
    const points = [], outline = [];
    // A narrow root, broad tooth cap, six spokes, and an open central bearing.
    const boundary = angle => {
      const f = ((angle / TAU * teeth % 1) + 1) % 1;
      return f < .15 || f > .85 ? .91 : f < .3 ? .91 + (f - .15) : f < .7 ? 1.06 : 1.06 - (f - .7);
    };
    const step = width < 700 ? .05 : .034;
    for (let py = -1.06; py <= 1.06; py += step) {
      for (let px = -1.06; px <= 1.06; px += step) {
        const r = Math.hypot(px, py), a = Math.atan2(py, px);
        if (r > boundary(a) || r < .13) continue;
        const spoke = Math.abs(Math.sin(a * 3)) < .24;
        if (r > .34 && r < .76 && !spoke) continue;
        const rim = r > .87 || (r > .76 && r < .8) || (r > .28 && r < .34) || r < .17;
        const seed = Math.sin(px * 127.1 + py * 311.7) * 43758.5453;
        points.push({ x: px * radius, y: py * radius, r, rim, seed: seed - Math.floor(seed) });
      }
    }
    for (let tooth = 0; tooth < teeth; tooth++) {
      for (const [fraction, r] of [[.15,.91],[.3,1.06],[.7,1.06],[.85,.91]]) {
        const a = (tooth + fraction) / teeth * TAU;
        outline.push([Math.cos(a) * radius * r, Math.sin(a) * radius * r]);
      }
    }
    return { x, y, radius, teeth, direction, phase, points, outline };
  }

  function project(x, y, z = 0) {
    const yaw = -.32 + tilt;
    const rx = x * Math.cos(yaw) + z * Math.sin(yaw);
    const rz = -x * Math.sin(yaw) + z * Math.cos(yaw);
    return { x: width * .5 + rx * scale, y: height * (width < 700 ? .36 : .33) + (y * .85 - rz * .38) * scale };
  }

  function pixel(p, size = 2, alpha = .7, hot = false) {
    if (p.x < -8 || p.x > width + 8 || p.y < 0 || p.y > height * .75 || alpha < .015) return;
    const fade = 1 - clamp((p.y / height - .55) / .18);
    ctx.globalAlpha = clamp(alpha * fade);
    ctx.fillStyle = hot ? '#ead5ff' : '#ac6bf5';
    const snap = width < 700 ? 1 : 1.5;
    ctx.fillRect(Math.round(p.x / snap) * snap, Math.round(p.y / snap) * snap, size, size);
  }

  function line(a, b, alpha = .45, size = 2, hot = false) {
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    const count = Math.max(1, Math.ceil(distance / (width < 700 ? 3.2 : 4.2)));
    for (let i = 0; i <= count; i++) {
      const f = i / count;
      pixel({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }, size, alpha, hot);
    }
  }

  function worldLine(a, b, alpha = .45, size = 2, hot = false) {
    line(project(...a), project(...b), alpha, size, hot);
  }

  function circle(x, y, radius, z, alpha, hot = false) {
    let previous;
    for (let i = 0; i <= 90; i++) {
      const a = i / 90 * TAU, p = project(x + Math.cos(a) * radius, y + Math.sin(a) * radius, z);
      if (previous) line(previous, p, alpha, width < 700 ? 1.6 : 2.2, hot);
      previous = p;
    }
  }

  function drawGear(gear, angle) {
    const c = Math.cos(angle), s = Math.sin(angle), z = .26;
    const transform = (p, depth) => project(gear.x + p[0] * c - p[1] * s, gear.y + p[0] * s + p[1] * c, depth);
    // Back edge and sidewalls give the flat cutout a visible thickness.
    for (let i = 0; i < gear.outline.length; i++) {
      const a = gear.outline[i], b = gear.outline[(i + 1) % gear.outline.length];
      line(transform(a, -.15), transform(b, -.15), .24, 1.7);
      if (i % 2 === 0) line(transform(a, -.15), transform(a, z), .34, 1.7);
    }
    const scan = Math.sin(time * .43) * 3;
    const motionLight = .5 + .5 * Math.sin(time * 1.2 + gear.x);
    for (const p of gear.points) {
      const x = gear.x + p.x * c - p.y * s, y = gear.y + p.x * s + p.y * c;
      const sweep = Math.exp(-((x - scan) ** 2) / .11);
      const energy = sweep * .38 + motionLight * .08;
      const shade = clamp(.35 + (p.x / gear.radius + 1) * .18 + p.seed * .09);
      const alpha = (p.rim ? .77 : shade) + energy;
      pixel(project(x, y, z), width < 700 ? 1.6 : 2.6, alpha, p.rim || sweep > .3);
    }
    for (let i = 0; i < gear.outline.length; i++) {
      line(transform(gear.outline[i], z), transform(gear.outline[(i + 1) % gear.outline.length], z), .82, width < 700 ? 1.7 : 2.3, true);
    }
    circle(gear.x, gear.y, gear.radius * .18, .38, .78, true);
    circle(gear.x, gear.y, gear.radius * .27, .27, .52);
    const axis = project(gear.x, gear.y, .39);
    line({ x: axis.x - 7, y: axis.y }, { x: axis.x + 7, y: axis.y }, .48, 1.5, true);
    line({ x: axis.x, y: axis.y - 7 }, { x: axis.x, y: axis.y + 7 }, .48, 1.5, true);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const clock = time; // Pausing motion retains the current mechanical pose.
    // Quiet fixed mounting grid and rear plate, separated from the moving mechanism.
    const bounds = width < 700 ? [-2.8,2.8,-3,3] : [-4.05,5.1,-2,2.8];
    const [left,right,top,bottom] = bounds;
    for (let x = left; x < right; x += .26) for (let y = top; y < bottom; y += .26) {
      const p = project(x,y,-.25);
      pixel(p,1.1,.08 + .035 * Math.sin(x+y));
    }
    const plate = [[left,top,-.23],[right,top,-.23],[right,bottom,-.23],[left,bottom,-.23]];
    for (let i = 0; i < 4; i++) worldLine(plate[i],plate[(i+1)%4],.15,1.3);
    for (const [x,y] of [[left+.2,top+.2],[right-.2,top+.2],[left+.2,bottom-.2],[right-.2,bottom-.2]]) circle(x,y,.055,-.15,.42);
    for (const gear of gears) circle(gear.x,gear.y,gear.radius*1.15,-.18,.14);

    // The drive is geared by tooth count: adjacent wheels rotate in opposite directions.
    const drive = clock * .21;
    for (const gear of gears) drawGear(gear, drive * gear.direction * 28 / gear.teeth + gear.phase);

    if (width >= 700) {
      // An eccentric pin converts wheel rotation into a reciprocating slider.
      const g = gears[2], angle = -drive * 28 / g.teeth + g.phase;
      const pin = [g.x + Math.cos(angle) * .58, g.y + Math.sin(angle) * .58, .43];
      const railY = g.y, rodLength = 1.9;
      const sliderX = pin[0] + Math.sqrt(rodLength ** 2 - (pin[1] - railY) ** 2);
      worldLine([3.22,railY-.3,.05],[5.1,railY-.3,.05],.38);
      worldLine([3.22,railY+.3,.05],[5.1,railY+.3,.05],.38);
      worldLine(pin,[sliderX,railY,.43],.87,3,true);
      circle(pin[0],pin[1],.065,.47,.92,true);
      for(let x=-.18;x<=.18;x+=.045) for(let y=-.22;y<=.22;y+=.045) pixel(project(sliderX+x,railY+y,.38),2.4,.65+.15*Math.sin(clock),true);
      worldLine([sliderX-.18,railY-.22,.4],[sliderX+.18,railY-.22,.4],.86,2.3,true);
    }
    // Slow light pulses around the bearings accompany the continuous mechanism.
    for (let i=0;i<gears.length;i++) {
      const g=gears[i], energy=.5+.5*Math.sin(clock*.6+i);
      const r=g.radius*1.24 + Math.sin(clock*.8+i)*.025;
      if(energy>.03) circle(g.x,g.y,r,-.1,energy*.19);
    }
    ctx.globalAlpha = 1;
  }

  function tick(stamp) {
    frame=0;
    if(!visible||document.hidden||reduced.matches){last=0;return;}
    if(!last||stamp-last>=1000/30){
      const delta=last?Math.min((stamp-last)/1000,.1):0;
      last=stamp;time+=delta;
      tilt+=(targetTilt-tilt)*.06;draw();
    }
    frame=requestAnimationFrame(tick);
  }

  function sync(){if(frame)cancelAnimationFrame(frame);frame=0;last=0;if(reduced.matches)draw();else if(visible&&!document.hidden)frame=requestAnimationFrame(tick);}
  function resize(){
    const box=canvas.getBoundingClientRect();width=Math.max(1,box.width);height=Math.max(1,box.height);dpr=Math.min(devicePixelRatio||1,1.5);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;
    scale=width<700?width*.163:Math.min(width*.11,height*.235);
    const left=width<700?[-1.67,-1.73]:[-2.36,.44];
    const right=width<700?[1.63,1.77]:[2.04,1.27];
    gears=[makeGear(...left,1,20,-1,.08),makeGear(0,0,1.4,28,1),makeGear(...right,1,20,-1,.16)];
    draw();sync();
  }
  hero.addEventListener('pointermove',event=>{if(reduced.matches||event.pointerType==='touch')return;const box=hero.getBoundingClientRect();targetTilt=clamp((event.clientX-box.left)/box.width*2-1,-1,1)*.12;},{passive:true});
  hero.addEventListener('pointerleave',()=>{targetTilt=0;},{passive:true});
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(hero);
  reduced.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);});
  window.addEventListener('pageshow',sync);
  resize();
}
