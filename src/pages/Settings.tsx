import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Moon, Sun, Lock, Shield, Bell, User, Globe, HelpCircle, LogOut, Palette, KeyRound, Trash2, FileText, Info, ChevronRight, Smartphone } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { Button, Modal } from '../components/ui';
import type { Profile } from '../lib/types';

export default function Settings() {
  return (
    <Routes>
      <Route index element={<SettingsHome />} />
      <Route path="privacy" element={<Privacy />} />
      <Route path="security" element={<Security />} />
      <Route path="notifications" element={<NotificationSettings />} />
      <Route path="account" element={<Account />} />
      <Route path="about" element={<About />} />
    </Routes>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  const nav = useNavigate();
  return (
    <div className="max-w-2xl mx-auto px-4">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => nav('/settings')} className="p-2 rounded-full glass text-ink-700 dark:text-ink-200"><ChevronLeft size={20} /></button>
        <h1 className="font-display text-xl font-bold text-ink-900 dark:text-white">{title}</h1>
      </div>
      {children}
    </div>
  );
}

function Row({ icon: Icon, label, sub, onClick, danger }: { icon: typeof Lock; label: string; sub?: string; onClick?: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className="w-full glass rounded-2xl p-4 flex items-center gap-3 hover:bg-white/15 transition-colors text-left">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${danger ? 'bg-rose-500/15 text-rose-400' : 'glass text-ink-600 dark:text-ink-300'}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-medium text-sm ${danger ? 'text-rose-400' : 'text-ink-900 dark:text-white'}`}>{label}</div>
        {sub && <div className="text-xs text-ink-500 truncate">{sub}</div>}
      </div>
      <ChevronRight size={18} className="text-ink-400" />
    </button>
  );
}

function SettingsHome() {
  const nav = useNavigate();
  const { signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const { profile } = useAuth();

  async function logout() {
    await signOut();
    nav('/welcome');
  }

  return (
    <div className="max-w-2xl mx-auto px-4">
      <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white mb-5">Settings</h1>

      <div className="glass rounded-2xl p-4 flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white">
          <User size={22} />
        </div>
        <div className="flex-1">
          <div className="font-medium text-ink-900 dark:text-white">{profile?.full_name || profile?.username}</div>
          <div className="text-xs text-ink-500">@{profile?.username}</div>
        </div>
        <Button size="sm" variant="secondary" onClick={() => nav(`/u/${profile?.username}`)}>View profile</Button>
      </div>

      <div className="space-y-2 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 px-2">Appearance</p>
        <Row icon={theme === 'dark' ? Moon : Sun} label="Theme" sub={`Currently ${theme}`} onClick={toggle} />
        <Row icon={Palette} label="Accent color" sub="Aurora gradient" onClick={() => toast('Coming soon', 'info')} />
      </div>

      <div className="space-y-2 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 px-2">Privacy & Security</p>
        <Row icon={Lock} label="Privacy" sub="Account visibility, blocked users" onClick={() => nav('/settings/privacy')} />
        <Row icon={Shield} label="Security" sub="2FA, login activity" onClick={() => nav('/settings/security')} />
      </div>

      <div className="space-y-2 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 px-2">Preferences</p>
        <Row icon={Bell} label="Notifications" sub="Push, email, in-app" onClick={() => nav('/settings/notifications')} />
        <Row icon={Globe} label="Language" sub="English" onClick={() => toast('Coming soon', 'info')} />
      </div>

      <div className="space-y-2 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 px-2">Account</p>
        <Row icon={User} label="Account management" sub="Data, deletion" onClick={() => nav('/settings/account')} />
        <Row icon={HelpCircle} label="Help center" onClick={() => toast('Coming soon', 'info')} />
        <Row icon={Info} label="About Snapix" onClick={() => nav('/settings/about')} />
      </div>

      <div className="pt-2">
        <Row icon={LogOut} label="Log out" danger onClick={logout} />
      </div>
    </div>
  );
}

function Privacy() {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [privateAcc, setPrivateAcc] = useState(profile?.is_private || false);
  const [blocks, setBlocks] = useState<Profile[]>([]);

  useEffect(() => {
    if (!profile) return;
    supabase.from('blocks').select('blocked:profiles!blocks_blocked_id_fkey(*)').eq('blocker_id', profile.id).then(({ data }) => {
      setBlocks((data || []).map((d: any) => d.blocked as Profile));
    });
  }, [profile]);

  async function togglePrivate() {
    const next = !privateAcc;
    setPrivateAcc(next);
    await supabase.from('profiles').update({ is_private: next }).eq('id', profile!.id);
    await refreshProfile();
    toast(next ? 'Account is now private' : 'Account is now public', 'success');
  }

  async function unblock(id: string) {
    await supabase.from('blocks').delete().eq('blocker_id', profile!.id).eq('blocked_id', id);
    setBlocks((b) => b.filter((x) => x.id !== id));
  }

  return (
    <Shell title="Privacy">
      <div className="glass rounded-2xl p-4 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Lock size={18} className="text-ink-600 dark:text-ink-300" />
          <div>
            <div className="font-medium text-sm text-ink-900 dark:text-white">Private account</div>
            <div className="text-xs text-ink-500">Only approved followers can see your posts</div>
          </div>
        </div>
        <button onClick={togglePrivate} className={`w-12 h-7 rounded-full transition-colors ${privateAcc ? 'bg-gradient-to-r from-brand-500 to-accent-500' : 'bg-ink-700'}`}>
          <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${privateAcc ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <h2 className="text-sm font-semibold text-ink-700 dark:text-ink-200 mb-2 px-2">Blocked users</h2>
      {blocks.length === 0 ? (
        <p className="text-sm text-ink-400 px-2 py-4">You haven't blocked anyone.</p>
      ) : (
        <div className="space-y-2">
          {blocks.map((b) => (
            <div key={b.id} className="glass rounded-2xl p-3 flex items-center gap-3">
              <div className="flex-1 text-sm text-ink-900 dark:text-white">{b.username}</div>
              <Button size="sm" variant="secondary" onClick={() => unblock(b.id)}>Unblock</Button>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}

function Security() {
  const toast = useToast();
  const [twoFA, setTwoFA] = useState(false);
  const [sessions, setSessions] = useState<{ id: string; device: string; location: string; current: boolean }[]>([]);

  useEffect(() => {
    setSessions([{ id: 'current', device: 'This device', location: 'Current session', current: true }]);
  }, []);

  return (
    <Shell title="Security">
      <div className="glass rounded-2xl p-4 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <KeyRound size={18} className="text-ink-600 dark:text-ink-300" />
          <div>
            <div className="font-medium text-sm text-ink-900 dark:text-white">Two-factor authentication</div>
            <div className="text-xs text-ink-500">Add an extra layer of security</div>
          </div>
        </div>
        <button onClick={() => { setTwoFA(!twoFA); toast(twoFA ? '2FA disabled' : '2FA enabled', 'info'); }} className={`w-12 h-7 rounded-full transition-colors ${twoFA ? 'bg-gradient-to-r from-brand-500 to-accent-500' : 'bg-ink-700'}`}>
          <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${twoFA ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <h2 className="text-sm font-semibold text-ink-700 dark:text-ink-200 mb-2 px-2">Login activity</h2>
      <div className="space-y-2">
        {sessions.map((s) => (
          <div key={s.id} className="glass rounded-2xl p-3 flex items-center gap-3">
            <Smartphone size={18} className="text-ink-500" />
            <div className="flex-1">
              <div className="text-sm text-ink-900 dark:text-white">{s.device}</div>
              <div className="text-xs text-ink-500">{s.location}</div>
            </div>
            {s.current && <span className="text-xs text-mint-400 font-medium">Active now</span>}
          </div>
        ))}
      </div>
    </Shell>
  );
}

function NotificationSettings() {
  const [prefs, setPrefs] = useState({ likes: true, comments: true, follows: true, messages: true, stories: true });
  return (
    <Shell title="Notifications">
      <div className="space-y-2">
        {Object.entries(prefs).map(([k, v]) => (
          <div key={k} className="glass rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell size={18} className="text-ink-600 dark:text-ink-300" />
              <span className="font-medium text-sm capitalize text-ink-900 dark:text-white">{k}</span>
            </div>
            <button onClick={() => setPrefs((p) => ({ ...p, [k]: !v }))} className={`w-12 h-7 rounded-full transition-colors ${v ? 'bg-gradient-to-r from-brand-500 to-accent-500' : 'bg-ink-700'}`}>
              <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${v ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function Account() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  return (
    <Shell title="Account">
      <Row icon={FileText} label="Download your data" sub="Request a copy of your data" onClick={() => toast('Request submitted', 'info')} />
      <div className="h-2" />
      <Row icon={Trash2} label="Delete account" sub="Permanently delete your account" danger onClick={() => setOpen(true)} />
      <Modal open={open} onClose={() => setOpen(false)} title="Delete account">
        <p className="text-sm text-ink-600 dark:text-ink-300 mb-4">This will permanently delete your account and all your content. This cannot be undone.</p>
        <div className="flex gap-2">
          <Button variant="secondary" full onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="danger" full onClick={() => toast('Contact support to delete', 'info')}>Delete</Button>
        </div>
      </Modal>
    </Shell>
  );
}

function About() {
  return (
    <Shell title="About">
      <div className="glass rounded-2xl p-6 text-center">
        <div className="mx-auto mb-3 w-16 h-16 rounded-4xl bg-gradient-to-br from-brand-500 via-accent-500 to-mint-400 flex items-center justify-center">
          <span className="text-white font-display font-bold text-2xl">S</span>
        </div>
        <h2 className="font-display font-bold text-lg text-ink-900 dark:text-white">Snapix</h2>
        <p className="text-xs text-ink-500 mt-1">Version 1.0.0</p>
        <p className="text-sm text-ink-600 dark:text-ink-300 mt-4">The next era of social — built for creators, designed for the future.</p>
        <div className="mt-4 flex justify-center gap-4 text-xs text-ink-500">
          <Link to="/terms" className="hover:underline">Terms</Link>
          <Link to="/privacy" className="hover:underline">Privacy</Link>
        </div>
      </div>
    </Shell>
  );
}
