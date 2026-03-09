"""
backend/services/ride_service.py
----------------------------------
Business logic for rides: create, search, manage.
"""

from backend.models.ride import create_ride, get_ride_by_id, search_rides, update_ride_status
from backend.models.booking import (create_booking, check_existing_booking,
                                     get_ride_passengers, cancel_booking)

def create_new_ride(driver_id: str, data: dict):
    """Create a ride and return it."""
    return create_ride(
        driver_id=driver_id,
        origin=data["origin"],
        destination=data["destination"],
        departure_time=data["departure_time"],
        available_seats=int(data["available_seats"]),
        price_per_seat=float(data.get("price_per_seat", 0)),
        notes=data.get("notes"),
        origin_lat=data.get("origin_lat"),
        origin_lng=data.get("origin_lng"),
        destination_lat=data.get("destination_lat"),
        destination_lng=data.get("destination_lng")
    )

def book_ride(ride_id: str, passenger_id: str, data: dict):
    """
    Book a seat on a ride.
    Returns (booking, error_string).
    """
    ride = get_ride_by_id(ride_id)
    if not ride:
        return None, "Ride not found"
    if ride["status"] != "scheduled":
        return None, "This ride is no longer available"
    if str(ride["driver_id"]) == passenger_id:
        return None, "You cannot book your own ride"
    if check_existing_booking(ride_id, passenger_id):
        return None, "You already have a booking for this ride"

    seats_requested = int(data.get("seats_booked", 1))
    seats_available = ride.get("seats_remaining", 0)
    if seats_requested > seats_available:
        return None, f"Only {seats_available} seat(s) available"

    booking = create_booking(
        ride_id=ride_id,
        passenger_id=passenger_id,
        seats_booked=seats_requested,
        pickup_location=data.get("pickup_location")
    )
    return booking, None

def cancel_ride(ride_id: str, driver_id: str):
    """Driver cancels their ride."""
    ride = get_ride_by_id(ride_id)
    if not ride:
        return False, "Ride not found"
    if str(ride["driver_id"]) != driver_id:
        return False, "You can only cancel your own rides"
    update_ride_status(ride_id, "cancelled")
    return True, None
