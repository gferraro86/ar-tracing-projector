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
 * Create an anchor at the centroid of the 4 points and attach the overlay mesh.
 *
 * frame: XRFrame
 * points: array of 4 THREE.Vector3 (world-space positions on the surface)
 * referenceSpace: XRReferenceSpace
 * texture: THREE.Texture
 */
export async function anchorOverlay(frame, points, referenceSpace, texture) {
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

  // Try to create an XR anchor
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

  // If no anchor API available, set static position
  if (!anchor) {
    overlayGroup.position.copy(centroid);
    overlayGroup.matrixAutoUpdate = true;
    overlayGroup.updateMatrix();
    overlayGroup.matrixAutoUpdate = false;
  }

  return true;
}

/**
 * Update anchor pose each frame. Call from render loop.
 */
export function updateAnchor(frame, referenceSpace) {
  if (!anchor || !frame.trackedAnchors) return;

  for (const trackedAnchor of frame.trackedAnchors) {
    if (trackedAnchor === anchor) {
      const pose = frame.getPose(trackedAnchor.anchorSpace, referenceSpace);
      if (pose) {
        overlayGroup.matrix.fromArray(pose.transform.matrix);
      }
      break;
    }
  }
}

export function resetAnchor() {
  if (anchor && anchor.delete) {
    anchor.delete();
  }
  anchor = null;

  // Remove overlay mesh from group
  while (overlayGroup.children.length > 0) {
    overlayGroup.remove(overlayGroup.children[0]);
  }
  disposeOverlay();
}

export function dispose() {
  resetAnchor();
  if (overlayGroup && scene) {
    scene.remove(overlayGroup);
  }
  overlayGroup = null;
  scene = null;
}
