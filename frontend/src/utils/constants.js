export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

export const AGENT_DISPLAY_NAMES = {
  Intake: 'Intake Agent',
  Weather: 'Weather Agent',
  Crop: 'Crop Knowledge Agent',
  Market: 'Market Intelligence Agent',
  Scheme: 'Government Scheme Agent',
  'Risk Alert': 'Risk Alert Agent',
  RiskAlert: 'Risk Alert Agent',
  Coordinator: 'Coordinator Agent',
};

export const AGENT_DESCRIPTIONS = {
  Intake: 'Entity resolution, growth stage mapping, and intent routing.',
  Weather: 'Open-Meteo live meteorology, precipitation, and 3-day forecast.',
  Crop: 'Curated ICAR agronomic guidelines and pest management.',
  Market: 'APMC mandi modal prices and commodity market trends.',
  Scheme: 'Central welfare schemes (PM-KISAN, PMFBY, Rythu Bharosa).',
  'Risk Alert': 'Evidence-backed real-time hazard detection.',
  RiskAlert: 'Evidence-backed real-time hazard detection.',
  Coordinator: 'Multi-perspective synthesis, conflict resolution, and next steps.',
};

export const SEVERITY_COLORS = {
  CRITICAL: {
    bg: 'bg-red-950/40',
    border: 'border-red-800/60',
    text: 'text-red-300',
    badge: 'bg-red-950 text-red-300 border-red-700 font-semibold',
    dot: 'bg-red-500',
  },
  HIGH: {
    bg: 'bg-amber-950/40',
    border: 'border-amber-800/60',
    text: 'text-amber-300',
    badge: 'bg-amber-950 text-amber-300 border-amber-700 font-semibold',
    dot: 'bg-amber-500',
  },
  MEDIUM: {
    bg: 'bg-yellow-950/40',
    border: 'border-yellow-800/60',
    text: 'text-yellow-300',
    badge: 'bg-yellow-950 text-yellow-300 border-yellow-700 font-medium',
    dot: 'bg-yellow-500',
  },
  LOW: {
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-800/60',
    text: 'text-emerald-300',
    badge: 'bg-emerald-950 text-emerald-300 border-emerald-700',
    dot: 'bg-emerald-400',
  },
};

