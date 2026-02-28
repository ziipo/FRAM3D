# FrameForge vs. SnapFrames — Competitive Gap Analysis

## Feature-by-Feature Comparison & Development Roadmap to Parity

---

## 1. SnapFrames Feature Inventory

Based on analysis of the SnapFrames app (snapframes.app), its MakerWorld crowdfunding campaign ($214K raised, 3,932 backers), tutorial documentation, and community feedback, here is a comprehensive feature map of the product:

### Core Generation
- Arbitrary rectangular frame dimensions (any W × H)
- Hexagonal frame shape (beta)
- Two frame types: "Picture Frame" (2D art with lip/tabs) and "3D Art Frame" (shadow-box style with glass slot + spacer)
- Multiple edge/cross-section profiles
- Snap-together multi-part construction with printed joiner clips
- One-piece frame option (beta, for frames that fit the build plate)
- Sample corner generation (print a test piece before committing to the full frame)

### Build Plate Awareness
- User-configurable build plate size
- "Smart Orientation" — diagonal placement of segments to maximize usable build plate area
- Automatic segmentation: frame sides are split into pieces sized to fit the build plate, with snap connectors at each joint
- Built-in nail holes for wall hanging

### Surface Texturing
- Smooth texture
- Procedural wood grain texture with configurable parameters (ring frequency, warp, knot count)
- 3D relief settings (relief depth in mm, texture definition/resolution)
- Multiple premium texture/pattern styles (rope border, etc.)
- HD texture achieved by printing vertically on edge (the face is the side wall, getting layer-height resolution instead of nozzle-width resolution)

### Accessories
- Backer plate (snap-on backing)
- Backer plate with integrated kickstand (auto-sized for stability)
- Mat (decorative border insert, customizable opening/margins)
- Embossed note on backer plate (personalized text with configurable font size and protrusion depth)

### Customization & UX
- Community designs library (browse & publish)
- "My Designs" saved presets
- Part labels (part number, dimensions, branding — or custom)
- Face text (embossed text on the front face)
- 3D preview with rotate/zoom/pan
- Preview color picker
- Measurement tool in preview
- Build plate outline overlay in preview
- Settings import/export via file
- STL and 3MF export (ZIP containing all parts)
- Tutorials page
- In-app roadmap with user voting
- Subscription model for ongoing access

---

## 2. Feature Comparison Matrix

| Feature | SnapFrames | FrameForge (MVP Plan) | Gap? |
|---------|-----------|----------------------|------|
| **Arbitrary rectangular dimensions** | ✅ | ✅ | — |
| **Common size presets** | ✅ | ✅ | — |
| **Unit toggle (in/mm/cm)** | ✅ in/cm | ✅ in/mm | — |
| **Multiple cross-section profiles** | ✅ | ✅ | — |
| **Custom profile editor** | ❌ | ✅ Interactive curve editor | FrameForge ahead |
| **Hexagonal frame shape** | ✅ (beta) | ❌ | **Gap** |
| **Snap-together construction** | ✅ Core feature | ❌ (single-piece mitered) | **Major gap** |
| **Auto build plate segmentation** | ✅ Core feature | ❌ | **Major gap** |
| **Smart diagonal orientation** | ✅ | ❌ | **Gap** |
| **One-piece frame option** | ✅ (beta) | ✅ (our default) | — |
| **Sample corner generation** | ✅ | ❌ | **Gap** |
| **Picture frame type (lip + tabs)** | ✅ | ✅ (rabbet) | Partial |
| **3D Art / shadow-box type** | ✅ (glass slot + spacer) | ❌ | **Gap** |
| **Wood grain texture** | ✅ Procedural (freq, warp, knots) | ❌ | **Major gap** |
| **Texture relief depth control** | ✅ | ❌ | **Gap** |
| **Texture definition/resolution** | ✅ | ❌ | **Gap** |
| **Smooth texture** | ✅ | ✅ (implicit default) | — |
| **Surface stamp/patterns** | ✅ (rope, etc.) | ✅ (boolean stamp system) | Partial parity |
| **Backer plate** | ✅ | ❌ | **Gap** |
| **Kickstand** | ✅ (auto-sized) | ❌ | **Gap** |
| **Mat insert** | ✅ | ❌ | **Gap** |
| **Embossed text (backer)** | ✅ | ❌ | **Gap** |
| **Face text** | ✅ (beta) | ❌ | **Gap** |
| **Part labels** | ✅ | ❌ | **Gap** |
| **Nail holes** | ✅ | ❌ | **Gap** |
| **3D preview** | ✅ | ✅ | — |
| **Build plate overlay in preview** | ✅ | ❌ | **Gap** |
| **Measurement tool** | ✅ | ❌ | Minor gap |
| **Preview color picker** | ✅ | ❌ | Minor gap |
| **STL export** | ✅ | ✅ | — |
| **3MF export** | ✅ | ❌ | **Gap** |
| **ZIP of all parts** | ✅ | ❌ (single file) | **Gap** |
| **Settings file import/export** | ✅ | ❌ (URL params only) | Minor gap |
| **Shareable URLs** | ❌ | ✅ | FrameForge ahead |
| **Community designs gallery** | ✅ | ❌ | **Gap** (needs backend) |
| **User accounts / saved designs** | ✅ | ❌ | **Gap** (needs backend) |
| **Roadmap with voting** | ✅ | ❌ | Non-critical |
| **Tutorials** | ✅ | ❌ | Content gap |
| **Fully open source** | ❌ Proprietary | ✅ | FrameForge ahead |
| **Free / no subscription** | ❌ ($25–$75+ tiers) | ✅ | FrameForge ahead |
| **Static hosting (no backend)** | Unknown (likely has backend) | ✅ | FrameForge advantage |

