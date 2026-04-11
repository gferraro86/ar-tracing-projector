import * as THREE from 'three';
import { getVisibleMarkers, getAllMarkers } from './marker-tracker.js';

/**
 * Canvas Map: stores the 4 corner positions of the canvas in the local
 * coordinate system of EACH visible marker. This way, when any marker is
 * visible at runtime, we can compute the world position of the corners
 * by transforming the local positions through the marker's current pose.
 *
 * Structure:
 * {
 *   1: [Vector3, Vector3, Vector3, Vector3],  // marker ID 1 -> 4 corner offsets
 *   3: [Vector3, Vector3, Vector3, Vector3],
 *   ...
 * }
 */
let cornerOffsets = {};

export function isCalibrated() {
  return Object.keys(cornerOffsets).length > 0;
}

export function getCalibratedMarkerIds() {
  return Object.keys(cornerOffsets).map(Number);
}

export function resetCalibration() {
  cornerOffsets = {};
}

/**
 * Build the canvas map from 4 world-space corner points.
 * For each currently visible marker, store the 4 corners in the marker's local space.
 *
 * worldCorners: array of 4 THREE.Vector3 (top-left, top-right, bottom-right, bottom-left)
 */
export function calibrateCanvas(worldCorners) {
  cornerOffsets = {};

  const visibleMarkers = getVisibleMarkers();
  if (visibleMarkers.length === 0) {
    console.warn('No markers visible during calibration');
    return false;
  }

  for (const marker of visibleMarkers) {
    // Compute the inverse of the marker's matrix to transform world -> marker local
    const inverseMatrix = new THREE.Matrix4().copy(marker.lastMatrix).invert();

    const localCorners = worldCorners.map(worldPos => {
      const local = worldPos.clone().applyMatrix4(inverseMatrix);
      return local;
    });

    cornerOffsets[marker.id] = localCorners;
  }

  console.log(`Calibrated with ${visibleMarkers.length} markers:`, Object.keys(cornerOffsets));
  return true;
}

/**
 * Compute the current world-space corner positions by averaging
 * across all currently visible & calibrated markers.
 *
 * Returns: array of 4 THREE.Vector3, or null if no calibrated marker is visible
 */
export function getCurrentCorners() {
  const visibleMarkers = getVisibleMarkers();
  const usableMarkers = visibleMarkers.filter(m => cornerOffsets[m.id]);

  if (usableMarkers.length === 0) return null;

  // Accumulator for averaging
  const sums = [
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
  ];

  for (const marker of usableMarkers) {
    const localCorners = cornerOffsets[marker.id];
    for (let i = 0; i < 4; i++) {
      // Transform local corner -> world via the marker's current matrix
      const worldPos = localCorners[i].clone().applyMatrix4(marker.lastMatrix);
      sums[i].add(worldPos);
    }
  }

  // Average
  const count = usableMarkers.length;
  return sums.map(s => s.divideScalar(count));
}
