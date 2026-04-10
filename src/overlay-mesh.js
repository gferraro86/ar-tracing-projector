import * as THREE from 'three';

let overlayMesh = null;
let material = null;

/**
 * Create the overlay mesh by bilinear interpolation of 4 corner positions.
 * Much more robust than the homography shader approach.
 *
 * texture: THREE.Texture
 * corners: array of 4 THREE.Vector3 in anchor-local space
 *          Order: top-left, top-right, bottom-right, bottom-left
 * Returns: THREE.Mesh
 */
export function createOverlayMesh(texture, corners) {
  const segments = 32;
  const vertCount = (segments + 1) * (segments + 1);
  const positions = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);

  const [tl, tr, br, bl] = corners;

  // Generate vertices by bilinear interpolation
  for (let iy = 0; iy <= segments; iy++) {
    for (let ix = 0; ix <= segments; ix++) {
      const idx = iy * (segments + 1) + ix;
      const u = ix / segments;
      const v = iy / segments;

      // Bilinear interpolation of the 4 corners
      // v=0 is top, v=1 is bottom (matching image top-to-bottom)
      const top = new THREE.Vector3().lerpVectors(tl, tr, u);
      const bottom = new THREE.Vector3().lerpVectors(bl, br, u);
      const pos = new THREE.Vector3().lerpVectors(top, bottom, v);

      positions[idx * 3] = pos.x;
      positions[idx * 3 + 1] = pos.y;
      positions[idx * 3 + 2] = pos.z;

      // UV: u goes left-to-right, v goes top-to-bottom
      // Three.js texture UV: (0,0) = bottom-left, so flip V
      uvs[idx * 2] = u;
      uvs[idx * 2 + 1] = 1.0 - v;
    }
  }

  // Generate triangle indices
  const indices = [];
  for (let iy = 0; iy < segments; iy++) {
    for (let ix = 0; ix < segments; ix++) {
      const a = iy * (segments + 1) + ix;
      const b = a + 1;
      const c = a + (segments + 1);
      const d = c + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  overlayMesh = new THREE.Mesh(geometry, material);
  overlayMesh.frustumCulled = false;

  return overlayMesh;
}

export function setOpacity(value) {
  if (material) {
    material.opacity = value;
  }
}

export function disposeOverlay() {
  if (overlayMesh) {
    overlayMesh.geometry.dispose();
    overlayMesh.material.dispose();
    overlayMesh = null;
    material = null;
  }
}
