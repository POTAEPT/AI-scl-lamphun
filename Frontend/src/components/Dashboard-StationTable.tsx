import React, { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { StationLatestInfo } from "../service/deviceService";
import styles from "../styles/Dashboard-StationTable.module.css";

interface StationTableProps {
  latestStations: StationLatestInfo[];
  isLoading: boolean;
}

interface TableRowData {
  id: string;
  name: string;
  timestamp: string;
  waterLevel: string;
  rainfall: string;
  status: "normal" | "warning" | "critical";
  signal: "online" | "offline";
  warningLevel: number;
  criticalLevel: number;
}



// --- StatusBadge sub-component ---
const StatusBadge: React.FC<{ status: "normal" | "warning" | "critical" }> = ({ status }) => {
  const map = {
    normal:   { label: "ปกติ",      cls: styles.badgeNormal   },
    warning:  { label: "เฝ้าระวัง", cls: styles.badgeWarning  },
    critical: { label: "วิกฤต",     cls: styles.badgeCritical },
  };
  const { label, cls } = map[status];
  return (
    <span className={`${styles.statusBadge} ${cls}`}>
      <span className={styles.badgeDot} />
      {label}
    </span>
  );
};

// --- SignalIcon sub-component ---
const SignalIcon: React.FC<{ signal: "online" | "offline" }> = ({ signal }) => {
  const isOnline = signal === "online";
  return (
    <div className={styles.iconCell}>
      <i
        className={`bi ${isOnline ? "bi-reception-4" : "bi-reception-1"} ${
          isOnline ? styles.iconOnline : styles.iconOffline
        }`}
      />
    </div>
  );
};

// --- BatteryIcon sub-component ---
const BatteryIcon: React.FC<{ signal: "online" | "offline" }> = ({ signal }) => {
  const isOnline = signal === "online";
  return (
    <div className={styles.iconCell}>
      <i
        className={`bi ${isOnline ? "bi-battery-full" : "bi-battery-empty"} ${
          isOnline ? styles.iconOnline : styles.iconOffline
        }`}
      />
    </div>
  );
};

// --- Main Component ---
const StationTable: React.FC<StationTableProps> = React.memo(({
  latestStations,
  isLoading,
}) => {
  const navigate = useNavigate();
  
  const tableData: TableRowData[] = useMemo(() => {
    const savedLevelsStr = localStorage.getItem('mock_warning_levels');
    const savedLevels = savedLevelsStr ? JSON.parse(savedLevelsStr) : {};

    const formatDisplayTime = (isoString: string) => {
      if (!isoString) return "-";
      try {
        const date = new Date(isoString);
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();
        const timeStr = date
          .toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
          .replace(":", ".");
        const dateStr = date.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });
        return `${isToday ? "Today" : dateStr}, ${timeStr}`;
      } catch {
        return isoString;
      }
    };

    const grouped = new Map<string, TableRowData>();

    latestStations.forEach((item) => {
      const isWater = item.monitorItem.toLowerCase().includes('water') || item.monitorItem.toLowerCase().includes('nw_');
      const val = parseFloat(item.monitorValue) || 0;
      
      if (!grouped.has(item.stationId)) {
        grouped.set(item.stationId, {
          id: item.stationId,
          name: item.stationName || item.stationId,
          timestamp: formatDisplayTime(item.monitorTime),
          waterLevel: "-",
          rainfall: "-",
          status: "normal",
          signal: "online",
          warningLevel: 4.5,
          criticalLevel: 4.95
        });
      }
      
      const row = grouped.get(item.stationId)!;
      
      if (isWater) {
        row.waterLevel = val.toFixed(3);
        
        const warningLevel = savedLevels[item.stationId] ?? 4.5;
        const criticalLevel = parseFloat((warningLevel * 1.1).toFixed(2));
        row.warningLevel = warningLevel;
        row.criticalLevel = criticalLevel;
        
        if (val >= criticalLevel) row.status = "critical";
        else if (val >= warningLevel) row.status = "warning";
      } else {
        // Rain
        row.rainfall = val.toFixed(3);
      }
    });

    return Array.from(grouped.values());
  }, [latestStations]);

  const handleExportCSV = useCallback(() => {
    const headers = ["Station Name,Timestamp,Water Level (m),Rainfall (mm/h),Status"];
    const rows = tableData.map(
      (row) =>
        `${row.name},${row.timestamp},${row.waterLevel},${row.rainfall},${row.status}`,
    );
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "station_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [tableData]);

  // helper: CSS class สำหรับแถว
  const rowClass = (status: "normal" | "warning" | "critical") => {
    if (status === "critical") return `${styles.dataRow} ${styles.rowCritical}`;
    if (status === "warning")  return `${styles.dataRow} ${styles.rowWarning}`;
    return `${styles.dataRow} ${styles.rowNormal}`;
  };

  // helper: CSS class สำหรับตัวเลข
  const valueClass = (status: "normal" | "warning" | "critical") => {
    if (status === "critical") return styles.valueCritical;
    if (status === "warning")  return styles.valueWarning;
    return styles.valueNormal;
  };

  // ลบ if (isLoading) return ... ออก เพื่อให้ไป Render Skeleton ข้างล่างแทน

  return (
    <div className={styles.container}>
      <div className={styles.exportContainer}>
        <button onClick={handleExportCSV} className={styles.exportButton}>
          <i className="bi bi-download" style={{ marginRight: '6px' }}></i>
          ส่งออกภาพรวมทั้งหมด (CSV)
        </button>
      </div>

      <div className={styles.tableHeader}>
        <div>ชื่อสถานี</div>
        <div>เวลา</div>
        <div className={styles.centerAlign}>สัญญาณ</div>
        <div className={styles.centerAlign}>แบตเตอรี่</div>
        <div className={styles.centerAlign}>ระดับน้ำ (ม.)</div>
        <div className={styles.centerAlign}>ปริมาณน้ำฝน (มม./ชม.)</div>
      </div>

      <div className={styles.tableBody}>
        {isLoading ? (
          // --- Skeleton Loading State ---
          Array.from({ length: 5 }).map((_, i) => (
            <div key={`skel-${i}`} className={`${styles.dataRow} ${styles.rowNormal}`} style={{ pointerEvents: 'none' }}>
              <div className={styles.stationNameCell}>
                <div className="skeleton skeleton-text" style={{ width: '120px', margin: 0 }}></div>
              </div>
              <div><div className="skeleton skeleton-text" style={{ width: '80px', margin: 0 }}></div></div>
              <div className={styles.centerAlign}><div className="skeleton skeleton-circle" style={{ width: 20, height: 20 }}></div></div>
              <div className={styles.centerAlign}><div className="skeleton skeleton-circle" style={{ width: 20, height: 20 }}></div></div>
              <div className={styles.centerAlign}><div className="skeleton skeleton-text" style={{ width: '40px', margin: 0 }}></div></div>
              <div className={styles.centerAlign}><div className="skeleton skeleton-text" style={{ width: '40px', margin: 0 }}></div></div>
            </div>
          ))
        ) : tableData.length === 0 ? (
          <div className={styles.emptyText}>ไม่มีข้อมูลสถานี</div>
        ) : (
          tableData.map((row) => (
            <div 
              key={row.id} 
              className={rowClass(row.status)}
              onClick={() => navigate(`/station?id=${row.id}`)}
            >
              {/* ชื่อสถานี + Badge */}
              <div className={styles.stationNameCell}>
                <span className={styles.stationName}>{row.name}</span>
                <StatusBadge status={row.status} />
              </div>

              {/* เวลา */}
              <div>{row.timestamp}</div>

              {/* สัญญาณ */}
              <SignalIcon signal={row.signal} />

              {/* แบตเตอรี่ */}
              <BatteryIcon signal={row.signal} />

              {/* ระดับน้ำ */}
              <div className={`${styles.centerAlign} ${valueClass(row.status)}`}>
                {row.waterLevel}
              </div>

              {/* ปริมาณน้ำฝน */}
              <div className={`${styles.centerAlign} ${styles.valueNormal}`}>
                {row.rainfall}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

export default StationTable;