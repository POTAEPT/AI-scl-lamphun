import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import styles from '../styles/MapView.module.css';

// --- Configuration ---
const createCustomIcon = (status: StationData['status']) => {
  let colorClass = styles.markerNormal;
  if (status === 'critical') colorClass = styles.markerCritical;
  else if (status === 'warning') colorClass = styles.markerWarning;
  else if (status === 'offline') colorClass = styles.markerOffline;

  const html = `
    <div class="${styles.markerContainer}">
      <div class="${styles.markerDot} ${colorClass}"></div>
      ${status === 'critical' || status === 'warning' ? `<div class="${styles.markerPulse} ${colorClass}"></div>` : ''}
    </div>
  `;

  return L.divIcon({
    html,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

const DEFAULT_CENTER: [number, number] = [18.598899,99.031880];

export interface StationData {
  id: string | number;
  name: string;
  lat: number;
  lng: number;
  status: 'critical' | 'warning' | 'normal' | 'offline';
  waterLevel?: number | string;
}

interface MapViewProps {
  stations: StationData[];
  selectedStationId?: string;
  onStationClick?: (id: string) => void;
}



// --- Helper Component ---
const FlyToStation = ({ selectedId, stations }: { selectedId?: string, stations: StationData[] }) => {
  const map = useMap();
  useEffect(() => {
    if (selectedId) {
      const target = stations.find(s => s.id === selectedId);
      if (target) {
        map.flyTo([target.lat, target.lng], 16, { animate: true, duration: 1.5 });
      }
    } else if (stations.length > 0) {
      const bounds = L.latLngBounds(stations.map(s => [s.lat, s.lng]));
      map.flyToBounds(bounds, { animate: true, duration: 1.5, padding: [50, 50] });
    }
  }, [selectedId, stations, map]);
  return null;
};

// --- Main Component ---
function MapView({ stations = [], selectedStationId, onStationClick }: MapViewProps) {
  
  /* const handleViewDetails = (id: string | number) => {
      console.log("Navigating to sensor details:", id);
  }; */

  return (
    <div className={styles.mapContainer}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={10}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }} 
        zoomControl={false} 
      >
        <TileLayer
          attribution='&copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />


        <FlyToStation selectedId={selectedStationId} stations={stations} />
        
        {stations.map((station) => (
          <Marker 
            key={station.id} 
            position={[station.lat, station.lng]} 
            icon={createCustomIcon(station.status)}
            eventHandlers={{
              click: () => onStationClick?.(String(station.id))
            }}
          >
            <Popup minWidth={180}>
              <div className={styles.popupContainer}>
                <h4 className={styles.popupTitle}>{station.name}</h4>
                <div className={styles.popupInfo}>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ color: '#6b7280', fontSize: '12px' }}>ระดับน้ำ:</span><br/>
                    <strong style={{ fontSize: '18px', color: '#111827' }}>
                      {station.waterLevel ?? '-'} ม.
                    </strong>
                  </div>
                  <div className={`${styles.statusBadge} ${
                    station.status === 'critical' ? styles.bgCritical :
                    station.status === 'warning' ? styles.bgWarning :
                    station.status === 'offline' ? styles.bgOffline : styles.bgNormal
                  }`}>
                    {station.status === 'critical' ? 'วิกฤต' :
                     station.status === 'warning' ? 'เฝ้าระวัง' :
                     station.status === 'offline' ? 'ออฟไลน์' : 'ปกติ'}
                  </div>
                </div>

                {/* <button 
                    className={styles.popupButton}
                    onClick={() => handleViewDetails(station.id)}
                >
                    ดูข้อมูลเซนเซอร์
                </button> */}
                
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default MapView;