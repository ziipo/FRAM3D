import type { FrameProfile, ProfilePoint } from '../types/frame';

/**
 * Profile coordinate system:
 * - X: 0 = inner edge (picture side), 1 = outer edge
 * - Y: 0 = bottom (back of frame), 1 = top (front face)
 *
 * Points are ordered from inner-top corner, along the top face,
 * down the outer edge, along the bottom, and back to inner edge.
 * The profile forms a closed shape.
 */

// Helper to create arc points
function createArc(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  startAngle: number,
  endAngle: number,
  segments: number
): ProfilePoint[] {
  const points: ProfilePoint[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startAngle + t * (endAngle - startAngle);
    points.push({
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    });
  }
  return points;
}

export const frameProfiles: FrameProfile[] = [
  // Flat - simple rectangular cross-section
  {
    id: 'flat',
    name: 'Flat',
    description: 'Simple rectangular profile',
    points: [
      { x: 0, y: 1 },    // Inner top
      { x: 1, y: 1 },    // Outer top
      { x: 1, y: 0 },    // Outer bottom
      { x: 0, y: 0 },    // Inner bottom
    ],
  },

  // Beveled - angled face from inner-high to outer-low
  {
    id: 'beveled',
    name: 'Beveled',
    description: 'Angled face sloping outward',
    points: [
      { x: 0, y: 1 },      // Inner top (highest point)
      { x: 0.15, y: 1 },   // Small flat at inner edge
      { x: 0.85, y: 0.5 }, // Bevel ends
      { x: 1, y: 0.5 },    // Outer top edge
      { x: 1, y: 0 },      // Outer bottom
      { x: 0, y: 0 },      // Inner bottom
    ],
  },

  // Rounded - convex arc across the face
  {
    id: 'rounded',
    name: 'Rounded',
    description: 'Convex curved face',
    points: [
      { x: 0, y: 0.6 },  // Inner top
      ...createArc(0.5, 0.5, 0.5, 0.5, Math.PI, 0, 12).map(p => ({
        x: p.x,
        y: p.y + 0.1,
      })),
      { x: 1, y: 0.6 },  // Outer top
      { x: 1, y: 0 },    // Outer bottom
      { x: 0, y: 0 },    // Inner bottom
    ],
  },

  // Scoop - concave arc (scooped inward)
  {
    id: 'scoop',
    name: 'Scoop',
    description: 'Concave curved face',
    points: [
      { x: 0, y: 1 },    // Inner top
      ...createArc(0.5, 1, 0.5, 0.4, Math.PI, 0, 12).map(p => ({
        x: p.x,
        y: p.y,
      })),
      { x: 1, y: 1 },    // Outer top
      { x: 1, y: 0 },    // Outer bottom
      { x: 0, y: 0 },    // Inner bottom
    ],
  },

  // Ogee - S-curve profile (convex near inner, concave near outer)
  {
    id: 'ogee',
    name: 'Ogee',
    description: 'Classic S-curve molding',
    points: [
      { x: 0, y: 0.9 },    // Inner top
      { x: 0.1, y: 1 },    // Rise to peak
      ...createArc(0.25, 0.85, 0.15, 0.15, Math.PI / 2, 0, 6),
      ...createArc(0.55, 0.55, 0.15, 0.15, Math.PI, Math.PI * 1.5, 6),
      { x: 0.7, y: 0.4 },
      { x: 0.85, y: 0.35 },
      { x: 1, y: 0.35 },   // Outer top
      { x: 1, y: 0 },      // Outer bottom
      { x: 0, y: 0 },      // Inner bottom
    ],
  },

  // Step - flat with a raised inner lip
  {
    id: 'step',
    name: 'Step',
    description: 'Raised lip at inner edge',
    points: [
      { x: 0, y: 1 },      // Inner top
      { x: 0.25, y: 1 },   // Lip top
      { x: 0.25, y: 0.6 }, // Step down
      { x: 1, y: 0.6 },    // Outer top
      { x: 1, y: 0 },      // Outer bottom
      { x: 0, y: 0 },      // Inner bottom
    ],
  },

  // Double Bevel - two angled planes meeting at a ridge
  {
    id: 'double-bevel',
    name: 'Double Bevel',
    description: 'V-ridge profile with two angled faces',
    points: [
      { x: 0, y: 0.5 },    // Inner top
      { x: 0.5, y: 1 },    // Center peak
      { x: 1, y: 0.5 },    // Outer top
      { x: 1, y: 0 },      // Outer bottom
      { x: 0, y: 0 },      // Inner bottom
    ],
  },
];

export const defaultProfileId = 'flat';

export function getProfile(id: string): FrameProfile | undefined {
  return frameProfiles.find((p) => p.id === id);
}
