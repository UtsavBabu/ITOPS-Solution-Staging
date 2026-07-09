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

# Metrics post is best-effort — a transient failure must not stop remediation.
curl -fsS --retry 2 --retry-delay 1 -X POST "$INGEST_URL" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" \
  -H "X-Agent-Key: $AGENT_KEY" \
  -H "Content-Type: application/json" \
  -d "$payload" || echo "metrics post failed (continuing)"

# ── Remediation runbooks (opt-in) ────────────────────────────────────────────
# Enable by exporting AGENT_ALLOW_ACTIONS=1. The agent polls for admin-approved
# actions and runs ONLY the fixed allowlist below — never arbitrary shell.
# Optionally restrict which services may be restarted with:
#   AGENT_ALLOWED_SERVICES="nginx apache2 mysql docker"
if [ "${AGENT_ALLOW_ACTIONS:-0}" = "1" ] && [ -n "${COMMANDS_URL:-}" ]; then
  run_action() {
    # $1 = action_key, $2 = arg. Echoes output; returns the action's exit code.
    case "$1" in
      ping)
        echo "pong · uptime $(awk '{printf "%dh", $1/3600}' /proc/uptime) · load$(cut -d' ' -f1-3 /proc/loadavg | sed 's/^/ /')"
        return 0 ;;
      clear_temp)
        rm -rf /tmp/kada-nigrani-* 2>/dev/null
        echo "cleared agent temp files under /tmp"
        return 0 ;;
      reload_nginx)
        if command -v nginx >/dev/null 2>&1; then nginx -t 2>&1 && nginx -s reload 2>&1; return $?; fi
        echo "nginx not installed on this host"; return 1 ;;
      reload_apache)
        if command -v apachectl >/dev/null 2>&1; then apachectl graceful 2>&1; return $?; fi
        echo "apache (apachectl) not installed on this host"; return 1 ;;
      restart_service)
        case " ${AGENT_ALLOWED_SERVICES:-} " in
          *" $2 "*) systemctl restart "$2" 2>&1 && echo "restarted service: $2"; return $? ;;
          *) echo "service '$2' is not in AGENT_ALLOWED_SERVICES — refused"; return 1 ;;
        esac ;;
      restart_docker_container)
        if command -v docker >/dev/null 2>&1; then docker restart "$2" 2>&1; return $?; fi
        echo "docker not installed on this host"; return 1 ;;
      *)
        echo "unknown action: $1"; return 1 ;;
    esac
  }

  cmds=$(curl -fsS -X POST "$COMMANDS_URL" \
    -H "Authorization: Bearer $ANON_KEY" -H "apikey: $ANON_KEY" \
    -H "X-Agent-Key: $AGENT_KEY" -H "Content-Type: application/json" \
    -d '{"action":"fetch"}' 2>/dev/null || echo '{"commands":[]}')

  echo "$cmds" | python3 -c "import sys,json;[print(c['id']+'|'+c['action_key']+'|'+(c.get('arg') or '')) for c in json.load(sys.stdin).get('commands',[])]" 2>/dev/null | \
  while IFS='|' read -r cid akey aarg; do
    [ -z "$cid" ] && continue
    out=$(run_action "$akey" "$aarg" 2>&1); code=$?
    payload=$(python3 -c "import json,sys;print(json.dumps({'action':'result','command_id':sys.argv[1],'exit_code':int(sys.argv[2]),'output':sys.argv[3]}))" "$cid" "$code" "$out")
    curl -fsS -X POST "$COMMANDS_URL" \
      -H "Authorization: Bearer $ANON_KEY" -H "apikey: $ANON_KEY" \
      -H "X-Agent-Key: $AGENT_KEY" -H "Content-Type: application/json" \
      -d "$payload" >/dev/null 2>&1
  done
fi