---

## 3. Gap Analysis — Development Roadmap to Parity

Each item is rated for **difficulty** (1–5 stars, where ★ = trivial, ★★★★★ = research-level hard), **estimated effort**, and **open-source solutions** that can help.

---

### GAP 1: Snap-Together Joint System
**Priority: Critical** — This is SnapFrames' defining feature and namesake.

**What it requires:** Instead of generating a one-piece frame with mitered corners, generate frame segments as separate printable parts with interlocking snap-fit connectors at each joint. Corner pieces have 45° miters with male/female snap tabs. Straight segments (for sides longer than the build plate) have inline connectors.

**Difficulty: ★★★★☆ (4/5)**

The connector geometry itself isn't complex (cantilever snap-fit tabs are well-documented in mechanical engineering), but the challenge is making the parametric system robust: connectors must work across all profile shapes, maintain tolerances, and the splitting logic must correctly place joints.

**Estimated effort:** 2–3 weeks

**Open-source solutions:**
- **Snap-fit design references:** "Snap-Fit Joints for Plastics" by Bayer MaterialScience (public PDF) documents all standard snap-fit geometries with formulas for deflection, stress, and tolerances. These can be directly coded as parametric JSCAD functions.
- No off-the-shelf JS library exists for snap-joint generation — this must be custom-built. However, the geometry is simple: a cantilevered beam with a hook/barb, which is just a few extruded rectangles with a chamfered catch.

**Implementation approach:**
1. Define a `ConnectorProfile` as a JSCAD geom2 (the cross-section of the male tab)
2. Boolean-subtract a matching female pocket from the receiving end
3. Connector placement is computed from segment lengths and build plate constraints

---

### GAP 2: Auto Build Plate Segmentation
**Priority: Critical** — Enables frames larger than the print bed.

**What it requires:** Given the frame dimensions and the user's build plate size, automatically determine how to split each frame side into printable segments. Each segment must fit within the build plate (accounting for diagonal placement), and connector geometry must be added at each split point.

**Difficulty: ★★★☆☆ (3/5)**

This is a constrained 1D bin-packing problem on each frame side. Since frame sides are straight beams, the "splitting" is just choosing cut positions along the length. The challenge is the diagonal orientation optimization and ensuring each segment + connector fits.

**Estimated effort:** 1–2 weeks

