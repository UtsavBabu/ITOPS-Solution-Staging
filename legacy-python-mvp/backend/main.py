"""
ITOps AI Brain - API server
Run with: uvicorn main:app --reload --port 8000
"""

import io
import json
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from knowledge_graph import KnowledgeGraph
from monitoring import detect_alerts
import ai_copilot

app = FastAPI(title="ITOps AI Brain API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# In-memory state for the MVP - swap for a real database before production use.
STATE = {"graph": KnowledgeGraph(), "alerts": [], "assets_loaded": False}


class AskRequest(BaseModel):
    question: str


def _load_sample():
    with open("sample_data/assets.json") as f:
        assets = json.load(f)
    STATE["graph"].load_assets(assets)
    metrics_df = pd.read_csv("sample_data/metrics.csv")
    STATE["alerts"] = detect_alerts(metrics_df)
    STATE["assets_loaded"] = True


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "itops-ai-brain"}


@app.post("/api/sample")
def load_sample():
    _load_sample()
    return _current_state_response()


@app.post("/api/assets/upload")
async def upload_assets(file: UploadFile = File(...)):
    contents = await file.read()
    try:
        assets = json.loads(contents)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid assets JSON: {e}")
    STATE["graph"].load_assets(assets)
    STATE["assets_loaded"] = True
    return _current_state_response()


@app.post("/api/metrics/upload")
async def upload_metrics(file: UploadFile = File(...)):
    if not STATE["assets_loaded"]:
        raise HTTPException(status_code=400, detail="Upload assets first so alerts can map to the graph")
    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
        STATE["alerts"] = detect_alerts(df)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _current_state_response()


@app.get("/api/state")
def get_state():
    return _current_state_response()


@app.post("/api/copilot/ask")
def ask_copilot(req: AskRequest):
    graph_visual = STATE["graph"].to_visual()
    alerts = STATE["alerts"]
    alerting_ids = list({a["asset_id"] for a in alerts})
    root_cause = STATE["graph"].suggest_root_cause(alerting_ids)
    result = ai_copilot.ask(req.question, graph_visual, alerts, root_cause)
    return result


def _current_state_response():
    graph_visual = STATE["graph"].to_visual()
    alerts = STATE["alerts"]
    alerting_ids = list({a["asset_id"] for a in alerts})
    root_cause = STATE["graph"].suggest_root_cause(alerting_ids)
    return {
        "graph": graph_visual,
        "alerts": alerts,
        "root_cause": root_cause,
        "summary": {
            "total_assets": len(graph_visual["nodes"]),
            "total_alerts": len(alerts),
            "critical_alerts": len([a for a in alerts if a["severity"] == "critical"]),
        },
    }
