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

    SECRET_KEY = _env('SECRET_KEY', 'campus-rideshare-dev-secret-key-change-in-production')
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
    # Use cookies for JWTs so tokens are not stored in client-side storage
    JWT_TOKEN_LOCATION = ["cookies"]
    JWT_COOKIE_SECURE = False  # set True in production with HTTPS
    JWT_COOKIE_HTTPONLY = True
    JWT_COOKIE_CSRF_PROTECT = False  # for simplicity in dev; enable in prod
    JWT_ACCESS_COOKIE_PATH = "/"
    JWT_REFRESH_COOKIE_PATH = "/api/auth/refresh"

    # ── CORS ──────────────────────────────────────────────────────
    CORS_ORIGINS = _env('CORS_ORIGINS', '*')

    # ── Static / Frontend ─────────────────────────────────────────
    STATIC_FOLDER = str(BASE_DIR / 'frontend')

    # ── AI / Chatbot ─────────────────────────────────────────────
    # Provider: 'groq' (free, fast) or 'gemini' (cloud API)
    AI_PROVIDER        = _env('AI_PROVIDER', 'groq')
    
    # Groq settings (FREE tier - very fast!)
    GROQ_API_KEY       = _env('GROQ_API_KEY')
    GROQ_MODEL         = _env('GROQ_MODEL', 'llama-3.3-70b-versatile')
    
    # Gemini settings (cloud API - requires API key)
    GEMINI_API_KEY     = _env('GEMINI_API_KEY')
    GEMINI_MODEL       = _env('GEMINI_MODEL', 'gemini-2.0-flash')
    GEMINI_MAX_TOKENS  = _env_int('GEMINI_MAX_TOKENS', 500)
    CHATBOT_RATE_LIMIT = _env_int('CHATBOT_RATE_LIMIT', 10)

    # ── WebSocket ─────────────────────────────────────────────────
    WS_HOST = _env('WS_HOST', '0.0.0.0')
    WS_PORT = _env_int('WS_PORT', 8765)

    def is_gemini_enabled(self) -> bool:
        return self.AI_PROVIDER == 'gemini' and bool(self.GEMINI_API_KEY)
    
    def is_groq_enabled(self) -> bool:
        return self.AI_PROVIDER == 'groq' and bool(self.GROQ_API_KEY)
    
    def is_ai_enabled(self) -> bool:
        return self.is_groq_enabled() or self.is_gemini_enabled()


# Singleton used by the rest of the app
config = Config()
