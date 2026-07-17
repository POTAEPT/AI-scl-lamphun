// src/pages/SettingsPage.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import StationTable from '../components/StationTable';
import AddSensorModal from '../components/AddSensorModal';
import EditStationModal from '../components/EditStationModal';
import { DeviceService, type StationDeviceInfo } from '../service/deviceService';
import styles from '../styles/SettingsPage.module.css';

interface SettingsStationData {
  id: string;
  name: string;
  location: string;
  status: 'normal' | 'warning' | 'critical' | 'offline';
  date: Date;
  waterLevel?: string;
  rainfall?: string;
  alertThreshold?: string;
  latitude?: string;
  longitude?: string;
}

const SettingsPage = () => {
  const [stations, setStations] = useState<SettingsStationData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // State ควบคุม Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingStation, setEditingStation] = useState<SettingsStationData | null>(null);

  useEffect(() => {
    const fetchStations = async () => {
      setIsLoading(true);
      try {
        const stationDevices = await DeviceService.getStations();

        if (stationDevices.length === 0) {
          setStations([]);
          setIsLoading(false);
          return;
        }

        // Group by stationId and transform to SettingsStationData
        const uniqueStations = new Map<string, SettingsStationData>();
        for (const s of stationDevices) {
          if (!uniqueStations.has(s.stationId)) {
            uniqueStations.set(s.stationId, {
              id: s.stationId,
              name: s.stationName || 'Unknown Station',
              location: `${s.latitude}, ${s.longitude}`,
              status: 'normal',
              date: new Date(),
              latitude: s.latitude,
              longitude: s.longitude,
            });
          }
        }

        setStations(Array.from(uniqueStations.values()));
      } catch (error) {
        console.error("Error loading stations:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStations();
  }, []);

  // ฟังก์ชันเตรียมข้อมูลก่อนส่งให้ Modal Edit
  const handleEditClick = (station: SettingsStationData) => {
    setEditingStation(station);
    setIsEditModalOpen(true);
  };

  // ฟังก์ชันรับข้อมูลกลับมาจาก Modal Edit เพื่อคำนวณ Status และอัปเดตตาราง
  const handleSaveEdit = (stationId: string, newThreshold: string) => {
    const updatedStations = stations.map(station => {
      if (station.id === stationId) {
        const currentWater = parseFloat(station.waterLevel || '0');
        const maxLimit = parseFloat(newThreshold);
        let newStatus: 'normal' | 'warning' | 'critical' | 'offline' = 'normal';
        if (!isNaN(currentWater) && !isNaN(maxLimit)) {
          if (currentWater >= maxLimit) newStatus = 'critical';
          else if (currentWater >= maxLimit * 0.8) newStatus = 'warning';
        }
        return { ...station, alertThreshold: newThreshold, status: newStatus };
      }
      return station;
    });
    setStations(updatedStations);
  };

  return (
    <div className={styles.pageWrapper || ''} style={{ width: '100%' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
         <h1 style={{ color: 'var(--color-text-primary)', fontSize: '24px', fontWeight: 700 }}>หน้าการตั้งค่า (Demo)</h1>
         <button 
            onClick={() => setIsAddModalOpen(true)}
            style={{ backgroundColor: 'var(--color-text-primary)', color: 'var(--color-bg-page)', border: 'none', padding: '8px 24px', borderRadius: '20px', fontWeight: 600, cursor: 'pointer' }}
         >
           Add
         </button>
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--color-text-primary)' }}>Loading Stations...</div>
      ) : (
        <StationTable stations={stations} onEdit={handleEditClick} />
      )}

      {/* Modal Add Sensor */}
      <AddSensorModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={() => console.log("โหลดข้อมูลตารางใหม่หลังจากเพิ่มเสร็จ")}
      />

      {/* Modal Edit Sensor */}
      <EditStationModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        station={editingStation}
        onSave={handleSaveEdit}
      />

    </div>
  );
};

export default SettingsPage;