import { topographyStudies, startTopography } from './topography-experiments.js';

const buttons = [...document.querySelectorAll('[data-topography]')];
const select = document.querySelector('#topography-select');
const controller = startTopography(document.querySelector('.experiment-canvas'));
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let selected = 1;

function updateHint() {
  document.querySelector('#experiment-hint').textContent = reduced.matches
    ? 'Still preview. Choose a study to compare its contour structure.'
    : topographyStudies[selected - 1].hint;
}

function choose(value, updateHistory = true) {
  selected = Math.max(1, Math.min(10, Math.round(Number(value) || 1)));
  const study = topographyStudies[selected - 1], number = String(selected).padStart(2, '0');
  buttons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.topography) === selected)));
  select.value = String(selected);
  document.querySelector('#experiment-name').textContent = `${number} / ${study.name}`;
  document.querySelector('#experiment-description').textContent = study.description;
  updateHint();
  document.querySelector('#topography-level').textContent = study.level;
  document.querySelector('#experiment-home').href = `/?topography=${number}`;
  controller.setMode(selected);
  if (updateHistory) history.replaceState(null, '', `#${number}`);
}
buttons.forEach((button, index) => {
  button.addEventListener('click', () => choose(button.dataset.topography));
  button.addEventListener('keydown', event => {
    if (!['ArrowDown','ArrowUp','ArrowRight','ArrowLeft','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 9 : (index + (['ArrowDown','ArrowRight'].includes(event.key) ? 1 : 9)) % 10;
    buttons[next].focus(); choose(next + 1);
  });
});
select.addEventListener('change', () => choose(select.value));
document.querySelector('[data-topography-prev]').addEventListener('click', () => choose(selected === 1 ? 10 : selected - 1));
document.querySelector('[data-topography-next]').addEventListener('click', () => choose(selected === 10 ? 1 : selected + 1));
window.addEventListener('hashchange', () => choose(location.hash.slice(1), false));
reduced.addEventListener('change', updateHint);
choose(/^#(?:0[1-9]|10)$/.test(location.hash) ? location.hash.slice(1) : 1, false);
