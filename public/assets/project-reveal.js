import { startProjectVideos } from './project-video.js?v=20260914d';

export function startProjectReveals(root = document) {
  const doc = root.ownerDocument || root;
  const stopVideos = startProjectVideos(root);
  const cards = [...root.querySelectorAll('.project-reveal')];
  const entries = cards.map(card => ({
    card,
    button: card.querySelector('.reveal-toggle'),
    front: card.querySelector('.reveal-front'),
    back: card.querySelector('.reveal-back'),
    name: card.dataset.projectName
  })).filter(entry => entry.button && entry.front && entry.back);
  function setOpen(entry, open) {
    const restoreFocus = !open && entry.back.contains(doc.activeElement);
    entry.card.classList.toggle('is-open', open);
    entry.button.setAttribute('aria-expanded', String(open));
    entry.button.setAttribute('aria-label', `${open ? 'Show image' : 'Show details'} for ${entry.name}`);
    entry.front.setAttribute('aria-hidden', String(open));
    entry.front.inert = open;
    entry.back.setAttribute('aria-hidden', String(!open));
    entry.back.inert = !open;
    if (restoreFocus) entry.button.focus({ preventScroll: true });
  }
  const listeners = entries.map(entry => {
    setOpen(entry, false);
    const click = () => setOpen(entry, entry.button.getAttribute('aria-expanded') !== 'true');
    const backClick = event => {
      if (event.target.closest?.('a, button, input, select, textarea')) return;
      if (doc.getSelection?.()?.isCollapsed === false) return;
      setOpen(entry, false);
    };
    entry.button.addEventListener('click', click);
    entry.back.addEventListener('click', backClick);
    entry.card.classList.add('reveal-ready');
    return () => {
      entry.button.removeEventListener('click', click);
      entry.back.removeEventListener('click', backClick);
    };
  });
  const escape = event => {
    if (doc.querySelector('.project-video-dialog[open]')) return;
    if (event.key === 'Escape') entries.forEach(entry => setOpen(entry, false));
  };
  root.addEventListener('keydown', escape);
  return () => {
    stopVideos();
    listeners.forEach(remove => remove());
    root.removeEventListener('keydown', escape);
    entries.forEach(entry => { setOpen(entry, false); entry.card.classList.remove('reveal-ready'); });
  };
}
