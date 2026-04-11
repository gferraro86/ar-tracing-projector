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

let onCornersComplete = null;
let onCenterComplete = null;
let scene = null;
let counterEl = null;
let undoBtn = null;
let instructionsEl = null;
let undoTimestamp = 0;
let waitingForCenter = false;

export function initPointPicker(sceneRef, counterElement, undoButton, cornersCompleteCb, centerCompleteCb) {
  scene = sceneRef;
  counterEl = counterElement;
  undoBtn = undoButton;
  instructionsEl = document.getElementById('picking-instructions');
  onCornersComplete = cornersCompleteCb;
  onCenterComplete = centerCompleteCb;
  points.length = 0;
  markers.length = 0;
  undoTimestamp = 0;
  waitingForCenter = false;
  updateUI();
}

export function handleSelect(referenceSpace) {
  // Debounce: ignore select events shortly after an undo
  if (Date.now() - undoTimestamp < 400) return;

  const pose = getLastHitPose();
  if (!pose) return;

  const pos = new THREE.Vector3(
    pose.transform.position.x,
    pose.transform.position.y,
    pose.transform.position.z
  );

  if (waitingForCenter) {
    // 5th tap: center point for anchor — capture position AND orientation
    const quat = new THREE.Quaternion(
      pose.transform.orientation.x,
      pose.transform.orientation.y,
      pose.transform.orientation.z,
      pose.transform.orientation.w
    );
    addMarker(pos, 4);
    if (onCenterComplete) onCenterComplete(pos, quat);
    return;
  }

  if (points.length >= 4) return;

  points.push(pos);
  addMarker(pos, points.length - 1);
  updateUI();

  if (points.length === 4) {
    // Show the 4-point outline, then ask for center tap
    waitingForCenter = true;
    updateUI();
    if (onCornersComplete) onCornersComplete([...points]);
  }
}

function addMarker(position, index) {
  const color = index < 4 ? CORNER_COLORS[index] : 0xffffff;
  const size = index < 4 ? 0.015 : 0.02;
  const geo = new THREE.SphereGeometry(size, 16, 16);
  const mat = new THREE.MeshBasicMaterial({ color });
  const sphere = new THREE.Mesh(geo, mat);
  sphere.position.copy(position);
  scene.add(sphere);
  markers.push(sphere);

  // Line to previous corner point
  if (index > 0 && index < 4 && points.length > 1) {
    const prev = points[points.length - 2];
    const lineGeo = new THREE.BufferGeometry().setFromPoints([prev, position]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    const line = new THREE.Line(lineGeo, lineMat);
    scene.add(line);
    markers.push(line);
  }

  // Close loop after 4th corner
  if (index === 3 && points.length === 4) {
    const lineGeo = new THREE.BufferGeometry().setFromPoints([position, points[0]]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    const line = new THREE.Line(lineGeo, lineMat);
    scene.add(line);
    markers.push(line);
  }
}

export function undoLastPoint() {
  if (waitingForCenter) {
    // If waiting for center, go back to 4th point state
    waitingForCenter = false;
    // Remove closing line
    if (markers.length > 0 && markers[markers.length - 1] instanceof THREE.Line) {
      const line = markers.pop();
      scene.remove(line);
      line.geometry.dispose();
      line.material.dispose();
    }
    // Remove 4th point marker
    const sphere = markers.pop();
    scene.remove(sphere);
    sphere.geometry.dispose();
    sphere.material.dispose();
    // Remove line to 4th point
    if (markers.length > 0 && markers[markers.length - 1] instanceof THREE.Line) {
      const line = markers.pop();
      scene.remove(line);
      line.geometry.dispose();
      line.material.dispose();
    }
    points.pop();
    undoTimestamp = Date.now();
    updateUI();
    return;
  }

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
  if (counterEl) {
    counterEl.textContent = waitingForCenter ? '4 / 4' : `${points.length} / 4`;
  }
  if (undoBtn) undoBtn.disabled = points.length === 0 && !waitingForCenter;

  if (instructionsEl) {
    if (waitingForCenter) {
      instructionsEl.textContent = 'Ora punta al CENTRO della superficie e tocca';
    } else if (points.length < 4) {
      const nextLabel = CORNER_LABELS[points.length];
      instructionsEl.textContent = `Tocca il punto: ${nextLabel}`;
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
  waitingForCenter = false;
  undoTimestamp = 0;
  updateUI();
}

export function getPoints() {
  return [...points];
}
