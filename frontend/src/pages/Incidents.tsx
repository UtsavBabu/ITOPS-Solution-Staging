import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchIncidents } from "../api/endpoints";
import type { IncidentStatus } from "../api/types";

export default function Incidents() {
  const [filter, setFilter] = useState<IncidentStatus | "ALL">("ALL");
  const { data: incidents, isLoading } = useQuery({
    queryKey: ["incidents", filter],
    queryFn: () => fetchIncidents(filter === "ALL" ? undefined : filter),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium tracking-tight text-white">Incidents</h1>
        <div className="flex gap-2 text-sm">
          {(["ALL", "OPEN", "RESOLVED"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-full px-3 py-1.5 transition-colors ${
                filter === value ? "bg-white text-black" : "border border-white/15 text-white/60 hover:text-white"
              }`}
            >
              {value === "ALL" ? "All" : value === "OPEN" ? "Open" : "Resolved"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60">
        {isLoading ? (
          <p className="p-4 text-sm text-white/50">Loading…</p>
        ) : !incidents || incidents.length === 0 ? (
          <p className="p-4 text-sm text-white/50">No incidents found.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {incidents.map((incident) => (
              <li key={incident.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <Link to={`/monitors/${incident.monitor.id}`} className="font-medium text-white hover:underline">
                    {incident.monitor.name}
                  </Link>
                  <p className="text-white/50">
                    {incident.cause ?? "Unknown cause"} · started {new Date(incident.startedAt).toLocaleString()}
                    {incident.resolvedAt && ` · resolved ${new Date(incident.resolvedAt).toLocaleString()}`}
                  </p>
                </div>
                <span className={incident.status === "OPEN" ? "text-red-300" : "text-emerald-300"}>{incident.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
