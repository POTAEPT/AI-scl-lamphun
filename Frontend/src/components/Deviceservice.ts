export interface DeviceLatestResponse {
  code: number;
  monitorValue: string;
  monitorTime: string;
}

export interface DeviceRangeData {
  monitorValue: string;
  monitorTime: string;
}

export interface DeviceRangeResponse {
  code: number;
  data: DeviceRangeData[];
}

export interface DeviceInfoResponse {
  monitorName: string;
  customName: string;
  warningLevel: number;
  deviceLocation: {
    latitude: string;
    longitude: string;
  };
}

export interface UserDeviceInfo {
  deviceId: string;
  monitorName: string;
  customName: string;
  deviceLocation: {
    latitude: string;
    longitude: string;
  };
}

export interface RainProbabilityData {
  time: string;
  sun: number;
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
}

export interface StationDeviceInfo {
  stationId: string;
  stationName: string;
  latitude: string;
  longitude: string;
  deviceId: string;
  deviceName: string;
  monitorItem: string;
}

export interface StationLatestInfo extends StationDeviceInfo {
  monitorValue: string;
  monitorTime: string;
  signal: 'online' | 'offline';
  battery: number;
}

const API_BASE_URL = '/api/v2/device';

const getHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
};

// ---- Mock toggle: ควบคุมจาก .env (VITE_USE_MOCK_DATA=true) ----
export let USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

export const setUseMockData = (isMock: boolean) => {
  USE_MOCK_DATA = isMock;
  console.log(`System Mode changed to: ${isMock ? 'MOCK' : 'REAL API'}`);
};

// ---- ข้อมูล 5 สถานีลำน้ำกวง (ใช้ใน Mock mode) ----
// threshold: critical >= 5.0 ม., warning >= 3.5 ม.
const MOCK_STATIONS_RAW = [
  { stationId: 'ST-K1', stationName: 'สถานีสะพานดำ',        latitude: '18.7012', longitude: '99.0876', deviceId: 'DEV-K1', baseWater: 2.10, deviceName: 'DEV-K1', monitorItem: 'water_level' },
  { stationId: 'ST-K2', stationName: 'สถานีศาลากลางลำพูน', latitude: '18.6234', longitude: '99.0412', deviceId: 'DEV-K2', baseWater: 5.10, deviceName: 'DEV-K2', monitorItem: 'water_level' },
  { stationId: 'ST-K3', stationName: 'สถานีสะพานท่าขาม',   latitude: '18.5867', longitude: '99.0232', deviceId: 'DEV-K3', baseWater: 3.60, deviceName: 'DEV-K3', monitorItem: 'water_level' },
  { stationId: 'ST-K4', stationName: 'สถานีประตูป่า',       latitude: '18.5712', longitude: '98.9834', deviceId: 'DEV-K4', baseWater: 1.80, deviceName: 'DEV-K4', monitorItem: 'water_level' },
  { stationId: 'ST-K5', stationName: 'สถานีอุโมงค์',        latitude: '18.5489', longitude: '98.9612', deviceId: 'DEV-K5', baseWater: 5.10, deviceName: 'DEV-K5', monitorItem: 'water_level' },
];

// ---- DeviceService (real API + mock routing) ----
export const DeviceService = {
  getHistory: async (
    _deviceId: string,
    _deviceSecretKey: string,
    _monitorItem: string,
    _start: number,
    _end: number
  ): Promise<DeviceRangeData[]> => {
    if (USE_MOCK_DATA) {
      return MockDeviceService.getHistory(_deviceId, _deviceSecretKey, _monitorItem, _start, _end);
    }
    const response = await fetch(`${API_BASE_URL}/batch`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        deviceList: [{
          deviceId: _deviceId,
          deviceSecretKey: _deviceSecretKey,
          monitorItem: _monitorItem
        }],
        start: _start,
        end: _end
      }),
    });
    const result = await handleResponse(response);
    const deviceResult = result.data?.find((d: { deviceId: string }) => d.deviceId === _deviceId);
    if (!deviceResult?.data) return [];
    return deviceResult.data
      .filter((item: { monitorItem: string }) => item.monitorItem === _monitorItem)
      .map(({ monitorValue, monitorTime }: { monitorValue: string; monitorTime: string }) => ({
        monitorValue,
        monitorTime
      }));
  },

  getStationInfo: async (deviceId: string): Promise<DeviceInfoResponse> => {
    if (USE_MOCK_DATA) {
      return MockDeviceService.getStationInfo(deviceId);
    }
    const response = await fetch('/api/v2/device/info', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ deviceId }),
    });
    return handleResponse(response);
  },

  getUserDevices: async (): Promise<UserDeviceInfo[]> => {
    if (USE_MOCK_DATA) {
      return MOCK_STATIONS_RAW.map(s => ({
        deviceId: s.deviceId,
        monitorName: s.stationId,
        customName: s.stationName,
        deviceLocation: { latitude: s.latitude, longitude: s.longitude },
      }));
    }
    const response = await fetch('/api/v2/user/owns', {
      method: 'GET',
      headers: getHeaders(),
    });
    const result = await handleResponse(response);
    return result.deviceInfo || [];
  },

  getRainProbability: async (): Promise<RainProbabilityData[]> => {
    return MockDeviceService.getRainProbability();
  },

  // คืน StationDeviceInfo ทั้ง 5 สถานีใน mock mode
  getStations: async (): Promise<StationDeviceInfo[]> => {
    if (USE_MOCK_DATA) {
      return MockDeviceService.getStations();
    }
    const response = await fetch('/api/v2/stations/', {
      method: 'GET',
      headers: getHeaders(),
    });
    const result = await handleResponse(response);
    return result.data || [];
  },

  // คืน StationLatestInfo ทั้ง 5 สถานีพร้อม monitorValue ใน mock mode
  getLatestStations: async (): Promise<StationLatestInfo[]> => {
    if (USE_MOCK_DATA) {
      return MockDeviceService.getLatestStations();
    }
    const response = await fetch('/api/v2/stations/latest', {
      method: 'GET',
      headers: getHeaders(),
    });
    const result = await handleResponse(response);
    return result.data || [];
  }
};

