import { setupImageLoader, getTexture } from './image-loader.js';
import {
  checkARSupport,
  startARSession,
  endSession,
  setOnSelect,
  setOnFrame,
  getScene,
  getReferenceSpace,
} from './ar-session.js';
import { initPointPicker, handleSelect, undoLastPoint, reset as resetPoints } from './point-picker.js';
import { anchorOverlay, resetAnchor } from './anchor-manager.js';
import { hideReticle, getLastHitResult } from './hit-test.js';
import { setupTracingUI, showPickingUI, showTracingUI, showOverlay, hideOverlay } from './ui.js';

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

let cornerPoints = null;

async function init() {
  setupImageLoader(fileInput, previewImg, previewContainer, btnStartAR);
  setupTracingUI(opacitySlider, opacityValue);

  const arSupported = await checkARSupport();
  if (!arSupported) {
    arError.textContent = 'WebXR AR non supportato su questo dispositivo/browser. Usa Chrome su Android con ARCore.';
    arError.classList.remove('hidden');
    btnStartAR.disabled = true;
    return;
  }

  btnStartAR.addEventListener('click', onStartAR);
  btnUndoPoint.addEventListener('click', () => undoLastPoint());
  btnReset.addEventListener('click', onReset);
  btnExit.addEventListener('click', onExit);
}

async function onStartAR() {
  const texture = getTexture();
  if (!texture) return;

  try {
    document.getElementById('screen-picker').classList.remove('active');
    showOverlay();
    showPickingUI();

    await startARSession(arOverlay);

    // Init point picker with two callbacks:
    // 1. onCornersComplete: called after 4 corner taps (shows "tap center" instruction)
    // 2. onCenterComplete: called after 5th tap at center
    initPointPicker(
      getScene(),
      pointCounter,
      btnUndoPoint,
      onCornersComplete,
      onCenterComplete
    );

    setOnSelect(() => {
      handleSelect(getReferenceSpace());
    });
  } catch (e) {
    console.error('Failed to start AR:', e);
    arError.textContent = `Errore avvio AR: ${e.message}`;
    arError.classList.remove('hidden');
    document.getElementById('screen-picker').classList.add('active');
    hideOverlay();
  }
}

function onCornersComplete(points) {
  // Store corners, wait for center tap
  cornerPoints = points;
}

function onCenterComplete(centerPoint) {
  hideReticle();
  setOnSelect(null);

  // Capture the hit test result at the center point
  const hitResult = getLastHitResult();

  // Create the anchor in the next render frame
  setOnFrame(async (timestamp, frame) => {
    const texture = getTexture();
    const success = await anchorOverlay(
      hitResult,
      frame,
      cornerPoints,
      centerPoint,
      getReferenceSpace(),
      texture
    );

    setOnFrame(null);

    if (success) {
      showTracingUI();
    } else {
      console.error('Failed to create anchor overlay');
      onReset();
    }
  });
}

function onReset() {
  cornerPoints = null;
  resetPoints();
  resetAnchor();
  showPickingUI();

  initPointPicker(
    getScene(),
    pointCounter,
    btnUndoPoint,
    onCornersComplete,
    onCenterComplete
  );
  setOnSelect(() => {
    handleSelect(getReferenceSpace());
  });
}

async function onExit() {
  await endSession();
  hideOverlay();
  document.getElementById('screen-picker').classList.add('active');
}

init();
