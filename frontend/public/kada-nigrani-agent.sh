#!/usr/bin/env bash
# Kada Nigrani host agent — reports CPU / memory / disk / load / uptime to
# ITOps Monitor. Real metrics from /proc + coreutils, no dependencies beyond
# bash + curl. Run once to test, or on a schedule via cron/systemd.
#
#   INGEST_URL   full URL of the ingest-metrics edge function
#   ANON_KEY     project anon key (public; satisfies the platform JWT gate)
#   AGENT_KEY    this host's ingest key (from the Hosts page — keep secret)
#
# Example cron (every minute):
#   * * * * * INGEST_URL=... ANON_KEY=... AGENT_KEY=... /opt/kada-nigrani-agent.sh >/dev/null 2>&1
set -euo pipefail

AGENT_VERSION="1.0.0"
: "${INGEST_URL:?INGEST_URL is required}"
: "${ANON_KEY:?ANON_KEY is required}"
: "${AGENT_KEY:?AGENT_KEY is required}"

# --- CPU % over a 1s sample of /proc/stat -----------------------------------
read -r _ u1 n1 s1 i1 w1 irq1 sirq1 rest < /proc/stat
idle1=$((i1 + w1)); total1=$((u1 + n1 + s1 + i1 + w1 + irq1 + sirq1))
sleep 1
read -r _ u2 n2 s2 i2 w2 irq2 sirq2 rest < /proc/stat
idle2=$((i2 + w2)); total2=$((u2 + n2 + s2 + i2 + w2 + irq2 + sirq2))
dtotal=$((total2 - total1)); didle=$((idle2 - idle1))
if [ "$dtotal" -gt 0 ]; then
  cpu_percent=$(awk "BEGIN { printf \"%.1f\", (($dtotal - $didle) / $dtotal) * 100 }")
else
  cpu_percent=0
fi

# --- Memory (from /proc/meminfo, in kB) -------------------------------------
mem_total_kb=$(awk '/^MemTotal:/{print $2}' /proc/meminfo)
mem_avail_kb=$(awk '/^MemAvailable:/{print $2}' /proc/meminfo)
mem_used_kb=$((mem_total_kb - mem_avail_kb))
mem_total_mb=$(awk "BEGIN { printf \"%.1f\", $mem_total_kb / 1024 }")
mem_used_mb=$(awk "BEGIN { printf \"%.1f\", $mem_used_kb / 1024 }")
mem_percent=$(awk "BEGIN { printf \"%.1f\", ($mem_used_kb / $mem_total_kb) * 100 }")

# --- Disk usage of the root filesystem --------------------------------------
disk_line=$(df -kP / | awk 'NR==2')
disk_used_kb=$(echo "$disk_line" | awk '{print $3}')
disk_total_kb=$(echo "$disk_line" | awk '{print $2}')
disk_percent=$(echo "$disk_line" | awk '{gsub(/%/,"",$5); print $5}')
disk_used_gb=$(awk "BEGIN { printf \"%.2f\", $disk_used_kb / 1048576 }")
disk_total_gb=$(awk "BEGIN { printf \"%.2f\", $disk_total_kb / 1048576 }")

# --- Load average + uptime + process count ----------------------------------
read -r load1 load5 load15 _rest < /proc/loadavg
uptime_seconds=$(awk '{printf "%d", $1}' /proc/uptime)
process_count=$(ls -d /proc/[0-9]* 2>/dev/null | wc -l)

hostname_val=$(hostname 2>/dev/null || echo "unknown")
os_val=$( { . /etc/os-release 2>/dev/null && echo "${PRETTY_NAME:-Linux}"; } || echo "Linux" )

payload=$(cat <<JSON
{
  "hostname": "$hostname_val",
  "os": "$os_val",
  "agent_version": "$AGENT_VERSION",
  "cpu_percent": $cpu_percent,
  "mem_percent": $mem_percent,
  "mem_used_mb": $mem_used_mb,
  "mem_total_mb": $mem_total_mb,
  "disk_percent": $disk_percent,
  "disk_used_gb": $disk_used_gb,
  "disk_total_gb": $disk_total_gb,
  "uptime_seconds": $uptime_seconds,
  "load1": $load1,
  "load5": $load5,
  "load15": $load15,
  "process_count": $process_count
}
JSON
)

curl -fsS -X POST "$INGEST_URL" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" \
  -H "X-Agent-Key: $AGENT_KEY" \
  -H "Content-Type: application/json" \
  -d "$payload"
