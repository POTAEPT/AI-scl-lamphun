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
}

const ROW_LIMIT = 20;

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

    const calculateStatus = (
      water: string,
    ): "normal" | "warning" | "critical" => {
      const val = parseFloat(water);
      if (isNaN(val)) return "normal";
      if (val >= 5.0) return "critical";
      if (val >= 4.5) return "warning";
      return "normal";
    };

    for (const item of waterData) {
      dataMap.set(item.monitorTime, {
        rawTimestamp: item.monitorTime,
        timestamp: formatDisplayTime(item.monitorTime),
        waterLevel: parseFloat(item.monitorValue).toFixed(3),
        rainfall: "-",
        name: stationName,
      });
    }

    for (const item of rainData) {
      const existing = dataMap.get(item.monitorTime) || {
        rawTimestamp: item.monitorTime,
        timestamp: formatDisplayTime(item.monitorTime),
        waterLevel: "-",
        name: stationName,
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
    const headers = [
      "Station Name,Timestamp,Water Level (m),Rainfall (mm/h),Status",
    ];
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

  if (isLoading) {
    return <div className={styles.loadingText}>Loading Data...</div>;
  }

  return (
    <div className={styles.container}>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "12px 24px 0",
        }}
      >
        <button
          onClick={handleExportCSV}
          style={{
            padding: "4px 14px",
            backgroundColor: "#FFFFFF",
            border: "none",
            borderRadius: "40px",
            cursor: "pointer",
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: "12px",
            fontWeight: "600",
            color: "#111827",
            letterSpacing: "0.3px",
          }}
        >
          Export CSV
        </button>
      </div>

      <div className={styles.tableHeader}>
        <div>ชื่อสถานี</div>
        <div>เวลา</div>
        <div className={styles.iconCell}>สัญญาณ</div>
        <div className={styles.iconCell}>แบตเตอรี่</div>
        <div className={styles.centerAlign}>ระดับน้ำ(เมตร)</div>
        <div className={styles.centerAlign}>ปริมาณน้ำฝน(มิลลิเมตร/ชั่วโมง)</div>
      </div>

      <div className={styles.tableBody}>
        {tableData.length === 0 ? (
          <div className={styles.emptyText}>ไม่มีข้อมูลสถานี</div>
        ) : (
          tableData.map((row) => (
            <div key={row.id} className={styles.dataRow}>
              <div>
                {row.name}
                {row.status !== "normal" && (
                  <span
                    className={`${styles.statusText} ${
                      row.status === "critical"
                        ? styles.statusCritical
                        : styles.statusWarning
                    }`}
                  >
                    ({row.status})
                  </span>
                )}
              </div>
              <div>{row.timestamp}</div>

              <div className={styles.iconCell}>สัญญาณ</div>
              <div className={styles.iconCell}>แบตเตอรี่</div>

              <div className={styles.centerAlign}>{row.waterLevel}</div>
              <div className={styles.centerAlign}>{row.rainfall}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

export default StationTable;