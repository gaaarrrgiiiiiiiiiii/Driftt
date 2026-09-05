function templatedFallback(event) {
  const sym = event.symbol ? event.symbol.replace(".NS", "") : "";
  const priceBaseline = event.price_baseline || event.price_at_event;
  const pctChange = priceBaseline
    ? (((event.price_at_event - priceBaseline) / priceBaseline) * 100).toFixed(2)
    : "0.00";
  const vol = event.volume_ratio ? `${Number(event.volume_ratio).toFixed(1)}×` : "1.0×";

  if (event.event_type === "thesis_crossed") {
    return `${sym} breached stated investment thesis with a ${Number(pctChange) >= 0 ? "+" : ""}${pctChange}% move.`;
  }
  return `${sym} moved ${Number(pctChange) >= 0 ? "+" : ""}${pctChange}% on ${vol} volume vs 30-day baseline.`;
}

export default function EventDetail({ event }) {
  const priceBaseline = event.price_baseline || event.price_at_event;
  const pctChange = priceBaseline
    ? (((event.price_at_event - priceBaseline) / priceBaseline) * 100).toFixed(2)
    : "0.00";
  const isPositive = Number(pctChange) >= 0;

  return (
    <div className="mt-4 pt-4 border-t border-[#21262d] text-xs text-gray-300 space-y-3 bg-[#0d1117]/60 p-4 rounded-xl">
      {/* Explanation text with seamless fallback */}
      <div className="p-2.5 rounded-lg bg-[#161b22] border border-[#30363d] text-gray-200 flex items-start gap-2">
        <span className="font-semibold text-[#00d09c] shrink-0">Insight:</span>
        <span>{event.explanation || templatedFallback(event)}</span>
      </div>

      {/* Grid of score components */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-[#161b22] p-2.5 rounded-lg border border-[#21262d]">
          <span className="text-[11px] text-gray-400 block">Z-Score (Volatility)</span>
          <span className="text-sm font-mono font-bold text-white">
            {event.z_score != null ? `${event.z_score}σ` : "N/A"}
          </span>
        </div>

        <div className="bg-[#161b22] p-2.5 rounded-lg border border-[#21262d]">
          <span className="text-[11px] text-gray-400 block">Volume Multiplier</span>
          <span className="text-sm font-mono font-bold text-white">
            {event.volume_ratio != null ? `${event.volume_ratio}×` : "1.0×"}
          </span>
        </div>

        <div className="bg-[#161b22] p-2.5 rounded-lg border border-[#21262d]">
          <span className="text-[11px] text-gray-400 block">Baseline vs Event</span>
          <span
            className={`text-sm font-mono font-bold ${
              isPositive ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {isPositive ? "+" : ""}
            {pctChange}%
          </span>
        </div>

        <div className="bg-[#161b22] p-2.5 rounded-lg border border-[#21262d]">
          <span className="text-[11px] text-gray-400 block">Thesis Trigger</span>
          <span className="text-sm font-bold text-purple-300">
            {event.event_type === "thesis_crossed"
              ? "Triggered (≥90 Floor)"
              : "Not Triggered"}
          </span>
        </div>
      </div>

      {/* Dual Source Reconcile Details */}
      {event.source_conflict && (
        <div className="p-3 bg-rose-950/20 border border-rose-800/40 rounded-lg">
          <span className="font-semibold text-rose-300 block mb-1">
            Dual-Source Disagreement Details (M9 System Correctness):
          </span>
          <div className="flex flex-wrap gap-4 text-[11px] font-mono text-gray-300">
            <div>
              <span className="text-gray-400">Yahoo Quote: </span>₹
              {event.yahoo_price || "N/A"}
            </div>
            <div>
              <span className="text-gray-400">NSE Quote: </span>₹
              {event.nse_price || "N/A"}
            </div>
            <div>
              <span className="text-gray-400">Divergence: </span>
              {event.divergence_pct}%
            </div>
            <div>
              <span className="text-gray-400">Selected Source: </span>
              <span className="text-[#00d09c] uppercase font-bold">
                {event.preferred_source || "fresher"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
