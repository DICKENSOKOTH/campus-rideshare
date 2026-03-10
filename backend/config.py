"""
Campus Rideshare - Flask Configuration
All settings are loaded from a .env file via python-dotenv.
"""

import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env from project root
load_dotenv(BASE_DIR / '.env')


def _env(key: str, default: str = '') -> str:
    return os.getenv(key, default)


def _env_bool(key: str, default: bool = False) -> bool:
    return _env(key, str(default)).lower() in ('true', '1', 'yes')


def _env_int(key: str, default: int = 0) -> int:
    try:
        return int(_env(key, str(default)))
    except ValueError:
        return default


class Config:
    """Base configuration."""

    APP_NAME = 'Campus Rideshare'

    SECRET_KEY = _env('SECRET_KEY', 'change-me-in-production')
    DEBUG = _env_bool('DEBUG', True)

    # ── Database ─────────────────────────────────────────────────
    USE_SQLITE  = _env_bool('USE_SQLITE', True)
    SQLITE_PATH = str(BASE_DIR / _env('SQLITE_PATH', 'campus_rideshare.db'))

    # PostgreSQL (production — used when USE_SQLITE=False)
    DB_NAME     = _env('DB_NAME',     'campus_rideshare_db')
    DB_USER     = _env('DB_USER')
    DB_PASSWORD = _env('DB_PASSWORD')
    DB_HOST     = _env('DB_HOST',     '127.0.0.1')
    DB_PORT     = _env('DB_PORT',     '5432')

    # ── JWT (Flask-JWT-Extended) ──────────────────────────────────
    JWT_SECRET_KEY = SECRET_KEY
    JWT_ACCESS_TOKEN_EXPIRES  = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)

    # ── CORS ──────────────────────────────────────────────────────
    CORS_ORIGINS = _env('CORS_ORIGINS', '*')

    # ── Static / Frontend ─────────────────────────────────────────
    STATIC_FOLDER = str(BASE_DIR / 'frontend')

    # ── OpenAI / Chatbot ──────────────────────────────────────────
    OPENAI_API_KEY     = _env('OPENAI_API_KEY')
    OPENAI_MODEL       = _env('OPENAI_MODEL', 'gpt-3.5-turbo')
    OPENAI_MAX_TOKENS  = _env_int('OPENAI_MAX_TOKENS', 500)
    CHATBOT_RATE_LIMIT = _env_int('CHATBOT_RATE_LIMIT', 10)

    # ── WebSocket ─────────────────────────────────────────────────
    WS_HOST = _env('WS_HOST', '0.0.0.0')
    WS_PORT = _env_int('WS_PORT', 8765)

    def is_openai_enabled(self) -> bool:
        return bool(self.OPENAI_API_KEY)


# Singleton used by the rest of the app
config = Config()
