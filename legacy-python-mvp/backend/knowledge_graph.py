"""
ITOps AI Brain - Knowledge Graph
----------------------------------
This is the "CMDB" (Configuration Management Database) and dependency graph
in one. Every server, application, database, and service is a node. Every
"depends_on" relationship is an edge.

This graph is the foundation everything else builds on:
- Alerts get attached to nodes
- Root-cause analysis walks the graph
- The AI copilot uses the graph as grounded context so it doesn't hallucinate
  about infrastructure that doesn't exist

Upgrade path: replace the in-memory NetworkX graph with a real graph database
(Neo4j is the standard choice) once you have more than a few thousand assets
or need to persist across restarts.
"""

import networkx as nx


class KnowledgeGraph:
    def __init__(self):
        self.graph = nx.DiGraph()

    def load_assets(self, assets: list[dict]):
        """assets: list of {id, name, type, depends_on: [ids], metadata: {...}}"""
        self.graph.clear()
        for asset in assets:
            self.graph.add_node(
                asset["id"],
                name=asset.get("name", asset["id"]),
                type=asset.get("type", "unknown"),
                metadata=asset.get("metadata", {}),
            )
        for asset in assets:
            for dep_id in asset.get("depends_on", []):
                if dep_id in self.graph:
                    # edge direction: asset -> depends_on -> dep_id
                    self.graph.add_edge(asset["id"], dep_id, relation="depends_on")

    def get_dependencies(self, asset_id: str) -> list[str]:
        """What does this asset depend on (its ancestors upstream)?"""
        if asset_id not in self.graph:
            return []
        return list(self.graph.successors(asset_id))

    def get_dependents(self, asset_id: str) -> list[str]:
        """What depends on this asset (downstream, i.e. what breaks if this dies)?"""
        if asset_id not in self.graph:
            return []
        return list(self.graph.predecessors(asset_id))

    def get_all_upstream(self, asset_id: str) -> set[str]:
        """Every asset this one transitively depends on."""
        if asset_id not in self.graph:
            return set()
        return nx.descendants(self.graph, asset_id)

    def to_visual(self) -> dict:
        """Node/edge format for the frontend graph visualization."""
        nodes = [
            {
                "id": n,
                "label": data.get("name", n),
                "type": data.get("type", "unknown"),
            }
            for n, data in self.graph.nodes(data=True)
        ]
        edges = [{"from": u, "to": v} for u, v in self.graph.edges()]
        return {"nodes": nodes, "edges": edges}

    def suggest_root_cause(self, alerting_asset_ids: list[str]) -> list[dict]:
        """
        Core root-cause heuristic: for each alerting asset, look at everything
        it transitively depends on. Count how many *other* alerting assets
        share each upstream dependency. The upstream asset that explains the
        most simultaneous alerts - and is itself alerting - is the most
        likely root cause.

        This is a simple, explainable heuristic (not ML) on purpose: a
        compliance/ops team needs to be able to see WHY a candidate was
        suggested, same principle as the fraud detection rules.
        """
        alerting_set = set(alerting_asset_ids)
        if not alerting_set:
            return []

        impact_count: dict[str, int] = {}
        for asset_id in alerting_set:
            upstream = self.get_all_upstream(asset_id)
            for u in upstream:
                impact_count[u] = impact_count.get(u, 0) + 1

        candidates = []
        for node_id, count in impact_count.items():
            node_data = self.graph.nodes.get(node_id, {})
            candidates.append({
                "asset_id": node_id,
                "name": node_data.get("name", node_id),
                "type": node_data.get("type", "unknown"),
                "explains_alert_count": count,
                "is_itself_alerting": node_id in alerting_set,
            })

        # Rank: prefer nodes that are themselves alerting AND explain the most
        # downstream alerts. This surfaces "the database is down and that's
        # why 4 other services are alerting" instead of just listing all 5.
        candidates.sort(
            key=lambda c: (c["is_itself_alerting"], c["explains_alert_count"]),
            reverse=True,
        )
        return candidates[:5]
