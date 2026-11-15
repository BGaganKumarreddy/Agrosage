import React, { useEffect, useRef, useState } from 'react';
import {
  Sprout,
  Plus,
  Search,
  MessageSquare,
  Settings,
  X,
  Shield,
  LogOut,
  Pencil,
  Trash2,
  Check,
  Loader2,
} from 'lucide-react';

export const WorkspaceMobileNavigation = ({
  isOpen = false,
  onClose,
  onNewChat,
  user,
  onLogout,
  conversations = [],
  activeConversationId = null,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  isLoadingHistory = false,
  historyError = null,
  onRetryHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const drawerRef = useRef(null);
  const triggerElementRef = useRef(null);

  const handleSaveRename = (convId) => {
    if (editingTitle.trim() && onRenameConversation) {
      onRenameConversation(convId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = c.title && c.title.toLowerCase().includes(q);
    const cropMatch = c.crop && c.crop.toLowerCase().includes(q);
    const locMatch = c.location && c.location.toLowerCase().includes(q);
    return titleMatch || cropMatch || locMatch;
  });

  // Close on Escape key press and trap Tab focus inside drawer
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Tab trap inside modal drawer
      if (e.key === 'Tab' && drawerRef.current) {
        const focusableEls = drawerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableEls.length === 0) return;

        const firstEl = focusableEls[0];
        const lastEl = focusableEls[focusableEls.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Manage focus: move focus to close button when opened, restore to trigger when closed
  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement;
      const timer = setTimeout(() => {
        if (drawerRef.current) {
          const closeBtn = drawerRef.current.querySelector('button[aria-label="Close navigation"]');
          if (closeBtn) closeBtn.focus();
        }
      }, 0);

      return () => {
        clearTimeout(timer);
        if (triggerElementRef.current && typeof triggerElementRef.current.focus === 'function') {
          triggerElementRef.current.focus();
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const displayIdentifier = user?.username || user?.user_id || 'Farmer Member';
  const tenantId = user?.tenant_id || 'default';
  const roleDisplay = Array.isArray(user?.roles) && user.roles.length > 0
    ? user.roles[0].replace('_', ' ')
    : (typeof user?.roles === 'string' ? user.roles : 'Member');
  const userInitial = (displayIdentifier.charAt(0) || 'F').toUpperCase();

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
        data-testid="mobile-nav-backdrop"
      />

      {/* Drawer Panel */}
      <nav
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile workspace navigation"
        className="relative w-72 max-w-[85vw] h-full bg-[#171717] border-r border-[#414141] flex flex-col justify-between shadow-2xl z-10 select-none overflow-x-hidden animate-in slide-in-from-left duration-200"
      >
        {/* Top Section */}
        <div className="flex flex-col p-4 space-y-4">
          {/* Header & Close Button */}
          <div className="flex items-center justify-between pb-2 border-b border-[#414141]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#262626] border border-[#414141] flex items-center justify-center text-[#8DBB91]">
                <Sprout className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-[#ECECEC] block leading-none">
                  AgroSage
                </span>
                <span className="text-[10px] text-[#A3A3A3] block leading-none mt-1">
                  Mobile Workspace
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#A3A3A3] hover:text-[#ECECEC] hover:bg-[#262626] border border-transparent hover:border-[#414141] transition-colors focus-visible:ring-2 focus-visible:ring-[#8DBB91] focus-visible:outline-none"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Action */}
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#212121] border border-[#414141] hover:bg-[#262626] text-sm font-medium text-[#ECECEC] transition-colors focus-visible:ring-2 focus-visible:ring-[#8DBB91] focus-visible:outline-none"
            aria-label="Start new consultation"
          >
            <div className="flex items-center gap-2.5">
              <Plus className="w-4 h-4 text-[#8DBB91]" />
              <span>New Consultation</span>
            </div>
          </button>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              aria-label="Search mobile conversations"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#212121] border border-[#414141] text-xs text-[#ECECEC] placeholder-[#737373] focus:border-[#8DBB91] focus:ring-1 focus:ring-[#8DBB91] outline-none"
            />
          </div>

          {/* History Section */}
          <div className="pt-2 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-1 mb-2 shrink-0">
              <span className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider block">
                Recent Consultations
              </span>
              {conversations.length > 0 && (
                <span className="text-[10px] text-[#737373] bg-[#262626] px-1.5 py-0.5 rounded border border-[#414141]">
                  {conversations.length}
                </span>
              )}
            </div>

            {isLoadingHistory ? (
              <div className="p-4 text-center space-y-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#8DBB91] mx-auto" />
                <p className="text-xs text-[#A3A3A3]">Loading consultations...</p>
              </div>
            ) : historyError ? (
              <div className="p-3 rounded-xl bg-red-950/30 border border-red-800/50 text-xs text-red-200 text-center space-y-2">
                <p className="text-[11px] leading-tight">{historyError}</p>
                {onRetryHistory && (
                  <button
                    type="button"
                    onClick={onRetryHistory}
                    className="px-2.5 py-1 rounded bg-[#303030] hover:bg-[#383838] border border-[#414141] text-[10px] text-[#ECECEC]"
                  >
                    Retry
                  </button>
                )}
              </div>
            ) : conversations.length === 0 ? (
              <div
                className="p-4 rounded-xl bg-[#212121]/60 border border-[#414141]/60 text-center space-y-2"
                data-testid="mobile-sidebar-empty-history"
              >
                <div className="w-8 h-8 rounded-full bg-[#262626] border border-[#414141] text-[#737373] mx-auto flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#ECECEC]">No previous consultations</p>
                  <p className="text-[11px] text-[#A3A3A3] mt-0.5 leading-relaxed">
                    Your inquiry history will appear here once you begin.
                  </p>
                </div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-3 text-center text-xs text-[#737373]">
                No consultations match &quot;{searchQuery}&quot;
              </div>
            ) : (
              <div className="space-y-1 overflow-y-auto max-h-[50vh] pr-1">
                {filteredConversations.map((c) => {
                  const isActive = c.conversation_id === activeConversationId;
                  const isEditing = editingId === c.conversation_id;

                  return (
                    <div
                      key={c.conversation_id}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#262626] border border-[#8DBB91]/50 text-[#ECECEC] font-medium'
                          : 'text-[#A3A3A3] hover:text-[#ECECEC] hover:bg-[#212121] border border-transparent'
                      }`}
                      onClick={() => {
                        onSelectConversation && onSelectConversation(c.conversation_id);
                        onClose();
                      }}
                      data-testid={`mobile-conversation-item-${c.conversation_id}`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onSelectConversation && onSelectConversation(c.conversation_id);
                          onClose();
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <MessageSquare
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-[#8DBB91]' : 'text-[#737373]'
                          }`}
                        />
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(c.conversation_id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#171717] border border-[#8DBB91] px-1.5 py-0.5 rounded text-xs text-[#ECECEC] w-full outline-none"
                            autoFocus
                          />
                        ) : (
                          <span className="truncate block" title={c.title}>
                            {c.title}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isEditing ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveRename(c.conversation_id);
                            }}
                            aria-label="Save rename"
                            className="p-1 text-[#8DBB91] hover:text-white"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        ) : (
                          <>
                            {onRenameConversation && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingId(c.conversation_id);
                                  setEditingTitle(c.title);
                                }}
                                aria-label={`Rename ${c.title}`}
                                title="Rename consultation"
                                className="p-1 text-[#737373] hover:text-[#ECECEC] rounded"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                            {onDeleteConversation && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteConversation(c.conversation_id);
                                }}
                                aria-label={`Delete ${c.title}`}
                                title="Delete consultation"
                                className="p-1 text-[#737373] hover:text-red-400 rounded"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="p-4 border-t border-[#414141] space-y-3 bg-[#171717]">
          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#A3A3A3] hover:text-[#ECECEC] hover:bg-[#212121] transition-colors focus-visible:ring-2 focus-visible:ring-[#8DBB91] focus-visible:outline-none"
            aria-label="Mobile workspace settings"
          >
            <Settings className="w-4 h-4" />
            <span>Workspace Settings</span>
          </button>

          {/* User profile */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#212121] border border-[#414141]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#303030] border border-[#414141] text-[#8DBB91] flex items-center justify-center font-bold text-xs shrink-0">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#ECECEC] truncate leading-none">
                  {displayIdentifier}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Shield className="w-3 h-3 text-[#A3A3A3] shrink-0" />
                  <span className="text-[10px] text-[#A3A3A3] truncate">
                    {roleDisplay} • {tenantId}
                  </span>
                </div>
              </div>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 rounded-lg text-[#A3A3A3] hover:text-red-400 hover:bg-[#262626] border border-transparent hover:border-[#414141] transition-colors focus-visible:ring-2 focus-visible:ring-[#8DBB91] focus-visible:outline-none"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
};
