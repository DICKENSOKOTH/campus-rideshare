"""
backend/models/rating.py
-------------------------
Rating model: 5-star rating system for drivers and passengers.
Column names match schema.sql: ratee_id (not rated_id).
"""

from backend.database.database import execute_query

def create_rating(booking_id, rater_id, rated_id, score, comment=None):
    execute_query(
        "INSERT INTO ratings (booking_id, rater_id, ratee_id, score, comment) VALUES (%s,%s,%s,%s,%s)",
        (booking_id, rater_id, rated_id, score, comment), fetch=False
    )

def get_user_ratings(user_id):
    return execute_query(
        """SELECT r.*, u.full_name as rater_name, u.avatar_url as rater_pic
           FROM ratings r JOIN users u ON r.rater_id = u.id
           WHERE r.ratee_id = %s ORDER BY r.created_at DESC LIMIT 20""",
        (user_id,)
    )
