import { useFrameStore } from '../../store/useFrameStore';
import { downloadSTL, download3MF, downloadSplitZip } from '../../engine/exporter';
import { getPictureSize } from '../../data/presets';
import { getProfile } from '../../data/profiles';

export function ExportButton() {
  const stlData = useFrameStore((s) => s.stlData);
  const threemfData = useFrameStore((s) => s.threemfData);
  const isGenerating = useFrameStore((s) => s.isGenerating);
  const pictureSizeId = useFrameStore((s) => s.pictureSizeId);
  const customWidth = useFrameStore((s) => s.customWidth);
  const customHeight = useFrameStore((s) => s.customHeight);
  const profileId = useFrameStore((s) => s.profileId);

  const buildPlateEnabled = useFrameStore((s) => s.buildPlateEnabled);
  const isSplitExporting = useFrameStore((s) => s.isSplitExporting);
  const splitExportData = useFrameStore((s) => s.splitExportData);
  const splitInfo = useFrameStore((s) => s.splitInfo);
  const triggerSplitExport = useFrameStore((s) => s.triggerSplitExport);

  const getExportDims = () => {
    const preset = getPictureSize(pictureSizeId);
    const profile = getProfile(profileId);

    const width = pictureSizeId === 'custom'
      ? customWidth
      : preset?.dimensions.width ?? customWidth;

    const height = pictureSizeId === 'custom'
      ? customHeight
      : preset?.dimensions.height ?? customHeight;

    const profileName = profileId === 'custom' ? 'custom' : (profile?.name ?? 'flat');

    return { width, height, profileName };
  };

  const handleDownloadSTL = () => {
    if (!stlData) return;
    const { width, height, profileName } = getExportDims();
    downloadSTL(stlData, width, height, profileName);
  };

  const handleDownload3MF = () => {
    if (!threemfData) return;
    const { width, height, profileName } = getExportDims();
    download3MF(threemfData, width, height, profileName);
  };

  const handleSplitExport = () => {
    triggerSplitExport?.();
  };

  const handleDownloadZip = () => {
    if (!splitExportData) return;
    const { width, height, profileName } = getExportDims();
    downloadSplitZip(splitExportData, width, height, profileName);
  };

  const isDisabled = isGenerating || (!stlData && !threemfData);

  // Build split info description
  const splitDescription = splitInfo ? (() => {
    const details: string[] = [];
    if (splitInfo.bottomPieces > 1) details.push(`bottom \u00d7${splitInfo.bottomPieces}`);
    if (splitInfo.topPieces > 1) details.push(`top \u00d7${splitInfo.topPieces}`);
    if (splitInfo.leftPieces > 1) details.push(`left \u00d7${splitInfo.leftPieces}`);
    if (splitInfo.rightPieces > 1) details.push(`right \u00d7${splitInfo.rightPieces}`);
    return `${splitInfo.totalParts} parts` + (details.length > 0 ? ` | ${details.join(', ')}` : '');
  })() : null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide">
        Export
      </h3>

      <div className="flex gap-2">
        <button
          onClick={handleDownloadSTL}
          disabled={!stlData || isGenerating}
          className={`flex-1 py-2.5 px-4 rounded font-medium text-sm transition-colors ${
            !stlData || isGenerating
              ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {isGenerating ? 'Generating...' : 'STL'}
        </button>

        <button
          onClick={handleDownload3MF}
          disabled={!threemfData || isGenerating}
          className={`flex-1 py-2.5 px-4 rounded font-medium text-sm transition-colors ${
            !threemfData || isGenerating
              ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {isGenerating ? '...' : '3MF'}
        </button>
      </div>

      {(stlData || threemfData) && !isDisabled && (
        <div className="flex justify-between text-xs text-neutral-500">
          {stlData && <span>STL: {(stlData.byteLength / 1024).toFixed(1)} KB</span>}
          {threemfData && <span>3MF: {(threemfData.byteLength / 1024).toFixed(1)} KB</span>}
        </div>
      )}

      {buildPlateEnabled && (
        <div className="space-y-2 pt-2 border-t border-neutral-700">
          {!splitExportData ? (
            <button
              onClick={handleSplitExport}
              disabled={isSplitExporting || isGenerating || !stlData}
              className={`w-full py-2.5 px-4 rounded font-medium text-sm transition-colors ${
                isSplitExporting || isGenerating || !stlData
                  ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-500 text-white'
              }`}
            >
              {isSplitExporting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Splitting...
                </span>
              ) : (
                'Split & Export ZIP'
              )}
            </button>
          ) : (
            <button
              onClick={handleDownloadZip}
              className="w-full py-2.5 px-4 rounded font-medium text-sm transition-colors bg-green-600 hover:bg-green-500 text-white"
            >
              Download ZIP ({(splitExportData.byteLength / 1024).toFixed(1)} KB)
            </button>
          )}

          {splitDescription && (
            <div className="text-xs text-neutral-500">{splitDescription}</div>
          )}
        </div>
      )}
    </div>
  );
}
