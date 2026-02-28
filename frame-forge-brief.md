# FrameForge — Customizable 3D-Printable Picture Frame Generator

## Product Brief, Technical Architecture & Implementation Plan

---

## 1. Product Brief

### 1.1 Vision

FrameForge is a browser-based tool that lets anyone design custom picture frames and download them as ready-to-print STL files. Users configure dimensions, select or design cross-section profiles, and optionally apply decorative surface patterns—all through an intuitive visual interface, with real-time 3D preview. No installation, no account required. Fully client-side.

### 1.2 Target Users

- **3D printing hobbyists** who want frames sized to their exact photos or prints
- **Makers and crafters** looking for decorative, customizable frames
- **Small-batch sellers** on Etsy/markets who want parametric frame generation
- **Educators** demonstrating parametric CAD concepts

### 1.3 Core Value Proposition

Existing solutions (Thingiverse, Printables) offer static STL downloads for fixed sizes. FrameForge generates frames *parametrically* in the browser, so every frame is bespoke. No CAD expertise needed.

### 1.4 Key Features (MVP)

| Feature | Description |
|---------|-------------|
| **Picture size selection** | Common presets (4×6, 5×7, 8×10, A4, etc.) plus fully custom dimensions in mm or inches |
| **Frame profile editor** | Select from preset cross-section profiles (flat, beveled, rounded, ogee, scoop) or draw a custom profile via interactive curve editor |
| **Frame width & depth** | Adjustable overall width of the molding and depth/thickness |
| **Rabbet dimensions** | Configurable rabbet (the ledge that holds the glass/photo) depth and width |
| **Corner style** | Mitered corners (default), with optional rounded outer corners |
| **Surface decoration** | Optional repeating stamp/pattern impressed into the flat face of the frame, as alternative to custom cross-section profile |
| **Real-time 3D preview** | Orbit, zoom, pan the generated frame in WebGL |
| **STL and 3MF export** | Download binary STL, print-ready |
| **Shareable URLs** | Encode parameters into URL for sharing designs |

### 1.5 Post-MVP Features

Top priority
- Multi-part frames (for printers with small build volumes)
- Automatic joinery for multi-part frame parts

Lower priority

- SVG import for custom profile curves
- SVG import for surface stamp patterns (monograms, florals, geometric)
- Wall-mount hook/keyhole cutouts
- Easy share option to common 3DPrint file websites like printables

---

## 2. Design Customization Strategy

This section details the *implementation-friendly* approaches to customization, balancing expressiveness with engineering feasibility.

### 2.1 Picture Size

**Approach: Preset + Custom hybrid**

Presets are stored as a simple lookup table. Custom sizes are constrained to a reasonable range (25mm–1000mm per side) with validation.

```
Presets:
  4×6 in  → 101.6 × 152.4 mm
  5×7 in  → 127.0 × 177.8 mm
  8×10 in → 203.2 × 254.0 mm
  8×12 in → 203.2 × 304.8 mm
  11×14 in → 279.4 × 355.6 mm
  A4      → 210.0 × 297.0 mm
  A5      → 148.0 × 210.0 mm
  A3      → 297.0 × 420.0 mm
  Square sizes: 4×4, 6×6, 8×8, 10×10, 12×12
  Custom  → user-entered W × H
```

**Implementation note:** The frame is generated from `pictureWidth`, `pictureHeight` plus `tolerance` (default 1mm clearance on each side). The rabbet inner edge defines the visible opening; the picture + glass sit on the rabbet shelf.

### 2.2 Frame Cross-Section Profile

This is the most impactful customization and needs the most careful design.

**Approach: Profile as a 2D polyline/curve, swept along the frame path**

A frame's cross-section is a 2D shape (the "molding profile") that gets swept around the rectangular perimeter. The profile is defined in a local coordinate system where:
- **X-axis** = across the width of the frame (from inner edge toward outer edge)
- **Y-axis** = height/depth of the frame (from bottom up)

The profile always starts at the inner top edge (where the picture is visible) and ends at the outer bottom edge.

**Preset profiles (as polyline point arrays):**

