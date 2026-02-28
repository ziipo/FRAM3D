import { useFrameStore } from '../../store/useFrameStore';
import { downloadSTL } from '../../engine/exporter';
import { getPictureSize } from '../../data/presets';
import { getProfile } from '../../data/profiles';

export function ExportButton() {
  const stlData = useFrameStore((s) => s.stlData);
  const isGenerating = useFrameStore((s) => s.isGenerating);
  const pictureSizeId = useFrameStore((s) => s.pictureSizeId);
  const customWidth = useFrameStore((s) => s.customWidth);
  const customHeight = useFrameStore((s) => s.customHeight);
  const profileId = useFrameStore((s) => s.profileId);

  const handleDownload = () => {
    if (!stlData) return;

    const preset = getPictureSize(pictureSizeId);
    const profile = getProfile(profileId);

    const width = pictureSizeId === 'custom'
      ? customWidth
      : preset?.dimensions.width ?? customWidth;

    const height = pictureSizeId === 'custom'
      ? customHeight
      : preset?.dimensions.height ?? customHeight;

    downloadSTL(stlData, width, height, profile?.name ?? 'flat');
  };

  const isDisabled = !stlData || isGenerating;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide">
        Export
      </h3>

      <button
        onClick={handleDownload}
        disabled={isDisabled}
        className={`w-full py-2.5 px-4 rounded font-medium text-sm transition-colors ${
          isDisabled
            ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-500 text-white'
        }`}
      >
        {isGenerating ? 'Generating...' : 'Download STL'}
      </button>

      {stlData && (
        <p className="text-xs text-neutral-500 text-center">
          {(stlData.byteLength / 1024).toFixed(1)} KB
        </p>
      )}
    </div>
  );
}
