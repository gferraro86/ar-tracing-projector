import * as THREE from 'three';
import { setupImageLoader, getTexture } from './image-loader.js';
import {
  checkARSupport,
  startARSession,
  endSession,
  setOnFrame,
  getScene,
  getRenderer,
  getReferenceSpace,
} from './ar-session.js';
import {
  anchorOverlay,
  resetAnchor,
  releaseAnchorKeepMesh,
  getLastCornerWorldPositions,
} from './anchor-manager.js';
import { hideReticle, getLastHitPose, getLastHitResult } from './hit-test.js';
import {
  initCornerHandles,
  setDefaultPositions,
  setHandlePositions,
  getHandlePositions,
  showHandles,
  hideHandles,
  disposeCornerHandles,
} from './corner-handles.js';
import { screenToWorld, worldToScreen, planeFromHitPose } from './screen-to-world.js';
import {
  setupOpacityControl,
  showCalibrateUI,
  showTracingUI,
  toggleTracingMenu,
  hideTracingMenu,
  showOverlay,
  hideOverlay,
} from './ui.js';

// DOM elements
const fileInput = document.getElementById('image-input');
const previewImg = document.getElementById('preview-img');
const previewContainer = document.getElementById('image-preview');
const btnStartAR = document.getElementById('btn-start-ar');
const arError = document.getElementById('ar-error');
const arOverlay = document.getElementById('ar-overlay');
const cornerHandlesContainer = document.getElementById('corner-handles-container');
const btnConfirm = document.getElementById('btn-confirm');
const btnExitCalibrate = document.getElementById('btn-exit-calibrate');
const btnRealign = document.getElementById('btn-realign');
const btnExit = document.getElementById('btn-exit');
const opacitySlider = document.getElementById('opacity-slider');
const opacityValue = document.getElementById('opacity-value');
const tracingMenuHandle = document.getElementById('tracing-menu-handle');

async function init() {
  setupImageLoader(fileInput, previewImg, previewContainer, btnStartAR);
  setupOpacityControl(opacitySlider, opacityValue);

  const arSupported = await checkARSupport();
  if (!arSupported) {
    arError.textContent = 'WebXR AR non supportato su questo dispositivo/browser. Usa Chrome su Android con ARCore.';
    arError.classList.remove('hidden');
    btnStartAR.disabled = true;
    return;
  }

  btnStartAR.addEventListener('click', onStartAR);
  btnConfirm.addEventListener('click', onConfirm);
  btnExitCalibrate.addEventListener('click', onExit);
  btnRealign.addEventListener('click', onRealign);
  btnExit.addEventListener('click', onExit);
  tracingMenuHandle.addEventListener('click', toggleTracingMenu);
}

async function onStartAR() {
  const texture = getTexture();
  if (!texture) return;

  try {
    document.getElementById('screen-picker').classList.remove('active');
    showOverlay();
    showCalibrateUI();

    await startARSession(arOverlay);

    // Create the 4 draggable corner handles
    initCornerHandles(cornerHandlesContainer);
    setDefaultPositions();
    showHandles();
  } catch (e) {
    console.error('Failed to start AR:', e);
    arError.textContent = `Errore avvio AR: ${e.message}`;
    arError.classList.remove('hidden');
    document.getElementById('screen-picker').classList.add('active');
    hideOverlay();
  }
}

function onConfirm() {
  // Get current handle positions in screen pixels
  const handlePositions = getHandlePositions();

  // Get the surface plane from the last hit test (the reticle is pointing at it)
  const hitPose = getLastHitPose();
  if (!hitPose) {
    alert('Nessuna superficie rilevata. Inquadra il canvas e riprova.');
    return;
  }

  const plane = planeFromHitPose(hitPose);
  if (!plane) {
    alert('Errore nel calcolo del piano.');
    return;
  }

  // Get the synced XR camera from Three.js
  const xrCamera = getRenderer().xr.getCamera();

  // Convert each handle screen position to a world point on the plane
  const cornerPoints = [];
  for (const pos of handlePositions) {
    const worldPoint = screenToWorld(pos.x, pos.y, plane, xrCamera);
    if (!worldPoint) {
      alert('Impossibile proiettare i punti sul piano. Riprova.');
      return;
    }
    cornerPoints.push(worldPoint);
  }

  // Compute centroid as the anchor center
  const centroid = new THREE.Vector3();
  for (const p of cornerPoints) centroid.add(p);
  centroid.divideScalar(4);

  // Get center quaternion from the hit pose
  const centerQuat = new THREE.Quaternion(
    hitPose.transform.orientation.x,
    hitPose.transform.orientation.y,
    hitPose.transform.orientation.z,
    hitPose.transform.orientation.w
  );

  const hitResult = getLastHitResult();

  // Hide handles immediately so they don't sit on top during transition
  hideHandles();
  hideReticle();

  // Create the anchor in the next render frame
  setOnFrame(async (timestamp, frame) => {
    const texture = getTexture();
    const success = await anchorOverlay(
      hitResult,
      frame,
      cornerPoints,
      centroid,
      centerQuat,
      getReferenceSpace(),
      texture
    );

    setOnFrame(null);

    if (success) {
      showTracingUI();
    } else {
      console.error('Failed to create anchor overlay');
      // Roll back to calibration
      showHandles();
      showCalibrateUI();
    }
  });
}

function onRealign() {
  hideTracingMenu();

  // Get the current overlay corners in world space, project them to screen pixels
  const worldCorners = getLastCornerWorldPositions();
  releaseAnchorKeepMesh();

  showCalibrateUI();
  showHandles();

  if (worldCorners) {
    const xrCamera = getRenderer().xr.getCamera();
    const screenPositions = worldCorners.map(wp => worldToScreen(wp, xrCamera));
    setHandlePositions(screenPositions);
  } else {
    setDefaultPositions();
  }
}

async function onExit() {
  hideHandles();
  disposeCornerHandles();
  resetAnchor();
  await endSession();
  hideOverlay();
  document.getElementById('screen-picker').classList.add('active');
}

init();