| Profile | Description | Points (conceptual) |
|---------|-------------|---------------------|
| **Flat** | Simple rectangular section | 4 points, box shape |
| **Beveled** | Angled flat face, 45° from inner to outer | Trapezoid |
| **Rounded** | Convex arc across the face | Semicircular arc sampled to ~16 points |
| **Scoop** | Concave arc (scooped inward) | Inverted arc |
| **Ogee** | S-curve (convex near inner, concave near outer) | Compound curve |
| **Step** | Flat with a raised inner lip | Staircase shape |
| **Double Bevel** | Two angled planes meeting at a ridge | V-ridge profile |

**Custom profile via interactive editor:**

Rather than full SVG path editing (too complex for MVP), the profile editor uses a **control-point curve**:

- Display a 2D canvas showing the profile cross-section area
- The profile is a series of **draggable control points** connected by straight line segments or quadratic Bézier curves
- The top-left anchor (inner top edge) and bottom-right anchor (outer bottom edge) are fixed relative to frame width/depth
- The user drags intermediate points to sculpt the profile
- A "smoothing" toggle converts the polyline to a Bézier-interpolated curve (sampled to N points for meshing)
- Number of control points: 4–12, user can add/remove

**Why this approach works:**
- A polyline/sampled-curve is trivially consumed by JSCAD's `extrudeFromSlices` or custom sweep logic
- No need to parse arbitrary SVG path data for MVP
- The 2D canvas editor is straightforward to build with HTML Canvas or an SVG element
- Profiles are serializable as a simple array of `[x, y]` points (easy to encode in URL params)

### 2.3 Surface Decoration / Stamping

**Approach: Boolean subtraction of a tiled stamp geometry from the frame's flat surfaces**

The "stamp" is a shallow 3D relief (e.g., 0.5–1.5mm deep) that gets subtracted from (or unioned onto) the front face of the frame along its straight segments.

**Implementation-friendly strategy:**

1. **Stamp library (MVP):** Ship 6–10 built-in stamp patterns defined as 2D shapes (JSCAD polygons). These are extruded to a configurable stamp depth and boolean-subtracted.

2. **Stamp patterns (built-in):**
   - Geometric: chevron, diamond, Greek key, zigzag, dot grid
   - Floral: simple leaf, rosette (low-polygon for performance)
   - Linear: rope/twist, beading, channel/flute, reeded lines

3. **Tiling:** The stamp unit is repeated along each straight segment of the frame, with configurable spacing. A `repeatMode` parameter controls: `tile` (side by side), `spaced` (with gap), `mirror` (alternating flipped).

4. **Positioning:** Stamps are placed on the "face" of the frame—the largest flat or near-flat surface visible from the front. For simple profiles (flat, beveled), this is straightforward. For curved profiles, stamps are projected onto the tangent plane at the midpoint of the profile curve.

**Why boolean subtraction over texture mapping:**
- STL files have no texture/UV support—decoration must be geometric
- Boolean subtract of extruded 2D shapes is well-supported by JSCAD
- Produces real physical relief that 3D prints cleanly
- Performance is manageable if stamp geometry is kept to <500 triangles per unit

**Post-MVP:** Allow SVG upload, parse paths to JSCAD 2D geometry, and use as custom stamps.

### 2.4 Corner Treatment

**Approach: Mitered corners by default, built from four separate swept segments joined at 45°**

Building the frame as 4 straight segments with mitered (45°) ends is far simpler than sweeping a profile along a continuous rectangular path with corner-turning logic. Each segment is:
- A linear extrusion of the profile shape
- Trimmed at 45° at each end using boolean intersection with an angled half-space

**Optional rounded outer corners:** Replace the sharp outer corner with a toroidal sweep (small arc of `extrudeRotate`) that smoothly connects adjacent segments. The inner corner remains sharp (as in real frames).

### 2.5 Printability Parameters

| Parameter | Default | Range | Notes |
|-----------|---------|-------|-------|
| Wall thickness (minimum) | 2.0 mm | 1.0–5.0 mm | Enforced on thin profile areas |
| Rabbet depth | 3.0 mm | 1.5–10.0 mm | Must accommodate glass + print + backing |
| Rabbet width | 5.0 mm | 3.0–15.0 mm | Ledge that holds the contents |
| Tolerance | 1.0 mm | 0.0–3.0 mm | Clearance around picture dimensions |
| Print orientation hint | Flat (face down) | — | Displayed as a note, not modeled |

---

## 3. Technical Architecture

### 3.1 System Overview

