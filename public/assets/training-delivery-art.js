// Original, interactive diagrams for the four delivery artifacts.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const entries = [...document.querySelectorAll('[data-delivery-art]')].map(canvas => {
  const ctx = canvas.getContext('2d', { alpha: true });
  return ctx && { canvas, ctx, button: canvas.parentElement, type: canvas.dataset.deliveryArt, width: 1, height: 1, ratio: 1, visible: false, hover: false, focus: false, variant: 0, activatedAt: -10 };
}).filter(Boolean);
let frame = 0, last = 0, clock = 0;

function render(entry) {
  const { ctx, width, height, ratio, variant, type } = entry;
  const scale = Math.min(width / 260, height / 140);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height);
  ctx.setTransform(ratio * scale, 0, 0, ratio * scale, (width - 260 * scale) * ratio / 2, (height - 140 * scale) * ratio / 2);
  const time = clock, hot = entry.hover || entry.focus;
  const age = clock - entry.activatedAt;
  const pulse = reduced.matches ? 0 : age >= 0 && age < 1.7 ? Math.sin(age / 1.7 * Math.PI) : 0;
  const pixel = (x, y, size = 2, alpha = .6, bright = false) => {
    ctx.globalAlpha = Math.min(1, alpha * 1.4 * (hot ? 1.18 : 1)); ctx.fillStyle = bright ? '#ecd5ff' : '#bd87fa';
    ctx.fillRect(Math.round(x) - size / 2, Math.round(y) - size / 2, size, size);
  };
  const line = (a, b, alpha = .5, size = 1.8) => {
    const count = Math.max(1, Math.ceil(Math.hypot(b[0]-a[0], b[1]-a[1]) / 2.8));
    for (let i = 0; i <= count; i++) pixel(a[0]+(b[0]-a[0])*i/count, a[1]+(b[1]-a[1])*i/count, size, alpha);
  };
  const path = (points, alpha = .5, closed = false) => {
    for (let i = 1; i < points.length; i++) line(points[i-1], points[i], alpha);
    if (closed) line(points.at(-1), points[0], alpha);
  };
  const box = (x, y, w, h, alpha = .55) => path([[x,y],[x+w,y],[x+w,y+h],[x,y+h]], alpha, true);
  const node = (x, y, size = 8, active = false) => { box(x-size/2,y-size/2,size,size,active?.9:.45);pixel(x,y,active?4:2,active?.95:.65,true); };
  const packet = (a,b,phase,alpha=.9) => pixel(a[0]+(b[0]-a[0])*phase,a[1]+(b[1]-a[1])*phase,3.5,alpha,true);
  for (let y=18;y<130;y+=16) for (let x=18;x<248;x+=16) pixel(x,y,1,.055*(1-Math.abs(x-130)/145));

  if (type === 'scenario') {
    // A floor-plan skeleton becomes a branching interaction flow.
    const nodes=[[30,68],[87,30],[87,104],[165,30],[165,104],[230,68]];
    box(18,16,225,108,.16);line([62,16],[62,124],.2);line([140,16],[140,124],.2);line([62,68],[210,68],.2);
    const edges=[[0,1],[0,2],[1,3],[2,4],[3,5],[4,5],[1,4]];
    edges.forEach(([a,b],i)=>{const active=(i+variant)%3===0;const mid=[nodes[b][0],nodes[a][1]];path([nodes[a],mid,nodes[b]],active?.65:.25);if(active)packet(nodes[a],mid,(time*.24+i*.17)%1);});
    nodes.forEach(([x,y],i)=>node(x,y,9+((i+variant)%3===0?pulse*7:0),(i+variant)%3===0));
  } else if (type === 'prototype') {
    // A live wireframe with a movable focus and a direct interaction response.
    box(36,17,182,108,.3);line([36,38],[218,38],.32);
    [46,54,62].forEach(x=>pixel(x,27,2.5,.6,true));
    const panels=[[47,49,48,61],[105,49,101,24],[105,83,101,27]];
    panels.forEach(([x,y,w,h],i)=>box(x,y,w,h,i===variant?.8:.27));
    for(let i=0;i<4;i++)line([115,56+i*5],[180+(i%2)*13,56+i*5],.2);
    const x=variant===0?71:155,y=variant===1?61:96;
    node(x,y,13+pulse*16,true);
    const cursorX=x+11+Math.sin(time*.5)*2,cursorY=y+6+Math.cos(time*.5)*2;
    path([[cursorX,cursorY],[cursorX,cursorY+17],[cursorX+5,cursorY+12],[cursorX+12,cursorY+19],[cursorX+15,cursorY+16],[cursorX+8,cursorY+9],[cursorX+17,cursorY+9]],.95,true);
    line([70,56],[70,95],.25);line([55,75],[87,75],.25);
  } else if (type === 'simulation') {
    // A dimensional grid reveals authored geometry and responsive surface variation.
    const yaw=time*.085+variant*.45;
    const project=(x,y,z)=>{const rx=x*Math.cos(yaw)-z*Math.sin(yaw),rz=x*Math.sin(yaw)+z*Math.cos(yaw);return [130+rx*32,75+rz*12-y*29];};
    for(let row=-2;row<=2;row++){
      const across=[],down=[];
      for(let col=-2;col<=2;col++){
        const rise=(a,b)=>Math.sin(a*1.1+variant*.9)*Math.cos(b*.8)*(.42+variant*.12+pulse*.4);
        across.push(project(col,rise(col,row),row));down.push(project(row,rise(row,col),col));
      }
      path(across,row===0?.7:.35);path(down,row===0?.7:.35);across.forEach(p=>pixel(...p,2.4,.65,true));
    }
    const corners=[[-1.4,0,-1.4],[1.4,0,-1.4],[1.4,0,1.4],[-1.4,0,1.4],[-1.4,1.8,-1.4],[1.4,1.8,-1.4],[1.4,1.8,1.4],[-1.4,1.8,1.4]].map(p=>project(...p));
    [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].forEach(([a,b])=>line(corners[a],corners[b],.55));
    corners.slice(4).forEach(p=>node(...p,5,true));
  } else if (type === 'deploy') {
    // One build fans out to a headset, a desktop and a handheld target.
    const origin=[48,70],destinations=[[211,30],[211,70],[211,110]];
    path([[48,45],[71,58],[71,83],[48,96],[25,83],[25,58]],.75,true);path([[25,58],[48,71],[71,58]],.6);line([48,71],[48,96],.6);node(...origin,9,true);
    destinations.forEach((destination,i)=>{const active=i===variant;path([origin,[128,70],[128,destination[1]],destination],active?.7:.28);if(active)packet([128,destination[1]],destination,(time*.45)%1);});
    box(194,20,34,20,variant===0?.9:.45);box(199,25,8,8,.45);box(215,25,8,8,.45);line([190,24],[190,36],.5);line([232,24],[232,36],.5);
    box(191,59,40,22,variant===1?.9:.45);line([211,81],[211,87],.5);line([200,87],[222,87],.5);
    box(204,95,15,30,variant===2?.9:.45);line([208,120],[215,120],.6);
    if(pulse)box(destinations[variant][0]-24-pulse*5,destinations[variant][1]-17-pulse*3,48+pulse*10,34+pulse*6,pulse*.5);
  }
  ctx.globalAlpha = 1;
}

