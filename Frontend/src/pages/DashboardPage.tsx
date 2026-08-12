// src/pages/DashboardPage.tsx

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import StationTable from '../components/Dashboard-StationTable';
import AlertCard from '../components/AlertCard';
import { DeviceService, type StationLatestInfo } from '../service/deviceService';
import DashboardChart from '../components/DashboardChart';
import DataCard from '../components/DataCard';

import styles from '../styles/DashboradPage.module.css';

// Threshold: อุปกรณ์ที่ไม่ส่งข้อมูลเกิน 24 ชม. ถือว่า offline (Heartbeat Timeout)
const OFFLINE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

const DashboardPage = () => {
    const { user } = useAuth();
    const [waterValue, setWaterValue] = useState<string>("---");
    const [waterSubtitle, setWaterSubtitle] = useState<string>("");
    const [rainValue,  setRainValue]  = useState<string>("---");

    const [latestStations, setLatestStations] = useState<StationLatestInfo[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [alertCounts, setAlertCounts] = useState({ critical: 0, warning: 0 });
    const [stationStats, setStationStats] = useState({ water: 0, rain: 0 });
    // offlineCount: นับจากสถานีที่ไม่ได้ส่งข้อมูลเกิน 24 ชม. (Heartbeat Timeout)
    const [offlineCount, setOfflineCount] = useState<number>(0);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // ดึงข้อมูลล่าสุดจาก API
                const latestRes = await DeviceService.getLatestStations();

                // --- ตรวจสอบ Alert และคำนวณค่าสูงสุด/เฉลี่ยจากข้อมูลล่าสุดของทุกสถานี ---
                if (latestRes && latestRes.length > 0) {
                    const savedLevelsStr = localStorage.getItem('mock_warning_levels');
                    const savedLevels = savedLevelsStr ? JSON.parse(savedLevelsStr) : {};
                    const now = Date.now();

                    let warning = 0;
                    let critical = 0;
                    let maxWater = -Infinity;
                    let maxWaterStationName = "";
                    let totalRain = 0;
                    let rainCount = 0;
                    let waterStationCount = 0;
                    let rainStationCount = 0;

                    // เก็บเวลาล่าสุดที่รายงานของแต่ละสถานี (ใช้ stationId เป็น key)
                    const stationLatestTime = new Map<string, number>();

                    latestRes.forEach((s: any) => {
                        // ติดตามเวลาล่าสุดที่ส่งข้อมูลของแต่ละสถานี
                        if (s.monitorTime) {
                            const reportTime = new Date(s.monitorTime).getTime();
                            const currentBest = stationLatestTime.get(s.stationId) ?? 0;
                            if (reportTime > currentBest) {
                                stationLatestTime.set(s.stationId, reportTime);
                            }
                        }

                        const val = parseFloat(s.monitorValue) || 0;
                        const isWater = s.monitorItem.toLowerCase().includes('water') || s.monitorItem.toLowerCase().includes('nw_');

                        if (isWater) {
                            waterStationCount++;
                            const wLevel = savedLevels[s.stationId] ?? 4.5;
                            const cLevel = wLevel * 1.1;
                            if (val >= cLevel) critical++;
                            else if (val >= wLevel) warning++;

                            if (val > maxWater) {
                                maxWater = val;
                                maxWaterStationName = s.stationName || s.stationId;
                            }
                        } else {
                            // Rain
                            rainStationCount++;
                            if (!isNaN(val)) {
                                totalRain += val;
                                rainCount++;
                            }
                        }
                    });

                    // นับจำนวนสถานีออฟไลน์จาก Heartbeat Timeout (ไม่ส่งข้อมูลเกิน 24 ชม.)
                    let computedOfflineCount = 0;
                    stationLatestTime.forEach((lastTime) => {
                        if (now - lastTime > OFFLINE_THRESHOLD_MS) {
                            computedOfflineCount++;
                        }
                    });
                    setOfflineCount(computedOfflineCount);

                    // --- การเรียงลำดับความสำคัญ (Sorting by Severity) ---
                    // ให้ความสำคัญกับสถานีที่วิกฤต (Critical) > เฝ้าระวัง (Warning) > ปกติ (Normal)
                    latestRes.sort((a: any, b: any) => {
                        const getSeverity = (station: any) => {
                            const isWater = station.monitorItem.toLowerCase().includes('water') || station.monitorItem.toLowerCase().includes('nw_');
                            if (!isWater) return 0;
                            const val = parseFloat(station.monitorValue) || 0;
                            const wLevel = savedLevels[station.stationId] ?? 4.5;
                            const cLevel = wLevel * 1.1;
                            if (val >= cLevel) return 2; // Critical
                            if (val >= wLevel) return 1; // Warning
                            return 0; // Normal
                        };
                        return getSeverity(b) - getSeverity(a); // เรียงจากมากไปน้อย
                    });

                    setAlertCounts({ critical, warning });
                    setStationStats({ water: waterStationCount, rain: rainStationCount });
                    setWaterValue(maxWater !== -Infinity ? maxWater.toFixed(2) : "---");
                    setWaterSubtitle(maxWater !== -Infinity ? `จากสถานี: ${maxWaterStationName}` : "");
                    setRainValue(rainCount > 0 ? (totalRain / rainCount).toFixed(2) : "---");
                }

                setLatestStations(latestRes || []);

            } catch (error) {
                console.error("Error:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);



    return (
        <main className={styles.container}>

            {/* --- ส่วนบน: การ์ดสรุป --- */}
            <section className={styles.topSection}>
                <div className={styles.topLeft}>
                    <div className={styles.cardGrid}>
                        {/* 1. การ์ดแจ้งเตือน (ความสำคัญสูงสุด - เอาไว้ซ้ายสุด) */}
                        <AlertCard
                            criticalCount={alertCounts.critical}
                            warningCount={alertCounts.warning}
                        />

                        {/* 2. การจัดเรียงตามสิทธิ์ (Role-Based Rendering) */}
                        {user?.role === 'admin' ? (
                            <>
                                {/* Admin: โชว์สถานีออฟไลน์ (คำนวณจาก Heartbeat Timeout จริงๆ) ตามด้วยข้อมูลน้ำ */}
                                <DataCard
                                    title="สถานีออฟไลน์"
                                    value={offlineCount}
                                    unit="สถานี"
                                    theme={offlineCount > 0 ? 'red' : 'blue'}
                                    subtitle="ไม่ได้รับข้อมูลเกิน 24 ชั่วโมง"
                                />
                                <DataCard title="ระดับน้ำสูงสุด" value={waterValue} unit="เมตร" theme="blue" subtitle={waterSubtitle} />
                                <DataCard title="ปริมาณน้ำฝนเฉลี่ย" value={rainValue} unit="มม./ชม." theme="blue" subtitle="ข้อมูลจากทุกสถานี" />
                            </>
                        ) : (
                            <>
                                {/* User: โชว์ข้อมูลน้ำก่อน เพื่อเฝ้าระวังภัยพิบัติ */}
                                <DataCard title="ระดับน้ำสูงสุด" value={waterValue} unit="เมตร" theme="orange" subtitle={waterSubtitle} />
                                <DataCard title="ปริมาณน้ำฝนเฉลี่ย" value={rainValue} unit="มม./ชม." theme="blue" subtitle="ข้อมูลจากทุกสถานี" />
                                <DataCard title="จำนวนสถานีทั้งหมด" value={latestStations.length || 1} unit="สถานี" theme="blue" subtitle={`(วัดระดับน้ำ: ${stationStats.water} / วัดปริมาณฝน: ${stationStats.rain})`} />
                            </>
                        )}

                        {/* Admin: การ์ดสรุปจำนวนสถานีทั้งหมด */}
                        {user?.role === 'admin' && (
                            <DataCard
                                title="จำนวนสถานีทั้งหมด"
                                value={latestStations.length || 1}
                                unit="สถานี"
                                theme="blue"
                                subtitle={`(วัดระดับน้ำ: ${stationStats.water} / วัดปริมาณฝน: ${stationStats.rain})`}
                            />
                        )}
                    </div>
                </div>
            </section>

            {/* --- ส่วนกลาง: กราฟ (Bar Chart ภาพรวม) --- */}
            <section className={styles.chartSection}>
                <div className={styles.chartWrapper}>
                    <DashboardChart latestData={latestStations} />
                </div>
            </section>

            {/* --- ส่วนล่าง: ตารางข้อมูล --- */}
            <section className={styles.tableSection}>
                <StationTable
                    latestStations={latestStations}
                    isLoading={isLoading}
                />
            </section>
        </main>
    );
};

export default DashboardPage;