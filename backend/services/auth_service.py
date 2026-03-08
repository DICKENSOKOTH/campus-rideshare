"""
backend/services/auth_service.py
----------------------------------
Business logic for authentication.
Routes call this — never put business logic directly in routes.
"""

from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token, create_refresh_token
from backend.models.user import find_user_by_email, create_user

bcrypt = Bcrypt()

def register_user(data: dict):
    """
    Register a new user.
    Returns (user_dict, error_string).
    """
    email = data["email"].lower().strip()

    # Check duplicate
    if find_user_by_email(email):
        return None, "An account with this email already exists"

    # Hash password
    password_hash = bcrypt.generate_password_hash(data["password"]).decode("utf-8")

    user = create_user(
        full_name=data["full_name"].strip(),
        email=email,
        password_hash=password_hash,
        student_id=data.get("student_id"),
        phone=data.get("phone"),
        role=data.get("role", "student")
    )
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

    if not bcrypt.check_password_hash(user["password_hash"], password):
        return None, "Invalid email or password"

    # Create JWT tokens (identity is user ID as string)
    access_token = create_access_token(identity=str(user["id"]))
    refresh_token = create_refresh_token(identity=str(user["id"]))

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": str(user["id"]),
            "full_name": user["full_name"],
            "email": user["email"],
            "role": user["role"],
            "profile_pic": user.get("profile_pic"),
            "rating_avg": float(user.get("rating_avg") or 0)
        }
    }, None
