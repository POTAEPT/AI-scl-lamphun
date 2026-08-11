// src/data/mockData.ts
import type { StationDeviceInfo, StationLatestInfo, DeviceRangeData, RainProbabilityData, DeviceInfoResponse } from '../service/deviceService';

// 1. ข้อมูลพื้นฐานสถานี
export const MOCK_STATIONS: StationDeviceInfo[] = [
  { stationId: 'ST-K1', stationName: 'สถานีสะพานดำ', latitude: '18.7012', longitude: '99.0876', deviceId: 'DEV-K1', deviceName: 'Sensor-Kuang-01', monitorItem: 'water_level' },
  { stationId: 'ST-K1', stationName: 'สถานีสะพานดำ', latitude: '18.7012', longitude: '99.0876', deviceId: 'DEV-RAIN-K1', deviceName: 'Sensor-Rain-01', monitorItem: 'rain' },
  { stationId: 'ST-K2', stationName: 'สถานีศาลากลางลำพูน', latitude: '18.6234', longitude: '99.0412', deviceId: 'DEV-K2', deviceName: 'Sensor-Kuang-02', monitorItem: 'water_level' },
  { stationId: 'ST-K2', stationName: 'สถานีศาลากลางลำพูน', latitude: '18.6234', longitude: '99.0412', deviceId: 'DEV-RAIN-K2', deviceName: 'Sensor-Rain-02', monitorItem: 'rain' },
  { stationId: 'ST-K3', stationName: 'สถานีสะพานท่าขาม', latitude: '18.5867', longitude: '99.0232', deviceId: 'DEV-K3', deviceName: 'Sensor-Kuang-03', monitorItem: 'water_level' },
  { stationId: 'ST-K3', stationName: 'สถานีสะพานท่าขาม', latitude: '18.5867', longitude: '99.0232', deviceId: 'DEV-RAIN-K3', deviceName: 'Sensor-Rain-03', monitorItem: 'rain' },
  { stationId: 'ST-K4', stationName: 'สถานีประตูป่า', latitude: '18.5712', longitude: '98.9834', deviceId: 'DEV-K4', deviceName: 'Sensor-Kuang-04', monitorItem: 'water_level' },
  { stationId: 'ST-K4', stationName: 'สถานีประตูป่า', latitude: '18.5712', longitude: '98.9834', deviceId: 'DEV-RAIN-K4', deviceName: 'Sensor-Rain-04', monitorItem: 'rain' },
  { stationId: 'ST-K5', stationName: 'สถานีอุโมงค์', latitude: '18.5489', longitude: '98.9612', deviceId: 'DEV-K5', deviceName: 'Sensor-Kuang-05', monitorItem: 'water_level' },
  { stationId: 'ST-K5', stationName: 'สถานีอุโมงค์', latitude: '18.5489', longitude: '98.9612', deviceId: 'DEV-RAIN-K5', deviceName: 'Sensor-Rain-05', monitorItem: 'rain' },
];

// 2. ข้อมูลล่าสุดของแต่ละสถานี (พร้อมสถานะที่สัมพันธ์กับระดับน้ำท่วม)
export const MOCK_LATEST_STATIONS: StationLatestInfo[] = [
  { ...MOCK_STATIONS[0], monitorValue: '2.10', monitorTime: new Date().toISOString(), signal: 'online', battery: 85 },
  { ...MOCK_STATIONS[1], monitorValue: '12.50', monitorTime: new Date().toISOString(), signal: 'online', battery: 100 },
  { ...MOCK_STATIONS[2], monitorValue: '4.20', monitorTime: new Date().toISOString(), signal: 'online', battery: 60 },
  { ...MOCK_STATIONS[3], monitorValue: '5.20', monitorTime: new Date().toISOString(), signal: 'online', battery: 100 },
  { ...MOCK_STATIONS[4], monitorValue: '3.60', monitorTime: new Date(Date.now() - 3600000).toISOString(), signal: 'offline', battery: 15 },
  { ...MOCK_STATIONS[5], monitorValue: '0.00', monitorTime: new Date(Date.now() - 3600000).toISOString(), signal: 'offline', battery: 100 },
  { ...MOCK_STATIONS[6], monitorValue: '1.80', monitorTime: new Date().toISOString(), signal: 'online', battery: 95 },
  { ...MOCK_STATIONS[7], monitorValue: '2.30', monitorTime: new Date().toISOString(), signal: 'online', battery: 100 },
  { ...MOCK_STATIONS[8], monitorValue: '5.10', monitorTime: new Date().toISOString(), signal: 'online', battery: 45 },
  { ...MOCK_STATIONS[9], monitorValue: '15.40', monitorTime: new Date().toISOString(), signal: 'online', battery: 100 },
];

