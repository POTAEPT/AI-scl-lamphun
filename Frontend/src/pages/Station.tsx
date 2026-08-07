import React, { useState, useEffect, useMemo } from 'react';
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
  type StationDeviceInfo,
  type StationLatestInfo,
} from '../service/deviceService';
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
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedRange, setSelectedRange] = useState<TimeRange>('24h'); // ลำดับที่ 6

  const [stationInfo,    setStationInfo]    = useState<DeviceInfoResponse | null>(null);
  const [stations,       setStations]       = useState<StationDeviceInfo[]>([]);
  const [latestStations, setLatestStations] = useState<StationLatestInfo[]>([]);
  const [waterHistory,   setWaterHistory]   = useState<DeviceRangeData[]>([]);
  const [rainHistory,    setRainHistory]    = useState<DeviceRangeData[]>([]);

  const [isLoading,    setIsLoading]    = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeStationId, setActiveStationId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const latestData = await DeviceService.getLatestStations();
        if (latestData.length === 0) return;
        setLatestStations(latestData);

        const uniqueStationsMap = new Map<string, StationDeviceInfo>();
        for (const item of latestData) {
          if (!uniqueStationsMap.has(item.stationId)) {
            uniqueStationsMap.set(item.stationId, {
              stationId:   item.stationId,
              stationName: item.stationName,
              latitude:    item.latitude,
              longitude:   item.longitude,
              deviceId:    item.deviceId,
              deviceName:  item.deviceName,
              monitorItem: item.monitorItem,
            });
          }
        }
        const stationsArr = Array.from(uniqueStationsMap.values());
        setStations(stationsArr);
        
        setActiveStationId(prev => prev || stationsArr[0].stationId);
      } catch (error) {
        console.error('Error fetching stations:', error);
      }
    };
    fetchLatest();
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!activeStationId || latestStations.length === 0) return;
      setIsLoading(true);
      setErrorMessage(null);
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
    const unique = new Map<string, MapStationData>();
    for (const s of stations) {
      if (!unique.has(s.stationId)) {
        unique.set(s.stationId, {
          id:     s.stationId,
          name:   s.stationName || 'Unknown Station',
          lat:    parseFloat(s.latitude)  || 18.575,
          lng:    parseFloat(s.longitude) || 99.008,
          status: 'active',
        });
      }
    }
    return Array.from(unique.values());
  }, [stations]);

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

  const latestReportTime = useMemo(() => {
    const d = latestStations.find(s => s.stationId === activeStationId && (s.monitorItem.toLowerCase().includes('nw_') || s.monitorItem.toLowerCase().includes('water')));
    return d?.monitorTime || '';
  }, [latestStations, activeStationId]);

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

          <div className={styles.panelTableHeader}>
            <span className={styles.panelColName}>ชื่อสถานี</span>
            <span className={styles.panelColDetail}>ตำแหน่ง</span>
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
                  <span className={styles.panelStationLocation}>
                    {`${Number(station.lat).toFixed(4)}, ${Number(station.lng).toFixed(4)}`}
                  </span>
                </div>
              ))
            ) : (
              <div className={styles.emptyMessage}>ไม่พบสถานีที่ค้นหา</div>
            )}
          </div>
        </div>
      </div>

      {/* ส่วนที่ 2: ตารางข้อมูล */}
      <div className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <div className={styles.colSetting}></div>
          <div className={styles.colName}>ชื่อสถานี</div>
          <div className={styles.colTime}>เวลา</div>
          <div className={styles.colSignal}>สัญญาณ</div>
          <div className={styles.colBattery}>แบตเตอรี่</div>
          <div className={styles.colWater}>ระดับน้ำ (ม.)</div>
          <div className={styles.colRain}>ปริมาณน้ำฝน (มม./ชม.)</div>
        </div>

        <div className={styles.tableBody}>
          {stationInfo ? (
            <div className={styles.stationRow}>
              <div className={styles.colSetting}>
                <i className={`bi bi-gear ${styles.btnSetting}`}></i>
              </div>
              <div className={styles.colName}>
                {stationInfo.customName || stationInfo.monitorName || 'Unknown Station'}
              </div>
              <div className={styles.colTime}>
                {latestReportTime
                  ? new Date(latestReportTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                  : '-'}
              </div>
              <div className={`${styles.colSignal} ${latestSignal === 'online' ? styles.iconGood : styles.iconBad}`}>
                <i className={latestSignal === 'online' ? 'bi bi-reception-4' : 'bi bi-reception-1'}></i>
              </div>
              <div className={`${styles.colBattery} ${latestBattery > 0 ? styles.iconGood : styles.iconBad}`}>
                <i className={latestBattery > 0 ? 'bi bi-battery-full' : 'bi bi-battery-empty'}></i>
              </div>
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
              <div className={styles.legendItem}>
                <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
                  <circle cx="4" cy="6" r="3" fill="#fff" stroke="var(--color-status-critical)" strokeWidth="2"/>
                  <line x1="7" y1="6" x2="17" y2="6" stroke="var(--color-status-critical)" strokeWidth="2"/>
                  <circle cx="20" cy="6" r="3" fill="#fff" stroke="var(--color-status-critical)" strokeWidth="2"/>
                </svg>
                <span className={styles.legendText}>ระดับน้ำ (ม.)</span>
              </div>
              {/* Legend เส้นฝน */}
              <div className={styles.legendItem}>
                <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
                  <circle cx="4" cy="6" r="3" fill="#fff" stroke="var(--color-graf-rain)" strokeWidth="2"/>
                  <line x1="7" y1="6" x2="17" y2="6" stroke="var(--color-graf-rain)" strokeWidth="2"/>
                  <circle cx="20" cy="6" r="3" fill="#fff" stroke="var(--color-graf-rain)" strokeWidth="2"/>
                </svg>
                <span className={styles.legendText}>ปริมาณน้ำฝน (มม.)</span>
              </div>
              {/* Legend เส้น warning */}
              {warningLevel > 0 && (
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

            {/* Time Range Tabs (ลำดับที่ 6) */}
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
          </div>

          {/* กราฟรวม 2 เส้น dual Y-axis (ลำดับที่ 5) */}
          <div className={styles.chartBody} style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 60, left: -10, bottom: 0 }}>
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
                />

                {/* แกน Y ซ้าย — ระดับน้ำ */}
                <YAxis
                  yAxisId="water"
                  orientation="left"
                  fontSize={11}
                  stroke="var(--color-status-critical)"
                  tickLine={false}
                  axisLine={false}
                  domain={[0, waterYMax]}
                  tickFormatter={(v) => `${v}ม.`}
                />

                {/* แกน Y ขวา — ปริมาณฝน */}
                <YAxis
                  yAxisId="rain"
                  orientation="right"
                  fontSize={11}
                  stroke="var(--color-graf-rain)"
                  tickLine={false}
                  axisLine={false}
                  domain={[0, rainYMax]}
                  tickFormatter={(v) => `${v}มม.`}
                />

                <Tooltip content={<CustomTooltip />} />

                {/* เส้นเฝ้าระวัง (ถ้ามี) */}
                {warningLevel > 0 && (
                  <ReferenceLine
                    yAxisId="water"
                    y={warningLevel}
                    stroke="var(--color-status-warning)"
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                  />
                )}

                {/* Area ระดับน้ำ */}
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

                {/* Line ปริมาณฝน */}
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
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StationPage;