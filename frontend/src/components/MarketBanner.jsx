import { useState, useEffect } from "react";
import api from "../api/client";

export default function MarketBanner() {
  const [isOpen, setIsOpen] = useState(null);

  useEffect(() => {
    const checkMarket = async () => {
      try {
        const res = await api.get("/health/");
        setIsOpen(res.data.market_open);
      } catch (e) {
        // Fallback to client-side IST calculation
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(now.getTime() + istOffset);
        const day = istDate.getUTCDay();
        const hrs = istDate.getUTCHours();
        const mins = istDate.getUTCMinutes();
        const timeVal = hrs * 60 + mins;
        const open = day >= 1 && day <= 5 && timeVal >= 9 * 60 + 15 && timeVal <= 15 * 60 + 30;
        setIsOpen(open);
      }
    };
    checkMarket();
    const timer = setInterval(checkMarket, 60000);
    return () => clearInterval(timer);
  }, []);

  if (isOpen === null) return null;

  return (
    <div
      className={`px-4 py-2 text-xs font-medium rounded-lg flex items-center justify-between mb-5 border transition-all ${
        isOpen
          ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/50"
          : "bg-amber-950/40 text-amber-300 border-amber-800/50"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          {isOpen && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isOpen ? "bg-emerald-400" : "bg-amber-400"
            }`}
          ></span>
        </span>
        <span>
          {isOpen
            ? "NSE Live Session Active · 60s Reconciled Ingestion"
            : "NSE Market Closed (Mon–Fri 09:15–15:30 IST) · Ingestion Paused · Serving Replay & Baselines"}
        </span>
      </div>
      <span className="text-[11px] opacity-80 font-mono">Asia/Kolkata</span>
    </div>
  );
}
