"""
Location Broadcast - Placeholder for real-time location sharing.

Future implementation will support:
- Driver location updates during active rides
- ETA calculations
- Geofencing for pickup/dropoff notifications
"""


class LocationBroadcast:
    """Placeholder for broadcasting driver locations to passengers."""

    def __init__(self, ws_server=None):
        self.ws_server = ws_server

    def update_driver_location(self, ride_id, lat, lng):
        """Update a driver's current location for an active ride."""
        pass

    def get_driver_location(self, ride_id):
        """Get the latest driver location for a ride."""
        return None

    def subscribe_to_ride(self, user_id, ride_id):
        """Subscribe a passenger to location updates for a ride."""
        pass
