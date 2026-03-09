"""
Campus Rideshare - Database Utilities
Connection pool via psycopg2 and helper functions for raw SQL.
"""

import logging
import psycopg2
import psycopg2.pool
import psycopg2.extras

logger = logging.getLogger(__name__)

# Module-level connection pool (created once in init_db)
_pool = None


def init_db(app):
    """Create a threaded connection pool from Flask app config."""
    global _pool
    cfg = app.config
    _pool = psycopg2.pool.ThreadedConnectionPool(
        minconn=1,
        maxconn=10,
        dbname=cfg.get('DB_NAME',   'campus_rideshare_db'),
        user=cfg.get('DB_USER',     ''),
        password=cfg.get('DB_PASSWORD', ''),
        host=cfg.get('DB_HOST',     '127.0.0.1'),
        port=cfg.get('DB_PORT',     '5432'),
    )
    logger.info('Database connection pool created.')


def close_db(exception=None):
    """Return nothing — pool persists for the lifetime of the app."""
    pass


def get_connection():
    """Get a connection from the pool."""
    if _pool is None:
        raise RuntimeError('Database pool not initialised. Call init_db(app) first.')
    return _pool.getconn()


def put_connection(conn):
    """Return a connection to the pool."""
    if _pool is not None:
        _pool.putconn(conn)


def execute_query(sql: str, params: tuple = (), fetch: bool = True):
    """
    Execute a raw SQL query.
    fetch=True  → returns list[dict]  (SELECT)
    fetch=False → executes write and returns rowcount
    """
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            if not fetch:
                conn.commit()
                return cur.rowcount
            rows = cur.fetchall()
            return [dict(row) for row in rows]
    except Exception as e:
        conn.rollback()
        logger.error('execute_query failed: %s | SQL: %s', e, sql)
        raise
    finally:
        put_connection(conn)


def execute_write(sql: str, params: tuple = ()):
    """Shortcut for INSERT / UPDATE / DELETE."""
    return execute_query(sql, params, fetch=False)


def health_check() -> dict:
    """Ping the database and return a status dict."""
    try:
        execute_query('SELECT 1')
        return {'status': 'ok', 'database': 'connected'}
    except Exception as e:
        logger.critical('Database health check failed: %s', e)
        return {'status': 'error', 'database': str(e)}


# ── Convenience helpers used by the AI module ──────────────────────────

def get_all_active_rides():
    """Return all scheduled rides departing in the future."""
    return execute_query(
        """SELECT r.id, r.origin, r.destination,
                  TO_CHAR(r.departure_time, 'YYYY-MM-DD') AS departure_date,
                  TO_CHAR(r.departure_time, 'HH24:MI') AS departure_time,
                  r.price_per_seat, r.seats_remaining AS available_seats
           FROM rides r
           WHERE r.status = 'scheduled' AND r.departure_time > NOW()
           ORDER BY r.departure_time ASC"""
    )


def get_platform_statistics():
    """Return platform-wide statistics for AI context."""
    stats = {}
    stats['total_users'] = execute_query('SELECT COUNT(*) AS c FROM users')[0]['c']
    prices = execute_query(
        "SELECT COALESCE(AVG(price_per_seat), 0) AS avg_price FROM rides WHERE status = 'scheduled'"
    )
    stats['average_price'] = float(prices[0]['avg_price'])
    return stats


def get_chat_history_for_user(user_id, limit=10):
    """Return recent chat messages for a user."""
    return execute_query(
        'SELECT role, content, created_at FROM ai_chat_history WHERE user_id = %s ORDER BY created_at DESC LIMIT %s',
        (user_id, limit),
    )


def log_chat_interaction(user_id, user_message, bot_response, tokens_used=None):
    """Persist a user/bot exchange to the chat history table."""
    execute_query(
        "INSERT INTO ai_chat_history (user_id, role, content) VALUES (%s, 'user', %s)",
        (user_id, user_message), fetch=False,
    )
    execute_query(
        "INSERT INTO ai_chat_history (user_id, role, content) VALUES (%s, 'assistant', %s)",
        (user_id, bot_response), fetch=False,
    )


def get_user_chat_count_last_minute(user_id):
    """Count chat messages from a user in the last 60 seconds."""
    rows = execute_query(
        "SELECT COUNT(*) AS c FROM ai_chat_history WHERE user_id = %s AND role = 'user' AND created_at > NOW() - INTERVAL '1 minute'",
        (user_id,),
    )
    return rows[0]['c']
