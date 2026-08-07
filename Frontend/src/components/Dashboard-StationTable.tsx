import React, { useMemo, useCallback } from "react";
import type { DeviceRangeData } from "../service/deviceService";
import styles from "../styles/Dashboard-StationTable.module.css";

interface StationTableProps {
  waterData: DeviceRangeData[];
  rainData: DeviceRangeData[];
  isLoading: boolean;
  stationName?: string;
}

interface TableRowData {
  id: string;
  name: string;
  timestamp: string;
  waterLevel: string;
  rainfall: string;
  status: "normal" | "warning" | "critical";
  rawTimestamp: string;
  signal: "online" | "offline";
}

const ROW_LIMIT = 20;

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
  waterData,
  rainData,
  isLoading,
  stationName = "Unknown Station",
}) => {
  const tableData: TableRowData[] = useMemo(() => {
    const dataMap = new Map<string, Partial<TableRowData>>();

    const formatDisplayTime = (isoString: string) => {
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

    const calculateStatus = (water: string): "normal" | "warning" | "critical" => {
      const val = parseFloat(water);
      if (isNaN(val)) return "normal";
      if (val >= 5.0) return "critical";
      if (val >= 4.5) return "warning";
      return "normal";
    };

    // สมมติว่าข้อมูลจริงๆ จะมี signal field; ตอนนี้ใช้ค่า default = online
    for (const item of waterData) {
      dataMap.set(item.monitorTime, {
        rawTimestamp: item.monitorTime,
        timestamp: formatDisplayTime(item.monitorTime),
        waterLevel: parseFloat(item.monitorValue).toFixed(3),
        rainfall: "-",
        name: stationName,
        signal: "online",
      });
    }

    for (const item of rainData) {
      const existing = dataMap.get(item.monitorTime) || {
        rawTimestamp: item.monitorTime,
        timestamp: formatDisplayTime(item.monitorTime),
        waterLevel: "-",
        name: stationName,
        signal: "online",
      };
      existing.rainfall = parseFloat(item.monitorValue).toFixed(3);
      dataMap.set(item.monitorTime, existing);
    }

    return Array.from(dataMap.values())
      .map(
        (item) =>
          ({
            ...item,
            id: item.rawTimestamp!,
            status: calculateStatus(item.waterLevel as string),
          }) as TableRowData,
      )
      .sort(
        (a, b) =>
          new Date(b.rawTimestamp!).getTime() -
          new Date(a.rawTimestamp!).getTime(),
      )
      .slice(0, ROW_LIMIT);
  }, [waterData, rainData, stationName]);

  const handleExportCSV = useCallback(() => {
    const headers = ["Station Name,Timestamp,Water Level (m),Rainfall (mm/h),Status"];
    const rows = tableData.map(
      (row) =>
        `${row.name},${row.rawTimestamp},${row.waterLevel},${row.rainfall},${row.status}`,
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

  if (isLoading) {
    return <div className={styles.loadingText}>กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.exportContainer}>
        <button onClick={handleExportCSV} className={styles.exportButton}>
          Export CSV
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
        {tableData.length === 0 ? (
          <div className={styles.emptyText}>ไม่มีข้อมูลสถานี</div>
        ) : (
          tableData.map((row) => (
            <div key={row.id} className={rowClass(row.status)}>
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