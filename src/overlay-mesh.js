import * as THREE from 'three';

let overlayMesh = null;
let material = null;
let geometry = null;
let positions = null;
const segments = 16; // smaller mesh for faster per-frame updates

/**
 * Create the overlay mesh. Initial vertex positions are zero — call updateOverlayCorners()
 * to set the actual corners. The mesh is dynamic and updates each frame.
 */
export function createOverlayMesh(texture) {
  const vertCount = (segments + 1) * (segments + 1);
  positions = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);

  // Generate UVs
  for (let iy = 0; iy <= segments; iy++) {
    for (let ix = 0; ix <= segments; ix++) {
      const idx = iy * (segments + 1) + ix;
      uvs[idx * 2] = ix / segments;
      uvs[idx * 2 + 1] = 1.0 - iy / segments;
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

  geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));

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

/**
 * Update mesh vertex positions from 4 world-space corner points.
 * Uses bilinear interpolation. Called each frame from the render loop.
 *
 * corners: array of 4 THREE.Vector3 (top-left, top-right, bottom-right, bottom-left)
 */
export function updateOverlayCorners(corners) {
  if (!geometry || !positions) return;

  const [tl, tr, br, bl] = corners;

  for (let iy = 0; iy <= segments; iy++) {
    for (let ix = 0; ix <= segments; ix++) {
      const idx = iy * (segments + 1) + ix;
      const u = ix / segments;
      const v = iy / segments;

      // Bilinear interpolation
      const topX = tl.x + (tr.x - tl.x) * u;
      const topY = tl.y + (tr.y - tl.y) * u;
      const topZ = tl.z + (tr.z - tl.z) * u;

      const botX = bl.x + (br.x - bl.x) * u;
      const botY = bl.y + (br.y - bl.y) * u;
      const botZ = bl.z + (br.z - bl.z) * u;

      positions[idx * 3] = topX + (botX - topX) * v;
      positions[idx * 3 + 1] = topY + (botY - topY) * v;
      positions[idx * 3 + 2] = topZ + (botZ - topZ) * v;
    }
  }

  geometry.attributes.position.needsUpdate = true;
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
    geometry = null;
    positions = null;
  }
}
