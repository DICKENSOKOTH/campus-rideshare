"""
backend/services/auth_service.py
----------------------------------
Business logic for authentication.
Uses Flask-Bcrypt for hashing and Flask-JWT-Extended for tokens.
"""

import logging

from flask_bcrypt import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, create_refresh_token
from backend.models.user import find_user_by_email, create_user

logger = logging.getLogger(__name__)


def register_user(data: dict):
    """
    Register a new user.
    Returns (user_dict, error_string).
    """
    email = data["email"].lower().strip()

    if find_user_by_email(email):
        return None, "An account with this email already exists"

    password_hash = generate_password_hash(data["password"]).decode("utf-8")

    try:
        user = create_user(
            full_name=data["full_name"].strip(),
            email=email,
            password_hash=password_hash,
            phone=data.get("phone") or None,
            role=data.get("role", "rider"),
        )
    except Exception as e:
        logger.error("Registration DB error: %s", e)
        msg = str(e).lower()
        if "unique" in msg or "duplicate" in msg:
            return None, "An account with this email already exists"
        return None, "Registration failed. Please try again."
    return user, None


def login_user(email: str, password: str):
    """
    Authenticate user, return JWT tokens.
    Returns (tokens_dict, error_string).
    """
    user = find_user_by_email(email.lower().strip())

    if not user:
        return None, "Invalid email or password"

    if not user.get("is_active"):
        return None, "This account has been deactivated"

    if not check_password_hash(user["password_hash"], password):
        return None, "Invalid email or password"

    # Identity is user ID as string
    access_token  = create_access_token(identity=str(user["id"]))
    refresh_token = create_refresh_token(identity=str(user["id"]))

    return {
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "user": {
            "id":        str(user["id"]),
            "full_name": user["full_name"],
            "email":     user["email"],
            "role":      user["role"],
            "avatar_url": user.get("avatar_url"),
        },
    }, None
