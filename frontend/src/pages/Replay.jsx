import { useState, useEffect } from "react";
import api from "../api/client";
import { formatIST, getISTDateString } from "../utils/time";
import EventRow from "../components/EventRow";
import Calendar from "../components/Calendar";
import FastRewindIcon from "@mui/icons-material/FastRewind";
import FastForwardIcon from "@mui/icons-material/FastForward";
import HistoryToggleOffIcon from "@mui/icons-material/HistoryToggleOff";
import LayersIcon from "@mui/icons-material/Layers";
import ShowChartIcon from "@mui/icons-material/ShowChart";

export default function Replay({ activeWatchlist }) {
  const [events, setEvents] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeWatchlist?.id) return;
    const loadEvents = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/replay/${activeWatchlist.id}?from_seq=0`);
        const evs = res.data.events || [];
        setEvents(evs);
        if (evs.length > 0) {
          setCurrentIndex(evs.length - 1);
          // Auto-filter to the most recent day so users see only that day by default
          const mostRecentDate = getISTDateString(evs[evs.length - 1].occurred_at);
          if (mostRecentDate) setSelectedDay(mostRecentDate);
        }
      } catch (err) {
        console.error("Failed to load timeline replay", err);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, [activeWatchlist]);

  const eventDates = Array.from(
    new Set(events.map((ev) => getISTDateString(ev.occurred_at)).filter(Boolean))
  );

  const formatSelectedDate = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length < 3) return dateStr;
    const [y, m, d] = parts;
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
  };

  const handleSelectDate = (dateStr) => {
    setSelectedDay(dateStr);
    let targetIdx = -1;
    for (let i = events.length - 1; i >= 0; i--) {
      if (getISTDateString(events[i].occurred_at) === dateStr) {
        targetIdx = i;
        break;
      }
    }
    if (targetIdx !== -1) {
      setCurrentIndex(targetIdx);
    }
  };

  const handleJumpToDate = (dateStr) => {
    // Also activate the day filter so only that day's events are shown (not cumulative)
    setSelectedDay(dateStr);
    let targetIdx = -1;
    for (let i = events.length - 1; i >= 0; i--) {
      if (getISTDateString(events[i].occurred_at) === dateStr) {
        targetIdx = i;
        break;
      }
    }
    if (targetIdx !== -1) {
      setCurrentIndex(targetIdx);
    }
  };

  const visibleEvents = events.slice(0, currentIndex + 1);

  // If calendar day filter is active, show only that day's events;
  // otherwise show cumulative events up to the selected horizon
  const displayedEvents = selectedDay
    ? events.filter((ev) => getISTDateString(ev.occurred_at) === selectedDay)
    : visibleEvents;

  // Aggregate stats based on currently displayed events
  const totalValue = displayedEvents.reduce((acc, ev) => acc + Number(ev.price_at_event), 0);
  const avgScore = displayedEvents.length
    ? Math.round(displayedEvents.reduce((acc, ev) => acc + Number(ev.materiality_score), 0) / displayedEvents.length)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <HistoryToggleOffIcon sx={{ fontSize: 20, color: "#32d583" }} />
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#8a8a8a] font-semibold">
            Historical Scrub
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Market Timeline Replay
        </h1>
        <p className="text-xs text-[#8a8a8a] mt-1">
          Reconstruct the exact market feed and watchlist state at any previous tick.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-[#8a8a8a]">
          <div className="animate-spin w-6 h-6 border-2 border-[#32d583] border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-xs font-mono">Loading chronological event history...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-12 text-center my-6">
          <p className="text-xs font-mono text-[#8a8a8a]">
            No recorded events found for {activeWatchlist?.name || "this watchlist"}.
          </p>
        </div>
      ) : (
        <>
          {/* Bento Controller Block */}
          <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6 mb-8 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold block">
                  Replay Horizon Timestamp
                </span>
                <span className="text-lg font-bold font-mono text-white">
                  {formatIST(events[currentIndex]?.occurred_at)}
                </span>
              </div>

              {/* Stepper Controls */}
              <div className="flex items-center gap-2">
                <button
                  disabled={currentIndex <= 0}
                  onClick={() => {
                    setSelectedDay(null);
                    setCurrentIndex((prev) => Math.max(0, prev - 1));
                  }}
                  className="flex items-center gap-1 px-3.5 py-1.5 bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] rounded-xl text-xs font-medium text-white disabled:opacity-40 transition"
                >
                  <FastRewindIcon sx={{ fontSize: 16 }} />
                  <span>Step Back</span>
                </button>
                <button
                  disabled={currentIndex >= events.length - 1}
                  onClick={() => {
                    setSelectedDay(null);
                    setCurrentIndex((prev) => Math.min(events.length - 1, prev + 1));
                  }}
                  className="flex items-center gap-1 px-3.5 py-1.5 bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] rounded-xl text-xs font-medium text-white disabled:opacity-40 transition"
                >
                  <span>Step Forward</span>
                  <FastForwardIcon sx={{ fontSize: 16 }} />
                </button>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="0"
              max={events.length - 1}
              value={currentIndex}
              onChange={(e) => {
                setSelectedDay(null);
                setCurrentIndex(Number(e.target.value));
              }}
              className="w-full h-1.5 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-[#32d583]"
            />

            <div className="flex justify-between text-[11px] text-[#666666] mt-3 font-mono">
              <span>Seq #{events[0]?.seq} (Oldest)</span>
              <span className="text-[#32d583] font-semibold">
                {selectedDay ? (
                  <span>Filtering: {formatSelectedDate(selectedDay)} ({displayedEvents.length} events)</span>
                ) : (
                  <span>Showing {visibleEvents.length} of {events.length} events</span>
                )}
              </span>
              <span>Seq #{events[events.length - 1]?.seq} (Latest)</span>
            </div>
          </div>

          {/* Split View: Event Timeline (2/3) + Watchlist State (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Timeline Stream */}
            <div className="lg:col-span-8 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                    {selectedDay
                      ? `Event Stream · ${formatSelectedDate(selectedDay)}`
                      : "Event Stream at Selected Horizon"}
                  </span>
                  {selectedDay && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#14281a] text-[#32d583] border border-[#234d2c] font-medium">
                      Calendar Filter ({displayedEvents.length})
                    </span>
                  )}
                </div>
                {selectedDay ? (
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="text-[11px] font-mono text-[#8a8a8a] hover:text-white bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] px-2.5 py-1 rounded-xl transition flex items-center gap-1 self-start sm:self-auto"
                  >
                    <span>✕ View All Horizon ({visibleEvents.length})</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-mono text-[#666666]">
                    Seq #{events[0]?.seq} → #{events[currentIndex]?.seq}
                  </span>
                )}
              </div>

              {displayedEvents.length === 0 ? (
                <div className="bg-[#080808] border border-[#181818] rounded-2xl p-10 text-center">
                  <p className="text-xs font-mono text-[#8a8a8a] mb-2">
                    No events recorded on {formatSelectedDate(selectedDay)}.
                  </p>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="text-xs font-mono text-[#32d583] hover:underline"
                  >
                    View all horizon events
                  </button>
                </div>
              ) : (
                <div className="bg-[#080808] border border-[#181818] rounded-2xl overflow-hidden shadow-xl divide-y divide-[#141414]">
                  {[...displayedEvents].reverse().map((ev) => (
                    <EventRow key={ev.seq} event={ev} />
                  ))}
                </div>
              )}
            </div>

            {/* Watchlist Snapshot & Calendar at Horizon */}
            <div className="lg:col-span-4 sticky top-24 space-y-6">
              <Calendar
                onJumpToDate={handleJumpToDate}
                onSelectDate={handleSelectDate}
                activeFilterDate={selectedDay}
                onClearFilter={() => setSelectedDay(null)}
                eventDates={eventDates}
                selectedDate={selectedDay || getISTDateString(events[currentIndex]?.occurred_at)}
              />

              <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6 space-y-6">
                <div>
                  <span className={`text-[10px] font-mono uppercase tracking-wider font-semibold block mb-1 ${selectedDay ? "text-[#32d583]" : "text-[#666666]"}`}>
                    {selectedDay ? "Day Snapshot Active" : "Replay Context"}
                  </span>
                  <h3 className="text-base font-bold text-white">
                    {selectedDay ? formatSelectedDate(selectedDay) : "Watchlist State Snapshot"}
                  </h3>
                  <span className="text-xs text-[#8a8a8a]">
                    {selectedDay ? `${displayedEvents.length} events recorded on this date` : activeWatchlist?.name}
                  </span>
                </div>

              <div className="space-y-4">
                <div className="bg-[#121212] border border-[#1c1c1c] rounded-xl p-3.5">
                  <span className="text-[10px] uppercase font-mono text-[#8a8a8a] block">Aggregate Notional</span>
                  <span className="text-xl font-mono font-bold text-white block mt-0.5">
                    ₹{totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="bg-[#121212] border border-[#1c1c1c] rounded-xl p-3.5">
                  <span className="text-[10px] uppercase font-mono text-[#8a8a8a] block">Mean Materiality</span>
                  <span className="text-xl font-mono font-bold text-[#32d583] block mt-0.5">
                    {avgScore} / 100
                  </span>
                </div>

                <div className="bg-[#121212] border border-[#1c1c1c] rounded-xl p-3.5">
                  <span className="text-[10px] uppercase font-mono text-[#8a8a8a] block">Events Reconstructed</span>
                  <span className="text-xl font-mono font-bold text-white block mt-0.5">
                    {visibleEvents.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    )}
  </div>
);
}
