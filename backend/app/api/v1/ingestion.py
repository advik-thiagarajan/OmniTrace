from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from backend.app.core.logging import logger
from backend.app.models.schemas import GithubIngestRequest, RepoIngestResponse
from backend.app.services.ingestion import ingestion_service

router = APIRouter(prefix="/ingest", tags=["Ingestion"])


@router.post("/github", response_model=RepoIngestResponse)
async def ingest_github_repository(request: GithubIngestRequest):
    """Clones a public GitHub repository (depth=1), parses AST symbols, populates Neo4j / in-memory graph, and cleans up temporary files."""
    try:
        return await ingestion_service.clone_and_ingest(request)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during GitHub ingestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload", response_model=RepoIngestResponse)
async def ingest_zip_archive(
    file: UploadFile = File(..., description="ZIP archive containing repository source code"),
    repo_name: Optional[str] = Form(None, description="Optional custom repository alias"),
):
    """Accepts a multipart .zip archive upload, safely extracts it, parses AST symbols, populates graph, and cleans up temporary files."""
    try:
        return await ingestion_service.extract_and_ingest(file=file, repo_name=repo_name)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during ZIP upload ingestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))
