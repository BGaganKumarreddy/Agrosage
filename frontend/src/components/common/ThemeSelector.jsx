import React from 'react';
import { useTheme, THEMES } from '../../context/ThemeContext';

export const ThemeSelector = ({ className = '' }) => {
  const { theme, setTheme } = useTheme();

  const options = [
    {
      id: THEMES.SOIL,
      label: 'Soil',
      dotColor: '#10B981',
      activeRing: 'border-[#10B981]',
    },
    {
      id: THEMES.SUNLIT,
      label: 'Sunlit',
      dotColor: '#EAB308',
      activeRing: 'border-[#EAB308]',
    },
    {
      id: THEMES.TERRACOTTA,
      label: 'Terracotta',
      dotColor: '#EA580C',
      activeRing: 'border-[#EA580C]',
    },
  ];

  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 text-xs select-none ${className}`}>
      {options.map((opt) => {
        const isSelected = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
              isSelected
                ? 'bg-[var(--theme-bg-hover)] text-[var(--theme-text-main)] border border-[var(--theme-accent)] shadow-sm'
                : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-hover)]/60 border border-transparent'
            }`}
            title={`Switch to ${opt.label} appearance`}
            aria-pressed={isSelected}
          >
            {/* Radio / Dot Indicator matching screenshot */}
            <span
              className={`w-2.5 h-2.5 rounded-full flex items-center justify-center transition-transform ${
                isSelected ? 'scale-110' : 'opacity-80'
              }`}
              style={{
                backgroundColor: opt.dotColor,
                boxShadow: isSelected ? `0 0 8px ${opt.dotColor}80` : 'none',
              }}
            />
            <span className="text-[11px] sm:text-xs">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
