import { DimensionControls } from '../controls/DimensionControls';
import { FrameControls } from '../controls/FrameControls';
import { ProfileSelector } from '../controls/ProfileSelector';
import { RabbetControls } from '../controls/RabbetControls';
import { ExportButton } from '../controls/ExportButton';

export function Sidebar() {
  return (
    <aside className="w-full md:w-80 bg-neutral-800 border-t md:border-t-0 md:border-r border-neutral-700 overflow-y-auto flex-shrink-0">
      <div className="p-4 space-y-6">
        <DimensionControls />

        <div className="border-t border-neutral-700" />

        <FrameControls />

        <div className="border-t border-neutral-700" />

        <ProfileSelector />

        <div className="border-t border-neutral-700" />

        <RabbetControls />

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
