import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  dot = false,
}) => {
  const variantStyles = {
    default: 'bg-[#083181]/10 text-[#083181] border-[#083181]/25 dark:bg-[#083181]/30 dark:text-[#e8dda5] dark:border-[#083181]/50',
    success: 'bg-[#a0b900]/15 text-[#5e6d00] dark:text-[#a0b900] border-[#a0b900]/30 dark:bg-[#a0b900]/20 dark:border-[#a0b900]/40',
    warning: 'bg-[#c56a2d]/15 text-[#9a4b18] dark:text-[#e8dda5] border-[#c56a2d]/30 dark:bg-[#c56a2d]/25 dark:border-[#c56a2d]/40',
    danger: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50',
    info: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/50',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };

  const dotColors = {
    default: 'bg-[#083181] dark:bg-[#a0b900]',
    success: 'bg-[#a0b900]',
    warning: 'bg-[#c56a2d]',
    danger: 'bg-rose-600',
    info: 'bg-sky-600',
    neutral: 'bg-slate-500',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};
