from contextlib import asynccontextmanager
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.v1 import api_v1_router
from backend.app.api.v1.ws import router as ws_router
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.models.schemas import RepoIngestRequest
from backend.app.services.graph.neo4j_driver import neo4j_manager
from backend.app.services.ingest.repo_scanner import repo_scanner


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}...")
    try:
        await neo4j_manager.connect()
    except Exception as e:
        logger.warning(f"Neo4j startup note: {e}")

    # Auto-ingest backend codebase itself as the initial active project
    try:
        logger.info("Ingesting self-codebase for initial 3D constellation display...")
        await repo_scanner.scan_and_ingest(
            RepoIngestRequest(
                repo_path="backend",
                repo_name="OmniTrace-Core",
            )
        )
    except Exception as e:
        logger.debug(f"Initial ingestion note: {e}")

    yield

    # Shutdown
    logger.info(f"Shutting down {settings.PROJECT_NAME}...")
    try:
        await neo4j_manager.close()
    except Exception as e:
        logger.debug(f"Error during shutdown: {e}")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for development flexibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(api_v1_router, prefix=settings.API_V1_STR)
app.include_router(ws_router)  # Includes /ws/live-stream


@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "neo4j_connected": neo4j_manager.is_connected,
        "timestamp": time.time(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
