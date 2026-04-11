import * as THREE from 'three';

/**
 * Convert a screen-space pixel coordinate into a world-space point on a given plane.
 * Uses the raw projection + camera matrices captured from the current XRView,
 * NOT the Three.js ArrayCamera (which has stereo quirks that break unprojection).
 *
 * screenX, screenY: pixel coordinates (top-left origin, CSS pixels)
 * plane: THREE.Plane (the surface plane in world space)
 * projMatrix: THREE.Matrix4 — projection matrix from current XRView
 * cameraMatrix: THREE.Matrix4 — camera-to-world matrix from current XRView (view.transform.matrix)
 *
 * Returns THREE.Vector3 or null if the ray doesn't intersect the plane.
 */
export function screenToWorld(screenX, screenY, plane, projMatrix, cameraMatrix) {
  const w = window.innerWidth;
  const h = window.innerHeight;

  // NDC coordinates (-1 to 1, with Y flipped)
  const ndcX = (screenX / w) * 2 - 1;
  const ndcY = -((screenY / h) * 2 - 1);

  // Inverse projection: clip space -> eye space
  const invProj = new THREE.Matrix4().copy(projMatrix).invert();

  // Point on the near plane in clip space, then unproject to eye space
  const nearClip = new THREE.Vector4(ndcX, ndcY, -1, 1);
  nearClip.applyMatrix4(invProj);
  if (nearClip.w === 0) return null;
  nearClip.divideScalar(nearClip.w);

  // Eye space -> world space (cameraMatrix is camera-to-world)
  const nearWorld = new THREE.Vector3(nearClip.x, nearClip.y, nearClip.z).applyMatrix4(cameraMatrix);

  // Camera origin in world space
  const cameraPos = new THREE.Vector3().setFromMatrixPosition(cameraMatrix);

  // Build ray from camera through the unprojected near point
  const dir = new THREE.Vector3().subVectors(nearWorld, cameraPos).normalize();
  const ray = new THREE.Ray(cameraPos, dir);

  const intersection = new THREE.Vector3();
  const hit = ray.intersectPlane(plane, intersection);
  return hit ? intersection.clone() : null;
}

/**
 * Project a 3D world point back to screen-space pixel coordinates.
 * Used to position handles when entering realign mode.
 *
 * projMatrix, cameraMatrix: same as screenToWorld
 */
export function worldToScreen(worldPoint, projMatrix, cameraMatrix) {
  const w = window.innerWidth;
  const h = window.innerHeight;

  // View matrix = inverse of camera-to-world
  const viewMatrix = new THREE.Matrix4().copy(cameraMatrix).invert();

  // World -> view (eye) -> clip
  const v = new THREE.Vector4(worldPoint.x, worldPoint.y, worldPoint.z, 1);
  v.applyMatrix4(viewMatrix);
  v.applyMatrix4(projMatrix);

  if (v.w === 0) return { x: w / 2, y: h / 2 };

  const ndcX = v.x / v.w;
  const ndcY = v.y / v.w;

  return {
    x: (ndcX + 1) * w / 2,
    y: (1 - ndcY) * h / 2,
  };
}

/**
 * Build a THREE.Plane from a hit test pose.
 * The plane normal is the Y axis of the pose (surface normal in WebXR hit results).
 */
export function planeFromHitPose(pose) {
  if (!pose) return null;

  const m = new THREE.Matrix4().fromArray(pose.transform.matrix);
  const origin = new THREE.Vector3().setFromMatrixPosition(m);
  const normal = new THREE.Vector3();
  normal.setFromMatrixColumn(m, 1).normalize();

  return new THREE.Plane().setFromNormalAndCoplanarPoint(normal, origin);
}
