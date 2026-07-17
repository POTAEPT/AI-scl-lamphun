import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import MapView from '../components/MapView';
import type { StationData as MapStationData } from '../components/MapView';
import { DeviceService, MockDeviceService, type DeviceInfoResponse, type DeviceRangeData } from '../service/deviceService';
import styles from '../styles/StationPage.module.css';

// *** ตัวสลับโหมด: true = ใช้ข้อมูลจำลอง, false = ต่อ API จริง ***
const USE_MOCK_DATA = true;

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
        const envDeviceId = import.meta.env.VITE_API_DEVICE_ID || 'MOCK_DEVICE_001';
        const secretKey = import.meta.env.VITE_API_deviceSecretKey || 'MOCK_KEY';
        const endTime = Date.now();
        const startTime = endTime - 24 * 60 * 60 * 1000; // ย้อนหลัง 24 ชั่วโมง

        let infoResult, waterResult, rainResult;

        if (USE_MOCK_DATA) {
          console.log('🟡 Station Mode: Using MOCK Data');
          infoResult = await MockDeviceService.getStationInfo(envDeviceId);
          [waterResult, rainResult] = await Promise.all([
            MockDeviceService.getHistory(envDeviceId, secretKey, 'water_level', startTime, endTime),
            MockDeviceService.getHistory(envDeviceId, secretKey, 'rain_fall', startTime, endTime),
          ]);
        } else {
          console.log('🟢 Station Mode: Using REAL API');
          infoResult = await DeviceService.getStationInfo(envDeviceId);
          [waterResult, rainResult] = await Promise.all([
            DeviceService.getHistory(envDeviceId, secretKey, 'water_level', startTime, endTime),
            DeviceService.getHistory(envDeviceId, secretKey, 'rain_fall', startTime, endTime),
          ]);
        }

        setStationInfo(infoResult);
        setWaterHistory(waterResult || []);
        setRainHistory(rainResult || []);
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
    if (!stationInfo) {
      return [];
    }
    return [
      {
        id: stationInfo.customName || stationInfo.monitorName || 'station',
        name: stationInfo.customName || stationInfo.monitorName || 'Unknown Station',
        lat: Number(stationInfo.deviceLocation?.latitude) || 18.575,
        lng: Number(stationInfo.deviceLocation?.longitude) || 99.008,
        status: 'active' as const,
      },
    ];
  }, [stationInfo]);

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
    if (waterHistory.length === 0) {
      return '-';
    }
    return parseFloat(waterHistory[0].monitorValue).toFixed(3);
  }, [waterHistory]);

  const latestRainValue = useMemo(() => {
    if (rainHistory.length === 0) {
      return '-';
    }
    return parseFloat(rainHistory[0].monitorValue).toFixed(3);
  }, [rainHistory]);

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
                {waterHistory.length > 0
                  ? new Date(waterHistory[0].monitorTime).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '-'}
              </div>

              <div className={`${styles.colSignal} ${styles.iconGood}`}>
                <i className="bi bi-reception-4"></i>
              </div>

              <div className={`${styles.colBattery} ${styles.iconGood}`}>
                <i className="bi bi-battery-full"></i>
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