**Open-source solutions:**
- **Bin packing:** The problem is simpler than general 2D bin-packing. Each frame side is a 1D length that needs to be divided into segments ≤ the diagonal of the build plate. Libraries like `bin-packing` (npm) exist but are overkill — a simple greedy algorithm that divides the side length by the max segment length (diagonal of build plate minus connector allowance) suffices.
- **Diagonal fit calculation:** Given a segment's cross-section width W and length L, and a build plate of X×Y, the maximum L that fits diagonally is `sqrt(X² + Y²) - W*sin(atan(Y/X))` approximately. This is straightforward trigonometry.

**Implementation approach:**
1. Add build plate dimensions to FrameParams (width × depth in mm)
2. Compute max segment length given plate size and profile width
3. Divide each frame side into N segments, distributing length evenly
4. Generate each segment as a separate JSCAD solid with connectors on cut ends
5. Package all parts as separate STL files in a ZIP

---

### GAP 3: Procedural Wood Grain Texture
**Priority: High** — SnapFrames' most visually distinctive feature; users specifically rave about it.

**What it requires:** A procedural 3D texture that simulates wood grain (concentric rings with warp, knots, and noise), applied as geometric displacement to the frame's face surface. The texture is parameterized: ring frequency, warp amount, knot count.

**Difficulty: ★★★★★ (5/5)**

This is the single hardest feature to replicate. It requires volumetric procedural noise applied as mesh displacement — fundamentally different from our boolean-stamp approach. The mesh must be tessellated to high resolution before displacement, and the displacement must not create self-intersections or non-manifold geometry.

**Estimated effort:** 3–5 weeks

