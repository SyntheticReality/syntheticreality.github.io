import {startPortraitArt, PORTRAIT_VARIANTS} from './portrait-art.js';

const descriptions = {
  soft: '01 / Soft dissolve — fuller shoulders, thinning gradually into the page. Up to 520px wide.',
  airy: '02 / Airy torso — a clearer face with a lighter, sparser torso. Up to 560px wide.',
  shoulders: '03 / Shoulder dissolve — the outer shoulders disappear first, leaving a central trail of text. Up to 600px wide.',
  floating: '04 / Floating portrait — the largest face, with the torso dissolving sooner. Up to 640px wide.'
};
const canvas = document.querySelector('[data-portrait-comparison]');
const layout = document.querySelector('[data-option]');
const description = document.querySelector('[data-option-description]');
const buttons = [...document.querySelectorAll('[data-portrait-option]')];
const portrait = startPortraitArt(canvas);
function choose(option, updateUrl = true) {
  const key = PORTRAIT_VARIANTS[option] ? option : 'soft';
  layout.dataset.option = key;
  buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.portraitOption === key)));
  description.textContent = descriptions[key];
  portrait.setVariant(key);
  if (updateUrl) {
    const url = new URL(location.href); url.searchParams.set('option', key);
    history.replaceState(null, '', url);
  }
}
buttons.forEach(button => button.addEventListener('click', () => choose(button.dataset.portraitOption)));
choose(new URL(location.href).searchParams.get('option'), false);
