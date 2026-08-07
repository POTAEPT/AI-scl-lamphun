import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
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
  normal:   createIcon("#10B981"),
  warning:  createIcon("#FFAE00"),
  critical: createIcon("#EF4444"),
};

// ---- คำนวณสถานะจากระดับน้ำ ----
// critical >= 5.0 ม., warning >= 3.5 ม.
const calcStatus = (value: number): "normal" | "warning" | "critical" => {
  if (value >= 5.0) return "critical";
  if (value >= 3.5) return "warning";
  return "normal";
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

// ---- Auto-zoom ให้แผนที่พอดีกับหมุดทั้งหมด ----
const UpdateMapBounds = ({ stations }: { stations: MapStation[] }) => {
  const map = useMap();
  useEffect(() => {
    if (stations.length === 0) return;
    const bounds = L.latLngBounds(stations.map(s => [s.lat, s.lng]));
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, stations]);
  return null;
};

// ---- StatusSummary ----
const StatusSummary: React.FC<{ stations: MapStation[] }> = ({ stations }) => {
  const counts = useMemo(() => ({
    normal:   stations.filter(s => s.status === "normal").length,
    warning:  stations.filter(s => s.status === "warning").length,
    critical: stations.filter(s => s.status === "critical").length,
  }), [stations]);

  return (
    <div className={styles.statusSummary}>
      <div className={styles.summaryTitle}>สรุปภาพรวม</div>
      <div className={styles.summaryGrid}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryDot} style={{ background: "#10B981" }} />
          <span className={styles.summaryLabel}>ปกติ</span>
          <span className={styles.summaryCount} style={{ color: "#10B981" }}>{counts.normal}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryDot} style={{ background: "#FFAE00" }} />
          <span className={styles.summaryLabel}>เฝ้าระวัง</span>
          <span className={styles.summaryCount} style={{ color: "#FFAE00" }}>{counts.warning}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryDot} style={{ background: "#EF4444" }} />
          <span className={styles.summaryLabel}>วิกฤต</span>
          <span className={styles.summaryCount} style={{ color: "#EF4444" }}>{counts.critical}</span>
        </div>
      </div>
    </div>
  );
};

// ---- Map Legend ----
const MapLegend: React.FC = () => (
  <div className={styles.mapLegend}>
    {[
      { color: "#10B981", label: "ปกติ" },
      { color: "#FFAE00", label: "เฝ้าระวัง" },
      { color: "#EF4444", label: "วิกฤต" },
    ].map(({ color, label }) => (
      <div key={label} className={styles.legendItem}>
        <svg width="14" height="20" viewBox="0 0 384 512">
          <path fill={color} d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z"/>
        </svg>
        <span className={styles.legendText}>{label}</span>
      </div>
    ))}
  </div>
);

// ---- Main Component ----
const MapGIS = () => {
  const [search, setSearch]       = useState("");
  const [stations, setStations]   = useState<MapStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStations = async () => {
      try {
        // ใช้ getLatestStations() เพื่อให้ได้ monitorValue พร้อมคำนวณ status ได้จริง
        const latestData = await DeviceService.getLatestStations();

        if (latestData.length === 0) {
          setStations([]);
          setIsLoading(false);
          return;
        }

        const uniqueStations = new Map<string, MapStation>();
        for (const s of latestData) {
          if (!uniqueStations.has(s.stationId)) {
            const lat        = parseFloat(s.latitude)     || 18.78;
            const lng        = parseFloat(s.longitude)    || 99.005;
            const waterLevel = parseFloat(s.monitorValue) || 0;

            uniqueStations.set(s.stationId, {
              id:         s.stationId,
              name:       s.stationName || "Unknown Station",
              detail:     `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
              lat,
              lng,
              status:     calcStatus(waterLevel),
              waterLevel,
              rainfall:   0,
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

  const filtered = useMemo(
    () => stations.filter(
      s => s.name.toLowerCase().includes(search.toLowerCase()) || s.detail.includes(search),
    ),
    [stations, search],
  );

  // center เริ่มต้น — UpdateMapBounds จะ override ให้อัตโนมัติ
  const mapCenter: [number, number] = [18.63, 99.02];

  return (
    <div className={styles.page}>
      <div className={styles.mapContainer}>
        <MapContainer
          center={mapCenter}
          zoom={12}
          className={styles.mapCanvas}
          zoomControl={false}
        >
          {/* Auto-zoom ให้พอดีกับหมุด 5 สถานี */}
          <UpdateMapBounds stations={stations} />

          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {filtered.map((s) => (
            <Marker key={s.id} position={[s.lat, s.lng]} icon={icons[s.status]}>
              <Popup className={styles.customPopup} closeButton={false}>
                <div className={styles.popupCard} style={{
                  borderLeftColor:
                    s.status === "critical" ? "#EF4444" :
                    s.status === "warning"  ? "#FFAE00" : "#10B981",
                }}>
                  <div className={styles.popupTitle}>{s.name}</div>
                  <div className={styles.popupRow}>
                    <span className={styles.popupLabel}>ระดับน้ำ</span>
                  </div>
                  <div className={styles.popupRow}>
                    <span className={styles.popupValue} style={{
                      color:
                        s.status === "critical" ? "#EF4444" :
                        s.status === "warning"  ? "#FFAE00" : "#10B981",
                    }}>
                      {s.waterLevel.toFixed(3)}
                    </span>
                    <span className={styles.popupUnit}>เมตร</span>
                  </div>
                  <div className={styles.popupRow}>
                    <span className={styles.popupLabel}>สถานะ</span>
                  </div>
                  <div className={styles.popupRow}>
                    <span className={styles.popupValue} style={{
                      fontSize: 13,
                      color:
                        s.status === "critical" ? "#EF4444" :
                        s.status === "warning"  ? "#FFAE00" : "#10B981",
                    }}>
                      {s.status === "critical" ? "วิกฤต" :
                       s.status === "warning"  ? "เฝ้าระวัง" : "ปกติ"}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Legend มุมล่างซ้าย */}
        <MapLegend />

        {/* Right Panel */}
        <div className={styles.rightPanel}>
          {isLoading ? (
            <div className={styles.stationList}>
              <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>
                กำลังโหลด...
              </div>
            </div>
          ) : (
            <>
              {/* สรุปภาพรวม */}
              <StatusSummary stations={stations} />

              {/* ช่องค้นหา */}
              <div className={styles.searchBox}>
                <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="ค้นหาสถานี..."
                  className={styles.searchInput}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* รายชื่อสถานี */}
              <div className={styles.stationList}>
                {filtered.map((s) => (
                  <div key={s.id} className={styles.stationRow}>
                    <span
                      className={styles.statusDot}
                      style={{
                        background:
                          s.status === "critical" ? "#EF4444" :
                          s.status === "warning"  ? "#FFAE00" : "#10B981",
                      }}
                    />
                    <span className={styles.stationName}>{s.name}</span>
                    <span className={styles.stationDetail}>{s.waterLevel.toFixed(2)} ม.</span>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>
                    ไม่พบสถานี
                  </div>
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