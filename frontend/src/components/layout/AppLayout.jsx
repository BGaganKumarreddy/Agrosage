import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';

export const AppLayout = ({ title, breadcrumbs }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    return localStorage.getItem('agrosage_sidebar_collapsed') === 'true';
  });

  const toggleDesktopCollapse = () => {
    setDesktopCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('agrosage_sidebar_collapsed', String(next));
      return next;
    });
  };

  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className="min-h-screen bg-[#212121] text-[#ECECEC] flex overflow-x-hidden">
      {/* Sidebar */}
      <Sidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        isCollapsed={desktopCollapsed}
        onToggleCollapse={toggleDesktopCollapse}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 ${
          desktopCollapsed ? 'lg:pl-0' : 'lg:pl-64'
        }`}
      >
        <TopHeader
          onMenuClick={() => setMobileSidebarOpen(true)}
          title={title}
          breadcrumbs={breadcrumbs}
          isSidebarCollapsed={desktopCollapsed}
          onToggleSidebar={toggleDesktopCollapse}
        />
        <main className="flex-1 flex flex-col w-full min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
