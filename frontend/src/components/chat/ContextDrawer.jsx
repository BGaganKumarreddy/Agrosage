import React from 'react';
import { X, Check, Sprout, MapPin, Layers, Calendar, SlidersHorizontal } from 'lucide-react';

export const ContextDrawer = ({
  isOpen,
  onClose,
  crop,
  setCrop,
  location,
  setLocation,
  growthStage,
  setGrowthStage,
  variety,
  setVariety,
  onApply,
  onOpenLocationPicker,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-[#262626] border-l border-[#414141] text-[#ECECEC] p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#414141]/60 pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#8DBB91]" />
              <h3 className="text-sm font-bold text-[#ECECEC]">Field Context Parameters</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#A3A3A3] hover:text-[#ECECEC] hover:bg-[#303030]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-[#A3A3A3] leading-relaxed">
            Specify verified crop and location fields to guide the specialist agents without repeating them in every question.
          </p>

          {/* Fields */}
          <div className="space-y-3.5">
            <div>
              <label htmlFor="field-crop" className="block text-xs font-semibold text-[#A3A3A3] mb-1">
                Crop
              </label>
              <div className="relative">
                <Sprout className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
                <input
                  id="field-crop"
                  type="text"
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  placeholder="e.g. Rice, Cotton, Wheat"
                  className="w-full bg-[#171717] border border-[#414141] rounded-lg pl-8 pr-3 py-2 text-xs text-[#ECECEC] placeholder-[#737373] focus:outline-none focus:border-[#8DBB91]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="field-location" className="block text-xs font-semibold text-[#A3A3A3]">
                  Location
                </label>
                {onOpenLocationPicker && (
                  <button
                    type="button"
                    onClick={onOpenLocationPicker}
                    className="text-[10px] text-[#8DBB91] hover:underline flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>Detect GPS</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
                <input
                  id="field-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Ludhiana, Adilabad, Nalgonda"
                  className="w-full bg-[#171717] border border-[#414141] rounded-lg pl-8 pr-3 py-2 text-xs text-[#ECECEC] placeholder-[#737373] focus:outline-none focus:border-[#8DBB91]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="field-stage" className="block text-xs font-semibold text-[#A3A3A3] mb-1">
                Growth Stage
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
                <input
                  id="field-stage"
                  type="text"
                  value={growthStage}
                  onChange={(e) => setGrowthStage(e.target.value)}
                  placeholder="e.g. Tillering, Flowering, Vegetative"
                  className="w-full bg-[#171717] border border-[#414141] rounded-lg pl-8 pr-3 py-2 text-xs text-[#ECECEC] placeholder-[#737373] focus:outline-none focus:border-[#8DBB91]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="field-variety" className="block text-xs font-semibold text-[#A3A3A3] mb-1">
                Variety
              </label>
              <div className="relative">
                <Layers className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
                <input
                  id="field-variety"
                  type="text"
                  value={variety}
                  onChange={(e) => setVariety(e.target.value)}
                  placeholder="e.g. PR-126, Bt-Cotton"
                  className="w-full bg-[#171717] border border-[#414141] rounded-lg pl-8 pr-3 py-2 text-xs text-[#ECECEC] placeholder-[#737373] focus:outline-none focus:border-[#8DBB91]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-[#414141]/60">
          <button
            onClick={() => {
              setCrop('');
              setLocation('');
              setGrowthStage('');
              setVariety('');
            }}
            className="flex-1 py-2 px-3 rounded-lg text-xs font-medium text-[#A3A3A3] hover:text-[#ECECEC] hover:bg-[#303030] transition-colors"
          >
            Clear Fields
          </button>
          <button
            onClick={() => {
              onApply && onApply();
              onClose();
            }}
            className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-[#8DBB91] hover:bg-[#7ba87f] text-[#171717] transition-colors flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Context</span>
          </button>
        </div>
      </div>
    </div>
  );
};
