// src/pages/DashboardPage.tsx

import { useState, useEffect } from 'react';
import StationTable from '../components/Dashboard-StationTable';
import AlertCard from '../components/AlertCard';
import { DeviceService, type StationLatestInfo } from '../service/deviceService';
import DashboardChart from '../components/DashboardChart';
import DataCard from '../components/DataCard';

import styles from '../styles/DashboradPage.module.css';

// *** ตัวสลับโหมด ***
const USE_MOCK_DATA = true;

const DashboardPage = () => {
    const [waterValue, setWaterValue] = useState<string>("---");
    const [waterSubtitle, setWaterSubtitle] = useState<string>("");
    const [rainValue,  setRainValue]  = useState<string>("---");

    // waterHistory and rainHistory are no longer used since we only use latestStations for the dashboard.

    const [latestStations, setLatestStations] = useState<StationLatestInfo[]>([]);

    const [isLoading, setIsLoading] = useState<boolean>(false);


    
    const [alertCounts, setAlertCounts] = useState({ critical: 0, warning: 0 });



    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                let latestRes;

                if (USE_MOCK_DATA) {
                    const results = await Promise.all([
                        DeviceService.getLatestStations()
                    ]);
                    latestRes = results[0];
                } else {
                    const results = await Promise.all([
                        DeviceService.getLatestStations()
                    ]);
                    latestRes = results[0];
                }

                // --- ตรวจสอบ Alert และคำนวณค่าสูงสุด/เฉลี่ยจากข้อมูลล่าสุดของทุกสถานี ---
                if (latestRes && latestRes.length > 0) {
                    const savedLevelsStr = localStorage.getItem('mock_warning_levels');
                    const savedLevels = savedLevelsStr ? JSON.parse(savedLevelsStr) : {};
                    let warning = 0;
                    let critical = 0;
                    let maxWater = -Infinity;
                    let maxWaterStationName = "";
                    let totalRain = 0;
                    let rainCount = 0;
                    
                    latestRes.forEach((s: any) => {
                        const val = parseFloat(s.monitorValue) || 0;
                        const isWater = s.monitorItem.toLowerCase().includes('water') || s.monitorItem.toLowerCase().includes('nw_');
                        
                        if (isWater) {
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
                            if (!isNaN(val)) {
                                totalRain += val;
                                rainCount++;
                            }
                        }
                    });
                    
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
                        {/* การ์ดแจ้งเตือน (ความสำคัญสูงสุด - เอาไว้ซ้ายสุด) */}
                        <AlertCard
                            criticalCount={alertCounts.critical}
                            warningCount={alertCounts.warning}
                        />
                        <DataCard
                            title="ระดับน้ำสูงสุด"
                            value={waterValue}
                            unit="เมตร"
                            theme="orange"
                            subtitle={waterSubtitle}
                        />
                        <DataCard
                            title="ปริมาณน้ำฝนเฉลี่ย"
                            value={rainValue}
                            unit="มม./ชม."
                            theme="orange"
                            subtitle="ข้อมูลจากทุกสถานี"
                        />
                        <DataCard
                            title="จำนวนสถานี"
                            value={latestStations.length || 1}
                            unit="สถานี"
                            theme="blue"
                        />
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