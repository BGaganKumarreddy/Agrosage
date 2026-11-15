import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Sprout,
  Navigation,
  Compass,
  Check,
  AlertCircle,
  RefreshCw,
  Layers,
  CheckCircle2,
  Search,
  ArrowRight,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { configurationService } from '../../../services/configurationService';

export const WorkspaceContextDrawer = ({
  isOpen = false,
  onClose,
  activeContext = {},
  savedFarmProfile = null,
  onSaveContext,
  onSaveFarmProfile,
  isSavingContext = false,
  isSavingProfile = false,
}) => {
  const [activeTab, setActiveTab] = useState('consultation'); // 'consultation' | 'farm_profile'

  // Data registries from backend
  const [crops, setCrops] = useState([]);
  const [locations, setLocations] = useState([]);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Tab 1: Active consultation state
  const [consultCrop, setConsultCrop] = useState('');
  const [consultVariety, setConsultVariety] = useState('');
  const [consultStage, setConsultStage] = useState('');
  const [consultLocation, setConsultLocation] = useState('');
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationMode, setLocationMode] = useState('search'); // 'search' | 'gps'

  // GPS resolution state
  const [isResolvingGps, setIsResolvingGps] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [gpsCandidate, setGpsCandidate] = useState(null);

  // Tab 2: Saved farm profile state
  const [farmName, setFarmName] = useState('');
  const [farmLocation, setFarmLocation] = useState('');
  const [farmCrop, setFarmCrop] = useState('');
  const [farmVariety, setFarmVariety] = useState('');
  const [farmSizeAcres, setFarmSizeAcres] = useState('');
  const [farmSoilType, setFarmSoilType] = useState('alluvial');
  const [farmIrrigation, setFarmIrrigation] = useState('canal');
  const [profileSuccessNotice, setProfileSuccessNotice] = useState(false);

  // Load backend configuration registries on mount
  useEffect(() => {
    let mounted = true;
    async function loadConfig() {
      setIsLoadingConfig(true);
      try {
        const [cData, lData] = await Promise.all([
          configurationService.getCrops(),
          configurationService.getLocations(),
        ]);
        if (mounted) {
          setCrops(cData || []);
          setLocations(lData || []);
        }
      } catch (err) {
        console.error('Failed to load configuration registries:', err);
      } finally {
        if (mounted) setIsLoadingConfig(false);
      }
    }
    loadConfig();
    return () => {
      mounted = false;
    };
  }, []);

  // Sync activeContext into consultation form when drawer opens or external context changes
  useEffect(() => {
    if (isOpen) {
      setConsultCrop(activeContext?.crop || '');
      setConsultVariety(activeContext?.variety || '');
      setConsultStage(activeContext?.growth_stage || '');
      setConsultLocation(activeContext?.location || '');
      setLocationSearchQuery(activeContext?.location || '');
    }
  }, [
    activeContext?.crop,
    activeContext?.location,
    activeContext?.growth_stage,
    activeContext?.variety,
    isOpen,
  ]);

  // Sync savedFarmProfile into farm profile form
  useEffect(() => {
    if (isOpen && savedFarmProfile) {
      setFarmName(savedFarmProfile.farm_name || '');
      setFarmLocation(savedFarmProfile.location || '');
      setFarmCrop(savedFarmProfile.crop || '');
      setFarmVariety(savedFarmProfile.variety || '');
      setFarmSizeAcres(
        savedFarmProfile.farm_size_acres !== null && savedFarmProfile.farm_size_acres !== undefined
          ? String(savedFarmProfile.farm_size_acres)
          : ''
      );
      if (savedFarmProfile.soil_type) setFarmSoilType(savedFarmProfile.soil_type);
      if (savedFarmProfile.irrigation_source) setFarmIrrigation(savedFarmProfile.irrigation_source);
    }
  }, [
    savedFarmProfile?.farm_name,
    savedFarmProfile?.location,
    savedFarmProfile?.crop,
    savedFarmProfile?.variety,
    savedFarmProfile?.farm_size_acres,
    isOpen,
  ]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Selected crop object and its registered varieties & growth stages
  const selectedCropObj = crops.find(
    (c) =>
      c.common_names?.some((n) => n.toLowerCase() === consultCrop.toLowerCase()) ||
      c.scientific_name?.toLowerCase() === consultCrop.toLowerCase() ||
      c.crop_id === consultCrop
  );
  const availableVarieties = selectedCropObj?.varieties || [];
  const availableStages = selectedCropObj?.growth_stages || [];

  // Saved farm selected crop object
  const farmCropObj = crops.find(
    (c) =>
      c.common_names?.some((n) => n.toLowerCase() === farmCrop.toLowerCase()) ||
      c.crop_id === farmCrop
  );
  const farmVarieties = farmCropObj?.varieties || [];

  // Filtered districts for location search
  const registeredDistricts = locations.filter((l) => l.level === 'district');
  const filteredDistricts = registeredDistricts.filter((d) => {
    if (!locationSearchQuery.trim()) return true;
    const q = locationSearchQuery.toLowerCase();
    const parent = locations.find((l) => l.location_id === d.parent_id);
    return (
      d.display_name.toLowerCase().includes(q) ||
      (parent && parent.display_name.toLowerCase().includes(q))
    );
  });

  // Handle GPS location resolution
  const handleResolveGps = () => {
    setIsResolvingGps(true);
    setGpsError(null);
    setGpsCandidate(null);

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      setIsResolvingGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const candidate = await configurationService.resolveLocation({ latitude, longitude });
          setGpsCandidate(candidate);
        } catch (err) {
          setGpsError(
            err.response?.data?.message ||
              'Failed to resolve coordinates to an agricultural district.'
          );
        } finally {
          setIsResolvingGps(false);
        }
      },
      (err) => {
        setIsResolvingGps(false);
        if (err.code === 1) {
          setGpsError('Location access was denied. Please select your district manually.');
        } else {
          setGpsError('Unable to retrieve your current location. Please select manually.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Confirm GPS Candidate
  const handleConfirmGpsCandidate = () => {
    if (gpsCandidate) {
      setConsultLocation(gpsCandidate.district);
      setLocationSearchQuery(gpsCandidate.district);
      setGpsCandidate(null);
    }
  };

  // Apply saved farm defaults to active consultation
  const handleApplyFarmDefaults = () => {
    if (!savedFarmProfile) return;
    if (savedFarmProfile.crop) setConsultCrop(savedFarmProfile.crop);
    if (savedFarmProfile.variety) setConsultVariety(savedFarmProfile.variety);
    if (savedFarmProfile.growth_stage) setConsultStage(savedFarmProfile.growth_stage);
    if (savedFarmProfile.location) {
      setConsultLocation(savedFarmProfile.location);
      setLocationSearchQuery(savedFarmProfile.location);
    }
  };

  // Save active consultation context
  const handleSaveConsultationContext = (e) => {
    e.preventDefault();
    if (onSaveContext) {
      onSaveContext({
        crop: consultCrop || null,
        location: consultLocation || null,
        growth_stage: consultStage || null,
        variety: consultVariety || null,
      });
    }
  };

  // Clear active consultation context
  const handleClearConsultationContext = () => {
    setConsultCrop('');
    setConsultVariety('');
    setConsultStage('');
    setConsultLocation('');
    setLocationSearchQuery('');
    if (onSaveContext) {
      onSaveContext({
        crop: '',
        location: '',
        growth_stage: '',
        variety: '',
      });
    }
  };

  // Save persistent My Farm Profile
  const handleSaveFarmProfileSubmit = async (e) => {
    e.preventDefault();
    if (!onSaveFarmProfile) return;

    await onSaveFarmProfile({
      farm_name: farmName || null,
      location: farmLocation || null,
      crop: farmCrop || null,
      variety: farmVariety || null,
      farm_size_acres: farmSizeAcres ? parseFloat(farmSizeAcres) : null,
      soil_type: farmSoilType || null,
      irrigation_source: farmIrrigation || null,
    });

    setProfileSuccessNotice(true);
    setTimeout(() => setProfileSuccessNotice(false), 3500);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Farm Context and Profile Settings"
    >
      <div className="w-full max-w-lg bg-[#212121] border-l border-[#303030] h-full flex flex-col shadow-2xl overflow-y-auto">
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#303030] flex items-center justify-between shrink-0 bg-[#262626]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#8DBB91]/15 text-[#8DBB91]">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#ECECEC]">Agricultural Context</h2>
              <p className="text-xs text-[#A3A3A3]">Manage consultation overrides & farm defaults</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A3A3A3] hover:text-[#ECECEC] hover:bg-[#303030] transition-colors focus-visible:ring-2 focus-visible:ring-[#8DBB91] focus-visible:outline-none"
            aria-label="Close context drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#303030] bg-[#1a1a1a] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('consultation')}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'consultation'
                ? 'border-[#8DBB91] text-[#ECECEC] bg-[#212121]'
                : 'border-transparent text-[#A3A3A3] hover:text-[#ECECEC] hover:bg-[#262626]'
            }`}
          >
            <Compass className="w-4 h-4 text-[#8DBB91]" />
            <span>Active Consultation</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('farm_profile')}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'farm_profile'
                ? 'border-[#8DBB91] text-[#ECECEC] bg-[#212121]'
                : 'border-transparent text-[#A3A3A3] hover:text-[#ECECEC] hover:bg-[#262626]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[#8DBB91]" />
            <span>My Farm Profile</span>
          </button>
        </div>

        {/* Tab 1: Active Consultation Context */}
        {activeTab === 'consultation' && (
          <div className="p-5 space-y-6 flex-1">
            <div className="p-3 rounded-xl bg-[#262626] border border-[#383838] text-xs text-[#A3A3A3] space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-[#8DBB91]">
                <Info className="w-3.5 h-3.5" />
                <span>Consultation Scope Only</span>
              </div>
              <p>
                Adjusting values here guides the current consultation without altering your saved
                My Farm profile.
              </p>
            </div>

            {/* Inherit Farm Defaults Quick Action */}
            {savedFarmProfile && (savedFarmProfile.crop || savedFarmProfile.location) && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#262626] border border-[#414141]">
                <div className="text-xs">
                  <p className="font-semibold text-[#ECECEC]">Inherit My Farm Defaults</p>
                  <p className="text-[#A3A3A3] mt-0.5">
                    {savedFarmProfile.crop || 'Crop'} • {savedFarmProfile.location || 'Location'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleApplyFarmDefaults}
                  className="px-3 py-1.5 rounded-lg bg-[#303030] hover:bg-[#383838] border border-[#414141] text-xs text-[#8DBB91] font-medium transition-colors"
                >
                  Apply Defaults
                </button>
              </div>
            )}

            <form onSubmit={handleSaveConsultationContext} className="space-y-5">
              {/* Location Picker Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#ECECEC] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#8DBB91]" />
                    <span>Location (District / State)</span>
                  </label>
                  <div className="flex items-center gap-1 bg-[#262626] p-0.5 rounded-lg border border-[#383838]">
                    <button
                      type="button"
                      onClick={() => setLocationMode('search')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        locationMode === 'search'
                          ? 'bg-[#383838] text-[#ECECEC]'
                          : 'text-[#A3A3A3] hover:text-[#ECECEC]'
                      }`}
                    >
                      Manual
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocationMode('gps')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                        locationMode === 'gps'
                          ? 'bg-[#383838] text-[#ECECEC]'
                          : 'text-[#A3A3A3] hover:text-[#ECECEC]'
                      }`}
                    >
                      <Navigation className="w-3 h-3 text-[#8DBB91]" />
                      <span>GPS</span>
                    </button>
                  </div>
                </div>

                {locationMode === 'search' ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#737373]" />
                      <input
                        type="text"
                        value={locationSearchQuery}
                        onChange={(e) => {
                          setLocationSearchQuery(e.target.value);
                          setConsultLocation(e.target.value);
                        }}
                        placeholder="Search district (e.g., Guntur, Adilabad)..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#262626] border border-[#414141] text-xs text-[#ECECEC] placeholder-[#737373] focus:outline-none focus:border-[#8DBB91]"
                      />
                    </div>

                    {/* Filtered District Recommendations */}
                    {locationSearchQuery.trim() && filteredDistricts.length > 0 && (
                      <div className="max-h-36 overflow-y-auto space-y-1 p-1 bg-[#1a1a1a] rounded-xl border border-[#333333]">
                        {filteredDistricts.map((d) => {
                          const parentState = locations.find((l) => l.location_id === d.parent_id);
                          const isSelected = consultLocation === d.display_name;
                          return (
                            <button
                              key={d.location_id}
                              type="button"
                              onClick={() => {
                                setConsultLocation(d.display_name);
                                setLocationSearchQuery(d.display_name);
                              }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                                isSelected
                                  ? 'bg-[#8DBB91]/20 text-[#8DBB91] font-semibold'
                                  : 'text-[#ECECEC] hover:bg-[#262626]'
                              }`}
                            >
                              <span>
                                {d.display_name}
                                {parentState ? `, ${parentState.display_name}` : ''}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#8DBB91]" />}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Unsupported Location Warning */}
                    {locationSearchQuery.trim() &&
                      filteredDistricts.length === 0 &&
                      !registeredDistricts.some(
                        (d) => d.display_name.toLowerCase() === locationSearchQuery.toLowerCase()
                      ) && (
                        <div
                          className="p-3 rounded-xl bg-[#262626] border border-amber-500/40 text-xs text-amber-200/90 space-y-1"
                          data-testid="unsupported-location-alert"
                        >
                          <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Unsupported Regional District</span>
                          </div>
                          <p>
                            &ldquo;{locationSearchQuery}&rdquo; is not yet registered in AgroSage regional
                            catalog.
                          </p>
                          <p className="text-[11px] text-[#A3A3A3]">
                            Available registered districts: Guntur (AP), Mysuru (KA), Ludhiana (PB),
                            Nalgonda (TG), Adilabad (TG).
                          </p>
                        </div>
                      )}
                  </div>
                ) : (
                  /* GPS Resolution Flow */
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleResolveGps}
                      disabled={isResolvingGps}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#262626] hover:bg-[#2a2a2a] border border-[#414141] text-xs font-semibold text-[#8DBB91] flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                      data-testid="gps-resolve-button"
                    >
                      {isResolvingGps ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Detecting Coordinates...</span>
                        </>
                      ) : (
                        <>
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Detect Current GPS Location</span>
                        </>
                      )}
                    </button>

                    {gpsError && (
                      <div
                        className="p-2.5 rounded-lg bg-[#262626] border border-red-500/40 text-xs text-red-300"
                        data-testid="gps-error-notice"
                      >
                        <p>{gpsError}</p>
                      </div>
                    )}

                    {/* Candidate Preview and Explicit Confirmation */}
                    {gpsCandidate && (
                      <div
                        className="p-3 rounded-xl bg-[#262626] border border-[#8DBB91]/50 space-y-2 animate-in fade-in"
                        data-testid="gps-candidate-card"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] uppercase tracking-wider text-[#8DBB91] font-bold">
                            Candidate District Found
                          </span>
                          <span className="text-xs text-[#A3A3A3]">
                            {gpsCandidate.distance_km} km away
                          </span>
                        </div>
                        <p className="text-sm font-bold text-[#ECECEC]">
                          {gpsCandidate.district}, {gpsCandidate.state}
                        </p>
                        <p className="text-xs text-[#A3A3A3]">
                          {gpsCandidate.candidate_summary}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleConfirmGpsCandidate}
                            className="flex-1 py-1.5 px-3 rounded-lg bg-[#8DBB91] hover:bg-[#7caa80] text-black text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                            data-testid="confirm-gps-candidate-btn"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirm &amp; Use</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setGpsCandidate(null)}
                            className="py-1.5 px-3 rounded-lg bg-[#303030] hover:bg-[#383838] text-xs text-[#A3A3A3] transition-colors"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Crop Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#ECECEC] flex items-center gap-1.5">
                  <Sprout className="w-3.5 h-3.5 text-[#8DBB91]" />
                  <span>Crop</span>
                </label>
                <select
                  value={consultCrop}
                  onChange={(e) => {
                    setConsultCrop(e.target.value);
                    setConsultVariety('');
                    setConsultStage('');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#262626] border border-[#414141] text-xs text-[#ECECEC] focus:outline-none focus:border-[#8DBB91]"
                >
                  <option value="">Select registered crop...</option>
                  {crops.map((c) => {
                    const primaryName = c.common_names?.[0] || c.scientific_name;
                    const capitalized =
                      primaryName.charAt(0).toUpperCase() + primaryName.slice(1);
                    return (
                      <option key={c.crop_id} value={capitalized}>
                        {capitalized} ({c.category})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Variety Selector (Dependent on Crop) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#ECECEC] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#8DBB91]" />
                  <span>Variety</span>
                </label>
                {availableVarieties.length > 0 ? (
                  <select
                    value={consultVariety}
                    onChange={(e) => setConsultVariety(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#262626] border border-[#414141] text-xs text-[#ECECEC] focus:outline-none focus:border-[#8DBB91]"
                  >
                    <option value="">Select registered variety...</option>
                    {availableVarieties.map((v) => (
                      <option key={v.variety_id} value={v.names?.[0] || v.variety_id}>
                        {v.names?.[0] || v.variety_id}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3 py-2 rounded-xl bg-[#1f1f1f] border border-[#333333] text-xs text-[#737373]">
                    {consultCrop
                      ? 'No registered varieties cataloged for this crop'
                      : 'Select a crop to view available varieties'}
                  </div>
                )}
              </div>

              {/* Growth Stage Selector (Dependent on Crop) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#ECECEC] flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-[#8DBB91]" />
                  <span>Growth Stage</span>
                </label>
                {availableStages.length > 0 ? (
                  <select
                    value={consultStage}
                    onChange={(e) => setConsultStage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#262626] border border-[#414141] text-xs text-[#ECECEC] focus:outline-none focus:border-[#8DBB91]"
                  >
                    <option value="">Select registered growth stage...</option>
                    {availableStages.map((s) => (
                      <option key={s.stage_id} value={s.stage_id}>
                        {s.names?.[0] ? s.names[0].charAt(0).toUpperCase() + s.names[0].slice(1) : s.stage_id}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3 py-2 rounded-xl bg-[#1f1f1f] border border-[#333333] text-xs text-[#737373]">
                    {consultCrop
                      ? 'No growth stages cataloged for this crop'
                      : 'Select a crop to view growth stages'}
                  </div>
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="pt-3 border-t border-[#303030] flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSavingContext}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#8DBB91] hover:bg-[#7caa80] text-black text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingContext ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Context...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Update Consultation</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleClearConsultationContext}
                  className="py-2.5 px-3 rounded-xl bg-[#262626] hover:bg-[#303030] border border-[#414141] text-xs text-[#A3A3A3] hover:text-[#ECECEC] transition-colors"
                >
                  Clear
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Persistent My Farm Profile Defaults */}
        {activeTab === 'farm_profile' && (
          <div className="p-5 space-y-6 flex-1">
            <div className="p-3 rounded-xl bg-[#262626] border border-[#383838] text-xs text-[#A3A3A3] space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-[#8DBB91]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Account-Level Farm Profile</span>
              </div>
              <p>
                This profile is securely persisted to your tenant account. Default values are
                inherited when creating new consultations.
              </p>
              <p className="text-[11px] text-[#737373] pt-1">
                Note: Updating your farm profile does not override active consultations.
              </p>
            </div>

            {profileSuccessNotice && (
              <div className="p-3 rounded-xl bg-[#8DBB91]/15 border border-[#8DBB91]/40 text-xs text-[#8DBB91] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>My Farm profile saved successfully to backend store!</span>
              </div>
            )}

            <form onSubmit={handleSaveFarmProfileSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#ECECEC]">Farm Name</label>
                <input
                  type="text"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  placeholder="e.g., Sri Venkateswara Farm"
                  className="w-full px-3 py-2 rounded-xl bg-[#262626] border border-[#414141] text-xs text-[#ECECEC] focus:outline-none focus:border-[#8DBB91]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#ECECEC]">Default Location</label>
                <select
                  value={farmLocation}
                  onChange={(e) => setFarmLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#262626] border border-[#414141] text-xs text-[#ECECEC] focus:outline-none focus:border-[#8DBB91]"
                >
                  <option value="">Select registered district...</option>
                  {registeredDistricts.map((d) => {
                    const parent = locations.find((l) => l.location_id === d.parent_id);
                    return (
                      <option key={d.location_id} value={d.display_name}>
                        {d.display_name} ({parent ? parent.display_name : 'District'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#ECECEC]">Primary Crop</label>
                <select
                  value={farmCrop}
                  onChange={(e) => {
                    setFarmCrop(e.target.value);
                    setFarmVariety('');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#262626] border border-[#414141] text-xs text-[#ECECEC] focus:outline-none focus:border-[#8DBB91]"
                >
                  <option value="">Select primary crop...</option>
                  {crops.map((c) => {
                    const primaryName = c.common_names?.[0] || c.scientific_name;
                    const capitalized =
                      primaryName.charAt(0).toUpperCase() + primaryName.slice(1);
                    return (
                      <option key={c.crop_id} value={capitalized}>
                        {capitalized}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#ECECEC]">Default Variety</label>
                {farmVarieties.length > 0 ? (
                  <select
                    value={farmVariety}
                    onChange={(e) => setFarmVariety(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#262626] border border-[#414141] text-xs text-[#ECECEC] focus:outline-none focus:border-[#8DBB91]"
                  >
                    <option value="">Select variety...</option>
                    {farmVarieties.map((v) => (
                      <option key={v.variety_id} value={v.names?.[0] || v.variety_id}>
                        {v.names?.[0] || v.variety_id}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3 py-2 rounded-xl bg-[#1f1f1f] border border-[#333333] text-xs text-[#737373]">
                    {farmCrop
                      ? 'No varieties registered for this crop'
                      : 'Select a primary crop first'}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#ECECEC]">Farm Area (Acres)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={farmSizeAcres}
                  onChange={(e) => setFarmSizeAcres(e.target.value)}
                  placeholder="e.g., 5.0"
                  className="w-full px-3 py-2 rounded-xl bg-[#262626] border border-[#414141] text-xs text-[#ECECEC] focus:outline-none focus:border-[#8DBB91]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#ECECEC]">Soil Type</label>
                  <select
                    value={farmSoilType}
                    onChange={(e) => setFarmSoilType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#262626] border border-[#414141] text-xs text-[#ECECEC] focus:outline-none focus:border-[#8DBB91]"
                  >
                    <option value="alluvial">Alluvial</option>
                    <option value="black_cotton">Black Cotton</option>
                    <option value="red_sandy">Red Sandy</option>
                    <option value="clay_loam">Clay Loam</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#ECECEC]">Irrigation</label>
                  <select
                    value={farmIrrigation}
                    onChange={(e) => setFarmIrrigation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#262626] border border-[#414141] text-xs text-[#ECECEC] focus:outline-none focus:border-[#8DBB91]"
                  >
                    <option value="canal">Canal</option>
                    <option value="borewell">Borewell</option>
                    <option value="rainfed">Rainfed</option>
                    <option value="drip">Drip</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-[#303030]">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#8DBB91] hover:bg-[#7caa80] text-black text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingProfile ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save My Farm Profile</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceContextDrawer;
