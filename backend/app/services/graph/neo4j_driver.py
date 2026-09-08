import asyncio
from typing import Any, Dict, List, Optional
from neo4j import AsyncGraphDatabase, AsyncDriver
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.services.graph.schema import CYPHER_CONSTRAINTS, CYPHER_INDEXES


class Neo4jConnectionManager:
    """Manages Async Neo4j Driver connections, pooling, and schema migration."""

    def __init__(self):
        self._driver: Optional[AsyncDriver] = None
        self._is_connected: bool = False

    async def connect(self) -> bool:
        if not settings.NEO4J_ENABLED:
            logger.info("Neo4j is disabled in settings. Using high-performance In-Memory Graph Engine.")
            return False

        try:
            self._driver = AsyncGraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
                max_connection_pool_size=settings.NEO4J_MAX_CONNECTION_POOL_SIZE,
            )
            # Verify connectivity
            await self._driver.verify_connectivity()
            self._is_connected = True
            logger.info(f"Connected to Neo4j cluster at {settings.NEO4J_URI}")
            await self.apply_schema()
            return True
        except Exception as e:
            logger.warning(f"Failed to connect to Neo4j ({e}). Falling back to In-Memory Graph Engine.")
            self._is_connected = False
            if self._driver:
                await self._driver.close()
                self._driver = None
            return False

    async def close(self):
        if self._driver:
            await self._driver.close()
            self._driver = None
            self._is_connected = False
            logger.info("Neo4j driver connection pool closed.")

    @property
    def is_connected(self) -> bool:
        return self._is_connected and self._driver is not None

    async def apply_schema(self):
        if not self.is_connected:
            return
        async with self._driver.session(database=settings.NEO4J_DATABASE) as session:
            for constraint in CYPHER_CONSTRAINTS:
                try:
                    await session.run(constraint)
                except Exception as e:
                    logger.debug(f"Constraint creation note: {e}")

            for index in CYPHER_INDEXES:
                try:
                    await session.run(index)
                except Exception as e:
                    logger.debug(f"Index creation note: {e}")
            logger.info("Applied Neo4j Cypher constraints & schema indexes.")

    async def execute_query(
        self, query: str, parameters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        if not self.is_connected:
            raise RuntimeError("Neo4j driver is not connected.")
        async with self._driver.session(database=settings.NEO4J_DATABASE) as session:
            result = await session.run(query, parameters or {})
            records = await result.data()
            return records


neo4j_manager = Neo4jConnectionManager()
