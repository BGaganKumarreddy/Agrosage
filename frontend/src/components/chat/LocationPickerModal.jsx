import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Check, AlertCircle, X, Search, Loader2 } from 'lucide-react';
import { configurationService } from '../../services/configurationService';

export const LocationPickerModal = ({
  isOpen,
  onClose,
  currentLocation,
  onConfirmLocation,
  locations: initialLocations,
}) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [detectedCandidate, setDetectedCandidate] = useState(null);
  const [manualQuery, setManualQuery] = useState('');
  const [availableLocations, setAvailableLocations] = useState(() => {
    if (initialLocations && initialLocations.length > 0) {
      const districts = initialLocations.filter(
        (l) => l.level === 'district' || l.location_id.includes(':district:')
      );
      return districts.length > 0 ? districts : initialLocations;
    }
    return [];
  });
  const [selectedLocation, setSelectedLocation] = useState(currentLocation || '');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setDetectedCandidate(null);
      if (initialLocations && initialLocations.length > 0) {
        const districts = initialLocations.filter(
          (l) => l.level === 'district' || l.location_id.includes(':district:')
        );
        setAvailableLocations(districts.length > 0 ? districts : initialLocations);
      } else {
        configurationService
          .getLocations()
          .then((locs) => {
            if (Array.isArray(locs)) {
              // Filter to district level
              const districts = locs.filter(
                (l) => l.level === 'district' || l.location_id.includes(':district:')
              );
              setAvailableLocations(districts.length > 0 ? districts : locs);
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, initialLocations]);

  if (!isOpen) return null;

  const handleDetectGPS = () => {
    setErrorMsg(null);
    setDetectedCandidate(null);

    if (!('geolocation' in navigator)) {
      setErrorMsg('Geolocation is not supported by your browser. Please select your district manually below.');
      return;
    }

    setIsDetecting(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const res = await configurationService.resolveLocation({
            latitude: lat,
            longitude: lon,
          });
          setDetectedCandidate(res);
          setSelectedLocation(res.display_name);
        } catch (err) {
          setErrorMsg(
            err?.response?.data?.message ||
              err?.message ||
              'Unable to match detected coordinates to an agricultural district. Please select your district manually.'
          );
        } finally {
          setIsDetecting(false);
        }
      },
      (err) => {
        setIsDetecting(false);
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMsg('Location permission was denied. You can manually select your district below.');
        } else if (err.code === err.TIMEOUT) {
          setErrorMsg('Location request timed out. Please select your district manually.');
        } else {
          setErrorMsg('Location acquisition failed. Please select your district manually.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onConfirmLocation(selectedLocation);
      onClose();
    }
  };

  const filteredDistricts = availableLocations.filter((loc) =>
    loc.display_name.toLowerCase().includes(manualQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-[#262626] border border-[#414141] rounded-2xl w-full max-w-md p-5 shadow-2xl text-[#ECECEC] space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#414141]/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#303030] border border-[#414141] flex items-center justify-center text-[#8DBB91]">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#ECECEC]">Agricultural Field Location</h3>
              <p className="text-[11px] text-[#A3A3A3]">
                Calibrates weather, disease risks, and APMC market rates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A3A3A3] hover:text-[#ECECEC] hover:bg-[#303030]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live GPS Detection Button */}
        <div className="space-y-2">
          <button
            onClick={handleDetectGPS}
            disabled={isDetecting}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[#303030] hover:bg-[#3a3a3a] border border-[#414141] text-[#ECECEC] text-xs font-semibold transition-all group disabled:opacity-50"
          >
            {isDetecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#8DBB91]" />
                <span>Acquiring GPS coordinates & resolving district...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 text-[#8DBB91] group-hover:scale-110 transition-transform" />
                <span>Use Current Browser Location (GPS)</span>
              </>
            )}
          </button>

          {/* Privacy Note */}
          <p className="text-[10px] text-[#737373] text-center">
            One-time browser permission only. Raw coordinates are never stored or tracked continuously.
          </p>
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-950/30 border border-red-800/50 text-red-200 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <p className="text-[11px] leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* Candidate Detected Banner */}
        {detectedCandidate && (
          <div className="p-3 rounded-xl bg-[#1e2a21] border border-[#8DBB91]/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#8DBB91] uppercase tracking-wider">
                Candidate Detected
              </span>
              <span className="text-[10px] text-[#A3A3A3]">
                {detectedCandidate.distance_km} km away
              </span>
            </div>
            <p className="text-sm font-bold text-[#ECECEC]">
              {detectedCandidate.district}, {detectedCandidate.state}
            </p>
            <p className="text-[11px] text-[#A3A3A3] leading-relaxed">
              {detectedCandidate.candidate_summary}
            </p>
          </div>
        )}

        {/* Manual Location Selection */}
        <div className="space-y-2 pt-1 border-t border-[#414141]/50">
          <label className="text-xs font-medium text-[#A3A3A3]">
            Or select registered agricultural district:
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
            <input
              type="text"
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              placeholder="Search Ludhiana, Adilabad, Nalgonda, Guntur..."
              className="w-full bg-[#171717] border border-[#414141] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#ECECEC] placeholder-[#737373] focus:outline-none focus:border-[#8DBB91]"
            />
          </div>

          {/* District list chips */}
          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
            {filteredDistricts.map((loc) => {
              const isChosen = selectedLocation === loc.display_name;
              return (
                <button
                  key={loc.location_id}
                  onClick={() => {
                    setSelectedLocation(loc.display_name);
                    setDetectedCandidate(null);
                  }}
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs transition-colors ${
                    isChosen
                      ? 'bg-[#1e2a21] text-[#8DBB91] border border-[#8DBB91]/60 font-semibold'
                      : 'bg-[#171717] text-[#A3A3A3] hover:text-[#ECECEC] hover:bg-[#303030]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 opacity-70" />
                    <span>{loc.display_name}</span>
                  </div>
                  {isChosen && <Check className="w-3.5 h-3.5 text-[#8DBB91]" />}
                </button>
              );
            })}

            {filteredDistricts.length === 0 && (
              <p className="text-center py-2 text-xs text-[#737373]">
                No matching catalog district found.
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#414141]/50">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#A3A3A3] hover:text-[#ECECEC] hover:bg-[#303030]"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedLocation}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#8DBB91] hover:bg-[#7ba87f] text-[#171717] transition-colors disabled:opacity-40"
          >
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
};
