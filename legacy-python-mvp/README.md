# ITOps AI Brain — Phase 1 MVP

A working prototype of the core differentiator behind "AI Operating System
for Enterprise IT": a knowledge graph of your infrastructure, rule-based
monitoring, an explainable root-cause engine, and a grounded AI copilot —
not another dashboard that just shows you red dots.

## Read this first: what this is, and isn't

The original brief described a platform on the scale of ServiceNow +
Datadog + CrowdStrike + Copilot, covering CMDB, SIEM, SOAR, Kubernetes
monitoring, zero-trust, multi-cloud cost optimization, and 500+ integrations.
That's real — it's also multiple companies' worth of engineering, built over
years by hundreds of people. Anything claiming to deliver all of that in one
build would be empty stub code pretending to be a product, which would cost
you more time later than it saves you now.

What I built instead is the one piece that's actually the hard, valuable
part to get right: **can the system understand your infrastructure well
enough to trace a cascading failure back to its root cause and explain it in
plain language?** That's the seed everything else in the original vision
(monitoring, CMDB, AI copilots, automation) gets built around. Nail this,
then expand outward.

## What it actually does (all real, all tested)

1. **Knowledge graph / CMDB** — servers, apps, databases, and their
   dependencies, modeled as a graph (`knowledge_graph.py`).
2. **Rule-based monitoring** — turns raw CPU/memory/disk/error-rate/latency
   metrics into alerts, with sustained-breach and z-score anomaly logic
   (`monitoring.py`).
3. **Root-cause analysis** — when many things alert at once, walks the
   dependency graph to find the one upstream asset that explains the most
   downstream alerts, and shows *why* (explainable, not a black box).
4. **AI copilot** — a chat interface that answers questions grounded in the
   real current graph + alerts, using the Claude API. Falls back to a
   template answer if no API key is set, so the demo still works without one.
5. **Dashboard** — dependency graph visualization (red = alerting, dark red
   = the identified root cause), alert list, root-cause ranking, and chat.

The bundled sample data simulates a realistic incident: a storage volume
fills up, and five services downstream start showing symptoms. The engine
correctly traces it back to the storage volume — not the five symptoms.

## Project structure

```
itops-ai-brain/
├── backend/
│   ├── main.py              # FastAPI server
│   ├── knowledge_graph.py   # CMDB + dependency graph + root-cause logic
│   ├── monitoring.py        # Metric ingestion + alert rules
│   ├── ai_copilot.py        # Claude-powered natural language Q&A
│   ├── requirements.txt
│   └── sample_data/
│       ├── assets.json      # Sample infrastructure (14 assets)
│       └── metrics.csv      # Sample metrics with an injected incident
└── frontend/
    └── index.html           # Single-file dashboard, no build step
```

## How to run it

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Then open `frontend/index.html` and click **"Load Sample Incident"**.

**For live AI copilot answers** (optional — fallback mode works without this):
```bash
export ANTHROPIC_API_KEY=sk-ant-...   # from https://console.anthropic.com
```
Check `https://docs.claude.com` for the current recommended model string
before shipping — it's set via `ITOPS_AI_MODEL` env var if you need to change
it from the default.

## How this maps to the original 14-section vision

| Original section | Status |
|---|---|
| Asset Inventory / CMDB | ✅ Built (`knowledge_graph.py`) |
| Infrastructure Monitoring | ✅ Built, rule-based (`monitoring.py`) |
| Predictive Failure Detection | ⚠️ Partial — current version detects, doesn't yet *predict* ahead of the breach. Real prediction needs weeks of historical data, which you won't have until you're running this for real. |
| Root Cause Analysis | ✅ Built, explainable heuristic |
| AI Copilot for Sysadmins | ✅ Built (Claude-powered, graph-grounded) |
| AI Documentation Engine / Knowledge Graph | ✅ Graph built; auto-generated docs from it is a natural next step |
| Automated Incident Response / Self-Healing | ❌ Not built — this is genuinely dangerous to fake. Auto-remediation needs extensive guardrails and should come after months of trusted alerting, not in an MVP. |
| SIEM / SOAR / Threat Intelligence | ❌ Not built — different domain (security operations), different data sources, different buyer. Worth treating as a separate product line once this one has traction. |
| Identity & Access Governance, Zero Trust | ❌ Not built — this is its own deep product area (see Okta, Entra) |
| Kubernetes / Multi-cloud / Cloud Cost | ❌ Not built — real versions of these need live cloud API integrations, not CSV uploads |
| 500+ integrations | ❌ Not built — start with 1 real integration (e.g. pull real metrics from Prometheus or Zabbix via their APIs instead of CSV upload) and prove it end-to-end before promising 500 |
| Executive Dashboard, CIO/CEO views | ❌ Not built — straightforward to add once there's real data flowing, low priority before that |

## Realistic next steps, in order

1. **Replace CSV upload with a real metrics source.** Pick one: Prometheus,
   Zabbix, or even a simple Python agent using `psutil` on a real server you
   control. This is the single highest-value next step — it proves the
   pipeline works on real data, not synthetic demos.
2. **Persistence.** Add Postgres so alerts, incidents, and root-cause
   history survive a restart and can be reviewed later.
3. **Auth.** Before this touches anyone else's infrastructure, add login.
4. **One real integration end-to-end**, done well, beats five fake ones.
   Pick the one your first pilot customer actually uses.
5. Everything else in the 14-section vision is a legitimate *later phase* —
   treat this repo as Phase 1 of that roadmap, not a shortcut around it.

## Honest limitations

- No database — state resets when the server restarts.
- No authentication.
- Predictive failure detection is not implemented (only detection after
  a threshold is already breached).
- The AI copilot needs your own Anthropic API key for live answers.
- Root-cause logic is a heuristic on the dependency graph, not ML — that's
  intentional for explainability, but it means it only works as well as
  the dependency graph you feed it. Garbage graph in, garbage root cause out.
