import { useFrameStore } from '../../store/useFrameStore';
import { frameProfiles } from '../../data/profiles';
import { ProfileEditor } from './ProfileEditor';

export function ProfileSelector() {
  const profileId = useFrameStore((s) => s.profileId);
  const setParam = useFrameStore((s) => s.setParam);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {frameProfiles.map((profile) => {
          const isActive = profileId === profile.id;
          return (
            <button
              key={profile.id}
              onClick={() => setParam('profileId', profile.id)}
              className={`p-2 rounded border transition-colors text-left ${
                isActive
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-[var(--border-input)] bg-[var(--bg-input)] hover:border-[var(--fg-muted)]'
              }`}
            >
              <div className="h-12 mb-2 flex items-center justify-center bg-[var(--bg-sidebar)] rounded border border-[var(--border-main)]">
                <ProfileThumbnail profile={profile} />
              </div>
              <div className="text-[10px] text-[var(--fg-main)] font-medium truncate">
                {profile.name}
              </div>
            </button>
          );
        })}

        {/* Custom profile button */}
        <button
          onClick={() => setParam('profileId', 'custom')}
          className={`p-2 rounded border transition-colors text-left ${
            profileId === 'custom'
              ? 'border-blue-500 bg-blue-500/20'
              : 'border-[var(--border-input)] bg-[var(--bg-input)] hover:border-[var(--fg-muted)]'
          }`}
        >
          <div className="h-12 mb-2 flex items-center justify-center bg-[var(--bg-sidebar)] rounded border border-[var(--border-main)]">
            <CustomProfileIcon />
          </div>
          <div className="text-[10px] text-[var(--fg-main)] font-medium truncate">
            Custom
          </div>
        </button>
      </div>

      {profileId === 'custom' && <ProfileEditor />}
    </div>
  );
}

function ProfileThumbnail({ profile }: { profile: typeof frameProfiles[0] }) {
  const width = 60;
  const height = 24;
  const padding = 2;

  const scaledPoints = profile.points.map((p) => ({
    x: padding + p.x * (width - 2 * padding),
    y: height - padding - p.y * (height - 2 * padding),
  }));

  const pathData = scaledPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ') + ' Z';

  return (
    <svg width={width} height={height} className="text-[var(--fg-main)] opacity-80">
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

function CustomProfileIcon() {
  return (
    <svg width={60} height={24} className="text-[var(--fg-main)] opacity-80">
      {/* Dotted line with points */}
      <line
        x1={4}
        y1={6}
        x2={28}
        y2={18}
        stroke="currentColor"
        strokeWidth={1}
        strokeDasharray="3,2"
        opacity={0.6}
      />
      <line
        x1={28}
        y1={18}
        x2={56}
        y2={8}
        stroke="currentColor"
        strokeWidth={1}
        strokeDasharray="3,2"
        opacity={0.6}
      />
      <circle cx={4} cy={6} r={2.5} fill="currentColor" opacity={0.8} />
      <circle cx={28} cy={18} r={2.5} fill="currentColor" opacity={0.8} />
      <circle cx={56} cy={8} r={2.5} fill="currentColor" opacity={0.8} />
    </svg>
  );
}
