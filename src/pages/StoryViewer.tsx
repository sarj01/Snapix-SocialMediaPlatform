import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, X, Heart, Send, MoreHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { Avatar } from '../components/Avatar';
import { Input } from '../components/ui';
import type { StoryWithProfile } from '../lib/types';
import { timeAgo } from '../lib/utils';

export default function StoryViewer() {
  const [params] = useSearchParams();
  const userId = params.get('u');
  const { session } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [stories, setStories] = useState<StoryWithProfile[]>([]);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [reply, setReply] = useState('');
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!userId) {
      nav('/');
      return;
    }
    supabase
      .from('stories')
      .select('*, profiles:profiles!stories_user_id_profiles_fkey(id,username,avatar_url), story_views(user_id)')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setStories(data as StoryWithProfile[]);
          if (session && userId !== session.user.id) {
            data.forEach((s) => {
              supabase.from('story_views').upsert({ story_id: s.id, user_id: session.user.id }, { onConflict: 'story_id,user_id' }).then();
            });
          }
        } else {
          nav('/');
        }
      });
  }, [userId, session, nav]);

  useEffect(() => {
    if (stories.length === 0) return;
    setProgress(0);
    const current = stories[index];
    const duration = current.media_type === 'video' ? 15000 : 5000;
    const start = Date.now();
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      const p = (Date.now() - start) / duration;
      if (p >= 1) {
        window.clearInterval(timer.current!);
        if (index < stories.length - 1) {
          setIndex((i) => i + 1);
        } else {
          nav('/');
        }
      } else {
        setProgress(p);
      }
    }, 50);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [index, stories, nav]);

  function next() {
    if (index < stories.length - 1) setIndex((i) => i + 1);
    else nav('/');
  }
  function prev() {
    if (index > 0) setIndex((i) => i - 1);
  }

  async function toggleLike() {
    const s = stories[index];
    if (!s || !session) return;
    if (liked.has(s.id)) {
      setLiked((l) => { const n = new Set(l); n.delete(s.id); return n; });
    } else {
      setLiked((l) => new Set(l).add(s.id));
      await supabase.from('notifications').insert({
        user_id: s.user_id,
        actor_id: session.user.id,
        type: 'story_like',
        entity_id: s.id,
        entity_type: 'story',
      });
      toast('Liked story', 'success');
    }
  }

  async function sendReply() {
    const s = stories[index];
    if (!s || !session || !reply.trim()) return;
    await supabase.from('notifications').insert({
      user_id: s.user_id,
      actor_id: session.user.id,
      type: 'story_reply',
      entity_id: s.id,
      entity_type: 'story',
    });
    toast('Reply sent', 'success');
    setReply('');
  }

  if (stories.length === 0) return null;
  const s = stories[index];
  const profile = s.profiles;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex gap-1.5 px-3 pt-3 z-10">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-white" style={{ width: `${i < index ? 100 : i === index ? progress * 100 : 0}%` }} />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 px-3 py-3 z-10">
        <button onClick={() => nav('/')} className="p-2 rounded-full hover:bg-white/10 text-white">
          <ChevronLeft size={24} />
        </button>
        <Avatar src={profile?.avatar_url} username={profile?.username} size={36} />
        <div className="flex-1">
          <div className="text-white font-medium text-sm">{profile?.username}</div>
          <div className="text-white/60 text-xs">{timeAgo(s.created_at)}</div>
        </div>
        <button className="p-2 rounded-full hover:bg-white/10 text-white">
          <MoreHorizontal size={20} />
        </button>
        <button onClick={() => nav('/')} className="p-2 rounded-full hover:bg-white/10 text-white">
          <X size={22} />
        </button>
      </div>

      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          if (x < rect.width / 2) prev(); else next();
        }}
      >
        {s.media_type === 'video' && s.media_url ? (
          <video src={s.media_url} autoPlay playsInline muted className="w-full h-full object-cover" />
        ) : s.media_url ? (
          <img src={s.media_url} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-8 text-center" style={{ background: s.background || 'linear-gradient(135deg,#1f66f5,#ff4281)' }}>
            <p className="text-white text-2xl font-display font-semibold leading-snug">{s.text}</p>
          </div>
        )}
      </div>

      <div className="px-4 pb-6 pt-3 flex items-center gap-2 z-10">
        <div className="flex-1">
          <Input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={`Reply to ${profile?.username}...`}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
          />
        </div>
        <button onClick={toggleLike} className={`p-3 rounded-full ${liked.has(s.id) ? 'text-accent-500' : 'text-white'}`}>
          <Heart size={24} fill={liked.has(s.id) ? 'currentColor' : 'none'} />
        </button>
        <button onClick={sendReply} className="p-3 rounded-full text-white hover:bg-white/10">
          <Send size={24} />
        </button>
      </div>
    </div>
  );
}
