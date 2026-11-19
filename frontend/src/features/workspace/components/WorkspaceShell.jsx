import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, AlertCircle, Sprout, X } from 'lucide-react';
import { WorkspaceHeader } from './WorkspaceHeader';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { WorkspaceMobileNavigation } from './WorkspaceMobileNavigation';
import { WorkspaceEmptyState } from './WorkspaceEmptyState';
import { WorkspaceComposerPreview } from './WorkspaceComposerPreview';
import { UserMessage } from '../../../components/chat/UserMessage';
import { AssistantMessage } from '../../../components/chat/AssistantMessage';
import { useAuth } from '../../../context/AuthContext';
import { conversationService } from '../../../services/conversationService';
import { farmProfileService } from '../../../services/farmProfileService';
import { WorkspaceContextDrawer } from './WorkspaceContextDrawer';

export const WorkspaceShell = ({ previewMode = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { conversationId } = useParams();

  // Navigation and UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('agrosage_workspace_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [composerValue, setComposerValue] = useState('');
  const [previewNotice, setPreviewNotice] = useState(null);

  // Conversations history state
  const [conversations, setConversations] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  // Active conversation thread state
  const [activeConversation, setActiveConversation] = useState(null);
  const [isLoadingActiveConversation, setIsLoadingActiveConversation] = useState(false);
  const [activeConversationError, setActiveConversationError] = useState(null);

  // Farm profile and context drawer state (Stage 4)
  const [savedFarmProfile, setSavedFarmProfile] = useState(null);
  const [isContextDrawerOpen, setIsContextDrawerOpen] = useState(false);
  const [isSavingContext, setIsSavingContext] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [pendingUserMessage, setPendingUserMessage] = useState(null);
  const [executionMode, setExecutionMode] = useState(() => {
    try {
      return localStorage.getItem('agrosage_active_provider') || 'deterministic';
    } catch {
      return 'deterministic';
    }
  });

  const handleSetExecutionMode = useCallback((newMode) => {
    setExecutionMode(newMode);
    try {
      localStorage.setItem('agrosage_active_provider', newMode);
      localStorage.setItem('agrosage_execution_mode', newMode);
    } catch {}
  }, []);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Load conversation history on mount
  const loadHistory = useCallback(async () => {
    if (previewMode) return;
    try {
      setIsLoadingHistory(true);
      setHistoryError(null);
      const res = await conversationService.listConversations({ limit: 50 });
      setConversations(res?.items || []);
    } catch (err) {
      setHistoryError(err?.message || 'Failed to load conversation history');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [previewMode]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Load saved farm profile defaults on mount
  useEffect(() => {
    if (previewMode) return;
    let isCurrent = true;
    async function loadProfile() {
      try {
        const prof = await farmProfileService.getProfile();
        if (isCurrent && prof) {
          setSavedFarmProfile(prof);
        }
      } catch (err) {
        console.warn('Could not load saved farm profile:', err);
      }
    }
    loadProfile();
    return () => {
      isCurrent = false;
    };
  }, [previewMode]);

  // Load active conversation when conversationId changes
  useEffect(() => {
    if (previewMode) return;

    if (!conversationId) {
      setActiveConversation(null);
      setActiveConversationError(null);
      return;
    }

    let isCurrent = true;

    async function fetchConversation() {
      try {
        setIsLoadingActiveConversation(true);
        setActiveConversationError(null);
        const conv = await conversationService.getConversation(conversationId);
        if (isCurrent) {
          setActiveConversation(conv);
        }
      } catch (err) {
        if (isCurrent) {
          setActiveConversation(null);
          setActiveConversationError(err?.message || 'Consultation not found or unauthorized');
        }
      } finally {
        if (isCurrent) {
          setIsLoadingActiveConversation(false);
        }
      }
    }

    fetchConversation();

    return () => {
      isCurrent = false;
    };
  }, [conversationId, previewMode]);

  // Auto-scroll to bottom when messages change or submission starts
  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversation?.messages, isSubmitting, pendingUserMessage]);

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('agrosage_workspace_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const handleOpenMobileNav = () => setMobileNavOpen(true);
  const handleCloseMobileNav = () => setMobileNavOpen(false);

  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
      }
    } finally {
      navigate('/login');
    }
  };

  const handleSelectPrompt = (promptText) => {
    setComposerValue(promptText);
    setPreviewNotice(null);
    setSubmissionError(null);
    const textarea = document.querySelector('textarea[aria-label="Message AgroSage preview composer"]');
    if (textarea) textarea.focus();
  };

  const handleNewChat = async () => {
    setComposerValue('');
    setPreviewNotice(null);
    setSubmissionError(null);
    setActiveConversationError(null);
    if (!previewMode) {
      try {
        const newConv = await conversationService.createConversation({
          title: 'New Consultation',
          crop: savedFarmProfile?.crop || undefined,
          location: savedFarmProfile?.location || undefined,
          growth_stage: savedFarmProfile?.growth_stage || undefined,
          variety: savedFarmProfile?.variety || undefined,
          mode: executionMode,
        });
        setActiveConversation(newConv);
        setConversations((prev) => [
          {
            conversation_id: newConv.conversation_id,
            title: newConv.title,
            crop: newConv.context?.crop || null,
            location: newConv.context?.location || null,
            message_count: 0,
            created_at: newConv.created_at,
            updated_at: newConv.updated_at,
          },
          ...prev.filter((c) => c.conversation_id !== newConv.conversation_id),
        ]);
        navigate(`/workspace/${newConv.conversation_id}`);
      } catch (err) {
        console.error('Failed to create new consultation:', err);
        navigate('/workspace');
      }
    } else {
      setActiveConversation(null);
      navigate('/workspace');
    }
    const textarea = document.querySelector('textarea[aria-label="Message AgroSage preview composer"]');
    if (textarea) textarea.focus();
  };

  const handleSelectConversation = (id) => {
    setPreviewNotice(null);
    setSubmissionError(null);
    navigate(`/workspace/${id}`);
  };

  const handleDeleteConversation = async (id) => {
    try {
      await conversationService.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.conversation_id !== id));
      if (activeConversation?.conversation_id === id || conversationId === id) {
        handleNewChat();
      }
    } catch (err) {
      setSubmissionError(err?.message || 'Failed to delete conversation');
    }
  };

  const handleRenameConversation = async (id, newTitle) => {
    try {
      const updated = await conversationService.updateConversation(id, { title: newTitle });
      setConversations((prev) =>
        prev.map((c) => (c.conversation_id === id ? { ...c, title: updated.title } : c))
      );
      if (activeConversation?.conversation_id === id) {
        setActiveConversation((prev) => (prev ? { ...prev, title: updated.title } : prev));
      }
    } catch (err) {
      setSubmissionError(err?.message || 'Failed to rename conversation');
    }
  };

  // Save consultation context override (does not modify saved My Farm profile)
  const handleSaveContext = async (newContext) => {
    setIsSavingContext(true);
    try {
      if (activeConversation?.conversation_id) {
        const updated = await conversationService.updateConversation(
          activeConversation.conversation_id,
          newContext
        );
        setActiveConversation(updated);
        setConversations((prev) =>
          prev.map((c) =>
            c.conversation_id === updated.conversation_id
              ? {
                  ...c,
                  crop: updated.context?.crop || null,
                  location: updated.context?.location || null,
                }
              : c
          )
        );
      } else {
        const newConv = await conversationService.createConversation({
          title: 'New Consultation',
          crop: newContext.crop || undefined,
          location: newContext.location || undefined,
          growth_stage: newContext.growth_stage || undefined,
          variety: newContext.variety || undefined,
          mode: executionMode,
        });
        setActiveConversation(newConv);
        setConversations((prev) => [
          {
            conversation_id: newConv.conversation_id,
            title: newConv.title,
            crop: newConv.context?.crop || null,
            location: newConv.context?.location || null,
            message_count: 0,
            created_at: newConv.created_at,
            updated_at: newConv.updated_at,
          },
          ...prev.filter((c) => c.conversation_id !== newConv.conversation_id),
        ]);
        navigate(`/workspace/${newConv.conversation_id}`);
      }
      setIsContextDrawerOpen(false);
    } catch (err) {
      setSubmissionError(err?.message || 'Failed to update consultation context');
    } finally {
      setIsSavingContext(false);
    }
  };

  // Save persistent My Farm Profile defaults (does not modify active consultation)
  const handleSaveFarmProfile = async (profileData) => {
    setIsSavingProfile(true);
    try {
      const updated = await farmProfileService.updateProfile(profileData);
      setSavedFarmProfile(updated);
    } catch (err) {
      setSubmissionError(err?.message || 'Failed to save farm profile defaults');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const isInheritedFromFarm = Boolean(
    savedFarmProfile &&
    activeConversation?.context &&
    (
      (savedFarmProfile.crop && activeConversation.context.crop === savedFarmProfile.crop) ||
      (savedFarmProfile.location && activeConversation.context.location === savedFarmProfile.location)
    )
  );

  // Keyboard shortcut: Ctrl+K / Cmd+K triggers a new consultation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleNewChat();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSend = async (overrideText) => {
    const textToSend = (typeof overrideText === 'string' ? overrideText : composerValue).trim();
    if (!textToSend || isSubmitting) return;

    // Stage 1 Preview Boundary Mode
    if (previewMode) {
      setPreviewNotice(
        'Stage 1 Preview: Message input is interactive for UI testing. Live agent execution and conversation persistence activate in Stage 3.'
      );
      return;
    }

    // Live Message Submission
    setIsSubmitting(true);
    setSubmissionError(null);
    setComposerValue('');
    setPendingUserMessage(textToSend);

    try {
      if (!activeConversation) {
        // 1. Create a new persistent conversation with initial message and inherited farm defaults
        const newConv = await conversationService.createConversation({
          initial_message: textToSend,
          crop: savedFarmProfile?.crop || undefined,
          location: savedFarmProfile?.location || undefined,
          growth_stage: savedFarmProfile?.growth_stage || undefined,
          variety: savedFarmProfile?.variety || undefined,
          mode: executionMode,
        });

        setActiveConversation(newConv);
        setConversations((prev) => [
          {
            conversation_id: newConv.conversation_id,
            title: newConv.title,
            crop: newConv.context?.crop || null,
            location: newConv.context?.location || null,
            message_count: newConv.messages?.length || 2,
            created_at: newConv.created_at,
            updated_at: newConv.updated_at,
          },
          ...prev.filter((c) => c.conversation_id !== newConv.conversation_id),
        ]);
        setPendingUserMessage(null);
        navigate(`/workspace/${newConv.conversation_id}`, { replace: true });
      } else {
        // 2. Submit follow-up message in existing consultation
        const convId = activeConversation.conversation_id;

        const optimisticUserMsg = {
          message_id: `temp-${Date.now()}`,
          conversation_id: convId,
          role: 'user',
          content: textToSend,
          created_at: new Date().toISOString(),
        };

        setActiveConversation((prev) => ({
          ...prev,
          messages: [...(prev.messages || []), optimisticUserMsg],
        }));

        const asstMsg = await conversationService.sendMessage(convId, {
          content: textToSend,
          mode: executionMode,
        });

        setPendingUserMessage(null);

        // Synchronize with fresh conversation from backend
        try {
          const freshConv = await conversationService.getConversation(convId);
          setActiveConversation(freshConv);
        } catch {
          // Fallback to optimistic append
          setActiveConversation((prev) => ({
            ...prev,
            messages: [
              ...(prev.messages || []).filter((m) => m.message_id !== optimisticUserMsg.message_id),
              optimisticUserMsg,
              asstMsg,
            ],
          }));
        }

        // Update list overview
        setConversations((prev) =>
          prev.map((c) =>
            c.conversation_id === convId
              ? { ...c, updated_at: new Date().toISOString(), message_count: (c.message_count || 1) + 2 }
              : c
          )
        );
      }
    } catch (err) {
      // Ambiguous outcome handling: check if backend actually recorded the response
      if (activeConversation?.conversation_id) {
        try {
          const checkConv = await conversationService.getConversation(activeConversation.conversation_id);
          const lastMsg = checkConv.messages?.[checkConv.messages.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            setActiveConversation(checkConv);
            setSubmissionError(null);
            setPendingUserMessage(null);
            setIsSubmitting(false);
            return;
          }
        } catch {}
      }

      // Restore user input so draft is not lost
      setComposerValue(textToSend);
      setPendingUserMessage(null);
      setSubmissionError(
        err?.message || 'Seven-agent advisory execution encountered an issue. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismissNotice = () => setPreviewNotice(null);
  const handleDismissError = () => setSubmissionError(null);

  const hasMessages =
    activeConversation &&
    Array.isArray(activeConversation.messages) &&
    activeConversation.messages.length > 0;

  return (
    <div className="h-screen w-screen bg-[#212121] text-[#ECECEC] flex overflow-hidden select-none">
      {/* Desktop Navigation Rail / Sidebar */}
      <WorkspaceSidebar
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
        onNewChat={handleNewChat}
        user={user}
        onLogout={handleLogout}
        conversations={conversations}
        activeConversationId={conversationId || activeConversation?.conversation_id}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        isLoadingHistory={isLoadingHistory}
        historyError={historyError}
        onRetryHistory={loadHistory}
      />

      {/* Mobile Drawer Navigation (< lg) */}
      <WorkspaceMobileNavigation
        isOpen={mobileNavOpen}
        onClose={handleCloseMobileNav}
        onNewChat={handleNewChat}
        user={user}
        onLogout={handleLogout}
        conversations={conversations}
        activeConversationId={conversationId || activeConversation?.conversation_id}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        isLoadingHistory={isLoadingHistory}
        historyError={historyError}
        onRetryHistory={loadHistory}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[#212121] overflow-hidden">
        {/* Workspace Minimal Header */}
        <WorkspaceHeader
          isSidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={handleToggleCollapse}
          onOpenMobileNav={handleOpenMobileNav}
          title="AgroSage"
          subtitle="Intelligence for Every Acre."
          executionMode={executionMode}
        />

        {/* Scrollable Conversation Viewport & Empty State */}
        <main
          role="main"
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto flex flex-col justify-between items-center px-4 py-2 w-full"
        >
          {/* Active Conversation Messages or Loading/Empty State */}
          <div className="w-full flex-1 flex flex-col justify-start my-auto">
            {isLoadingActiveConversation ? (
              <div
                className="flex flex-col items-center justify-center my-auto space-y-3"
                data-testid="workspace-loading-conversation"
              >
                <Loader2 className="w-8 h-8 animate-spin text-[#8DBB91]" />
                <p className="text-xs text-[#A3A3A3]">Loading consultation thread...</p>
              </div>
            ) : activeConversationError ? (
              <div
                className="p-6 rounded-2xl bg-[#262626] border border-red-800/60 text-center max-w-md mx-auto my-auto space-y-3 shadow-xl"
                data-testid="workspace-conversation-error"
              >
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                <h3 className="font-bold text-sm text-[#ECECEC]">Consultation Not Found</h3>
                <p className="text-xs text-[#A3A3A3] leading-relaxed">{activeConversationError}</p>
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="px-4 py-2 rounded-xl bg-[#8DBB91] text-[#171717] font-semibold text-xs hover:bg-[#7ba87f] transition-colors"
                >
                  Start New Consultation
                </button>
              </div>
            ) : hasMessages ? (
              <div
                className="w-full max-w-3xl mx-auto space-y-6 py-4 px-2"
                data-testid="workspace-message-list"
              >
                {activeConversation.messages.map((m, idx) => (
                  <div key={m.message_id || idx}>
                    {m.role === 'user' ? (
                      <UserMessage message={m} />
                    ) : (
                      <AssistantMessage
                        message={m}
                        onSendFollowup={(followupText, autoSubmit) => {
                          if (autoSubmit) {
                            handleSend(followupText);
                          } else {
                            handleSelectPrompt(followupText);
                          }
                        }}
                      />
                    )}
                  </div>
                ))}

                {/* Optimistic Pending User Message & 7-Agent Working Indicator */}
                {isSubmitting && (
                  <div className="space-y-4 pt-1" data-testid="agent-working-indicator">
                    {pendingUserMessage && (
                      <UserMessage
                        message={{
                          message_id: 'pending-user',
                          role: 'user',
                          content: pendingUserMessage,
                        }}
                      />
                    )}

                    <div className="flex items-start gap-3 w-full animate-pulse">
                      <div className="w-8 h-8 rounded-xl bg-[#263e2d] border border-[#3d6545] text-[#8DBB91] flex items-center justify-center shrink-0 mt-0.5">
                        <Sprout className="w-4 h-4 animate-spin" />
                      </div>
                      <div className="flex-1 p-3.5 rounded-2xl bg-[#262626] border border-[#414141] text-xs space-y-2">
                        <div className="flex items-center gap-2 text-[#8DBB91] font-semibold">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>AgroSage is coordinating 7 agricultural agents...</span>
                        </div>
                        <p className="text-[11px] text-[#A3A3A3] leading-relaxed">
                          Synchronizing crop science, Open-Meteo weather telemetry, data.gov.in mandi quotes, and government scheme eligibility for evidence-grounded synthesis.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="w-full flex-1 flex flex-col items-center justify-center my-auto">
                <WorkspaceEmptyState onSelectPrompt={handleSelectPrompt} />
              </div>
            )}
          </div>

          {/* Submission Error Banner */}
          {submissionError && (
            <div
              role="alert"
              className="w-full max-w-3xl mx-auto mb-2 p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-200 flex items-start justify-between gap-3 shadow-lg animate-in fade-in duration-150"
              data-testid="workspace-submission-error"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-300">Consultation Error</p>
                  <p className="text-red-200/90 mt-0.5 leading-relaxed">{submissionError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismissError}
                className="p-1 rounded-lg text-red-300 hover:text-white hover:bg-red-900/40 transition-colors"
                aria-label="Dismiss error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Anchored Composer */}
          <WorkspaceComposerPreview
            value={composerValue}
            onChange={(e) => setComposerValue(e.target.value)}
            onSend={handleSend}
            isSubmitting={isSubmitting}
            previewNotice={previewNotice}
            onDismissNotice={handleDismissNotice}
            context={activeConversation?.context}
            isInheritedFromFarm={isInheritedFromFarm}
            onOpenContextDrawer={() => setIsContextDrawerOpen(true)}
            executionMode={executionMode}
            setExecutionMode={handleSetExecutionMode}
          />
        </main>
      </div>

      {/* Context and Farm Profile Drawer */}
      <WorkspaceContextDrawer
        isOpen={isContextDrawerOpen}
        onClose={() => setIsContextDrawerOpen(false)}
        activeContext={activeConversation?.context || {}}
        savedFarmProfile={savedFarmProfile}
        onSaveContext={handleSaveContext}
        onSaveFarmProfile={handleSaveFarmProfile}
        isSavingContext={isSavingContext}
        isSavingProfile={isSavingProfile}
      />
    </div>
  );
};
