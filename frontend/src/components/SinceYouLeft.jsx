import React from "react";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import ScheduleIcon from "@mui/icons-material/Schedule";
import VerifiedIcon from "@mui/icons-material/Verified";

export default function SinceYouLeft({ eventCount, onMarkSeen, loading }) {
  const userName = localStorage.getItem("driftt_user") || "Investor";

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return "Good morning";
    if (hrs < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6 relative overflow-hidden h-full min-h-[165px] flex flex-col justify-between">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#8a8a8a] font-semibold block mb-1">
            {getGreeting()}, {userName.toUpperCase()}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {eventCount} meaningful {eventCount === 1 ? "change" : "changes"}
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-[#8a8a8a] mt-2">
            <ScheduleIcon sx={{ fontSize: 14, color: "#666666" }} />
            <span>Since you last checked · Market state diffed against Welford baselines</span>
          </div>
        </div>

        {eventCount > 0 && (
          <button
            onClick={onMarkSeen}
            disabled={loading}
            className="bg-[#171717] hover:bg-[#222222] border border-[#2a2a2a] text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-2 self-start md:self-auto disabled:opacity-50 shrink-0"
            title="Mark currently displayed events as seen"
          >
            <DoneAllIcon sx={{ fontSize: 16, color: "#32d583" }} />
            <span>Mark all seen</span>
          </button>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[#1c1c1c] text-xs mt-4">
        <div className="flex items-center gap-1.5 text-[#8a8a8a]">
          <VerifiedIcon sx={{ fontSize: 13, color: "#32d583" }} />
          <span>Welford Baselines: Continuous Online Variance</span>
        </div>
        <span className="font-mono text-[#32d583] text-xs font-semibold">
          Sensitivity Filter Active
        </span>
      </div>
    </div>
  );
}
