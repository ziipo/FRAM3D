import { useFrameStore } from '../../store/useFrameStore';
import { buildPlatePresets, getBuildPlatePreset } from '../../data/buildPlates';

export function BuildPlateControls() {
  const enabled = useFrameStore((s) => s.buildPlateEnabled);
  const presetId = useFrameStore((s) => s.buildPlatePresetId);
  const customWidth = useFrameStore((s) => s.buildPlateCustomWidth);
  const customDepth = useFrameStore((s) => s.buildPlateCustomDepth);
  const dowelDiameter = useFrameStore((s) => s.dowelDiameter);
  const dowelDepth = useFrameStore((s) => s.dowelDepth);
  const dowelCount = useFrameStore((s) => s.dowelCount);

  const setEnabled = useFrameStore((s) => s.setBuildPlateEnabled);
  const setPresetId = useFrameStore((s) => s.setBuildPlatePresetId);
  const setCustomWidth = useFrameStore((s) => s.setBuildPlateCustomWidth);
  const setCustomDepth = useFrameStore((s) => s.setBuildPlateCustomDepth);
  const setDowelDiameter = useFrameStore((s) => s.setDowelDiameter);
  const setDowelDepth = useFrameStore((s) => s.setDowelDepth);
  const setDowelCount = useFrameStore((s) => s.setDowelCount);

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
          className={`relative w-10 h-5 rounded-full transition-colors ${
            enabled ? 'bg-blue-600' : 'bg-neutral-600'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <>
          <p className="text-xs text-neutral-500">
            Split oversized sides to fit your printer. Pieces get dowel holes for alignment.
          </p>

          {/* Printer Preset */}
          <div>
            <label className="text-xs text-neutral-400 block mb-1">Printer</label>
            <select
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
              className="w-full bg-neutral-700 text-neutral-200 text-sm rounded px-2 py-1.5 border border-neutral-600 focus:border-blue-500 focus:outline-none"
            >
              {buildPlatePresets.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Custom dimensions */}
          {presetId === 'custom' && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-neutral-400 block mb-1">Width (mm)</label>
                <input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(Math.max(50, parseFloat(e.target.value) || 0))}
                  min={50}
                  max={1000}
                  className="w-full bg-neutral-700 text-neutral-200 text-sm rounded px-2 py-1.5 border border-neutral-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-neutral-400 block mb-1">Depth (mm)</label>
                <input
                  type="number"
                  value={customDepth}
                  onChange={(e) => setCustomDepth(Math.max(50, parseFloat(e.target.value) || 0))}
                  min={50}
                  max={1000}
                  className="w-full bg-neutral-700 text-neutral-200 text-sm rounded px-2 py-1.5 border border-neutral-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Effective size display */}
          <div className="text-xs text-neutral-500">
            Plate: {effectiveWidth} × {effectiveDepth} mm
          </div>

          {/* Dowel settings */}
          <div className="space-y-3 pt-2 border-t border-neutral-700">
            <label className="text-xs text-neutral-400 block">Dowel Connectors</label>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-400">Diameter</span>
                <span className="text-neutral-300">{dowelDiameter} mm</span>
              </div>
              <input
                type="range"
                value={dowelDiameter}
                onChange={(e) => setDowelDiameter(parseFloat(e.target.value))}
                min={3}
                max={10}
                step={0.5}
                className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-400">Depth per side</span>
                <span className="text-neutral-300">{dowelDepth} mm</span>
              </div>
              <input
                type="range"
                value={dowelDepth}
                onChange={(e) => setDowelDepth(parseFloat(e.target.value))}
                min={5}
                max={20}
                step={1}
                className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-400">Count per joint</span>
                <span className="text-neutral-300">{dowelCount}</span>
              </div>
              <input
                type="range"
                value={dowelCount}
                onChange={(e) => setDowelCount(parseInt(e.target.value))}
                min={1}
                max={4}
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
