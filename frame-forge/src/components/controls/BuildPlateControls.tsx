import { useFrameStore } from '../../store/useFrameStore';
import { buildPlatePresets, getBuildPlatePreset } from '../../data/buildPlates';

export function BuildPlateControls() {
  const presetId = useFrameStore((s) => s.buildPlatePresetId);
  const setPresetId = useFrameStore((s) => s.setBuildPlatePresetId);
  const customWidth = useFrameStore((s) => s.buildPlateCustomWidth);
  const setCustomWidth = useFrameStore((s) => s.setBuildPlateCustomWidth);
  const customDepth = useFrameStore((s) => s.buildPlateCustomDepth);
  const setCustomDepth = useFrameStore((s) => s.setBuildPlateCustomDepth);
  const enabled = useFrameStore((s) => s.buildPlateEnabled);

  const explosionGap = useFrameStore((s) => s.explosionGap);
  const setExplosionGap = useFrameStore((s) => s.setExplosionGap);

  const preset = getBuildPlatePreset(presetId);
  const effectiveWidth = presetId === 'custom' ? customWidth : (preset?.width ?? 220);
  const effectiveDepth = presetId === 'custom' ? customDepth : (preset?.depth ?? 220);

  if (!enabled) return null;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="text-xs text-[var(--fg-muted)] block mb-1">Printer</label>
          <select
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded p-1.5 text-sm text-[var(--fg-main)] focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
          >
            {buildPlatePresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {presetId === 'custom' && (
          <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div>
              <label className="text-xs text-[var(--fg-muted)] block mb-1">Width (mm)</label>
              <input
                type="number"
                value={customWidth}
                onChange={(e) => setCustomWidth(parseFloat(e.target.value))}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded p-1.5 text-sm text-[var(--fg-main)] focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--fg-muted)] block mb-1">Depth (mm)</label>
              <input
                type="number"
                value={customDepth}
                onChange={(e) => setCustomDepth(parseFloat(e.target.value))}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded p-1.5 text-sm text-[var(--fg-main)] focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
              />
            </div>
          </div>
        )}

        {/* Effective size display */}
        <div className="text-xs text-[var(--fg-muted)]">
          Plate: {effectiveWidth} × {effectiveDepth} mm
        </div>

        {/* Explosion Gap */}
        <div className="pt-2 border-t border-[var(--border-main)]">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[var(--fg-muted)]">Preview Explosion</span>
            <span className="text-[var(--fg-main)]">{explosionGap} mm</span>
          </div>
          <input
            type="range"
            value={explosionGap}
            onChange={(e) => setExplosionGap(parseFloat(e.target.value))}
            min={0}
            max={50}
            step={1}
            className="w-full h-2 bg-[var(--bg-input)] rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
