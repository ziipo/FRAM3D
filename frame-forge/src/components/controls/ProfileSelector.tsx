import { useFrameStore } from '../../store/useFrameStore';
import { frameProfiles } from '../../data/profiles';

export function ProfileSelector() {
  const profileId = useFrameStore((s) => s.profileId);
  const setParam = useFrameStore((s) => s.setParam);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide">
        Profile Shape
      </h3>

      <div className="grid grid-cols-2 gap-2">
        {frameProfiles.map((profile) => (
          <button
            key={profile.id}
            onClick={() => setParam('profileId', profile.id)}
            className={`p-2 rounded border transition-colors text-left ${
              profileId === profile.id
                ? 'border-blue-500 bg-blue-500/20'
                : 'border-neutral-600 bg-neutral-700/50 hover:border-neutral-500'
            }`}
          >
            {/* Profile thumbnail - SVG preview */}
            <div className="h-8 mb-1 flex items-center justify-center">
              <ProfileThumbnail profile={profile} />
            </div>
            <div className="text-xs text-white font-medium truncate">
              {profile.name}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ProfileThumbnail({ profile }: { profile: typeof frameProfiles[0] }) {
  // Generate SVG path from profile points
  const width = 60;
  const height = 24;
  const padding = 2;

  // Scale points to fit in the thumbnail
  const scaledPoints = profile.points.map((p) => ({
    x: padding + p.x * (width - 2 * padding),
    y: height - padding - p.y * (height - 2 * padding),
  }));

  // Create SVG path
  const pathData = scaledPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ') + ' Z';

  return (
    <svg width={width} height={height} className="text-neutral-300">
      <path
        d={pathData}
        fill="currentColor"
        opacity={0.6}
        stroke="currentColor"
        strokeWidth={1}
      />
    </svg>
  );
}
