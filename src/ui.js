import { setOpacity } from './overlay-mesh.js';

export function setupTracingUI(opacitySlider, opacityValue) {
  opacitySlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    opacityValue.textContent = `${val}%`;
    setOpacity(val / 100);
  });
}

export function showPickingUI() {
  document.getElementById('ar-picking-ui').classList.remove('hidden');
  document.getElementById('ar-confirm-ui').classList.add('hidden');
  document.getElementById('ar-tracing-ui').classList.add('hidden');
}

export function showConfirmUI() {
  document.getElementById('ar-picking-ui').classList.add('hidden');
  document.getElementById('ar-confirm-ui').classList.remove('hidden');
  document.getElementById('ar-tracing-ui').classList.add('hidden');
  document.getElementById('lock-status').classList.add('hidden');
}

export function showLockingStatus() {
  document.getElementById('lock-status').classList.remove('hidden');
}

export function showTracingUI() {
  document.getElementById('ar-picking-ui').classList.add('hidden');
  document.getElementById('ar-confirm-ui').classList.add('hidden');
  document.getElementById('ar-tracing-ui').classList.remove('hidden');
}

export function showOverlay() {
  document.getElementById('ar-overlay').classList.remove('hidden');
}

export function hideOverlay() {
  document.getElementById('ar-overlay').classList.add('hidden');
}
