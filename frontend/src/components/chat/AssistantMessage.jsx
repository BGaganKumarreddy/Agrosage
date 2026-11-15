import React, { useState } from 'react';
import {
  Sprout,
  ChevronDown,
  ChevronUp,
  Cpu,
  CloudSun,
  TrendingUp,
  Landmark,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  XCircle,
  ExternalLink,
  ArrowRight,
  Clock,
} from 'lucide-react';

const AGENT_ICON_MAP = {
  Intake: Sprout,
  Crop: Sprout,
  Weather: CloudSun,
  Market: TrendingUp,
  Scheme: Landmark,
  'Risk Alert': AlertTriangle,
  RiskAlert: AlertTriangle,
  Coordinator: Cpu,
};

export const AssistantMessage = ({ message = {}, onSendFollowup }) => {
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);

  const content = message.content || '';
  const agent_telemetry = Array.isArray(message.agent_telemetry) ? message.agent_telemetry : [];
  const weather_evidence = Array.isArray(message.weather_evidence) ? message.weather_evidence : [];
  const market_evidence = Array.isArray(message.market_evidence) ? message.market_evidence : [];
  const scheme_evidence = Array.isArray(message.scheme_evidence) ? message.scheme_evidence : [];
  const active_risk_alerts = Array.isArray(message.active_risk_alerts) ? message.active_risk_alerts : [];
  const uncertainty_and_limitations = Array.isArray(message.uncertainty_and_limitations) ? message.uncertainty_and_limitations : [];
  const suggested_next_steps = Array.isArray(message.suggested_next_steps) ? message.suggested_next_steps : [];

  return (
    <div className="flex items-start gap-3 w-full group select-text">
      {/* AgroSage Avatar */}
      <div className="w-8 h-8 rounded-xl bg-[#263e2d] border border-[#3d6545] text-[#8DBB91] flex items-center justify-center shrink-0 shadow-sm mt-0.5">
        <Sprout className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0 space-y-3.5">
        {/* Main Response Content */}
        <p className="text-sm text-[#ECECEC] leading-relaxed whitespace-pre-line space-y-2">
          {content}
        </p>

        {/* Active Risk Alerts Banner */}
        {Array.isArray(active_risk_alerts) && active_risk_alerts.length > 0 && (
          <div className="space-y-2 pt-1">
            {active_risk_alerts.map((alert, idx) => (
              <div
                key={alert.finding_id || idx}
                className="p-3 rounded-xl bg-[#2d1b1b] border border-red-800/60 text-red-200 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-red-300">
                    <ShieldAlert className="w-4 h-4 text-red-400" />
                    <span>{alert.title}</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-900/60 text-red-300 border border-red-700/60 uppercase">
                    {alert.severity || 'HIGH'}
                  </span>
                </div>
                {alert.explanation && (
                  <p className="text-[11px] text-red-200/90 leading-relaxed">
                    {alert.explanation}
                  </p>
                )}
                {alert.safe_action && (
                  <p className="text-[11px] font-semibold text-red-100 flex items-center gap-1">
                    <span className="text-red-400">Action:</span>
                    <span>{alert.safe_action}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Evidence Source Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {Array.isArray(weather_evidence) && weather_evidence.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#262626] border border-[#414141] text-[11px] font-medium text-[#A3A3A3]">
              <CloudSun className="w-3.5 h-3.5 text-sky-400" />
              <span>Open-Meteo Weather</span>
            </span>
          )}

          {Array.isArray(scheme_evidence) && scheme_evidence.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#262626] border border-[#414141] text-[11px] font-medium text-[#A3A3A3]">
              <Landmark className="w-3.5 h-3.5 text-amber-400" />
              <span>Govt Schemes</span>
            </span>
          )}

          {Array.isArray(market_evidence) && market_evidence.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#262626] border border-[#414141] text-[11px] font-medium text-[#A3A3A3]">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mandi Quotes (data.gov.in)</span>
            </span>
          )}
        </div>

        {/* Clarification Interactive Question Options (Stage 4.2 Progressive Intake) */}
        {message.clarification && (
          <div className="space-y-2 pt-1" data-testid="clarification-options-container">
            <div className="flex items-center gap-1.5 text-xs text-[#8DBB91] font-semibold">
              <HelpCircle className="w-4 h-4 text-[#8DBB91]" />
              <span>Choose an option or type below:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(message.clarification.options) &&
                message.clarification.options.map((option, idx) => {
                  const isUnknown =
                    option.toLowerCase().includes('not sure') ||
                    option.toLowerCase().includes("don't know");
                  return (
                    <button
                      key={idx}
                      type="button"
                      data-testid={`clarification-option-${idx}`}
                      onClick={() => onSendFollowup && onSendFollowup(option, true)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        isUnknown
                          ? 'bg-[#2a2a2a] hover:bg-[#333333] border border-[#525252] text-[#A3A3A3] hover:text-[#ECECEC]'
                          : 'bg-[#243528] hover:bg-[#2d4332] border border-[#3e6845] text-[#D8EED9] hover:border-[#8DBB91]'
                      }`}
                    >
                      <span>{option}</span>
                      <ArrowRight className="w-3 h-3 text-[#8DBB91]" />
                    </button>
                  );
                })}
              {message.clarification.allow_skip && (
                <button
                  type="button"
                  data-testid="clarification-skip-btn"
                  onClick={() => onSendFollowup && onSendFollowup('Skip', true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-transparent hover:bg-[#2a2a2a] border border-[#444444] text-[#737373] hover:text-[#A3A3A3] transition-colors"
                >
                  Skip question
                </button>
              )}
            </div>
          </div>
        )}

        {/* Suggested Next Steps / Clarifications (when not in progressive clarification) */}
        {!message.clarification && Array.isArray(suggested_next_steps) && suggested_next_steps.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider">
              Suggested Follow-ups
            </p>
            <div className="flex flex-wrap gap-1.5">
              {suggested_next_steps.map((step, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendFollowup && onSendFollowup(step)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#262626] hover:bg-[#303030] border border-[#414141] text-xs text-[#ECECEC] transition-colors group"
                >
                  <span>{step}</span>
                  <ArrowRight className="w-3 h-3 text-[#8DBB91] group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Collapsible 7-Agent Telemetry & Execution Trace */}
        <div className="pt-1">
          <button
            onClick={() => setIsTelemetryOpen((prev) => !prev)}
            className="flex items-center justify-between w-full p-2.5 rounded-xl bg-[#262626] hover:bg-[#2c2c2c] border border-[#414141] text-xs text-[#A3A3A3] transition-colors"
          >
            <div className="flex items-center gap-2 font-medium">
              <Cpu className="w-3.5 h-3.5 text-[#8DBB91]" />
              <span className="text-[#ECECEC]">7-Agent Telemetry & Execution Trace</span>
              <span className="text-[10px] text-[#737373]">
                ({agent_telemetry.length} agents reported)
              </span>
            </div>
            {isTelemetryOpen ? (
              <ChevronUp className="w-4 h-4 text-[#A3A3A3]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#A3A3A3]" />
            )}
          </button>

          {isTelemetryOpen && (
            <div className="mt-2 p-3 bg-[#1c1c1c] border border-[#414141]/80 rounded-xl space-y-2.5 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {agent_telemetry.map((agent, idx) => {
                  const Icon = AGENT_ICON_MAP[agent.agent_id] || Cpu;
                  const isSkipped = agent.status.toLowerCase() === 'skipped';
                  const isCompleted = agent.status.toLowerCase() === 'completed';

                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-[#242424] border border-[#3b3b3b] space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-semibold text-xs text-[#ECECEC]">
                          <Icon className="w-3.5 h-3.5 text-[#8DBB91]" />
                          <span>{agent.agent_id} Agent</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                            isCompleted
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                              : isSkipped
                              ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                              : 'bg-amber-950/60 text-amber-300 border-amber-800'
                          }`}
                        >
                          {agent.status}
                        </span>
                      </div>
                      {agent.summary && (
                        <p className="text-[11px] text-[#A3A3A3] leading-relaxed">
                          {agent.summary}
                        </p>
                      )}
                      {agent.duration_ms !== undefined && agent.duration_ms !== null && (
                        <p className="text-[10px] text-[#737373]">
                          Duration: {agent.duration_ms} ms
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {uncertainty_and_limitations.length > 0 && (
                <div className="p-2.5 rounded-lg bg-[#2a241b] border border-amber-800/60 text-amber-200 text-xs space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Uncertainty & Evidence Limitations
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {uncertainty_and_limitations.map((u, i) => (
                      <li key={i}>{typeof u === 'string' ? u : u?.question || JSON.stringify(u)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
