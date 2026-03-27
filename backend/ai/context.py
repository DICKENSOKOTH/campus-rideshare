"""
AI Context Builder - Builds context from the database for AI prompts.

SECURITY: All data is sanitized before being sent to Gemini.
Personal information (names, phones, emails) is NEVER included.
"""
from datetime import datetime
from typing import Dict, Any, List
from backend.database.database import get_all_active_rides, get_platform_statistics


def get_current_date() -> str:
    """Get current date formatted for system prompt."""
    now = datetime.now()
    return now.strftime("%A, %B %d, %Y")


def format_time_ampm(time_str: str) -> str:
    """Convert 24-hour time string to 12-hour AM/PM format."""
    try:
        hours, minutes = time_str.split(':')
        hour = int(hours)
        ampm = 'PM' if hour >= 12 else 'AM'
        display_hour = hour % 12 or 12
        return f"{display_hour}:{minutes} {ampm}"
    except (ValueError, AttributeError):
        return time_str


def sanitize_ride_for_prompt(ride: Dict[str, Any]) -> str:
    """
    Create a SANITIZED ride summary for the system prompt.

    SECURITY: Intentionally EXCLUDES driver names, phones, emails,
    license plates, and any PII. Only includes ride IDs, routes,
    dates, times, prices, and seat counts.
    """
    vehicle_type = ride.get('vehicle_type', 'vehicle')
    if not vehicle_type:
        vehicle_type = 'vehicle'

    formatted_time = format_time_ampm(ride['departure_time'])

    return (
        f"Ride #{ride['id']}: {ride['origin']} to {ride['destination']}, "
        f"{ride['departure_date']} at {formatted_time}, "
        f"KSh {int(ride['price_per_seat'])}/seat, "
        f"{ride['available_seats']} seats available"
    )


def build_rides_context() -> Dict[str, Any]:
    """
    Build the rides context data for the system prompt.

    Returns dict with: active_rides, rides_section, origins, destinations, stats
    """
    active_rides = get_all_active_rides()
    stats = get_platform_statistics()

    if active_rides:
        rides_list = "\n".join([
            sanitize_ride_for_prompt(ride) for ride in active_rides
        ])
        rides_section = f"AVAILABLE RIDES:\n{rides_list}"
    else:
        rides_section = "AVAILABLE RIDES:\nNo rides currently available."

    destinations = list(set([r['destination'] for r in active_rides])) if active_rides else []
    origins = list(set([r['origin'] for r in active_rides])) if active_rides else []

    return {
        'active_rides': active_rides,
        'rides_section': rides_section,
        'origins': ', '.join(origins[:8]) if origins else 'None',
        'destinations': ', '.join(destinations[:8]) if destinations else 'None',
        'stats': stats,
    }
