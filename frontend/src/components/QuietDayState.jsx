import LayersIcon from "@mui/icons-material/Layers";
import HistoryToggleOffIcon from "@mui/icons-material/HistoryToggleOff";
import TuneIcon from "@mui/icons-material/Tune";

export default function QuietDayState({
  watchedCount = 5,
  watchlistName = "Watchlist",
  sensitivity = "balanced",
  onResetSeen,
  onLowerThreshold,
}) {
  return (
    <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-12 text-center my-4">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141414] border border-[#222222] text-[11px] font-mono text-[#8a8a8a] mb-3">
        <LayersIcon sx={{ fontSize: 13, color: "#32d583" }} />
        <span>Monitoring {watchedCount} {watchedCount === 1 ? "Stock" : "Stocks"}</span>
      </div>

      <h3 className="text-xl font-bold text-white mb-2">
        Feed is Quiet
      </h3>

      <p className="text-xs text-[#8a8a8a] max-w-md mx-auto mb-2 leading-relaxed">
        Quiet day — nothing crossed your thresholds today.
      </p>
      <p className="text-[11px] text-[#666666] max-w-md mx-auto mb-6 leading-relaxed">
        Monitoring <span className="text-[#a0a0a0] font-medium">{watchedCount} stocks</span> in{" "}
        <span className="text-[#a0a0a0] font-medium">{watchlistName}</span> under the{" "}
        <span className="text-white font-medium capitalize">{sensitivity}</span> filter.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onResetSeen && (
          <button
            onClick={onResetSeen}
            className="text-xs px-4 py-2 rounded-xl bg-[#171717] hover:bg-[#222222] text-[#32d583] transition border border-[#2a2a2a] font-semibold inline-flex items-center gap-1.5"
          >
            <HistoryToggleOffIcon sx={{ fontSize: 15 }} />
            <span>Replay All Events</span>
          </button>
        )}
        {sensitivity !== "chattery" && onLowerThreshold && (
          <button
            onClick={onLowerThreshold}
            className="text-xs px-4 py-2 rounded-xl bg-[#121212] hover:bg-[#1a1a1a] text-[#8a8a8a] hover:text-white transition border border-[#222222] inline-flex items-center gap-1.5"
          >
            <TuneIcon sx={{ fontSize: 14 }} />
            <span>Lower threshold to Chattery (≥15)</span>
          </button>
        )}
      </div>
    </div>
  );
}
