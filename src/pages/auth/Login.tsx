import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { Button, Input } from '../../components/ui';
import { Mail, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nav = useNavigate();
  const toast = useToast();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    toast('Welcome back!', 'success');
    nav('/');
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white mb-1">Sign in</h1>
      <p className="text-sm text-ink-500 dark:text-ink-400 mb-6">Pick up right where you left off.</p>

      <form onSubmit={submit} className="space-y-4">
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
          placeholder="••••••••"
          icon={<Lock size={16} />}
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer text-ink-600 dark:text-ink-300">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="accent-brand-500 w-4 h-4 rounded"
            />
            Remember me
          </label>
          <Link to="/forgot" className="text-brand-500 hover:underline">Forgot password?</Link>
        </div>

        {error && <p className="text-sm text-rose-400 bg-rose-500/10 rounded-xl px-3 py-2">{error}</p>}

        <Button full size="lg" type="submit" loading={loading}>Sign in</Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">
        New here? <Link to="/signup" className="text-brand-500 font-medium hover:underline">Create account</Link>
      </p>
    </AuthLayout>
  );
}
