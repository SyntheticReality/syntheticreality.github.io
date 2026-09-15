const menuButton=document.querySelector('.menu-toggle');
const mobileNav=document.querySelector('#mobile-nav');
function closeMenu(){if(!menuButton||!mobileNav)return;menuButton.setAttribute('aria-expanded','false');mobileNav.hidden=true;menuButton.innerHTML='[ Menu <span aria-hidden="true">+</span> ]';}
menuButton?.addEventListener('click',()=>{const expanded=menuButton.getAttribute('aria-expanded')==='true';if(expanded)closeMenu();else{menuButton.setAttribute('aria-expanded','true');mobileNav.hidden=false;menuButton.innerHTML='[ Close <span aria-hidden="true">−</span> ]';}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menuButton?.getAttribute('aria-expanded')==='true'){closeMenu();menuButton.focus();}});
matchMedia('(min-width:701px)').addEventListener('change',e=>{if(e.matches)closeMenu();});
document.querySelectorAll('[data-year]').forEach(el=>el.textContent=String(new Date().getFullYear()));
document.querySelector('.copy-email')?.addEventListener('click',async()=>{const status=document.querySelector('.copy-status');try{await navigator.clipboard.writeText('hello@syry.io');status.textContent='Email copied.';}catch{status.textContent='Select and copy hello@syry.io above.';}});

const pixelField = document.querySelector('.pixel-field');
if (pixelField) import('./hero-experiments.js').then(({ startHeroExperiment }) => startHeroExperiment(pixelField, 9));

const capabilityCanvases = [...document.querySelectorAll('[data-capability]')];
const portraitCanvas = document.querySelector('[data-portrait-source]:not([data-portrait-comparison])');
if (portraitCanvas) import('./portrait-art.js?v=20260914l').then(({ startPortraitArt }) => startPortraitArt(portraitCanvas));
if (capabilityCanvases.length) import('./capability-art.js').then(({ startCapabilityArt }) => startCapabilityArt(capabilityCanvases));

const engineeringProcess = document.querySelector('[data-engineering-process]');
if (engineeringProcess) import('./engineering-process.js?v=20260914m').then(({ startEngineeringProcess }) => startEngineeringProcess(engineeringProcess));

if (document.querySelector('.project-reveal')) import('./project-reveal.js?v=20260914h').then(({ startProjectReveals }) => startProjectReveals());

// Category imagery moves; the section titles remain still.
const sectorCanvas = document.querySelector('[data-sector-art]');
if (sectorCanvas) import('./category-topography.js').then(({ startCategoryTopography }) => startCategoryTopography(sectorCanvas, sectorCanvas.dataset.sectorArt));

const clientCarousel = document.querySelector('.client-carousel');
if (clientCarousel) {
  // Load both loop copies together before the carousel enters view.
  const loadLogos = () => clientCarousel.querySelectorAll('img').forEach(img => { img.loading = 'eager'; });
  if ('IntersectionObserver' in window) {
    const logoObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { loadLogos(); logoObserver.disconnect(); }
    }, { rootMargin: '600px 0px' });
    logoObserver.observe(clientCarousel);
  } else loadLogos();
  let visible = true;
  const update = () => clientCarousel.classList.toggle('is-inactive', !visible || document.hidden);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update(); }).observe(clientCarousel);
  document.addEventListener('visibilitychange', update);
  update();
}
