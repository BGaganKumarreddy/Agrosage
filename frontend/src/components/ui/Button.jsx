import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  className = '',
  type = 'button',
  onClick,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-[var(--theme-bg-main)] disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary: 'bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-black font-semibold focus:ring-[var(--theme-accent)] shadow-sm',
    secondary: 'bg-[var(--theme-bg-composer)] hover:bg-[var(--theme-bg-hover)] text-[var(--theme-text-main)] border border-[var(--theme-border)] focus:ring-[var(--theme-accent)] shadow-sm',
    sage: 'bg-[var(--theme-badge-bg)] hover:bg-[var(--theme-bg-hover)] text-[var(--theme-accent)] border border-[var(--theme-border)] focus:ring-[var(--theme-accent)]',
    outline: 'border border-[var(--theme-border)] hover:border-[var(--theme-accent)] hover:bg-[var(--theme-bg-hover)] text-[var(--theme-text-main)] focus:ring-[var(--theme-accent)] bg-transparent',
    ghost: 'hover:bg-[var(--theme-bg-hover)] text-[var(--theme-text-main)] focus:ring-[var(--theme-accent)]',
    danger: 'bg-red-700 hover:bg-red-600 text-white focus:ring-red-500 shadow-sm',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-xs sm:text-sm px-4 py-2 gap-2',
    lg: 'text-sm sm:text-base px-6 py-2.5 gap-2.5',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      <span>{children}</span>
    </button>
  );
};
