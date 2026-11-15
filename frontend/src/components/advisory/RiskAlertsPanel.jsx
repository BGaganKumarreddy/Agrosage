import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { SEVERITY_COLORS } from '../../utils/constants';

export const RiskAlertsPanel = ({
  activeAlerts = [],
  backgroundVulnerabilities = [],
}) => {
  const [showBackground, setShowBackground] = useState(false);

  return (
    <div className="space-y-6">
      {/* 1. ACTIVE RISK ALERTS SECTION */}
      <div className="bg-[#262626] rounded-2xl border border-[#414141] p-6 text-[#ECECEC] shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-[#414141]/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-950/60 text-amber-400 flex items-center justify-center border border-amber-800/60">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base text-[#ECECEC]">
                  Active Agricultural Risk Alerts
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-950 text-amber-300 border border-amber-700/60">
                  {activeAlerts.length}
                </span>
              </div>
              <p className="text-xs text-[#A3A3A3] mt-0.5">
                Evidence-grounded immediate threats requiring farmer attention and field mitigation
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {activeAlerts.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-emerald-950/30 border border-emerald-800/60 flex flex-col items-center">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mb-2" />
              <p className="text-sm font-semibold text-emerald-300">
                No Active Agricultural Hazards Detected
              </p>
              <p className="text-xs text-emerald-300/80 max-w-sm mt-0.5">
                Current weather observations and local market data do not indicate elevated immediate risks.
              </p>
            </div>
          ) : (
            activeAlerts.map((alert, idx) => {
              const sev = alert.severity?.toUpperCase() || 'MEDIUM';
              const sevConfig = SEVERITY_COLORS[sev] || SEVERITY_COLORS.MEDIUM;

              return (
                <div
                  key={alert.finding_id || idx}
                  className={`p-4 rounded-xl border ${sevConfig.bg} ${sevConfig.border} transition-all`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${sevConfig.dot}`} />
                      <h4 className="font-semibold text-sm text-[#ECECEC]">{alert.title}</h4>
                      <Badge variant={sev.toLowerCase()} size="sm">{sev}</Badge>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#A3A3A3]">
                      {alert.category && (
                        <span className="bg-[#171717] px-2 py-0.5 rounded border border-[#414141]">
                          Category: {alert.category.replace('_', ' ')}
                        </span>
                      )}
                      {alert.confidence && (
                        <span>Confidence: {Math.round(alert.confidence * 100)}%</span>
                      )}
                    </div>
                  </div>

                  {/* Explanation */}
                  <p className="text-xs text-[#ECECEC] leading-relaxed mb-3">
                    {alert.explanation}
                  </p>

                  {/* Recommended Safe Action */}
                  {alert.safe_action && (
                    <div className="flex items-start gap-2 bg-[#171717] p-3 rounded-lg border border-[#414141] text-xs">
                      <Lightbulb className="w-4 h-4 text-[#8DBB91] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-[#8DBB91]">Recommended Safe Action: </span>
                        <span className="text-[#ECECEC]">{alert.safe_action}</span>
                      </div>
                    </div>
                  )}

                  {/* Evidence IDs */}
                  {alert.evidence_ids?.length > 0 && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-[#A3A3A3]">
                      <span>Evidence Grounding:</span>
                      {alert.evidence_ids.map((id) => (
                        <span key={id} className="bg-[#171717] px-1.5 py-0.5 rounded border border-[#414141] text-[#ECECEC]">
                          {id}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. BACKGROUND VULNERABILITIES SECTION (COLLAPSIBLE) */}
      <div className="bg-[#262626] rounded-2xl border border-[#414141] p-5 text-[#ECECEC] shadow-sm">
        <button
          onClick={() => setShowBackground(!showBackground)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#263e2d] text-[#8DBB91] border border-[#3d6545] flex items-center justify-center">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm text-[#ECECEC]">
                  General Crop Susceptibility & Background Vulnerabilities
                </h4>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#171717] text-[#A3A3A3] border border-[#414141]">
                  {backgroundVulnerabilities.length} items
                </span>
              </div>
              <p className="text-[11px] text-[#A3A3A3]">
                Baseline agronomic vulnerabilities from ICAR guidelines — NOT active field outbreaks
              </p>
            </div>
          </div>
          <div className="text-[#A3A3A3] p-1">
            {showBackground ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showBackground && (
          <div className="mt-4 pt-4 border-t border-[#414141]/60 space-y-3">
            {backgroundVulnerabilities.length === 0 ? (
              <p className="text-xs text-[#737373] italic">No background vulnerabilities recorded for this crop stage.</p>
            ) : (
              backgroundVulnerabilities.map((bg, idx) => (
                <div
                  key={bg.finding_id || idx}
                  className="p-3.5 rounded-xl border border-[#414141] bg-[#1f1f1f] text-xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-[#ECECEC]">{bg.title}</span>
                    <Badge variant="low" size="sm">Advisory Only</Badge>
                  </div>
                  <p className="text-[#A3A3A3] mb-2 leading-relaxed">{bg.explanation}</p>
                  {bg.safe_action && (
                    <div className="text-[11px] text-[#8DBB91] bg-[#171717] p-2 rounded-lg border border-[#414141]">
                      <strong>Preventative Note: </strong>{bg.safe_action}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

