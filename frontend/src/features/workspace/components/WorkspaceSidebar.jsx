import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sprout,
  Plus,
  Search,
  MessageSquare,
  Settings,
  PanelLeftClose,
  User,
  Shield,
  LogOut,
  Pencil,
  Trash2,
  Check,
  Loader2,
  KeyRound,
  Cpu,
} from 'lucide-react';

export const WorkspaceSidebar = ({
  isCollapsed = false,
  onToggleCollapse,
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
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  if (isCollapsed) {
    return null;
  }

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

  const displayIdentifier = user?.username || user?.user_id || 'Farmer Member';
  const tenantId = user?.tenant_id || 'default';
  const roleDisplay = Array.isArray(user?.roles) && user.roles.length > 0
    ? user.roles[0].replace('_', ' ')
    : (typeof user?.roles === 'string' ? user.roles : 'Member');
  const userInitial = (displayIdentifier.charAt(0) || 'F').toUpperCase();

  return (
    <aside
      className="hidden lg:flex w-64 h-full bg-[var(--theme-bg-sidebar)] border-r border-[var(--theme-border)] flex-col justify-between select-none shrink-0 overflow-x-hidden transition-colors duration-200 z-20"
      aria-label="Workspace sidebar"
    >
      {/* Top Section */}
      <div className="flex flex-col p-3 space-y-3">
        {/* Brand Header & Collapse Toggle */}
        <div className="flex items-center justify-between px-1 py-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border)] flex items-center justify-center text-[var(--theme-accent)] shadow-sm">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-[var(--theme-text-main)] block leading-none">
                AgroSage
              </span>
              <span className="text-[10px] text-[var(--theme-text-muted)] block leading-none mt-1">
                Intelligence for Every Acre
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-hover)] border border-transparent hover:border-[var(--theme-border)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)] focus-visible:outline-none"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4 text-[var(--theme-accent)]" />
          </button>
        </div>

        {/* New Chat Action */}
        <button
          type="button"
          onClick={onNewChat}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[var(--theme-bg-composer)] border border-[var(--theme-border)] hover:bg-[var(--theme-bg-hover)] hover:border-[var(--theme-accent)] text-sm font-semibold text-[var(--theme-text-main)] transition-all group focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)] focus-visible:outline-none shadow-sm"
          aria-label="Start new consultation"
        >
          <div className="flex items-center gap-2.5">
            <Plus className="w-4 h-4 text-[var(--theme-accent)] group-hover:scale-110 transition-transform" />
            <span>New Consultation</span>
          </div>
          <span className="text-[10px] text-[var(--theme-text-muted)] bg-[var(--theme-bg-sidebar)] border border-[var(--theme-border)] px-1.5 py-0.5 rounded">
            New
          </span>
        </button>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[var(--theme-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            aria-label="Search conversations"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[var(--theme-bg-card)] border border-[var(--theme-border)] text-xs text-[var(--theme-text-main)] placeholder-[var(--theme-text-subtle)] focus:border-[var(--theme-accent)] focus:ring-1 focus:ring-[var(--theme-accent)] outline-none transition-colors"
          />
        </div>

        {/* Conversation History Section */}
        <div className="pt-2 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-1 mb-2 shrink-0">
            <span className="text-[11px] font-semibold text-[var(--theme-text-subtle)] uppercase tracking-wider">
              Recent Consultations
            </span>
            {conversations.length > 0 && (
              <span className="text-[10px] text-[var(--theme-text-muted)] bg-[var(--theme-bg-card)] px-1.5 py-0.5 rounded border border-[var(--theme-border)]">
                {conversations.length}
              </span>
            )}
          </div>

          {isLoadingHistory ? (
            <div className="p-4 text-center space-y-2" data-testid="sidebar-loading-history">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--theme-accent)] mx-auto" />
              <p className="text-xs text-[var(--theme-text-muted)]">Loading consultations...</p>
            </div>
          ) : historyError ? (
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-800/50 text-xs text-red-200 text-center space-y-2">
              <p className="text-[11px] leading-tight">{historyError}</p>
              {onRetryHistory && (
                <button
                  type="button"
                  onClick={onRetryHistory}
                  className="px-2.5 py-1 rounded bg-[var(--theme-bg-hover)] border border-[var(--theme-border)] text-[10px] text-[var(--theme-text-main)] transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          ) : conversations.length === 0 ? (
            <div
              className="p-4 rounded-xl bg-[var(--theme-bg-card)]/60 border border-[var(--theme-border)] text-center space-y-2"
              data-testid="sidebar-empty-history"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--theme-bg-card)] border border-[var(--theme-border)] text-[var(--theme-text-muted)] mx-auto flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--theme-text-main)]">No previous consultations</p>
                <p className="text-[11px] text-[var(--theme-text-muted)] mt-0.5 leading-relaxed">
                  Your consultation history will appear here once you begin.
                </p>
              </div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-3 text-center text-xs text-[var(--theme-text-muted)]">
              No consultations match &quot;{searchQuery}&quot;
            </div>
          ) : (
            <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
              {filteredConversations.map((c) => {
                const isActive = c.conversation_id === activeConversationId;
                const isEditing = editingId === c.conversation_id;

                return (
                  <div
                    key={c.conversation_id}
                    className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[var(--theme-bg-hover)] border border-[var(--theme-accent)] text-[var(--theme-text-main)] font-semibold shadow-sm'
                        : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-hover)]/70 border border-transparent'
                    }`}
                    onClick={() => onSelectConversation && onSelectConversation(c.conversation_id)}
                    data-testid={`conversation-item-${c.conversation_id}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSelectConversation && onSelectConversation(c.conversation_id);
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MessageSquare
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? 'text-[var(--theme-accent)]' : 'text-[var(--theme-text-subtle)]'
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
                          className="bg-[var(--theme-bg-card)] border border-[var(--theme-accent)] px-1.5 py-0.5 rounded text-xs text-[var(--theme-text-main)] w-full outline-none"
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
                          className="p-1 text-[var(--theme-accent)] hover:text-white"
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
                              className="p-1 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] rounded"
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
                              className="p-1 text-[var(--theme-text-muted)] hover:text-red-400 rounded"
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

      {/* Bottom Footer Section */}
      <div className="p-3 border-t border-[var(--theme-border)] space-y-1.5 bg-[var(--theme-bg-sidebar)]">
        {/* AI Providers & BYOK Vault Entry */}
        <button
          type="button"
          onClick={() => navigate('/credentials')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--theme-text-muted)] hover:text-[var(--theme-accent)] hover:bg-[var(--theme-bg-hover)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)] focus-visible:outline-none"
          aria-label="AI Providers & BYOK Vault"
        >
          <KeyRound className="w-4 h-4 text-[var(--theme-accent)]" />
          <span>AI Providers & Vault</span>
        </button>

        {/* Seven-Agent Graph Telemetry Entry */}
        <button
          type="button"
          onClick={() => navigate('/agent-activity')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--theme-text-muted)] hover:text-[var(--theme-accent)] hover:bg-[var(--theme-bg-hover)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)] focus-visible:outline-none"
          aria-label="Seven-Agent Architecture & Activity"
        >
          <Cpu className="w-4 h-4 text-[var(--theme-accent)]" />
          <span>7-Agent Architecture</span>
        </button>

        {/* Settings Entry */}
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-hover)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)] focus-visible:outline-none"
          aria-label="Workspace settings"
        >
          <Settings className="w-4 h-4" />
          <span>Workspace Settings</span>
        </button>

        {/* User Profile Area */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[var(--theme-accent)] text-black flex items-center justify-center font-bold text-xs shrink-0">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[var(--theme-text-main)] truncate leading-none">
                {displayIdentifier}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <Shield className="w-3 h-3 text-[var(--theme-text-muted)] shrink-0" />
                <span className="text-[10px] text-[var(--theme-text-muted)] truncate">
                  {roleDisplay} • {tenantId}
                </span>
              </div>
            </div>
          </div>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 rounded-lg text-[var(--theme-text-muted)] hover:text-red-400 hover:bg-[var(--theme-bg-hover)] border border-transparent hover:border-[var(--theme-border)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)] focus-visible:outline-none"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
