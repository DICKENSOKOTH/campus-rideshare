"""
backend/models/booking.py
--------------------------
Booking model: handles seat reservation logic.
Column names match schema.sql: rider_id, booked_at, etc.
"""

from backend.database.database import execute_query

def create_booking(ride_id, passenger_id, seats_booked=1, pickup_location=None):
    # Insert booking (schema column is rider_id)
    execute_query(
        """INSERT INTO bookings (ride_id, rider_id, seats_booked, status)
           VALUES (%s, %s, %s, 'confirmed')""",
        (ride_id, passenger_id, seats_booked), fetch=False
    )
    # Decrement seats_remaining on ride
    execute_query(
        "UPDATE rides SET seats_remaining = seats_remaining - %s, updated_at = NOW() WHERE id = %s",
        (seats_booked, ride_id), fetch=False
    )
    rows = execute_query(
        "SELECT * FROM bookings WHERE ride_id=%s AND rider_id=%s ORDER BY booked_at DESC LIMIT 1",
        (ride_id, passenger_id)
    )
    return rows[0] if rows else None

def get_user_bookings(user_id):
    return execute_query(
        """SELECT b.*, r.origin, r.destination, r.departure_time, r.price_per_seat,
                  r.driver_id, u.full_name as driver_name, u.phone as driver_phone,
                  CASE WHEN rat.id IS NOT NULL THEN 1 ELSE 0 END as has_rating
           FROM bookings b
           JOIN rides r ON b.ride_id = r.id
           JOIN users u ON r.driver_id = u.id
           LEFT JOIN ratings rat ON rat.booking_id = b.id
           WHERE b.rider_id = %s
           ORDER BY r.departure_time DESC""",
        (user_id,)
    )

def get_booking_by_id(booking_id):
    rows = execute_query("SELECT * FROM bookings WHERE id=%s", (booking_id,))
    return rows[0] if rows else None

def cancel_booking(booking_id, passenger_id):
    booking = get_booking_by_id(booking_id)
    if not booking or str(booking["rider_id"]) != str(passenger_id):
        return False
    execute_query(
        "UPDATE bookings SET status='cancelled', updated_at=NOW() WHERE id=%s",
        (booking_id,), fetch=False
    )
    # Restore seats on ride
    execute_query(
        "UPDATE rides SET seats_remaining = seats_remaining + %s, updated_at = NOW() WHERE id=%s",
        (booking["seats_booked"], booking["ride_id"]), fetch=False
    )
    return True

def check_existing_booking(ride_id, passenger_id):
    rows = execute_query(
        "SELECT * FROM bookings WHERE ride_id=%s AND rider_id=%s AND status != 'cancelled'",
        (ride_id, passenger_id)
    )
    return rows[0] if rows else None

def get_ride_passengers(ride_id):
    return execute_query(
        """SELECT b.*, u.full_name, u.phone, u.avatar_url
           FROM bookings b JOIN users u ON b.rider_id = u.id
           WHERE b.ride_id = %s AND b.status != 'cancelled'""",
        (ride_id,)
    )
