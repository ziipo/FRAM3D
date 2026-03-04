# Latest Update: Boolean Stamping Engine & Corner Joints

## Overview
A new "Stamped Pattern" system has been implemented as an alternative to the traditional "Extruded Profile" frame style. Instead of sweeping a complex 2D curve around the frame, this mode uses a simple, flat rectangular base and applies repetitive 3D boolean subtractions (stamps) along the face of the frame. This yields highly decorative, printable frames.

## State & UI Additions
*   **Design Controls Component**: Replaced the previous `ProfileSelector` with a new `DesignControls` sidebar section.
*   **Style Toggle**: Users can now select between `Extruded Profile` and `Stamped Pattern` modes.
*   **Stamping Parameters**:
    *   **Stamp Shape**: `dots`, `chevrons`, `stripes`, `diamonds`, `hexagons`, and `custom` image tracing.
    *   **Pattern Layout**: `repeating` or `alternating`.
    *   **Corner Joints**: `Butt (Top/Bottom overlap)`, `Butt (Left/Right overlap)`, and `Cyclic`.
*   **Joinery System**:
    *   **Global Joinery Section**: Joinery settings (Floating Tenons, Tongue & Groove) have been moved out of the Build Plate section and are now a top-level design choice.
    *   **Corner Joinery**: Joinery is now automatically applied to the corners of Stamped frames (starting with Butt joints). This allows for strong, mechanical connections even if the sides are not further split for the build plate.
    *   **Automatic Splitting**: When any joinery method is selected, the 3D preview automatically switches to an exploded-parts view to show the internal geometry.
*   **Build Plate Features**:
    *   **Exploded 3D Preview**: Renders individual parts and connectors as separate meshes.
    *   **Preview Explosion Slider**: Visually separate frame pieces to inspect internal joinery.
*   **URL Syncing**: All parameters, including complex joinery settings, are encoded into the URL hash.

## Segment Building & Corner Logic
When "Stamped Pattern" is active, the engine bypasses standard miter cuts and uses `buildFlatSegment`.

### Rabbet Geometry Fix
The "Stamped Pattern" mode now uses a 3D boolean subtraction for the rabbet, ensuring it doesn't bleed out of the corners in butt/cyclic joinery.

### Corner Joinery Implementation
Joinery at corners is calculated based on the overlapping geometry:
1.  **Butt (Top/Bottom overlap)**: Horizontal cuts are made at the corners. Mortises or tongues are placed centered on the joint face.
2.  **Butt (Left/Right overlap)**: Vertical cuts are made at the corners.

## Stamping Mechanism
The 3D stamps are applied to segments *before* assembly.
1.  **Tool Generation**: `createStampTool` generates negative space tools.
2.  **Image Tracing**: `d3-contour` is used to trace uploaded images into vectorized 3D stamps at 128x128 resolution.
3.  **Flat Shading**: The 3D preview uses flat shading to accurately represent sharp architectural edges.
