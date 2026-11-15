import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, Activity, PanelLeft, Plus, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { healthService } from '../../services/healthService';

export const TopHeader = ({
  onMenuClick,
  title,
  breadcrumbs = [],
  isSidebarCollapsed = false,
  onToggleSidebar,
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

  return (
    <header className="sticky top-0 z-20 bg-[#212121]/90 backdrop-blur-md border-b border-[#414141]/50 px-4 sm:px-6 py-2.5 flex items-center justify-between transition-all select-none">
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Mobile Hamburger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg text-[#A3A3A3] hover:text-[#ECECEC] hover:bg-[#303030] transition-colors"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Expand Button when collapsed */}
        {isSidebarCollapsed && (
          <button
            onClick={onToggleSidebar}
            className="hidden lg:flex p-1.5 rounded-lg text-[#A3A3A3] hover:text-[#ECECEC] hover:bg-[#303030] transition-colors"
            title="Expand sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}

        <div className="min-w-0">
          {breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-[#A3A3A3] mb-0.5 truncate">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.label}>
                  {idx > 0 && <span>/</span>}
                  <span>{crumb.label}</span>
                </React.Fragment>
              ))}
            </div>
          )}
          <h2 className="text-sm sm:text-base font-semibold text-[#ECECEC] tracking-tight truncate">
            {title || 'AgroSage Intelligence'}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Mobile New Chat shortcut */}
        <NavLink
          to="/chat"
          className="sm:hidden p-1.5 rounded-lg text-[#8DBB91] hover:bg-[#303030] transition-colors"
          title="New consultation"
        >
          <Plus className="w-5 h-5" />
        </NavLink>

        {/* 7-Agent Architecture Pill */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg border border-[#414141]/60 bg-[#171717]/80 text-xs text-[#A3A3A3]">
          <Activity
            className={`w-3.5 h-3.5 ${
              health.status === 'healthy' ? 'text-[#8DBB91]' : 'text-amber-400'
            }`}
          />
          <span className="font-medium text-[11px]">7-Agent System</span>
        </div>
      </div>
    </header>
  );
};
