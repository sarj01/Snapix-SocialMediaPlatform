import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ChevronLeft, ChevronRight, MapPin, Trash2, Flag, EyeOff, Link2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { Avatar, VerifiedBadge } from '../components/Avatar';
import { Button, EmptyState, Modal, Textarea, Spinner } from '../components/ui';
import { useDoubleTapLike, LikeBurstOverlay } from '../components/LikeBurst';
import type { PostWithProfile, Comment } from '../lib/types';
import { timeAgo } from '../lib/utils';

const PAGE = 8;

export default function HomeFeed() {
  const { session } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [commentOpen, setCommentOpen] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  const load = useCallback(async (offset: number) => {
    const { data, error } = await supabase
      .from('posts')
      .select(
        '*, profiles:profiles!posts_user_id_profiles_fkey(id,username,avatar_url,verified), post_media(*), likes(user_id), comments(id)',
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (error) {
      toast(error.message, 'error');
      return null;
    }
    return data as PostWithProfile[];
  }, [toast]);

  useEffect(() => {
    load(0).then((d) => {
      if (d) {
        setPosts(d);
        setHasMore(d.length === PAGE);
      }
      setLoading(false);
    });
  }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel('posts-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        const newPost = payload.new as { id: string; user_id: string };
        if (!newPost.id) return;
        supabase
          .from('posts')
          .select('*, profiles:profiles!posts_user_id_profiles_fkey(id,username,avatar_url,verified), post_media(*), likes(user_id), comments(id)')
          .eq('id', newPost.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              setPosts((prev) => (prev.some((p) => p.id === data.id) ? prev : [data as PostWithProfile, ...prev]));
            }
          });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
        const oldId = (payload.old as { id: string })?.id;
        if (oldId) setPosts((prev) => prev.filter((p) => p.id !== oldId));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (!sentinel.current || !hasMore) return;
    const ob = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingMore) {
        setLoadingMore(true);
        load(posts.length).then((d) => {
          if (d) {
            setPosts((p) => [...p, ...d]);
            setHasMore(d.length === PAGE);
          }
          setLoadingMore(false);
        });
      }
    });
    ob.observe(sentinel.current);
    return () => ob.disconnect();
  }, [posts.length, hasMore, loadingMore, load]);

  async function toggleLike(postId: string) {
    if (!session) return;
    const existing = posts.find((p) => p.id === postId)?.likes.some((l) => l.user_id === session.user.id);
    if (existing) {
      await supabase.from('likes').delete().eq('user_id', session.user.id).eq('post_id', postId);
      setPosts((ps) =>
        ps.map((p) => (p.id === postId ? { ...p, likes: p.likes.filter((l) => l.user_id !== session.user.id) } : p)),
      );
    } else {
      await supabase.from('likes').insert({ user_id: session.user.id, post_id: postId });
      const post = posts.find((p) => p.id === postId);
      if (post && post.user_id !== session.user.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          actor_id: session.user.id,
          type: 'like',
          entity_id: postId,
          entity_type: 'post',
        });
      }
      setPosts((ps) => ps.map((p) => (p.id === postId ? { ...p, likes: [...p.likes, { user_id: session.user.id }] } : p)));
    }
  }

  async function doubleTap(postId: string) {
    const already = posts.find((p) => p.id === postId)?.likes.some((l) => l.user_id === session?.user.id);
    if (!already) toggleLike(postId);
  }

  async function toggleSave(postId: string) {
    if (!session) return;
    const { data } = await supabase.from('saved_posts').select('post_id').eq('user_id', session.user.id).eq('post_id', postId).maybeSingle();
    if (data) {
      await supabase.from('saved_posts').delete().eq('user_id', session.user.id).eq('post_id', postId);
      toast('Removed from saved', 'info');
    } else {
      await supabase.from('saved_posts').insert({ user_id: session.user.id, post_id: postId });
      toast('Saved', 'success');
    }
  }

  async function deletePost(postId: string) {
    await supabase.from('posts').delete().eq('id', postId).eq('user_id', session?.user.id || '');
    setPosts((p) => p.filter((x) => x.id !== postId));
    setMenuOpen(null);
    toast('Post deleted', 'info');
  }

  async function copyLink(postId: string) {
    const url = `${window.location.origin}/?p=${postId}`;
    await navigator.clipboard.writeText(url);
    setMenuOpen(null);
    toast('Link copied', 'success');
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  if (posts.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4">
        <EmptyState
          icon={<Heart size={32} />}
          title="Your feed is quiet"
          description="When people you follow post, their photos and videos will show up here. Explore to discover creators."
          action={<Button onClick={() => nav('/explore')} variant="primary">Explore Snapix</Button>}
        />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-0 sm:px-4 space-y-4 sm:space-y-6">
      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          onLike={() => toggleLike(p.id)}
          onDoubleTap={() => doubleTap(p.id)}
          onSave={() => toggleSave(p.id)}
          onComment={() => setCommentOpen(p.id)}
          onMenu={() => setMenuOpen(p.id)}
        />
      ))}
      <div ref={sentinel} className="h-10" />
      {loadingMore && <div className="flex justify-center py-4"><Spinner /></div>}
      {!hasMore && posts.length > 0 && (
        <p className="text-center text-xs text-ink-400 py-4">You're all caught up</p>
      )}

      <CommentSheet
        postId={commentOpen}
        onClose={() => setCommentOpen(null)}
      />

      <Modal open={!!menuOpen} onClose={() => setMenuOpen(null)} title="Post options">
        {menuOpen && (
          <div className="space-y-1">
            {posts.find((p) => p.id === menuOpen)?.user_id === session?.user.id ? (
              <button onClick={() => deletePost(menuOpen)} className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-rose-500/10 text-rose-400 text-sm">
                <Trash2 size={18} /> Delete post
              </button>
            ) : (
              <>
                <button onClick={() => { setMenuOpen(null); toast('Reported to moderation', 'info'); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-white/5 text-ink-700 dark:text-ink-200 text-sm">
                  <Flag size={18} /> Report
                </button>
                <button onClick={() => setMenuOpen(null)} className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-white/5 text-ink-700 dark:text-ink-200 text-sm">
                  <EyeOff size={18} /> Not interested
                </button>
              </>
            )}
            <button onClick={() => copyLink(menuOpen)} className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-white/5 text-ink-700 dark:text-ink-200 text-sm">
              <Link2 size={18} /> Copy link
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function PostCard({
  post,
  onLike,
  onDoubleTap,
  onSave,
  onComment,
  onMenu,
}: {
  post: PostWithProfile;
  onLike: () => void;
  onDoubleTap: () => void;
  onSave: () => void;
  onComment: () => void;
  onMenu: () => void;
}) {
  const [mediaIndex, setMediaIndex] = useState(0);
  const media = post.post_media.sort((a, b) => a.position - b.position);
  const liked = post.likes.length > 0;
  const profile = post.profiles;
  const { bursts, handleTap } = useDoubleTapLike(onDoubleTap);

  return (
    <article className="glass-card overflow-hidden animate-slide-up">
      <div className="flex items-center gap-3 p-3">
        <Avatar src={profile?.avatar_url} username={profile?.username} size={40} to={`/u/${profile?.username}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <Link to={`/u/${profile?.username}`} className="font-medium text-sm text-ink-900 dark:text-white hover:underline truncate">
              {profile?.username}
            </Link>
            {profile?.verified && <VerifiedBadge />}
          </div>
          {post.location && (
            <div className="flex items-center gap-1 text-[11px] text-ink-500">
              <MapPin size={10} /> {post.location}
            </div>
          )}
        </div>
        <button onClick={onMenu} className="p-2 rounded-full hover:bg-white/10 text-ink-500">
          <MoreHorizontal size={20} />
        </button>
      </div>

      <div className="relative aspect-square bg-ink-900/50 select-none" onClick={handleTap}>
        {media[mediaIndex]?.media_type === 'video' ? (
          <video src={media[mediaIndex]?.media_url} className="w-full h-full object-cover" controls playsInline />
        ) : (
          <img src={media[mediaIndex]?.media_url} alt={media[mediaIndex]?.alt_text || ''} className="w-full h-full object-cover" />
        )}
        <LikeBurstOverlay bursts={bursts} />
        {media.length > 1 && (
          <>
            {mediaIndex > 0 && (
              <button onClick={(e) => { e.stopPropagation(); setMediaIndex((i) => i - 1); }} className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white">
                <ChevronLeft size={20} />
              </button>
            )}
            {mediaIndex < media.length - 1 && (
              <button onClick={(e) => { e.stopPropagation(); setMediaIndex((i) => i + 1); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white">
                <ChevronRight size={20} />
              </button>
            )}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {media.map((_, i) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === mediaIndex ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/40 text-white text-[10px] font-medium">
              {mediaIndex + 1}/{media.length}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-1 px-3 py-2">
        <button onClick={onLike} className={`p-2 rounded-full hover:bg-white/10 transition-colors ${liked ? 'text-accent-500' : 'text-ink-700 dark:text-ink-200'}`} aria-label="Like">
          <Heart size={22} fill={liked ? 'currentColor' : 'none'} className={liked ? 'animate-pop' : ''} />
        </button>
        <button onClick={onComment} className="p-2 rounded-full hover:bg-white/10 text-ink-700 dark:text-ink-200" aria-label="Comment">
          <MessageCircle size={22} />
        </button>
        <button className="p-2 rounded-full hover:bg-white/10 text-ink-700 dark:text-ink-200" aria-label="Share">
          <Send size={22} />
        </button>
        <button onClick={onSave} className="ml-auto p-2 rounded-full hover:bg-white/10 text-ink-700 dark:text-ink-200" aria-label="Save">
          <Bookmark size={22} />
        </button>
      </div>

      <div className="px-3 pb-3">
        {post.likes.length > 0 && (
          <p className="text-xs font-medium text-ink-700 dark:text-ink-200 mb-1">{post.likes.length} like{post.likes.length > 1 ? 's' : ''}</p>
        )}
        {post.caption && (
          <p className="text-sm text-ink-800 dark:text-ink-100 leading-snug">
            <Link to={`/u/${profile?.username}`} className="font-medium mr-1.5">{profile?.username}</Link>
            {post.caption}
          </p>
        )}
        {post.comments.length > 0 && (
          <button onClick={onComment} className="mt-1 text-xs text-ink-500 hover:underline">
            View all {post.comments.length} comments
          </button>
        )}
        <p className="mt-1 text-[11px] text-ink-400">{timeAgo(post.created_at)}</p>
      </div>
    </article>
  );
}

function CommentSheet({ postId, onClose }: { postId: string | null; onClose: () => void }) {
  const { session, profile } = useAuth();
  const toast = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    supabase
      .from('comments')
      .select('*, profiles:profiles!comments_user_id_profiles_fkey(id,username,avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        const flat = (data as Comment[]) || [];
        const map = new Map<string, Comment>();
        flat.forEach((c) => map.set(c.id, { ...c, replies: [] }));
        const roots: Comment[] = [];
        flat.forEach((c) => {
          if (c.parent_id && map.has(c.parent_id)) {
            map.get(c.parent_id)!.replies!.push(c);
          } else {
            roots.push(map.get(c.id)!);
          }
        });
        setComments(roots);
        setLoading(false);
      });
  }, [postId]);

  async function submit() {
    if (!session || !postId || !text.trim()) return;
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: session.user.id, text: text.trim(), parent_id: replyTo })
      .select('*, profiles:profiles!comments_user_id_profiles_fkey(id,username,avatar_url)')
      .single();
    if (error) return toast(error.message, 'error');
    if (replyTo) {
      setComments((cs) => cs.map((c) => (c.id === replyTo ? { ...c, replies: [...(c.replies || []), data as Comment] } : c)));
    } else {
      setComments((cs) => [...cs, { ...(data as Comment), replies: [] }]);
    }
    setText('');
    setReplyTo(null);
  }

  return (
    <Modal open={!!postId} onClose={onClose} title="Comments">
      <div className="space-y-3 max-h-[50vh] overflow-y-auto mb-3">
        {loading && <div className="flex justify-center py-6"><Spinner /></div>}
        {!loading && comments.length === 0 && (
          <p className="text-center text-sm text-ink-400 py-6">No comments yet. Be the first.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <Avatar src={c.profiles?.avatar_url} username={c.profiles?.username} size={32} to={`/u/${c.profiles?.username}`} />
            <div className="flex-1">
              <p className="text-sm text-ink-800 dark:text-ink-100">
                <Link to={`/u/${c.profiles?.username}`} className="font-medium mr-1.5">{c.profiles?.username}</Link>
                {c.text}
              </p>
              <div className="flex items-center gap-3 mt-0.5 text-[11px] text-ink-400">
                <span>{timeAgo(c.created_at)}</span>
                <button onClick={() => setReplyTo(c.id)} className="hover:text-ink-200">Reply</button>
              </div>
              {c.replies && c.replies.length > 0 && (
                <div className="mt-2 space-y-2 pl-3 border-l border-white/10">
                  {c.replies.map((r) => (
                    <div key={r.id} className="flex gap-2">
                      <Avatar src={r.profiles?.avatar_url} username={r.profiles?.username} size={26} to={`/u/${r.profiles?.username}`} />
                      <p className="text-sm text-ink-800 dark:text-ink-100">
                        <Link to={`/u/${r.profiles?.username}`} className="font-medium mr-1.5">{r.profiles?.username}</Link>
                        {r.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 items-end">
        <Avatar src={profile?.avatar_url} username={profile?.username} size={32} />
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={1}
          placeholder={replyTo ? 'Reply...' : 'Add a comment...'}
          className="flex-1"
        />
        <Button onClick={submit} disabled={!text.trim()}>Post</Button>
      </div>
    </Modal>
  );
}