```
┌───────────────────────────────────────────────────┐
│                    Browser (Client)                │
│                                                    │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   React UI   │→│  JSCAD Core  │→│ Three.js   │ │
│  │  (Controls)  │  │  (Modeling)  │  │ (Preview)  │ │
│  └─────────────┘  └──────┬───────┘  └───────────┘ │
│                          │                         │
│                   ┌──────▼───────┐                 │
│                   │ STL Serializer│                 │
│                   │ (Download)    │                 │
│                   └──────────────┘                 │
└───────────────────────────────────────────────────┘

        ▲ Hosted on Vercel / Cloudflare Pages
        │ (Static site — zero server-side compute)
```

**Key architectural decision: 100% client-side.** All geometry generation, boolean operations, meshing, and STL serialization happen in the browser. No backend needed. This enables free static hosting on Vercel or Cloudflare Pages.

### 3.2 Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | React 18 + TypeScript | Component model fits parametric UI; TypeScript catches geometry math bugs early |
| **Build** | Vite | Fast HMR, tree-shaking, excellent for static deploy |
| **3D Modeling Engine** | `@jscad/modeling` | MIT-licensed, browser-native, full CSG (boolean union/subtract/intersect), extrusions, 2D primitives, purpose-built for 3D printing geometry |
| **STL Export** | `@jscad/stl-serializer` | Direct integration with JSCAD geometries, binary STL output as Blob |
| **3D Preview** | Three.js + `@react-three/fiber` | Industry-standard WebGL renderer; `@react-three/fiber` provides React integration; `@react-three/drei` provides OrbitControls, lighting presets |
| **Profile Editor** | HTML Canvas (2D) or React-based SVG | Simple 2D point-dragging UI for profile curves |
| **State Management** | Zustand or URL params + React state | Lightweight; URL-encodable state enables shareable links |
| **Styling** | Tailwind CSS | Utility-first, fast to iterate |
| **Hosting** | Vercel or Cloudflare Pages | Free tier, global CDN, zero-config deploys from Git |

### 3.3 Why JSCAD over Alternatives

| Library | Pros | Cons | Verdict |
|---------|------|------|---------|
| **@jscad/modeling** | Purpose-built for 3D-print geometry; full CSG booleans; extrusion/sweep primitives; `extrudeFromSlices` for custom sweeps; MIT license; well-maintained; STL serializer companion package | Boolean operations can be slow on complex geometry; no WASM acceleration | **Selected** — best fit for parametric frame generation |
| **ManifoldCAD (manifold-3d)** | WASM-based, very fast booleans, guaranteed manifold output | Newer/less documented; no built-in 2D primitives or sweep; prefers 3MF/glTF over STL; lower-level API | Great for post-MVP performance optimization |
| **Three.js CSG (three-bvh-csg)** | Integrates with Three.js scene graph | Not designed for manufacturing; mesh quality can be poor for printing | Not suitable |
| **OpenCascade.js** | Full industrial CAD kernel | Very large WASM bundle (~15–30MB); overkill for frame geometry | Too heavy |

**Hybrid approach (recommended for future):** Use JSCAD for geometry generation and STL export, but render the preview with Three.js (converting JSCAD geometry to Three.js BufferGeometry). This gets the best of both worlds—JSCAD's print-oriented CSG and Three.js's superior rendering/interaction.

### 3.4 JSCAD → Three.js Bridge

JSCAD geometries (geom3) can be converted to Three.js BufferGeometry:

```typescript
// Conceptual bridge function
function jscadToThreeGeometry(jscadGeom3): THREE.BufferGeometry {
  const polygons = geom3.toPolygons(jscadGeom3);
  const positions: number[] = [];
  const normals: number[] = [];

  for (const polygon of polygons) {
    const vertices = polygon.vertices;
    // Triangulate polygon (fan triangulation for convex polygons)
    for (let i = 2; i < vertices.length; i++) {
      // Triangle: vertices[0], vertices[i-1], vertices[i]
      for (const vi of [0, i - 1, i]) {
        positions.push(vertices[vi][0], vertices[vi][1], vertices[vi][2]);
      }
      // Compute face normal from polygon plane
      const normal = poly3.plane(polygon);
      for (let j = 0; j < 3; j++) {
        normals.push(normal[0], normal[1], normal[2]);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geometry;
}
```

### 3.5 Frame Generation Pipeline

