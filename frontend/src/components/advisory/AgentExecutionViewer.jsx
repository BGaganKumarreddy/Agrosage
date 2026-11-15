import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  Clock,
  Cpu,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CloudSun,
  Sprout,
  TrendingUp,
  Landmark,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { AGENT_DISPLAY_NAMES, AGENT_DESCRIPTIONS } from '../../utils/constants';

const AGENT_ORDER = [
  'Intake',
  'Weather',
  'Crop',
  'Market',
  'Scheme',
  'Risk Alert',
  'Coordinator',
];

const AGENT_ICONS = {
  Intake: Sparkles,
  Weather: CloudSun,
  Crop: Sprout,
  Market: TrendingUp,
  Scheme: Landmark,
  'Risk Alert': ShieldAlert,
  Coordinator: Cpu,
};

export const AgentExecutionViewer = ({ agentResults = [], boardState }) => {
  const [expandedAgent, setExpandedAgent] = useState(null);

  // Index agent results by normalized ID
  const resultMap = {};
  agentResults.forEach((ar) => {
    const key = ar.agent_id.replace('RiskAlert', 'Risk Alert');
    resultMap[key] = ar;
  });

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'completed_with_fallback':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'completed_with_warnings':
      case 'partial':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'unavailable':
        return <HelpCircle className="w-4 h-4 text-zinc-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-zinc-500" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <Badge variant="completed" size="sm">Completed</Badge>;
      case 'completed_with_fallback':
        return <Badge variant="completed" size="sm">Fallback</Badge>;
      case 'completed_with_warnings':
        return <Badge variant="partial" size="sm">Warnings</Badge>;
      case 'partial':
        return <Badge variant="partial" size="sm">Partial</Badge>;
      case 'unavailable':
        return <Badge variant="unavailable" size="sm">Unavailable</Badge>;
      case 'failed':
        return <Badge variant="failed" size="sm">Failed</Badge>;
      default:
        return <Badge variant="neutral" size="sm">Pending</Badge>;
    }
  };

  const totalDuration = agentResults.reduce((acc, curr) => acc + (curr.duration_ms || 0), 0);
  const completedCount = agentResults.filter((r) => r.status?.toLowerCase() === 'completed').length;

  return (
    <div className="bg-[#262626] rounded-2xl border border-[#414141] p-6 text-[#ECECEC] shadow-sm">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-5 border-b border-[#414141]/60 gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-semibold text-[#ECECEC]">
              Seven-Agent Workflow Execution
            </h3>
            {boardState && (
              <Badge variant="active" size="sm">Board: {boardState}</Badge>
            )}
          </div>
          <p className="text-xs text-[#A3A3A3] mt-0.5">
            Collaborative multi-agent reasoning graph powered by Microsoft Agent Framework
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-[#A3A3A3]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{completedCount}/7 Completed</span>
          </div>
          {totalDuration > 0 && (
            <div className="flex items-center gap-1 bg-[#1f1f1f] px-2.5 py-1 rounded-lg border border-[#414141]">
              <Clock className="w-3.5 h-3.5 text-[#8DBB91]" />
              <span>{Math.round(totalDuration)} ms total</span>
            </div>
          )}
        </div>
      </div>

      {/* Stepper Grid (Horizontal on lg, Stacked on mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        {AGENT_ORDER.map((agentName, idx) => {
          const result = resultMap[agentName] || {
            agent_id: agentName,
            status: 'unavailable',
            duration_ms: null,
            summary: 'No execution record returned',
          };

          const Icon = AGENT_ICONS[agentName] || Cpu;
          const isExpanded = expandedAgent === agentName;
          const isCoordinator = agentName === 'Coordinator';

          return (
            <div
              key={agentName}
              onClick={() => setExpandedAgent(isExpanded ? null : agentName)}
              className={`rounded-xl border transition-all duration-150 cursor-pointer p-3.5 flex flex-col justify-between ${
                isCoordinator
                  ? 'border-[#8DBB91]/50 bg-[#1e2a21] hover:border-[#8DBB91]'
                  : 'border-[#414141] bg-[#1f1f1f] hover:border-[#8DBB91]/40'
              } ${isExpanded ? 'ring-2 ring-[#8DBB91]/30' : ''}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-[#737373]">0{idx + 1}</span>
                    <Icon className="w-4 h-4 text-[#8DBB91]" />
                  </div>
                  {getStatusIcon(result.status)}
                </div>

                <p className="text-xs font-semibold text-[#ECECEC] truncate">
                  {AGENT_DISPLAY_NAMES[agentName] || agentName}
                </p>

                <div className="mt-1 flex items-center justify-between">
                  {getStatusBadge(result.status)}
                  {result.duration_ms && (
                    <span className="text-[10px] text-[#737373]">
                      {Math.round(result.duration_ms)}ms
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-[#414141]/60 flex items-center justify-between text-[11px] text-[#A3A3A3]">
                <span className="truncate max-w-[85px]">{result.provider_id || 'System'}</span>
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 shrink-0 text-[#A3A3A3]" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 shrink-0 text-[#A3A3A3]" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded Detail Tray */}
      {expandedAgent && (
        <div className="mt-4 p-4 rounded-xl border border-[#8DBB91]/30 bg-[#1b231c] animate-in fade-in duration-150">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-[#8DBB91]">
                  {AGENT_DISPLAY_NAMES[expandedAgent] || expandedAgent}
                </h4>
                {getStatusBadge(resultMap[expandedAgent]?.status)}
              </div>
              <p className="text-xs text-[#A3A3A3] mt-0.5">
                {AGENT_DESCRIPTIONS[expandedAgent]}
              </p>
            </div>
            <button
              onClick={() => setExpandedAgent(null)}
              className="text-xs font-medium text-[#8DBB91] hover:underline"
            >
              Close
            </button>
          </div>

          <div className="mt-3 pt-3 border-t border-[#414141]/60 space-y-2 text-xs">
            {resultMap[expandedAgent]?.summary && (
              <div>
                <span className="font-medium text-[#ECECEC]">Output Summary: </span>
                <span className="text-[#A3A3A3]">{resultMap[expandedAgent].summary}</span>
              </div>
            )}
            {resultMap[expandedAgent]?.error && (
              <div className="text-red-300 bg-red-950/40 p-2.5 rounded-lg border border-red-800/60">
                <span className="font-semibold text-red-200">Reason: </span>
                {resultMap[expandedAgent].error}
              </div>
            )}
            <div className="flex flex-wrap gap-4 text-[11px] text-[#737373] pt-1">
              <span>Provider: <strong className="text-[#ECECEC]">{resultMap[expandedAgent]?.provider_id || 'Deterministic/Default'}</strong></span>
              {resultMap[expandedAgent]?.model_id && (
                <span>Model: <strong className="text-[#ECECEC]">{resultMap[expandedAgent].model_id}</strong></span>
              )}
              {resultMap[expandedAgent]?.duration_ms && (
                <span>Duration: <strong className="text-[#ECECEC]">{Math.round(resultMap[expandedAgent].duration_ms)}ms</strong></span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

