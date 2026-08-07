// src/components/MultiStationTable.tsx
// ตารางที่แสดงทุกสถานี — แถวละ 1 สถานี

import React, { useCallback } from 'react';
import type { StationLatestInfo } from '../service/deviceService';
import styles from '../styles/MultiStationTable.module.css';

interface MultiStationTableProps {
    stations: StationLatestInfo[];
    isLoading: boolean;
    selectedId: string;
    onSelectStation: (deviceId: string) => void;
    warningLevel:  number;
    criticalLevel: number;
}

const calcStatus = (
    val: number,
    w: number,
    c: number
): 'normal' | 'warning' | 'critical' => {
    if (c > 0 && val >= c) return 'critical';
    if (w > 0 && val >= w) return 'warning';
    return 'normal';
};

const StatusBadge: React.FC<{ status: 'normal' | 'warning' | 'critical' }> = ({ status }) => {
    const map = {
        normal:   { label: 'ปกติ',      cls: styles.badgeNormal   },
        warning:  { label: 'เฝ้าระวัง', cls: styles.badgeWarning  },
        critical: { label: 'วิกฤต',     cls: styles.badgeCritical },
    };
    const { label, cls } = map[status];
    return (
        <span className={`${styles.badge} ${cls}`}>
            <span className={styles.badgeDot} />
            {label}
        </span>
    );
};

const MultiStationTable: React.FC<MultiStationTableProps> = React.memo(({
    stations,
    isLoading,
    selectedId,
    onSelectStation,
    warningLevel,
    criticalLevel,
}) => {
    const handleExport = useCallback(() => {
        const headers = ['ชื่อสถานี,ระดับน้ำ (ม.),สัญญาณ,แบตเตอรี่ (%),สถานะ,เวลา'];
        const rows = stations.map(s => {
            const val = parseFloat(s.monitorValue);
            const st  = isNaN(val) ? 'normal' : calcStatus(val, warningLevel, criticalLevel);
            return `${s.stationName},${isNaN(val) ? '-' : val.toFixed(3)},${s.signal},${s.battery},${st},${s.monitorTime}`;
        });
        const csv = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
        const link = document.createElement('a');
        link.href = encodeURI(csv);
        link.download = `stations_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [stations, warningLevel, criticalLevel]);

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingText}>กำลังโหลดข้อมูลสถานี...</div>
            </div>
        );
    }

    if (stations.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyText}>ไม่มีข้อมูลสถานี</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.exportRow}>
                <span className={styles.tableTitle}>ข้อมูลสถานีทั้งหมด</span>
                <button className={styles.exportBtn} onClick={handleExport}>
                    Export CSV
                </button>
            </div>

            <div className={styles.tableHeader}>
                <div>ชื่อสถานี</div>
                <div className={styles.center}>เวลาล่าสุด</div>
                <div className={styles.center}>สัญญาณ</div>
                <div className={styles.center}>แบตเตอรี่</div>
                <div className={styles.center}>ระดับน้ำ (ม.)</div>
                <div className={styles.center}>สถานะ</div>
            </div>

            <div className={styles.tableBody}>
                {stations.map(s => {
                    const val    = parseFloat(s.monitorValue);
                    const status = isNaN(val) ? 'normal' : calcStatus(val, warningLevel, criticalLevel);
                    const isSelected = s.deviceId === selectedId;

                    const borderColor =
                        status === 'critical' ? 'var(--color-status-critical)' :
                        status === 'warning'  ? 'var(--color-status-warning)'  :
                        'var(--color-status-normal)';

                    const formattedTime = s.monitorTime
                        ? new Date(s.monitorTime).toLocaleTimeString('th-TH', {
                            hour: '2-digit', minute: '2-digit'
                          })
                        : '--:--';

                    return (
                        <div
                            key={s.deviceId}
                            className={`${styles.row}
                                ${status === 'critical' ? styles.rowCritical : ''}
                                ${status === 'warning'  ? styles.rowWarning  : ''}
                                ${isSelected ? styles.rowSelected : ''}
                            `}
                            style={{ borderLeftColor: borderColor }}
                            onClick={() => onSelectStation(s.deviceId)}
                            title="คลิกเพื่อดูกราฟสถานีนี้"
                        >
                            {/* ชื่อสถานี */}
                            <div className={styles.nameCell}>
                                <span className={styles.stationName}>{s.stationName}</span>
                                {isSelected && (
                                    <span className={styles.selectedPill}>กำลังดูกราฟ</span>
                                )}
                            </div>

                            {/* เวลา */}
                            <div className={styles.center}>{formattedTime}</div>

                            {/* สัญญาณ */}
                            <div className={styles.center}>
                                <i
                                    className={`bi ${s.signal === 'online' ? 'bi-reception-4' : 'bi-reception-1'}`}
                                    style={{
                                        fontSize: 17,
                                        color: s.signal === 'online'
                                            ? 'var(--color-status-normal)'
                                            : 'var(--color-status-warning)',
                                    }}
                                />
                            </div>

                            {/* แบตเตอรี่ */}
                            <div className={styles.center}>
                                <i
                                    className={`bi ${s.battery > 20 ? 'bi-battery-full' : 'bi-battery-empty'}`}
                                    style={{
                                        fontSize: 17,
                                        color: s.battery > 20
                                            ? 'var(--color-status-normal)'
                                            : 'var(--color-status-critical)',
                                    }}
                                />
                                <span className={styles.batteryPct}>{s.battery}%</span>
                            </div>

                            {/* ระดับน้ำ */}
                            <div
                                className={`${styles.center} ${styles.waterValue}`}
                                style={{ color: borderColor }}
                            >
                                {isNaN(val) ? '-' : val.toFixed(3)}
                            </div>

                            {/* สถานะ */}
                            <div className={styles.center}>
                                <StatusBadge status={status} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default MultiStationTable;