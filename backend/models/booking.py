"""
backend/models/booking.py
--------------------------
Booking model: handles seat reservation logic.
"""

from backend.database.database import execute_query

def create_booking(ride_id, passenger_id, seats_booked=1, pickup_location=None):
    # Insert booking
    execute_query(
        """INSERT INTO bookings (ride_id, passenger_id, seats_booked, pickup_location, status)
           VALUES (%s, %s, %s, %s, 'confirmed')""",
        (ride_id, passenger_id, seats_booked, pickup_location), fetch=False
    )
    # Increment booked_seats on ride
    execute_query(
        "UPDATE rides SET booked_seats = booked_seats + %s WHERE id = %s",
        (seats_booked, ride_id), fetch=False
    )
    rows = execute_query(
        "SELECT * FROM bookings WHERE ride_id=%s AND passenger_id=%s ORDER BY created_at DESC LIMIT 1",
        (ride_id, passenger_id)
    )
    return rows[0] if rows else None

def get_user_bookings(user_id):
    return execute_query(
        """SELECT b.*, r.origin, r.destination, r.departure_time, r.price_per_seat,
                  u.full_name as driver_name, u.phone as driver_phone
           FROM bookings b
           JOIN rides r ON b.ride_id = r.id
           JOIN users u ON r.driver_id = u.id
           WHERE b.passenger_id = %s
           ORDER BY r.departure_time DESC""",
        (user_id,)
    )

def get_booking_by_id(booking_id):
    rows = execute_query("SELECT * FROM bookings WHERE id=%s", (booking_id,))
    return rows[0] if rows else None

def cancel_booking(booking_id, passenger_id):
    booking = get_booking_by_id(booking_id)
    if not booking or booking["passenger_id"] != passenger_id:
        return False
    execute_query(
        "UPDATE bookings SET status='cancelled', updated_at=NOW() WHERE id=%s",
        (booking_id,), fetch=False
    )
    execute_query(
        "UPDATE rides SET booked_seats = booked_seats - %s WHERE id=%s",
        (booking["seats_booked"], booking["ride_id"]), fetch=False
    )
    return True

def check_existing_booking(ride_id, passenger_id):
    rows = execute_query(
        "SELECT * FROM bookings WHERE ride_id=%s AND passenger_id=%s AND status != 'cancelled'",
        (ride_id, passenger_id)
    )
    return rows[0] if rows else None

def get_ride_passengers(ride_id):
    return execute_query(
        """SELECT b.*, u.full_name, u.phone, u.profile_pic, u.rating_avg
           FROM bookings b JOIN users u ON b.passenger_id = u.id
           WHERE b.ride_id = %s AND b.status != 'cancelled'""",
        (ride_id,)
    )
