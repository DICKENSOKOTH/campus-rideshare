"""
Campus Rideshare - Database Utilities
Supports SQLite (development) and PostgreSQL (production).
"""

import logging
import re
import sqlite3

logger = logging.getLogger(__name__)

# Module-level state
_pool = None
_sqlite_path = None
_use_sqlite = False

# ── SQLite-compatible schema ─────────────────────────────────────────

_SQLITE_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name     TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    phone         TEXT    DEFAULT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'rider',
    avatar_url    TEXT    DEFAULT NULL,
    is_active     INTEGER NOT NULL DEFAULT 1,
    is_verified   INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS driver_profiles (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    license_number   TEXT    NOT NULL UNIQUE,
    vehicle_make     TEXT    NOT NULL,
    vehicle_model    TEXT    NOT NULL,
    vehicle_year     INTEGER NOT NULL,
    vehicle_plate    TEXT    NOT NULL UNIQUE,
    vehicle_color    TEXT    NOT NULL,
    seats_available  INTEGER NOT NULL DEFAULT 3,
    is_approved      INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS rides (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    driver_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    origin            TEXT    NOT NULL,
    destination       TEXT    NOT NULL,
    origin_lat        REAL,
    origin_lng        REAL,
    destination_lat   REAL,
    destination_lng   REAL,
    departure_time    TEXT    NOT NULL,
    seats_total       INTEGER NOT NULL DEFAULT 3,
    seats_remaining   INTEGER NOT NULL DEFAULT 3,
    price_per_seat    REAL    NOT NULL DEFAULT 0.00,
    status            TEXT    NOT NULL DEFAULT 'scheduled',
    notes             TEXT    DEFAULT NULL,
    created_at        TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at        TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS bookings (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    ride_id      INTEGER NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    rider_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seats_booked INTEGER NOT NULL DEFAULT 1,
    status       TEXT    NOT NULL DEFAULT 'pending',
    booked_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    UNIQUE (ride_id, rider_id)
);

CREATE TABLE IF NOT EXISTS ratings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id  INTEGER NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    rater_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ratee_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score       INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment     TEXT    DEFAULT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT    NOT NULL UNIQUE,
    expires_at TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS ai_chat_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       TEXT    NOT NULL,
    content    TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      TEXT    NOT NULL,
    message    TEXT    NOT NULL,
    is_read    INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);
"""

# ── Initialisation ───────────────────────────────────────────────────


def init_db(app):
    """Initialise database — SQLite for dev, PostgreSQL for production."""
    global _pool, _sqlite_path, _use_sqlite
    cfg = app.config
    _use_sqlite = cfg.get('USE_SQLITE', False)

    if _use_sqlite:
        _sqlite_path = cfg.get('SQLITE_PATH', 'campus_rideshare.db')
        conn = sqlite3.connect(_sqlite_path)
        conn.execute("PRAGMA foreign_keys = ON")
        conn.executescript(_SQLITE_SCHEMA)
        conn.close()
        logger.info('SQLite database initialised: %s', _sqlite_path)
    else:
        import psycopg2
        import psycopg2.pool
        _pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            dbname=cfg.get('DB_NAME',   'campus_rideshare_db'),
            user=cfg.get('DB_USER',     ''),
            password=cfg.get('DB_PASSWORD', ''),
            host=cfg.get('DB_HOST',     '127.0.0.1'),
            port=cfg.get('DB_PORT',     '5432'),
        )
        logger.info('PostgreSQL connection pool created.')


def close_db(exception=None):
    """Return nothing — pool persists for the lifetime of the app."""
    pass


# ── Connection helpers ───────────────────────────────────────────────


def get_connection():
    """Get a database connection."""
    if _use_sqlite:
        conn = sqlite3.connect(_sqlite_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn
    if _pool is None:
        raise RuntimeError('Database pool not initialised. Call init_db(app) first.')
    return _pool.getconn()


def put_connection(conn):
    """Return a connection (PostgreSQL pool) or close it (SQLite)."""
    if _use_sqlite:
        conn.close()
    elif _pool is not None:
        _pool.putconn(conn)


# ── Query execution ──────────────────────────────────────────────────


def _adapt_sql(sql):
    """Translate common PostgreSQL syntax to SQLite."""
    sql = sql.replace('%s', '?')
    sql = sql.replace('NOW()', "datetime('now', 'localtime')")
    sql = re.sub(r'\bTRUE\b', '1', sql, flags=re.IGNORECASE)
    sql = re.sub(r'\bFALSE\b', '0', sql, flags=re.IGNORECASE)
    return sql


def _execute_sqlite(sql, params, fetch):
    """Execute a query against SQLite."""
    sql = _adapt_sql(sql)
    conn = get_connection()
    try:
        cur = conn.execute(sql, params)
        if not fetch:
            conn.commit()
            return cur.rowcount
        rows = cur.fetchall()
        return [dict(row) for row in rows]
    except Exception as e:
        conn.rollback()
        logger.error('SQLite query failed: %s | SQL: %s', e, sql)
        raise
    finally:
        conn.close()


def _execute_postgres(sql, params, fetch):
    """Execute a query against PostgreSQL."""
    import psycopg2.extras
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


def execute_query(sql: str, params: tuple = (), fetch: bool = True):
    """
    Execute a raw SQL query.
    fetch=True  → returns list[dict]  (SELECT)
    fetch=False → executes write and returns rowcount
    """
    if _use_sqlite:
        return _execute_sqlite(sql, params, fetch)
    return _execute_postgres(sql, params, fetch)


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
    if _use_sqlite:
        return execute_query(
            """SELECT r.id, r.origin, r.destination,
                      date(r.departure_time) AS departure_date,
                      strftime('%H:%M', r.departure_time) AS departure_time,
                      r.price_per_seat, r.seats_remaining AS available_seats
               FROM rides r
               WHERE r.status = 'scheduled'
                 AND r.departure_time > datetime('now', 'localtime')
               ORDER BY r.departure_time ASC"""
        )
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
    if _use_sqlite:
        rows = execute_query(
            "SELECT COUNT(*) AS c FROM ai_chat_history WHERE user_id = ? AND role = 'user' AND created_at > datetime('now', 'localtime', '-1 minute')",
            (user_id,),
        )
    else:
        rows = execute_query(
            "SELECT COUNT(*) AS c FROM ai_chat_history WHERE user_id = %s AND role = 'user' AND created_at > NOW() - INTERVAL '1 minute'",
            (user_id,),
        )
    return rows[0]['c']
