import { ResponsiveContainer, LineChart, Line, Tooltip } from "recharts";

export default function ScoreSparkline({ points = [], symbol = "" }) {
  const hasData = points && points.length >= 2;

  // Render a flat/empty line at exact fixed dimensions if fewer than 2 points
  if (!hasData) {
    const singleScore = points && points.length === 1 ? points[0].score : null;
    return (
      <div
        className="w-[100px] h-[28px] flex items-center justify-center relative select-none"
        title={singleScore ? `Single event score: ${singleScore}` : "No recent events"}
      >
        <svg width="100" height="28" className="overflow-visible">
          <line
            x1="4"
            y1="14"
            x2="96"
            y2="14"
            stroke="#262626"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          {singleScore && (
            <circle cx="50" cy="14" r="3" fill="#32d583" />
          )}
        </svg>
      </div>
    );
  }

  return (
    <div
      className="w-[100px] h-[28px] relative select-none"
      title={`Materiality history (${points.length} events)`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, bottom: 4, left: 2, right: 2 }}>
          <Tooltip
            contentStyle={{
              backgroundColor: "#121212",
              borderColor: "#262626",
              fontSize: "10px",
              padding: "3px 6px",
              color: "#fff",
              borderRadius: "6px",
            }}
            formatter={(val) => [`Score: ${val}`, "Materiality"]}
            labelFormatter={() => symbol.replace(".NS", "")}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#32d583"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
