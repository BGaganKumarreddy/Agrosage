import React from 'react';
import { Sprout, Bug, TrendingUp, Landmark, CloudRain, Sparkles } from 'lucide-react';

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

export const WorkspaceEmptyState = ({ onSelectPrompt }) => {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center text-center py-6 sm:py-10 px-4 space-y-6">
      {/* Brand Hero */}
      <div className="flex flex-col items-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-[#262626] border border-[#414141] flex items-center justify-center text-[#8DBB91] shadow-xl">
          <Sprout className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#ECECEC]">
            AgroSage
          </h2>
          <p className="text-sm sm:text-base font-semibold text-[#8DBB91] mt-0.5">
            Intelligence for Every Acre.
          </p>
          <p className="text-xs sm:text-sm text-[#A3A3A3] max-w-md mx-auto leading-relaxed mt-2">
            Ask questions about crop diseases, weather impact, market prices, government schemes, or farm risk mitigation.
          </p>
        </div>
      </div>

      {/* Suggested Prompts Section */}
      <div className="w-full space-y-3 pt-2">
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#737373] uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-[#8DBB91]" />
          <span>Suggested agricultural inquiries</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          {SUGGESTED_PROMPTS.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectPrompt(item.prompt)}
                className="group p-3.5 rounded-2xl bg-[#262626] border border-[#414141] hover:border-[#8DBB91]/50 hover:bg-[#2a2a2a] transition-all text-left flex flex-col justify-between space-y-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#8DBB91] focus-visible:outline-none"
                aria-label={`Prompt suggestion: ${item.title}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-semibold text-[#8DBB91] uppercase tracking-wider">
                    {item.category}
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-[#303030] text-[#A3A3A3] group-hover:text-[#ECECEC] flex items-center justify-center transition-colors">
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-[#ECECEC] group-hover:text-white transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-[#A3A3A3] leading-relaxed mt-0.5">
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
