import { useFrameStore } from '../../store/useFrameStore';
import { buildPlatePresets, getBuildPlatePreset } from '../../data/buildPlates';
import type { ConnectorType } from '../../types/frame';

export function BuildPlateControls() {
  const enabled = useFrameStore((s) => s.buildPlateEnabled);
  const presetId = useFrameStore((s) => s.buildPlatePresetId);
  const customWidth = useFrameStore((s) => s.buildPlateCustomWidth);
  const customDepth = useFrameStore((s) => s.buildPlateCustomDepth);
  const connectorType = useFrameStore((s) => s.connectorType);

  // Floating tenon
  const ftLength = useFrameStore((s) => s.floatingTenonLength);
  const ftWall = useFrameStore((s) => s.floatingTenonWallThickness);
  const ftTolXY = useFrameStore((s) => s.floatingTenonToleranceXY);
  const ftTolZ = useFrameStore((s) => s.floatingTenonToleranceZ);
  const ftFill = useFrameStore((s) => s.floatingTenonFillFraction);

  // Tongue & groove
  const tgLength = useFrameStore((s) => s.tongueGrooveLength);
  const tgWall = useFrameStore((s) => s.tongueGrooveWallThickness);
  const tgTolXY = useFrameStore((s) => s.tongueGrooveToleranceXY);
  const tgTolZ = useFrameStore((s) => s.tongueGrooveToleranceZ);
  const tgFill = useFrameStore((s) => s.tongueGrooveFillFraction);

  const setEnabled = useFrameStore((s) => s.setBuildPlateEnabled);
  const setPresetId = useFrameStore((s) => s.setBuildPlatePresetId);
  const setCustomWidth = useFrameStore((s) => s.setBuildPlateCustomWidth);
  const setCustomDepth = useFrameStore((s) => s.setBuildPlateCustomDepth);
  const setConnectorType = useFrameStore((s) => s.setConnectorType);

  const setFtLength = useFrameStore((s) => s.setFloatingTenonLength);
  const setFtWall = useFrameStore((s) => s.setFloatingTenonWallThickness);
  const setFtTolXY = useFrameStore((s) => s.setFloatingTenonToleranceXY);
  const setFtTolZ = useFrameStore((s) => s.setFloatingTenonToleranceZ);
  const setFtFill = useFrameStore((s) => s.setFloatingTenonFillFraction);

  const setTgLength = useFrameStore((s) => s.setTongueGrooveLength);
  const setTgWall = useFrameStore((s) => s.setTongueGrooveWallThickness);
  const setTgTolXY = useFrameStore((s) => s.setTongueGrooveToleranceXY);
  const setTgTolZ = useFrameStore((s) => s.setTongueGrooveToleranceZ);
  const setTgFill = useFrameStore((s) => s.setTongueGrooveFillFraction);

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
            Split oversized sides to fit your printer.
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

          {/* Joinery method */}
          <div className="space-y-3 pt-2 border-t border-neutral-700">
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Joinery Method</label>
              <select
                value={connectorType}
                onChange={(e) => setConnectorType(e.target.value as ConnectorType)}
                className="w-full bg-neutral-700 text-neutral-200 text-sm rounded px-2 py-1.5 border border-neutral-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="none">None (flat butt joint)</option>
                <option value="floating-tenon">Floating Tenon (Biscuit)</option>
                <option value="tongue-groove">Tongue &amp; Groove</option>
              </select>
            </div>

            {/* Floating Tenon settings */}
            {connectorType === 'floating-tenon' && (
              <>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Tenon Length</span>
                    <span className="text-neutral-300">{ftLength} mm</span>
                  </div>
                  <input
                    type="range"
                    value={ftLength}
                    onChange={(e) => setFtLength(parseFloat(e.target.value))}
                    min={8}
                    max={25}
                    step={1}
                    className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Wall Thickness</span>
                    <span className="text-neutral-300">{ftWall} mm</span>
                  </div>
                  <input
                    type="range"
                    value={ftWall}
                    onChange={(e) => setFtWall(parseFloat(e.target.value))}
                    min={1}
                    max={4}
                    step={0.5}
                    className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Tolerance XY</span>
                    <span className="text-neutral-300">{ftTolXY} mm</span>
                  </div>
                  <input
                    type="range"
                    value={ftTolXY}
                    onChange={(e) => setFtTolXY(parseFloat(e.target.value))}
                    min={0.1}
                    max={0.5}
                    step={0.05}
                    className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Tolerance Z</span>
                    <span className="text-neutral-300">{ftTolZ} mm</span>
                  </div>
                  <input
                    type="range"
                    value={ftTolZ}
                    onChange={(e) => setFtTolZ(parseFloat(e.target.value))}
                    min={0.2}
                    max={1.0}
                    step={0.1}
                    className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Fill %</span>
                    <span className="text-neutral-300">{Math.round(ftFill * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    value={ftFill}
                    onChange={(e) => setFtFill(parseFloat(e.target.value))}
                    min={0.5}
                    max={0.95}
                    step={0.05}
                    className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </>
            )}

            {/* Tongue & Groove settings */}
            {connectorType === 'tongue-groove' && (
              <>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Tongue Length</span>
                    <span className="text-neutral-300">{tgLength} mm</span>
                  </div>
                  <input
                    type="range"
                    value={tgLength}
                    onChange={(e) => setTgLength(parseFloat(e.target.value))}
                    min={5}
                    max={20}
                    step={1}
                    className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Wall Thickness</span>
                    <span className="text-neutral-300">{tgWall} mm</span>
                  </div>
                  <input
                    type="range"
                    value={tgWall}
                    onChange={(e) => setTgWall(parseFloat(e.target.value))}
                    min={1}
                    max={4}
                    step={0.5}
                    className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Tolerance XY</span>
                    <span className="text-neutral-300">{tgTolXY} mm</span>
                  </div>
                  <input
                    type="range"
                    value={tgTolXY}
                    onChange={(e) => setTgTolXY(parseFloat(e.target.value))}
                    min={0.1}
                    max={0.5}
                    step={0.05}
                    className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Tolerance Z</span>
                    <span className="text-neutral-300">{tgTolZ} mm</span>
                  </div>
                  <input
                    type="range"
                    value={tgTolZ}
                    onChange={(e) => setTgTolZ(parseFloat(e.target.value))}
                    min={0.2}
                    max={1.0}
                    step={0.1}
                    className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Fill %</span>
                    <span className="text-neutral-300">{Math.round(tgFill * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    value={tgFill}
                    onChange={(e) => setTgFill(parseFloat(e.target.value))}
                    min={0.5}
                    max={0.95}
                    step={0.05}
                    className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