```
User Parameters
      │
      ▼
┌─────────────────┐
│ 1. Compute       │  Calculate inner rect (picture + tolerance),
│    Dimensions     │  outer rect (inner + 2× frame width),
│                   │  rabbet geometry
└────────┬──────────┘
         │
         ▼
┌─────────────────┐
│ 2. Build Profile │  Convert profile control points to JSCAD
│    2D Shape      │  polygon (geom2) in profile-local coords
└────────┬──────────┘
         │
         ▼
┌─────────────────┐
│ 3. Generate      │  For each of 4 frame sides:
│    Frame Segments │  - Extrude profile along segment length
│                   │  - Miter-cut ends at 45° using boolean
│                   │    intersection with half-space
└────────┬──────────┘
         │
         ▼
┌─────────────────┐
│ 4. Union         │  Boolean union all 4 segments into
│    Segments       │  a single solid frame
└────────┬──────────┘
         │
         ▼
┌─────────────────┐
│ 5. Apply Stamps  │  If decoration enabled:
│    (Optional)     │  - Tile stamp geometry along each segment
│                   │  - Boolean subtract from frame solid
└────────┬──────────┘
         │
         ▼
┌─────────────────┐
│ 6. Serialize     │  JSCAD geom3 → @jscad/stl-serializer
│    to STL        │  → Binary STL Blob → download link
└─────────────────┘
```

### 3.6 Performance Considerations

| Concern | Mitigation |
|---------|------------|
| Boolean operations on complex geometry are slow | Keep profile polygon count ≤ 32 points; keep stamp geometry ≤ 500 tris per unit; limit stamp repeats |
| Large frames = more geometry | Scale resolution with frame size; fewer profile segments for larger frames |
| UI responsiveness during generation | Run geometry generation in a **Web Worker**; show progress indicator; debounce parameter changes (300ms) |
| STL file size | Binary STL is compact; typical frame ≈ 2–10 MB; offer optional polygon reduction |

### 3.7 Web Worker Architecture

```
┌──────────────┐         ┌──────────────────┐
│  Main Thread  │         │   Web Worker      │
│              │         │                  │
│  React UI    │◄──msg──►│  JSCAD modeling   │
│  Three.js    │         │  STL serializer   │
│  Preview     │         │                  │
│              │         │  Receives: params │
│              │         │  Returns: geom3   │
│              │         │    polygons data,  │
│              │         │    STL blob        │
└──────────────┘         └──────────────────┘
```

The Web Worker isolates heavy CSG computation from the UI thread. The worker receives serialized parameters and returns serialized polygon data (transferable ArrayBuffers for zero-copy).

---

## 4. Project Structure

```
frame-forge/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx                    # App entry
│   ├── App.tsx                     # Root layout
│   │
│   ├── components/
│   │   ├── controls/
│   │   │   ├── DimensionControls.tsx   # Picture size + frame dims
│   │   │   ├── ProfileSelector.tsx     # Preset profiles dropdown
│   │   │   ├── ProfileEditor.tsx       # Interactive 2D curve editor
│   │   │   ├── StampControls.tsx       # Decoration options
│   │   │   ├── PrintabilityControls.tsx # Rabbet, tolerance, etc.
│   │   │   └── ExportButton.tsx        # STL download trigger
│   │   │
│   │   ├── preview/
│   │   │   ├── FramePreview.tsx        # Three.js 3D viewport
│   │   │   ├── ProfilePreview2D.tsx    # 2D cross-section preview
│   │   │   └── DimensionOverlay.tsx    # Dimension annotations
│   │   │
│   │   └── layout/
│   │       ├── Sidebar.tsx             # Controls panel
│   │       └── Header.tsx              # Branding + share button
│   │
│   ├── engine/
│   │   ├── worker.ts                   # Web Worker entry
│   │   ├── frameGenerator.ts           # Main generation orchestrator
│   │   ├── profileBuilder.ts           # 2D profile → JSCAD geom2
│   │   ├── segmentBuilder.ts           # Extrude + miter one segment
│   │   ├── stampBuilder.ts             # Stamp tiling + boolean
│   │   ├── cornerBuilder.ts            # Corner geometry (miter/round)
│   │   ├── bridge.ts                   # JSCAD geom3 → Three.js
│   │   └── exporter.ts                 # STL serialization + download
│   │
│   ├── data/
│   │   ├── presets.ts                  # Picture size presets
│   │   ├── profiles.ts                 # Built-in profile definitions
│   │   └── stamps.ts                   # Built-in stamp geometries
│   │
│   ├── store/
│   │   └── useFrameStore.ts            # Zustand state management
│   │
│   ├── utils/
│   │   ├── bezier.ts                   # Bézier interpolation
│   │   ├── urlParams.ts                # Encode/decode shareable URLs
│   │   └── units.ts                    # mm ↔ inch conversion
│   │
│   └── types/
│       └── frame.ts                    # TypeScript interfaces
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── vercel.json (or wrangler.toml)
```

