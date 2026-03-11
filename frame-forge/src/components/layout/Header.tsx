import { useState } from 'react';
import { useFrameStore, selectFrameParams } from '../../store/useFrameStore';
import { useShallow } from 'zustand/react/shallow';
import { createShareUrl } from '../../utils/urlParams';

export function Header() {
  const [copied, setCopied] = useState(false);
  const params = useFrameStore(useShallow(selectFrameParams));
  const theme = useFrameStore((s) => s.theme);
  const setTheme = useFrameStore((s) => s.setTheme);

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
    <header className="h-14 bg-[var(--bg-sidebar)] border-b border-[var(--border-main)] flex items-center justify-between px-4 flex-shrink-0 transition-colors">
      <div className="flex items-center gap-2">
        <svg
          className="w-8 h-8 text-primary"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="3" width="18" height="18" rx="0" />
          <rect x="6" y="6" width="12" height="12" rx="0" />
        </svg>
        <h1 className="text-xl font-semibold text-[var(--fg-main)]">FrameForge</h1>
        <span className="text-xs text-[var(--fg-muted)] hidden sm:inline uppercase tracking-widest">
          3D-Printable Picture Frame Generator
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-none border border-transparent transition-colors hover:bg-[var(--bg-app)] hover:border-[var(--border-main)] text-[var(--fg-muted)] hover:text-[var(--fg-main)]"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        <button
          onClick={handleShare}
          className={`px-3 py-1.5 text-sm rounded-none border border-[var(--border-main)] transition-colors flex items-center gap-1.5 ${
            copied
              ? 'bg-green-600 text-white'
              : 'bg-primary hover:bg-primary-dark text-fg-on-primary'
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
