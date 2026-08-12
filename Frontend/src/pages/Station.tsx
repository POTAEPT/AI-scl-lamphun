import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import MapView from '../components/MapView';
import type { StationData as MapStationData } from '../components/MapView';
import {
  DeviceService,
  type DeviceInfoResponse,
  type DeviceRangeData,
  type StationLatestInfo,
} from '../service/deviceService';
import { useAuth } from '../contexts/AuthContext';
import styles from '../styles/StationPage.module.css';

// ---- Types ----
interface ChartDataPoint {
  time: string;
  water: number | null;
  rain:  number | null;
}

// ---- Time Range Options (ลำดับที่ 6) ----
type TimeRange = '6h' | '12h' | '24h' | '7d';

const TIME_RANGE_OPTIONS: { label: string; value: TimeRange; ms: number }[] = [
  { label: '6 ชม.',  value: '6h',  ms: 6  * 60 * 60 * 1000 },
  { label: '12 ชม.', value: '12h', ms: 12 * 60 * 60 * 1000 },
  { label: '24 ชม.', value: '24h', ms: 24 * 60 * 60 * 1000 },
  { label: '7 วัน',  value: '7d',  ms: 7  * 24 * 60 * 60 * 1000 },
];

// ---- Helper: แปลงข้อมูลสองชุดมารวมกัน ----
const mergeChartData = (
  waterData: DeviceRangeData[],
  rainData:  DeviceRangeData[],
  rangeMs:   number,
): ChartDataPoint[] => {
  const now    = Date.now();
  const cutoff = now - rangeMs;

  const format = (iso: string) =>
    new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  const map = new Map<string, ChartDataPoint>();

  for (const item of waterData) {
    const ts = new Date(item.monitorTime).getTime();
    if (ts < cutoff) continue;
    const key = format(item.monitorTime);
    const existing = map.get(key) ?? { time: key, water: null, rain: null };
    existing.water = parseFloat(parseFloat(item.monitorValue).toFixed(3));
    map.set(key, existing);
  }

  for (const item of rainData) {
    const ts = new Date(item.monitorTime).getTime();
    if (ts < cutoff) continue;
    const key = format(item.monitorTime);
    const existing = map.get(key) ?? { time: key, water: null, rain: null };
    existing.rain = parseFloat(parseFloat(item.monitorValue).toFixed(3));
    map.set(key, existing);
  }

  return Array.from(map.values()).sort((a, b) => a.time.localeCompare(b.time));
};

// ---- Helper: คำนวณ Status ----
const getWaterStatusClass = (waterLevel: number, styles: Record<string, string>): string => {
  if (waterLevel >= 5.0) return styles.statusCritical;
  if (waterLevel >= 4.5) return styles.statusWarning;
  return styles.statusNormal;
};

// ---- Custom Tooltip ----
const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(30,41,59,0.97)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10,
      padding: '10px 14px',
      fontSize: 13,
    }}>
      <div style={{ color: '#94a3b8', marginBottom: 6, fontSize: 11 }}>{label} น.</div>
      {payload.map((entry, i) => (
        <div key={i} style={{ color: entry.color, fontWeight: 600, marginBottom: 2 }}>
          {entry.name}: {entry.value != null ? Number(entry.value).toFixed(3) : '-'}
        </div>
      ))}
    </div>
  );
};

