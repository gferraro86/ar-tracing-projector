import * as THREE from 'three';
import { initHitTest, processHitTest, createReticle, dispose as disposeHitTest } from './hit-test.js';
import { initAnchorManager, updateAnchor, dispose as disposeAnchor } from './anchor-manager.js';

let renderer = null;
let scene = null;
let camera = null;
let session = null;
let referenceSpace = null;
let onSelectCallback = null;
let onFrameCallback = null;

export function getScene() { return scene; }
export function getRenderer() { return renderer; }
export function getReferenceSpace() { return referenceSpace; }
export function getSession() { return session; }

export async function checkARSupport() {
  if (!navigator.xr) return false;
  try {
    return await navigator.xr.isSessionSupported('immersive-ar');
  } catch {
    return false;
  }
}

export async function startARSession(overlayElement) {
  // Create Three.js renderer
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Scene and camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera();

  // Add reticle
  const reticle = createReticle();
  scene.add(reticle);

  // Init anchor manager
  initAnchorManager(scene);

  // Request AR session
  const sessionOptions = {
    requiredFeatures: ['hit-test', 'local'],
    optionalFeatures: ['anchors', 'dom-overlay'],
  };

  if (overlayElement) {
    sessionOptions.domOverlay = { root: overlayElement };
  }

  session = await navigator.xr.requestSession('immersive-ar', sessionOptions);

  session.addEventListener('end', onSessionEnd);

  // Wire up select event (screen tap in handheld AR)
  session.addEventListener('select', (event) => {
    if (onSelectCallback) onSelectCallback(event);
  });

  // Set up renderer XR
  renderer.xr.setReferenceSpaceType('local');
  await renderer.xr.setSession(session);

  referenceSpace = await session.requestReferenceSpace('local');

  // Init hit testing
  await initHitTest(session);

  // Start render loop
  renderer.setAnimationLoop(onFrame);

  return session;
}

function onFrame(timestamp, frame) {
  if (!frame) return;

  // Process hit test for reticle
  processHitTest(frame, referenceSpace);

  // Update anchor tracking
  updateAnchor(frame, referenceSpace);

  // Custom per-frame callback
  if (onFrameCallback) onFrameCallback(timestamp, frame);

  renderer.render(scene, camera);
}

function onSessionEnd() {
  cleanup();
}

export function setOnSelect(callback) {
  onSelectCallback = callback;
}

export function setOnFrame(callback) {
  onFrameCallback = callback;
}

export async function endSession() {
  if (session) {
    await session.end();
  }
}

function cleanup() {
  disposeHitTest();
  disposeAnchor();

  if (renderer) {
    renderer.setAnimationLoop(null);
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    renderer.dispose();
    renderer = null;
  }

  scene = null;
  camera = null;
  session = null;
  referenceSpace = null;
  onSelectCallback = null;
  onFrameCallback = null;
}
