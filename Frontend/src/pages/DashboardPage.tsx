// src/pages/DashboardPage.tsx

import { useState, useCallback, useEffect, useMemo } from 'react';
import StationTable from '../components/Dashboard-StationTable';
import AlertCard from '../components/AlertCard';
import { DeviceService, MockDeviceService, type DeviceRangeData } from '../service/deviceService';
import WaterLevelChart from '../components/WaterLevelChart';
import DataCard from '../components/DataCard';
import { STATIC_STATIONS } from '../data/stationList';
import type { StationData } from '../components/MapView';
import styles from '../styles/DashboradPage.module.css';
import { MOCK_STATIONS } from '../data/mockData';

// *** ตัวสลับโหมด ***
const USE_MOCK_DATA = true;

// hardcode ค่าเริ่มต้นของสถานีหลัก (สำหรับ mock data)
// *** ค่าระดับน้ำ Threshold (ปรับตามจริง) ***
const WARNING_LEVEL  = 4.5;  // เมตร — เส้นเฝ้าระวัง
const CRITICAL_LEVEL = 5.0;  // เมตร — เส้นวิกฤต

const DashboardPage = () => {
    const [stationName, setStationName] = useState<string>("Loading Station...");
    const [deviceId, setDeviceId] = useState<string>("DEV-K1");
    const [location, setLocation] = useState<{lat: number, lng: number}>({
        lat: 18.586659,
        lng: 99.023166,
    });

    const [waterValue, setWaterValue] = useState<string>("---");
    const [rainValue,  setRainValue]  = useState<string>("---");

    const [waterHistory, setWaterHistory] = useState<DeviceRangeData[]>([]);
    const [rainHistory,  setRainHistory]  = useState<DeviceRangeData[]>([]);

    const [isLoading, setIsLoading] = useState<boolean>(false);

    // --- คำนวณจำนวนสถานีวิกฤต/เฝ้าระวัง จาก waterHistory ---
    const alertCounts = useMemo(() => {
        // ดึงค่าล่าสุดของแต่ละสถานี (ตอนนี้มีสถานีเดียว ใช้ค่าล่าสุด)
        if (waterHistory.length === 0) return { critical: 0, warning: 0 };

        const latestValue = parseFloat(waterHistory[0]?.monitorValue ?? "0");
        if (latestValue >= CRITICAL_LEVEL) return { critical: 1, warning: 0 };
        if (latestValue >= WARNING_LEVEL)  return { critical: 0, warning: 1 };
        return { critical: 0, warning: 0 };
    }, [waterHistory]);

    const handleDataUpdate = useCallback((water: number, rain: number) => {
        setWaterValue(water.toFixed(3));
        setRainValue(rain.toFixed(3));
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const envDeviceId  = deviceId;
                const secretKey    = import.meta.env.VITE_API_deviceSecretKey  || "MOCK_KEY";
                const endTime      = Date.now();
                const startTime    = endTime - (24 * 60 * 60 * 1000);

                let infoRes, waterRes, rainRes;

                if (USE_MOCK_DATA) {
                    infoRes = await MockDeviceService.getStationInfo(envDeviceId);
                    const results = await Promise.all([
                        MockDeviceService.getHistory(envDeviceId, secretKey, "water_level", startTime, endTime),
                        MockDeviceService.getHistory(envDeviceId, secretKey, "rain_fall",   startTime, endTime),
                    ]);
                    [waterRes, rainRes] = results;
                } else {
                    infoRes = await DeviceService.getStationInfo(envDeviceId);
                    const results = await Promise.all([
                        DeviceService.getHistory(envDeviceId, secretKey, "water_level", startTime, endTime),
                        DeviceService.getHistory(envDeviceId, secretKey, "rain_fall",   startTime, endTime),
                    ]);
                    [waterRes, rainRes] = results;
                }

                if (infoRes) {
                    setStationName(infoRes.customName || infoRes.monitorName || "Unknown Station");
                    if (infoRes.deviceLocation) {
                        setLocation({
                            lat: parseFloat(infoRes.deviceLocation.latitude) || 18.586659,
                            lng: parseFloat(infoRes.deviceLocation.longitude) || 99.023166
                        });
                    }
                }

                setWaterHistory(waterRes || []);
                setRainHistory(rainRes   || []);

            } catch (error) {
                console.error("Error:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [deviceId]);

    const stationList: StationData[] = useMemo(() => {
        const mainStation: StationData = {
            id: deviceId,
            name: stationName,
            lat: location.lat,
            lng: location.lng,
            status: 'active',
        };
        return [mainStation, ...STATIC_STATIONS];
    }, [deviceId, stationName, location]);

    return (
        <main className={styles.container}>

            {/* --- ส่วนบน: การ์ดสรุป --- */}
            <section className={styles.topSection}>
                <div className={styles.topLeft}>
                    <div className={styles.cardGrid}>
                        <DataCard
                            title="จำนวนสถานี"
                            value={stationList.length}
                            unit="สถานี"
                            theme="blue"
                        />
                        <DataCard
                            title="ระดับน้ำ"
                            value={waterValue}
                            unit="เมตร"
                            theme="orange"
                        />
                        <DataCard
                            title="ปริมาณน้ำฝนสะสม"
                            value={rainValue}
                            unit="มม./ชม."
                            theme="orange"
                        />
                        {/* การ์ดแจ้งเตือน — ลำดับที่ 2 */}
                        <AlertCard
                            criticalCount={alertCounts.critical}
                            warningCount={alertCounts.warning}
                        />
                    </div>

                    <div className={styles.controlBar}>
                        <select 
                            className={styles.selectInput} 
                            value={deviceId} 
                            onChange={(e) => setDeviceId(e.target.value)}
                        >
                            {MOCK_STATIONS.map((station) => (
                                <option key={station.deviceId} value={station.deviceId}>
                                    {station.stationName}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

            </section>

            {/* --- ส่วนกลาง: กราฟ — ลำดับที่ 3 (Threshold Lines) --- */}
            <section className={styles.chartSection}>
                <div className={styles.chartWrapper}>
                    <WaterLevelChart
                        waterData={waterHistory}
                        rainData={rainHistory}
                        onDataUpdate={handleDataUpdate}
                        warningLevel={WARNING_LEVEL}
                        criticalLevel={CRITICAL_LEVEL}
                    />
                </div>
            </section>

            {/* --- ส่วนล่าง: ตารางข้อมูล --- */}
            <section className={styles.tableSection}>
                <StationTable
                    waterData={waterHistory}
                    rainData={rainHistory}
                    isLoading={isLoading}
                    stationName={stationName}
                />
            </section>
        </main>
    );
};

export default DashboardPage;