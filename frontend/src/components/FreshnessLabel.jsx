import { formatIST, formatRelativeTime } from "../utils/time";

export default function FreshnessLabel({ event }) {
  const fresh = event.data_fresh;
  const relTime = formatRelativeTime(event.occurred_at);

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full border ${
        fresh
          ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/40"
          : "bg-amber-950/40 text-amber-300 border-amber-800/40"
      }`}
      title={`Recorded at ${formatIST(event.occurred_at)}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          fresh ? "bg-emerald-400" : "bg-amber-400"
        }`}
      />
      <span>{fresh ? "Fresh" : "Stale"}</span>
      {relTime && <span className="opacity-75">· {relTime}</span>}
    </span>
  );
}
