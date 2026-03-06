import { useEffect } from 'react';
import { useFrameStore } from '../../store/useFrameStore';
import { convertToUnit, convertFromUnit } from '../../utils/units';

export function FrameControls() {
  const frameWidth = useFrameStore((s) => s.frameWidth);
  const frameDepth = useFrameStore((s) => s.frameDepth);
  const displayUnit = useFrameStore((s) => s.displayUnit);
  const profileId = useFrameStore((s) => s.profileId);
  const setParam = useFrameStore((s) => s.setParam);

  const displayFrameWidth = convertToUnit(frameWidth, displayUnit);
  const displayFrameDepth = convertToUnit(frameDepth, displayUnit);

  const needsMin16 = profileId === 'beveled' || profileId === 'double-bevel';
  const minWidthMm = needsMin16 ? 16 : 10;
  const minWidth = convertToUnit(minWidthMm, displayUnit);
  
  // Auto-adjust if below minimum for current profile
  useEffect(() => {
    if (frameWidth < minWidthMm) {
      setParam('frameWidth', minWidthMm);
    }
  }, [profileId, frameWidth, minWidthMm, setParam]);

  const maxWidth = displayUnit === 'in' ? 4 : 100;
  const minDepth = displayUnit === 'in' ? 0.2 : 5;
  const maxDepth = displayUnit === 'in' ? 2 : 50;
  const step = displayUnit === 'in' ? 0.1 : 1;

  return (
    <div className="space-y-4">
      {/* Frame Width */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <label className="text-neutral-400">Frame Width</label>
          <span className="text-neutral-300">
            {displayFrameWidth.toFixed(displayUnit === 'in' ? 2 : 1)} {displayUnit}
          </span>
        </div>
        <input
          type="range"
          value={displayFrameWidth}
          onChange={(e) => {
            const value = parseFloat(e.target.value);
            // Ensure we don't go below minWidth even on manual drag
            const mmValue = convertFromUnit(value, displayUnit);
            setParam('frameWidth', Math.max(mmValue, minWidthMm));
          }}
          min={minWidth}
          max={maxWidth}
          step={step}
          className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-xs text-neutral-500 mt-0.5">
          <span>{minWidth.toFixed(displayUnit === 'in' ? 1 : 0)}</span>
          <span>{maxWidth.toFixed(displayUnit === 'in' ? 0 : 0)}</span>
        </div>
      </div>

      {/* Frame Depth */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <label className="text-neutral-400">Frame Depth</label>
          <span className="text-neutral-300">
            {displayFrameDepth.toFixed(displayUnit === 'in' ? 2 : 1)} {displayUnit}
          </span>
        </div>
        <input
          type="range"
          value={displayFrameDepth}
          onChange={(e) => {
            const value = parseFloat(e.target.value);
            setParam('frameDepth', convertFromUnit(value, displayUnit));
          }}
          min={minDepth}
          max={maxDepth}
          step={step}
          className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-xs text-neutral-500 mt-0.5">
          <span>{minDepth}</span>
          <span>{maxDepth}</span>
        </div>
      </div>
    </div>
  );
}
