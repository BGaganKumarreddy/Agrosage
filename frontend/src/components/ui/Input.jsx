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
          <label htmlFor={inputId} className="block text-xs font-semibold text-[#A3A3A3] mb-1.5">
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#737373]">
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
                : 'border-[#414141] focus:border-[#8DBB91] focus:ring-[#8DBB91]/30'
            } bg-[#171717] px-3.5 py-2.5 text-sm text-[#ECECEC] placeholder:text-[#737373] focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all ${
              Icon ? 'pl-10' : ''
            } ${rightElement ? 'pr-10' : ''} disabled:bg-[#212121] disabled:text-[#737373] ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {rightElement}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        {helperText && !error && <p className="mt-1 text-[11px] text-[#737373]">{helperText}</p>}
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
      icon: Icon,
      options = [],
      placeholder = 'Select an option',
      className = '',
      id,
      required = false,
      children,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-[#A3A3A3] mb-1.5">
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#737373]">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <select
            id={selectId}
            ref={ref}
            required={required}
            className={`w-full rounded-xl border ${
              error
                ? 'border-red-500/80 focus:ring-red-500/30'
                : 'border-[#414141] focus:border-[#8DBB91] focus:ring-[#8DBB91]/30'
            } bg-[#171717] px-3.5 py-2.5 text-sm text-[#ECECEC] focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all appearance-none cursor-pointer ${
              Icon ? 'pl-10' : ''
            } disabled:bg-[#212121] disabled:text-[#737373] ${className}`}
            {...props}
          >
            {placeholder && <option value="" className="bg-[#171717] text-[#737373]">{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#171717] text-[#ECECEC]">
                {opt.label}
              </option>
            ))}
            {children}
          </select>
        </div>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        {helperText && !error && <p className="mt-1 text-[11px] text-[#737373]">{helperText}</p>}
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
      rows = 4,
      required = false,
      ...props
    },
    ref
  ) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-semibold text-[#A3A3A3] mb-1.5">
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          required={required}
          className={`w-full rounded-xl border ${
            error
              ? 'border-red-500/80 focus:ring-red-500/30'
              : 'border-[#414141] focus:border-[#8DBB91] focus:ring-[#8DBB91]/30'
          } bg-[#171717] p-3 text-sm text-[#ECECEC] placeholder:text-[#737373] focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all resize-y ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        {helperText && !error && <p className="mt-1 text-[11px] text-[#737373]">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
