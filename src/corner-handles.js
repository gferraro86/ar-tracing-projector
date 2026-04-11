/**
 * Manages 4 draggable DOM circles overlaid on the screen for canvas calibration.
 * The user drags them to the 4 corners of the canvas as seen on the screen.
 */

const CORNER_LABELS = ['TL', 'TR', 'BR', 'BL'];
const CORNER_COLORS = ['#4361ee', '#43ee61', '#ee4361', '#eeee43'];

let handles = []; // array of { el, x, y } in pixel coordinates
let containerEl = null;
let activeDrag = null; // { handle, offsetX, offsetY }

export function initCornerHandles(containerElement) {
  containerEl = containerElement;
  handles = [];

  for (let i = 0; i < 4; i++) {
    const el = document.createElement('div');
    el.className = 'drag-corner';
    el.style.background = CORNER_COLORS[i];
    el.dataset.index = String(i);
    el.textContent = CORNER_LABELS[i];

    el.addEventListener('pointerdown', onPointerDown);

    containerEl.appendChild(el);
    handles.push({ el, x: 0, y: 0 });
  }

  // Global pointer move/up to support dragging outside the handle
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
}

function onPointerDown(e) {
  e.preventDefault();
  e.stopPropagation();
  const idx = parseInt(e.currentTarget.dataset.index, 10);
  const handle = handles[idx];
  const rect = handle.el.getBoundingClientRect();
  activeDrag = {
    handle,
    offsetX: e.clientX - (rect.left + rect.width / 2),
    offsetY: e.clientY - (rect.top + rect.height / 2),
  };
  handle.el.setPointerCapture(e.pointerId);
}

function onPointerMove(e) {
  if (!activeDrag) return;
  e.preventDefault();
  const x = e.clientX - activeDrag.offsetX;
  const y = e.clientY - activeDrag.offsetY;
  setHandlePosition(activeDrag.handle, x, y);
}

function onPointerUp(e) {
  if (!activeDrag) return;
  try {
    activeDrag.handle.el.releasePointerCapture(e.pointerId);
  } catch {}
  activeDrag = null;
}

function setHandlePosition(handle, x, y) {
  handle.x = x;
  handle.y = y;
  handle.el.style.left = `${x}px`;
  handle.el.style.top = `${y}px`;
}

/**
 * Set initial positions for all 4 handles.
 * positions: array of 4 {x, y} in pixel coordinates
 */
export function setHandlePositions(positions) {
  for (let i = 0; i < 4; i++) {
    setHandlePosition(handles[i], positions[i].x, positions[i].y);
  }
}

/**
 * Place handles in a default rectangle around the screen center.
 */
export function setDefaultPositions() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const size = Math.min(w, h) * 0.5;
  const cx = w / 2;
  const cy = h / 2;
  setHandlePositions([
    { x: cx - size / 2, y: cy - size / 2 }, // TL
    { x: cx + size / 2, y: cy - size / 2 }, // TR
    { x: cx + size / 2, y: cy + size / 2 }, // BR
    { x: cx - size / 2, y: cy + size / 2 }, // BL
  ]);
}

/**
 * Get current handle positions in pixel coordinates.
 */
export function getHandlePositions() {
  return handles.map(h => ({ x: h.x, y: h.y }));
}

export function showHandles() {
  for (const h of handles) h.el.style.display = 'flex';
}

export function hideHandles() {
  for (const h of handles) h.el.style.display = 'none';
}

export function disposeCornerHandles() {
  for (const h of handles) {
    h.el.removeEventListener('pointerdown', onPointerDown);
    if (h.el.parentNode) h.el.parentNode.removeChild(h.el);
  }
  handles = [];
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('pointercancel', onPointerUp);
  activeDrag = null;
  containerEl = null;
}
