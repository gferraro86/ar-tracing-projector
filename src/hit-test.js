import * as THREE from 'three';

let hitTestSource = null;
let lastHitPose = null;
let lastHitResult = null;
let reticle = null;

export function createReticle() {
  const ring = new THREE.RingGeometry(0.03, 0.04, 32);
  ring.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x4361ee,
    side: THREE.DoubleSide,
  });
  reticle = new THREE.Mesh(ring, mat);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  return reticle;
}

export async function initHitTest(session) {
  const viewerSpace = await session.requestReferenceSpace('viewer');
  hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
}

export function processHitTest(frame, referenceSpace) {
  if (!hitTestSource) return;

  const results = frame.getHitTestResults(hitTestSource);
  if (results.length > 0) {
    const pose = results[0].getPose(referenceSpace);
    if (pose) {
      lastHitPose = pose;
      lastHitResult = results[0];
      if (reticle) {
        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);
      }
    }
  } else {
    if (reticle) reticle.visible = false;
    lastHitPose = null;
    lastHitResult = null;
  }
}

export function getLastHitPose() {
  return lastHitPose;
}

export function getLastHitResult() {
  return lastHitResult;
}

export function hideReticle() {
  if (reticle) reticle.visible = false;
}

export function dispose() {
  hitTestSource = null;
  lastHitPose = null;
  lastHitResult = null;
  if (reticle) {
    reticle.geometry.dispose();
    reticle.material.dispose();
    reticle = null;
  }
}
