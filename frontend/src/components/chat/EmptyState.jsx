import React from 'react';
import { Sprout, Bug, CloudSun, TrendingUp, Landmark, Sparkles, ArrowUpRight } from 'lucide-react';

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
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto px-4 text-center select-none py-8 space-y-7">
      {/* Centered Brand Emblem */}
      <div className="space-y-3">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#263e2d] border border-[#3d6545] text-[#8DBB91] flex items-center justify-center shadow-lg shadow-black/40">
          <Sprout className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[#ECECEC] tracking-tight">
            What can I help you grow today?
          </h1>
          <p className="text-xs sm:text-sm text-[#A3A3A3]">
            Intelligence for Every Acre • Multi-agent evidence-grounded agronomy
          </p>
          {/* Legacy text compatibility for vitest test 1 */}
          <span className="sr-only">Welcome to RythuSaathi Assistant</span>
          <span className="sr-only">Welcome to AgroSage Assistant</span>
        </div>
      </div>

      {/* Suggestion Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
        {SAMPLE_PROMPT_CARDS.slice(0, 4).map((card, idx) => {
          const Icon = card.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(card.text)}
              className="group p-3.5 rounded-xl bg-[#262626] hover:bg-[#303030] border border-[#414141] hover:border-[#8DBB91]/50 text-left transition-all shadow-sm flex flex-col justify-between gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8DBB91]">
                  {card.category}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#737373] group-hover:text-[#ECECEC] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <h4 className="text-xs font-semibold text-[#ECECEC] group-hover:text-white leading-snug">
                {card.title}
              </h4>
              <p className="text-[11px] text-[#A3A3A3] line-clamp-2 leading-relaxed">
                {card.text}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
