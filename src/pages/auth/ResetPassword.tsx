import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { Button, Input } from '../../components/ui';
import { Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const toast = useToast();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) return toast('Password too short', 'error');
    if (password !== confirm) return toast('Passwords do not match', 'error');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast(error.message, 'error');
    toast('Password updated', 'success');
    nav('/login');
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white mb-1">Reset password</h1>
      <p className="text-sm text-ink-500 dark:text-ink-400 mb-6">Choose a new password for your account.</p>

      <form onSubmit={submit} className="space-y-4">
        <Input
          label="New password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock size={16} />}
          autoComplete="new-password"
        />
        <Input
          label="Confirm password"
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          icon={<Lock size={16} />}
          autoComplete="new-password"
        />
        <Button full size="lg" type="submit" loading={loading}>Update password</Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">
        <Link to="/login" className="text-brand-500 font-medium hover:underline">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}