---

## 5. Data Models

### 5.1 Core Types

```typescript
// === Units & Dimensions ===
type Unit = 'mm' | 'in';

interface Dimensions {
  width: number;   // mm (always stored as mm internally)
  height: number;  // mm
}

// === Picture Size ===
interface PictureSize {
  id: string;
  label: string;          // "4×6 in", "A4", "Custom"
  dimensions: Dimensions;
  isCustom: boolean;
}

// === Profile ===
interface ProfilePoint {
  x: number;  // 0..1 normalized (0 = inner edge, 1 = outer edge)
  y: number;  // 0..1 normalized (0 = bottom, 1 = top)
  smooth: boolean;  // If true, Bézier-interpolated at this point
}

interface FrameProfile {
  id: string;
  name: string;
  points: ProfilePoint[];  // Ordered from inner-top to outer-bottom
  thumbnail?: string;      // Base64 SVG preview
}

// === Stamp / Decoration ===
interface StampPattern {
  id: string;
  name: string;
  geometry: number[][];    // Array of 2D polygon points
  unitWidth: number;       // Width of one stamp unit (mm)
  unitHeight: number;      // Height of one stamp unit (mm)
}

interface StampConfig {
  enabled: boolean;
  patternId: string;
  depth: number;           // mm, how deep the stamp cuts
  spacing: number;         // mm, gap between repeats
  repeatMode: 'tile' | 'spaced' | 'mirror';
  placement: 'face' | 'inner-lip' | 'outer-edge';
}

// === Frame Parameters (complete state) ===
interface FrameParams {
  // Picture
  pictureSize: PictureSize;
  tolerance: number;        // mm

  // Frame
  frameWidth: number;       // mm, width of the molding
  frameDepth: number;       // mm, total thickness
  profile: FrameProfile;

  // Rabbet
  rabbetWidth: number;      // mm
  rabbetDepth: number;      // mm

  // Corners
  cornerStyle: 'miter' | 'rounded';
  cornerRadius: number;     // mm (only for rounded)

  // Decoration
  stamp: StampConfig;

  // Meta
  displayUnit: Unit;
}
```

### 5.2 State Flow

```
URL params (on load)
      │
      ▼
  Zustand Store (FrameParams)
      │
      ├──► React UI Controls (read/write)
      │
      ├──► Web Worker (read only → generates geometry)
      │        │
      │        ▼
      │    Geometry result (polygon data)
      │        │
      │        ├──► Three.js Preview (via bridge)
      │        └──► STL Export (on demand)
      │
      └──► URL Serializer (on change, updates URL hash)
```

---

## 6. Implementation Plan

### Phase 0: Project Scaffolding (1–2 days)

- [ ] Initialize Vite + React + TypeScript project
- [ ] Install dependencies: `@jscad/modeling`, `@jscad/stl-serializer`, `three`, `@react-three/fiber`, `@react-three/drei`, `zustand`, `tailwindcss`
- [ ] Configure Vite for Web Worker support (`?worker` imports)
- [ ] Set up Tailwind
- [ ] Verify deployment to Vercel or Cloudflare Pages (push empty app)
- [ ] Set up basic responsive layout: sidebar (controls) + main area (3D preview)

### Phase 1: Core Frame Generation — No UI (3–4 days)

**Goal:** Generate a basic rectangular frame STL from hardcoded params, entirely in code.

