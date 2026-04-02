// Map Integration - Handles map display and location services

class MapManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.route = null;
        this.currentLocationMarker = null;
        this.geocoder = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the map with Google Maps or Leaflet
     * This is a generic implementation that can work with either library
     */
    initMap(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Map container not found:', containerId);
            return false;
        }

        const defaultOptions = {
            center: options.center || MAP_CONFIG.DEFAULT_CENTER,
            zoom: options.zoom || MAP_CONFIG.DEFAULT_ZOOM,
        };

        // Check if Google Maps is available
        if (typeof google !== 'undefined' && google.maps) {
            this.initGoogleMaps(container, defaultOptions);
        } 
        // Check if Leaflet is available
        else if (typeof L !== 'undefined') {
            this.initLeaflet(container, defaultOptions);
        } 
        else {
            console.warn('No map library available. Loading fallback.');
            this.showMapPlaceholder(container);
            return false;
        }

        this.isInitialized = true;
        return true;
    }

    /**
     * Initialize Google Maps
     */
    initGoogleMaps(container, options) {
        this.map = new google.maps.Map(container, {
            center: options.center,
            zoom: options.zoom,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
        });

        this.geocoder = new google.maps.Geocoder();
        
        console.log('Google Maps initialized');
    }

    /**
     * Initialize Leaflet
     */
    initLeaflet(container, options) {
        this.map = L.map(container).setView(
            [options.center.lat, options.center.lng],
            options.zoom
        );

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        console.log('Leaflet initialized');
    }

    /**
     * Show placeholder when no map library is available
     */
    showMapPlaceholder(container) {
        container.innerHTML = `
            <div class="map-placeholder">
                <div class="map-placeholder-inner">
                    <svg class="icon icon-xl"><use href="assets/icons.svg#icon-map-pin"></use></svg>
                    <p>Map view unavailable</p>
                </div>
            </div>
        `;
    }

    /**
     * Add a marker to the map
     */
    addMarker(position, options = {}) {
        if (!this.isInitialized) return null;

        let marker;

        if (typeof google !== 'undefined' && google.maps) {
            marker = new google.maps.Marker({
                position: position,
                map: this.map,
                title: options.title || '',
                icon: options.icon || null,
            });

            if (options.infoWindow) {
                const infoWindow = new google.maps.InfoWindow({
                    content: options.infoWindow,
                });

                marker.addListener('click', () => {
                    infoWindow.open(this.map, marker);
                });
            }
        } else if (typeof L !== 'undefined') {
            marker = L.marker([position.lat, position.lng])
                .addTo(this.map);

            if (options.title) {
                marker.bindPopup(options.title);
            }
        }

        this.markers.push(marker);
        return marker;
    }

    /**
     * Clear all markers from the map
     */
    clearMarkers() {
        this.markers.forEach(marker => {
            if (typeof google !== 'undefined' && google.maps) {
                marker.setMap(null);
            } else if (typeof L !== 'undefined') {
                marker.remove();
            }
        });
        this.markers = [];
    }

    /**
     * Show route between two points
     */
    async showRoute(origin, destination) {
        if (!this.isInitialized) return;

        // Clear existing route
        this.clearRoute();

        // Add markers for origin and destination
        this.addMarker(origin, {
            title: 'Origin',
            icon: this.createColorMarkerIcon(MAP_CONFIG.MARKER_COLORS.PICKUP),
        });

        this.addMarker(destination, {
            title: 'Destination',
            icon: this.createColorMarkerIcon(MAP_CONFIG.MARKER_COLORS.DROPOFF),
        });

        // Draw route
        if (typeof google !== 'undefined' && google.maps) {
            await this.drawGoogleMapsRoute(origin, destination);
        } else if (typeof L !== 'undefined') {
            this.drawLeafletRoute(origin, destination);
        }

        // Fit map to show both markers
        this.fitToBounds([origin, destination]);
    }

    /**
     * Draw route using Google Maps Directions Service
     */
    async drawGoogleMapsRoute(origin, destination) {
        const directionsService = new google.maps.DirectionsService();
        const directionsRenderer = new google.maps.DirectionsRenderer({
            map: this.map,
            suppressMarkers: true,
        });

        try {
            const result = await directionsService.route({
                origin: origin,
                destination: destination,
                travelMode: google.maps.TravelMode.DRIVING,
            });

            directionsRenderer.setDirections(result);
            this.route = directionsRenderer;
        } catch (error) {
            console.error('Failed to get directions:', error);
            this.drawSimpleLine(origin, destination);
        }
    }

    /**
     * Draw simple line for Leaflet (would need routing service for proper routing)
     */
    drawLeafletRoute(origin, destination) {
        const line = L.polyline([
            [origin.lat, origin.lng],
            [destination.lat, destination.lng]
        ], {
            color: '#2196F3',
            weight: 4,
        }).addTo(this.map);

        this.route = line;
    }

    /**
     * Draw simple line between two points
     */
    drawSimpleLine(origin, destination) {
        if (typeof google !== 'undefined' && google.maps) {
            const line = new google.maps.Polyline({
                path: [origin, destination],
                geodesic: true,
                strokeColor: '#2196F3',
                strokeOpacity: 1.0,
                strokeWeight: 4,
                map: this.map,
            });
            this.route = line;
        } else if (typeof L !== 'undefined') {
            this.drawLeafletRoute(origin, destination);
        }
    }

    /**
     * Clear route from map
     */
    clearRoute() {
        if (this.route) {
            if (typeof google !== 'undefined' && google.maps) {
                this.route.setMap(null);
            } else if (typeof L !== 'undefined') {
                this.route.remove();
            }
            this.route = null;
        }
    }

    /**
     * Fit map bounds to show all specified locations
     */
    fitToBounds(locations) {
        if (!this.isInitialized || locations.length === 0) return;

        if (typeof google !== 'undefined' && google.maps) {
            const bounds = new google.maps.LatLngBounds();
            locations.forEach(loc => bounds.extend(loc));
            this.map.fitBounds(bounds);
        } else if (typeof L !== 'undefined') {
            const bounds = L.latLngBounds(
                locations.map(loc => [loc.lat, loc.lng])
            );
            this.map.fitBounds(bounds);
        }
    }

    /**
     * Get current user location
     */
    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    resolve(location);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                }
            );
        });
    }

    /**
     * Show current location on map
     */
    async showCurrentLocation() {
        try {
            const location = await this.getCurrentLocation();
            
            // Remove previous current location marker
            if (this.currentLocationMarker) {
                if (typeof google !== 'undefined' && google.maps) {
                    this.currentLocationMarker.setMap(null);
                } else if (typeof L !== 'undefined') {
                    this.currentLocationMarker.remove();
                }
            }

            // Add new marker
            this.currentLocationMarker = this.addMarker(location, {
                title: 'Your Location',
                icon: this.createColorMarkerIcon(MAP_CONFIG.MARKER_COLORS.CURRENT),
            });

            // Center map on current location
            this.centerMap(location);

            return location;
        } catch (error) {
            console.error('Failed to get current location:', error);
            showNotification('Could not get your location', 'error');
            return null;
        }
    }

    /**
     * Center map on specific location
     */
    centerMap(location, zoom) {
        if (!this.isInitialized) return;

        if (typeof google !== 'undefined' && google.maps) {
            this.map.setCenter(location);
            if (zoom) this.map.setZoom(zoom);
        } else if (typeof L !== 'undefined') {
            this.map.setView([location.lat, location.lng], zoom || this.map.getZoom());
        }
    }

    /**
     * Geocode address to coordinates
     */
    async geocodeAddress(address) {
        if (!address) {
            console.error('No address provided');
            return null;
        }

        try {
            if (typeof google !== 'undefined' && google.maps && this.geocoder) {
                return new Promise((resolve) => {
                    this.geocoder.geocode({ address: address }, (results, status) => {
                        if (status === 'OK' && results[0]) {
                            const location = {
                                lat: results[0].geometry.location.lat(),
                                lng: results[0].geometry.location.lng(),
                            };
                            resolve(location);
                        } else {
                            console.error('Geocoding failed:', status);
                            resolve(null);
                        }
                    });
                });
            } else {
                // Fallback: use Nominatim (OpenStreetMap)
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
                );
                const data = await response.json();
                
                if (data && data.length > 0) {
                    const location = {
                        lat: parseFloat(data[0].lat),
                        lng: parseFloat(data[0].lon),
                    };
                    return location;
                } else {
                    return null;
                }
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    }

    /**
     * Create colored marker icon
     */
    createColorMarkerIcon(color) {
        if (typeof google !== 'undefined' && google.maps) {
            return {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: color,
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                scale: 8,
            };
        }
        return null;
    }
}

// Create singleton instance
const mapManager = new MapManager();

// Make it globally available
window.mapManager = mapManager;