function tick(stamp) {
  frame=0;if(document.hidden||reduced.matches)return;
  if(!last||stamp-last>=50){clock+=last?Math.min((stamp-last)/1000,.1):0;last=stamp;entries.filter(e=>e.visible).forEach(render);}
  if(entries.some(e=>e.visible))frame=requestAnimationFrame(tick);
}
function restart() {
  if(frame)cancelAnimationFrame(frame);frame=0;last=0;
  if(reduced.matches)entries.filter(e=>e.visible).forEach(render);
  else if(!document.hidden&&entries.some(e=>e.visible))frame=requestAnimationFrame(tick);
}
const observer=new IntersectionObserver(changes=>{changes.forEach(change=>{const entry=entries.find(e=>e.button===change.target);entry.visible=change.isIntersecting;if(entry.visible)render(entry);});restart();});
const resizer=new ResizeObserver(changes=>{changes.forEach(change=>{const entry=entries.find(e=>e.canvas===change.target);const rect=entry.canvas.getBoundingClientRect();entry.width=Math.max(1,rect.width);entry.height=Math.max(1,rect.height);entry.ratio=Math.min(devicePixelRatio||1,1.5);entry.canvas.width=Math.round(entry.width*entry.ratio);entry.canvas.height=Math.round(entry.height*entry.ratio);render(entry);});});
entries.forEach(entry=>{
  entry.canvas.dataset.variant='0';observer.observe(entry.button);resizer.observe(entry.canvas);
  entry.button.addEventListener('click',()=>{entry.variant=(entry.variant+1)%3;entry.canvas.dataset.variant=String(entry.variant);entry.activatedAt=clock;render(entry);restart();});
  for(const [event,key,value] of [['pointerenter','hover',true],['pointerleave','hover',false],['focus','focus',true],['blur','focus',false]])entry.button.addEventListener(event,()=>{entry[key]=value;render(entry);});
});
reduced.addEventListener('change',restart);document.addEventListener('visibilitychange',restart);
window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);frame=0;});
window.addEventListener('pageshow',restart);
