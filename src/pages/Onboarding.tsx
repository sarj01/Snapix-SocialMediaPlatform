import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Textarea, FullScreenLoader } from '../components/ui';
import { Avatar } from '../components/Avatar';
import { Logo } from '../components/Logo';
import { supabase, uploadFile } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import type { Interest, Profile } from '../lib/types';
import { Camera, Check, ChevronRight, Sparkles, Users, Search } from 'lucide-react';

const STEPS = ['interests', 'profile', 'creators', 'done'] as const;
type Step = (typeof STEPS)[number];

export default function Onboarding() {
  const { session, profile, refreshProfile } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState<Step>('interests');
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [fullName, setFullName] = useState(profile?.full_name || profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!session) {
      nav('/welcome');
    }
  }, [session, nav]);

  useEffect(() => {
    supabase.from('interests').select('*').order('name').then(({ data }) => {
      if (data) setInterests(data as Interest[]);
    });
  }, []);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .neq('id', session?.user?.id || '')
      .limit(30)
      .then(({ data }) => {
        if (data) setProfiles(data as Profile[]);
      });
  }, [session]);

  const filteredProfiles = useMemo(() => {
    if (!search.trim()) return profiles;
    const q = search.toLowerCase();
    return profiles.filter(
      (p) => p.username.toLowerCase().includes(q) || (p.full_name || '').toLowerCase().includes(q),
    );
  }, [profiles, search]);

  function toggleInterest(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function toggleFollow(id: string) {
    if (!session) return;
    if (followed.has(id)) {
      await supabase.from('follows').delete().eq('follower_id', session.user.id).eq('following_id', id);
      setFollowed((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    } else {
      await supabase.from('follows').insert({ follower_id: session.user.id, following_id: id });
      await supabase.from('notifications').insert({
        user_id: id,
        actor_id: session.user.id,
        type: 'follow',
        entity_type: 'profile',
      });
      setFollowed((s) => new Set(s).add(id));
    }
  }

  async function saveInterests() {
    if (!session || selected.length === 0) {
      setStep('profile');
      return;
    }
    setSaving(true);
    const rows = selected.map((id) => ({ user_id: session.user.id, interest_id: id }));
    await supabase.from('user_interests').upsert(rows, { onConflict: 'user_id,interest_id', ignoreDuplicates: true });
    const names = interests.filter((i) => selected.includes(i.id)).map((i) => i.name);
    await supabase.from('profiles').update({ interests: names }).eq('id', session.user.id);
    setSaving(false);
    setStep('profile');
  }

  async function saveProfile() {
    if (!session) return;
    setSaving(true);
    let finalAvatar = avatarUrl;
    if (avatarFile) {
      try {
        finalAvatar = await uploadFile('avatars', avatarFile);
      } catch {
        toast('Avatar upload failed', 'error');
      }
    }
    await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() || profile?.username, bio: bio.trim(), avatar_url: finalAvatar })
      .eq('id', session.user.id);
    await refreshProfile();
    setSaving(false);
    setStep('creators');
  }

  async function finish() {
    await refreshProfile();
    toast('Welcome to Snapix!', 'success');
    nav('/');
  }

  if (!session) return <FullScreenLoader />;

  const progress = STEPS.indexOf(step) / (STEPS.length - 1);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 px-5 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <Logo size={32} />
          <span className="font-display font-bold text-lg text-ink-900 dark:text-white">Snapix</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-500"
            style={{ width: `${Math.max(8, progress * 100)}%` }}
          />
        </div>
      </header>

      <main className="flex-1 px-5 pb-6 overflow-y-auto">
        {step === 'interests' && (
          <div className="animate-fade-in max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <Sparkles className="mx-auto text-brand-400 mb-2" />
              <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Choose your interests</h1>
              <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">We'll personalize your feed. Pick a few to start.</p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {interests.map((it) => {
                const on = selected.includes(it.id);
                return (
                  <button
                    key={it.id}
                    onClick={() => toggleInterest(it.id)}
                    className={`px-4 py-3 rounded-2xl flex items-center gap-2 transition-all active:scale-95 ${
                      on
                        ? 'bg-gradient-to-r from-brand-500 to-accent-500 text-white shadow-glow'
                        : 'glass text-ink-700 dark:text-ink-200 hover:bg-white/15'
                    }`}
                  >
                    <span className="text-lg">{it.emoji}</span>
                    <span className="font-medium text-sm">{it.name}</span>
                    {on && <Check size={16} />}
                  </button>
                );
              })}
            </div>
            <div className="mt-8 flex justify-center">
              <Button size="lg" onClick={saveInterests} loading={saving}>
                Continue {selected.length > 0 && `(${selected.length})`}
              </Button>
            </div>
          </div>
        )}

        {step === 'profile' && (
          <div className="animate-fade-in max-w-lg mx-auto">
            <div className="text-center mb-6">
              <Camera className="mx-auto text-accent-400 mb-2" />
              <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Set up your profile</h1>
              <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Make it yours.</p>
            </div>

            <div className="flex flex-col items-center mb-6">
              <label className="cursor-pointer relative group">
                <Avatar src={avatarUrl} username={profile?.username} size={96} />
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Camera size={22} />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setAvatarFile(f);
                      setAvatarUrl(URL.createObjectURL(f));
                    }
                  }}
                />
              </label>
              <p className="mt-2 text-xs text-ink-400">Tap to upload</p>
            </div>

            <div className="space-y-4">
              <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
              <Textarea label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tell people about yourself..." />
            </div>

            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={() => setStep('interests')}>Back</Button>
              <Button onClick={saveProfile} loading={saving}>Continue <ChevronRight size={16} /></Button>
            </div>
          </div>
        )}

        {step === 'creators' && (
          <div className="animate-fade-in max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <Users className="mx-auto text-mint-400 mb-2" />
              <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Follow some creators</h1>
              <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Build your feed by following people you like.</p>
            </div>

            <div className="relative mb-5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search people..."
                className="w-full glass rounded-2xl pl-10 pr-4 py-3 text-ink-900 dark:text-white placeholder:text-ink-400 focus:ring-2 focus:ring-brand-400"
              />
            </div>

            {filteredProfiles.length === 0 ? (
              <div className="text-center py-10 text-ink-400 text-sm">
                No other Snapix members yet. Invite a friend to join you!
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProfiles.map((p) => {
                  const isFollowing = followed.has(p.id);
                  return (
                    <div key={p.id} className="glass rounded-2xl p-3 flex items-center gap-3">
                      <Avatar src={p.avatar_url} username={p.username} size={44} to={`/u/${p.username}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-ink-900 dark:text-white truncate">{p.username}</div>
                        <div className="text-xs text-ink-500 truncate">{p.full_name || p.bio || 'On Snapix'}</div>
                      </div>
                      <Button size="sm" variant={isFollowing ? 'secondary' : 'primary'} onClick={() => toggleFollow(p.id)}>
                        {isFollowing ? 'Following' : 'Follow'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep('profile')}>Back</Button>
              <Button onClick={finish}>Finish <ChevronRight size={16} /></Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
