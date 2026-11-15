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
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-[#212121] disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary: 'bg-[#8DBB91] hover:bg-[#7ba87f] active:bg-[#6c9970] text-[#171717] font-semibold focus:ring-[#8DBB91] shadow-sm',
    secondary: 'bg-[#303030] hover:bg-[#3a3a3a] text-[#ECECEC] border border-[#414141] focus:ring-[#8DBB91] shadow-sm',
    sage: 'bg-[#1e2a21] hover:bg-[#26372b] text-[#8DBB91] border border-[#8DBB91]/50 focus:ring-[#8DBB91]',
    outline: 'border border-[#414141] hover:border-[#8DBB91]/60 hover:bg-[#2a2a2a] text-[#ECECEC] focus:ring-[#8DBB91] bg-transparent',
    ghost: 'hover:bg-[#2a2a2a] text-[#ECECEC] focus:ring-[#8DBB91]',
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
