import React, { useState } from 'react';
import {
  FileText,
  CheckSquare,
  Square,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Download,
  Copy,
  Check,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export const CoordinatorSynthesisPanel = ({
  synthesis = '',
  suggestedNextSteps = [],
  uncertaintyAndLimitations = [],
  status = 'COMPLETED',
  providerId,
  modelId,
  createdAt,
}) => {
  const [completedSteps, setCompletedSteps] = useState({});
  const [copied, setCopied] = useState(false);

  const toggleStep = (idx) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(synthesis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#262626] rounded-2xl border border-[#414141] p-6 text-[#ECECEC] shadow-sm space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#414141]/60 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#263e2d] text-[#8DBB91] border border-[#3d6545] flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5 text-[#8DBB91]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-[#ECECEC]">
                Coordinator Synthesis & Advisory
              </h3>
              <Badge variant={status.toLowerCase()} size="sm">
                {status}
              </Badge>
            </div>
            <p className="text-xs text-[#A3A3A3] mt-0.5">
              Consolidated intelligence cross-examined by the 7-agent agricultural board
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            icon={copied ? Check : Copy}
          >
            {copied ? 'Copied' : 'Copy Text'}
          </Button>
        </div>
      </div>

      {/* Main synthesis text */}
      <div className="prose prose-invert max-w-none text-sm text-[#ECECEC] leading-relaxed whitespace-pre-line bg-[#1f1f1f] p-5 rounded-xl border border-[#414141]">
        {synthesis || 'No synthesis text generated.'}
      </div>

      {/* Suggested Next Steps Checklist */}
      {suggestedNextSteps && suggestedNextSteps.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-[#8DBB91]" />
            <h4 className="text-sm font-semibold text-[#ECECEC]">
              Suggested Next Steps for the Farmer
            </h4>
          </div>

          <div className="space-y-2">
            {suggestedNextSteps.map((step, idx) => {
              const isDone = !!completedSteps[idx];
              return (
                <div
                  key={idx}
                  onClick={() => toggleStep(idx)}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                    isDone
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-[#737373]'
                      : 'bg-[#1f1f1f] border-[#414141] hover:border-[#8DBB91]/50 text-[#ECECEC]'
                  }`}
                >
                  <div className="mt-0.5 shrink-0 text-[#8DBB91]">
                    {isDone ? (
                      <CheckSquare className="w-4 h-4 text-[#8DBB91]" />
                    ) : (
                      <Square className="w-4 h-4 text-[#737373]" />
                    )}
                  </div>
                  <span className={`text-xs leading-relaxed ${isDone ? 'line-through text-[#737373]' : ''}`}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Uncertainty and Limitations */}
      {uncertaintyAndLimitations && uncertaintyAndLimitations.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-800/60 bg-[#2a241b] space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Uncertainty, Data Gaps & Advisory Limitations</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-xs text-amber-200 leading-relaxed pl-1">
            {uncertaintyAndLimitations.map((lim, idx) => (
              <li key={idx}>{lim}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Metadata footer */}
      <div className="pt-2 flex flex-wrap items-center justify-between text-[11px] text-[#A3A3A3] border-t border-[#414141]/60">
        <span>
          Inference Engine:{' '}
          <strong className="text-[#ECECEC]">{providerId || 'Deterministic Baseline'}</strong>
          {modelId ? ` (${modelId})` : ''}
        </span>
        {createdAt && (
          <span>Generated: {new Date(createdAt).toLocaleString()}</span>
        )}
      </div>
    </div>
  );
};

