import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { Button, Input } from '../../components/ui';
import { Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const nav = useNavigate();
  const toast = useToast();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset`,
    });
    setLoading(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    setSent(true);
    toast('Reset link sent', 'success');
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white mb-1">Forgot password</h1>
      <p className="text-sm text-ink-500 dark:text-ink-400 mb-6">
        We'll send a recovery link to your email.
      </p>

      {sent ? (
        <div className="text-center space-y-4">
          <p className="text-sm text-mint-400 bg-mint-500/10 rounded-xl px-4 py-3">
            Check your inbox for the reset link.
          </p>
          <Link to="/login"><Button full variant="secondary">Back to sign in</Button></Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            icon={<Mail size={16} />}
          />
          <Button full size="lg" type="submit" loading={loading}>Send reset link</Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">
        <Link to="/login" className="text-brand-500 font-medium hover:underline">Back to sign in</Link>
      </p>
      <button onClick={() => nav('/reset')} className="mt-3 block mx-auto text-xs text-ink-400 hover:text-ink-200 underline">
        Already have a code? Reset now
      </button>
    </AuthLayout>
  );
}
