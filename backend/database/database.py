"""
RideU - Database Utilities
Helpers for raw queries when Django ORM isn't used directly.
"""

import logging
from django.db import connection, OperationalError

logger = logging.getLogger(__name__)


def get_connection():
    """Return the active Django database connection."""
    return connection


def execute_query(sql: str, params: tuple = ()):
    """
    Execute a raw SELECT query and return all rows as dicts.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            columns = [col[0] for col in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
    except OperationalError as e:
        logger.error("execute_query failed: %s | SQL: %s", e, sql)
        raise


def execute_write(sql: str, params: tuple = ()):
    """
    Execute a raw INSERT / UPDATE / DELETE query.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            return cursor.rowcount
    except OperationalError as e:
        logger.error("execute_write failed: %s | SQL: %s", e, sql)
        raise


def health_check() -> dict:
    """
    Ping the database and return a status dict.
    Used by the /api/health endpoint.
    """
    try:
        execute_query("SELECT 1")
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        logger.critical("Database health check failed: %s", e)
        return {"status": "error", "database": str(e)}
