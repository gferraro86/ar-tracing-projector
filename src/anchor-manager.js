import * as THREE from 'three';
import { createOverlayMesh, disposeOverlay } from './overlay-mesh.js';

let anchor = null;
let overlayGroup = null;
let scene = null;
let locked = false;

// Smoothing state
const smoothPosition = new THREE.Vector3();
const smoothQuaternion = new THREE.Quaternion();
let hasInitialPose = false;
const SMOOTH_FACTOR = 0.15; // lower = smoother but slower to converge

// Lock averaging state
let lockSamples = [];
const LOCK_SAMPLE_COUNT = 20; // frames to average before locking
let onLockReady = null;

export function initAnchorManager(sceneRef) {
  scene = sceneRef;
  overlayGroup = new THREE.Group();
  overlayGroup.matrixAutoUpdate = false;
  scene.add(overlayGroup);
  locked = false;
  hasInitialPose = false;
  lockSamples = [];
  onLockReady = null;
}

export async function anchorOverlay(frame, points, referenceSpace, texture) {
  const centroid = new THREE.Vector3();
  for (const p of points) centroid.add(p);
  centroid.divideScalar(4);

  const localPoints = points.map(p => p.clone().sub(centroid));

  const mesh = createOverlayMesh(texture, localPoints);
  if (!mesh) return false;

  overlayGroup.add(mesh);

  if (frame.createAnchor) {
    try {
      const anchorPose = new XRRigidTransform(
        { x: centroid.x, y: centroid.y, z: centroid.z, w: 1 },
        { x: 0, y: 0, z: 0, w: 1 }
      );
      anchor = await frame.createAnchor(anchorPose, referenceSpace);
    } catch (e) {
      console.warn('Could not create XR anchor, using static position:', e);
      anchor = null;
    }
  }

  if (!anchor) {
    overlayGroup.matrixAutoUpdate = true;
    overlayGroup.position.copy(centroid);
    overlayGroup.updateMatrix();
    overlayGroup.matrixWorldNeedsUpdate = true;
    overlayGroup.matrixAutoUpdate = false;
  }

  locked = false;
  hasInitialPose = false;
  return true;
}

/**
 * Update anchor pose each frame with EMA smoothing.
 * When locked, stops updating (image stays perfectly still in world space,
 * but camera still moves freely so user sees different parts when moving).
 */
export function updateAnchor(frame, referenceSpace) {
  if (locked || !anchor || !frame.trackedAnchors) return;

  for (const trackedAnchor of frame.trackedAnchors) {
    if (trackedAnchor === anchor) {
      const pose = frame.getPose(trackedAnchor.anchorSpace, referenceSpace);
      if (!pose) break;

      const m = pose.transform.matrix;
      const newPos = new THREE.Vector3(m[12], m[13], m[14]);
      const newQuat = new THREE.Quaternion(
        pose.transform.orientation.x,
        pose.transform.orientation.y,
        pose.transform.orientation.z,
        pose.transform.orientation.w
      );

      if (!hasInitialPose) {
        smoothPosition.copy(newPos);
        smoothQuaternion.copy(newQuat);
        hasInitialPose = true;
      } else {
        smoothPosition.lerp(newPos, SMOOTH_FACTOR);
        smoothQuaternion.slerp(newQuat, SMOOTH_FACTOR);
      }

      // Apply smoothed pose
      const mat = new THREE.Matrix4();
      mat.compose(smoothPosition, smoothQuaternion, new THREE.Vector3(1, 1, 1));
      overlayGroup.matrix.copy(mat);
      overlayGroup.matrixWorldNeedsUpdate = true;

      // Collect samples for lock averaging
      if (lockSamples !== null && lockSamples.length < LOCK_SAMPLE_COUNT) {
        lockSamples.push({ pos: newPos.clone(), quat: newQuat.clone() });

        if (lockSamples.length >= LOCK_SAMPLE_COUNT && onLockReady) {
          onLockReady();
          onLockReady = null;
        }
      }

      break;
    }
  }
}

/**
 * Collect N frames of pose data, average them, and lock the position.
 * The image stays fixed in 3D world space — the camera still moves freely.
 */
export function confirmAndLock(callback) {
  lockSamples = [];

  onLockReady = () => {
    // Average position
    const avgPos = new THREE.Vector3();
    for (const s of lockSamples) avgPos.add(s.pos);
    avgPos.divideScalar(lockSamples.length);

    // Average quaternion (incremental slerp)
    const avgQuat = new THREE.Quaternion().copy(lockSamples[0].quat);
    for (let i = 1; i < lockSamples.length; i++) {
      avgQuat.slerp(lockSamples[i].quat, 1 / (i + 1));
    }

    // Apply and lock
    const mat = new THREE.Matrix4();
    mat.compose(avgPos, avgQuat, new THREE.Vector3(1, 1, 1));
    overlayGroup.matrix.copy(mat);
    overlayGroup.matrixWorldNeedsUpdate = true;

    locked = true;
    lockSamples = [];
    if (callback) callback();
  };
}

export function isLocked() {
  return locked;
}

export function unlock() {
  locked = false;
  hasInitialPose = false;
  lockSamples = [];
  onLockReady = null;
}

export function resetAnchor() {
  if (anchor && anchor.delete) anchor.delete();
  anchor = null;
  locked = false;
  hasInitialPose = false;
  lockSamples = [];
  onLockReady = null;

  while (overlayGroup.children.length > 0) {
    overlayGroup.remove(overlayGroup.children[0]);
  }
  disposeOverlay();
}

export function dispose() {
  resetAnchor();
  if (overlayGroup && scene) scene.remove(overlayGroup);
  overlayGroup = null;
  scene = null;
}
