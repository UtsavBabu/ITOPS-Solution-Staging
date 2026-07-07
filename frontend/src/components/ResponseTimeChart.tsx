import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CheckResult } from "../api/types";

export function ResponseTimeChart({ history }: { history: CheckResult[] }) {
  const data = [...history]
    .reverse()
    .map((entry) => ({
      time: new Date(entry.checkedAt).toLocaleTimeString(),
      responseTimeMs: entry.responseTimeMs ?? 0,
      status: entry.status,
    }));

  if (data.length === 0) {
    return <p className="text-sm text-white/50">No check history yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <XAxis dataKey="time" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }} minTickGap={30} stroke="rgba(255,255,255,0.15)" />
        <YAxis tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }} unit="ms" width={60} stroke="rgba(255,255,255,0.15)" />
        <Tooltip contentStyle={{ background: "#171717", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }} />
        <Line type="monotone" dataKey="responseTimeMs" stroke="#ffffff" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
