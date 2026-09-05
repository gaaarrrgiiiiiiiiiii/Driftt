import React from "react";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BoltIcon from "@mui/icons-material/Bolt";
import BarChartIcon from "@mui/icons-material/BarChart";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { formatISTShort } from "../utils/time";

const COMPANY_NAMES = {
  "RELIANCE": "Reliance Industries Ltd",
  "IRCTC": "Indian Railway Catering & Tourism",
  "HDFCBANK": "HDFC Bank Ltd",
  "TCS": "Tata Consultancy Services",
  "ZOMATO": "Zomato Ltd",
  "INFY": "Infosys Ltd",
};

export function getEventTypeBadge(eventType) {
  switch (eventType) {
    case "volatility_breakout":
      return {
        label: "VOLATILITY BREAKOUT",
        icon: <TrendingUpIcon sx={{ fontSize: 14, color: "#32d583" }} />,
      };
    case "thesis_crossed":
      return {
        label: "THESIS TRIGGERED",
        icon: <BoltIcon sx={{ fontSize: 14, color: "#32d583" }} />,
      };
    case "volume_spike":
      return {
        label: "VOLUME SURGE",
        icon: <BarChartIcon sx={{ fontSize: 14, color: "#8a8a8a" }} />,
      };
    case "price_spike":
    default:
      return {
        label: "PRICE MOVE",
        icon: <ShowChartIcon sx={{ fontSize: 14, color: "#8a8a8a" }} />,
      };
  }
}

export default function EventRow({ event, isSelected, onSelect }) {
  const cleanSym = event.symbol ? event.symbol.replace(".NS", "") : "";
  const company = COMPANY_NAMES[cleanSym] || cleanSym;
  const badge = getEventTypeBadge(event.event_type);

  const priceBaseline = event.price_baseline || event.price_at_event;
  const pctChange = priceBaseline
    ? (((event.price_at_event - priceBaseline) / priceBaseline) * 100).toFixed(2)
    : "0.00";
  const isPositive = Number(pctChange) >= 0;
  const score = Math.round(event.materiality_score || 0);

  return (
    <div
      onClick={() => onSelect?.(event)}
      className={`group px-5 py-4 cursor-pointer transition border-b border-[#181818] ${
        isSelected
          ? "bg-[#161616] border-l-2 border-l-[#32d583]"
          : "hover:bg-[#0e0e0e] bg-[#080808]"
      }`}
      style={{
        display: "grid",
        gridTemplateColumns: "220px 110px 90px 160px auto",
        alignItems: "center",
        gap: "16px",
      }}
    >
      {/* Col 1: Ticker & Company */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-bold text-white tracking-tight group-hover:text-[#32d583] transition shrink-0">
            {cleanSym}
          </span>
          <div className="flex items-center gap-1 text-[10px] font-mono text-[#8a8a8a] bg-[#141414] border border-[#222222] px-1.5 py-0.5 rounded shrink-0">
            {badge.icon}
            <span>{badge.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-xs text-[#8a8a8a] truncate">{company}</p>
          {event.occurred_at && (
            <>
              <span className="text-[#333333]">·</span>
              <span className="text-[10px] font-mono text-[#777777] shrink-0">
                {formatISTShort(event.occurred_at)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Col 2: Price & Direction */}
      <div>
        <span className="text-sm font-mono font-bold text-white block">
          ₹{Number(event.price_at_event).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
        <span
          className={`text-xs font-mono font-medium ${
            isPositive ? "text-[#32d583]" : "text-[#8a8a8a]"
          }`}
        >
          {isPositive ? "+" : ""}
          {pctChange}%
        </span>
      </div>

      {/* Col 3: Volume Multiple */}
      <div>
        <span className="text-xs font-mono text-[#f5f5f5] block">
          {event.volume_ratio ? `${Number(event.volume_ratio).toFixed(1)}×` : "1.0×"}
        </span>
        <span className="text-[11px] text-[#555555]">volume multiple</span>
      </div>

      {/* Col 4: Materiality Score Bar */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-xs font-mono font-bold text-white">
            {score} <span className="text-[10px] font-normal text-[#666666]">/ 100</span>
          </span>
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#8a8a8a]">
            {score >= 80 ? "High" : score >= 40 ? "Elevated" : "Notable"}
          </span>
        </div>
        <div className="w-full h-1 bg-[#1c1c1c] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#32d583] transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
          />
        </div>
      </div>

      {/* Col 5: Telemetry & Reconciliation tag */}
      <div className="flex items-center gap-2 justify-end">
        {event.source_conflict && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-[#171717] border border-[#2a2a2a] text-[#f5f5f5]"
            title="Dual-source reconciliation: Divergence detected and reconciled."
          >
            <WarningAmberIcon sx={{ fontSize: 12, color: "#8a8a8a" }} />
            <span>Reconciled</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#8a8a8a]">
          <FiberManualRecordIcon sx={{ fontSize: 8, color: "#32d583" }} />
          <span>Live</span>
        </span>
      </div>
    </div>
  );
}
