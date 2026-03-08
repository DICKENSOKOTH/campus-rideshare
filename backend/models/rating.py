"""
backend/models/rating.py
-------------------------
Rating model: 5-star rating system for drivers and passengers.
"""

from backend.database.database import execute_query

def create_rating(booking_id, rater_id, rated_id, score, comment=None):
    execute_query(
        "INSERT INTO ratings (booking_id, rater_id, rated_id, score, comment) VALUES (%s,%s,%s,%s,%s)",
        (booking_id, rater_id, rated_id, score, comment), fetch=False
    )
    # Recalculate average rating for rated user
    execute_query(
        """UPDATE users SET
           rating_avg = (SELECT AVG(score) FROM ratings WHERE rated_id = %s),
           total_ratings = (SELECT COUNT(*) FROM ratings WHERE rated_id = %s)
           WHERE id = %s""",
        (rated_id, rated_id, rated_id), fetch=False
    )

def get_user_ratings(user_id):
    return execute_query(
        """SELECT r.*, u.full_name as rater_name, u.profile_pic as rater_pic
           FROM ratings r JOIN users u ON r.rater_id = u.id
           WHERE r.rated_id = %s ORDER BY r.created_at DESC LIMIT 20""",
        (user_id,)
    )
