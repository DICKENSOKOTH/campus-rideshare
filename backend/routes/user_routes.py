"""
backend/routes/user_routes.py
------------------------------
User profile endpoints:
  GET    /api/users/profile        - My full profile
  PUT    /api/users/profile        - Update my profile
  GET    /api/users/:id            - View public profile
  POST   /api/users/rate/:booking  - Rate after a ride
"""

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.user import find_user_by_id, update_user, get_user_public_profile
from backend.models.rating import create_rating, get_user_ratings
from backend.models.booking import get_booking_by_id
from backend.utils.response import success_response, error_response

user_bp = Blueprint("users", __name__, url_prefix="/api/users")

@user_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    user = find_user_by_id(user_id)
    if not user:
        return error_response("User not found", 404)
    user.pop("password_hash", None)
    user["id"] = str(user["id"])
    ratings = get_user_ratings(user_id)
    user["ratings"] = ratings
    return success_response(user)

@user_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    user = update_user(user_id,
        full_name=data.get("full_name"),
        phone=data.get("phone"),
        avatar_url=data.get("avatar_url")
    )
    if not user:
        return error_response("Update failed")
    user.pop("password_hash", None)
    return success_response(user, "Profile updated")

@user_bp.route("/<user_id>", methods=["GET"])
def get_public_profile(user_id):
    user = get_user_public_profile(user_id)
    if not user:
        return error_response("User not found", 404)
    ratings = get_user_ratings(user_id)
    user["ratings"] = ratings
    return success_response(user)

@user_bp.route("/rate/<booking_id>", methods=["POST"])
@jwt_required()
def rate_user(booking_id):
    rater_id = get_jwt_identity()
    data = request.get_json() or {}
    score = data.get("score")
    rated_id = data.get("rated_id")

    if not score or not rated_id:
        return error_response("Score and rated_id are required")
    if not (1 <= int(score) <= 5):
        return error_response("Score must be between 1 and 5")

    booking = get_booking_by_id(booking_id)
    if not booking:
        return error_response("Booking not found", 404)

    create_rating(booking_id, rater_id, rated_id, int(score), data.get("comment"))
    return success_response(message="Rating submitted. Thank you!")
