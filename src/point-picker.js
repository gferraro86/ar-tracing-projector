import * as THREE from 'three';
import { getLastHitPose } from './hit-test.js';

const points = [];
const markers = [];

let onComplete = null;
let scene = null;
let counterEl = null;
let undoBtn = null;

export function initPointPicker(sceneRef, counterElement, undoButton, completeCb) {
  scene = sceneRef;
  counterEl = counterElement;
  undoBtn = undoButton;
  onComplete = completeCb;
  points.length = 0;
  markers.length = 0;
  updateUI();
}

export function handleSelect(referenceSpace) {
  if (points.length >= 4) return;

  const pose = getLastHitPose();
  if (!pose) return;

  const pos = new THREE.Vector3(
    pose.transform.position.x,
    pose.transform.position.y,
    pose.transform.position.z
  );

  points.push(pos);
  addMarker(pos, points.length);
  updateUI();

  if (points.length === 4) {
    if (onComplete) onComplete([...points]);
  }
}

function addMarker(position, index) {
  const geo = new THREE.SphereGeometry(0.015, 16, 16);
  const mat = new THREE.MeshBasicMaterial({
    color: index <= 2 ? 0x4361ee : 0xee4363,
  });
  const sphere = new THREE.Mesh(geo, mat);
  sphere.position.copy(position);
  scene.add(sphere);
  markers.push(sphere);

  // Add line between consecutive points
  if (markers.length > 1) {
    const prev = points[points.length - 2];
    const lineGeo = new THREE.BufferGeometry().setFromPoints([prev, position]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x4361ee, linewidth: 2 });
    const line = new THREE.Line(lineGeo, lineMat);
    scene.add(line);
    markers.push(line); // store for cleanup
  }

  // Close the loop after 4th point
  if (points.length === 4) {
    const lineGeo = new THREE.BufferGeometry().setFromPoints([position, points[0]]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x4361ee, linewidth: 2 });
    const line = new THREE.Line(lineGeo, lineMat);
    scene.add(line);
    markers.push(line);
  }
}

export function undoLastPoint() {
  if (points.length === 0) return;
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
}

export function reset() {
  for (const obj of markers) {
    scene.remove(obj);
    obj.geometry.dispose();
    obj.material.dispose();
  }
  markers.length = 0;
  points.length = 0;
  updateUI();
}

export function getPoints() {
  return [...points];
}
