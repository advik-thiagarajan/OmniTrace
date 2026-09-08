import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app


@pytest.mark.asyncio
async def test_api_health_and_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health check
        res = await client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "HEALTHY"
        assert data["service"] == "OmniTrace"

        # 2. Analyze repository
        res = await client.post(
            "/api/v1/repos/analyze",
            json={"repo_path": "backend", "repo_name": "OmniTrace-Test"},
        )
        assert res.status_code == 200
        analyze_data = res.json()
        assert analyze_data["status"] == "SUCCESS"
        assert analyze_data["files_scanned"] > 0

        # 3. Get graph
        res = await client.get("/api/v1/repos/graph")
        assert res.status_code == 200
        graph_data = res.json()
        assert graph_data["total_nodes"] > 0
        assert len(graph_data["nodes"]) > 0

        # 4. Get repo stats
        res = await client.get("/api/v1/repos/stats")
        assert res.status_code == 200
        stats_data = res.json()
        assert stats_data["total_files"] > 0

        # 5. AI status
        res = await client.get("/api/v1/ai/status")
        assert res.status_code == 200

        # 6. Diff summarizer
        res = await client.post(
            "/api/v1/ai/summarize-diff",
            json={
                "file_path": "backend/app/auth.py",
                "diff_content": "+ def verify_jwt(token: str) -> bool:\n+     return True",
            },
        )
        assert res.status_code == 200
        diff_data = res.json()
        assert "summary_markdown" in diff_data

        # 7. Code Archaeologist Chat
        res = await client.post(
            "/api/v1/chat/archaeologist",
            json={"query": "How is authentication handled?"},
        )
        assert res.status_code == 200
        chat_data = res.json()
        assert "answer" in chat_data
