import React from 'react';
import { cn } from '../../lib/utils';

interface IconProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'sky' | 'emerald' | 'orange' | 'violet' | 'red' | 'slate';
  children: React.ReactNode;
}

export function Icon({
  className,
  size = 'md',
  variant = 'sky',
  children,
  ...props
}: IconProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
  };

  const variantClasses = {
    sky: 'bg-sky-100 text-sky-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    orange: 'bg-orange-100 text-orange-600',
    violet: 'bg-violet-100 text-violet-600',
    red: 'bg-red-100 text-red-600',
    slate: 'bg-slate-100 text-slate-600',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

