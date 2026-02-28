import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { FramePreview } from './components/preview/FramePreview';
import { useUrlSync } from './hooks/useUrlSync';

function App() {
  // Sync parameters with URL hash
  useUrlSync();

  return (
    <div className="flex flex-col h-full">
      <Header />
      {/* Desktop: side by side, Mobile: stacked with preview on top */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Preview first on mobile (via order), sidebar first on desktop */}
        <main className="flex-1 bg-neutral-900 order-1 md:order-2 min-h-[50vh] md:min-h-0">
          <FramePreview />
        </main>
        <div className="order-2 md:order-1 md:flex-shrink-0 overflow-auto">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}

export default App;
