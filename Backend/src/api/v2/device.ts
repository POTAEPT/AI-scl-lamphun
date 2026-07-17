import { Elysia, t } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { sql } from 'drizzle-orm'
import { and, eq } from 'drizzle-orm/sql/expressions/conditions'
import { db } from '../../db/database'
import { deviceData, deviceOwners, devices } from '../../db/schema'
import { toUtcPlus7String } from '../../services/mainStream'

const latestCache = new Map<string, { code: number; monitorValue: string; monitorTime: string; expiresAt: number }>()
const MAX_CACHE_SIZE = 10_000

const sweepCache = () => {
  const now = Date.now()
  for (const [key, entry] of latestCache) {
    if (entry.expiresAt <= now) latestCache.delete(key)
  }
}

setInterval(sweepCache, 30_000)

const pendingRequests = new Map<string, Promise<{ code: number; monitorValue: string; monitorTime: string }>>()

const deviceDataItem = t.Object({
  monitorItem: t.String(),
  monitorTime: t.String(),
  monitorValue: t.String(),
  nodeId: t.Optional(t.String())
})

const deviceResponseItem = t.Object({
  data: t.Array(deviceDataItem),
  dataStatus: t.Number(),
  deviceId: t.String(),
  deviceStatus: t.Number(),
  id: t.Number(),
  customname: t.Optional(t.String()),
  name: t.String(),
  sensorNumber: t.Number()
})

const deviceResponseSchema = t.Object({
  code: t.Number(),
  data: t.Array(deviceResponseItem),
  message: t.String(),
  status: t.String()
})

const deviceLatestResponseSchema = t.Object({
  code: t.Number(),
  monitorValue: t.String(),
  monitorTime: t.String()
})

const deviceInfoResponseSchema = t.Object({
  monitorName: t.String(),
  customName: t.String(),
  deviceLocation: t.Object({
    latitude: t.String(),
    longitude: t.String()
  })
})

const deviceRegisterResponseSchema = t.Object({
  code: t.Number(),
  message: t.String()
})

const deviceDeleteResponseSchema = t.Object({
  code: t.Number(),
  message: t.String()
})

const deviceRangeResponseSchema = t.Object({
  code: t.Number(),
  data: t.Array(
    t.Object({
      monitorValue: t.String(),
      monitorTime: t.String()
    })
  )
})

const getBearerToken = (authHeader?: string) => {
  if (!authHeader) return null
  const [scheme, token] = authHeader.split(' ')
  if (scheme !== 'Bearer' || !token) return null
  return token
}

const deviceBatchRangeResponseSchema = t.Object({
  code: t.Number(),
  data: t.Array(
    t.Object({
      deviceId: t.String(),
      data: t.Array(
        t.Object({
          monitorValue: t.String(),
          monitorTime: t.String()
        })
      )
    })
  )
})

