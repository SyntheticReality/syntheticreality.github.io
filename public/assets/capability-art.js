const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const noise = (a, b = 0) => { const value = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return value - Math.floor(value); };

export function startCapabilityArt(canvases) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const removers = [];
  let frame = 0, previous = 0, time = 0;
  const entries = canvases.map(canvas => {
    const ctx = canvas.getContext('2d', { alpha: true });
    return ctx ? { canvas, ctx, type: canvas.dataset.capability, surface: canvas.parentElement, width: 1, height: 1, visible: true, x: 0, y: 0, tx: 0, ty: 0, revision: 0, activatedAt: -100 } : null;
  }).filter(Boolean);
  if (!entries.length) return { destroy() {} };

  const listen = (target, type, callback) => {
    target.addEventListener(type, callback, { passive: true });
    removers.push(() => target.removeEventListener(type, callback));
  };

  function render(entry) {
    const { ctx, width: w, height: h, x: mx, y: my, type } = entry;
    const age = reduced.matches ? 100 : time - entry.activatedAt;
    const progress = clamp(age / 2, 0, 1);
    const pulse = Math.sin(progress * Math.PI);
    const revision = entry.revision;
    ctx.clearRect(0, 0, w, h);
    const unit = Math.min(w, h), cx = w * .5, cy = h * .54;
    const dot = (x, y, size = 2.5, alpha = .8, filled = false) => {
      ctx.globalAlpha = clamp(alpha, 0, 1); ctx.strokeStyle = filled ? '#f0dfff' : '#c18cff'; ctx.fillStyle = '#e2c2ff'; ctx.lineWidth = 1;
      if (filled) ctx.fillRect(x - size / 2, y - size / 2, size, size);
      else ctx.strokeRect(x - size / 2, y - size / 2, size, size);
    };
    const path = (points, alpha = .35, closed = false) => {
      ctx.globalAlpha = clamp(alpha, 0, 1); ctx.strokeStyle = '#b780f5'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      if (closed) ctx.closePath(); ctx.stroke();
    };
    const project = (x, y, z, yaw, pitch = -.22) => {
      const rx = x * Math.cos(yaw) - z * Math.sin(yaw), rz = x * Math.sin(yaw) + z * Math.cos(yaw);
      const ry = y * Math.cos(pitch) - rz * Math.sin(pitch), depth = y * Math.sin(pitch) + rz * Math.cos(pitch);
      const scale = unit * .26 * 3.5 / (4.2 + depth);
      return [cx + rx * scale, cy + ry * scale];
    };

    if (type === 'realtime') {
      // Mesh meridians and latitude rings describe a surface rendered in 3D.
      const yaw = time * .23 + mx * .35 + revision * .5 + TAU * (1 - (1 - progress) ** 3);
      const point = (phi, theta) => {
        const ripple = 1.25 + Math.sin(theta * (3 + revision % 3) + time * .4) * (.09 + pulse * .35);
        return project(Math.sin(phi) * Math.cos(theta) * ripple, Math.cos(phi) * (1.3 + pulse * .15), Math.sin(phi) * Math.sin(theta) * ripple, yaw, -.25 + my * .25);
      };
      for (let latitude = 1; latitude < 10; latitude++) {
        const phi = latitude / 10 * Math.PI, points = [];
        for (let longitude = 0; longitude < 32; longitude++) {
          const theta = longitude / 32 * TAU;
          const p = point(phi, theta);
          points.push(p); if (longitude % 4 === 0) dot(...p, 2, .75);
        }
        path(points, latitude === 5 ? .8 : .3, true);
      }
      for (let longitude = 0; longitude < 12; longitude++) {
        const theta = longitude / 12 * TAU;
        const points = [];
        for (let latitude = 0; latitude <= 16; latitude++) {
          const phi = latitude / 16 * Math.PI;
          points.push(point(phi, theta));
        }
        path(points, .2);
      }
    } else if (type === 'spatial') {
      // Two eye views share a tracked spatial point and different perspective.
      const frameSize = Math.min(w * .29, h * .43) * (1 + pulse * .12);
      for (let eye = -1; eye <= 1; eye += 2) {
        const ox = cx + eye * frameSize * .57;
        const corners = [[ox-frameSize*.46,cy-frameSize*.42],[ox+frameSize*.46,cy-frameSize*.42],[ox+frameSize*.46,cy+frameSize*.42],[ox-frameSize*.46,cy+frameSize*.42]];
        path(corners, .8, true);
        const depthX = ox + mx * 9 - eye * 9, depthY = cy + my * 7 - 13;
        const rear = corners.map(([x,y]) => [depthX + (x-ox)*(.48-pulse*.28), depthY+(y-cy)*(.48-pulse*.28)]);
        path(rear, .32, true);
        corners.forEach((p, index) => path([p,rear[index]], .25));
        const pointX = ox + Math.sin(time*.45+revision*1.7)*frameSize*.22 + mx*9 - eye*3;
        const pointY = cy + Math.cos(time*.4+revision*1.3)*frameSize*.2 + my*7;
        if (pulse > .01) for (let layer = 1; layer <= 3; layer++) {
          const depth = (layer / 4 + progress) % 1;
          path(corners.map(([x,y], index) => [x+(rear[index][0]-x)*depth,y+(rear[index][1]-y)*depth]), pulse*.5, true);
        }
        dot(pointX, pointY, 8, .95);
        path([[pointX-10,pointY],[pointX+10,pointY]],.5);
        path([[pointX,pointY-10],[pointX,pointY+10]],.5);
      }
      for (let i = 0; i < 9; i++) dot(cx + (i-4)*5, cy + frameSize*.67, 1.5, .3 + (Math.sin(time+i*.6)+1)*.22);
    } else if (type === 'multiplayer') {
      const radius = unit * .33, nodes = [], count = 6 + revision % 3;
      for (let i = 0; i < count; i++) {
        const angle = i / count * TAU - Math.PI / 2;
        nodes.push([cx + Math.cos(angle)*radius + mx*3,cy+Math.sin(angle)*radius+my*3]);
      }
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i], b = nodes[(i+1)%count], phase = (time*.36+i/count)%1;
        path([a,b],.3); path([a,[cx,cy]],.2);
        dot(a[0]+(b[0]-a[0])*phase,a[1]+(b[1]-a[1])*phase,3,.9,true);
        const sync = Math.pow((Math.sin(time*1.5)+1)/2,8);
        dot(...a,7+sync*2,.65+sync*.35);
        if (age < 2) {
          const broadcast = clamp(age / .8, 0, 1);
          path([[cx,cy],a], .25+pulse*.6);
          dot(cx+(a[0]-cx)*broadcast,cy+(a[1]-cy)*broadcast,5,.95,true);
          if (age > .8) dot(...a,8+(age-.8)*16,clamp(1-(age-.8),0,1));
        }
      }
      dot(cx,cy,15,.95); dot(cx,cy,4,.8,true);
    } else if (type === 'procedural') {
      // A stable seed grows into progressively finer subdivisions.
      const phase = revision ? (reduced.matches ? 4 : Math.min(4, age * 2.8)) : (time*.22)%5;
      const x = w*.17, y = h*.24, sw = w*.66, sh = h*.59;
      function branch(bx,by,bw,bh,depth,seed) {
        const corners = [[bx,by],[bx+bw,by],[bx+bw,by+bh],[bx,by+bh]];
        path(corners,.24+depth*.12,true);
        if (depth < Math.min(4,1+Math.floor(phase)) && bw > 12 && bh > 12) {
          const ratio = .37+noise(seed)*.26+mx*.025;
          if (bw>bh) { branch(bx,by,bw*ratio,bh,depth+1,seed*2); branch(bx+bw*ratio,by,bw*(1-ratio),bh,depth+1,seed*2+1); }
          else { branch(bx,by,bw,bh*ratio,depth+1,seed*2); branch(bx,by+bh*ratio,bw,bh*(1-ratio),depth+1,seed*2+1); }
        } else {
          dot(bx+bw*.5,by+bh*.5,3,.6+noise(seed)*.3,noise(seed)>.5);
          if (bw>25&&bh>25) path([[bx+bw*.3,by+bh*.3],[bx+bw*.7,by+bh*.3],[bx+bw*.7,by+bh*.7]],.25);
        }
      }
      branch(x,y,sw,sh,0,5+revision*17);
    } else if (type === 'ai') {
      // One source moves through a system and fans out into an output library.
      const source = [w*.16,cy], hub = [w*.4,cy], origin = [w*.61,h*.26];
      const size = Math.min(w*.074,h*.12), gap = size*.32, phase = time*.65;
      dot(...source,17,.85); dot(...source,5,.95,true);
      path([source,hub],.45); dot(...hub,10,.7);
      const packet = phase%1; dot(source[0]+(hub[0]-source[0])*packet,cy,3,.9,true);
      for (let row = 0; row < 4; row++) {
        const py = origin[1]+row*(size+gap)+size/2;
        path([hub,[w*.49,cy],[w*.49,py],[origin[0]-4,py]],.23);
        for (let col = 0; col < 4; col++) {
          const x = origin[0]+col*(size+gap), y = origin[1]+row*(size+gap), index = row*4+col;
          const delta = ((phase % 20) - index) / 2.8;
          const batch = revision && age < 3 ? clamp((age*9-index)*2,0,1) : 0;
          const light = Math.max(.3 + .65 * Math.exp(-(delta ** 2)), batch*.95);
          path([[x,y],[x+size,y],[x+size,y+size],[x,y+size]],light,true);
          for (let bit = 0; bit < 9; bit++) if (noise(index+revision*19,bit)>.48) dot(x+size*(.24+(bit%3)*.25),y+size*(.24+Math.floor(bit/3)*.25),1.6,light,true);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function tick(timestamp) {
    frame = 0;
    if (reduced.matches || document.hidden || !entries.some(entry=>entry.visible)) return;
    if (!previous || timestamp-previous >= 1000/30) {
      time += previous ? Math.min(.07,(timestamp-previous)/1000) : 0; previous = timestamp;
      for (const entry of entries) if (entry.visible) { entry.x += (entry.tx-entry.x)*.1; entry.y += (entry.ty-entry.y)*.1; render(entry); }
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame=0; previous=0;
    if (reduced.matches) entries.forEach(render);
    else if (!document.hidden&&entries.some(entry=>entry.visible)) frame=requestAnimationFrame(tick);
  }
  function resize() {
    for (const entry of entries) {
      const bounds = entry.surface.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio||1,1.5);
      entry.width=Math.max(1,bounds.width); entry.height=Math.max(1,bounds.height);
      entry.canvas.width=Math.round(entry.width*dpr); entry.canvas.height=Math.round(entry.height*dpr);
      entry.ctx.setTransform(dpr,0,0,dpr,0,0); render(entry);
    }
    sync();
  }
  const resizeObserver=new ResizeObserver(resize);
  const observer=new IntersectionObserver(changes=>{ for(const change of changes){ const entry=entries.find(item=>item.canvas===change.target); if(entry)entry.visible=change.isIntersecting; } sync(); });
  for (const entry of entries) {
    resizeObserver.observe(entry.surface); observer.observe(entry.canvas);
    listen(entry.surface,'click',()=>{
      entry.revision++;
      entry.activatedAt=time;
      render(entry);
      sync();
    });
    listen(entry.surface,'pointermove',event=>{ if(reduced.matches)return; const bounds=entry.surface.getBoundingClientRect(); entry.tx=clamp((event.clientX-bounds.left)/entry.width*2-1,-1,1); entry.ty=clamp((event.clientY-bounds.top)/entry.height*2-1,-1,1); });
    listen(entry.surface,'pointerleave',()=>{entry.tx=entry.ty=0;});
  }
  listen(document,'visibilitychange',sync); listen(reduced,'change',sync); resize();
  return { destroy(){cancelAnimationFrame(frame);resizeObserver.disconnect();observer.disconnect();removers.forEach(remove=>remove());} };
}
