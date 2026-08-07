import React, { useMemo, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import type { DeviceRangeData } from '../service/deviceService';
import styles from '../styles/WaterLevelChart.module.css';

// --- Types & Interfaces ---
interface WaterData {
  time: string;
  waterLevel: number;
  rainLevel: number;
}

interface WaterLevelChartProps {
  waterData?: DeviceRangeData[];
  rainData?: DeviceRangeData[];
  onDataUpdate?: (water: number, rain: number) => void;
  /** ระดับน้ำแจ้งเตือน (เมตร) — วาดเส้นประแดงในกราฟ */
  warningLevel?: number;
  /** ระดับน้ำวิกฤต (เมตร) — วาดเส้นประแดงเข้มในกราฟ */
  criticalLevel?: number;
}

// --- Custom Tooltip ---
interface TooltipPayload {
  value: number;
  name: string;
  color: string;
  unit?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className={styles.customTooltip}>
      <p className={`${styles.tooltipTime} text-caption`}>เวลา {label} น.</p>
      {payload.map((entry: TooltipPayload, index: number) => (
        <div key={index} className={styles.tooltipValueRow}>
          <div className={styles.tooltipDot} style={{ backgroundColor: entry.color }}></div>
          <span className={styles.tooltipValue}>
            {entry.name}: {Number(entry.value).toFixed(3)} {entry.unit || ''}
          </span>
        </div>
      ))}
    </div>
  );
};

// --- Custom Reference Label ---
interface RefLabelProps {
  viewBox?: { x?: number; y?: number; width?: number };
  value: string;
  color: string;
}

const RefLabel: React.FC<RefLabelProps> = ({ viewBox, value, color }) => {
  const x = (viewBox?.x ?? 0) + (viewBox?.width ?? 0) - 4;
  const y = (viewBox?.y ?? 0) - 6;
  return (
    <text x={x} y={y} fill={color} fontSize={11} fontWeight={700} textAnchor="end">
      {value}
    </text>
  );
};

