import { useFrameStore } from '../../store/useFrameStore';
import { convertToUnit, convertFromUnit } from '../../utils/units';

export function RabbetControls() {
  const rabbetWidth = useFrameStore((s) => s.rabbetWidth);
  const rabbetDepth = useFrameStore((s) => s.rabbetDepth);
  const tolerance = useFrameStore((s) => s.tolerance);
  const displayUnit = useFrameStore((s) => s.displayUnit);
  const setParam = useFrameStore((s) => s.setParam);

  const displayRabbetWidth = convertToUnit(rabbetWidth, displayUnit);
  const displayRabbetDepth = convertToUnit(rabbetDepth, displayUnit);
  const displayTolerance = convertToUnit(tolerance, displayUnit);

  const minRabbet = displayUnit === 'in' ? 0.1 : 3;
  const maxRabbetWidth = displayUnit === 'in' ? 0.6 : 15;
  const maxRabbetDepth = displayUnit === 'in' ? 0.4 : 10;
  const minTolerance = 0;
  const maxTolerance = displayUnit === 'in' ? 0.12 : 3;
  const step = displayUnit === 'in' ? 0.02 : 0.5;

  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500">
        The rabbet is the ledge that holds your picture, glass, and backing.
      </p>

      {/* Rabbet Width */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <label className="text-neutral-400">Rabbet Width</label>
          <span className="text-neutral-300">
            {displayRabbetWidth.toFixed(displayUnit === 'in' ? 2 : 1)} {displayUnit}
          </span>
        </div>
        <input
          type="range"
          value={displayRabbetWidth}
          onChange={(e) => {
            const value = parseFloat(e.target.value);
            setParam('rabbetWidth', convertFromUnit(value, displayUnit));
          }}
          min={minRabbet}
          max={maxRabbetWidth}
          step={step}
          className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* Rabbet Depth */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <label className="text-neutral-400">Rabbet Depth</label>
          <span className="text-neutral-300">
            {displayRabbetDepth.toFixed(displayUnit === 'in' ? 2 : 1)} {displayUnit}
          </span>
        </div>
        <input
          type="range"
          value={displayRabbetDepth}
          onChange={(e) => {
            const value = parseFloat(e.target.value);
            setParam('rabbetDepth', convertFromUnit(value, displayUnit));
          }}
          min={minRabbet}
          max={maxRabbetDepth}
          step={step}
          className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* Tolerance */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <label className="text-neutral-400">Tolerance (clearance)</label>
          <span className="text-neutral-300">
            {displayTolerance.toFixed(displayUnit === 'in' ? 2 : 1)} {displayUnit}
          </span>
        </div>
        <input
          type="range"
          value={displayTolerance}
          onChange={(e) => {
            const value = parseFloat(e.target.value);
            setParam('tolerance', convertFromUnit(value, displayUnit));
          }}
          min={minTolerance}
          max={maxTolerance}
          step={step}
          className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <p className="text-xs text-neutral-500 mt-1">
          Extra space around the picture for easy insertion.
        </p>
      </div>
    </div>
  );
}
