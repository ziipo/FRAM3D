import { useFrameStore } from '../../store/useFrameStore';
import { ProfileSelector } from './ProfileSelector';

export function DesignControls() {
  const frameStyle = useFrameStore((s) => s.frameStyle);
  const setParam = useFrameStore((s) => s.setParam);

  const stampType = useFrameStore((s) => s.stampType);
  const stampPattern = useFrameStore((s) => s.stampPattern);
  const stampCornerStyle = useFrameStore((s) => s.stampCornerStyle);
  const stampSpacing = useFrameStore((s) => s.stampSpacing);
  const stampDepth = useFrameStore((s) => s.stampDepth);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide">
        Frame Design
      </h3>

      {/* Style Toggle */}
      <div className="flex bg-neutral-700/50 p-1 rounded-lg">
        <button
          onClick={() => setParam('frameStyle', 'profile')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
            frameStyle === 'profile'
              ? 'bg-blue-500 text-white shadow'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Extruded Profile
        </button>
        <button
          onClick={() => setParam('frameStyle', 'stamp')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
            frameStyle === 'stamp'
              ? 'bg-blue-500 text-white shadow'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Stamped Pattern
        </button>
      </div>

      {frameStyle === 'profile' ? (
        <ProfileSelector />
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs text-neutral-400">Stamp Shape</label>
            <select
              value={stampType}
              onChange={(e) => setParam('stampType', e.target.value)}
              className="w-full bg-neutral-700 border border-neutral-600 rounded p-1.5 text-sm text-white"
            >
              <option value="dots">Dots</option>
              <option value="chevrons">Chevrons</option>
              <option value="stripes">Stripes</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs text-neutral-400">Pattern Layout</label>
            <select
              value={stampPattern}
              onChange={(e) => setParam('stampPattern', e.target.value as 'repeating' | 'alternating')}
              className="w-full bg-neutral-700 border border-neutral-600 rounded p-1.5 text-sm text-white"
            >
              <option value="repeating">Repeating</option>
              <option value="alternating">Alternating</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs text-neutral-400">Corner Joints</label>
            <select
              value={stampCornerStyle}
              onChange={(e) => setParam('stampCornerStyle', e.target.value as 'butt-h' | 'butt-v' | 'cyclic')}
              className="w-full bg-neutral-700 border border-neutral-600 rounded p-1.5 text-sm text-white"
            >
              <option value="butt-h">Butt (Top/Bottom overlap)</option>
              <option value="butt-v">Butt (Left/Right overlap)</option>
              <option value="cyclic">Cyclic (Pinwheel)</option>
            </select>
          </div>

          {/* Stamp Spacing */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <label className="text-neutral-400">Spacing</label>
              <span className="text-neutral-300">{stampSpacing} mm</span>
            </div>
            <input
              type="range"
              value={stampSpacing}
              onChange={(e) => setParam('stampSpacing', parseFloat(e.target.value))}
              min={2}
              max={50}
              step={1}
              className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Stamp Depth */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <label className="text-neutral-400">Stamp Depth</label>
              <span className="text-neutral-300">{stampDepth} mm</span>
            </div>
            <input
              type="range"
              value={stampDepth}
              onChange={(e) => setParam('stampDepth', parseFloat(e.target.value))}
              min={0.5}
              max={10}
              step={0.5}
              className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
