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
        <label className="block text-xs text-[var(--fg-muted)] mb-1">Preset</label>
        <select
          value={pictureSizeId}
          onChange={(e) => setParam('pictureSizeId', e.target.value)}
          className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-none px-3 py-2 text-[var(--fg-main)] text-sm focus:outline-none focus:border-primary transition-colors"
          aria-label="Picture Size Preset"
        >          {pictureSizePresets.map((preset) => (
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
            <label className="block text-xs text-[var(--fg-muted)] mb-1">
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
              className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-none px-3 py-2 text-[var(--fg-main)] text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--fg-muted)] mb-1">
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
              className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-none px-3 py-2 text-[var(--fg-main)] text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
      )}

      {/* Unit toggle */}
      <div>
        <label className="block text-xs text-[var(--fg-muted)] mb-1">Units</label>
        <div className="flex rounded-none overflow-hidden border border-[var(--border-input)]">
          <button
            onClick={() => setParam('displayUnit', 'mm')}
            className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
              displayUnit === 'mm'
                ? 'bg-primary text-fg-on-primary'
                : 'bg-[var(--bg-input)] text-[var(--fg-muted)] hover:text-[var(--fg-main)]'
            }`}
          >
            mm
          </button>
          <button
            onClick={() => setParam('displayUnit', 'in')}
            className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
              displayUnit === 'in'
                ? 'bg-primary text-fg-on-primary'
                : 'bg-[var(--bg-input)] text-[var(--fg-muted)] hover:text-[var(--fg-main)]'
            }`}
          >
            inches
          </button>
        </div>
      </div>
      {/* Display current dimensions (read-only for presets) */}
      {!isCustom && currentPreset && (
        <div className="text-xs text-[var(--fg-muted)] font-mono">
          {displayWidth.toFixed(displayUnit === 'in' ? 2 : 1)} ×{' '}
          {displayHeight.toFixed(displayUnit === 'in' ? 2 : 1)} {displayUnit}
        </div>
      )}
    </div>
  );
}
