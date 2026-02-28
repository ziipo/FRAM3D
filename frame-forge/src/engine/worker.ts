import Module from 'manifold-3d';
import type { ManifoldToplevel } from 'manifold-3d';
import type { WorkerMessage, WorkerResponse, FrameParams } from '../types/frame';
import { generateFrame } from './frameGenerator';

let wasm: ManifoldToplevel | null = null;

/**
 * Initialize the Manifold WASM module.
 */
async function initWasm(): Promise<ManifoldToplevel> {
  if (wasm) return wasm;

  wasm = await Module();
  wasm.setup();

  return wasm;
}

/**
 * Handle incoming messages from the main thread.
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  if (message.type === 'generate') {
    await handleGenerate(message.params);
  }
};

/**
 * Generate frame geometry and send results back.
 */
async function handleGenerate(params: FrameParams): Promise<void> {
  try {
    // Send progress update
    sendProgress('Initializing...', 10);

    // Initialize WASM if needed
    const manifold = await initWasm();

    sendProgress('Generating geometry...', 30);

    // Generate the frame
    const { manifold: frame, mesh, dimensions } = generateFrame(manifold, params);

    sendProgress('Preparing mesh data...', 70);

    // Extract mesh data for Three.js
    const numVerts = mesh.numVert;
    const numTris = mesh.numTri;

    // Create typed arrays for positions, normals, and indices
    const positions = new Float32Array(numVerts * 3);
    const normals = new Float32Array(numVerts * 3);
    const indices = new Uint32Array(numTris * 3);

    // Extract vertex positions
    for (let i = 0; i < numVerts; i++) {
      const pos = mesh.position(i);
      positions[i * 3] = pos[0];
      positions[i * 3 + 1] = pos[1];
      positions[i * 3 + 2] = pos[2];
    }

    // Extract triangle indices
    for (let i = 0; i < numTris; i++) {
      const verts = mesh.verts(i);
      indices[i * 3] = verts[0];
      indices[i * 3 + 1] = verts[1];
      indices[i * 3 + 2] = verts[2];
    }

    // Compute normals from triangles
    computeNormals(positions, indices, normals);

    sendProgress('Generating STL...', 85);

    // Generate STL data
    // Manifold doesn't have direct STL export, so we'll create it manually
    const stlData = generateSTL(positions, indices, normals);

    sendProgress('Complete', 100);

    // Send result back to main thread
    const response: WorkerResponse = {
      type: 'result',
      mesh: {
        positions,
        normals,
        indices,
      },
      stlData,
    };

    // Use transferable objects for efficiency
    self.postMessage(response, {
      transfer: [
        positions.buffer,
        normals.buffer,
        indices.buffer,
        stlData,
      ],
    });

    // Clean up WASM objects
    frame.delete();

    // Log dimensions for debugging
    console.log('Frame dimensions:', dimensions);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const response: WorkerResponse = {
      type: 'error',
      error: errorMessage,
    };
    self.postMessage(response);
  }
}

/**
 * Compute vertex normals from triangle mesh.
 */
function computeNormals(
  positions: Float32Array,
  indices: Uint32Array,
  normals: Float32Array
): void {
  // Initialize normals to zero
  normals.fill(0);

  // Accumulate face normals for each vertex
  const numTris = indices.length / 3;
  for (let i = 0; i < numTris; i++) {
    const i0 = indices[i * 3];
    const i1 = indices[i * 3 + 1];
    const i2 = indices[i * 3 + 2];

    // Get vertex positions
    const v0 = [
      positions[i0 * 3],
      positions[i0 * 3 + 1],
      positions[i0 * 3 + 2],
    ];
    const v1 = [
      positions[i1 * 3],
      positions[i1 * 3 + 1],
      positions[i1 * 3 + 2],
    ];
    const v2 = [
      positions[i2 * 3],
      positions[i2 * 3 + 1],
      positions[i2 * 3 + 2],
    ];

    // Compute edges
    const e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
    const e2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

    // Cross product for face normal
    const nx = e1[1] * e2[2] - e1[2] * e2[1];
    const ny = e1[2] * e2[0] - e1[0] * e2[2];
    const nz = e1[0] * e2[1] - e1[1] * e2[0];

    // Add to vertex normals (weighted by face area, which is proportional to cross product magnitude)
    for (const idx of [i0, i1, i2]) {
      normals[idx * 3] += nx;
      normals[idx * 3 + 1] += ny;
      normals[idx * 3 + 2] += nz;
    }
  }

  // Normalize all normals
  const numVerts = positions.length / 3;
  for (let i = 0; i < numVerts; i++) {
    const x = normals[i * 3];
    const y = normals[i * 3 + 1];
    const z = normals[i * 3 + 2];
    const len = Math.sqrt(x * x + y * y + z * z);
    if (len > 0) {
      normals[i * 3] = x / len;
      normals[i * 3 + 1] = y / len;
      normals[i * 3 + 2] = z / len;
    }
  }
}

/**
 * Generate binary STL data from mesh.
 */
function generateSTL(
  positions: Float32Array,
  indices: Uint32Array,
  _normals: Float32Array
): ArrayBuffer {
  const numTris = indices.length / 3;

  // STL binary format:
  // 80 bytes header
  // 4 bytes triangle count (uint32)
  // For each triangle:
  //   12 bytes normal (3 x float32)
  //   36 bytes vertices (3 x 3 x float32)
  //   2 bytes attribute (uint16, usually 0)
  // Total: 80 + 4 + numTris * 50 bytes

  const bufferSize = 80 + 4 + numTris * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // Write header (80 bytes, can be anything)
  const header = 'Generated by FrameForge';
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  }

  // Write triangle count
  view.setUint32(80, numTris, true);

  // Write triangles
  let offset = 84;
  for (let i = 0; i < numTris; i++) {
    const i0 = indices[i * 3];
    const i1 = indices[i * 3 + 1];
    const i2 = indices[i * 3 + 2];

    // Compute face normal
    const v0 = [
      positions[i0 * 3],
      positions[i0 * 3 + 1],
      positions[i0 * 3 + 2],
    ];
    const v1 = [
      positions[i1 * 3],
      positions[i1 * 3 + 1],
      positions[i1 * 3 + 2],
    ];
    const v2 = [
      positions[i2 * 3],
      positions[i2 * 3 + 1],
      positions[i2 * 3 + 2],
    ];

    const e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
    const e2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

    let nx = e1[1] * e2[2] - e1[2] * e2[1];
    let ny = e1[2] * e2[0] - e1[0] * e2[2];
    let nz = e1[0] * e2[1] - e1[1] * e2[0];
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 0) {
      nx /= len;
      ny /= len;
      nz /= len;
    }

    // Write normal
    view.setFloat32(offset, nx, true);
    view.setFloat32(offset + 4, ny, true);
    view.setFloat32(offset + 8, nz, true);
    offset += 12;

    // Write vertices
    for (const idx of [i0, i1, i2]) {
      view.setFloat32(offset, positions[idx * 3], true);
      view.setFloat32(offset + 4, positions[idx * 3 + 1], true);
      view.setFloat32(offset + 8, positions[idx * 3 + 2], true);
      offset += 12;
    }

    // Write attribute byte count (0)
    view.setUint16(offset, 0, true);
    offset += 2;
  }

  return buffer;
}

/**
 * Send progress update to main thread.
 */
function sendProgress(stage: string, percent: number): void {
  const response: WorkerResponse = {
    type: 'progress',
    stage,
    percent,
  };
  self.postMessage(response);
}
