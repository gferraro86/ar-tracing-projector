import * as THREE from 'three';

let selectedTexture = null;
let imageWidth = 0;
let imageHeight = 0;

export function setupImageLoader(fileInput, previewImg, previewContainer, startBtn) {
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    previewImg.src = url;
    previewContainer.classList.remove('hidden');

    const img = new Image();
    img.onload = () => {
      imageWidth = img.width;
      imageHeight = img.height;

      const texture = new THREE.Texture(img);
      texture.needsUpdate = true;
      texture.colorSpace = THREE.SRGBColorSpace;
      selectedTexture = texture;

      startBtn.disabled = false;

      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export function getTexture() {
  return selectedTexture;
}

export function getImageDimensions() {
  return { width: imageWidth, height: imageHeight };
}
