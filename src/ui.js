import { setOpacity } from './overlay-mesh.js';

export function setupOpacityControl(slider, valueEl) {
  slider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    valueEl.textContent = `${val}%`;
    setOpacity(val / 100);
  });
}

export function showCalibrateUI() {
  document.getElementById('ar-calibrate-ui').classList.remove('hidden');
  document.getElementById('ar-tracing-ui').classList.add('hidden');
  document.getElementById('tracing-menu').classList.add('hidden');
}

export function showTracingUI() {
  document.getElementById('ar-calibrate-ui').classList.add('hidden');
  document.getElementById('ar-tracing-ui').classList.remove('hidden');
  document.getElementById('tracing-menu').classList.add('hidden');
}

export function toggleTracingMenu() {
  document.getElementById('tracing-menu').classList.toggle('hidden');
}

export function hideTracingMenu() {
  document.getElementById('tracing-menu').classList.add('hidden');
}

export function showOverlay() {
  document.getElementById('ar-overlay').classList.remove('hidden');
}

export function hideOverlay() {
  document.getElementById('ar-overlay').classList.add('hidden');
}
