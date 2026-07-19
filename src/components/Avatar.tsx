import { Link } from 'react-router-dom';
import { BadgeCheck } from 'lucide-react';
import type { Profile } from '../lib/types';

interface Props {
  src?: string | null;
  username?: string;
  size?: number;
  ring?: 'story' | 'seen' | 'none';
  online?: boolean;
  to?: string;
  onClick?: () => void;
  className?: string;
}

export function Avatar({
  src,
  username,
  size = 40,
  ring = 'none',
  online = false,
  to,
  onClick,
  className = '',
}: Props) {
  const initials = (username || '?').slice(0, 2).toUpperCase();
  const ringClass =
    ring === 'story' ? 'story-ring' : ring === 'seen' ? 'story-ring-seen' : '';
  const inner = (
    <div
      className={`relative inline-flex items-center justify-center ${ringClass} ${className}`}
      onClick={onClick}
      style={{ width: size + (ring !== 'none' ? 6 : 0), height: size + (ring !== 'none' ? 6 : 0) }}
    >
      <div
        className="rounded-full overflow-hidden bg-ink-700 flex items-center justify-center text-white font-medium"
        style={{ width: size, height: size }}
      >
        {src ? (
          <img src={src} alt={username || 'avatar'} className="w-full h-full object-cover" />
        ) : (
          <span style={{ fontSize: size * 0.4 }}>{initials}</span>
        )}
      </div>
      {online && (
        <span
          className="absolute bottom-0 right-0 block rounded-full bg-mint-400 ring-2 ring-ink-950"
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  );

  if (to) {
    return <Link to={to}>{inner}</Link>;
  }
  return inner;
}

export function VerifiedBadge({ size = 14 }: { size?: number }) {
  return <BadgeCheck size={size} className="text-brand-400 fill-brand-400/20" />;
}

export function ProfileName({
  profile,
  to,
}: {
  profile: Pick<Profile, 'username' | 'verified'> | null;
  to?: string;
}) {
  if (!profile) return null;
  return (
    <span className="inline-flex items-center gap-1">
      {to ? <Link to={to} className="font-medium hover:underline">{profile.username}</Link> : <span className="font-medium">{profile.username}</span>}
      {profile.verified && <VerifiedBadge />}
    </span>
  );
}
