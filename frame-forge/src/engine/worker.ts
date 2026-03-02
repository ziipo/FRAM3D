import Module from 'manifold-3d';
import type { ManifoldToplevel } from 'manifold-3d';
import type { WorkerMessage, WorkerResponse, FrameParams, ConnectorSettings, SplitExportResultMessage } from '../types/frame';
import { generateFrame } from './frameGenerator';
import { splitFrameForExport } from './frameSplitter';
import { createZipArchive } from './zipWriter';

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
  } else if (message.type === 'split-export') {
    await handleSplitExport(message.params, message.buildPlate, message.connector);
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
    const result = generateFrame(manifold, params);
    const { manifold: frame, mesh, dimensions } = result;

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

    sendProgress('Generating STL...', 80);

    // Generate STL data
    // Manifold doesn't have direct STL export, so we'll create it manually
    const stlData = generateSTL(positions, indices, normals);

    sendProgress('Generating 3MF...', 90);

    // Generate 3MF data
    const threemfData = generate3MFData(positions, indices);

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
      threemfData,
    };

    // Use transferable objects for efficiency
    self.postMessage(response, {
      transfer: [
        positions.buffer,
        normals.buffer,
        indices.buffer,
        stlData,
        threemfData,
      ],
    });

    // Clean up WASM objects
    frame.delete();

    // Log dimensions for debugging
    console.log('Frame dimensions:', dimensions);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Worker] Generation error:', errorMessage, error);
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
 * Generate 3MF data from mesh positions and indices.
 * 3MF is a ZIP containing XML files describing the model.
 */
function generate3MFData(
  positions: Float32Array,
  indices: Uint32Array
): ArrayBuffer {
  const numVerts = positions.length / 3;
  const numTris = indices.length / 3;

  // Build vertex XML
  const vertexLines: string[] = [];
  for (let i = 0; i < numVerts; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    vertexLines.push(`            <vertex x="${x}" y="${y}" z="${z}" />`);
  }

  // Build triangle XML
  const triangleLines: string[] = [];
  for (let i = 0; i < numTris; i++) {
    const v1 = indices[i * 3];
    const v2 = indices[i * 3 + 1];
    const v3 = indices[i * 3 + 2];
    triangleLines.push(`            <triangle v1="${v1}" v2="${v2}" v3="${v3}" />`);
  }

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources>
    <object id="1" type="model">
      <mesh>
        <vertices>
${vertexLines.join('\n')}
        </vertices>
        <triangles>
${triangleLines.join('\n')}
        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="1" />
  </build>
</model>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>`;

  const encoder = new TextEncoder();

  return createZipArchive([
    { filename: '[Content_Types].xml', data: encoder.encode(contentTypesXml) },
    { filename: '_rels/.rels', data: encoder.encode(relsXml) },
    { filename: '3D/3dmodel.model', data: encoder.encode(modelXml) },
  ]);
}

/**
 * Handle split export: build individual sides, split oversized ones, package as ZIP.
 */
async function handleSplitExport(
  params: FrameParams,
  buildPlate: { width: number; depth: number },
  connector: ConnectorSettings
): Promise<void> {
  try {
    sendProgress('Initializing...', 5);
    const manifold = await initWasm();

    sendProgress('Splitting frame sides...', 20);
    const { parts, splitInfo } = splitFrameForExport(
      manifold,
      params,
      buildPlate.width,
      buildPlate.depth,
      connector
    );

    sendProgress('Generating STL files...', 50);
    const zipEntries: { filename: string; data: Uint8Array }[] = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const pct = 50 + Math.round((i / parts.length) * 30);
      sendProgress(`Generating ${part.name}...`, pct);

      const mesh = part.manifold.getMesh();
      const numVerts = mesh.numVert;
      const numTris = mesh.numTri;

      const positions = new Float32Array(numVerts * 3);
      const normals = new Float32Array(numVerts * 3);
      const indices = new Uint32Array(numTris * 3);

      for (let v = 0; v < numVerts; v++) {
        const pos = mesh.position(v);
        positions[v * 3] = pos[0];
        positions[v * 3 + 1] = pos[1];
        positions[v * 3 + 2] = pos[2];
      }

      for (let t = 0; t < numTris; t++) {
        const verts = mesh.verts(t);
        indices[t * 3] = verts[0];
        indices[t * 3 + 1] = verts[1];
        indices[t * 3 + 2] = verts[2];
      }

      computeNormals(positions, indices, normals);
      const stlData = generateSTL(positions, indices, normals);
      zipEntries.push({ filename: part.name, data: new Uint8Array(stlData) });

      part.manifold.delete();
    }

    sendProgress('Creating ZIP archive...', 85);
    const zipData = createZipArchive(zipEntries);

    sendProgress('Complete', 100);

    const response: SplitExportResultMessage = {
      type: 'split-export-result',
      zipData,
      splitInfo: {
        bottomSplit: splitInfo.bottom,
        topSplit: splitInfo.top,
        leftSplit: splitInfo.left,
        rightSplit: splitInfo.right,
        totalParts: splitInfo.totalParts,
      },
    };

    self.postMessage(response, { transfer: [zipData] });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Worker] Split export error:', errorMessage, error);
    const response: WorkerResponse = {
      type: 'error',
      error: errorMessage,
    };
    self.postMessage(response);
  }
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
