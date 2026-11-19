import React, { useRef, useEffect, useState } from 'react';
import {
  ArrowUp,
  MapPin,
  Sprout,
  Image as ImageIcon,
  Mic,
  MicOff,
  AudioWaveform,
  SlidersHorizontal,
  Sparkles,
  Loader2,
  X,
  ChevronDown,
} from 'lucide-react';

export const MessageComposer = ({
  inputText,
  setInputText,
  onSendMessage,
  isSending,
  executionMode = 'deterministic',
  setExecutionMode,
  activeContext,
  onOpenContextDrawer,
  onOpenLocationPicker,
  onClearField,
}) => {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState(false);

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
      if ((inputText.trim() || selectedPhoto) && !isSending) {
        onSendMessage();
      }
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPhoto({
        name: file.name,
        previewUrl: URL.createObjectURL(file),
      });
    }
  };

  const handleClearPhoto = (e) => {
    e.stopPropagation();
    if (selectedPhoto?.previewUrl) {
      URL.revokeObjectURL(selectedPhoto.previewUrl);
    }
    setSelectedPhoto(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. You can type your query.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (isRecording) {
      setIsRecording(false);
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';
      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(inputText ? `${inputText} ${transcript}` : transcript);
        }
      };
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  const hasContext = Boolean(
    activeContext?.crop ||
      activeContext?.location ||
      activeContext?.growth_stage ||
      activeContext?.variety
  );

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-3 pt-1 select-none">
      {/* Hidden File Input for Crop Photo */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoSelect}
        className="hidden"
        aria-hidden="true"
      />

      {/* Selected Photo Thumbnail Preview */}
      {selectedPhoto && (
        <div className="flex items-center gap-2 mb-2 p-1.5 px-3 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border)] text-xs text-[var(--theme-text-main)] w-fit">
          <img
            src={selectedPhoto.previewUrl}
            alt="Selected Crop"
            className="w-7 h-7 rounded object-cover border border-[var(--theme-border)]"
          />
          <span className="truncate max-w-[150px] sm:max-w-xs">{selectedPhoto.name}</span>
          <button
            type="button"
            onClick={handleClearPhoto}
            className="p-1 text-[var(--theme-text-muted)] hover:text-red-400"
            title="Remove photo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Active Context Chips Pill Bar */}
      {hasContext && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2 px-3 py-1.5 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border)] text-xs text-[var(--theme-text-main)]">
          <span className="text-[10px] uppercase font-bold text-[var(--theme-accent)] tracking-wider mr-1">
            Active Context:
          </span>

          {activeContext.crop && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--theme-bg-composer)] border border-[var(--theme-border)] text-[11px]">
              <span>🌾 {activeContext.crop}</span>
              {onClearField && (
                <button
                  type="button"
                  onClick={() => onClearField('crop')}
                  className="text-[var(--theme-text-muted)] hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          )}

          {activeContext.location && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--theme-bg-composer)] border border-[var(--theme-border)] text-[11px]">
              <span>📍 {activeContext.location}</span>
              {onClearField && (
                <button
                  type="button"
                  onClick={() => onClearField('location')}
                  className="text-[var(--theme-text-muted)] hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          )}

          {activeContext.growth_stage && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--theme-bg-composer)] border border-[var(--theme-border)] text-[11px]">
              <span>🌱 {activeContext.growth_stage}</span>
              {onClearField && (
                <button
                  type="button"
                  onClick={() => onClearField('growth_stage')}
                  className="text-[var(--theme-text-muted)] hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          )}

          {activeContext.variety && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--theme-bg-composer)] border border-[var(--theme-border)] text-[11px]">
              <span>🏷️ {activeContext.variety}</span>
              {onClearField && (
                <button
                  type="button"
                  onClick={() => onClearField('variety')}
                  className="text-[var(--theme-text-muted)] hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          )}

          <button
            type="button"
            onClick={onOpenContextDrawer}
            className="text-[10px] text-[var(--theme-accent)] hover:underline ml-auto font-medium cursor-pointer"
          >
            Edit
          </button>
        </div>
      )}

      {/* Main Rounded Input Box matching Target Reference */}
      <div
        className="bg-[var(--theme-bg-composer)] border border-[var(--theme-border)] rounded-3xl p-3.5 shadow-2xl transition-all focus-within:border-[var(--theme-accent)] space-y-2"
        style={{
          boxShadow: 'var(--theme-composer-glow)',
        }}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSending}
          placeholder="Ask about crop health, weather, mandi prices, or schemes... Message AgroSage (e.g. crop pests, mandi rates, rainfall)"
          aria-label="Message AgroSage"
          className="w-full bg-transparent border-none text-[var(--theme-text-main)] text-sm leading-relaxed placeholder-[var(--theme-text-subtle)] focus:outline-none resize-none max-h-44 min-h-[36px] px-1"
        />

        {/* Action Controls Toolbar */}
        <div className="flex items-center justify-between pt-2.5 border-t border-[var(--theme-border)]/60 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Field Location / Acreage Pill Button */}
            <button
              type="button"
              onClick={onOpenLocationPicker}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--theme-bg-card)] hover:bg-[var(--theme-bg-hover)] border border-[var(--theme-border)] hover:border-[var(--theme-accent)] text-xs text-[var(--theme-text-main)] transition-colors cursor-pointer"
              title="Detect field location with browser GPS"
            >
              <Sprout className="w-3.5 h-3.5 text-[var(--theme-accent)]" />
              <span className="text-[11px] sm:text-xs font-medium text-[var(--theme-accent)]">
                {activeContext?.location ? activeContext.location : 'Guntur • 8.5 Ac'}
              </span>
            </button>

            {/* Crop Photo Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--theme-bg-card)] hover:bg-[var(--theme-bg-hover)] border border-[var(--theme-border)] hover:border-[var(--theme-accent)] text-xs text-[var(--theme-text-main)] transition-colors cursor-pointer"
              title="Attach photo of crop or symptoms"
              aria-label="Upload photo"
            >
              <ImageIcon className="w-3.5 h-3.5 text-[var(--theme-text-muted)]" />
              <span className="text-[11px] sm:text-xs font-medium">Photo</span>
            </button>

            {/* Voice Input Button */}
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                isRecording
                  ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                  : 'bg-[var(--theme-bg-card)] hover:bg-[var(--theme-bg-hover)] border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'
              }`}
              title={isRecording ? 'Stop voice recording' : 'Voice input (Speak query)'}
              aria-label="Toggle voice input"
            >
              {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>

            {/* Audio Waveform / Readout Toggle */}
            <button
              type="button"
              onClick={() => setAudioFeedbackEnabled((prev) => !prev)}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                audioFeedbackEnabled
                  ? 'bg-[var(--theme-bg-hover)] border-[var(--theme-accent)] text-[var(--theme-accent)]'
                  : 'bg-[var(--theme-bg-card)] hover:bg-[var(--theme-bg-hover)] border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'
              }`}
              title={audioFeedbackEnabled ? 'Audio responses enabled' : 'Toggle audio reading'}
              aria-label="Toggle audio interaction"
            >
              <AudioWaveform className="w-3.5 h-3.5" />
            </button>

            {/* Field Context Modal Trigger */}
            <button
              type="button"
              onClick={onOpenContextDrawer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--theme-bg-card)] hover:bg-[var(--theme-bg-hover)] border border-[var(--theme-border)] text-xs text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] transition-colors cursor-pointer"
              title="Adjust Field Context"
              aria-label="Adjust Field Context"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--theme-accent)]" />
              <span className="text-[11px] font-medium">Adjust Field Context</span>
            </button>
          </div>

          {/* Right Actions: AI Mode & Send Button */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Execution Mode Select */}
            <div className="relative">
              <select
                data-testid="execution-mode-select"
                value={executionMode}
                onChange={(e) => setExecutionMode && setExecutionMode(e.target.value)}
                className="appearance-none bg-[var(--theme-bg-card)] hover:bg-[var(--theme-bg-hover)] border border-[var(--theme-border)] hover:border-[var(--theme-accent)] text-[var(--theme-text-main)] text-xs rounded-full pl-3 pr-7 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)] cursor-pointer transition-colors"
              >
                <option value="deterministic">Deterministic Baseline</option>
                <option value="groq">Groq Cloud LPU</option>
                <option value="gemini">Google Gemini API</option>
                <option value="cerebras">Cerebras Engine</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--theme-text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Circular Green Send Button */}
            <button
              type="button"
              onClick={() => onSendMessage()}
              disabled={(!inputText.trim() && !selectedPhoto) || isSending}
              aria-label="Send"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                (inputText.trim() || selectedPhoto) && !isSending
                  ? 'bg-[var(--theme-accent)] text-black hover:scale-105 hover:bg-[var(--theme-accent-hover)] shadow-lg shadow-emerald-950/40 cursor-pointer font-bold'
                  : 'bg-[var(--theme-border)] text-[var(--theme-text-subtle)] cursor-not-allowed opacity-50'
              }`}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : (
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Generation Status / Step Banner */}
      {isSending && (
        <div className="flex items-center justify-center gap-2 pt-2 text-xs text-[var(--theme-accent)] animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="text-[11px]">Coordinating 7 agricultural specialist agents...</span>
        </div>
      )}

      {/* Subtle Footer */}
      <div className="text-center pt-2">
        <p className="text-[10px] text-[var(--theme-text-subtle)] font-medium tracking-wide">
          AgroSage Multi-Agent Intelligence • Autonomous Advisory Architecture
        </p>
      </div>
    </div>
  );
};
