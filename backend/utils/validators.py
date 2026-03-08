"""
RideU - Input Validators
Reusable validation functions used across services and routes.
"""

import re
from datetime import datetime, timezone


# Patterns

EMAIL_RE = re.compile(r'^[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}$')
PHONE_RE = re.compile(r'^\+?[0-9]{9,15}$')
PLATE_RE = re.compile(r'^[A-Z0-9 -]{3,10}$', re.I)


# User validators

def validate_email(email: str) -> str:
    """Return cleaned email or raise ValueError."""
    email = email.strip().lower()
    if not EMAIL_RE.match(email):
        raise ValueError("Invalid email address.")
    return email


def validate_phone(phone: str) -> str:
    """Return cleaned phone or raise ValueError."""
    phone = phone.strip().replace(' ', '')
    if not PHONE_RE.match(phone):
        raise ValueError(
            "Please enter a valid phone number,it should be between 9–15 digits, optionally starting with '+'."
        )
    return phone


def validate_password(password: str) -> str:
    """
    Enforce minimum password rules:
      - At least 8 characters
      - At least one uppercase letter
      - At least one digit
    """
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters.")
    if not re.search(r'[A-Z]', password):
        raise ValueError(
            "Password must contain at least one uppercase letter.")
    if not re.search(r'\d', password):
        raise ValueError("Password must contain at least one digit.")
    return password


def validate_full_name(name: str) -> str:
    name = name.strip()
    if len(name) < 2:
        raise ValueError("Full name must be at least 2 characters.")
    if len(name) > 150:
        raise ValueError("Full name must be under 150 characters.")
    return name


# Ride validators
def validate_seats(seats: int, max_seats: int = 8) -> int:
    try:
        seats = int(seats)
    except (TypeError, ValueError):
        raise ValueError("Seats must be a whole number.")
    if seats < 1 or seats > max_seats:
        raise ValueError(f"Seats must be between 1 and {max_seats}.")
    return seats


def validate_price(price) -> float:
    try:
        price = float(price)
    except (TypeError, ValueError):
        raise ValueError("Price must be a number.")
    if price < 0:
        raise ValueError("Price cannot be negative.")
    return round(price, 2)


def validate_departure_time(dt_value) -> datetime:
    """
    Accept a datetime object or ISO-8601 string.
    Departure must be in the future.
    """
    if isinstance(dt_value, str):
        try:
            dt_value = datetime.fromisoformat(dt_value)
        except ValueError:
            raise ValueError(
                "Departure time must be a valid ISO-8601 datetime string.")
    if not isinstance(dt_value, datetime):
        raise ValueError(
            "Departure time must be a datetime object or ISO-8601 string.")

    if dt_value.tzinfo is None:
        dt_value = dt_value.replace(tzinfo=timezone.utc)

    if dt_value <= datetime.now(tz=timezone.utc):
        raise ValueError("Departure time must be in the future.")
    return dt_value


def validate_coordinates(lat, lng) -> tuple:
    try:
        lat, lng = float(lat), float(lng)
    except (TypeError, ValueError):
        raise ValueError("Latitude and longitude must be numbers.")
    if not (-90 <= lat <= 90):
        raise ValueError("Latitude must be between -90 and 90.")
    if not (-180 <= lng <= 180):
        raise ValueError("Longitude must be between -180 and 180.")
    return lat, lng


# Driver validators

def validate_vehicle_plate(plate: str) -> str:
    plate = plate.strip().upper()
    if not PLATE_RE.match(plate):
        raise ValueError("Invalid vehicle plate format.")
    return plate


def validate_vehicle_year(year) -> int:
    try:
        year = int(year)
    except (TypeError, ValueError):
        raise ValueError("Vehicle year must be a number.")
    current_year = datetime.now().year
    if year < 1990 or year > current_year + 1:
        raise ValueError(
            f"Vehicle year must be between 1990 and {current_year + 1}.")
    return year



# Generic helpers

def validate_required_fields(data: dict, required: list) -> None:
    """Raise ValueError listing any missing fields."""
    missing = [f for f in required if not data.get(f)]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")
