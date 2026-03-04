# Latest Update: Boolean Stamping Engine & Corner Joints

## Overview
A new "Stamped Pattern" system has been implemented as an alternative to the traditional "Extruded Profile" frame style. Instead of sweeping a complex 2D curve around the frame, this mode uses a simple, flat rectangular base and applies repetitive 3D boolean subtractions (stamps) along the face of the frame. This yields highly decorative, printable frames.

## State & UI Additions
*   **Design Controls Component**: Replaced the previous `ProfileSelector` with a new `DesignControls` sidebar section.
*   **Style Toggle**: Users can now select between `Extruded Profile` and `Stamped Pattern` modes.
*   **Stamping Parameters**:
    *   **Stamp Shape**: `dots` (cylinders), `chevrons` (triangular prisms), `stripes` (rectangular notches).
    *   **Pattern Layout**: Choose between `repeating` (same orientation) or `alternating` (every other stamp is rotated 180° around the normal axis).
    *   **Spacing**: Slide control (2mm - 50mm) for the distance between stamps.
    *   **Stamp Depth**: Slide control (0.5mm - 10mm) for how deep the stamp cuts into the frame.
    *   **Corner Joints**: Selection between `Butt (Top/Bottom overlap)`, `Butt (Left/Right overlap)`, and `Cyclic`.
*   **URL Syncing**: All new parameters (`fs`, `st`, `ss`, `sd`, `sc`, `sp`) are encoded and decoded to maintain shareable URLs.

## Segment Building & Corner Logic
When "Stamped Pattern" is active, the engine bypasses the standard 45° miter cuts (`buildFrameSegment`) and uses a new `buildFlatSegment` method, resulting in straight-cut boards.

### Rabbet Geometry Fix
To prevent the rabbet notch from being visible on the outer sides of the frame (a side effect of non-mitered joinery), the "Stamped Pattern" mode now uses a 3D boolean subtraction for the rabbet instead of including it in the extruded 2D cross-section. This ensures the rabbet only exists where the picture sits and stops cleanly before reaching the outer edges of the frame.

### Corner Joinery Options
1.  **Butt (Top/Bottom overlap)**:
    *   The Top and Bottom segments extend the full width (`outerWidth`).
    *   The Left and Right segments are shortened to fit exactly between the Top/Bottom caps (`innerHeight`).
    *   *Result*: The top/bottom patterns run seamlessly to the outer corners, while the side patterns stop cleanly against the inner edges of the top/bottom caps.
2.  **Butt (Left/Right overlap)**:
    *   The Left and Right segments extend the full height (`outerHeight`).
    *   The Top and Bottom segments are shortened to fit exactly between the Left/Right caps (`innerWidth`).
    *   *Result*: The side patterns run seamlessly to the outer corners, while the top/bottom patterns stop cleanly against the inner edges of the side caps.
3.  **Cyclic (Pinwheel)**:
    *   All four segments are shortened by exactly one `frameWidth` (e.g., `outerWidth - frameWidth`).
    *   They are arranged in an "over-under" pinwheel fashion. (e.g., the Top segment runs to the right edge but stops short of the left edge; the Left segment runs to the top edge but stops short of the bottom, etc.).
    *   *Result*: A symmetrical, continuous overlapping aesthetic.

## Stamping Mechanism
The 3D stamps are applied to the raw, un-rotated flat segments *before* they are positioned around the picture opening.

1.  **Tool Generation**: `createStampTool` generates a Manifold object representing the negative space of a single stamp (e.g., a downward-facing cylinder for a dot).
2.  **Arraying**: `applyStampPattern` calculates how many stamps fit along the segment length based on the `stampSpacing` and centers the pattern block.
3.  **Alternation**: If `alternating` layout is selected, every odd iteration of the tool is rotated 180° around its local normal (Y-axis).
4.  **Boolean Subtraction**: All instances of the tool are unioned together, and then a single `difference` operation removes them from the flat frame segment.
5.  **Assembly**: The stamped segments are then rotated and translated into their final Top, Bottom, Left, and Right positions around the frame opening.
