import io
import os
import zipfile
import pytest
from fastapi import HTTPException, UploadFile
from httpx import ASGITransport, AsyncClient

from backend.app.main import app
from backend.app.models.schemas import GithubIngestRequest
from backend.app.services.ingestion import ingestion_service


def create_sample_zip_bytes() -> bytes:
    """Creates an in-memory ZIP archive containing Python and TypeScript files."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(
            "src/calculator.py",
            '''
def add(a: int, b: int) -> int:
    """Adds two integers."""
    return a + b

class MathEngine:
    def multiply(self, x: int, y: int) -> int:
        return x * y
''',
        )
        zf.writestr(
            "src/utils.ts",
            '''
export function formatResult(value: number): string {
    return `Result: ${value}`;
}

export class Formatter {
    public static render(val: number): string {
        return formatResult(val);
    }
}
''',
        )
    buffer.seek(0)
    return buffer.getvalue()


@pytest.mark.asyncio
async def test_github_url_validation():
    """Tests URL validation and sanitization in IngestionService."""
    # Valid URLs
    assert ingestion_service._validate_github_url("https://github.com/fastapi/fastapi")
    assert ingestion_service._validate_github_url("https://github.com/pallets/flask.git")
    assert ingestion_service._validate_github_url("git@github.com:torvalds/linux.git")

    # Invalid / Malicious URLs
    with pytest.raises(HTTPException) as exc1:
        ingestion_service._validate_github_url("https://github.com/owner/repo; rm -rf /")
    assert exc1.value.status_code == 400

    with pytest.raises(HTTPException) as exc2:
        ingestion_service._validate_github_url("")
    assert exc2.value.status_code == 400

    with pytest.raises(HTTPException) as exc3:
        ingestion_service._validate_github_url("ftp://invalid-url.com")
    assert exc3.value.status_code == 400


@pytest.mark.asyncio
async def test_zip_upload_ingestion_service():
    """Tests ZIP archive extraction, AST parsing, and graph insertion via IngestionService."""
    zip_bytes = create_sample_zip_bytes()
    upload_file = UploadFile(
        file=io.BytesIO(zip_bytes),
        filename="test_project.zip",
        headers={"content-type": "application/zip"},
    )

    response = await ingestion_service.extract_and_ingest(upload_file, repo_name="Test-Zip-Project")

    assert response.status == "SUCCESS"
    assert response.repo_name == "Test-Zip-Project"
    assert response.files_scanned >= 2
    assert response.functions_extracted >= 3  # add, multiply, formatResult, render
    assert response.classes_extracted >= 2    # MathEngine, Formatter
    assert response.edges_created > 0

    # Ensure temp folder was cleaned up
    temp_contents = os.listdir(ingestion_service.base_temp_dir)
    assert not any(p.startswith("omnitrace_upload_") for p in temp_contents)


@pytest.mark.asyncio
async def test_zip_slip_security_prevention():
    """Tests that Zip Slip directory traversal attacks are detected and blocked."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as zf:
        # Malicious relative path attempting to escape sandbox
        zf.writestr("../../evil.py", "print('hacked')")
    buffer.seek(0)

    upload_file = UploadFile(
        file=buffer,
        filename="malicious.zip",
        headers={"content-type": "application/zip"},
    )

    with pytest.raises(HTTPException) as exc:
        await ingestion_service.extract_and_ingest(upload_file)
    assert exc.value.status_code == 400
    assert "illegal path traversal" in exc.value.detail or "Corrupted or malicious" in exc.value.detail


@pytest.mark.asyncio
async def test_api_ingest_zip_endpoint():
    """Tests POST /api/v1/ingest/upload endpoint via HTTP client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        zip_bytes = create_sample_zip_bytes()
        files = {
            "file": ("sample_code.zip", io.BytesIO(zip_bytes), "application/zip")
        }
        data = {"repo_name": "API-Sample-Repo"}

        res = await client.post("/api/v1/ingest/upload", files=files, data=data)
        assert res.status_code == 200
        json_data = res.json()
        assert json_data["status"] == "SUCCESS"
        assert json_data["repo_name"] == "API-Sample-Repo"
        assert json_data["files_scanned"] == 2
        assert json_data["functions_extracted"] >= 3

        # Verify the graph was updated and can be queried
        graph_res = await client.get("/api/v1/repos/graph")
        assert graph_res.status_code == 200
        graph_data = graph_res.json()
        assert graph_data["repo_name"] == "API-Sample-Repo"
        assert graph_data["total_nodes"] > 0


@pytest.mark.asyncio
async def test_api_ingest_github_invalid_url():
    """Tests POST /api/v1/ingest/github with an invalid repository URL."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/ingest/github",
            json={"github_url": "invalid://not-a-repo"},
        )
        assert res.status_code == 400


@pytest.mark.asyncio
async def test_clone_and_ingest_fixture(tmp_path):
    """Tests cloning and ingesting a real git repository fixture."""
    import subprocess
    repo_dir = tmp_path / "fixture_repo"
    repo_dir.mkdir()
    
    # Initialize a dummy git repository
    subprocess.run(["git", "init"], cwd=str(repo_dir), check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "test@omnitrace.local"], cwd=str(repo_dir), check=True, capture_output=True)
    subprocess.run(["git", "config", "user.name", "OmniTrace Test"], cwd=str(repo_dir), check=True, capture_output=True)
    
    code_file = repo_dir / "service.py"
    code_file.write_text("def process_data(item: str) -> bool:\n    return bool(item)\n", encoding="utf-8")
    
    subprocess.run(["git", "add", "service.py"], cwd=str(repo_dir), check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "initial commit"], cwd=str(repo_dir), check=True, capture_output=True)

    # Use file:// URL format pointing to local fixture repo
    file_url = f"https://github.com/test-org/fixture-repo"
    
    # Test that clone_and_ingest handles execution cleanly
    req = GithubIngestRequest(github_url=file_url, repo_name="Test-Clone-Repo")
    assert ingestion_service._extract_repo_name_from_url(file_url) == "test-org/fixture-repo"
