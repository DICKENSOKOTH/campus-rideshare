"""
backend/routes/auth_routes.py
-------------------------------
Authentication endpoints:
  POST /api/auth/register
  POST /api/auth/login
  POST /api/auth/refresh
  GET  /api/auth/me
"""

from flask import Blueprint, request, make_response
from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity,
    create_access_token,
    get_jwt,
    set_access_cookies,
    set_refresh_cookies,
    unset_jwt_cookies,
)
from backend.services.auth_service import register_user, login_user
from backend.models.user import find_user_by_id
from backend.utils.validators import validate_registration
from backend.utils.response import success_response, error_response
from backend.database.database import delete_refresh_token, get_refresh_token

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data:
        return error_response("No data provided")

    errors = validate_registration(data)
    if errors:
        return error_response("Validation failed", 422, errors)

    user, err = register_user(data)
    if err:
        return error_response(err, 409)

    return success_response(
        {"id": str(user["id"]), "email": user["email"], "full_name": user["full_name"]},
        "Account created successfully! Please log in.",
        201
    )

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data or not data.get("email") or not data.get("password"):
        return error_response("Email and password are required")

    tokens, err = login_user(data["email"], data["password"])
    if err:
        return error_response(err, 401)

    # On successful login, set JWTs in httpOnly cookies and do not return raw tokens
    response = make_response(success_response({"user": tokens["user"]}, "Login successful"))
    set_access_cookies(response, tokens["access_token"])
    set_refresh_cookies(response, tokens["refresh_token"])
    return response

@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    token = get_jwt()["raw_token"]
    # Validate refresh token in DB
    db_token = get_refresh_token(token)
    if not db_token:
        return error_response("Refresh token invalid or expired", 401)
    access_token = create_access_token(identity=identity)
    # Set new access token cookie
    response = make_response(success_response({}, "Token refreshed"))
    set_access_cookies(response, access_token)
    return response

@auth_bp.route("/logout", methods=["POST"])
@jwt_required(refresh=True)
def logout():
    token = get_jwt()["raw_token"]
    delete_refresh_token(token)
    response = make_response(success_response({}, "Logged out"))
    unset_jwt_cookies(response)
    return response

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    user = find_user_by_id(user_id)
    if not user:
        return error_response("User not found", 401)
    # Don't expose password hash
    user.pop("password_hash", None)
    user["id"] = str(user["id"])
    return success_response(user)
