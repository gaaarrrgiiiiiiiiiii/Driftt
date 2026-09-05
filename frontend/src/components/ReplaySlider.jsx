import { useState, useEffect } from "react";
import api from "../api/client";
import { formatIST } from "../utils/time";
import HistoryToggleOffIcon from "@mui/icons-material/HistoryToggleOff";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";

export default function ReplaySlider({ watchlistId }) {
  const [allReplayEvents, setAllReplayEvents] = useState([]);
  const [sliderIndex, setSliderIndex] = useState(0);

  useEffect(() => {
    if (!watchlistId) return;
    const loadReplay = async () => {
      try {
        const res = await api.get(`/replay/${watchlistId}?from_seq=0`);
        const evs = res.data.events || [];
        setAllReplayEvents(evs);
        setSliderIndex(evs.length > 0 ? evs.length - 1 : 0);
      } catch (err) {
        console.error("Failed to load replay history", err);
      }
    };
    loadReplay();
  }, [watchlistId]);

  if (allReplayEvents.length === 0) return null;

  const currentEvent = allReplayEvents[sliderIndex] || allReplayEvents[0];

  return (
    <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <HistoryToggleOffIcon sx={{ fontSize: 18, color: "#32d583" }} />
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
              Timeline Replay Scrubber
            </h2>
          </div>
          <p className="text-xs text-[#8a8a8a] mt-0.5">
            Scrub backwards across the chronological timeline to reconstruct state.
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-[#171717] text-white border border-[#262626]">
          Step {sliderIndex + 1} of {allReplayEvents.length}
        </span>
      </div>

      {/* Slider input */}
      <div className="my-6">
        <input
          type="range"
          min="0"
          max={allReplayEvents.length - 1}
          value={sliderIndex}
          onChange={(e) => setSliderIndex(Number(e.target.value))}
          className="w-full h-1.5 bg-[#1f1f1f] rounded-lg appearance-none cursor-pointer accent-[#32d583]"
        />
        <div className="flex justify-between text-[11px] text-[#666666] mt-2 font-mono">
          <span>Oldest (Seq #{allReplayEvents[0]?.seq})</span>
          <span>Latest (Seq #{allReplayEvents[allReplayEvents.length - 1]?.seq})</span>
        </div>
      </div>

      {/* Active step preview */}
      <div className="bg-[#121212] border border-[#1f1f1f] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-base font-mono">
              {currentEvent.symbol.replace(".NS", "")}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1a1a1a] text-[#8a8a8a] border border-[#2a2a2a] uppercase">
              {currentEvent.event_type.replace("_", " ")}
            </span>
          </div>
          <span className="text-[11px] text-[#8a8a8a] block mt-1 font-mono">
            {formatIST(currentEvent.occurred_at)}
          </span>
        </div>

        <div className="text-right flex items-center gap-6">
          <div>
            <span className="text-[10px] uppercase font-mono text-[#8a8a8a] block">Price</span>
            <span className="text-sm font-mono font-bold text-white">
              ₹{Number(currentEvent.price_at_event).toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-[#8a8a8a] block">Materiality</span>
            <span className="text-sm font-mono font-bold text-[#32d583]">
              {Math.round(currentEvent.materiality_score)} / 100
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
