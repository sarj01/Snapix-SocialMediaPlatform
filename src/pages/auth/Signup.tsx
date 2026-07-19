import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { Button, Input } from '../../components/ui';
import { Mail, Lock, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nav = useNavigate();
  const toast = useToast();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    setLoading(true);

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle();
    if (existing) {
      setError('That username is taken.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: cleanUsername } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        username: cleanUsername,
        full_name: cleanUsername,
      });
    }
    setLoading(false);
    toast('Account created!', 'success');
    nav('/onboarding');
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white mb-1">Create your account</h1>
      <p className="text-sm text-ink-500 dark:text-ink-400 mb-6">Join the Snapix community.</p>

      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="yourname"
          icon={<User size={16} />}
          autoComplete="username"
        />
        <Input
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          icon={<Mail size={16} />}
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          icon={<Lock size={16} />}
          autoComplete="new-password"
        />

        {error && <p className="text-sm text-rose-400 bg-rose-500/10 rounded-xl px-3 py-2">{error}</p>}

        <Button full size="lg" type="submit" loading={loading}>Continue</Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">
        Already have an account? <Link to="/login" className="text-brand-500 font-medium hover:underline">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
