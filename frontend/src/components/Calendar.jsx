import { useState, useEffect } from "react";
import api from "../api/client";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CloseIcon from "@mui/icons-material/Close";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import LayersIcon from "@mui/icons-material/Layers";

const DAYS_OF_WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export default function Calendar({
  onJumpToDate,
  onSelectDate,
  activeFilterDate = null,
  onClearFilter,
  eventDates = [],
  selectedDate: externalSelectedDate,
}) {
  // Calendar defaulted to September 2026
  const [currentYear] = useState(2026);
  const [currentMonth] = useState(8); // 0-indexed: 8 = September
  const [selectedDate, setSelectedDate] = useState(externalSelectedDate || "2026-09-04");
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showPopover, setShowPopover] = useState(false);

  // Sync external date if passed
  useEffect(() => {
    if (externalSelectedDate) {
      setSelectedDate(externalSelectedDate);
    }
  }, [externalSelectedDate]);

  // Fetch summary for date
  const fetchSummaryForDate = async (dateStr) => {
    setLoadingSummary(true);
    try {
      const res = await api.get(`/summaries/${dateStr}`);
      setSummary(res.data);
    } catch (err) {
      // If 404, summary not generated yet
      setSummary({ date: dateStr, event_count: 0, text: null, notGenerated: true });
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleDayClick = (day) => {
    const monthStr = String(currentMonth + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
    setSelectedDate(dateStr);
    setShowPopover(true);
    fetchSummaryForDate(dateStr);

    if (onSelectDate) {
      onSelectDate(dateStr);
    } else if (onJumpToDate) {
      onJumpToDate(dateStr);
    }
  };

  // Generate calendar days for September 2026
  // Sep 1, 2026 was Tuesday (day index 1 in Mo-Su)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sun, 2 is Tue
  // Adjust so Monday = 0, Sunday = 6
  const startOffset = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate(); // 30 days in Sep

  const blanks = Array.from({ length: startOffset }, (_, i) => i);
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarMonthIcon sx={{ fontSize: 18, color: "#32d583" }} />
          <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
            Daily Summaries · September 2026
          </h3>
        </div>
        {activeFilterDate ? (
          <button
            onClick={onClearFilter}
            className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#32d583] bg-[#14281a] px-2.5 py-0.5 rounded-full border border-[#234d2c] hover:bg-[#1c3824] transition"
            title="Click to reset filter and view all events"
          >
            <span>Filtering: {parseInt(activeFilterDate.slice(8), 10)} Sep</span>
            <CloseIcon sx={{ fontSize: 12 }} />
          </button>
        ) : (
          <span className="text-[11px] font-mono text-[#8a8a8a] bg-[#141414] px-2.5 py-0.5 rounded-full border border-[#222222]">
            NSE Market Days
          </span>
        )}
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-2 mb-2 text-center">
        {DAYS_OF_WEEK.map((d, idx) => (
          <div
            key={d}
            className={`text-[10px] font-mono font-semibold uppercase ${
              idx >= 5 ? "text-[#444444]" : "text-[#8a8a8a]"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid - Fixed dimensions so no resizing */}
      <div className="grid grid-cols-7 gap-2">
        {blanks.map((b) => (
          <div key={`blank-${b}`} className="h-9 w-full" />
        ))}
        {monthDays.map((day) => {
          const monthStr = String(currentMonth + 1).padStart(2, "0");
          const dayStr = String(day).padStart(2, "0");
          const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
          const isFilterActive = activeFilterDate === dateStr;
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === "2026-09-04";
          const hasEvents = eventDates.includes(dateStr);
          // Check weekend: (startOffset + day - 1) % 7 >= 5
          const dayOfWeek = (startOffset + day - 1) % 7;
          const isWeekend = dayOfWeek >= 5;

          return (
            <button
              key={`day-${day}`}
              onClick={() => handleDayClick(day)}
              className={`h-9 w-full rounded-xl text-xs font-mono font-medium transition flex flex-col items-center justify-center relative ${
                isFilterActive
                  ? "bg-[#132819] text-[#32d583] border-2 border-[#32d583] shadow-lg shadow-[#32d583]/20 font-bold"
                  : isSelected
                  ? "bg-[#1f1f1f] text-white border border-[#32d583] shadow-md"
                  : isToday
                  ? "bg-[#141414] text-[#32d583] border border-[#2a2a2a] hover:border-[#32d583]/50"
                  : isWeekend
                  ? "text-[#444444] hover:bg-[#121212] hover:text-[#777777]"
                  : "text-[#a0a0a0] hover:bg-[#171717] hover:text-white"
              }`}
            >
              <span>{day}</span>
              {hasEvents && !isFilterActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#32d583]/70" />
              )}
            </button>
          );
        })}
      </div>

      {/* Popover overlay (absolutely positioned without resizing the grid) */}
      {showPopover && (
        <div className="absolute inset-0 bg-[#0a0a0a]/95 backdrop-blur-md rounded-2xl p-6 z-20 flex flex-col justify-between border border-[#262626] transition-all">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1c1c1c]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Summary · {selectedDate}
                </span>
                {selectedDate === "2026-09-04" && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#171717] text-[#32d583] border border-[#262626]">
                    <FiberManualRecordIcon sx={{ fontSize: 6, color: "#32d583" }} />
                    <span>Today</span>
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowPopover(false)}
                className="p-1 rounded-lg text-[#8a8a8a] hover:text-white hover:bg-[#1a1a1a] transition"
                title="Close summary"
              >
                <CloseIcon sx={{ fontSize: 16 }} />
              </button>
            </div>

            <div className="mt-4">
              {loadingSummary ? (
                <div className="py-6 text-center text-[#8a8a8a]">
                  <div className="animate-spin w-5 h-5 border-2 border-[#32d583] border-t-transparent rounded-full mx-auto mb-2" />
                  <span className="text-xs font-mono">Retrieving day summary...</span>
                </div>
              ) : summary?.notGenerated ? (
                <div className="py-4 text-center">
                  <p className="text-xs font-mono text-[#8a8a8a] mb-1">
                    No summary generated yet for this date.
                  </p>
                  <p className="text-[11px] text-[#555555]">
                    Scheduled run occurs daily at 15:35 IST.
                  </p>
                </div>
              ) : summary?.text ? (
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#171717] border border-[#242424] text-[11px] font-mono text-[#8a8a8a]">
                    <LayersIcon sx={{ fontSize: 12, color: "#32d583" }} />
                    <span>{summary.event_count} Events Recorded</span>
                  </div>
                  <p className="text-xs text-[#dddddd] leading-relaxed font-sans">
                    {summary.text}
                  </p>
                </div>
              ) : summary?.event_count === 0 ? (
                <div className="py-3">
                  <p className="text-xs text-[#8a8a8a] leading-relaxed">
                    Quiet day — nothing crossed your thresholds.
                  </p>
                </div>
              ) : (
                <div className="py-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#171717] border border-[#242424] text-[11px] font-mono text-[#8a8a8a] mb-2">
                    <LayersIcon sx={{ fontSize: 12, color: "#f79009" }} />
                    <span>{summary.event_count} Events Recorded</span>
                  </div>
                  <p className="text-xs font-mono text-[#8a8a8a]">
                    Summary pending
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#1c1c1c] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (onSelectDate) onSelectDate(selectedDate);
                  setShowPopover(false);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-[#32d583] hover:text-[#42e896] bg-[#14261a] border border-[#234d2c] px-3 py-1.5 rounded-xl font-medium transition"
              >
                <LayersIcon sx={{ fontSize: 13 }} />
                <span>{activeFilterDate === selectedDate ? "Filtered ✓" : "Filter Feed"}</span>
              </button>
              <button
                onClick={() => {
                  if (onJumpToDate) onJumpToDate(selectedDate);
                  setShowPopover(false);
                }}
                className="inline-flex items-center gap-1 text-xs text-[#8a8a8a] hover:text-white px-2.5 py-1.5 rounded-xl transition"
                title="Jump scrubber horizon to this date"
              >
                <PlayArrowIcon sx={{ fontSize: 14 }} />
                <span>Horizon</span>
              </button>
            </div>
            <button
              onClick={() => setShowPopover(false)}
              className="text-xs text-[#8a8a8a] hover:text-white px-2.5 py-1.5 rounded-lg bg-[#141414] border border-[#222222]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
