import { useFrameStore } from '../../store/useFrameStore';
import { pictureSizePresets, getPictureSize } from '../../data/presets';
import { convertToUnit, convertFromUnit } from '../../utils/units';

export function DimensionControls() {
  const pictureSizeId = useFrameStore((s) => s.pictureSizeId);
  const customWidth = useFrameStore((s) => s.customWidth);
  const customHeight = useFrameStore((s) => s.customHeight);
  const displayUnit = useFrameStore((s) => s.displayUnit);
  const setParam = useFrameStore((s) => s.setParam);

  const isCustom = pictureSizeId === 'custom';
  const currentPreset = getPictureSize(pictureSizeId);

  // Display values in current unit
  const displayWidth = isCustom
    ? convertToUnit(customWidth, displayUnit)
    : currentPreset
      ? convertToUnit(currentPreset.dimensions.width, displayUnit)
      : 0;

  const displayHeight = isCustom
    ? convertToUnit(customHeight, displayUnit)
    : currentPreset
      ? convertToUnit(currentPreset.dimensions.height, displayUnit)
      : 0;

  return (
    <div className="space-y-4">
      {/* Preset selector */}
      <div>
        <label className="block text-xs text-neutral-400 mb-1">Preset</label>
        <select
          value={pictureSizeId}
          onChange={(e) => setParam('pictureSizeId', e.target.value)}
          className="w-full bg-neutral-700 border border-neutral-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          {pictureSizePresets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      {/* Custom dimensions */}
      {isCustom && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">
              Width ({displayUnit})
            </label>
            <input
              type="number"
              value={displayWidth.toFixed(displayUnit === 'in' ? 2 : 1)}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                setParam('customWidth', convertFromUnit(value, displayUnit));
              }}
              min={displayUnit === 'in' ? 1 : 25}
              max={displayUnit === 'in' ? 40 : 1000}
              step={displayUnit === 'in' ? 0.1 : 1}
              className="w-full bg-neutral-700 border border-neutral-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">
              Height ({displayUnit})
            </label>
            <input
              type="number"
              value={displayHeight.toFixed(displayUnit === 'in' ? 2 : 1)}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                setParam('customHeight', convertFromUnit(value, displayUnit));
              }}
              min={displayUnit === 'in' ? 1 : 25}
              max={displayUnit === 'in' ? 40 : 1000}
              step={displayUnit === 'in' ? 0.1 : 1}
              className="w-full bg-neutral-700 border border-neutral-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Unit toggle */}
      <div>
        <label className="block text-xs text-neutral-400 mb-1">Units</label>
        <div className="flex rounded overflow-hidden border border-neutral-600">
          <button
            onClick={() => setParam('displayUnit', 'mm')}
            className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
              displayUnit === 'mm'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
            }`}
          >
            mm
          </button>
          <button
            onClick={() => setParam('displayUnit', 'in')}
            className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
              displayUnit === 'in'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
            }`}
          >
            inches
          </button>
        </div>
      </div>

      {/* Display current dimensions (read-only for presets) */}
      {!isCustom && currentPreset && (
        <div className="text-xs text-neutral-400">
          {displayWidth.toFixed(displayUnit === 'in' ? 2 : 1)} ×{' '}
          {displayHeight.toFixed(displayUnit === 'in' ? 2 : 1)} {displayUnit}
        </div>
      )}
    </div>
  );
}