**Open-source solutions:**
- **29a.ch 3D Print Texturizer** (https://29a.ch/sandbox/2021/3d-print-texturizer/) — An open-source web tool by Jonas Wagner that does exactly this: applies procedural wood grain to STL files via volumetric sine waves + noise displacement. Uses Three.js for tessellation and displacement. This is the most directly relevant open-source prior art. The approach: tessellate the mesh, then displace each vertex by sampling a 3D procedural wood function at that vertex's position.
- **Simplex/Perlin noise libraries:** `simplex-noise` (npm) or `noisejs` (npm) provide the noise functions needed for wood grain ring distortion and knot placement.
- **Three.js SubdivisionModifier / tessellation:** Three.js has tessellation utilities that can increase mesh resolution before displacement.

**Implementation approach:**
1. Generate the frame with high-resolution tessellation (many subdivisions along the face surface)
2. Implement a volumetric wood function: `f(x,y,z) = sin(ringFreq * sqrt((x+warp*noise(x,y,z))² + (z+warp*noise(x,y,z))²))` plus knot perturbations
3. Displace each vertex along its face normal by `reliefDepth * f(vertex)`
4. Validate mesh for self-intersections (or use Manifold library to repair)

**Key risk:** Mesh displacement can create non-manifold geometry. Manifold-3d (WASM) could be used as a repair pass, or the displacement magnitude can be clamped conservatively.

---

### GAP 4: 3D Art / Shadow-Box Frame Type
**Priority: Medium-High**

**What it requires:** An alternative profile that has a deep channel to accommodate glass/plexiglass + spacer + art, rather than a simple rabbet ledge. The glass sits in a forward slot, the art sits in a rear slot, with a spacer creating depth between them.

**Difficulty: ★★☆☆☆ (2/5)**

This is just an alternative profile shape with specific functional slots. No new algorithms — just a different `geom2` cross-section with multiple internal channels.

**Estimated effort:** 3–5 days

**Open-source solutions:** None needed — this is a profile design task, implemented as a new preset in our profile system.

---

### GAP 5: Hexagonal Frame Shape
**Priority: Medium**

**What it requires:** Instead of a rectangular perimeter, generate a hexagonal frame (6 sides, 120° corners instead of 90°).

**Difficulty: ★★★☆☆ (3/5)**

The profile sweep and miter-cutting logic must be generalized from 4 sides with 90° corners to N sides with arbitrary angles. The miter angle becomes 60° (half of 120°) instead of 45°.

**Estimated effort:** 1–2 weeks

**Open-source solutions:** None specifically — but generalizing our segment builder to accept an arbitrary polygon perimeter (with per-corner miter angles) handles this and opens the door to octagons, circles (approximated), ovals, etc.

**Implementation approach:**
1. Abstract the frame perimeter from a hardcoded rectangle to a `FrameShape` polygon
2. Compute miter angles from adjacent edge directions
3. Apply the same extrude-and-cut logic per segment

---

### GAP 6: Accessories (Backer Plate, Kickstand, Mat)
**Priority: Medium**

**What it requires:**
- **Backer plate:** A flat panel sized to the frame's outer dimensions, with snap tabs that click into the frame's rear channel. Simple extruded rectangle + snap tabs.
- **Kickstand:** A hinged strut attached to the backer plate, auto-sized based on frame dimensions for stable lean angle (~15–20°). Printed as a living hinge or separate snap-on piece.
- **Mat:** A flat decorative border with a rectangular opening, sized to create visible margins around the art.

**Difficulty: ★★☆☆☆ (2/5) for backer & mat, ★★★☆☆ (3/5) for kickstand**

Backer plate and mat are trivial flat geometry. The kickstand requires some engineering for hinge geometry and sizing the strut length for stable support at the correct angle given the frame's weight distribution.

**Estimated effort:** 1–2 weeks for all three

**Open-source solutions:**
- Kickstand geometry is well-documented in parametric CAD communities (Printables/Thingiverse have many open-source parametric easel designs in OpenSCAD that could be studied for hinge geometry).

---

### GAP 7: Embossed / Engraved Text
**Priority: Medium** — Covers both "Face Text" and "Embossed Note on Backer"

**What it requires:** Convert user-entered text strings into 3D geometry (extruded letterforms) that can be boolean-unioned (embossed/raised) or boolean-subtracted (engraved) from frame surfaces.

**Difficulty: ★★★☆☆ (3/5)**

The core challenge is font rendering to 2D vector paths in the browser, then extruding those paths.

**Estimated effort:** 1–2 weeks

**Open-source solutions:**
- **opentype.js** (npm: `opentype.js`) — Open-source font parser that converts TrueType/OpenType fonts to vector path commands (moveTo, lineTo, curveTo). These paths can be sampled to polylines and converted to JSCAD `geom2` shapes.
- **JSCAD built-in text:** JSCAD's `@jscad/modeling` includes `vectorText()` and `vectorChar()` functions that generate 2D line segments from a built-in vector font. These can be extruded directly. Limited font options but zero external dependencies.
- **Makerjs** (npm: `makerjs`) — 2D vector drawing library with text-to-path conversion using opentype.js. Can export to DXF/SVG. Useful as an intermediate step.

**Implementation approach (simplest path):**
1. Use JSCAD's built-in `vectorText()` for MVP (single font, but works immediately)
2. Extrude text to configured depth
3. Boolean union (raised) or subtract (engraved) from target surface
4. Post-MVP: integrate `opentype.js` for custom font support

---

### GAP 8: Part Labels
**Priority: Low-Medium**

**What it requires:** Small embossed or engraved text on each part identifying the part number, dimensions, and orientation. Helps users assemble multi-part frames.

**Difficulty: ★★☆☆☆ (2/5)** — Uses the same text-to-geometry pipeline as Gap 7.

**Estimated effort:** 2–3 days (after Gap 7 is done)

---

### GAP 9: Wall Mounting (Nail Holes)
**Priority: Medium**

**What it requires:** Cylindrical through-holes or keyholes in the frame's back surface, positioned for wall hanging.

**Difficulty: ★☆☆☆☆ (1/5)**

Boolean-subtract cylinders from the frame back. Trivial geometry.

**Estimated effort:** 1–2 days

**Open-source solutions:** None needed — `subtract(frame, cylinder({...}))` in JSCAD.

---

### GAP 10: 3MF Export
**Priority: Medium** — 3MF preserves manifold topology and is preferred by modern slicers.

**What it requires:** Serialize JSCAD geometry to 3MF format (XML-based ZIP archive with mesh data).

**Difficulty: ★★★☆☆ (3/5)**

3MF is more complex than STL (it's a ZIP containing XML files describing meshes, materials, and build items), but it's well-documented.

**Estimated effort:** 1–2 weeks

**Open-source solutions:**
- **@jscad/3mf-serializer** — Does not currently exist in the JSCAD ecosystem, but JSCAD serializers are relatively straightforward to write following the pattern of the STL serializer.
- **Manifold-3d** (npm: `manifold-3d`) natively supports 3MF export. If we integrate Manifold as a secondary engine (for performance or mesh repair), 3MF export comes free.
- **3MF specification** is fully open: https://3mf.io/specification/ — the format is XML + zip, implementable from scratch in ~500 lines of JS.
- **js-3mf** — A few community JS implementations exist on GitHub that could be referenced/forked.

---

### GAP 11: Multi-Part ZIP Download
**Priority: Medium** — Required once snap-together segmentation exists.

**What it requires:** Bundle multiple STL (or 3MF) files into a single ZIP download.

**Difficulty: ★☆☆☆☆ (1/5)**

**Estimated effort:** 1–2 days

**Open-source solutions:**
- **JSZip** (npm: `jszip`) — The de facto standard for creating ZIP files in the browser. Mature, well-maintained, tiny bundle. Create a ZIP, add each part's STL blob, trigger download.
- **fflate** (npm: `fflate`) — Faster and smaller alternative to JSZip with streaming compression.

---

### GAP 12: Build Plate Overlay in Preview
**Priority: Low-Medium**

**What it requires:** Render a semi-transparent rectangle in the Three.js scene representing the user's build plate, so they can visually confirm parts fit.

**Difficulty: ★☆☆☆☆ (1/5)**

A single `PlaneGeometry` with a wireframe or translucent material, positioned at z=0 in the scene.

**Estimated effort:** Half a day

---

### GAP 13: Community Designs Gallery
**Priority: Low** (for MVP — requires backend infrastructure)

**What it requires:** Users can save their frame configurations, publish them to a shared gallery, and browse/import others' designs.

**Difficulty: ★★★★☆ (4/5)** — Not because the feature is hard, but because it breaks the "static site, no backend" architecture.

**Estimated effort:** 2–4 weeks

**Open-source solutions:**
- **Supabase** (open-source Firebase alternative) — Provides auth, Postgres database, and storage with a generous free tier. Designs could be stored as JSON blobs. Keeps the frontend static while adding a managed backend.
- **PocketBase** — Single-binary open-source backend (Go) with SQLite, auth, and file storage. Could be self-hosted cheaply.
- **GitHub Gist API** — For a lightweight approach, designs could be saved as GitHub Gists (requires GitHub OAuth). No custom backend needed, but limits audience to GitHub users.
- **Alternative for static-only:** A curated gallery of preset JSON files shipped with the app, community contributions via GitHub PRs. No real-time UGC but zero infrastructure.

---

### GAP 14: Settings Import/Export File
**Priority: Low**

**What it requires:** Export current frame parameters as a JSON file; import a JSON file to restore parameters.

**Difficulty: ★☆☆☆☆ (1/5)**

`JSON.stringify` the Zustand store, trigger download. On import, `JSON.parse` and hydrate the store.

**Estimated effort:** Half a day

---

### GAP 15: Sample Corner Generation
**Priority: Low-Medium** — Great UX feature for saving filament during iteration.

**What it requires:** Generate only a small corner section of the frame (e.g., one mitered corner plus ~30mm of each adjacent side) so users can test-print profile, texture, and fit without printing the entire frame.

**Difficulty: ★★☆☆☆ (2/5)**

Truncate two adjacent segments to a short length and union at the corner. Same generation pipeline, just with shorter segments.

**Estimated effort:** 2–3 days

---

## 4. Prioritized Development Roadmap

### Tier 1 — Achieve Core Parity (8–12 weeks)

| # | Feature | Difficulty | Effort | Dependencies |
|---|---------|-----------|--------|--------------|
| 1 | Snap-together joint system | ★★★★ | 2–3 wk | — |
| 2 | Auto build plate segmentation | ★★★ | 1–2 wk | #1 |
| 3 | Procedural wood grain texture | ★★★★★ | 3–5 wk | simplex-noise, 29a.ch reference |
| 4 | Multi-part ZIP download | ★ | 1–2 d | #2, JSZip/fflate |
| 5 | Nail holes / wall mounting | ★ | 1–2 d | — |
| 6 | 3D Art / shadow-box profile | ★★ | 3–5 d | — |

### Tier 2 — Feature Richness (4–6 weeks)

| # | Feature | Difficulty | Effort | Dependencies |
|---|---------|-----------|--------|--------------|
| 7 | Embossed/engraved text | ★★★ | 1–2 wk | opentype.js or JSCAD vectorText |
| 8 | Accessories (backer, kickstand, mat) | ★★–★★★ | 1–2 wk | — |
| 9 | 3MF export | ★★★ | 1–2 wk | manifold-3d or custom |
| 10 | Hexagonal frames | ★★★ | 1–2 wk | — |
| 11 | Sample corner generation | ★★ | 2–3 d | — |
| 12 | Part labels | ★★ | 2–3 d | #7 |

### Tier 3 — Polish & Platform (2–4 weeks)

| # | Feature | Difficulty | Effort | Dependencies |
|---|---------|-----------|--------|--------------|
| 13 | Build plate overlay in preview | ★ | 0.5 d | — |
| 14 | Preview color picker | ★ | 0.5 d | — |
| 15 | Measurement tool in preview | ★★ | 2–3 d | — |
| 16 | Settings import/export | ★ | 0.5 d | — |
| 17 | Smart diagonal orientation | ★★ | 3–5 d | #2 |
| 18 | Tutorials & documentation | ★ | 1 wk | Content work |

### Tier 4 — Platform Features (requires backend)

| # | Feature | Difficulty | Effort | Dependencies |
|---|---------|-----------|--------|--------------|
| 19 | Community designs gallery | ★★★★ | 2–4 wk | Supabase/PocketBase |
| 20 | User accounts & saved designs | ★★★ | 1–2 wk | #19 |

---

## 5. Key Open-Source Dependencies Summary

| Need | Library / Tool | License | Notes |
|------|---------------|---------|-------|
| 3D modeling & CSG | `@jscad/modeling` | MIT | Core geometry engine |
| STL serialization | `@jscad/stl-serializer` | MIT | Binary STL export |
| Fast boolean ops (future) | `manifold-3d` | Apache 2.0 | WASM, 100x faster booleans, 3MF native |
| 3D preview | Three.js + `@react-three/fiber` | MIT | WebGL rendering |
| Procedural noise | `simplex-noise` | MIT | Wood grain ring distortion |
| Wood grain reference | 29a.ch texturizer | Open source | Volumetric wood displacement approach |
| Font → vector paths | `opentype.js` | MIT | Text to 2D paths for extrusion |
| JSCAD built-in text | `@jscad/modeling` vectorText | MIT | Simple single-font text |
| ZIP packaging | `jszip` or `fflate` | MIT | Multi-part downloads |
| 3MF specification | 3mf.io | Open standard | Format documentation |
| Backend (if needed) | Supabase / PocketBase | Apache 2.0 | Community features |

---

## 6. Strategic Advantages of FrameForge

Despite the gaps, FrameForge has structural advantages that SnapFrames cannot match:

1. **Fully open source** — SnapFrames is proprietary with a subscription model. An open-source alternative has inherent community appeal, especially in the maker/3D printing community that values openness.

2. **No subscription / free forever** — SnapFrames charges $25–$75 for access and requires renewal. FrameForge is free.

3. **Custom profile editor** — SnapFrames offers preset profiles only. Our interactive curve editor gives advanced users dramatically more creative control.

4. **Shareable URLs** — Encode a complete design in a URL. SnapFrames requires file export/import.

5. **Static hosting / no backend** — Zero infrastructure cost, zero downtime risk, deployable by anyone.

6. **Extensible by community** — Being open source means the community can contribute profiles, stamps, frame shapes, and textures.

The recommendation is to ship the MVP quickly (our existing plan), then prioritize the snap-together joint system and build plate segmentation first (Tier 1 items 1–2), as these represent the largest functional gap and are the primary reason users choose SnapFrames. Wood grain texture (item 3) is the largest *engineering* challenge but can be developed in parallel.

---

*Analysis based on SnapFrames app state as of February 2026. Feature set may have evolved since this review.*