export const deviceRoutes = new Elysia({
  prefix: '/api/v2/device'
})
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET ?? 'change-me'
    })
  )
  .post(
    '/register',
    async ({ body, headers, jwt }) => {
      const token = getBearerToken(headers.authorization)

      if (!token) {
        return {
          code: 401,
          message: 'Missing Authorization header'
        }
      }

      const payload = await jwt.verify(token).catch(() => null)

      if (!payload || typeof payload.id !== 'number') {
        return {
          code: 401,
          message: 'Invalid or expired token'
        }
      }

      const database = await db
      const {
        deviceId,
        deviceSecretKey,
        monitorItem,
        customName,
        warningLevel,
        deviceLocation
      } = body

      await database
        .insert(devices)
        .values({
          deviceId: deviceId,
          deviceKey: deviceSecretKey,
          monitorItem,
          customName: customName ?? null,
          deviceName: null,
          warningLevel: warningLevel ?? 0,
          latitude: deviceLocation?.latitude ?? null,
          longitude: deviceLocation?.longtitude ?? null
        })
        .onConflictDoNothing({ target: devices.deviceId })

      const deviceRecord = await database
        .select()
        .from(devices)
        .where(eq(devices.deviceId, deviceId))
        .limit(1)
        .then(rows => rows[0])

      if (!deviceRecord) {
        return {
          code: 500,
          message: 'Failed to register device'
        }
      }

      await database
        .insert(deviceOwners)
        .values({
          userId: payload.id,
          deviceId: deviceRecord.id
        })
        .onConflictDoNothing({ target: [deviceOwners.userId, deviceOwners.deviceId] })

      return {
        code: 200,
        message: 'ok'
      }
    },
    {
      headers: t.Object({
        authorization: t.String()
      }),
      body: t.Object({
        deviceId: t.String(),
        deviceSecretKey: t.String(),
        monitorItem: t.String(),
        customName: t.Optional(t.String()),
        warningLevel: t.Optional(t.Integer()),
        deviceLocation: t.Optional(
          t.Object({
            latitude: t.String(),
            longtitude: t.String()
          })
        )
      }),
      response: deviceRegisterResponseSchema
    }
  )
  .post(
    '/info',
    async ({ body, headers, jwt, set }) => {
      const token = getBearerToken(headers.authorization)

      if (!token) {
        set.status = 401
        return {
          monitorName: '',
          customName: '',
          warningLevel: 0,
          deviceLocation: {
            latitude: '',
            longitude: ''
          }
        }
      }

      const payload = await jwt.verify(token).catch(() => null)

      if (!payload || typeof payload.id !== 'number') {
        set.status = 401
        return {
          monitorName: '',
          customName: '',
          warningLevel: 0,
          deviceLocation: {
            latitude: '',
            longitude: ''
          }
        }
      }

      const database = await db
      const { deviceId } = body

      const deviceRecords = await database
        .select()
        .from(devices)
        .where(eq(devices.deviceId, deviceId))
        .limit(1)

      const deviceRecord = deviceRecords[0]

      if (!deviceRecord) {
        set.status = 404
        return {
          monitorName: '',
          customName: '',
          warningLevel: 0,
          deviceLocation: {
            latitude: '',
            longitude: ''
          }
        }
      }

      const ownership = await database
        .select()
        .from(deviceOwners)
        .where(
          and(
            eq(deviceOwners.userId, payload.id),
            eq(deviceOwners.deviceId, deviceRecord.id)
          )
        )
        .limit(1)

      if (ownership.length === 0) {
        set.status = 403
        return {
          monitorName: '',
          customName: '',
          warningLevel: 0,
          deviceLocation: {
            latitude: '',
            longitude: ''
          }
        }
      }

      return {
        monitorName: deviceRecord.monitorItem ?? '',
        customName: deviceRecord.customName ?? '',
        warningLevel: deviceRecord.warningLevel ?? 0,
        deviceLocation: {
          latitude: deviceRecord.latitude ?? '',
          longitude: deviceRecord.longitude ?? ''
        }
      }
    },
    {
      headers: t.Object({
        authorization: t.String()
      }),
      body: t.Object({
        deviceId: t.String()
      }),
      response: deviceInfoResponseSchema
    }
  )
  .delete(
    '/',
    async ({ body, headers, jwt }) => {
      const token = getBearerToken(headers.authorization)

      if (!token) {
        return {
          code: 401,
          message: 'Missing Authorization header'
        }
      }

      const payload = await jwt.verify(token).catch(() => null)

      if (!payload || typeof payload.id !== 'number') {
        return {
          code: 401,
          message: 'Invalid or expired token'
        }
      }
      const userId = Number(payload.id);

      const database = await db
      const { deviceId } = body

      const deviceRecords = await database
        .select()
        .from(devices)
        .where(eq(devices.deviceId, deviceId))
        .limit(1)

      const deviceRecord = deviceRecords[0]

      if (!deviceRecord) {
        return {
          code: 404,
          message: 'Device not found'
        }
      }

      const ownership = await database
        .select()
        .from(deviceOwners)
        .where(
          and(
            eq(deviceOwners.userId, payload.id),
            eq(deviceOwners.deviceId, deviceRecord.id)
          )
        )
        .limit(1)

      if (ownership.length === 0) {
        return {
          code: 403,
          message: 'Forbidden'
        }
      }

      const deviceRecordDeviceId = deviceRecord.deviceId

      if (!deviceRecordDeviceId) {
        return {
          code: 500,
          message: 'Device record is missing a deviceId'
        }
      }

      await database.transaction(async (tx) => {
        await tx
          .delete(deviceOwners)
          .where(
            and(
              eq(deviceOwners.userId, userId),
              eq(deviceOwners.deviceId, deviceRecord.id)
            )
          )

        const remainingOwners = await tx
          .select()
          .from(deviceOwners)
          .where(eq(deviceOwners.deviceId, deviceRecord.id))
          .limit(1)

        if (remainingOwners.length === 0) {
          await tx
            .delete(deviceData)
            .where(eq(deviceData.deviceId, deviceRecordDeviceId))

          await tx
            .delete(deviceOwners)
            .where(eq(deviceOwners.deviceId, deviceRecord.id))

          await tx.delete(devices).where(eq(devices.id, deviceRecord.id))
        }
      })

      return {
        code: 200,
        message: 'ok'
      }
    },
    {
      headers: t.Object({
        authorization: t.String()
      }),
      body: t.Object({
        deviceId: t.String()
      }),
      response: deviceDeleteResponseSchema
    }
  )
  .post(
    '/',
    async ({ body }) => {
      const database = await db
      const { deviceId, monitorItem, start, end } = body

      const startTime = Math.min(start, end)
      const endTime = Math.max(start, end)
      const startGmtPlus7 = toUtcPlus7String(startTime)
      const endGmtPlus7 = toUtcPlus7String(endTime)

      const rows = await database
        .select({
          monitorValue: deviceData.monitorValue,
          monitorTime: deviceData.monitorTime
        })
        .from(deviceData)
        .where(
          sql`${deviceData.deviceId} = ${deviceId} AND ${deviceData.monitorItem} = ${monitorItem} AND ${deviceData.monitorTime} BETWEEN ${startGmtPlus7} AND ${endGmtPlus7}`
        )
        .orderBy(deviceData.monitorTime)

      return {
        code: 200,
        data: rows.map((row) => ({
          monitorValue: row.monitorValue ?? '',
          monitorTime: row.monitorTime ?? ''
        }))
      }
    },
    {
      body: t.Object({
        deviceId: t.String(),
        deviceSecretKey: t.String(),
        monitorItem: t.String(),
        start: t.Number(),
        end: t.Number()
      }),
      response: deviceRangeResponseSchema
    }
  )
  .post(
    '/batch',
    async ({ body }) => {
      const database = await db
      const { start, end } = body
      const startTime = Math.min(start, end)
      const endTime = Math.max(start, end)
      const startGmtPlus7 = toUtcPlus7String(startTime)
      const endGmtPlus7 = toUtcPlus7String(endTime)

      const results = await Promise.all(
        body.deviceList.map(async (device) => {
          const rows = await database
            .select({
              monitorValue: deviceData.monitorValue,
              monitorTime: deviceData.monitorTime
            })
            .from(deviceData)
            .where(
              sql`${deviceData.deviceId} = ${device.deviceId} AND ${
                deviceData.monitorTime
              } BETWEEN ${startGmtPlus7} AND ${endGmtPlus7}`
            )
            .orderBy(deviceData.monitorTime)

          return {
            deviceId: device.deviceId,
            data: rows.map((row) => ({
              monitorValue: row.monitorValue ?? '',
              monitorTime: row.monitorTime ?? ''
            }))
          }
        })
      )

      return {
        code: 200,
        data: results
      }
    },
    {
      body: t.Object({
        deviceList: t.Array(
          t.Object({
            deviceId: t.String(),
            deviceSecretKey: t.String(),
            monitorItem: t.String()
          })
        ),
        start: t.Number(),
        end: t.Number()
      }),
      response: deviceBatchRangeResponseSchema
    }
  )
  .post(
    '/latest',
    async ({ body, set }) => {
      const ttl = Number(process.env.LATEST_CACHE_TTL_MS ?? 60000)
      set.headers['Cache-Control'] = `public, max-age=${Math.floor(ttl / 1000)}`

      const cacheKey = `${body.deviceId}:${body.monitorItem}`
      const cached = latestCache.get(cacheKey)

      if (cached && cached.expiresAt > Date.now()) {
        return { code: cached.code, monitorValue: cached.monitorValue, monitorTime: cached.monitorTime }
      }

      const pending = pendingRequests.get(cacheKey)
      if (pending) return await pending

      const promise = (async () => {
        const database = await db
        const rows = await database
          .select({
            monitorValue: deviceData.monitorValue,
            monitorTime: deviceData.monitorTime
          })
          .from(deviceData)
          .where(
            and(
              eq(deviceData.deviceId, body.deviceId),
              eq(deviceData.monitorItem, body.monitorItem)
            )
          )
          .orderBy(sql`${deviceData.monitorTime} DESC`)
          .limit(1)

        const row = rows[0]
        const result = {
          code: row ? 200 : 404,
          monitorValue: row?.monitorValue ?? '',
          monitorTime: row?.monitorTime ?? ''
        }

        if (latestCache.size >= MAX_CACHE_SIZE) latestCache.clear()

        latestCache.set(cacheKey, { ...result, expiresAt: Date.now() + ttl })

        return result
      })()

      pendingRequests.set(cacheKey, promise)
      try {
        return await promise
      } finally {
        pendingRequests.delete(cacheKey)
      }
    },
    {
      body: t.Object({
        deviceId: t.String(),
        monitorItem: t.String()
      }),
      response: deviceLatestResponseSchema
    }
  )
