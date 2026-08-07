
import { 
  MOCK_STATIONS, 
  MOCK_LATEST_STATIONS, 
  generateMockHistory, 
  getMockStationInfo, 
  generateRainProbability 
} from '../data/mockData';

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
export let USE_MOCK_DATA = true; // Set to false for real API, true for mock

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
      await new Promise(resolve => setTimeout(resolve, 500));
      return MOCK_STATIONS;
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
      await new Promise(resolve => setTimeout(resolve, 500));
      return MOCK_LATEST_STATIONS;
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
  getStationInfo: async (deviceId: string): Promise<DeviceInfoResponse> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return getMockStationInfo(deviceId);
  },
  getHistory: async (
    deviceId: string, 
    _deviceSecretKey: string, 
    monitorItem: string, 
    start: number, 
    end: number
  ): Promise<DeviceRangeData[]> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return generateMockHistory(deviceId, monitorItem, start, end);
  },
  getRainProbability: async (): Promise<RainProbabilityData[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return generateRainProbability();
  }
};