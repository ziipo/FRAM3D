import { useFrameStore } from '../../store/useFrameStore';
import type { ConnectorType } from '../../types/frame';

export function JoineryControls() {
  const connector = useFrameStore((s) => s.connector);
  const setConnector = useFrameStore((s) => s.setConnector);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="text-xs text-[var(--fg-muted)] block mb-1">Method</label>
          <select
            value={connector.type}
            onChange={(e) => setConnector({ type: e.target.value as ConnectorType })}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded p-1.5 text-sm text-[var(--fg-main)] focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value="none">None (Single piece sides)</option>
            <option value="floating-tenon">Floating Tenon (Biscuit)</option>
            <option value="tongue-groove">Tongue & Groove</option>
          </select>
        </div>

        {connector.type === 'floating-tenon' && (
          <div className="space-y-3 pl-3 border-l-2 border-[var(--border-main)]">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[var(--fg-muted)]">Tenon Length</span>
                <span className="text-[var(--fg-main)]">{connector.floatingTenon.tenonLength} mm</span>
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
                className="w-full h-2 bg-[var(--bg-input)] rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[var(--fg-muted)]">Wall Thickness</span>
                <span className="text-[var(--fg-main)]">{connector.floatingTenon.wallThickness} mm</span>
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
                className="w-full h-2 bg-[var(--bg-input)] rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[var(--fg-muted)]">Tolerance (XY)</span>
                <span className="text-[var(--fg-main)]">{connector.floatingTenon.toleranceXY} mm</span>
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
                className="w-full h-2 bg-[var(--bg-input)] rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>
        )}

        {connector.type === 'tongue-groove' && (
          <div className="space-y-3 pl-3 border-l-2 border-[var(--border-main)]">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[var(--fg-muted)]">Tongue Length</span>
                <span className="text-[var(--fg-main)]">{connector.tongueGroove.tongueLength} mm</span>
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
                className="w-full h-2 bg-[var(--bg-input)] rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[var(--fg-muted)]">Wall Thickness</span>
                <span className="text-[var(--fg-main)]">{connector.tongueGroove.wallThickness} mm</span>
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
                className="w-full h-2 bg-[var(--bg-input)] rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
