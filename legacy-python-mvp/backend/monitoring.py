"""
ITOps AI Brain - Monitoring & Alerting
------------------------------------------
Turns raw metric time series into alerts. Rule-based for the same reason as
the fraud detection engine: explainable and auditable beats a black box,
especially when a sysadmin is trying to trust the system at 2am.

Expected metrics CSV columns:
    asset_id, timestamp, metric, value

Supported metric names: cpu_percent, memory_percent, disk_percent,
error_rate_percent, response_time_ms, status (0 = down, 1 = up)

Upgrade path: once you have months of real data, add a statistical/ML layer
(e.g. seasonal baseline + anomaly scoring) on TOP of these thresholds rather
than replacing them - same principle as the fraud engine's upgrade path.
"""

import pandas as pd
import numpy as np

THRESHOLDS = {
    "cpu_percent": 90,
    "memory_percent": 90,
    "disk_percent": 90,
    "error_rate_percent": 5,
}
LATENCY_ZSCORE_THRESHOLD = 3.0
SUSTAINED_BREACH_COUNT = 2  # how many breaching points in a row count as "sustained"


def _normalize(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [c.strip().lower() for c in df.columns]
    required = ["asset_id", "timestamp", "metric", "value"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    df["metric"] = df["metric"].str.lower().str.strip()
    return df.dropna(subset=["value"]).sort_values("timestamp")


def detect_alerts(df: pd.DataFrame) -> list[dict]:
    df = _normalize(df)
    alerts = []

    # --- Threshold breaches (CPU / memory / disk / error rate) ---
    for metric, threshold in THRESHOLDS.items():
        metric_df = df[df["metric"] == metric]
        for asset_id, group in metric_df.groupby("asset_id"):
            group = group.sort_values("timestamp")
            breaching = group[group["value"] >= threshold]
            if len(breaching) >= SUSTAINED_BREACH_COUNT:
                latest = breaching.iloc[-1]
                severity = "critical" if latest["value"] >= threshold + 5 else "warning"
                alerts.append({
                    "asset_id": asset_id,
                    "metric": metric,
                    "alert_type": "threshold_breach",
                    "value": float(latest["value"]),
                    "threshold": threshold,
                    "severity": severity,
                    "timestamp": latest["timestamp"].isoformat(),
                    "message": f"{metric.replace('_', ' ')} sustained above {threshold}% (latest: {latest['value']:.1f}%)",
                })

    # --- Down status ---
    status_df = df[df["metric"] == "status"]
    for asset_id, group in status_df.groupby("asset_id"):
        latest = group.sort_values("timestamp").iloc[-1]
        if latest["value"] == 0:
            alerts.append({
                "asset_id": asset_id,
                "metric": "status",
                "alert_type": "down",
                "value": 0.0,
                "threshold": 1.0,
                "severity": "critical",
                "timestamp": latest["timestamp"].isoformat(),
                "message": "Asset is reporting DOWN",
            })

    # --- Latency spikes (z-score against the asset's own baseline) ---
    latency_df = df[df["metric"] == "response_time_ms"]
    for asset_id, group in latency_df.groupby("asset_id"):
        if len(group) < 4:
            continue
        mean, std = group["value"].mean(), group["value"].std()
        if std == 0 or np.isnan(std):
            continue
        group = group.copy()
        group["z"] = (group["value"] - mean) / std
        spikes = group[group["z"] >= LATENCY_ZSCORE_THRESHOLD]
        if len(spikes) > 0:
            latest = spikes.sort_values("timestamp").iloc[-1]
            alerts.append({
                "asset_id": asset_id,
                "metric": "response_time_ms",
                "alert_type": "latency_spike",
                "value": float(latest["value"]),
                "threshold": float(mean + LATENCY_ZSCORE_THRESHOLD * std),
                "severity": "warning",
                "timestamp": latest["timestamp"].isoformat(),
                "message": f"Response time spiked to {latest['value']:.0f}ms (baseline ~{mean:.0f}ms)",
            })

    alerts.sort(key=lambda a: (a["severity"] != "critical", a["timestamp"]))
    return alerts
