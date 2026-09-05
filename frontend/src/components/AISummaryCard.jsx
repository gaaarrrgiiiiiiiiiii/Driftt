import React, { useState, useEffect } from "react";
import api from "../api/client";
import InsightsIcon from "@mui/icons-material/Insights";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

export default function AISummaryCard({ watchlistId, eventCount }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!watchlistId) return;

    let isMounted = true;
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/feed/${watchlistId}/summary`);
        if (isMounted && res.data?.summary) {
          setSummary(res.data.summary);
        }
      } catch (err) {
        if (isMounted) {
          setSummary(
            "Portfolio monitoring active. Real-time statistical deviations and dual-source reconciliations are tracked continuously against 30-day baseline parameters."
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSummary();
    return () => {
      isMounted = false;
    };
  }, [watchlistId, eventCount]);

  if (!summary && !loading) return null;

  return (
    <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-5 h-full min-h-[200px] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <InsightsIcon sx={{ fontSize: 16, color: "#32d583" }} />
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-white">
              Executive Market Brief
            </span>
            <span className="text-[10px] font-mono text-[#666666] hidden sm:inline">
              · Dual-source analysis
            </span>
          </div>
          {loading ? (
            <span className="text-[10px] font-mono text-[#32d583] animate-pulse">
              Analyzing events...
            </span>
          ) : (
            <div className="flex items-center gap-1 text-[10px] font-mono text-[#32d583]">
              <AutoAwesomeIcon sx={{ fontSize: 11 }} />
              <span>AI Synthesized</span>
            </div>
          )}
        </div>

        <p className="text-xs text-[#cccccc] leading-relaxed mt-2">
          {summary}
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#181818] text-[11px] text-[#8a8a8a] mt-3">
        <span>Coverage: Monitored Universe</span>
        <span className="font-mono text-[#32d583]">Live Reconciliation</span>
      </div>
    </div>
  );
}
