import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, Activity, PanelLeft, Plus, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { healthService } from '../../services/healthService';
import { ThemeSelector } from '../common/ThemeSelector';

export const TopHeader = ({
  onMenuClick,
  title,
  breadcrumbs = [],
  isSidebarCollapsed = false,
  onToggleSidebar,
  executionMode = 'deterministic',
}) => {
  const { user } = useAuth();
  const [health, setHealth] = useState({ status: 'checking', agents: 7 });

  useEffect(() => {
    let isMounted = true;
    healthService
      .getHealth()
      .then((data) => {
        if (isMounted) setHealth(data);
      })
      .catch(() => {
        if (isMounted) setHealth({ status: 'offline', agents: 7 });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeMode = localStorage.getItem('agrosage_execution_mode') || executionMode || 'deterministic';

  return (
    <header className="sticky top-0 z-20 bg-[var(--theme-bg-header)] backdrop-blur-md border-b border-[var(--theme-border)] px-3 sm:px-5 py-2.5 flex items-center justify-between transition-colors select-none">
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Mobile Hamburger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-hover)] transition-colors"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Expand Button when collapsed */}
        {isSidebarCollapsed && (
          <button
            onClick={onToggleSidebar}
            className="hidden lg:flex p-1.5 rounded-lg text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-hover)] transition-colors"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeft className="w-4 h-4 text-[var(--theme-accent)]" />
          </button>
        )}

        {/* Header Breadcrumbs & Title */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-[var(--theme-text-muted)]">
            <span className="font-semibold text-[var(--theme-text-muted)]">AgroSage</span>
            <span>/</span>
          </div>

          <h2 className="text-sm sm:text-base font-bold text-[var(--theme-text-main)] tracking-tight truncate">
            {title || 'New Consultation'}
          </h2>

          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--theme-badge-bg)] text-[var(--theme-badge-text)] border border-[var(--theme-badge-border)]">
            Preview
          </span>
        </div>
      </div>

      {/* Right Controls: Mode Pill & Theme Selector */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Operating Mode Indicator matching screenshot */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--theme-bg-card)] border border-[var(--theme-border)] text-xs text-[var(--theme-text-main)]">
          <span className="w-2 h-2 rounded-full bg-[var(--theme-accent)] animate-pulse" />
          <span className="font-medium capitalize">{activeMode}</span>
        </div>

        {/* Theme Options: Soil, Sunlit, Terracotta */}
        <ThemeSelector />

        {/* Mobile New Chat shortcut */}
        <NavLink
          to="/chat"
          className="sm:hidden p-1.5 rounded-lg text-[var(--theme-accent)] hover:bg-[var(--theme-bg-hover)] transition-colors"
          title="New consultation"
        >
          <Plus className="w-5 h-5" />
        </NavLink>
      </div>
    </header>
  );
};
