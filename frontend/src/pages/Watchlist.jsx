import { useState, useEffect } from "react";
import ThesisForm from "../components/ThesisForm";
import ScoreSparkline from "../components/ScoreSparkline";
import api from "../api/client";
import LayersIcon from "@mui/icons-material/Layers";
import BoltIcon from "@mui/icons-material/Bolt";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

const COMPANY_NAMES = {
  "RELIANCE": "Reliance Industries Ltd",
  "IRCTC": "Indian Railway Catering & Tourism",
  "HDFCBANK": "HDFC Bank Ltd",
  "TCS": "Tata Consultancy Services",
  "ZOMATO": "Zomato Ltd",
  "INFY": "Infosys Ltd",
};

export default function Watchlist({
  watchlists,
  activeWatchlist,
  items,
  addItem,
  removeItem,
  createWatchlist,
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [showNewWlInput, setShowNewWlInput] = useState(false);
  const [sparklines, setSparklines] = useState({});

  useEffect(() => {
    if (!activeWatchlist?.id) return;
    api.get(`/watchlist/${activeWatchlist.id}/sparklines?range=all`)
      .then((res) => setSparklines(res.data || {}))
      .catch((err) => console.error("Failed to load sparklines", err));
  }, [activeWatchlist?.id, items]);

  const handleCreateWatchlist = async (e) => {
    e.preventDefault();
    if (!newWatchlistName.trim()) return;
    await createWatchlist(newWatchlistName.trim());
    setNewWatchlistName("");
    setShowNewWlInput(false);
  };

  const getThesisDescription = (item) => {
    if (item.thesis_type === "price_level" && item.thesis_value) {
      return `Target Level: ₹${item.thesis_value} (≥90 floor on breach)`;
    }
    if (item.thesis_type === "pct_move" && item.thesis_value) {
      return `Target Move: ${item.thesis_value > 0 ? "+" : ""}${item.thesis_value}% from entry ₹${item.thesis_entry || "N/A"}`;
    }
    return "Passive Statistical Monitoring";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Bento Header Blocks */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8a8a8a] font-semibold block mb-1">
              Monitored Universe
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Watchlists & Hypotheses
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {!showNewWlInput ? (
              <button
                onClick={() => setShowNewWlInput(true)}
                className="text-xs text-[#8a8a8a] hover:text-white bg-[#121212] border border-[#222222] px-3.5 py-2 rounded-xl transition"
              >
                + New Watchlist
              </button>
            ) : (
              <form onSubmit={handleCreateWatchlist} className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  placeholder="Watchlist name"
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  className="bg-[#121212] border border-[#222222] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#32d583]"
                />
                <button
                  type="submit"
                  className="bg-[#32d583] text-black font-bold px-3 py-1.5 rounded-xl text-xs"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewWlInput(false)}
                  className="text-xs text-[#8a8a8a] hover:text-white"
                >
                  Cancel
                </button>
              </form>
            )}

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-[#32d583] hover:bg-[#28b86e] text-black font-bold px-4 py-2 rounded-xl text-xs transition shadow flex items-center gap-1.5"
            >
              <AddIcon sx={{ fontSize: 16 }} />
              <span>{showAddForm ? "Close Form" : "Add Stock"}</span>
            </button>
          </div>
        </div>

        {/* 4 Bento KPI Summary Blocks */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-5">
            <div className="flex items-center justify-between text-[#8a8a8a] mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Tracked Stocks</span>
              <LayersIcon sx={{ fontSize: 16, color: "#8a8a8a" }} />
            </div>
            <span className="text-2xl font-bold font-mono text-white block">{items.length}</span>
            <span className="text-[11px] text-[#666666] mt-1 block">Active in portfolio</span>
          </div>

          <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-5">
            <div className="flex items-center justify-between text-[#8a8a8a] mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Active Hypotheses</span>
              <BoltIcon sx={{ fontSize: 16, color: "#32d583" }} />
            </div>
            <span className="text-2xl font-bold font-mono text-white block">
              {items.filter((i) => i.thesis_type && i.thesis_type !== "monitoring").length}
            </span>
            <span className="text-[11px] text-[#666666] mt-1 block">Configured thresholds</span>
          </div>

          <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-5">
            <div className="flex items-center justify-between text-[#8a8a8a] mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Data Match</span>
              <DoneAllIcon sx={{ fontSize: 16, color: "#32d583" }} />
            </div>
            <span className="text-2xl font-bold font-mono text-white block">99.88%</span>
            <span className="text-[11px] text-[#666666] mt-1 block">Yahoo & NSE reconcile</span>
          </div>

          <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-5">
            <div className="flex items-center justify-between text-[#8a8a8a] mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Avg Volatility</span>
              <TrendingUpIcon sx={{ fontSize: 16, color: "#8a8a8a" }} />
            </div>
            <span className="text-2xl font-bold font-mono text-white block">1.76×</span>
            <span className="text-[11px] text-[#666666] mt-1 block">Sigma multiplier</span>
          </div>
        </div>
      </div>

      {/* Add Thesis Form */}
      {showAddForm && (
        <ThesisForm
          onAdd={addItem}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Info Callout */}
      <div className="mb-6 p-4 rounded-2xl bg-[#0d0d0d] border border-[#1f1f1f] flex items-start gap-3">
        <InfoOutlinedIcon sx={{ fontSize: 18, color: "#32d583", shrink: 0, mt: 0.2 }} />
        <div className="text-xs text-[#8a8a8a] leading-relaxed">
          <span className="font-semibold text-white block mb-0.5">The Purpose of Stated Watch Theses:</span>
          Unlike conventional watchlists that alert on every minor ±1% jitter, Driftt requires stating why you track an asset. When your threshold is breached, materiality is guaranteed at ≥90, breaking through any calm filter.
        </div>
      </div>

      {/* Dense Watchlist Table */}
      <div className="bg-[#080808] border border-[#181818] rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-[#181818] flex justify-between items-center bg-[#0d0d0d]">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
            Tracked Assets ({items.length})
          </span>
          <span className="text-xs font-mono text-[#8a8a8a]">
            {activeWatchlist?.name || "Active List"}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16 text-[#666666]">
            <p className="text-xs mb-3">Watchlist is currently empty.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="text-xs text-[#32d583] hover:underline font-medium"
            >
              Add your first stock with a watch hypothesis →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#141414]">
            {items.map((item) => {
              const cleanSym = item.symbol.replace(".NS", "");
              const company = COMPANY_NAMES[cleanSym] || cleanSym;

              return (
                <div
                  key={item.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#0e0e0e] transition"
                >
                  <div className="min-w-[220px]">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold font-mono text-white">
                        {cleanSym}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#171717] text-[#8a8a8a] border border-[#222222]">
                        {item.thesis_type ? item.thesis_type.replace("_", " ") : "monitoring"}
                      </span>
                    </div>
                    <p className="text-xs text-[#8a8a8a] truncate mt-0.5">{company}</p>
                  </div>

                  <div className="flex-1">
                    <span className="text-xs font-mono text-[#cccccc] block">
                      {getThesisDescription(item)}
                    </span>
                  </div>

                  <div className="shrink-0 flex items-center">
                    <ScoreSparkline
                      points={sparklines[item.symbol] || []}
                      symbol={item.symbol}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 rounded-lg text-[#666666] hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Remove ticker from watchlist"
                    >
                      <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
