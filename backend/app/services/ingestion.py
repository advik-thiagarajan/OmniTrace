import asyncio
import os
import re
import shutil
import stat
import subprocess
import tempfile
import time
import zipfile
from pathlib import Path
from typing import List, Optional
from fastapi import HTTPException, UploadFile
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.models.schemas import (
    GithubIngestRequest,
    RepoIngestRequest,
    RepoIngestResponse,
    WebSocketEventType,
)
from backend.app.services.ingest.repo_scanner import repo_scanner
from backend.app.services.realtime.websocket_manager import ws_manager


def _remove_readonly(func, path, excinfo):
    """Windows-safe permission error handler for shutil.rmtree on git files."""
    try:
        os.chmod(path, stat.S_IWRITE)
        func(path)
    except Exception as e:
        logger.debug(f"Could not remove {path}: {e}")


def safe_rmtree(directory: str) -> None:
    """Safely removes a directory tree, handling Windows read-only git files."""
    if not os.path.exists(directory):
        return
    try:
        shutil.rmtree(directory, onerror=_remove_readonly)
    except Exception as e:
        logger.warning(f"Failed to completely remove temporary directory '{directory}': {e}")


class IngestionService:
    """Service handling repository ingestion via GitHub cloning and ZIP archive uploads."""

    def __init__(self):
        # Base temporary workspace for ingestion
        self.base_temp_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "temp", "omnitrace_repos")
        )
        os.makedirs(self.base_temp_dir, exist_ok=True)

    def _validate_github_url(self, url: str) -> str:
        """Validates and sanitizes a GitHub repository URL."""
        cleaned_url = url.strip()
        if not cleaned_url:
            raise HTTPException(status_code=400, detail="GitHub URL cannot be empty.")

        # Disallow shell metacharacters for safety
        if any(c in cleaned_url for c in [" ", ";", "&", "|", "`", "$", "\n", "\r", "\t", '"', "'"]):
            raise HTTPException(status_code=400, detail="Invalid characters detected in GitHub repository URL.")

        # Common valid GitHub patterns
        github_pattern = re.compile(
            r"^(https?://github\.com/|git@github\.com:)[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+(\.git)?/?$"
        )
        generic_git_pattern = re.compile(
            r"^(https?://|git://)[a-zA-Z0-9_.-]+(:[0-9]+)?/[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+(\.git)?/?$"
        )

        if not (github_pattern.match(cleaned_url) or generic_git_pattern.match(cleaned_url)):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid Git URL format: '{cleaned_url}'. Expected format: https://github.com/owner/repository",
            )

        return cleaned_url

    def _extract_repo_name_from_url(self, url: str) -> str:
        """Derives a friendly repository name from a git URL."""
        # e.g., https://github.com/owner/repo.git -> owner/repo or repo
        norm_url = url.rstrip("/").rstrip(".git")
        parts = norm_url.replace(":", "/").split("/")
        if len(parts) >= 2:
            owner = parts[-2]
            repo = parts[-1]
            return f"{owner}/{repo}" if owner and owner not in ("github.com", "http", "https") else repo
        return parts[-1] if parts else "Cloned-Repository"

    def _extract_repo_name_from_zip(self, filename: Optional[str], extract_dir: str) -> str:
        """Derives a repository name from the uploaded zip name or extracted contents."""
        if filename:
            name = Path(filename).stem
            if name and name.lower() != "archive":
                return name

        # Check if single top-level directory exists inside extract_dir
        items = os.listdir(extract_dir)
        if len(items) == 1 and os.path.isdir(os.path.join(extract_dir, items[0])):
            return items[0]

        return "Uploaded-Repository"

    async def clone_and_ingest(self, request: GithubIngestRequest) -> RepoIngestResponse:
        """Clones a public GitHub repo with --depth 1 into a temp dir, parses AST, populates graph, and cleans up."""
        valid_url = self._validate_github_url(request.github_url)
        repo_name = request.repo_name or self._extract_repo_name_from_url(valid_url)

        temp_dir = tempfile.mkdtemp(prefix="omnitrace_git_", dir=self.base_temp_dir)
        logger.info(f"Cloning GitHub repo '{valid_url}' into '{temp_dir}'...")

        try:
            # Run git clone with --depth 1 in thread executor
            def _clone():
                cmd = ["git", "clone", "--depth", "1", valid_url, temp_dir]
                return subprocess.run(
                    cmd,
                    check=True,
                    capture_output=True,
                    text=True,
                    timeout=120,
                )

            try:
                await asyncio.to_thread(_clone)
            except subprocess.TimeoutExpired:
                raise HTTPException(status_code=408, detail="Git clone operation timed out after 120 seconds.")
            except subprocess.CalledProcessError as e:
                err_msg = e.stderr or e.stdout or str(e)
                logger.error(f"Git clone error for {valid_url}: {err_msg}")
                if "Repository not found" in err_msg or "Authentication failed" in err_msg:
                    raise HTTPException(
                        status_code=400,
                        detail=f"GitHub repository not found or requires authentication: {valid_url}",
                    )
                raise HTTPException(status_code=400, detail=f"Failed to clone repository: {err_msg.strip()}")
            except FileNotFoundError:
                raise HTTPException(status_code=500, detail="Git CLI executable is not installed or not in PATH on server.")

            # Hook into repo_scanner to parse files & construct knowledge graph
            scan_request = RepoIngestRequest(
                repo_path=temp_dir,
                repo_name=repo_name,
                include_patterns=request.include_patterns,
                exclude_patterns=request.exclude_patterns,
            )
            response = await repo_scanner.scan_and_ingest(scan_request)

            # Broadcast WebSocket graph update
            await ws_manager.broadcast_event(
                WebSocketEventType.GRAPH_UPDATED,
                {
                    "repo_name": response.repo_name,
                    "total_nodes": response.files_scanned + response.functions_extracted + response.classes_extracted,
                    "total_edges": response.edges_created,
                    "source": "github",
                },
            )

            return response
        finally:
            safe_rmtree(temp_dir)
            logger.info(f"Cleaned up temporary clone directory '{temp_dir}'")

    async def extract_and_ingest(
        self,
        file: UploadFile,
        repo_name: Optional[str] = None,
        include_patterns: Optional[List[str]] = None,
        exclude_patterns: Optional[List[str]] = None,
    ) -> RepoIngestResponse:
        """Extracts an uploaded ZIP archive, parses AST, populates graph, and cleans up."""
        if not file.filename or not file.filename.lower().endswith(".zip"):
            raise HTTPException(status_code=400, detail="Invalid file format. Please upload a .zip archive.")

        temp_dir = tempfile.mkdtemp(prefix="omnitrace_upload_", dir=self.base_temp_dir)
        temp_zip_path = os.path.join(temp_dir, "archive.zip")
        extract_dir = os.path.join(temp_dir, "extracted")
        os.makedirs(extract_dir, exist_ok=True)

        logger.info(f"Receiving ZIP upload '{file.filename}' to '{temp_zip_path}'...")

        try:
            # 1. Save uploaded file
            with open(temp_zip_path, "wb") as buffer:
                while chunk := await file.read(1024 * 1024):  # 1MB chunks
                    buffer.write(chunk)

            # 2. Extract ZIP archive with Zip Slip security checks
            try:
                with zipfile.ZipFile(temp_zip_path, "r") as zip_ref:
                    # Validate all paths
                    abs_extract_dir = os.path.abspath(extract_dir)
                    for member in zip_ref.namelist():
                        target_path = os.path.abspath(os.path.join(extract_dir, member))
                        if not target_path.startswith(abs_extract_dir + os.sep) and target_path != abs_extract_dir:
                            raise HTTPException(
                                status_code=400,
                                detail=f"Corrupted or malicious ZIP archive: illegal path traversal '{member}'",
                            )
                    zip_ref.extractall(extract_dir)
            except zipfile.BadZipFile:
                raise HTTPException(status_code=400, detail="Corrupted or invalid ZIP file archive.")

            # 3. Determine actual scan root (handle single top-level folder if archive contains one)
            scan_root = extract_dir
            extracted_items = [
                os.path.join(extract_dir, item)
                for item in os.listdir(extract_dir)
                if not item.startswith("__MACOSX") and not item.startswith(".")
            ]
            if len(extracted_items) == 1 and os.path.isdir(extracted_items[0]):
                scan_root = extracted_items[0]

            final_repo_name = repo_name or self._extract_repo_name_from_zip(file.filename, extract_dir)

            # 4. Ingest repository files
            scan_request = RepoIngestRequest(
                repo_path=scan_root,
                repo_name=final_repo_name,
                include_patterns=include_patterns or ["*.py", "*.ts", "*.tsx", "*.js", "*.jsx"],
                exclude_patterns=exclude_patterns
                or ["node_modules", ".venv", "venv", ".git", "dist", "build", "__pycache__", ".next"],
            )
            response = await repo_scanner.scan_and_ingest(scan_request)

            # Broadcast WebSocket graph update
            await ws_manager.broadcast_event(
                WebSocketEventType.GRAPH_UPDATED,
                {
                    "repo_name": response.repo_name,
                    "total_nodes": response.files_scanned + response.functions_extracted + response.classes_extracted,
                    "total_edges": response.edges_created,
                    "source": "zip_upload",
                },
            )

            return response
        finally:
            safe_rmtree(temp_dir)
            logger.info(f"Cleaned up temporary upload directory '{temp_dir}'")


ingestion_service = IngestionService()
