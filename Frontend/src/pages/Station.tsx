import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import MapView from '../components/MapView';
import type { StationData as MapStationData } from '../components/MapView';
import { DeviceService, type DeviceInfoResponse, type DeviceRangeData, type StationDeviceInfo, type StationLatestInfo } from '../service/deviceService';
import styles from '../styles/StationPage.module.css';

// --- Interface สำหรับข้อมูลกราฟที่ผ่านการแปลงแล้ว ---
interface ChartDataPoint {
  time: string;
  value: number;
}

// --- Helper: แปลงข้อมูลจาก API มาเป็นรูปแบบที่กราฟต้องการ ---
const transformToChartData = (rawData: DeviceRangeData[]): ChartDataPoint[] => {
  return rawData
    .map((item) => {
      const date = new Date(item.monitorTime);
      const timeLabel = date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return {
        time: timeLabel,
        value: parseFloat(parseFloat(item.monitorValue).toFixed(2)),
      };
    })
    .reverse(); // เรียงเวลาจากเก่าไปใหม่สำหรับกราฟ
};

// --- Helper: คำนวณ Status Class จากค่าระดับน้ำ ---
const getWaterStatusClass = (waterLevel: number): string => {
  if (waterLevel >= 5.0) {
    return styles.statusCritical;
  }
  if (waterLevel >= 4.5) {
    return styles.statusWarning;
  }
  return styles.statusNormal;
};

