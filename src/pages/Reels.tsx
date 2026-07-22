import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Music2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { Avatar, VerifiedBadge } from '../components/Avatar';
import { Button, EmptyState, Modal, Textarea, Spinner } from '../components/ui';
import { useDoubleTapLike, LikeBurstOverlay } from '../components/LikeBurst';
import type { ReelWithProfile } from '../lib/types';
import { formatCount } from '../lib/utils';

export default function Reels() {
  const { session } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [reels, setReels] = useState<ReelWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setActiveIndex] = useState(0);
  const [commentOpen, setCommentOpen] = useState<string | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('reels')
      .select('*, profiles:profiles!reels_user_id_profiles_fkey(id,username,avatar_url,verified), reel_likes(user_id)')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) toast(error.message, 'error');
    if (data) setReels(data as ReelWithProfile[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const ob = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const i = Number((e.target as HTMLElement).dataset.index);
          if (e.isIntersecting) {
            setActiveIndex(i);
            videoRefs.current[i]?.play().catch(() => {});
          } else {
            videoRefs.current[i]?.pause();
          }
        });
      },
      { threshold: 0.6 },
    );
    const container = containerRef.current;
    if (container) {
      Array.from(container.querySelectorAll('[data-index]')).forEach((el) => ob.observe(el));
    }
    return () => ob.disconnect();
  }, [reels]);

  async function toggleLike(reelId: string) {
    if (!session) return;
    const reel = reels.find((r) => r.id === reelId);
    const existing = reel?.reel_likes.some((l) => l.user_id === session.user.id);
    if (existing) {
      await supabase.from('reel_likes').delete().eq('user_id', session.user.id).eq('reel_id', reelId);
      setReels((rs) => rs.map((r) => (r.id === reelId ? { ...r, reel_likes: r.reel_likes.filter((l) => l.user_id !== session.user.id) } : r)));
    } else {
      await supabase.from('reel_likes').insert({ user_id: session.user.id, reel_id: reelId });
      if (reel && reel.user_id !== session.user.id) {
        await supabase.from('notifications').insert({
          user_id: reel.user_id,
          actor_id: session.user.id,
          type: 'reel_like',
          entity_id: reelId,
          entity_type: 'reel',
        });
      }
      setReels((rs) => rs.map((r) => (r.id === reelId ? { ...r, reel_likes: [...r.reel_likes, { user_id: session.user.id }] } : r)));
    }
  }

  async function toggleSave(reelId: string) {
    if (!session) return;
    const { data } = await supabase.from('saved_posts').select('post_id').eq('user_id', session.user.id).eq('post_id', reelId).maybeSingle();
    if (data) {
      await supabase.from('saved_posts').delete().eq('user_id', session.user.id).eq('post_id', reelId);
    } else {
      await supabase.from('saved_posts').insert({ user_id: session.user.id, post_id: reelId });
      toast('Saved', 'success');
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  if (reels.length === 0) {
    return (
      <div className="fixed inset-0 z-40 bg-black flex flex-col">
        <div className="flex items-center px-3 py-3">
          <button onClick={() => nav('/')} className="p-2 rounded-full hover:bg-white/10 text-white">
            <ChevronLeft size={24} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h20M12 2v20" /></svg>}
            title="No reels yet"
            description="Be the first to share a reel on Snapix."
            action={<Button onClick={() => nav('/create/reel')}>Create a reel</Button>}
          />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="fixed inset-0 z-40 bg-black overflow-y-auto snap-y snap-mandatory no-scrollbar">
      <button onClick={() => nav('/')} className="fixed top-4 left-4 z-50 p-2.5 rounded-full glass-strong text-white">
        <ChevronLeft size={24} />
      </button>

      {reels.map((r, i) => (
        <ReelCard
          key={r.id}
          reel={r}
          index={i}
          videoRef={(el) => (videoRefs.current[i] = el)}
          liked={r.reel_likes.some((l) => l.user_id === session?.user.id)}
          onToggleLike={() => toggleLike(r.id)}
          onToggleSave={() => toggleSave(r.id)}
          onOpenComments={() => setCommentOpen(r.id)}
        />
      ))}

      <ReelCommentSheet reelId={commentOpen} onClose={() => setCommentOpen(null)} />
    </div>
  );
}

function FollowButton({ userId }: { userId: string }) {
  const { session } = useAuth();
  const [following, setFollowing] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!session || session.user.id === userId) return;
    supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', session.user.id)
      .eq('following_id', userId)
      .maybeSingle()
      .then(({ data }) => setFollowing(!!data));
  }, [session, userId]);

  if (!session || session.user.id === userId) return null;

  async function toggle() {
    if (!session) return;
    if (following) {
      await supabase.from('follows').delete().eq('follower_id', session.user.id).eq('following_id', userId);
      setFollowing(false);
    } else {
      await supabase.from('follows').insert({ follower_id: session.user.id, following_id: userId });
      await supabase.from('notifications').insert({ user_id: userId, actor_id: session.user.id, type: 'follow', entity_type: 'profile' });
      setFollowing(true);
      toast('Following', 'success');
    }
  }

  return (
    <button
      onClick={toggle}
      className={`ml-1 px-3 py-1 rounded-full text-xs font-medium ${following ? 'glass text-white' : 'bg-white text-ink-900'}`}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  );
}

