import requests
from django.conf import settings

def get_route(start_coords, end_coords):
    """
    start_coords: (lng, lat)
    end_coords: (lng, lat)
    Returns a dict with 'distance_miles', 'duration_hours', 'geometry'
    """
    api_key = getattr(settings, 'ORS_API_KEY', None)
    if not api_key or api_key == 'MOCK':
        # Mock response for testing
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
        if data['features']:
            coords = data['features'][0]['geometry']['coordinates']
            return tuple(coords)
    return (0.0, 0.0)
