"""
backend/services/matching_service.py
--------------------------------------
Smart ride matching: finds the best rides for a passenger.
Uses distance scoring + seat availability + time proximity.
"""

from datetime import datetime
from backend.models.ride import search_rides

def match_rides(origin: str, destination: str, departure_time: str = None, seats: int = 1):
    """
    Find and score rides matching the request.
    Returns rides sorted by best match score.
    """
    date = None
    if departure_time:
        try:
            dt = datetime.fromisoformat(departure_time.replace("Z", "+00:00"))
            date = dt.date().isoformat()
        except ValueError:
            pass

    rides = search_rides(origin=origin, destination=destination, date=date, seats=seats)

    # Score each ride (higher = better match)
    for ride in rides:
        score = 0
        # Prefer rides with more available seats (more reliable driver)
        seats_left = ride.get("seats_left", 0)
        score += min(seats_left, 4) * 5
        # Prefer free or cheap rides
        price = float(ride.get("price_per_seat") or 0)
        score -= price * 0.5
        ride["match_score"] = round(score, 2)

    return sorted(rides, key=lambda r: r["match_score"], reverse=True)
