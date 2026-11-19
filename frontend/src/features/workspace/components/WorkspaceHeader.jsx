import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, PanelLeft, Sprout, Bot, Sparkles } from 'lucide-react';
import { ThemeSelector } from '../../../components/common/ThemeSelector';

export const WorkspaceHeader = ({
  isSidebarCollapsed = false,
  onToggleSidebar,
  onOpenMobileNav,
  title = 'AgroSage',
  subtitle = 'Intelligence for Every Acre.',
  executionMode = 'deterministic',
}) => {
  const navigate = useNavigate();

  return (
    <header className="h-14 w-full bg-[var(--theme-bg-header)] backdrop-blur border-b border-[var(--theme-border)] px-3 sm:px-5 flex items-center justify-between z-10 shrink-0 transition-colors">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {/* Mobile menu trigger (< lg) */}
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="lg:hidden p-2 rounded-xl text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-hover)] border border-[var(--theme-border)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)] focus-visible:outline-none"
          aria-label="Open mobile navigation"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Desktop sidebar expand trigger (lg:flex when collapsed) */}
        {isSidebarCollapsed && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden lg:flex p-2 rounded-xl text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-hover)] border border-[var(--theme-border)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)] focus-visible:outline-none"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <PanelLeft className="w-4 h-4 text-[var(--theme-accent)]" />
          </button>
        )}

        {/* Brand / Breadcrumb matching Screenshot */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-[var(--theme-text-muted)]">
            <span className="font-semibold text-[var(--theme-text-muted)]">AgroSage</span>
            <span>/</span>
          </div>

          <h1 className="text-xs sm:text-sm font-bold text-[var(--theme-text-main)] tracking-tight leading-none truncate">
            {title === 'AgroSage' ? 'New Consultation' : title}
          </h1>

          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--theme-badge-bg)] text-[var(--theme-badge-text)] border border-[var(--theme-badge-border)]">
            Preview
          </span>
        </div>
      </div>

      {/* Right controls matching Target Screenshot: AI operating mode pill & Theme Selector */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Operating Mode Indicator pill */}
        <button
          type="button"
          onClick={() => navigate('/credentials')}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-[var(--theme-bg-card)] border border-[var(--theme-border)] hover:border-[var(--theme-accent)] text-xs text-[var(--theme-text-main)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)] focus-visible:outline-none cursor-pointer"
          title="Click to manage AI Providers & BYOK Vault"
        >
          <span className="w-2 h-2 rounded-full bg-[var(--theme-accent)] animate-pulse" />
          <span className="font-semibold capitalize text-[11px] sm:text-xs">{executionMode}</span>
        </button>

        {/* Theme Options: Soil, Sunlit, Terracotta */}
        <ThemeSelector />
      </div>
    </header>
  );
};
