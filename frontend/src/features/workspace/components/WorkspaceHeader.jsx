import React from 'react';
import { Menu, PanelLeft, Sprout, Bot } from 'lucide-react';

export const WorkspaceHeader = ({
  isSidebarCollapsed = false,
  onToggleSidebar,
  onOpenMobileNav,
  title = 'AgroSage',
  subtitle = 'Intelligence for Every Acre.',
}) => {
  return (
    <header className="h-14 w-full bg-[#212121]/90 backdrop-blur border-b border-[#414141] px-4 flex items-center justify-between z-10 shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger (< lg) */}
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="lg:hidden p-2 rounded-xl text-[#ECECEC] hover:bg-[#2a2a2a] border border-[#414141] transition-colors focus-visible:ring-2 focus-visible:ring-[#8DBB91] focus-visible:outline-none"
          aria-label="Open mobile navigation"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Desktop sidebar expand trigger (lg:flex when collapsed) */}
        {isSidebarCollapsed && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden lg:flex p-2 rounded-xl text-[#ECECEC] hover:bg-[#2a2a2a] border border-[#414141] transition-colors focus-visible:ring-2 focus-visible:ring-[#8DBB91] focus-visible:outline-none"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <PanelLeft className="w-4 h-4 text-[#8DBB91]" />
          </button>
        )}

        {/* Brand/Title */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#262626] border border-[#414141] flex items-center justify-center text-[#8DBB91] shrink-0">
            <Sprout className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#ECECEC] tracking-tight leading-none flex items-center gap-1.5">
              <span>{title}</span>
              <span className="text-[10px] font-semibold text-[#8DBB91] bg-[#262626] border border-[#414141] px-1.5 py-0.5 rounded-full">
                Preview
              </span>
            </h1>
            <p className="text-[11px] text-[#A3A3A3] hidden sm:block leading-none mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Right status indicator (static architecture descriptor without unverified live status dot) */}
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#262626] border border-[#414141] text-[11px] text-[#A3A3A3]">
          <Bot className="w-3.5 h-3.5 text-[#8DBB91]" />
          <span>7-Agent Architecture</span>
        </div>
      </div>
    </header>
  );
};
