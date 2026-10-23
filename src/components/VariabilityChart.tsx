import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VariabilityEvaluation } from "../engine/variability";

const YEAR_COLORS = ["#284e3c", "#956422", "#5965a1"];
export default function VariabilityChart({
  evaluation,
}: {
  evaluation: VariabilityEvaluation;
}) {
  const rows = evaluation.capacitiesL.map((capacity, i) => ({
    capacity,
    ...Object.fromEntries(
      evaluation.annual.map((year) => [year.key, year.candidates[i].supplyL]),
    ),
  }));
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <LineChart
        data={rows}
        margin={{ top: 12, right: 18, bottom: 22, left: 0 }}
        accessibilityLayer
      >
        <CartesianGrid
          vertical={false}
          stroke="#e5eade"
          strokeDasharray="3 5"
        />
        <XAxis
          dataKey="capacity"
          type="number"
          domain={[0, "dataMax"]}
          tick={{ fontSize: 10 }}
          tickFormatter={(n: number) =>
            n >= 1000 ? `${n / 1000}k` : String(n)
          }
          label={{
            value: "Standard tank capacity (L)",
            position: "insideBottom",
            offset: -14,
            fontSize: 10,
          }}
        />
        <YAxis
          width={55}
          tick={{ fontSize: 10 }}
          tickFormatter={(n: number) =>
            new Intl.NumberFormat("en", { notation: "compact" }).format(n)
          }
        />
        <Tooltip
          formatter={(value) => [
            `${Number(value).toLocaleString("en-GB", { maximumFractionDigits: 2 })} L`,
            "Annual supplied",
          ]}
          labelFormatter={(v) => `Tank: ${Number(v).toLocaleString("en-GB")} L`}
        />
        {evaluation.annual.map((year, i) => (
          <Line
            key={year.key}
            dataKey={year.key}
            name={year.key}
            type="linear"
            stroke={YEAR_COLORS[i]}
            strokeWidth={2.5}
            strokeDasharray={i === 1 ? "7 4" : i === 2 ? "2 4" : undefined}
            dot={{ r: 2 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
