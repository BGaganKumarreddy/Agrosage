import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  UserCheck,
  Settings,
  LogOut,
  Sprout,
  X,
  Search,
  MessageSquare,
  Edit2,
  Trash2,
  Check,
  ChevronDown,
  KeyRound,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { conversationService } from '../../services/conversationService';

export const groupConversationsByDate = (conversations) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const groups = {
    today: [],
    yesterday: [],
    previous7Days: [],
    older: [],
  };

  conversations.forEach((conv) => {
    const updated = new Date(conv.updated_at || conv.created_at || now);
    if (updated >= today) {
      groups.today.push(conv);
    } else if (updated >= yesterday) {
      groups.yesterday.push(conv);
    } else if (updated >= sevenDaysAgo) {
      groups.previous7Days.push(conv);
    } else {
      groups.older.push(conv);
    }
  });

  return groups;
};

export const Sidebar = ({ isOpen, onClose, isCollapsed = false, onToggleCollapse }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const activeId = searchParams.get('id');
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [isDeletingId, setIsDeletingId] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const loadConversations = async () => {
    try {
      const res = await conversationService.listConversations({ limit: 50 });
      setConversations(res.items || []);
    } catch {
      // Ignore background fetch error
    }
  };

  useEffect(() => {
    loadConversations();
    const handleUpdate = () => loadConversations();
    window.addEventListener('conversations-updated', handleUpdate);
    return () => window.removeEventListener('conversations-updated', handleUpdate);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleStartRename = (e, conv) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingId(conv.conversation_id);
    setEditTitle(conv.title || 'Consultation');
  };

  const handleSaveRename = async (e, convId) => {
    e.stopPropagation();
    e.preventDefault();
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    try {
      await conversationService.updateConversation(convId, { title: trimmed });
      setConversations((prev) =>
        prev.map((c) => (c.conversation_id === convId ? { ...c, title: trimmed } : c))
      );
      setEditingId(null);
      toast.success('Conversation renamed');
      window.dispatchEvent(new CustomEvent('conversations-updated'));
    } catch (err) {
      toast.error(err?.message || 'Failed to rename conversation');
    }
  };

  const handleDelete = async (e, convId) => {
    e.stopPropagation();
    e.preventDefault();
    if (!window.confirm('Delete this consultation thread?')) {
      return;
    }
    try {
      setIsDeletingId(convId);
      await conversationService.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.conversation_id !== convId));
      toast.success('Conversation deleted');
      window.dispatchEvent(new CustomEvent('conversations-updated'));
      if (activeId === convId) {
        navigate('/chat');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to delete conversation');
    } finally {
      setIsDeletingId(null);
    }
  };

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.crop && c.crop.toLowerCase().includes(q)) ||
        (c.location && c.location.toLowerCase().includes(q))
    );
  }, [conversations, searchQuery]);

  const dateGroups = useMemo(() => {
    return groupConversationsByDate(filteredConversations);
  }, [filteredConversations]);

  const primaryNavItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/chat', label: 'New Consultation', icon: Sparkles, highlight: true },
    { to: '/history', label: 'My Consultations', icon: FileText },
    { to: '/farm-profile', label: 'Farm Profile', icon: UserCheck },
    { to: '/settings', label: 'Account Settings', icon: Settings },
  ];

  const renderConversationItem = (conv) => {
    const isSelected = activeId === conv.conversation_id && location.pathname.includes('/chat');
    const isEditing = editingId === conv.conversation_id;

    if (isEditing) {
      return (
        <div
          key={conv.conversation_id}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--theme-bg-hover)] border border-[var(--theme-border)] text-xs text-[var(--theme-text-main)]"
        >
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveRename(e, conv.conversation_id);
              if (e.key === 'Escape') setEditingId(null);
            }}
            autoFocus
            className="flex-1 bg-transparent border-none text-xs text-[var(--theme-text-main)] focus:outline-none"
          />
          <button
            onClick={(e) => handleSaveRename(e, conv.conversation_id)}
            className="p-1 text-[var(--theme-accent)] hover:text-white"
            title="Save"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingId(null);
            }}
            className="p-1 text-[var(--theme-text-muted)] hover:text-white"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    return (
      <NavLink
        key={conv.conversation_id}
        to={`/chat?id=${encodeURIComponent(conv.conversation_id)}`}
        onClick={onClose}
        className={`group relative flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
          isSelected
            ? 'bg-[var(--theme-bg-hover)] text-[var(--theme-text-main)] font-semibold border border-[var(--theme-border)] shadow-sm'
            : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-hover)]/70'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
          <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-80 text-[var(--theme-accent)]" />
          <span className="truncate">{conv.title || 'Untitled Consultation'}</span>
        </div>

        {/* Hover / Active Actions */}
        <div
          className={`flex items-center gap-1 shrink-0 ${
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          } transition-opacity`}
        >
          <button
            onClick={(e) => handleStartRename(e, conv)}
            className="p-1 rounded text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-hover)]"
            title="Rename"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => handleDelete(e, conv.conversation_id)}
            disabled={isDeletingId === conv.conversation_id}
            className="p-1 rounded text-[var(--theme-text-muted)] hover:text-red-400 hover:bg-[var(--theme-bg-hover)]"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </NavLink>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[var(--theme-bg-sidebar)] text-[var(--theme-text-main)] border-r border-[var(--theme-border)] select-none transition-colors">
      {/* Brand & Toggle Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--theme-border)]">
        <NavLink
          to="/"
          onClick={onClose}
          className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-[var(--theme-bg-card)] border border-[var(--theme-border)] flex items-center justify-center text-[var(--theme-accent)] shadow-sm">
            <Sprout className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-[var(--theme-text-main)]">AgroSage</span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--theme-badge-bg)] text-[var(--theme-badge-text)] font-semibold border border-[var(--theme-badge-border)]">
                AI
              </span>
            </div>
            {/* Accessible alias for legacy tests */}
            <span className="sr-only">AgroSage</span>
            <p className="text-[11px] text-[var(--theme-text-muted)] truncate">Intelligence for Every Acre</p>
          </div>
        </NavLink>

        <div className="flex items-center gap-1">
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-hover)] transition-colors"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4 text-[var(--theme-accent)]" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-hover)]"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Primary Action Button: + New Chat / New Consultation */}
      <div className="px-3 pt-3 pb-2">
        <NavLink
          to="/chat"
          onClick={onClose}
          className="flex items-center justify-between w-full py-2.5 px-3 rounded-xl bg-[var(--theme-bg-composer)] hover:bg-[var(--theme-bg-hover)] text-[var(--theme-text-main)] font-semibold text-xs border border-[var(--theme-border)] hover:border-[var(--theme-accent)] transition-all group shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--theme-accent)] group-hover:rotate-12 transition-transform" />
            <span>New Chat</span>
          </div>
          <span className="text-[10px] text-[var(--theme-text-muted)] border border-[var(--theme-border)] rounded px-1.5 py-0.5 bg-[var(--theme-bg-sidebar)]">
            New
          </span>
        </NavLink>
      </div>

      {/* Search Conversations Input */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-[var(--theme-bg-card)] border border-[var(--theme-border)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--theme-text-main)] placeholder-[var(--theme-text-subtle)] focus:outline-none focus:border-[var(--theme-accent)] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Center: Primary Nav & Recent Conversations */}
      <div className="flex-1 px-3 py-1 overflow-y-auto space-y-4">
        {/* Core Nav Links */}
        <div className="space-y-0.5 border-b border-[var(--theme-border)] pb-2">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--theme-bg-hover)] text-[var(--theme-text-main)] font-semibold border border-[var(--theme-border)] shadow-sm'
                      : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-hover)]/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 text-[var(--theme-accent)]" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Recent Conversations Grouped by Date */}
        <div className="space-y-3">
          {dateGroups.today.length > 0 && (
            <div className="space-y-1">
              <p className="px-3 text-[11px] font-semibold text-[var(--theme-text-subtle)] uppercase tracking-wider">
                Today
              </p>
              {dateGroups.today.map(renderConversationItem)}
            </div>
          )}

          {dateGroups.yesterday.length > 0 && (
            <div className="space-y-1">
              <p className="px-3 text-[11px] font-semibold text-[var(--theme-text-subtle)] uppercase tracking-wider">
                Yesterday
              </p>
              {dateGroups.yesterday.map(renderConversationItem)}
            </div>
          )}

          {dateGroups.previous7Days.length > 0 && (
            <div className="space-y-1">
              <p className="px-3 text-[11px] font-semibold text-[var(--theme-text-subtle)] uppercase tracking-wider">
                Previous 7 Days
              </p>
              {dateGroups.previous7Days.map(renderConversationItem)}
            </div>
          )}

          {dateGroups.older.length > 0 && (
            <div className="space-y-1">
              <p className="px-3 text-[11px] font-semibold text-[var(--theme-text-subtle)] uppercase tracking-wider">
                Older
              </p>
              {dateGroups.older.map(renderConversationItem)}
            </div>
          )}

          {conversations.length === 0 && !searchQuery && (
            <div className="px-3 py-4 text-center text-xs text-[var(--theme-text-muted)]">
              No conversations yet. Start one above!
            </div>
          )}

          {filteredConversations.length === 0 && searchQuery && (
            <div className="px-3 py-4 text-center text-xs text-[var(--theme-text-muted)]">
              No conversations match "{searchQuery}"
            </div>
          )}
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-[var(--theme-border)] relative">
        <button
          onClick={() => setShowProfileMenu((prev) => !prev)}
          className="flex items-center justify-between w-full p-2 rounded-xl hover:bg-[var(--theme-bg-hover)] transition-colors text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[var(--theme-accent)] text-black font-bold text-xs flex items-center justify-center shrink-0">
              {user?.username ? user.username.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--theme-text-main)] truncate">
                {user?.username || 'Farmer'}
              </p>
              <p className="text-[10px] text-[var(--theme-text-muted)] truncate">
                {user?.tenant_id || 'Tenant'}
              </p>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-[var(--theme-text-muted)]" />
        </button>

        {/* Profile Popover Menu */}
        {showProfileMenu && (
          <div className="absolute bottom-16 left-3 right-3 bg-[var(--theme-bg-card)] border border-[var(--theme-border)] rounded-xl shadow-2xl py-1 z-30 space-y-0.5">
            <NavLink
              to="/credentials"
              onClick={() => {
                setShowProfileMenu(false);
                onClose && onClose();
              }}
              className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-hover)] transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5 text-[var(--theme-accent)]" />
              <span>BYOK Vault & API Keys</span>
            </NavLink>
            <NavLink
              to="/settings"
              onClick={() => {
                setShowProfileMenu(false);
                onClose && onClose();
              }}
              className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-hover)] transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-[var(--theme-accent)]" />
              <span>Account Settings</span>
            </NavLink>
            <div className="border-t border-[var(--theme-border)] my-1" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-[var(--theme-bg-hover)] transition-colors text-left"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky/Collapsible Sidebar */}
      <aside
        className={`hidden lg:flex flex-col h-screen fixed inset-y-0 left-0 z-30 transition-all duration-300 ${
          isCollapsed ? '-translate-x-full w-64' : 'translate-x-0 w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer with Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full h-full z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
