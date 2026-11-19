import React, { useRef, useEffect, useState } from 'react';
import {
  ArrowUp,
  MapPin,
  Sprout,
  Image as ImageIcon,
  Mic,
  MicOff,
  AudioWaveform,
  Volume2,
  VolumeX,
  X,
  Loader2,
  ChevronDown,
} from 'lucide-react';

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
  executionMode = 'deterministic',
  setExecutionMode,
}) => {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState(false);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((value.trim() || selectedPhoto) && !isSubmitting && !disabled) {
        onSend();
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

  // Voice recognition toggle using Web Speech API if available
  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. You can type your question.');
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
          const syntheticEvent = { target: { value: value ? `${value} ${transcript}` : transcript } };
          onChange(syntheticEvent);
        }
      };
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  const locationDisplay = context?.location || 'Guntur';
  const acreageDisplay = context?.acreage ? `${context.acreage} Ac` : '8.5 Ac';
  const isSendDisabled = (!value.trim() && !selectedPhoto) || isSubmitting || disabled;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-3 pt-1 shrink-0 select-none">
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

      {/* Main Large Rounded Composer Card matching Target Reference */}
      <div
        className="bg-[var(--theme-bg-composer)] border border-[var(--theme-border)] rounded-3xl p-3.5 shadow-2xl transition-all focus-within:border-[var(--theme-accent)]"
        style={{
          boxShadow: 'var(--theme-composer-glow)',
        }}
      >
        {/* Text Input Area */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting || disabled}
          placeholder={placeholder}
          aria-label="Message AgroSage"
          rows={1}
          className="w-full bg-transparent text-[var(--theme-text-main)] placeholder-[var(--theme-text-subtle)] resize-none focus:outline-none text-sm leading-relaxed max-h-44 min-h-[36px] disabled:opacity-50 px-1"
        />

        {/* Action Controls & Toolbar Row matching Screenshot */}
        <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-[var(--theme-border)]/60 flex-wrap gap-2">
          {/* Left Actions: Location/Acreage, Crop Photo, Voice, Audio */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Location & Acreage Pill Button */}
            <button
              type="button"
              onClick={onOpenContextDrawer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--theme-bg-card)] hover:bg-[var(--theme-bg-hover)] border border-[var(--theme-border)] hover:border-[var(--theme-accent)] text-xs text-[var(--theme-text-main)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)] focus-visible:outline-none cursor-pointer"
              title="Click to adjust field location and acreage"
              aria-label={`Field Location: ${locationDisplay}, ${acreageDisplay}`}
            >
              <Sprout className="w-3.5 h-3.5 text-[var(--theme-accent)]" />
              <span className="font-medium text-[11px] sm:text-xs text-[var(--theme-accent)]">
                {locationDisplay} • {acreageDisplay}
              </span>
            </button>

            {/* Crop Photo Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--theme-bg-card)] hover:bg-[var(--theme-bg-hover)] border border-[var(--theme-border)] hover:border-[var(--theme-accent)] text-xs text-[var(--theme-text-main)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)] focus-visible:outline-none cursor-pointer"
              title="Attach photo of crop or symptoms"
              aria-label="Upload crop photo"
            >
              <ImageIcon className="w-3.5 h-3.5 text-[var(--theme-text-muted)]" />
              <span className="font-medium text-[11px] sm:text-xs">Crop Photo</span>
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

            {/* Audio Waveform / Interaction Toggle */}
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
          </div>

          {/* Right Actions: AI Inference Mode Selector & Circular Send Button */}
          <div className="flex items-center gap-2 ml-auto">
            {/* AI Inference Mode Dropdown */}
            <div className="relative">
              <select
                value={executionMode}
                onChange={(e) => setExecutionMode && setExecutionMode(e.target.value)}
                className="appearance-none bg-[var(--theme-bg-card)] hover:bg-[var(--theme-bg-hover)] border border-[var(--theme-border)] hover:border-[var(--theme-accent)] text-[var(--theme-text-main)] text-xs rounded-full pl-3 pr-7 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)] cursor-pointer transition-colors"
                aria-label="Select AI Inference Mode"
              >
                <option value="deterministic">Deterministic Baseline</option>
                <option value="groq">Groq Cloud LPU</option>
                <option value="gemini">Google Gemini API</option>
                <option value="cerebras">Cerebras Engine</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--theme-text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Circular Green Send Button matching Screenshot */}
            <button
              type="button"
              onClick={onSend}
              disabled={isSendDisabled}
              aria-label="Send message"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                !isSendDisabled
                  ? 'bg-[var(--theme-accent)] text-black hover:scale-105 hover:bg-[var(--theme-accent-hover)] shadow-lg shadow-emerald-950/40 cursor-pointer font-bold'
                  : 'bg-[var(--theme-border)] text-[var(--theme-text-subtle)] cursor-not-allowed opacity-50'
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : (
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Subtle Footer matching Reference */}
      <div className="text-center pt-2">
        <p className="text-[10px] text-[var(--theme-text-subtle)] font-medium tracking-wide">
          AgroSage Multi-Agent Intelligence • Autonomous Advisory Architecture
        </p>
      </div>
    </div>
  );
};
