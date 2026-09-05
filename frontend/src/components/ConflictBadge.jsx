export default function ConflictBadge({ event }) {
  const hasDetails = event.yahoo_price && event.nse_price;

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs bg-rose-950/50 text-rose-300 border border-rose-800/60 px-2.5 py-0.5 rounded-full"
      title="Dual-source disagreement between Yahoo Finance and NSE quote"
    >
      <span className="text-rose-400 font-bold">⚠</span>
      <span>Sources Disagree</span>
      {hasDetails ? (
        <span className="font-mono text-[11px] opacity-90">
          (NSE: ₹{Number(event.nse_price).toFixed(2)} vs Yahoo: ₹
          {Number(event.yahoo_price).toFixed(2)} · {event.divergence_pct}% div)
        </span>
      ) : (
        <span className="opacity-75">· Penalty -5 Applied</span>
      )}
    </span>
  );
}
