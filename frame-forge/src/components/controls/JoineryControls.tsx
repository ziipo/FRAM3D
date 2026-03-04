import { useFrameStore } from '../../store/useFrameStore';
import type { ConnectorType } from '../../types/frame';

export function JoineryControls() {
  const connector = useFrameStore((s) => s.connector);
  const setConnector = useFrameStore((s) => s.setConnector);
  const explosionGap = useFrameStore((s) => s.explosionGap);
  const setExplosionGap = useFrameStore((s) => s.setExplosionGap);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="text-xs text-neutral-400 block mb-1">Method</label>
          <select
            value={connector.type}
            onChange={(e) => setConnector({ type: e.target.value as ConnectorType })}
            className="w-full bg-neutral-700 border border-neutral-600 rounded p-1.5 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value="none">None (Single piece sides)</option>
            <option value="floating-tenon">Floating Tenon (Biscuit)</option>
            <option value="tongue-groove">Tongue & Groove</option>
          </select>
        </div>

        {connector.type !== 'none' && (
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
        )}

        {connector.type === 'floating-tenon' && (
          <div className="space-y-3 pl-3 border-l-2 border-neutral-700">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-400">Tenon Length</span>
                <span className="text-neutral-300">{connector.floatingTenon.tenonLength} mm</span>
              </div>
              <input
                type="range"
                value={connector.floatingTenon.tenonLength}
                onChange={(e) => setConnector({
                  floatingTenon: { ...connector.floatingTenon, tenonLength: parseFloat(e.target.value) }
                })}
                min={5}
                max={40}
                step={1}
                className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-400">Wall Thickness</span>
                <span className="text-neutral-300">{connector.floatingTenon.wallThickness} mm</span>
              </div>
              <input
                type="range"
                value={connector.floatingTenon.wallThickness}
                onChange={(e) => setConnector({
                  floatingTenon: { ...connector.floatingTenon, wallThickness: parseFloat(e.target.value) }
                })}
                min={1}
                max={5}
                step={0.5}
                className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-400">Tolerance (XY)</span>
                <span className="text-neutral-300">{connector.floatingTenon.toleranceXY} mm</span>
              </div>
              <input
                type="range"
                value={connector.floatingTenon.toleranceXY}
                onChange={(e) => setConnector({
                  floatingTenon: { ...connector.floatingTenon, toleranceXY: parseFloat(e.target.value) }
                })}
                min={0}
                max={1}
                step={0.05}
                className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>
        )}

        {connector.type === 'tongue-groove' && (
          <div className="space-y-3 pl-3 border-l-2 border-neutral-700">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-400">Tongue Length</span>
                <span className="text-neutral-300">{connector.tongueGroove.tongueLength} mm</span>
              </div>
              <input
                type="range"
                value={connector.tongueGroove.tongueLength}
                onChange={(e) => setConnector({
                  tongueGroove: { ...connector.tongueGroove, tongueLength: parseFloat(e.target.value) }
                })}
                min={2}
                max={20}
                step={1}
                className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-400">Wall Thickness</span>
                <span className="text-neutral-300">{connector.tongueGroove.wallThickness} mm</span>
              </div>
              <input
                type="range"
                value={connector.tongueGroove.wallThickness}
                onChange={(e) => setConnector({
                  tongueGroove: { ...connector.tongueGroove, wallThickness: parseFloat(e.target.value) }
                })}
                min={1}
                max={5}
                step={0.5}
                className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
