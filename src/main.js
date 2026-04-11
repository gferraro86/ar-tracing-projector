import { setupImageLoader, getTexture } from './image-loader.js';
import { startARScene, stopARScene, getScene, getCamera, getArContext, setOnFrame } from './ar-scene.js';
import { initMarkers, updateMarkers, getVisibleMarkers, disposeMarkers } from './marker-tracker.js';
import { calibrateCanvas, getCurrentCorners, isCalibrated, resetCalibration } from './canvas-mapper.js';
import { initCornerPicker, handleTap, undoLastTap, reset as resetCornerPicker, clearVisuals } from './corner-picker.js';
import { createOverlayMesh, updateOverlayCorners, disposeOverlay, setOpacity } from './overlay-mesh.js';

// DOM elements
const fileInput = document.getElementById('image-input');
const previewImg = document.getElementById('preview-img');
const previewContainer = document.getElementById('image-preview');
const btnStartAR = document.getElementById('btn-start-ar');
const arError = document.getElementById('ar-error');
const arOverlay = document.getElementById('ar-overlay');
const pointCounter = document.getElementById('point-counter');
const btnUndoPoint = document.getElementById('btn-undo-point');
const opacitySlider = document.getElementById('opacity-slider');
const opacityValue = document.getElementById('opacity-value');
const btnReset = document.getElementById('btn-reset');
const btnExit = document.getElementById('btn-exit');
const markersStatus = document.getElementById('markers-status');

let mode = 'idle'; // 'idle' | 'calibrating' | 'tracing'
let overlayMesh = null;

function init() {
  setupImageLoader(fileInput, previewImg, previewContainer, btnStartAR);

  opacitySlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    opacityValue.textContent = `${val}%`;
    setOpacity(val / 100);
  });

  btnStartAR.addEventListener('click', onStartAR);
  btnUndoPoint.addEventListener('click', () => undoLastTap());
  btnReset.addEventListener('click', onReset);
  btnExit.addEventListener('click', onExit);

  // Tap on screen during calibration → corner picker
  document.addEventListener('click', onScreenTap);
}

async function onStartAR() {
  const texture = getTexture();
  if (!texture) return;

  try {
    document.getElementById('screen-picker').classList.remove('active');
    showOverlay();
    showCalibratingUI();

    await startARScene();

    // Initialize markers in the AR context
    initMarkers(getArContext(), getScene());

    // Initialize corner picker
    initCornerPicker(getCamera(), getScene(), pointCounter, btnUndoPoint, onCornersComplete);

    mode = 'calibrating';

    // Set per-frame callback
    setOnFrame(onArFrame);
  } catch (e) {
    console.error('Failed to start AR:', e);
    arError.textContent = `Errore avvio AR: ${e.message}`;
    arError.classList.remove('hidden');
    document.getElementById('screen-picker').classList.add('active');
    hideOverlay();
  }
}

function onArFrame() {
  // Update marker visibility cache
  updateMarkers();

  // Show how many markers are currently visible
  if (markersStatus) {
    const visible = getVisibleMarkers();
    markersStatus.textContent = `Marker visibili: ${visible.length} (${visible.map(m => m.id).join(', ') || 'nessuno'})`;
  }

  // In tracing mode, update the overlay corners from the canvas map
  if (mode === 'tracing' && overlayMesh) {
    const corners = getCurrentCorners();
    if (corners) {
      updateOverlayCorners(corners);
      overlayMesh.visible = true;
    } else {
      overlayMesh.visible = false;
    }
  }
}

function onScreenTap(event) {
  if (mode !== 'calibrating') return;

  // Ignore taps on UI elements
  if (event.target.closest('.btn') || event.target.closest('input') || event.target.closest('label')) {
    return;
  }

  // Convert screen coordinates to NDC (-1 to 1)
  const x = (event.clientX / window.innerWidth) * 2 - 1;
  const y = -(event.clientY / window.innerHeight) * 2 + 1;

  handleTap(x, y);
}

function onCornersComplete(corners) {
  // Build the canvas map from these 4 world points + currently visible markers
  const success = calibrateCanvas(corners);

  if (!success) {
    alert('Errore di calibrazione: nessun marker visibile. Riprova.');
    return;
  }

  // Clear the visual marker spheres (we don't need them anymore)
  clearVisuals();

  // Create the overlay mesh and add it to the scene
  const texture = getTexture();
  overlayMesh = createOverlayMesh(texture);
  getScene().add(overlayMesh);

  // Switch to tracing mode
  mode = 'tracing';
  showTracingUI();
}

function onReset() {
  resetCornerPicker();
  resetCalibration();

  if (overlayMesh) {
    getScene().remove(overlayMesh);
    disposeOverlay();
    overlayMesh = null;
  }

  mode = 'calibrating';
  showCalibratingUI();
}

function onExit() {
  resetCornerPicker();
  resetCalibration();
  disposeOverlay();
  disposeMarkers();
  stopARScene();
  overlayMesh = null;
  mode = 'idle';

  hideOverlay();
  document.getElementById('screen-picker').classList.add('active');
}

function showOverlay() {
  document.getElementById('ar-overlay').classList.remove('hidden');
}
function hideOverlay() {
  document.getElementById('ar-overlay').classList.add('hidden');
}
function showCalibratingUI() {
  document.getElementById('ar-picking-ui').classList.remove('hidden');
  document.getElementById('ar-tracing-ui').classList.add('hidden');
}
function showTracingUI() {
  document.getElementById('ar-picking-ui').classList.add('hidden');
  document.getElementById('ar-tracing-ui').classList.remove('hidden');
}

init();