// 3. ฟังก์ชันจำลองประวัติ (กราฟจะไม่กระโดดมั่ว จะอิงจากค่าล่าสุด)
export const generateMockHistory = (deviceId: string, monitorItem: string, start: number, end: number): DeviceRangeData[] => {
  const mockData: DeviceRangeData[] = [];
  const oneHour = 60 * 60 * 1000;
  const hoursToGenerate = Math.min(24, Math.floor((end - start) / oneHour)) || 24;
  
  // หาค่าล่าสุดเพื่อเป็นฐาน ไม่ให้กราฟกระโดด
  const latestInfo = MOCK_LATEST_STATIONS.find(s => s.deviceId === deviceId);
  let baseWaterValue = latestInfo ? parseFloat(latestInfo.monitorValue) : 2.5;

  for (let i = 0; i < hoursToGenerate; i++) {
    const time = end - (i * oneHour);
    let value = 0;
    
    if (monitorItem === "water_level" || monitorItem === "NW_value") {
       // สุ่มขึ้น/ลง ทีละนิด (0 ถึง 0.2)
       const change = (Math.random() * 0.4) - 0.2; 
       baseWaterValue = Math.max(0, baseWaterValue + change);
       value = baseWaterValue;
    } else { // ฝน
       value = Math.random() > 0.8 ? Math.random() * 15 : 0; 
    }

    mockData.push({
      monitorTime: new Date(time).toISOString(),
      monitorValue: value.toFixed(2)
    });
  }

  // เรียงลำดับเวลา (เพื่อให้กราฟแสดงถูกต้อง)
  return mockData.sort((a, b) => new Date(a.monitorTime).getTime() - new Date(b.monitorTime).getTime());
};

// 4. ฟังก์ชันข้อมูลสถานีเดี่ยว
export const getMockStationInfo = (deviceId: string): DeviceInfoResponse => {
  const station = MOCK_STATIONS.find(s => s.deviceId === deviceId) || MOCK_STATIONS[2]; // Default S3
  return {
    monitorName: station.monitorItem,
    customName: station.stationName,
    warningLevel: 1, 
    deviceLocation: {
      latitude: station.latitude,
      longitude: station.longitude
    }
  };
};

// 5. โอกาสเกิดฝน
export const generateRainProbability = (): RainProbabilityData[] => {
  const rows: RainProbabilityData[] = [];
  for (let h = 1; h <= 24; h++) {
    const hour = h % 24;
    const base = hour >= 6 && hour <= 18 ? 30 : 10;
    rows.push({
      time: `${String(hour).padStart(2, '0')}:00`,
      sun: Math.round(base + Math.random() * 40),
      mon: Math.round(base + Math.random() * 40),
      tue: Math.round(base + Math.random() * 40),
      wed: Math.round(base + Math.random() * 40),
      thu: Math.round(base + Math.random() * 40),
      fri: Math.round(base + Math.random() * 40),
      sat: Math.round(base + Math.random() * 40),
    });
  }
  return rows;
};

// 6. ข้อมูลจำลองประวัติการแจ้งเตือน
export interface AlertLog {
  id: string;
  stationName: string;
  message: string;
  time: string;
  type: 'warning' | 'critical';
  isRead: boolean;
}

export const MOCK_ALERTS: AlertLog[] = [
  {
    id: 'AL-001',
    stationName: 'สถานีสะพานดำ',
    message: 'ระดับน้ำถึงเกณฑ์วิกฤต (12.50 ม.)',
    time: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 นาทีที่แล้ว
    type: 'critical',
    isRead: false
  },
  {
    id: 'AL-002',
    stationName: 'สถานีศาลากลางลำพูน',
    message: 'ปริมาณฝนตกหนักสะสมเกินเกณฑ์ (40.2 มม.)',
    time: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 ชั่วโมงที่แล้ว
    type: 'warning',
    isRead: false
  },
  {
    id: 'AL-003',
    stationName: 'สถานีอุโมงค์',
    message: 'เซนเซอร์ขาดการเชื่อมต่อ (Offline)',
    time: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 ชั่วโมงที่แล้ว
    type: 'warning',
    isRead: true
  },
  {
    id: 'AL-004',
    stationName: 'สถานีประตูป่า',
    message: 'ระดับน้ำเพิ่มสูงขึ้นแตะระดับเฝ้าระวัง (5.10 ม.)',
    time: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 วันที่แล้ว
    type: 'warning',
    isRead: true
  }
];
