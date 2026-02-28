import { useState } from 'react';
import { useFrameStore, selectFrameParams } from '../../store/useFrameStore';
import { useShallow } from 'zustand/react/shallow';
import { createShareUrl } from '../../utils/urlParams';

export function Header() {
  const [copied, setCopied] = useState(false);
  const params = useFrameStore(useShallow(selectFrameParams));

  const handleShare = async () => {
    const url = createShareUrl(params);

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <header className="h-14 bg-neutral-800 border-b border-neutral-700 flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-2">
        <svg
          className="w-8 h-8 text-blue-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <rect x="6" y="6" width="12" height="12" rx="1" />
        </svg>
        <h1 className="text-xl font-semibold text-white">FrameForge</h1>
        <span className="text-xs text-neutral-500 hidden sm:inline">
          3D-Printable Picture Frame Generator
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleShare}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
            copied
              ? 'bg-green-600 text-white'
              : 'bg-neutral-700 hover:bg-neutral-600 text-white'
          }`}
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </>
          )}
        </button>
      </div>
    </header>
  );
}
