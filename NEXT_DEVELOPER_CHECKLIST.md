# Next Developer Checklist

## Current State

All commits have been pushed to `linking-backend`. The following features have been implemented but **may need verification and debugging**:

---

## TODO: Fix Dashboard Table Showing "-" Values

**Priority: HIGH**

### Problem
Dashboard table shows `-` for water level and rainfall instead of real values:
```
ระดับน้ำ(เมตร)  |  ปริมาณน้ำฝน  |  Lamphun Station
-                |  -
```

### Root Cause
The `Dashboard-StationTable.tsx` merges `waterData` and `rainData` by `monitorTime`. The API returns timestamps in format `2026-02-21 09:51:22.431` but the merge logic uses exact string matching, so timestamps may not align.

### Debug Steps
1. Add `console.log` in `DashboardPage.tsx` to see what `waterHistory` and `rainHistory` look like after API call
2. Check if `monitorTime` format from API matches between water and rain devices
3. Consider using a time-bucket approach (e.g., round to nearest 5 min) instead of exact timestamp matching
4. Verify the `startTime`/`endTime` parameters are correct (currently using `Date.now() - 24 hours`)

---

## TODO: Fix Station Page Table Values

**Priority: HIGH**

### Problem
Station page table shows `-` for water level and rain:
```
ระดับน้ำ(เมตร)  |  ปริมาณน้ำฝน  |  Lamphun Station
-                |  -
```

### Files to Check
- `Frontend/src/pages/Station.tsx` - uses `latestStations` state
- `Frontend/src/service/deviceService.ts` - `getLatestStations()` function

### Debug Steps
1. Verify `/api/v2/stations/latest` endpoint returns data
2. Add `console.log` in Station page `useEffect` to see `latestData`
3. Check if `monitorItem` filtering works:
   - Water: `monitorItem.toLowerCase().includes('nw_')` should match `NW_value`
   - Rain: `monitorItem.toLowerCase().includes('yl_')` should match `YL_cycleValue`
4. Add `console.log(waterDevice?.monitorValue)` to see if values are found

---

## TODO: Verify Signal/Battery Status

**Priority: MEDIUM**

### Expected Behavior
- สัญญาณ (Signal): Shows `bi-reception-4` if online, `bi-reception-1` if offline (>1hr since last report)
- แบตเตอรี่ (Battery): Shows `bi-battery-full` if online, `bi-battery-empty 0%` if offline

### Files to Check
- `Backend/src/api/v2/stations.ts` - `/latest` endpoint calculates `signal` and `battery`
- `Frontend/src/pages/Station.tsx` - displays using `latestSignal` and `latestBattery`

### Known Issue
- Latest data is from `2026-02-21` which is in the past. If current time is much later, all devices will show as "offline".
- Consider: Is the database timestamp in UTC or local time? Is the `Date.now()` comparison correct?

---

## TODO: Verify Dashboard DataCards

**Priority: MEDIUM**

### Expected Behavior
- DataCard "ระดับน้ำ" should show latest water level from API (e.g., `2.371`)
- DataCard "ปริมาณน้ำฝนสะสม" should show latest rain value (e.g., `0.00`)

### Files to Check
- `Frontend/src/pages/DashboardPage.tsx` - sets `waterValue` and `rainValue` from `getLatestStations()`

---

## API Reference

### GET /api/v2/stations/latest
Returns latest data for all station devices.

**Response:**
```json
{
  "code": 200,
  "message": "ok",
  "data": [
    {
      "stationId": "lamphun-001",
      "stationName": "Lamphun Station",
      "latitude": "18.586659",
      "longitude": "99.023166",
      "deviceId": "2025120395170032",
      "deviceName": "Water Sensor",
      "monitorItem": "NW_value",
      "monitorValue": "2.371",
      "monitorTime": "2026-02-21 09:51:22.431",
      "signal": "online",
      "battery": 100
    }
  ]
}
```

### GET /api/v2/stations/
Returns station-device mapping without latest values.

### POST /api/v2/device/latest
Single device latest value:
```json
{ "deviceId": "2025120395170032", "monitorItem": "NW_value" }
```

### POST /api/v2/device/
Device historical data:
```json
{ "deviceId": "...", "deviceSecretKey": "...", "monitorItem": "...", "start": ms, "end": ms }
```

---

## Database Info

- **Database:** PostgreSQL
- **Tables:** `devices`, `device_data`, `station_devices`, `device_owners`, `users`, `sessions`
- **Known Data:**
  - Water device: `deviceId=2025120395170032`, `monitorItem=NW_value`, latest=2.371m
  - Rain device: `deviceId=2025120499091000`, `monitorItem=YL_cycleValue`, latest=0.00
  - Station: `lamphun-001` (Lamphun Station)
  - Total `device_data` rows: ~23,408

---

## Files Modified (linked to this branch)

### Backend
- `Backend/src/api/v2/stations.ts` - Added `/latest` endpoint
- `Backend/src/db/schema.ts` - Added `station_devices` table

### Frontend
- `Frontend/src/service/deviceService.ts` - Added `getLatestStations()`
- `Frontend/src/pages/DashboardPage.tsx` - Uses `getLatestStations()`
- `Frontend/src/pages/Station.tsx` - Uses `getLatestStations()` + signal/battery
- `Frontend/src/components/Dashboard-StationTable.tsx` - 20-row limit + React.memo

---

## Git History (linking-backend)

| Commit | Description |
|--------|-------------|
| `894e96c` | feat(backend): add /api/v2/stations/latest endpoint with signal/battery status |
| `257c568` | perf(frontend): add 20-row table limit and React.memo performance optimizations |
| `742b436` | feat(frontend): integrate getStations() API and remove mock data |
| `1022cd5` | feat(backend): add station_devices table and /api/v2/stations endpoint |

---

## Running the App

```bash
# Backend
cd Backend
bun run src/index.ts

# Frontend
cd Frontend
npm run dev
```

**Note:** Backend must be running on port 3000. Frontend proxies `/api` to backend.