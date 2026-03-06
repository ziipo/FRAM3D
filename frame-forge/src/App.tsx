import { useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { FramePreview } from './components/preview/FramePreview';
import { useUrlSync } from './hooks/useUrlSync';
import { useFrameStore } from './store/useFrameStore';

function App() {
  const theme = useFrameStore((s) => s.theme);

  // Sync parameters with URL hash
  useUrlSync();

  // Apply dark class to root
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-app)] text-[var(--fg-main)]">
      <Header />
      {/* Desktop: side by side, Mobile: stacked with preview on top */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Preview first on mobile (via order), sidebar first on desktop */}
        <main className="flex-1 order-1 md:order-2 min-h-[50vh] md:min-h-0 bg-[var(--bg-app)]">
          <FramePreview />
        </main>
        <div className="order-2 md:order-1 md:flex-shrink-0 overflow-auto bg-[var(--bg-sidebar)] border-r border-[var(--border-main)]">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}

export default App;
