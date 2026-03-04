import { useCallback, useRef, useState } from 'react';
import { useFrameStore } from '../../store/useFrameStore';
import type { ProfilePoint } from '../../types/frame';

const SVG_W = 260;
const SVG_H = 140;
const PAD = 24;
const PLOT_W = SVG_W - PAD * 2;
const PLOT_H = SVG_H - PAD * 2;
const POINT_R = 6;
const HANDLE_R = 4;
const DRAG_THRESHOLD = 4; // px — distinguishes click from click+drag

type DragTarget =
  | { kind: 'anchor'; index: number }
  | { kind: 'handle'; index: number }
  | { kind: 'new-point'; index: number; originSx: number; originSy: number };

function toSvg(p: { x: number; y: number }): { x: number; y: number } {
  return {
    x: PAD + p.x * PLOT_W,
    y: PAD + (1 - p.y) * PLOT_H,
  };
}

function fromSvg(sx: number, sy: number): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(1, (sx - PAD) / PLOT_W)),
    y: Math.max(0, Math.min(1, 1 - (sy - PAD) / PLOT_H)),
  };
}

/** Convert a handle offset from normalized space to SVG pixel delta */
function handleDeltaToSvg(hx: number, hy: number): { dx: number; dy: number } {
  return { dx: hx * PLOT_W, dy: -hy * PLOT_H };
}

/** Convert an SVG pixel delta back to normalized handle offset */
function svgDeltaToHandle(dx: number, dy: number): { hx: number; hy: number } {
  return { hx: dx / PLOT_W, hy: -dy / PLOT_H };
}

function hasHandle(p: ProfilePoint): boolean {
  return (p.hx != null && p.hx !== 0) || (p.hy != null && p.hy !== 0);
}

/** Build SVG path using cubic Bezier (C) for segments with handles, lines (L) otherwise */
function buildCurvePath(points: ProfilePoint[]): string {
  if (points.length === 0) return '';
  const s0 = toSvg(points[0]);
  let d = `M ${s0.x} ${s0.y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];

    if (!hasHandle(p0) && !hasHandle(p1)) {
      const s1 = toSvg(p1);
      d += ` L ${s1.x} ${s1.y}`;
    } else {
      // out-handle of p0
      const cp1 = toSvg({ x: p0.x + (p0.hx ?? 0), y: p0.y + (p0.hy ?? 0) });
      // in-handle of p1 (mirrored)
      const cp2 = toSvg({ x: p1.x - (p1.hx ?? 0), y: p1.y - (p1.hy ?? 0) });
      const s1 = toSvg(p1);
      d += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${s1.x} ${s1.y}`;
    }
  }
  return d;
}

