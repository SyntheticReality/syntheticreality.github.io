import { experiments, startHeroExperiment } from './hero-experiments.js';

const canvas = document.querySelector('.experiment-canvas');
const buttons = [...document.querySelectorAll('.experiment-choice')];
const controller = startHeroExperiment(canvas, 1);
const name = document.querySelector('#experiment-name');
const description = document.querySelector('#experiment-description');
const hint = document.querySelector('#experiment-hint');
const homepage = document.querySelector('#experiment-home');

function selectExperiment(id, updateHistory = true) {
  const index = Math.max(1, Math.min(10, Math.round(Number(id) || 1)));
  const experiment = experiments[index - 1];
  buttons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.experiment) === index)));
  name.textContent = `${String(index).padStart(2, '0')} / ${experiment.name}`;
  description.textContent = experiment.description;
  hint.textContent = experiment.hint;
  homepage.href = `/?hero=${String(index).padStart(2, '0')}`;
  controller.setMode(index);
  if (updateHistory) history.replaceState(null, '', `#${String(index).padStart(2, '0')}`);
}
buttons.forEach(button => {
  button.addEventListener('click', () => selectExperiment(button.dataset.experiment));
  button.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = buttons.indexOf(button);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 9 : (index + (['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : 9)) % 10;
    buttons[next].focus(); selectExperiment(next + 1);
  });
});
window.addEventListener('hashchange', () => selectExperiment(location.hash.slice(1), false));
selectExperiment(/^#(?:0[1-9]|10)$/.test(location.hash) ? location.hash.slice(1) : 1, false);
