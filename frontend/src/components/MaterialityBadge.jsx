import { scoreToBand } from "../utils/badges";

export default function MaterialityBadge({ score }) {
  const band = scoreToBand(score);

  const colors = {
    red: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    orange: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    gray: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  };

  return (
    <div
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-mono font-bold text-xs ${colors[band]}`}
      title={`Materiality Score: ${score}/100`}
    >
      <span className="text-[10px] uppercase font-sans font-medium opacity-70">
        Score
      </span>
      <span>{score}</span>
    </div>
  );
}
