"""
backend/routes/admin_routes.py
--------------------------------
Admin-only endpoints (require role=admin):
  GET    /api/admin/stats         - Dashboard stats
  GET    /api/admin/users         - All users
  PUT    /api/admin/users/:id     - Toggle user status
  GET    /api/admin/activity      - Recent activity
  GET    /api/admin/rides         - All rides
"""

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.user import find_user_by_id, get_all_users
from backend.models.ride import get_recent_rides
from backend.services.admin_service import get_dashboard_stats, toggle_user_status, get_recent_activity
from backend.utils.response import success_response, error_response

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

def require_admin():
    user_id = get_jwt_identity()
    user = find_user_by_id(user_id)
    if not user or user.get("role") != "admin":
        return None, error_response("Admin access required", 403)
    return user, None

@admin_bp.route("/stats", methods=["GET"])
@jwt_required()
def stats():
    _, err = require_admin()
    if err: return err
    return success_response(get_dashboard_stats())

@admin_bp.route("/users", methods=["GET"])
@jwt_required()
def list_users():
    _, err = require_admin()
    if err: return err
    page = int(request.args.get("page", 1))
    users, total = get_all_users(page)
    return success_response({"users": users, "total": total})

@admin_bp.route("/users/<user_id>/toggle", methods=["PUT"])
@jwt_required()
def toggle_user(user_id):
    admin, err = require_admin()
    if err: return err
    success, msg = toggle_user_status(user_id, str(admin["id"]))
    if not success:
        return error_response(msg, 400)
    return success_response(message=f"User {msg}")

@admin_bp.route("/activity", methods=["GET"])
@jwt_required()
def activity():
    _, err = require_admin()
    if err: return err
    return success_response(get_recent_activity())

@admin_bp.route("/rides", methods=["GET"])
@jwt_required()
def rides():
    _, err = require_admin()
    if err: return err
    return success_response(get_recent_rides(50))
