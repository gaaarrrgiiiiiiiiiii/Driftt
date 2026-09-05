import DateRangeIcon from "@mui/icons-material/DateRange";

export default function RangeToggle({ value = "today", onChange }) {
  const options = [
    { id: "today", label: "Today" },
    { id: "week", label: "Week" },
    { id: "month", label: "Month" },
  ];

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center p-1 bg-[#0d0d0d] border border-[#222222] rounded-full">
        <div className="pl-2 pr-1 text-[#666666] flex items-center">
          <DateRangeIcon sx={{ fontSize: 14 }} />
        </div>
        {options.map((opt) => {
          const isSelected = value === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                isSelected
                  ? "bg-[#1c1c1c] text-white shadow-sm border border-[#2e2e2e]"
                  : "text-[#8a8a8a] hover:text-white"
              }`}
            >
              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#32d583]" />}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
