// src/pages/DashboardPage.tsx

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import StationTable from '../components/Dashboard-StationTable';
import { DeviceService, MockDeviceService, type DeviceRangeData, type RainProbabilityData } from '../service/deviceService';
import WaterLevelChart from '../components/WaterLevelChart';
import DataCard from '../components/DataCard';
import { STATIC_STATIONS } from '../data/stationList';
import type { StationData } from '../components/MapView';
import styles from '../styles/DashboradPage.module.css';

// *** ตัวสลับโหมด: true = ใช้ข้อมูลจำลอง, false = ต่อ API จริง ***
const USE_MOCK_DATA = true; 

const DashboardPage = () => {
    // State ข้อมูลสถานี - กู้คืนจากโค้ดทีม
    const [stationName, setStationName] = useState<string>("Loading Station...");
    const [deviceId] = useState<string>("UNKNOWN_ID");
    const [location, /*setLocation*/] = useState<{lat: number, lng: number}>({
        lat: 18.586659, 
        lng: 99.023166
    });

    // State ข้อมูล Sensor
    const [waterValue, setWaterValue] = useState<string>("---");
    const [rainValue, setRainValue] = useState<string>("---");

    // State ตาราง History
    const [waterHistory, setWaterHistory] = useState<DeviceRangeData[]>([]);
    const [rainHistory, setRainHistory] = useState<DeviceRangeData[]>([]);
    const [probData, setProbData] = useState<RainProbabilityData[]>([]);
    
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const probScrollRef = useRef<HTMLDivElement>(null);

    const handleDataUpdate = useCallback((water: number, rain: number) => {
        setWaterValue(water.toFixed(3));
        setRainValue(rain.toFixed(3));
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // อ่าน Environment Variables
                const envDeviceId = import.meta.env.VITE_API_DEVICE_ID || "MOCK_DEVICE_001"; 
                const secretKey = import.meta.env.VITE_API_deviceSecretKey || "MOCK_KEY"; 
                const endTime = Date.now();
                const startTime = endTime - (24 * 60 * 60 * 1000);

                let infoRes;
                let waterRes;
                let rainRes;
                let probRes;

                
                

                // --- เลือกโหมด Mock หรือ Real ---
                    if (USE_MOCK_DATA) {
                    console.log("🟡 Mode: Using MOCK Data");
                    infoRes = await MockDeviceService.getStationInfo(envDeviceId);
                    const results = await Promise.all([
                        MockDeviceService.getHistory(envDeviceId, secretKey, "water_level", startTime, endTime),
                        MockDeviceService.getHistory(envDeviceId, secretKey, "rain_fall", startTime, endTime),
                        MockDeviceService.getRainProbability()
                    ]);
                    [waterRes, rainRes, probRes] = results; // ใช้การ Destructure ผลลัพธ์
                } else {
                    console.log("🟢 Mode: Using REAL API");
                    infoRes = await DeviceService.getStationInfo(envDeviceId);
                    const results = await Promise.all([
                        DeviceService.getHistory(envDeviceId, secretKey, "water_level", startTime, endTime),
                        DeviceService.getHistory(envDeviceId, secretKey, "rain_fall", startTime, endTime),
                        DeviceService.getRainProbability()
                    ]);
                    [waterRes, rainRes, probRes] = results;
                }

                // --- อัปเดต State ---
                if (infoRes) {
                    setStationName(infoRes.customName || infoRes.monitorName || "Unknown Station");
                    // if (infoRes.deviceLocation) {
                    //     setLocation({
                    //         // แก้ Bug: 118 เป็น 18 (เพราะ Latitude เกิน 90 ไม่ได้)
                    //         lat: Number(infoRes.deviceLocation.latitude) || 18.575,
                    //         lng: Number(infoRes.deviceLocation.longitude) || 99.008
                    //     });
                    // }
                }

                setWaterHistory(waterRes || []);
                setRainHistory(rainRes || []);
                setProbData(probRes || []);

                setTimeout(() => {
                    if (probScrollRef.current) {
                        const bangkokNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok', hour: 'numeric', hour12: false });
                        const currentHour = parseInt(bangkokNow, 10);
                        const rowIndex = currentHour >= 1 ? currentHour - 1 : 23;
                        const rowHeight = 26;
                        const headerHeight = 0;
                        probScrollRef.current.scrollTop = Math.max(0, rowIndex * rowHeight - headerHeight);
                    }
                }, 100);

            } catch (error) {
                console.error("Error:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // กู้คืนฟังก์ชันรวมรายชื่อสถานี (StationList) และพิกัดเตรียมไว้สำหรับหน้า Map ตามตรรกะเดิมของทีม
    const stationList: StationData[] = useMemo(() => {
        const mainStation: StationData = {
            id: deviceId,
            name: stationName,   // ชื่อที่ได้จาก API
            lat: location.lat,   // พิกัดที่ได้จาก API
            lng: location.lng,   // พิกัดที่ได้จาก API
            status: 'active'
        };

        return [mainStation, ...STATIC_STATIONS];
    }, [deviceId, stationName, location]);

    return (
        <main className={styles.container}>
            
            {/* --- ส่วนบน: สถิติ และ เปอร์เซ็นต์ฝน --- */}
            <section className={styles.topSection}>
                <div className={styles.topLeft}>
                    <div className={styles.cardGrid}>
                        <DataCard title="จำนวนสถานี" value={stationList.length} unit="สถานี" theme="blue" />
                        <DataCard title="ระดับน้ำ" value={waterValue} unit="เมตร" theme="orange" />
                        <DataCard title="ปริมาณน้ำฝนสะสม" value={rainValue} unit="มิลลิเมตร/ชั่วโมง" theme="orange" />
                    </div>
                    <div className={styles.controlBar}>
                        <select className={styles.selectInput}>
                            <option>ประเภทข้อมูล</option>
                        </select>
                        <select className={styles.selectInput}>
                            <option>ตั้งค่ากราฟ</option>
                        </select>
                    </div>
                </div>

                <div className={styles.topRight}>
                    <div className={styles.probTableCard}>
                        <div className={styles.probHeader}>เปอร์เซ็นต์การเกิดฝน</div>
                        <div className={styles.probGridHeader}>
                            <div className={styles.probTimeCol}>time</div>
                            <div>Sun</div><div>M</div><div>Tu</div><div>W</div><div>Th</div><div>Fr</div><div>St</div>
                        </div>
                        <div className={styles.probScrollArea} ref={probScrollRef}>
                            <div className={styles.probGrid}>
                                {probData.map((row, idx) => (
                                    <span key={idx} className={styles.probRowContents}>
                                        <div className={styles.probTimeCol}>{row.time}</div>
                                        <div>{row.sun}</div><div>{row.mon}</div><div>{row.tue}</div>
                                        <div>{row.wed}</div><div>{row.thu}</div><div>{row.fri}</div><div>{row.sat}</div>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- ส่วนกลาง: กราฟเต็มจอ --- */}
            <section className={styles.chartSection}>
                <div className={styles.chartWrapper}>
                    <WaterLevelChart onDataUpdate={handleDataUpdate} />
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
}

export default DashboardPage;
