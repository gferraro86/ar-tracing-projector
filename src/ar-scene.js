import * as THREE from 'three';
import { ArToolkitSource, ArToolkitContext } from '@ar-js-org/ar.js/three.js/build/ar-threex.mjs';

let renderer = null;
let scene = null;
let camera = null;
let arSource = null;
let arContext = null;
let onFrameCallback = null;
let animationFrameId = null;

export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getRenderer() { return renderer; }
export function getArContext() { return arContext; }

export async function startARScene() {
  // Create Three.js renderer
  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
  });
  renderer.setClearColor(new THREE.Color('lightgrey'), 0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.top = '0';
  renderer.domElement.style.left = '0';
  document.body.appendChild(renderer.domElement);

  // Scene and camera
  scene = new THREE.Scene();
  camera = new THREE.Camera();
  scene.add(camera);

  // Init AR.js source (webcam)
  arSource = new ArToolkitSource({
    sourceType: 'webcam',
    sourceWidth: 1280,
    sourceHeight: 720,
    displayWidth: window.innerWidth,
    displayHeight: window.innerHeight,
  });

  await new Promise((resolve, reject) => {
    arSource.init(
      () => {
        setTimeout(() => {
          onResize();
          resolve();
        }, 200);
      },
      (err) => reject(err)
    );
  });

  // Init AR context (handles marker detection)
  arContext = new ArToolkitContext({
    cameraParametersUrl: '/data/camera_para.dat',
    detectionMode: 'mono',
    maxDetectionRate: 60,
    canvasWidth: 1280,
    canvasHeight: 720,
  });

  await new Promise((resolve) => {
    arContext.init(() => {
      camera.projectionMatrix.copy(arContext.getProjectionMatrix());
      resolve();
    });
  });

  window.addEventListener('resize', onResize);

  // Start render loop
  animate();
}

function onResize() {
  if (!arSource) return;
  arSource.onResizeElement();
  arSource.copyElementSizeTo(renderer.domElement);
  if (arContext && arContext.arController !== null) {
    arSource.copyElementSizeTo(arContext.arController.canvas);
  }
}

function animate() {
  animationFrameId = requestAnimationFrame(animate);

  if (!arSource || !arSource.ready) return;

  arContext.update(arSource.domElement);
  scene.visible = camera.visible;

  if (onFrameCallback) onFrameCallback();

  renderer.render(scene, camera);
}

export function setOnFrame(callback) {
  onFrameCallback = callback;
}

export function stopARScene() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  window.removeEventListener('resize', onResize);

  if (arSource && arSource.domElement && arSource.domElement.srcObject) {
    const tracks = arSource.domElement.srcObject.getTracks();
    tracks.forEach(t => t.stop());
  }

  if (arSource && arSource.domElement && arSource.domElement.parentNode) {
    arSource.domElement.parentNode.removeChild(arSource.domElement);
  }

  if (renderer) {
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    renderer.dispose();
  }

  renderer = null;
  scene = null;
  camera = null;
  arSource = null;
  arContext = null;
  onFrameCallback = null;
}
