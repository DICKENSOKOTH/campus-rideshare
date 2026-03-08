"""
backend/routes/ride_routes.py
-------------------------------
Ride endpoints:
  POST   /api/rides           - Create ride
  GET    /api/rides           - Search rides
  GET    /api/rides/:id       - Get single ride
  DELETE /api/rides/:id       - Cancel ride
  POST   /api/rides/:id/book  - Book a ride
  DELETE /api/rides/booking/:booking_id - Cancel booking
  GET    /api/rides/my        - My rides (as driver)
  GET    /api/rides/bookings  - My bookings (as passenger)
"""

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.services.ride_service import create_new_ride, book_ride, cancel_ride
from backend.services.matching_service import match_rides
from backend.models.ride import get_ride_by_id, get_driver_rides, get_recent_rides
from backend.models.booking import get_user_bookings, cancel_booking, get_ride_passengers
from backend.utils.validators import validate_ride
from backend.utils.response import success_response, error_response

ride_bp = Blueprint("rides", __name__, url_prefix="/api/rides")

@ride_bp.route("", methods=["POST"])
@jwt_required()
def create():
    data = request.get_json()
    errors = validate_ride(data)
    if errors:
        return error_response("Validation failed", 422, errors)
    driver_id = get_jwt_identity()
    ride = create_new_ride(driver_id, data)
    return success_response(ride, "Ride created successfully", 201)

@ride_bp.route("", methods=["GET"])
def search():
    origin = request.args.get("origin")
    destination = request.args.get("destination")
    departure_time = request.args.get("departure_time")
    seats = int(request.args.get("seats", 1))

    if origin or destination:
        rides = match_rides(origin, destination, departure_time, seats)
    else:
        rides = get_recent_rides(20)

    return success_response(rides, f"Found {len(rides)} ride(s)")

@ride_bp.route("/my", methods=["GET"])
@jwt_required()
def my_rides():
    driver_id = get_jwt_identity()
    rides = get_driver_rides(driver_id)
    return success_response(rides)

@ride_bp.route("/bookings", methods=["GET"])
@jwt_required()
def my_bookings():
    user_id = get_jwt_identity()
    bookings = get_user_bookings(user_id)
    return success_response(bookings)

@ride_bp.route("/<ride_id>", methods=["GET"])
def get_ride(ride_id):
    ride = get_ride_by_id(ride_id)
    if not ride:
        return error_response("Ride not found", 404)
    passengers = get_ride_passengers(ride_id)
    ride["passengers"] = passengers
    return success_response(ride)

@ride_bp.route("/<ride_id>", methods=["DELETE"])
@jwt_required()
def cancel(ride_id):
    driver_id = get_jwt_identity()
    success, err = cancel_ride(ride_id, driver_id)
    if not success:
        return error_response(err, 403)
    return success_response(message="Ride cancelled successfully")

@ride_bp.route("/<ride_id>/book", methods=["POST"])
@jwt_required()
def book(ride_id):
    passenger_id = get_jwt_identity()
    data = request.get_json() or {}
    booking, err = book_ride(ride_id, passenger_id, data)
    if err:
        return error_response(err, 400)
    return success_response(booking, "Ride booked successfully!", 201)

@ride_bp.route("/booking/<booking_id>", methods=["DELETE"])
@jwt_required()
def cancel_my_booking(booking_id):
    user_id = get_jwt_identity()
    if cancel_booking(booking_id, user_id):
        return success_response(message="Booking cancelled")
    return error_response("Cannot cancel this booking", 403)