// ---- MockDeviceService ----
export const MockDeviceService = {

  getStationInfo: async (_deviceId: string): Promise<DeviceInfoResponse> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const station = MOCK_STATIONS_RAW.find(s => s.deviceId === _deviceId) ?? MOCK_STATIONS_RAW[0];
    return {
      monitorName: station.stationId,
      customName:  station.stationName,
      warningLevel: 3.5,
      deviceLocation: {
        latitude:  station.latitude,
        longitude: station.longitude,
      },
    };
  },

  // สุ่มข้อมูลประวัติ 24 ชม. โดยใช้ baseWater ของแต่ละสถานีเป็นฐาน
  getHistory: async (
    deviceId: string,
    _deviceSecretKey: string,
    monitorItem: string,
    _start: number,
    end: number
  ): Promise<DeviceRangeData[]> => {
    await new Promise(resolve => setTimeout(resolve, 400));

    const station = MOCK_STATIONS_RAW.find(s => s.deviceId === deviceId);
    const baseWater = station?.baseWater ?? 3.0;

    const mockData: DeviceRangeData[] = [];
    const oneHour = 60 * 60 * 1000;

    for (let i = 23; i >= 0; i--) {
      const time = end - (i * oneHour);
      let value = 0;

      if (monitorItem === 'water_level') {
        // สุ่มรอบ baseWater ±0.5 ม. เพื่อให้กราฟดูสมจริง
        value = baseWater + (Math.random() - 0.5) * 1.0;
        value = Math.max(0.1, value);
      } else {
        // ปริมาณฝน: สุ่มสูงขึ้นช่วงกลางวัน
        const hour = new Date(time).getHours();
        const rainChance = hour >= 13 && hour <= 18 ? 0.6 : 0.2;
        value = Math.random() < rainChance ? Math.random() * 25 : 0;
      }

      mockData.push({
        monitorTime:  new Date(time).toISOString(),
        monitorValue: value.toFixed(2),
      });
    }

    return mockData;
  },

  // คืน StationDeviceInfo ทั้ง 5 สถานี
  getStations: async (): Promise<StationDeviceInfo[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return MOCK_STATIONS_RAW.map(s => ({
      stationId:   s.stationId,
      stationName: s.stationName,
      latitude:    s.latitude,
      longitude:   s.longitude,
      deviceId:    s.deviceId,
      deviceName:  s.deviceName,
      monitorItem: s.monitorItem,
    }));
  },

  // คืน StationLatestInfo ทั้ง 5 สถานี พร้อมค่าระดับน้ำปัจจุบัน
  getLatestStations: async (): Promise<StationLatestInfo[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const now = new Date().toISOString();
    return MOCK_STATIONS_RAW.map(s => {
      // สุ่มเล็กน้อยรอบ baseWater เพื่อให้ค่าไม่ซ้ำกันทุก reload
      const jitter   = (Math.random() - 0.5) * 0.3;
      const water    = Math.max(0.1, s.baseWater + jitter);
      return {
        stationId:    s.stationId,
        stationName:  s.stationName,
        latitude:     s.latitude,
        longitude:    s.longitude,
        deviceId:     s.deviceId,
        deviceName:   s.deviceName,
        monitorItem:  s.monitorItem,
        monitorValue: water.toFixed(2),
        monitorTime:  now,
        signal:       'online' as const,
        battery:      Math.floor(70 + Math.random() * 30),
      };
    });
  },

  getRainProbability: async (): Promise<RainProbabilityData[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
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
  },
};