import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Code,
  Calendar,
  Layers,
  Trash2,
  Edit2,
  Check,
  X,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
} from 'lucide-react';
import { historyService } from '../../services/historyService';
import { conversationService } from '../../services/conversationService';
import { advisoryService } from '../../services/advisoryService';
import { useConfig } from '../../context/ConfigContext';
import { useToast } from '../../context/ToastContext';

export const groupHistoryByDate = (items) => {
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

  items.forEach((item) => {
    const updated = new Date(item.updated_at || item.created_at || now);
    if (updated >= today) {
      groups.today.push(item);
    } else if (updated >= yesterday) {
      groups.yesterday.push(item);
    } else if (updated >= sevenDaysAgo) {
      groups.previous7Days.push(item);
    } else {
      groups.older.push(item);
    }
  });

  return groups;
};

export const HistoryPage = () => {
  const { crops } = useConfig();
  const toast = useToast();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Rename & Delete state
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // Diagnostic trace modal state
  const [selectedTraceId, setSelectedTraceId] = useState(null);
  const [traceData, setTraceData] = useState(null);
  const [traceLoading, setTraceLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await historyService.getHistory({
        limit,
        offset,
        crop: selectedCrop || undefined,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      toast.error('Failed to load consultation history');
    } finally {
      setIsLoading(false);
    }
  }, [limit, offset, selectedCrop, toast]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleOpenTrace = async (e, advisoryId) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedTraceId(advisoryId);
    setTraceLoading(true);
    try {
      const t = await advisoryService.getAdvisoryTrace(advisoryId);
      setTraceData(t);
    } catch {
      toast.error('Diagnostic trace unavailable for this consultation');
    } finally {
      setTraceLoading(false);
    }
  };

  const handleStartRename = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(item.advisory_id || item.conversation_id);
    setEditTitle(item.query || item.title || '');
  };

  const handleSaveRename = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    try {
      await conversationService.updateConversation(id, { title: trimmed });
      setItems((prev) =>
        prev.map((it) =>
          (it.advisory_id === id || it.conversation_id === id)
            ? { ...it, query: trimmed, title: trimmed }
            : it
        )
      );
      setEditingId(null);
      toast.success('Consultation renamed');
      window.dispatchEvent(new CustomEvent('conversations-updated'));
    } catch {
      setEditingId(null);
    }
  };

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Delete this consultation record?')) return;

    try {
      setDeletingId(id);
      await conversationService.deleteConversation(id);
      setItems((prev) => prev.filter((it) => (it.advisory_id || it.conversation_id) !== id));
      setTotal((t) => Math.max(0, t - 1));
      toast.success('Consultation deleted');
      window.dispatchEvent(new CustomEvent('conversations-updated'));
    } catch (err) {
      toast.error(err?.message || 'Failed to delete record');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (it) =>
        (it.query && it.query.toLowerCase().includes(q)) ||
        (it.title && it.title.toLowerCase().includes(q)) ||
        (it.location && it.location.toLowerCase().includes(q)) ||
        (it.crop && it.crop.toLowerCase().includes(q)) ||
        (it.synthesis_preview && it.synthesis_preview.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  const dateGroups = useMemo(() => {
    return groupHistoryByDate(filteredItems);
  }, [filteredItems]);

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit) || 1;

  const renderCard = (item) => {
    const id = item.advisory_id || item.conversation_id;
    const isEditing = editingId === id;
    const displayTitle = item.query || item.title || 'Consultation Record';

    return (
      <div
        key={id}
        className="block group p-4 rounded-xl bg-[#262626] hover:bg-[#2b2b2b] border border-[#414141] transition-all space-y-2.5"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
          {/* Title / Inline Rename */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename(e, id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                  className="bg-[#171717] border border-[#8DBB91] rounded-lg px-2.5 py-1 text-xs text-[#ECECEC] focus:outline-none flex-1"
                />
                <button
                  onClick={(e) => handleSaveRename(e, id)}
                  className="p-1 text-[#8DBB91] hover:text-white"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-1 text-[#A3A3A3] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#ECECEC] group-hover:text-white transition-colors truncate">
                  {displayTitle}
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#171717] border border-[#414141] text-[#8DBB91]">
                  {item.status || 'COMPLETED'}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={(e) => handleStartRename(e, item)}
              className="p-1.5 rounded-lg text-[#A3A3A3] hover:text-[#ECECEC] hover:bg-[#383838]"
              title="Rename"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => handleDelete(e, id)}
              disabled={deletingId === id}
              className="p-1.5 rounded-lg text-[#A3A3A3] hover:text-red-400 hover:bg-[#383838]"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => handleOpenTrace(e, item.advisory_id || id)}
              className="px-2 py-1 rounded-lg border border-[#414141] hover:bg-[#383838] text-[#A3A3A3] hover:text-[#ECECEC] text-[11px] flex items-center gap-1"
              title="Inspect Diagnostic Trace"
            >
              <Code className="w-3 h-3 text-[#8DBB91]" />
              <span>Trace</span>
            </button>
            <Link
              to={item.conversation_id ? `/chat?id=${encodeURIComponent(item.conversation_id)}` : `/advisories/${encodeURIComponent(item.advisory_id)}`}
              className="p-1.5 rounded-lg bg-[#303030] hover:bg-[#8DBB91] text-[#A3A3A3] hover:text-[#171717] transition-colors"
              title="Continue in Chat"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Synthesis preview */}
        <p className="text-xs text-[#A3A3A3] line-clamp-2 leading-relaxed">
          {item.synthesis_preview || 'Click to continue this consultation and view recommendations.'}
        </p>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#737373] pt-2 border-t border-[#414141]/50">
          {item.crop && (
            <span className="bg-[#1e2a21] text-[#8DBB91] border border-[#8DBB91]/40 font-semibold px-2 py-0.5 rounded text-[11px]">
              {item.crop}
            </span>
          )}
          {item.location && (
            <span className="flex items-center gap-1 text-[#A3A3A3]">
              <MapPin className="w-3 h-3 text-[#8DBB91]" />
              <span>Location: {item.location}</span>
            </span>
          )}
          {item.growth_stage && <span>Stage: {item.growth_stage}</span>}
          {item.execution_mode && (
            <span>Mode: <strong className="text-[#A3A3A3]">{item.execution_mode}</strong></span>
          )}
          <span>•</span>
          <span>{new Date(item.created_at || Date.now()).toLocaleDateString()}</span>

          {item.active_alert_count > 0 && (
            <span className="text-amber-400 font-semibold flex items-center gap-1 ml-auto">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{item.active_alert_count} active alert{item.active_alert_count > 1 ? 's' : ''}</span>
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 bg-[#212121] text-[#ECECEC] p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#414141]/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#ECECEC]">
            Consultation History & Archives
          </h1>
          <p className="text-xs text-[#A3A3A3] mt-0.5">
            Durable SQLite records with tenant-level isolation and date grouping
          </p>
        </div>

        <Link
          to="/chat"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#8DBB91] hover:bg-[#7ba87f] text-[#171717] font-semibold text-xs transition-colors self-start sm:self-auto shadow-sm"
        >
          <Sparkles className="w-4 h-4" />
          <span>New Consultation</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 rounded-2xl bg-[#262626] border border-[#414141] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search consultation text, crop, or location..."
            className="w-full bg-[#171717] border border-[#414141] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#ECECEC] placeholder-[#737373] focus:outline-none focus:border-[#8DBB91]"
          />
        </div>

        <div className="text-xs text-[#A3A3A3] shrink-0">
          <span>
            Showing <strong className="text-[#ECECEC]">{filteredItems.length}</strong> of{' '}
            <strong className="text-[#ECECEC]">{total}</strong>
          </span>
        </div>
      </div>

      {/* Grouped History List */}
      {isLoading ? (
        <div className="space-y-3 py-8 text-center text-xs text-[#A3A3A3]">
          Loading consultations...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#262626] border border-[#414141] space-y-3">
          <FileText className="w-10 h-10 text-[#737373] mx-auto" />
          <h3 className="text-sm font-semibold text-[#ECECEC]">No Consultations Found</h3>
          <p className="text-xs text-[#A3A3A3] max-w-sm mx-auto">
            {searchQuery
              ? `No consultation records matched "${searchQuery}".`
              : 'You have not submitted any advisory consultations yet.'}
          </p>
          <Link
            to="/chat"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#303030] hover:bg-[#383838] border border-[#414141] text-xs text-[#ECECEC] font-medium"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#8DBB91]" />
            <span>Start Your First Consultation</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {dateGroups.today.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#8DBB91] uppercase tracking-wider">
                Today
              </h3>
              <div className="space-y-2.5">{dateGroups.today.map(renderCard)}</div>
            </div>
          )}

          {dateGroups.yesterday.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#8DBB91] uppercase tracking-wider">
                Yesterday
              </h3>
              <div className="space-y-2.5">{dateGroups.yesterday.map(renderCard)}</div>
            </div>
          )}

          {dateGroups.previous7Days.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#8DBB91] uppercase tracking-wider">
                Previous 7 Days
              </h3>
              <div className="space-y-2.5">{dateGroups.previous7Days.map(renderCard)}</div>
            </div>
          )}

          {dateGroups.older.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#8DBB91] uppercase tracking-wider">
                Older
              </h3>
              <div className="space-y-2.5">{dateGroups.older.map(renderCard)}</div>
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {total > limit && (
        <div className="flex items-center justify-between p-3 bg-[#262626] rounded-xl border border-[#414141] text-xs text-[#A3A3A3]">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
              className="px-2.5 py-1 rounded-lg border border-[#414141] hover:bg-[#303030] disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={offset + limit >= total}
              onClick={() => setOffset(offset + limit)}
              className="px-2.5 py-1 rounded-lg border border-[#414141] hover:bg-[#303030] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Diagnostic Trace Modal */}
      {selectedTraceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#262626] border border-[#414141] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col p-5 shadow-2xl text-[#ECECEC] space-y-3">
            <div className="flex items-center justify-between border-b border-[#414141] pb-2">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-[#8DBB91]" />
                <h3 className="text-sm font-bold text-[#ECECEC]">
                  Workflow Trace: {selectedTraceId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTraceId(null)}
                className="p-1 rounded text-[#A3A3A3] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 bg-[#171717] rounded-xl border border-[#414141] text-xs font-mono text-[#ECECEC]">
              {traceLoading ? (
                <p className="text-[#A3A3A3]">Loading diagnostic trace...</p>
              ) : traceData ? (
                <pre className="whitespace-pre-wrap">{JSON.stringify(traceData, null, 2)}</pre>
              ) : (
                <p className="text-[#A3A3A3]">Trace unavailable.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
