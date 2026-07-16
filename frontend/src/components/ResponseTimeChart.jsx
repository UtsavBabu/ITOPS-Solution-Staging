import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "../context/ThemeContext";
export function ResponseTimeChart({
  history
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const data = [...history].reverse().map(entry => ({
    time: new Date(entry.checkedAt).toLocaleTimeString(),
    responseTimeMs: entry.responseTimeMs ?? 0,
    status: entry.status
  }));
  if (data.length === 0) {
    return <p className="text-sm text-white/50 light:text-slate-500">No check history yet.</p>;
  }
  const tickFill = isLight ? "rgba(15,23,42,0.55)" : "rgba(255,255,255,0.5)";
  const axisStroke = isLight ? "rgba(15,23,42,0.15)" : "rgba(255,255,255,0.15)";
  return <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <XAxis dataKey="time" tick={{
        fontSize: 11,
        fill: tickFill
      }} minTickGap={30} stroke={axisStroke} />
        <YAxis tick={{
        fontSize: 11,
        fill: tickFill
      }} unit="ms" width={60} stroke={axisStroke} />
        <Tooltip contentStyle={{
        background: isLight ? "#ffffff" : "#171717",
        border: isLight ? "1px solid rgba(15,23,42,0.1)" : "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        color: isLight ? "#0f172a" : "#fff"
      }} />
        <Line type="monotone" dataKey="responseTimeMs" stroke={isLight ? "#0f172a" : "#ffffff"} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>;
}