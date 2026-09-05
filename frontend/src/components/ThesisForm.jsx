import { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";

export default function ThesisForm({ onAdd, onCancel }) {
  const [symbol, setSymbol] = useState("");
  const [thesisType, setThesisType] = useState("price_level");
  const [thesisValue, setThesisValue] = useState("");
  const [thesisEntry, setThesisEntry] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!symbol.trim()) return;
    setSubmitting(true);
    try {
      await onAdd(
        symbol.trim().toUpperCase(),
        thesisType,
        thesisValue ? parseFloat(thesisValue) : null,
        thesisEntry ? parseFloat(thesisEntry) : null
      );
      setSymbol("");
      setThesisValue("");
      setThesisEntry("");
      if (onCancel) onCancel();
    } catch (err) {
      alert(err.message || "Failed to add stock");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6 mb-8 space-y-4 shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-3">
        <div className="flex items-center gap-2">
          <AddIcon sx={{ fontSize: 16, color: "#32d583" }} />
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
            Add Stock & Watch Hypothesis
          </h3>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-[#8a8a8a] hover:text-white rounded-lg hover:bg-[#1a1a1a] transition"
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-mono text-[#8a8a8a] uppercase block mb-1.5 font-semibold">
            Ticker Symbol (NSE / Yahoo)
          </label>
          <input
            type="text"
            required
            placeholder="e.g. RELIANCE.NS, TCS.NS"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full bg-[#121212] border border-[#222222] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-[#32d583]"
          />
        </div>

        <div>
          <label className="text-[11px] font-mono text-[#8a8a8a] uppercase block mb-1.5 font-semibold">
            Hypothesis Trigger Type
          </label>
          <select
            value={thesisType}
            onChange={(e) => setThesisType(e.target.value)}
            className="w-full bg-[#121212] border border-[#222222] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#32d583]"
          >
            <option value="price_level">Specific Price Level Breach (Score ≥90)</option>
            <option value="pct_move">Percentage Move from Entry</option>
            <option value="monitoring">Passive Statistical Monitoring</option>
          </select>
        </div>
      </div>

      {thesisType === "price_level" && (
        <div>
          <label className="text-[11px] font-mono text-[#8a8a8a] uppercase block mb-1.5 font-semibold">
            Target Price Level (₹)
          </label>
          <input
            type="number"
            step="any"
            required
            placeholder="e.g. 1400.00"
            value={thesisValue}
            onChange={(e) => setThesisValue(e.target.value)}
            className="w-full bg-[#121212] border border-[#222222] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-[#32d583]"
          />
          <span className="text-[11px] text-[#666666] mt-1.5 block">
            Breaching this level floors materiality at ≥90 for immediate notification.
          </span>
        </div>
      )}

      {thesisType === "pct_move" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-mono text-[#8a8a8a] uppercase block mb-1.5 font-semibold">
              Entry Price (₹)
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="e.g. 920.00"
              value={thesisEntry}
              onChange={(e) => setThesisEntry(e.target.value)}
              className="w-full bg-[#121212] border border-[#222222] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-[#32d583]"
            />
          </div>
          <div>
            <label className="text-[11px] font-mono text-[#8a8a8a] uppercase block mb-1.5 font-semibold">
              Target Delta (+/- %)
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="e.g. 5.0 or -3.0"
              value={thesisValue}
              onChange={(e) => setThesisValue(e.target.value)}
              className="w-full bg-[#121212] border border-[#222222] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-[#32d583]"
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-[#32d583] hover:bg-[#28b86e] text-black font-bold py-2.5 rounded-xl text-xs transition shadow disabled:opacity-50"
      >
        {submitting ? "Calibrating Baselines..." : "Add to Watchlist"}
      </button>
    </form>
  );
}
