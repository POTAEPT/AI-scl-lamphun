import React, { useMemo, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
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
}

// --- Sub-components ---
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

// --- Main Component ---
export const WaterLevelChart: React.FC<WaterLevelChartProps> = ({
  waterData = [],
  rainData = [],
  onDataUpdate
}) => {
  // Transform data from API format to chart format
  const chartData: WaterData[] = useMemo(() => {
    if (waterData.length === 0 && rainData.length === 0) {
      return [];
    }

    // Combine and sort by time
    const allData: WaterData[] = [];

    // Add water data
    for (const item of waterData) {
      const date = new Date(item.monitorTime);
      const timeStr = date.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
      });
      allData.push({
        time: timeStr,
        waterLevel: parseFloat(item.monitorValue) || 0,
        rainLevel: 0
      });
    }

    // Add rain data (accumulate within the same time point)
    for (const item of rainData) {
      const date = new Date(item.monitorTime);
      const timeStr = date.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
      });
      const existing = allData.find(d => d.time === timeStr);
      if (existing) {
        existing.rainLevel += parseFloat(item.monitorValue) || 0;
      } else {
        allData.push({
          time: timeStr,
          waterLevel: 0,
          rainLevel: parseFloat(item.monitorValue) || 0
        });
      }
    }

    // Sort by time ascending and limit to last 24 entries
    allData.sort((a, b) => a.time.localeCompare(b.time));
    return allData.slice(-24);
  }, [waterData, rainData]);

  // Get latest values for DataCards
  useEffect(() => {
    if (chartData.length === 0) return;

    const latest = chartData[chartData.length - 1];
    if (onDataUpdate) {
      onDataUpdate(latest.waterLevel, latest.rainLevel);
    }
  }, [chartData, onDataUpdate]);

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartBody}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRainfall" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-graf-rain)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--color-graf-rain)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="var(--color-text-secondary)" />
            <XAxis
                dataKey="time"
                fontSize={12}
                stroke="var(--color-text-secondary)"
                tickLine={false}
                axisLine={{stroke: "var(--color-text-secondary)"}}
                dy={10}
            />
            <YAxis
                fontSize={12}
                stroke="var(--color-text-secondary)"
                tickLine={false}
                axisLine={false}
                dx={-10}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--color-text-secondary)', strokeWidth: 1, strokeDasharray: '3 3' }} />

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

      <ChartLegend />
    </div>
  );
};

const ChartLegend = () => (
  <div className={styles.legendContainer}>
    <div className={styles.legendItem}>
      <svg width="24" height="12" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="4" cy="6" r="3" fill="#ffffff" stroke="var(--color-graf-rain)" strokeWidth="2"/>
        <line x1="7" y1="6" x2="17" y2="6" stroke="var(--color-graf-rain)" strokeWidth="2"/>
        <circle cx="20" cy="6" r="3" fill="#ffffff" stroke="var(--color-graf-rain)" strokeWidth="2"/>
      </svg>
      <span className={styles.legendText}>ปริมาณน้ำฝนสะสม</span>
    </div>
  </div>
);

export default WaterLevelChart;