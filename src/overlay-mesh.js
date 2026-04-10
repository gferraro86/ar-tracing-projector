import * as THREE from 'three';
import { computeHomography } from './homography.js';

const vertexShader = `
  uniform mat3 uHomography;
  varying vec2 vUv;

  void main() {
    vUv = uv;

    // Apply homography to UV coordinates to get surface position
    vec3 srcPos = vec3(uv, 1.0);
    vec3 dstPos = uHomography * srcPos;

    // Perspective divide
    vec3 localPos = vec3(dstPos.x / dstPos.z, dstPos.y / dstPos.z, 0.0);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(localPos, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uTexture;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec4 color = texture2D(uTexture, vUv);
    gl_FragColor = vec4(color.rgb, color.a * uOpacity);
  }
`;

let overlayMesh = null;
let material = null;

/**
 * Create the overlay mesh with homography-warped texture.
 *
 * texture: THREE.Texture of the selected image
 * dstPoints: array of 4 THREE.Vector3 positions in anchor-local space
 *            Order: top-left, top-right, bottom-right, bottom-left
 * Returns: THREE.Mesh
 */
export function createOverlayMesh(texture, dstPoints) {
  // Source points: image corners in UV space (0-1)
  const src = [
    [0, 1], // top-left (UV: 0,1 because Y is flipped)
    [1, 1], // top-right
    [1, 0], // bottom-right
    [0, 0], // bottom-left
  ];

  // Destination points: project onto the local XZ plane (Y is up in AR)
  // We use X and Z coordinates from the anchor-local positions
  const dst = dstPoints.map(p => [p.x, p.z]);

  const H = computeHomography(src, dst);
  if (!H) {
    console.error('Failed to compute homography');
    return null;
  }

  material = new THREE.ShaderMaterial({
    uniforms: {
      uHomography: { value: new THREE.Matrix3().fromArray(H) },
      uTexture: { value: texture },
      uOpacity: { value: 0.4 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  // Subdivided plane for smooth homography warp
  // Vertices start in UV space (0-1), vertex shader warps them
  const geometry = new THREE.PlaneGeometry(1, 1, 32, 32);

  // Rotate plane to lie on XZ (horizontal surface)
  geometry.rotateX(-Math.PI / 2);

  overlayMesh = new THREE.Mesh(geometry, material);
  overlayMesh.frustumCulled = false;

  return overlayMesh;
}

export function setOpacity(value) {
  if (material) {
    material.uniforms.uOpacity.value = value;
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
