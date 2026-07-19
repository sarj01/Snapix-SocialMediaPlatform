import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Settings as SettingsIcon, Grid3x3, Film, Bookmark, ChevronLeft, MoreHorizontal, Link as LinkIcon, MapPin, Plus, Heart, Camera } from 'lucide-react';
import { supabase, uploadFile } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { Avatar, VerifiedBadge } from '../components/Avatar';
import { Button, EmptyState, Modal, Input, Textarea, Spinner } from '../components/ui';
import type { PostWithProfile, Profile, ReelWithProfile } from '../lib/types';
import { formatCount } from '../lib/utils';

type Tab = 'posts' | 'reels' | 'saved';

export default function ProfilePage() {
  const { username } = useParams();
  const { session, signOut } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [reels, setReels] = useState<ReelWithProfile[]>([]);
  const [saved, setSaved] = useState<PostWithProfile[]>([]);
  const [tab, setTab] = useState<Tab>('posts');
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isOwn = profile?.id === session?.user.id;

  const load = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    const { data: p } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle();
    if (!p) { setLoading(false); return; }
    setProfile(p as Profile);

    const [postsRes, reelsRes, followersRes, followingRes, followCheck] = await Promise.all([
      supabase.from('posts').select('*, profiles:profiles!posts_user_id_profiles_fkey(id,username,avatar_url,verified), post_media(*), likes(user_id), comments(id)').eq('user_id', p.id).order('created_at', { ascending: false }),
      supabase.from('reels').select('*, profiles:profiles!reels_user_id_profiles_fkey(id,username,avatar_url,verified), reel_likes(user_id)').eq('user_id', p.id).order('created_at', { ascending: false }),
      supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', p.id),
      supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', p.id),
      session ? supabase.from('follows').select('follower_id').eq('follower_id', session.user.id).eq('following_id', p.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    setPosts((postsRes.data as PostWithProfile[]) || []);
    setReels((reelsRes.data as ReelWithProfile[]) || []);
    setFollowers(followersRes.count || 0);
    setFollowing(followingRes.count || 0);
    setIsFollowing(!!followCheck.data);

    if (isOwn && session) {
      const { data: savedRows } = await supabase.from('saved_posts').select('post_id').eq('user_id', session.user.id);
      if (savedRows && savedRows.length > 0) {
        const ids = savedRows.map((s) => s.post_id);
        const { data: savedPosts } = await supabase.from('posts').select('*, profiles:profiles!posts_user_id_profiles_fkey(id,username,avatar_url,verified), post_media(*), likes(user_id), comments(id)').in('id', ids).order('created_at', { ascending: false });
        setSaved((savedPosts as PostWithProfile[]) || []);
      } else {
        setSaved([]);
      }
    }
    setLoading(false);
  }, [username, session, isOwn]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!profile) return;
    const ch = supabase
      .channel(`profile-${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts', filter: `user_id=eq.${profile.id}` }, () => load())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts', filter: `user_id=eq.${profile.id}` }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reels', filter: `user_id=eq.${profile.id}` }, () => load())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'reels', filter: `user_id=eq.${profile.id}` }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'follows' }, () => load())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'follows' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile, load]);

  async function toggleFollow() {
    if (!session || !profile) return;
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', session.user.id).eq('following_id', profile.id);
      setIsFollowing(false);
      setFollowers((f) => Math.max(0, f - 1));
    } else {
      await supabase.from('follows').insert({ follower_id: session.user.id, following_id: profile.id });
      await supabase.from('notifications').insert({ user_id: profile.id, actor_id: session.user.id, type: 'follow', entity_type: 'profile' });
      setIsFollowing(true);
      setFollowers((f) => f + 1);
    }
  }

  async function uploadAndUpdate(file: File | undefined, field: 'avatar_url' | 'cover_url', bucket: 'avatars' | 'covers') {
    if (!file || !profile) return;
    try {
      const url = await uploadFile(bucket, file);
      const { error } = await supabase.from('profiles').update({ [field]: url }).eq('id', profile.id);
      if (error) throw error;
      setProfile({ ...profile, [field]: url });
      toast('Updated', 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!profile) return <EmptyState icon={<span>?</span>} title="User not found" />;

  return (
    <div className="max-w-3xl mx-auto px-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => nav(-1)} className="p-2 rounded-full glass text-ink-700 dark:text-ink-200">
          <ChevronLeft size={20} />
        </button>
        <h1 className="font-display font-bold text-lg text-ink-900 dark:text-white">{profile.username}</h1>
        <button onClick={() => (isOwn ? setMenuOpen(true) : setEditOpen(true))} className="p-2 rounded-full glass text-ink-700 dark:text-ink-200">
          <MoreHorizontal size={20} />
        </button>
      </div>

      <div className="relative mb-16">
        <div className="relative rounded-3xl overflow-hidden h-36 glass">
          {profile.cover_url && <img src={profile.cover_url} className="w-full h-full object-cover" />}
          {isOwn && (
            <label className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-brand-500 hover:bg-brand-400 text-white flex items-center justify-center shadow-lg cursor-pointer transition-colors">
              <Camera size={15} />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadAndUpdate(e.target.files?.[0], 'cover_url', 'covers')} />
            </label>
          )}
        </div>
        <div className="absolute left-5 -bottom-10">
          <div className="relative">
            <Avatar src={profile.avatar_url} username={profile.username} size={88} ring="story" />
            {isOwn && (
              <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand-500 hover:bg-brand-400 text-white flex items-center justify-center shadow-lg cursor-pointer transition-colors ring-2 ring-white dark:ring-ink-950">
                <Camera size={13} />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadAndUpdate(e.target.files?.[0], 'avatar_url', 'avatars')} />
              </label>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="font-display text-xl font-bold text-ink-900 dark:text-white">{profile.full_name || profile.username}</h2>
            {profile.verified && <VerifiedBadge />}
          </div>
          <p className="text-sm text-ink-500">@{profile.username}</p>
        </div>
        {isOwn ? (
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>Edit profile</Button>
        ) : (
          <Button variant={isFollowing ? 'secondary' : 'primary'} size="sm" onClick={toggleFollow}>
            {isFollowing ? 'Following' : 'Follow'}
          </Button>
        )}
      </div>

      {profile.bio && <p className="text-sm text-ink-800 dark:text-ink-100 mb-2 whitespace-pre-wrap">{profile.bio}</p>}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-500 mb-2">
        {profile.website && <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand-500 hover:underline"><LinkIcon size={14} /> {profile.website}</a>}
        {profile.location && <span className="flex items-center gap-1"><MapPin size={14} /> {profile.location}</span>}
      </div>

      <div className="flex gap-6 mb-4 text-sm">
        <div><span className="font-bold text-ink-900 dark:text-white">{formatCount(posts.length)}</span> <span className="text-ink-500">posts</span></div>
        <div><span className="font-bold text-ink-900 dark:text-white">{formatCount(followers)}</span> <span className="text-ink-500">followers</span></div>
        <div><span className="font-bold text-ink-900 dark:text-white">{formatCount(following)}</span> <span className="text-ink-500">following</span></div>
      </div>

      {profile.interests && profile.interests.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {profile.interests.map((t) => (
            <span key={t} className="px-3 py-1 rounded-full glass text-xs text-ink-600 dark:text-ink-300">{t}</span>
          ))}
        </div>
      )}

      <div className="flex border-b border-white/10 mb-3">
        {([
          ['posts', Grid3x3, 'Posts'],
          ['reels', Film, 'Reels'],
          ...(isOwn ? [['saved', Bookmark, 'Saved'] as const] : []),
        ] as const).map(([k, Icon, label]) => (
          <button
            key={k}
            onClick={() => setTab(k as Tab)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              tab === k ? 'text-brand-400 border-b-2 border-brand-400 -mb-px' : 'text-ink-500'
            }`}
          >
            <Icon size={18} /> {label}
          </button>
        ))}
      </div>

      {tab === 'posts' && (
        posts.length === 0 ? (
          <EmptyState icon={<Grid3x3 size={32} />} title={isOwn ? 'Share your first post' : 'No posts yet'} description={isOwn ? 'Tap create to share a photo or video.' : undefined} action={isOwn ? <Button onClick={() => nav('/create')}>Create</Button> : undefined} />
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {posts.map((p) => {
              const m = p.post_media[0];
              return (
                <Link key={p.id} to={`/?p=${p.id}`} className="aspect-square rounded-lg overflow-hidden glass relative group">
                  {m?.media_type === 'video' ? <video src={m.media_url} className="w-full h-full object-cover" muted /> : <img src={m?.media_url} className="w-full h-full object-cover" />}
                </Link>
              );
            })}
          </div>
        )
      )}

      {tab === 'reels' && (
        reels.length === 0 ? (
          <EmptyState icon={<Film size={32} />} title="No reels yet" />
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {reels.map((r) => (
              <button key={r.id} onClick={() => nav('/reels')} className="aspect-[9/16] rounded-lg overflow-hidden glass relative">
                <video src={r.video_url} className="w-full h-full object-cover" muted />
                <div className="absolute bottom-1 left-1 text-white text-xs flex items-center gap-1"><Heart size={12} fill="currentColor" /> {r.reel_likes.length}</div>
              </button>
            ))}
          </div>
        )
      )}

      {tab === 'saved' && (
        saved.length === 0 ? (
          <EmptyState icon={<Bookmark size={32} />} title="Nothing saved yet" description="Tap the bookmark on any post to save it here." />
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {saved.map((p) => {
              const m = p.post_media[0];
              return (
                <Link key={p.id} to={`/?p=${p.id}`} className="aspect-square rounded-lg overflow-hidden glass">
                  {m?.media_type === 'video' ? <video src={m.media_url} className="w-full h-full object-cover" muted /> : <img src={m?.media_url} className="w-full h-full object-cover" />}
                </Link>
              );
            })}
          </div>
        )
      )}

      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} profile={profile} onSaved={load} />

      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu">
        <div className="space-y-1">
          <button onClick={() => { setMenuOpen(false); nav('/settings'); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-white/5 text-ink-700 dark:text-ink-200 text-sm">
            <SettingsIcon size={18} /> Settings
          </button>
          <button onClick={() => { setMenuOpen(false); signOut(); nav('/welcome'); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-rose-500/10 text-rose-400 text-sm">
            Log out
          </button>
        </div>
      </Modal>
    </div>
  );
}

function EditProfileModal({ open, onClose, profile, onSaved }: { open: boolean; onClose: () => void; profile: Profile; onSaved: () => void }) {
  const { refreshProfile } = useAuth();
  const toast = useToast();
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [website, setWebsite] = useState(profile.website || '');
  const [location, setLocation] = useState(profile.location || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile.full_name || '');
    setBio(profile.bio || '');
    setWebsite(profile.website || '');
    setLocation(profile.location || '');
    setAvatarUrl(profile.avatar_url);
    setAvatarFile(null);
  }, [profile, open]);

  async function save() {
    setSaving(true);
    let url = avatarUrl;
    if (avatarFile) {
      try {
        const { uploadFile } = await import('../lib/supabase');
        url = await uploadFile('avatars', avatarFile);
      } catch { toast('Upload failed', 'error'); }
    }
    const { error } = await supabase.from('profiles').update({
      full_name: fullName.trim() || profile.username,
      bio: bio.trim(),
      website: website.trim(),
      location: location.trim(),
      avatar_url: url,
    }).eq('id', profile.id);
    setSaving(false);
    if (error) return toast(error.message, 'error');
    await refreshProfile();
    toast('Profile updated', 'success');
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit profile">
      <div className="flex flex-col items-center mb-4">
        <label className="cursor-pointer relative group">
          <Avatar src={avatarUrl} username={profile.username} size={80} />
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white">
            <Plus size={20} />
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setAvatarFile(f); setAvatarUrl(URL.createObjectURL(f)); } }} />
        </label>
      </div>
      <div className="space-y-3">
        <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Textarea label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
        <Input label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
        <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <Button full onClick={save} loading={saving}>Save</Button>
      </div>
    </Modal>
  );
}
