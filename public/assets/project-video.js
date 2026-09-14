function youtubeId(href) {
  try {
    const url = new URL(href);
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    const id = host === 'youtu.be'
      ? url.pathname.slice(1)
      : ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host) && url.pathname === '/watch'
        ? url.searchParams.get('v')
        : null;
    return /^[\w-]{11}$/.test(id || '') ? id : null;
  } catch {
    return null;
  }
}

export function startProjectVideos(root = document) {
  const doc = root.ownerDocument || root;
  const dialog = doc.createElement('dialog');
  if (typeof dialog.showModal !== 'function') return () => {};

  const links = [...root.querySelectorAll('.reveal-links a')]
    .map(link => ({ link, id: youtubeId(link.href), popup: link.getAttribute('aria-haspopup') }))
    .filter(entry => entry.id);
  if (!links.length) return () => {};

  dialog.className = 'project-video-dialog';
  dialog.setAttribute('aria-label', 'Project video');
  dialog.innerHTML = `<header class="project-video-heading"><h2></h2><button class="project-video-close" type="button" aria-label="Close video" autofocus>[ Close × ]</button></header><div class="project-video-screen"></div><footer class="project-video-footer"><a target="_blank" rel="noopener noreferrer">Watch on YouTube <span aria-hidden="true">↗</span></a></footer>`;
  const title = dialog.querySelector('h2');
  const screen = dialog.querySelector('.project-video-screen');
  const closeButton = dialog.querySelector('.project-video-close');
  const externalLink = dialog.querySelector('.project-video-footer a');
  let opener = null;
  let locked = false;
  let outsidePointer = false;

  function release() {
    // Removing the iframe stops both playback and audio, including in bfcache.
    screen.replaceChildren();
    if (locked) doc.documentElement.classList.remove('project-video-open');
    locked = false;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    opener = null;
  }
  function close() {
    if (dialog.open) dialog.close();
    release();
  }
  function isOutside(event) {
    const rect = dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  }
  const pointerDown = event => { outsidePointer = event.target === dialog && isOutside(event); };
  const backdropClick = event => {
    if (outsidePointer && event.target === dialog && isOutside(event)) close();
    outsidePointer = false;
  };
  const cancel = event => { event.preventDefault(); close(); };
  const closed = () => { if (!dialog.open) release(); };
  closeButton.addEventListener('click', close);
  dialog.addEventListener('cancel', cancel);
  dialog.addEventListener('close', closed);
  dialog.addEventListener('pointerdown', pointerDown);
  dialog.addEventListener('click', backdropClick);
  doc.defaultView?.addEventListener('pagehide', close);

  const removeListeners = links.map(({ link, id }) => {
    link.setAttribute('aria-haspopup', 'dialog');
    const click = event => {
      if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!dialog.isConnected) doc.body.append(dialog);
      opener = link;
      const name = link.closest('.project-reveal')?.dataset.projectName || 'Project';
      const label = link.textContent.replace('↗', '').trim();
      const heading = `${name} / ${label}`;
      title.textContent = heading;
      dialog.setAttribute('aria-label', heading);
      externalLink.href = link.href;
      dialog.showModal();
      event.preventDefault();
      locked = !doc.documentElement.classList.contains('project-video-open');
      doc.documentElement.classList.add('project-video-open');
      const iframe = doc.createElement('iframe');
      iframe.title = heading;
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`;
      screen.replaceChildren(iframe);
      closeButton.focus({ preventScroll: true });
    };
    link.addEventListener('click', click);
    return () => link.removeEventListener('click', click);
  });

  return () => {
    close();
    removeListeners.forEach(remove => remove());
    links.forEach(({ link, popup }) => {
      if (popup === null) link.removeAttribute('aria-haspopup');
      else link.setAttribute('aria-haspopup', popup);
    });
    closeButton.removeEventListener('click', close);
    dialog.removeEventListener('cancel', cancel);
    dialog.removeEventListener('close', closed);
    dialog.removeEventListener('pointerdown', pointerDown);
    dialog.removeEventListener('click', backdropClick);
    doc.defaultView?.removeEventListener('pagehide', close);
    dialog.remove();
  };
}
