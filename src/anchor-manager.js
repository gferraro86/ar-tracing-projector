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
 * Create an anchor at the center point (from hit test) and attach the overlay mesh.
 * The center is where the user tapped (5th tap), and the anchor is created from
 * the hit test result at that exact spot — attached to real surface features.
 *
 * hitTestResult: XRHitTestResult from the center tap
 * frame: XRFrame
 * cornerPoints: array of 4 THREE.Vector3 (world-space corner positions)
 * centerPoint: THREE.Vector3 (world-space center position from 5th tap)
 * referenceSpace: XRReferenceSpace
 * texture: THREE.Texture
 */
export async function anchorOverlay(hitTestResult, frame, cornerPoints, centerPoint, referenceSpace, texture) {
  // Convert corner points to center-relative local coordinates
  const localPoints = cornerPoints.map(p => p.clone().sub(centerPoint));

  // Create overlay mesh with corners relative to anchor origin
  const mesh = createOverlayMesh(texture, localPoints);
  if (!mesh) return false;

  overlayGroup.add(mesh);

  // Create anchor from hit test result (most stable — attached to surface features)
  let anchorCreated = false;
  if (hitTestResult && hitTestResult.createAnchor) {
    try {
      anchor = await hitTestResult.createAnchor();
      anchorCreated = true;
    } catch (e) {
      console.warn('Could not create hit test anchor:', e);
    }
  }

  // Fallback: create anchor from frame at center position
  if (!anchorCreated && frame.createAnchor) {
    try {
      const anchorPose = new XRRigidTransform(
        { x: centerPoint.x, y: centerPoint.y, z: centerPoint.z, w: 1 },
        { x: 0, y: 0, z: 0, w: 1 }
      );
      anchor = await frame.createAnchor(anchorPose, referenceSpace);
      anchorCreated = true;
    } catch (e) {
      console.warn('Could not create frame anchor:', e);
    }
  }

  // Last resort: static position
  if (!anchorCreated) {
    overlayGroup.matrixAutoUpdate = true;
    overlayGroup.position.copy(centerPoint);
    overlayGroup.updateMatrix();
    overlayGroup.matrixWorldNeedsUpdate = true;
    overlayGroup.matrixAutoUpdate = false;
  }

  return true;
}

/**
 * Update anchor pose each frame.
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
