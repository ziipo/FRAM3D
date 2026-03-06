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
  const splitExportFormat = useFrameStore((s) => s.splitExportFormat);
  const splitInfo = useFrameStore((s) => s.splitInfo);
  const triggerSplitExport = useFrameStore((s) => s.triggerSplitExport);
  const clearSplitExport = useFrameStore((s) => s.clearSplitExport);

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

  const handleExportSTL = () => {
    if (buildPlateEnabled) {
      if (splitExportData && splitExportFormat === 'stl') {
        const { width, height, profileName } = getExportDims();
        downloadSplitZip(splitExportData, width, height, profileName, 'stl');
      } else {
        triggerSplitExport?.('stl');
      }
    } else {
      if (!stlData) return;
      const { width, height, profileName } = getExportDims();
      downloadSTL(stlData, width, height, profileName);
    }
  };

  const handleExport3MF = () => {
    if (buildPlateEnabled) {
      if (splitExportData && splitExportFormat === '3mf') {
        const { width, height, profileName } = getExportDims();
        downloadSplitZip(splitExportData, width, height, profileName, '3mf');
      } else {
        triggerSplitExport?.('3mf');
      }
    } else {
      if (!threemfData) return;
      const { width, height, profileName } = getExportDims();
      download3MF(threemfData, width, height, profileName);
    }
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
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide">
          Export {buildPlateEnabled ? 'Parts' : 'Frame'}
        </h3>
        {splitExportData && (
          <button 
            onClick={clearSplitExport}
            className="text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Clear ZIP
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={handleExportSTL}
          disabled={isDisabled || (isSplitExporting && splitExportFormat !== 'stl')}
          className={`w-full py-2.5 px-4 rounded font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
            isDisabled
              ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {isGenerating ? (
            'Generating...'
          ) : isSplitExporting && splitExportFormat === 'stl' ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Preparing STL ZIP...
            </>
          ) : buildPlateEnabled && splitExportData && splitExportFormat === 'stl' ? (
            `Download STL ZIP (${(splitExportData.byteLength / 1024).toFixed(1)} KB)`
          ) : buildPlateEnabled ? (
            'Export Split STL (ZIP)'
          ) : (
            'Export Whole STL'
          )}
        </button>

        <button
          onClick={handleExport3MF}
          disabled={isDisabled || (isSplitExporting && splitExportFormat !== '3mf')}
          className={`w-full py-2.5 px-4 rounded font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
            isDisabled
              ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
              : 'bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-white'
          }`}
        >
          {isGenerating ? (
            '...'
          ) : isSplitExporting && splitExportFormat === '3mf' ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Preparing 3MF ZIP...
            </>
          ) : buildPlateEnabled && splitExportData && splitExportFormat === '3mf' ? (
            `Download 3MF ZIP (${(splitExportData.byteLength / 1024).toFixed(1)} KB)`
          ) : buildPlateEnabled ? (
            'Export Split 3MF (ZIP)'
          ) : (
            'Export Whole 3MF'
          )}
        </button>
      </div>

      {splitDescription && buildPlateEnabled && (
        <div className="text-xs text-neutral-500 text-center">{splitDescription}</div>
      )}
    </div>
  );
}
