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
  const stampSize = useFrameStore((s) => s.stampSize);
  const stampRotation = useFrameStore((s) => s.stampRotation);
  const isProcessingCustomStamp = useFrameStore((s) => s.isProcessingCustomStamp);
  const setProcessingCustomStamp = useFrameStore((s) => s.setProcessingCustomStamp);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingCustomStamp(true);

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
        if (!ctx) {
          setProcessingCustomStamp(false);
          return;
        }

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
        
        // Brief delay to ensure state update is visible if it was very fast
        setTimeout(() => setProcessingCustomStamp(false), 300);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      {/* Style Toggle */}
      <div className="flex flex-col bg-[var(--bg-input)] p-1 rounded-none gap-1">
        <button
          onClick={() => setParam('frameStyle', 'profile')}
          className={`w-full py-1.5 text-xs font-medium rounded-none transition-colors ${
            frameStyle === 'profile'
              ? 'bg-primary text-fg-on-primary shadow'
              : 'text-[var(--fg-muted)] hover:text-[var(--fg-main)]'
          }`}
        >
          Extruded Profile
        </button>
        <button
          onClick={() => setParam('frameStyle', 'stamp')}
          className={`w-full py-1.5 text-xs font-medium rounded-none transition-colors ${
            frameStyle === 'stamp'
              ? 'bg-primary text-fg-on-primary shadow'
              : 'text-[var(--fg-muted)] hover:text-[var(--fg-main)]'
          }`}
        >
          Stamped Pattern
        </button>
        <button
          onClick={() => setParam('frameStyle', 'texture')}
          className={`w-full py-1.5 text-xs font-medium rounded-none transition-colors ${
            frameStyle === 'texture'
              ? 'bg-primary text-fg-on-primary shadow'
              : 'text-[var(--fg-muted)] hover:text-[var(--fg-main)]'
          }`}
        >
          Seamless Texture
        </button>
      </div>

      {frameStyle === 'profile' ? (
        <ProfileSelector />
      ) : frameStyle === 'stamp' ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs text-[var(--fg-muted)]">Stamp Shape</label>
            <select
              value={stampType}
              onChange={(e) => setParam('stampType', e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-none p-1.5 text-sm text-[var(--fg-main)]"
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
            <div className="space-y-3 bg-[var(--bg-sidebar)] p-3 rounded-none border border-[var(--border-main)] shadow-sm">
              <div className="flex justify-between items-center">
                <label className="block text-xs text-[var(--fg-muted)]">Custom Stamp</label>
                {isProcessingCustomStamp && (
                  <div className="flex items-center gap-1.5 text-[10px] text-primary">
                    <div className="w-3 h-3 border border-primary border-t-transparent rounded-none-full animate-spin" />
                    Processing...
                  </div>
                )}
              </div>
              
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isProcessingCustomStamp}
                  className="w-full text-xs text-[var(--fg-main)] file:mr-2 file:py-1 file:px-2 file:rounded-none file:border-0 file:text-xs file:font-medium file:bg-primary file:text-fg-on-primary hover:file:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Stamp Size */}
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <label className="text-[var(--fg-muted)]">Scale</label>
                  <span className="text-[var(--fg-main)] font-mono">{Math.round(stampSize * 100)}%</span>
                </div>
                <input
                  type="range"
                  value={stampSize}
                  onChange={(e) => setParam('stampSize', parseFloat(e.target.value))}
                  min={0.1}
                  max={2.0}
                  step={0.05}
                  className="w-full h-1.5 bg-[var(--bg-input)] rounded-none appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Stamp Rotation */}
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <label className="text-[var(--fg-muted)]">Rotation</label>
                  <span className="text-[var(--fg-main)] font-mono">{stampRotation}°</span>
                </div>
                <input
                  type="range"
                  value={stampRotation}
                  onChange={(e) => setParam('stampRotation', parseInt(e.target.value))}
                  min={-180}
                  max={180}
                  step={5}
                  className="w-full h-1.5 bg-[var(--bg-input)] rounded-none appearance-none cursor-pointer accent-primary"
                />
              </div>

              <p className="text-[10px] text-[var(--fg-muted)] mt-1 opacity-80">
                For best results, upload a high-contrast black and white image. Dark areas will be stamped out.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs text-[var(--fg-muted)]">Pattern Layout</label>
            <select
              value={stampPattern}
              onChange={(e) => setParam('stampPattern', e.target.value as 'repeating' | 'alternating')}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-none p-1.5 text-sm text-[var(--fg-main)]"
            >
              <option value="repeating">Repeating</option>
              <option value="alternating">Alternating</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs text-[var(--fg-muted)]">Corner Joints</label>
            <select
              value={stampCornerStyle}
              onChange={(e) => setParam('stampCornerStyle', e.target.value as 'butt-h' | 'butt-v' | 'cyclic')}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-none p-1.5 text-sm text-[var(--fg-main)]"
            >
              <option value="butt-h">Butt (Top/Bottom overlap)</option>
              <option value="butt-v">Butt (Left/Right overlap)</option>
              <option value="cyclic">Cyclic (Pinwheel)</option>
            </select>
          </div>

          {/* Stamp Spacing */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <label className="text-[var(--fg-muted)]">Spacing</label>
              <span className="text-[var(--fg-main)] font-mono">{stampSpacing} mm</span>
            </div>
            <input
              type="range"
              value={stampSpacing}
              onChange={(e) => setParam('stampSpacing', parseFloat(e.target.value))}
              min={2}
              max={50}
              step={1}
              className="w-full h-2 bg-[var(--bg-input)] rounded-none appearance-none cursor-pointer accent-primary" aria-label="Control"
            />
          </div>

          {/* Stamp Depth */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <label className="text-[var(--fg-muted)]">Stamp Depth</label>
              <span className="text-[var(--fg-main)] font-mono">{stampDepth} mm</span>
            </div>
            <input
              type="range"
              value={stampDepth}
              onChange={(e) => setParam('stampDepth', parseFloat(e.target.value))}
              min={0.5}
              max={10}
              step={0.5}
              className="w-full h-2 bg-[var(--bg-input)] rounded-none appearance-none cursor-pointer accent-primary" aria-label="Control"
            />
          </div>
        </div>
      ) : (
        <TextureControls />
      )}
    </div>
  );
}

