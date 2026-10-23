import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyResult } from "../engine/simulation";

const format = (value: number, decimals = 0) =>
  new Intl.NumberFormat("en-GB", { maximumFractionDigits: decimals }).format(
    value,
  );

export default function WaterChart({
  days,
  capacity,
  mode,
}: {
  days: DailyResult[];
  capacity: number;
  mode: "storage" | "balance";
}) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <ComposedChart
        data={days}
        margin={{ top: 12, right: 12, left: -18, bottom: 0 }}
        accessibilityLayer
      >
        <defs>
          <linearGradient id="storage-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6f9b82" stopOpacity={0.38} />
            <stop offset="100%" stopColor="#6f9b82" stopOpacity={0.025} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 5"
          vertical={false}
          stroke="#e8ebe4"
        />
        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: "#626f57" }}
          ticks={[1, 5, 10, 15, 20, 25, 30]}
          tickFormatter={(v) => `D${v}`}
          dy={8}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: "#626f57" }}
          tickFormatter={(v) =>
            v >= 1000 ? `${format(v / 1000, 1)}k` : String(v)
          }
          domain={[0, mode === "storage" ? Math.max(1, capacity) : "auto"]}
        />
        <Tooltip
          contentStyle={{
            border: "1px solid #e2e7dc",
            borderRadius: 10,
            fontSize: 12,
            boxShadow: "0 5px 20px #243e3110",
          }}
          labelFormatter={(v) => `Simulated day ${v}`}
          formatter={(v, name) => [`${format(Number(v), 2)} L`, name]}
        />
        <Legend
          iconType="circle"
          iconSize={7}
          wrapperStyle={{ fontSize: 11, paddingTop: 22 }}
          formatter={(value) => (
            <span style={{ color: "#626f57" }}>{value}</span>
          )}
        />
        {mode === "storage" ? (
          <>
            <ReferenceLine
              y={capacity}
              stroke="#a6ae9e"
              strokeDasharray="5 5"
            />
            <Bar
              dataKey="usedL"
              isAnimationActive={false}
              name="Rainwater used"
              fill="#cbd9b9"
              radius={[2, 2, 0, 0]}
              maxBarSize={13}
            />
            <Area
              type="linear"
              dataKey="remainingStorageL"
              name="End-of-day storage"
              stroke="#4f7e63"
              strokeWidth={2.5}
              fill="url(#storage-gradient)"
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          </>
        ) : (
          <>
            <Bar
              dataKey="incomingL"
              isAnimationActive={false}
              name="Incoming"
              fill="#a4b994"
              maxBarSize={9}
            />
            <Bar
              dataKey="usedL"
              name="Used"
              fill="#3e6c52"
              maxBarSize={9}
              isAnimationActive={false}
            />
            <Bar
              dataKey="overflowL"
              isAnimationActive={false}
              name="Overflow"
              fill="#ce916e"
              maxBarSize={9}
            />
            <Bar
              dataKey="unmetDemandL"
              isAnimationActive={false}
              name="Unmet demand"
              fill="#c6c4b9"
              maxBarSize={9}
            />
          </>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
