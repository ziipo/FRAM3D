import { useState } from 'react';
import { useFrameStore } from '../../store/useFrameStore';
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
  headerRight?: React.ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
  hideArrow?: boolean;
}

function CollapsibleSection({ 
  title, 
  children, 
  defaultOpen = true, 
  headerRight, 
  isOpen: controlledOpen, 
  onToggle,
  hideArrow = false
}: CollapsibleSectionProps) {
  const [localIsOpen, setLocalIsOpen] = useState(defaultOpen);
  
  const isOpen = controlledOpen !== undefined ? controlledOpen : localIsOpen;
  const toggle = onToggle || (() => setLocalIsOpen(!localIsOpen));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between group">
        <button
          onClick={toggle}
          className="flex-1 flex items-center justify-between text-left"
        >
          <h3 className="text-sm font-medium text-[var(--fg-muted)] uppercase tracking-wide group-hover:text-[var(--fg-main)] transition-colors">
            {title}
          </h3>
          {!hideArrow && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`w-4 h-4 text-[var(--fg-muted)] group-hover:text-[var(--fg-main)] transition-transform duration-200 mr-2 ${
                isOpen ? 'rotate-180' : ''
              }`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </button>
        {headerRight}
      </div>
      
      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const buildPlateEnabled = useFrameStore((s) => s.buildPlateEnabled);
  const setBuildPlateEnabled = useFrameStore((s) => s.setBuildPlateEnabled);
  const setExplosionGap = useFrameStore((s) => s.setExplosionGap);

  const toggleSplitParts = () => {
    const next = !buildPlateEnabled;
    setBuildPlateEnabled(next);
    setExplosionGap(next ? 2 : 0);
  };

  return (
    <aside className="w-full md:w-80 bg-[var(--bg-sidebar)] border-t md:border-t-0 md:border-r border-[var(--border-main)] overflow-y-auto flex-shrink-0 transition-colors">
      <div className="p-4 space-y-6">
        <CollapsibleSection title="Picture Size">
          <DimensionControls />
        </CollapsibleSection>

        <div className="border-t border-[var(--border-main)]" />

        <CollapsibleSection title="Frame Dimensions">
          <FrameControls />
        </CollapsibleSection>

        <div className="border-t border-[var(--border-main)]" />

        <CollapsibleSection title="Frame Design">
          <DesignControls />
        </CollapsibleSection>

        <div className="border-t border-[var(--border-main)]" />

        <CollapsibleSection title="Rabbet & Tolerance">
          <RabbetControls />
        </CollapsibleSection>

        <div className="border-t border-[var(--border-main)]" />

        <CollapsibleSection 
          title="Split parts" 
          isOpen={buildPlateEnabled} 
          onToggle={toggleSplitParts}
          hideArrow={true}
          headerRight={
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSplitParts();
              }}
              className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none ${
                buildPlateEnabled ? 'bg-blue-600' : 'bg-[var(--bg-input)]'
              }`}
            >
              <span
                className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${
                  buildPlateEnabled ? 'translate-x-4.5' : 'translate-x-1'
                }`}
              />
            </button>
          }
        >
          <div className="space-y-6">
            <BuildPlateControls />
            {buildPlateEnabled && (
              <div className="border-t border-[var(--border-main)] pt-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <h4 className="text-[10px] font-bold text-[var(--fg-muted)] uppercase mb-4">Internal Joinery</h4>
                <JoineryControls />
              </div>
            )}
          </div>
        </CollapsibleSection>

        <div className="border-t border-[var(--border-main)]" />

        <ExportButton />

        {/* Print orientation note */}
        <div className="border-t border-[var(--border-main)]" />
        <div className="text-xs text-[var(--fg-muted)] space-y-1">
          <p className="font-medium text-[var(--fg-main)]">Print Tips</p>
          <p>Print face-down for best surface quality.</p>
          <p>Use 0.2mm layer height and 15-20% infill.</p>
        </div>
      </div>
    </aside>
  );
}
