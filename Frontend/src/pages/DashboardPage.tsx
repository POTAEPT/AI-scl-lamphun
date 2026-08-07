// src/pages/DashboardPage.tsx

import { useState, useCallback, useEffect, useMemo } from 'react';
import { DeviceService, MockDeviceService, type DeviceRangeData, type StationLatestInfo } from '../service/deviceService';
import WaterLevelChart from '../components/WaterLevelChart';
import DataCard from '../components/DataCard';
import AlertCard from '../components/AlertCard';
import MultiStationTable from '../components/MultiStationTable';
import styles from '../styles/DashboradPage.module.css';

const USE_MOCK_DATA = true;

// threshold เดียวกับ MapGIS
const WARNING_LEVEL  = 3.5;
const CRITICAL_LEVEL = 5.0;

const calcStatus = (val: number): 'normal' | 'warning' | 'critical' => {
    if (val >= CRITICAL_LEVEL) return 'critical';
    if (val >= WARNING_LEVEL)  return 'warning';
    return 'normal';
};

const DashboardPage = () => {
    // ---- state: ข้อมูลทุกสถานี ----
    const [allStations, setAllStations] = useState<StationLatestInfo[]>([]);
    const [isLoading,   setIsLoading]   = useState(true);

    // ---- state: สถานีที่เลือกดูกราฟ ----
    const [selectedId, setSelectedId] = useState<string>('');

    // ---- state: ประวัติของสถานีที่เลือก ----
    const [waterHistory, setWaterHistory] = useState<DeviceRangeData[]>([]);
    const [rainHistory,  setRainHistory]  = useState<DeviceRangeData[]>([]);
    const [chartLoading, setChartLoading] = useState(false);

    // ---- ค่า live จากกราฟ ----
    const [waterValue, setWaterValue] = useState('---');
    const [rainValue,  setRainValue]  = useState('---');

    const handleDataUpdate = useCallback((water: number, rain: number) => {
        setWaterValue(water.toFixed(3));
        setRainValue(rain.toFixed(3));
    }, []);

    // ---- fetch ทุกสถานีครั้งแรก ----
    useEffect(() => {
        const fetchAll = async () => {
            setIsLoading(true);
            try {
                const data = USE_MOCK_DATA
                    ? await MockDeviceService.getLatestStations()
                    : await DeviceService.getLatestStations();
                setAllStations(data);
                if (data.length > 0) setSelectedId(data[0].deviceId);
            } catch (e) {
                console.error('fetchAll error:', e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAll();
    }, []);

    // ---- fetch ประวัติเมื่อเลือกสถานี ----
    useEffect(() => {
        if (!selectedId) return;
        const fetchHistory = async () => {
            setChartLoading(true);
            try {
                const secretKey = import.meta.env.VITE_API_deviceSecretKey || 'MOCK_KEY';
                const end   = Date.now();
                const start = end - 24 * 60 * 60 * 1000;
                const [water, rain] = await Promise.all([
                    USE_MOCK_DATA
                        ? MockDeviceService.getHistory(selectedId, secretKey, 'water_level', start, end)
                        : DeviceService.getHistory(selectedId, secretKey, 'water_level', start, end),
                    USE_MOCK_DATA
                        ? MockDeviceService.getHistory(selectedId, secretKey, 'rain_fall', start, end)
                        : DeviceService.getHistory(selectedId, secretKey, 'rain_fall', start, end),
                ]);
                setWaterHistory(water);
                setRainHistory(rain);
            } catch (e) {
                console.error('fetchHistory error:', e);
            } finally {
                setChartLoading(false);
            }
        };
        fetchHistory();
    }, [selectedId]);

    // ---- คำนวณ AlertCard ----
    const alertCounts = useMemo(() => {
        let critical = 0, warning = 0;
        for (const s of allStations) {
            const v = parseFloat(s.monitorValue);
            if (!isNaN(v)) {
                const st = calcStatus(v);
                if (st === 'critical') critical++;
                else if (st === 'warning') warning++;
            }
        }
        return { critical, warning };
    }, [allStations]);

    // ---- ข้อมูลสถานีที่เลือก (สำหรับชื่อใน selector) ----
    const selectedStation = allStations.find(s => s.deviceId === selectedId);

    return (
        <main className={styles.container}>

            {/* ส่วนบน: DataCards เต็มแถว (ไม่มี prob table แล้ว) */}
            <section className={styles.topSection}>
                <div className={styles.cardGrid}>
                    <DataCard
                        title="จำนวนสถานี"
                        value={isLoading ? '...' : allStations.length}
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
                    <AlertCard
                        criticalCount={alertCounts.critical}
                        warningCount={alertCounts.warning}
                    />
                </div>
            </section>

            {/* ตัวเลือกสถานี + กราฟ */}
            <section className={styles.chartSection}>
                <div className={styles.chartWrapper}>
                    {/* Station Selector — Dropdown */}
                    <div className={styles.stationSelectorRow}>
                        <span className={styles.selectorLabel}>เลือกสถานี</span>
                        <div className={styles.dropdownWrap}>
                            {(() => {
                                const sel = allStations.find(s => s.deviceId === selectedId);
                                const val = sel ? parseFloat(sel.monitorValue) : NaN;
                                const st  = isNaN(val) ? 'normal' : calcStatus(val);
                                const dotColor =
                                    st === 'critical' ? 'var(--color-status-critical)' :
                                    st === 'warning'  ? 'var(--color-status-warning)'  :
                                    'var(--color-status-normal)';
                                return <span className={styles.dropdownDot} style={{ background: dotColor }} />;
                            })()}
                            <select
                                className={styles.stationDropdown}
                                value={selectedId}
                                onChange={e => setSelectedId(e.target.value)}
                            >
                                {allStations.map(s => {
                                    const val = parseFloat(s.monitorValue);
                                    const st  = isNaN(val) ? 'normal' : calcStatus(val);
                                    const flag =
                                        st === 'critical' ? ' 🔴' :
                                        st === 'warning'  ? ' 🟡' : ' 🟢';
                                    return (
                                        <option key={s.deviceId} value={s.deviceId}>
                                            {s.stationName}{flag}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>

                    {/* กราฟ */}
                    {chartLoading ? (
                        <div className={styles.chartLoading}>กำลังโหลดข้อมูลกราฟ...</div>
                    ) : (
                        <WaterLevelChart
                            waterData={waterHistory}
                            rainData={rainHistory}
                            onDataUpdate={handleDataUpdate}
                            warningLevel={WARNING_LEVEL > 0 ? WARNING_LEVEL : undefined}
                            criticalLevel={CRITICAL_LEVEL > 0 ? CRITICAL_LEVEL : undefined}
                        />
                    )}
                </div>
            </section>

            {/* ตาราง: แถวละ 1 สถานี ทั้ง 5 */}
            <section className={styles.tableSection}>
                <MultiStationTable
                    stations={allStations}
                    isLoading={isLoading}
                    selectedId={selectedId}
                    onSelectStation={setSelectedId}
                    warningLevel={WARNING_LEVEL}
                    criticalLevel={CRITICAL_LEVEL}
                />
            </section>

        </main>
    );
};

export default DashboardPage;