function ReelCommentSheet({ reelId, onClose }: { reelId: string | null; onClose: () => void }) {
  const { session, profile } = useAuth();
  const toast = useToast();
  const [comments, setComments] = useState<{ id: string; text: string; user_id: string; profiles: { username: string; avatar_url: string | null } | null }[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!reelId) return;
    supabase
      .from('reel_comments')
      .select('*, profiles:profiles!reel_comments_user_id_profiles_fkey(username,avatar_url)')
      .eq('reel_id', reelId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setComments(data as typeof comments);
      });
  }, [reelId]);

  async function submit() {
    if (!session || !reelId || !text.trim()) return;
    const { data, error } = await supabase
      .from('reel_comments')
      .insert({ reel_id: reelId, user_id: session.user.id, text: text.trim() })
      .select('*, profiles:profiles!reel_comments_user_id_profiles_fkey(username,avatar_url)')
      .single();
    if (error) return toast(error.message, 'error');
    setComments((c) => [...c, data as typeof comments[number]]);
    setText('');
  }

  return (
    <Modal open={!!reelId} onClose={onClose} title="Comments">
      <div className="space-y-3 max-h-[50vh] overflow-y-auto mb-3">
        {comments.length === 0 && <p className="text-center text-sm text-ink-400 py-6">No comments yet.</p>}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <Avatar src={c.profiles?.avatar_url} username={c.profiles?.username} size={32} to={`/u/${c.profiles?.username}`} />
            <p className="text-sm text-ink-800 dark:text-ink-100">
              <span className="font-medium mr-1.5">{c.profiles?.username}</span>
              {c.text}
            </p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 items-end">
        <Avatar src={profile?.avatar_url} username={profile?.username} size={32} />
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} placeholder="Add a comment..." className="flex-1" />
        <Button onClick={submit} disabled={!text.trim()}>Post</Button>
      </div>
    </Modal>
  );
}

function ReelCard({
  reel,
  index,
  videoRef,
  liked,
  onToggleLike,
  onToggleSave,
  onOpenComments,
}: {
  reel: ReelWithProfile;
  index: number;
  videoRef: (el: HTMLVideoElement | null) => void;
  liked: boolean;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onOpenComments: () => void;
}) {
  const { bursts, handleTap } = useDoubleTapLike(onToggleLike);

  return (
    <div data-index={index} className="relative h-screen w-full snap-start flex items-center justify-center" onClick={handleTap}>
      <video
        ref={videoRef}
        src={reel.video_url}
        loop
        muted
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />
      <LikeBurstOverlay bursts={bursts} />

      <div className="absolute bottom-24 left-4 right-20 text-white z-10">
        <div className="flex items-center gap-2 mb-3">
          <Avatar src={reel.profiles?.avatar_url} username={reel.profiles?.username} size={40} to={`/u/${reel.profiles?.username}`} />
          <div className="flex items-center gap-1">
            <span className="font-semibold">{reel.profiles?.username}</span>
            {reel.profiles?.verified && <VerifiedBadge />}
          </div>
          <FollowButton userId={reel.user_id} />
        </div>
        {reel.caption && <p className="text-sm leading-snug mb-2">{reel.caption}</p>}
        {reel.audio_name && (
          <div className="flex items-center gap-2 text-xs text-white/80">
            <Music2 size={14} /> {reel.audio_name}
          </div>
        )}
      </div>

      <div className="absolute bottom-24 right-3 flex flex-col items-center gap-5 text-white z-10">
        <button onClick={(e) => { e.stopPropagation(); onToggleLike(); }} className="flex flex-col items-center gap-1">
          <Heart size={30} fill={liked ? 'currentColor' : 'none'} className={liked ? 'text-accent-500 animate-pop' : ''} />
          <span className="text-xs font-medium">{formatCount(reel.reel_likes.length)}</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onOpenComments(); }} className="flex flex-col items-center gap-1">
          <MessageCircle size={28} />
          <span className="text-xs font-medium">Comments</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onToggleSave(); }} className="flex flex-col items-center gap-1">
          <Bookmark size={28} />
        </button>
        <button className="flex flex-col items-center gap-1">
          <Send size={28} />
        </button>
        <button className="p-1">
          <MoreHorizontal size={24} />
        </button>
      </div>
    </div>
  );
}
