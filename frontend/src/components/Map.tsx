import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import L from 'leaflet';

// Fix leafet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapBounds({ route }: { route: any }) {
  const map = useMap();
  useEffect(() => {
    if (route && route.length > 0) {
      const bounds = L.latLngBounds(route.map((p: any) => [p[1], p[0]]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [route, map]);
  return null;
}

export default function MapView({ trip }: { trip: any }) {
  const routeGeom = trip?.route_geometry ? JSON.parse(trip.route_geometry) : null;
  
  // Format coordinate for leaflet: [lat, lng] while ORS returns [lng, lat]
  const positions = routeGeom ? routeGeom.map((p: number[]) => [p[1], p[0]]) : [];

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={[39.8283, -98.5795]}
        zoom={4}
        style={{ width: '100%', height: '100%' }}
        className="z-0"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        {positions.length > 0 && (
          <>
            <Polyline positions={positions} color="#3b82f6" weight={4} opacity={0.9} />
            <MapBounds route={routeGeom} />
          </>
        )}

        {trip?.stops?.map((stop: any, idx: number) => {
          if (stop.stop_type === 'PICKUP' && positions.length > 0) {
            return (
              <Marker key={idx} position={positions[0]}>
                <Popup className="font-sans">
                  <strong className="text-blue-600">Pickup</strong><br />
                  {stop.location}
                </Popup>
              </Marker>
            );
          }
          if (stop.stop_type === 'DROPOFF' && positions.length > 0) {
            return (
              <Marker key={idx} position={positions[positions.length - 1]}>
                <Popup className="font-sans">
                  <strong className="text-emerald-600">Dropoff</strong><br />
                  {stop.location}
                </Popup>
              </Marker>
            );
          }
          return null;
        })}
      </MapContainer>

      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_80px_rgba(0,0,0,0.4)] z-10" />
    </div>
  );
}
