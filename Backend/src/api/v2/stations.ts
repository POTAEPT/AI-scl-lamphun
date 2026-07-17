import { Elysia, t } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { eq, and, sql } from 'drizzle-orm/sql/expressions/conditions'
import { desc } from 'drizzle-orm'
import { db } from '../../db/database'
import { stationDevices, devices, deviceData } from '../../db/schema'
import { toUtcPlus7String } from '../../services/mainStream'

const getBearerToken = (authHeader?: string) => {
	if (!authHeader) return null
	const [scheme, token] = authHeader.split(' ')
	if (scheme !== 'Bearer' || !token) return null
	return token
}

const stationDeviceItem = t.Object({
	stationId: t.String(),
	stationName: t.String(),
	latitude: t.String(),
	longitude: t.String(),
	deviceId: t.String(),
	deviceName: t.String(),
	monitorItem: t.String()
})

const stationDeviceResponseSchema = t.Object({
	code: t.Number(),
	message: t.String(),
	data: t.Array(stationDeviceItem)
})

const stationLatestItem = t.Object({
	stationId: t.String(),
	stationName: t.String(),
	latitude: t.String(),
	longitude: t.String(),
	deviceId: t.String(),
	deviceName: t.String(),
	monitorItem: t.String(),
	monitorValue: t.String(),
	monitorTime: t.String(),
	signal: t.Union([t.Literal('online'), t.Literal('offline')]),
	battery: t.Number()
})

const stationLatestResponseSchema = t.Object({
	code: t.Number(),
	message: t.String(),
	data: t.Array(stationLatestItem)
})

export const stationRoutes = new Elysia({
	prefix: '/api/v2/stations'
})
	.use(
		jwt({
			name: 'jwt',
			secret: process.env.JWT_SECRET ?? 'change-me'
		})
	)
	.get(
		'/',
		async ({ headers, jwt, set }) => {
			const token = getBearerToken(headers.authorization)

			if (!token) {
				set.status = 401
				return {
					code: 401,
					message: 'Missing Authorization header',
					data: []
				}
			}

			const payload = await jwt.verify(token).catch(() => null)

			if (!payload || typeof payload.id !== 'number') {
				set.status = 401
				return {
					code: 401,
					message: 'Invalid or expired token',
					data: []
				}
			}

			const rows = await db
				.select({
					stationId: stationDevices.stationId,
					stationName: stationDevices.name,
					latitude: stationDevices.latitude,
					longitude: stationDevices.longitude,
					deviceId: devices.deviceId,
					deviceName: devices.customName,
					monitorItem: devices.monitorItem
				})
				.from(stationDevices)
				.innerJoin(devices, eq(stationDevices.deviceId, devices.id))

			return {
				code: 200,
				message: 'ok',
				data: rows.map((row) => ({
					stationId: row.stationId ?? '',
					stationName: row.stationName ?? '',
					latitude: row.latitude ?? '',
					longitude: row.longitude ?? '',
					deviceId: row.deviceId ?? '',
					deviceName: row.deviceName ?? '',
					monitorItem: row.monitorItem ?? ''
				}))
			}
		},
		{
			headers: t.Object({
				authorization: t.String()
			}),
			response: stationDeviceResponseSchema
		}
	)
	.get(
		'/latest',
		async ({ headers, jwt, set }) => {
			const token = getBearerToken(headers.authorization)

			if (!token) {
				set.status = 401
				return {
					code: 401,
					message: 'Missing Authorization header',
					data: []
				}
			}

			const payload = await jwt.verify(token).catch(() => null)

			if (!payload || typeof payload.id !== 'number') {
				set.status = 401
				return {
					code: 401,
					message: 'Invalid or expired token',
					data: []
				}
			}

			const now = Date.now()
			const oneHourAgo = now - 60 * 60 * 1000

			const rows = await db
				.select({
					stationId: stationDevices.stationId,
					stationName: stationDevices.name,
					latitude: stationDevices.latitude,
					longitude: stationDevices.longitude,
					deviceId: devices.deviceId,
					deviceName: devices.customName,
					monitorItem: devices.monitorItem
				})
				.from(stationDevices)
				.innerJoin(devices, eq(stationDevices.deviceId, devices.id))

			const result = await Promise.all(
				rows.map(async (row) => {
					const latestData = await db
						.select({
							monitorValue: deviceData.monitorValue,
							monitorTime: deviceData.monitorTime
						})
						.from(deviceData)
						.where(
							and(
								eq(deviceData.deviceId, row.deviceId ?? ''),
								eq(deviceData.monitorItem, row.monitorItem ?? '')
							)
						)
						.orderBy(desc(deviceData.monitorTime))
						.limit(1)

					const data = latestData[0]
					const lastReportTime = data?.monitorTime
						? new Date(data.monitorTime).getTime()
						: 0
					const isOffline = lastReportTime < oneHourAgo

					return {
						stationId: row.stationId ?? '',
						stationName: row.stationName ?? '',
						latitude: row.latitude ?? '',
						longitude: row.longitude ?? '',
						deviceId: row.deviceId ?? '',
						deviceName: row.deviceName ?? '',
						monitorItem: row.monitorItem ?? '',
						monitorValue: data?.monitorValue ?? '',
						monitorTime: data?.monitorTime ?? '',
						signal: isOffline ? 'offline' as const : 'online' as const,
						battery: isOffline ? 0 : 100
					}
				})
			)

			return {
				code: 200,
				message: 'ok',
				data: result
			}
		},
		{
			headers: t.Object({
				authorization: t.String()
			}),
			response: stationLatestResponseSchema
		}
	)