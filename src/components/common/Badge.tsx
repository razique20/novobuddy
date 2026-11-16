import React from 'react';

export type BadgeVariant = 'default' | 'accent' | 'purple' | 'success' | 'warning' | 'muted';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className = '',
  size = 'sm',
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-background-card border-border text-text-secondary',
    accent: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 font-medium',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300 font-medium',
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-medium',
    warning: 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400 font-medium',
    muted: 'bg-slate-200/70 dark:bg-white/5 border-slate-300 dark:border-white/10 text-text-secondary dark:text-text-muted font-medium',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 rounded-md',
    md: 'text-xs px-2.5 py-1 rounded-md',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};
