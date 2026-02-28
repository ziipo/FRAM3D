import { useFrameStore } from '../../store/useFrameStore';
import { convertToUnit, convertFromUnit } from '../../utils/units';

export function FrameControls() {
  const frameWidth = useFrameStore((s) => s.frameWidth);
  const frameDepth = useFrameStore((s) => s.frameDepth);
  const displayUnit = useFrameStore((s) => s.displayUnit);
  const setParam = useFrameStore((s) => s.setParam);

  const displayFrameWidth = convertToUnit(frameWidth, displayUnit);
  const displayFrameDepth = convertToUnit(frameDepth, displayUnit);

  const minWidth = displayUnit === 'in' ? 0.4 : 10;
  const maxWidth = displayUnit === 'in' ? 4 : 100;
  const minDepth = displayUnit === 'in' ? 0.2 : 5;
  const maxDepth = displayUnit === 'in' ? 2 : 50;
  const step = displayUnit === 'in' ? 0.1 : 1;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide">
        Frame Dimensions
      </h3>

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
            setParam('frameWidth', convertFromUnit(value, displayUnit));
          }}
          min={minWidth}
          max={maxWidth}
          step={step}
          className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-xs text-neutral-500 mt-0.5">
          <span>{minWidth}</span>
          <span>{maxWidth}</span>
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
