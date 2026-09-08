import logging
import sys
from backend.app.core.config import settings


def setup_logging():
    log_format = (
        "[%(asctime)s] [%(levelname)s] [%(name)s:%(lineno)d] - %(message)s"
    )
    date_format = "%Y-%m-%d %H:%M:%S"

    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    logging.basicConfig(
        level=level,
        format=log_format,
        datefmt=date_format,
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True,
    )

    # Silence verbose 3rd-party loggers
    logging.getLogger("neo4j").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("watchdog").setLevel(logging.WARNING)

    logger = logging.getLogger("omnitrace")
    logger.info(f"Initialized OmniTrace logger (Level: {settings.LOG_LEVEL})")
    return logger


logger = setup_logging()