// --- Main Component ---
export const WaterLevelChart: React.FC<WaterLevelChartProps> = ({
  waterData = [],
  rainData = [],
  onDataUpdate,
  warningLevel,
  criticalLevel,
}) => {
  const chartData: WaterData[] = useMemo(() => {
    if (waterData.length === 0 && rainData.length === 0) return [];

    const allData: WaterData[] = [];

    for (const item of waterData) {
      const date = new Date(item.monitorTime);
      const timeStr = date.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      });
      allData.push({
        time: timeStr,
        waterLevel: parseFloat(item.monitorValue) || 0,
        rainLevel: 0,
      });
    }

    for (const item of rainData) {
      const date = new Date(item.monitorTime);
      const timeStr = date.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const existing = allData.find(d => d.time === timeStr);
      if (existing) {
        existing.rainLevel += parseFloat(item.monitorValue) || 0;
      } else {
        allData.push({ time: timeStr, waterLevel: 0, rainLevel: parseFloat(item.monitorValue) || 0 });
      }
    }

    allData.sort((a, b) => a.time.localeCompare(b.time));
    return allData.slice(-24);
  }, [waterData, rainData]);

  useEffect(() => {
    if (chartData.length === 0) return;
    const latest = chartData[chartData.length - 1];
    onDataUpdate?.(latest.waterLevel, latest.rainLevel);
  }, [chartData, onDataUpdate]);

  // คำนวณ Y domain ให้ Threshold Line มองเห็นได้เสมอ
  const yMax = useMemo(() => {
    const dataMax = Math.max(...chartData.map(d => Math.max(d.waterLevel, d.rainLevel)), 0);
    const thresholdMax = Math.max(warningLevel ?? 0, criticalLevel ?? 0);
    return Math.ceil(Math.max(dataMax, thresholdMax) * 1.15) || 10;
  }, [chartData, warningLevel, criticalLevel]);

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartBody}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 24, right: 20, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRainfall" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--color-graf-rain)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-graf-rain)" stopOpacity={0}    />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={true}
              stroke="var(--color-text-secondary)"
              strokeOpacity={0.2}
            />
            <XAxis
              dataKey="time"
              fontSize={12}
              stroke="var(--color-text-secondary)"
              tickLine={false}
              axisLine={{ stroke: "var(--color-text-secondary)", strokeOpacity: 0.3 }}
              dy={10}
            />
            <YAxis
              fontSize={12}
              stroke="var(--color-text-secondary)"
              tickLine={false}
              axisLine={false}
              dx={-10}
              domain={[0, yMax]}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: 'var(--color-text-secondary)', strokeWidth: 1, strokeDasharray: '3 3' }}
            />

            {/* เส้นระดับแจ้งเตือน */}
            {warningLevel !== undefined && (
              <ReferenceLine
                y={warningLevel}
                stroke="var(--color-status-warning)"
                strokeDasharray="6 3"
                strokeWidth={1.5}
                label={
                  <RefLabel
                    value={`เฝ้าระวัง ${warningLevel} ม.`}
                    color="var(--color-status-warning)"
                  />
                }
              />
            )}

            {/* เส้นระดับวิกฤต */}
            {criticalLevel !== undefined && (
              <ReferenceLine
                y={criticalLevel}
                stroke="var(--color-status-critical)"
                strokeDasharray="6 3"
                strokeWidth={2}
                label={
                  <RefLabel
                    value={`วิกฤต ${criticalLevel} ม.`}
                    color="var(--color-status-critical)"
                  />
                }
              />
            )}

            <Area
              type="monotone"
              dataKey="rainLevel"
              name="ปริมาณน้ำฝนสะสม"
              stroke="var(--color-graf-rain)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRainfall)"
              activeDot={{ r: 6, fill: "var(--color-graf-rain)", stroke: "#fff", strokeWidth: 2 }}
              dot={{ r: 3, fill: "#fff", stroke: "var(--color-graf-rain)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <ChartLegend warningLevel={warningLevel} criticalLevel={criticalLevel} />
    </div>
  );
};

interface ChartLegendProps {
  warningLevel?: number;
  criticalLevel?: number;
}

const ChartLegend: React.FC<ChartLegendProps> = ({ warningLevel, criticalLevel }) => (
  <div className={styles.legendContainer}>
    {/* เส้นข้อมูล */}
    <div className={styles.legendItem}>
      <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
        <circle cx="4"  cy="6" r="3" fill="#fff" stroke="var(--color-graf-rain)" strokeWidth="2" />
        <line x1="7" y1="6" x2="17" y2="6" stroke="var(--color-graf-rain)" strokeWidth="2" />
        <circle cx="20" cy="6" r="3" fill="#fff" stroke="var(--color-graf-rain)" strokeWidth="2" />
      </svg>
      <span className={styles.legendText}>ปริมาณน้ำฝนสะสม</span>
    </div>

    {/* เส้นเฝ้าระวัง */}
    {warningLevel !== undefined && (
      <div className={styles.legendItem}>
        <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
          <line x1="0" y1="6" x2="24" y2="6"
            stroke="var(--color-status-warning)"
            strokeWidth="2"
            strokeDasharray="5 3"
          />
        </svg>
        <span className={styles.legendText} style={{ color: "var(--color-status-warning)" }}>
          ระดับเฝ้าระวัง
        </span>
      </div>
    )}

    {/* เส้นวิกฤต */}
    {criticalLevel !== undefined && (
      <div className={styles.legendItem}>
        <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
          <line x1="0" y1="6" x2="24" y2="6"
            stroke="var(--color-status-critical)"
            strokeWidth="2"
            strokeDasharray="5 3"
          />
        </svg>
        <span className={styles.legendText} style={{ color: "var(--color-status-critical)" }}>
          ระดับวิกฤต
        </span>
      </div>
    )}
  </div>
);

export default WaterLevelChart;