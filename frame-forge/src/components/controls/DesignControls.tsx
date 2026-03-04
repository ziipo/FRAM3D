import { useFrameStore } from '../../store/useFrameStore';
import { ProfileSelector } from './ProfileSelector';
import { contours } from 'd3-contour';

export function DesignControls() {
  const frameStyle = useFrameStore((s) => s.frameStyle);
  const setParam = useFrameStore((s) => s.setParam);

  const stampType = useFrameStore((s) => s.stampType);
  const stampPattern = useFrameStore((s) => s.stampPattern);
  const stampCornerStyle = useFrameStore((s) => s.stampCornerStyle);
  const stampSpacing = useFrameStore((s) => s.stampSpacing);
  const stampDepth = useFrameStore((s) => s.stampDepth);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Draw to a larger canvas for better detail
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Fill with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, size, size);

        // Draw image stretched to fit
        ctx.drawImage(img, 0, 0, size, size);

        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;

        // Convert to luminance (grayscale)
        const values = new Array(size * size);
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          // Invert so dark pixels become high values, as d3-contour traces values > threshold
          values[j] = 255 - lum;
        }

        // Trace contours at 50% threshold
        const contourGenerator = contours().size([size, size]).thresholds([128]);
        const contourData = contourGenerator(values);

        if (contourData.length > 0) {
          // Coordinates is a MultiPolygon: array of polygons -> array of rings -> array of [x, y]
          const multiPolygon = contourData[0].coordinates;

          // Normalize coordinates to [-0.5, 0.5] range, flipping Y for intuitive orientation
          const normalized = multiPolygon.map((polygon) =>
            polygon.map((ring) =>
              ring.map(
                ([x, y]) =>
                  [
                    (x - size / 2) / size,
                    -(y - size / 2) / size,
                  ] as [number, number]
              )
            )
          );

          setParam('customStampPolygons', normalized);
          // Set type to custom if it isn't already
          setParam('stampType', 'custom');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

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
              <option value="diamonds">Diamonds</option>
              <option value="hexagons">Hexagons</option>
              <option value="custom">Custom Image...</option>
            </select>
          </div>

          {stampType === 'custom' && (
            <div className="space-y-2 bg-neutral-800 p-3 rounded-lg border border-neutral-700">
              <label className="block text-xs text-neutral-400">Upload Stamp Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full text-xs text-neutral-300 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-blue-500 file:text-white hover:file:bg-blue-600"
              />
              <p className="text-[10px] text-neutral-500 mt-1">
                For best results, upload a high-contrast black and white image. Dark areas will be stamped out.
              </p>
            </div>
          )}

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
