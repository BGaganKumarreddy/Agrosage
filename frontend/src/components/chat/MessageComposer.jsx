import React, { useRef, useEffect } from 'react';
import {
  ArrowUp,
  MapPin,
  SlidersHorizontal,
  Sparkles,
  Loader2,
  X,
  Compass,
} from 'lucide-react';

export const MessageComposer = ({
  inputText,
  setInputText,
  onSendMessage,
  isSending,
  executionMode,
  setExecutionMode,
  activeContext,
  onOpenContextDrawer,
  onOpenLocationPicker,
  onClearField,
}) => {
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        180
      )}px`;
    }
  }, [inputText]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputText.trim() && !isSending) {
        onSendMessage();
      }
    }
  };

  const hasContext = Boolean(
    activeContext?.crop ||
      activeContext?.location ||
      activeContext?.growth_stage ||
      activeContext?.variety
  );

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4">
      {/* Active Context Chips Pill Bar */}
      {hasContext && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2 px-3 py-1.5 rounded-xl bg-[#262626] border border-[#414141] text-xs text-[#ECECEC]">
          <span className="text-[10px] uppercase font-bold text-[#8DBB91] tracking-wider mr-1">
            Active Context:
          </span>

          {activeContext.crop && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#171717] border border-[#414141] text-[11px]">
              <span>🌾 {activeContext.crop}</span>
              {onClearField && (
                <button
                  type="button"
                  onClick={() => onClearField('crop')}
                  className="text-[#A3A3A3] hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          )}

          {activeContext.location && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#171717] border border-[#414141] text-[11px]">
              <span>📍 {activeContext.location}</span>
              {onClearField && (
                <button
                  type="button"
                  onClick={() => onClearField('location')}
                  className="text-[#A3A3A3] hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          )}

          {activeContext.growth_stage && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#171717] border border-[#414141] text-[11px]">
              <span>🌱 {activeContext.growth_stage}</span>
              {onClearField && (
                <button
                  type="button"
                  onClick={() => onClearField('growth_stage')}
                  className="text-[#A3A3A3] hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          )}

          {activeContext.variety && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#171717] border border-[#414141] text-[11px]">
              <span>🏷️ {activeContext.variety}</span>
              {onClearField && (
                <button
                  type="button"
                  onClick={() => onClearField('variety')}
                  className="text-[#A3A3A3] hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          )}

          <button
            type="button"
            onClick={onOpenContextDrawer}
            className="text-[10px] text-[#8DBB91] hover:underline ml-auto font-medium"
          >
            Edit
          </button>
        </div>
      )}

      {/* Main Rounded Input Box */}
      <div className="bg-[#303030] border border-[#414141] rounded-3xl p-3 shadow-xl focus-within:border-[#737373] transition-colors space-y-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSending}
          placeholder="Ask about crop health, weather, mandi prices, or schemes..."
          className="w-full bg-transparent border-none text-[#ECECEC] text-sm leading-relaxed placeholder-[#737373] focus:outline-none resize-none max-h-44 px-1"
        />

        {/* Action Controls Toolbar */}
        <div className="flex items-center justify-between pt-1 border-t border-[#414141]/50">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* GPS Location Button */}
            <button
              type="button"
              onClick={onOpenLocationPicker}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#262626] hover:bg-[#383838] border border-[#414141] text-xs text-[#A3A3A3] hover:text-[#ECECEC] transition-colors"
              title="Detect field location with browser GPS"
            >
              <MapPin className="w-3.5 h-3.5 text-[#8DBB91]" />
              <span className="text-[11px] font-medium hidden sm:inline">
                {activeContext?.location ? activeContext.location : 'Detect Location'}
              </span>
            </button>

            {/* Adjust Field Context Button */}
            <button
              type="button"
              onClick={onOpenContextDrawer}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#262626] hover:bg-[#383838] border border-[#414141] text-xs text-[#A3A3A3] hover:text-[#ECECEC] transition-colors"
              title="Adjust Field Context"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#8DBB91]" />
              <span className="text-[11px] font-medium">Adjust Field Context</span>
            </button>

            {/* Execution Mode Select */}
            <div className="flex items-center gap-1 text-[11px] text-[#737373] ml-1">
              <select
                data-testid="execution-mode-select"
                value={executionMode}
                onChange={(e) => setExecutionMode(e.target.value)}
                className="bg-[#262626] border border-[#414141] rounded-lg px-2 py-1 text-[11px] text-[#ECECEC] focus:outline-none focus:border-[#8DBB91] cursor-pointer"
              >
                <option value="deterministic">Deterministic Baseline</option>
                <option value="groq">Groq Cloud LPU</option>
                <option value="gemini">Google Gemini API</option>
                <option value="cerebras">Cerebras Engine</option>
              </select>
            </div>
          </div>

          {/* Send Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSendMessage()}
              disabled={!inputText.trim() || isSending}
              aria-label="Send"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                inputText.trim() && !isSending
                  ? 'bg-[#8DBB91] text-[#171717] hover:bg-[#7ba87f] shadow-md shadow-emerald-950/40 cursor-pointer'
                  : 'bg-[#414141] text-[#737373] cursor-not-allowed opacity-50'
              }`}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#ECECEC]" />
              ) : (
                <ArrowUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Generation Status / Step Banner */}
      {isSending && (
        <div className="flex items-center justify-center gap-2 pt-2 text-xs text-[#8DBB91] animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="text-[11px]">Coordinating 7 agricultural specialist agents...</span>
        </div>
      )}
    </div>
  );
};
