import * as THREE from 'three';
import { createOverlayMesh, disposeOverlay } from './overlay-mesh.js';

let anchor = null;
let overlayGroup = null;
let scene = null;

export function initAnchorManager(sceneRef) {
  scene = sceneRef;
  overlayGroup = new THREE.Group();
  overlayGroup.matrixAutoUpdate = false;
  scene.add(overlayGroup);
}

/**
 * Create an anchor from a hit test result and attach the overlay mesh.
 * Hit test anchors are attached to real surface feature points tracked by ARCore,
 * making them much more stable than frame.createAnchor().
 *
 * hitTestResult: XRHitTestResult from the last hit test
 * points: array of 4 THREE.Vector3 (world-space positions on the surface)
 * referenceSpace: XRReferenceSpace
 * texture: THREE.Texture
 */
export async function anchorOverlay(hitTestResult, frame, points, referenceSpace, texture) {
  // Compute centroid
  const centroid = new THREE.Vector3();
  for (const p of points) centroid.add(p);
  centroid.divideScalar(4);

  // Convert points to anchor-local coordinates
  const localPoints = points.map(p => p.clone().sub(centroid));

  // Create overlay mesh
  const mesh = createOverlayMesh(texture, localPoints);
  if (!mesh) return false;

  overlayGroup.add(mesh);

  // Try to create anchor from hit test result (most stable — attached to surface features)
  let anchorCreated = false;
  if (hitTestResult && hitTestResult.createAnchor) {
    try {
      anchor = await hitTestResult.createAnchor();
      anchorCreated = true;
    } catch (e) {
      console.warn('Could not create hit test anchor:', e);
    }
  }

  // Fallback: create anchor from frame (less stable but still works)
  if (!anchorCreated && frame.createAnchor) {
    try {
      const anchorPose = new XRRigidTransform(
        { x: centroid.x, y: centroid.y, z: centroid.z, w: 1 },
        { x: 0, y: 0, z: 0, w: 1 }
      );
      anchor = await frame.createAnchor(anchorPose, referenceSpace);
      anchorCreated = true;
    } catch (e) {
      console.warn('Could not create frame anchor:', e);
    }
  }

  // Last resort: static position (no anchor tracking at all)
  if (!anchorCreated) {
    overlayGroup.matrixAutoUpdate = true;
    overlayGroup.position.copy(centroid);
    overlayGroup.updateMatrix();
    overlayGroup.matrixWorldNeedsUpdate = true;
    overlayGroup.matrixAutoUpdate = false;
  }

  return true;
}

/**
 * Update anchor pose each frame. The hit-test-based anchor is tracked by ARCore
 * against real surface features, so it should be very stable.
 */
export function updateAnchor(frame, referenceSpace) {
  if (!anchor || !frame.trackedAnchors) return;

  for (const trackedAnchor of frame.trackedAnchors) {
    if (trackedAnchor === anchor) {
      const pose = frame.getPose(trackedAnchor.anchorSpace, referenceSpace);
      if (pose) {
        overlayGroup.matrix.fromArray(pose.transform.matrix);
        overlayGroup.matrixWorldNeedsUpdate = true;
      }
      break;
    }
  }
}

export function resetAnchor() {
  if (anchor && anchor.delete) anchor.delete();
  anchor = null;

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
