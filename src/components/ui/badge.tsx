import * as React from 'react';
import { cn } from '../../lib/utils.ts';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  const variantStyles = {
    // default → CONFIRMED: bg Emerald 900, text Emerald 400 (Design.md §5.2 badge-status-confirmed)
    default: 'border-transparent bg-[#064e3b] text-[#34d399] border border-emerald-900/40',
    // secondary → estado neutro
    secondary: 'border-transparent bg-zinc-800 text-zinc-300',
    // destructive → LIVE / deuda: badge-live (Design.md §5.2)
    destructive: 'border-transparent bg-[#ef444420] text-[#ef4444] border border-red-500/20',
    // outline → sin fondo
    outline: 'text-zinc-200 border border-zinc-700',
    // success → saldo positivo (igual a confirmed)
    success: 'border-transparent bg-[#064e3b] text-[#34d399] border border-emerald-900/40',
    // warning → WAITLIST: bg Amber 950, text Amber 400 (Design.md §5.2 badge-status-waitlist)
    warning: 'border-transparent bg-[#451a03] text-[#fbbf24] border border-amber-900/40',
    // info → estado informativo
    info: 'border-transparent bg-blue-950/60 text-blue-300 border border-blue-500/20',
  }[variant];

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        variantStyles,
        className
      )}
      {...props}
    />
  );
}
