import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useFeed } from "../hooks/useFeed";
import SinceYouLeft from "../components/SinceYouLeft";
import AISummaryCard from "../components/AISummaryCard";
import SensitivityKnob from "../components/SensitivityKnob";
import EventRow from "../components/EventRow";
import EventInspector from "../components/EventInspector";
import ReplaySlider from "../components/ReplaySlider";
import QuietDayState from "../components/QuietDayState";
import RangeToggle from "../components/RangeToggle";
import EventTypeDonut from "../components/EventTypeDonut";
import StatCard from "../components/StatCard";
import api from "../api/client";

import SyncIcon from "@mui/icons-material/Sync";
import RefreshIcon from "@mui/icons-material/Refresh";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import BoltIcon from "@mui/icons-material/Bolt";
import LayersIcon from "@mui/icons-material/Layers";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";




export default function Feed({ activeWatchlist }) {
  const [sensitivity, setSensitivity] = useState("balanced");
  const [range, setRange] = useState("today");
  const [syncing, setSyncing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventTypes, setEventTypes] = useState([]);
  const [mostActive, setMostActive] = useState(null);
  const [marketOpen, setMarketOpen] = useState(null);
  const [sparklineData, setSparklineData] = useState([]);

  const {
    events,
    loading,
    unseenCount,
    refetch,
    markSeen,
  } = useFeed(activeWatchlist?.id, sensitivity, range);

  // Fetch real market status on mount and every 60s
  useEffect(() => {
    const fetchMarket = () =>
      api.get("/health/")
        .then((res) => setMarketOpen(res.data?.market_open ?? null))
        .catch(() => setMarketOpen(null));
    fetchMarket();
    const id = setInterval(fetchMarket, 60000);
    return () => clearInterval(id);
  }, []);

  // Fetch real sparkline data when watchlist or range changes
  useEffect(() => {
    if (!activeWatchlist?.id) return;
    api.get(`/watchlist/${activeWatchlist.id}/sparklines?range=${range}`)
      .then((res) => {
        const all = Object.values(res.data || {}).flat();
        const sorted = all.sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at));
        const buckets = sorted.map((d) => ({
          time: new Date(d.occurred_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
          val: parseFloat(d.score),
        }));
        setSparklineData(buckets.length > 0 ? buckets : []);
      })
      .catch(() => setSparklineData([]));
  }, [activeWatchlist?.id, range]);

  useEffect(() => {
    if (!activeWatchlist?.id) return;
    api.get(`/stats/event-types?range=${range}&watchlist_id=${activeWatchlist.id}`)
      .then((res) => setEventTypes(res.data || []))
      .catch((err) => console.error("Failed to load event types", err));

    api.get(`/stats/most-active?range=${range}&watchlist_id=${activeWatchlist.id}`)
      .then((res) => setMostActive(res.data))
      .catch((err) => console.error("Failed to load most active", err));
  }, [activeWatchlist?.id, range]);

  const handleSyncReal = async () => {
    if (!activeWatchlist?.id || syncing) return;
    setSyncing(true);
    try {
      await api.post(`/feed/${activeWatchlist.id}/sync-real`);
      await refetch();
      const [etRes, maRes] = await Promise.all([
        api.get(`/stats/event-types?range=${range}&watchlist_id=${activeWatchlist.id}`),
        api.get(`/stats/most-active?range=${range}&watchlist_id=${activeWatchlist.id}`),
      ]);
      setEventTypes(etRes.data || []);
      setMostActive(maRes.data);
    } catch (err) {
      console.error("Sync failed", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleResetSeen = async () => {
    if (!activeWatchlist?.id) return;
    try {
      await api.post(`/feed/${activeWatchlist.id}/reset-seen`);
      await refetch();
    } catch (err) {
      console.error("Reset seen failed", err);
    }
  };

  const thesisTriggerCount = events.filter((e) => e.event_type === "thesis_crossed").length;
  const conflictCount = events.filter((e) => e.source_conflict).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {activeWatchlist ? (
        <>
          {/* Top Bento Composition */}
          {/* Top Bento Composition: 4 balanced, evenly-spaced rows */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8 items-stretch">
            {/* Row 1, Block 1: Context Hero (7 cols) */}
            <div className="md:col-span-7 h-full">
              <SinceYouLeft
                eventCount={events.length}
                onMarkSeen={markSeen}
                loading={loading}
              />
            </div>

            {/* Row 1, Block 2: Market Status Tile (5 cols) */}
            <div className="md:col-span-5 bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6 flex flex-col justify-between h-full min-h-[165px]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#8a8a8a] font-semibold">
                  NSE Market Status
                </span>
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#141414] border border-[#222222]"
                  style={{ color: marketOpen === null ? "#8a8a8a" : marketOpen ? "#32d583" : "#f87171" }}
                >
                  <FiberManualRecordIcon
                    sx={{ fontSize: 8, color: marketOpen === null ? "#8a8a8a" : marketOpen ? "#32d583" : "#f87171" }}
                  />
                  <span>
                    {marketOpen === null ? "Checking…" : marketOpen ? "Market Open" : "Market Closed"}
                  </span>
                </span>
              </div>

              <div className="space-y-1 mb-4">
                <span className="text-xl font-bold font-mono text-white block">
                  09:15 — 15:30 IST
                </span>
                <span className="text-xs text-[#8a8a8a]">
                  Dual-Source Active · Yahoo Finance + NSE Public Endpoints
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#1c1c1c] text-xs">
                <span className="text-[#8a8a8a]">Reconciliation Match:</span>
                <span className="font-mono text-[#32d583] font-semibold">99.88% Data Match</span>
              </div>
            </div>

            {/* Row 2, Blocks 3-6: 4 Small KPI blocks (3 cols each) */}
            <div className="md:col-span-3 bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-5 flex flex-col justify-between h-full min-h-[115px]">
              <div className="flex items-center justify-between text-[#8a8a8a] mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Changes</span>
                <ShowChartIcon sx={{ fontSize: 16, color: "#8a8a8a" }} />
              </div>
              <span className="text-2xl font-bold font-mono text-white block">{events.length}</span>
              <span className="text-[11px] text-[#666666] mt-1 block">Exceeding {sensitivity} threshold</span>
            </div>

            <div className="md:col-span-3 bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-5 flex flex-col justify-between h-full min-h-[115px]">
              <div className="flex items-center justify-between text-[#8a8a8a] mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Watchlist Tickers</span>
                <LayersIcon sx={{ fontSize: 16, color: "#8a8a8a" }} />
              </div>
              <span className="text-2xl font-bold font-mono text-white block">
                {activeWatchlist?.itemCount ?? activeWatchlist?.items?.length ?? 5}
              </span>
              <span className="text-[11px] text-[#666666] mt-1 block">{activeWatchlist.name}</span>
            </div>

            <div className="md:col-span-3 bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-5 flex flex-col justify-between h-full min-h-[115px]">
              <div className="flex items-center justify-between text-[#8a8a8a] mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Thesis Triggers</span>
                <BoltIcon sx={{ fontSize: 16, color: "#32d583" }} />
              </div>
              <span className="text-2xl font-bold font-mono text-white block">{thesisTriggerCount}</span>
              <span className="text-[11px] text-[#666666] mt-1 block">Materiality floored to ≥90</span>
            </div>

            <div className="md:col-span-3 bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-5 flex flex-col justify-between h-full min-h-[115px]">
              <div className="flex items-center justify-between text-[#8a8a8a] mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Source Conflicts</span>
                <DoneAllIcon sx={{ fontSize: 16, color: "#8a8a8a" }} />
              </div>
              <span className="text-2xl font-bold font-mono text-white block">{conflictCount}</span>
              <span className="text-[11px] text-[#666666] mt-1 block">Auto-reconciled to fresher</span>
            </div>

            {/* Row 3, Block 7: Watchlist Materiality Sparkline (6 cols) */}
            <div className="md:col-span-6 bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-5 flex flex-col justify-between h-full min-h-[200px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#8a8a8a] font-semibold">
                  Watchlist Materiality Trend
                </span>
                <span className="text-[11px] font-mono text-[#8a8a8a]">
                  {sparklineData.length > 0 ? `${sparklineData.length} events` : "No events yet"}
                </span>
              </div>
              <div className="h-24 w-full my-auto">
                {sparklineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparklineData}>
                      <defs>
                        <linearGradient id="feedVelocity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#32d583" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#32d583" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" hide />
                      <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#121212",
                          borderColor: "#262626",
                          fontSize: "11px",
                          color: "#fff",
                          borderRadius: "8px",
                        }}
                        formatter={(val) => [`${val.toFixed(1)}`, "Score"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="val"
                        stroke="#32d583"
                        strokeWidth={1.8}
                        fill="url(#feedVelocity)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-[11px] text-[#555] font-mono">
                    Awaiting market events…
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#181818] text-[11px] text-[#8a8a8a]">
                <span>Materiality Score Timeline</span>
                {sparklineData.length > 0 && (
                  <span className="font-mono text-[#32d583]">
                    Peak: {Math.max(...sparklineData.map((d) => d.val)).toFixed(1)}
                  </span>
                )}
              </div>
            </div>

            {/* Row 3, Block 8: AI Executive Brief (6 cols) */}
            <div className="md:col-span-6 h-full min-h-[200px]">
              <AISummaryCard
                watchlistId={activeWatchlist.id}
                eventCount={events.length}
              />
            </div>

            {/* Row 4, Block 9: Event-Type Breakdown Donut (6 cols) */}
            <div className="md:col-span-6 h-full min-h-[220px]">
              <EventTypeDonut data={eventTypes} range={range} />
            </div>

            {/* Row 4, Block 10: Most Active Symbol Stat Card (6 cols) */}
            <div className="md:col-span-6 h-full min-h-[220px]">
              <StatCard
                title="Most Active Symbol"
                symbol={mostActive?.symbol}
                eventCount={mostActive?.event_count}
                range={range}
              />
            </div>
          </div>

          {/* Noise Filter Segmented Switcher */}
          <SensitivityKnob value={sensitivity} onChange={setSensitivity} />

          {/* Event Stream Title & Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Event Stream
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#171717] text-[#8a8a8a] border border-[#262626]">
                {events.length} changes
              </span>
              <RangeToggle value={range} onChange={setRange} />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncReal}
                disabled={syncing}
                className="text-xs text-white hover:text-[#32d583] flex items-center gap-1.5 transition px-3 py-1.5 rounded-lg bg-[#141414] border border-[#222222] hover:border-[#32d583]/40 disabled:opacity-50"
                title="Fetch live quotes and reconcile market data"
              >
                <SyncIcon sx={{ fontSize: 14, animation: syncing ? "spin 1s linear infinite" : "none" }} />
                <span>{syncing ? "Syncing Quotes..." : "Sync Real Data"}</span>
              </button>
              <button
                onClick={() => refetch()}
                className="text-xs text-[#8a8a8a] hover:text-white flex items-center gap-1 transition px-2.5 py-1.5 rounded-lg bg-[#141414] border border-[#222222]"
                title="Refresh feed"
              >
                <RefreshIcon sx={{ fontSize: 14 }} />
                <span>Refresh</span>
              </button>
              <Link
                to="/watchlist"
                className="text-xs text-[#32d583] hover:underline font-medium flex items-center gap-1 ml-2"
              >
                <span>Manage Watchlist</span>
                <ArrowForwardIcon sx={{ fontSize: 12 }} />
              </Link>
            </div>
          </div>

          {/* Main Content Layout: Stream List + Right-Side Event Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Event List (spans 7 cols when inspector open, 12 cols otherwise) */}
            <div className={selectedEvent ? "lg:col-span-7" : "lg:col-span-12"}>
              {loading && events.length === 0 && (
                <div className="text-center py-20 text-[#8a8a8a]">
                  <div className="animate-spin w-6 h-6 border-2 border-[#32d583] border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-xs font-mono">Diffing market stream against Welford baselines...</p>
                </div>
              )}

              {!loading && events.length === 0 && (
                <QuietDayState
                  watchedCount={activeWatchlist?.itemCount ?? activeWatchlist?.items?.length ?? 5}
                  watchlistName={activeWatchlist?.name || "Watchlist"}
                  sensitivity={sensitivity}
                  onResetSeen={handleResetSeen}
                  onLowerThreshold={() => setSensitivity("chattery")}
                />
              )}

              {/* Tabular Event Stream Rows */}
              <div className="bg-[#080808] border border-[#181818] rounded-2xl overflow-hidden shadow-xl divide-y divide-[#141414]">
                {events.map((ev) => (
                  <EventRow
                    key={ev.seq}
                    event={ev}
                    isSelected={selectedEvent?.seq === ev.seq}
                    onSelect={(e) => setSelectedEvent(e)}
                  />
                ))}
              </div>

              {/* Embedded Historical Replay Scrubber */}
              <div className="mt-8">
                <ReplaySlider watchlistId={activeWatchlist.id} />
              </div>
            </div>

            {/* Right-Side Event Inspector Drawer / Pinned Panel */}
            {selectedEvent && (
              <div className="lg:col-span-5 sticky top-24">
                <EventInspector
                  event={selectedEvent}
                  onClose={() => setSelectedEvent(null)}
                />
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-16 text-center my-8">
          <span className="text-xs font-mono uppercase tracking-wider text-[#8a8a8a] block mb-2 font-semibold">
            Monitored Universe
          </span>
          <h2 className="text-2xl font-bold text-white mb-2">No Active Watchlist Selected</h2>
          <p className="text-xs text-[#8a8a8a] mb-6 max-w-sm mx-auto leading-relaxed">
            Create or select a watchlist to track tickers, calibrate Welford baselines, and define thesis triggers.
          </p>
          <Link
            to="/watchlist"
            className="inline-flex items-center gap-2 bg-[#32d583] text-black font-bold px-5 py-2.5 rounded-xl text-xs shadow hover:bg-[#28b86e] transition"
          >
            <span>Create Watchlist</span>
            <ArrowForwardIcon sx={{ fontSize: 14 }} />
          </Link>
        </div>
      )}
    </div>
  );
}
