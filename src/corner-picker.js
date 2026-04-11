import * as THREE from 'three';
import { getVisibleMarkers } from './marker-tracker.js';

const CORNER_LABELS = ['TOP-LEFT', 'TOP-RIGHT', 'BOTTOM-RIGHT', 'BOTTOM-LEFT'];

const taps = []; // array of THREE.Vector3 in world space
const markers3D = []; // visual marker spheres in the scene

let camera = null;
let scene = null;
let onComplete = null;
let counterEl = null;
let undoBtn = null;
let instructionsEl = null;
let undoTimestamp = 0;

export function initCornerPicker(cameraRef, sceneRef, counterElement, undoButton, completeCb) {
  camera = cameraRef;
  scene = sceneRef;
  counterEl = counterElement;
  undoBtn = undoButton;
  instructionsEl = document.getElementById('picking-instructions');
  onComplete = completeCb;
  taps.length = 0;
  markers3D.length = 0;
  undoTimestamp = 0;
  updateUI();
}

/**
 * Handle a tap on the screen at given normalized device coordinates (NDC: -1 to 1).
 * Raycast through the camera into the scene, intersect with the plane of the
 * currently visible markers, and add the world point as a corner.
 */
export function handleTap(ndcX, ndcY) {
  if (Date.now() - undoTimestamp < 400) return;
  if (taps.length >= 4) return;

  const visibleMarkers = getVisibleMarkers();
  if (visibleMarkers.length === 0) {
    console.warn('No markers visible — cannot pick corner');
    return;
  }

  // Compute the average plane defined by the visible markers
  // Each marker's matrix represents its position and orientation
  // We use the first marker as the plane reference (Y=0 in marker local space)
  const refMarker = visibleMarkers[0];

  // The marker plane in world space:
  //  - origin: marker position (column 3 of matrix)
  //  - normal: marker Y axis (column 1 of matrix), since AR.js markers have Y as up
  //  Actually: AR.js pattern markers have Z as up (perpendicular to marker face)
  const matrix = refMarker.lastMatrix;
  const origin = new THREE.Vector3().setFromMatrixPosition(matrix);
  // Z axis of marker = perpendicular to marker face (in AR.js convention)
  const normal = new THREE.Vector3();
  normal.setFromMatrixColumn(matrix, 2).normalize();

  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, origin);

  // Raycast from camera through the tap point
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera);

  const worldPoint = new THREE.Vector3();
  const intersection = raycaster.ray.intersectPlane(plane, worldPoint);
  if (!intersection) {
    console.warn('Tap ray did not intersect marker plane');
    return;
  }

  taps.push(worldPoint.clone());
  addVisualMarker(worldPoint, taps.length - 1);
  updateUI();

  if (taps.length === 4 && onComplete) {
    onComplete([...taps]);
  }
}

function addVisualMarker(position, index) {
  const colors = [0x4361ee, 0x43ee61, 0xee4361, 0xeeee43];
  const geo = new THREE.SphereGeometry(0.02, 16, 16);
  const mat = new THREE.MeshBasicMaterial({ color: colors[index] });
  const sphere = new THREE.Mesh(geo, mat);
  sphere.position.copy(position);
  scene.add(sphere);
  markers3D.push(sphere);

  // Line to previous corner
  if (taps.length > 1) {
    const prev = taps[taps.length - 2];
    const lineGeo = new THREE.BufferGeometry().setFromPoints([prev, position]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    const line = new THREE.Line(lineGeo, lineMat);
    scene.add(line);
    markers3D.push(line);
  }

  // Close loop after 4th
  if (taps.length === 4) {
    const lineGeo = new THREE.BufferGeometry().setFromPoints([position, taps[0]]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    const line = new THREE.Line(lineGeo, lineMat);
    scene.add(line);
    markers3D.push(line);
  }
}

export function undoLastTap() {
  if (taps.length === 0) return;
  undoTimestamp = Date.now();
  taps.pop();

  // Remove last visual marker (sphere + maybe line)
  const last = markers3D.pop();
  scene.remove(last);
  last.geometry.dispose();
  last.material.dispose();

  if (markers3D.length > 0 && markers3D[markers3D.length - 1] instanceof THREE.Line) {
    const line = markers3D.pop();
    scene.remove(line);
    line.geometry.dispose();
    line.material.dispose();
  }

  updateUI();
}

function updateUI() {
  if (counterEl) counterEl.textContent = `${taps.length} / 4`;
  if (undoBtn) undoBtn.disabled = taps.length === 0;
  if (instructionsEl) {
    if (taps.length < 4) {
      instructionsEl.textContent = `Tocca: ${CORNER_LABELS[taps.length]}`;
    } else {
      instructionsEl.textContent = 'Calibrazione completata';
    }
  }
}

export function reset() {
  for (const obj of markers3D) {
    scene.remove(obj);
    obj.geometry.dispose();
    obj.material.dispose();
  }
  markers3D.length = 0;
  taps.length = 0;
  undoTimestamp = 0;
  updateUI();
}

export function clearVisuals() {
  // Remove visual markers but keep the tap data
  for (const obj of markers3D) {
    scene.remove(obj);
    obj.geometry.dispose();
    obj.material.dispose();
  }
  markers3D.length = 0;
}
