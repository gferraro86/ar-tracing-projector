import * as THREE from 'three';

/**
 * Convert a screen-space pixel coordinate into a world-space point on a given plane.
 * Uses the WebXR camera (synced with the Three.js renderer) to build the ray.
 *
 * screenX, screenY: pixel coordinates (top-left origin)
 * plane: THREE.Plane (the surface plane in world space)
 * camera: THREE.Camera (typically renderer.xr.getCamera() during an XR session)
 *
 * Returns THREE.Vector3 or null if the ray doesn't intersect the plane.
 */
export function screenToWorld(screenX, screenY, plane, camera) {
  const w = window.innerWidth;
  const h = window.innerHeight;

  // NDC coordinates (-1 to 1, with Y flipped)
  const ndcX = (screenX / w) * 2 - 1;
  const ndcY = -((screenY / h) * 2 - 1);

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera);

  const intersection = new THREE.Vector3();
  const hit = raycaster.ray.intersectPlane(plane, intersection);
  if (!hit) return null;

  return intersection.clone();
}

/**
 * Project a 3D world point back to screen-space pixel coordinates.
 * Used to position handles when entering realign mode.
 */
export function worldToScreen(worldPoint, camera) {
  const w = window.innerWidth;
  const h = window.innerHeight;

  const v = worldPoint.clone().project(camera);
  return {
    x: (v.x + 1) * w / 2,
    y: (1 - v.y) * h / 2,
  };
}

/**
 * Build a THREE.Plane from a hit test pose.
 * The plane normal is the Y axis of the pose (surface normal in WebXR hit results).
 *
 * pose: XRPose
 */
export function planeFromHitPose(pose) {
  if (!pose) return null;

  const m = new THREE.Matrix4().fromArray(pose.transform.matrix);
  const origin = new THREE.Vector3().setFromMatrixPosition(m);
  // Y column = surface normal in WebXR convention
  const normal = new THREE.Vector3();
  normal.setFromMatrixColumn(m, 1).normalize();

  return new THREE.Plane().setFromNormalAndCoplanarPoint(normal, origin);
}
