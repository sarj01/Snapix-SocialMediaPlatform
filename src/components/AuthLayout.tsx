import type { ReactNode } from 'react';
import { Logo, Wordmark } from './Logo';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../lib/theme';

export function AuthLayout({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6">
      <button
        onClick={toggle}
        className="absolute top-4 right-4 p-2.5 rounded-full glass text-ink-600 dark:text-ink-200 hover:scale-110 transition-transform"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-md animate-scale-in">
        <div className="flex flex-col items-center mb-7">
          <Logo size={64} />
          <Wordmark size={32} />
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">The next era of social.</p>
        </div>
        <div className="glass-card p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
