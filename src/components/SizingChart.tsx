import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TankCandidate } from "../engine/tankSizing";

const volume = (value: number) =>
  new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(value);
const axis = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

export default function SizingChart({
  candidates,
  current,
  recommended,
  targetSupplyL,
}: {
  candidates: readonly TankCandidate[];
  current: TankCandidate;
  recommended: TankCandidate | null;
  targetSupplyL: number;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <ComposedChart
        data={candidates}
        margin={{ top: 13, right: 17, bottom: 16, left: -9 }}
        accessibilityLayer
      >
        <CartesianGrid
          vertical={false}
          stroke="#e5eade"
          strokeDasharray="3 5"
        />
        <XAxis
          dataKey="capacityL"
          type="number"
          domain={[0, "dataMax"]}
          tickCount={5}
          tickFormatter={axis}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: "#626f57" }}
          label={{
            value: "TANK CAPACITY (L)",
            position: "insideBottom",
            offset: -13,
            fontSize: 9,
            fill: "#626f57",
          }}
        />
        <YAxis
          domain={[0, "auto"]}
          tickFormatter={axis}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: "#626f57" }}
        />
        <Tooltip
          contentStyle={{
            fontSize: 11,
            borderRadius: 8,
            border: "1px solid #dce5d0",
          }}
          labelFormatter={(value) =>
            `${volume(Number(value))} L tank${Number(value) === current.capacityL ? " · current" : ""}${Number(value) === recommended?.capacityL ? " · recommended" : ""}`
          }
          formatter={(value) => [
            `${volume(Number(value))} L`,
            "Modeled supply",
          ]}
        />
        {recommended && (
          <ReferenceLine
            y={targetSupplyL}
            stroke="#8c9e73"
            strokeDasharray="5 4"
          />
        )}
        <Line
          type="linear"
          dataKey="supplyL"
          name="Modeled supply"
          stroke="#537a48"
          strokeWidth={2.2}
          dot={{ r: 3, fill: "#fff", strokeWidth: 1.5 }}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
        <ReferenceDot
          x={current.capacityL}
          y={current.supplyL}
          r={7}
          fill="#fff"
          stroke="#a5683c"
          strokeWidth={2.5}
        />
        {recommended && (
          <ReferenceDot
            x={recommended.capacityL}
            y={recommended.supplyL}
            r={4}
            fill="#365e47"
            stroke="#fff"
            strokeWidth={1}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
