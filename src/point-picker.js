import * as THREE from 'three';
import { getLastHitPose } from './hit-test.js';

const CORNER_LABELS = [
  'TOP-LEFT',
  'TOP-RIGHT',
  'BOTTOM-RIGHT',
  'BOTTOM-LEFT',
];

const CORNER_COLORS = [0x4361ee, 0x43ee61, 0xee4361, 0xeeee43];

const points = [];
const markers = [];

let onComplete = null;
let scene = null;
let counterEl = null;
let undoBtn = null;
let instructionsEl = null;
let undoTimestamp = 0;

export function initPointPicker(sceneRef, counterElement, undoButton, completeCb) {
  scene = sceneRef;
  counterEl = counterElement;
  undoBtn = undoButton;
  instructionsEl = document.getElementById('picking-instructions');
  onComplete = completeCb;
  points.length = 0;
  markers.length = 0;
  undoTimestamp = 0;
  updateUI();
}

export function handleSelect(referenceSpace) {
  if (points.length >= 4) return;

  // Debounce: ignore select events shortly after an undo
  if (Date.now() - undoTimestamp < 400) return;

  const pose = getLastHitPose();
  if (!pose) return;

  const pos = new THREE.Vector3(
    pose.transform.position.x,
    pose.transform.position.y,
    pose.transform.position.z
  );

  points.push(pos);
  addMarker(pos, points.length - 1);
  updateUI();

  if (points.length === 4) {
    if (onComplete) onComplete([...points]);
  }
}

function addMarker(position, index) {
  const geo = new THREE.SphereGeometry(0.015, 16, 16);
  const mat = new THREE.MeshBasicMaterial({ color: CORNER_COLORS[index] });
  const sphere = new THREE.Mesh(geo, mat);
  sphere.position.copy(position);
  scene.add(sphere);
  markers.push(sphere);

  // Line to previous point
  if (points.length > 1) {
    const prev = points[points.length - 2];
    const lineGeo = new THREE.BufferGeometry().setFromPoints([prev, position]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    const line = new THREE.Line(lineGeo, lineMat);
    scene.add(line);
    markers.push(line);
  }

  // Close loop after 4th point
  if (points.length === 4) {
    const lineGeo = new THREE.BufferGeometry().setFromPoints([position, points[0]]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    const line = new THREE.Line(lineGeo, lineMat);
    scene.add(line);
    markers.push(line);
  }
}

export function undoLastPoint() {
  if (points.length === 0) return;

  undoTimestamp = Date.now();
  points.pop();

  // Remove marker sphere
  const sphere = markers.pop();
  scene.remove(sphere);
  sphere.geometry.dispose();
  sphere.material.dispose();

  // Remove connecting line (if any)
  if (markers.length > 0 && markers[markers.length - 1] instanceof THREE.Line) {
    const line = markers.pop();
    scene.remove(line);
    line.geometry.dispose();
    line.material.dispose();
  }

  updateUI();
}

function updateUI() {
  if (counterEl) counterEl.textContent = `${points.length} / 4`;
  if (undoBtn) undoBtn.disabled = points.length === 0;

  if (instructionsEl) {
    if (points.length < 4) {
      const nextLabel = CORNER_LABELS[points.length];
      instructionsEl.textContent = `Tocca il punto: ${nextLabel}`;
    } else {
      instructionsEl.textContent = 'Immagine posizionata!';
    }
  }
}

export function reset() {
  for (const obj of markers) {
    scene.remove(obj);
    obj.geometry.dispose();
    obj.material.dispose();
  }
  markers.length = 0;
  points.length = 0;
  undoTimestamp = 0;
  updateUI();
}

export function getPoints() {
  return [...points];
}
