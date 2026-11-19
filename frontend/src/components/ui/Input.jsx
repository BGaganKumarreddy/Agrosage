import React, { forwardRef } from 'react';

export const Input = forwardRef(
  (
    {
      label,
      error,
      helperText,
      icon: Icon,
      rightElement,
      className = '',
      id,
      type = 'text',
      required = false,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-[var(--theme-text-muted)] mb-1.5">
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--theme-text-subtle)]">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            type={type}
            required={required}
            className={`w-full rounded-xl border ${
              error
                ? 'border-red-500/80 focus:ring-red-500/30'
                : 'border-[var(--theme-border)] focus:border-[var(--theme-accent)] focus:ring-[var(--theme-accent)]/30'
            } bg-[var(--theme-bg-composer)] px-3.5 py-2.5 text-sm text-[var(--theme-text-main)] placeholder:text-[var(--theme-text-subtle)] focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all ${
              Icon ? 'pl-10' : ''
            } ${rightElement ? 'pr-10' : ''} disabled:bg-[var(--theme-bg-card)] disabled:text-[var(--theme-text-subtle)] ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {rightElement}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        {helperText && !error && <p className="mt-1 text-[11px] text-[var(--theme-text-subtle)]">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export const Select = forwardRef(
  (
    {
      label,
      error,
      helperText,
      options = [],
      className = '',
      id,
      required = false,
      placeholder = 'Select an option',
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-[var(--theme-text-muted)] mb-1.5">
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          required={required}
          className={`w-full rounded-xl border ${
            error
              ? 'border-red-500/80 focus:ring-red-500/30'
              : 'border-[var(--theme-border)] focus:border-[var(--theme-accent)] focus:ring-[var(--theme-accent)]/30'
          } bg-[var(--theme-bg-composer)] px-3.5 py-2.5 text-sm text-[var(--theme-text-main)] focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all cursor-pointer ${className}`}
          {...props}
        >
          {placeholder && <option value="" disabled className="bg-[var(--theme-bg-card)]">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[var(--theme-bg-card)] text-[var(--theme-text-main)]">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        {helperText && !error && <p className="mt-1 text-[11px] text-[var(--theme-text-subtle)]">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export const Textarea = forwardRef(
  (
    {
      label,
      error,
      helperText,
      className = '',
      id,
      required = false,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-semibold text-[var(--theme-text-muted)] mb-1.5">
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          required={required}
          rows={rows}
          className={`w-full rounded-xl border ${
            error
              ? 'border-red-500/80 focus:ring-red-500/30'
              : 'border-[var(--theme-border)] focus:border-[var(--theme-accent)] focus:ring-[var(--theme-accent)]/30'
          } bg-[var(--theme-bg-composer)] px-3.5 py-2.5 text-sm text-[var(--theme-text-main)] placeholder:text-[var(--theme-text-subtle)] focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        {helperText && !error && <p className="mt-1 text-[11px] text-[var(--theme-text-subtle)]">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