// --- Main Component ---
const StationPage: React.FC = () => {
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // State ข้อมูลสถานีจาก API
  const [stationInfo, setStationInfo] = useState<DeviceInfoResponse | null>(null);
  const [stations, setStations] = useState<StationDeviceInfo[]>([]);
  const [latestStations, setLatestStations] = useState<StationLatestInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>('');

  // State ข้อมูลประวัติสำหรับกราฟ
  const [waterHistory, setWaterHistory] = useState<DeviceRangeData[]>([]);
  const [rainHistory, setRainHistory] = useState<DeviceRangeData[]>([]);

  // State สถานะการโหลด
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- ดึงข้อมูลจาก API เมื่อเปิดหน้าครั้งแรก ---
  useEffect(() => {
    const fetchStationData = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const secretKey =
          import.meta.env.VITE_API_deviceSecretKey || "MOCK_KEY";
        const endTime = Date.now();
        const startTime = endTime - 24 * 60 * 60 * 1000;

        console.log("🟢 Station Mode: Using getLatestStations() API");

        // Get latest stations data from API (includes latest values + signal/battery)
        const latestData = await DeviceService.getLatestStations();

        if (latestData.length === 0) {
          setErrorMessage("ไม่พบสถานี");
          setIsLoading(false);
          return;
        }

        setLatestStations(latestData);

        // Get unique stations for map
        const uniqueStationsMap = new Map<string, StationDeviceInfo>();
        for (const item of latestData) {
          if (!uniqueStationsMap.has(item.stationId)) {
            uniqueStationsMap.set(item.stationId, {
              stationId: item.stationId,
              stationName: item.stationName,
              latitude: item.latitude,
              longitude: item.longitude,
              deviceId: item.deviceId,
              deviceName: item.deviceName,
              monitorItem: item.monitorItem
            });
          }
        }
        const stationDevices = Array.from(uniqueStationsMap.values());
        setStations(stationDevices);
        setDeviceId(latestData[0].deviceId);

        // Set station info from first station
        setStationInfo({
          monitorName: latestData[0].monitorItem,
          customName: latestData[0].stationName,
          warningLevel: 0,
          deviceLocation: {
            latitude: latestData[0].latitude,
            longitude: latestData[0].longitude
          }
        });

        // Fetch history for all devices (for charts)
        const waterData: DeviceRangeData[] = [];
        const rainData: DeviceRangeData[] = [];

        await Promise.all(
          latestData.map(async (device) => {
            const data = await DeviceService.getHistory(
              device.deviceId,
              secretKey,
              device.monitorItem,
              startTime,
              endTime
            );

            const lowerMonitor = device.monitorItem.toLowerCase();
            if (lowerMonitor.includes('water') || lowerMonitor.includes('nw_')) {
              waterData.push(...data);
            } else {
              rainData.push(...data);
            }
          })
        );

        setWaterHistory(waterData);
        setRainHistory(rainData);
      } catch (error) {
        console.error('Error fetching station data:', error);
        setErrorMessage('ไม่สามารถโหลดข้อมูลสถานีได้ กรุณาลองใหม่อีกครั้ง');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStationData();
  }, []);

  // --- แปลงข้อมูล API มาเป็นรูปแบบที่ MapView ต้องการ ---
  const mapStations: MapStationData[] = useMemo(() => {
    if (stations.length === 0) {
      return [];
    }

    // Group by stationId and create unique stations
    const uniqueStations = new Map<string, MapStationData>();
    for (const s of stations) {
      if (!uniqueStations.has(s.stationId)) {
        uniqueStations.set(s.stationId, {
          id: s.stationId,
          name: s.stationName || 'Unknown Station',
          lat: parseFloat(s.latitude) || 18.575,
          lng: parseFloat(s.longitude) || 99.008,
          status: 'active' as const,
        });
      }
    }

    return Array.from(uniqueStations.values());
  }, [stations]);

  // --- แปลงข้อมูลประวัติมาเป็นรูปแบบที่กราฟต้องการ ---
  const waterChartData: ChartDataPoint[] = useMemo(() => {
    return transformToChartData(waterHistory);
  }, [waterHistory]);

  const rainChartData: ChartDataPoint[] = useMemo(() => {
    return transformToChartData(rainHistory);
  }, [rainHistory]);

  // --- กรองรายชื่อสถานีใน Search Panel ---
  const filteredMapStations: MapStationData[] = useMemo(() => {
    if (searchKeyword.trim() === '') {
      return mapStations;
    }
    const keyword = searchKeyword.toLowerCase();
    return mapStations.filter((station) => {
      return station.name.toLowerCase().includes(keyword);
    });
  }, [mapStations, searchKeyword]);

  // --- คำนวณค่าล่าสุดของระดับน้ำ (สำหรับแสดงในตาราง) ---
  const latestWaterValue = useMemo(() => {
    const waterDevice = latestStations.find(s =>
      s.monitorItem.toLowerCase().includes('nw_') || s.monitorItem.toLowerCase().includes('water')
    );
    return waterDevice?.monitorValue ? parseFloat(waterDevice.monitorValue).toFixed(3) : '-';
  }, [latestStations]);

  const latestRainValue = useMemo(() => {
    const rainDevice = latestStations.find(s =>
      s.monitorItem.toLowerCase().includes('yl_') || s.monitorItem.toLowerCase().includes('rain')
    );
    return rainDevice?.monitorValue ? parseFloat(rainDevice.monitorValue).toFixed(3) : '-';
  }, [latestStations]);

  const latestSignal = useMemo(() => {
    const waterDevice = latestStations.find(s =>
      s.monitorItem.toLowerCase().includes('nw_') || s.monitorItem.toLowerCase().includes('water')
    );
    return waterDevice?.signal || 'offline';
  }, [latestStations]);

  const latestBattery = useMemo(() => {
    const waterDevice = latestStations.find(s =>
      s.monitorItem.toLowerCase().includes('nw_') || s.monitorItem.toLowerCase().includes('water')
    );
    return waterDevice?.battery ?? 0;
  }, [latestStations]);

  const latestReportTime = useMemo(() => {
    const waterDevice = latestStations.find(s =>
      s.monitorItem.toLowerCase().includes('nw_') || s.monitorItem.toLowerCase().includes('water')
    );
    return waterDevice?.monitorTime || '';
  }, [latestStations]);

/*  const latestWaterStatus = useMemo(() => {
    if (waterHistory.length === 0) {
      return 'normal';
    }
    const value = parseFloat(waterHistory[0].monitorValue);
    if (value >= 5.0) return 'critical';
    if (value >= 4.5) return 'warning';
    return 'normal';
  }, [waterHistory]); */

  // --- Render ---
  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyMessage}>กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyMessage}>{errorMessage}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>

      {/* ====================================================
          ส่วนที่ 1: แผนที่ (ซ้าย) + Panel ค้นหาสถานี (ขวา)
          ==================================================== */}
      <div className={styles.topSection}>

        {/* แผนที่ */}
        <div className={styles.mapWrapper}>
          <MapView stations={mapStations} />
        </div>

        {/* Panel ค้นหาสถานี */}
        <div className={styles.searchPanel}>
          {/* ช่องค้นหา */}
          <div className={styles.searchBarWrapper}>
            <i className={`bi bi-search ${styles.searchIcon}`}></i>
            <input
              type="text"
              placeholder="ค้นหาสถานี..."
              className={styles.searchInput}
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
            />
          </div>

          {/* หัวตาราง Panel */}
          <div className={styles.panelTableHeader}>
            <span className={styles.panelColName}>ชื่อสถานี</span>
            <span className={styles.panelColDetail}>รายละเอียดตำแหน่ง</span>
          </div>

          {/* รายการสถานี */}
          <div className={styles.panelStationList}>
            {filteredMapStations.length > 0 ? (
              filteredMapStations.map((station) => (
                <div key={station.id} className={styles.panelStationRow}>
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

      {/* ====================================================
          ส่วนที่ 2: ตารางข้อมูลสถานี (แถวทรงแคปซูล)
          ==================================================== */}
      <div className={styles.tableSection}>
        {/* หัวคอลัมน์ */}
        <div className={styles.tableHeader}>
          <div className={styles.colSetting}></div>
          <div className={styles.colName}>ชื่อสถานี</div>
          <div className={styles.colTime}>เวลา</div>
          <div className={styles.colSignal}>สัญญาณ</div>
          <div className={styles.colBattery}>แบตเตอรี่</div>
          <div className={styles.colWater}>ระดับน้ำ(เมตร)</div>
          <div className={styles.colRain}>ปริมาณน้ำฝน(มิลลิเมตร/ชั่วโมง)</div>
        </div>

        {/* แถวข้อมูล */}
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
                  ? new Date(latestReportTime).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '-'}
              </div>

              <div className={`${styles.colSignal} ${latestSignal === 'online' ? styles.iconGood : styles.iconBad}`}>
                <i className={latestSignal === 'online' ? 'bi bi-reception-4' : 'bi bi-reception-1'}></i>
              </div>

              <div className={`${styles.colBattery} ${latestBattery > 0 ? styles.iconGood : styles.iconBad}`}>
                <i className={latestBattery > 0 ? 'bi bi-battery-full' : 'bi bi-battery-empty'}></i>
                {latestBattery > 0 ? '' : '0%'}
              </div>

              <div className={`${styles.colWater} ${getWaterStatusClass(parseFloat(latestWaterValue))}`}>
                {latestWaterValue}
              </div>

              <div className={`${styles.colRain} ${getWaterStatusClass(parseFloat(latestWaterValue))}`}>
                {latestRainValue}
              </div>
            </div>
          ) : (
            <div className={styles.emptyMessage}>ไม่มีข้อมูลสถานี</div>
          )}
        </div>
      </div>

      {/* ====================================================
          ส่วนที่ 3: กราฟรายวัน (ระดับน้ำ + ปริมาณฝน)
          ==================================================== */}
      <div className={styles.chartSection}>

        {/* กราฟระดับน้ำ */}
        <div className={styles.chartCard}>
          <div className={styles.chartBody}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={waterChartData}
                margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorWaterStation" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-status-critical)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-status-critical)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
                <XAxis dataKey="time" fontSize={12} stroke="var(--color-chart-axis)" tickLine={false} />
                <YAxis fontSize={12} stroke="var(--color-chart-axis)" tickLine={false} axisLine={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="ระดับน้ำ"
                  stroke="var(--color-status-critical)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorWaterStation)"
                  dot={{ r: 3, fill: 'var(--color-chart-dot-fill)', stroke: 'var(--color-status-critical)', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: 'var(--color-status-critical)', stroke: 'var(--color-chart-dot-fill)', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.legendContainer}>
            <div className={styles.legendItem}>
              <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
                <circle cx="4" cy="6" r="3" fill="var(--color-chart-dot-fill)" stroke="var(--color-status-critical)" strokeWidth="2" />
                <line x1="7" y1="6" x2="17" y2="6" stroke="var(--color-status-critical)" strokeWidth="2" />
                <circle cx="20" cy="6" r="3" fill="var(--color-chart-dot-fill)" stroke="var(--color-status-critical)" strokeWidth="2" />
              </svg>
              <span className={styles.legendText}>ระดับน้ำ</span>
            </div>
          </div>
        </div>

        {/* กราฟปริมาณฝน */}
        <div className={styles.chartCard}>
          <div className={styles.chartBody}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={rainChartData}
                margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRainStation" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-graf-rain)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-graf-rain)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
                <XAxis dataKey="time" fontSize={12} stroke="var(--color-chart-axis)" tickLine={false} />
                <YAxis fontSize={12} stroke="var(--color-chart-axis)" tickLine={false} axisLine={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="ปริมาณน้ำฝนสะสม"
                  stroke="var(--color-graf-rain)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRainStation)"
                  dot={{ r: 3, fill: 'var(--color-chart-dot-fill)', stroke: 'var(--color-graf-rain)', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: 'var(--color-graf-rain)', stroke: 'var(--color-chart-dot-fill)', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.legendContainer}>
            <div className={styles.legendItem}>
              <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
                <circle cx="4" cy="6" r="3" fill="var(--color-chart-dot-fill)" stroke="var(--color-graf-rain)" strokeWidth="2" />
                <line x1="7" y1="6" x2="17" y2="6" stroke="var(--color-graf-rain)" strokeWidth="2" />
                <circle cx="20" cy="6" r="3" fill="var(--color-chart-dot-fill)" stroke="var(--color-graf-rain)" strokeWidth="2" />
              </svg>
              <span className={styles.legendText}>ปริมาณน้ำฝนสะสม</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StationPage;