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
      className={`bg-[var(--theme-bg-card)] rounded-2xl border border-[var(--theme-border)] text-[var(--theme-text-main)] shadow-sm transition-colors ${
        hover ? 'hover:border-[var(--theme-accent)] hover:bg-[var(--theme-bg-hover)] transition-all duration-150 cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {(title || action || Icon) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--theme-border)]">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className="w-7 h-7 rounded-lg bg-[var(--theme-bg-composer)] text-[var(--theme-accent)] border border-[var(--theme-border)] flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[var(--theme-text-main)] text-sm truncate">{title}</h3>
                {badge}
              </div>
              {subtitle && <p className="text-xs text-[var(--theme-text-muted)] truncate mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="shrink-0 ml-3">{action}</div>}
        </div>
      )}
      <div className={padding}>{children}</div>
    </div>
  );
};
