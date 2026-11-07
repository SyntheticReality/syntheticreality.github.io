import { startMissionMap } from './mission-map.js';

const canvas = document.querySelector('#mission-map');
const map = canvas ? startMissionMap(canvas) : null;
const tabs = [...document.querySelectorAll('[data-phase]')];
const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
const keys = [...document.querySelectorAll('[data-key]')];

function selectPhase(index, focus = false) {
  tabs.forEach((tab, i) => {
    tab.setAttribute('aria-selected', String(i === index));
    tab.tabIndex = i === index ? 0 : -1;
    panels[i].hidden = i !== index;
    keys[i]?.classList.toggle('is-active', i === index);
  });
  map?.setStage(index);
  if (focus) tabs[index].focus();
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectPhase(index));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    selectPhase(next, true);
  });
});