function TextureControls() {
  const textureType = useFrameStore((s) => s.textureType);
  const textureSpacing = useFrameStore((s) => s.textureSpacing);
  const textureDepth = useFrameStore((s) => s.textureDepth);
  const textureRotation = useFrameStore((s) => s.textureRotation);
  const stampCornerStyle = useFrameStore((s) => s.stampCornerStyle);
  const setParam = useFrameStore((s) => s.setParam);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-xs text-[var(--fg-muted)]">Texture Pattern</label>
        <select
          value={textureType}
          onChange={(e) => {
            const val = e.target.value as 'circles' | 'v-stripes' | 'd-stripes' | 'custom';
            setParam('textureType', val);
            if (val === 'd-stripes') setParam('textureRotation', 25);
            if (val === 'v-stripes') setParam('textureRotation', 0);
          }}
          className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-none p-1.5 text-sm text-[var(--fg-main)]"
        >
          <option value="circles">Concentric Circles</option>
          <option value="v-stripes">Vertical Stripes</option>
          <option value="d-stripes">Diagonal Stripes</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-xs text-[var(--fg-muted)]">Corner Joints</label>
        <select
          value={stampCornerStyle}
          onChange={(e) => setParam('stampCornerStyle', e.target.value as 'butt-h' | 'butt-v' | 'cyclic')}
          className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-none p-1.5 text-sm text-[var(--fg-main)]"
        >
          <option value="butt-h">Butt (Top/Bottom overlap)</option>
          <option value="butt-v">Butt (Left/Right overlap)</option>
          <option value="cyclic">Cyclic (Pinwheel)</option>
        </select>
      </div>

      {/* Texture Spacing */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <label className="text-[var(--fg-muted)]">Frequency / Spacing</label>
          <span className="text-[var(--fg-main)] font-mono">{textureSpacing} mm</span>
        </div>
        <input
          type="range"
          value={textureSpacing}
          onChange={(e) => setParam('textureSpacing', parseFloat(e.target.value))}
          min={2}
          max={50}
          step={1}
          className="w-full h-2 bg-[var(--bg-input)] rounded-none appearance-none cursor-pointer accent-primary" aria-label="Control"
        />
      </div>

      {/* Texture Rotation (only for stripes) */}
      {(textureType === 'v-stripes' || textureType === 'd-stripes') && (
        <div>
          <div className="flex justify-between text-xs mb-1">
            <label className="text-[var(--fg-muted)]">Rotation</label>
            <span className="text-[var(--fg-main)] font-mono">{textureRotation}°</span>
          </div>
          <input
            type="range"
            value={textureRotation}
            onChange={(e) => setParam('textureRotation', parseInt(e.target.value))}
            min={-180}
            max={180}
            step={5}
            className="w-full h-2 bg-[var(--bg-input)] rounded-none appearance-none cursor-pointer accent-primary" aria-label="Control"
          />
        </div>
      )}

      {/* Texture Depth */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <label className="text-[var(--fg-muted)]">Texture Depth</label>
          <span className="text-[var(--fg-main)] font-mono">{textureDepth} mm</span>
        </div>
        <input
          type="range"
          value={textureDepth}
          onChange={(e) => setParam('textureDepth', parseFloat(e.target.value))}
          min={0.5}
          max={10}
          step={0.5}
          className="w-full h-2 bg-[var(--bg-input)] rounded-none appearance-none cursor-pointer accent-primary" aria-label="Control"
        />
      </div>
    </div>
  );
}
