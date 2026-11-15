import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, Plus, Sparkles, AlertCircle } from 'lucide-react';
import { conversationService } from '../../services/conversationService';
import { credentialService } from '../../services/credentialService';
import { useConfig } from '../../context/ConfigContext';
import { useToast } from '../../context/ToastContext';

import { EmptyState } from '../../components/chat/EmptyState';
import { UserMessage } from '../../components/chat/UserMessage';
import { AssistantMessage } from '../../components/chat/AssistantMessage';
import { MessageComposer } from '../../components/chat/MessageComposer';
import { LocationPickerModal } from '../../components/chat/LocationPickerModal';
import { ContextDrawer } from '../../components/chat/ContextDrawer';

export const ConversationalAdvisoryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { crops, locations } = useConfig();

  // Active conversation state
  const conversationIdFromUrl = searchParams.get('id');
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [isLoadingConvList, setIsLoadingConvList] = useState(true);
  const [isLoadingActiveConv, setIsLoadingActiveConv] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Message composer state
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Execution mode
  const [executionMode, setExecutionMode] = useState('deterministic');
  const [activeCredentials, setActiveCredentials] = useState([]);

  // Modals & drawers
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showContextDrawer, setShowContextDrawer] = useState(false);

  // Field context states (synced with backend)
  const [overrideCrop, setOverrideCrop] = useState('');
  const [overrideLocation, setOverrideLocation] = useState('');
  const [overrideStage, setOverrideStage] = useState('');
  const [overrideVariety, setOverrideVariety] = useState('');

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, isSending]);

  // Load available credentials
  useEffect(() => {
    credentialService
      .listCredentials()
      .then((creds) => {
        if (Array.isArray(creds)) {
          setActiveCredentials(creds.filter((c) => c.state === 'active'));
        }
      })
      .catch(() => {});
  }, []);

  // Load conversation list on mount
  useEffect(() => {
    loadConversationList();
  }, []);

  // When URL param changes or list loads, load specific conversation
  useEffect(() => {
    if (conversationIdFromUrl) {
      loadSpecificConversation(conversationIdFromUrl);
    } else {
      setActiveConversation(null);
      setOverrideCrop('');
      setOverrideLocation('');
      setOverrideStage('');
      setOverrideVariety('');
    }
  }, [conversationIdFromUrl]);

  const loadConversationList = async () => {
    try {
      setIsLoadingConvList(true);
      const res = await conversationService.listConversations({ limit: 50 });
      setConversations(res.items || []);

      // If no active ID in URL but we have conversations, select first
      if (!conversationIdFromUrl && res.items && res.items.length > 0) {
        const firstId = res.items[0].conversation_id;
        setSearchParams({ id: firstId }, { replace: true });
        loadSpecificConversation(firstId);
      }
    } catch (err) {
      console.error('Failed to load conversation list:', err);
    } finally {
      setIsLoadingConvList(false);
    }
  };

  const loadSpecificConversation = async (convId) => {
    try {
      setIsLoadingActiveConv(true);
      setErrorMessage(null);
      const conv = await conversationService.getConversation(convId);
      setActiveConversation(conv);

      // Prepopulate and synchronize context
      if (conv?.context) {
        setOverrideCrop(conv.context.crop || '');
        setOverrideLocation(conv.context.location || '');
        setOverrideStage(conv.context.growth_stage || '');
        setOverrideVariety(conv.context.variety || '');
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
      toast.error('Unable to load consultation thread');
      setActiveConversation(null);
    } finally {
      setIsLoadingActiveConv(false);
    }
  };

  const handleStartNewConsultation = () => {
    setActiveConversation(null);
    setSearchParams({});
    setInputText('');
    setOverrideCrop('');
    setOverrideLocation('');
    setOverrideStage('');
    setOverrideVariety('');
  };

  const handleApplyContextOverrides = async () => {
    if (activeConversation) {
      try {
        const updated = await conversationService.updateConversation(
          activeConversation.conversation_id,
          {
            crop: overrideCrop.trim(),
            location: overrideLocation.trim(),
            growth_stage: overrideStage.trim(),
            variety: overrideVariety.trim(),
          }
        );
        setActiveConversation(updated);
        toast.success('Field context synchronized');
      } catch (err) {
        toast.error(err?.message || 'Failed to update field context');
      }
    }
  };

  const handleConfirmLocation = async (locName) => {
    setOverrideLocation(locName);
    if (activeConversation) {
      try {
        const updated = await conversationService.updateConversation(
          activeConversation.conversation_id,
          { location: locName }
        );
        setActiveConversation(updated);
        toast.success(`Location confirmed: ${locName}`);
      } catch (err) {
        toast.error(err?.message || 'Failed to persist location');
      }
    } else {
      toast.success(`Location set: ${locName}`);
    }
  };

  const handleClearField = async (fieldName) => {
    if (fieldName === 'crop') setOverrideCrop('');
    if (fieldName === 'location') setOverrideLocation('');
    if (fieldName === 'growth_stage') setOverrideStage('');
    if (fieldName === 'variety') setOverrideVariety('');

    if (activeConversation) {
      try {
        const payload = {};
        payload[fieldName] = '';
        const updated = await conversationService.updateConversation(
          activeConversation.conversation_id,
          payload
        );
        setActiveConversation(updated);
      } catch {}
    }
  };

  const handleSendMessage = async (customText = null) => {
    const textToSend = (customText !== null ? customText : inputText).trim();
    if (!textToSend || isSending) return;

    setInputText('');
    setIsSending(true);
    setErrorMessage(null);

    try {
      if (!activeConversation) {
        // Create new conversation with initial message
        const newConv = await conversationService.createConversation({
          initial_message: textToSend,
          mode: executionMode,
          crop: overrideCrop.trim() || undefined,
          location: overrideLocation.trim() || undefined,
          growth_stage: overrideStage.trim() || undefined,
          variety: overrideVariety.trim() || undefined,
        });

        setIsSending(false);
        setActiveConversation(newConv);
        setConversations((prev) => [
          {
            conversation_id: newConv.conversation_id,
            title: newConv.title,
            message_count: newConv.messages.length,
            context: newConv.context,
            updated_at: newConv.updated_at,
          },
          ...prev.filter((c) => c.conversation_id !== newConv.conversation_id),
        ]);
        setSearchParams({ id: newConv.conversation_id });
        window.dispatchEvent(new CustomEvent('conversations-updated'));
        toast.success('Consultation started', '7 Agents Coordinated');
      } else {
        // Optimistically add user message to UI
        const optimisticUserMsg = {
          message_id: `temp-${Date.now()}`,
          conversation_id: activeConversation.conversation_id,
          role: 'user',
          content: textToSend,
          created_at: new Date().toISOString(),
        };

        setActiveConversation((prev) => ({
          ...prev,
          messages: [...(prev.messages || []), optimisticUserMsg],
        }));

        // Send follow-up message to backend
        const asstMsg = await conversationService.sendMessage(
          activeConversation.conversation_id,
          {
            content: textToSend,
            mode: executionMode,
            crop: overrideCrop.trim() || undefined,
            location: overrideLocation.trim() || undefined,
            growth_stage: overrideStage.trim() || undefined,
            variety: overrideVariety.trim() || undefined,
          }
        );

        setIsSending(false);

        // Fetch refreshed conversation to guarantee full context synchronization
        try {
          const freshConv = await conversationService.getConversation(
            activeConversation.conversation_id
          );
          setActiveConversation(freshConv);
          if (freshConv?.context) {
            setOverrideCrop(freshConv.context.crop || '');
            setOverrideLocation(freshConv.context.location || '');
            setOverrideStage(freshConv.context.growth_stage || '');
            setOverrideVariety(freshConv.context.variety || '');
          }
        } catch {
          // Fallback if re-fetch fails
          setActiveConversation((prev) => ({
            ...prev,
            messages: [
              ...(prev.messages || []).filter(
                (m) => m.message_id !== optimisticUserMsg.message_id
              ),
              optimisticUserMsg,
              asstMsg,
            ],
          }));
        }

        window.dispatchEvent(new CustomEvent('conversations-updated'));
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setIsSending(false);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Workflow execution error. Please try again.';
      setErrorMessage(msg);
      toast.error('Advisory execution failed', msg);
    }
  };

  const messages = activeConversation?.messages || [];
  const currentContext = activeConversation?.context || {
    crop: overrideCrop,
    location: overrideLocation,
    growth_stage: overrideStage,
    variety: overrideVariety,
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-[#212121] text-[#ECECEC] relative overflow-hidden">
      {/* Scrollable Conversation Stream */}
      <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          {isLoadingActiveConv ? (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#8DBB91]" />
              <p className="text-xs text-[#A3A3A3]">
                Loading conversation & field context...
              </p>
            </div>
          ) : !activeConversation || messages.length === 0 ? (
            <EmptyState onSelectPrompt={(text) => handleSendMessage(text)} />
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div key={msg.message_id || idx} className="space-y-4">
                  {msg.role === 'user' ? (
                    <UserMessage message={msg} />
                  ) : (
                    <AssistantMessage
                      message={msg}
                      onSendFollowup={(text) => handleSendMessage(text)}
                    />
                  )}
                </div>
              ))}
            </>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-300">Execution Error</p>
                <p className="text-[11px] text-red-200/90 leading-relaxed mt-0.5">
                  {errorMessage}
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Fixed Rounded Bottom Composer */}
      <div className="shrink-0 bg-gradient-to-t from-[#212121] via-[#212121]/95 to-transparent pt-3">
        <MessageComposer
          inputText={inputText}
          setInputText={setInputText}
          onSendMessage={() => handleSendMessage()}
          isSending={isSending}
          executionMode={executionMode}
          setExecutionMode={setExecutionMode}
          activeContext={currentContext}
          onOpenContextDrawer={() => setShowContextDrawer(true)}
          onOpenLocationPicker={() => setShowLocationModal(true)}
          onClearField={handleClearField}
        />
      </div>

      {/* Modals & Drawers */}
      <LocationPickerModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        currentLocation={overrideLocation || activeConversation?.context?.location}
        onConfirmLocation={handleConfirmLocation}
        locations={locations}
      />

      <ContextDrawer
        isOpen={showContextDrawer}
        onClose={() => setShowContextDrawer(false)}
        crop={overrideCrop}
        setCrop={setOverrideCrop}
        location={overrideLocation}
        setLocation={setOverrideLocation}
        growthStage={overrideStage}
        setGrowthStage={setOverrideStage}
        variety={overrideVariety}
        setVariety={setOverrideVariety}
        onApply={handleApplyContextOverrides}
        onOpenLocationPicker={() => {
          setShowContextDrawer(false);
          setShowLocationModal(true);
        }}
      />
    </div>
  );
};
