import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ImpactView } from "../engine/impactEvidence";

export default function ImpactEvidenceChart({ view }: { view: ImpactView }) {
  const data = view.periods.map((p) => ({
    period: p.key,
    baseline: p.baseline.deliveredL,
    current: p.current.deliveredL,
    recommended: p.recommended?.deliveredL ?? null,
    selected: p.selected.deliveredL,
  }));
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <BarChart
        data={data}
        accessibilityLayer
        margin={{ top: 12, right: 12, bottom: 7, left: 0 }}
      >
        <CartesianGrid
          vertical={false}
          stroke="#e5eade"
          strokeDasharray="3 5"
        />
        <XAxis dataKey="period" tick={{ fontSize: 10 }} />
        <YAxis
          width={55}
          tick={{ fontSize: 10 }}
          tickFormatter={(n: number) =>
            n.toLocaleString("en", { notation: "compact" })
          }
        />
        <Tooltip
          formatter={(value, name) => [
            `${Number(value).toLocaleString("en-GB", { maximumFractionDigits: 2 })} L`,
            name,
          ]}
        />
        <Bar
          dataKey="baseline"
          name="No harvesting"
          fill="#74826b"
          isAnimationActive={false}
        />
        <Bar
          dataKey="current"
          name="Current tank"
          fill="#b57948"
          isAnimationActive={false}
          radius={[3, 3, 0, 0]}
        />
        <Bar
          dataKey="recommended"
          name="Recommended tested"
          fill="#5965a1"
          isAnimationActive={false}
          radius={[3, 3, 0, 0]}
        />
        <Bar
          dataKey="selected"
          name="Selected alternative"
          fill="#284e3c"
          isAnimationActive={false}
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
