"""
backend/models/user.py
-----------------------
User model: queries related to the users table.
No raw SQL in routes — routes call these model functions.
"""

from backend.database.database import execute_query

def find_user_by_email(email: str):
    rows = execute_query("SELECT * FROM users WHERE email = %s", (email,))
    return rows[0] if rows else None

def find_user_by_id(user_id: str):
    rows = execute_query("SELECT * FROM users WHERE id = %s", (user_id,))
    return rows[0] if rows else None

def create_user(full_name, email, password_hash, student_id=None, phone=None, role="student"):
    execute_query(
        """INSERT INTO users (full_name, email, password_hash, student_id, phone, role)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (full_name, email, password_hash, student_id, phone, role),
        fetch=False
    )
    return find_user_by_email(email)

def update_user(user_id, **fields):
    allowed = {"full_name", "phone", "profile_pic", "student_id"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return None
    set_clause = ", ".join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [user_id]
    execute_query(f"UPDATE users SET {set_clause}, updated_at = NOW() WHERE id = %s", values, fetch=False)
    return find_user_by_id(user_id)

def get_user_public_profile(user_id: str):
    rows = execute_query(
        """SELECT id, full_name, profile_pic, role, rating_avg, total_ratings, created_at
           FROM users WHERE id = %s AND is_active = TRUE""",
        (user_id,)
    )
    return rows[0] if rows else None

def get_all_users(page=1, per_page=20):
    offset = (page - 1) * per_page
    rows = execute_query(
        "SELECT id, full_name, email, role, is_active, rating_avg, created_at FROM users ORDER BY created_at DESC LIMIT %s OFFSET %s",
        (per_page, offset)
    )
    count = execute_query("SELECT COUNT(*) as total FROM users")
    return rows, count[0]["total"]
