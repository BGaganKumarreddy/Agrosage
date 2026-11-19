import React from 'react';
import { Sprout, Bug, CloudSun, TrendingUp, Landmark, Sparkles, ArrowUpRight } from 'lucide-react';
import { MangoHeroIllustration } from '../common/MangoHeroIllustration';

export const SAMPLE_PROMPT_CARDS = [
  {
    title: 'Rice Brown Leaf Spots',
    text: 'Rice leaves are showing brown leaf spots during tillering stage. What safe organic controls are available?',
    category: 'Crop Health',
    icon: Sprout,
  },
  {
    title: 'Adilabad Cotton Mandi Price',
    text: 'What is the current mandi price for cotton in Adilabad APMC?',
    category: 'Mandi Rates',
    icon: TrendingUp,
  },
  {
    title: 'Punjab Govt Schemes',
    text: 'My field is in Ludhiana, Punjab. What government schemes and subsidies can I apply for?',
    category: 'Schemes',
    icon: Landmark,
  },
  {
    title: 'Weather & Spraying Advisory',
    text: 'Will it rain in Ludhiana in the next 3 days? Is it safe to spray fungicide today?',
    category: 'Weather',
    icon: CloudSun,
  },
  {
    title: 'Help me identify a crop pest',
    text: 'I observed small green caterpillars and leaf feeding holes on my cotton seedlings.',
    category: 'Pest Identification',
    icon: Bug,
  },
  {
    title: 'What should I do about yellow leaves?',
    text: 'Lower leaves on my crop are turning pale yellow between the veins. Is this nitrogen or zinc deficiency?',
    category: 'Nutrition',
    icon: Sparkles,
  },
];

export const EmptyState = ({ onSelectPrompt }) => {
  const season = 'Rabi Season';
  const weatherText = '24°C Clear';
  const soilText = 'Soil Moisture Optimal';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto px-4 text-center select-none py-6 sm:py-8 space-y-5">
      {/* Centered Ripe Mango Illustration */}
      <div className="flex justify-center -mb-2">
        <MangoHeroIllustration className="w-28 h-28 sm:w-32 sm:h-32" />
      </div>

      {/* Compact Status Pill */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--theme-bg-composer)] border border-[var(--theme-border)] text-xs text-[var(--theme-text-main)] shadow-sm">
        <span className="w-2 h-2 rounded-full bg-[var(--theme-accent)] animate-pulse shrink-0" />
        <span className="font-medium text-[11px] sm:text-xs">
          {season} • <strong className="font-semibold text-white">{weatherText}</strong> • <span className="text-[var(--theme-accent)]">{soilText}</span>
        </span>
      </div>

      {/* Brand Hero & Capabilities */}
      <div className="space-y-1.5">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--theme-text-main)] tracking-tight leading-none">
          AgroSage
        </h1>
        <p className="text-sm sm:text-base font-semibold text-[var(--theme-accent)] tracking-tight">
          Intelligence for Every Acre.
        </p>
        <p className="text-xs sm:text-sm text-[var(--theme-text-muted)] max-w-lg mx-auto leading-relaxed pt-1">
          Ask questions about crop diseases, weather impact, market prices, government schemes, or farm risk mitigation.
        </p>
        <span className="sr-only">Welcome to AgroSage Assistant</span>
      </div>

      {/* Suggestion Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left pt-2">
        {SAMPLE_PROMPT_CARDS.slice(0, 4).map((card, idx) => {
          const Icon = card.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(card.text)}
              className="group p-3.5 rounded-2xl bg-[var(--theme-bg-card)] hover:bg-[var(--theme-bg-hover)] border border-[var(--theme-border)] hover:border-[var(--theme-accent)] text-left transition-all shadow-sm flex flex-col justify-between gap-2 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-accent)]">
                  {card.category}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[var(--theme-text-muted)] group-hover:text-[var(--theme-text-main)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <h4 className="text-xs font-semibold text-[var(--theme-text-main)] group-hover:text-white leading-snug">
                {card.title}
              </h4>
              <p className="text-[11px] text-[var(--theme-text-muted)] line-clamp-2 leading-relaxed">
                {card.text}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