- [ ] Implement `profileBuilder.ts`: Convert a flat-profile polyline into a JSCAD `geom2`
- [ ] Implement `segmentBuilder.ts`: Extrude a profile along a straight line; miter-cut at 45° using `intersect` with a rotated cuboid half-space
- [ ] Implement `frameGenerator.ts`: Compose 4 segments, translate/rotate to form rectangle, `union` them
- [ ] Implement `exporter.ts`: Serialize to binary STL, trigger browser download
- [ ] Write unit tests for dimension math and profile generation
- [ ] Validate output STL in an external slicer (PrusaSlicer / Cura) for manifoldness

### Phase 2: 3D Preview (2–3 days)

- [ ] Implement `bridge.ts`: JSCAD `geom3` → Three.js `BufferGeometry`
- [ ] Build `FramePreview.tsx` with `@react-three/fiber`: scene, camera, lights, OrbitControls
- [ ] Material: MeshStandardMaterial with a neutral plastic appearance
- [ ] Add ground plane shadow and grid for scale reference
- [ ] Show loading spinner during generation

### Phase 3: Basic UI Controls (2–3 days)

- [ ] `DimensionControls.tsx`: Picture size dropdown (presets) + custom input fields + unit toggle (mm/in)
- [ ] Frame width, frame depth sliders with numeric input
- [ ] Rabbet width, rabbet depth controls
- [ ] Tolerance control
- [ ] Wire controls to Zustand store → trigger re-generation in Web Worker
- [ ] Add debouncing (300ms) so continuous slider drags don't spam the worker

### Phase 4: Profile System (3–4 days)

- [ ] Define 6–8 preset profiles as `ProfilePoint[]` arrays in `profiles.ts`
- [ ] `ProfileSelector.tsx`: Grid of profile thumbnails; click to select
- [ ] `ProfilePreview2D.tsx`: Render current profile as a 2D SVG/Canvas cross-section alongside the 3D view
- [ ] `ProfileEditor.tsx` (interactive):
  - Canvas showing the profile area with background grid
  - Draggable control points
  - Bézier smoothing toggle
  - Add/remove point buttons
  - Realtime 2D preview as points are dragged
- [ ] Integrate custom profiles into the generation pipeline

### Phase 5: Web Worker Integration (1–2 days)

- [ ] Move all JSCAD operations into `worker.ts`
- [ ] Define message protocol: `{type: 'generate', params: FrameParams}` → `{type: 'result', polygons: Float32Array, stlBlob: Blob}`
- [ ] Use Transferable objects for polygon position/normal arrays
- [ ] Handle cancellation (if params change while worker is busy)
- [ ] Add progress reporting from worker (optional: per-segment updates)

### Phase 6: Surface Stamping (3–4 days)

- [ ] Define 6–10 stamp patterns as JSCAD `geom2` shapes in `stamps.ts`
- [ ] Implement `stampBuilder.ts`:
  - Extrude stamp to configured depth
  - Tile along segment length with spacing
  - Transform each stamp instance to sit on the frame's face surface
  - Boolean subtract from frame solid
- [ ] `StampControls.tsx`: Pattern selector grid, depth slider, spacing slider, repeat mode toggle
- [ ] Performance testing—ensure stamped frames generate in <10 seconds on mid-range hardware

### Phase 7: Shareable URLs & Polish (2–3 days)

- [ ] Implement `urlParams.ts`: Encode `FrameParams` into compact URL hash (base64 JSON or custom short encoding)
- [ ] "Share" button that copies URL to clipboard
- [ ] On page load, decode URL params and restore state
- [ ] Add dimension annotation overlays on the 3D preview (picture size, frame width labels)
- [ ] Responsive design: controls collapse to bottom on mobile
- [ ] Add print orientation guidance note
- [ ] Error states and validation messages

### Phase 8: Deployment & Testing (1–2 days)

- [ ] Configure `vercel.json` (or `wrangler.toml` for Cloudflare Pages)
- [ ] Set up CI (GitHub Actions): build + lint on PR
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile testing (preview interaction, control usability)
- [ ] Performance profiling: target <5s generation for simple frames, <15s for stamped
- [ ] Write README with screenshots and usage guide

---

## 7. Deployment Configuration

### Vercel

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

### Cloudflare Pages

```toml
# wrangler.toml (if using Wrangler CLI)
[site]
bucket = "./dist"

# Or configure in Cloudflare dashboard:
# Build command: npm run build
# Build output directory: dist
```

Both platforms serve the `dist/` folder as a static site with global CDN. No server functions needed.

