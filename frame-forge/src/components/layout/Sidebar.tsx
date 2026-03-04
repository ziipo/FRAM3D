import { useState } from 'react';
import { DimensionControls } from '../controls/DimensionControls';
import { FrameControls } from '../controls/FrameControls';
import { DesignControls } from '../controls/DesignControls';
import { JoineryControls } from '../controls/JoineryControls';
import { RabbetControls } from '../controls/RabbetControls';
import { BuildPlateControls } from '../controls/BuildPlateControls';
import { ExportButton } from '../controls/ExportButton';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, children, defaultOpen = true }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="space-y-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between group"
      >
        <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide group-hover:text-white transition-colors">
          {title}
        </h3>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`w-4 h-4 text-neutral-500 group-hover:text-neutral-300 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="w-full md:w-80 bg-neutral-800 border-t md:border-t-0 md:border-r border-neutral-700 overflow-y-auto flex-shrink-0">
      <div className="p-4 space-y-6">
        <CollapsibleSection title="Picture Size">
          <DimensionControls />
        </CollapsibleSection>

        <div className="border-t border-neutral-700" />

        <CollapsibleSection title="Frame Dimensions">
          <FrameControls />
        </CollapsibleSection>

        <div className="border-t border-neutral-700" />

        <CollapsibleSection title="Frame Design">
          <DesignControls />
        </CollapsibleSection>

        <div className="border-t border-neutral-700" />

        <CollapsibleSection title="Joinery">
          <JoineryControls />
        </CollapsibleSection>

        <div className="border-t border-neutral-700" />

        <CollapsibleSection title="Rabbet & Tolerance">
          <RabbetControls />
        </CollapsibleSection>

        <div className="border-t border-neutral-700" />

        <CollapsibleSection title="Build Plate" defaultOpen={false}>
          <BuildPlateControls />
        </CollapsibleSection>

        <div className="border-t border-neutral-700" />

        <ExportButton />

        {/* Print orientation note */}
        <div className="border-t border-neutral-700" />
        <div className="text-xs text-neutral-500 space-y-1">
          <p className="font-medium text-neutral-400">Print Tips</p>
          <p>Print face-down for best surface quality.</p>
          <p>Use 0.2mm layer height and 15-20% infill.</p>
        </div>
      </div>
    </aside>
  );
}
