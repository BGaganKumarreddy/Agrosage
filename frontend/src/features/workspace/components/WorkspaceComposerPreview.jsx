import React, { useRef, useEffect } from 'react';
import { ArrowUp, MapPin, Sprout, Info, X, Loader2 } from 'lucide-react';

export const WorkspaceComposerPreview = ({
  value = '',
  onChange,
  onSend,
  previewNotice = null,
  onDismissNotice,
  isSubmitting = false,
  disabled = false,
  placeholder = 'Message AgroSage... (e.g., Ask about crop pests, mandi rates, or rainfall)',
  context = null,
  isInheritedFromFarm = false,
  onOpenContextDrawer,
}) => {
  const textareaRef = useRef(null);

  // Auto-resize textarea height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isSubmitting && !disabled) {
        onSend();
      }
    }
  };

  const isSendDisabled = !value.trim() || isSubmitting || disabled;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4 pt-1 shrink-0">
      {/* Preview Boundary Notice Banner */}
      {previewNotice && (
        <div
          role="status"
          aria-live="polite"
          className="p-3 mb-2 rounded-xl bg-[#262626] border border-[#8DBB91]/50 text-xs text-[#ECECEC] flex items-start justify-between gap-3 shadow-lg animate-in fade-in duration-150"
          data-testid="composer-preview-notice"
        >
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-[#8DBB91] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#8DBB91]">Stage 1 Preview Mode</p>
              <p className="text-[#A3A3A3] mt-0.5 leading-relaxed">{previewNotice}</p>
            </div>
          </div>
          {onDismissNotice && (
            <button
              type="button"
              onClick={onDismissNotice}
              className="p-1 rounded-lg text-[#A3A3A3] hover:text-[#ECECEC] hover:bg-[#303030] transition-colors focus-visible:ring-2 focus-visible:ring-[#8DBB91] focus-visible:outline-none"
              aria-label="Dismiss preview notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Main Composer Box */}
      <div className="bg-[#303030] border border-[#414141] rounded-2xl p-3 shadow-2xl focus-within:border-[#8DBB91]/70 focus-within:ring-1 focus-within:ring-[#8DBB91]/40 transition-all">
        {/* Multi-line Text Input */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting || disabled}
          placeholder={placeholder}
          aria-label="Message AgroSage preview composer"
          rows={1}
          className="w-full bg-transparent text-[#ECECEC] placeholder-[#737373] resize-none focus:outline-none text-sm leading-relaxed max-h-44 min-h-[28px] disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* Action Controls & Send Row */}
        <div className="flex items-center justify-between pt-2 mt-1 border-t border-[#414141]/50">
          {/* Active Consultation Context Indicators & Edit Trigger */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {context && (context.crop || context.location) ? (
              <>
                {context.location && (
                  <button
                    type="button"
                    onClick={onOpenContextDrawer}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#262626] hover:bg-[#2e2e2e] border border-[#8DBB91]/40 text-[11px] text-[#ECECEC] transition-colors focus-visible:ring-2 focus-visible:ring-[#8DBB91] focus-visible:outline-none cursor-pointer"
                    aria-label={`Location: ${context.location}`}
                    title="Click to edit consultation location"
                    data-testid="composer-location-badge"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#8DBB91]" />
                    <span>{context.location}</span>
                  </button>
                )}
                {context.crop && (
                  <button
                    type="button"
                    onClick={onOpenContextDrawer}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#262626] hover:bg-[#2e2e2e] border border-[#8DBB91]/40 text-[11px] text-[#ECECEC] transition-colors focus-visible:ring-2 focus-visible:ring-[#8DBB91] focus-visible:outline-none cursor-pointer"
                    aria-label={`Crop: ${context.crop}`}
                    title="Click to edit consultation crop parameters"
                    data-testid="composer-crop-badge"
                  >
                    <Sprout className="w-3.5 h-3.5 text-[#8DBB91]" />
                    <span>
                      {context.crop}
                      {context.variety ? ` • ${context.variety}` : ''}
                      {context.growth_stage ? ` (${context.growth_stage})` : ''}
                    </span>
                  </button>
                )}
                {isInheritedFromFarm && (
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] bg-[#8DBB91]/15 text-[#8DBB91] border border-[#8DBB91]/30 font-medium"
                    title="Context inherited from your saved My Farm profile"
                    data-testid="composer-inherited-badge"
                  >
                    Farm Default
                  </span>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={onOpenContextDrawer}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#262626] hover:bg-[#2a2a2a] border border-[#414141] text-[11px] text-[#A3A3A3] hover:text-[#ECECEC] transition-colors focus-visible:ring-2 focus-visible:ring-[#8DBB91] focus-visible:outline-none cursor-pointer"
                aria-label="Add your farm details"
                title="Configure crop and location context"
              >
                <Sprout className="w-3.5 h-3.5 text-[#8DBB91]" />
                <span>Add your farm details</span>
              </button>
            )}
          </div>

          {/* Send Action */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSend}
              disabled={isSendDisabled}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-[#8DBB91] focus-visible:outline-none ${
                isSendDisabled
                  ? 'bg-[#414141] text-[#737373] cursor-not-allowed opacity-50'
                  : 'bg-[#ECECEC] text-[#171717] hover:bg-white active:scale-95 cursor-pointer shadow-md'
              }`}
              aria-label="Send message preview"
              title={isSubmitting ? 'AgroSage is coordinating agents...' : isSendDisabled ? 'Type an inquiry to send' : 'Send message'}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#8DBB91]" />
              ) : (
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Accessibility / Stage Footnote */}
      <p className="text-[10px] text-center text-[#737373] mt-2 leading-none">
        AgroSage Multi-Agent Intelligence • Seven-Agent Synchronous Advisory Architecture
      </p>
    </div>
  );
};
