import React from "react";
import TuneIcon from "@mui/icons-material/Tune";

export default function SensitivityKnob({ value, onChange }) {
  const options = [
    {
      id: "calm",
      label: "Calm",
      threshold: "≥ 60",
      desc: "High materiality only",
    },
    {
      id: "balanced",
      label: "Balanced",
      threshold: "≥ 35",
      desc: "Default signal",
    },
    {
      id: "chattery",
      label: "Chattery",
      threshold: "≥ 15",
      desc: "All notable moves",
    },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-[#181818] mb-4">
      <div className="flex items-center gap-2">
        <TuneIcon sx={{ fontSize: 15, color: "#8a8a8a" }} />
        <span className="text-xs uppercase font-mono tracking-wider text-[#8a8a8a] font-semibold">
          Noise Filter
        </span>
      </div>

      {/* Segmented Pill Switcher (Fitonist Reference Style) */}
      <div className="flex items-center p-1 bg-[#0d0d0d] border border-[#222222] rounded-full">
        {options.map((opt) => {
          const isSelected = value === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-medium transition-all ${
                isSelected
                  ? "bg-[#1c1c1c] text-white shadow-sm border border-[#2e2e2e]"
                  : "text-[#8a8a8a] hover:text-white"
              }`}
              title={`${opt.label} (${opt.threshold}): ${opt.desc}`}
            >
              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#32d583]" />}
              <span>{opt.label}</span>
              <span className="text-[10px] font-mono text-[#666666]">
                {opt.threshold}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
