import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        {
          'bg-sky-400 text-white hover:bg-sky-500 hover:shadow-soft focus-visible:ring-sky-400':
            variant === 'default',
          'border border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 focus-visible:ring-slate-300':
            variant === 'outline',
          'hover:bg-slate-50 focus-visible:ring-slate-300': variant === 'ghost',
          'bg-red-400 text-white hover:bg-red-500 hover:shadow-soft focus-visible:ring-red-400':
            variant === 'destructive',
        },
        {
          'h-8 px-3 text-sm': size === 'sm',
          'h-10 px-4 text-base': size === 'md',
          'h-12 px-6 text-lg': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

