import WhatshotIcon from "@mui/icons-material/Whatshot";

export default function StatCard({
  title = "Most Active Symbol",
  symbol = null,
  eventCount = 0,
  range = "today",
}) {
  const displaySymbol = symbol ? symbol.replace(".NS", "") : null;

  return (
    <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-5 flex flex-col justify-between h-full min-h-[220px]">
      <div className="flex items-center justify-between text-[#8a8a8a] mb-2">
        <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
          {title} ({range})
        </span>
        <WhatshotIcon sx={{ fontSize: 16, color: displaySymbol ? "#32d583" : "#8a8a8a" }} />
      </div>

      <div className="my-auto py-1">
        {displaySymbol && eventCount > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold font-mono text-white block">
                  {displaySymbol}
                </span>
                <span className="text-xs text-[#8a8a8a] block mt-0.5">
                  Top Monitored Volatility Leader
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-mono px-3 py-1 rounded-full bg-[#171717] border border-[#2a2a2a] text-[#32d583] font-semibold">
                {eventCount} {eventCount === 1 ? "event" : "events"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-[#121212] border border-[#1e1e1e] rounded-xl p-2.5">
                <span className="text-[10px] uppercase font-mono text-[#666666] block">
                  Window Filter
                </span>
                <span className="text-xs font-mono font-semibold text-white capitalize mt-0.5 block">
                  {range}
                </span>
              </div>
              <div className="bg-[#121212] border border-[#1e1e1e] rounded-xl p-2.5">
                <span className="text-[10px] uppercase font-mono text-[#666666] block">
                  Anomaly Severity
                </span>
                <span className="text-xs font-mono font-semibold text-[#32d583] mt-0.5 block">
                  High Materiality
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <span className="text-lg font-bold font-mono text-[#666666] block">
              No activity yet
            </span>
            <span className="text-[11px] text-[#555555] mt-1 block">
              Within current {range} window
            </span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-[#181818] flex items-center justify-between text-[11px] text-[#8a8a8a]">
        <span>Portfolio Frequency Leader</span>
        <span className="font-mono text-white font-semibold">Active Ranking</span>
      </div>
    </div>
  );
}
