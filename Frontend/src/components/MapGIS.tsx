import { useState, useEffect, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { DeviceService } from "../service/deviceService";
import styles from "../styles/MapGIS.module.css";

// ---- Custom Map Marker Icons ----
const createIcon = (color: string) =>
  L.divIcon({
    className: styles.customMarker,
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="28" height="38">
      <path fill="${color}" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z"/>
    </svg>`,
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -40],
  });

const icons = {
  normal: createIcon("#10B981"),
  warning: createIcon("#FFAE00"),
  critical: createIcon("#EF4444"),
};

interface MapStation {
  id: string;
  name: string;
  detail: string;
  lat: number;
  lng: number;
  status: "normal" | "warning" | "critical";
  waterLevel: number;
  rainfall: number;
}

// ---- Main Component ----
const MapGIS = () => {
  const [search, setSearch] = useState("");
  const [stations, setStations] = useState<MapStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const stationDevices = await DeviceService.getStations();

        if (stationDevices.length === 0) {
          setStations([]);
          setIsLoading(false);
          return;
        }

        // Group by stationId and take first device's data for map position
        const uniqueStations = new Map<string, MapStation>();
        for (const s of stationDevices) {
          if (!uniqueStations.has(s.stationId)) {
            const lat = parseFloat(s.latitude) || 18.78;
            const lng = parseFloat(s.longitude) || 99.005;

            // Determine status based on water level (mock for now)
            // In real app, you'd fetch the latest water level for each station
            uniqueStations.set(s.stationId, {
              id: s.stationId,
              name: s.stationName || 'Unknown Station',
              detail: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
              lat,
              lng,
              status: "normal", // Could be derived from real water level
              waterLevel: 0,
              rainfall: 0,
            });
          }
        }

        setStations(Array.from(uniqueStations.values()));
      } catch (error) {
        console.error("Error fetching stations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStations();
  }, []);

  const filtered = useMemo(() =>
    stations.filter(
      (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.detail.includes(search),
    ),
    [stations, search],
  );

  const mapCenter: [number, number] = useMemo(() => stations.length > 0
    ? [
        stations.reduce((sum, s) => sum + s.lat, 0) / stations.length,
        stations.reduce((sum, s) => sum + s.lng, 0) / stations.length,
      ]
    : [18.78, 99.005],
    [stations]);

  return (
    <div className={styles.page}>
      {/* Map (full area) */}
      <div className={styles.mapContainer}>
        <MapContainer
          center={mapCenter}
          zoom={14}
          className={styles.mapCanvas}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {filtered.map((s) => (
            <Marker key={s.id} position={[s.lat, s.lng]} icon={icons[s.status]}>
              <Popup className={styles.customPopup} closeButton={false}>
                <div className={styles.popupCard}>
                  <div className={styles.popupTitle}>{s.name}</div>
                  <div className={styles.popupRow}>
                    <span className={styles.popupLabel}>ระดับน้ำ</span>
                  </div>
                  <div className={styles.popupRow}>
                    <span className={styles.popupValue}>
                      {s.waterLevel.toFixed(3)}
                    </span>
                    <span className={styles.popupUnit}>เมตร</span>
                  </div>
                  <div className={styles.popupRow}>
                    <span className={styles.popupLabel}>ปริมาณน้ำฝนสะสม</span>
                  </div>
                  <div className={styles.popupRow}>
                    <span className={styles.popupValue}>
                      {s.rainfall.toFixed(3)}
                    </span>
                    <span className={styles.popupUnit}>มิลลิเมตร/ชั่วโมง</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Right Panel: Search + Station List */}
        <div className={styles.rightPanel}>
          {isLoading ? (
            <div className={styles.stationList}>
              <div style={{ padding: "20px", textAlign: "center" }}>Loading...</div>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className={styles.searchBox}>
                <svg
                  className={styles.searchIcon}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Search"
                  className={styles.searchInput}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Station List */}
              <div className={styles.stationList}>
                {filtered.map((s) => (
                  <div key={s.id} className={styles.stationRow}>
                    <span className={styles.stationName}>{s.name}</span>
                    <span className={styles.stationDetail}>{s.detail}</span>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div style={{ padding: "20px", textAlign: "center" }}>No stations found</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapGIS;
