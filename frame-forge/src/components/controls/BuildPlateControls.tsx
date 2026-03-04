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
  const setEnabled = useFrameStore((s) => s.setBuildPlateEnabled);

  const explosionGap = useFrameStore((s) => s.explosionGap);
  const setExplosionGap = useFrameStore((s) => s.setExplosionGap);

  const preset = getBuildPlatePreset(presetId);
  const effectiveWidth = presetId === 'custom' ? customWidth : (preset?.width ?? 220);
  const effectiveDepth = presetId === 'custom' ? customDepth : (preset?.depth ?? 220);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide">
          Build Plate
        </h3>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${
            enabled ? 'bg-blue-600' : 'bg-neutral-700'
          }`}
        >
          <span
            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <p className="text-xs text-neutral-500">
        Split oversized sides to fit your printer.
      </p>

      {enabled && (
        <>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Printer</label>
              <select
                value={presetId}
                onChange={(e) => setPresetId(e.target.value)}
                className="w-full bg-neutral-700 border border-neutral-600 rounded p-1.5 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
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
                  <label className="text-xs text-neutral-400 block mb-1">Width (mm)</label>
                  <input
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(parseFloat(e.target.value))}
                    className="w-full bg-neutral-700 border border-neutral-600 rounded p-1.5 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Depth (mm)</label>
                  <input
                    type="number"
                    value={customDepth}
                    onChange={(e) => setCustomDepth(parseFloat(e.target.value))}
                    className="w-full bg-neutral-700 border border-neutral-600 rounded p-1.5 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* Effective size display */}
            <div className="text-xs text-neutral-500">
              Plate: {effectiveWidth} × {effectiveDepth} mm
            </div>

            {/* Explosion Gap */}
            <div className="pt-2 border-t border-neutral-700">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-400">Preview Explosion</span>
                <span className="text-neutral-300">{explosionGap} mm</span>
              </div>
              <input
                type="range"
                value={explosionGap}
                onChange={(e) => setExplosionGap(parseFloat(e.target.value))}
                min={0}
                max={50}
                step={1}
                className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