### Vite Configuration Notes

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',  // ES module workers for better tree-shaking
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          jscad: ['@jscad/modeling', '@jscad/stl-serializer'],
          three: ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
});
```

---

## 8. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| JSCAD boolean operations produce non-manifold geometry | STL won't slice/print correctly | Medium | Validate with mesh analysis; consider Manifold library as fallback for booleans |
| Complex stamp patterns cause >30s generation times | Poor UX | Medium | Cap stamp complexity; show progress; offer "draft" (no stamps) and "final" (with stamps) modes |
| JSCAD bundle size too large | Slow initial page load | Low | Tree-shake unused JSCAD modules; lazy-load stamp patterns; code-split |
| Profile editor is confusing for non-CAD users | Low adoption of custom profiles | Medium | Ship excellent presets; make editor optional/advanced; provide undo |
| Frame geometry has thin walls that won't print | User frustration | Medium | Add real-time printability warnings; enforce minimum wall thickness |
| `@jscad/modeling` package has breaking changes | Build failures | Low | Pin dependency versions; integration tests |

---

## 9. Package Dependencies

```json
{
  "dependencies": {
    "@jscad/modeling": "^2.12.0",
    "@jscad/stl-serializer": "^2.1.0",
    "@react-three/drei": "^9.x",
    "@react-three/fiber": "^8.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "three": "^0.160.x",
    "zustand": "^4.x"
  },
  "devDependencies": {
    "@types/react": "^18.x",
    "@types/three": "^0.160.x",
    "@vitejs/plugin-react": "^4.x",
    "autoprefixer": "^10.x",
    "postcss": "^8.x",
    "tailwindcss": "^3.x",
    "typescript": "^5.x",
    "vite": "^5.x",
    "vitest": "^1.x"
  }
}
```

---

## 10. Success Metrics

| Metric | Target |
|--------|--------|
| Time to first frame (new user) | < 30 seconds from page load to STL download |
| Frame generation time (simple, no stamps) | < 3 seconds |
| Frame generation time (with stamps) | < 15 seconds |
| STL validity rate | 100% manifold (verified by slicer import) |
| Page load (initial, uncached) | < 3 seconds on 4G |
| Bundle size (gzipped) | < 500 KB initial, < 1.5 MB total with lazy chunks |
| Mobile usability | Fully functional 3D preview with touch controls |

---

## Appendix A: JSCAD API Quick Reference for Frame Generation

```typescript
// Key imports from @jscad/modeling
const { polygon } = require('@jscad/modeling').primitives;      // 2D polygon from points
const { circle, rectangle } = require('@jscad/modeling').primitives;
const { cuboid } = require('@jscad/modeling').primitives;
const { extrudeLinear } = require('@jscad/modeling').extrusions; // 2D → 3D
const { extrudeFromSlices, slice } = require('@jscad/modeling').extrusions;
const { union, subtract, intersect } = require('@jscad/modeling').booleans;
const { translate, rotate, scale } = require('@jscad/modeling').transforms;
const { geom2, geom3, poly3 } = require('@jscad/modeling').geometries;
const { mat4 } = require('@jscad/modeling').maths;

// STL export
const stlSerializer = require('@jscad/stl-serializer');
const rawData = stlSerializer.serialize({ binary: true }, geometry);
const blob = new Blob(rawData);
```

## Appendix B: Frame Geometry Glossary

```
                    ◄──── Frame Width ────►
                    ┌─────────────────────┐ ▲
                    │      Outer Edge      │ │
                    │  ┌───────────────┐  │ │
                    │  │  Rabbet Ledge │  │ Frame
                    │  │  ┌─────────┐  │  │ Depth
                    │  │  │ Picture │  │  │ │
                    │  │  │ Opening │  │  │ │
                    │  │  └─────────┘  │  │ │
                    │  └───────────────┘  │ │
                    │      Inner Edge      │ │
                    └─────────────────────┘ ▼

Cross-Section (Profile):

    Top (visible face)
    ┌──────────────────────┐
    │                      │  ← Profile shape (customizable)
    │   Rabbet ┌───────────┤
    │          │ (glass &  │
    └──────────┘  picture) │
    Bottom                 │
                           ▼
    Inner Edge ──────► Outer Edge
```

---

*Document generated for FrameForge project planning. All architecture decisions are preliminary and subject to revision during implementation.*
