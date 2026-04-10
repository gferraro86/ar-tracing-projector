import { setOpacity } from './overlay-mesh.js';

export function setupTracingUI(opacitySlider, opacityValue) {
  opacitySlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    opacityValue.textContent = `${val}%`;
    setOpacity(val / 100);
  });
}

export function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(screenId);
  if (screen) screen.classList.add('active');
}

export function showPickingUI() {
  document.getElementById('ar-picking-ui').classList.remove('hidden');
  document.getElementById('ar-tracing-ui').classList.add('hidden');
}

export function showTracingUI() {
  document.getElementById('ar-picking-ui').classList.add('hidden');
  document.getElementById('ar-tracing-ui').classList.remove('hidden');
}

export function showOverlay() {
  document.getElementById('ar-overlay').classList.remove('hidden');
}

export function hideOverlay() {
  document.getElementById('ar-overlay').classList.add('hidden');
}
