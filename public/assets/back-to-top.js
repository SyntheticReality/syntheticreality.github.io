const topButton = document.querySelector('.back-to-top');
if (topButton) {
  const mobile = window.matchMedia('(max-width:700px)');
  const menu = document.querySelector('.menu-toggle');
  const home = document.querySelector('.site-header .wordmark');
  let scrollFrame = 0;
  const update = () => {
    scrollFrame = 0;
    const threshold = Math.max(300, Math.min(600, window.innerHeight * .7));
    topButton.hidden = !mobile.matches || window.scrollY < threshold || menu?.getAttribute('aria-expanded') === 'true';
  };
  const queueUpdate = () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(update);
  };
  topButton.addEventListener('click', () => {
    home?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
  window.addEventListener('scroll', queueUpdate, { passive: true });
  window.addEventListener('resize', queueUpdate, { passive: true });
  window.addEventListener('pageshow', queueUpdate);
  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
  });
  // Observe the one shared state changed by click, Escape and breakpoint handling.
  if (menu) new MutationObserver(queueUpdate).observe(menu, { attributes: true, attributeFilter: ['aria-expanded'] });
  update();
}
