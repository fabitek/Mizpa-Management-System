import * as React from 'react';
import { cn } from '../../lib/utils.ts';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: 'border-transparent bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    secondary: 'border-transparent bg-zinc-800 text-zinc-300',
    destructive: 'border-transparent bg-red-500/20 text-red-400 border border-red-500/30',
    outline: 'text-zinc-200 border border-zinc-700',
    success: 'border-transparent bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
    warning: 'border-transparent bg-amber-500/20 text-amber-300 border border-amber-500/40',
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
