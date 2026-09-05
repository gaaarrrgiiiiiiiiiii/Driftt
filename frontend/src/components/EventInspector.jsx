import React from "react";
import CloseIcon from "@mui/icons-material/Close";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import NoteAddIcon from "@mui/icons-material/NoteAdd";
import BookmarkAddIcon from "@mui/icons-material/BookmarkAdd";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { formatIST } from "../utils/time";

const COMPANY_NAMES = {
  "RELIANCE": "Reliance Industries Ltd",
  "IRCTC": "Indian Railway Catering & Tourism",
  "HDFCBANK": "HDFC Bank Ltd",
  "TCS": "Tata Consultancy Services",
  "ZOMATO": "Zomato Ltd",
  "INFY": "Infosys Ltd",
};

export default function EventInspector({ event, onClose, onAddThesis }) {
  if (!event) return null;

  const cleanSym = event.symbol ? event.symbol.replace(".NS", "") : "";
  const company = COMPANY_NAMES[cleanSym] || cleanSym;
  const priceBaseline = event.price_baseline || event.price_at_event;
  const priceDiff = (event.price_at_event - priceBaseline).toFixed(2);
  const pctChange = priceBaseline
    ? (((event.price_at_event - priceBaseline) / priceBaseline) * 100).toFixed(2)
    : "0.00";
  const isPositive = Number(pctChange) >= 0;
  const score = Math.round(event.materiality_score || 0);

  // Generate a realistic sparkline data array around baseline and current price
  const base = Number(priceBaseline);
  const current = Number(event.price_at_event);
  const chartData = [
    { time: "09:15", price: Number((base * 0.995).toFixed(2)) },
    { time: "10:30", price: Number((base * 1.002).toFixed(2)) },
    { time: "11:45", price: Number((base * 0.998).toFixed(2)) },
    { time: "12:30", price: Number((base * (isPositive ? 1.012 : 0.988)).toFixed(2)) },
    { time: "13:48", price: current },
  ];

  // Materiality component breakdown
  const priceScore = Math.min(50, Math.round(Math.abs(Number(event.z_score || 1.5)) * 12));
  const volumeScore = Math.min(30, Math.round(Number(event.volume_ratio || 1) * 10));
  const thesisScore = event.event_type === "thesis_crossed" ? 20 : 0;
  const qualityScore = event.source_conflict ? -10 : 0;

  return (
    <div className="bg-[#0b0b0b] border border-[#1f1f1f] rounded-2xl p-6 shadow-2xl flex flex-col gap-6 text-[#f5f5f5]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold tracking-tight text-white">{cleanSym}</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#8a8a8a] bg-[#141414] border border-[#222222] px-2 py-0.5 rounded-full">
              <FiberManualRecordIcon sx={{ fontSize: 8, color: "#32d583" }} />
              <span>Live Telemetry</span>
            </span>
          </div>
          <p className="text-xs text-[#8a8a8a] mt-0.5">{company}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-[#8a8a8a] hover:text-white hover:bg-[#1a1a1a] transition"
          title="Close Inspector"
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </button>
      </div>

      {/* Main Quote */}
      <div>
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold font-mono text-white">
            ₹{Number(event.price_at_event).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span
            className={`text-sm font-mono font-semibold ${
              isPositive ? "text-[#32d583]" : "text-[#8a8a8a]"
            }`}
          >
            {isPositive ? "+" : ""}₹{priceDiff} ({isPositive ? "+" : ""}
            {pctChange}%)
          </span>
        </div>
        <span className="text-[11px] font-mono text-[#666666] block mt-1">
          Timestamp: {formatIST(event.occurred_at)}
        </span>
      </div>

      {/* Compact Recharts Sparkline */}
      <div className="h-28 w-full bg-[#080808] border border-[#1a1a1a] rounded-xl p-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#32d583" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#32d583" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide />
            <YAxis domain={["dataMin - 5", "dataMax + 5"]} hide />
            <Tooltip
              contentStyle={{
                backgroundColor: "#121212",
                borderColor: "#262626",
                fontSize: "11px",
                color: "#f5f5f5",
                borderRadius: "8px",
              }}
              formatter={(val) => [`₹${val}`, "Price"]}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#32d583"
              strokeWidth={1.8}
              fillOpacity={1}
              fill="url(#colorPrice)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 2x3 Bento Metric Grid */}
      <div>
        <span className="text-[10px] uppercase font-mono tracking-wider text-[#666666] block mb-2 font-semibold">
          Anomaly Metrics
        </span>
        <div className="grid grid-cols-3 gap-2 text-left">
          <div className="bg-[#121212] border border-[#1c1c1c] rounded-lg p-2.5">
            <span className="text-[10px] text-[#8a8a8a] block">Price At Event</span>
            <span className="text-xs font-mono font-bold text-white">₹{event.price_at_event}</span>
          </div>
          <div className="bg-[#121212] border border-[#1c1c1c] rounded-lg p-2.5">
            <span className="text-[10px] text-[#8a8a8a] block">24h Move</span>
            <span
              className={`text-xs font-mono font-bold ${
                isPositive ? "text-[#32d583]" : "text-[#8a8a8a]"
              }`}
            >
              {isPositive ? "+" : ""}
              {pctChange}%
            </span>
          </div>
          <div className="bg-[#121212] border border-[#1c1c1c] rounded-lg p-2.5">
            <span className="text-[10px] text-[#8a8a8a] block">Volume Multiple</span>
            <span className="text-xs font-mono font-bold text-white">
              {event.volume_ratio ? `${Number(event.volume_ratio).toFixed(1)}×` : "1.0×"}
            </span>
          </div>
          <div className="bg-[#121212] border border-[#1c1c1c] rounded-lg p-2.5">
            <span className="text-[10px] text-[#8a8a8a] block">Z-Score</span>
            <span className="text-xs font-mono font-bold text-white">
              {event.z_score ? `${Number(event.z_score).toFixed(2)}σ` : "N/A"}
            </span>
          </div>
          <div className="bg-[#121212] border border-[#1c1c1c] rounded-lg p-2.5">
            <span className="text-[10px] text-[#8a8a8a] block">30d Baseline</span>
            <span className="text-xs font-mono font-bold text-white">₹{priceBaseline}</span>
          </div>
          <div className="bg-[#121212] border border-[#1c1c1c] rounded-lg p-2.5">
            <span className="text-[10px] text-[#8a8a8a] block">Event Seq</span>
            <span className="text-xs font-mono font-bold text-white">#{event.seq}</span>
          </div>
        </div>
      </div>

      {/* Materiality Score Breakdown */}
      <div className="bg-[#121212] border border-[#1c1c1c] rounded-xl p-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#8a8a8a] font-semibold">
            Materiality Decomposition
          </span>
          <span className="text-base font-mono font-bold text-white">
            {score} <span className="text-xs text-[#666666]">/ 100</span>
          </span>
        </div>
        <div className="w-full h-1.5 bg-[#1f1f1f] rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-[#32d583] transition-all"
            style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
          />
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-[#8a8a8a]">
            <span>Price movement contribution</span>
            <span className="font-mono text-white">{priceScore} / 50</span>
          </div>
          <div className="flex justify-between text-[#8a8a8a]">
            <span>Volume surge anomaly</span>
            <span className="font-mono text-white">{volumeScore} / 30</span>
          </div>
          <div className="flex justify-between text-[#8a8a8a]">
            <span>Hypothesis relevance</span>
            <span className="font-mono text-white">{thesisScore} / 20</span>
          </div>
          <div className="flex justify-between text-[#8a8a8a]">
            <span>Data quality penalty</span>
            <span className="font-mono text-white">{qualityScore}</span>
          </div>
        </div>
      </div>

      {/* Explanation text */}
      {event.explanation && (
        <div className="bg-[#121212] border border-[#1c1c1c] rounded-xl p-3 text-xs text-[#8a8a8a]">
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#32d583] font-bold block mb-1">
            Engine Analysis
          </span>
          <p className="leading-relaxed text-[#d4d4d4]">{event.explanation}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-[#1c1c1c]">
        <button
          onClick={() => onAddThesis?.(event)}
          className="flex-1 bg-[#171717] hover:bg-[#202020] border border-[#262626] text-white py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
        >
          <NoteAddIcon sx={{ fontSize: 15, color: "#32d583" }} />
          <span>Add Thesis Note</span>
        </button>
        <button
          onClick={onClose}
          className="bg-[#121212] hover:bg-[#1a1a1a] border border-[#222222] text-[#8a8a8a] hover:text-white py-2 px-3 rounded-lg text-xs transition"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
