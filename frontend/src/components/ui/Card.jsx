import React from 'react';

export const Card = ({
  children,
  className = '',
  title,
  subtitle,
  action,
  headerIcon: Icon,
  badge,
  padding = 'p-5',
  hover = false,
  onClick,
  ...props
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-[#262626] rounded-2xl border border-[#414141] text-[#ECECEC] shadow-sm ${
        hover ? 'hover:border-[#8DBB91]/50 hover:bg-[#2a2a2a] transition-all duration-150 cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {(title || action || Icon) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#414141]/60">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className="w-7 h-7 rounded-lg bg-[#303030] text-[#8DBB91] border border-[#414141] flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[#ECECEC] text-sm truncate">{title}</h3>
                {badge}
              </div>
              {subtitle && <p className="text-xs text-[#A3A3A3] truncate mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="shrink-0 ml-3">{action}</div>}
        </div>
      )}
      <div className={padding}>{children}</div>
    </div>
  );
};