export function ProfileEditor() {
  const customProfilePoints = useFrameStore((s) => s.customProfilePoints);
  const setParam = useFrameStore((s) => s.setParam);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);

  const sorted = [...customProfilePoints].sort((a, b) => a.x - b.x);

  const updatePoints = useCallback(
    (pts: ProfilePoint[]) => {
      setParam('customProfilePoints', pts);
    },
    [setParam]
  );

  const getSvgCoords = useCallback(
    (e: React.MouseEvent | React.PointerEvent): { x: number; y: number } => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  // --- Anchor point drag ---
  const handleAnchorPointerDown = useCallback(
    (e: React.PointerEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      setDragTarget({ kind: 'anchor', index });
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    []
  );

  // --- Handle dot drag ---
  const handleHandlePointerDown = useCallback(
    (e: React.PointerEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      setDragTarget({ kind: 'handle', index });
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    []
  );

  // --- SVG background pointerdown: begin new-point (click or click+drag) ---
  const handleSvgPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      // Only trigger for clicks on the SVG background, not on circles/lines
      const tag = (e.target as Element).tagName;
      if (tag === 'circle' || tag === 'line') return;

      const { x: sx, y: sy } = getSvgCoords(e);
      const pt = fromSvg(sx, sy);
      pt.x = Math.max(0, Math.min(1, Math.round(pt.x * 100) / 100));
      pt.y = Math.max(0, Math.min(1, Math.round(pt.y * 100) / 100));

      const newPoints = [...sorted, { x: pt.x, y: pt.y } as ProfilePoint];
      const newSorted = newPoints.sort((a, b) => a.x - b.x);
      const newIndex = newSorted.findIndex(p => p.x === pt.x && p.y === pt.y);

      updatePoints(newSorted);
      setDragTarget({ kind: 'new-point', index: newIndex, originSx: sx, originSy: sy });
      // Capture on the SVG element itself
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    },
    [sorted, getSvgCoords, updatePoints]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragTarget === null) return;
      const { x: sx, y: sy } = getSvgCoords(e);

      if (dragTarget.kind === 'anchor') {
        const pt = fromSvg(sx, sy);
        const newPoints = [...sorted];
        const isFirst = dragTarget.index === 0;
        const isLast = dragTarget.index === sorted.length - 1;
        if (isFirst) pt.x = 0;
        else if (isLast) pt.x = 1;

        // Preserve handle offsets when moving anchor
        const old = sorted[dragTarget.index];
        newPoints[dragTarget.index] = {
          x: pt.x,
          y: pt.y,
          ...(old.hx != null ? { hx: old.hx } : {}),
          ...(old.hy != null ? { hy: old.hy } : {}),
        };
        updatePoints(newPoints);
      } else if (dragTarget.kind === 'handle') {
        const anchor = sorted[dragTarget.index];
        const anchorSvg = toSvg(anchor);
        const dx = sx - anchorSvg.x;
        const dy = sy - anchorSvg.y;
        const h = svgDeltaToHandle(dx, dy);

        const newPoints = [...sorted];
        newPoints[dragTarget.index] = { ...anchor, hx: h.hx, hy: h.hy };
        updatePoints(newPoints);
      } else if (dragTarget.kind === 'new-point') {
        // Check if we've exceeded drag threshold
        const dx = sx - dragTarget.originSx;
        const dy = sy - dragTarget.originSy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist >= DRAG_THRESHOLD) {
          // Convert the drag into a handle
          const anchor = sorted[dragTarget.index];
          if (!anchor) return;
          const anchorSvg = toSvg(anchor);
          const hdx = sx - anchorSvg.x;
          const hdy = sy - anchorSvg.y;
          const h = svgDeltaToHandle(hdx, hdy);

          const newPoints = [...sorted];
          newPoints[dragTarget.index] = { ...anchor, hx: h.hx, hy: h.hy };
          updatePoints(newPoints);
        }
      }
    },
    [dragTarget, sorted, getSvgCoords, updatePoints]
  );

  const handlePointerUp = useCallback(() => {
    setDragTarget(null);
  }, []);

  // --- Double-click on handle dot: remove handle ---
  const handleHandleDoubleClick = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      const newPoints = [...sorted];
      const p = newPoints[index];
      newPoints[index] = { x: p.x, y: p.y };
      updatePoints(newPoints);
    },
    [sorted, updatePoints]
  );

  // --- Right-click: delete point ---
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      if (sorted.length <= 2) return;
      if (index === 0 || index === sorted.length - 1) return;
      const newPoints = sorted.filter((_, i) => i !== index);
      updatePoints(newPoints);
    },
    [sorted, updatePoints]
  );

  // Build filled shape path using curves
  const shapePath = (() => {
    if (sorted.length === 0) return '';
    const curvePart = buildCurvePath(sorted);
    const bottomRight = toSvg({ x: 1, y: 0 });
    const bottomLeft = toSvg({ x: 0, y: 0 });
    return `${curvePart} L ${bottomRight.x} ${bottomRight.y} L ${bottomLeft.x} ${bottomLeft.y} Z`;
  })();

  // Profile stroke path (no fill closing)
  const strokePath = sorted.length > 1 ? buildCurvePath(sorted) : '';

  // Grid lines at 0.25 intervals
  const gridLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 1; i < 4; i++) {
    const frac = i * 0.25;
    const vx = PAD + frac * PLOT_W;
    gridLines.push({ x1: vx, y1: PAD, x2: vx, y2: PAD + PLOT_H });
    const hy = PAD + frac * PLOT_H;
    gridLines.push({ x1: PAD, y1: hy, x2: PAD + PLOT_W, y2: hy });
  }

  return (
    <div className="mt-2">
      <svg
        ref={svgRef}
        width={SVG_W}
        height={SVG_H}
        className="bg-neutral-800 rounded border border-neutral-600 cursor-crosshair select-none"
        onPointerDown={handleSvgPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Grid lines */}
        {gridLines.map((l, i) => (
          <line
            key={i}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="#404040"
            strokeWidth={0.5}
          />
        ))}

        {/* Plot border */}
        <rect
          x={PAD}
          y={PAD}
          width={PLOT_W}
          height={PLOT_H}
          fill="none"
          stroke="#555"
          strokeWidth={1}
        />

        {/* Axis labels */}
        <text x={PAD} y={SVG_H - 4} fill="#888" fontSize={9} textAnchor="middle">
          0
        </text>
        <text x={PAD + PLOT_W} y={SVG_H - 4} fill="#888" fontSize={9} textAnchor="middle">
          1
        </text>
        <text x={PAD + PLOT_W / 2} y={SVG_H - 4} fill="#666" fontSize={8} textAnchor="middle">
          inner → outer
        </text>
        <text x={8} y={PAD + PLOT_H} fill="#888" fontSize={9} textAnchor="middle">
          0
        </text>
        <text x={8} y={PAD} fill="#888" fontSize={9} textAnchor="middle">
          1
        </text>

        {/* Profile shape fill */}
        <path d={shapePath} fill="#3b82f6" opacity={0.25} />

        {/* Profile curve stroke */}
        {strokePath && (
          <path d={strokePath} fill="none" stroke="#3b82f6" strokeWidth={2} />
        )}

        {/* Handle lines and dots */}
        {sorted.map((p, i) => {
          if (!hasHandle(p)) return null;
          const anchor = toSvg(p);
          const { dx, dy } = handleDeltaToSvg(p.hx ?? 0, p.hy ?? 0);
          // Out-handle
          const outX = anchor.x + dx;
          const outY = anchor.y + dy;
          // In-handle (mirrored)
          const inX = anchor.x - dx;
          const inY = anchor.y - dy;
          const isActive = dragTarget?.kind === 'handle' && dragTarget.index === i;

          return (
            <g key={`handle-${i}`}>
              {/* Handle line through anchor */}
              <line
                x1={inX} y1={inY} x2={outX} y2={outY}
                stroke="#a78bfa" strokeWidth={1} opacity={0.6}
                style={{ pointerEvents: 'none' }}
              />
              {/* Out-handle dot */}
              <circle
                cx={outX} cy={outY} r={HANDLE_R}
                fill={isActive ? '#c4b5fd' : '#a78bfa'}
                stroke="#7c3aed" strokeWidth={1}
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => handleHandlePointerDown(e, i)}
                onDoubleClick={(e) => handleHandleDoubleClick(e, i)}
              />
              {/* In-handle dot */}
              <circle
                cx={inX} cy={inY} r={HANDLE_R}
                fill={isActive ? '#c4b5fd' : '#a78bfa'}
                stroke="#7c3aed" strokeWidth={1}
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => handleHandlePointerDown(e, i)}
                onDoubleClick={(e) => handleHandleDoubleClick(e, i)}
              />
            </g>
          );
        })}

        {/* Draggable anchor points */}
        {sorted.map((p, i) => {
          const s = toSvg(p);
          const isEndpoint = i === 0 || i === sorted.length - 1;
          const isActive = dragTarget?.kind === 'anchor' && dragTarget.index === i;
          return (
            <circle
              key={i}
              cx={s.x}
              cy={s.y}
              r={POINT_R}
              fill={isActive ? '#60a5fa' : '#3b82f6'}
              stroke={isEndpoint ? '#f59e0b' : '#93c5fd'}
              strokeWidth={isEndpoint ? 2 : 1.5}
              className="cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => handleAnchorPointerDown(e, i)}
              onContextMenu={(e) => handleContextMenu(e, i)}
            />
          );
        })}
      </svg>

      <p className="text-[10px] text-neutral-500 mt-1">
        Click to add · Drag to add curve · Drag point to move · Right-click to delete
      </p>
      <p className="text-[10px] text-neutral-500">
        Drag handle to adjust curve · Double-click handle to remove
      </p>
    </div>
  );
}
