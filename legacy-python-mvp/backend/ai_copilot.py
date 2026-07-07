"""
ITOps AI Brain - AI Copilot
------------------------------
Natural-language interface over the knowledge graph + current alerts.
This is the actual differentiator of the whole product: instead of a
sysadmin manually correlating a dependency graph and an alert list, they
just ask "why is checkout-service slow" and get a grounded answer.

Grounding matters: we build the context from the REAL graph + REAL current
alerts and pass that to Claude, so the model reasons over your actual
infrastructure rather than making things up. If you've ever seen an AI
tool confidently hallucinate a server that doesn't exist, this is the fix.

Requires an Anthropic API key. Set it as an environment variable:
    export ANTHROPIC_API_KEY=sk-ant-...
Get a key at https://console.anthropic.com

If no key is set, this falls back to a simple template answer built
directly from the graph/alerts data, so the rest of the dashboard still
works for a demo without needing a key.
"""

import os
import json

MODEL = os.environ.get("ITOPS_AI_MODEL", "claude-sonnet-5")
# ^ Check https://docs.claude.com for the current recommended model string
#   before shipping - model IDs change over time.

SYSTEM_PROMPT = """You are the AI Copilot inside "ITOps AI Brain", an internal \
IT operations platform. You answer questions from sysadmins, IT managers, \
and CIOs about their infrastructure.

Rules:
- Only use the infrastructure graph, alerts, and root-cause data given to you below.
- If something isn't in the data provided, say you don't have that information - \
never invent servers, services, or incidents that aren't in the context.
- Be concise and operational. Sysadmins want the answer, then the reasoning, \
not a long preamble.
- When relevant, mention the specific asset IDs so the answer is actionable.
"""


def _build_context(graph_visual: dict, alerts: list[dict], root_cause: list[dict]) -> str:
    return json.dumps({
        "infrastructure_graph": graph_visual,
        "current_alerts": alerts,
        "root_cause_candidates": root_cause,
    }, indent=2)


def _fallback_answer(question: str, alerts: list[dict], root_cause: list[dict]) -> str:
    """Used when no ANTHROPIC_API_KEY is set - keeps the demo functional."""
    if not alerts:
        return ("No active alerts right now, so there's nothing flagged for me to "
                "investigate. (Note: AI Copilot is running in fallback mode - set "
                "ANTHROPIC_API_KEY for full natural-language answers.)")
    top = root_cause[0] if root_cause else None
    lines = [f"[Fallback mode - set ANTHROPIC_API_KEY for full AI answers]", ""]
    lines.append(f"There are {len(alerts)} active alert(s).")
    if top:
        lines.append(
            f"Most likely root cause: {top['name']} ({top['asset_id']}), which "
            f"explains {top['explains_alert_count']} of the current alerts."
        )
    lines.append("Alerts: " + ", ".join(f"{a['asset_id']} ({a['alert_type']})" for a in alerts[:8]))
    return "\n".join(lines)


def ask(question: str, graph_visual: dict, alerts: list[dict], root_cause: list[dict]) -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return {
            "answer": _fallback_answer(question, alerts, root_cause),
            "mode": "fallback",
        }

    try:
        import anthropic
    except ImportError:
        return {
            "answer": "The 'anthropic' package isn't installed. Run: pip install anthropic",
            "mode": "error",
        }

    client = anthropic.Anthropic(api_key=api_key)
    context = _build_context(graph_visual, alerts, root_cause)

    message = client.messages.create(
        model=MODEL,
        max_tokens=1000,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Infrastructure context:\n{context}\n\nQuestion: {question}",
            }
        ],
    )

    answer_text = "".join(
        block.text for block in message.content if getattr(block, "type", None) == "text"
    )
    return {"answer": answer_text, "mode": "live"}
