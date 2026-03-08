"""
backend/services/admin_service.py
-----------------------------------
Admin dashboard data and actions.
"""

from backend.database.database import execute_query
from backend.models.user import get_all_users

def get_dashboard_stats():
    """Return key platform stats for admin overview."""
    stats = {}
    stats["total_users"] = execute_query("SELECT COUNT(*) as c FROM users")[0]["c"]
    stats["total_rides"] = execute_query("SELECT COUNT(*) as c FROM rides")[0]["c"]
    stats["active_rides"] = execute_query(
        "SELECT COUNT(*) as c FROM rides WHERE status='scheduled' AND departure_time > NOW()"
    )[0]["c"]
    stats["total_bookings"] = execute_query("SELECT COUNT(*) as c FROM bookings WHERE status='confirmed'")[0]["c"]
    stats["total_drivers"] = execute_query("SELECT COUNT(*) as c FROM users WHERE role='driver'")[0]["c"]
    return stats

def toggle_user_status(user_id: str, admin_id: str):
    """Activate or deactivate a user account."""
    if user_id == admin_id:
        return False, "Cannot deactivate your own account"
    rows = execute_query("SELECT is_active FROM users WHERE id=%s", (user_id,))
    if not rows:
        return False, "User not found"
    current = rows[0]["is_active"]
    execute_query("UPDATE users SET is_active=%s WHERE id=%s", (not current, user_id), fetch=False)
    return True, "activated" if not current else "deactivated"

def get_recent_activity(limit=20):
    return execute_query(
        """SELECT 'booking' as type, b.created_at, u.full_name as actor,
                  r.origin || ' → ' || r.destination as detail
           FROM bookings b JOIN users u ON b.passenger_id=u.id JOIN rides r ON b.ride_id=r.id
           ORDER BY b.created_at DESC LIMIT %s""",
        (limit,)
    )
