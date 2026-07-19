import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate, Link } from 'react-router-dom';
import { Home, Compass, Film, PlusSquare, MessageCircle, User, Bell, Search as SearchIcon } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Avatar } from '../components/Avatar';
import { Logo, Wordmark } from '../components/Logo';
import { FullScreenLoader } from '../components/ui';
import { supabase } from '../lib/supabase';
import type { StoryWithProfile } from '../lib/types';

const HomeFeed = lazy(() => import('./HomeFeed'));
const Explore = lazy(() => import('./Explore'));
const Reels = lazy(() => import('./Reels'));
const Messages = lazy(() => import('./Messages'));
const Notifications = lazy(() => import('./Notifications'));
const Profile = lazy(() => import('./Profile'));
const Create = lazy(() => import('./Create'));
const Settings = lazy(() => import('./Settings'));
const StoryViewer = lazy(() => import('./StoryViewer'));
const CreateStory = lazy(() => import('./CreateStory'));

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/explore', icon: Compass, label: 'Explore' },
  { to: '/create', icon: PlusSquare, label: 'Create', accent: true },
  { to: '/reels', icon: Film, label: 'Reels' },
  { to: '/messages', icon: MessageCircle, label: 'Messages' },
];

function AvatarBar() {
  const { profile, session } = useAuth();
  const nav = useNavigate();
  const [stories, setStories] = useState<StoryWithProfile[]>([]);
  const loc = useLocation();

  useEffect(() => {
    let active = true;
    function fetchStories() {
      supabase
        .from('stories')
        .select('*, profiles:profiles!stories_user_id_profiles_fkey(id,username,avatar_url), story_views(user_id)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (!active || !data) return;
          const grouped = new Map<string, StoryWithProfile>();
          for (const s of data as StoryWithProfile[]) {
            const uid = s.user_id;
            if (!grouped.has(uid)) grouped.set(uid, s);
          }
          setStories(Array.from(grouped.values()));
        });
    }
    fetchStories();
    const ch = supabase.channel('stories-bar')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stories' }, fetchStories)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'stories' }, fetchStories)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [loc.pathname]);

  if (!profile) return null;

  return (
    <div className="px-3 py-3 overflow-x-auto no-scrollbar">
      <div className="flex gap-4 items-center min-w-min">
        <button
          onClick={() => nav('/stories/new')}
          className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
        >
          <div className="relative">
            <Avatar src={profile.avatar_url} username={profile.username} size={62} />
            <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 flex items-center justify-center ring-2 ring-ink-950 dark:ring-ink-950 light:ring-white">
              <PlusSquare size={14} className="text-white" />
            </div>
          </div>
          <span className="text-[11px] text-ink-600 dark:text-ink-300 max-w-[64px] truncate">Your story</span>
        </button>

        {stories.map((s) => {
          const seen = s.story_views?.some((v) => v.user_id === session?.user.id) || s.user_id === session?.user.id;
          return (
            <button
              key={s.id}
              onClick={() => nav(`/stories?u=${s.user_id}`)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
            >
              <Avatar src={s.profiles?.avatar_url} username={s.profiles?.username} size={62} ring={seen ? 'seen' : 'story'} />
              <span className="text-[11px] text-ink-600 dark:text-ink-300 max-w-[64px] truncate">{s.profiles?.username}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TopBar() {
  const loc = useLocation();
  const nav = useNavigate();
  const { profile } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('read', false)
      .eq('user_id', profile?.id || '')
      .then(({ count }) => setUnread(count || 0));
  }, [profile?.id, loc.pathname]);

  if (loc.pathname === '/reels' || loc.pathname.startsWith('/stories')) return null;

  return (
    <header className="sticky top-0 z-30 px-4 pt-3 pb-2 backdrop-blur-xl bg-ink-950/30 dark:bg-ink-950/30 light:bg-white/40 border-b border-white/5">
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Logo size={32} />
          <Wordmark size={22} />
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={() => nav('/explore')}
            className="p-2.5 rounded-full glass text-ink-700 dark:text-ink-200 hover:scale-110 transition-transform"
            aria-label="Search"
          >
            <SearchIcon size={18} />
          </button>
          <button
            onClick={() => nav('/notifications')}
            className="relative p-2.5 rounded-full glass text-ink-700 dark:text-ink-200 hover:scale-110 transition-transform"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          <Link to={`/u/${profile?.username}`} className="ml-1">
            <Avatar src={profile?.avatar_url} username={profile?.username} size={36} />
          </Link>
        </div>
      </div>
    </header>
  );
}

function BottomNav() {
  const loc = useLocation();
  const nav = useNavigate();
  const { profile } = useAuth();

  if (loc.pathname === '/reels' || loc.pathname.startsWith('/stories') || loc.pathname === '/create' || loc.pathname === '/messages') return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 pb-safe">
      <div className="mx-auto max-w-md px-3 pb-2">
        <div className="glass-strong rounded-3xl px-2 py-2 flex items-center justify-around shadow-glow">
          {navItems.map((item) => {
            const active = loc.pathname === item.to || (item.to === '/' && loc.pathname === '/');
            const Icon = item.icon;
            return (
              <button
                key={item.to}
                onClick={() => nav(item.to)}
                className={`relative p-2.5 rounded-2xl transition-all active:scale-90 ${
                  active ? 'text-brand-400' : 'text-ink-500 dark:text-ink-400 hover:text-ink-200'
                }`}
                aria-label={item.label}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                {active && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-400" />
                )}
              </button>
            );
          })}
          <button
            onClick={() => nav(`/u/${profile?.username}`)}
            className={`p-2.5 rounded-2xl transition-all active:scale-90 ${
              loc.pathname === `/u/${profile?.username}` ? 'text-brand-400' : 'text-ink-500 dark:text-ink-400'
            }`}
            aria-label="Profile"
          >
            <User size={22} strokeWidth={loc.pathname === `/u/${profile?.username}` ? 2.5 : 2} />
          </button>
        </div>
      </div>
    </nav>
  );
}

export default function AppShell() {
  const loc = useLocation();
  const showAvatarBar = loc.pathname === '/';

  return (
    <div className="min-h-screen">
      <TopBar />
      {showAvatarBar && <AvatarBar />}
      <main className="pb-24">
        <Suspense fallback={<FullScreenLoader />}>
          <Routes>
            <Route path="/" element={<HomeFeed />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/reels" element={<Reels />} />
            <Route path="/messages/*" element={<Messages />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/u/:username" element={<Profile />} />
            <Route path="/u/:username/saved" element={<Profile />} />
            <Route path="/create/*" element={<Create />} />
            <Route path="/settings/*" element={<Settings />} />
            <Route path="/stories" element={<StoryViewer />} />
            <Route path="/stories/new" element={<CreateStory />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <BottomNav />
    </div>
  );
}
