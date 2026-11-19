import React, { useState, useEffect } from 'react';
import { Sprout, Bug, TrendingUp, Landmark, CloudRain, Sparkles } from 'lucide-react';
import { MangoHeroIllustration } from '../../../components/common/MangoHeroIllustration';
import { healthService } from '../../../services/healthService';

export const SUGGESTED_PROMPTS = [
  {
    id: 'cotton-ipm',
    category: 'Crop Diagnostics',
    icon: Bug,
    title: 'Cotton pest diagnosis',
    description: 'Identify early signs of pink bollworm and IPM controls',
    prompt: 'What are the common symptoms of pink bollworm in cotton and recommended IPM control measures?',
  },
  {
    id: 'chilli-mandi',
    category: 'Market Intelligence',
    icon: TrendingUp,
    title: 'Chilli mandi prices',
    description: 'Check the latest arrivals and modal prices for your selected market.',
    prompt: 'What are the current market arrivals and modal prices for red chilli in my local mandi?',
  },
  {
    id: 'pm-kusum',
    category: 'Government Schemes',
    icon: Landmark,
    title: 'Solar pump subsidy',
    description: 'PM-KUSUM eligibility criteria and application checklist',
    prompt: 'What are the eligibility criteria and subsidy guidelines for PM-KUSUM solar water pumps?',
  },
  {
    id: 'paddy-weather',
    category: 'Weather & Risk',
    icon: CloudRain,
    title: 'Paddy irrigation risk',
    description: 'Plan irrigation schedule based on upcoming rainfall forecast',
    prompt: 'Assess rainfall and pest risk for my paddy crop based on this week forecast.',
  },
];

export const WorkspaceEmptyState = ({ onSelectPrompt, context = null }) => {
  // Agricultural Context Telemetry Pill
  const season = 'Rabi Season';
  const weatherText = '24°C Clear';
  const soilText = 'Soil Moisture Optimal';

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center text-center py-6 sm:py-8 px-4 space-y-5 select-none">
      {/* Central Mango Illustration matching Target Reference */}
      <div className="flex justify-center -mb-2">
        <MangoHeroIllustration className="w-28 h-28 sm:w-32 sm:h-32" />
      </div>

      {/* Compact Status Context Pill matching Screenshot */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--theme-bg-composer)] border border-[var(--theme-border)] text-xs text-[var(--theme-text-main)] shadow-sm">
        <span className="w-2 h-2 rounded-full bg-[var(--theme-accent)] animate-pulse shrink-0" />
        <span className="font-medium text-[11px] sm:text-xs">
          {season} • <strong className="font-semibold text-white">{weatherText}</strong> • <span className="text-[var(--theme-accent)]">{soilText}</span>
        </span>
      </div>

      {/* Brand Hero & Advisory Capabilities */}
      <div className="space-y-1.5">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--theme-text-main)] leading-none">
          AgroSage
        </h2>
        <p className="text-sm sm:text-base font-semibold text-[var(--theme-accent)] tracking-tight">
          Intelligence for Every Acre.
        </p>
        <p className="text-xs sm:text-sm text-[var(--theme-text-muted)] max-w-lg mx-auto leading-relaxed pt-1">
          Ask questions about crop diseases, weather impact, market prices, government schemes, or farm risk mitigation.
        </p>
      </div>

      {/* Suggested Prompts Section */}
      <div className="w-full space-y-2.5 pt-2">
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[var(--theme-text-subtle)] uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-[var(--theme-accent)]" />
          <span>Suggested agricultural inquiries</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
          {SUGGESTED_PROMPTS.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectPrompt(item.prompt)}
                className="group p-3 rounded-2xl bg-[var(--theme-bg-card)] border border-[var(--theme-border)] hover:border-[var(--theme-accent)] hover:bg-[var(--theme-bg-hover)] transition-all text-left flex flex-col justify-between space-y-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)] focus-visible:outline-none shadow-sm"
                aria-label={`Prompt suggestion: ${item.title}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-bold text-[var(--theme-accent)] uppercase tracking-wider">
                    {item.category}
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-[var(--theme-bg-composer)] text-[var(--theme-text-muted)] group-hover:text-[var(--theme-text-main)] flex items-center justify-center transition-colors">
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-[var(--theme-text-main)] group-hover:text-white transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-[var(--theme-text-muted)] leading-relaxed mt-0.5">
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
