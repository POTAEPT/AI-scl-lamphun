// src/components/Station/StationTable.tsx
import React, { useCallback } from 'react';
import { Settings } from 'lucide-react';
import type { StationData } from './Station';

interface StationTableProps {
  stations: StationData[];
  onEdit: (station: StationData) => void;
}

const StationTable: React.FC<StationTableProps> = React.memo(({ stations, onEdit }) => {
  const handleEdit = useCallback((station: StationData) => {
    onEdit(station);
  }, [onEdit]);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', textAlign: 'center', color: 'var(--color-text-primary)' }}>
        <thead>
          <tr style={{ color: 'var(--color-text-secondary)', fontSize: '14px', borderBottom: '1px solid var(--color-border-line)' }}>
            <th style={{ padding: '12px', textAlign: 'left', width: '30%' }}>ชื่อสถานี</th>
            <th style={{ padding: '12px' }}>เวลา</th>
            <th style={{ padding: '12px' }}>สัญญาณ</th>
            <th style={{ padding: '12px' }}>แบตเตอรี่</th>
            <th style={{ padding: '12px' }}>ระดับน้ำ(เมตร)</th>
            <th style={{ padding: '12px' }}>ปริมาณน้ำฝน(มิลลิเมตร/ชั่วโมง)</th>
          </tr>
        </thead>
        <tbody style={{ fontSize: '14px', fontWeight: 500 }}>
          {stations.length > 0 ? (
            stations.map((item, index) => (
              <tr key={item.id || index} style={{ backgroundColor: 'var(--color-bg-surface)' }}>
                <td style={{ padding: '16px 20px', textAlign: 'left', borderRadius: '24px 0 0 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Settings size={18} style={{ color: 'var(--color-text-secondary)', cursor: 'pointer' }} onClick={() => handleEdit(item)} />
                  {item.name}
                </td>
                <td style={{ padding: '16px 0' }}>
                  {item.date ? item.date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '11:00'}
                </td>
                <td style={{ padding: '16px 0' }}>
                   <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.status === 'normal' ? 'var(--color-status-normal)' : (item.status === 'warning' ? 'var(--color-status-warning)' : 'var(--color-status-critical)') }}></span>
                </td>
                <td style={{ padding: '16px 0' }}>
                   <span style={{ display: 'inline-block', width: '12px', height: '8px', borderRadius: '4px', backgroundColor: item.status === 'normal' ? 'var(--color-status-normal)' : (item.status === 'warning' ? 'var(--color-status-warning)' : 'var(--color-status-critical)') }}></span>
                </td>
                <td style={{ padding: '16px 0', fontFamily: 'var(--font-data)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ color: item.status === 'critical' ? 'var(--color-status-critical)' : (item.status === 'warning' ? 'var(--color-status-warning)' : 'var(--color-status-normal)') }}>
                       {item.waterLevel || '-'}
                    </span>
                    {item.alertThreshold && (
                      <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                        Limit: {item.alertThreshold}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '16px 0', fontFamily: 'var(--font-data)', borderRadius: '0 24px 24px 0', color: 'var(--color-text-secondary)' }}>
                  {item.rainfall || '-'}
                </td>
              </tr>
            ))
          ) : (
            <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>ไม่มีข้อมูลสถานี</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
});

export default StationTable;