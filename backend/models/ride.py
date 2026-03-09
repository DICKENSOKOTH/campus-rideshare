"""
backend/models/ride.py
-----------------------
Ride model: all DB queries for rides table.
Column names match schema.sql: seats_total, seats_remaining, etc.
"""

from backend.database.database import execute_query

def create_ride(driver_id, origin, destination, departure_time, available_seats,
                price_per_seat=0, notes=None, origin_lat=None, origin_lng=None,
                destination_lat=None, destination_lng=None):
    execute_query(
        """INSERT INTO rides
           (driver_id, origin, destination, departure_time, seats_total, seats_remaining,
            price_per_seat, notes, origin_lat, origin_lng, destination_lat, destination_lng)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
        (driver_id, origin, destination, departure_time, available_seats, available_seats,
         price_per_seat, notes, origin_lat, origin_lng, destination_lat, destination_lng),
        fetch=False
    )
    rows = execute_query(
        "SELECT * FROM rides WHERE driver_id=%s ORDER BY created_at DESC LIMIT 1",
        (driver_id,)
    )
    return rows[0] if rows else None

def get_ride_by_id(ride_id):
    rows = execute_query(
        """SELECT r.*, u.full_name as driver_name, u.avatar_url as driver_pic,
                  u.phone as driver_phone
           FROM rides r
           JOIN users u ON r.driver_id = u.id
           WHERE r.id = %s""",
        (ride_id,)
    )
    return rows[0] if rows else None

def search_rides(origin=None, destination=None, date=None, seats=1):
    conditions = ["r.status = 'scheduled'", "r.departure_time > NOW()",
                  "r.seats_remaining >= %s"]
    params = [seats]

    if origin:
        conditions.append("LOWER(r.origin) LIKE LOWER(%s)")
        params.append(f"%{origin}%")
    if destination:
        conditions.append("LOWER(r.destination) LIKE LOWER(%s)")
        params.append(f"%{destination}%")
    if date:
        conditions.append("DATE(r.departure_time) = %s")
        params.append(date)

    where = " AND ".join(conditions)
    return execute_query(
        f"""SELECT r.*, u.full_name as driver_name, u.avatar_url as driver_pic,
                   r.seats_remaining as seats_left
            FROM rides r
            JOIN users u ON r.driver_id = u.id
            WHERE {where}
            ORDER BY r.departure_time ASC
            LIMIT 50""",
        params
    )

def get_driver_rides(driver_id):
    return execute_query(
        """SELECT r.*, r.seats_remaining as seats_left
           FROM rides r WHERE r.driver_id = %s ORDER BY r.departure_time DESC""",
        (driver_id,)
    )

def update_ride_status(ride_id, status):
    execute_query(
        "UPDATE rides SET status=%s, updated_at=NOW() WHERE id=%s",
        (status, ride_id), fetch=False
    )

def get_recent_rides(limit=10):
    return execute_query(
        """SELECT r.*, u.full_name as driver_name,
                  r.seats_remaining as seats_left
           FROM rides r JOIN users u ON r.driver_id=u.id
           WHERE r.status='scheduled' AND r.departure_time > NOW()
           ORDER BY r.created_at DESC LIMIT %s""",
        (limit,)
    )
