import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, TrendingUp, Hash, UserPlus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Avatar } from '../components/Avatar';
import { Button, EmptyState, Spinner } from '../components/ui';
import type { PostWithProfile, Profile, ReelWithProfile } from '../lib/types';

export default function Explore() {
  const { session } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'top' | 'people' | 'tags' | 'posts' | 'reels'>('top');
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [reels, setReels] = useState<ReelWithProfile[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [followed, setFollowed] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      supabase.from('posts').select('*, profiles:profiles!posts_user_id_profiles_fkey(id,username,avatar_url,verified), post_media(*), likes(user_id), comments(id)').order('created_at', { ascending: false }).limit(60),
      supabase.from('reels').select('*, profiles:profiles!reels_user_id_profiles_fkey(id,username,avatar_url,verified), reel_likes(user_id)').order('created_at', { ascending: false }).limit(20),
      supabase.from('profiles').select('*').neq('id', session?.user.id || '').limit(40),
    ]).then(([p, r, pe]) => {
      if (p.data) setPosts(p.data as PostWithProfile[]);
      if (r.data) setReels(r.data as ReelWithProfile[]);
      if (pe.data) setPeople(pe.data as Profile[]);
      setLoading(false);
    });
  }, [session]);

  useEffect(() => {
    if (!session) return;
    supabase.from('follows').select('following_id').eq('follower_id', session.user.id).then(({ data }) => {
      if (data) setFollowed(new Set(data.map((d) => d.following_id)));
    });
  }, [session]);

  const filteredPosts = useMemo(() => {
    if (!q.trim()) return posts;
    const query = q.toLowerCase();
    return posts.filter(
      (p) => p.caption?.toLowerCase().includes(query) || p.profiles?.username.toLowerCase().includes(query) || p.location?.toLowerCase().includes(query),
    );
  }, [posts, q]);

  const filteredPeople = useMemo(() => {
    if (!q.trim()) return people;
    const query = q.toLowerCase();
    return people.filter((p) => p.username.toLowerCase().includes(query) || (p.full_name || '').toLowerCase().includes(query));
  }, [people, q]);

  const tags = useMemo(() => {
    const map = new Map<string, number>();
    posts.forEach((p) => {
      const matches = p.caption?.match(/#(\w+)/g) || [];
      matches.forEach((m) => {
        const t = m.slice(1).toLowerCase();
        map.set(t, (map.get(t) || 0) + 1);
      });
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [posts]);

  async function toggleFollow(id: string) {
    if (!session) return;
    if (followed.has(id)) {
      await supabase.from('follows').delete().eq('follower_id', session.user.id).eq('following_id', id);
      setFollowed((s) => { const n = new Set(s); n.delete(id); return n; });
    } else {
      await supabase.from('follows').insert({ follower_id: session.user.id, following_id: id });
      await supabase.from('notifications').insert({ user_id: id, actor_id: session.user.id, type: 'follow', entity_type: 'profile' });
      setFollowed((s) => new Set(s).add(id));
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4">
      <div className="relative mb-4">
        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" size={18} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Snapix — people, tags, posts"
          className="w-full glass rounded-2xl pl-11 pr-10 py-3 text-ink-900 dark:text-white placeholder:text-ink-400 focus:ring-2 focus:ring-brand-400"
        />
        {q && (
          <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-200">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
        {([
          ['top', 'Top'],
          ['posts', 'Posts'],
          ['reels', 'Reels'],
          ['people', 'People'],
          ['tags', 'Tags'],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              tab === k ? 'bg-gradient-to-r from-brand-500 to-accent-500 text-white shadow-glow' : 'glass text-ink-600 dark:text-ink-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <>
          {(tab === 'top' || tab === 'posts') && (
            filteredPosts.length === 0 ? (
              <EmptyState icon={<SearchIcon size={32} />} title="No posts found" description="Try a different search or explore later." />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                {filteredPosts.map((p) => {
                  const m = p.post_media[0];
                  return (
                    <Link key={p.id} to={`/?p=${p.id}`} className="aspect-square rounded-xl overflow-hidden glass relative group">
                      {m?.media_type === 'video' ? (
                        <video src={m.media_url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={m?.media_url} className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end p-2">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs flex items-center gap-2">
                          <span>♥ {p.likes.length}</span>
                          <span>💬 {p.comments.length}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )
          )}

          {tab === 'reels' && (
            reels.length === 0 ? (
              <EmptyState icon={<TrendingUp size={32} />} title="No reels yet" description="Reels will appear here once creators share them." />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {reels.map((r) => (
                  <button key={r.id} onClick={() => nav('/reels')} className="aspect-[9/16] rounded-2xl overflow-hidden glass relative group">
                    <video src={r.video_url} className="w-full h-full object-cover" muted />
                    <div className="absolute bottom-2 left-2 text-white text-xs font-medium flex items-center gap-1">
                      ♥ {r.reel_likes.length}
                    </div>
                  </button>
                ))}
              </div>
            )
          )}

          {tab === 'people' && (
            filteredPeople.length === 0 ? (
              <EmptyState icon={<UserPlus size={32} />} title="No people found" description="Invite friends to join Snapix." />
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {filteredPeople.map((p) => (
                  <div key={p.id} className="glass rounded-2xl p-3 flex items-center gap-3">
                    <Avatar src={p.avatar_url} username={p.username} size={48} to={`/u/${p.username}`} />
                    <div className="flex-1 min-w-0">
                      <Link to={`/u/${p.username}`} className="font-medium text-ink-900 dark:text-white block truncate">{p.username}</Link>
                      <p className="text-xs text-ink-500 truncate">{p.full_name || p.bio || 'On Snapix'}</p>
                    </div>
                    <Button size="sm" variant={followed.has(p.id) ? 'secondary' : 'primary'} onClick={() => toggleFollow(p.id)}>
                      {followed.has(p.id) ? 'Following' : 'Follow'}
                    </Button>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'tags' && (
            tags.length === 0 ? (
              <EmptyState icon={<Hash size={32} />} title="No trending tags yet" description="As posts get tagged, trends will appear here." />
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {tags.map(([tag, count]) => (
                  <button key={tag} onClick={() => setQ(`#${tag}`)} className="glass rounded-2xl p-4 flex items-center gap-3 text-left hover:bg-white/15 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white">
                      <Hash size={18} />
                    </div>
                    <div>
                      <div className="font-medium text-ink-900 dark:text-white">#{tag}</div>
                      <div className="text-xs text-ink-500">{count} post{count > 1 ? 's' : ''}</div>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
