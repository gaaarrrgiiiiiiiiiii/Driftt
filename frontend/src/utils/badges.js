export const BADGE_CONFIG = {
  thesis_crossed: {
    label: "⭐ Thesis Triggered",
    color: "bg-purple-900/60 border-purple-500/50 text-purple-200",
    pill: "bg-purple-600 text-white",
  },
  volatility_breakout: {
    label: "🔴 Volatility Breakout",
    color: "bg-rose-900/50 border-rose-500/50 text-rose-200",
    pill: "bg-rose-600 text-white",
  },
  volume_surge: {
    label: "🟠 Volume Surge",
    color: "bg-amber-900/50 border-amber-500/50 text-amber-200",
    pill: "bg-amber-600 text-white",
  },
  price_spike: {
    label: "🟡 Price Spike",
    color: "bg-yellow-900/40 border-yellow-500/50 text-yellow-200",
    pill: "bg-yellow-500 text-gray-900 font-semibold",
  },
  default: {
    label: "⚪ Event",
    color: "bg-slate-800 border-slate-600 text-slate-300",
    pill: "bg-slate-600 text-white",
  },
};

export function scoreToBand(score) {
  if (score >= 80) return "red";
  if (score >= 60) return "orange";
  if (score >= 35) return "yellow";
  return "gray";
}

export function getBadge(eventType) {
  return BADGE_CONFIG[eventType] || BADGE_CONFIG.default;
}
