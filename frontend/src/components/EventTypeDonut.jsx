import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import PieChartIcon from "@mui/icons-material/PieChart";

const TYPE_COLORS = {
  price_spike: "#32d583",
  price_drop: "#f04438",
  volume_spike: "#6172f3",
  thesis_crossed: "#f79009",
  source_conflict: "#9e77ed",
  spread_widened: "#06aed4",
  monitoring: "#667085",
};

const TYPE_LABELS = {
  price_spike: "Price Spike",
  price_drop: "Price Drop",
  volume_spike: "Volume Spike",
  thesis_crossed: "Thesis Breach",
  source_conflict: "Data Disagreement",
  spread_widened: "Spread Divergence",
  monitoring: "Monitoring",
};

export default function EventTypeDonut({ data = [], range = "today" }) {
  const totalCount = data.reduce((acc, curr) => acc + (curr.count || 0), 0);
  const chartData = data.filter((d) => (d.count || 0) > 0);

  return (
    <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-5 flex flex-col justify-between h-full min-h-[220px]">
      <div className="flex items-center justify-between text-[#8a8a8a] mb-2">
        <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
          Event Distribution ({range})
        </span>
        <PieChartIcon sx={{ fontSize: 16, color: "#8a8a8a" }} />
      </div>

      <div className="h-32 w-full flex items-center justify-center">
        {totalCount > 0 && chartData.length > 0 ? (
          <div className="flex items-center w-full h-full">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#121212",
                      borderColor: "#262626",
                      fontSize: "11px",
                      color: "#fff",
                      borderRadius: "8px",
                    }}
                    formatter={(val, name) => [`${val} events`, TYPE_LABELS[name] || name]}
                  />
                  <Pie
                    data={chartData}
                    dataKey="count"
                    nameKey="event_type"
                    innerRadius={28}
                    outerRadius={45}
                    paddingAngle={3}
                    stroke="#0d0d0d"
                    strokeWidth={2}
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.event_type}
                        fill={TYPE_COLORS[entry.event_type] || "#717680"}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 flex flex-col justify-center space-y-1 pl-2 overflow-hidden">
              {chartData.slice(0, 3).map((item) => (
                <div key={item.event_type} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: TYPE_COLORS[item.event_type] || "#717680" }}
                    />
                    <span className="text-[#a0a0a0] truncate font-medium">
                      {TYPE_LABELS[item.event_type] || item.event_type}
                    </span>
                  </div>
                  <span className="font-mono text-white text-[11px] font-semibold ml-1">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 flex flex-col items-center justify-center">
            <span className="text-xs font-mono text-[#666666] block">
              No events in this range
            </span>
            <span className="text-[10px] text-[#444444] mt-1">
              {totalCount === 0 ? "Zero anomalies detected" : ""}
            </span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-[#181818] flex items-center justify-between text-[11px] text-[#8a8a8a]">
        <span>Total Analyzed</span>
        <span className="font-mono text-white font-semibold">{totalCount}</span>
      </div>
    </div>
  );
}