// ---- Main Component ----
const StationPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const urlStationId = searchParams.get('id');

  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedRange, setSelectedRange] = useState<TimeRange>('24h'); // ลำดับที่ 6

  const [stationInfo,    setStationInfo]    = useState<DeviceInfoResponse | null>(null);
  const [latestStations, setLatestStations] = useState<StationLatestInfo[]>([]);
  const [waterHistory,   setWaterHistory]   = useState<DeviceRangeData[]>([]);
  const [rainHistory,    setRainHistory]    = useState<DeviceRangeData[]>([]);

  const [isLoading,    setIsLoading]    = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showWaterGraph, setShowWaterGraph] = useState(true);
  const [showRainGraph, setShowRainGraph] = useState(true);

  // Default to null if no url param, so the map shows overview initially
  const [activeStationId, setActiveStationId] = useState<string | null>(urlStationId);

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const latestData = await DeviceService.getLatestStations();
        if (latestData.length === 0) return;
        setLatestStations(latestData);

        // Removed setting 'stations' as it is no longer needed
        
        // Only set activeStationId if explicitly requested via URL
        if (urlStationId) {
          setActiveStationId(urlStationId);
        } else {
          // If no station is active, stop loading here so the map can render
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching stations:', error);
      }
    };
    fetchLatest();
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!activeStationId || latestStations.length === 0) {
        setIsLoading(false);
        return;
      }
      setErrorMessage(null);
      setWaterHistory([]);
      setRainHistory([]);
      try {
        const secretKey = import.meta.env.VITE_API_deviceSecretKey || 'MOCK_KEY';
        const endTime   = Date.now();
        const startTime = endTime - 7 * 24 * 60 * 60 * 1000;

        const devicesForStation = latestStations.filter(d => d.stationId === activeStationId);
        if (devicesForStation.length === 0) {
          setIsLoading(false);
          return;
        }

        setStationInfo({
          monitorName:    devicesForStation[0].monitorItem,
          customName:     devicesForStation[0].stationName,
          warningLevel:   0,
          deviceLocation: {
            latitude:  devicesForStation[0].latitude,
            longitude: devicesForStation[0].longitude,
          },
        });

        const waterData: DeviceRangeData[] = [];
        const rainData:  DeviceRangeData[] = [];

        await Promise.all(
          devicesForStation.map(async (device) => {
            const data = await DeviceService.getHistory(
              device.deviceId, secretKey, device.monitorItem, startTime, endTime
            );
            const lower = device.monitorItem.toLowerCase();
            if (lower.includes('water') || lower.includes('nw_')) {
              waterData.push(...data);
            } else {
              rainData.push(...data);
            }
          })
        );
        setWaterHistory(waterData);
        setRainHistory(rainData);
      } catch (error) {
        console.error('Error:', error);
        setErrorMessage('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่');
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [activeStationId, latestStations]);

  // แปลงข้อมูลกราฟ — รวม 2 เส้น + กรองตาม timeRange (ลำดับที่ 5 + 6)
  const rangeMs = useMemo(
    () => TIME_RANGE_OPTIONS.find(o => o.value === selectedRange)?.ms ?? 24 * 3600 * 1000,
    [selectedRange]
  );

  const chartData = useMemo(
    () => mergeChartData(waterHistory, rainHistory, rangeMs),
    [waterHistory, rainHistory, rangeMs]
  );

  // warningLevel จาก API (ถ้ามี)
  const warningLevel = stationInfo?.warningLevel ?? 0;

  const mapStations: MapStationData[] = useMemo(() => {
    const savedLevelsStr = localStorage.getItem('mock_warning_levels');
    const savedLevels = savedLevelsStr ? JSON.parse(savedLevelsStr) : {};
    
    const unique = new Map<string, MapStationData>();
    for (const s of latestStations) {
      if (!unique.has(s.stationId)) {
        // หาค่าระดับน้ำถ้ามี
        const isWater = s.monitorItem.toLowerCase().includes('water') || s.monitorItem.toLowerCase().includes('nw_');
        let status: 'critical' | 'warning' | 'normal' | 'offline' = 'normal';
        let waterLevel: number | undefined = undefined;

        if (isWater) {
          const val = parseFloat(s.monitorValue) || 0;
          waterLevel = val;
          const wLevel = savedLevels[s.stationId] ?? 4.5;
          const cLevel = wLevel * 1.1;

          if (val >= cLevel) status = 'critical';
          else if (val >= wLevel) status = 'warning';
          // (ถ้าอยากทำ offline ค่อยเช็คจากเวลาอัปเดตล่าสุด)
        }

        unique.set(s.stationId, {
          id:     s.stationId,
          name:   s.stationName || 'Unknown Station',
          lat:    parseFloat(s.latitude)  || 18.575,
          lng:    parseFloat(s.longitude) || 99.008,
          status,
          waterLevel: waterLevel !== undefined ? waterLevel.toFixed(2) : undefined
        });
      }
    }
    return Array.from(unique.values());
  }, [latestStations]);

  const filteredMapStations = useMemo(() => {
    if (!searchKeyword.trim()) return mapStations;
    const kw = searchKeyword.toLowerCase();
    return mapStations.filter(s => s.name.toLowerCase().includes(kw));
  }, [mapStations, searchKeyword]);

  const latestWaterValue = useMemo(() => {
    const d = latestStations.find(s => s.stationId === activeStationId && (s.monitorItem.toLowerCase().includes('nw_') || s.monitorItem.toLowerCase().includes('water')));
    return d?.monitorValue ? parseFloat(d.monitorValue).toFixed(3) : '-';
  }, [latestStations, activeStationId]);

  const latestRainValue = useMemo(() => {
    const d = latestStations.find(s => s.stationId === activeStationId && (s.monitorItem.toLowerCase().includes('yl_') || s.monitorItem.toLowerCase().includes('rain')));
    return d?.monitorValue ? parseFloat(d.monitorValue).toFixed(3) : '-';
  }, [latestStations, activeStationId]);

  const latestReportTimeObj = useMemo(() => {
    const d = latestStations.find(s => s.stationId === activeStationId && (s.monitorItem.toLowerCase().includes('nw_') || s.monitorItem.toLowerCase().includes('water')));
    if (!d?.monitorTime) return null;
    return new Date(d.monitorTime);
  }, [latestStations, activeStationId]);

  const latestReportTime = latestReportTimeObj 
    ? latestReportTimeObj.toLocaleString('th-TH', { 
        year: 'numeric', month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      }) 
    : '';

  const latestSignal = useMemo(() => {
    const d = latestStations.find(s => s.stationId === activeStationId && (s.monitorItem.toLowerCase().includes('nw_') || s.monitorItem.toLowerCase().includes('water')));
    return d?.signal || 'offline';
  }, [latestStations, activeStationId]);

  const latestBattery = useMemo(() => {
    const d = latestStations.find(s => s.stationId === activeStationId && (s.monitorItem.toLowerCase().includes('nw_') || s.monitorItem.toLowerCase().includes('water')));
    return Number(d?.battery ?? 0);
  }, [latestStations, activeStationId]);

  // Y domain คำนวณอัตโนมัติพร้อม threshold
  const waterYMax = useMemo(() => {
    const vals = chartData.map(d => d.water ?? 0);
    const dataMax = Math.max(...vals, warningLevel * 1.1, 1);
    return Math.ceil(dataMax * 1.1);
  }, [chartData, warningLevel]);

  const rainYMax = useMemo(() => {
    const vals = chartData.map(d => d.rain ?? 0);
    return Math.ceil(Math.max(...vals, 1) * 1.15);
  }, [chartData]);

  const handleExportCSV = () => {
    const headers = ["Time,Water Level (m),Rainfall (mm)"];
    const rows = chartData.map(row => `${row.time},${row.water ?? 0},${row.rain ?? 0}`);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `station_${activeStationId}_history.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) return <div className={styles.page}><div className={styles.emptyMessage}>กำลังโหลดข้อมูล...</div></div>;
  if (errorMessage) return <div className={styles.page}><div className={styles.emptyMessage}>{errorMessage}</div></div>;

  return (
    <div className={styles.page}>

      {/* ส่วนที่ 1: แผนที่ + Panel */}
      <div className={styles.topSection}>
        <div className={styles.mapWrapper}>
          <MapView 
            stations={mapStations} 
            selectedStationId={activeStationId ?? undefined} 
            onStationClick={setActiveStationId} 
          />
        </div>

        <div className={styles.searchPanel}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div className={styles.searchBarWrapper}>
              <i className={`bi bi-search ${styles.searchIcon}`}></i>
              <input
                type="text"
                placeholder="ค้นหาสถานี..."
                className={styles.searchInput}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>
            {activeStationId && (
              <button 
                onClick={() => setActiveStationId(null)}
                style={{
                  padding: '0 16px',
                  backgroundColor: '#3b4a5e',
                  border: 'none',
                  borderRadius: '100px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4b5b71'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b4a5e'}
              >
                ดูหน้าทั้งหมด
              </button>
            )}
          </div>

          <div className={styles.panelTableHeader}>
            <span className={styles.panelColName}>ชื่อสถานี</span>
            <span className={styles.panelColDetail}>สถานะ (ระดับน้ำ)</span>
          </div>

          <div className={styles.panelStationList}>
            {filteredMapStations.length > 0 ? (
              filteredMapStations.map((station) => (
                <div 
                  key={station.id} 
                  className={`${styles.panelStationRow} ${activeStationId === station.id ? styles.active : ''}`}
                  onClick={() => setActiveStationId(String(station.id))}
                  style={{ cursor: 'pointer', background: activeStationId === station.id ? 'var(--color-bg-surface)' : 'transparent' }}
                >
                  <span className={styles.panelStationName}>{station.name}</span>
                  <span className={styles.panelStationLocation} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      backgroundColor: station.status === 'critical' ? '#ef4444' : station.status === 'warning' ? '#f59e0b' : station.status === 'offline' ? '#94a3b8' : '#10b981',
                      boxShadow: station.status === 'critical' || station.status === 'warning' ? `0 0 8px ${station.status === 'critical' ? '#ef4444' : '#f59e0b'}` : 'none'
                    }}></div>
                    <span style={{ 
                      color: station.status === 'critical' ? '#ef4444' : station.status === 'warning' ? '#f59e0b' : station.status === 'offline' ? '#94a3b8' : '#10b981',
                      fontSize: '13px'
                    }}>
                      {station.status === 'critical' ? 'วิกฤต' : station.status === 'warning' ? 'เฝ้าระวัง' : station.status === 'offline' ? 'ออฟไลน์' : 'ปกติ'}
                    </span>
                    <span style={{ color: '#fff', fontWeight: 600, marginLeft: 'auto', fontSize: '13px' }}>
                      {station.waterLevel ? `${station.waterLevel} ม.` : '-'}
                    </span>
                  </span>
                </div>
              ))
            ) : (
              <div className={styles.emptyMessage}>ไม่พบสถานีที่ค้นหา</div>
            )}
          </div>
        </div>
      </div>

      {/* ส่วนที่ 2: ข้อมูลกราฟเชิงลึก (จะแสดงเมื่อมี activeStationId) */}
      {!activeStationId ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#222b3a', borderRadius: '16px', border: '1px dashed #3b4a5e', margin: '0 auto', maxWidth: '1356px', width: 'calc(100% - 40px)' }}>
          <i className="bi bi-geo-alt" style={{ fontSize: '48px', color: '#4b5563', marginBottom: '16px', display: 'block' }}></i>
          <h3 style={{ color: '#94a3b8', margin: '0' }}>กรุณาคลิกเลือกสถานีบนแผนที่ หรือค้นหาในรายชื่อ เพื่อดูข้อมูลกราฟ</h3>
        </div>
      ) : (
      <>
      <div className={styles.tableSection}>

        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>สถานะปัจจุบัน ({stationInfo?.customName || activeStationId})</h2>
            <p className={styles.sectionSubtitle}>ข้อมูลล่าสุด ณ วันที่ {latestReportTime}</p>
          </div>
        </div>

        <div className={`${styles.tableHeader} ${user?.role !== 'admin' ? styles.gridUser : ''}`}>
          <div className={styles.colName}>ชื่อสถานี</div>
          <div className={styles.colTime}>เวลา</div>
          {user?.role === 'admin' && (
            <>
              <div className={styles.colSignal}>สัญญาณ</div>
              <div className={styles.colBattery}>แบตเตอรี่</div>
            </>
          )}
          <div className={styles.colWater}>ระดับน้ำ (ม.)</div>
          <div className={styles.colRain}>ปริมาณน้ำฝน (มม./ชม.)</div>
        </div>

        <div className={styles.tableBody}>
          {isLoading ? (
            // --- Skeleton for Station Info ---
            <div className={`${styles.stationRow} ${user?.role !== 'admin' ? styles.gridUser : ''}`} style={{ pointerEvents: 'none' }}>
              <div className={styles.colName}><div className="skeleton skeleton-text" style={{ width: '150px', margin: 0 }}></div></div>
              <div className={styles.colTime}><div className="skeleton skeleton-text" style={{ width: '50px', margin: 0 }}></div></div>
              {user?.role === 'admin' && (
                <>
                  <div className={styles.colSignal}><div className="skeleton skeleton-circle" style={{ width: '24px', height: '24px', display: 'inline-block' }}></div></div>
                  <div className={styles.colBattery}><div className="skeleton skeleton-circle" style={{ width: '24px', height: '24px', display: 'inline-block' }}></div></div>
                </>
              )}
              <div className={styles.colWater}><div className="skeleton skeleton-text" style={{ width: '60px', margin: 0 }}></div></div>
              <div className={styles.colRain}><div className="skeleton skeleton-text" style={{ width: '60px', margin: 0 }}></div></div>
            </div>
          ) : stationInfo ? (
            <div className={`${styles.stationRow} ${user?.role !== 'admin' ? styles.gridUser : ''}`}>
              <div className={styles.colName}>
                {stationInfo.customName || stationInfo.monitorName || 'Unknown Station'}
              </div>
              <div className={styles.colTime}>
                {latestReportTimeObj
                  ? latestReportTimeObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                  : '-'}
              </div>
              {user?.role === 'admin' && (
                <>
                  <div className={`${styles.colSignal} ${latestSignal === 'online' ? styles.iconGood : styles.iconBad}`}>
                    <i className={latestSignal === 'online' ? 'bi bi-reception-4' : 'bi bi-reception-1'}></i>
                  </div>
                  <div className={`${styles.colBattery} ${latestBattery > 0 ? styles.iconGood : styles.iconBad}`}>
                    <i className={latestBattery > 0 ? 'bi bi-battery-full' : 'bi bi-battery-empty'}></i>
                  </div>
                </>
              )}
              <div className={`${styles.colWater} ${getWaterStatusClass(parseFloat(latestWaterValue), styles)}`}>
                {latestWaterValue}
              </div>
              <div className={`${styles.colRain} ${styles.statusNormal}`}>
                {latestRainValue}
              </div>
            </div>
          ) : (
            <div className={styles.emptyMessage}>ไม่มีข้อมูลสถานี</div>
          )}
        </div>
      </div>

      {/* ส่วนที่ 3: กราฟรวม 2 เส้น + Tab ช่วงเวลา (ลำดับที่ 5 + 6) */}
      <div className={styles.chartSection}>
        <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>

          {/* Header: Tab เลือกช่วงเวลา (ลำดับที่ 6) */}
          <div className={styles.chartHeaderRow}>
            <div className={styles.chartLegendRow}>
              {/* Legend เส้นระดับน้ำ */}
              <div 
                className={styles.legendItem} 
                onClick={() => setShowWaterGraph(!showWaterGraph)}
                style={{ cursor: 'pointer', opacity: showWaterGraph ? 1 : 0.5, transition: '0.2s' }}
              >
                <i className={`bi ${showWaterGraph ? 'bi-check-square-fill' : 'bi-square'}`} style={{ color: 'var(--color-status-critical)', marginRight: '8px' }}></i>
                <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
                  <circle cx="4" cy="6" r="3" fill="#fff" stroke="var(--color-status-critical)" strokeWidth="2"/>
                  <line x1="7" y1="6" x2="17" y2="6" stroke="var(--color-status-critical)" strokeWidth="2"/>
                  <circle cx="20" cy="6" r="3" fill="#fff" stroke="var(--color-status-critical)" strokeWidth="2"/>
                </svg>
                <span className={styles.legendText}>ระดับน้ำ (ม.)</span>
              </div>
              {/* Legend เส้นฝน */}
              <div 
                className={styles.legendItem}
                onClick={() => setShowRainGraph(!showRainGraph)}
                style={{ cursor: 'pointer', opacity: showRainGraph ? 1 : 0.5, transition: '0.2s' }}
              >
                <i className={`bi ${showRainGraph ? 'bi-check-square-fill' : 'bi-square'}`} style={{ color: 'var(--color-graf-rain)', marginRight: '8px' }}></i>
                <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
                  <circle cx="4" cy="6" r="3" fill="#fff" stroke="var(--color-graf-rain)" strokeWidth="2"/>
                  <line x1="7" y1="6" x2="17" y2="6" stroke="var(--color-graf-rain)" strokeWidth="2"/>
                  <circle cx="20" cy="6" r="3" fill="#fff" stroke="var(--color-graf-rain)" strokeWidth="2"/>
                </svg>
                <span className={styles.legendText}>ปริมาณน้ำฝน (มม.)</span>
              </div>
              {/* Legend เส้น warning */}
              {warningLevel > 0 && showWaterGraph && (
                <div className={styles.legendItem}>
                  <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
                    <line x1="0" y1="6" x2="24" y2="6" stroke="var(--color-status-warning)" strokeWidth="2" strokeDasharray="5 3"/>
                  </svg>
                  <span className={styles.legendText} style={{ color: 'var(--color-status-warning)' }}>
                    ระดับเฝ้าระวัง
                  </span>
                </div>
              )}
            </div>

            {/* Time Range Tabs & Export Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className={styles.timeRangeTabs}>
                {TIME_RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`${styles.tabBtn} ${selectedRange === opt.value ? styles.tabActive : ''}`}
                    onClick={() => setSelectedRange(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button 
                onClick={handleExportCSV} 
                className={styles.tabBtn} 
                style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: '#3b82f6', color: '#60a5fa' }}
              >
                <i className="bi bi-download" style={{ marginRight: '6px' }}></i>
                ส่งออกข้อมูล (CSV)
              </button>
            </div>
          </div>

          {/* กราฟรวม 2 เส้น dual Y-axis (ลำดับที่ 5) */}
          <div className={styles.chartBody} style={{ height: 300 }}>
            {isLoading ? (
              <div className="skeleton skeleton-box"></div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 60, left: 10, bottom: 15 }}>
                <defs>
                  <linearGradient id="fillWater" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--color-status-critical)" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="var(--color-status-critical)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="fillRain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--color-graf-rain)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--color-graf-rain)" stopOpacity={0}/>
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />

                {/* แกน X */}
                <XAxis
                  dataKey="time"
                  fontSize={11}
                  stroke="var(--color-chart-axis)"
                  tickLine={false}
                  dy={8}
                  label={{ value: 'เวลา (น.)', position: 'insideBottomRight', offset: -15, fill: '#8b95a5', fontSize: 12 }}
                />

                {/* แกน Y ซ้าย — ระดับน้ำ */}
                {showWaterGraph && (
                  <YAxis
                    yAxisId="water"
                    orientation="left"
                    fontSize={11}
                    stroke="var(--color-status-critical)"
                    tickLine={false}
                    axisLine={false}
                    domain={[0, waterYMax]}
                    tickFormatter={(v) => `${v}ม.`}
                    label={{ value: 'ระดับน้ำ (ม.)', angle: -90, position: 'insideLeft', fill: '#8b95a5', fontSize: 12 }}
                  />
                )}

                {/* แกน Y ขวา — ปริมาณฝน */}
                {showRainGraph && (
                  <YAxis
                    yAxisId="rain"
                    orientation="right"
                    fontSize={11}
                    stroke="var(--color-graf-rain)"
                    tickLine={false}
                    axisLine={false}
                    domain={[0, rainYMax]}
                    tickFormatter={(v) => `${v}มม.`}
                    label={{ value: 'ปริมาณฝน (มม.)', angle: 90, position: 'insideRight', fill: '#8b95a5', fontSize: 12 }}
                  />
                )}

                <Tooltip content={<CustomTooltip />} />

                {/* เส้นเฝ้าระวัง (ถ้ามี) */}
                {warningLevel > 0 && showWaterGraph && (
                  <ReferenceLine
                    yAxisId="water"
                    y={warningLevel}
                    stroke="var(--color-status-warning)"
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                  />
                )}

                {/* Area ระดับน้ำ */}
                {showWaterGraph && (
                  <Area
                    yAxisId="water"
                    type="monotone"
                    dataKey="water"
                    name="ระดับน้ำ"
                    stroke="var(--color-status-critical)"
                    strokeWidth={2}
                    fill="url(#fillWater)"
                    dot={{ r: 3, fill: '#1e293b', stroke: 'var(--color-status-critical)', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: 'var(--color-status-critical)', stroke: '#1e293b', strokeWidth: 2 }}
                    connectNulls
                  />
                )}

                {/* Line ปริมาณฝน */}
                {showRainGraph && (
                  <Line
                    yAxisId="rain"
                    type="monotone"
                    dataKey="rain"
                    name="ปริมาณน้ำฝน"
                    stroke="var(--color-graf-rain)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#1e293b', stroke: 'var(--color-graf-rain)', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: 'var(--color-graf-rain)', stroke: '#1e293b', strokeWidth: 2 }}
                    connectNulls
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ส่วนที่ 4: ตารางประวัติข้อมูล (History Table) — sync กับ time range ที่เลือก */}
      <div className={styles.tableSection} style={{ marginTop: '32px' }}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>ประวัติข้อมูล</h2>
            <p className={styles.sectionSubtitle}>
              แสดงข้อมูลย้อนหลัง {TIME_RANGE_OPTIONS.find(o => o.value === selectedRange)?.label} — {chartData.length} รายการ
            </p>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className={styles.emptyMessage}>ไม่มีข้อมูลในช่วงเวลานี้</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th className={styles.historyThTime}>เวลา</th>
                  <th className={styles.historyThWater}>ระดับน้ำ (ม.)</th>
                  <th className={styles.historyThRain}>ปริมาณน้ำฝน (มม./ชม.)</th>
                </tr>
              </thead>
              <tbody>
                {/* เรียงจากใหม่ไปเก่า (reverse) เพื่อให้ข้อมูลล่าสุดอยู่บนสุด */}
                {[...chartData].reverse().map((row, index) => (
                  <tr key={`${row.time}-${index}`} className={styles.historyRow}>
                    <td className={styles.historyTdTime}>{row.time} น.</td>
                    <td className={styles.historyTdWater}>
                      {row.water !== null
                        ? <span className={row.water >= (warningLevel * 1.1) ? styles.statusCritical : row.water >= warningLevel ? styles.statusWarning : styles.statusNormal}>
                            {row.water.toFixed(3)}
                          </span>
                        : <span style={{ color: '#475569' }}>-</span>
                      }
                    </td>
                    <td className={styles.historyTdRain}>
                      {row.rain !== null
                        ? row.rain.toFixed(3)
                        : <span style={{ color: '#475569' }}>-</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
};

export default StationPage;