/**
 * Compute a 3x3 homography matrix from 4 point correspondences
 * using the Direct Linear Transform (DLT) algorithm.
 *
 * src: array of 4 [x,y] source points (image corners, normalized 0-1)
 * dst: array of 4 [x,y] destination points (surface positions)
 * Returns: Float32Array(9) representing a 3x3 matrix in column-major order
 */
export function computeHomography(src, dst) {
  // Build 8x9 matrix A for the DLT
  // For each correspondence (x,y) -> (x',y'):
  //   -x, -y, -1,  0,  0,  0,  x*x', y*x', x'
  //    0,  0,  0, -x, -y, -1,  x*y', y*y', y'
  const A = [];

  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [xp, yp] = dst[i];

    A.push([-x, -y, -1, 0, 0, 0, x * xp, y * xp, xp]);
    A.push([0, 0, 0, -x, -y, -1, x * yp, y * yp, yp]);
  }

  // Solve Ah = 0 using Gaussian elimination on 8x9 matrix
  // We set h9 = 1 and solve the 8x8 system
  const n = 8;
  const M = A.map(row => [...row]);

  // Forward elimination
  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxVal = 0;
    let maxRow = col;
    for (let row = col; row < n; row++) {
      const absVal = Math.abs(M[row][col]);
      if (absVal > maxVal) {
        maxVal = absVal;
        maxRow = row;
      }
    }

    // Swap rows
    if (maxRow !== col) {
      [M[col], M[maxRow]] = [M[maxRow], M[col]];
    }

    const pivot = M[col][col];
    if (Math.abs(pivot) < 1e-12) {
      console.warn('Homography: degenerate point configuration');
      return null;
    }

    // Normalize pivot row
    for (let j = col; j <= n; j++) {
      M[col][j] /= pivot;
    }

    // Eliminate column
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row][col];
      for (let j = col; j <= n; j++) {
        M[row][j] -= factor * M[col][j];
      }
    }
  }

  // Extract solution: h[i] = -M[i][8] (since we moved the last column to RHS)
  const h = new Array(9);
  for (let i = 0; i < 8; i++) {
    h[i] = -M[i][8];
  }
  h[8] = 1.0;

  // Normalize so that h[8] = 1
  // Return in column-major order for GLSL mat3:
  // mat3 in GLSL is column-major: [col0, col1, col2]
  // Our H is:
  //   h[0] h[1] h[2]
  //   h[3] h[4] h[5]
  //   h[6] h[7] h[8]
  // Column-major: [h[0],h[3],h[6], h[1],h[4],h[7], h[2],h[5],h[8]]
  return new Float32Array([
    h[0], h[3], h[6],
    h[1], h[4], h[7],
    h[2], h[5], h[8]
  ]);
}
