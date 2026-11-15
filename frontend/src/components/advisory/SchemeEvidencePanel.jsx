import React from 'react';
import { Landmark, FileText, CheckCircle2, ExternalLink } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const SchemeEvidencePanel = ({ schemeEvidence = [] }) => {
  if (!schemeEvidence || schemeEvidence.length === 0) {
    return (
      <div className="bg-[#262626] rounded-2xl border border-[#414141] p-6 text-center text-[#ECECEC] shadow-sm">
        <Landmark className="w-8 h-8 text-[#737373] mx-auto mb-2 opacity-50" />
        <h4 className="text-sm font-semibold text-[#ECECEC]">No Scheme Evidence Matched</h4>
        <p className="text-xs text-[#A3A3A3] max-w-sm mx-auto mt-1">
          No central or state agricultural welfare schemes matched this inquiry's crop and location constraints.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#262626] rounded-2xl border border-[#414141] p-6 text-[#ECECEC] shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#414141]/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#263e2d] text-[#8DBB91] border border-[#3d6545] flex items-center justify-center">
            <Landmark className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-[#ECECEC]">
              Government Agricultural Schemes
            </h3>
            <p className="text-xs text-[#A3A3A3]">Central and State welfare support & subsidies</p>
          </div>
        </div>
        <Badge variant="active" size="sm">Curated</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schemeEvidence.map((ev, idx) => (
          <div
            key={ev.evidence_id || idx}
            className="p-4 rounded-xl border border-[#414141] bg-[#1f1f1f] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#8DBB91] truncate">{ev.title}</span>
                {ev.mode && (
                  <span className="text-[10px] uppercase font-bold text-[#737373]">
                    {ev.mode}
                  </span>
                )}
              </div>

              {ev.excerpt && (
                <p className="p-3 bg-[#171717] rounded-lg border border-[#414141] text-xs text-[#ECECEC] leading-relaxed mb-3">
                  {ev.excerpt}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between text-[11px] text-[#A3A3A3] pt-2 border-t border-[#414141]/60 gap-2">
              <span className="truncate">Source: {ev.provenance || ev.source_id}</span>
              {ev.reference_url && (
                <a
                  href={ev.reference_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#8DBB91] hover:underline"
                >
                  <span>Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

