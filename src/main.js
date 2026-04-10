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

let pendingAnchorPoints = null;
let pendingHitResult = null;

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

    initPointPicker(getScene(), pointCounter, btnUndoPoint, onPointsComplete);

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

function onPointsComplete(points) {
  hideReticle();
  pendingAnchorPoints = points;
  // Capture the current hit test result for stable anchor creation
  pendingHitResult = getLastHitResult();
  setOnSelect(null);

  // Create the anchor in the next render frame
  setOnFrame(async (timestamp, frame) => {
    if (!pendingAnchorPoints) return;

    const pts = pendingAnchorPoints;
    const hitResult = pendingHitResult;
    pendingAnchorPoints = null;
    pendingHitResult = null;

    const texture = getTexture();
    const success = await anchorOverlay(hitResult, frame, pts, getReferenceSpace(), texture);

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
  resetPoints();
  resetAnchor();
  showPickingUI();

  initPointPicker(getScene(), pointCounter, btnUndoPoint, onPointsComplete);
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
