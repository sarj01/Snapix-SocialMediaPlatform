import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';
import { useEffect } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass';
type Size = 'sm' | 'md' | 'lg';

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  full?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-brand-500 to-accent-500 text-white shadow-glow hover:shadow-glow-accent hover:brightness-110',
  secondary:
    'glass text-ink-900 dark:text-white hover:bg-white/20 dark:hover:bg-white/10',
  ghost: 'text-ink-700 dark:text-ink-200 hover:bg-black/5 dark:hover:bg-white/5',
  danger: 'bg-gradient-to-r from-rose-500 to-accent-500 text-white shadow-glow-accent',
  glass: 'glass-strong text-ink-900 dark:text-white hover:bg-white/30 dark:hover:bg-white/15',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-xl',
  md: 'px-4 py-2.5 text-sm rounded-2xl',
  lg: 'px-6 py-3.5 text-base rounded-2xl',
};

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = 'primary', size = 'md', loading, full, className = '', children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${full ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
});

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, icon, className = '', ...rest },
  ref,
) {
  return (
    <label className="block">
      {label && <span className="block mb-1.5 text-sm font-medium text-ink-700 dark:text-ink-200">{label}</span>}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">{icon}</span>}
        <input
          ref={ref}
          className={`w-full glass rounded-2xl px-4 ${icon ? 'pl-10' : ''} py-3 text-ink-900 dark:text-white placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-400 transition-all ${error ? 'ring-2 ring-rose-400' : ''} ${className}`}
          {...rest}
        />
      </div>
      {error && <span className="block mt-1 text-xs text-rose-400">{error}</span>}
    </label>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }>(
  function Textarea({ label, className = '', ...rest }, ref) {
    return (
      <label className="block">
        {label && <span className="block mb-1.5 text-sm font-medium text-ink-700 dark:text-ink-200">{label}</span>}
        <textarea
          ref={ref}
          className={`w-full glass rounded-2xl px-4 py-3 text-ink-900 dark:text-white placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-400 transition-all resize-none ${className}`}
          {...rest}
        />
      </label>
    );
  },
);

export function Modal({
  open,
  onClose,
  children,
  title,
  className = '',
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative w-full sm:max-w-lg glass-strong rounded-t-3xl sm:rounded-3xl p-5 animate-slide-up max-h-[90vh] overflow-y-auto ${className}`}>
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="font-display font-semibold text-lg text-ink-900 dark:text-white">{title}</h2>}
          <button onClick={onClose} className="ml-auto p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-ink-500">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-in">
      <div className="mb-4 p-5 rounded-4xl glass flex items-center justify-center text-ink-400 animate-float">
        {icon}
      </div>
      <h3 className="font-display font-semibold text-lg text-ink-800 dark:text-white">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400 max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ size = 24 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-brand-400" />;
}

export function FullScreenLoader() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4">
      <div className="animate-[ringSpin_1.2s_linear_infinite]">
        <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
          <defs>
            <linearGradient id="loader-g" x1="0" y1="0" x2="64" y2="64">
              <stop stopColor="#3385ff" />
              <stop offset="0.5" stopColor="#ff4281" />
              <stop offset="1" stopColor="#06cf7e" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="14" stroke="url(#loader-g)" strokeWidth="4" strokeLinecap="round" strokeDasharray="44 60" />
        </svg>
      </div>
      <span className="text-sm text-ink-400 font-medium tracking-wide">Snapix</span>
    </div>
  );
}
