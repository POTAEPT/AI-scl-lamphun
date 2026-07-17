
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

// แก้ไขฟังก์ชัน handleResponse ให้สะอาด (ลบตัวแปรที่ไม่ใช้ทิ้ง)
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
};

// 1. Single toggle to control mock vs real API
export let USE_MOCK_DATA = false; // Set to false for real API, true for mock

export const setUseMockData = (isMock: boolean) => {
  USE_MOCK_DATA = isMock;
  console.log(`System Mode changed to: ${isMock ? 'MOCK' : 'REAL API'}`);
};

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
    console.log(`[getHistory] deviceId=${_deviceId}, monitorItem=${_monitorItem}, records=${deviceResult.data.length}`);
    console.log(`[getHistory] sample monitorItems:`, deviceResult.data.slice(0, 3).map((d: { monitorItem: string }) => d.monitorItem));
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
      return [{
        deviceId: 'MOCK_DEVICE_001',
        monitorName: 'MOCK-001',
        customName: 'Mockup Station (ลำพูน)',
        deviceLocation: {
          latitude: '18.575',
          longitude: '99.008'
        }
      }];
    }
    const response = await fetch('/api/v2/user/owns', {
      method: 'GET',
      headers: getHeaders(),
    });
    const result = await handleResponse(response);
    return result.deviceInfo || [];
  },

  getRainProbability: async (): Promise<RainProbabilityData[]> => {
    if (USE_MOCK_DATA) {
      return MockDeviceService.getRainProbability();
    }
    return MockDeviceService.getRainProbability(); // No real endpoint yet
  },

  getStations: async (): Promise<StationDeviceInfo[]> => {
    if (USE_MOCK_DATA) {
      return [];
    }
    const response = await fetch('/api/v2/stations/', {
      method: 'GET',
      headers: getHeaders(),
    });
    const result = await handleResponse(response);
    return result.data || [];
  },

  getLatestStations: async (): Promise<StationLatestInfo[]> => {
    if (USE_MOCK_DATA) {
      return [];
    }
    const response = await fetch('/api/v2/stations/latest', {
      method: 'GET',
      headers: getHeaders(),
    });
    const result = await handleResponse(response);
    return result.data || [];
  }
};

export const MockDeviceService = {
  // ใส่ _ นำหน้า deviceId เพราะไม่ได้ใช้ใน Logic ของ Mock
  getStationInfo: async (_deviceId: string): Promise<DeviceInfoResponse> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      monitorName: "MOCK-001",
      customName: "Mockup Station (ลำพูน)",
      warningLevel: 1, 
      deviceLocation: {
        latitude: "18.575",
        longitude: "99.008"
      }
    };
  },

  // ใส่ _ นำหน้าตัวแปรที่ไม่ได้ใช้ใน Mock Logic
  getHistory: async (
    _deviceId: string, 
    _deviceSecretKey: string, 
    monitorItem: string, 
    _start: number, 
    end: number // 'end' มีการใช้ในลูป เลยไม่ต้องใส่ _
  ): Promise<DeviceRangeData[]> => {
    await new Promise(resolve => setTimeout(resolve, 800));

    const mockData: DeviceRangeData[] = [];
    const oneHour = 60 * 60 * 1000;
    
    for (let i = 0; i < 24; i++) {
      const time = end - (i * oneHour);
      
      let value = 0;
      if (monitorItem === "water_level") {
         value = 4.5 + Math.random(); 
      } else {
         value = Math.random() > 0.7 ? Math.random() * 20 : 0; 
      }

      mockData.push({
        monitorTime: new Date(time).toISOString(),
        monitorValue: value.toFixed(2)
      });
    }

    return mockData;
  },

  // ... (ส่วนที่เหลือคงเดิม) ...
  getRainProbability: async (): Promise<RainProbabilityData[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
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
  }
};