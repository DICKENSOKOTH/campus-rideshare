"""
backend/routes/auth_routes.py
-------------------------------
Authentication endpoints:
  POST /api/auth/register
  POST /api/auth/login
  POST /api/auth/refresh
  GET  /api/auth/me
"""

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token
from backend.services.auth_service import register_user, login_user
from backend.models.user import find_user_by_id
from backend.utils.validators import validate_registration
from backend.utils.response import success_response, error_response

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

    return success_response(tokens, "Login successful")

@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    return success_response({"access_token": access_token}, "Token refreshed")

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    user = find_user_by_id(user_id)
    if not user:
        return error_response("User not found", 404)
    # Don't expose password hash
    user.pop("password_hash", None)
    user["id"] = str(user["id"])
    return success_response(user)
