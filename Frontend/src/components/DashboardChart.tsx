import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { StationLatestInfo } from '../service/deviceService';

interface DashboardChartProps {
  latestData: StationLatestInfo[];
}

const DashboardChart: React.FC<DashboardChartProps> = ({ latestData }) => {
  const chartData = useMemo(() => {
    const savedLevelsStr = localStorage.getItem('mock_warning_levels');
    const savedLevels = savedLevelsStr ? JSON.parse(savedLevelsStr) : {};

    // กรองเอาเฉพาะข้อมูลระดับน้ำมาแสดงบน Bar Chart เพื่อไม่ให้ชื่อสถานีซ้ำกับเซนเซอร์ฝน
    const waterStations = latestData.filter(s => s.monitorItem.toLowerCase().includes('water') || s.monitorItem.toLowerCase().includes('nw_'));

    return waterStations.map(s => {
      const wl = parseFloat(s.monitorValue) || 0;
      const warningLevel = savedLevels[s.stationId] ?? 4.5;
      const criticalLevel = parseFloat((warningLevel * 1.1).toFixed(2));
      
      let statusColor = '#10B981'; // normal (green)
      if (wl >= criticalLevel) statusColor = '#EF4444'; // critical (red)
      else if (wl >= warningLevel) statusColor = '#FFAE00'; // warning (yellow)

      return {
        name: s.stationName || s.stationId,
        waterLevel: wl,
        color: statusColor,
        warningLevel,
        criticalLevel
      };
    });
  }, [latestData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: 'rgba(30,41,59,0.97)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: '10px',
          color: '#fff',
          fontSize: '12px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{data.name}</div>
          <div>ระดับน้ำ: <span style={{ color: data.color, fontWeight: 'bold' }}>{data.waterLevel.toFixed(2)} ม.</span></div>
          <div style={{ color: '#FFAE00', marginTop: '4px' }}>จุดเฝ้าระวัง: {data.warningLevel.toFixed(2)} ม.</div>
          <div style={{ color: '#EF4444' }}>จุดวิกฤต: {data.criticalLevel.toFixed(2)} ม.</div>
        </div>
      );
    }
    return null;
  };

  if (!latestData || latestData.length === 0) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8' }}>ไม่มีข้อมูลสถานี</div>;
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
          <XAxis 
            dataKey="name" 
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            dy={10}
          />
          <YAxis 
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            unit=" ม."
            dx={-10}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          <Bar dataKey="waterLevel" radius={[4, 4, 0, 0]} maxBarSize={60}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DashboardChart;
