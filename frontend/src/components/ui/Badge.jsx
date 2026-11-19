import React from 'react';

export const Badge = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
}) => {
  const variants = {
    completed: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80',
    partial: 'bg-amber-950/60 text-amber-300 border-amber-800/80',
    unavailable: 'bg-zinc-800/80 text-zinc-400 border-zinc-700',
    failed: 'bg-red-950/60 text-red-300 border-red-800/80',
    active: 'bg-[var(--theme-badge-bg)] text-[var(--theme-badge-text)] border-[var(--theme-badge-border)]',
    forest: 'bg-[var(--theme-badge-bg)] text-[var(--theme-badge-text)] border-[var(--theme-badge-border)]',
    neutral: 'bg-[#2a2a2a] text-[#A3A3A3] border-[#414141]',
    critical: 'bg-red-950 text-red-300 border-red-700 font-semibold',
    high: 'bg-amber-950 text-amber-300 border-amber-700 font-semibold',
    medium: 'bg-yellow-950 text-yellow-300 border-yellow-700 font-medium',
    low: 'bg-emerald-950 text-emerald-300 border-emerald-700',
  };

  const dots = {
    completed: 'bg-emerald-400',
    partial: 'bg-amber-400',
    unavailable: 'bg-zinc-400',
    failed: 'bg-red-400',
    active: 'bg-[#8DBB91]',
    forest: 'bg-[#8DBB91]',
    neutral: 'bg-zinc-400',
    critical: 'bg-red-500',
    high: 'bg-amber-500',
    medium: 'bg-yellow-500',
    low: 'bg-emerald-400',
  };

  const sizes = {
    sm: 'text-[10px] px-1.5 py-0.5 rounded-md gap-1',
    md: 'text-[11px] px-2 py-0.5 rounded-md gap-1.5',
    lg: 'text-xs px-2.5 py-1 rounded-lg gap-2',
  };

  const vKey = variant.toLowerCase();
  const currentVariant = variants[vKey] || variants.neutral;
  const currentDot = dots[vKey] || dots.neutral;

  return (
    <span
      className={`inline-flex items-center font-medium border leading-none shrink-0 ${currentVariant} ${sizes[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${currentDot}`} />}
      <span>{children}</span>
    </span>
  );
};
