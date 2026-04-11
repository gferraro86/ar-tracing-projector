import * as THREE from 'three';
import { ArMarkerControls } from '@ar-js-org/ar.js/three.js/build/ar-threex.mjs';

const NUM_MARKERS = 8;
const markers = []; // { id, group, controls, lastVisible, lastMatrix }

/**
 * Initialize all markers with AR.js pattern detection.
 * Each marker has its own .patt file in /markers/
 */
export function initMarkers(arContext, scene) {
  for (let id = 1; id <= NUM_MARKERS; id++) {
    const group = new THREE.Group();
    group.name = `marker-${id}`;
    scene.add(group);

    const controls = new ArMarkerControls(arContext, group, {
      type: 'pattern',
      patternUrl: `/markers/marker-${id}.patt`,
      changeMatrixMode: 'modelViewMatrix',
      smooth: true,
      smoothCount: 5,
      smoothTolerance: 0.01,
      smoothThreshold: 2,
    });

    markers.push({
      id,
      group,
      controls,
      lastVisible: false,
      lastMatrix: new THREE.Matrix4(),
    });
  }
}

/**
 * Update marker visibility cache. Call once per frame.
 * After AR.js updates marker group matrices, we capture which ones are visible.
 */
export function updateMarkers() {
  for (const m of markers) {
    m.lastVisible = m.group.visible;
    if (m.lastVisible) {
      m.lastMatrix.copy(m.group.matrix);
    }
  }
}

/**
 * Get list of currently visible marker IDs.
 */
export function getVisibleMarkers() {
  return markers.filter(m => m.lastVisible);
}

/**
 * Get a specific marker by ID.
 */
export function getMarker(id) {
  return markers.find(m => m.id === id);
}

/**
 * Get all markers.
 */
export function getAllMarkers() {
  return markers;
}

export function disposeMarkers() {
  markers.length = 0;
}
