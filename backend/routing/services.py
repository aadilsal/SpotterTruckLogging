import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class RoutingUnavailable(Exception):
    """Raised when real routing data cannot be produced.

    Better to fail than to hand back canned distances: the whole product is a
    compliance verdict, and a verdict computed from invented mileage is worse
    than no verdict at all.
    """


def _mock_allowed() -> bool:
    """Mock data is only ever acceptable in DEBUG or when explicitly opted into."""
    api_key = getattr(settings, 'ORS_API_KEY', None)
    if api_key == 'MOCK':
        return True
    return bool(getattr(settings, 'DEBUG', False)) or bool(
        getattr(settings, 'ALLOW_MOCK_ROUTING', False)
    )


def _require_mock_or_fail(what: str):
    if not _mock_allowed():
        raise RoutingUnavailable(
            f'Routing provider is not configured, so {what} cannot be calculated. '
            'Set ORS_API_KEY on the server.'
        )
    logger.warning(
        'ORS_API_KEY is not set — returning MOCK %s. Distances, drive times and '
        'the resulting HOS compliance verdict are NOT real.', what
    )


def get_route(start_coords, end_coords):
    """
    start_coords: (lng, lat)
    end_coords: (lng, lat)
    Returns a dict with 'distance_miles', 'duration_hours', 'geometry'
    """
    api_key = getattr(settings, 'ORS_API_KEY', None)
    if not api_key or api_key == 'MOCK':
        _require_mock_or_fail('route distance')
        return {
            'distance_miles': 1800,
            'duration_hours': 28.5,
            'geometry': [[start_coords[0], start_coords[1]], [end_coords[0], end_coords[1]]]
        }

    url = 'https://api.openrouteservice.org/v2/directions/driving-hgv'
    headers = {
        'Authorization': api_key,
        'Content-Type': 'application/json'
    }
    body = {
        'coordinates': [list(start_coords), list(end_coords)],
        'instructions': False
    }

    response = requests.post(url, json=body, headers=headers)
    if response.status_code == 200:
        data = response.json()
        summary = data['routes'][0]['summary']
        geometry = data['routes'][0]['geometry']
        
        # distance is in meters, duration in seconds
        distance_miles = summary['distance'] * 0.000621371
        duration_hours = summary['duration'] / 3600.0
        # Decode polyline string to list of [lat, lng]
        import polyline
        # polyline.decode returns (lat, lng), we want [lng, lat] to be consistent with our GeoJSON-like expectation
        decoded_coords = polyline.decode(geometry)
        geom_lng_lat = [[lng, lat] for lat, lng in decoded_coords]

        return {
            'distance_miles': distance_miles,
            'duration_hours': duration_hours,
            'geometry': geom_lng_lat
        }
    else:
        raise Exception(f"ORS API Error: {response.text}")

def geocode(address):
    api_key = getattr(settings, 'ORS_API_KEY', None)
    if not api_key or api_key == 'MOCK':
        _require_mock_or_fail(f'coordinates for {address!r}')
        # Mock coordinates
        if 'Dallas' in address: return (-96.7970, 32.7767)
        if 'Chicago' in address: return (-87.6298, 41.8781)
        if 'Los Angeles' in address: return (-118.2437, 34.0522)
        return (-90.0, 35.0)

    url = 'https://api.openrouteservice.org/geocode/search'
    headers = {
        'Authorization': api_key
    }
    params = {'text': address, 'size': 1}
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        data = response.json()
        if data.get('features'):
            coords = data['features'][0]['geometry']['coordinates']
            return tuple(coords)
        raise RoutingUnavailable(
            f'Could not find a location matching "{address}". '
            'Try a more specific "City, State" value.'
        )
    raise RoutingUnavailable(
        f'Geocoding failed for "{address}" (provider returned {response.status_code}).'
    )
