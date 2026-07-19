import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, UserPlus, AtSign, Bell, CheckCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Avatar } from '../components/Avatar';
import { Button, EmptyState, Spinner } from '../components/ui';
import type { Notification } from '../lib/types';
import { timeAgo } from '../lib/utils';

const ICONS: Record<string, { icon: typeof Heart; color: string }> = {
  like: { icon: Heart, color: 'text-accent-500' },
  comment: { icon: MessageCircle, color: 'text-brand-400' },
  follow: { icon: UserPlus, color: 'text-mint-400' },
  mention: { icon: AtSign, color: 'text-gold-400' },
  message: { icon: MessageCircle, color: 'text-brand-400' },
  story_reply: { icon: MessageCircle, color: 'text-accent-400' },
  story_like: { icon: Heart, color: 'text-accent-500' },
  reel_like: { icon: Heart, color: 'text-accent-500' },
};

export default function Notifications() {
  const { session } = useAuth();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('notifications')
      .select('*, actor:profiles!notifications_actor_id_profiles_fkey(id,username,avatar_url,verified)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(60)
      .then(({ data }) => {
        setNotifs((data as Notification[]) || []);
        setLoading(false);
      });
  }, [session]);

  async function markAll() {
    if (!session) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', session.user.id).eq('read', false);
    setNotifs((n) => n.map((x) => ({ ...x, read: true })));
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Notifications</h1>
        {notifs.some((n) => !n.read) && (
          <Button size="sm" variant="ghost" onClick={markAll}>
            <CheckCheck size={16} /> Mark all read
          </Button>
        )}
      </div>

      {notifs.length === 0 ? (
        <EmptyState icon={<Bell size={32} />} title="No notifications yet" description="Likes, comments, and follows will show up here." />
      ) : (
        <div className="space-y-1">
          {notifs.map((n) => {
            const cfg = ICONS[n.type] || { icon: Bell, color: 'text-ink-400' };
            const Icon = cfg.icon;
            const verb =
              n.type === 'like' ? 'liked your post' :
              n.type === 'comment' ? 'commented on your post' :
              n.type === 'follow' ? 'started following you' :
              n.type === 'mention' ? 'mentioned you' :
              n.type === 'message' ? 'sent you a message' :
              n.type === 'story_reply' ? 'replied to your story' :
              n.type === 'story_like' ? 'liked your story' :
              n.type === 'reel_like' ? 'liked your reel' :
              'interacted with you';
            return (
              <div key={n.id} className={`glass rounded-2xl p-3 flex items-center gap-3 ${!n.read ? 'ring-1 ring-brand-400/40' : ''}`}>
                <Avatar src={n.actor?.avatar_url} username={n.actor?.username} size={44} to={`/u/${n.actor?.username}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink-800 dark:text-ink-100">
                    <Link to={`/u/${n.actor?.username}`} className="font-medium mr-1">{n.actor?.username}</Link>
                    {verb}
                  </p>
                  <span className="text-[11px] text-ink-400">{timeAgo(n.created_at)}</span>
                </div>
                <Icon size={18} className={cfg.color} fill={n.type.includes('like') ? 'currentColor' : 'none'} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
