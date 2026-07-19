import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { Button } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';

export default function VerifyOTP() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const nav = useNavigate();
  const toast = useToast();

  function setDigit(i: number, v: string) {
    if (!/^\d?$/.test(v)) return;
    const next = [...code];
    next[i] = v;
    setCode(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const otp = code.join('');
    if (otp.length !== 6) return toast('Enter the 6-digit code', 'error');
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: new URLSearchParams(window.location.search).get('email') || '',
      token: otp,
      type: 'signup',
    });
    setLoading(false);
    if (error) return toast(error.message, 'error');
    toast('Verified!', 'success');
    nav('/');
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white mb-1">Verify your email</h1>
      <p className="text-sm text-ink-500 dark:text-ink-400 mb-6">Enter the 6-digit code we sent you.</p>

      <form onSubmit={submit} className="space-y-5">
        <div className="flex gap-2 justify-between">
          {code.map((d, i) => (
            <input
              key={i}
              ref={(el) => (refs.current[i] = el)}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => e.key === 'Backspace' && !d && i > 0 && refs.current[i - 1]?.focus()}
              inputMode="numeric"
              maxLength={1}
              className="w-12 h-14 text-center text-xl font-bold glass rounded-2xl text-ink-900 dark:text-white focus:ring-2 focus:ring-brand-400"
            />
          ))}
        </div>
        <Button full size="lg" type="submit" loading={loading}>Verify</Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">
        <Link to="/login" className="text-brand-500 font-medium hover:underline">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}
