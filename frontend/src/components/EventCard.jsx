import { useState } from "react";
import { getBadge, scoreToBand } from "../utils/badges";
import FreshnessLabel from "./FreshnessLabel";
import ConflictBadge from "./ConflictBadge";
import MaterialityBadge from "./MaterialityBadge";
import EventDetail from "./EventDetail";

const BAND_BORDER = {
  red: "border-l-rose-500",
  orange: "border-l-amber-500",
  yellow: "border-l-yellow-500",
  gray: "border-l-slate-600",
};

export default function EventCard({ event }) {
  const [expanded, setExpanded] = useState(false);
  const badge = getBadge(event.event_type);
  const band = scoreToBand(event.materiality_score);

  return (
    <div
      className={`bg-[#161b22] border border-[#30363d] border-l-4 ${BAND_BORDER[band]} rounded-xl p-5 cursor-pointer hover:border-[#484f58] transition shadow-sm hover:shadow-md group`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-bold text-lg tracking-tight group-hover:text-[#00d09c] transition">
              {event.symbol.replace(".NS", "")}
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${badge.pill}`}
            >
              {badge.label}
            </span>
          </div>

          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            <FreshnessLabel event={event} />
            {event.source_conflict && <ConflictBadge event={event} />}
          </div>
        </div>

        <div className="text-right flex flex-col items-end gap-1.5">
          <span className="text-lg font-bold font-mono text-white">
            ₹{Number(event.price_at_event).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <MaterialityBadge score={event.materiality_score} />
        </div>
      </div>

      {expanded && <EventDetail event={event} />}

      <div className="mt-3 flex justify-between items-center text-[11px] text-gray-500 pt-2 border-t border-[#21262d]">
        <span>Seq #{event.seq}</span>
        <span className="group-hover:text-gray-300 transition">
          {expanded ? "Collapse details ▲" : "Inspect materiality math ▼"}
        </span>
      </div>
    </div>
  );
}
