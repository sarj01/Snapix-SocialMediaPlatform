import { Link } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { Button } from '../../components/ui';
import { Sparkles, ShieldCheck, Zap } from 'lucide-react';

export default function Welcome() {
  return (
    <AuthLayout>
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">
          Welcome to the future
        </h1>
        <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
          Share moments. Discover creators. Express yourself in a whole new way.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { icon: Sparkles, label: 'Aurora feed', color: 'text-brand-400' },
            { icon: Zap, label: 'Instant stories', color: 'text-accent-400' },
            { icon: ShieldCheck, label: 'Private & safe', color: 'text-mint-400' },
          ].map((f) => (
            <div key={f.label} className="glass rounded-2xl p-3 flex flex-col items-center gap-2">
              <f.icon size={20} className={f.color} />
              <span className="text-[11px] text-ink-600 dark:text-ink-300 text-center leading-tight">{f.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-7 space-y-3">
          <Link to="/signup" className="block">
            <Button full size="lg">Create account</Button>
          </Link>
          <Link to="/login" className="block">
            <Button full size="lg" variant="secondary">I already have an account</Button>
          </Link>
        </div>

        <p className="mt-5 text-xs text-ink-400">
          By continuing you agree to Snapix's{' '}
          <Link to="/terms" className="underline hover:text-ink-600 dark:hover:text-ink-200">Terms</Link> &{' '}
          <Link to="/privacy" className="underline hover:text-ink-600 dark:hover:text-ink-200">Privacy Policy</Link>.
        </p>
      </div>
    </AuthLayout>
  );
}
